import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateBodyText, setContentProfile } from "@/app/actions";
import { loadReaderData } from "@/lib/reader-data";
import { Reader } from "@/components/Reader";
import { LangPicker } from "@/components/LangPicker";
import { DOMAINS } from "@/lib/nuance/registry";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: item } = await supabase.from("content_item").select("title").eq("id", id).single();
  return { title: item?.title || "Reading" };
}

export default async function PassagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: item } = await supabase.from("content_item").select("*").eq("id", id).single();
  if (!item) notFound();

  const [{ data: profile }, reader, { data: prefs }, { data: usage }] = await Promise.all([
    supabase.from("content_profile").select("*").eq("content_item_id", id).maybeSingle(),
    loadReaderData(supabase, id),
    supabase.from("user_preference").select("*").eq("user_id", auth.user.id).maybeSingle(),
    supabase.from("usage").select("counters").eq("content_item_id", id).maybeSingle(),
  ]);

  const reading = {
    font: (prefs?.reading_font as "serif" | "sans") || "serif",
    size: (prefs?.reading_size as "small" | "medium" | "large" | "xl") || "medium",
    theme: (prefs?.reading_theme as "paper" | "sepia" | "night") || "paper",
    measure: (prefs?.reading_measure as "narrow" | "normal" | "wide") || "normal",
  };
  const lastFraction = (usage?.counters as { lastFraction?: number } | null)?.lastFraction ?? null;

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <div className="shrink-0 border-b border-line px-5 py-2.5">
        <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
          <Link href="/library" className="hover:text-ink">
            &larr; Library
          </Link>
          <details className="ml-auto">
            <summary className="cursor-pointer hover:text-ink">Reading settings</summary>
            <div className="mt-3 w-[min(22rem,80vw)] space-y-3 rounded-card border border-line bg-paper p-3 text-left">
              <form action={setContentProfile} className="space-y-3">
                <input type="hidden" name="content_item_id" value={item.id} />
                <div>
                  <span className="text-[11px] tracking-wide">READING FROM</span>
                  <LangPicker
                    name="source_language"
                    defaultValue={profile?.source_language || "auto"}
                    includeAuto
                    legend="Source language"
                  />
                </div>
                <div>
                  <span className="text-[11px] tracking-wide">READING INTO</span>
                  <LangPicker
                    name="target_language"
                    defaultValue={profile?.target_language || "en"}
                    legend="Target language"
                  />
                </div>
                <div className="flex gap-2">
                  <label className="flex-1 text-[11px] tracking-wide">
                    <select
                      name="domain"
                      defaultValue={profile?.domain || "general"}
                      className="mt-1 w-full rounded-input border border-line bg-paper px-2 py-2 text-[13px] text-ink"
                    >
                      {DOMAINS.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex-1 text-[11px] tracking-wide">
                    <select
                      name="comprehension_depth"
                      defaultValue={profile?.comprehension_depth || "intermediate"}
                      className="mt-1 w-full rounded-input border border-line bg-paper px-2 py-2 text-[13px] text-ink"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </label>
                </div>
                <button type="submit" className="rounded-pill bg-ink px-3.5 py-1.5 text-xs font-medium text-paper">
                  Save
                </button>
              </form>
              <details className="border-t border-line pt-3">
                <summary className="cursor-pointer text-[13px]">Edit the text</summary>
                <form action={updateBodyText} className="mt-2 space-y-2">
                  <input type="hidden" name="id" value={item.id} />
                  <textarea
                    name="body_text"
                    defaultValue={item.body_text || ""}
                    rows={6}
                    className="w-full resize-y rounded-input border border-line bg-paper px-3 py-2 text-[14px] text-ink"
                  />
                  <button type="submit" className="rounded-pill border border-line px-3 py-1.5 text-xs">
                    Save text
                  </button>
                </form>
              </details>
            </div>
          </details>
        </div>
      </div>

      <div className="lg:min-h-0 lg:flex-1">
        <Reader
          contentItemId={item.id}
          title={item.title || "Reading"}
          bodyText={item.body_text || ""}
          pageNote={reader.pageNote}
          selections={reader.selections}
          canRun={Boolean(item.body_text)}
          sourceLanguage={profile?.source_language || "auto"}
          targetLanguage={profile?.target_language || "en"}
          domain={profile?.domain || "general"}
          depth={profile?.comprehension_depth || "intermediate"}
          reading={reading}
          initialFraction={lastFraction}
        />
      </div>
    </div>
  );
}
