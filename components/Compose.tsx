"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createText } from "@/app/actions";
import { TEXT_KINDS, DEFAULT_KIND } from "@/lib/text-kinds";

function Submit({ canSubmit }: { canSubmit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={!canSubmit || pending}
      className="rounded-pill bg-ember px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-ember-700 disabled:opacity-40"
    >
      {pending ? "Opening…" : "Understand"}
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
        rows={3}
        placeholder="Paste or type a text to understand…"
        className="w-full resize-y rounded-[10px] bg-paper-2/60 px-4 py-3.5 text-[15px] leading-relaxed text-ink transition-colors placeholder:text-muted focus:bg-paper-2"
      />

      {/* A section added to an existing text inherits that text's kind. */}
      {!bookId && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {TEXT_KINDS.map((k) => (
            <label key={k.code} className="cursor-pointer" title={k.hint}>
              <input
                type="radio"
                name="kind"
                value={k.code}
                defaultChecked={k.code === DEFAULT_KIND}
                className="peer sr-only"
              />
              <span
                className="inline-flex rounded-pill border border-line bg-paper px-3 py-1 text-[12.5px] text-ink-soft transition-colors peer-checked:border-ember peer-checked:bg-paper-2 peer-checked:font-medium peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ember"
                style={{ borderColor: undefined }}
              >
                {k.label}
              </span>
            </label>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11.5px] text-muted">Named from its own first line</span>
        <Submit canSubmit={text.trim().length > 0} />
      </div>
    </form>
  );
}
