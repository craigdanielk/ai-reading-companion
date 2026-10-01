"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { resolveProvider } from "@/lib/providers/resolve";
import { ocrImage } from "@/lib/providers/ocr";
import { findKind, DEFAULT_KIND, TEXT_KINDS } from "@/lib/text-kinds";
import { extractDocument, detectDocKind, titleFromFilename } from "@/lib/extract/document";
import { ocrPdf } from "@/lib/providers/ocr";
import { isAdmin } from "@/lib/admin";

const DEMO_EMAIL = "demo@adel.dev";
const DEMO_PASSWORD = "AdelDemo2026!Secure";

/**
 * The reader's own OpenAI key (decrypted from Vault, ownership-checked in the
 * database) or the platform's. credential_ref is a Vault secret id, never a key,
 * so it must not be used as one.
 */
async function openAiKey(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data: conn } = await supabase
    .from("provider_connection")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", "openai")
    .maybeSingle();
  if (conn?.id) {
    const { data: secret } = await supabase.rpc("fn_provider_credential", { p_connection_id: conn.id });
    if (typeof secret === "string" && secret) return secret;
  }
  return process.env.OPENAI_API_KEY || process.env.OPEN_AI_API_KEY || null;
}

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

/** Operator-only: mint an invite link for a new reader. */
export async function inviteReader(
  _prev: unknown,
  formData: FormData
): Promise<{ link?: string; email?: string; error?: string } | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || !isAdmin(auth.user.email)) return { error: "Not authorised." };

  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  if (!email.includes("@")) return { error: "Enter a valid email address." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "invite", email });
  if (error) return { error: error.message };
  return { link: data?.properties?.action_link ?? "", email };
}

/** Operator-only: mint a password-reset link for someone locked out. */
export async function recoveryLink(
  _prev: unknown,
  formData: FormData
): Promise<{ link?: string; email?: string; error?: string } | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || !isAdmin(auth.user.email)) return { error: "Not authorised." };

  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  if (!email.includes("@")) return { error: "Enter a valid email address." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
  if (error) return { error: error.message };
  return { link: data?.properties?.action_link ?? "", email };
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

// Deleting a text means deleting the text: its sections, what was understood in
// them, and the source files. Leaving sections "unfiled" left ghosts, and
// leaving the files behind orphaned storage that nothing would ever collect.
/** C2: where the text came from. */
export async function setSectionSource(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const content_item_id = formData.get("content_item_id") as string;
  const source = ((formData.get("source") as string) || "").trim() || null;
  const { error } = await supabase.from("content_item").update({ source }).eq("id", content_item_id);
  if (error) console.error("setSectionSource:", error.message);
  redirect(await sectionUrl(supabase, content_item_id));
}

/** C2: an optional cover for the text. Stored privately, signed on read. */
export async function uploadCover(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const id = formData.get("id") as string;
  const file = formData.get("cover") as File | null;
  if (file && file.size > 0 && (file.type || "").startsWith("image/")) {
    const safe = (file.name || "cover").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-40);
    const path = data.user.id + "/covers/" + id + "-" + Date.now() + "-" + safe;
    const { error } = await supabase.storage.from("content").upload(path, file);
    if (error) console.error("uploadCover:", error.message);
    else await supabase.from("book").update({ cover_url: path }).eq("id", id);
  }
  redirect("/book/" + id);
}

export async function deleteNote(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const id = formData.get("id") as string;
  const content_item_id = formData.get("content_item_id") as string;
  const { error } = await supabase.from("note").delete().eq("id", id);
  if (error) console.error("deleteNote:", error.message);
  redirect(await sectionUrl(supabase, content_item_id));
}

export async function updateNote(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const id = formData.get("id") as string;
  const content_item_id = formData.get("content_item_id") as string;
  const body = ((formData.get("body") as string) || "").trim();
  if (!body) redirect(await sectionUrl(supabase, content_item_id));
  const { error } = await supabase.from("note").update({ body }).eq("id", id);
  if (error) console.error("updateNote:", error.message);
  redirect(await sectionUrl(supabase, content_item_id));
}

/** C2: back to the typeset cover. */
export async function removeCover(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const id = formData.get("id") as string;
  const { data: book } = await supabase.from("book").select("cover_url").eq("id", id).single();
  const path = book?.cover_url as string | null;
  if (path && !/^https?:\/\//.test(path)) {
    await supabase.storage.from("content").remove([path]);
  }
  await supabase.from("book").update({ cover_url: null }).eq("id", id);
  redirect("/book/" + id);
}

