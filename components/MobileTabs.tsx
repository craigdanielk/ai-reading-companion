"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NewTextButton } from "@/components/NewTextButton";

const TAB = "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10.5px] transition-colors";

export function MobileTabs() {
  const pathname = usePathname();
  const on = (p: string) => (p === "/library" ? pathname === "/library" : pathname.startsWith(p));

  return (
    <nav className="glass-bar flex shrink-0 items-stretch border-b-0 border-t border-line px-2 pb-[env(safe-area-inset-bottom)] md:hidden">
      <Link href="/library" className={TAB + (on("/library") ? " text-ink" : " text-muted")}>
        <span className="font-display text-[15px] leading-none">&#9633;</span>
        Library
      </Link>
      <Link href="/saved" className={TAB + (on("/saved") ? " text-ink" : " text-muted")}>
        <span className="font-display text-[15px] leading-none">&#9998;</span>
        Saved
      </Link>

      <div className="flex flex-1 items-center justify-center">
        <NewTextButton variant="tab" />
      </div>

      <Link href="/settings" className={TAB + (on("/settings") ? " text-ink" : " text-muted")}>
        <span className="font-display text-[15px] leading-none">&#9881;</span>
        Settings
      </Link>
    </nav>
  );
}
