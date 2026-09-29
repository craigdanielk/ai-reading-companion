import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">AI Reading Companion</h1>
        <p className="text-neutral-600">
          Read, translate, and understand written content in any language.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/library" className="rounded bg-neutral-900 text-white px-4 py-2">
            Open library
          </Link>
          <Link href="/login" className="rounded border border-neutral-300 px-4 py-2">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
