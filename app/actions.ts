"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resolveProvider } from "@/lib/providers/resolve";
import { ocrImage } from "@/lib/providers/ocr";

export async function createContentItem(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { error } = await supabase.from("content_item").insert({
    user_id: data.user.id,
    kind: (formData.get("kind") as string) || "text",
    title: (formData.get("title") as string) || null,
    source: (formData.get("source") as string) || null,
  });
  if (error) console.error("createContentItem:", error.message);
  redirect("/library");
}

export async function setContentProfile(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const content_item_id = formData.get("content_item_id") as string;
  const target_language = formData.get("target_language") as string;
  const comprehension_depth = formData.get("comprehension_depth") as string;

  const { data: existing } = await supabase
    .from("content_profile")
    .select("id")
    .eq("content_item_id", content_item_id)
    .maybeSingle();

  let error;
  if (existing) {
    const res = await supabase
      .from("content_profile")
      .update({ target_language, comprehension_depth })
      .eq("id", existing.id);
    error = res.error;
  } else {
    const res = await supabase.from("content_profile").insert({
      content_item_id,
      target_language,
      comprehension_depth,
    });
    error = res.error;
  }
  if (error) console.error("setContentProfile:", error.message);
  redirect("/library/" + content_item_id);
}

export async function updateBodyText(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const id = formData.get("id") as string;
  const body_text = (formData.get("body_text") as string) || null;
  const { error } = await supabase
    .from("content_item")
    .update({ body_text })
    .eq("id", id);
  if (error) console.error("updateBodyText:", error.message);
  redirect("/library/" + id);
}

export async function understand(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const content_item_id = formData.get("content_item_id") as string;
  const { data: item } = await supabase
    .from("content_item")
    .select("*")
    .eq("id", content_item_id)
    .single();
  const text = item?.body_text;
  if (!text) redirect("/library/" + content_item_id);

  const { data: profile } = await supabase
    .from("content_profile")
    .select("*")
    .eq("content_item_id", content_item_id)
    .maybeSingle();
  const target_language = profile?.target_language || "en";
  const comprehension_depth = profile?.comprehension_depth || "intermediate";

  let etId: string;
  const { data: existingEt } = await supabase
    .from("extracted_text")
    .select("id")
    .eq("content_item_id", content_item_id)
    .maybeSingle();
  if (existingEt) {
    etId = existingEt.id;
    await supabase.from("extracted_text").update({ raw_text: text, corrected_text: text }).eq("id", etId);
  } else {
    const { data: newEt } = await supabase
      .from("extracted_text")
      .insert({ content_item_id, raw_text: text, corrected_text: text })
      .select("id")
      .single();
    if (!newEt) {
      console.error("understand: failed to create extracted_text");
      redirect("/library/" + content_item_id);
    }
    etId = newEt.id;
  }

  try {
    const provider = await resolveProvider();
    const result = await provider.comprehend({
      text,
      targetLanguage: target_language,
      comprehensionDepth: comprehension_depth as "beginner" | "intermediate" | "advanced",
    });
    const { error } = await supabase.from("ai_result").insert({
      extracted_text_id: etId,
      original: result.original,
      understanding: result.understanding,
      terms: result.importantTerms,
      key_idea: result.keyIdea,
      explanation: result.explanation,
    });
    if (error) console.error("understand insert:", error.message);
  } catch (e) {
    console.error("understand provider:", (e as Error).message);
  }

  // track usage (T14)
  const now = new Date().toISOString();
  const { data: usageRow } = await supabase
    .from("usage")
    .select("id, counters")
    .eq("user_id", data.user.id)
    .eq("content_item_id", content_item_id)
    .maybeSingle();
  const prev = (usageRow?.counters ?? {}) as Record<string, number>;
  const counters = { ...prev, comprehends: (prev.comprehends || 0) + 1 };
  if (usageRow) {
    await supabase.from("usage").update({ counters, last_position: now }).eq("id", usageRow.id);
  } else {
    await supabase.from("usage").insert({
      user_id: data.user.id,
      content_item_id,
      counters,
      last_position: now,
    });
  }

  redirect("/library/" + content_item_id);
}

