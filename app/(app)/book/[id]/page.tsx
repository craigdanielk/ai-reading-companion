import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateBook, deleteBook, updateBodyText, setContentProfile } from "@/app/actions";
import { loadReaderData } from "@/lib/reader-data";
import { Reader } from "@/components/Reader";
import { Compose } from "@/components/Compose";
import { LangPicker } from "@/components/LangPicker";
import { DOMAINS } from "@/lib/nuance/registry";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("book").select("title").eq("id", id).single();
  return { title: data?.title || "Text" };
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ s?: string; at?: string }>;
}) {
  const { id } = await params;
  const { s, at } = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: book } = await supabase.from("book").select("*").eq("id", id).single();
  if (!book) notFound();

  const { data: sections } = await supabase
    .from("content_item")
    .select("id, title, body_text, position, created_at")
    .eq("book_id", id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  const list = sections ?? [];
  const current = list.find((x) => x.id === s) ?? list[0] ?? null;

  const [{ data: profile }, reader, noteCount, { data: prefs }, { data: usage }] = await Promise.all([
    current
      ? supabase.from("content_profile").select("*").eq("content_item_id", current.id).maybeSingle()
      : Promise.resolve({ data: null }),
    current
      ? loadReaderData(supabase, current.id)
      : Promise.resolve({ pageNote: null, selections: [] }),
    list.length
      ? supabase
          .from("selection")
          .select("id", { count: "exact", head: true })
          .in("content_item_id", list.map((x) => x.id))
          .then((r) => r.count ?? 0)
      : Promise.resolve(0),
    supabase.from("user_preference").select("*").eq("user_id", auth.user.id).maybeSingle(),
    current
      ? supabase.from("usage").select("counters").eq("content_item_id", current.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const reading = {
    font: (prefs?.reading_font as "serif" | "sans") || "serif",
    size: (prefs?.reading_size as "small" | "medium" | "large" | "xl") || "medium",
    theme: (prefs?.reading_theme as "paper" | "sepia" | "night") || "paper",
    measure: (prefs?.reading_measure as "narrow" | "normal" | "wide") || "normal",
  };
  const lastFraction = (usage?.counters as { lastFraction?: number } | null)?.lastFraction ?? null;

  const multi = list.length > 1;
  const readerTitle = multi ? current?.title || book.title : book.title;

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <div className="shrink-0 border-b border-line px-5 py-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <Link href="/library" className="hover:text-ink">
            &larr; Library
          </Link>
          {multi && <span className="truncate text-ink-soft">{book.title}</span>}

          <Link
            href={"/book/" + book.id + "/notes"}
            className={(noteCount || 0) > 0 ? "hover:text-ink" : "opacity-60 hover:text-ink"}
          >
            Notes{(noteCount || 0) > 0 ? " (" + noteCount + ")" : ""}
          </Link>

          {current && (
            <details className="ml-auto">
              <summary className="cursor-pointer hover:text-ink">Reading settings</summary>
              <div className="mt-3 w-[min(22rem,80vw)] space-y-3 rounded-card border border-line bg-paper p-3 text-left">
                <form action={setContentProfile} className="space-y-3">
                  <input type="hidden" name="content_item_id" value={current.id} />
                  <div>
                    <span className="text-[11px] tracking-wide">READING FROM</span>
                    <LangPicker
                      name="source_language"
                      defaultValue={profile?.source_language || "auto"}
                      includeAuto
                      legend="Source language"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] tracking-wide">READING INTO</span>
                    <LangPicker
                      name="target_language"
                      defaultValue={profile?.target_language || "en"}
                      legend="Target language"
                    />
                  </div>
                  <div className="flex gap-2">
                    <label className="flex-1 text-[11px] tracking-wide">
                      <select
                        name="domain"
                        defaultValue={profile?.domain || "general"}
                        className="mt-1 w-full rounded-input border border-line bg-paper px-2 py-2 text-[13px] text-ink"
                      >
                        {DOMAINS.map((d) => (
                          <option key={d.code} value={d.code}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex-1 text-[11px] tracking-wide">
                      <select
                        name="comprehension_depth"
                        defaultValue={profile?.comprehension_depth || "intermediate"}
                        className="mt-1 w-full rounded-input border border-line bg-paper px-2 py-2 text-[13px] text-ink"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </label>
                  </div>
                  <button type="submit" className="rounded-pill bg-ink px-3.5 py-1.5 text-xs font-medium text-paper">
                    Save
                  </button>
                </form>

                <details className="border-t border-line pt-3">
                  <summary className="cursor-pointer text-[13px]">Edit the text</summary>
                  <form action={updateBodyText} className="mt-2 space-y-2">
                    <input type="hidden" name="id" value={current.id} />
                    <textarea
                      name="body_text"
                      defaultValue={current.body_text || ""}
                      rows={6}
                      className="w-full resize-y rounded-input border border-line bg-paper px-3 py-2 text-[14px] text-ink"
                    />
                    <button type="submit" className="rounded-pill border border-line px-3 py-1.5 text-xs">
                      Save text
                    </button>
                  </form>
                </details>

                <details className="border-t border-line pt-3">
                  <summary className="cursor-pointer text-[13px]">Book details</summary>
                  <form action={updateBook} className="mt-2 space-y-2">
                    <input type="hidden" name="id" value={book.id} />
                    <input
                      name="title"
                      defaultValue={book.title}
                      placeholder="Title"
                      className="w-full rounded-input border border-line bg-paper px-3 py-2 text-[14px] text-ink"
                    />
                    <input
                      name="author"
                      defaultValue={book.author || ""}
                      placeholder="Author"
                      className="w-full rounded-input border border-line bg-paper px-3 py-2 text-[14px] text-ink"
                    />
                    <textarea
                      name="description"
                      defaultValue={book.description || ""}
                      rows={2}
                      placeholder="Notes about this text"
                      className="w-full resize-y rounded-input border border-line bg-paper px-3 py-2 text-[14px] text-ink"
                    />
                    <button type="submit" className="rounded-pill border border-line px-3 py-1.5 text-xs">
                      Save details
                    </button>
                  </form>
                  <form action={deleteBook} className="mt-2">
                    <input type="hidden" name="id" value={book.id} />
                    <button type="submit" className="text-[11px] text-ember-600 hover:underline">
                      Delete this text (its passages stay, unfiled)
                    </button>
                  </form>
                </details>
              </div>
            </details>
          )}
        </div>

        {multi && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {list.map((sec) => (
              <Link
                key={sec.id}
                href={"/book/" + book.id + "?s=" + sec.id}
                className={
                  "max-w-[16rem] truncate rounded-pill border px-3 py-1 text-[12px] " +
                  (sec.id === current?.id
                    ? "border-ember bg-paper-2 font-medium text-ink"
                    : "border-line text-ink-soft hover:bg-paper-2")
                }
              >
                {sec.title || "Untitled"}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="lg:min-h-0 lg:flex-1">
        {current ? (
          <Reader
            contentItemId={current.id}
            title={readerTitle}
            bodyText={current.body_text || ""}
            pageNote={reader.pageNote}
            selections={reader.selections}
            canRun={Boolean(current.body_text)}
            sourceLanguage={profile?.source_language || "auto"}
            targetLanguage={profile?.target_language || "en"}
            domain={profile?.domain || "general"}
            depth={profile?.comprehension_depth || "intermediate"}
            focusSelection={at || null}
            reading={reading}
            initialFraction={lastFraction}
          />
        ) : (
          <div className="mx-auto w-full max-w-2xl px-5 py-8">
            <h1 className="font-display text-2xl font-semibold">{book.title}</h1>
            <p className="mt-2 text-sm text-muted">Paste the text you want to read.</p>
            <div className="mt-5">
              <Compose bookId={book.id} autoFocus />
            </div>
          </div>
        )}
      </div>

      {current && (
        <details className="shrink-0 border-t border-line px-5 py-2.5 text-xs text-muted">
          <summary className="cursor-pointer hover:text-ink">Add another text to this book</summary>
          <div className="mt-3 pb-3">
            <Compose bookId={book.id} />
          </div>
        </details>
      )}
    </div>
  );
}
