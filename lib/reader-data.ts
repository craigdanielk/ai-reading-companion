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
 * Everything the reader needs for one section: the highlights to draw, and the
 * most recent thing understood about it — whether that was the whole text or the
 * last few words the reader selected.
 */
export async function loadReaderData(
  supabase: Client,
  contentItemId: string
): Promise<{ latest: Result | null; selections: SelectionRow[] }> {
  const { data: et } = await supabase
    .from("extracted_text")
    .select("id")
    .eq("content_item_id", contentItemId)
    .maybeSingle();

  const { data: sels } = await supabase
    .from("selection")
    .select("id, start_offset, end_offset, quote")
    .eq("content_item_id", contentItemId)
    .order("start_offset", { ascending: true });

  const ids = (sels ?? []).map((s) => s.id);

  const [selRes, secRes] = await Promise.all([
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
          .order("created_at", { ascending: false })
          .limit(1)
      : Promise.resolve({ data: [] as ResultRow[] }),
  ]);

  const selRows = (selRes.data ?? []) as ResultRow[];
  const secRow = ((secRes.data ?? []) as ResultRow[])[0] ?? null;

  const newestPerSelection = new Map<string, Result>();
  for (const row of selRows) {
    const key = row.selection_id || "";
    if (key && !newestPerSelection.has(key)) newestPerSelection.set(key, toResult(row));
  }

  const selections: SelectionRow[] = (sels ?? []).map((s) => ({
    id: s.id,
    start: s.start_offset,
    end: s.end_offset,
    quote: s.quote,
    result: newestPerSelection.get(s.id) ?? null,
  }));

  let latest: Result | null = secRow ? toResult(secRow) : null;
  const newestSelection = selRows[0];
  if (newestSelection) {
    const a = new Date(newestSelection.created_at).getTime();
    const b = secRow ? new Date(secRow.created_at).getTime() : -1;
    if (a >= b) latest = toResult(newestSelection);
  }

  return { latest, selections };
}
