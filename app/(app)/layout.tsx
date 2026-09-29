import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavLink } from "@/components/NavLink";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur">
        <nav className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-2.5">
          <Link href="/library" className="flex items-center gap-2">
            <Image src="/brand/svg/arc-mark.svg" alt="" width={28} height={28} priority />
            <span className="hidden font-display text-[15px] font-semibold tracking-tight sm:inline">
              AI Reading Companion
            </span>
          </Link>
          <div className="flex items-center gap-0.5 text-sm">
            <NavLink href="/library">Library</NavLink>
            <NavLink href="/new">New</NavLink>
            <NavLink href="/settings">Settings</NavLink>
          </div>
        </nav>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-line py-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 text-xs text-muted">
          <span>{data.user.email}</span>
          <Link href="/privacy" className="hover:text-ember">
            Privacy &amp; data handling
          </Link>
        </div>
      </footer>
    </>
  );
}
