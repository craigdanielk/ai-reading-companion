# AI Reading Companion — Brand CI Guide (v1.0)

Canonical machine-readable source: **docs/brand/brand-ci-guide.yaml** (contract: brand-ci-guide-v1).
This file is the human-readable summary. Authored 2026-09-29 (greenfield — authored, not harvested).

## Direction

**Friendly, light, fun — yet refined.** Pinterest/Tumblr warmth without the noise: generous
spacing, warm neutrals, one confident accent, real typography. Mobile first, desktop second.

**Positioning:** not a translator — a comprehension companion.
**Tagline:** Read anything. Understand everything.

## Colour

Warm neutrals only — never pure #000 or #FFF for text surfaces.

| Token | Hex | Role |
|---|---|---|
| --ink | #221B17 | Primary text |
| --ink-soft | #5A4B41 | Secondary text |
| --muted | #8C7A6B | Tertiary text, labels |
| --line | #E8DFD5 | Borders, dividers |
| --paper | #FDFAF6 | App background |
| --paper-2 | #F6EEE5 | Recessed surfaces |
| --ember-600 | #C63C24 | Primary action, links |
| --sun | #F2B33D | Highlight, key idea |
| --sea | #2E9E8F | Success |
| --iris | #6C5CE0 | Provider / BYOK |
| --danger | #B3261E | Errors |

**Measured contrast (WCAG 2.1)** — every pair verified, all pass:

| Pair | Ratio | Grade |
|---|---|---|
| Ink on Paper | 16.31:1 | AAA |
| Ink soft on Paper | 8.02:1 | AAA |
| Ink on Sun | 9.13:1 | AAA |
| White on Ember 600 | 5.16:1 | AA |
| Ember 600 on Paper | 4.95:1 | AA |
| Iris on Paper | 4.75:1 | AA |
| Sea on Paper | 3.15:1 | AA (large only) |
| Muted on Paper | 3.95:1 | AA (large only) |

Sea and Muted must never carry body copy or small labels.

## Typography

| Role | Family | Use |
|---|---|---|
| Display | Fraunces (Georgia fallback) | Titles, section headings, the understanding text |
| Interface | Inter (system-ui fallback) | Body, UI, forms |
| Reading | Inter @ 18px / 1.7 | The passage being read |

Scale: 32 / 24 / 18 / 16 / 14 / 12px. Never Fraunces below 18px. Reading text never below
18px, measure held between 45 and 75 characters (.prose-measure, 68ch).

## Spacing, radius, motion

- **Spacing:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 (8px base).
- **Radius:** inputs 10px · cards 16px · sheets 24px · pills 999px.
- **Motion:** 150–250ms ease-out in, 120ms out. Always honour prefers-reduced-motion.

## Logo

A rounded square holding three text lines and an insight dot — a page becoming
understanding. Vector masters in public/brand/svg/: arc-lockup, arc-mark,
arc-mark-inverse, arc-mark-mono. Clear space = half the mark height. Minimum 24px (mark) /
96px (lockup). No stretch, rotation, recolour, shadow or crop.

## Voice

Friendly, encouraging, precise, unpretentious.
**Banned:** "simply", "just" (condescending), "accurate translation" (unprovable — say
*meaning-preserving*), "AI-powered" (says nothing).
Sentence case everywhere; second person; no exclamation marks in error states.

## Open decisions

- Product name is **provisional** — the client may rename; the guide updates throughout.
- Vector logo masters are specified but should be redrawn for large-format print.
- No licensed imagery set yet. No CMYK/PMS values (digital-first for MVP).
- Contrast to be re-verified against final tokens at build time.
