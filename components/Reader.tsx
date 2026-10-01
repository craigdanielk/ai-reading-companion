"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseAction } from "@/lib/providers/parse";
import { snapRange } from "@/lib/text/range";
import { findLanguage, LANGUAGES } from "@/lib/nuance/registry";
import {
  findAction,
  actionsForScope,
  scopeForSelection,
  variantFor,
  SLOT,
  DEFAULT_ACTION,
  type Marker,
  type Scope,
} from "@/lib/actions/registry";
import { LangBadge } from "@/components/LangBadge";
import { saveReadingAppearance, addNote, updateNote, deleteNote } from "@/app/actions";

export interface Result {
  id: string | null;
  mode: "passage" | "page";
  /** Which verb produced it. */
  action: string;
  original: string | null;
  understanding: string | null;
  terms: string[] | null;
  keyIdea: string | null;
  explanation: string | null;
}

export interface NoteRow {
  id: string;
  body: string | null;
}

export interface SelectionRow {
  id: string;
  start: number;
  end: number;
  quote: string;
  createdAt: string;
  result: Result | null;
}

export interface ReadingAppearance {
  font: "serif" | "sans";
  size: "small" | "medium" | "large" | "xl";
  theme: "paper" | "sepia" | "night";
  measure: "narrow" | "normal" | "wide";
  /** pages = book-like, turn back and forth; scroll = continuous */
  paged: boolean;
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

const sessionHighlights = new Map<string, Range[]>();
// Session-understood results, keyed by section, so the gloss text survives the
// moment between the stream ending and the server refresh landing.
interface SessionGloss {
  range: Range;
  result: Result;
}
const sessionGlosses = new Map<string, SessionGloss[]>();

function parseResult(raw: string, actionId: string, scope: Scope): Result {
  const p = parseAction(raw, actionId, scope);
  return {
    id: null,
    mode: scope === "text" ? "page" : "passage",
    action: actionId,
    original: p.original,
    understanding: p.understanding,
    terms: p.terms,
    keyIdea: p.keyIdea,
    explanation: p.explanation,
  };
}

const SIZE = {
  small: { size: "18px", leading: "1.8" },
  medium: { size: "19px", leading: "1.75" },
  large: { size: "20px", leading: "1.7" },
  xl: { size: "22px", leading: "1.65" },
} as const;

const TEXT_COL: Record<ReadingAppearance["measure"], string> = {
  narrow: "38rem",
  normal: "42rem",
  wide: "46rem",
};

const FONT_FACE = { serif: "var(--font-display)", sans: "var(--font-sans)" } as const;

// Paged reading: the text flows into fixed-height columns; one column is a page.
// The column must be exactly as wide as a paragraph row (text + gutter + margin)
// so a paragraph and its gloss are never split across a page break.
const TEXT_COL_PX: Record<ReadingAppearance["measure"], number> = { narrow: 608, normal: 672, wide: 736 };
const MARGIN_PX = 304; // 19rem
const GUTTER_PX = 56; // 3.5rem

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

function scrollParent(el: HTMLElement | null): HTMLElement {
  let node = el?.parentElement ?? null;
  while (node) {
    const oy = getComputedStyle(node).overflowY;
    if (oy === "auto" || oy === "scroll") return node;
    node = node.parentElement;
  }
  return document.documentElement;
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
  focusSelection,
  reading,
  initialFraction,
  notes,
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
  focusSelection?: string | null;
  reading: ReadingAppearance;
  initialFraction: number | null;
  notes: NoteRow[];
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const abort = useRef<AbortController | null>(null);
  const restored = useRef(false);
  const runSeq = useRef(0);
  const beaconTimer = useRef<number | undefined>(undefined);
  const pageNoteRef = useRef<HTMLElement | null>(null);

  const blocks = useMemo(() => splitBlocks(bodyText), [bodyText]);

  // appearance — the device is yours; choices apply live and are remembered
  const [appearance, setAppearance] = useState<ReadingAppearance>(reading);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [immersed, setImmersed] = useState(false);
  const [progress, setProgress] = useState(() => initialFraction ?? 0);

  const [streamed, setStreamed] = useState("");
  const [activeScope, setActiveScope] = useState<Scope>("passage");
  const [activeAction, setActiveAction] = useState<string>(DEFAULT_ACTION);
  // The language the reader wants, chosen at the moment of asking. Until now it
  // was frozen at capture time with no way to change it while reading.
  const [intoLang, setIntoLang] = useState(targetLanguage);
  const [menuOpen, setMenuOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Range | null>(null);
  const [popover, setPopover] = useState<{
    start: number;
    end: number;
    scope: Scope;
    top: number;
    left: number;
  } | null>(null);
  const [focusedBlock, setFocusedBlock] = useState(-1);
  const [notesOpen, setNotesOpen] = useState(false);

  // paged reading
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const flowRef = useRef<HTMLDivElement | null>(null);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [availWidth, setAvailWidth] = useState(0);
  const pageWidth = Math.max(320, Math.min(TEXT_COL_PX[appearance.measure] + GUTTER_PX + MARGIN_PX, availWidth || 9999));
  const step = pageWidth + GUTTER_PX;
  const appearanceRef = useRef(reading);
  const pageCountRef = useRef(1);
  appearanceRef.current = appearance;
  pageCountRef.current = pageCount;

  const turn = useCallback(
    (delta: number) => setPage((p) => Math.max(0, Math.min(p + delta, pageCountRef.current - 1))),
    []
  );

  const [fresh, setFresh] = useState<Range[]>(() => sessionHighlights.get(contentItemId) ?? []);
  const [glosses, setGlosses] = useState<SessionGloss[]>(() => sessionGlosses.get(contentItemId) ?? []);
  const ranges = useMemo(
    () => [...selections.map((s) => ({ start: s.start, end: s.end })), ...fresh],
    [selections, fresh]
  );

  const live: Result | null = streamed ? parseResult(streamed, activeAction, activeScope) : null;

  const glossByBlock = useMemo(() => {
    const map = new Map<number, Result>();
    const ordered = [
      ...selections.map((s) => ({
        range: { start: s.start, end: s.end },
        result: s.result,
        recency: new Date(s.createdAt).getTime() || 0,
      })),
      ...glosses.map((g) => ({ range: g.range, result: g.result, recency: Number.MAX_SAFE_INTEGER })),
    ].sort((a, b) => b.recency - a.recency);
    for (const item of ordered) {
      if (!item.result) continue;
      const idx = blocks.findIndex((b) => item.range.end > b.start && item.range.start < b.end);
      if (idx >= 0 && !map.has(idx)) map.set(idx, item.result);
    }
    return map;
  }, [selections, glosses, blocks]);

  const pendingBlock = useMemo(() => {
    if (!pending) return -1;
    return blocks.findIndex((b) => pending.end > b.start && pending.start < b.end);
  }, [pending, blocks]);

  const wholeText = live?.mode === "page" ? live : pageNote;
  const targetName = findLanguage(targetLanguage)?.name || targetLanguage;
  const hasAny = Boolean(wholeText) || glossByBlock.size > 0 || Boolean(live && live.mode === "passage");

  async function run(selection: Range | null, scope: Scope, actionId: string = DEFAULT_ACTION) {
    if (!canRun) return;
    const action = findAction(actionId);
    if (!variantFor(action, scope)) return;
    const seq = ++runSeq.current;
    abort.current?.abort();
    setRunning(true);
    setStreamed("");
    setError("");
    setActiveScope(scope);
    setActiveAction(action.id);
    setPending(selection);
    window.getSelection()?.removeAllRanges();
    setPopover(null);
    setMenuOpen(false);
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const res = await fetch("/api/understand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_item_id: contentItemId,
          scope,
          action: action.id,
          selection,
          target_language: intoLang,
        }),
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
        const result = parseResult(acc, action.id, scope);
        const known = sessionHighlights.get(contentItemId) ?? [];
        if (!known.some((r) => r.start === selection.start && r.end === selection.end)) {
          const next = [...known, selection];
          sessionHighlights.set(contentItemId, next);
          setFresh(next);
        }
        const knownGlosses = sessionGlosses.get(contentItemId) ?? [];
        if (!knownGlosses.some((g) => g.range.start === selection.start && g.range.end === selection.end)) {
          const next = [...knownGlosses, { range: selection, result }];
          sessionGlosses.set(contentItemId, next);
          setGlosses(next);
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

  function applyAppearance(next: ReadingAppearance) {
    setAppearance(next);
    const fd = new FormData();
    fd.set("reading_font", next.font);
    fd.set("reading_size", next.size);
    fd.set("reading_theme", next.theme);
    fd.set("reading_measure", next.measure);
    fd.set("reading_paged", next.paged ? "pages" : "scroll");
    void saveReadingAppearance(fd);
  }

  // position: read progress, restore once, beacon on scroll (debounced)
  useEffect(() => {
    const sc = scrollParent(rootRef.current);
    const onScroll = () => {
      const max = sc.scrollHeight - sc.clientHeight;
      const frac = max > 0 ? Math.min(1, Math.max(0, sc.scrollTop / max)) : 0;
      setProgress(frac);
      setImmersed(sc.scrollTop > 140);
      window.clearTimeout(beaconTimer.current);
      beaconTimer.current = window.setTimeout(() => {
        const blob = new Blob([JSON.stringify({ content_item_id: contentItemId, fraction: frac })], {
          type: "application/json",
        });
        if (navigator.sendBeacon) navigator.sendBeacon("/api/position", blob);
      }, 900);
    };
    sc.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      sc.removeEventListener("scroll", onScroll);
      window.clearTimeout(beaconTimer.current);
    };
  }, [contentItemId]);

  useEffect(() => {
    if (restored.current || focusSelection) return;
    if (initialFraction == null || initialFraction <= 0.001) return;
    restored.current = true;
    const sc = scrollParent(rootRef.current);
    requestAnimationFrame(() => {
      sc.scrollTop = initialFraction * (sc.scrollHeight - sc.clientHeight);
    });
  }, [initialFraction, focusSelection]);

  // keyboard: space and arrows turn the page
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const sc = scrollParent(rootRef.current);
      const h = sc.clientHeight * 0.9;
      const paged = appearanceRef.current.paged;
      const forward = e.key === " " || e.key === "ArrowDown" || e.key === "PageDown" || e.key === "ArrowRight";
      const back = e.key === "ArrowUp" || e.key === "PageUp" || e.key === "ArrowLeft";
      if (paged && forward) {
        e.preventDefault();
        turn(1);
      } else if (paged && back) {
        e.preventDefault();
        turn(-1);
      } else if (paged && e.key === "Home") {
        e.preventDefault();
        setPage(0);
      } else if (paged && e.key === "End") {
        e.preventDefault();
        setPage(pageCountRef.current - 1);
      } else if (!paged && forward) {
        e.preventDefault();
        sc.scrollBy({ top: h, behavior: "smooth" });
      } else if (!paged && back) {
        e.preventDefault();
        sc.scrollBy({ top: -h, behavior: "smooth" });
      } else if (e.key === "Escape") {
        setSettingsOpen(false);
        setPopover(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turn]);

  function onTextClick(e: React.MouseEvent) {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;
    const el = blockEl(e.target as Node);
    if (!el) return;
    const block = blocks.find((b) => b.start === Number(el.dataset.start));
    if (!block) return;
    // Tapping a paragraph used to run comprehension immediately. It now opens
    // the picker anchored to that paragraph, so the reader chooses the verb.
    const rect = el.getBoundingClientRect();
    setMenuOpen(false);
    setPopover({
      start: block.start,
      end: block.end,
      scope: "passage",
      top: rect.top > 70 ? rect.top - 6 : rect.bottom + 10,
      left: Math.min(Math.max(rect.left + rect.width / 2, 150), window.innerWidth - 150),
    });
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
      scope: scopeForSelection(bodyText.slice(start, end)),
      top: rect.top > 70 ? rect.top - 46 : rect.bottom + 10,
      left: Math.min(Math.max(rect.left + rect.width / 2, 70), window.innerWidth - 70),
    });
  }

