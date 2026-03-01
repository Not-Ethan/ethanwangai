# Hero Scroll Animations Enhancement — Design Document

## Overview

Enhance the ForestScene hero background with three new scroll-driven + ambient animation layers: a setting sun, drifting leaves, and fireflies. All implemented as additional SVG layers within the existing ForestScene.tsx component.

## Sun/Moon Setting

- Positioned behind the mountain layer (z-order between sky gradient and mountains)
- `<circle>` with radial gradient fill — warm golden center (#f5c542) fading to transparent
- Starts at horizon line, `translateY` driven by scroll: sinks behind mountains as you scroll down, fades out
- Soft glow halo (#f5c54230) for atmosphere
- Fades in on page load over ~1s

## Leaves Drifting In

- 6-8 leaf SVG shapes, small (20-30px), scattered at different vertical positions
- Half enter from left, half from right
- `translateX` driven by scroll: off-screen at scroll 0, drift to resting positions (within outer 20% of viewport) by scroll 0.5-0.8
- Gentle `rotate` (+-15-30deg) tied to scroll for tumbling effect
- Staggered scroll ranges so they enter one by one
- Muted forest greens (#2d5a27, #3a7a32, #1e4d1a) at 60-80% opacity

## Fireflies

- 12-15 tiny circles (2-4px), warm yellow-green (#d4e860, #b8d44f)
- Ambient CSS keyframe animation: small elliptical drift (20-40px range), randomized duration (3-7s), opacity pulse (0.2 to 0.8)
- Positioned scattered across mid-to-lower region (between tree lines)
- Slight scroll-linked translateY parallax, but ambient drift continues regardless
- Pure CSS @keyframes with animation-delay offsets, no JS animation loop

## File Changes

| File | Action |
|------|--------|
| `src/components/ForestScene.tsx` | Edit — add sun, leaves, fireflies layers |
| `src/app/globals.css` | Edit — add firefly drift + glow keyframes |
