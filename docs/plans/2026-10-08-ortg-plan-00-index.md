# Only Running Things Glow — Implementation Plan (index)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the paused paper/pencil site with the approved concept: one fixed blue-hour valley where the only light is something Ethan built, scroll moving time instead of place, an ignition chain in the hero, a ridge of trades, a mill that goes dark, and a visitor sentence that builds a house.

**Architecture:** A pure-TypeScript `src/valley/` package defines every position, number, clock and state transition and runs in Node (tests) and the browser. One React Three Fiber canvas renders the valley with about sixteen draws; one `useFrame` calls a pure `applyFrame` that turns the scroll ref and wall time into uniforms and instance attributes. The DOM above it is server-rendered copy in Ethan's voice; Lenis writes scroll into a ref; React never re-renders on scroll. Static export, no server, no fetches.

**Tech Stack:** Next.js 16 (App Router, `output: 'export'`), React 19, three r185, @react-three/fiber 9, @react-three/drei 10, lenis 1.3, framer-motion 12 (`animate` only), Tailwind 4, vitest, Archivo + JetBrains Mono via `next/font/local`.

**Spec:** `docs/plans/2026-10-08-only-running-things-glow-design.md` (read it first; every task argues from it).

## Global Constraints

- No real-world hooks: no `app/api`, no `fetch(` anywhere in `src/`, no environment variables, no third-party scripts, no analytics. Browser storage only `sessionStorage.introPlayed` and `localStorage.visitorSentence`, every access in try/catch.
- Public numbers only, verbatim from spec §2 and §3.1: Kalshi `about 30,000 trades`, `top 100 all-time, crypto`, `since january 2026`. Never a dollar profit, never `#75`, never `notional`, never `contracts`. Darch `3,000 videos a month`, `20 million views a month`, past tense, `ended in may 2026`. Heron `four cities`, no city names. WVU `about $100m of claims a year`. Every figure labelled `as of oct 2026`.
- Every user-facing string lives in `src/site/copy.ts`; every number in `src/valley/facts.ts`. Copy is lowercase, full sentences, no italics, no title case, no em dashes, exactly the strings in spec §3.1 and §3.2.
- One dark palette in `src/valley/palette.ts`; the only colour literals in `.ts`/`.tsx` are in that file; `globals.css` mirrors it.
- Emitter ids are exactly `hut, nist, wvu, kalshiLamp, bar1, bar2, bar3, bar4, mill, ridge, hill1, hill2, hill3, hill4, hill5, visitor` (spec §4.8). Nothing outside `Windows.tsx`, `Glow.tsx`, `Ridge.tsx` and their shaders uses `emissive` or `AdditiveBlending`.
- No GSAP, no @react-three/postprocessing, no FBO/GPGPU, no React state on the scroll path, no per-frame `getBoundingClientRect`, no R3F pointer events (window listeners + cached projections only), no `backdrop-filter`/`box-shadow` over the canvas, no allocation inside `applyFrame`.
- `src/valley/**` imports nothing from React, three's renderer, or the DOM (three's math classes allowed).
- Names in `src/valley/types.ts` and the interface contracts below are law. Later tasks copy them, never rename.
- Commit after every task on branch `redesign/only-running-things-glow`; never commit to `main`. Stage only your own files by path.
- Node 25, npm 11. Run `npm run lint`, `npx tsc --noEmit`, `npx vitest run` before every commit that touches `src/`.

## Review Focus

Inputs the spec implies but no gate screenshot exercises, most likely to bite first. Each has a test pinned in the owning task.

1. **A visitor sentence that is empty, whitespace, 140+ characters, or one 60-character word:** the grammar must clamp to 1–24 words, never produce zero parts, never throw; the tag must print the real count. Pinned in Stage 1 (house.ts tests) and Stage 4 (Yours input).
2. **Viewport resize or rotation mid-visit:** the camera recomposes by aspect, section ranges remeasure, every emitter stays in frame, labels re-project. Pinned in Stage 1 (projection test at both aspects) and Stage 2 (CameraRig aspect effect).
3. **Scrolling into section 02 while the ignition chain is still running:** `ridgeReveal` must be the max of the trickle and the timeline and never go backward. Pinned in Stage 3 (driverCore latch test).
4. **`sessionStorage` or `localStorage` throwing (private mode, blocked):** the chain plays, the house does not persist, no console errors. Pinned in Stage 3 (intro gate) and Stage 4 (storage helpers).
5. **WebGL context loss or `compileAsync` hanging:** the 4 s timeout proceeds, the error boundary shows the still and the complete DOM, nothing blanks. Pinned in Stage 2 (Scene boundary) and Stage 5 (no-GL tier).

