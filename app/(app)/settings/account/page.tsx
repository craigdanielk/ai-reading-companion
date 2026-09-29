import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link href="/settings" className="text-sm text-muted hover:text-ember">&larr; Settings</Link>
      <h1 className="mt-4 font-display text-2xl font-semibold">Account</h1>

      <div className="mt-6 rounded-card border border-line bg-paper-2/50 p-5">
        <p className="text-xs font-medium tracking-wide text-muted">SIGNED IN AS</p>
        <p className="mt-1 font-display text-[15px] font-semibold">{data.user?.email}</p>
        <p className="mt-1 text-xs text-muted">
          Joined {data.user?.created_at ? new Date(data.user.created_at).toLocaleDateString() : "—"}
        </p>
      </div>

      <form action={signOut} className="mt-6">
        <button type="submit" className="rounded-pill border border-danger px-6 py-3 font-medium text-danger hover:bg-danger/5">
          Sign out
        </button>
      </form>
    </main>
  );
}
