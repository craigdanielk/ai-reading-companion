import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/SidebarNav";
import { MobileTabs } from "@/components/MobileTabs";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: books } = await supabase.from("book").select("id, title, kind, created_at");
  const list = books ?? [];

  const counts: Record<string, number> = {};
  for (const b of list) {
    const k = b.kind || "book";
    counts[k] = (counts[k] ?? 0) + 1;
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* rail: where you are. The list of texts lives in the pane beside it. */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-paper-2/30 p-3 md:flex">
        <Link href="/library" className="mb-3 flex items-center gap-2 px-1 py-1">
          <Image src="/brand/svg/jeralis-mark.svg" alt="" width={26} height={26} priority />
          <span className="font-display text-[14px] font-semibold tracking-tight">Jeralis</span>
        </Link>
        <div className="min-h-0 flex-1">
          <SidebarNav counts={counts} total={list.length} email={data.user.email ?? ""} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass-bar flex shrink-0 items-center justify-between gap-3 px-4 py-2.5 md:hidden">
          <Link href="/library" className="flex items-center gap-2">
            <Image src="/brand/svg/jeralis-mark.svg" alt="" width={24} height={24} priority />
            <span className="font-display text-[13px] font-semibold">Jeralis</span>
          </Link>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

        <MobileTabs />
      </div>
    </div>
  );
}