## Interface contracts (copy exactly; defined in Stage 1, consumed everywhere)

```ts
// src/valley/types.ts
export type Tier = 'desktop' | 'phone';
export type SectionId = 'open' | 'kalshi' | 'heron' | 'darch' | 'summers' | 'alive' | 'yours' | 'contact';
export type EmitterId = 'hut' | 'nist' | 'wvu' | 'kalshiLamp' | 'bar1' | 'bar2' | 'bar3' | 'bar4' | 'mill' | 'ridge'
  | 'hill1' | 'hill2' | 'hill3' | 'hill4' | 'hill5' | 'visitor';
export type Vec3 = readonly [number, number, number];
export type LightState = 'dark' | 'igniting' | 'lit' | 'out';
export interface Emitter { id: EmitterId; position: Vec3; color: string; size: number; meaning: string }
export interface SectionRange { id: SectionId; start: number; end: number }          // g space, start < end
export interface View { yaw: number; pitch: number; fovScale: number }               // degrees, degrees, multiplier
export interface Timeline { tod: number; section: SectionId; s: number; view: View; ridgeReveal: number; hedgeReveal: number; darchT: number; rain: number; pulseArm: boolean }
export interface Environment { zenith: string; horizon: string; east: string; fogColor: string; fogNear: number; fogFar: number; sunDir: Vec3; sunColor: string; sunIntensity: number; hemiSky: string; hemiGround: string; starAlpha: number; moonPos: Vec3; moonAlpha: number }
export type IgnitionKind = 'flicker' | 'catch' | 'mill' | 'trickle';
export interface IgnitionStep { target: EmitterId | 'ridge'; at: number; dur: number; kind: IgnitionKind; stagger?: number }
export type RoofKind = 'pitched' | 'hipped' | 'flat';
export interface HousePart { kind: 'plank' | 'slat' | 'frame' | 'post' | 'chimney'; min: Vec3; max: Vec3; order: number }
export interface House { seed: number; words: number; tiers: number; bays: number; width: number; depth: number; roof: RoofKind; windowsPerFace: { front: number; back: number; side: number }; porch: boolean; parts: HousePart[]; windows: Vec3[] }
export interface BuildState { cut: number; scaffold: { idx: number; grow: number }[]; clock: string; lit: boolean; done: boolean }
```

```ts
// src/valley/sections.ts
export const SECTIONS: readonly { id: SectionId; heightVh: number; todEnd: number; view: View; viewPortrait: View }[];   // viewPortrait: spec §3 portrait yaw column, same pitch and fovScale
export function sectionRanges(tops: number[], docHeight: number, vh: number): SectionRange[];
export function locate(g: number, ranges: SectionRange[]): { section: SectionId; s: number; index: number };
// src/valley/timeline.ts
export function timelineAt(g: number, ranges: SectionRange[], portrait?: boolean): Timeline;   // portrait picks viewPortrait yaw
// sections.ts also exports `interface Located { section: SectionId; s: number; index: number }` and `locateInto(g, ranges, out: Located): Located` (allocation-free locate; added in Stage 2 Task 2.2).
// src/valley/environment.ts
export function environmentAt(tod: number): Environment;
// src/valley/ignition.ts
export const CHAIN_END = 5.0;
export function ignitionSchedule(): IgnitionStep[];
export function ignitionLevel(step: IgnitionStep, t: number): number;   // 0..1.6 for a target at wall time t since T0: a brightness for lamp/flood/flicker/hillside targets, the lit-row fraction for mill run/out, the reveal value for the ridge trickle
// src/valley/lights.ts
export const EMITTERS: readonly Emitter[];
export const BUILD_ORDER: readonly EmitterId[];   // hut, nist, kalshiLamp, wvu, bar1..4, hill1..5, visitor, ridge
export function pulseAt(t: number): Record<EmitterId, number>;   // multipliers, mill always 1
// src/valley/house.ts
export function houseFromSentence(sentence: string): House;
export function houseSvg(house: House): string;
// src/valley/build.ts
export const BUILD_SECONDS = 4.4;
export function buildStateAt(t: number): BuildState;
// src/valley/ridge.ts
export function ridgePoints(count: number, seed: number): { positions: Float32Array; birth: Float32Array; size: Float32Array };
// src/valley/terrain.ts
export const TERRAIN = { width: 160, depth: 100, res: 1 } as const;
export function heightAt(x: number, z: number): number;
export function buildTerrain(): { positions: Float32Array; colors: Float32Array; indices: Uint32Array };
// src/valley/layout.ts
export const CAMERA_LANDSCAPE: { position: Vec3; lookAt: Vec3; fov: number };
export const CAMERA_PORTRAIT: { position: Vec3; lookAt: Vec3; fov: number };
export const PLACES: Record<'hut' | 'nist' | 'wvu' | 'kalshiLamp' | 'bar1' | 'bar2' | 'bar3' | 'bar4' | 'mill' | 'millWheel' | 'lot' | 'hill1' | 'hill2' | 'hill3' | 'hill4' | 'hill5', Vec3>;   // y is heightAt(x, z)
export const RIDGE = { x0: -36, x1: 40, z: -36 } as const;
// src/valley/hash.ts, rng.ts
export function hashString(s: string): number;          // FNV-1a 32-bit unsigned
export function mulberry32(seed: number): () => number;
```

