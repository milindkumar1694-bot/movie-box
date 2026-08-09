---
name: Cinematic Minimalist
colors:
  surface: '#16130b'
  surface-dim: '#16130b'
  surface-bright: '#3d392f'
  surface-container-lowest: '#110e07'
  surface-container-low: '#1f1b13'
  surface-container: '#231f17'
  surface-container-high: '#2d2a21'
  surface-container-highest: '#38342b'
  on-surface: '#eae1d4'
  on-surface-variant: '#d0c5af'
  inverse-surface: '#eae1d4'
  inverse-on-surface: '#343027'
  outline: '#99907c'
  outline-variant: '#4d4635'
  surface-tint: '#e9c349'
  primary: '#f2ca50'
  on-primary: '#3c2f00'
  primary-container: '#d4af37'
  on-primary-container: '#554300'
  inverse-primary: '#735c00'
  secondary: '#c6c7c3'
  on-secondary: '#2f312e'
  secondary-container: '#484947'
  on-secondary-container: '#b8b9b5'
  tertiary: '#bfcdff'
  on-tertiary: '#082b72'
  tertiary-container: '#97b0ff'
  on-tertiary-container: '#254188'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe088'
  primary-fixed-dim: '#e9c349'
  on-primary-fixed: '#241a00'
  on-primary-fixed-variant: '#574500'
  secondary-fixed: '#e2e3df'
  secondary-fixed-dim: '#c6c7c3'
  on-secondary-fixed: '#1a1c1a'
  on-secondary-fixed-variant: '#454745'
  tertiary-fixed: '#dbe1ff'
  tertiary-fixed-dim: '#b4c5ff'
  on-tertiary-fixed: '#00174b'
  on-tertiary-fixed-variant: '#27438a'
  background: '#16130b'
  on-background: '#eae1d4'
  surface-variant: '#38342b'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-md:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  headline-sm-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  metadata:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.04em
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  xxl: 64px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style
The design system is a premium, cinematic interface designed for high-end content curation and boutique digital experiences. It prioritizes the "Frame" — ensuring the UI recedes to let imagery and media take center stage. 

The style is **Minimalist-Cinematic**, characterized by deep charcoal surfaces, expansive whitespace, and meticulous typographic hierarchy. It avoids the clutter of traditional social platforms, opting instead for a curated, editorial feel that evokes the atmosphere of a private screening room or a high-end gallery.

## Colors
This design system utilizes a high-contrast dark mode palette to create depth and focus. 

- **Primary (Accent):** A subtle gold (#D4AF37) used sparingly for interactive highlights, progress indicators, and premium statuses.
- **Background:** A deep near-black (#0D0E10) serves as the canvas, providing a true cinematic void.
- **Surface:** A slightly lighter charcoal (#17181C) defines containers and interactive card elements.
- **Text:** Primary text uses a warm off-white (#F5F5F1) to reduce eye strain while maintaining legibility, while secondary metadata uses a muted gray (#8E8E93).

## Typography
The typography is systematic and utilitarian, using **Inter** to maintain a modern, neutral tone. 

Headlines utilize tighter letter-spacing and heavier weights to command attention, while body text is spaced generously for long-form readability. For specialized UI elements like categories or "now playing" indicators, use the `label-caps` style to provide clear distinction without adding visual weight.

## Layout & Spacing
The layout follows a **Fluid Grid** model with significant breathing room. 

- **Desktop:** 12-column grid with 24px gutters and 64px side margins. 
- **Tablet:** 8-column grid with 24px gutters and 40px side margins.
- **Mobile:** 4-column grid with 16px gutters and 20px side margins.

Horizontal "shelves" or carousels should allow content to bleed off the edge of the screen to indicate overflow. Vertical spacing should be aggressive—use `xxl` (64px) between major sections to reinforce the premium, unhurried brand narrative.

## Elevation & Depth
Depth is conveyed through **Tonal Layering** rather than traditional shadows. 

1. **Floor:** The background (#0D0E10) is the lowest level.
2. **Surface:** Cards and navigation bars use the surface color (#17181C).
3. **Hover State:** Interactive elements should subtly brighten or use a very soft, diffused glow (10% opacity primary color) to indicate lift.

Avoid heavy drop shadows. If depth is required for overlays or modals, use a subtle 1px stroke in a slightly lighter grey or a background blur (backdrop-filter) of 20px to create a "glass" effect on top of the surface layer.

## Shapes
This design system uses a **Rounded** shape language to soften the high-contrast aesthetic. 

- **Cards & Primary Containers:** 1.5rem (24px) corner radius.
- **Buttons & Small Elements:** 0.75rem (12px) corner radius.
- **Media Thumbnails:** Should always match the 24px radius of their parent containers to maintain nested harmony.

## Components

### Buttons
- **Primary:** Warm Off-White (#F5F5F1) background with near-black text. 12px roundedness. Bold, uppercase label.
- **Secondary:** Transparent background with a 1px border of #8E8E93.
- **Ghost:** No background or border; uses the primary accent color (#D4AF37) for text.

### Cards
Cards are the core of the cinematic experience. Use a 24px corner radius. Content should feature a subtle bottom-to-top gradient overlay (black at 60% to transparent) to ensure metadata remains legible over varying image backgrounds.

### Inputs
Search and input fields should be minimalist: a 1px bottom border only, or a fully enclosed surface-colored container with 12px roundedness. Use the `metadata` type style for placeholder text.

### Chips / Tags
Small, pill-shaped elements (32px radius) using a low-opacity version of the surface color. Labels should use the `label-caps` typography style.

### Navigation
The navigation should be either a sidebar (Desktop) or a floating bottom bar (Mobile). Use high-quality, thin-stroke icons. Active states are indicated by the Primary Accent color (#D4AF37) or a small 4px dot below the icon.