# Global Nurse Portal — Design System

## 1. Atmosphere & Identity

A trusted, professional gateway for Pakistani nurses pursuing international careers. Clean and clinical without feeling cold — the interface communicates competence, stability, and care through a restrained blue-accented palette, generous whitespace, and subtle surface depth. The signature is **calm authority**: bold action buttons on clean white surfaces, with tonal blue accents that guide attention without noise.

## 2. Color

### Palette

| Role | Token | Light | Usage |
|------|-------|-------|-------|
| Surface/primary | `--surface-primary` | `#FFFFFF` | Main backgrounds, cards |
| Surface/secondary | `--surface-secondary` | `#F9FAFB` | Alternate sections (benefits, survey bg) |
| Surface/elevated | `--surface-elevated` | `#FFFFFF` | Modals, popovers |
| Surface/dark | `--surface-dark` | `#111827` | Footer background |
| Text/primary | `--text-primary` | `#111827` | Headlines, bold body |
| Text/secondary | `--text-secondary` | `#6B7280` | Body text, nav links |
| Text/tertiary | `--text-tertiary` | `#9CA3AF` | Captions, hints, muted |
| Text/inverse | `--text-inverse` | `#FFFFFF` | On dark surfaces |
| Text/label | `--text-label` | `#374151` | Form labels |
| Border/default | `--border-default` | `#E5E7EB` | Input borders, dividers |
| Border/subtle | `--border-subtle` | `#F3F4F6` | Card borders, soft separation |
| Border/dark | `--border-dark` | `#1F2937` | Footer dividers |
| Accent/primary | `--accent-primary` | `#2563EB` | CTAs, links, focus rings |
| Accent/hover | `--accent-hover` | `#1D4ED8` | Button/link hover |
| Accent/light | `--accent-light` | `#EFF6FF` | Badge bg, active tab bg |
| Accent/translucent | `--accent-translucent` | `rgba(255,255,255,0.1)` | Translucent button on accent |
| Status/success | `--status-success` | `#16A34A` | Upload confirmed, success states |
| Status/success-bg | `--status-success-bg` | `#F0FDF4` | Success bg |
| Status/error | `--status-error` | `#DC2626` | Error text |
| Status/error-bg | `--status-error-bg` | `#FEF2F2` | Error banner bg |
| Status/warning | `--status-warning` | `#D97706` | Amber pulse dot |
| Icon/blue | `--icon-blue` | `#3B82F6` | Benefit card icons |
| Icon/green | `--icon-green` | `#16A34A` | File type icon |
| Icon/orange | `--icon-orange` | `#EA580C` | Benefit card icon |
| Icon/purple | `--icon-purple` | `#7C3AED` | Benefit card icon |

### Rules
- Blue (`#2563EB`) is used **only** for interactive elements and brand identity — never decorative.
- Surface hierarchy uses tonal shifts (`bg-white` → `bg-gray-50`) rather than shadows for section separation.
- Status colors carry semantic meaning only: green for confirmed actions, red for errors/warnings.
- Benefit cards use distinct icon colors (blue, green, purple, orange) for visual differentiation.
- Never introduce a color not in this table. Extend the table first.

## 3. Typography

### Font Stack
- **Primary**: `"Inter", ui-sans-serif, system-ui, sans-serif`
- **Mono**: `"JetBrains Mono", ui-monospace, SFMono-Regular, monospace`

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| Display | 36px / 2.25rem | 800 | 1.1 | -0.02em | Hero heading |
| H1 | 30px / 1.875rem | 800 | 1.2 | -0.015em | Section headers (Benefits) |
| H2 | 24px / 1.5rem | 700 | 1.2 | -0.01em | Card titles (Start Profile) |
| H3 | 20px / 1.25rem | 700 | 1.3 | -0.01em | Benefit card titles |
| Body/lg | 18px / 1.125rem | 400 | 1.6 | 0 | Lead paragraphs |
| Body | 16px / 1rem | 400 | 1.6 | 0 | Default body text |
| Body/sm | 14px / 0.875rem | 400/500/600 | 1.5 | 0 | Nav links, form inputs, secondary info |
| Caption | 12px / 0.75rem | 500/600/700 | 1.4 | 0 | Labels, badges, metadata |
| Overline | 11px / 0.6875rem | 600 | 1.3 | 0.08em | Section labels, uppercase |
| Tiny | 10px / 0.625rem | 600/700 | 1.3 | 0.05em | Status tags, progress text |

