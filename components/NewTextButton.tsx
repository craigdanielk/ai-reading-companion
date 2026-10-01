"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createText, ocrFromUpload, importDocument } from "@/app/actions";
import { TEXT_KINDS, DEFAULT_KIND } from "@/lib/text-kinds";

function Submit({ ready }: { ready: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={!ready || pending}
      className="w-full rounded-pill bg-ember px-4 py-3 text-[14px] font-medium text-white transition-colors hover:bg-ember-700 disabled:opacity-40"
    >
      {pending ? "Adding…" : "Add to library"}
    </button>
  );
}

type Source = "type" | "upload";

const SEG = "min-h-11 flex-1 rounded-pill px-3 py-1.5 text-[12.5px] transition-colors";

/**
 * The single way a source enters the library: typed or pasted, scanned from a
 * page image, or pulled from the clipboard. The kind chosen here is what files
 * it on the shelf.
 */
export function NewTextButton({ variant = "rail" }: { variant?: "rail" | "tab" | "compact" }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"choose" | "capture">("choose");
  const [kind, setKind] = useState<string>(DEFAULT_KIND);
  const [text, setText] = useState("");
  const [source, setSource] = useState<Source>("type");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [medium, setMedium] = useState("typed");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
      if (event.key !== "Tab") return;
      const controls = panelRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])");
      if (!controls?.length) return;
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
      trigger?.focus();
    };
  }, [open, stage]);

  function close() {
    setOpen(false);
    setNote("");
    setBusy(false);
  }

  function start() {
    setStage("choose");
    setOpen(true);
  }

  // Images are read with a vision model; documents already carry their text.
  async function readFile(file: File) {
    const isImage = (file.type || "").startsWith("image/");
    setBusy(true);
    setNote(isImage ? "Reading the page…" : "Opening the document…");

    const fd = new FormData();
    fd.set("file", file);

    if (isImage) {
      const res = await ocrFromUpload(fd);
      setBusy(false);
      if (res.error) {
        setNote(res.error);
        return;
      }
      setText(res.text || "");
      setStoragePath(res.path || null);
      setMedium("image");
    } else {
      const res = await importDocument(fd);
      setBusy(false);
      if (res.error) {
        setNote(res.error);
        return;
      }
      if (!res.text) {
        setNote(res.warning || "Nothing readable was found in that file.");
        return;
      }
      setText(res.text);
      setStoragePath(res.path || null);
      setMedium(res.medium || "document");
      if (res.title) setTitle(res.title);
      if (res.truncated) {
        setNote("This document is very long — only the first part was brought in.");
      } else if (res.warning) {
        setNote(res.warning);
      }
    }

    setSource("type");
    setNote(
      isImage
        ? "Text read from the image — check it before continuing."
        : "Text extracted — check it before continuing."
    );
  }

  async function pasteClipboard() {
    try {
      const t = await navigator.clipboard.readText();
      if (!t.trim()) {
        setNote("Your clipboard is empty.");
        return;
      }
      setText((prev) => (prev ? prev + "\n\n" + t : t));
      setSource("type");
      setNote("");
    } catch {
      setNote("Clipboard access was refused — paste with ⌘V instead.");
    }
  }

  return (
    <>
      {variant === "rail" ? (
        <button
          ref={triggerRef}
          onClick={start}
          className="glass-clear glass-press flex w-full items-center justify-center gap-1.5 rounded-pill px-3 py-2 text-[13px] font-medium text-ink"
        >
          <span className="font-display text-[15px] leading-none">+</span> New
        </button>
      ) : (
        <button
          ref={triggerRef}
          onClick={start}
          aria-label="New"
          className={variant === "tab" ? "glass-press -mt-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ember text-[22px] font-light leading-none text-white shadow-lg" : "glass-press flex h-11 w-11 items-center justify-center rounded-input bg-ember text-[20px] text-white"}
        >
          +
        </button>
      )}

      {open && (
        <>
          <button
            className="fixed inset-0 z-40 cursor-default bg-ink/20"
            onClick={close}
            aria-label="Close"
          />
          <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="new-text-heading" tabIndex={-1} className="glass-in fixed inset-x-2 bottom-2 z-50 max-h-[88dvh] overflow-y-auto rounded-sheet border border-line bg-paper p-4 shadow-xl outline-none sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[30rem] sm:-translate-x-1/2 sm:-translate-y-1/2">
            <div className="flex items-center justify-between">
              <h2 id="new-text-heading" className="font-display text-[16px] font-semibold text-ink">{stage === "choose" ? "Add to your library" : "New " + TEXT_KINDS.find((item) => item.code === kind)?.label.toLowerCase()}</h2>
              <button onClick={close} className="min-h-11 px-2 text-[12px] text-muted transition-colors hover:text-ink">
                Cancel
              </button>
            </div>

            {stage === "choose" ? (
              <div className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {TEXT_KINDS.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => {
                      setKind(item.code);
                      setStage("capture");
                    }}
                    className="rounded-input border border-line bg-paper px-3 py-3 text-left transition-colors hover:border-ember hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-ember"
                  >
                    <span className="block font-display text-[14px] font-semibold text-ink">{item.label}</span>
                    <span className="mt-0.5 block text-[12px] text-muted">{item.hint}</span>
                  </button>
                ))}
              </div>
            ) : (
            <>
            <button type="button" onClick={() => setStage("choose")} className="mt-2 min-h-11 px-2 text-[12px] text-ink-soft underline decoration-line underline-offset-4">
              Change type
            </button>

            {/* where the source comes from */}
            <div className="mt-3 flex gap-1 rounded-pill border border-line p-0.5">
              <button
                type="button"
                onClick={() => {
                  setSource("type");
                  setMedium("typed");
                }}
                className={SEG + (source === "type" ? " bg-paper-2 font-medium text-ink" : " text-ink-soft")}
              >
                Type or paste
              </button>
              <button
                type="button"
                onClick={() => setSource("upload")}
                className={SEG + (source === "upload" ? " bg-paper-2 font-medium text-ink" : " text-ink-soft")}
              >
                Scan or upload
              </button>
              <button
                type="button"
                onClick={pasteClipboard}
                className={SEG + " text-ink-soft"}
              >
                Clipboard
              </button>
            </div>

            <form action={createText} className="mt-3">
              <input type="hidden" name="kind" value={kind} />
              {storagePath && <input type="hidden" name="storage_ref" value={storagePath} />}
              {title && <input type="hidden" name="title" value={title} />}
              <input type="hidden" name="medium" value={medium} />

              {source === "upload" ? (
                <div className="rounded-input border border-dashed border-line p-4 text-center">
                  <p className="text-[13px] text-ink-soft">Photograph a page, or open a document.</p>
                  <p className="mt-1 text-[11.5px] text-muted">
                    Images are read with OCR. PDF, EPUB, DOCX, TXT and Markdown already carry their
                    text. Either way, you check it before it is filed.
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    name="image"
                    accept="image/*,.pdf,.epub,.docx,.txt,.md,application/pdf,application/epub+zip"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void readFile(file);
                    }}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => fileRef.current?.click()}
                    className="mt-3 min-h-11 rounded-pill bg-ink px-4 py-2 text-[13px] font-medium text-paper disabled:opacity-40"
                  >
                    {busy ? "Reading…" : "Choose a file"}
                  </button>
                </div>
              ) : (
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
                  className="w-full resize-y rounded-input border border-line bg-paper px-3 py-3 text-[14px] leading-relaxed text-ink placeholder:text-muted"
                />
              )}

              {note && <p className="mt-2 text-[12px] text-ink-soft">{note}</p>}

              {source === "type" && (
                <div className="mt-4">
                  <Submit ready={text.trim().length > 0 && !busy} />
                </div>
              )}
            </form>
            </>
            )}
          </div>
        </>
      )}
    </>
  );
}
