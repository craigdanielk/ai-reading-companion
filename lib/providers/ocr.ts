// OCR via a vision-capable provider (OpenAI gpt-4o-mini image input).
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
            { type: "text", text: "Extract all text from this image. Return only the extracted text, preserving line breaks." },
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
  return data.choices?.[0]?.message?.content || "";
}