### Rules
- Font families: 2 (Inter + JetBrains Mono). Mono only for data values (PNC numbers, section counters).
- Body text never below 14px (12px only for labels/badges).
- All text uses Tailwind `font-sans` class (maps to Inter). Mono uses `font-mono`.

## 4. Spacing & Layout

### Base Unit
All spacing derives from Tailwind scale (base **4px**).

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight gaps, icon spacing |
| `--space-2` | 8px | Compact gaps, padding-x on mobile |
| `--space-3` | 12px | Section spacing, text gaps |
| `--space-4` | 16px | Card padding, default gap |
| `--space-5` | 20px | Input padding-y |
| `--space-6` | 24px | Button padding-x, comfortable gaps |
| `--space-8` | 32px | Between card groups |
| `--space-10` | 40px | Sections within a page |
| `--space-12` | 48px | Major section breaks |
| `--space-16` | 64px | Page-level vertical rhythm (py-16) |
| `--space-20` | 80px | Hero spacing (py-20) |

### Grid
- Max content width: **1280px** (`max-w-7xl`)
- Column system: 12-column, `gap-12` (48px) between columns at lg, 24px gap at default
- Breakpoints: sm 640px, md 768px, lg 1024px, xl 1280px
- Gutter: `px-4` (16px) mobile → `sm:px-6` (24px) → `lg:px-8` (32px)

### Rules
- No magic numbers. Every spacing value uses Tailwind's built-in scale.
- Section vertical rhythm: `py-16` or `py-20` for major sections.

## 5. Components

### Button (Primary)
- **Structure**: `<button>`
- **Variants**: Primary (blue bg), Ghost (border/transparent), Auth (outlined with icon)
- **Tokens**: `bg-blue-600 text-white rounded-xl py-2.5 px-5 font-sans font-bold`
- **States**:
  - Default: `bg-blue-600 shadow-md`
  - Hover: `bg-blue-700 shadow-lg`
  - Active: `scale-[0.98]` (via `active:scale-98` utility)
  - Disabled: `bg-gray-200 text-gray-400 cursor-not-allowed`
  - Loading: adds spinner icon, text "Processing your documents..."

### Button (Ghost/Outlined)
- **Structure**: `<button>`
- **Variants**: White bg with border, translucent on dark
- **Tokens**: `border border-gray-200 text-gray-600 bg-white rounded-xl`
- **States**:
  - Default: `border-gray-200 bg-white`
  - Hover: `bg-gray-50`
- **Usage**: "Upload Different Files", "Back to Upload"

### File Dropzone
- **Structure**: `<div>` with hidden `<input type="file">`
- **Tokens**: `border-2 border-dashed rounded-2xl p-6 min-h-[140px]`
- **States**:
  - Empty: `border-gray-200 bg-white hover:border-blue-400 hover:bg-gray-50/50`
  - Drag active: `border-blue-500 bg-blue-50/50`
  - File loaded: `border-green-400 bg-green-50/10`
  - File name + success text shown after selection
- **Accessibility**: click triggers hidden file input, keyboard accessible via label
- **Icons**: Upload icon (empty), file-type icon (loaded: `FileText`/`File`/`ImageIcon`)

### Navbar
- **Structure**: Sticky top bar with logo, nav links, auth, CTA button
- **Tokens**: `bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm`
- **States**:
  - Desktop: horizontal links, auth area, "Apply Now" button
  - Mobile (below md): hamburger menu → full-width vertical drawer
  - Scrolled: sticky, translucent bg with blur
- **Auth states**: Signed out (Sign In with Google button), Signed in (avatar + name + Sign Out)

### Benefit Card
- **Structure**: `<div>` with icon, title, description
- **Tokens**: `bg-white p-8 rounded-2xl border border-gray-100 shadow-sm`
- **States**:
  - Default: `shadow-sm border-gray-100`
  - Hover: `shadow-md border-gray-200` — icon scales to 110%
  - Entry: scroll-triggered fade-up via `motion/react` (`whileInView`)
