import type { createClient } from "@/lib/supabase/server";
import type { Result, SelectionRow } from "@/components/Reader";

type Client = Awaited<ReturnType<typeof createClient>>;

interface ResultRow {
  id: string;
  selection_id?: string | null;
  mode?: string | null;
  original?: string | null;
  understanding?: string | null;
  terms?: string[] | null;
  key_idea?: string | null;
  explanation?: string | null;
  created_at: string;
}

function toResult(row: ResultRow): Result {
  return {
    id: row.id,
    mode: row.mode === "page" ? "page" : "passage",
    original: row.original ?? null,
    understanding: row.understanding ?? null,
    terms: row.terms ?? null,
    keyIdea: row.key_idea ?? null,
    explanation: row.explanation ?? null,
  };
}

/**
 * Everything the reader needs for one section: the highlights to draw in the
 * text, and the note that belongs beside the whole thing.
 */
export async function loadReaderData(
  supabase: Client,
  contentItemId: string
): Promise<{ pageNote: Result | null; selections: SelectionRow[] }> {
  const { data: et } = await supabase
    .from("extracted_text")
    .select("id")
    .eq("content_item_id", contentItemId)
    .maybeSingle();

  const { data: sels } = await supabase
    .from("selection")
    .select("id, start_offset, end_offset, quote, created_at")
    .eq("content_item_id", contentItemId)
    .order("start_offset", { ascending: true });

  const ids = (sels ?? []).map((s) => s.id);

  const [selRes, pageRes] = await Promise.all([
    ids.length
      ? supabase
          .from("ai_result")
          .select("id, selection_id, mode, original, understanding, terms, key_idea, explanation, created_at")
          .in("selection_id", ids)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as ResultRow[] }),
    et
      ? supabase
          .from("ai_result")
          .select("id, mode, original, understanding, terms, key_idea, explanation, created_at")
          .eq("extracted_text_id", et.id)
          .eq("mode", "page")
          .order("created_at", { ascending: false })
          .limit(1)
      : Promise.resolve({ data: [] as ResultRow[] }),
  ]);

  const selRows = (selRes.data ?? []) as ResultRow[];
  const pageRow = ((pageRes.data ?? []) as ResultRow[])[0] ?? null;

  const newestPerSelection = new Map<string, ResultRow>();
  for (const row of selRows) {
    const key = row.selection_id || "";
    if (key && !newestPerSelection.has(key)) newestPerSelection.set(key, row);
  }

  const selections: SelectionRow[] = (sels ?? []).map((s) => {
    const row = newestPerSelection.get(s.id) ?? null;
    return {
      id: s.id,
      start: s.start_offset,
      end: s.end_offset,
      quote: s.quote,
      createdAt: row?.created_at ?? s.created_at,
      result: row ? toResult(row) : null,
    };
  });

  return { pageNote: pageRow ? toResult(pageRow) : null, selections };
}
