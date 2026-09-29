import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href="/" className="text-sm text-muted hover:text-ember">&larr; Home</Link>
      <h1 className="mt-4 font-display text-2xl font-semibold">Privacy &amp; data handling</h1>
      <p className="prose-measure mt-4 text-[15px] text-ink-soft">
        AI Reading Companion is a <strong className="font-medium text-ink">private beta</strong> for
        personal reading support from content you provide.
      </p>
      <ul className="prose-measure mt-6 space-y-3 text-[15px] text-ink-soft">
        <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />Content you paste or upload is private to your account (row-level security).</li>
        <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />Your text is sent to the AI provider you select — or the platform default — for comprehension. Third-party processing is inherent to the AI features.</li>
        <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />No public sharing of uploaded pages or processed content.</li>
        <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />We minimise stored data; images are kept only as needed.</li>
        <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />Do not upload content you are not authorised to process. Copyright and translation rights are a known risk area.</li>
      </ul>
      <p className="prose-measure mt-8 rounded-card border border-line bg-paper-2/50 p-4 text-sm text-muted">
        A legal/IP review is required before any public launch. This notice is a practical MVP
        limit, not legal advice.
      </p>
    </main>
  );
}
