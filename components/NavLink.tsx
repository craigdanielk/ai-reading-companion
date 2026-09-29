"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/library" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={
        "rounded-pill px-3 py-1.5 transition-colors " +
        (active ? "bg-paper-2 font-medium text-ink" : "text-ink-soft hover:text-ember")
      }
    >
      {children}
    </Link>
  );
}