export async function addNote(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const content_item_id = formData.get("content_item_id") as string;
  const body = (formData.get("body") as string) || "";
  if (!body.trim()) redirect("/library/" + content_item_id);

  const { error } = await supabase.from("note").insert({
    content_item_id,
    body,
    kind: "personal",
  });
  if (error) console.error("addNote:", error.message);
  redirect("/library/" + content_item_id);
}

export async function saveResultToNotes(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const content_item_id = formData.get("content_item_id") as string;
  const ai_result_id = formData.get("ai_result_id") as string;
  const { data: result } = await supabase
    .from("ai_result")
    .select("understanding")
    .eq("id", ai_result_id)
    .single();

  const { error } = await supabase.from("note").insert({
    content_item_id,
    source_ai_result_id: ai_result_id,
    body: result?.understanding || "",
    kind: "ai",
  });
  if (error) console.error("saveResultToNotes:", error.message);
  redirect("/library/" + content_item_id);
}

export async function connectProvider(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const content_item_id = formData.get("content_item_id") as string;
  const provider = formData.get("provider") as string;
  const api_key = (formData.get("api_key") as string) || "";

  if (api_key.trim()) {
    const { data: existing } = await supabase
      .from("provider_connection")
      .select("id")
      .eq("user_id", data.user.id)
      .eq("provider", provider)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("provider_connection")
        .update({ credential_ref: api_key, is_default: true })
        .eq("id", existing.id);
    } else {
      await supabase.from("provider_connection").insert({
        user_id: data.user.id,
        provider,
        credential_ref: api_key,
        is_default: true,
      });
    }
  }
  redirect("/library/" + content_item_id);
}

export async function uploadImage(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const content_item_id = formData.get("content_item_id") as string;
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) redirect("/library/" + content_item_id);

  const path = data.user.id + "/" + content_item_id + "/" + file.name;
  const { error } = await supabase.storage.from("content").upload(path, file);
  if (error) {
    console.error("uploadImage:", error.message);
  } else {
    await supabase.from("content_item").update({ storage_ref: path }).eq("id", content_item_id);
  }
  redirect("/library/" + content_item_id);
}

export async function extractText(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const content_item_id = formData.get("content_item_id") as string;
  const { data: item } = await supabase
    .from("content_item")
    .select("storage_ref")
    .eq("id", content_item_id)
    .single();
  const path = item?.storage_ref;
  if (!path) redirect("/library/" + content_item_id);

  const { data: signed } = await supabase.storage
    .from("content")
    .createSignedUrl(path, 120);
  const imageUrl = signed?.signedUrl;
  if (!imageUrl) redirect("/library/" + content_item_id);

  const { data: conn } = await supabase
    .from("provider_connection")
    .select("*")
    .eq("user_id", data.user.id)
    .eq("provider", "openai")
    .maybeSingle();
  const apiKey = conn?.credential_ref;
  if (!apiKey) {
    console.error("extractText: OCR requires a connected OpenAI provider (BYOK)");
    redirect("/library/" + content_item_id);
  }

  try {
    const text = await ocrImage(apiKey, imageUrl);
    const { data: existingEt } = await supabase
      .from("extracted_text")
      .select("id")
      .eq("content_item_id", content_item_id)
      .maybeSingle();
    if (existingEt) {
      await supabase
        .from("extracted_text")
        .update({ raw_text: text, corrected_text: text })
        .eq("id", existingEt.id);
    } else {
      await supabase
        .from("extracted_text")
        .insert({ content_item_id, raw_text: text, corrected_text: text });
    }
    await supabase.from("content_item").update({ body_text: text }).eq("id", content_item_id);
  } catch (e) {
    console.error("extractText:", (e as Error).message);
  }
  redirect("/library/" + content_item_id);
}
