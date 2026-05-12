# Workflow Rules

## Build Order
Always follow this sequence — later steps depend on earlier ones:

1. **CSS Foundation** — `variables.css` → `reset.css` → `base.css` → `layout.css`
2. **CSS Components** — all files in `css/components/`
3. **Data Layer** — all JSON files in `data/`
4. **JS Core** — `store.js` → `i18n.js` → `utils.js`
5. **JS Components** — `navbar.js`, `modal.js`, `carousel.js`, `accordion.js`, `toast.js`, `formValidator.js`
6. **Pages** — index → destinations → destination → planner → packages → blog → article → about → contact
7. **Polish** — lazy load, skeleton screens, print CSS, SEO meta, a11y pass

## Per-File Conventions
- Every HTML page must include:
  - `<link rel="stylesheet">` for `variables.css`, `reset.css`, `base.css`, `layout.css`
  - The relevant page component CSS files
  - `<script type="module">` for page JS at end of `<body>`
  - `lang="vi"` on `<html>` (i18n.js updates it on language switch)
  - Unique `<title>` and `<meta name="description">`
  - Open Graph tags
- Every JS module must use `export`/`import` (ES modules, `type="module"`)
- No inline styles — all styling via CSS classes and custom properties
- No `document.write()`, no `var`, prefer `const` > `let`

## Editing Rules
- Before editing any existing file, read it first
- When adding a feature to a page, check if a reusable component already exists
- Never duplicate logic — extract to `utils.js` if used in 2+ places
- Keep page JS files focused on that page's logic only; shared behavior goes in components

## Testing Checklist (run before marking a page done)
- [ ] Opens without console errors in browser
- [ ] Responsive at 320px, 768px, 1280px (Chrome DevTools)
- [ ] Language toggle switches all `data-i18n` text
- [ ] All interactive elements keyboard-accessible (Tab + Enter/Space)
- [ ] No broken image URLs
- [ ] Partner links include `utm_source=polaris`

## Git
- Commit after completing each numbered build step above
- Commit message format: `feat(scope): description` or `fix(scope): description`
- Never commit `node_modules`, `.DS_Store`, or env files
