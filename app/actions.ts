"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { deepseekProvider } from "@/lib/providers/deepseek";

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

  // ensure an extracted_text row exists (ai_result references it)
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
    const result = await deepseekProvider.comprehend({
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
  redirect("/library/" + content_item_id);
}
