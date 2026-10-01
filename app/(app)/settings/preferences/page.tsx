import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { savePreferences } from "@/app/actions";
import { ActionNotice } from "@/components/ActionNotice";
import { FormSubmitButton } from "@/components/FormButtons";

export const metadata = { title: "Reading preferences" };

export default async function PreferencesPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams;
  const supabase = await createClient();
  const { data: p } = await supabase.from("user_preference").select("*").maybeSingle();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link href="/settings" className="inline-flex min-h-11 items-center text-sm text-muted hover:text-ember">&larr; Settings</Link>
      <h1 className="mt-4 font-display text-2xl font-semibold">Reading preferences</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Applied to new content. Each item can still override these.
      </p>
      {notice && <div className="mt-4"><ActionNotice notice={notice} /></div>}

      <form action={savePreferences} className="mt-6 space-y-5 rounded-card border border-line bg-paper-2/50 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium text-ink-soft">
            Source language
            <select name="source_language" defaultValue={p?.default_source_language || "auto"} className="mt-1 w-full rounded-input border border-line bg-paper px-3 py-3 text-[15px] text-ink">
              <option value="auto">Auto-detect</option>
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
              <option value="ar">Arabic</option>
              <option value="de">German</option>
              <option value="ja">Japanese</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-ink-soft">
            Read in
            <select name="target_language" defaultValue={p?.default_target_language || "en"} className="mt-1 w-full rounded-input border border-line bg-paper px-3 py-3 text-[15px] text-ink">
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
              <option value="ar">Arabic</option>
              <option value="de">German</option>
              <option value="ja">Japanese</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-ink-soft">
            Domain
            <select name="domain" defaultValue={p?.default_domain || "general"} className="mt-1 w-full rounded-input border border-line bg-paper px-3 py-3 text-[15px] text-ink">
              <option value="general">General</option>
              <option value="literary">Literary</option>
              <option value="scientific">Scientific / technical</option>
              <option value="legal">Legal</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-ink-soft">
            Depth
            <select name="depth" defaultValue={p?.default_depth || "intermediate"} className="mt-1 w-full rounded-input border border-line bg-paper px-3 py-3 text-[15px] text-ink">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
        </div>
        <FormSubmitButton label="Save preferences" pendingLabel="Saving…" className="rounded-pill bg-ember px-6 py-3 font-medium text-white hover:bg-ember-700" />
      </form>
    </main>
  );
}
