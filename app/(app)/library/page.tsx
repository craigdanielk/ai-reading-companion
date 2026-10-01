import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BookCover } from "@/components/BookCover";
import { LangBadge } from "@/components/LangBadge";
import { KIND_ORDER, findKind, TEXT_KINDS } from "@/lib/text-kinds";
import { coverUrl } from "@/lib/covers";
import { SearchBox } from "@/components/SearchBox";
import { ActionNotice } from "@/components/ActionNotice";

function snippet(text: string, term: string): string {
  const i = text.toLowerCase().indexOf(term.toLowerCase());
  if (i < 0) return "";
  const start = Math.max(0, i - 70);
  const cut = text.slice(start, i + term.length + 110).replace(/\s+/g, " ").trim();
  return (start > 0 ? "…" : "") + cut + "…";
}

export const metadata = { title: "Library" };

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; q?: string; notice?: string }>;
}) {
  const { kind, q, notice } = await searchParams;
  const term = (q || "").trim();
  const activeKind = TEXT_KINDS.some((k) => k.code === kind) ? (kind as string) : null;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: books } = await supabase
    .from("book")
    .select("id, title, author, cover_url, kind, created_at")
    .order("created_at", { ascending: false });

  const { data: sections } = await supabase
    .from("content_item")
    .select("id, title, book_id, created_at")
    .order("created_at", { ascending: true });

  const sectionIds = (sections ?? []).map((s) => s.id);
  const { data: profiles } = sectionIds.length
    ? await supabase
        .from("content_profile")
        .select("content_item_id, source_language, target_language")
        .in("content_item_id", sectionIds)
    : { data: [] as { content_item_id: string; source_language: string; target_language: string }[] };

  const profileOf = new Map((profiles ?? []).map((p) => [p.content_item_id, p]));
  const bookLangs = new Map<string, { source: string; target: string }>();
  for (const s of sections ?? []) {
    if (!s.book_id || bookLangs.has(s.book_id)) continue;
    const p = profileOf.get(s.id);
    if (p) bookLangs.set(s.book_id, { source: p.source_language, target: p.target_language });
  }

  // Search covers both what a text IS CALLED and what is INSIDE it — the latter
  // is the one that matters when you are hunting for a half-remembered passage.
  let inText: { id: string; book_id: string; title: string | null; body_text: string }[] = [];
  if (term) {
    const { data: hits } = await supabase
      .from("content_item")
      .select("id, book_id, title, body_text")
      .ilike("body_text", "%" + term.replace(/[%_]/g, "") + "%")
      .limit(25);
    inText = (hits ?? []) as typeof inText;
  }

  const all = books ?? [];
  // Covers are stored privately; sign the ones that came from storage.
  const signed = new Map<string, string | null>();
  await Promise.all(
    all
      .filter((b) => b.cover_url && !/^https?:\/\//.test(b.cover_url))
      .map(async (b) => signed.set(b.id, await coverUrl(supabase, b.cover_url)))
  );
  const orphans = (sections ?? []).filter((s) => !s.book_id);

  const byKind = activeKind ? all.filter((b) => (b.kind || "book") === activeKind) : all;
  const needle = term.toLowerCase();
  const visible = term
    ? byKind.filter(
        (b) =>
          b.title.toLowerCase().includes(needle) ||
          (b.author || "").toLowerCase().includes(needle) ||
          inText.some((h) => h.book_id === b.id)
      )
    : byKind;
  const heading = term ? "Results for “" + term + "”" : activeKind ? findKind(activeKind).plural : "All texts";

  const buckets = (activeKind ? [activeKind] : KIND_ORDER)
    .map((code) => ({
      kind: findKind(code),
      items: visible.filter((b) => (b.kind || "book") === code),
    }))
    .filter((b) => b.items.length > 0);

  return (
    <div className="h-full min-h-0 overflow-y-auto">
        <main className="mx-auto w-full max-w-4xl px-5 py-8 lg:py-10">
          {notice && <div className="mb-4"><ActionNotice notice={notice} /></div>}
          <div className="-mx-3 mb-5 md:hidden"><SearchBox /></div>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h1 className="font-display text-[26px] font-semibold leading-tight lg:text-[30px]">{heading}</h1>
            {activeKind && (
              <Link href="/library" className="text-[12px] text-muted transition-colors hover:text-ink">
                Show all texts
              </Link>
            )}
          </div>

          <nav aria-label="Text kinds" className="-mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-2 md:hidden">
            <Link href="/library" aria-current={!activeKind ? "page" : undefined} className={"flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-pill border px-3 py-2 text-[12px] " + (!activeKind ? "border-ember bg-paper-2 font-medium text-ink" : "border-line text-ink-soft")}>All</Link>
            {TEXT_KINDS.map((item) => (
              <Link key={item.code} href={"/library?kind=" + item.code} aria-current={activeKind === item.code ? "page" : undefined} className={"flex min-h-11 shrink-0 items-center rounded-pill border px-3 py-2 text-[12px] " + (activeKind === item.code ? "border-ember bg-paper-2 font-medium text-ink" : "border-line text-ink-soft")}>
                {item.plural}
              </Link>
            ))}
          </nav>

          {buckets.map((bucket) => (
            <section key={bucket.kind.code} className="mt-10">
              {!activeKind && (
                <div className="flex items-baseline gap-2.5">
                  <h2 className="font-display text-[17px] font-semibold text-ink">{bucket.kind.plural}</h2>
                  <span className="text-[12px] text-muted">{bucket.items.length}</span>
                  <span className="hidden text-[12px] text-muted sm:inline">&middot; {bucket.kind.hint}</span>
                </div>
              )}
              <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-8">
                {bucket.items.map((b) => {
                  const langs = bookLangs.get(b.id);
                  return (
                    <li key={b.id}>
                      <Link href={"/book/" + b.id} className="group block">
                        <BookCover
                          title={b.title}
                          author={b.author}
                          coverUrl={signed.get(b.id) ?? b.cover_url}
                          className="transition-transform duration-200 ease-out group-hover:-translate-y-1"
                        />
                        <div className="mt-3 flex items-center gap-1.5 truncate text-[12px] text-muted">
                          {b.cover_url && (
                            <span className="truncate font-display text-[14px] font-semibold text-ink">
                              {b.title}
                            </span>
                          )}
                          {b.author ? (
                            <span className="truncate">{b.author}</span>
                          ) : langs ? (
                            <>
                              <LangBadge code={langs.source} size="sm" />
                              <span className="text-line">&rarr;</span>
                              <LangBadge code={langs.target} size="sm" />
                            </>
                          ) : (
                            !b.cover_url && <span>Empty</span>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {term && inText.length > 0 && (
            <section className="mt-10">
              <h2 className="font-display text-[17px] font-semibold text-ink">Inside the texts</h2>
              <ul className="mt-4 space-y-3">
                {inText.map((h) => {
                  const host = all.find((b) => b.id === h.book_id);
                  if (!host || (activeKind && (host.kind || "book") !== activeKind)) return null;
                  return (
                    <li key={h.id}>
                      <Link
                        href={"/book/" + h.book_id + "?s=" + h.id}
                        className="-mx-3 block rounded-[6px] px-3 py-2 transition-colors hover:bg-paper-2/60"
                      >
                        <span className="block truncate font-display text-[13.5px] font-semibold text-ink">
                          {host.title}
                        </span>
                        <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-soft">
                          {snippet(h.body_text || "", term)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {term && visible.length === 0 && inText.length === 0 && (
            <p className="mt-10 text-[14px] text-muted">Nothing matches “{term}”.</p>
          )}

          {all.length === 0 && orphans.length === 0 && (
            <p className="mt-14 max-w-[34rem] text-[14px] leading-relaxed text-muted">
              Nothing on the shelf yet. Use <span className="text-ink">New</span> to add a book, a
              paper, an article, a poem or a note — it lands here under its kind.
            </p>
          )}

          {orphans.length > 0 && (
            <section className="mt-14">
              <h2 className="text-[12px] text-muted">Unfiled</h2>
              <ul className="mt-3 divide-y divide-line border-t border-line">
                {orphans.map((p) => (
                  <li key={p.id}>
                    <Link href={"/passage/" + p.id} className="block py-3 transition-colors hover:text-ink">
                      <span className="truncate text-[14px] text-ink-soft">{p.title || "Untitled"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>
    </div>
  );
}
