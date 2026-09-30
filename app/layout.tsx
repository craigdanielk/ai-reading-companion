import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Jeralis", template: "%s · Jeralis" },
  description: "Read anything. Understand everything.",
};

// Fonts load from <link> here rather than a CSS @import: an @import is fetched
// before any stylesheet rule applies and delays first paint. A preloaded,
// display=swap stylesheet renders text in fallback immediately and swaps in the
// brand face when it arrives.
// Two stylesheets, deliberately separate: the text= parameter applies to every
// family in a single request, so the two-glyph Noto subset must not share a
// request with the Latin faces or it strips them bare.
const LATIN_FONT_CSS =
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap";
const SCRIPT_FONT_CSS =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@600&family=Noto+Sans+JP:wght@600&text=%D8%B9%E3%81%82&display=swap";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={LATIN_FONT_CSS} />
        <link rel="stylesheet" href={SCRIPT_FONT_CSS} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
