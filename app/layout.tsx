import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Reading Companion",
  description: "Read anything. Understand everything.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur">
          <nav className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/brand/svg/arc-mark.svg" alt="" width={28} height={28} priority />
              <span className="font-display text-[15px] font-semibold tracking-tight">
                AI Reading Companion
              </span>
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/library" className="text-ink-soft hover:text-ember">Library</Link>
              <Link href="/login" className="text-ink-soft hover:text-ember">Account</Link>
            </div>
          </nav>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="border-t border-line py-6">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 text-xs text-muted">
            <span>Private beta</span>
            <Link href="/privacy" className="hover:text-ember">Privacy &amp; data handling</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
