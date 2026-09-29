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
      className="rounded-pill bg-ember px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-ember-700 disabled:opacity-40"
    >
      {pending ? "Understanding…" : "Understand"}
    </button>
  );
}

export function Compose({ bookId, autoFocus }: { bookId?: string | null; autoFocus?: boolean }) {
  const [text, setText] = useState("");
  return (
    <form action={createText}>
      {bookId ? <input type="hidden" name="book_id" value={bookId} /> : null}
      <textarea
        name="body_text"
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") e.currentTarget.form?.requestSubmit();
        }}
        rows={2}
        placeholder="Paste something you want to understand…"
        className="w-full resize-y rounded-[10px] bg-paper-2/60 px-4 py-3.5 text-[15px] leading-relaxed text-ink transition-colors placeholder:text-muted focus:bg-paper-2"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11.5px] text-muted">Named from its own first line</span>
        <Submit canSubmit={text.trim().length > 0} />
      </div>
    </form>
  );
}
