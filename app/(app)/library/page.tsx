import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Compose } from "@/components/Compose";
import { BookCover } from "@/components/BookCover";
import { LangBadge } from "@/components/LangBadge";

export const metadata = { title: "Library" };

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: books } = await supabase
    .from("book")
    .select("id, title, author, cover_url, created_at")
    .order("created_at", { ascending: false });

  const { data: sections } = await supabase
    .from("content_item")
    .select("id, title, book_id, body_text, created_at")
    .order("created_at", { ascending: true });

  const sectionIds = (sections ?? []).map((s) => s.id);
  const { data: profiles } = sectionIds.length
    ? await supabase
        .from("content_profile")
        .select("content_item_id, source_language, target_language")
        .in("content_item_id", sectionIds)
    : { data: [] as { content_item_id: string; source_language: string; target_language: string }[] };

  const profileOf = new Map((profiles ?? []).map((p) => [p.content_item_id, p]));
  // A book's language pair comes from the first text inside it.
  const bookLangs = new Map<string, { source: string; target: string }>();
  for (const s of sections ?? []) {
    if (!s.book_id || bookLangs.has(s.book_id)) continue;
    const p = profileOf.get(s.id);
    if (p) bookLangs.set(s.book_id, { source: p.source_language, target: p.target_language });
  }

  const orphans = (sections ?? []).filter((s) => !s.book_id);

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10 lg:py-14">
      <h1 className="font-display text-[28px] font-semibold leading-tight lg:text-[32px]">Library</h1>

      <div className="mt-6">
        <Compose />
      </div>

      {(books?.length ?? 0) > 0 && (
        <ul className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-8">
          {books!.map((b) => {
            const langs = bookLangs.get(b.id);
            return (
              <li key={b.id}>
                <Link href={"/book/" + b.id} className="group block">
                  <BookCover
                    title={b.title}
                    author={b.author}
                    coverUrl={b.cover_url}
                    className="transition-transform duration-200 ease-out group-hover:-translate-y-1"
                  />
                  <div className="mt-3 flex items-center gap-1.5 truncate text-[12px] text-muted">
                    {b.cover_url && (
                      <span className="truncate font-display text-[14px] font-semibold text-ink">{b.title}</span>
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
      )}

      {(books?.length ?? 0) === 0 && orphans.length === 0 && (
        <p className="mt-14 text-center text-[14px] text-muted">
          Paste something you want to understand. It becomes the first book on your shelf.
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
  );
}
