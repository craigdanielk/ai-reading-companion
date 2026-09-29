import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  setContentProfile,
  updateBodyText,
  understand,
  addNote,
  saveResultToNotes,
  connectProvider,
} from "@/app/actions";

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
          <select name="target_language" defaultValue={profile?.target_language || "en"} className="rounded border border-neutral-300 px-3 py-2">
            <option value="en">English</option>
            <option value="fr">French</option>
            <option value="es">Spanish</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="ar">Arabic</option>
          </select>
          <select name="comprehension_depth" defaultValue={profile?.comprehension_depth || "intermediate"} className="rounded border border-neutral-300 px-3 py-2">
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <button type="submit" className="rounded bg-neutral-900 text-white px-4 py-2">Save</button>
        </div>
      </form>

      <form action={updateBodyText} className="space-y-3 rounded border border-neutral-200 p-4">
        <h2 className="font-semibold">Content text</h2>
        <input type="hidden" name="id" value={item.id} />
        <textarea
          name="body_text"
          defaultValue={item.body_text || ""}
          rows={12}
          placeholder="Paste or type the text you want to understand…"
          className="w-full rounded border border-neutral-300 px-3 py-2 font-mono text-sm"
        />
        <button type="submit" className="rounded bg-neutral-900 text-white px-4 py-2">Save text</button>
      </form>

      <form action={understand} className="rounded border border-neutral-200 p-4">
        <input type="hidden" name="content_item_id" value={item.id} />
        <button type="submit" className="rounded bg-neutral-900 text-white px-4 py-2">Understand</button>
        <p className="text-xs text-neutral-500 mt-1">Comprehend the saved text (translation + explanation).</p>
      </form>

      {result && (
        <div className="rounded border border-neutral-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Understanding</h2>
            <form action={saveResultToNotes}>
              <input type="hidden" name="content_item_id" value={item.id} />
              <input type="hidden" name="ai_result_id" value={result.id} />
              <button type="submit" className="text-sm rounded border border-neutral-300 px-3 py-1 hover:bg-neutral-100">
                Save to notes
              </button>
            </form>
          </div>
          {result.original && (
            <div>
              <h3 className="text-xs font-medium text-neutral-500">Original</h3>
              <p className="whitespace-pre-wrap text-sm">{result.original}</p>
            </div>
          )}
          {result.understanding && (
            <div>
              <h3 className="text-xs font-medium text-neutral-500">Your understanding</h3>
              <p className="whitespace-pre-wrap text-sm">{result.understanding}</p>
            </div>
          )}
          {Array.isArray(result.terms) && result.terms.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-neutral-500">Important terms</h3>
              <ul className="list-disc list-inside text-sm">
                {result.terms.map((t: string, i: number) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
          {result.key_idea && (
            <div>
              <h3 className="text-xs font-medium text-neutral-500">Key idea</h3>
              <p className="text-sm">{result.key_idea}</p>
            </div>
          )}
          {result.explanation && (
            <div>
              <h3 className="text-xs font-medium text-neutral-500">Explanation</h3>
              <p className="whitespace-pre-wrap text-sm">{result.explanation}</p>
            </div>
          )}
        </div>
      )}

      <div className="rounded border border-neutral-200 p-4 space-y-3">
        <h2 className="font-semibold">Notes</h2>
        <form action={addNote} className="space-y-2">
          <input type="hidden" name="content_item_id" value={item.id} />
          <textarea name="body" rows={3} placeholder="Add a personal note…" className="w-full rounded border border-neutral-300 px-3 py-2 text-sm" />
          <button type="submit" className="rounded bg-neutral-900 text-white px-4 py-2">Add note</button>
        </form>
        {notes?.length === 0 && <p className="text-xs text-neutral-500">No notes yet.</p>}
        {notes?.map((n) => (
          <div key={n.id} className="rounded border border-neutral-200 p-3">
            <span className="text-xs text-neutral-500">{n.kind === "personal" ? "Personal" : "AI result"} · {new Date(n.created_at).toLocaleString()}</span>
            <p className="whitespace-pre-wrap text-sm mt-1">{n.body}</p>
          </div>
        ))}
      </div>

      <div className="rounded border border-neutral-200 p-4 space-y-3">
        <h2 className="font-semibold">AI provider (BYOK)</h2>
        <p className="text-xs text-neutral-500">Connect your own provider account — otherwise the platform DeepSeek default is used.</p>
        <form action={connectProvider} className="space-y-2">
          <input type="hidden" name="content_item_id" value={item.id} />
          <div className="flex gap-2">
            <select name="provider" className="rounded border border-neutral-300 px-3 py-2">
              <option value="openai">OpenAI</option>
              <option value="deepseek">DeepSeek</option>
              <option value="mistral">Mistral</option>
            </select>
            <input name="api_key" type="password" placeholder="API key" className="flex-1 rounded border border-neutral-300 px-3 py-2" />
            <button type="submit" className="rounded bg-neutral-900 text-white px-4 py-2">Connect</button>
          </div>
        </form>
      </div>
    </main>
  );
}
