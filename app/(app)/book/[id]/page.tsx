import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  updateBook,
  deleteBook,
  updateBodyText,
  setContentProfile,
  setSectionSource,
  uploadCover,
  removeCover,
  moveSection,
  removeSection,
} from "@/app/actions";
import { loadReaderData } from "@/lib/reader-data";
import { Reader } from "@/components/Reader";
import { Compose } from "@/components/Compose";
import { LangPicker } from "@/components/LangPicker";
import { KindBadge } from "@/components/KindBadge";
import { TextOptions } from "@/components/TextOptions";
import { ActionNotice } from "@/components/ActionNotice";
import { ConfirmDeleteButton, FormSubmitButton } from "@/components/FormButtons";
import { DOMAINS } from "@/lib/nuance/registry";
import { TEXT_KINDS } from "@/lib/text-kinds";

const MEDIUM_LABEL: Record<string, string> = {
  typed: "typed",
  image: "read from an image",
  document: "opened from a file",
};

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
  searchParams: Promise<{ s?: string; at?: string; notice?: string }>;
}) {
  const { id } = await params;
  const { s, at, notice } = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: book } = await supabase.from("book").select("*").eq("id", id).single();
  if (!book) notFound();

  const { data: sections } = await supabase
    .from("content_item")
    .select("id, title, body_text, position, created_at, source, medium")
    .eq("book_id", id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  const list = sections ?? [];
  const current = list.find((x) => x.id === s) ?? list[0] ?? null;

  const [{ data: profile }, reader, { data: prefs }, { data: usage }, { data: personalNotes }] = await Promise.all([
    current
      ? supabase.from("content_profile").select("*").eq("content_item_id", current.id).maybeSingle()
      : Promise.resolve({ data: null }),
    current
      ? loadReaderData(supabase, current.id)
      : Promise.resolve({ pageNote: null, selections: [] }),
    supabase.from("user_preference").select("*").eq("user_id", auth.user.id).maybeSingle(),
    current
      ? supabase.from("usage").select("counters").eq("content_item_id", current.id).maybeSingle()
      : Promise.resolve({ data: null }),
    current
      ? supabase
          .from("note")
          .select("id, body")
          .eq("content_item_id", current.id)
          .eq("kind", "personal")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const reading = {
    font: (prefs?.reading_font as "serif" | "sans") || "serif",
    size: (prefs?.reading_size as "small" | "medium" | "large" | "xl") || "medium",
    theme: (prefs?.reading_theme as "paper" | "sepia" | "night") || "paper",
    measure: (prefs?.reading_measure as "narrow" | "normal" | "wide") || "normal",
    paged: prefs?.reading_paged !== false,
  };
  const lastFraction = (usage?.counters as { lastFraction?: number } | null)?.lastFraction ?? null;

  const multi = list.length > 1;
  const readerTitle = multi ? current?.title || book.title : book.title;

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-h-0 flex-1 flex-col">
      {notice && <div className="px-5 pt-2"><ActionNotice notice={notice} /></div>}
      <div className="shrink-0 border-b border-line px-5 py-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <Link href="/library" className="inline-flex min-h-11 items-center px-1 hover:text-ink">
            &larr; Library
          </Link>
          <KindBadge kind={book.kind} size="sm" />
          <span className="text-muted">
            {book.cover_url ? "" : ""}
            {MEDIUM_LABEL[current?.medium || "typed"] || "typed"}
          </span>
          {multi && <span className="truncate text-ink-soft">{book.title}</span>}

          <Link
            href={"/saved?book=" + book.id}
            className="inline-flex min-h-11 items-center px-2 hover:text-ink"
          >
            History
          </Link>

          {current && (
            <TextOptions>
              <div className="space-y-3 text-left">
                <details>
                  <summary className="flex min-h-11 cursor-pointer items-center rounded-input px-2 py-2 text-[13px] font-medium text-ink hover:bg-paper-2">Language and comprehension</summary>
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
                    <FormSubmitButton label="Save" pendingLabel="Saving…" className="rounded-pill bg-ink px-3.5 py-1.5 text-xs font-medium text-paper" />
                </form>
                </details>

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
                    <label className="block text-[11px] tracking-wide">
                      KIND
                      <select
                        name="kind"
                        defaultValue={book.kind || "book"}
                        className="mt-1 w-full rounded-input border border-line bg-paper px-2 py-2 text-[13px] text-ink"
                      >
                        {TEXT_KINDS.map((k) => (
                          <option key={k.code} value={k.code}>
                            {k.label}
                          </option>
                        ))}
                      </select>
                    </label>
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
                  <form action={uploadCover} className="mt-3 space-y-2 border-t border-line pt-3">
                    <input type="hidden" name="id" value={book.id} />
                    <label className="block text-[11px] tracking-wide">
                      COVER IMAGE
                      <input
                        type="file"
                        name="cover"
                        accept="image/*"
                        className="mt-1 w-full text-[11px] text-ink-soft"
                      />
                    </label>
                    <button type="submit" className="rounded-pill border border-line px-3 py-1.5 text-xs">
                      {book.cover_url ? "Replace cover" : "Add cover"}
                    </button>
                  </form>
                  {book.cover_url && (
                    <form action={removeCover} className="mt-2">
                      <input type="hidden" name="id" value={book.id} />
                      <button type="submit" className="text-[11px] text-muted transition-colors hover:text-danger">
                        Remove cover
                      </button>
                    </form>
                  )}

                  {list.length > 1 && (
                    <div className="mt-3 border-t border-line pt-3">
                      <p className="text-[11px] tracking-wide">TEXTS IN THIS BOOK</p>
                      <ul className="mt-2 space-y-1">
                        {list.map((sec, i) => (
                          <li key={sec.id} className="flex items-center gap-2 text-[12px]">
                            <span className="min-w-0 flex-1 truncate text-ink-soft">{sec.title || "Untitled"}</span>
                            <form action={moveSection}>
                              <input type="hidden" name="id" value={sec.id} />
                              <input type="hidden" name="book_id" value={book.id} />
                              <input type="hidden" name="delta" value="-1" />
                              <button
                                type="submit"
                                disabled={i === 0}
                                className="px-1 text-muted transition-colors hover:text-ink disabled:opacity-30"
                                aria-label="Move up"
                              >
                                &uarr;
                              </button>
                            </form>
                            <form action={moveSection}>
                              <input type="hidden" name="id" value={sec.id} />
                              <input type="hidden" name="book_id" value={book.id} />
                              <input type="hidden" name="delta" value="1" />
                              <button
                                type="submit"
                                disabled={i === list.length - 1}
                                className="px-1 text-muted transition-colors hover:text-ink disabled:opacity-30"
                                aria-label="Move down"
                              >
                                &darr;
                              </button>
                            </form>
                            <form action={removeSection}>
                              <input type="hidden" name="id" value={sec.id} />
                              <input type="hidden" name="book_id" value={book.id} />
                              <button
                                type="submit"
                                className="px-1 text-muted transition-colors hover:text-danger"
                                aria-label="Remove this text"
                              >
                                &times;
                              </button>
                            </form>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <form action={setSectionSource} className="mt-3 space-y-2 border-t border-line pt-3">
                    <input type="hidden" name="content_item_id" value={current.id} />
                    <label className="block text-[11px] tracking-wide">
                      SOURCE
                      <input
                        name="source"
                        defaultValue={current.source || ""}
                        placeholder="Where this text came from"
                        className="mt-1 w-full rounded-input border border-line bg-paper px-3 py-2 text-[14px] text-ink"
                      />
                    </label>
                    <button type="submit" className="rounded-pill border border-line px-3 py-1.5 text-xs">
                      Save source
                    </button>
                  </form>

                  <form action={deleteBook} className="mt-3 border-t border-line pt-3">
                    <input type="hidden" name="id" value={book.id} />
                    <ConfirmDeleteButton label="Delete this text and everything read in it" question="Delete this text, its answers, and your notes? This cannot be undone." className="text-[11px] text-ember-600 hover:underline" />
                  </form>
                </details>
              </div>
            </TextOptions>
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
            key={current.id}
            contentItemId={current.id}
            title={readerTitle}
            bodyText={current.body_text || ""}
            pageNote={reader.pageNote}
            selections={reader.selections}
            canRun={Boolean(current.body_text)}
            sourceLanguage={profile?.source_language || "auto"}
            targetLanguage={profile?.target_language || "en"}
            domain={profile?.domain || "general"}
            focusSelection={at || null}
            reading={reading}
            initialFraction={lastFraction}
            notes={personalNotes ?? []}
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
    </div>
  );
}
