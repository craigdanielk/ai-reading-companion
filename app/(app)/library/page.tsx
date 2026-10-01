import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BookCover } from "@/components/BookCover";
import { TextList } from "@/components/TextList";
import { LangBadge } from "@/components/LangBadge";
import { KIND_ORDER, findKind, TEXT_KINDS } from "@/lib/text-kinds";
import { coverUrl } from "@/lib/covers";

export const metadata = { title: "Library" };

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
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

  const all = books ?? [];
  // Covers are stored privately; sign the ones that came from storage.
  const signed = new Map<string, string | null>();
  await Promise.all(
    all
      .filter((b) => b.cover_url && !/^https?:\/\//.test(b.cover_url))
      .map(async (b) => signed.set(b.id, await coverUrl(supabase, b.cover_url)))
  );
  const orphans = (sections ?? []).filter((s) => !s.book_id);

  const visible = activeKind ? all.filter((b) => (b.kind || "book") === activeKind) : all;
  const heading = activeKind ? findKind(activeKind).plural : "All texts";

  const buckets = (activeKind ? [activeKind] : KIND_ORDER)
    .map((code) => ({
      kind: findKind(code),
      items: all.filter((b) => (b.kind || "book") === code),
    }))
    .filter((b) => b.items.length > 0);

  return (
    <div className="flex h-full min-h-0">
      {/* middle pane — the texts, always visible so switching never means going back */}
      <div className="hidden w-[19rem] shrink-0 border-r border-line lg:block">
        <TextList
          texts={visible.map((b) => ({ id: b.id, title: b.title, author: b.author, kind: b.kind }))}
          heading={heading}
          grouped={!activeKind}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className="mx-auto w-full max-w-4xl px-5 py-8 lg:py-10">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h1 className="font-display text-[26px] font-semibold leading-tight lg:text-[30px]">{heading}</h1>
            {activeKind && (
              <Link href="/library" className="text-[12px] text-muted transition-colors hover:text-ink">
                Show all texts
              </Link>
            )}
          </div>

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

          {all.length === 0 && orphans.length === 0 && (
            <p className="mt-14 max-w-[34rem] text-[14px] leading-relaxed text-muted">
              Nothing on the shelf yet. Use <span className="text-ink">New text</span> to add a book, a
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
    </div>
  );
}
