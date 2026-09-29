import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateBook, deleteBook } from "@/app/actions";
import { Compose } from "@/components/Compose";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("book").select("title").eq("id", id).single();
  return { title: data?.title || "Book" };
}

function hue(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: book } = await supabase.from("book").select("*").eq("id", id).single();
  if (!book) notFound();

  const { data: passages } = await supabase
    .from("content_item")
    .select("id, title, kind, source, created_at")
    .eq("book_id", id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link href="/library" className="text-xs text-muted hover:text-ink">
        &larr; Library
      </Link>

      <header className="mt-4 flex gap-5">
        <div
          className="hidden h-[132px] w-[88px] shrink-0 items-center justify-center rounded-card border border-line shadow-sm sm:flex"
          style={{ background: "hsl(" + hue(book.title) + " 42% 86%)" }}
        >
          {book.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.cover_url} alt="" className="h-full w-full rounded-card object-cover" />
          ) : (
            <span className="font-display text-3xl font-semibold text-ink/50">
              {book.title.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-semibold leading-tight">{book.title}</h1>
          {book.author && <p className="mt-1 text-sm text-muted">{book.author}</p>}
          {book.description && <p className="mt-3 text-sm leading-relaxed text-ink/80">{book.description}</p>}
          <p className="mt-3 text-xs text-muted">
            {passages?.length ?? 0} passage{(passages?.length ?? 0) === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <div className="mt-6">
        <Compose bookId={book.id} />
      </div>

      <section className="mt-8">
        <h2 className="text-[11px] font-medium tracking-wider text-muted">PASSAGES</h2>
        {(passages?.length ?? 0) === 0 ? (
          <p className="mt-3 rounded-card border border-dashed border-line p-6 text-center text-sm text-muted">
            No passages yet. Paste one above and it lands here.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-card border border-line">
            {passages!.map((p) => (
              <li key={p.id}>
                <Link
                  href={"/passage/" + p.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-paper-2/60"
                >
                  <span className="min-w-0 flex-1 truncate font-display text-[14px] font-medium">
                    {p.title || p.kind}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted">
                    {p.kind}
                    {p.source ? " · " + p.source : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="mt-8 rounded-card border border-line p-4">
        <summary className="cursor-pointer font-display text-sm font-semibold">Edit book details</summary>
        <form action={updateBook} className="mt-3 space-y-3">
          <input type="hidden" name="id" value={book.id} />
          <input
            name="title"
            defaultValue={book.title}
            placeholder="Title"
            className="w-full rounded-input border border-line bg-paper px-3 py-2.5 text-[15px] text-ink"
          />
          <input
            name="author"
            defaultValue={book.author || ""}
            placeholder="Author"
            className="w-full rounded-input border border-line bg-paper px-3 py-2.5 text-[15px] text-ink"
          />
          <textarea
            name="description"
            defaultValue={book.description || ""}
            rows={3}
            placeholder="Notes about this book (optional)"
            className="w-full resize-y rounded-input border border-line bg-paper px-3 py-2.5 text-[15px] text-ink"
          />
          <button type="submit" className="rounded-pill bg-ink px-4 py-2 text-sm font-medium text-paper">
            Save details
          </button>
        </form>
        <form action={deleteBook} className="mt-4 border-t border-line pt-4">
          <input type="hidden" name="id" value={book.id} />
          <button type="submit" className="text-xs text-ember-600 hover:underline">
            Delete this book (passages are kept, unfiled)
          </button>
        </form>
      </details>
    </main>
  );
}
