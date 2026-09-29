import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">&larr; Home</Link>
      <h1 className="text-2xl font-bold">Privacy & data handling</h1>
      <p className="text-neutral-700">
        AI Reading Companion is a <strong>private beta</strong> for personal reading
        support from user-provided content.
      </p>
      <ul className="list-disc list-inside space-y-2 text-sm text-neutral-700">
        <li>Content you paste or upload is private to your account (row-level security).</li>
        <li>Your text is sent to the AI provider you select — or the platform DeepSeek default — for comprehension. Third-party processing is inherent to the AI features.</li>
        <li>No public sharing of uploaded pages or processed content.</li>
        <li>We minimise stored data; images are kept only as needed for the product experience.</li>
        <li>Do not upload content you are not authorised to process; treat copyright and translation rights as a known risk area.</li>
      </ul>
      <p className="text-sm text-neutral-500">
        A legal/IP review is required before any public launch. This notice is a
        practical MVP limit, not legal advice.
      </p>
    </main>
  );
}
