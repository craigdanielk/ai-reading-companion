import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-semibold">Nothing here</h1>
      <p className="mt-2 text-sm text-ink-soft">That page or item does not exist.</p>
      <Link href="/library" className="mt-6 rounded-pill bg-ember px-6 py-3 font-medium text-white hover:bg-ember-700">
        Back to library
      </Link>
    </main>
  );
}