/** Reorder the texts inside a book. */
export async function moveSection(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const id = formData.get("id") as string;
  const book_id = formData.get("book_id") as string;
  const delta = Number(formData.get("delta") || 0);

  const { data: list } = await supabase
    .from("content_item")
    .select("id, position, created_at")
    .eq("book_id", book_id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  const ordered = list ?? [];
  const at = ordered.findIndex((s) => s.id === id);
  const to = at + delta;
  if (at >= 0 && to >= 0 && to < ordered.length) {
    const swapped = [...ordered];
    [swapped[at], swapped[to]] = [swapped[to], swapped[at]];
    await Promise.all(
      swapped.map((s, i) => supabase.from("content_item").update({ position: i }).eq("id", s.id))
    );
  }
  redirect("/book/" + book_id + "?s=" + id);
}

/** Remove one text from a book, with whatever was read in it. */
export async function removeSection(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const id = formData.get("id") as string;
  const book_id = formData.get("book_id") as string;
  const { data: item } = await supabase.from("content_item").select("storage_ref").eq("id", id).single();
  const path = item?.storage_ref as string | null;
  if (path) await supabase.storage.from("content").remove([path]);
  await supabase.from("content_item").delete().eq("id", id);
  redirect("/book/" + book_id);
}
export async function deleteBook(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const id = formData.get("id") as string;

  const { data: items } = await supabase
    .from("content_item")
    .select("storage_ref")
    .eq("book_id", id);
  const paths = (items ?? [])
    .map((i) => i.storage_ref as string | null)
    .filter((p): p is string => Boolean(p));
  if (paths.length) {
    const { error } = await supabase.storage.from("content").remove(paths);
    if (error) console.error("deleteBook storage:", error.message);
  }

  // Sections cascade to profiles, selections, extracted text, results and notes.
  await supabase.from("content_item").delete().eq("book_id", id);
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

  // A document already has a name; a pasted passage does not.
  const askedTitle = ((formData.get("title") as string) || "").trim().slice(0, 90);
  const title = askedTitle || titleFrom(body_text);
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
  const askedMedium = (formData.get("medium") as string) || "typed";
  const medium = ["typed", "image", "document"].includes(askedMedium) ? askedMedium : "typed";

  const { data: item, error } = await supabase
    .from("content_item")
    .insert({ user_id: data.user.id, book_id: bookId, kind: "text", title, body_text, position, storage_ref, medium })
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
  const { error } = await supabase.rpc("fn_delete_provider_credential", { p_connection_id: id });
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
    // The credential is written to Vault by a SECURITY DEFINER function; this
    // table only ever holds the secret's id. The key is never stored, echoed or
    // logged here.
    const { error } = await supabase.rpc("fn_put_provider_credential", {
      p_provider: provider,
      p_secret: api_key.trim(),
      p_model: model,
    });
    if (error) console.error("connectProvider:", error.message);
  }

  // Connecting from Settings has no content item to return to.
  redirect(content_item_id ? await sectionUrl(supabase, content_item_id) : "/settings/providers");
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

  const apiKey = await openAiKey(supabase, auth.user.id);
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

/**
 * Bring in a document that already contains text: PDF, EPUB, DOCX, TXT or
 * Markdown. Images are a different path — they go through OCR.
 */
export async function importDocument(
  formData: FormData
): Promise<{
  text?: string;
  title?: string;
  kind?: string;
  warning?: string;
  error?: string;
  path?: string;
  medium?: string;
  truncated?: boolean;
}> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Not signed in" };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "No file selected" };

  const kind = detectDocKind(file.name, file.type);
  if (kind === "image") return { error: "Images are read with Scan or upload." };
  if (kind === "unknown") {
    return { error: "That file type is not supported. Use PDF, EPUB, DOCX, TXT or Markdown." };
  }

  // Keep the original file: it is the provenance of the text.
  const safe = (file.name || "document").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  const path = auth.user.id + "/uploads/" + Date.now() + "-" + safe;
  const { error: upErr } = await supabase.storage.from("content").upload(path, file);
  if (upErr) console.error("importDocument storage:", upErr.message);

  try {
    const r = await extractDocument(file);

    // R6: a PDF with no text layer is a scan. The vision model can read the PDF
    // directly, so try that before telling the reader to do it by hand.
    if (r.needsVision) {
      if (file.size > 8 * 1024 * 1024) {
        return {
          warning:
            "That PDF is a scan and too large to read in one pass. Upload its pages as images instead.",
        };
      }
      const key = await openAiKey(supabase, auth.user.id);
      if (!key) {
        return {
          error: "Reading a scanned PDF needs an OpenAI key. Connect one in Settings, or upload the pages as images.",
        };
      }
      try {
        const text = await ocrPdf(key, await file.arrayBuffer());
        if (text.trim()) {
          return {
            text: text.slice(0, 600000),
            title: titleFromFilename(file.name),
            kind: "pdf",
            path,
            medium: "document",
            warning: "This PDF is a scan, so the text was read from the page images.",
          };
        }
      } catch (e) {
        console.error("importDocument scan:", (e as Error).message);
      }
      return { warning: "That scanned PDF could not be read. Try uploading its pages as images." };
    }

    if (!r.text.trim()) {
      return { warning: r.warning || "No readable text was found in that file." };
    }
    return {
      text: r.text,
      title: titleFromFilename(file.name),
      kind: r.kind,
      warning: r.warning,
      path,
      medium: "document",
      truncated: r.truncated,
    };
  } catch (e) {
    console.error("importDocument:", (e as Error).message);
    return { error: "That file could not be read. It may be corrupt or password-protected." };
  }
}
