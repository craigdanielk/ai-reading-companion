import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const signedIn = Boolean(data.user);
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-14 sm:py-24">
      <div className="flex flex-col items-center text-center">
        <Image
          src="/brand/svg/jeralis-mark.svg"
          alt=""
          width={64}
          height={64}
          priority
          className="h-16 w-16"
        />
        <p className="mt-4 font-display text-lg font-semibold tracking-tight">
          Jeralis
        </p>
        <h1 className="mt-6 font-display text-[28px] font-semibold leading-tight sm:text-[34px]">
          Read anything. Understand everything.
        </h1>
        <p className="mt-4 max-w-md text-[15px] text-ink-soft">
          A reading companion that keeps the meaning, tone and nuance of the original —
          and shows you what a flat translation would lose.
        </p>

        <div className="mt-9 flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Link
            href={signedIn ? "/library" : "/login"}
            className="rounded-pill bg-ember px-6 py-3 text-center font-medium text-white transition-colors hover:bg-ember-700"
          >
            {signedIn ? "Open your library" : "Sign in to open your library"}
          </Link>
        </div>

        <dl className="mt-14 grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-3">
          {[
            { t: "Meaning, not words", d: "Renders the sense and register of the original, not a word-for-word calque." },
            { t: "Explains the build", d: "Grammar, structure and implied meaning — why the sentence works that way." },
            { t: "Idioms survive", d: "Idioms, puns and cultural references are handled, not silently dropped." },
          ].map((f) => (
            <div key={f.t} className="rounded-card border border-line bg-paper-2/50 p-4">
              <dt className="font-display text-[15px] font-semibold">{f.t}</dt>
              <dd className="mt-1 text-sm text-ink-soft">{f.d}</dd>
            </div>
          ))}
        </dl>
      </div>
    </main>
  );
}
