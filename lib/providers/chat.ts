import { ComprehensionRequest, ComprehensionResult } from "./types";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";

function normaliseTerms(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((t: unknown) => {
    if (typeof t === "string") return t;
    if (t && typeof t === "object") {
      const o = t as Record<string, unknown>;
      return [o.term, o.meaning].filter(Boolean).join(" — ");
    }
    return String(t);
  });
}

export async function callChatCompletion(
  baseUrl: string,
  apiKey: string,
  model: string,
  req: ComprehensionRequest
): Promise<ComprehensionResult> {
  const res = await fetch(baseUrl + "/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(req) },
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
  return {
    original: parsed.original || req.text,
    understanding: parsed.understanding || "",
    importantTerms: normaliseTerms(parsed.importantTerms),
    keyIdea: parsed.keyIdea || "",
    explanation: parsed.explanation || "",
  };
}
