"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { parseSections } from "@/lib/providers/parse";

export interface SavedResult {
  id: string;
  original: string | null;
  understanding: string | null;
  terms: string[] | null;
  key_idea: string | null;
  explanation: string | null;
}

interface View {
  original: string;
  understanding: string;
  importantTerms: string[];
  keyIdea: string;
  explanation: string;
}

const EMPTY: View = { original: "", understanding: "", importantTerms: [], keyIdea: "", explanation: "" };

export function UnderstandPanel({
  contentItemId,
  saved,
  onSave,
  canRun,
}: {
  contentItemId: string;
  saved: SavedResult | null;
  onSave: (formData: FormData) => Promise<void>;
  canRun: boolean;
}) {
  const [streamed, setStreamed] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);
  const router = useRouter();

  const savedView: View | null = saved
    ? {
        original: saved.original || "",
        understanding: saved.understanding || "",
        importantTerms: saved.terms || [],
        keyIdea: saved.key_idea || "",
        explanation: saved.explanation || "",
      }
    : null;

  const live = parseSections(streamed);
  const streamingView: View = {
    original: live.original || "",
    understanding: live.understanding || "",
    importantTerms: live.importantTerms || [],
    keyIdea: live.keyIdea || "",
    explanation: live.explanation || "",
  };

  const view: View = streamed ? streamingView : savedView || EMPTY;
  const hasAny = Boolean(view.understanding || view.explanation || view.original);

  async function run() {
    if (!canRun) return;
    setRunning(true);
    setStreamed("");
    setError("");
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const res = await fetch("/api/understand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_item_id: contentItemId }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        setError(await res.text());
        setRunning(false);
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
      setRunning(false);
      router.refresh();
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
      setRunning(false);
    }
  }

  function stop() {
    abort.current?.abort();
    setRunning(false);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-sun" aria-hidden />
          Understanding
          {running && <span className="text-xs font-normal text-muted">streaming…</span>}
        </h2>
        <div className="flex items-center gap-2">
          {saved && !streamed && (
            <form action={onSave}>
              <input type="hidden" name="content_item_id" value={contentItemId} />
              <input type="hidden" name="ai_result_id" value={saved.id} />
              <button
                type="submit"
                className="rounded-pill border border-line bg-paper px-3 py-1.5 text-xs transition-colors hover:bg-paper-2"
              >
                Save to notes
              </button>
            </form>
          )}
          {running ? (
            <button
              onClick={stop}
              className="rounded-pill border border-line bg-paper px-3 py-1.5 text-xs hover:bg-paper-2"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={run}
              disabled={!canRun}
              className="rounded-pill bg-ember px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-ember-700 disabled:opacity-40"
            >
              {hasAny ? "Understand again" : "Understand"}
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {error && (
          <p className="rounded-input border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        {!hasAny && !running && !error && (
          <p className="text-sm text-muted">
            {canRun
              ? "Nothing understood yet — press Understand to read this passage."
              : "Add a passage first, then press Understand."}
          </p>
        )}

        {running && !view.understanding && (
          <div className="space-y-3" aria-busy="true">
            <div className="h-4 w-2/3 animate-pulse rounded bg-paper-2" />
            <div className="h-4 w-full animate-pulse rounded bg-paper-2" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-paper-2" />
          </div>
        )}

        <div className="space-y-5">
          {view.original && (
            <section>
              <h3 className="text-[11px] font-medium tracking-wide text-muted">ORIGINAL</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">{view.original}</p>
            </section>
          )}

          {view.understanding && (
            <section>
              <h3 className="text-[11px] font-medium tracking-wide text-muted">YOUR UNDERSTANDING</h3>
              <p className="mt-1 font-display text-[18px] leading-[1.6] text-ink">{view.understanding}</p>
            </section>
          )}

          {view.importantTerms.length > 0 && (
            <section>
              <h3 className="text-[11px] font-medium tracking-wide text-muted">IMPORTANT TERMS</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {view.importantTerms.map((t, i) => (
                  <li key={i} className="rounded-pill border border-line bg-paper px-3 py-1 text-[13px] text-ink-soft">
                    {t}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {view.keyIdea && (
            <section className="rounded-card border-l-4 border-sun bg-paper-2/50 p-3">
              <h3 className="text-[11px] font-medium tracking-wide text-muted">KEY IDEA</h3>
              <p className="mt-1 text-[14px] text-ink">{view.keyIdea}</p>
            </section>
          )}

          {view.explanation && (
            <section>
              <h3 className="text-[11px] font-medium tracking-wide text-muted">EXPLANATION</h3>
              <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-soft">
                {view.explanation}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
