# Remediation brief (web-builder handoff)

**Overall score:** 42.3/100  
**Risk:** high

## Observations

- codebase_preflight: repo=/Users/craigkunte/Developer/GitHub/services/ai-reading-companion routes=0
- codebase_preflight notes: Seed URLs use placeholders — replace ids/slugs with valid data.; Start local UX crawl after npm run dev; use localhost base + seeds.; Bundle path overridden via --output-dir; pair run_ui_ux_audit.py --preflight-json to this codebase_preflight.json explicitly.

## Top tasks

### [P3] Meta description length (37 chars) outside optimal 50-160 range
- **Layer:** L1_strategic_ux
- **Suggested archetypes:** hero, announcement-bar, trust-badges
- [ ] Adjust meta description to 50-160 characters
- [ ] Verify on: https://ai-reading-companion-alpha.vercel.app

### [P2] Missing Open Graph tags: og:title, og:description, og:image
- **Layer:** L1_strategic_ux
- **Suggested archetypes:** hero, announcement-bar, trust-badges
- [ ] Add Open Graph meta tags
- [ ] Verify on: https://ai-reading-companion-alpha.vercel.app

### [P3] No apple-touch-icon detected
- **Layer:** L1_strategic_ux
- **Suggested archetypes:** hero, announcement-bar, trust-badges
- [ ] Add <link rel='apple-touch-icon' href='icon-180.png'>
- [ ] Verify on: https://ai-reading-companion-alpha.vercel.app

### [P1] 2 image(s) missing alt text
- **Layer:** L5_accessibility
- **Suggested archetypes:** accessibility-pass
- [ ] Add descriptive alt or decorative alt=''
- [ ] Verify on: https://ai-reading-companion-alpha.vercel.app

### [P2] No skip-to-content link detected
- **Layer:** L5_accessibility
- **Suggested archetypes:** accessibility-pass
- [ ] Add <a href='#main-content' class='sr-only'>Skip to content</a>
- [ ] Verify on: https://ai-reading-companion-alpha.vercel.app

### [P3] Meta description length (37 chars) outside optimal 50-160 range
- **Layer:** L1_strategic_ux
- **Suggested archetypes:** hero, announcement-bar, trust-badges
- [ ] Adjust meta description to 50-160 characters
- [ ] Verify on: https://ai-reading-companion-alpha.vercel.app/login

### [P2] Missing Open Graph tags: og:title, og:description, og:image
- **Layer:** L1_strategic_ux
- **Suggested archetypes:** hero, announcement-bar, trust-badges
- [ ] Add Open Graph meta tags
- [ ] Verify on: https://ai-reading-companion-alpha.vercel.app/login

### [P3] No apple-touch-icon detected
- **Layer:** L1_strategic_ux
- **Suggested archetypes:** hero, announcement-bar, trust-badges
- [ ] Add <link rel='apple-touch-icon' href='icon-180.png'>
- [ ] Verify on: https://ai-reading-companion-alpha.vercel.app/login

### [P1] 1 image(s) missing alt text
- **Layer:** L5_accessibility
- **Suggested archetypes:** accessibility-pass
- [ ] Add descriptive alt or decorative alt=''
- [ ] Verify on: https://ai-reading-companion-alpha.vercel.app/login

### [P2] No skip-to-content link detected
- **Layer:** L5_accessibility
- **Suggested archetypes:** accessibility-pass
- [ ] Add <a href='#main-content' class='sr-only'>Skip to content</a>
- [ ] Verify on: https://ai-reading-companion-alpha.vercel.app/login

### [P3] Meta description length (37 chars) outside optimal 50-160 range
- **Layer:** L1_strategic_ux
- **Suggested archetypes:** hero, announcement-bar, trust-badges
- [ ] Adjust meta description to 50-160 characters
- [ ] Verify on: https://ai-reading-companion-alpha.vercel.app/privacy

### [P2] Missing Open Graph tags: og:title, og:description, og:image
- **Layer:** L1_strategic_ux
- **Suggested archetypes:** hero, announcement-bar, trust-badges
- [ ] Add Open Graph meta tags
- [ ] Verify on: https://ai-reading-companion-alpha.vercel.app/privacy

