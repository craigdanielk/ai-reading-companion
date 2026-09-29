import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createContentItem } from "@/app/actions";

export const metadata = { title: "Add content" };

const KINDS = ["text", "article", "ebook", "document", "image", "screenshot"];

export default async function NewContentPage() {
  const supabase = await createClient();
  const { data: prefs } = await supabase
    .from("user_preference")
    .select("*")
    .maybeSingle();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link href="/library" className="text-sm text-muted hover:text-ember">&larr; Library</Link>
      <h1 className="mt-4 font-display text-2xl font-semibold">Add content</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Create an item, then read and understand it. Your saved defaults are applied automatically.
      </p>

      <form action={createContentItem} className="mt-6 space-y-5 rounded-card border border-line bg-paper-2/50 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <input name="title" placeholder="Optional" className="mt-1 w-full rounded-input border border-line bg-paper px-3 py-3 text-[15px] text-ink" />
          </label>
        </div>

        <label className="block text-xs font-medium text-ink-soft">
          Source or author
          <input name="source" placeholder="Optional" className="mt-1 w-full rounded-input border border-line bg-paper px-3 py-3 text-[15px] text-ink" />
        </label>

        <label className="block text-xs font-medium text-ink-soft">
          Paste a passage now
          <textarea
            name="body_text"
            rows={8}
            placeholder="Optional — you can also add or edit this later, or upload a page image."
            className="mt-1 w-full rounded-input border border-line bg-paper px-3 py-3 text-[15px] text-ink"
          />
        </label>

        <p className="rounded-input bg-paper px-3 py-2 text-xs text-muted">
          Reading in {(prefs?.default_target_language || "en").toUpperCase()} ·{" "}
          {prefs?.default_domain || "general"} · {prefs?.default_depth || "intermediate"} — change
          anytime on the item, or set new defaults in Settings.
        </p>

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="rounded-pill bg-ember px-6 py-3 font-medium text-white hover:bg-ember-700">
            Create and open
          </button>
          <Link href="/library" className="rounded-pill border border-line bg-paper px-6 py-3 font-medium hover:bg-paper-2">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
