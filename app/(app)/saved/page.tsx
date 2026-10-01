import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadSavedHistory } from "@/lib/saved-history";
import { findAction } from "@/lib/actions/registry";
import { findLanguage } from "@/lib/nuance/registry";
import { findKind } from "@/lib/text-kinds";

export const metadata = { title: "Saved history" };
const dateLabel = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export default async function SavedPage({ searchParams }: { searchParams: Promise<{ book?: string }> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { book } = await searchParams;
  const all = await loadSavedHistory(supabase);
  const entries = book ? all.filter((entry) => entry.bookId === book) : all;
  const title = book && entries.length ? entries[0].bookTitle + " history" : "Saved history";
  const groups = [...new Set(entries.map((entry) => entry.textKind))]
    .map((kind) => ({ kind, items: entries.filter((entry) => entry.textKind === kind) }))
    .sort((a, b) => b.items[0].createdAt.localeCompare(a.items[0].createdAt));

  return (
    <main className="mx-auto w-full max-w-[44rem] px-5 py-8 lg:py-12">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="font-display text-[26px] font-semibold leading-tight">{title}</h1>
        <p className="text-[12px] text-muted">{entries.length} {entries.length === 1 ? "item" : "items"}</p>
      </div>
      <p className="mt-2 text-[13px] text-ink-soft">Your AI answers and personal notes, grouped by text type and ordered newest first. Notes in the Library are texts you added.</p>
      {book && <Link href="/saved" className="mt-3 inline-block text-[13px] text-ember underline">All history</Link>}

      {entries.length === 0 ? (
        <p className="mt-10 text-[14px] text-muted">When you ask about a text or write a personal note, it appears here.</p>
      ) : (
        <div className="mt-8 space-y-10">
          {groups.map((group) => (
            <section key={group.kind}>
              <h2 className="mb-3 font-display text-[18px] font-semibold text-ink">
                {findKind(group.kind).plural} <span className="font-sans text-[12px] font-normal text-muted">{group.items.length}</span>
              </h2>
              <ol className="space-y-3">
                {group.items.map((entry) => {
                  const href = entry.bookId
                    ? "/book/" + entry.bookId + "?s=" + entry.sectionId + (entry.selectionId ? "&at=" + entry.selectionId : "")
                    : "/passage/" + entry.sectionId;
                  const label = entry.type === "note" ? "Personal note" : findAction(entry.action).label;
                  const language = entry.targetLanguage ? findLanguage(entry.targetLanguage)?.name || entry.targetLanguage : null;
                  return (
                    <li key={entry.type + entry.id}>
                      <Link href={href} className="block rounded-card border border-line bg-paper px-4 py-3 transition-colors hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-ember">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
                          <span className="font-medium text-ink-soft">{label}</span>
                          {entry.type === "answer" && <span>· {language || "language not recorded"}</span>}
                          <time dateTime={entry.createdAt}>· {dateLabel.format(new Date(entry.createdAt))}</time>
                          <span>· {entry.bookTitle}{entry.sectionTitle !== entry.bookTitle ? " / " + entry.sectionTitle : ""}</span>
                        </div>
                        {entry.quote && <p className="mt-2 line-clamp-2 text-[12px] text-muted">“{entry.quote}”</p>}
                        <p className="mt-2 line-clamp-4 whitespace-pre-wrap font-display text-[15px] leading-relaxed text-ink">{entry.body}</p>
                        {entry.terms.length > 0 && <p className="mt-2 line-clamp-2 text-[12px] text-ink-soft">{entry.terms.join(" · ")}</p>}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
