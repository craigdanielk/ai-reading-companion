import Link from "next/link";
import { KindBadge } from "@/components/KindBadge";
import { findKind } from "@/lib/text-kinds";

export interface ListedText {
  id: string;
  title: string;
  author: string | null;
  kind: string | null;
}

/**
 * The middle pane: everything on the shelf, in the order it will be read.
 * Persistent, so moving between texts never means going back to a grid first.
 */
export function TextList({
  texts,
  activeId,
  heading,
  grouped,
}: {
  texts: ListedText[];
  activeId?: string | null;
  heading: string;
  grouped?: boolean;
}) {
  const groups: { key: string; label: string; items: ListedText[] }[] = [];
  if (grouped) {
    for (const t of texts) {
      const k = findKind(t.kind);
      const last = groups[groups.length - 1];
      if (last && last.key === k.code) last.items.push(t);
      else groups.push({ key: k.code, label: k.plural, items: [t] });
    }
  } else {
    groups.push({ key: "all", label: "", items: texts });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-baseline gap-2 px-4 py-3">
        <h2 className="font-display text-[14px] font-semibold text-ink">{heading}</h2>
        <span className="text-[11.5px] text-muted">{texts.length}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {texts.length === 0 && (
          <p className="px-2 py-4 text-[12.5px] text-muted">Nothing here yet.</p>
        )}
        {groups.map((g) => (
          <div key={g.key}>
            {g.label && (
              <p className="px-2 pb-1 pt-3 text-[10.5px] tracking-wide text-muted">{g.label.toUpperCase()}</p>
            )}
            <ul>
              {g.items.map((t) => {
                const active = t.id === activeId;
                return (
                  <li key={t.id}>
                    <Link
                      href={"/book/" + t.id}
                      className={
                        "block rounded-input px-2.5 py-2 transition-colors " +
                        (active ? "bg-paper-2" : "hover:bg-paper-2/60")
                      }
                    >
                      <span
                        className={
                          "block truncate text-[13px] " +
                          (active ? "font-medium text-ink" : "text-ink-soft")
                        }
                      >
                        {t.title || "Untitled"}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5">
                        {t.author && <span className="truncate text-[11px] text-muted">{t.author}</span>}
                        {grouped ? null : <KindBadge kind={t.kind} size="sm" />}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
