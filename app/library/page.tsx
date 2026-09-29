import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createContentItem } from "@/app/actions";

const KINDS = ["text", "article", "ebook", "document", "image", "screenshot"];

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-14">
        <div className="rounded-card border border-line bg-paper-2/50 p-8 text-center">
          <h1 className="font-display text-2xl font-semibold">Your library</h1>
          <p className="mt-2 text-sm text-ink-soft">Sign in to start reading.</p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-pill bg-ember px-6 py-3 font-medium text-white hover:bg-ember-700"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  const { data: items } = await supabase
    .from("content_item")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-2xl font-semibold">Library</h1>
        <span className="text-xs text-muted">{data.user.email}</span>
      </div>

      <form action={createContentItem} className="mt-6 rounded-card border border-line bg-paper-2/50 p-4">
        <h2 className="font-display text-sm font-semibold">Add content</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,11rem)_1fr]">
          <label className="block text-xs font-medium text-ink-soft">
            Kind
            <select name="kind" className="mt-1 w-full rounded-input border border-line bg-paper px-3 py-3 text-[15px] text-ink">
              {KINDS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-ink-soft">
            Title
            <input
              name="title"
              placeholder="Optional"
              className="mt-1 w-full rounded-input border border-line bg-paper px-3 py-3 text-[15px] text-ink"
            />
          </label>
        </div>
        <input
          name="source"
          placeholder="Source or author (optional)"
          className="mt-3 w-full rounded-input border border-line bg-paper px-3 py-3 text-[15px] text-ink"
        />
        <button
          type="submit"
          className="mt-3 w-full rounded-pill bg-ember px-6 py-3 font-medium text-white hover:bg-ember-700 sm:w-auto"
        >
          Add content
        </button>
      </form>

      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items?.length === 0 && (
          <li className="rounded-card border border-dashed border-line p-8 text-center text-sm text-muted sm:col-span-2">
            Nothing here yet — add your first passage above.
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
