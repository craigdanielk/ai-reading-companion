"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseSections, parsePageSections } from "@/lib/providers/parse";
import { LangBadge } from "@/components/LangBadge";

export interface Result {
  id: string | null;
  mode: "passage" | "page";
  original: string | null;
  understanding: string | null;
  terms: string[] | null;
  keyIdea: string | null;
  explanation: string | null;
}

export interface SelectionRow {
  id: string;
  start: number;
  end: number;
  quote: string;
  result: Result | null;
}

interface Block {
  text: string;
  start: number;
  end: number;
}

// Paragraph is the unit: it is what a tap can hit reliably on a phone, what a
// highlight can own, and what the model can answer in a second or two.
function splitBlocks(text: string): Block[] {
  const sep = /\n\s*\n/.test(text) ? /\n\s*\n/ : /\n/;
  const out: Block[] = [];
  for (const part of text.split(sep)) {
    const idx = text.indexOf(part, out.length ? out[out.length - 1].end : 0);
    const start = idx === -1 ? (out.length ? out[out.length - 1].end : 0) : idx;
    const end = start + part.length;
    if (part.trim()) out.push({ text: part, start, end });
  }
  return out;
}

function segmentsFor(block: Block, ranges: { start: number; end: number }[]) {
  const bounds = ranges
    .map((r) => [Math.max(r.start, block.start) - block.start, Math.min(r.end, block.end) - block.start])
    .filter((b) => b[1] > b[0])
    .sort((a, b) => a[0] - b[0]);
  const merged: number[][] = [];
  for (const b of bounds) {
    const last = merged[merged.length - 1];
    if (last && b[0] <= last[1]) last[1] = Math.max(last[1], b[1]);
    else merged.push([b[0], b[1]]);
  }
  const segs: { text: string; hl: boolean }[] = [];
  let cur = 0;
  for (const b of merged) {
    if (b[0] > cur) segs.push({ text: block.text.slice(cur, b[0]), hl: false });
    segs.push({ text: block.text.slice(b[0], b[1]), hl: true });
    cur = b[1];
  }
  if (cur < block.text.length) segs.push({ text: block.text.slice(cur), hl: false });
  return segs;
}

function blockEl(node: Node | null): HTMLElement | null {
  if (!node) return null;
  const el = node.nodeType === 1 ? (node as HTMLElement) : node.parentElement;
  return el ? el.closest("[data-start]") : null;
}

function offsetWithin(el: HTMLElement, node: Node, offset: number): number {
  let total = 0;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    if (n === node) return total + offset;
    total += (n.textContent || "").length;
  }
  return total;
}