### [P3] No apple-touch-icon detected
- **Layer:** L1_strategic_ux
- **Suggested archetypes:** hero, announcement-bar, trust-badges
- [ ] Add <link rel='apple-touch-icon' href='icon-180.png'>
- [ ] Verify on: https://ai-reading-companion-alpha.vercel.app/privacy

### [P1] 1 image(s) missing alt text
- **Layer:** L5_accessibility
- **Suggested archetypes:** accessibility-pass
- [ ] Add descriptive alt or decorative alt=''
- [ ] Verify on: https://ai-reading-companion-alpha.vercel.app/privacy

### [P2] No skip-to-content link detected
- **Layer:** L5_accessibility
- **Suggested archetypes:** accessibility-pass
- [ ] Add <a href='#main-content' class='sr-only'>Skip to content</a>
- [ ] Verify on: https://ai-reading-companion-alpha.vercel.app/privacy

### [P3] Meta description length (37 chars) outside optimal 50-160 range
- **Layer:** L1_strategic_ux
- **Suggested archetypes:** hero, announcement-bar, trust-badges
- [ ] Adjust meta description to 50-160 characters
- [ ] Verify on: https://ai-reading-companion-alpha.vercel.app/library

### [P2] Missing Open Graph tags: og:title, og:description, og:image
- **Layer:** L1_strategic_ux
- **Suggested archetypes:** hero, announcement-bar, trust-badges
- [ ] Add Open Graph meta tags
- [ ] Verify on: https://ai-reading-companion-alpha.vercel.app/library

### [P3] No apple-touch-icon detected
- **Layer:** L1_strategic_ux
- **Suggested archetypes:** hero, announcement-bar, trust-badges
- [ ] Add <link rel='apple-touch-icon' href='icon-180.png'>
- [ ] Verify on: https://ai-reading-companion-alpha.vercel.app/library

### [P1] 2 image(s) missing alt text
- **Layer:** L5_accessibility
- **Suggested archetypes:** accessibility-pass
- [ ] Add descriptive alt or decorative alt=''
- [ ] Verify on: https://ai-reading-companion-alpha.vercel.app/library

### [P2] No skip-to-content link detected
- **Layer:** L5_accessibility
- **Suggested archetypes:** accessibility-pass
- [ ] Add <a href='#main-content' class='sr-only'>Skip to content</a>
- [ ] Verify on: https://ai-reading-companion-alpha.vercel.app/library

### [P2] No focus-visible / focus ring styles detected
- **Layer:** L5_accessibility
- **Suggested archetypes:** accessibility-pass
- [ ] Add :focus-visible styles or Tailwind focus:ring utilities
- [ ] Verify on: https://ai-reading-companion-alpha.vercel.app/library

### [P3] Meta description length (37 chars) outside optimal 50-160 range
- **Layer:** L1_strategic_ux
- **Suggested archetypes:** hero, announcement-bar, trust-badges
- [ ] Adjust meta description to 50-160 characters
- [ ] Verify on: https://ai-reading-companion-alpha.vercel.app/book/afd3e20d-f9c0-4054-96c5-26b0c6ad6483

### [P2] Missing Open Graph tags: og:title, og:description, og:image
- **Layer:** L1_strategic_ux
- **Suggested archetypes:** hero, announcement-bar, trust-badges
- [ ] Add Open Graph meta tags
- [ ] Verify on: https://ai-reading-companion-alpha.vercel.app/book/afd3e20d-f9c0-4054-96c5-26b0c6ad6483

### [P3] No apple-touch-icon detected
- **Layer:** L1_strategic_ux
- **Suggested archetypes:** hero, announcement-bar, trust-badges
- [ ] Add <link rel='apple-touch-icon' href='icon-180.png'>
- [ ] Verify on: https://ai-reading-companion-alpha.vercel.app/book/afd3e20d-f9c0-4054-96c5-26b0c6ad6483

### [P3] No breadcrumb navigation detected
- **Layer:** L2_information_architecture
- **Suggested archetypes:** navigation, footer, category-grid
- [ ] Add breadcrumb nav with aria-label='breadcrumb'
- [ ] Verify on: https://ai-reading-companion-alpha.vercel.app/book/afd3e20d-f9c0-4054-96c5-26b0c6ad6483

---

## Screenshots

See `screenshots/` directory for full-page captures at desktop (1440px), tablet (768px), and mobile (375px) viewports.

---
_Generated by run_ui_ux_audit.py v2.0 — merge into orchestrate `brief.md` as needed._