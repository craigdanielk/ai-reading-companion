import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

interface ResultRow {
  id: string;
  selection_id?: string | null;
  understanding?: string | null;
  terms?: string[] | null;
  created_at: string;
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
