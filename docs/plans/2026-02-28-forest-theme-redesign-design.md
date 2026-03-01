# Forest Theme Redesign — Design Document

## Overview

Full visual overhaul of the portfolio site from a blue-tech aesthetic to a serene, organic forest theme. Replace the three.js particle hero with scroll-driven SVG parallax forest layers. Recolor every component to a green/earth palette.

## Color Palette

| Token | Old | New | Hex |
|-------|-----|-----|-----|
| `--color-bg` | Near-black blue | Deep forest black-green | `#0b1a0f` |
| `--color-bg-card` | Dark navy | Dark moss | `#111f14` |
| `--color-bg-card-hover` | Lighter navy | Lighter moss | `#1a2e1d` |
| `--color-accent` | Blue | Emerald green | `#4ade80` |
| `--color-accent-glow` | Blue 50% | Emerald 38% | `#4ade8060` |
| `--color-gold` | Amber | Warm bark | `#d4a574` |
| `--color-muted` | Gray | Sage gray-green | `#6b7f6b` |
| `--color-light` | Cool off-white | Warm off-white | `#e2e8df` |
| `--color-trunk` | (new) | Warm brown | `#8b6f47` |

## Hero: SVG Parallax Forest

Replace `ParticleNetwork` (three.js) with `ForestScene` — pure SVG layers with Framer Motion scroll transforms.

**5 layers (back to front):**
1. Sky gradient — static CSS, deep forest black to dark emerald at horizon
2. Distant mountains — SVG path silhouettes, very dark green, 0.1x parallax
3. Mid-ground tree line — pine/evergreen silhouettes, medium green, 0.3x parallax
4. Foreground trees — larger detailed silhouettes flanking edges, 0.5x parallax
5. Ground fog — soft gradient blending into page background

**Scroll**: `useScroll` + `useTransform` from Framer Motion. Each layer gets `translateY` mapped from scroll progress.

**Load animation**: Trees scale from `scaleY(0)` to `scaleY(1)` with `transform-origin: bottom`, staggered ~1.5s.

**Removes**: `ParticleNetwork.tsx`, `three`, `@react-three/fiber`, `@react-three/drei`, `@types/three`.

## Section Dividers

Replace gradient `<hr>` with SVG vine/branch motif — thin horizontal line with small leaf shapes at intervals. Low-opacity accent color.

## Experience Timeline

- Vertical line: `--color-trunk` (brown) instead of blue
- Nodes: green-filled circles with brown border
- Hover: node "blooms" — fills green

## Other Sections (color swaps only)

- **Project cards**: green hover glow, bark-brown featured badge
- **Skills**: green-tinted hover borders and glow
- **Contact**: emerald CTA border, green social icon hovers
- **Navbar**: green hover colors, frosted glass unchanged
- **ProjectMetricsCarousel**: update accent map — `accent` uses new green, `gold` uses new bark

## File Changes

| File | Action |
|------|--------|
| `globals.css` | Edit — new palette, green keyframes |
| `ForestScene.tsx` | Create — SVG parallax hero |
| `Hero.tsx` | Edit — swap ParticleNetwork for ForestScene |
| `ParticleNetwork.tsx` | Delete |
| `page.tsx` | Edit — SVG vine section divider |
| `Experience.tsx` | Edit — brown trunk, green nodes |
| `Projects.tsx` | Edit — green hover glows |
| `Skills.tsx` | Edit — green hover effects |
| `Contact.tsx` | Edit — green accents |
| `Navbar.tsx` | Edit — green hovers |
| `ProjectMetricsCarousel.tsx` | Edit — update accent color map |
| `package.json` | Edit — remove three.js deps |
