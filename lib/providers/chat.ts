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

// Models occasionally wrap JSON in fences, prepend prose, or emit raw control
// characters inside strings. A bare JSON.parse loses the whole comprehension.
function extractJson(content: string): Record<string, unknown> {
  const raw = (content || "").trim();
  const attempts: string[] = [];
  attempts.push(raw);
  attempts.push(raw.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim());
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const sliced = raw.slice(start, end + 1);
    attempts.push(sliced);
    // raw newlines/tabs inside string values are the most common defect
    attempts.push(
      sliced.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, (m) =>
        m.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")
      )
    );
  }
  for (const a of attempts) {
    if (!a) continue;
    try {
      return JSON.parse(a) as Record<string, unknown>;
    } catch {
      // try next strategy
    }
  }
  throw new Error("Model returned unparseable JSON");
}

function toResult(parsed: Record<string, unknown>, req: ComprehensionRequest): ComprehensionResult {
  return {
    original: (parsed.original as string) || req.text,
    understanding: (parsed.understanding as string) || "",
    importantTerms: normaliseTerms(parsed.importantTerms),
    keyIdea: (parsed.keyIdea as string) || "",
    explanation: (parsed.explanation as string) || "",
  };
}

export async function callChatCompletion(
  baseUrl: string,
  apiKey: string,
  model: string,
  req: ComprehensionRequest
): Promise<ComprehensionResult> {
  let lastError: Error | null = null;

  // two attempts: a malformed generation is usually stochastic, and a retry recovers it
  for (let attempt = 0; attempt < 2; attempt++) {
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
        temperature: attempt === 0 ? 0.3 : 0,
      }),
    });
    if (!res.ok) {
      throw new Error("Provider error: " + res.status + " " + (await res.text()));
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    try {
      return toResult(extractJson(content), req);
    } catch (e) {
      lastError = e as Error;
    }
  }

  throw lastError ?? new Error("Comprehension failed");
}