  useEffect(() => {
    if (activeScope !== "text" || !running) return;
    pageNoteRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeScope, running]);

  useEffect(() => {
    if (!focusSelection) return;
    const target = selections.find((s) => s.id === focusSelection);
    if (!target) return;
    const idx = blocks.findIndex((b) => target.end > b.start && target.start < b.end);
    if (idx < 0) return;
    setFocusedBlock(idx);
    const el = document.querySelector('[data-block="' + idx + '"]');
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = window.setTimeout(() => setFocusedBlock(-1), 2600);
    return () => window.clearTimeout(t);
  }, [focusSelection, selections, blocks]);

  // Measure the page: available content width and column count, keeping the
  // current page in range as glosses arrive and reflow the text.
  useEffect(() => {
    if (!appearance.paged) return;
    const measure = () => {
      const vp = viewportRef.current;
      const flow = flowRef.current;
      if (!vp || !flow) return;
      const cs = getComputedStyle(vp);
      const inner = vp.clientWidth - parseFloat(cs.paddingLeft || "0") - parseFloat(cs.paddingRight || "0");
      setAvailWidth(inner);
      const col = Math.max(320, Math.min(TEXT_COL_PX[appearanceRef.current.measure] + GUTTER_PX + MARGIN_PX, inner || 9999));
      const count = Math.max(1, Math.round((flow.scrollWidth + GUTTER_PX) / (col + GUTTER_PX)));
      setPageCount(count);
      setPage((p) => Math.max(0, Math.min(p, count - 1)));
    };
    const t = window.setTimeout(measure, 80);
    const ro = new ResizeObserver(measure);
    if (flowRef.current) ro.observe(flowRef.current);
    if (viewportRef.current) ro.observe(viewportRef.current);
    return () => {
      window.clearTimeout(t);
      ro.disconnect();
    };
  }, [appearance.paged, appearance.measure, appearance.size, appearance.font, blocks, glosses, streamed, pageNote, selections]);

