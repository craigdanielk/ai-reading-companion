import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Library" };

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: items } = await supabase
    .from("content_item")
    .select("id, kind, title, source, created_at")
    .order("created_at", { ascending: false });

  const count = items?.length ?? 0;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Library</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {count === 0 ? "Nothing yet" : count + (count === 1 ? " item" : " items")}
          </p>
        </div>
        <Link
          href="/new"
          className="rounded-pill bg-ember px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ember-700"
        >
          Add content
        </Link>
      </div>

      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {count === 0 && (
          <li className="rounded-card border border-dashed border-line p-8 text-center text-sm text-muted sm:col-span-2">
            Add a passage, article or page image to start reading.
          </li>
        )}
        {items?.map((i) => (
          <li key={i.id}>
            <Link
              href={"/library/" + i.id}
              className="flex h-full flex-col justify-between rounded-card border border-line bg-paper-2/40 p-4 transition-colors hover:bg-paper-2"
            >
              <span className="font-display text-[15px] font-semibold leading-snug">
                {i.title || i.kind}
              </span>
              <span className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="rounded-pill border border-line bg-paper px-2 py-0.5">{i.kind}</span>
                {i.source && <span className="truncate">{i.source}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
