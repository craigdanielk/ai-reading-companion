"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-soft">
        The page could not be loaded. Nothing you saved has been lost.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-pill border border-line bg-paper px-6 py-3 font-medium hover:bg-paper-2"
      >
        Try again
      </button>
    </main>
  );
}
