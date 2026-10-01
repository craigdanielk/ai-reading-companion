// OCR via a vision-capable provider (OpenAI image input).

/**
 * Models like to wrap extracted text in a markdown fence even when told to
 * return only the text. An opening ``` would become the first line of the
 * reader's text, so fences are stripped before the text is trusted.
 */
export function stripFences(raw: string): string {
  let s = (raw || "").trim();
  s = s.replace(/^```[a-zA-Z0-9_-]*\s*\n?/, "");
  s = s.replace(/\n?```\s*$/, "");
  return s.trim();
}

/**
 * R6. A PDF with no text layer is a scan. The vision model accepts a PDF
 * directly, so it can read the pages without us rasterising them (which would
 * need a native canvas build in the serverless runtime).
 */
export async function ocrPdf(apiKey: string, bytes: ArrayBuffer): Promise<string> {
  const b64 = Buffer.from(bytes).toString("base64");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Extract all readable text from this scanned document, in reading order, preserving paragraph breaks. " +
                "Return only the text. Do not wrap it in code fences or add commentary.",
            },
            {
              type: "file",
              file: { filename: "scan.pdf", file_data: "data:application/pdf;base64," + b64 },
            },
          ],
        },
      ],
      max_tokens: 8000,
    }),
  });
  if (!res.ok) throw new Error("Scanned-PDF OCR error: " + res.status + " " + (await res.text()));
  const data = await res.json();
  return stripFences(data.choices?.[0]?.message?.content || "");
}

export async function ocrImage(apiKey: string, imageUrl: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Extract all text from this image. Return only the extracted text, preserving line breaks. " +
                "Do not wrap the output in code fences or add commentary.",
            },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 4000,
    }),
  });
  if (!res.ok) {
    throw new Error("OCR error: " + res.status + " " + (await res.text()));
  }
  const data = await res.json();
  return stripFences(data.choices?.[0]?.message?.content || "");
}
