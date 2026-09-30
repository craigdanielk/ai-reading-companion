import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadNotebook } from "@/lib/notebook";
import { BookCover } from "@/components/BookCover";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("book").select("title").eq("id", id).single();
  return { title: data?.title ? data.title + " · Notes" : "Notes" };
}

export default async function NotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: book } = await supabase
    .from("book")
    .select("id, title, author, cover_url")
    .eq("id", id)
    .single();
  if (!book) notFound();

  const entries = await loadNotebook(supabase, id);

  // Group by section so a multi-text book reads as distinct chapters.
  const sections: { title: string; items: typeof entries }[] = [];
  for (const e of entries) {
    const last = sections[sections.length - 1];
    if (last && last.title === e.sectionTitle) last.items.push(e);
    else sections.push({ title: e.sectionTitle, items: [e] });
  }

  return (
    <div className="mx-auto w-full max-w-[44rem] px-5 py-10 lg:py-16">
      <div className="flex flex-wrap items-center gap-4">
        <Link href={"/book/" + book.id} className="shrink-0">
          <BookCover title={book.title} author={book.author} coverUrl={book.cover_url} size="header" />
        </Link>
        <div className="min-w-0">
          <h1 className="font-display text-[28px] font-semibold leading-tight">Notes</h1>
          <p className="mt-1 truncate text-[13px] text-muted">
            {entries.length === 0
              ? "Nothing saved yet"
              : entries.length + (entries.length === 1 ? " note" : " notes")}
            {" · "}
            <Link href={"/book/" + book.id} className="underline decoration-line underline-offset-4 hover:text-ink">
              back to the text
            </Link>
          </p>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="mt-12 text-[14px] text-muted">
          As you understand a paragraph it is kept here, and you can return to it any time.
        </p>
      ) : (
        <div className="mt-12 space-y-10">
          {sections.map((sec) => (
            <section key={sec.title}>
              {sections.length > 1 && (
                <h2 className="mb-3 text-[12px] text-muted">{sec.title}</h2>
              )}
              <ol className="space-y-6">
                {sec.items.map((e) => (
                  <li key={e.selectionId}>
                    <Link
                      href={"/book/" + book.id + "?s=" + e.sectionId + "&at=" + e.selectionId}
                      className="block rounded-[6px] px-3 py-2 -mx-3 transition-colors hover:bg-paper-2/60"
                    >
                      <p className="text-[14px] leading-relaxed text-ink-soft">“{e.quote}”</p>
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
    </div>
  );
}
