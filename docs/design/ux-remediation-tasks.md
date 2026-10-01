# Jeralis UI/UX remediation tasks

Source: [reviewed 2026-10-01 audit](../../artifacts/ui-ux-audit/2026-10-01/REVIEW.md). Scope: the existing private-beta product. Check an item only after its acceptance criteria are verified on desktop and mobile. Keep release gates in `docs/legal/launch-gates.md` as the authority for launch.

## 1. Navigation and creation

- [x] **UX-01 — One expandable library sidebar (P1).** Show kinds with their text titles and sections in a single hierarchy; retain the shelf as the Library overview. Remove the duplicated title pane from Library and Book. Active text and kind must be clear; long titles truncate without hiding access. The sidebar can collapse while reading.
- [x] **UX-02 — New content by kind (P1; depends on UX-01).** The `New` control first offers the existing Book, Paper, Article, Essay, Poem, Note, and Other kinds. The capture step then offers type/paste, scan/upload, and clipboard. The chosen kind reaches `createText`; no automatic AI call occurs on filing.
- [x] **UX-03 — Mobile library discovery (P1; depends on UX-01).** Search, kind filters, and individual texts are reachable at 375 px without a desktop-only list pane or permanently open sidebar.

## 2. Reader and content management

- [x] **UX-04 — Keep the reader in place when settings open (P1).** Replace the in-flow `Reading settings` disclosure on Book and Passage with an overlay for per-text source/target language, domain, and depth. Opening it must not move the first line or page controls at desktop or mobile widths.
- [x] **UX-05 — Separate item management from reading controls (P1; depends on UX-04).** Put Edit text, Book details, cover, source, section order, and delete in a clearly named item-management surface. Keep Aa for appearance and the action picker for per-request language.
- [x] **UX-06 — Action-picker keyboard and touch behavior (P1).** A keyboard user can open, use, and dismiss the picker; page-turn keys do not intercept focused fields. Validate long selections and selection near screen edges. No comprehension runs before a reader chooses an action.
- [ ] **UX-07 — Resume and answer context (P1).** Verify paged reading restores the correct page. Label stored answers with the language/action that produced them so earlier answers do not appear to follow a newer target-language choice.

## 3. Capture, Saved, and Notes

- [x] **UX-08 — Capture dialog readability and focus (P1; depends on UX-02).** Give text-bearing controls an opaque enough surface over covers, sensible focus entry/return and Escape behavior, and a CTA that describes filing/opening the text. Verify mobile keyboard and viewport behavior.
- [x] **UX-09 — Define Saved and Notes (P1).** Decide whether Saved is complete action history or intentional bookmarks. Distinguish the Note content kind, personal notes, and AI result history in navigation and headings. Include whole-text results and personal notes according to that decision; preserve access to older actions on one selection.

## 4. Page polish and evidence

- [ ] **UX-10 — Interaction feedback and touch targets (P2).** Check save, error, loading, and destructive-action feedback on capture, reader, notes, settings, and operator forms. Measure small controls against 44×44 px and add visible keyboard focus where missing.
- [x] **UX-11 — Public and account copy (P2).** Make the home CTA's sign-in destination clear for signed-out visitors, and keep default versus per-text preference labels consistent. Check the provider page at mobile keyboard height.
- [x] **UX-12 — Accessibility and performance verification (P2).** Run a real accessibility pass and browser performance pass after interaction changes. Review automated image-alt and label findings element by element; the audit engine's provisional 42.3 score is not a product grade.
- [ ] **UX-13 — Regression and visual gate (P1).** Capture desktop/mobile Library, Book, Passage, Saved, and settings states; run unit, typecheck/build, and the relevant deployed end-to-end journeys after deployment. Compare with audit captures and record observed results.

## Release dependency tracked separately

- [ ] **REL-08 — Remove operator rights from the public demo account (P0).** Requires the real private operator identity for `ADMIN_EMAILS`; verify a demo reader cannot open `/admin`. See launch gate 8. This is a release blocker, not a visual redesign item.

## Current sequence

`UX-01 → UX-02 → UX-03 → UX-04 → UX-05 → UX-06/07 → UX-08/09 → UX-10/11 → UX-12/13`. REL-08 proceeds when the operator identity is supplied.

## Verification notes (local branch)

- UX-01–05: desktop/mobile Library and reader visuals reviewed. Targeted navigation/capture E2E passed 9/9. Opening Text options kept the first reader paragraph at the same vertical position (desktop 121→121 px; mobile 178→178 px in the latest capture).
- UX-06: keyboard picker open/Escape/focus-return and paragraph action E2E passed; mobile long-selection picker stayed within the 375×812 viewport and made zero AI requests before an action was chosen.
- UX-07: paged resume E2E passed. Per-answer language storage and legacy-row labels are coded; the additive database migration still needs applying before new answers record language.
- UX-09: Saved history now groups repeated selection actions, whole-text results, and personal notes by source text type, with groups and entries ordered newest first and each entry dated. A local sample showed 34 items. The personal-note Saved round trip E2E passed.
- UX-12: axe WCAG A/AA scan on local desktop/mobile Library, Book, Saved, and Providers found zero violations after increasing muted text contrast. The production-build pass across 12 routes at desktop and mobile widths found zero WCAG A/AA violations; local production performance thresholds cleared (login 460 ms, Library 1235 ms, Book 2311 ms load).
- Build, typecheck, and unit tests passed (69/69); lint passed with the justified signed-in navigation exception.

- UX-08: mobile capture chooser and capture dialog took focus, Escape closed the dialog and returned focus to New; the surface computed as opaque `rgb(253, 250, 246)`.
- UX-11: the signed-out home CTA names sign-in; Providers Connect remained visible at a simulated 375×500 mobile keyboard viewport.
- REL-08: local and Vercel Production `ADMIN_EMAILS` updated to the supplied private email; local production build redirects the demo account from `/admin` to `/library`. An existing production deployment needs redeployment to consume the changed environment variable.
