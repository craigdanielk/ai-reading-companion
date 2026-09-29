"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface SidebarItem {
  id: string;
  title: string | null;
  kind: string;
}

export interface SidebarBook {
  id: string;
  title: string;
}

function Row({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={
        "block truncate rounded-input px-2.5 py-1.5 text-[13px] transition-colors " +
        (active ? "bg-paper-2 font-medium text-ink" : "text-ink-soft hover:bg-paper-2/70 hover:text-ink")
      }
    >
      {children}
    </Link>
  );
}

export function SidebarNav({
  books,
  items,
  email,
}: {
  books: SidebarBook[];
  items: SidebarItem[];
  email: string;
}) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <Row href="/library" active={pathname === "/library"}>
        Library
      </Row>

      <p className="mt-4 px-2.5 pb-1 text-[10px] font-medium tracking-wider text-muted">BOOKS</p>
      <div className="max-h-[38%] min-h-0 overflow-y-auto pr-1">
        {books.length === 0 && <p className="px-2.5 py-1 text-xs text-muted">No books yet</p>}
        {books.map((b) => (
          <Row key={b.id} href={"/book/" + b.id} active={pathname === "/book/" + b.id}>
            {b.title}
          </Row>
        ))}
      </div>

      <p className="mt-4 px-2.5 pb-1 text-[10px] font-medium tracking-wider text-muted">PASSAGES</p>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {items.length === 0 && <p className="px-2.5 py-1 text-xs text-muted">Nothing yet</p>}
        {items.map((i) => (
          <Row key={i.id} href={"/passage/" + i.id} active={pathname === "/passage/" + i.id}>
            {i.title || i.kind}
          </Row>
        ))}
      </div>

      <div className="mt-3 border-t border-line pt-2">
        <Row href="/settings" active={pathname.startsWith("/settings")}>
          Settings
        </Row>
        <p className="truncate px-2.5 pt-1 text-[11px] text-muted">{email}</p>
      </div>
    </div>
  );
}
