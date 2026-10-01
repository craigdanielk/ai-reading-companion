import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export interface SavedEntry {
  id: string;
  type: "answer" | "note";
  createdAt: string;
  bookId: string | null;
  bookTitle: string;
  textKind: string;
  sectionId: string;
  sectionTitle: string;
  selectionId: string | null;
  quote: string | null;
  action: string | null;
  targetLanguage: string | null;
  body: string;
  terms: string[];
}

/** Full reader history, including repeated actions and whole-text answers. */
export async function loadSavedHistory(supabase: Client): Promise<SavedEntry[]> {
  const [{ data: books }, { data: sections }, { data: selections }, { data: extracted }] = await Promise.all([
    supabase.from("book").select("id, title, kind"),
    supabase.from("content_item").select("id, title, book_id"),
    supabase.from("selection").select("id, content_item_id, quote"),
    supabase.from("extracted_text").select("id, content_item_id"),
  ]);
  const bookById = new Map((books ?? []).map((book) => [book.id, book.title || "Untitled"]));
  const kindByBook = new Map((books ?? []).map((book) => [book.id, book.kind || "book"]));
  const sectionById = new Map((sections ?? []).map((section) => [section.id, section]));
  const selectionById = new Map((selections ?? []).map((selection) => [selection.id, selection]));
  const extractedById = new Map((extracted ?? []).map((row) => [row.id, row.content_item_id]));

  type AnswerRow = {
    id: string; selection_id: string | null; extracted_text_id: string | null;
    action: string | null; target_language?: string | null; understanding: string | null;
    explanation: string | null; key_idea: string | null; terms: string[] | null; created_at: string;
  };
  const answers: AnswerRow[] = [];
  for (let offset = 0; ; offset += 500) {
    const response = await supabase.from("ai_result")
      .select("id, selection_id, extracted_text_id, action, target_language, understanding, explanation, key_idea, terms, created_at")
      .order("created_at", { ascending: false }).range(offset, offset + 499);
    const fallback = response.error?.code === "42703"
      ? await supabase.from("ai_result")
        .select("id, selection_id, extracted_text_id, action, understanding, explanation, key_idea, terms, created_at")
        .order("created_at", { ascending: false }).range(offset, offset + 499)
      : null;
    const error = fallback?.error || response.error;
    if (error && !fallback?.data) throw new Error("Could not load saved answers: " + error.message);
    const rows = (fallback?.data ?? response.data ?? []) as AnswerRow[];
    answers.push(...rows);
    if (rows.length < 500) break;
  }

  type NoteRow = { id: string; content_item_id: string; selection_id: string | null; body: string | null; created_at: string };
  const notes: NoteRow[] = [];
  for (let offset = 0; ; offset += 500) {
    const response = await supabase.from("note")
      .select("id, content_item_id, selection_id, body, created_at")
      .eq("kind", "personal")
      .order("created_at", { ascending: false }).range(offset, offset + 499);
    if (response.error) throw new Error("Could not load personal notes: " + response.error.message);
    const rows = (response.data ?? []) as NoteRow[];
    notes.push(...rows);
    if (rows.length < 500) break;
  }

  function context(sectionId: string) {
    const section = sectionById.get(sectionId);
    const bookId = section?.book_id || null;
    return {
      bookId,
      bookTitle: bookId ? bookById.get(bookId) || "Untitled" : "Unfiled text",
      textKind: bookId ? kindByBook.get(bookId) || "book" : "other",
      sectionId,
      sectionTitle: section?.title || "Text",
    };
  }

  const entries: SavedEntry[] = [];
  for (const row of answers) {
    const selection = row.selection_id ? selectionById.get(row.selection_id) : null;
    const sectionId = selection?.content_item_id || (row.extracted_text_id ? extractedById.get(row.extracted_text_id) : null);
    if (!sectionId || !sectionById.has(sectionId)) continue;
    entries.push({
      ...context(sectionId), id: row.id, type: "answer", createdAt: row.created_at,
      selectionId: row.selection_id, quote: selection?.quote || null,
      action: row.action || "understand", targetLanguage: row.target_language || null,
      body: row.understanding || row.key_idea || row.explanation || "",
      terms: Array.isArray(row.terms) ? row.terms : [],
    });
  }
  for (const row of notes) {
    if (!sectionById.has(row.content_item_id)) continue;
    entries.push({
      ...context(row.content_item_id), id: row.id, type: "note", createdAt: row.created_at,
      selectionId: row.selection_id, quote: row.selection_id ? selectionById.get(row.selection_id)?.quote || null : null,
      action: null, targetLanguage: null, body: row.body || "", terms: [],
    });
  }
  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
