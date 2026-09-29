export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8" aria-busy="true">
      <div className="h-5 w-28 animate-pulse rounded-pill bg-paper-2" />
      <div className="mt-6 h-8 w-2/3 animate-pulse rounded-input bg-paper-2" />
      <div className="mt-8 space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-paper-2" />
        <div className="h-4 w-11/12 animate-pulse rounded bg-paper-2" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-paper-2" />
      </div>
      <span className="sr-only">Loading</span>
    </main>
  );
}
