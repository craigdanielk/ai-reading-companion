"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
