import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setContentProfile } from "@/app/actions";

export default async function ContentItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <Link href="/login" className="rounded bg-neutral-900 text-white px-4 py-2">Sign in</Link>
      </main>
    );
  }

  const { data: item } = await supabase.from("content_item").select("*").eq("id", id).single();
  if (!item) notFound();

  const { data: profile } = await supabase
    .from("content_profile")
    .select("*")
    .eq("content_item_id", id)
    .maybeSingle();

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <Link href="/library" className="text-sm text-neutral-500 hover:underline">&larr; Library</Link>
      <div>
        <h1 className="text-2xl font-bold">{item.title || item.kind}</h1>
        <p className="text-sm text-neutral-500">
          {item.kind}
          {item.source ? " · " + item.source : ""}
        </p>
      </div>

      <form action={setContentProfile} className="space-y-3 rounded border border-neutral-200 p-4">
        <h2 className="font-semibold">Comprehension profile</h2>
        <input type="hidden" name="content_item_id" value={item.id} />
        <div className="flex gap-3">
          <select
            name="target_language"
            defaultValue={profile?.target_language || "en"}
            className="rounded border border-neutral-300 px-3 py-2"
          >
            <option value="en">English</option>
            <option value="fr">French</option>
            <option value="es">Spanish</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="ar">Arabic</option>
          </select>
          <select
            name="comprehension_depth"
            defaultValue={profile?.comprehension_depth || "intermediate"}
            className="rounded border border-neutral-300 px-3 py-2"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <button type="submit" className="rounded bg-neutral-900 text-white px-4 py-2">
            Save profile
          </button>
        </div>
        {profile && (
          <p className="text-xs text-neutral-500">
            Current: {profile.target_language} · {profile.comprehension_depth}
          </p>
        )}
      </form>

      {item.body_text ? (
        <div className="rounded border border-neutral-200 p-4 whitespace-pre-wrap">{item.body_text}</div>
      ) : (
        <p className="text-neutral-500 text-sm">No text yet — ingestion (T6) adds content here.</p>
      )}
    </main>
  );
}