- **Icon colors**: `text-blue-600 bg-blue-50`, `text-green-600 bg-green-50`, `text-purple-600 bg-purple-50`, `text-orange-600 bg-orange-50`

### Footer
- **Structure**: Dark section with brand, 3 office columns, copyright bar
- **Tokens**: `bg-gray-900 text-gray-300 border-t border-gray-800 py-16`
- **Sections**: Brand col, London Office, Dubai Office, Singapore Office

### Survey Sidebar Tab
- **Structure**: Vertical button list in white sidebar
- **Tokens**: `rounded-xl font-sans text-sm font-medium`
- **States**:
  - Inactive: `text-gray-500 hover:bg-gray-50 hover:text-gray-900`
  - Active: `bg-blue-50 text-blue-700 font-bold`

### Form Input
- **Structure**: `<input>` / `<select>` / `<textarea>` with `<label>`
- **Tokens**: `border border-gray-200 rounded-xl py-3 px-4 text-sm`
- **States**:
  - Default: `border-gray-200 bg-white`
  - Focus: `border-blue-500 outline-none`
  - Disabled: `border-gray-100 bg-gray-50 text-gray-500`
  - Error: (via error banner component, not inline)

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 100-150ms | ease-out | Button hover, icon scale |
| Standard | 200-300ms | ease-in-out | Panel transitions, tab switch |
| Emphasis | 300-500ms | ease-out | Page entry animations (fade + translate) |
| Scroll-reveal | 500ms step | ease-out | Benefit cards, staggered per card |

### Rules
- Only animate `transform` and `opacity` — never layout properties.
- Entry animations: initial `opacity: 0, y: 15-20` → animate to visible.
- Scroll-triggered: `motion/react` `whileInView` with `viewport: { once: true, margin: "-100px" }`.
- Stagger delays: `delay: index * 0.1` for card grids.
- Hover transitions: `transition-all duration-300` on cards, `transition-colors` on text/buttons.
- Active press: `scale(0.98)` via CSS class `active:scale-98`.
- Mobile nav: `AnimatePresence` with height animation (collapsible drawer).
- **No decorative motion** — every animation maps to a state change or affordance.

## 7. Depth & Surface

### Strategy: **Mixed** (tonal-shift + shadows + borders)

| Treatment | Value | Usage |
|-----------|-------|-------|
| **Tonal shift** | `bg-white` → `bg-gray-50` → `bg-gray-900` | Section separation (Hero → Benefits → Footer) |
| **Border (subtle)** | `1px solid var(--border-subtle)` `#F3F4F6` | Card outlines, section dividers |
| **Border (default)** | `1px solid var(--border-default)` `#E5E7EB` | Input fields, nav bottom |
| **Shadow (sm)** | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | Cards at rest, navbar |
| **Shadow (md)** | `0 4px 6px -1px rgb(0 0 0 / 0.1)` | Cards on hover, survey panel |
| **Shadow (xl)** | `0 20px 25px -5px rgb(0 0 0 / 0.1)` | Upload panel (hero) |
| **Blur (backdrop)** | `backdrop-blur-md` | Navbar translucency |
| **Dark surface** | `bg-gray-900` | Footer — full inversion |

### Rules
- Cards sit on white bg with a subtle border — no heavy shadows at rest.
- Elevation is communicated through tonal section backgrounds, not stacked shadows.
- Interactive cards (benefits) lift on hover via `shadow-md` + `border-gray-200`.
- The hero upload panel is slightly elevated (`shadow-xl`) to distinguish it from the surrounding white page.
- Footer is a hard dark inversion — no shadow needed, color does the separation.

## 8. Accessibility (Supplemental)

- Form labels use `font-bold text-xs` for clarity.
- Focus states: `focus:border-blue-500 focus:outline-none` on all inputs.
- Color is never the sole indicator of state — text labels supplement status colors.
- Motion respects entry animations only — no auto-play, no infinite loops.
- Touch targets are minimum 44px height throughout.
