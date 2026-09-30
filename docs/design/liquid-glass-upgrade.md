# Jeralis — Liquid Glass visual upgrade plan

> Source: Apple's Liquid Glass design system, announced WWDC 2025 and shipped in
> iOS 26 / macOS Tahoe 26. Apple open-sourced the design kits and published the
> material specification and principles.

## Sources

- Apple, *Meet Liquid Glass* (WWDC25): https://developer.apple.com/videos/play/wwdc2025/219/
- Apple technical overview: https://developer.apple.com/documentation/technologyoverviews/liquid-glass
- Apple press release: https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/
- Apple Design Resources (Figma kits): https://developer.apple.com/design/resources/
- Web reimplementations to crib technique from (not copy): shuding/liquid-glass (SVG lensing), liquid-glass-react

## Three governing principles, mapped to Jeralis

1. **Hierarchy** — controls float on a distinct layer *above* content, and they
   shrink or hide as the reader scrolls. Jeralis already does the shrink/hide part
   (immersion). The missing part is the *material* that says "this floats".
2. **Harmony** — concentric corner radii (nested elements share a centre, radii step
   down consistently) and capsule-shaped controls. Jeralis today mixes 3px covers,
   10px inputs, 16px cards and 999px pills with no derivation. Collapse to one rule.
3. **Consistency** — adapt continuously across sizes rather than redesigning per
   breakpoint. Jeralis is already mobile-first; keep it.

## The material

- Real glass: backdrop blur + saturation boost, a translucent paper tint, a 1px
  inner specular highlight along the top edge, and an adaptive shadow. Tint adapts
  to the theme (paper / sepia / night) and to what sits behind it.
- Two variants: **regular** (opaque enough for text) for most controls, and **clear**
  (more transparent) only over media-rich content — which Jeralis barely has, so we
  use clear sparingly or not at all.
- Interactive: press scale ~0.97 and a subtle shimmer on touch.

## The one rule (guardrail)

> **Glass belongs only to the navigation/control layer floating above content —
> never to content itself.** No glass lists, cards, covers or glosses. Content stays
> on opaque surfaces; glass-on-glass is forbidden.

Concretely for Jeralis:

| Becomes glass (control layer) | Stays opaque (content) |
| --- | --- |
| Reader Aa button, "Understand this" popover, reading-settings sheet, progress bar, Stop / whole-text controls | The text itself and the margin gloss |
| Sidebar, mobile header / tab bar (inset floating capsule) | Book covers (cloth), shelf cards, notebook entries |

## Token implementation

- A `.glass` utility in globals.css: backdrop-filter blur(20px) saturate(1.6), a
  translucent paper fill, 1px inset specular highlight, adaptive shadow; theme-aware
  via the existing data-theme tokens.
- Replace the ad-hoc radius set with a derived concentric scale.
- Keep prefers-reduced-motion (already wired); glass motion is 150-250ms ease-out.

## Phased rollout

- **Phase 1** — glass on the reader's floating controls + press motion + concentric
  radii. Highest "device" feel, lowest risk. The reader is where the user lives.
- **Phase 2** — glass sidebar and mobile tab bar as an inset floating capsule, with
  adaptive tint across paper/sepia/night.
- **Phase 3 (optional)** — true lensing via an SVG displacement filter (the
  shuding/liquid-glass technique) for the reader controls only, gated behind
  prefers-reduced-motion and a performance check.

## Guardrails

- WCAG: text on glass must stay >= 4.5:1; use the regular variant for text-bearing
  controls, never clear.
- Subtlety: this is a reading app. Glass is ambient, not a demo reel.
- Extend the test suite: the existing E2E covers the Aa button and settings sheet;
  add a visual smoke check that the glass layer renders and content stays opaque.
