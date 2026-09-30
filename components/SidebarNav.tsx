"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { TEXT_KINDS } from "@/lib/text-kinds";
import { NewTextButton } from "@/components/NewTextButton";

function Row({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={
        "flex items-center justify-between gap-2 rounded-input px-2.5 py-1.5 text-[13px] transition-colors " +
        (active ? "bg-paper-2 font-medium text-ink" : "text-ink-soft hover:bg-paper-2/70 hover:text-ink")
      }
    >
      {children}
    </Link>
  );
}

export function SidebarNav({
  counts,
  total,
  email,
}: {
  counts: Record<string, number>;
  total: number;
  email: string;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const activeKind = params.get("kind");
  const onLibrary = pathname === "/library";

  return (
    <div className="flex h-full flex-col">
      <NewTextButton variant="rail" />

      <nav className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        <Row href="/library" active={onLibrary && !activeKind}>
          <span>All texts</span>
          <span className="text-[11.5px] text-muted">{total}</span>
        </Row>

        {TEXT_KINDS.filter((k) => (counts[k.code] ?? 0) > 0).map((k) => (
          <Row
            key={k.code}
            href={"/library?kind=" + k.code}
            active={onLibrary && activeKind === k.code}
          >
            <span>{k.plural}</span>
            <span className="text-[11.5px] text-muted">{counts[k.code]}</span>
          </Row>
        ))}

        <div className="mt-4">
          <Row href="/notes" active={pathname.startsWith("/notes")}>
            <span>Notes</span>
          </Row>
        </div>
      </nav>

      <div className="mt-3 border-t border-line pt-2">
        <Row href="/settings" active={pathname.startsWith("/settings")}>
          <span>Settings</span>
        </Row>
        <p className="truncate px-2.5 pt-1 text-[11px] text-muted">{email}</p>
      </div>
    </div>
  );
}
