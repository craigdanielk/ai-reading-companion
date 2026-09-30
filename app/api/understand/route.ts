import { createClient } from "@/lib/supabase/server";
import { resolveProviderConfig } from "@/lib/providers/resolve";
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildPageSystemPrompt,
  buildPagePrompt,
} from "@/lib/providers/prompt";
import { parseSections, parsePageSections } from "@/lib/providers/parse";
import { snapRange } from "@/lib/text/range";
import { estimateCost } from "@/lib/cost";
import type { ComprehensionDepth } from "@/lib/providers/types";
import type { DomainCode } from "@/lib/nuance/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Mode = "passage" | "page";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const contentItemId = body.content_item_id as string | undefined;
  if (!contentItemId) return new Response("Missing content_item_id", { status: 400 });

  const mode: Mode = body.mode === "page" ? "page" : "passage";
  const asked = body.selection as { start?: number; end?: number } | undefined;

  const { data: item } = await supabase
    .from("content_item")
    .select("id, body_text")
    .eq("id", contentItemId)
    .single();
  const full = item?.body_text || "";
  if (!full.trim()) return new Response("This text is empty", { status: 400 });

  // A selection is sliced server-side from the stored body, so the offsets the
  // reader reports are authoritative and cannot drift from what was sent.
  let text = full;
  let range: { start: number; end: number } | null = null;
  if (mode === "passage" && asked && Number.isFinite(asked.start) && Number.isFinite(asked.end)) {
    const snapped = snapRange(full, asked.start as number, asked.end as number);
    const slice = full.slice(snapped.start, snapped.end);
    if (slice.trim()) {
      text = slice;
      range = snapped;
    }
  }

  const { data: profile } = await supabase
    .from("content_profile")
    .select("*")
    .eq("content_item_id", contentItemId)
    .maybeSingle();

  const cfg = await resolveProviderConfig();
  if (!cfg) return new Response("No AI provider configured", { status: 503 });

  const cReq = {
    text,
    sourceLanguage: profile?.source_language || "auto",
    targetLanguage: profile?.target_language || "en",
    comprehensionDepth: (profile?.comprehension_depth || "intermediate") as ComprehensionDepth,
    domain: (profile?.domain || "general") as DomainCode,
  };

  const upstream = await fetch(cfg.baseUrl + "/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + cfg.apiKey,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        {
          role: "system",
          content: mode === "page" ? buildPageSystemPrompt() : buildSystemPrompt(),
        },
        {
          role: "user",
          content: mode === "page" ? buildPagePrompt(cReq) : buildUserPrompt(cReq),
        },
      ],
      stream: true,
      temperature: 0.3,
      // request token usage on the final chunk so we can record cost
      stream_options: { include_usage: true },
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return new Response("Provider error (" + upstream.status + "): " + detail.slice(0, 200), { status: 502 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let full_out = "";
  const usage = { prompt_tokens: 0, completion_tokens: 0 };

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const j = JSON.parse(payload);
              if (j.usage) {
                usage.prompt_tokens = j.usage.prompt_tokens ?? usage.prompt_tokens;
                usage.completion_tokens = j.usage.completion_tokens ?? usage.completion_tokens;
              }
              const delta = j.choices?.[0]?.delta?.content || "";
              if (delta) {
                full_out += delta;
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              // partial SSE frame — ignore
            }
          }
        }
      } catch (e) {
        console.error("stream read error:", (e as Error).message);
      }

      // Persist BEFORE closing the response: once the stream is closed Vercel may
      // freeze the function and these writes never land.
      try {
        if (mode === "page") {
          const parsed = parsePageSections(full_out);
          if (parsed.sense) {
            const etId = await ensureExtractedText(supabase, contentItemId, full);
            if (etId) {
              const { error } = await supabase.from("ai_result").insert({
                extracted_text_id: etId,
                mode: "page",
                original: "",
                understanding: parsed.sense,
                terms: parsed.hard || [],
                key_idea: "",
                explanation: "",
              });
              if (error) console.error("ai_result(page) insert:", error.message);
            }
          }
        } else {
          const parsed = parseSections(full_out);
          if (parsed.understanding) {
            let selectionId: string | null = null;
            if (range) {
              selectionId = await ensureSelection(supabase, contentItemId, range, text, full);
            }
            const etId = selectionId
              ? null
              : await ensureExtractedText(supabase, contentItemId, full);
            if (selectionId || etId) {
              const { error } = await supabase.from("ai_result").insert({
                extracted_text_id: etId,
                selection_id: selectionId,
                mode: "passage",
                original: parsed.original || text,
                understanding: parsed.understanding,
                terms: parsed.importantTerms || [],
                key_idea: parsed.keyIdea || "",
                explanation: parsed.explanation || "",
              });
              if (error) console.error("ai_result insert:", error.message);
            }
          }
        }

        const now = new Date().toISOString();
        const { data: u } = await supabase
          .from("usage")
          .select("id, counters")
          .eq("user_id", auth.user.id)
          .eq("content_item_id", contentItemId)
          .maybeSingle();
        const prev = (u?.counters ?? {}) as Record<string, number>;

        // Cost is an estimate from tokens and a published per-model rate, split so
        // the reader can see what their own key (BYOK) cost vs the platform default.
        const cost = estimateCost(cfg.model, usage.prompt_tokens, usage.completion_tokens);
        const origin = cfg.origin || "platform";
        const counters = {
          ...prev,
          comprehends: (prev.comprehends || 0) + 1,
          prompt_tokens: (prev.prompt_tokens || 0) + usage.prompt_tokens,
          completion_tokens: (prev.completion_tokens || 0) + usage.completion_tokens,
          cost_usd: round((prev.cost_usd || 0) + cost),
          [origin + "_calls"]: (prev[origin + "_calls"] || 0) + 1,
          [origin + "_cost_usd"]: round((prev[origin + "_cost_usd"] || 0) + cost),
          last_model: cfg.model,
        };
        if (u) await supabase.from("usage").update({ counters, last_position: now }).eq("id", u.id);
        else
          await supabase
            .from("usage")
            .insert({ user_id: auth.user.id, content_item_id: contentItemId, counters, last_position: now });
      } catch (e) {
        console.error("persist error:", (e as Error).message);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

function round(n: number): number {
  return Math.round(n * 1000000) / 1000000;
}

type Sb = Awaited<ReturnType<typeof createClient>>;

async function ensureExtractedText(sb: Sb, contentItemId: string, bodyText: string): Promise<string | null> {
  const { data: et } = await sb
    .from("extracted_text")
    .select("id")
    .eq("content_item_id", contentItemId)
    .maybeSingle();
  if (et) return et.id;
  const { data: made, error } = await sb
    .from("extracted_text")
    .insert({ content_item_id: contentItemId, raw_text: bodyText, corrected_text: bodyText })
    .select("id")
    .single();
  if (error) console.error("extracted_text insert:", error.message);
  return made?.id ?? null;
}

// Anchors are stored W3C-annotation style: offsets for lookup, quote plus
// surrounding context so the highlight can be re-found if the body is edited.
async function ensureSelection(
  sb: Sb,
  contentItemId: string,
  range: { start: number; end: number },
  quote: string,
  full: string
): Promise<string | null> {
  const { data: found } = await sb
    .from("selection")
    .select("id")
    .eq("content_item_id", contentItemId)
    .eq("start_offset", range.start)
    .eq("end_offset", range.end)
    .maybeSingle();
  if (found) return found.id;

  const { data: made, error } = await sb
    .from("selection")
    .insert({
      content_item_id: contentItemId,
      start_offset: range.start,
      end_offset: range.end,
      quote,
      prefix: full.slice(Math.max(0, range.start - 40), range.start),
      suffix: full.slice(range.end, Math.min(full.length, range.end + 40)),
    })
    .select("id")
    .single();
  if (error) console.error("selection insert:", error.message);
  return made?.id ?? null;
}
