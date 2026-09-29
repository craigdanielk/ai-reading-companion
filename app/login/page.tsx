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
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user?.email ?? null);
    });
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
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">AI Reading Companion</h1>

        {user ? (
          <div className="space-y-3">
            <p>Signed in as <span className="font-medium">{user}</span></p>
            <button onClick={signOut} className="w-full rounded bg-neutral-900 text-white px-4 py-2">
              Sign out
            </button>
          </div>
        ) : (
          <>
            <form action={devLogin}>
              <button type="submit" className="w-full rounded bg-neutral-900 text-white px-4 py-3 font-medium">
                Continue as demo user →
              </button>
            </form>

            <div className="flex items-center gap-3 text-xs text-neutral-400">
              <span className="h-px flex-1 bg-neutral-200" />
              or sign in with email
              <span className="h-px flex-1 bg-neutral-200" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded border border-neutral-300 px-3 py-2"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded border border-neutral-300 px-3 py-2"
              />
              <button type="submit" className="w-full rounded border border-neutral-300 px-4 py-2">
                {mode === "signup" ? "Sign up" : "Sign in"}
              </button>
              <button
                type="button"
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                className="w-full text-sm text-neutral-600"
              >
                {mode === "signup" ? "Have an account? Sign in" : "Need an account? Sign up"}
              </button>
            </form>

            <div className="rounded border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
              <p className="font-medium">Demo credentials</p>
              <p className="font-mono">{DEMO_EMAIL}</p>
              <p className="font-mono">{DEMO_PASSWORD}</p>
            </div>
          </>
        )}

        {message && <p className="text-sm text-neutral-600">{message}</p>}
      </div>
    </main>
  );
}
