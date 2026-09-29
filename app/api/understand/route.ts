import { createClient } from "@/lib/supabase/server";
import { resolveProviderConfig } from "@/lib/providers/resolve";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/providers/prompt";
import { parseSections } from "@/lib/providers/parse";
import type { ComprehensionDepth } from "@/lib/providers/types";
import type { DomainCode } from "@/lib/nuance/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({} as Record<string, string>));
  const contentItemId = body.content_item_id;
  if (!contentItemId) return new Response("Missing content_item_id", { status: 400 });

  const { data: item } = await supabase
    .from("content_item")
    .select("id, body_text")
    .eq("id", contentItemId)
    .single();
  if (!item?.body_text) return new Response("This item has no passage yet", { status: 400 });

  const { data: profile } = await supabase
    .from("content_profile")
    .select("*")
    .eq("content_item_id", contentItemId)
    .maybeSingle();

  const cfg = await resolveProviderConfig();
  if (!cfg) return new Response("No AI provider configured", { status: 503 });

  const cReq = {
    text: item.body_text,
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
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(cReq) },
      ],
      stream: true,
      temperature: 0.3,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return new Response("Provider error (" + upstream.status + "): " + detail.slice(0, 200), { status: 502 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let full = "";

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
              const delta = j.choices?.[0]?.delta?.content || "";
              if (delta) {
                full += delta;
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
      // freeze the function and these writes never land (comprehension would
      // vanish on reload).
      try {
        const parsed = parseSections(full);
        if (!parsed.understanding) return;

        let etId: string | null = null;
        const { data: et } = await supabase
          .from("extracted_text")
          .select("id")
          .eq("content_item_id", contentItemId)
          .maybeSingle();
        if (et) etId = et.id;
        else {
          const { data: made, error: etErr } = await supabase
            .from("extracted_text")
            .insert({ content_item_id: contentItemId, raw_text: item.body_text, corrected_text: item.body_text })
            .select("id")
            .single();
          if (etErr) console.error("extracted_text insert:", etErr.message);
          etId = made?.id ?? null;
        }
        if (etId) {
          const { error: rErr } = await supabase.from("ai_result").insert({
            extracted_text_id: etId,
            original: parsed.original || item.body_text,
            understanding: parsed.understanding,
            terms: parsed.importantTerms || [],
            key_idea: parsed.keyIdea || "",
            explanation: parsed.explanation || "",
          });
          if (rErr) console.error("ai_result insert:", rErr.message);
        }

        const now = new Date().toISOString();
        const { data: u } = await supabase
          .from("usage")
          .select("id, counters")
          .eq("user_id", auth.user.id)
          .eq("content_item_id", contentItemId)
          .maybeSingle();
        const prev = (u?.counters ?? {}) as Record<string, number>;
        const counters = { ...prev, comprehends: (prev.comprehends || 0) + 1 };
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
