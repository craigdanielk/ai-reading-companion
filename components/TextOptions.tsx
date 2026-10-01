"use client";

import { useEffect, useRef, useState } from "react";

/** Item-level forms stay available without pushing the reading surface down. */
export function TextOptions({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = trigger.current;
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
      if (event.key !== "Tab") return;
      const controls = [...(panel.current?.querySelectorAll<HTMLElement>("button:not([disabled]), summary, input:not([disabled]), textarea:not([disabled]), select:not([disabled])") ?? [])].filter((control) => control.offsetParent !== null);
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      previous?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Text options"
        aria-haspopup="dialog"
        className="ml-auto flex h-11 w-11 items-center justify-center rounded-input text-[18px] text-ink-soft hover:bg-paper-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-ember"
      >
        <span aria-hidden>⋯</span>
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default bg-ink/25" onClick={() => setOpen(false)} aria-label="Close text options" />
          <div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Text options"
            tabIndex={-1}
            className="fixed inset-x-3 top-1/2 z-50 max-h-[85dvh] -translate-y-1/2 overflow-y-auto rounded-sheet border border-line bg-paper p-4 shadow-lg outline-none sm:inset-x-auto sm:right-5 sm:top-5 sm:w-[26rem] sm:translate-y-0"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-display text-[17px] font-semibold text-ink">Text options</h2>
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-pill px-3 py-2 text-[12px] text-ink-soft hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-ember">Close</button>
            </div>
            {children}
          </div>
        </>
      )}
    </>
  );
}
