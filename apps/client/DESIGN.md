---
name: Neo-Paper Brutalist
colors:
  surface: '#fcfaed'
  surface-dim: '#dcdacf'
  surface-bright: '#fcfaed'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f4e8'
  surface-container: '#f0eee2'
  surface-container-high: '#eae8dd'
  surface-container-highest: '#e5e3d7'
  on-surface: '#1b1c15'
  on-surface-variant: '#5c403c'
  inverse-surface: '#303129'
  inverse-on-surface: '#f3f1e5'
  outline: '#916f6b'
  outline-variant: '#e6bdb8'
  surface-tint: '#bf0616'
  primary: '#bb0114'
  on-primary: '#ffffff'
  primary-container: '#e02929'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb4ab'
  secondary: '#5e5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2e2e2'
  on-secondary-container: '#646464'
  tertiary: '#5a5c5c'
  on-tertiary: '#ffffff'
  tertiary-container: '#737575'
  on-tertiary-container: '#fcfcfc'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb4ab'
  on-primary-fixed: '#410002'
  on-primary-fixed-variant: '#93000d'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c6'
  on-secondary-fixed: '#1b1b1b'
  on-secondary-fixed-variant: '#474747'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#fcfaed'
  on-background: '#1b1c15'
  surface-variant: '#e5e3d7'
typography:
  headline-xl:
    fontFamily: Anton
    fontSize: 40px
    fontWeight: '400'
    lineHeight: 44px
    letterSpacing: 0.02em
  headline-lg:
    fontFamily: Anton
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 32px
    letterSpacing: 0.02em
  headline-lg-mobile:
    fontFamily: Anton
    fontSize: 24px
    fontWeight: '400'
    lineHeight: 28px
  title-md:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '800'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-bold:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '800'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
spacing:
  container-margin: 16px
  gutter: 12px
  border-width-heavy: 4px
  border-width-light: 2px
  shadow-offset: 4px
---

## Brand & Style

The design system is built on a **Neo-Paper Brutalist** aesthetic that prioritizes raw structural elements, high-contrast utility, and a tactile "physical media" feel. It is designed for a modern reading tracker, evoking the sensation of a digital zine, physical book ledger, or technical manual.

The brand personality is **bold, unapologetic, and functional**. It rejects the softness of generic modern SaaS trends in favor of hard edges, thick ink borders, and a warm cream "paper-first" background. The emotional response is one of clarity, tactile pleasure, and speed—making cataloging and tracking books feel like an active, physical task.

## Colors

The palette is restricted to high-contrast essentials to maintain the brutalist hierarchy:

- **Primary (Crimson Red - `#BB0114`):** Used for critical actions, active states, progress fills, and brand highlights.
- **Background (Warm Paper Cream - `#FCFAED`):** A warm, off-white paper tone that reduces eye strain compared to pure white and reinforces the analog physical theme.
- **Ink Black (`#111111` / `#1B1C15`):** Black is used for all structural outlines (borders, solid shadows, text).
- **Surface Accents (`#FFFFFF` & `#F0EEE2`):** White is used for interactive components and input backgrounds to create a crisp "punched-out" effect.

## Typography

Typography is the core tool for establishing hierarchy in this design system.

- **Headlines:** Use **Anton**. It is a condensed, heavy-weight sans-serif that provides maximum visual impact. All top-level headers, numbers, and category titles are set in uppercase.
- **Body & Metadata:** Use **Hanken Grotesk**. It provides a sharp, contemporary contrast to the headline font. Variable weights allow clear distinction between book titles (`800`), authors (`600`), and notes (`400`).
- **Labels:** Use uppercase **Hanken Grotesk** at heavy weights for status tags, badges, and buttons.

## Elevation & Depth

Depth is conveyed through **Hard Zero-Blur Shadows** rather than diffuse blurs or translucent overlays.

- **The Brutalist Drop Shadow:** Interactive elements (cards, buttons, input fields) feature a solid ink offset shadow (`3.5px` to `4px` down and right, `0px` blur radius).
- **Tonal Stacking:** The background is always the base paper layer. Interactive surfaces are filled with White, Primary Red, or Cream, defined by heavy ink outlines.
- **Physical Feel:** No glassmorphism or backdrop blur; every component is opaque, tactile, and physical.

## Component Specifications

### Quick Increment Steppers
- Horizontal chips (`+1`, `+5`, `+10`) with `1.5px` ink borders.
- Tactile feedback on tap for rapid reading updates.

### Book Cards
- Framed cover container on the left (`60x90px` with `1.5px` ink border).
- Multi-tier progress indicator (e.g. `Vol. 14 / 16 • Ch. 340` or `Ch. 1450 Ongoing`).
- Solid ink progress bar with Crimson Red fill.

### Status Badges
- Sharp rectangular chips (`BorderRadius.zero`) with `1.5px` black borders.
- Distinct status colorways for *Reading*, *Plan to Read*, *Completed*, *On Hold*, and *Dropped*.
