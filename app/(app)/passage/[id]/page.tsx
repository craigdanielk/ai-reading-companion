import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  setContentProfile,
  updateBodyText,
  addNote,
  saveResultToNotes,
  uploadImage,
  extractText,
} from "@/app/actions";
import { UnderstandPanel } from "@/components/UnderstandPanel";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: item } = await supabase.from("content_item").select("title, kind").eq("id", id).single();
  return { title: item?.title || item?.kind || "Reading" };
}

export default async function ContentItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: item } = await supabase.from("content_item").select("*").eq("id", id).single();
  if (!item) notFound();

  const { data: parentBook } = item.book_id
    ? await supabase.from("book").select("id, title").eq("id", item.book_id).maybeSingle()
    : { data: null };

  const { data: profile } = await supabase
    .from("content_profile")
    .select("*")
    .eq("content_item_id", id)
    .maybeSingle();
  const { data: et } = await supabase
    .from("extracted_text")
    .select("id")
    .eq("content_item_id", id)
    .maybeSingle();
  const { data: result } = et
    ? await supabase
        .from("ai_result")
        .select("*")
        .eq("extracted_text_id", et.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };
  const { data: notes } = await supabase
    .from("note")
    .select("*")
    .eq("content_item_id", id)
    .order("created_at", { ascending: false });
  const { data: usageRow } = await supabase
    .from("usage")
    .select("counters, last_position")
    .eq("content_item_id", id)
    .maybeSingle();

  const readingSummary =
    (profile?.target_language || "en") +
    (profile?.domain && profile.domain !== "general" ? " · " + profile.domain : "") +
    " · " + (profile?.comprehension_depth || "intermediate");

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto w-full max-w-2xl">
          <header>
            <Link
              href={parentBook ? "/book/" + parentBook.id : "/library"}
              className="mb-2 inline-block text-xs text-muted hover:text-ink"
            >
              &larr; {parentBook?.title || "Library"}
            </Link>
            <h1 className="font-display text-2xl font-semibold leading-tight">
              {item.title || item.kind}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="rounded-pill border border-line bg-paper-2 px-2 py-0.5">{item.kind}</span>
              {item.source && <span>{item.source}</span>}
              <span>&middot; reading in {readingSummary}</span>
              {usageRow?.counters?.comprehends ? (
                <span>&middot; {usageRow.counters.comprehends} comprehends</span>
              ) : null}
            </p>
          </header>

          <section className="mt-7">
            {item.body_text ? (
              <div className="prose-measure whitespace-pre-wrap text-[18px] leading-[1.7] text-ink">
                {item.body_text}
              </div>
            ) : (
              <p className="rounded-card border border-dashed border-line p-6 text-sm text-muted">
                No passage yet. Open <em>Add or edit passage</em> below to paste text, or upload a
                page image to extract one.
              </p>
            )}
          </section>

          <div className="mt-10 space-y-3 pb-10">
            <details className="rounded-card border border-line p-4">
              <summary className="cursor-pointer font-display text-sm font-semibold">Add or edit passage</summary>
              <form action={updateBodyText} className="mt-3 space-y-3">
                <input type="hidden" name="id" value={item.id} />
                <textarea
                  name="body_text"
                  defaultValue={item.body_text || ""}
                  rows={8}
                  placeholder="Paste or type the passage you want to understand…"
                  className="w-full rounded-input border border-line bg-paper px-3 py-3 text-[15px] text-ink"
                />
                <button type="submit" className="rounded-pill bg-ember px-5 py-2.5 font-medium text-white hover:bg-ember-700">
                  Save passage
                </button>
              </form>
            </details>

            <details className="rounded-card border border-line p-4">
              <summary className="cursor-pointer font-display text-sm font-semibold">Page image &amp; OCR</summary>
              <form action={uploadImage} className="mt-3 flex flex-wrap items-center gap-3">
                <input type="hidden" name="content_item_id" value={item.id} />
                <input type="file" name="file" accept="image/*" className="text-sm text-ink-soft" />
                <button type="submit" className="rounded-pill border border-line bg-paper px-4 py-2 text-sm hover:bg-paper-2">
                  Upload
                </button>
              </form>
              {item.storage_ref && (
                <form action={extractText} className="mt-3">
                  <input type="hidden" name="content_item_id" value={item.id} />
                  <button type="submit" className="rounded-pill border border-line bg-paper px-4 py-2 text-sm hover:bg-paper-2">
                    Extract text (OpenAI vision)
                  </button>
                  <p className="mt-2 text-xs text-muted">Requires a connected OpenAI provider.</p>
                </form>
              )}
            </details>

            <details className="rounded-card border border-line p-4">
              <summary className="cursor-pointer font-display text-sm font-semibold">Comprehension profile</summary>
              <form action={setContentProfile} className="mt-3 space-y-3">
                <input type="hidden" name="content_item_id" value={item.id} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="block text-xs font-medium text-ink-soft">
                    Source
                    <select name="source_language" defaultValue={profile?.source_language || "auto"} className="mt-1 w-full rounded-input border border-line bg-paper px-3 py-2.5 text-[15px] text-ink">
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
                    <select name="target_language" defaultValue={profile?.target_language || "en"} className="mt-1 w-full rounded-input border border-line bg-paper px-3 py-2.5 text-[15px] text-ink">
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
                    <select name="domain" defaultValue={profile?.domain || "general"} className="mt-1 w-full rounded-input border border-line bg-paper px-3 py-2.5 text-[15px] text-ink">
                      <option value="general">General</option>
                      <option value="literary">Literary</option>
                      <option value="scientific">Scientific / technical</option>
                      <option value="legal">Legal</option>
                    </select>
                  </label>
                </div>
                <label className="block text-xs font-medium text-ink-soft sm:max-w-[12rem]">
                  Depth
                  <select name="comprehension_depth" defaultValue={profile?.comprehension_depth || "intermediate"} className="mt-1 w-full rounded-input border border-line bg-paper px-3 py-2.5 text-[15px] text-ink">
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </label>
                <button type="submit" className="rounded-pill bg-ember px-5 py-2.5 font-medium text-white hover:bg-ember-700">
                  Save profile
                </button>
              </form>
            </details>

            <details className="rounded-card border border-line p-4">
              <summary className="cursor-pointer font-display text-sm font-semibold">
                Notes {notes && notes.length > 0 ? "(" + notes.length + ")" : ""}
              </summary>
              <form action={addNote} className="mt-3 space-y-3">
                <input type="hidden" name="content_item_id" value={item.id} />
                <textarea
                  name="body"
                  rows={3}
                  placeholder="Add a personal note…"
                  className="w-full rounded-input border border-line bg-paper px-3 py-3 text-[15px] text-ink"
                />
                <button type="submit" className="rounded-pill bg-ember px-5 py-2.5 font-medium text-white hover:bg-ember-700">
                  Add note
                </button>
              </form>
              <ul className="mt-4 space-y-3">
                {notes?.length === 0 && <li className="text-sm text-muted">No notes yet.</li>}
                {notes?.map((n) => (
                  <li key={n.id} className="rounded-card border border-line bg-paper-2/40 p-3">
                    <span className="text-xs text-muted">
                      {n.kind === "personal" ? "Personal" : "AI result"} &middot;{" "}
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                    <p className="mt-1 whitespace-pre-wrap text-[15px] text-ink">{n.body}</p>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </div>
      </div>

      <section className="min-h-[24rem] border-t border-line bg-paper lg:min-h-0 lg:w-[26rem] lg:shrink-0 lg:border-l lg:border-t-0">
        <UnderstandPanel
          contentItemId={item.id}
          saved={result}
          onSave={saveResultToNotes}
          canRun={Boolean(item.body_text)}
        />
      </section>
    </div>
  );
}
