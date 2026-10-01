import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav, type SidebarBook } from "@/components/SidebarNav";
import { MobileTabs } from "@/components/MobileTabs";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const [{ data: books }, { data: sections }] = await Promise.all([
    supabase.from("book").select("id, title, kind, created_at").order("created_at", { ascending: false }),
    supabase.from("content_item").select("id, title, book_id, position, created_at").order("position", { ascending: true }).order("created_at", { ascending: true }),
  ]);
  const list: SidebarBook[] = (books ?? []).map((book) => ({
    id: book.id,
    title: book.title,
    kind: book.kind,
    sections: (sections ?? [])
      .filter((section) => section.book_id === book.id)
      .map((section) => ({ id: section.id, title: section.title })),
  }));

  return (
    <div className="flex h-dvh overflow-hidden">
      <SidebarNav books={list} email={data.user.email ?? ""} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass-bar flex shrink-0 items-center justify-between gap-3 px-4 py-2.5 md:hidden">
          <Link href="/library" className="flex min-h-11 items-center gap-2">
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
