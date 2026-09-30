"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { resolveProvider } from "@/lib/providers/resolve";
import { ocrImage } from "@/lib/providers/ocr";
import { findKind, DEFAULT_KIND, TEXT_KINDS } from "@/lib/text-kinds";

const DEMO_EMAIL = "demo@adel.dev";
const DEMO_PASSWORD = "AdelDemo2026!Secure";

// A section of a book reads at the book's URL; an unfiled one reads standalone.
async function sectionUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contentItemId: string
): Promise<string> {
  const { data } = await supabase
    .from("content_item")
    .select("book_id")
    .eq("id", contentItemId)
    .maybeSingle();
  return data?.book_id ? "/book/" + data.book_id : "/passage/" + contentItemId;
}

export async function devLogin(): Promise<void> {
  const admin = createAdminClient();

  // ensure the demo user exists and is email-confirmed
  const { error: createErr } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (createErr) {
    // already exists — confirm it and enforce the known demo password
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const demo = data?.users?.find((u) => u.email === DEMO_EMAIL);
    if (demo) {
      await admin.auth.admin.updateUserById(demo.id, {
        email_confirm: true,
        password: DEMO_PASSWORD,
      });
    }
  }

  // sign in as the demo user (sets the session cookie via @supabase/ssr)
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });
  if (error) console.error("devLogin:", error.message);
  redirect("/library");
}

export async function createContentItem(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: item, error } = await supabase
    .from("content_item")
    .insert({
      user_id: data.user.id,
      kind: (formData.get("kind") as string) || "text",
      title: (formData.get("title") as string) || null,
      source: (formData.get("source") as string) || null,
      body_text: (formData.get("body_text") as string) || null,
    })
    .select("id")
    .single();
  if (error || !item) {
    console.error("createContentItem:", error?.message);
    redirect("/library");
  }

  // seed the per-content comprehension profile from the reader's saved defaults
  const { data: prefs } = await supabase
    .from("user_preference")
    .select("*")
    .eq("user_id", data.user.id)
    .maybeSingle();
  await supabase.from("content_profile").insert({
    content_item_id: item.id,
    source_language: prefs?.default_source_language || "auto",
    target_language: prefs?.default_target_language || "en",
    domain: prefs?.default_domain || "general",
    comprehension_depth: prefs?.default_depth || "intermediate",
  });

  redirect(await sectionUrl(supabase, item.id));
}

