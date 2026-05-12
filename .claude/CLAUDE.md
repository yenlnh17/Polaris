# Polaris Travel Website — Project Instructions

## Project Overview
Polaris is a Vietnamese bilingual (vi/en) travel website built with **pure HTML, CSS, and vanilla JavaScript** (no frameworks). It targets 18–35 Vietnamese independent travelers and families, offering destination discovery, personalized itinerary planning, and partner booking.

## Core Value Propositions (from BMC)
1. Suggest destinations based on user preferences
2. Generate personalized travel itineraries
3. Reduce travel research time
4. Connect users to partner booking platforms (Booking.com, Agoda, Traveloka, Klook)

## Tech Stack
- **HTML5** — semantic elements throughout, no divitis
- **CSS3** — CSS custom properties, Grid, Flexbox, mobile-first
- **Vanilla JS (ES6+)** — modules via `type="module"`, no jQuery, no bundler
- **Data** — local JSON files in `data/`, fetched with `fetch()`
- **Storage** — `localStorage` for wishlist, planner draft, language preference

## File Structure
```
d:\Polaris\
├── index.html, destinations.html, destination.html
├── planner.html, packages.html, blog.html, article.html
│   (about.html, contact.html — chưa tạo)
├── css/
│   ├── variables.css, reset.css, base.css, layout.css
│   └── components/  (navbar, footer, hero, cards, buttons, forms,
│                     modal, accordion, carousel, stepper, toast)
├── js/
│   ├── core/        (store.js, i18n.js, utils.js, config.js, goong.js)
│   ├── components/  (navbar.js, modal.js, carousel.js,
│                     accordion.js, toast.js, formValidator.js)
│   └── pages/       (home.js, destinations.js, destination.js,
│                     planner.js, packages.js, blog.js)
│                    (article.js, contact.js — chưa tạo)
├── data/
│   ├── destinations.json, packages.json, blog.json
│   ├── itinerary-templates.json, translations.json
└── assets/
    ├── images/ (logo.jpg, logo.png)
    └── favicon/ (favicon.ico, favicon-16/32/96.png, apple-icon-*, android-icon-*,
                  ms-icon-*, manifest.json, browserconfig.xml)
```

## Brand & Design
- **Primary color**: `#420D4B` (dark purple)
- **Full palette**: `#F5D5E0` / `#6667AB` / `#7B337E` / `#420D4B` / `#210635`
- **Logo**: `assets/images/logo.jpg` — constellation "P" on dark space background
- **Fonts**: Cormorant Garamond (display/headings) + Inter (body)
- **Theme**: Celestial / north star / cosmos. Tagline: "Ngôi sao dẫn đường" / "Your Guiding Star"
- All design tokens defined in `css/variables.css`

## Languages
- Bilingual Vietnamese (default) / English
- All user-facing strings use `data-i18n="key"` attributes
- Translations stored in `data/translations.json` as `{ vi: {...}, en: {...} }`
- `js/core/i18n.js` handles DOM-wide language switching + `localStorage` persistence

## Key Features per Page
| Page | Key Feature |
|------|-------------|
| index.html | Hero + star canvas, preference tiles, featured carousel |
| destinations.html | Filter+search grid, map view toggle, wishlist hearts |
| destination.html | Lightbox gallery, booking panel (partner UTM links), tabs |
| planner.html | 4-step wizard: quiz → scoring → day timeline builder → export |
| packages.html | 3-tier pricing cards, inquiry form |
| blog.html | Category filter, article grid |
| article.html | Auto-generated TOC, reading time, social share |
| about.html | Logo hero, mission, partners, timeline |
| contact.html | Form + FAQ accordion + Google Maps |

## Planner Algorithm
Scoring in `js/pages/planner.js`:
- styleOverlap×3 + budgetMatch×3 + durationFit×2 + typeOverlap×2 + seasonMatch×1
- Family bonus: `child_friendly` +2, `near_center` +1; `mobilityLimit` penalizes non-accessible destinations −3

## Family Profile Tags (on destinations + activities)
`child_friendly`, `near_center`, `elderly_accessible`, `not_for_kids`, `not_accessible`

## Partner UTM Pattern
All partner links append `?utm_source=polaris&utm_medium=referral`

## localStorage Keys
```js
polaris_wishlist, polaris_itineraries, polaris_planner_draft, polaris_lang, polaris_newsletter_sub
```

## Rules
- See `.claude/rules/` for workflow, design, and tech defaults
- See `.claude/agents/` for researcher and reviewer agent prompts
- See `.claude/memory.md` for project memory / decisions log
