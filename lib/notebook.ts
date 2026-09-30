import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

interface ResultRow {
  id: string;
  selection_id?: string | null;
  understanding?: string | null;
  terms?: string[] | null;
  created_at: string;
}

export interface GlobalNotebookEntry extends NotebookEntry {
  bookId: string;
  bookTitle: string;
}

export interface NotebookEntry {
  selectionId: string;
  sectionId: string;
  sectionTitle: string;
  quote: string;
  understanding: string | null;
  terms: string[] | null;
}

/**
 * Every saved gloss across a whole book, in reading order: sections in shelf
 * order, then by where each selection falls in its own text. Carries the section
 * id so the notebook can deep-link straight back to the paragraph it came from.
 */
export async function loadNotebook(supabase: Client, bookId: string): Promise<NotebookEntry[]> {
  const { data: sections } = await supabase
    .from("content_item")
    .select("id, title")
    .eq("book_id", bookId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  const list = sections ?? [];
  if (list.length === 0) return [];

  const order = new Map(list.map((s, i) => [s.id, i]));

  const { data: sels } = await supabase
    .from("selection")
    .select("id, content_item_id, start_offset, end_offset, quote")
    .in("content_item_id", list.map((s) => s.id))
    .order("start_offset", { ascending: true });

  const ids = (sels ?? []).map((s) => s.id);
  const { data: rows } = ids.length
    ? await supabase
        .from("ai_result")
        .select("id, selection_id, understanding, terms, created_at")
        .in("selection_id", ids)
        .order("created_at", { ascending: false })
    : { data: [] as ResultRow[] };

  // A selection understood more than once keeps its newest gloss.
  const newest = new Map<string, ResultRow>();
  for (const row of (rows ?? []) as ResultRow[]) {
    const key = row.selection_id || "";
    if (key && !newest.has(key)) newest.set(key, row);
  }

  const byId = new Map(list.map((s) => [s.id, s.title || "Text"]));

  const entries: NotebookEntry[] = [];
  for (const s of sels ?? []) {
    const row = newest.get(s.id);
    if (!row) continue; // a selection that was saved but never answered
    entries.push({
      selectionId: s.id,
      sectionId: s.content_item_id,
      sectionTitle: byId.get(s.content_item_id) || "Text",
      quote: s.quote,
      understanding: row.understanding ?? null,
      terms: row.terms ?? null,
    });
  }

  entries.sort((a, b) => {
    const d = (order.get(a.sectionId) ?? 0) - (order.get(b.sectionId) ?? 0);
    if (d !== 0) return d;
    const ao = (sels ?? []).find((s) => s.id === a.selectionId)?.start_offset ?? 0;
    const bo = (sels ?? []).find((s) => s.id === b.selectionId)?.start_offset ?? 0;
    return ao - bo;
  });

  return entries;
}

/** Every saved gloss across the whole library, newest book first. */
export async function loadNotebookAll(supabase: Client): Promise<GlobalNotebookEntry[]> {
  const { data: books } = await supabase
    .from("book")
    .select("id, title, created_at")
    .order("created_at", { ascending: false });
  const bookList = books ?? [];
  if (bookList.length === 0) return [];

  const bookIds = bookList.map((b) => b.id);
  const { data: sections } = await supabase
    .from("content_item")
    .select("id, title, book_id")
    .in("book_id", bookIds)
    .order("position", { ascending: true });

  const sectionList = sections ?? [];
  if (sectionList.length === 0) return [];

  const sectionTitle = new Map(sectionList.map((s) => [s.id, s.title || "Text"]));
  const sectionBook = new Map(sectionList.map((s) => [s.id, s.book_id as string]));
  const bookTitle = new Map(bookList.map((b) => [b.id, b.title]));

  const { data: sels } = await supabase
    .from("selection")
    .select("id, content_item_id, start_offset, quote")
    .in("content_item_id", sectionList.map((s) => s.id))
    .order("start_offset", { ascending: true });

  const ids = (sels ?? []).map((s) => s.id);
  const { data: rows } = ids.length
    ? await supabase
        .from("ai_result")
        .select("id, selection_id, understanding, terms, created_at")
        .in("selection_id", ids)
        .order("created_at", { ascending: false })
    : { data: [] as { id: string; selection_id: string | null; understanding: string | null; terms: string[] | null; created_at: string }[] };

  const newest = new Map<string, { understanding: string | null; terms: string[] | null }>();
  for (const row of rows ?? []) {
    const key = row.selection_id || "";
    if (key && !newest.has(key)) newest.set(key, { understanding: row.understanding, terms: row.terms });
  }

  const order = new Map(bookList.map((b, i) => [b.id, i]));
  const out: GlobalNotebookEntry[] = [];
  for (const s of sels ?? []) {
    const r = newest.get(s.id);
    if (!r) continue;
    const bid = sectionBook.get(s.content_item_id) || "";
    out.push({
      selectionId: s.id,
      sectionId: s.content_item_id,
      sectionTitle: sectionTitle.get(s.content_item_id) || "Text",
      quote: s.quote,
      understanding: r.understanding,
      terms: r.terms,
      bookId: bid,
      bookTitle: bookTitle.get(bid) || "Text",
    });
  }
  out.sort((a, b) => (order.get(a.bookId) ?? 0) - (order.get(b.bookId) ?? 0));
  return out;
}
