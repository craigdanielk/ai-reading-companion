# Jeralis test suite

Built against the PCS (Capability-First Project Construction) method: each layer
is an independent, behaviourally-verified probe.

## Layers

| Layer | Runner | Location | What it proves |
|-------|--------|----------|----------------|
| Unit | vitest | `tests/unit/` | Pure logic: selection snapping, stream parsing, the nuance registry, prompt builders, model-JSON repair |
| E2E | pytest + Playwright | `tests/e2e/` | The critical journeys: auth, shelf, reader (tap→gloss, themes, position), notebook, settings |
| Perf | Python + Playwright | `tests/perf/run_perf.py` | Load times and API latency against thresholds; exit 1 on breach |

## Run

```bash
npm test                 # unit (vitest)
npm run test:e2e         # end-to-end (needs the Playwright venv on PATH)
npm run test:perf        # load-time + latency probe
python tests/perf/run_perf.py --understand   # also time the understand API
```

The E2E and perf suites need Playwright + pytest. This repo is verified with:

```bash
~/Developer/GitHub/scripts/.venv/bin/python -m pytest tests/e2e -q
~/Developer/GitHub/scripts/.venv/bin/python tests/perf/run_perf.py
```

Target the live app by default; override with `JERALIS_URL` (E2E) or `--base` (perf).

## Perf thresholds (current)

- login load < 3s · library load < 4s · book load < 5s
- understand first byte < 15s (cold serverless + model)
## Known perf profile (measured 2026-09-30)

Page DOM-complete, warm: login ~0.4s, library ~1.8s, book ~1.8s.

The two fixes that moved the book page from ~2.7s to ~1.8s:

- middleware only refreshes the Supabase session when the access token is within
  5 minutes of expiry (was: a getUser() round trip on every navigation).
- fonts load via preconnect + stylesheet links instead of a render-blocking
  @import.

Remaining cost is Supabase round-trip latency in the reader's data loader
(~300-500ms per query, with a two-step chain). The next lever is collapsing that
chain to one round trip, but the PostgREST embedded-select attempt regressed and
was reverted - it needs a proper integration test before it ships again.