```ts
// src/gl/driverCore.ts
export interface FrameInputs { g: number; ranges: SectionRange[]; t: number; dt: number; introT: number | null; buildT: number | null; pulseT: number | null; flickerT: number | null; darchOverride?: number; reducedMotion: boolean; portrait?: boolean /* picks the portrait yaw column */ }
// ValleyUniforms is defined in driverCore.ts (Stage 2 Task 2.2): plain { value } holders for the sky, fog, light and reveal uniforms; Stage 3 extends it with the light uniforms (uRidgeLit, uMillRows, uWheelAngle).
export interface FrameTargets { uniforms: ValleyUniforms; lit: Float32Array /* per emitter, EMITTERS order */; projected: Float32Array /* x,y,visible per emitter */; latched: { ridge: number; hedge: number } }
export function applyFrame(inputs: FrameInputs, targets: FrameTargets): void;   // allocation-free
```

## Stages

Each stage is its own file and ends with a gate from spec §14. Do not start a stage until the previous stage's gate is judged.

| stage | file | delivers | gate |
|---|---|---|---|
| 0 | `2026-10-08-ortg-plan-01-reset.md` | rewired scroll/tier, old code deleted, deps and scripts, static export, dark palette and type system, copy and facts, DOM-only site with every section, resume, placeholder still | DOM renders all copy; `npm run build` exports |
| 1 | `2026-10-08-ortg-plan-02-valley.md` | `src/valley/` pure package with tests: types, hash, rng, palette, layout, terrain, ridge, sections, timeline, environment, ignition, lights, house, build, projection test | vitest green |
| 2 | `2026-10-08-ortg-plan-03-gl-core.md` | Scene with warm-up and error boundary, CameraRig, sky/stars/moon, terrain, river, mist, buildings, windows, glow, projection, driverCore + Driver, labels | G1 valley still |
| 3 | `2026-10-08-ortg-plan-04-chain-ridge-mill.md` | ignition chain and labels, ridge and counter, hedge lines, mill rows and wheel, rain, thesis pulse, hut flicker, intro gate | G2, G3, G4 |
| 4 | `2026-10-08-ortg-plan-05-visitor.md` | house geometry, hillside, visitor house with clip and scaffold, Yours wiring, storage, SVG elevation | G5 |
| 5 | `2026-10-08-ortg-plan-06-tiers-polish.md` | phone tier, portrait, step-down ladder, reduced motion, no-GL Still, still and og capture, performance, a11y, lint and build, branch review | G6, G7 |

## Execution notes for the orchestrator

- Stage 1 can start after Stage 0's Tasks 0.1, 0.3 and 0.4 have landed (it imports `facts`, `PALETTE` and `SKY_KEYFRAMES`); only Tasks 1.1 and 1.7 need nothing beyond 0.1. Tasks 0.3 and 0.4 run after 0.2 (the delete), because 0.4's "colour literals live only in palette.ts" test fails while `src/theme/palettes.ts` exists. Stage 2 depends on both stages.
- Within a stage, tasks marked **[parallel-safe]** touch disjoint files and can be assigned to separate agents at once; the rest run in order.
- Implementers run on Sonnet; reviewers, re-reviewers, escalations and gate judges run on Opus. Never the session model.
- Every task's "Verify" block is what a reviewer checks. A reviewer that cannot run the verify block rejects the task.
- Gate stills are taken with Playwright against the exported build (`npm run build && npx serve out -l 3005`) at 1440 × 900 (phone 390 × 844) and saved under `.playwright-mcp/gates/` (gitignored). An Opus agent judges them; implementers do not self-pass a gate.