export async function setContentProfile(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const content_item_id = formData.get("content_item_id") as string;
  const target_language = formData.get("target_language") as string;
  const comprehension_depth = formData.get("comprehension_depth") as string;
  const domain = (formData.get("domain") as string) || "general";
  const source_language = (formData.get("source_language") as string) || "auto";

  const { data: existing } = await supabase
    .from("content_profile")
    .select("id")
    .eq("content_item_id", content_item_id)
    .maybeSingle();

  let error;
  if (existing) {
    const res = await supabase
      .from("content_profile")
      .update({ source_language, target_language, comprehension_depth, domain })
      .eq("id", existing.id);
    error = res.error;
  } else {
    const res = await supabase.from("content_profile").insert({
      content_item_id,
      source_language,
      target_language,
      comprehension_depth,
      domain,
    });
    error = res.error;
  }
  if (error) console.error("setContentProfile:", error.message);
  redirect(await sectionUrl(supabase, content_item_id));
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
  redirect(await sectionUrl(supabase, id));
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
  if (!text) redirect(await sectionUrl(supabase, content_item_id));

  const { data: profile } = await supabase
    .from("content_profile")
    .select("*")
    .eq("content_item_id", content_item_id)
    .maybeSingle();
  const target_language = profile?.target_language || "en";
  const comprehension_depth = profile?.comprehension_depth || "intermediate";
  const domain = (profile?.domain as "general" | "literary" | "scientific" | "legal") || "general";
  const source_language = (profile?.source_language as string) || "auto";

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
      redirect(await sectionUrl(supabase, content_item_id));
    }
    etId = newEt.id;
  }

  try {
    const provider = await resolveProvider();
    const result = await provider.comprehend({
      text,
      sourceLanguage: source_language,
      targetLanguage: target_language,
      comprehensionDepth: comprehension_depth as "beginner" | "intermediate" | "advanced",
      domain,
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

  redirect(await sectionUrl(supabase, content_item_id));
}

export async function addNote(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const content_item_id = formData.get("content_item_id") as string;
  const body = (formData.get("body") as string) || "";
  if (!body.trim()) redirect(await sectionUrl(supabase, content_item_id));

  const { error } = await supabase.from("note").insert({
    content_item_id,
    body,
    kind: "personal",
  });
  if (error) console.error("addNote:", error.message);
  redirect(await sectionUrl(supabase, content_item_id));
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
  redirect(await sectionUrl(supabase, content_item_id));
}

export async function createBook(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const title = ((formData.get("title") as string) || "").trim() || "Untitled book";
  const author = ((formData.get("author") as string) || "").trim() || null;

  const { data: book, error } = await supabase
    .from("book")
    .insert({ user_id: data.user.id, title, author })
    .select("id")
    .single();
  if (error || !book) {
    console.error("createBook:", error?.message);
    redirect("/library");
  }
  redirect("/book/" + book.id);
}

export async function updateBook(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const id = formData.get("id") as string;
  const title = ((formData.get("title") as string) || "").trim();
  const author = ((formData.get("author") as string) || "").trim() || null;
  const description = ((formData.get("description") as string) || "").trim() || null;
  const askedKind = (formData.get("kind") as string) || "";
  const kind = TEXT_KINDS.some((k) => k.code === askedKind) ? askedKind : null;
  if (title) {
    const { error } = await supabase
      .from("book")
      .update(kind ? { title, author, description, kind } : { title, author, description })
      .eq("id", id);
    if (error) console.error("updateBook:", error.message);
  }
  redirect("/book/" + id);
}

export async function deleteBook(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const id = formData.get("id") as string;
  await supabase.from("book").delete().eq("id", id);
  redirect("/library");
}

// Title from the text's own first line, cut on a word boundary.
function titleFrom(body: string): string {
  const line = body.split("\n")[0].replace(/\s+/g, " ").trim();
  if (line.length <= 60) return line;
  const cut = line.slice(0, 60);
  const at = cut.lastIndexOf(" ");
  return (at > 24 ? cut.slice(0, at) : cut) + "…";
}

// The primary act: paste a body of text. Without a book it becomes one — titled
// from its own first line — so that everything you read has somewhere to live.
export async function createText(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const givenBook = ((formData.get("book_id") as string) || "") || null;
  const body_text = ((formData.get("body_text") as string) || "").trim();
  if (!body_text) redirect(givenBook ? "/book/" + givenBook : "/library");

  const askedKind = (formData.get("kind") as string) || DEFAULT_KIND;
  const kind = (TEXT_KINDS.some((k) => k.code === askedKind) ? askedKind : DEFAULT_KIND) as string;

  const title = titleFrom(body_text);
  let bookId = givenBook;
  let bookKind = kind;

  if (!bookId) {
    const { data: book, error: bookErr } = await supabase
      .from("book")
      .insert({ user_id: data.user.id, title, kind })
      .select("id")
      .single();
    if (bookErr || !book) {
      console.error("createText book:", bookErr?.message);
      redirect("/library");
    }
    bookId = book.id;
  } else {
    // A section added to an existing text inherits that text's kind.
    const { data: parent } = await supabase.from("book").select("kind").eq("id", bookId).single();
    bookKind = (parent?.kind as string) || kind;
  }

  const { data: existing } = await supabase
    .from("content_item")
    .select("id")
    .eq("book_id", bookId);
  const position = existing?.length ?? 0;

  const storage_ref = ((formData.get("storage_ref") as string) || "") || null;

  const { data: item, error } = await supabase
    .from("content_item")
    .insert({ user_id: data.user.id, book_id: bookId, kind: "text", title, body_text, position, storage_ref })
    .select("id")
    .single();
  if (error || !item) {
    console.error("createText section:", error?.message);
    redirect("/book/" + bookId);
  }

  const { data: prefs } = await supabase
    .from("user_preference")
    .select("*")
    .eq("user_id", data.user.id)
    .maybeSingle();
  // The form seeds the register: a paper is read scientifically unless the reader
  // has said otherwise by choosing a default domain themselves.
  const kindDomain = findKind(bookKind).domain;
  const domain = kindDomain !== "general" ? kindDomain : prefs?.default_domain || "general";

  const { error: profileErr } = await supabase.from("content_profile").insert({
    content_item_id: item.id,
    source_language: prefs?.default_source_language || "auto",
    target_language: prefs?.default_target_language || "en",
    domain,
    comprehension_depth: prefs?.default_depth || "intermediate",
  });
  if (profileErr) console.error("createText profile:", profileErr.message);

  redirect("/book/" + bookId + "?s=" + item.id);
}

export async function savePreferences(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { error } = await supabase.from("user_preference").upsert(
    {
      user_id: data.user.id,
      default_source_language: (formData.get("source_language") as string) || "auto",
      default_target_language: (formData.get("target_language") as string) || "en",
      default_domain: (formData.get("domain") as string) || "general",
      default_depth: (formData.get("depth") as string) || "intermediate",
    },
    { onConflict: "user_id" }
  );
  if (error) console.error("savePreferences:", error.message);
  redirect("/settings/preferences");
}

// Reading-appearance choices — typeface, size, theme and measure. Applied live
// in the reader and remembered, so the device feels like yours.
export async function saveReadingAppearance(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const pick = (name: string, allowed: string[], fallback: string) => {
    const v = (formData.get(name) as string) || "";
    return allowed.includes(v) ? v : fallback;
  };

  const { error } = await supabase.from("user_preference").upsert(
    {
      user_id: data.user.id,
      reading_font: pick("reading_font", ["serif", "sans"], "serif"),
      reading_size: pick("reading_size", ["small", "medium", "large", "xl"], "medium"),
      reading_theme: pick("reading_theme", ["paper", "sepia", "night"], "paper"),
      reading_measure: pick("reading_measure", ["narrow", "normal", "wide"], "normal"),
      reading_paged: formData.get("reading_paged") === "scroll" ? false : true,
    },
    { onConflict: "user_id" }
  );
  if (error) console.error("saveReadingAppearance:", error.message);
}

export async function deleteProvider(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const id = formData.get("id") as string;
  const { error } = await supabase.from("provider_connection").delete().eq("id", id);
  if (error) console.error("deleteProvider:", error.message);
  redirect("/settings/providers");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function connectProvider(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const content_item_id = formData.get("content_item_id") as string;
  const provider = formData.get("provider") as string;
  const api_key = (formData.get("api_key") as string) || "";
  const model = (formData.get("model") as string) || null;

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
        .update({ credential_ref: api_key, model, is_default: true })
        .eq("id", existing.id);
    } else {
      await supabase.from("provider_connection").insert({
        user_id: data.user.id,
        provider,
        credential_ref: api_key,
        model,
        is_default: true,
      });
    }
  }
  redirect(await sectionUrl(supabase, content_item_id));
}

/**
 * OCR a page the reader just scanned or photographed, before any text exists.
 * Returns the extracted text so it can be reviewed and corrected in the capture
 * sheet — OCR is never trusted straight into the library.
 */
export async function ocrFromUpload(
  formData: FormData
): Promise<{ text?: string; path?: string; error?: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Not signed in" };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "No image selected" };

  // Keep the page image: it is the provenance of the text.
  const safe = (file.name || "page").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  const path = auth.user.id + "/uploads/" + Date.now() + "-" + safe;
  const { error: upErr } = await supabase.storage.from("content").upload(path, file);
  if (upErr) console.error("ocrFromUpload storage:", upErr.message);

  const { data: signed } = await supabase.storage.from("content").createSignedUrl(path, 300);
  const imageUrl = signed?.signedUrl;
  if (!imageUrl) return { error: "Could not read the uploaded image." };

  // OCR needs an OpenAI-compatible vision model: the reader's own key first,
  // then the platform's, so a scan works before BYOK is configured.
  const { data: conn } = await supabase
    .from("provider_connection")
    .select("credential_ref")
    .eq("user_id", auth.user.id)
    .eq("provider", "openai")
    .maybeSingle();
  const apiKey =
    conn?.credential_ref || process.env.OPENAI_API_KEY || process.env.OPEN_AI_API_KEY;
  if (!apiKey) {
    return { error: "Scanning a page needs an OpenAI key. Connect one in Settings, or paste the text." };
  }

  try {
    const text = await ocrImage(apiKey, imageUrl);
    if (!text || !text.trim()) return { error: "No readable text found in that image." };
    return { text, path };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function uploadImage(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const content_item_id = formData.get("content_item_id") as string;
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) redirect(await sectionUrl(supabase, content_item_id));

  const path = data.user.id + "/" + content_item_id + "/" + file.name;
  const { error } = await supabase.storage.from("content").upload(path, file);
  if (error) {
    console.error("uploadImage:", error.message);
  } else {
    await supabase.from("content_item").update({ storage_ref: path }).eq("id", content_item_id);
  }
  redirect(await sectionUrl(supabase, content_item_id));
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
  if (!path) redirect(await sectionUrl(supabase, content_item_id));

  const { data: signed } = await supabase.storage
    .from("content")
    .createSignedUrl(path, 120);
  const imageUrl = signed?.signedUrl;
  if (!imageUrl) redirect(await sectionUrl(supabase, content_item_id));

  const { data: conn } = await supabase
    .from("provider_connection")
    .select("*")
    .eq("user_id", data.user.id)
    .eq("provider", "openai")
    .maybeSingle();
  const apiKey = conn?.credential_ref;
  if (!apiKey) {
    console.error("extractText: OCR requires a connected OpenAI provider (BYOK)");
    redirect(await sectionUrl(supabase, content_item_id));
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
  redirect(await sectionUrl(supabase, content_item_id));
}
