# Tech Defaults

## HTML
- Always use HTML5 doctype: `<!DOCTYPE html>`
- `<html lang="vi">` — i18n.js updates this attribute on language switch
- Semantic structure: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`
- One `<h1>` per page
- All `<img>` must have meaningful `alt` text (or `alt=""` for decorative images)
- Use `loading="lazy"` on below-fold images
- Use `<picture>` with WebP + JPG fallback where possible
- Detail pages use URL query params: `destination.html?id=hoi-an`, `article.html?id=slug`

## CSS
- All component CSS files import `variables.css` implicitly (linked before them in HTML)
- Never use `!important` except to override third-party styles
- Prefer `gap` over margin for flex/grid spacing
- Use `clamp()` for fluid typography and spacing where appropriate
- `aspect-ratio` for image containers (don't use padding-hack)
- Scrollbar styling only if it enhances UX and has a plain fallback

## JavaScript
- ES6+ only: `const`/`let`, arrow functions, template literals, destructuring, optional chaining
- All JS files are ES modules: `<script type="module" src="...">` — no global pollution
- Async data loading via `fetch()` with `async/await`
- Error handling: all `fetch()` calls wrapped in try/catch; show user-friendly empty state on failure
- No `alert()`, `confirm()`, or `prompt()` — use custom modal/toast instead
- No `eval()`, no `innerHTML` with user-supplied data (XSS prevention)
- Use `textContent` for user-controlled text insertion
- DOM queries: `document.querySelector` / `querySelectorAll`, cache results in `const`

## Data Loading Pattern
```js
// Standard pattern for all page data fetching
async function loadData(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (e) {
    console.error('Failed to load', path, e);
    return null;
  }
}
```

## State Management (store.js)
- Centralized state via observer pattern
- `store.set(key, value)` — updates state + notifies subscribers
- `store.get(key)` — reads current value
- `store.subscribe(key, fn)` — registers change listener
- `store.persist(key)` — mirrors key to localStorage automatically
- Used for: planner wizard state, wishlist, active language

## i18n Pattern
```html
<!-- In HTML: default Vietnamese text, key in attribute -->
<span data-i18n="nav.home">Trang chủ</span>
<img alt="" data-i18n-alt="hero.search.placeholder">
<input placeholder="Tìm kiếm..." data-i18n-placeholder="hero.search.placeholder">
```
```js
// i18n.js applies current language on load and on toggle
i18n.setLang('en') // walks DOM, replaces all data-i18n* values
```

## Form Validation (formValidator.js)
```js
const validator = new FormValidator(formEl, {
  email:  { required: true, pattern: 'email',  errorMessage: { vi: '...', en: '...' } },
  phone:  { required: true, pattern: /^0\d{9}$/, errorMessage: { vi: '...', en: '...' } },
  date:   { required: true, minDate: 'tomorrow', errorMessage: { vi: '...', en: '...' } }
});
// Validates on submit + on blur; returns Promise<formData>
```

## Lazy Loading
- All `<img>` below the fold: use `data-src` instead of `src`
- `js/core/utils.js` exports `initLazyLoad()` using `IntersectionObserver`
- Adds class `.loaded` on image load for CSS fade-in

## localStorage
- Always check for existence and parse safely:
```js
function safeGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
```
- Never store sensitive data (no passwords, no payment info)
- Cache expiry pattern: store `{ data, fetchedAt }`, check `Date.now() - fetchedAt < TTL`

## Partner Links
```js
// Always use this helper — never construct partner URLs inline
function partnerUrl(partner, destination) {
  const base = PARTNER_BASES[partner];
  return `${base}${encodeURIComponent(destination)}&utm_source=polaris&utm_medium=referral`;
}
```

## Performance
- `defer` attribute on all non-critical `<script>` tags
- `<link rel="preload">` for hero image and primary fonts
- `requestAnimationFrame` for scroll/resize handlers
- Debounce search inputs with 300ms delay (from `utils.js`)
- Cache destination JSON in localStorage with 24h TTL

## SEO
- Each page: unique `<title>` and `<meta name="description">`
- Open Graph: `og:title`, `og:description`, `og:image`, `og:url`
- `<link rel="canonical">`
- Destination pages: JSON-LD `TouristDestination` schema
- Article pages: JSON-LD `Article` schema
