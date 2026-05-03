# Design Rules

## Color Usage
| Token | Hex | Use |
|-------|-----|-----|
| `--color-darkest` | `#210635` | Dark backgrounds, navbar (scrolled), footer |
| `--color-primary` | `#420D4B` | Primary buttons, active states, main brand |
| `--color-accent`  | `#7B337E` | Hover states, gradient endpoints, badges |
| `--color-secondary` | `#6667AB` | Links, secondary buttons, icons |
| `--color-lightest` | `#F5D5E0` | Text on dark, light accents, muted labels |
| `--bg-alt` | `#FAF6FB` | Alternating section backgrounds |

**Never** use raw hex values in component CSS — always reference a `--color-*` variable.

## Typography
- **Headings** (h1–h3): `font-family: var(--font-display)` — Cormorant Garamond, elegant serif
- **Body / UI** (h4–h6, p, labels): `font-family: var(--font-body)` — Inter, clean sans-serif
- **Hero h1**: `var(--text-5xl)` or `var(--text-6xl)` + `--font-display` + `color: white`
- **Section headings**: `var(--text-3xl)` or `var(--text-4xl)` + `--font-display`
- **Body text**: `var(--text-base)` with `line-height: var(--leading-normal)` (1.6)
- Load fonts from Google Fonts CDN: `Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400` and `Inter:wght@400;500;600`

## Spacing
- Use `--space-*` tokens for all padding/margin/gap — never raw pixel values
- Section vertical padding: `var(--space-20)` (5rem) desktop, `var(--space-12)` mobile
- Container horizontal padding: `var(--container-pad)` (clamp 1rem→2rem)

## Responsive Design (mobile-first)
```css
/* Base = mobile < 640px */
@media (min-width: 640px)  { /* sm  */ }
@media (min-width: 768px)  { /* md  */ }
@media (min-width: 1024px) { /* lg  */ }
@media (min-width: 1280px) { /* xl  */ }
```
- **Mobile**: single column, hamburger nav, stacked booking panel, bottom FAB
- **Tablet (md)**: 2-col grids, horizontal planner steps
- **Desktop (lg+)**: 3-col grids, sticky sidebars, full nav links

## Component Patterns

### Buttons
```css
/* Primary */
background: var(--gradient-cta);
color: white;
border-radius: var(--radius-full);
padding: var(--space-3) var(--space-8);

/* Secondary (outlined) */
border: 2px solid var(--color-primary);
color: var(--color-primary);
background: transparent;
```

### Cards
- Background: white
- Border-radius: `var(--radius-lg)` or `var(--radius-xl)`
- Shadow: `var(--shadow-card)`
- Image overlay uses `var(--gradient-card)` for text legibility
- Hover: `transform: translateY(-4px)` + `var(--shadow-lg)`, `var(--transition-base)`

### Hero Sections
- Background: `var(--gradient-hero)` with optional parallax image overlay at 30% opacity
- Text: always white
- Min-height: `100vh` (home hero), `50vh` (sub-page heroes)

### Dark Sections (footer, CTA blocks)
- Background: `var(--color-darkest)`
- Text: `var(--text-on-dark)` (white) and `var(--text-on-dark-muted)` (lightest pink)

### Badges / Tags
- Background: `rgba(102,103,171,0.15)`
- Color: `var(--color-secondary)`
- Border-radius: `var(--radius-full)`
- Font-size: `var(--text-xs)`, font-weight: 600, uppercase

## Animations
- Prefer CSS transitions over JS for hover/focus states
- Use `IntersectionObserver` for scroll-triggered entrance animations
- Entrance: `opacity: 0; transform: translateY(20px)` → `opacity: 1; transform: none`
- Duration: `var(--transition-slow)` (400ms) for scroll animations
- Star canvas on home hero: subtle floating dots, no strobing
- Always respect `prefers-reduced-motion` (defined in `variables.css`)

## Logo Usage
- Logo file: `assets/images/logo.jpg` — constellation "P" on dark space background
- In navbar: `height: 44px`, displayed next to text "POLARIS" in `--font-display`
- On light backgrounds: add subtle glow `var(--shadow-glow)`
- Don't stretch or alter the logo proportions

## Accessibility
- Minimum contrast ratio: 4.5:1 for body text, 3:1 for large text
- Focus rings: `outline: 2px solid var(--color-secondary); outline-offset: 3px`
- Never use color alone to convey meaning — pair with icons/text
- All icon-only buttons need `aria-label`
