import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createContentItem } from "@/app/actions";

const KINDS = ["text", "article", "ebook", "document", "image", "screenshot"];

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold">AI Reading Companion</h1>
          <p>Sign in to access your library.</p>
          <Link href="/login" className="inline-block rounded bg-neutral-900 text-white px-4 py-2">
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
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Library</h1>
        <span className="text-sm text-neutral-500">{data.user.email}</span>
      </div>

      <form action={createContentItem} className="space-y-3 rounded border border-neutral-200 p-4">
        <h2 className="font-semibold">Add content</h2>
        <div className="flex gap-3">
          <select name="kind" className="rounded border border-neutral-300 px-3 py-2">
            {KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <input name="title" placeholder="Title (optional)" className="flex-1 rounded border border-neutral-300 px-3 py-2" />
        </div>
        <input name="source" placeholder="Source / author (optional)" className="w-full rounded border border-neutral-300 px-3 py-2" />
        <button type="submit" className="rounded bg-neutral-900 text-white px-4 py-2">
          Add content
        </button>
      </form>

      <ul className="space-y-2">
        {items?.length === 0 && <li className="text-neutral-500">No content yet.</li>}
        {items?.map((i) => (
          <li key={i.id} className="rounded border border-neutral-200 p-3">
            <Link href={"/library/" + i.id} className="font-medium hover:underline">
              {i.title || i.kind}
            </Link>
            <span className="ml-2 text-xs text-neutral-500">{i.kind}</span>
            {i.source && <span className="block text-sm text-neutral-500">{i.source}</span>}
          </li>
        ))}
      </ul>
    </main>
  );
}
