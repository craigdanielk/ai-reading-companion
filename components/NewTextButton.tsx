"use client";

import { useRef, useState } from "react";
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
      {pending ? "Opening…" : "Understand"}
    </button>
  );
}

type Source = "type" | "upload";

const SEG = "flex-1 rounded-pill px-3 py-1.5 text-[12.5px] transition-colors";

/**
 * The single way a source enters the library: typed or pasted, scanned from a
 * page image, or pulled from the clipboard. The kind chosen here is what files
 * it on the shelf.
 */
export function NewTextButton({ variant = "rail" }: { variant?: "rail" | "tab" }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<string>(DEFAULT_KIND);
  const [text, setText] = useState("");
  const [source, setSource] = useState<Source>("type");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  function close() {
    setOpen(false);
    setNote("");
    setBusy(false);
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
      if (res.title) setTitle(res.title);
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
            onClick={close}
            aria-label="Close"
          />
          <div className="glass glass-in fixed inset-x-2 bottom-2 z-50 max-h-[88dvh] overflow-y-auto rounded-sheet p-4 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[30rem] sm:-translate-x-1/2 sm:-translate-y-1/2">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[16px] font-semibold text-ink">New text</h2>
              <button onClick={close} className="text-[12px] text-muted transition-colors hover:text-ink">
                Cancel
              </button>
            </div>

            {/* where the source comes from */}
            <div className="mt-3 flex gap-1 rounded-pill border border-line p-0.5">
              <button
                type="button"
                onClick={() => setSource("type")}
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
                    className="mt-3 rounded-pill bg-ink px-4 py-2 text-[13px] font-medium text-paper disabled:opacity-40"
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

              <p className="mt-4 text-[11px] tracking-wide text-muted">WHAT IT IS</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {TEXT_KINDS.map((k) => (
                  <button
                    key={k.code}
                    type="button"
                    title={k.hint}
                    onClick={() => setKind(k.code)}
                    className={
                      "rounded-pill border px-3 py-1 text-[12.5px] transition-colors " +
                      (kind === k.code
                        ? "border-ember bg-paper-2 font-medium text-ink"
                        : "border-line text-ink-soft hover:bg-paper-2")
                    }
                  >
                    {k.label}
                  </button>
                ))}
              </div>

              {source === "type" && (
                <div className="mt-4">
                  <Submit ready={text.trim().length > 0 && !busy} />
                </div>
              )}
            </form>
          </div>
        </>
      )}
    </>
  );
}
