import {
  ComprehensionProvider,
  ComprehensionRequest,
  ComprehensionResult,
} from "./types";

const DEEPSEEK_BASE = "https://api.deepseek.com/v1";

// Platform default provider (DeepSeek, OpenAI-compatible chat completions).
export const deepseekProvider: ComprehensionProvider = {
  id: "deepseek",
  async comprehend(req: ComprehensionRequest): Promise<ComprehensionResult> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");

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

    const res = await fetch(DEEPSEEK_BASE + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      throw new Error("DeepSeek API error: " + res.status + " " + (await res.text()));
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
