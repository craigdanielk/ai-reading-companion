"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { TEXT_KINDS } from "@/lib/text-kinds";
import { NewTextButton } from "@/components/NewTextButton";
import { SearchBox } from "@/components/SearchBox";

export interface SidebarBook {
  id: string;
  title: string;
  kind: string | null;
  sections: { id: string; title: string | null }[];
}

export function SidebarNav({ books, email }: { books: SidebarBook[]; email: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const currentBookId = pathname.match(/^\/book\/([^/]+)/)?.[1] ?? null;
  const currentBook = books.find((book) => book.id === currentBookId);
  const currentKind = currentBook?.kind || params.get("kind") || null;
  const [collapsed, setCollapsed] = useState(false);
  const [kindOverrides, setKindOverrides] = useState<Record<string, boolean>>({});

  function toggleKind(code: string) {
    setKindOverrides((overrides) => ({ ...overrides, [code]: !(overrides[code] ?? (code === currentKind)) }));
  }

  const onLibrary = pathname === "/library";
  const activeKind = params.get("kind");

  return (
    <aside className={"hidden shrink-0 flex-col border-r border-line bg-paper-2/30 transition-[width] md:flex " + (collapsed ? "w-16" : "w-72")}>
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-3">
        <Link href="/library" className="flex min-w-0 flex-1 items-center gap-2" aria-label="Jeralis library">
          <Image src="/brand/svg/jeralis-mark.svg" alt="" width={26} height={26} priority />
          {!collapsed && <span className="truncate font-display text-[14px] font-semibold tracking-tight">Jeralis</span>}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-input text-ink-soft hover:bg-paper-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-ember"
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {collapsed ? (
        <nav aria-label="Main navigation" className="flex flex-1 flex-col items-center gap-2 p-2">
          <NewTextButton variant="compact" />
          <Link href="/library" aria-label="Library" className="flex h-11 w-11 items-center justify-center rounded-input text-ink-soft hover:bg-paper-2">▤</Link>
          <Link href="/saved" aria-label="Saved" className="flex h-11 w-11 items-center justify-center rounded-input text-ink-soft hover:bg-paper-2">✎</Link>
          <Link href="/settings" aria-label="Settings" className="mt-auto flex h-11 w-11 items-center justify-center rounded-input text-ink-soft hover:bg-paper-2">⚙</Link>
        </nav>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col px-3 pb-3">
          <div className="shrink-0 pt-3">
            <NewTextButton variant="rail" />
            <div className="mt-3 -mx-3"><SearchBox /></div>
          </div>

          <nav aria-label="Library" className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
            <Link
              href="/library"
              aria-current={onLibrary && !activeKind ? "page" : undefined}
              className={"flex items-center justify-between rounded-input px-2.5 py-2 text-[13px] " + (onLibrary && !activeKind ? "bg-paper-2 font-medium text-ink" : "text-ink-soft hover:bg-paper-2")}
            >
              <span>All texts</span><span className="text-[11px] text-muted">{books.length}</span>
            </Link>

            <div className="mt-2 space-y-0.5">
              {TEXT_KINDS.filter((kind) => books.some((book) => (book.kind || "book") === kind.code) || activeKind === kind.code).map((kind) => {
                const items = books.filter((book) => (book.kind || "book") === kind.code);
                const open = kindOverrides[kind.code] ?? (kind.code === currentKind);
                const active = onLibrary && activeKind === kind.code;
                return (
                  <div key={kind.code}>
                    <div className={"flex items-center rounded-input " + (active ? "bg-paper-2" : "hover:bg-paper-2/70")}>
                      <button
                        type="button"
                        onClick={() => toggleKind(kind.code)}
                        aria-label={(open ? "Collapse " : "Expand ") + kind.plural}
                        aria-expanded={open}
                        className="flex h-9 w-8 shrink-0 items-center justify-center text-[13px] text-muted focus-visible:outline-2 focus-visible:outline-ember"
                      >
                        {open ? "⌄" : "›"}
                      </button>
                      <Link
                        href={"/library?kind=" + kind.code}
                        aria-current={active ? "page" : undefined}
                        className={"flex min-w-0 flex-1 items-center justify-between gap-2 py-2 pr-2.5 text-[13px] " + (active ? "font-medium text-ink" : "text-ink-soft")}
                      >
                        <span>{kind.plural}</span><span className="text-[11px] text-muted">{items.length}</span>
                      </Link>
                    </div>
                    {open && (
                      <ul className="ml-4 border-l border-line py-1 pl-2">
                        {items.length === 0 && <li className="px-2.5 py-1.5 text-[12px] text-muted">No texts yet</li>}
                        {items.map((book) => (
                          <li key={book.id}>
                            <Link
                              href={"/book/" + book.id}
                              title={book.title}
                              aria-current={book.id === currentBookId ? "page" : undefined}
                              className={"block truncate rounded-input px-2.5 py-1.5 text-[12.5px] " + (book.id === currentBookId ? "bg-paper-2 font-medium text-ink" : "text-ink-soft hover:bg-paper-2/70")}
                            >
                              {book.title || "Untitled"}
                            </Link>
                            {book.id === currentBookId && book.sections.length > 1 && (
                              <ul className="ml-3 border-l border-line py-1 pl-2">
                                {book.sections.map((section) => (
                                  <li key={section.id}>
                                    <Link
                                      href={"/book/" + book.id + "?s=" + section.id}
                                      title={section.title || "Untitled section"}
                                      aria-current={params.get("s") === section.id ? "location" : undefined}
                                      className="block truncate rounded-input px-2 py-1 text-[12px] text-muted hover:bg-paper-2 hover:text-ink"
                                    >
                                      {section.title || "Untitled section"}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>

            <Link href="/saved" aria-current={pathname.startsWith("/saved") ? "page" : undefined} className={"mt-3 block rounded-input px-2.5 py-2 text-[13px] " + (pathname.startsWith("/saved") ? "bg-paper-2 font-medium text-ink" : "text-ink-soft hover:bg-paper-2")}>Saved</Link>
          </nav>

          <div className="mt-3 shrink-0 border-t border-line pt-2">
            <Link href="/settings" aria-current={pathname.startsWith("/settings") ? "page" : undefined} className={"block rounded-input px-2.5 py-2 text-[13px] " + (pathname.startsWith("/settings") ? "bg-paper-2 font-medium text-ink" : "text-ink-soft hover:bg-paper-2")}>Settings</Link>
            <p className="truncate px-2.5 pt-1 text-[11px] text-muted">{email}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
