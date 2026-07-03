# 3D Forest Journey Redesign — Design

**Date:** 2026-07-03
**Goal:** Rebuild the site as a real-3D, scroll-driven forest journey — award-submission quality, mobile-aware, with smooth bidirectional animation and rewritten copy.

## Concept

One continuous walk through a forest, from dawn to midnight. Scroll position = distance traveled + time of day. The camera physically moves along a winding path through a low-poly 3D forest rendered in WebGL. Each portfolio section lives at a "station" along the journey:

| Station | Section | Scene moment |
|---|---|---|
| 0.00–0.15 | Hero | Forest edge at dawn — mist, sun cresting the ridge, light shafts |
| 0.20–0.38 | About | Sunlit clearing, late morning |
| 0.42–0.60 | Experience | Deeper woods at golden hour, warm rim light |
| 0.64–0.82 | Projects | Enchanted grove at twilight — fireflies, faint glow accents |
| 0.86–1.00 | Contact | Midnight clearing — stars, moon, shooting stars |

Scrolling back replays everything in reverse (bidirectional by construction: all animation is a pure function of scroll progress, never fire-once).

## Approach decision

Three options considered:

1. **Real WebGL 3D (chosen):** React Three Fiber canvas as a fixed background world; DOM content scrolls above it. Real depth, fog, lighting. This is the only option that reads as "3D website" rather than "site with parallax."
2. 2.5D parallax layers — cheaper but stays flat-looking; rejected.
3. Full WebGL including text — rejected: hurts accessibility/SEO, high effort for marginal gain over hybrid.

Chosen shape is the hybrid within option 1: **WebGL world + real DOM content**, the standard architecture of award-winning scroll-journey sites.

## Architecture

- **Stack additions:** `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `lenis`. Framer Motion stays for DOM animation.
- **Scroll:** Native document scroll (~700vh page) smoothed by Lenis. A single normalized progress value (0–1) lives in a MotionValue + ref; the R3F loop reads the ref each frame and damps it — no React re-renders per scroll tick.
- **Canvas:** `position: fixed; inset: 0; z-index: 0`, `aria-hidden`. DOM sections scroll above at `z-index: 10`.
- **Camera rig:** `CatmullRomCurve3` path through the forest + a parallel lookAt curve. Scroll progress → damped position along both curves. Subtle idle sway + pointer parallax on desktop.
- **Time-of-day system:** one scalar (same progress) drives sky gradient shader, fog color/density, sun/moon position, star opacity, and light colors via keyframed color stops (dawn → noon → gold → dusk → night).

### Scene contents (all procedural, no model files)

- Instanced low-poly pines (stacked cones + trunk, merged geometry) — ~350 desktop / ~120 mobile, deterministic placement (seeded) leaving a corridor for the camera path.
- Terrain: noise-displaced plane; a lighter dirt path strip along the camera route.
- Sky dome: custom gradient shader; drei `Stars`; sun + moon glow sprites.
- Atmosphere: `FogExp2` + a few translucent mist planes; instanced firefly points (twilight/night only); additive light-shaft cones (dawn only); scattered rocks and glowing mushrooms near the Projects grove.
- Postprocessing (desktop only): Bloom + Vignette.

### DOM layer

- Sections remain semantic HTML. Each animates with scroll-linked transforms (`useScroll` + `useTransform` against its own viewport window) — entrance and exit both tied to scroll, so reversing scroll reverses the animation.
- Keep Navbar; replace DotNav with a slim vertical **trail indicator** (path line + glowing marker showing journey progress; clickable stations).
- Existing components (About/Experience/Projects/Contact content) restyled to sit in the world: lighter panels, larger typography, staggered scroll reveals.
- Delete: `ZoomNavigator`, `ZoomContext`, `ForestScene` (SVG), `DotNav`.

## Mobile & performance

- Quality tiers detected once (viewport width + `devicePixelRatio` + `navigator.hardwareConcurrency`): mobile tier gets fewer instances, DPR clamped ≤ 1.75, no postprocessing, fewer mist planes.
- No shadow maps anywhere; instancing everywhere; single canvas.
- `prefers-reduced-motion`: camera fixed at a pleasant vantage, Lenis disabled, sections use simple opacity fades.
- Sections stack with normal document flow on mobile — no fixed heights trapping content; generous tap targets.

## Copy

All user-facing strings rewritten with the stop-slop skill. Known offenders: "Building systems that trade, scale, and think" (triadic slop, also in metadata), "Always interested in new opportunities, collaborations, and interesting problems." Resume-derived facts (metrics, dates, awards) stay verbatim.

## Error handling

- WebGL unavailable → static gradient background, content fully usable.
- Canvas wrapped so a render error never takes down the DOM content.

## Testing

- `npm run build` + lint clean.
- Playwright: desktop (1440×900) and mobile (390×844) screenshots at each station, scroll down and back up, check console for errors.
