# Jeralis UI/UX architecture audit — reviewed findings

Date: 2026-10-01. Scope: 13 reachable routes, captured authenticated at 1440×900 and 375×812, plus signed-out login and five interaction states. This is a read-only review of the deployed private beta. The two user screenshots were treated as visual references and problem evidence.

## Method and score limit

The `ui-ux-architecture-audit` runner produced `audit_result.yaml`, `remediation_tasks.yaml`, 26 route screenshots, and DOM captures. Its **42.3/100 is provisional and should not be used as a product grade**: four of ten layers were unmeasured (interaction, frontend engineering, performance, design-system integrity), the industry detector incorrectly selected regulated finance, and the static preflight found zero routes because it assumes `src/app` while this project uses root `app/`. The image-alt warnings also need element-level review: decorative `alt=""` is valid. PageSpeed and axe were not run. The findings below are visually and code reviewed; no independent overall score is asserted.

## Route coverage

| Route | Desktop/mobile finding | Priority |
| --- | --- | --- |
| `/` | Clear purpose and primary CTA; “Open library” redirects a signed-out reader to login, so label and destination differ. | P2 |
| `/login` | Signed-out and signed-in states inspected. Demo CTA is more prominent than invited-reader sign-in; demo operator access is a separate launch gate. | P0 gate / P2 UX |
| `/privacy` | Readable on mobile. The retention text explicitly leaves policy open, as intended for the private beta. | Gate, no UI blocker |
| `/library` | Attractive shelf, but desktop duplicates category navigation, text list, and cover grid across three columns. Mobile hides search and category navigation shown on desktop. | P1 |
| `/book/[id]` | Reader is visible and quiet until asked. Opening the top “Reading settings” disclosure inserts a tall form before it. Reader text top moves from 103→536 px on desktop and 160→631 px on mobile. Existing saved gloss can show a different target language than the header without labeling that answer's language. | P1 |
| `/book/[id]/notes` | The page is titled Notes but displays saved AI glosses. Personal notes are in a separate reader sheet, making “Notes,” “Saved,” and the Note content kind hard to distinguish. | P1 |
| `/passage/[id]` | Repeats the same reading-settings displacement and reader controls as the book reader; standalone route should share any fix. | P1 |
| `/saved` | Groups glosses by book and deep-links to the passage. Shows the newest result per selection; whole-text answers and personal notes are absent despite the broad “Saved” label. | P1 |
| `/settings` | Clear entry page; its “Reading preferences” destination is distinct from the per-text disclosure, but the names are close. | P2 |
| `/settings/account` | Clear account state and sign-out; no major visual blocker seen. | P3 |
| `/settings/preferences` | Form is readable at both sizes. “Applied to new content” explains scope; labels could mirror in-reader terms. | P3 |
| `/settings/providers` | Current provider and connect flow are visible. Mobile long explanatory copy sits low near persistent tabs; verify scroll and keyboard behavior in interaction testing. | P2 |
| `/admin` | Operator metrics and access controls are legible on both sizes. The route is gated in code, but public demo access to this role remains a launch blocker. | P0 gate |

`/not-found` and `app/error.tsx` are system states, not ordinary routes; they were inspected in source only. Dynamic route samples use one existing item and do not prove every content length or kind.

## Interaction findings

1. **P1 — Reader layout breaks on per-text settings.** In both reader routes, the `<details>` form is in normal document flow above `<Reader>`. Move source language, default target, domain, and depth to a compact per-text settings panel or sheet that overlays without changing the reader's height. Put “Edit text” and “Book details” under item management, separate from reading controls. Keep the existing Aa appearance panel near the reader. Acceptance: opening or closing settings leaves the first line and page number in place at desktop and mobile sizes.
2. **P1 — Navigation hierarchy and creation flow.** The desktop rail lists nonempty kinds while a second pane repeats all individual titles and the main library repeats books as covers. The user's sidebar reference suggests one expandable hierarchy: Library → kinds → titles/sections, with a visible `New` control. Its first choice should be the **existing built kinds** (Book, Paper, Article, Essay, Poem, Note, Other); the next step chooses Type/paste, Scan/upload, or Clipboard. This preserves the distinction between what the item is and how it arrives. Mobile needs equivalent access to search and kinds, likely from Library rather than a permanently open rail. Acceptance: readers can create each built kind and reach a specific text from the sidebar without a duplicate list pane.
3. **P1 — Capture sheet readability and focus.** The glass sheet is translucent over busy book covers; behind-content remains visible through the form on both sizes. Strengthen the text-bearing surface. Treat it as a dialog with focus entry, Escape dismissal, focus return, and sensible keyboard/viewport handling. The current CTA “Understand” actually files the text and opens it; use a label that describes that transition.
4. **P1 — Saved/Notes semantics.** A Note is a content kind, “Your notes” is a personal-note sheet, `/book/[id]/notes` is AI gloss history, and `/saved` is newest selection glosses. Decide whether Saved means complete history or intentional bookmarks; then align names, content, and return links. Do not erase previous action results merely because the newest one occupies the margin.
5. **P1 — Reading action accessibility.** Paragraphs are clickable `<p>` elements, and the page-turn listener is on `window`; keyboard and assistive access to the picker need a dedicated path, and page-turn keys should not fire in inputs or textareas. The action picker was legible visually, but its mobile placement can cover most of a short page. Test long selections, bottom-of-screen selections, focus, and dismissal.
6. **P2 — Preserve language context for prior answers.** A stored Japanese gloss appears beside a reader header showing current target English. The header correctly reflects the new choice, but the old result needs its own language label or history metadata to avoid implying it is the current English response.
7. **P2 — Small targets and feedback.** Several text controls (top Reading settings, notes, Close, row edit/delete) are visually small. Measure touch areas against 44×44 px, add visible focus, and give save/error feedback at the point of action. This is a targeted test item, not a claim that every control fails.

## Recommended sequence

1. **Navigation model:** make a one-sidebar hierarchy and a `New` kind chooser; retain the shelf as the Library overview and let readers collapse the rail. Specify mobile search/filter access in the same design.
2. **Reader layout:** remove the in-flow settings disclosure; separate item management, per-text language/profile, and Aa appearance. Check book and passage routes together.
3. **State language:** settle Saved, AI gloss history, personal notes, and Note-kind labels; then render and link them consistently.
4. **Interaction and accessibility:** test capture, picker, settings, note sheet, keyboard, focus, mobile viewport, and long-text pagination. Fix confirmed issues.
5. **Validation:** rerun desktop/mobile screenshots and relevant end-to-end journeys. Run a real accessibility pass and performance pass before assigning an overall score.

## Evidence

- `screenshots/`: 26 route captures from the system runner.
- `states/`: signed-out login and open capture/picker/settings/appearance/notes states.
- `state_measurements.json`: settings displacement measurements.
- `codebase_preflight.json`: preflight route-discovery limitation.
- Product code: `app/(app)/book/[id]/page.tsx`, `app/(app)/passage/[id]/page.tsx`, `components/Reader.tsx`, `components/NewTextButton.tsx`, `components/SidebarNav.tsx`, `components/MobileTabs.tsx`, `lib/notebook.ts`.
