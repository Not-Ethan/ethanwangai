# Zoom-Based Forest Navigation — Design Document

## Overview

Transform the portfolio site from vertical scrolling to a fully zoom-based navigation experience. Scrolling zooms through a continuous forest scene that shifts through five times of day (Dawn, Noon, Dusk, Sunset, Night), one per section. Mandatory snap between sections. No vertical scrolling — scroll input = zoom in/out.

## Architecture

- **Fixed forest background** (`ForestScene`): One continuous `position: fixed` component covering the viewport. Renders all layers (sky, sun/moon, mountains, trees, fireflies, ground fog). Appearance driven by a `progress` value (0.0–1.0 mapping to pages 0–4).
- **Zoom controller** (`ZoomNavigator`): Intercepts wheel/touch/keyboard events. Manages `currentPage` state (0–4). Triggers Framer Motion `animate` transitions (900ms) between pages. Locks input during transitions.
- **Content overlays**: Each section's content is `position: fixed`, full-viewport, layered above the forest. Only the active page's content is visible. Fades in after zoom settle phase.
- **Dot navigation** (`DotNav`): 5 dots on the right edge, vertically centered. Active dot enlarged + accent-colored. Click to jump. Hover shows section name.

## Page Mapping

| Page | Section | Time of Day |
|------|---------|-------------|
| 0 | Hero | Dawn |
| 1 | About | Noon |
| 2 | Experience | Dusk |
| 3 | Projects | Sunset |
| 4 | Contact | Night |

## Scroll/Input Control

- **Mouse wheel**: Single tick = next/prev page
- **Touch**: Swipe up/down with ~50px threshold
- **Keyboard**: ArrowDown/ArrowUp, PageDown/PageUp, Space/Shift+Space
- **Navbar links**: Jump directly to any page (animated)
- **Dot nav**: Click to jump
- **Lock during transition**: All input ignored while animation plays (900ms)
- **Direct jumps** (more than 1 page): Faster 600ms transition, skip intermediate settle phases

## Time-of-Day Theming

### Sky Gradients

| Time | Top | Mid | Bottom |
|------|-----|-----|--------|
| Dawn (0) | `#1a0a2e` deep indigo | `#3d1f5c` purple | `#e8734a` warm orange |
| Noon (1) | `#1a6b4a` rich green | `#2d8a5e` bright green | `#4ade80` accent green |
| Dusk (2) | `#2e1a3d` dusky purple | `#8b4a6b` mauve | `#d4764a` burnt orange |
| Sunset (3) | `#1a0a1e` dark purple | `#6b2a3d` deep rose | `#e85a3a` fiery red-orange |
| Night (4) | `#050a0f` near-black | `#0a1a12` dark forest | `#0b1a0f` base bg |

Colors interpolated smoothly between pages during transitions.

### Sun/Moon

- **Dawn**: Sun low on horizon, golden `#f5c542`, large warm glow
- **Noon**: Sun high (near top), bright white-yellow `#f5e870`, small tight glow
- **Dusk**: Sun mid-low, orange `#e8734a`, diffused warm glow
- **Sunset**: Sun at horizon, deep red `#d44a2e`, dramatic red glow
- **Night**: No sun — pale moon `#c8d8e8` high in sky, faint cool glow

### Trees

- 3 layers kept (mountains, mid-ground, foreground)
- **Brown trunks added**: Rectangular `<rect>` below each triangular canopy, `#5a3a1e` to `#8b6f47`
- Canopy colors shift with time: bright greens at noon, muted at dawn, warm-tinted at dusk/sunset, near-black silhouettes at night

### Fireflies

- Increased from 12 to 20
- More visible at dusk/night (opacity scales up), fewer at dawn/noon
- At night: a few extra-bright ones with larger glow radius

### Underbrush Leaves

- Existing 12 frame leaves visible only at page 0 (Dawn/Hero)
- Zoom-clear during first transition, don't return

## Zoom Transition Mechanics

When transitioning from page N to N+1 (900ms):

1. **Zoom in phase (0–60%)**: Forest layers scale up — foreground fastest (1→2.5), mid-ground medium (1→1.6), mountains slowest (1→1.15). Foreground layers fade as they "pass the camera." Current content fades out.
2. **Color shift (20–80%)**: Sky gradient, tree colors, sun position interpolate to next time-of-day.
3. **Settle phase (60–100%)**: Layers scale back to 1.0 at new color state. New content fades in.

Reverse (scrolling up): zoom out — layers shrink briefly, colors shift backward.

| From → To | Zoom intensity | Unique touch |
|-----------|---------------|--------------|
| Dawn → Noon | Strong (leaves clear) | Sun rises dramatically |
| Noon → Dusk | Medium | Sky warms, shadows lengthen |
| Dusk → Sunset | Medium | Sun drops fast, glow intensifies |
| Sunset → Night | Gentle | Sun sinks, moon fades in, fireflies brighten |

## Section Content

All content overlays are `position: fixed` with `z-index` above the forest.

- **Dawn/Hero**: Name + tagline. Minimal overlay so forest is most visible. Replace "scroll" indicator with zoom hint.
- **Noon/About**: Semi-transparent card (`bg-bg-card/80 backdrop-blur-sm`). Carousel unchanged.
- **Dusk/Experience**: Timeline on blurred card. Warm dusk complements trunk/gold colors.
- **Sunset/Projects**: Project cards with `bg-bg-card/85`. Warm sunset bleeds through edges.
- **Night/Contact**: Minimal card. Dark forest = natural dark background. Fireflies visible around edges.

## Navigation UI

- **Dot nav**: Right edge, 5 dots vertically centered. Active = larger + accent. Hover = section name tooltip.
- **Navbar**: Existing navbar, but links trigger page jumps (not scroll). Active section highlighted.
- **Section dividers**: Removed entirely — zoom transition IS the divider.

## File Changes

| File | Action |
|------|--------|
| `src/components/ForestScene.tsx` | Major rewrite — progress-driven time-of-day, tree trunks, 20 fireflies |
| `src/components/ZoomNavigator.tsx` | Create — scroll/touch/keyboard controller, page state, transitions |
| `src/components/DotNav.tsx` | Create — right-edge dot navigation |
| `src/components/Hero.tsx` | Edit — fixed overlay mode |
| `src/components/About.tsx` | Edit — blurred card backdrop |
| `src/components/Experience.tsx` | Edit — blurred card backdrop |
| `src/components/Projects.tsx` | Edit — blurred card backdrop |
| `src/components/Contact.tsx` | Edit — blurred card backdrop |
| `src/components/Navbar.tsx` | Edit — page jump instead of scroll |
| `src/app/page.tsx` | Major rewrite — ZoomNavigator wraps everything, remove dividers |
| `src/app/globals.css` | Minor edits if needed |
