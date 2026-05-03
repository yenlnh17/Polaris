# Project Memory — Polaris Travel Website

## Key Decisions

### 2026-04-30 — Project Kickoff
- **Stack confirmed**: Pure HTML + CSS + Vanilla JS. No React, no Vue, no bundler.
- **Language**: Bilingual Vietnamese (default) / English via toggle
- **Scope**: Full 8 pages — index, destinations, destination detail, planner, packages, blog, article, about, contact
- **Images**: Unsplash URLs as placeholders (replaceable with real assets)
- **Primary color**: `#420D4B` — "Moon" palette from color.jpg reference

### Logo
- File: `assets/images/logo.jpg` — constellation "P" shape on dark purple space background
- Used in: navbar (44px height), about page hero
- Character: Polaris = North Star = guiding light for travelers

### Planner Family Mode (2026-04-30)
- When user selects "Family" in Step 1, show sub-questions:
  - Children present? → age groups (0–3 / 4–10 / 11–17) multi-select
  - Elderly (60+) present? → mobility limitation checkbox
- Stored as `plannerState.familyProfile`
- Family scoring: `child_friendly` +2, `near_center` +1; `mobilityLimit` triggers −3 penalty on non-accessible destinations
- Activity filter: hide `not_for_kids` / `not_accessible` activities for relevant profiles

### Day Builder Timeline (2026-04-30)
- Activities displayed on a **time-axis** (6:00–22:00) not just Morning/Afternoon/Evening slots
- Each activity has `startTime` (HH:MM) and `duration` (minutes) in `itinerary-templates.json`
- Mini route map shows shortest path between selected destinations using lat/lng + SVG polyline or Google Maps iframe

### About Page
- Uses `logo.jpg` as hero visual — celestial "P" constellation
- Tagline: "Ngôi sao dẫn đường" (vi) / "Your Guiding Star" (en)

## Architecture Notes
- All shared navbar/footer are injected via JS (component pattern) to avoid repeating HTML across 9 pages
- `store.js` is the single source of truth for planner state and wishlist
- `i18n.js` must be loaded before any page JS that renders UI text
- `destinations.json` includes `coordinates: { lat, lng }` for route map feature

## Open Questions / TODOs
- Google Maps API key needed for interactive route map — currently plan is embedded iframe or SVG polyline fallback
- Partner affiliate codes (Booking.com, Agoda) — placeholder UTM links used until real affiliate IDs provided
- Real destination photography — Unsplash URLs used until client provides branded assets
- Newsletter backend — form currently stores to localStorage only; needs email service integration later

## Design Rationale
- "Moon" palette chosen by client from reference image (color.jpg)
- Cormorant Garamond chosen for headings — elegant, travel-magazine feel, pairs well with purple palette
- Inter chosen for body — highly legible at small sizes, excellent Vietnamese character support
