"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { devLogin } from "@/app/actions";

const DEMO_EMAIL = "demo@adel.dev";
const DEMO_PASSWORD = "AdelDemo2026!Secure";

export default function LoginPage() {
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user?.email ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const { error } =
      mode === "signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
    else {
      const { data } = await supabase.auth.getUser();
      setUser(data.user?.email ?? null);
      setMessage(mode === "signup" ? "Account created — check your email to confirm." : "Signed in.");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setMessage("Signed out.");
  }

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-12 sm:py-20">
      <h1 className="font-display text-2xl font-semibold">Account</h1>

      {user ? (
        <div className="mt-6 space-y-4 rounded-card border border-line bg-paper-2/50 p-5">
          <p className="text-sm text-ink-soft">
            Signed in as <span className="font-medium text-ink">{user}</span>
          </p>
          <button
            onClick={signOut}
            className="w-full rounded-pill border border-line px-4 py-3 font-medium transition-colors hover:bg-paper"
          >
            Sign out
          </button>
        </div>
      ) : (
        <>
          <form action={devLogin} className="mt-6">
            <button
              type="submit"
              className="w-full rounded-pill bg-ember px-4 py-3 font-medium text-white transition-colors hover:bg-ember-700"
            >
              Continue as demo user
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" />
            or sign in with email
            <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-xs font-medium text-ink-soft">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full rounded-input border border-line bg-paper-2/40 px-3 py-3 text-[15px] text-ink"
              />
            </label>
            <label className="block text-xs font-medium text-ink-soft">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="mt-1 w-full rounded-input border border-line bg-paper-2/40 px-3 py-3 text-[15px] text-ink"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-pill border border-line px-4 py-3 font-medium transition-colors hover:bg-paper-2"
            >
              {mode === "signup" ? "Sign up" : "Sign in"}
            </button>
            <button
              type="button"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="w-full py-1 text-sm text-ink-soft hover:text-ember"
            >
              {mode === "signup" ? "Have an account? Sign in" : "Need an account? Sign up"}
            </button>
          </form>

          <div className="mt-6 rounded-card border border-line bg-paper-2/50 p-4 text-xs text-ink-soft">
            <p className="font-medium text-ink">Demo credentials</p>
            <p className="mt-1 font-mono">{DEMO_EMAIL}</p>
            <p className="font-mono">{DEMO_PASSWORD}</p>
          </div>
        </>
      )}

      {message && (
        <p className="mt-5 rounded-input bg-paper-2 px-3 py-2 text-sm text-ink-soft">{message}</p>
      )}
    </main>
  );
}
