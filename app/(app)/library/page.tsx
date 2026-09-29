import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createBook } from "@/app/actions";
import { Compose } from "@/components/Compose";

export const metadata = { title: "Library" };

function hue(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: books } = await supabase
    .from("book")
    .select("id, title, author, cover_url, created_at")
    .order("created_at", { ascending: false });
  const { data: allPassages } = await supabase
    .from("content_item")
    .select("id, title, book_id, created_at")
    .order("created_at", { ascending: false });

  const counts = new Map<string, number>();
  const unfiled = (allPassages ?? []).filter((p) => !p.book_id);
  for (const p of allPassages ?? []) {
    if (p.book_id) counts.set(p.book_id, (counts.get(p.book_id) ?? 0) + 1);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="font-display text-2xl font-semibold">Library</h1>

      <div className="mt-5">
        <Compose />
      </div>

      <form action={createBook} className="mt-4 flex flex-wrap items-center gap-2 rounded-card border border-dashed border-line p-3">
        <input
          name="title"
          placeholder="New book title"
          className="min-w-0 flex-1 rounded-input border border-line bg-paper px-3 py-2.5 text-[15px] text-ink"
        />
        <input
          name="author"
          placeholder="Author (optional)"
          className="min-w-0 flex-1 rounded-input border border-line bg-paper px-3 py-2.5 text-[15px] text-ink"
        />
        <button type="submit" className="rounded-pill border border-line bg-paper px-4 py-2.5 text-sm font-medium hover:bg-paper-2">
          Add book
        </button>
      </form>

      {(books?.length ?? 0) > 0 && (
        <ul className="mt-8 grid grid-cols-3 gap-4 sm:grid-cols-4">
          {books!.map((b) => (
            <li key={b.id}>
              <Link href={"/book/" + b.id} className="group block">
                <div
                  className="flex aspect-[2/3] items-center justify-center rounded-card border border-line shadow-sm transition-transform group-hover:-translate-y-0.5"
                  style={{ background: "hsl(" + hue(b.title) + " 42% 86%)" }}
                >
                  {b.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.cover_url} alt="" className="h-full w-full rounded-card object-cover" />
                  ) : (
                    <span className="font-display text-2xl font-semibold text-ink/50">
                      {b.title.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="mt-2 truncate font-display text-[13px] font-semibold">{b.title}</p>
                <p className="truncate text-[11px] text-muted">
                  {counts.get(b.id) ?? 0} passage{(counts.get(b.id) ?? 0) === 1 ? "" : "s"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {unfiled.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[11px] font-medium tracking-wider text-muted">UNFILED PASSAGES</h2>
          <ul className="mt-3 divide-y divide-line rounded-card border border-line">
            {unfiled.map((p) => (
              <li key={p.id}>
                <Link href={"/passage/" + p.id} className="block px-4 py-3 transition-colors hover:bg-paper-2/60">
                  <p className="truncate font-display text-[14px] font-medium">{p.title || "Passage"}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(books?.length ?? 0) === 0 && unfiled.length === 0 && (
        <p className="mt-10 rounded-card border border-dashed border-line p-8 text-center text-sm text-muted">
          Paste a passage above to understand it, or add a book to collect passages from what you are reading.
        </p>
      )}
    </main>
  );
}
