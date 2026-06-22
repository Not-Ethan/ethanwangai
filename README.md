# Ethan Wang — Into the Woods

An interactive, scroll-driven portfolio built as a cinematic walk through a 3D
forest. As you scroll, the camera travels down a forest path while the light
shifts from first dawn light to a firefly-lit night — each chapter of the
résumé mapped onto a stage of that single day.

## Highlights

- **Persistent WebGL forest** (React Three Fiber + Three.js) living behind all
  content: an endless, recycling field of low-poly conifers, drifting pollen
  motes, fireflies, volumetric fog, a glowing sun/moon orb, and refined bloom.
- **Scroll-as-story**: a shared `scrollState` drives a continuously blended
  "mood" (fog, sky, light, time of day) so the descent reads as one journey.
- **Smooth inertial scrolling** via Lenis, synced with Framer Motion reveals.
- **Forest-glass UI**: frosted, translucent surfaces that let the scene glow
  through, with an editorial Fraunces display serif.

## Tech

Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · React Three Fiber /
drei · @react-three/postprocessing · Framer Motion · Lenis

## Develop

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm run lint
```

## Structure

- `src/components/forest/` — the WebGL scene (canvas, trees, particles, mood).
- `src/components/` — DOM sections (Hero, About, Experience, …) and chrome.
- `src/lib/scroll.ts` — the frame-loop scroll store shared with the 3D scene.
- `src/lib/data.ts` — all content, plus the chapter narration.
