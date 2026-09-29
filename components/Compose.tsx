"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createText } from "@/app/actions";

function Submit({ canSubmit }: { canSubmit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={!canSubmit || pending}
      className="rounded-pill bg-ember px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ember-700 disabled:opacity-40"
    >
      {pending ? "Understanding…" : "Understand"}
    </button>
  );
}

export function Compose({ bookId, autoFocus }: { bookId?: string | null; autoFocus?: boolean }) {
  const [text, setText] = useState("");
  return (
    <form action={createText} className="rounded-card border border-line bg-paper-2/40 p-3">
      {bookId ? <input type="hidden" name="book_id" value={bookId} /> : null}
      <textarea
        name="body_text"
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") e.currentTarget.form?.requestSubmit();
        }}
        rows={3}
        placeholder="Paste or type a passage to understand…"
        className="w-full resize-y rounded-input border border-line bg-paper px-3 py-3 text-[15px] leading-relaxed text-ink"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted">Kept automatically &middot; titled from its own first line</span>
        <Submit canSubmit={text.trim().length > 0} />
      </div>
    </form>
  );
}