export function Reader({
  contentItemId,
  title,
  bodyText,
  latest,
  selections,
  canRun,
  sourceLanguage,
  targetLanguage,
  domain,
  depth,
  onSave,
}: {
  contentItemId: string;
  title: string;
  bodyText: string;
  latest: Result | null;
  selections: SelectionRow[];
  canRun: boolean;
  sourceLanguage: string;
  targetLanguage: string;
  domain: string;
  depth: string;
  onSave: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const textRef = useRef<HTMLDivElement | null>(null);
  const abort = useRef<AbortController | null>(null);
  const autoFired = useRef(false);

  const blocks = useMemo(() => splitBlocks(bodyText), [bodyText]);
  const [streamed, setStreamed] = useState("");
  const [activeMode, setActiveMode] = useState<"passage" | "page">("passage");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<{ start: number; end: number } | null>(null);
  const [popover, setPopover] = useState<{ start: number; end: number; top: number; left: number } | null>(null);

  // Highlights are painted from the server's selections plus anything understood
  // in this session, so a paragraph lights up the moment it answers rather than
  // waiting on a round trip.
  const [fresh, setFresh] = useState<{ start: number; end: number }[]>([]);
  const ranges = useMemo(
    () => [...selections.map((s) => ({ start: s.start, end: s.end })), ...fresh],
    [selections, fresh]
  );

  const live: Result | null = streamed
    ? activeMode === "page"
      ? (() => {
          const p = parsePageSections(streamed);
          return {
            id: null,
            mode: "page" as const,
            original: null,
            understanding: p.sense || null,
            terms: p.hard || null,
            keyIdea: null,
            explanation: null,
          };
        })()
      : (() => {
          const p = parseSections(streamed);
          return {
            id: null,
            mode: "passage" as const,
            original: p.original || null,
            understanding: p.understanding || null,
            terms: p.importantTerms || null,
            keyIdea: p.keyIdea || null,
            explanation: p.explanation || null,
          };
        })()
    : null;

  const shown = live ?? latest;

  async function run(selection: { start: number; end: number } | null, mode: "passage" | "page") {
    if (!canRun || running) return;
    setRunning(true);
    setStreamed("");
    setError("");
    setActiveMode(mode);
    setPending(selection);
    window.getSelection()?.removeAllRanges();
    setPopover(null);
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const res = await fetch("/api/understand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_item_id: contentItemId, mode, selection }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        setError(await res.text());
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setStreamed(acc);
      }
      if (selection && acc.trim()) {
        setFresh((prev) =>
          prev.some((r) => r.start === selection.start && r.end === selection.end)
            ? prev
            : [...prev, selection]
        );
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setRunning(false);
      setPending(null);
      abort.current = null;
      router.refresh();
    }
  }

  function stop() {
    abort.current?.abort();
    setRunning(false);
    setPending(null);
  }

  function onTextClick(e: React.MouseEvent) {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return; // a drag selection owns this gesture
    const el = blockEl(e.target as Node);
    if (!el) return;
    const block = blocks.find((b) => b.start === Number(el.dataset.start));
    if (block) void run({ start: block.start, end: block.end }, "passage");
  }

  function onTextSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setPopover(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const container = textRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) {
      setPopover(null);
      return;
    }
    const startEl = blockEl(range.startContainer);
    const endEl = blockEl(range.endContainer);
    if (!startEl || !endEl) return;
    const start = Number(startEl.dataset.start) + offsetWithin(startEl, range.startContainer, range.startOffset);
    const end = Number(endEl.dataset.start) + offsetWithin(endEl, range.endContainer, range.endOffset);
    if (end - start < 3) {
      setPopover(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    setPopover({
      start,
      end,
      top: rect.top > 70 ? rect.top - 46 : rect.bottom + 10,
      left: Math.min(Math.max(rect.left + rect.width / 2, 70), window.innerWidth - 70),
    });
  }

  // A one-paragraph text is the quick-translate case: understand it on arrival.
  useEffect(() => {
    if (autoFired.current || !canRun || latest || blocks.length !== 1) return;
    autoFired.current = true;
    void run({ start: blocks[0].start, end: blocks[0].end }, "passage");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRun, latest, blocks]);

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0 lg:flex-row">
      <div className="px-5 py-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-semibold leading-tight">{title}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                <LangBadge code={sourceLanguage} size="sm" />
                <span>{sourceLanguage === "auto" ? "detected" : sourceLanguage}</span>
                <span>&rarr;</span>
                <LangBadge code={targetLanguage} size="sm" />
                <span>{targetLanguage}</span>
                {domain !== "general" && <span>&middot; {domain}</span>}
                <span>&middot; {depth}</span>
              </p>
            </div>
            <button
              onClick={() => void run(null, "page")}
              disabled={!canRun || running}
              className="shrink-0 rounded-pill border border-line bg-paper px-3.5 py-2 text-xs font-medium transition-colors hover:bg-paper-2 disabled:opacity-40"
            >
              Understand the whole text
            </button>
          </header>

          <p className="mt-4 text-xs text-muted">
            Tap a paragraph to understand it. Drag to select just part of one.
          </p>

          <div
            ref={textRef}
            onClick={onTextClick}
            onMouseUp={onTextSelection}
            onTouchEnd={() => window.setTimeout(onTextSelection, 120)}
            className="prose-measure mt-5 space-y-4 text-[18px] leading-[1.75] text-ink"
          >
            {blocks.length === 0 && (
              <p className="rounded-card border border-dashed border-line p-6 text-sm text-muted">
                No text yet.
              </p>
            )}
            {blocks.map((b, i) => {
              const segs = segmentsFor(b, ranges);
              const isPending =
                pending && pending.start === b.start && pending.end === b.end && running;
              return (
                <p
                  key={i}
                  data-start={b.start}
                  data-end={b.end}
                  className={
                    "cursor-pointer whitespace-pre-wrap rounded-input px-2 py-1 -mx-2 transition-colors " +
                    (isPending ? "bg-paper-2/70" : "hover:bg-paper-2/50")
                  }
                >
                  {segs.map((s, j) =>
                    s.hl ? (
                      <mark key={j} className="rounded-[3px] bg-sun/35 text-ink">
                        {s.text}
                      </mark>
                    ) : (
                      <span key={j}>{s.text}</span>
                    )
                  )}
                </p>
              );
            })}
          </div>
        </div>
      </div>

      {popover && (
        <button
          style={{ top: popover.top, left: popover.left }}
          className="fixed z-40 -translate-x-1/2 rounded-pill bg-ink px-3.5 py-2 text-xs font-medium text-paper shadow-lg"
          onClick={() => void run({ start: popover.start, end: popover.end }, "passage")}
        >
          Understand this
        </button>
      )}

      <section className="border-t border-line bg-paper lg:min-h-0 lg:w-[26rem] lg:shrink-0 lg:border-l lg:border-t-0">
        <div className="flex h-full flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-sun" aria-hidden />
              Understanding
              {running && <span className="text-xs font-normal text-muted">streaming&hellip;</span>}
            </h2>
            <div className="flex items-center gap-2">
              {latest?.id && !streamed && (
                <form action={onSave}>
                  <input type="hidden" name="content_item_id" value={contentItemId} />
                  <input type="hidden" name="ai_result_id" value={latest.id} />
                  <button
                    type="submit"
                    className="rounded-pill border border-line bg-paper px-3 py-1.5 text-xs transition-colors hover:bg-paper-2"
                  >
                    Save to notes
                  </button>
                </form>
              )}
              {running && (
                <button
                  onClick={stop}
                  className="rounded-pill border border-line bg-paper px-3 py-1.5 text-xs hover:bg-paper-2"
                >
                  Stop
                </button>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 px-4 py-4 lg:overflow-y-auto">
            {error && (
              <p className="rounded-input border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            {!shown && !running && !error && (
              <p className="text-sm text-muted">
                {canRun
                  ? "Tap a paragraph, or drag across a few words."
                  : "Nothing to understand here yet."}
              </p>
            )}

            {running && !shown?.understanding && (
              <div className="space-y-3" aria-busy="true">
                <div className="h-4 w-2/3 animate-pulse rounded bg-paper-2" />
                <div className="h-4 w-full animate-pulse rounded bg-paper-2" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-paper-2" />
              </div>
            )}

            {shown && <ResultBody r={shown} />}
          </div>
        </div>
      </section>
    </div>
  );
}

function ResultBody({ r }: { r: Result }) {
  if (r.mode === "page") {
    return (
      <div className="space-y-5">
        {r.understanding && (
          <section>
            <h3 className="text-[11px] font-medium tracking-wide text-muted">THE WHOLE TEXT</h3>
            <p className="mt-1 font-display text-[17px] leading-[1.6] text-ink">{r.understanding}</p>
          </section>
        )}
        {r.terms && r.terms.length > 0 && (
          <section>
            <h3 className="text-[11px] font-medium tracking-wide text-muted">HARD PASSAGES</h3>
            <ul className="mt-2 space-y-2">
              {r.terms.map((t, i) => (
                <li key={i} className="rounded-input border-l-4 border-sun bg-paper-2/50 px-3 py-2 text-[13px] leading-relaxed text-ink-soft">
                  {t}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {r.original && (
        <section>
          <h3 className="text-[11px] font-medium tracking-wide text-muted">ORIGINAL</h3>
          <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-soft">{r.original}</p>
        </section>
      )}
      {r.understanding && (
        <section>
          <h3 className="text-[11px] font-medium tracking-wide text-muted">YOUR UNDERSTANDING</h3>
          <p className="mt-1 font-display text-[18px] leading-[1.6] text-ink">{r.understanding}</p>
        </section>
      )}
      {r.terms && r.terms.length > 0 && (
        <section>
          <h3 className="text-[11px] font-medium tracking-wide text-muted">IMPORTANT TERMS</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {r.terms.map((t, i) => (
              <li key={i} className="rounded-pill border border-line bg-paper px-3 py-1 text-[13px] text-ink-soft">
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}
      {r.keyIdea && (
        <section className="rounded-card border-l-4 border-sun bg-paper-2/50 p-3">
          <h3 className="text-[11px] font-medium tracking-wide text-muted">KEY IDEA</h3>
          <p className="mt-1 text-[14px] text-ink">{r.keyIdea}</p>
        </section>
      )}
      {r.explanation && (
        <section>
          <h3 className="text-[11px] font-medium tracking-wide text-muted">EXPLANATION</h3>
          <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-soft">{r.explanation}</p>
        </section>
      )}
    </div>
  );
}
