import Image from "next/image";
import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-line">
        <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/brand/svg/arc-mark.svg" alt="" width={28} height={28} priority />
            <span className="font-display text-[15px] font-semibold tracking-tight">
              AI Reading Companion
            </span>
          </Link>
          <Link href="/library" className="text-sm text-ink-soft hover:text-ember">
            Open app
          </Link>
        </nav>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-line py-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 text-xs text-muted">
          <span>Private beta</span>
          <Link href="/privacy" className="hover:text-ember">
            Privacy &amp; data handling
          </Link>
        </div>
      </footer>
    </>
  );
}
