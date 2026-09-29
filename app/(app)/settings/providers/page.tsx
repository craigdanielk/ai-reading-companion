import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { connectProvider, deleteProvider } from "@/app/actions";

export const metadata = { title: "AI providers" };

const PROVIDERS = ["openai", "deepseek", "mistral"];

export default async function ProvidersPage() {
  const supabase = await createClient();
  const { data: conns } = await supabase
    .from("provider_connection")
    .select("id, provider, model, is_default, created_at")
    .order("created_at", { ascending: false });

  const platformProvider = process.env.PLATFORM_PROVIDER || "openai";
  const platformModel = process.env.PLATFORM_MODEL || "gpt-4o";
  const active = conns && conns.length > 0 ? conns[0] : null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link href="/settings" className="text-sm text-muted hover:text-ember">&larr; Settings</Link>
      <h1 className="mt-4 font-display text-2xl font-semibold">AI providers</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Bring your own provider account, or use the platform default.
      </p>

      <div className="mt-6 rounded-card border border-line bg-paper-2/50 p-4">
        <p className="text-xs font-medium tracking-wide text-muted">CURRENTLY USED</p>
        <p className="mt-1 font-display text-[15px] font-semibold">
          {active ? active.provider + (active.model ? " · " + active.model : "") : platformProvider + " · " + platformModel + " (platform)"}
        </p>
        {!active && (
          <p className="mt-1 text-xs text-muted">No personal provider connected — the platform account is used.</p>
        )}
      </div>

      {conns && conns.length > 0 && (
        <ul className="mt-6 space-y-3">
          {conns.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line p-4">
              <span>
                <span className="block font-display text-[15px] font-semibold">
                  {c.provider}
                  {c.model ? " · " + c.model : ""}
                </span>
                <span className="text-xs text-muted">
                  connected {new Date(c.created_at).toLocaleDateString()}
                </span>
              </span>
              <form action={deleteProvider}>
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" className="rounded-pill border border-line bg-paper px-4 py-2 text-sm hover:bg-paper-2">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={connectProvider} className="mt-6 space-y-4 rounded-card border border-line p-5">
        <h2 className="font-display text-sm font-semibold">Connect a provider</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block text-xs font-medium text-ink-soft">
            Provider
            <select name="provider" className="mt-1 w-full rounded-input border border-line bg-paper px-3 py-3 text-[15px] text-ink">
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-ink-soft">
            Model
            <input name="model" placeholder="Optional" className="mt-1 w-full rounded-input border border-line bg-paper px-3 py-3 text-[15px] text-ink" />
          </label>
          <label className="block text-xs font-medium text-ink-soft">
            API key
            <input name="api_key" type="password" placeholder="sk-…" className="mt-1 w-full rounded-input border border-line bg-paper px-3 py-3 text-[15px] text-ink" />
          </label>
        </div>
        <button type="submit" className="rounded-pill bg-ember px-5 py-2.5 font-medium text-white hover:bg-ember-700">
          Connect
        </button>
        <p className="text-xs text-muted">
          Keys are stored against your account only and used solely for your comprehension requests.
        </p>
      </form>
    </main>
  );
}
