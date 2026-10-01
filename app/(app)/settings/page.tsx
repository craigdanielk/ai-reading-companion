import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

export const metadata = { title: "Settings" };

const ITEMS = [
  { href: "/settings/preferences", t: "Reading preferences", d: "Default source and target language, domain and depth applied to new content." },
  { href: "/settings/providers", t: "AI providers", d: "Connect your own OpenAI, DeepSeek or Mistral account, or use the platform default." },
  { href: "/settings/account", t: "Account", d: "Your email address and session." },
];

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  // The operator console is not advertised to readers.
  const items = isAdmin(data.user?.email)
    ? [...ITEMS, { href: "/admin", t: "Operations", d: "Readers, invitations and usage." }]
    : ITEMS;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="font-display text-2xl font-semibold">Settings</h1>
      <ul className="mt-6 space-y-3">
        {items.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              className="flex items-center justify-between gap-4 rounded-card border border-line bg-paper-2/40 p-4 transition-colors hover:bg-paper-2"
            >
              <span>
                <span className="block font-display text-[15px] font-semibold">{i.t}</span>
                <span className="mt-0.5 block text-sm text-ink-soft">{i.d}</span>
              </span>
              <span aria-hidden className="text-muted">&rarr;</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
