"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createText } from "@/app/actions";
import { TEXT_KINDS, DEFAULT_KIND } from "@/lib/text-kinds";

function Submit({ ready }: { ready: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={!ready || pending}
      className="w-full rounded-pill bg-ember px-4 py-3 text-[14px] font-medium text-white transition-colors hover:bg-ember-700 disabled:opacity-40"
    >
      {pending ? "Opening…" : "Understand"}
    </button>
  );
}

/**
 * The single capture entry point, reachable from the rail and the mobile tab
 * bar. Choosing the kind here is what files the text on the shelf.
 */
export function NewTextButton({ variant = "rail" }: { variant?: "rail" | "tab" }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<string>(DEFAULT_KIND);
  const [text, setText] = useState("");

  return (
    <>
      {variant === "rail" ? (
        <button
          onClick={() => setOpen(true)}
          className="glass-clear glass-press flex w-full items-center justify-center gap-1.5 rounded-pill px-3 py-2 text-[13px] font-medium text-ink"
        >
          <span className="font-display text-[15px] leading-none">+</span> New text
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          aria-label="New text"
          className="glass-press -mt-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ember text-[22px] font-light leading-none text-white shadow-lg"
        >
          +
        </button>
      )}

      {open && (
        <>
          <button
            className="fixed inset-0 z-40 cursor-default bg-ink/20"
            onClick={() => setOpen(false)}
            aria-label="Close"
          />
          <div className="glass glass-in fixed inset-x-2 bottom-2 z-50 max-h-[88dvh] overflow-y-auto rounded-sheet p-4 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[30rem] sm:-translate-x-1/2 sm:-translate-y-1/2">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[16px] font-semibold text-ink">New text</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-[12px] text-muted transition-colors hover:text-ink"
              >
                Cancel
              </button>
            </div>

            <form action={createText} className="mt-4">
              <input type="hidden" name="kind" value={kind} />

              <div className="grid gap-1">
                {TEXT_KINDS.map((k) => (
                  <button
                    key={k.code}
                    type="button"
                    onClick={() => setKind(k.code)}
                    className={
                      "flex items-baseline gap-2.5 rounded-input px-3 py-2 text-left transition-colors " +
                      (kind === k.code ? "bg-paper-2" : "hover:bg-paper-2/60")
                    }
                  >
                    <span
                      className={
                        "text-[13.5px] " + (kind === k.code ? "font-medium text-ink" : "text-ink-soft")
                      }
                    >
                      {k.label}
                    </span>
                    <span className="truncate text-[11.5px] text-muted">{k.hint}</span>
                  </button>
                ))}
              </div>

              <textarea
                name="body_text"
                value={text}
                autoFocus
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") e.currentTarget.form?.requestSubmit();
                }}
                rows={4}
                placeholder="Paste or type the text…"
                className="mt-4 w-full resize-y rounded-input border border-line bg-paper px-3 py-3 text-[14px] leading-relaxed text-ink placeholder:text-muted"
              />

              <div className="mt-3">
                <Submit ready={text.trim().length > 0} />
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
