import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { AdminAccess } from "@/components/AdminAccess";

export const metadata = { title: "Operations" };

interface CostRow {
  user_id: string;
  origin: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number | string;
  created_at: string;
}

function money(n: number): string {
  return "$" + n.toFixed(n < 1 ? 4 : 2);
}

/**
 * Operator console. Gated by ADMIN_EMAILS and read with the service role, so
 * cost never travels through a reader's own API path.
 */
export default async function AdminPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  if (!isAdmin(auth.user.email)) redirect("/library");

  const admin = createAdminClient();
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const [{ data: costs }, { data: books }, { data: usage }] = await Promise.all([
    admin
      .from("cost_ledger")
      .select("user_id, origin, model, prompt_tokens, completion_tokens, cost_usd, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000),
    admin.from("book").select("id, user_id"),
    admin.from("usage").select("user_id, counters"),
  ]);

  // This Supabase project is shared with the rest of the estate, so listUsers()
  // would hand the operator every other business's accounts. Readers are the
  // people with content here, and nobody else.
  const readerIds = [
    ...new Set([...(books ?? []).map((b) => b.user_id), ...(usage ?? []).map((u) => u.user_id)]),
  ];
  const looked = await Promise.all(readerIds.map((id) => admin.auth.admin.getUserById(id)));
  const readers = looked
    .map((r) => r.data?.user)
    .filter((u): u is NonNullable<typeof u> => Boolean(u))
    .sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));

  const rows = (costs ?? []) as CostRow[];
  const now = Date.now();
  const dayAgo = now - 24 * 3600 * 1000;
  const weekAgo = now - 7 * 24 * 3600 * 1000;

  const sum = (list: CostRow[]) => list.reduce((a, r) => a + Number(r.cost_usd || 0), 0);
  const total = sum(rows);
  const today = sum(rows.filter((r) => Date.parse(r.created_at) >= dayAgo));
  const week = sum(rows.filter((r) => Date.parse(r.created_at) >= weekAgo));
  const platform = sum(rows.filter((r) => r.origin === "platform"));
  const byok = sum(rows.filter((r) => r.origin === "byok"));
  const tokens = rows.reduce((a, r) => a + (r.prompt_tokens || 0) + (r.completion_tokens || 0), 0);

  const byModel = new Map<string, { calls: number; cost: number }>();
  for (const r of rows) {
    const m = byModel.get(r.model) ?? { calls: 0, cost: 0 };
    m.calls += 1;
    m.cost += Number(r.cost_usd || 0);
    byModel.set(r.model, m);
  }

  const perUser = new Map<string, { calls: number; cost: number }>();
  for (const r of rows) {
    const u = perUser.get(r.user_id) ?? { calls: 0, cost: 0 };
    u.calls += 1;
    u.cost += Number(r.cost_usd || 0);
    perUser.set(r.user_id, u);
  }

  const textsOf = new Map<string, number>();
  for (const b of books ?? []) textsOf.set(b.user_id, (textsOf.get(b.user_id) ?? 0) + 1);
  const comprehendsOf = new Map<string, number>();
  for (const u of usage ?? []) {
    const c = (u.counters ?? {}) as Record<string, number>;
    comprehendsOf.set(u.user_id, (comprehendsOf.get(u.user_id) ?? 0) + (c.comprehends || 0));
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8 lg:py-12">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="font-display text-[26px] font-semibold leading-tight">Operations</h1>
        <Link href="/library" className="text-[12px] text-muted transition-colors hover:text-ink">
          Back to the library
        </Link>
      </div>
      <p className="mt-1 text-[12.5px] text-muted">
        Operator view. Readers never see cost — this is the margin.
      </p>

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "LAST 24H", value: money(today) },
          { label: "LAST 7 DAYS", value: money(week) },
          { label: "LAST 30 DAYS", value: money(total) },
          { label: "TOKENS (30D)", value: tokens.toLocaleString() },
        ].map((c) => (
          <div key={c.label} className="rounded-card border border-line bg-paper-2/40 p-4">
            <p className="text-[10.5px] tracking-wide text-muted">{c.label}</p>
            <p className="mt-1 font-display text-[20px] font-semibold text-ink">{c.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-card border border-line p-4">
          <p className="text-[10.5px] tracking-wide text-muted">WHO PAID</p>
          <p className="mt-2 flex items-baseline justify-between text-[14px]">
            <span className="text-ink-soft">Your platform account</span>
            <span className="font-display font-semibold text-ink">{money(platform)}</span>
          </p>
          <p className="mt-1 flex items-baseline justify-between text-[14px]">
            <span className="text-ink-soft">Readers&rsquo; own keys</span>
            <span className="font-display font-semibold text-ink-soft">{money(byok)}</span>
          </p>
          <p className="mt-2 text-[11.5px] text-muted">
            Only your platform account is a cost. BYOK calls are paid by the reader.
          </p>
        </div>

        <div className="rounded-card border border-line p-4">
          <p className="text-[10.5px] tracking-wide text-muted">BY MODEL</p>
          {byModel.size === 0 ? (
            <p className="mt-2 text-[12.5px] text-muted">No calls recorded yet.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {[...byModel.entries()].map(([m, v]) => (
                <li key={m} className="flex items-baseline justify-between text-[13px]">
                  <span className="truncate text-ink-soft">{m}</span>
                  <span className="shrink-0 text-muted">
                    {v.calls} calls · {money(v.cost)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-[17px] font-semibold">Readers</h2>
        <ul className="mt-3 divide-y divide-line rounded-card border border-line">
          {readers.length === 0 && (
            <li className="px-4 py-3 text-[13px] text-muted">No readers yet.</li>
          )}
          {readers.map((u) => {
            const spend = perUser.get(u.id)?.cost ?? 0;
            const calls = perUser.get(u.id)?.calls ?? 0;
            return (
              <li key={u.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] text-ink">{u.email}</span>
                  <span className="text-[11.5px] text-muted">
                    {textsOf.get(u.id) ?? 0} texts · {comprehendsOf.get(u.id) ?? 0} comprehends ·{" "}
                    {u.last_sign_in_at ? "last seen " + new Date(u.last_sign_in_at).toLocaleDateString() : "never signed in"}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-display text-[14px] font-semibold text-ink">{money(spend)}</span>
                  <span className="text-[11px] text-muted">{calls} calls</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-[17px] font-semibold">Access</h2>
        <p className="mb-3 mt-1 text-[12.5px] text-muted">
          The private beta is invitation-only, so accounts are made here.
        </p>
        <AdminAccess />
      </section>
    </main>
  );
}
