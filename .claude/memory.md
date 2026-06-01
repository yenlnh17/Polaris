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

## Session Log

### 2026-05-12 — Blog Redesign + Favicon

#### Blog page (`blog.html` + `js/pages/blog.js`)
- **Unified layout**: Tất cả article dùng class `.features-wrap` (grid 2 cột 38%/62%), xóa layout hero riêng — 1 container `#blog-list` duy nhất
- **Image aspect ratio**: `aspect-ratio: 3/2` trên `.features-wrap__img` → chiều cao tất cả card bằng nhau, không phụ thuộc ảnh
- **Body layout**: `justify-content: flex-start` + `margin-top: auto` trên `.features-wrap__meta` → header/title/excerpt ôm top, meta ôm đáy
- **Bookmark**: Toggle trạng thái lưu vào `localStorage` key `polaris_blog_bookmarks`, icon fill khi active
- **Share dropdown**: FB / Twitter / Email / Copy link / Report — dùng event delegation trên `#blog-list`, tránh nested `<a>` invalid HTML
- **i18n fixes**: Thêm 5 key thiếu vào `translations.json`: `blog.eyebrow`, `blog.empty`, `blog.share`, `blog.toc`, `blog.related`

#### Favicons (`assets/favicon/`)
- Thêm favicon block vào tất cả 7 trang HTML (index, destinations, destination, planner, packages, blog, article)
- Block gồm: `favicon.ico`, 3 PNG sizes (96/32/16), 9 Apple touch icon sizes, `manifest.json`, `msapplication-config`, `theme-color: #420D4B`
- Cập nhật `manifest.json`: name `"App"` → `"Polaris"`, thêm `short_name/theme_color/background_color/display`, fix paths từ root-absolute → relative
- Cập nhật `browserconfig.xml`: fix paths MS tile, TileColor `#ffffff` → `#420D4B`

### 2026-06-01 — Icon System Upgrade + Navbar Fix + i18n Bug

#### Icon Libraries (tất cả 9 HTML files)
- Thêm **Bootstrap Icons 1.11.3** CDN (jsdelivr, không có integrity hash) — dùng `<i class="bi bi-xxx">`
- Thêm **Font Awesome 6.7.2** CDN (cdnjs, không có integrity hash) — dùng `<i class="fa-solid fa-xxx">` hoặc `fas fa-xxx`
- **Không dùng integrity hash** trên FA CDN vì hash sai sẽ bị browser block hoàn toàn (SRI check fail)

#### Spinner Component (`css/components/spinner.css`)
- `.spinner` — inline, dùng border + border-radius:50% + @keyframes spin
- `.spinner-overlay` — absolute overlay cho card/section loading
- `.spinner-center` — flex column centered cho full-page loading
- `.btn--loading` — pointer-events:none + opacity:0.8, dùng cho form submit

#### Accordion bg (`css/components/accordion.css`)
- `.accordion__item`: transparent mặc định; `background-color` nằm trong `transition`
- `.accordion__item:hover` và `.accordion__item.is-open`: `background: white`
- `.accordion__trigger`: `background: transparent` ở mọi trạng thái

#### About page (`about.html` + `js/pages/about.js`)
- `team-card`: thêm `<div class="team-card__header">` bọc avatar + name/role → flex layout ngang
- VALUES và PARTNERS icons: đổi emoji → Bootstrap Icons `<i>` strings

#### Planner navbar đồng nhất với index.html
- Xóa `navbar__link--active` hardcode trên about.html (sai page)
- Thêm `navbar__cta` button trước hamburger
- Đổi `id="mobile-menu-planner"` → `id="mobile-menu"` + cập nhật `aria-controls`
- Thêm 3 links thiếu trong mobile menu: blog, about, contact
- Thêm `data-nav-page` cho tất cả mobile links + `aria-label` cho mobile lang-toggle
- Thêm `navbar__mobile-cta` button vào mobile actions

#### Bug: `i18n.js` + icon bị mất khi language switch
- **Root cause**: `i18n.js` line 54 dùng `el.textContent = val` → strip toàn bộ child nodes kể cả `<i>`
- **Pattern bị lỗi**: `<button data-i18n="key"><i class="bi bi-xxx"></i> Text</button>`
- **Fix**: tách `<i>` ra ngoài, bọc text trong `<span data-i18n="key">Text</span>`
- **Fix pattern**: `<button><i class="bi bi-xxx"></i> <span data-i18n="key">Text</span></button>`
- **Files đã fix**: `js/pages/destination.js` (2 buttons: `detail.view_gallery`, `detail.add_itinerary`, `detail.plan_new`)
- **translations.json**: xóa emoji prefix (`📷`, `📋`) ra khỏi các key có icon trong HTML

## Open Questions / TODOs
- Google Maps API key needed for interactive route map — currently plan is embedded iframe or SVG polyline fallback
- Partner affiliate codes (Booking.com, Agoda) — placeholder UTM links used until real affiliate IDs provided
- Real destination photography — Unsplash URLs used until client provides branded assets
- Newsletter backend — form currently stores to localStorage only; needs email service integration later

## Design Rationale
- "Moon" palette chosen by client from reference image (color.jpg)
- Cormorant Garamond chosen for headings — elegant, travel-magazine feel, pairs well with purple palette
- Inter chosen for body — highly legible at small sizes, excellent Vietnamese character support
