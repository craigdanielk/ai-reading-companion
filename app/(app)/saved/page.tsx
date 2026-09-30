import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadNotebookAll } from "@/lib/notebook";
import { BookCover } from "@/components/BookCover";

export const metadata = { title: "Saved" };

export default async function NotesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const entries = await loadNotebookAll(supabase);

  const groups: { bookId: string; bookTitle: string; items: typeof entries }[] = [];
  for (const e of entries) {
    const last = groups[groups.length - 1];
    if (last && last.bookId === e.bookId) last.items.push(e);
    else groups.push({ bookId: e.bookId, bookTitle: e.bookTitle, items: [e] });
  }

  return (
    <main className="mx-auto w-full max-w-[44rem] px-5 py-8 lg:py-12">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="font-display text-[26px] font-semibold leading-tight">Saved</h1>
        {entries.length > 0 && (
          <p className="text-[12px] text-muted">
            {entries.length} {entries.length === 1 ? "gloss" : "glosses"}
          </p>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="mt-10 text-[14px] text-muted">
          As you understand a paragraph it is kept here, and you can return to it any time.
        </p>
      ) : (
        <div className="mt-10 space-y-10">
          {groups.map((g) => (
            <section key={g.bookId}>
              <Link
                href={"/book/" + g.bookId}
                className="flex items-center gap-3 text-[12px] text-muted transition-colors hover:text-ink"
              >
                <BookCover title={g.bookTitle} size="row" className="w-6" />
                <span className="truncate">{g.bookTitle}</span>
                <span>&middot; {g.items.length}</span>
              </Link>
              <ol className="mt-3 space-y-5">
                {g.items.map((e) => (
                  <li key={e.selectionId}>
                    <Link
                      href={"/book/" + e.bookId + "?s=" + e.sectionId + "&at=" + e.selectionId}
                      className="-mx-3 block rounded-[6px] px-3 py-2 transition-colors hover:bg-paper-2/60"
                    >
                      <p className="text-[14px] leading-relaxed text-ink-soft">&ldquo;{e.quote}&rdquo;</p>
                      {e.understanding && (
                        <p className="mt-1.5 font-display text-[15px] leading-[1.5] text-ink">{e.understanding}</p>
                      )}
                      {e.terms && e.terms.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted">
                          {e.terms.map((t, i) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                      )}
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
