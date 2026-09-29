"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseSections, parsePageSections } from "@/lib/providers/parse";
import { snapRange } from "@/lib/text/range";
import { findLanguage } from "@/lib/nuance/registry";
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
  createdAt: string;
  result: Result | null;
}

interface Block {
  text: string;
  start: number;
  end: number;
}

interface Range {
  start: number;
  end: number;
}

// Highlights understood in this session live outside React, keyed by section.
// The server is the long-term record, but its round trip lands after the stream
// and can arrive before the row is readable — which would blink the highlight off
// a reader who just watched it appear.
const sessionHighlights = new Map<string, Range[]>();

// Paragraph is the unit: it is what a tap can hit reliably on a phone, what a
// highlight can own, and what the model can answer in a second or two.
function splitBlocks(text: string): Block[] {
  const sep = /\n\s*\n/.test(text) ? /\n\s*\n/ : /\n/;
  const out: Block[] = [];
  for (const part of text.split(sep)) {
    const cursor = out.length ? out[out.length - 1].end : 0;
    const idx = text.indexOf(part, cursor);
    const start = idx === -1 ? cursor : idx;
    const end = start + part.length;
    if (part.trim()) out.push({ text: part, start, end });
  }
  return out;
}

function segmentsFor(block: Block, ranges: Range[]) {
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
  pageNote,
  selections,
  canRun,
  sourceLanguage,
  targetLanguage,
  domain,
  depth,
}: {
  contentItemId: string;
  title: string;
  bodyText: string;
  pageNote: Result | null;
  selections: SelectionRow[];
  canRun: boolean;
  sourceLanguage: string;
  targetLanguage: string;
  domain: string;
  depth: string;
}) {
  const router = useRouter();
  const textRef = useRef<HTMLDivElement | null>(null);
  const abort = useRef<AbortController | null>(null);
  const autoFired = useRef(false);
  const runSeq = useRef(0);
  const pageNoteRef = useRef<HTMLElement | null>(null);

  const blocks = useMemo(() => splitBlocks(bodyText), [bodyText]);
  const [streamed, setStreamed] = useState("");
  const [activeMode, setActiveMode] = useState<"passage" | "page">("passage");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Range | null>(null);
  const [popover, setPopover] = useState<{ start: number; end: number; top: number; left: number } | null>(null);

  const [fresh, setFresh] = useState<Range[]>(() => sessionHighlights.get(contentItemId) ?? []);
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

  // Newest gloss wins the paragraph it belongs to.
  const glossByBlock = useMemo(() => {
    const map = new Map<number, Result>();
    const ordered = [...selections].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    for (const s of ordered) {
      if (!s.result) continue;
      const idx = blocks.findIndex((b) => s.end > b.start && s.start < b.end);
      if (idx >= 0 && !map.has(idx)) map.set(idx, s.result);
    }
    return map;
  }, [selections, blocks]);

  const pendingBlock = useMemo(() => {
    if (!pending) return -1;
    return blocks.findIndex((b) => pending.end > b.start && pending.start < b.end);
  }, [pending, blocks]);

  const wholeText = live?.mode === "page" ? live : pageNote;
  const targetName = findLanguage(targetLanguage)?.name || targetLanguage;
  const hasAny = Boolean(wholeText) || glossByBlock.size > 0 || Boolean(live && live.mode === "passage");

  async function run(selection: Range | null, mode: "passage" | "page") {
    if (!canRun) return;
    const seq = ++runSeq.current;
    abort.current?.abort();
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
      if (selection && acc.trim() && seq === runSeq.current) {
        const known = sessionHighlights.get(contentItemId) ?? [];
        if (!known.some((r) => r.start === selection.start && r.end === selection.end)) {
          const next = [...known, selection];
          sessionHighlights.set(contentItemId, next);
          setFresh(next);
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError" && seq === runSeq.current) {
        setError((e as Error).message);
      }
    } finally {
      if (seq === runSeq.current) {
        setRunning(false);
        setPending(null);
        abort.current = null;
        router.refresh();
      }
    }
  }

  function stop() {
    runSeq.current++;
    abort.current?.abort();
    abort.current = null;
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
    const rawStart =
      Number(startEl.dataset.start) + offsetWithin(startEl, range.startContainer, range.startOffset);
    const rawEnd = Number(endEl.dataset.start) + offsetWithin(endEl, range.endContainer, range.endOffset);
    const { start, end } = snapRange(bodyText, rawStart, rawEnd);
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

  // Asking for the whole text should show the whole text's note, not leave the
  // reader at the top wondering where it went.
  useEffect(() => {
    if (activeMode !== "page" || !running) return;
    pageNoteRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeMode, running]);

  // A one-paragraph text is the quick-translate case: understand it on arrival.
  useEffect(() => {
    if (autoFired.current || !canRun || pageNote || blocks.length !== 1) return;
    autoFired.current = true;
    void run({ start: blocks[0].start, end: blocks[0].end }, "passage");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRun, pageNote, blocks]);

  return (
    <div className="mx-auto w-full max-w-[42rem] px-5 py-10 lg:max-w-[64rem] lg:px-10 lg:py-16">
      <header className="lg:max-w-[42rem]">
        <h1 className="font-display text-[28px] font-semibold leading-[1.2] text-ink lg:text-[32px]">
          {title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-muted">
          <LangBadge code={sourceLanguage} size="sm" />
          <span>{sourceLanguage === "auto" ? "detected" : findLanguage(sourceLanguage)?.name}</span>
          <span className="text-line">&rarr;</span>
          <LangBadge code={targetLanguage} size="sm" />
          <span>{targetName}</span>
          {domain !== "general" && <span>&middot; {domain}</span>}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button
            onClick={() => void run(null, "page")}
            disabled={!canRun}
            className="text-[12px] text-muted underline decoration-line underline-offset-4 transition-colors hover:text-ink disabled:opacity-40"
          >
            Understand the whole text
          </button>
          {running && (
            <button onClick={stop} className="text-[12px] text-muted transition-colors hover:text-ink">
              Stop
            </button>
          )}
        </div>
      </header>

      {!hasAny && !running && canRun && (
        <p className="mt-6 text-[13px] text-muted lg:max-w-[42rem]">
          Tap a paragraph to read it in {targetName}. Drag across a few words to read only those.
        </p>
      )}

      {error && (
        <p className="mt-6 rounded-[4px] border-l-2 border-danger bg-danger/5 py-2 pl-4 pr-3 text-[13px] text-danger lg:max-w-[42rem]">
          {error}
        </p>
      )}

      <div
        ref={textRef}
        onClick={onTextClick}
        onMouseUp={onTextSelection}
        onTouchEnd={() => window.setTimeout(onTextSelection, 120)}
        className="mt-8 space-y-5 text-[18px] leading-[1.75] text-ink lg:space-y-0"
      >
        {blocks.length === 0 && (
          <p className="text-[14px] text-muted">This text is empty.</p>
        )}
        {blocks.map((b, i) => {
          const segs = segmentsFor(b, ranges);
          const gloss = i === pendingBlock && activeMode === "passage" ? live : glossByBlock.get(i) || null;
          const isPending = i === pendingBlock && running;
          return (
            <div
              key={i}
              className="lg:grid lg:grid-cols-[minmax(0,42rem)_19rem] lg:items-start lg:gap-x-[3.5rem] lg:py-2"
            >
              <p
                data-start={b.start}
                data-end={b.end}
                className={
                  "cursor-pointer whitespace-pre-wrap rounded-[4px] px-2 py-1 -mx-2 transition-colors lg:mx-0 lg:px-0 " +
                  (isPending ? "bg-paper-2/60 lg:bg-transparent" : "lg:hover:bg-paper-2/40")
                }
              >
                {segs.map((s, j) =>
                  s.hl ? (
                    <mark key={j} className="rounded-[2px] bg-sun/30 text-ink">
                      {s.text}
                    </mark>
                  ) : (
                    <span key={j}>{s.text}</span>
                  )
                )}
              </p>

              {(gloss || isPending) && (
                <aside className="gloss-in mt-2 border-l border-line pl-4 lg:mt-0 lg:border-l-0 lg:pl-0 lg:pt-[3px]">
                  {isPending && !gloss?.understanding ? <Skeleton /> : gloss ? <GlossBody r={gloss} /> : null}
                </aside>
              )}
            </div>
          );
        })}
      </div>

      {(wholeText || (live?.mode === "page" && running)) && (
        <section
          ref={pageNoteRef}
          className="gloss-in mt-12 border-t border-line pt-6 lg:max-w-[42rem]"
        >
          <p className="text-[12px] text-muted">The whole text</p>
          <div className="mt-3">
            {live?.mode === "page" && running && !live.understanding ? (
              <Skeleton />
            ) : (
              <GlossBody r={wholeText!} hard />
            )}
          </div>
        </section>
      )}

      {popover && (
        <button
          style={{ top: popover.top, left: popover.left }}
          className="fixed z-40 -translate-x-1/2 rounded-pill bg-ink px-3.5 py-2 text-[12px] font-medium text-paper shadow-lg"
          onClick={() => void run({ start: popover.start, end: popover.end }, "passage")}
        >
          Understand this
        </button>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2" aria-busy="true">
      <div className="h-3 w-4/5 animate-pulse rounded bg-paper-2" />
      <div className="h-3 w-full animate-pulse rounded bg-paper-2" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-paper-2" />
    </div>
  );
}

// A gloss, not a dashboard: the rendering in the reader's own type, the hard
// words as a quiet line, and the reasoning folded away until asked for.
function GlossBody({ r, hard }: { r: Result; hard?: boolean }) {
  if (r.mode === "page") {
    return (
      <div className="space-y-4">
        {r.understanding && (
          <p className="font-display text-[17px] leading-[1.6] text-ink">{r.understanding}</p>
        )}
        {r.terms && r.terms.length > 0 && (
          <ul className="space-y-1.5 border-t border-line pt-3">
            {r.terms.map((t, i) => (
              <li key={i} className="text-[13px] leading-relaxed text-ink-soft">
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {r.understanding && (
        <p className="font-display text-[16px] leading-[1.55] text-ink">{r.understanding}</p>
      )}
      {r.terms && r.terms.length > 0 && (
        <ul className="space-y-0.5 border-t border-line pt-2.5 text-[12.5px] leading-snug text-ink-soft">
          {r.terms.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      )}
      {!hard && r.explanation && (
        <details className="group pt-0.5">
          <summary className="cursor-pointer list-none text-[12px] text-muted transition-colors hover:text-ink-soft">
            <span className="group-open:hidden">why</span>
            <span className="hidden group-open:inline">hide</span>
          </summary>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{r.explanation}</p>
        </details>
      )}
    </div>
  );
}
