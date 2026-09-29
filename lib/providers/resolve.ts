import { createClient } from "@/lib/supabase/server";
import { deepseekProvider } from "./deepseek";
import {
  ComprehensionProvider,
  ComprehensionRequest,
  ComprehensionResult,
} from "./types";

const PROVIDER_BASE: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com/v1",
  mistral: "https://api.mistral.ai/v1",
};
const PROVIDER_MODEL: Record<string, string> = {
  openai: "gpt-4o-mini",
  deepseek: "deepseek-chat",
  mistral: "mistral-small-latest",
};

function openaiCompatible(opts: {
  baseUrl: string;
  apiKey: string;
  model: string;
}): ComprehensionProvider {
  return {
    id: "byok-" + opts.model,
    async comprehend(req: ComprehensionRequest): Promise<ComprehensionResult> {
      const system =
        "You are a multilingual reading companion. Translate the passage into the reader's preferred language while preserving meaning, context, tone, and nuance. Explain grammar, sentence structure, tone, and implied meaning where useful. Respond with JSON only.";
      const user = [
        "Passage:",
        '"""',
        req.text,
        '"""',
        "",
        "Target language: " + req.targetLanguage,
        "Comprehension depth: " + req.comprehensionDepth,
        "",
        'Respond as a JSON object with keys: "original" (string), "understanding" (string), "importantTerms" (array of strings), "keyIdea" (string), "explanation" (string).',
      ].join("\n");

      const res = await fetch(opts.baseUrl + "/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + opts.apiKey,
        },
        body: JSON.stringify({
          model: opts.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
      });
      if (!res.ok) {
        throw new Error("Provider error: " + res.status + " " + (await res.text()));
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "";
      const parsed = JSON.parse(content);
      const rawTerms = parsed.importantTerms;
      const importantTerms = Array.isArray(rawTerms)
        ? rawTerms.map((t: unknown) => {
            if (typeof t === "string") return t;
            if (t && typeof t === "object") {
              const o = t as Record<string, unknown>;
              return [o.term, o.meaning].filter(Boolean).join(" — ");
            }
            return String(t);
          })
        : [];
      return {
        original: parsed.original || req.text,
        understanding: parsed.understanding || "",
        importantTerms,
        keyIdea: parsed.keyIdea || "",
        explanation: parsed.explanation || "",
      };
    },
  };
}

// Resolve the active provider: user's default BYOK connection, else platform DeepSeek.
export async function resolveProvider(): Promise<ComprehensionProvider> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return deepseekProvider;

  const { data: conn } = await supabase
    .from("provider_connection")
    .select("*")
    .eq("user_id", data.user.id)
    .eq("is_default", true)
    .maybeSingle();

  if (conn && conn.credential_ref && PROVIDER_BASE[conn.provider]) {
    return openaiCompatible({
      baseUrl: PROVIDER_BASE[conn.provider],
      apiKey: conn.credential_ref,
      model: PROVIDER_MODEL[conn.provider],
    });
  }
  return deepseekProvider;
}