  // Reading position in paged mode is page-based.
  useEffect(() => {
    if (!appearance.paged) return;
    const frac = pageCount > 1 ? page / (pageCount - 1) : 0;
    setProgress(frac);
    window.clearTimeout(beaconTimer.current);
    beaconTimer.current = window.setTimeout(() => {
      const blob = new Blob([JSON.stringify({ content_item_id: contentItemId, fraction: frac })], {
        type: "application/json",
      });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/position", blob);
    }, 900);
  }, [appearance.paged, page, pageCount, contentItemId]);

  // Swipe to turn, in paged mode only.
  const touchX = useRef<number | null>(null);
  function onPageTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0]?.clientX ?? null;
  }
  function onPageTouchEnd(e: React.TouchEvent) {
    if (!appearance.paged || touchX.current == null) return;
    const end = e.changedTouches[0]?.clientX ?? touchX.current;
    const dx = end - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 45) turn(dx < 0 ? 1 : -1);
  }

  const rows = (
    <>
      {blocks.length === 0 && <p className="text-[14px] text-muted">This text is empty.</p>}
      {blocks.map((b, i) => {
        const segs = segmentsFor(b, ranges);
        const gloss = i === pendingBlock && activeScope !== "text" ? live : glossByBlock.get(i) || null;
        const isPending = i === pendingBlock && running;
        return (
          <div key={i} className="reader-row lg:py-2">
            <p
              data-start={b.start}
              data-end={b.end}
              data-block={i}
              className={
                "reader-text cursor-pointer whitespace-pre-wrap rounded-[4px] px-2 py-1 -mx-2 transition-all lg:mx-0 lg:px-0 " +
                (isPending ? "bg-paper-2/60 lg:bg-transparent" : "lg:hover:bg-paper-2/40") +
                (i === focusedBlock ? " ring-2 ring-sun/70 ring-offset-4 ring-offset-paper" : "")
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
    </>
  );

  const noteSection = wholeText || (live?.mode === "page" && running) ? (
    <section ref={pageNoteRef} className="gloss-in mt-12 border-t border-line pt-6">
      <p className="text-[12px] text-muted">The whole text</p>
      <div className="mt-3">
        {live?.mode === "page" && running && !live.understanding ? (
          <Skeleton />
        ) : (
          <GlossBody r={wholeText!} />
        )}
      </div>
    </section>
  ) : null;

  const settingsPanel = settingsOpen ? (
    <>
      <button className="fixed inset-0 z-30 cursor-default" onClick={() => setSettingsOpen(false)} aria-label="Close" />
      {/* Anchored to the bottom so it never covers the control that opens it. */}
      <div className="glass glass-in fixed inset-x-3 bottom-3 z-40 rounded-glass p-4 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[22rem]">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-[13px] font-semibold text-ink">Reading</span>
          <button
            onClick={() => setSettingsOpen(false)}
            className="text-[12px] text-muted transition-colors hover:text-ink"
            aria-label="Close reading settings"
          >
            Close
          </button>
        </div>
        <AppearancePanel appearance={appearance} onChange={applyAppearance} />
      </div>
    </>
  ) : null;

  const notesSheet = notesOpen ? (
    <>
      <button
        className="fixed inset-0 z-40 cursor-default bg-ink/20"
        onClick={() => setNotesOpen(false)}
        aria-label="Close"
      />
      <div className="glass glass-in fixed inset-x-3 bottom-3 z-50 max-h-[80dvh] overflow-y-auto rounded-sheet p-4 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[24rem]">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-[13px] font-semibold text-ink">Your notes</span>
          <button onClick={() => setNotesOpen(false)} className="text-[12px] text-muted transition-colors hover:text-ink">
            Close
          </button>
        </div>

        {notes.length === 0 ? (
          <p className="text-[12.5px] leading-relaxed text-muted">
            Nothing yet. A note is yours — it sits beside what the AI understood, and stays.
          </p>
        ) : (
          <ul className="space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="border-l-2 border-sun/70 pl-3">
                <p className="text-[13px] leading-relaxed text-ink-soft">{n.body}</p>
                <div className="mt-1.5 flex items-center gap-3">
                  <details className="flex-1">
                    <summary className="cursor-pointer text-[11.5px] text-muted transition-colors hover:text-ink">
                      edit
                    </summary>
                    <form action={updateNote} className="mt-2">
                      <input type="hidden" name="id" value={n.id} />
                      <input type="hidden" name="content_item_id" value={contentItemId} />
                      <textarea
                        name="body"
                        defaultValue={n.body ?? ""}
                        rows={3}
                        className="w-full resize-y rounded-input border border-line bg-paper px-3 py-2 text-[13px] leading-relaxed text-ink"
                      />
                      <button type="submit" className="mt-1.5 rounded-pill border border-line px-3 py-1 text-[11.5px]">
                        Save
                      </button>
                    </form>
                  </details>
                  <form action={deleteNote}>
                    <input type="hidden" name="id" value={n.id} />
                    <input type="hidden" name="content_item_id" value={contentItemId} />
                    <button type="submit" className="text-[11.5px] text-muted transition-colors hover:text-danger">
                      delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form action={addNote} className="mt-4">
          <input type="hidden" name="content_item_id" value={contentItemId} />
          <textarea
            name="body"
            rows={3}
            placeholder="Add a note…"
            className="w-full resize-y rounded-input border border-line bg-paper px-3 py-2 text-[13.5px] leading-relaxed text-ink placeholder:text-muted"
          />
          <button type="submit" className="mt-2 rounded-pill bg-ink px-3.5 py-2 text-[12.5px] font-medium text-paper">
            Save note
          </button>
        </form>
      </div>
    </>
  ) : null;

  const notesButton = (
    <button
      onClick={() => setNotesOpen((v) => !v)}
      className="shrink-0 text-[12px] text-muted underline decoration-line underline-offset-4 transition-colors hover:text-ink"
    >
      notes{notes.length > 0 ? " (" + notes.length + ")" : ""}
    </button>
  );

  const hintAndError = (
    <>
      {!hasAny && !running && canRun && (
        <p className="mt-4 max-w-[44ch] text-[13px] leading-relaxed text-muted">
          Nothing is translated until you ask. Select a <span className="text-ink-soft">paragraph</span>,
          drag across a <span className="text-ink-soft">word</span> or phrase, or open the{" "}
          <span className="text-ink-soft">whole text</span> — each one reads into {targetName}.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-[4px] border-l-2 border-danger bg-danger/5 py-2 pl-4 pr-3 text-[13px] text-danger">
          {error}
        </p>
      )}
    </>
  );

  const aaButton = (
    <button
      onClick={() => setSettingsOpen((v) => !v)}
      className="glass-clear glass-press inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-[13px] font-semibold text-ink-soft hover:text-ink"
      aria-label="Reading appearance"
      title="Reading appearance"
    >
      Aa
    </button>
  );

  return (
    <div
      ref={rootRef}
      data-theme={appearance.theme}
      style={
        {
          "--text-col": TEXT_COL[appearance.measure],
          "--reading-size": SIZE[appearance.size].size,
          "--reading-leading": SIZE[appearance.size].leading,
        } as React.CSSProperties
      }
      className={
        appearance.paged
          ? "flex h-full min-h-0 flex-col overflow-hidden bg-paper text-ink"
          : "min-h-full bg-paper text-ink"
      }
    >
      {/* progress hairline */}
      <div className={"z-30 h-[3px] shrink-0 bg-transparent " + (appearance.paged ? "" : "sticky top-0")}>
        <div
          className="h-full bg-ember transition-[width] duration-150 ease-out"
          style={{ width: Math.round(progress * 100) + "%" }}
        />
      </div>

      {appearance.paged ? (
        <>
          <div className="glass-bar flex shrink-0 items-center gap-3 px-5 py-2.5 lg:px-10">
            <h1 className="min-w-0 truncate font-display text-[15px] font-semibold text-ink">{title}</h1>
            <span className="hidden shrink-0 text-[12px] text-muted sm:inline">
              {sourceLanguage === "auto" ? "detected" : findLanguage(sourceLanguage)?.name} &rarr; {targetName}
            </span>
            <div className="ml-auto flex shrink-0 items-center gap-3 text-[12px] text-muted">
              {running && (
                <button onClick={stop} className="transition-colors hover:text-ink">
                  Stop
                </button>
              )}
              <button
                data-testid="whole-text-action"
                onClick={() => {
                  setPopover(null);
                  setMenuOpen((v) => !v);
                }}
                disabled={!canRun}
                className="underline decoration-line underline-offset-4 transition-colors hover:text-ink disabled:opacity-40"
              >
                whole text
              </button>
              {notesButton}
              {aaButton}
            </div>
          </div>

          {settingsPanel}
          {notesSheet}
          {hintAndError}

          <div
            ref={viewportRef}
            onTouchStart={onPageTouchStart}
            onTouchEnd={onPageTouchEnd}
            className="relative min-h-0 flex-1 overflow-hidden px-5 lg:px-10"
          >
            <div
              ref={flowRef}
              className="reader-flow h-full"
              style={{
                columnWidth: pageWidth + "px",
                columnGap: GUTTER_PX + "px",
                columnFill: "auto",
                transform: "translateX(" + -page * step + "px)",
                transition: "transform 300ms cubic-bezier(0.22,0.61,0.36,1)",
              }}
            >
              <div
                ref={textRef}
                onClick={onTextClick}
                onMouseUp={onTextSelection}
                onTouchEnd={() => window.setTimeout(onTextSelection, 120)}
                style={{ fontFamily: FONT_FACE[appearance.font] }}
              >
                {rows}
              </div>
              {noteSection}
            </div>
          </div>

          <div className="glass-bar flex shrink-0 items-center justify-between gap-4 border-t border-b-0 px-5 py-3 lg:px-10">
            <button
              onClick={() => turn(-1)}
              disabled={page === 0}
              className="rounded-full border border-line px-3 py-1.5 text-[13px] text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink disabled:opacity-30"
              aria-label="Previous page"
            >
              &larr;
            </button>
            <span className="text-[12px] tabular-nums text-muted">
              {page + 1} / {pageCount}
            </span>
            <button
              onClick={() => turn(1)}
              disabled={page >= pageCount - 1}
              className="rounded-full border border-line px-3 py-1.5 text-[13px] text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink disabled:opacity-30"
              aria-label="Next page"
            >
              &rarr;
            </button>
          </div>
        </>
      ) : (
      <div className="reader-inner mx-auto px-5 pb-24 pt-6 lg:px-10 lg:pt-10">
        {/* title + chrome — folds away while reading, like a device's toolbar */}
        <header
          className={
            "overflow-hidden transition-all duration-300 ease-out " +
            (immersed ? "max-h-0 opacity-0" : "max-h-40 opacity-100")
          }
        >
          <h1 className="font-display text-[26px] font-semibold leading-[1.2] text-ink lg:text-[30px]">
            {title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-muted">
            <LangBadge code={sourceLanguage} size="sm" />
            <span>{sourceLanguage === "auto" ? "detected" : findLanguage(sourceLanguage)?.name}</span>
            <span className="text-line">&rarr;</span>
            <LangBadge code={targetLanguage} size="sm" />
            <span>{targetName}</span>
            {domain !== "general" && <span>&middot; {domain}</span>}
          </div>
        </header>

        {/* toolbar — the reading controls, always reachable */}
        <div className="glass sticky top-[3px] z-20 mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-pill px-4 py-2 text-[12px] text-muted">
          <button
            data-testid="whole-text-action"
            onClick={() => {
              setPopover(null);
              setMenuOpen((v) => !v);
            }}
            disabled={!canRun}
            className="underline decoration-line underline-offset-4 transition-colors hover:text-ink disabled:opacity-40"
          >
            Understand the whole text
          </button>
          {running && (
            <button onClick={stop} className="transition-colors hover:text-ink">
              Stop
            </button>
          )}
          <span className="ml-auto flex items-center gap-3">
            {notesButton}
            {aaButton}
          </span>
        </div>

        {settingsPanel}
        {notesSheet}
        {hintAndError}

        <div
          ref={textRef}
          onClick={onTextClick}
          onMouseUp={onTextSelection}
          onTouchEnd={() => window.setTimeout(onTextSelection, 120)}
          style={{ fontFamily: FONT_FACE[appearance.font] }}
          className="mt-8 space-y-5 lg:space-y-0"
        >
          {rows}
        </div>

        {noteSection}
      </div>
      )}

      {menuOpen && (
        <>
          <button
            className="fixed inset-0 z-40 cursor-default bg-ink/20"
            onClick={() => setMenuOpen(false)}
            aria-label="Close"
          />
          <div
            data-testid="action-menu"
            className="glass glass-in fixed inset-x-3 bottom-3 z-50 max-h-[80dvh] overflow-y-auto rounded-sheet p-4 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[24rem]"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-[13px] font-semibold text-ink">The whole text</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="text-[12px] text-muted transition-colors hover:text-ink"
              >
                Close
              </button>
            </div>
            <IntoPicker value={intoLang} onChange={setIntoLang} />
            <div className="mt-3">
              <ActionList scope="text" onPick={(id) => void run(null, "text", id)} />
            </div>
          </div>
        </>
      )}

      {popover && (
        <>
          <button
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setPopover(null)}
            aria-label="Close"
          />
          <div
            data-testid="action-picker"
            style={{ top: popover.top, left: popover.left }}
            className="glass glass-in fixed z-40 w-[19.5rem] max-w-[92vw] -translate-x-1/2 rounded-sheet p-3"
          >
            <IntoPicker value={intoLang} onChange={setIntoLang} />
            <div className="mt-2.5">
              <ActionList
                scope={popover.scope}
                onPick={(id) =>
                  void run({ start: popover.start, end: popover.end }, popover.scope, id)
                }
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AppearancePanel({
  appearance,
  onChange,
}: {
  appearance: ReadingAppearance;
  onChange: (next: ReadingAppearance) => void;
}) {
  const pick = (k: keyof ReadingAppearance, v: string) => onChange({ ...appearance, [k]: v });

  const themes: { v: ReadingAppearance["theme"]; label: string; bg: string; fg: string }[] = [
    { v: "paper", label: "Paper", bg: "#FDFAF6", fg: "#221B17" },
    { v: "sepia", label: "Sepia", bg: "#F2E7CF", fg: "#3B2E1E" },
    { v: "night", label: "Night", bg: "#1A1815", fg: "#E7E3DB" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] text-muted">Typeface</p>
        <div className="mt-1.5 flex gap-2">
          {(["serif", "sans"] as const).map((f) => (
            <button
              key={f}
              onClick={() => pick("font", f)}
              className={
                "rounded-input border px-3 py-1.5 text-[13px] capitalize " +
                (appearance.font === f
                  ? "border-ember bg-paper-2 font-medium text-ink"
                  : "border-line text-ink-soft hover:bg-paper-2")
              }
            >
              {f === "serif" ? "Serif" : "Sans"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] text-muted">Size</p>
        <div className="mt-1.5 flex items-end gap-2">
          {(
            [
              ["small", "11px"],
              ["medium", "13px"],
              ["large", "15px"],
              ["xl", "17px"],
            ] as const
          ).map(([s, px]) => (
            <button
              key={s}
              onClick={() => pick("size", s as ReadingAppearance["size"])}
              className={
                "rounded-input border px-3 py-1.5 " +
                (appearance.size === s ? "border-ember bg-paper-2 font-medium text-ink" : "border-line text-ink-soft hover:bg-paper-2")
              }
              style={{ fontSize: px }}
              aria-label={s}
              title={s}
            >
              A
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] text-muted">Theme</p>
        <div className="mt-1.5 flex gap-2">
          {themes.map((t) => (
            <button
              key={t.v}
              onClick={() => pick("theme", t.v)}
              className={
                "flex h-9 w-9 items-center justify-center rounded-full border text-[12px] " +
                (appearance.theme === t.v ? "border-ember ring-2 ring-ember/30" : "border-line")
              }
              style={{ background: t.bg, color: t.fg }}
              aria-label={t.label}
              title={t.label}
            >
              Aa
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] text-muted">Layout</p>
        <div className="mt-1.5 flex gap-2">
          {(
            [
              [true, "Pages"],
              [false, "Scroll"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={label}
              onClick={() => onChange({ ...appearance, paged: v })}
              className={
                "rounded-input border px-3 py-1.5 text-[13px] " +
                (appearance.paged === v
                  ? "border-ember bg-paper-2 font-medium text-ink"
                  : "border-line text-ink-soft hover:bg-paper-2")
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] text-muted">Width</p>
        <div className="mt-1.5 flex gap-2">
          {(["narrow", "normal", "wide"] as const).map((m) => (
            <button
              key={m}
              onClick={() => pick("measure", m)}
              className={
                "rounded-input border px-3 py-1.5 text-[13px] capitalize " +
                (appearance.measure === m ? "border-ember bg-paper-2 font-medium text-ink" : "border-line text-ink-soft hover:bg-paper-2")
              }
            >
              {m}
            </button>
          ))}
        </div>
      </div>
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

/**
 * Render whichever sections the action declared, in the order it declared them.
 * The renderer knows nothing about any particular action — a new one appears
 * here for free. ORIGINAL is never shown: it is the text the reader is already
 * looking at.
 */
function GlossBody({ r }: { r: Result }) {
  const scope: Scope = r.mode === "page" ? "text" : "passage";
  const variant = variantFor(findAction(r.action), scope);
  if (!variant) return null;

  const valueOf = (name: Marker): string | string[] | null => {
    switch (SLOT[name]) {
      case "original":
        return r.original;
      case "understanding":
        return r.understanding;
      case "terms":
        return r.terms;
      case "keyIdea":
        return r.keyIdea;
      default:
        return r.explanation;
    }
  };

  return (
    <div className="space-y-2.5">
      {variant.sections.map((s) => {
        if (s.name === "ORIGINAL") return null;
        const v = valueOf(s.name);

        if (s.kind === "list") {
          const list = Array.isArray(v) ? v : [];
          if (list.length === 0) return null;
          return (
            <ul
              key={s.name}
              className="space-y-0.5 border-t border-line pt-2.5 text-[12.5px] leading-snug text-ink-soft"
            >
              {list.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          );
        }

        const text = typeof v === "string" ? v : "";
        if (!text) return null;

        if (s.name === "EXPLANATION") {
          return (
            <details key={s.name} className="group pt-0.5">
              <summary className="cursor-pointer list-none text-[12px] text-muted transition-colors hover:text-ink-soft">
                <span className="group-open:hidden">{s.label.toLowerCase()}</span>
                <span className="hidden group-open:inline">hide</span>
              </summary>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{text}</p>
            </details>
          );
        }

        // The meaning-bearing section carries the weight; the rest annotate it.
        const lead = s.name === "UNDERSTANDING" || s.name === "SENSE";
        return (
          <p
            key={s.name}
            className={
              lead
                ? "font-display text-[16px] leading-[1.55] text-ink"
                : "text-[13px] leading-relaxed text-ink-soft"
            }
          >
            {!lead && (
              <span className="mr-1.5 text-[10.5px] uppercase tracking-wide text-muted">
                {s.label}
              </span>
            )}
            {text}
          </p>
        );
      })}
    </div>
  );
}

/** The reader's verbs, filtered to what applies to what they selected. */
function ActionList({ scope, onPick }: { scope: Scope; onPick: (id: string) => void }) {
  return (
    <ul className="space-y-0.5">
      {actionsForScope(scope).map((a) => (
        <li key={a.id}>
          <button
            onClick={() => onPick(a.id)}
            className="w-full rounded-input px-2 py-1.5 text-left transition-colors hover:bg-paper-2"
          >
            <span className="block text-[13px] font-medium text-ink">{a.label}</span>
            <span className="block text-[11px] leading-snug text-muted">{a.hint}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * The language, chosen where the asking happens. It used to be decided once,
 * when the text was filed, and never again.
 */
function IntoPicker({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between"
      >
        <span className="text-[10.5px] uppercase tracking-wide text-muted">Into</span>
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
          <LangBadge code={value} size="sm" />
          {findLanguage(value)?.name || value}
          <span className="text-muted">▾</span>
        </span>
      </button>
      {open && (
        <div className="mt-2 flex flex-wrap gap-1 border-t border-line pt-2.5">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                onChange(l.code);
                setOpen(false);
              }}
              className={
                "rounded-pill border px-2 py-0.5 text-[11.5px] transition-colors " +
                (l.code === value
                  ? "border-ember bg-paper-2 font-medium text-ink"
                  : "border-line text-ink-soft hover:text-ink")
              }
            >
              {l.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
