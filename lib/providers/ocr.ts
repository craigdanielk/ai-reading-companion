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
