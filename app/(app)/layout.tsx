import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/SidebarNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: items } = await supabase
    .from("content_item")
    .select("id, title, kind")
    .order("created_at", { ascending: false });

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-paper-2/30 md:flex">
        <Link href="/library" className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Image src="/brand/svg/arc-mark.svg" alt="" width={26} height={26} priority />
          <span className="font-display text-[14px] font-semibold tracking-tight">
            AI Reading Companion
          </span>
        </Link>
        <nav className="min-h-0 flex-1 overflow-hidden p-3">
          <SidebarNav items={items ?? []} email={data.user.email ?? ""} />
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 md:hidden">
          <Link href="/library" className="flex items-center gap-2">
            <Image src="/brand/svg/arc-mark.svg" alt="" width={24} height={24} priority />
            <span className="font-display text-[13px] font-semibold">AI Reading Companion</span>
          </Link>
          <nav className="flex items-center gap-3 text-[13px]">
            <Link href="/new" className="text-ink-soft hover:text-ember">New</Link>
            <Link href="/settings" className="text-ink-soft hover:text-ember">Settings</Link>
          </nav>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
