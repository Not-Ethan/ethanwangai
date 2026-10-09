# Stage 3 — Ignition chain, ridge, hedge lines, mill, rain, pulse, flicker

> Part of `2026-10-08-ortg-plan-00-index.md`. Read that index first: its Global Constraints, its Review Focus (this stage owns items 3 and 4) and its interface contracts, which are law here. This stage argues from the spec `docs/plans/2026-10-08-only-running-things-glow-design.md`: §1 (the chain in five seconds), §2 (reveals latch, storage optional), §3 and §3.1 (sections, the counter, the ignition labels), §4.2 (hut flicker), §4.4 (hedge lines), §4.5 (mill curve and wheel), §4.6 (ridge and trickle), §5.1 (timeline outputs), §5.3 (ignition schedule), §5.6 (pulse), §6 (Ridge, HedgeLines, MillWheel, Rain, Driver, Labels), §7 (T0 and `sessionStorage.introPlayed`), §9 (palette, counter scramble), §10 (`?still=1`, `?g=`), §11 (phone tier, reduced motion, storage blocked), §12 (no allocation in the frame loop) and §14 (gates). It ends with gates **G2 ignition**, **G3 ridge** and **G4 darch** (Task 3.12), judged by an Opus agent from stills.

**For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. Implementers are Sonnet; reviewers and the gate judge are Opus.

## Order

Tasks 3.1 to 3.5 are **[parallel-safe]**: each touches only its own files and depends only on Stages 0 to 2. Tasks 3.6 to 3.11 run in order after them (they share `src/gl/Driver.tsx`, `src/gl/driverCore.ts`, `src/gl/Scene.tsx` and `src/gl/lightsFrame.ts`). Task 3.13 (section 05's arrival labels, appended after the gate so task ids stay stable) runs after 3.11 and before the gate. Task 3.12 is the gate and runs last.

## What this stage builds on (Stages 0 to 2, by name)

The index contracts are used verbatim. These names come from the Stage 0, 1 and 2 plan files (`-01-reset`, `-02-valley`, `-03-gl-core`); if the landed code differs, use the landed name in every code block here, say so in the commit message, and never add an alias or rename an earlier export.

- `src/gl/driverCore.ts` (Stage 2 Task 2.2): `interface Uniform<T> { value: T }`; `interface ValleyUniforms` with, among others, `uTime` (ambient seconds, frozen under reduced motion), `uRidgeReveal`, `uHedgeReveal`, `uDarchT`, `uRain`; `createUniforms(): ValleyUniforms`; `FrameInputs` (contract plus `portrait?`), `FrameTargets`; `createFrameTargets(uniforms?, projected?)`; `createFrame(uniforms, projected?)`; `setFrameInputs(inputs, g, ranges, t, dt, introT, reducedMotion, portrait)`; `REST_LIT` and `writeRestLights(lit)`. Inside `applyFrame`: `const u = targets.uniforms`, `const tl: Timeline = timelineAt(...)`, Stage 2's latch block (`if (tl.ridgeReveal > latched.ridge) ...`), `u.uDarchT.value = inputs.darchOverride ?? tl.darchT;`, `u.uRain.value = ...`, and `writeRestLights(targets.lit);` last.
- `timelineAt` returns one shared object that the next call overwrites (Stage 1). Read what you need from it before calling it again.
- `src/gl/projection.ts` (Task 2.1): `EMITTER_COUNT`, `EMITTER_INDEX: Readonly<Record<EmitterId, number>>`, `PROJECTED`, `LABEL_ALPHA` (per emitter, 0..1, "Stage 3's ignition writes it"). It has no runtime three import.
- `src/site/labelItems.ts` (Task 2.8): `LABEL_ANCHORS = { hut: 'hut', nist: 'nist', mill: 'mill', kalshiLamp: 'kalshiLamp', wvu: 'wvu', bars: 'bar2', hillside: 'hill2' }`. `src/site/Labels.tsx` renders one `span[data-label=<key>]` per anchor and sets its opacity from `LABEL_ALPHA[anchor]` every frame. This stage only writes `LABEL_ALPHA`; it does not edit `Labels.tsx`.
- `src/gl/Driver.tsx` (Task 2.7): `Driver({ uniforms, refs, rig, t0 })`; in `useFrame((_, delta) => ...)` it builds `f` (`frame.current ??= createFrame(uniforms)`), computes `now = performance.now() / 1000`, calls `setFrameInputs(f.inputs, s.g, s.ranges, now, delta, start === null ? null : now - start, reducedMotion, rig.portrait)` with `start = t0.current` (the T0 the warm-up resolves, in the same seconds), then `applyFrame(f.inputs, f.targets)`, `syncScene`, `composeCamera`, `projectEmitters`.
- `src/gl/Scene.tsx` (Task 2.7): `ValleyCanvas` holds `tier`, `shadows` (from `useTier()`), `reducedMotion` (from `useScroll()`), `uniforms` (from `createUniforms()`), `refs`; the Canvas children include `<Windows refs={refs} />` and `<Glow refs={refs} />`.
- `src/gl/shaders/windows.ts` (Task 2.5): `patchWindows(shader)` declares `aLit`, `aRow`, varyings `vLit`, `vRow`, writes `\tvLit = aLit;\n\tvRow = aRow;` after `#include <color_vertex>`, discards when `vLit < 0.001`; `createWindowsMaterial()`; `WINDOWS_CACHE_KEY`. `src/gl/shaders/inject.ts`: `inject(source, anchor, replacement)` (throws on a missing anchor). Non-mill windows carry `row = -1`.
- `src/gl/shaders/ridge.ts` (Task 2.6): `RIDGE_VERT`, `RIDGE_FRAG` with uniforms `uReveal`, `uPixelScale`, `uMap`, `uColor`, attributes `aBirth`, `aSize`, fog chunks and `ADDITIVE_FOG`. `src/gl/glowTexture.ts`: `getGlowTexture()`.
- `src/valley/palette.ts` (Stage 0 Task 0.4): flat `PALETTE` with `ridge`, `hedge`, `rain`, `wall`, `terrainCrest`; `ALPHA = { hedge: 0.5, rain: 0.35 }`.
- `src/site/copy.ts`: `copy.kalshi.counter(n: number): string` (`'30,000 trades'`). `src/site/Counter.tsx` (Stage 0 Task 0.6): a static `p.mono[data-counter]`. The email link is `a[data-contact="email"]` (Stage 0 Task 0.7).
- `?still=1` with `?g=` and the hidden DOM arrive in Stage 5 Task 5.8. The gates here need them earlier, so Task 3.6 adds a minimal parser for `still`, `g` and `t` that Task 5.8 later absorbs; in this stage `still=1` does not hide `main`.

Readings this stage takes where the spec is silent (each repeated in the owning task and in the doubts):

- `FrameInputs.introT`, `pulseT`, `flickerT`, `buildT` are seconds since their trigger, or `null`. `introT === null` means the chain is not playing and every light is in its final state. `buildT === null` means no visitor house exists (Stage 4 passes `BUILD_SECONDS` or more for a house restored from `localStorage`).
- The mill is dark at rest (spec §1, §4.5: darch ended), so `REST_LIT` changes its mill entry from 1 to 0.
- While the chain plays, the timeline's 0.01 floor for `ridgeReveal` before section 02 counts as 0 so the trickle (0 → 0.01 over 1.2 s) is visible; otherwise `max(trickle, timeline, previous)` exactly as §4.6.
- Under reduced motion the ridge reveal is whole from the first frame inside 02 and the hedge reveal whole from the first frame inside 03 ("cuts instead of eases").
- The hut flicker also fires under reduced motion (a brightness dip, not motion).

---

### Task 3.1: Ridge points and crest line **[parallel-safe]**

Spec §4.6 (points along the crest, `aBirth`, `aSize`, `uReveal`, additive amber, `toneMapped: false`, a faint crest line, 2 px, near-black), §6 (`Ridge.tsx`: points draw plus crest line), §5.6 (the ridge pulses with the others), §11 (phone: N/5 at ×1.8 size), §12 (every ridge point samples the glow sprite).

Stage 2 wrote the ridge's point shader. This task adds two uniforms to its fragment (`uLit` for the pulse, `uAlpha` so 30,000 overlapping additive points read as a band rather than a white bar) and builds the geometry, the material and the component.

**Files:**
- Create: `src/gl/ridgeGeometry.ts`, `src/gl/ridgeGeometry.test.ts`, `src/gl/Ridge.tsx`
- Modify: `src/gl/shaders/ridge.ts` (fragment only)

**Interfaces:**
- Consumes: `ridgePoints(count, seed)` (`@/valley/ridge`), `RIDGE`, `CAMERA_LANDSCAPE`, `CAMERA_PORTRAIT` (`@/valley/layout`), `heightAt` (`@/valley/terrain`), `facts.kalshi.trades`, `PALETTE.ridge`, `PALETTE.terrainCrest`, `getGlowTexture()`, `RIDGE_VERT`, `RIDGE_FRAG`, `Tier`.
- Produces:
  - `ridgeConfig(tier: Tier): { count: number; sizeScale: number }`
  - `RIDGE_POINT_WORLD = 0.22`, `RIDGE_ALPHA = 0.45`, `CREST_SEGMENTS = 152`, `CREST_LIFT = 0.05`
  - `buildRidgeGeometry(count: number): THREE.BufferGeometry` (attributes `position`, `aBirth`, `aSize`)
  - `crestLinePoints(): [number, number, number][]`
  - `pointScale(bufferHeightPx: number, fovDeg: number): number`
  - `RIDGE_FRAG` gains `uniform float uLit;` and `uniform float uAlpha;`
  - `createRidgeMaterial(reveal: { value: number }, lit: { value: number }, sizeScale: number): THREE.ShaderMaterial`
  - `Ridge(props: { tier: Tier; reveal: { value: number }; lit: { value: number } })` — `reveal` is `uniforms.uRidgeReveal`, `lit` is `uniforms.uRidgeLit` (Task 3.7). Mounted in Task 3.11.

- [ ] **Step 1: Write the failing test `src/gl/ridgeGeometry.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { facts } from '@/valley/facts';
import { RIDGE } from '@/valley/layout';
import { heightAt } from '@/valley/terrain';
import { RIDGE_FRAG } from './shaders/ridge';
import {
  CREST_LIFT, CREST_SEGMENTS, buildRidgeGeometry, crestLinePoints, pointScale, ridgeConfig,
} from './ridgeGeometry';

describe('ridgeConfig (spec §4.6, §11)', () => {
  it('draws every trade on desktop at size 1', () => {
    expect(ridgeConfig('desktop')).toEqual({ count: facts.kalshi.trades, sizeScale: 1 });
  });
  it('draws a fifth of them on phone at 1.8x size', () => {
    expect(ridgeConfig('phone')).toEqual({ count: Math.floor(facts.kalshi.trades / 5), sizeScale: 1.8 });
  });
});

describe('buildRidgeGeometry', () => {
  it('carries position, aBirth and aSize for every point', () => {
    const g = buildRidgeGeometry(6000);
    expect(g.getAttribute('position').count).toBe(6000);
    expect(g.getAttribute('aBirth').count).toBe(6000);
    expect(g.getAttribute('aBirth').itemSize).toBe(1);
    expect(g.getAttribute('aSize').count).toBe(6000);
    expect(g.boundingSphere).not.toBeNull();
  });
});

describe('crestLinePoints', () => {
  it('runs the crest from x0 to x1 on the terrain height', () => {
    const pts = crestLinePoints();
    expect(pts).toHaveLength(CREST_SEGMENTS + 1);
    expect(pts[0][0]).toBe(RIDGE.x0);
    expect(pts[pts.length - 1][0]).toBeCloseTo(RIDGE.x1, 9);
    for (const [x, y, z] of pts) {
      expect(z).toBe(RIDGE.z);
      expect(Number.isFinite(y)).toBe(true);
      expect(y).toBeCloseTo(heightAt(x, RIDGE.z) + CREST_LIFT, 6);
    }
  });
});

describe('pointScale', () => {
  it('is the drawing-buffer pixels per world unit at distance 1', () => {
    expect(pointScale(900, 36)).toBeCloseTo(1384.96, 1);
  });
});

describe('ridge fragment (spec §5.6)', () => {
  it('scales by the pulse level and a band alpha', () => {
    expect(RIDGE_FRAG).toContain('uniform float uLit;');
    expect(RIDGE_FRAG).toContain('uniform float uAlpha;');
    expect(RIDGE_FRAG).toContain('uColor * a * uAlpha * uLit');
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/gl/ridgeGeometry.test.ts`
Expected: FAIL, `Failed to resolve import "./ridgeGeometry"`.

- [ ] **Step 3: Write `src/gl/ridgeGeometry.ts`**

```ts
// The ridge's pure part (spec §4.6, §11): how many trade points a tier draws, the points geometry, the crest line under
// them, and the point-size scale. Runs in Node for tests; Ridge.tsx renders it.
import * as THREE from 'three';
import type { Tier } from '@/valley/types';
import { facts } from '@/valley/facts';
import { ridgePoints } from '@/valley/ridge';
import { RIDGE } from '@/valley/layout';
import { heightAt } from '@/valley/terrain';

/** World size of a point with aSize 1 (spec §14 G3's remedy is to lower this). About 3 px at the ridge at 1440 × 900. */
export const RIDGE_POINT_WORLD = 0.22;
/** Per-point brightness under additive blending, so overlapping points read as a band, not a white bar. */
export const RIDGE_ALPHA = 0.45;
export const CREST_SEGMENTS = 152;
/** The crest line sits this far above the terrain crest so the terrain does not z-fight it. */
export const CREST_LIFT = 0.05;

export function ridgeConfig(tier: Tier): { count: number; sizeScale: number } {
  return tier === 'phone'
    ? { count: Math.floor(facts.kalshi.trades / 5), sizeScale: 1.8 }
    : { count: facts.kalshi.trades, sizeScale: 1 };
}

export function buildRidgeGeometry(count: number): THREE.BufferGeometry {
  const { positions, birth, size } = ridgePoints(count, facts.kalshi.trades);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('aBirth', new THREE.BufferAttribute(birth, 1));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.computeBoundingSphere();
  return g;
}

export function crestLinePoints(): [number, number, number][] {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= CREST_SEGMENTS; i++) {
    const x = RIDGE.x0 + ((RIDGE.x1 - RIDGE.x0) * i) / CREST_SEGMENTS;
    pts.push([x, heightAt(x, RIDGE.z) + CREST_LIFT, RIDGE.z]);
  }
  return pts;
}

/** Stage 2's ridge shader sizes a point as aSize · uPixelScale / viewDepth; uPixelScale = this × world size. */
export function pointScale(bufferHeightPx: number, fovDeg: number): number {
  return bufferHeightPx / (2 * Math.tan((fovDeg * Math.PI) / 360));
}
```

- [ ] **Step 4: Edit the fragment in `src/gl/shaders/ridge.ts`**

In `RIDGE_FRAG`, change the line `uniform vec3 uColor;` to:

```glsl
uniform vec3 uColor;
uniform float uLit;
uniform float uAlpha;
```

and the line `gl_FragColor = vec4( uColor * a, 1.0 );` to:

```glsl
  gl_FragColor = vec4( uColor * a * uAlpha * uLit, 1.0 );
```

Leave `RIDGE_VERT`, the fog chunks and `ADDITIVE_FOG` as they are.

- [ ] **Step 5: Run it and see it pass**

Run: `npx vitest run src/gl/ridgeGeometry.test.ts src/gl/shaders`
Expected: PASS (6 new tests; Stage 2's ridge shader assertions still pass).

- [ ] **Step 6: Write `src/gl/Ridge.tsx`**

```tsx
'use client';
// The ridge (spec §4.6, §6): one Points draw of the trades and one crest line under them. The reveal and the
// brightness are uniform holders applyFrame writes (Tasks 3.7, 3.8); this component never reads scroll.
import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { Tier } from '@/valley/types';
import { PALETTE } from '@/valley/palette';
import { CAMERA_LANDSCAPE, CAMERA_PORTRAIT } from '@/valley/layout';
import { getGlowTexture } from './glowTexture';
import { RIDGE_ALPHA, RIDGE_POINT_WORLD, buildRidgeGeometry, crestLinePoints, pointScale, ridgeConfig } from './ridgeGeometry';
import { RIDGE_FRAG, RIDGE_VERT } from './shaders/ridge';

export interface RidgeProps { tier: Tier; reveal: { value: number }; lit: { value: number } }

export function createRidgeMaterial(reveal: { value: number }, lit: { value: number }, sizeScale: number): THREE.ShaderMaterial {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uMap: { value: null },
      uColor: { value: new THREE.Color(PALETTE.ridge) },
      uAlpha: { value: RIDGE_ALPHA },
      uPixelScale: { value: pointScale(900, CAMERA_LANDSCAPE.fov) * RIDGE_POINT_WORLD * sizeScale },
    },
  ]);
  // shared holders and the shared texture are assigned after the merge, which would clone them
  uniforms.uReveal = reveal;
  uniforms.uLit = lit;
  uniforms.uMap.value = getGlowTexture();
  return new THREE.ShaderMaterial({
    vertexShader: RIDGE_VERT,
    fragmentShader: RIDGE_FRAG,
    uniforms,
    fog: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

function setPixelScale(material: THREE.ShaderMaterial, bufferHeightPx: number, fovDeg: number, sizeScale: number): void {
  material.uniforms.uPixelScale.value = pointScale(bufferHeightPx, fovDeg) * RIDGE_POINT_WORLD * sizeScale;
}

export function Ridge({ tier, reveal, lit }: RidgeProps) {
  const { count, sizeScale } = ridgeConfig(tier);
  const geometry = useMemo(() => buildRidgeGeometry(count), [count]);
  const material = useMemo(() => createRidgeMaterial(reveal, lit, sizeScale), [reveal, lit, sizeScale]);
  const crest = useMemo(() => crestLinePoints(), []);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const dpr = useThree((s) => s.viewport.dpr);

  useEffect(() => {
    setPixelScale(material, height * dpr, width < height ? CAMERA_PORTRAIT.fov : CAMERA_LANDSCAPE.fov, sizeScale);
  }, [material, width, height, dpr, sizeScale]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  return (
    <group>
      <Line points={crest} color={PALETTE.terrainCrest} lineWidth={2} />
      <points geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}
```

- [ ] **Step 7: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/gl/Ridge.tsx src/gl/ridgeGeometry.ts src/gl/shaders/ridge.ts`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/gl/ridgeGeometry.ts src/gl/ridgeGeometry.test.ts src/gl/shaders/ridge.ts src/gl/Ridge.tsx
git commit -m "Add the ridge points and crest line"
```

**Verify:**
- `npx vitest run src/gl/ridgeGeometry.test.ts src/gl/shaders` passes; `npx tsc --noEmit` clean.
- `grep -n "AdditiveBlending\|toneMapped: false" src/gl/Ridge.tsx` prints two lines; `grep -n "#[0-9A-Fa-f]\{6\}" src/gl/Ridge.tsx src/gl/ridgeGeometry.ts` prints nothing (colours only from the palette).
- `npx vitest run src/gl/lightRule.test.ts` (Stage 2's spec §4.8 grep) still passes.

---

### Task 3.2: Hedge lines **[parallel-safe]**

Spec §4.4 (one `LineSegments` draw, four polylines of 24 segments from each bar's door to the kalshi lamp, slightly bowed, pale, `uReveal` by segment index), §6 (`HedgeLines.tsx`), §9 (hedge `#8FA3B8` at alpha 0.5).

The spec does not place the door or the lamp head. This task reads them as Stage 2 built them: the door point is the porch light over the door on the bar's river face, `bar + (1.7, 2.55, 2.0)` (Stage 2 Task 2.5's porch light), and the lamp head `kalshiLamp + (0, 1.2, 0)` (the 1.2 m post). "Slightly bowed" is a quadratic arc whose control point is lifted by 0.25 × the chord length.

**Files:**
- Create: `src/gl/hedgeGeometry.ts`, `src/gl/hedgeGeometry.test.ts`, `src/gl/shaders/hedge.ts`, `src/gl/HedgeLines.tsx`

**Interfaces:**
- Consumes: `PLACES` (`@/valley/layout`), `Vec3`, `PALETTE.hedge`, `ALPHA.hedge`.
- Produces:
  - `HEDGE_BARS = ['bar1', 'bar2', 'bar3', 'bar4'] as const`, `HEDGE_SEGMENTS = 24`, `HEDGE_DOOR: Vec3 = [1.7, 2.55, 2.0]`, `HEDGE_LAMP_HEAD: Vec3 = [0, 1.2, 0]`, `HEDGE_BOW = 0.25`
  - `hedgeEnds(bar: (typeof HEDGE_BARS)[number]): { from: Vec3; to: Vec3 }`
  - `hedgePoint(from: Vec3, to: Vec3, t: number): [number, number, number]`
  - `buildHedgeArrays(): { positions: Float32Array; segment: Float32Array }` (4 × 24 × 2 vertices)
  - `buildHedgeGeometry(): THREE.BufferGeometry` (attributes `position`, `aSegment`)
  - `HEDGE_VERT`, `HEDGE_FRAG`
  - `createHedgeMaterial(reveal: { value: number }): THREE.ShaderMaterial`, `HedgeLines(props: { reveal: { value: number } })` — `reveal` is `uniforms.uHedgeReveal`. Mounted in Task 3.11.

- [ ] **Step 1: Write the failing test `src/gl/hedgeGeometry.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { PLACES } from '@/valley/layout';
import {
  HEDGE_BARS, HEDGE_DOOR, HEDGE_LAMP_HEAD, HEDGE_SEGMENTS, buildHedgeArrays, buildHedgeGeometry, hedgeEnds, hedgePoint,
} from './hedgeGeometry';

const VERTS_PER_LINE = HEDGE_SEGMENTS * 2;

describe('hedge lines (spec §4.4)', () => {
  it('is four polylines of 24 segments, two vertices per segment', () => {
    const { positions, segment } = buildHedgeArrays();
    expect(positions.length).toBe(4 * VERTS_PER_LINE * 3);
    expect(segment.length).toBe(4 * VERTS_PER_LINE);
    expect(buildHedgeGeometry().getAttribute('aSegment').count).toBe(4 * VERTS_PER_LINE);
  });

  it('runs from each bar door to the lamp head', () => {
    const { positions } = buildHedgeArrays();
    HEDGE_BARS.forEach((bar, line) => {
      const p = PLACES[bar];
      const l = PLACES.kalshiLamp;
      const first = line * VERTS_PER_LINE * 3;
      const last = (line * VERTS_PER_LINE + VERTS_PER_LINE - 1) * 3;
      for (let c = 0; c < 3; c++) {
        expect(positions[first + c]).toBeCloseTo(p[c] + HEDGE_DOOR[c], 4);
        expect(positions[last + c]).toBeCloseTo(l[c] + HEDGE_LAMP_HEAD[c], 4);
      }
    });
  });

  it('is continuous: each segment starts where the last one ended', () => {
    const { positions } = buildHedgeArrays();
    for (let line = 0; line < 4; line++) {
      for (let k = 1; k < HEDGE_SEGMENTS; k++) {
        const prevEnd = (line * VERTS_PER_LINE + (k - 1) * 2 + 1) * 3;
        const start = (line * VERTS_PER_LINE + k * 2) * 3;
        for (let c = 0; c < 3; c++) expect(positions[start + c]).toBeCloseTo(positions[prevEnd + c], 5);
      }
    }
  });

  it('tags both vertices of segment k with k, in draw order', () => {
    const { segment } = buildHedgeArrays();
    for (let line = 0; line < 4; line++) {
      for (let k = 0; k < HEDGE_SEGMENTS; k++) {
        expect(segment[line * VERTS_PER_LINE + k * 2]).toBe(k);
        expect(segment[line * VERTS_PER_LINE + k * 2 + 1]).toBe(k);
      }
    }
  });

  it('bows upward: the arc midpoint is above the chord midpoint', () => {
    for (const bar of HEDGE_BARS) {
      const { from, to } = hedgeEnds(bar);
      expect(hedgePoint(from, to, 0.5)[1]).toBeGreaterThan((from[1] + to[1]) / 2 + 0.5);
    }
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/gl/hedgeGeometry.test.ts`
Expected: FAIL, `Failed to resolve import "./hedgeGeometry"`.

- [ ] **Step 3: Write `src/gl/hedgeGeometry.ts`**

```ts
// The hedge lines' pure part (spec §4.4): four bowed polylines from each bar's door to the kalshi lamp, 24 segments
// each, as LineSegments vertices with the segment index per vertex for the uReveal draw.
import * as THREE from 'three';
import { PLACES } from '@/valley/layout';
import type { Vec3 } from '@/valley/types';

export const HEDGE_BARS = ['bar1', 'bar2', 'bar3', 'bar4'] as const;
export type HedgeBar = (typeof HEDGE_BARS)[number];
export const HEDGE_SEGMENTS = 24;
/** The porch light over the door on the bar's river face (Stage 2 Task 2.5 places it at (1.7, 2.55, 2) from the bar). */
export const HEDGE_DOOR: Vec3 = [1.7, 2.55, 2.0];
/** The lamp head on the kalshi lamp's 1.2 m post. */
export const HEDGE_LAMP_HEAD: Vec3 = [0, 1.2, 0];
/** Control-point lift as a fraction of the chord: "slightly bowed". */
export const HEDGE_BOW = 0.25;

export function hedgeEnds(bar: HedgeBar): { from: Vec3; to: Vec3 } {
  const b = PLACES[bar];
  const l = PLACES.kalshiLamp;
  return {
    from: [b[0] + HEDGE_DOOR[0], b[1] + HEDGE_DOOR[1], b[2] + HEDGE_DOOR[2]],
    to: [l[0] + HEDGE_LAMP_HEAD[0], l[1] + HEDGE_LAMP_HEAD[1], l[2] + HEDGE_LAMP_HEAD[2]],
  };
}

/** Quadratic Bezier from `from` to `to` whose control point is the chord midpoint lifted by HEDGE_BOW · chord. */
export function hedgePoint(from: Vec3, to: Vec3, t: number): [number, number, number] {
  const chord = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const cx = (from[0] + to[0]) / 2;
  const cy = (from[1] + to[1]) / 2 + HEDGE_BOW * chord;
  const cz = (from[2] + to[2]) / 2;
  const a = (1 - t) * (1 - t);
  const b = 2 * (1 - t) * t;
  const c = t * t;
  return [a * from[0] + b * cx + c * to[0], a * from[1] + b * cy + c * to[1], a * from[2] + b * cz + c * to[2]];
}

export function buildHedgeArrays(): { positions: Float32Array; segment: Float32Array } {
  const verts = HEDGE_BARS.length * HEDGE_SEGMENTS * 2;
  const positions = new Float32Array(verts * 3);
  const segment = new Float32Array(verts);
  let v = 0;
  for (const bar of HEDGE_BARS) {
    const { from, to } = hedgeEnds(bar);
    for (let k = 0; k < HEDGE_SEGMENTS; k++) {
      positions.set(hedgePoint(from, to, k / HEDGE_SEGMENTS), v * 3);
      segment[v++] = k;
      positions.set(hedgePoint(from, to, (k + 1) / HEDGE_SEGMENTS), v * 3);
      segment[v++] = k;
    }
  }
  return { positions, segment };
}

export function buildHedgeGeometry(): THREE.BufferGeometry {
  const { positions, segment } = buildHedgeArrays();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('aSegment', new THREE.BufferAttribute(segment, 1));
  g.computeBoundingSphere();
  return g;
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run src/gl/hedgeGeometry.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Write `src/gl/shaders/hedge.ts`**

```ts
// Hedge lines (spec §4.4): segment k shows once uReveal · 24 passes k; the segment being drawn fades in. Pale, alpha
// 0.5, normal blending, fogged like the rest of the valley. Not an emitter.
export const HEDGE_VERT = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
attribute float aSegment;
varying float vSegment;
void main() {
  vSegment = aSegment;
  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

export const HEDGE_FRAG = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uColor;
uniform float uAlpha;
uniform float uReveal;
uniform float uSegments;
varying float vSegment;
void main() {
  float shown = clamp( uReveal * uSegments - vSegment, 0.0, 1.0 );
  if ( shown <= 0.0 ) discard;
  gl_FragColor = vec4( uColor, uAlpha * shown );
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;
```

- [ ] **Step 6: Write `src/gl/HedgeLines.tsx`**

```tsx
'use client';
// The hedge lines (spec §4.4, §6): one LineSegments draw. uReveal is the holder applyFrame writes the latched hedge
// reveal into (Task 3.8); it is assigned after the merge so it stays the same object, not a clone.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ALPHA, PALETTE } from '@/valley/palette';
import { HEDGE_SEGMENTS, buildHedgeGeometry } from './hedgeGeometry';
import { HEDGE_FRAG, HEDGE_VERT } from './shaders/hedge';

export function createHedgeMaterial(reveal: { value: number }): THREE.ShaderMaterial {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uColor: { value: new THREE.Color(PALETTE.hedge) },
      uAlpha: { value: ALPHA.hedge },
      uSegments: { value: HEDGE_SEGMENTS },
    },
  ]);
  uniforms.uReveal = reveal;
  return new THREE.ShaderMaterial({
    vertexShader: HEDGE_VERT,
    fragmentShader: HEDGE_FRAG,
    uniforms,
    fog: true,
    transparent: true,
    depthWrite: false,
  });
}

export function HedgeLines({ reveal }: { reveal: { value: number } }) {
  const geometry = useMemo(() => buildHedgeGeometry(), []);
  const material = useMemo(() => createHedgeMaterial(reveal), [reveal]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return <lineSegments geometry={geometry} material={material} />;
}
```

- [ ] **Step 7: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/gl/HedgeLines.tsx src/gl/hedgeGeometry.ts src/gl/shaders/hedge.ts`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/gl/hedgeGeometry.ts src/gl/hedgeGeometry.test.ts src/gl/shaders/hedge.ts src/gl/HedgeLines.tsx
git commit -m "Add the hedge lines from each bar to the kalshi lamp"
```

**Verify:**
- `npx vitest run src/gl/hedgeGeometry.test.ts` passes; `npx tsc --noEmit` clean.
- `grep -n "AdditiveBlending\|emissive" src/gl/HedgeLines.tsx src/gl/shaders/hedge.ts` prints nothing (spec §4.8).
- `grep -n "uniforms.uReveal = reveal" src/gl/HedgeLines.tsx` prints one line (shared holder, not a clone).

---

### Task 3.3: Mill wheel **[parallel-safe]**

Spec §4.5 (a 3.2-radius ring of 12 paddles overhanging the river at (30, 2.6, −5); rotation from `darchT` and its own clock), §6 (`MillWheel.tsx`, a desktop shadow caster), §9 (building bodies `#1A1F28`).

The wheel turns in the x–y plane (axle along z), so the fixed camera, looking down −z, sees it face on. `Driver.tsx` sets its rotation each frame (Task 3.9) through a module-level handle, so the shadow pass sees the same rotation and there is still one `useFrame`.

**Files:**
- Create: `src/gl/millWheelGeometry.ts`, `src/gl/millWheelGeometry.test.ts`, `src/gl/wheelRef.ts`, `src/gl/MillWheel.tsx`

**Interfaces:**
- Consumes: `PLACES.millWheel` (`@/valley/layout`), `Vec3`, `PALETTE.wall`, `mergeGeometries` (`three/examples/jsm/utils/BufferGeometryUtils.js`).
- Produces:
  - `MILL_WHEEL_RADIUS = 3.2`, `MILL_WHEEL_PADDLES = 12`, `MILL_AXLE_Y = 2.6`, `MILL_WHEEL_POSITION: Vec3`
  - `buildMillWheelGeometry(): THREE.BufferGeometry`
  - `wheelRef: { current: THREE.Object3D | null }` (`src/gl/wheelRef.ts`)
  - `MillWheel(props: { shadows: boolean })` (mounted in Task 3.11)

- [ ] **Step 1: Write the failing test `src/gl/millWheelGeometry.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { MILL_WHEEL_POSITION, MILL_WHEEL_RADIUS, buildMillWheelGeometry } from './millWheelGeometry';

describe('mill wheel (spec §4.5)', () => {
  it('sits over the river at (30, 2.6, -5)', () => {
    expect(MILL_WHEEL_POSITION[0]).toBe(30);
    expect(MILL_WHEEL_POSITION[1]).toBe(2.6);
    expect(MILL_WHEEL_POSITION[2]).toBe(-5);
  });

  it('is one merged, indexed geometry about 3.2 in radius, thin along its axle', () => {
    const g = buildMillWheelGeometry();
    expect(g.getAttribute('position').count).toBeGreaterThan(0);
    expect(g.getAttribute('normal')).toBeDefined();
    expect(g.index).not.toBeNull();
    g.computeBoundingBox();
    const box = g.boundingBox as THREE.Box3;
    expect(box.max.x).toBeGreaterThanOrEqual(MILL_WHEEL_RADIUS);
    expect(box.max.x).toBeLessThan(3.5);
    expect(box.min.y).toBeLessThanOrEqual(-MILL_WHEEL_RADIUS);
    expect(box.max.z).toBeLessThanOrEqual(0.81);
    expect(box.min.z).toBeGreaterThanOrEqual(-0.81);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/gl/millWheelGeometry.test.ts`
Expected: FAIL, `Failed to resolve import "./millWheelGeometry"`.

- [ ] **Step 3: Write `src/gl/millWheelGeometry.ts`**

```ts
// The mill wheel (spec §4.5): an outer rim of radius 3.2, an inner ring, a hub on a z axle, six spokes (twelve
// radii) and twelve paddles, merged into one geometry. The wheel lies in the x-y plane and turns about z.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PLACES } from '@/valley/layout';
import type { Vec3 } from '@/valley/types';

export const MILL_WHEEL_RADIUS = 3.2;
export const MILL_WHEEL_PADDLES = 12;
export const MILL_AXLE_Y = 2.6;
export const MILL_WHEEL_POSITION: Vec3 = [PLACES.millWheel[0], MILL_AXLE_Y, PLACES.millWheel[2]];

export function buildMillWheelGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [
    new THREE.TorusGeometry(MILL_WHEEL_RADIUS, 0.12, 6, 36),
    new THREE.TorusGeometry(MILL_WHEEL_RADIUS * 0.55, 0.08, 6, 24),
    new THREE.CylinderGeometry(0.45, 0.45, 1.6, 10).rotateX(Math.PI / 2),
  ];
  for (let i = 0; i < 6; i++) {
    parts.push(new THREE.BoxGeometry(MILL_WHEEL_RADIUS * 2, 0.14, 0.14).rotateZ((i * Math.PI) / 6));
  }
  for (let i = 0; i < MILL_WHEEL_PADDLES; i++) {
    const a = (i * 2 * Math.PI) / MILL_WHEEL_PADDLES;
    const r = MILL_WHEEL_RADIUS - 0.4;
    parts.push(new THREE.BoxGeometry(1.0, 0.12, 1.4).rotateZ(a).translate(Math.cos(a) * r, Math.sin(a) * r, 0));
  }
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!merged) throw new Error('mill wheel: parts did not merge');
  merged.computeBoundingSphere();
  return merged;
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run src/gl/millWheelGeometry.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Write `src/gl/wheelRef.ts`**

```ts
// The mill wheel's mesh, for the Driver to turn without React (spec §6: one useFrame). Null until MillWheel mounts
// and again after it unmounts.
import type * as THREE from 'three';

export const wheelRef: { current: THREE.Object3D | null } = { current: null };
```

- [ ] **Step 6: Write `src/gl/MillWheel.tsx`**

```tsx
'use client';
// The mill wheel (spec §4.5, §6): one flat Lambert mesh in the wall colour, a shadow caster on desktop. Driver.tsx sets
// its rotation.z each frame from the angle applyFrame integrates (Task 3.9).
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { PALETTE } from '@/valley/palette';
import { MILL_WHEEL_POSITION, buildMillWheelGeometry } from './millWheelGeometry';
import { wheelRef } from './wheelRef';

function registerWheel(mesh: THREE.Mesh | null): () => void {
  wheelRef.current = mesh;
  return () => {
    wheelRef.current = null;
  };
}

export function MillWheel({ shadows }: { shadows: boolean }) {
  const geometry = useMemo(() => buildMillWheelGeometry(), []);
  const material = useMemo(() => new THREE.MeshLambertMaterial({ color: PALETTE.wall, flatShading: true }), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh
      ref={registerWheel}
      geometry={geometry}
      material={material}
      position={[MILL_WHEEL_POSITION[0], MILL_WHEEL_POSITION[1], MILL_WHEEL_POSITION[2]]}
      castShadow={shadows}
      receiveShadow={shadows}
    />
  );
}
```

- [ ] **Step 7: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/gl/MillWheel.tsx src/gl/millWheelGeometry.ts src/gl/wheelRef.ts`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/gl/millWheelGeometry.ts src/gl/millWheelGeometry.test.ts src/gl/wheelRef.ts src/gl/MillWheel.tsx
git commit -m "Add the mill wheel geometry and mesh"
```

**Verify:**
- `npx vitest run src/gl/millWheelGeometry.test.ts` passes; `npx tsc --noEmit` clean.
- `grep -n "useFrame\|emissive" src/gl/MillWheel.tsx` prints nothing.

---

### Task 3.4: Rain **[parallel-safe]**

Spec §6 (`Rain.tsx`: 1,500 line segments in a 60 × 30 × 40 box around the camera, falling at 18 units/s, alpha from `rain`; desktop only), §8 (rain is ambient wall time), §9 (rain `#9AAEC4` at alpha 0.35), §11 (no rain on phone or under reduced motion).

Each drop is one segment of two vertices sharing a seed height; the vertex shader wraps both by the same amount, so a drop never stretches across the box when it wraps. The fall reads Stage 2's ambient clock `uTime`; the level is `uRain` (Stage 2 writes it; Task 3.8 keeps writing it). When `uRain` is 0 every vertex collapses off screen.

**Files:**
- Create: `src/gl/rainGeometry.ts`, `src/gl/rainGeometry.test.ts`, `src/gl/shaders/rain.ts`, `src/gl/Rain.tsx`

**Interfaces:**
- Consumes: `mulberry32(seed)` (`@/valley/rng`), `CAMERA_LANDSCAPE`, `CAMERA_PORTRAIT` (`@/valley/layout`), `PALETTE.rain`, `ALPHA.rain`.
- Produces:
  - `RAIN = { count: 1500, width: 60, height: 30, depth: 40, speed: 18, streak: 0.6, seed: 0x7a1d } as const`
  - `buildRainArrays(): { positions: Float32Array; ends: Float32Array }`
  - `buildRainGeometry(): THREE.BufferGeometry` (attributes `position`, `aEnd`)
  - `rainY(y0: number, time: number, end: number): number` (the shader's fall, mirrored for tests)
  - `RAIN_VERT`, `RAIN_FRAG`
  - `createRainMaterial(rain: { value: number }, time: { value: number }): THREE.ShaderMaterial`, `Rain(props: { rain: { value: number }; time: { value: number } })` (mounted in Task 3.11 with `uniforms.uRain` and `uniforms.uTime`)

- [ ] **Step 1: Write the failing test `src/gl/rainGeometry.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { RAIN, buildRainArrays, buildRainGeometry, rainY } from './rainGeometry';

describe('rain (spec §6)', () => {
  it('is 1,500 two-vertex segments inside the 60 × 30 × 40 box', () => {
    const { positions, ends } = buildRainArrays();
    expect(positions.length).toBe(RAIN.count * 2 * 3);
    expect(ends.length).toBe(RAIN.count * 2);
    for (let v = 0; v < RAIN.count * 2; v++) {
      expect(Math.abs(positions[v * 3])).toBeLessThanOrEqual(RAIN.width / 2);
      expect(positions[v * 3 + 1]).toBeGreaterThanOrEqual(0);
      expect(positions[v * 3 + 1]).toBeLessThanOrEqual(RAIN.height);
      expect(Math.abs(positions[v * 3 + 2])).toBeLessThanOrEqual(RAIN.depth / 2);
      expect(ends[v]).toBe(v % 2);
    }
    expect(buildRainGeometry().getAttribute('aEnd').count).toBe(RAIN.count * 2);
  });

  it('both vertices of a drop share x, seed height and z', () => {
    const { positions } = buildRainArrays();
    for (let i = 0; i < RAIN.count; i++) {
      for (let c = 0; c < 3; c++) expect(positions[i * 6 + c]).toBe(positions[i * 6 + 3 + c]);
    }
  });

  it('is deterministic', () => {
    expect(buildRainArrays().positions).toEqual(buildRainArrays().positions);
  });

  it('falls at 18 units/s and wraps inside the box without stretching a drop', () => {
    expect(rainY(20, 0, 0) - rainY(20, 0.1, 0)).toBeCloseTo(1.8, 5);
    for (let time = 0; time < 10; time += 0.37) {
      const top = rainY(3, time, 0);
      const bottom = rainY(3, time, 1);
      expect(top).toBeGreaterThanOrEqual(-RAIN.height / 2);
      expect(top).toBeLessThan(RAIN.height / 2);
      expect(top - bottom).toBeCloseTo(RAIN.streak, 5);
    }
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/gl/rainGeometry.test.ts`
Expected: FAIL, `Failed to resolve import "./rainGeometry"`.

- [ ] **Step 3: Write `src/gl/rainGeometry.ts`**

```ts
// Rain's pure part (spec §6): 1,500 drops seeded in a 60 × 30 × 40 box centred on the camera (x and z centred on 0,
// seed height 0..30). The shader moves them; rainY mirrors its fall so the wrap is tested in Node.
import * as THREE from 'three';
import { mulberry32 } from '@/valley/rng';

export const RAIN = { count: 1500, width: 60, height: 30, depth: 40, speed: 18, streak: 0.6, seed: 0x7a1d } as const;

export function buildRainArrays(): { positions: Float32Array; ends: Float32Array } {
  const rng = mulberry32(RAIN.seed);
  const positions = new Float32Array(RAIN.count * 6);
  const ends = new Float32Array(RAIN.count * 2);
  for (let i = 0; i < RAIN.count; i++) {
    const x = (rng() - 0.5) * RAIN.width;
    const y = rng() * RAIN.height;
    const z = (rng() - 0.5) * RAIN.depth;
    positions.set([x, y, z, x, y, z], i * 6);
    ends[i * 2] = 0;
    ends[i * 2 + 1] = 1;
  }
  return { positions, ends };
}

export function buildRainGeometry(): THREE.BufferGeometry {
  const { positions, ends } = buildRainArrays();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('aEnd', new THREE.BufferAttribute(ends, 1));
  return g;
}

/** GLSL mod(y0 - time·speed, height) - height/2 - end·streak. */
export function rainY(y0: number, time: number, end: number): number {
  const h = RAIN.height;
  const x = y0 - time * RAIN.speed;
  return x - h * Math.floor(x / h) - h / 2 - end * RAIN.streak;
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run src/gl/rainGeometry.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write `src/gl/shaders/rain.ts`**

```ts
// Rain (spec §6): both vertices of a drop wrap together; the bottom vertex trails by the streak length. uRain = 0
// collapses every vertex off screen. Not an emitter, no additive blending.
export const RAIN_VERT = /* glsl */ `
uniform float uTime;
uniform float uRain;
uniform float uSpeed;
uniform float uHeight;
uniform float uStreak;
attribute float aEnd;
void main() {
  if ( uRain < 0.001 ) {
    gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 );
    return;
  }
  vec3 p = position;
  p.y = mod( p.y - uTime * uSpeed, uHeight ) - 0.5 * uHeight - aEnd * uStreak;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( p, 1.0 );
}
`;

export const RAIN_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uAlpha;
uniform float uRain;
void main() {
  gl_FragColor = vec4( uColor, uAlpha * uRain );
  #include <colorspace_fragment>
}
`;
```

- [ ] **Step 6: Write `src/gl/Rain.tsx`**

```tsx
'use client';
// Rain (spec §6, §11): one LineSegments draw centred on the camera for the current aspect. Scene mounts it only on the
// desktop tier and not under reduced motion (Task 3.11). uRain and uTime are the driver's holders.
import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ALPHA, PALETTE } from '@/valley/palette';
import { CAMERA_LANDSCAPE, CAMERA_PORTRAIT } from '@/valley/layout';
import { RAIN, buildRainGeometry } from './rainGeometry';
import { RAIN_FRAG, RAIN_VERT } from './shaders/rain';

export function createRainMaterial(rain: { value: number }, time: { value: number }): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: RAIN_VERT,
    fragmentShader: RAIN_FRAG,
    uniforms: {
      uRain: rain,
      uTime: time,
      uSpeed: { value: RAIN.speed },
      uHeight: { value: RAIN.height },
      uStreak: { value: RAIN.streak },
      uColor: { value: new THREE.Color(PALETTE.rain) },
      uAlpha: { value: ALPHA.rain },
    },
    transparent: true,
    depthWrite: false,
  });
}

export function Rain({ rain, time }: { rain: { value: number }; time: { value: number } }) {
  const geometry = useMemo(() => buildRainGeometry(), []);
  const material = useMemo(() => createRainMaterial(rain, time), [rain, time]);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const origin = width < height ? CAMERA_PORTRAIT.position : CAMERA_LANDSCAPE.position;
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <lineSegments
      geometry={geometry}
      material={material}
      position={[origin[0], origin[1], origin[2]]}
      frustumCulled={false}
    />
  );
}
```

- [ ] **Step 7: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/gl/Rain.tsx src/gl/rainGeometry.ts src/gl/shaders/rain.ts`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/gl/rainGeometry.ts src/gl/rainGeometry.test.ts src/gl/shaders/rain.ts src/gl/Rain.tsx
git commit -m "Add rain as one line-segments draw around the camera"
```

**Verify:**
- `npx vitest run src/gl/rainGeometry.test.ts` passes; `npx tsc --noEmit` clean.
- `grep -n "AdditiveBlending\|emissive" src/gl/Rain.tsx src/gl/shaders/rain.ts` prints nothing.

---

### Task 3.5: Ridge counter with the seeded digit scramble **[parallel-safe]**

Spec §3.1 · 02 (counter `{n} trades`, n = round(reveal × facts.kalshi.trades / 10) × 10 with `toLocaleString('en-US')`, capped at the fact, counts with the reveal), §2 (reveals latch), §9 (the counter scramble-decodes digits only, seeded, deterministic, run only while the value changes), §11 (reduced motion: cuts, so no scramble), §6 (no React state on the scroll path).

The counter reads the latched ridge reveal through `LIVE.ridge`, a module-level number the Driver writes every frame (Task 3.8), the same pattern as `PROJECTED` and `LABEL_ALPHA`; the module imports nothing from three, so the site chunk stays three-free. While `LIVE.ridge` is 0 (no WebGL, or before the first frame, or before the trickle) the counter keeps Stage 0's server-rendered `30,000 trades`, which is the true figure for the no-GL tier.

**Files:**
- Create: `src/gl/live.ts`, `src/site/counterText.ts`, `src/site/counterText.test.ts`
- Modify: `src/site/Counter.tsx` (replace Stage 0's static body)

**Interfaces:**
- Consumes: `facts.kalshi.trades`, `copy.kalshi.counter(n: number): string`, `mulberry32` (`@/valley/rng`), `useScroll().reducedMotion`.
- Produces:
  - `LIVE: { ridge: number }` (`src/gl/live.ts`; Task 3.8 writes it)
  - `counterValue(reveal: number, trades: number): number`
  - `SCRAMBLE_MS = 320`, `SCRAMBLE_TICKS = 12`
  - `scrambleDigits(text: string, phase: number, seed: number): string`
  - `Counter()` (still `p.mono.ink-dim.mt-2[data-counter]`, Stage 0's DOM hook)

- [ ] **Step 1: Write the failing test `src/site/counterText.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { copy } from './copy';
import { counterValue, scrambleDigits } from './counterText';

describe('counterValue (spec §3.1 · 02)', () => {
  it('rounds reveal × trades to tens', () => {
    expect(counterValue(0.01, 30000)).toBe(300);
    expect(counterValue(0.5, 30000)).toBe(15000);
    expect(counterValue(0.123456, 30000)).toBe(3700);
    expect(counterValue(1, 30000)).toBe(30000);
  });
  it('is capped at the fact and never negative', () => {
    expect(counterValue(1.2, 30000)).toBe(30000);
    expect(counterValue(-0.5, 30000)).toBe(0);
  });
  it('prints through the copy string', () => {
    expect(copy.kalshi.counter(counterValue(1, 30000))).toBe('30,000 trades');
  });
});

describe('scrambleDigits (spec §9)', () => {
  it('returns the text unchanged at phase 1', () => {
    expect(scrambleDigits('30,000 trades', 1, 30000)).toBe('30,000 trades');
  });
  it('replaces only digits and keeps length, separators and words', () => {
    const s = scrambleDigits('30,000 trades', 0, 30000);
    expect(s).toHaveLength(13);
    expect(s[2]).toBe(',');
    expect(s.slice(6)).toBe(' trades');
    expect(s.slice(0, 6).replace(',', '')).toMatch(/^[0-9]{5}$/);
  });
  it('resolves digits left to right as phase rises', () => {
    expect(scrambleDigits('30,000 trades', 0.5, 30000).slice(0, 2)).toBe('30');
  });
  it('is deterministic for the same text, phase and seed', () => {
    expect(scrambleDigits('12,340 trades', 0.3, 12340)).toBe(scrambleDigits('12,340 trades', 0.3, 12340));
  });
  it('leaves text without digits alone', () => {
    expect(scrambleDigits('about', 0, 1)).toBe('about');
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/site/counterText.test.ts`
Expected: FAIL, `Failed to resolve import "./counterText"`.

- [ ] **Step 3: Write `src/site/counterText.ts` and `src/gl/live.ts`**

`src/site/counterText.ts`:

```ts
// The ridge counter's pure part (spec §3.1 · 02, §9): the number from the latched reveal, and the seeded digit scramble
// that runs only while the number changes.
import { mulberry32 } from '@/valley/rng';

export const SCRAMBLE_MS = 320;
export const SCRAMBLE_TICKS = 12;

export function counterValue(reveal: number, trades: number): number {
  const r = Math.min(1, Math.max(0, reveal));
  return Math.min(trades, Math.round((r * trades) / 10) * 10);
}

/** Digit k of D resolves once phase >= (k + 1) / D; unresolved digits are seeded noise that changes SCRAMBLE_TICKS times. */
export function scrambleDigits(text: string, phase: number, seed: number): string {
  let digits = 0;
  for (const ch of text) if (ch >= '0' && ch <= '9') digits++;
  if (digits === 0 || phase >= 1) return text;
  const tick = Math.floor(Math.max(0, phase) * SCRAMBLE_TICKS);
  let k = 0;
  let out = '';
  for (const ch of text) {
    if (ch < '0' || ch > '9') {
      out += ch;
      continue;
    }
    if (phase >= (k + 1) / digits) {
      out += ch;
    } else {
      const rng = mulberry32((seed ^ Math.imul(k + 1, 0x9e3779b1) ^ tick) >>> 0);
      out += String(Math.floor(rng() * 10));
    }
    k++;
  }
  return out;
}
```

`src/gl/live.ts`:

```ts
// Per-frame values the DOM reads in its own rAF, written by Driver.tsx (spec §6: React never re-renders on scroll).
// No three import, so site components can read it without pulling three into their chunk.
export const LIVE: { ridge: number } = { ridge: 0 };
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run src/site/counterText.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Replace the body of `src/site/Counter.tsx`**

```tsx
'use client';
// The ridge counter (spec §3.1 · 02, §9): reads the latched ridge reveal from LIVE in its own rAF loop (no React state
// on the scroll path), scrambles digits for SCRAMBLE_MS after each change, and writes only when the text differs.
// The server render and the no-GL tier keep the full count.
import { useEffect, useRef } from 'react';
import { facts } from '@/valley/facts';
import { LIVE } from '@/gl/live';
import { useScroll } from '@/scroll/ScrollProvider';
import { copy } from './copy';
import { SCRAMBLE_MS, counterValue, scrambleDigits } from './counterText';

export function Counter() {
  const ref = useRef<HTMLParagraphElement>(null);
  const { reducedMotion } = useScroll();

  useEffect(() => {
    let raf = 0;
    let shown = -1;
    let target = '';
    let changedAt = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const el = ref.current;
      if (!el || LIVE.ridge <= 0) return;
      const n = counterValue(LIVE.ridge, facts.kalshi.trades);
      if (n !== shown) {
        shown = n;
        target = copy.kalshi.counter(n);
        changedAt = now;
      }
      const phase = reducedMotion ? 1 : Math.min(1, (now - changedAt) / SCRAMBLE_MS);
      const text = phase >= 1 ? target : scrambleDigits(target, phase, n);
      if (el.textContent !== text) el.textContent = text;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  return (
    <p ref={ref} className="mono ink-dim mt-2" data-counter>
      {copy.kalshi.counter(facts.kalshi.trades)}
    </p>
  );
}
```

- [ ] **Step 6: Typecheck, lint, site tests**

Run: `npx tsc --noEmit && npx eslint src/site/Counter.tsx src/site/counterText.ts src/gl/live.ts && npx vitest run src/site`
Expected: exit 0; Stage 0's copy and section tests still pass.

- [ ] **Step 7: Commit**

```bash
git add src/gl/live.ts src/site/counterText.ts src/site/counterText.test.ts src/site/Counter.tsx
git commit -m "Wire the ridge counter to the latched reveal with a seeded digit scramble"
```

**Verify:**
- `npx vitest run src/site/counterText.test.ts` passes.
- `grep -n "useState\|getBoundingClientRect" src/site/Counter.tsx` prints nothing; `grep -n "from 'three'" src/gl/live.ts src/site/Counter.tsx` prints nothing.
- `grep -n "<Counter" src/site/sections/Kalshi.tsx` prints one line (Stage 0 placed it under the ridge figure; this task does not move it).

---

### Task 3.6: Intro gate, T0 and the still overrides

Spec §7 (the end of the 200 ms canvas fade is T0 and the chain starts, unless `sessionStorage.introPlayed` is set, then every light is already in its final state), §2 and §11 (storage optional: with storage blocked the chain plays every load, no errors), §10 (`?still=1` sets `introPlayed`; the driver reads a `?g=` override when `still=1`), §11 (reduced motion: no chain, final states at T0), §5.3 (reduced motion or `introPlayed`: the schedule is empty), §14 G2 (stills at exact times after T0). Index Review Focus 4.

Stage 2's warm-up already resolves T0 into the `t0` ref and its Driver passes `now − T0` as `introT`. This task gates that clock. Readings taken: `introPlayed` is written at T0, so a reload mid-chain does not replay it; `?t=<seconds>` with `still=1` pins the chain clock for the G2 stills; `?g=<0..1>` with `still=1` pins `g` (Stage 5 Task 5.8 later adds the hidden DOM and absorbs this parser); `introT` is `0` while the canvas is still fading in (so the canvas fades in on a dark valley, spec §7) and `null` once the chain and its labels are over (`CHAIN_END + 2` s) or when it does not play.

**Files:**
- Create: `src/gl/introGate.ts`, `src/gl/introGate.test.ts`
- Modify: `src/gl/Driver.tsx`

**Interfaces:**
- Consumes: `CHAIN_END` (`@/valley/ignition`), Stage 2's `t0` ref, `setFrameInputs`, `useScroll().reducedMotion`.
- Produces:
  - `INTRO_KEY = 'introPlayed'`, `INTRO_TAIL = 2.0`
  - `interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }`, `type StorageGetter = () => StorageLike | null`, `sessionStore: StorageGetter`
  - `readIntroPlayed(get: StorageGetter): boolean`, `markIntroPlayed(get: StorageGetter): void`
  - `interface StillParams { still: boolean; g: number | null; t: number | null }`, `stillParams(search: string): StillParams`
  - `shouldPlayIntro(o: { reducedMotion: boolean; introPlayed: boolean; still: StillParams }): boolean`
  - `introClock(play: boolean, t0: number | null, now: number, stillT: number | null): number | null`

- [ ] **Step 1: Write the failing test `src/gl/introGate.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { CHAIN_END } from '@/valley/ignition';
import {
  INTRO_KEY, INTRO_TAIL, introClock, markIntroPlayed, readIntroPlayed, shouldPlayIntro, stillParams,
  type StorageLike,
} from './introGate';

function memory(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}
const throwingGetter = (): StorageLike | null => {
  throw new Error('SecurityError');
};
const throwingStore: StorageLike = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

describe('introPlayed (spec §7, §11)', () => {
  it('is false until marked, then true', () => {
    const s = memory();
    expect(readIntroPlayed(() => s)).toBe(false);
    markIntroPlayed(() => s);
    expect(s.data.get(INTRO_KEY)).toBe('1');
    expect(readIntroPlayed(() => s)).toBe(true);
  });
  it('treats blocked storage as not played and never throws (Review Focus 4)', () => {
    expect(readIntroPlayed(throwingGetter)).toBe(false);
    expect(() => markIntroPlayed(throwingGetter)).not.toThrow();
    expect(readIntroPlayed(() => throwingStore)).toBe(false);
    expect(() => markIntroPlayed(() => throwingStore)).not.toThrow();
    expect(readIntroPlayed(() => null)).toBe(false);
  });
});

describe('stillParams (spec §10, §14)', () => {
  it('reads g and t only with still=1', () => {
    expect(stillParams('?still=1&t=2.6')).toEqual({ still: true, g: null, t: 2.6 });
    expect(stillParams('?still=1&g=0.42')).toEqual({ still: true, g: 0.42, t: null });
    expect(stillParams('?t=2.6&g=0.5')).toEqual({ still: false, g: null, t: null });
  });
  it('rejects junk, clamps t to >= 0 and g to 0..1', () => {
    expect(stillParams('?still=1&t=abc&g=')).toEqual({ still: true, g: null, t: null });
    expect(stillParams('?still=1&t=-3&g=1.7')).toEqual({ still: true, g: 1, t: 0 });
  });
});

describe('shouldPlayIntro (spec §5.3, §7, §11)', () => {
  const live = { still: false, g: null, t: null };
  it('plays on a fresh tab', () => {
    expect(shouldPlayIntro({ reducedMotion: false, introPlayed: false, still: live })).toBe(true);
  });
  it('does not play once played or under reduced motion', () => {
    expect(shouldPlayIntro({ reducedMotion: false, introPlayed: true, still: live })).toBe(false);
    expect(shouldPlayIntro({ reducedMotion: true, introPlayed: false, still: live })).toBe(false);
  });
  it('in still mode plays only when t pins it', () => {
    expect(shouldPlayIntro({ reducedMotion: false, introPlayed: true, still: { still: true, g: 0, t: 1.9 } })).toBe(true);
    expect(shouldPlayIntro({ reducedMotion: false, introPlayed: true, still: { still: true, g: 0, t: null } })).toBe(false);
  });
});

describe('introClock', () => {
  it('is null when the chain does not play', () => {
    expect(introClock(false, null, 5, null)).toBeNull();
  });
  it('holds at 0 until T0, then counts seconds since T0', () => {
    expect(introClock(true, null, 5, null)).toBe(0);
    expect(introClock(true, 2, 3.5, null)).toBeCloseTo(1.5, 9);
  });
  it('ends after the chain and its labels', () => {
    expect(introClock(true, 2, 2 + CHAIN_END + INTRO_TAIL - 0.01, null)).not.toBeNull();
    expect(introClock(true, 2, 2 + CHAIN_END + INTRO_TAIL + 0.01, null)).toBeNull();
  });
  it('returns the pinned still time whatever else is set', () => {
    expect(introClock(false, null, 99, 2.6)).toBe(2.6);
    expect(introClock(true, 1, 99, 3.7)).toBe(3.7);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/gl/introGate.test.ts`
Expected: FAIL, `Failed to resolve import "./introGate"`.

- [ ] **Step 3: Write `src/gl/introGate.ts`**

```ts
// The intro gate (spec §7, §10, §11): whether the ignition chain plays in this tab, the still overrides the gates use
// (?still=1 with ?g= and ?t=), and the chain clock the Driver passes as FrameInputs.introT. Every storage access is
// inside try/catch: with storage blocked the chain plays every load and nothing throws.
import { CHAIN_END } from '@/valley/ignition';

export const INTRO_KEY = 'introPlayed';
/** Seconds after CHAIN_END until the clock returns null (the last label is gone at 5.6 s). */
export const INTRO_TAIL = 2.0;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export type StorageGetter = () => StorageLike | null;

/** Reading window.sessionStorage itself can throw (blocked site data), so callers only touch it inside try. */
export const sessionStore: StorageGetter = () => (typeof window === 'undefined' ? null : window.sessionStorage);

export function readIntroPlayed(get: StorageGetter): boolean {
  try {
    const s = get();
    return s !== null && s.getItem(INTRO_KEY) !== null;
  } catch {
    return false;
  }
}

export function markIntroPlayed(get: StorageGetter): void {
  try {
    get()?.setItem(INTRO_KEY, '1');
  } catch {
    // storage blocked: the chain plays again on the next load (spec §11)
  }
}

export interface StillParams {
  still: boolean;
  g: number | null;
  t: number | null;
}

function num(q: URLSearchParams, key: string): number | null {
  const raw = q.get(key);
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function stillParams(search: string): StillParams {
  const q = new URLSearchParams(search);
  if (q.get('still') !== '1') return { still: false, g: null, t: null };
  const g = num(q, 'g');
  const t = num(q, 't');
  return { still: true, g: g === null ? null : Math.min(1, Math.max(0, g)), t: t === null ? null : Math.max(0, t) };
}

export function shouldPlayIntro(o: { reducedMotion: boolean; introPlayed: boolean; still: StillParams }): boolean {
  if (o.still.still) return o.still.t !== null;
  if (o.reducedMotion) return false;
  return !o.introPlayed;
}

export function introClock(play: boolean, t0: number | null, now: number, stillT: number | null): number | null {
  if (stillT !== null) return stillT;
  if (!play) return null;
  if (t0 === null) return 0;
  const elapsed = now - t0;
  return elapsed > CHAIN_END + INTRO_TAIL ? null : Math.max(0, elapsed);
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run src/gl/introGate.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Gate the clock in `src/gl/Driver.tsx`**

Change the react import to `import { useEffect, useMemo, useRef, type RefObject } from 'react';` and add:

```ts
import { introClock, markIntroPlayed, readIntroPlayed, sessionStore, shouldPlayIntro, stillParams } from './introGate';
```

In the component body, after `const frame = useRef<Frame | null>(null);`:

```ts
const still = useMemo(() => stillParams(typeof window === 'undefined' ? '' : window.location.search), []);
const playIntro = useRef(false);
const marked = useRef(false);
useEffect(() => {
  if (still.still) markIntroPlayed(sessionStore);
  playIntro.current = shouldPlayIntro({ reducedMotion, introPlayed: readIntroPlayed(sessionStore), still });
}, [reducedMotion, still]);
```

In the `useFrame` callback, replace the `setFrameInputs(...)` line with:

```ts
    if (playIntro.current && start !== null && !marked.current) {
      marked.current = true;
      if (!still.still) markIntroPlayed(sessionStore);
    }
    const introT = introClock(playIntro.current, start, now, still.t);
    setFrameInputs(f.inputs, s.g, s.ranges, now, delta, introT, reducedMotion, rig.portrait);
    if (still.g !== null) f.inputs.g = still.g;
```

- [ ] **Step 6: Typecheck, lint, full tests**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: exit 0, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/gl/introGate.ts src/gl/introGate.test.ts src/gl/Driver.tsx
git commit -m "Gate the ignition clock on introPlayed and add the still overrides"
```

**Verify:**
- `npx vitest run src/gl/introGate.test.ts` passes, including the blocked-storage test (Review Focus 4).
- `grep -rn "sessionStorage" src --include=*.ts --include=*.tsx` prints only `src/gl/introGate.ts`.
- `npm run dev`, open `http://localhost:3000/` in a fresh tab; a second after the canvas appears, devtools `sessionStorage.getItem('introPlayed')` returns `'1'`. In a private window with site data blocked the page loads with no console errors.

---

### Task 3.7: Ignition levels, label fades and the Stage 3 light block

Spec §5.3 (the schedule and `ignitionLevel`; reduced motion or `introPlayed`: every target in its final state), §1 (the chain from dark; the mill ends dark), §3.1 · 01 (the seven ignition labels, near each light as it catches, fade out after 1.6 s), §6 (labels from the driver's projected positions), §4.7 (the visitor's light only when a house exists), §12 (no allocation in the frame loop), §14 G2 (labels gone by 7 s).

This task adds `src/gl/lightsFrame.ts`, the one function `applyFrame` calls to fill `targets.lit`, and `writeLabelAlpha`, which the Driver calls to fill Stage 2's `LABEL_ALPHA` (so `Labels.tsx` needs no change). Final states: every emitter 1 except the mill (0: darch ended; Task 3.9 drives it from `darchT`) and the visitor (1 only when `buildT !== null`); the ridge emitter is always 1 (its visibility is the reveal). A label fades in over 0.2 s from its light's `at`, holds until 1.6 s and fades out over 0.4 s; it times from the first light of its group (`bar1` for the bars label anchored at `bar2`, `hill1` for the hillside label anchored at `hill2`), so the last is gone at 5.6 s.

**Files:**
- Create: `src/gl/chain.ts`, `src/gl/chain.test.ts`, `src/gl/lightsFrame.ts`, `src/gl/lightsFrame.test.ts`, `src/gl/frameFixture.ts`, `src/gl/driverLights.test.ts`
- Modify: `src/gl/driverCore.ts` (extend `ValleyUniforms`, `REST_LIT`'s mill, call `applyLights`), `src/gl/Driver.tsx` (write `LABEL_ALPHA`)

**Interfaces:**
- Consumes: `EMITTERS` (`@/valley/lights`), `ignitionSchedule()`, `ignitionLevel(step, t)` (`@/valley/ignition`), `IgnitionStep`, `EmitterId`, `SECTIONS`, `sectionRanges`, `EMITTER_INDEX`, `LABEL_ALPHA` (`./projection`), `LABEL_ANCHORS` (`@/site/labelItems`), `Uniform`, `ValleyUniforms`, `FrameInputs`, `createUniforms`, `createFrameTargets`, `applyFrame`, `REST_LIT`.
- Produces:
  - `stepFor(target: EmitterId): IgnitionStep`
  - `writeChainLevels(introT: number | null, visitorPresent: boolean, lit: Float32Array): void`
  - `LABEL_FADE_IN = 0.2`, `LABEL_HOLD = 1.6`, `LABEL_FADE_OUT = 0.4`, `labelTiming(anchor: EmitterId): EmitterId`, `labelAlpha(anchor: EmitterId, introT: number | null): number`, `writeLabelAlpha(introT: number | null, out: Float32Array): void`
  - `interface LightUniforms { uRidgeLit: Uniform<number>; uMillRows: Uniform<THREE.Vector4>; uWheelAngle: Uniform<number> }`, `createLightUniforms(): LightUniforms`; `ValleyUniforms extends LightUniforms`
  - `applyLights(inputs: FrameInputs, u: ValleyUniforms, lit: Float32Array): void` (this task's signature; Task 3.8 widens it)
  - test helpers in `src/gl/frameFixture.ts`: `fixtureRanges(vh?: number): SectionRange[]`, `gAt(ranges: SectionRange[], id: SectionId, s: number): number`, `fixtureInputs(ranges: SectionRange[], over?: Partial<FrameInputs>): FrameInputs`

- [ ] **Step 1: Write the test fixture `src/gl/frameFixture.ts`**

```ts
// Test helpers for the Stage 3 frame tests (not a test file itself): section ranges for a document laid out at the
// spec §3 heights, g at a section-local s, and a FrameInputs with defaults.
import { SECTIONS, sectionRanges } from '@/valley/sections';
import type { SectionId, SectionRange } from '@/valley/types';
import type { FrameInputs } from './driverCore';

export function fixtureRanges(vh = 900): SectionRange[] {
  const tops: number[] = [];
  let y = 0;
  for (const s of SECTIONS) {
    tops.push(y);
    y += (s.heightVh * vh) / 100;
  }
  return sectionRanges(tops, y, vh);
}

export function gAt(ranges: SectionRange[], id: SectionId, s: number): number {
  const r = ranges.find((x) => x.id === id);
  if (!r) throw new Error(`no range for ${id}`);
  return r.start + s * (r.end - r.start);
}

export function fixtureInputs(ranges: SectionRange[], over: Partial<FrameInputs> = {}): FrameInputs {
  return {
    g: 0, ranges, t: 10, dt: 1 / 60, introT: null, buildT: null, pulseT: null, flickerT: null, reducedMotion: false,
    ...over,
  };
}
```

- [ ] **Step 2: Write the failing test `src/gl/chain.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { EMITTERS } from '@/valley/lights';
import { CHAIN_END, ignitionLevel, ignitionSchedule } from '@/valley/ignition';
import type { EmitterId } from '@/valley/types';
import { LABEL_ANCHORS } from '@/site/labelItems';
import { EMITTER_INDEX } from './projection';
import {
  LABEL_FADE_IN, LABEL_FADE_OUT, LABEL_HOLD, labelAlpha, labelTiming, stepFor, writeChainLevels, writeLabelAlpha,
} from './chain';

const fresh = () => new Float32Array(EMITTERS.length);

describe('writeChainLevels (spec §5.3)', () => {
  it('final state: everything lit but the mill; the visitor only with a house', () => {
    const lit = fresh();
    writeChainLevels(null, false, lit);
    for (const e of EMITTERS) {
      expect(lit[EMITTER_INDEX[e.id]]).toBe(e.id === 'mill' || e.id === 'visitor' ? 0 : 1);
    }
    writeChainLevels(null, true, lit);
    expect(lit[EMITTER_INDEX.visitor]).toBe(1);
  });

  it('is dark at T0 except the ridge emitter, whose reveal is still 0', () => {
    const lit = fresh();
    writeChainLevels(0, true, lit);
    for (const e of EMITTERS) expect(lit[EMITTER_INDEX[e.id]]).toBe(e.id === 'ridge' ? 1 : 0);
  });

  it('follows ignitionLevel for every scheduled target at the G2 times', () => {
    const lit = fresh();
    for (const t of [1.0, 1.9, 2.6, 3.2, 3.7, 5.0]) {
      writeChainLevels(t, true, lit);
      for (const step of ignitionSchedule()) {
        if (step.target === 'ridge') continue;
        expect(lit[EMITTER_INDEX[step.target]]).toBeCloseTo(ignitionLevel(step, t), 5);
      }
    }
  });

  it('catches in build order: hut, nist, mill, kalshiLamp, wvu, bar1', () => {
    const lit = fresh();
    const firstLit = (id: EmitterId): number => {
      for (let ms = 0; ms <= CHAIN_END * 1000; ms++) {
        writeChainLevels(ms / 1000, true, lit);
        if (lit[EMITTER_INDEX[id]] > 0) return ms;
      }
      return Number.POSITIVE_INFINITY;
    };
    const times = (['hut', 'nist', 'mill', 'kalshiLamp', 'wvu', 'bar1'] as EmitterId[]).map(firstLit);
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThan(times[i - 1]);
  });
});

describe('ignition labels (spec §3.1 · 01, §14 G2)', () => {
  const anchors = Object.values(LABEL_ANCHORS) as EmitterId[];

  it('times the bars and hillside labels from the first light of their group', () => {
    expect(labelTiming('bar2')).toBe('bar1');
    expect(labelTiming('hill2')).toBe('hill1');
    expect(labelTiming('hut')).toBe('hut');
  });

  it('fades in over 0.2 s, holds to 1.6 s, fades out over 0.4 s', () => {
    for (const a of anchors) {
      const at = stepFor(labelTiming(a)).at;
      expect(labelAlpha(a, at - 0.01)).toBe(0);
      expect(labelAlpha(a, at + LABEL_FADE_IN / 2)).toBeCloseTo(0.5, 6);
      expect(labelAlpha(a, at + 1.0)).toBe(1);
      expect(labelAlpha(a, at + LABEL_HOLD + LABEL_FADE_OUT / 2)).toBeCloseTo(0.5, 6);
      expect(labelAlpha(a, at + LABEL_HOLD + LABEL_FADE_OUT + 0.001)).toBe(0);
    }
  });

  it('writes only the anchors, nothing when the chain is not playing, nothing by 7 s', () => {
    const out = fresh();
    writeLabelAlpha(stepFor('hut').at + 1.0, out);
    expect(out[EMITTER_INDEX.hut]).toBe(1);
    expect(out[EMITTER_INDEX.ridge]).toBe(0);
    expect(out[EMITTER_INDEX.bar1]).toBe(0);
    writeLabelAlpha(null, out);
    for (const v of out) expect(v).toBe(0);
    writeLabelAlpha(7.0, out);
    for (const v of out) expect(v).toBe(0);
  });
});
```

- [ ] **Step 3: Run it and see it fail**

Run: `npx vitest run src/gl/chain.test.ts`
Expected: FAIL, `Failed to resolve import "./chain"`.

- [ ] **Step 4: Write `src/gl/chain.ts`**

```ts
// The hero chain's lights and labels (spec §5.3, §3.1 · 01). writeChainLevels fills `lit` (EMITTERS order) from the
// ignition schedule, or with final states when introT is null; writeLabelAlpha fills LABEL_ALPHA for Labels.tsx.
// Both are allocation-free per call.
import { EMITTERS } from '@/valley/lights';
import { ignitionLevel, ignitionSchedule } from '@/valley/ignition';
import type { EmitterId, IgnitionStep } from '@/valley/types';
import { LABEL_ANCHORS } from '@/site/labelItems';
import { EMITTER_INDEX } from './projection';

const SCHEDULE: readonly IgnitionStep[] = ignitionSchedule();
const STEP_EMITTER: Int32Array = Int32Array.from(SCHEDULE, (s) => EMITTER_INDEX[s.target]);
const N = EMITTERS.length;

export function stepFor(target: EmitterId): IgnitionStep {
  const s = SCHEDULE.find((x) => x.target === target);
  if (!s) throw new Error(`no ignition step for ${target}`);
  return s;
}

export function writeChainLevels(introT: number | null, visitorPresent: boolean, lit: Float32Array): void {
  if (introT === null) {
    lit.fill(1);
    lit[EMITTER_INDEX.mill] = 0;
  } else {
    lit.fill(0);
    for (let i = 0; i < SCHEDULE.length; i++) {
      const step = SCHEDULE[i];
      if (step.target === 'ridge') continue;
      lit[STEP_EMITTER[i]] = ignitionLevel(step, introT);
    }
  }
  lit[EMITTER_INDEX.ridge] = 1;
  if (!visitorPresent) lit[EMITTER_INDEX.visitor] = 0;
}

export const LABEL_FADE_IN = 0.2;
export const LABEL_HOLD = 1.6;
export const LABEL_FADE_OUT = 0.4;

const GROUP_FIRST: Partial<Record<EmitterId, EmitterId>> = { bar2: 'bar1', hill2: 'hill1' };

/** The emitter whose catch a label anchored at `anchor` appears with. */
export function labelTiming(anchor: EmitterId): EmitterId {
  return GROUP_FIRST[anchor] ?? anchor;
}

const ANCHORS: readonly EmitterId[] = Object.values(LABEL_ANCHORS) as EmitterId[];
const ANCHOR_INDEX: Int32Array = Int32Array.from(ANCHORS, (a) => EMITTER_INDEX[a]);
const ANCHOR_AT: Float64Array = Float64Array.from(ANCHORS, (a) => stepFor(labelTiming(a)).at);
const AT_BY_EMITTER = new Float64Array(N).fill(Number.NaN);
for (let k = 0; k < ANCHORS.length; k++) AT_BY_EMITTER[ANCHOR_INDEX[k]] = ANCHOR_AT[k];

function alphaAt(at: number, introT: number | null): number {
  if (introT === null || Number.isNaN(at)) return 0;
  const dt = introT - at;
  if (dt < 0) return 0;
  if (dt < LABEL_FADE_IN) return dt / LABEL_FADE_IN;
  if (dt < LABEL_HOLD) return 1;
  if (dt < LABEL_HOLD + LABEL_FADE_OUT) return 1 - (dt - LABEL_HOLD) / LABEL_FADE_OUT;
  return 0;
}

export function labelAlpha(anchor: EmitterId, introT: number | null): number {
  return alphaAt(AT_BY_EMITTER[EMITTER_INDEX[anchor]], introT);
}

export function writeLabelAlpha(introT: number | null, out: Float32Array): void {
  out.fill(0);
  if (introT === null) return;
  for (let k = 0; k < ANCHOR_INDEX.length; k++) out[ANCHOR_INDEX[k]] = alphaAt(ANCHOR_AT[k], introT);
}
```

- [ ] **Step 5: Run it and see it pass**

Run: `npx vitest run src/gl/chain.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Write the failing tests `src/gl/lightsFrame.test.ts` and `src/gl/driverLights.test.ts`**

`src/gl/lightsFrame.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { EMITTERS } from '@/valley/lights';
import { ignitionLevel } from '@/valley/ignition';
import { EMITTER_INDEX } from './projection';
import { createUniforms } from './driverCore';
import { stepFor } from './chain';
import { applyLights } from './lightsFrame';
import { fixtureInputs, fixtureRanges } from './frameFixture';

const ranges = fixtureRanges();

describe('applyLights: ignition (spec §5.3)', () => {
  it('lights the hut from the schedule mid-chain and nothing ahead of it', () => {
    const u = createUniforms();
    const lit = new Float32Array(EMITTERS.length);
    applyLights(fixtureInputs(ranges, { introT: 1.0 }), u, lit);
    expect(lit[EMITTER_INDEX.hut]).toBeCloseTo(ignitionLevel(stepFor('hut'), 1.0), 5);
    expect(lit[EMITTER_INDEX.nist]).toBe(0);
    expect(u.uRidgeLit.value).toBe(1);
  });

  it('gives final states when the chain is not playing', () => {
    const u = createUniforms();
    const lit = new Float32Array(EMITTERS.length);
    applyLights(fixtureInputs(ranges, { introT: null, buildT: null }), u, lit);
    expect(lit[EMITTER_INDEX.hut]).toBe(1);
    expect(lit[EMITTER_INDEX.mill]).toBe(0);
    expect(lit[EMITTER_INDEX.visitor]).toBe(0);
    applyLights(fixtureInputs(ranges, { introT: null, buildT: 4.4 }), u, lit);
    expect(lit[EMITTER_INDEX.visitor]).toBe(1);
  });
});
```

`src/gl/driverLights.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { EMITTERS } from '@/valley/lights';
import { EMITTER_INDEX } from './projection';
import { REST_LIT, applyFrame, createFrameTargets } from './driverCore';
import { fixtureInputs, fixtureRanges } from './frameFixture';

const ranges = fixtureRanges();

describe('applyFrame runs the chain (spec §5.3, §7)', () => {
  it('is dark at T0, lit from the schedule, final when the chain is over', () => {
    const targets = createFrameTargets();
    applyFrame(fixtureInputs(ranges, { introT: 0 }), targets);
    for (const e of EMITTERS) if (e.id !== 'ridge') expect(targets.lit[EMITTER_INDEX[e.id]]).toBe(0);
    applyFrame(fixtureInputs(ranges, { introT: 1.0 }), targets);
    expect(targets.lit[EMITTER_INDEX.nist]).toBe(0);
    applyFrame(fixtureInputs(ranges, { introT: null }), targets);
    expect(Array.from(targets.lit)).toEqual(Array.from(REST_LIT));
  });

  it('keeps the mill dark at rest (spec §1, §4.5) and exposes the Stage 3 uniforms', () => {
    expect(REST_LIT[EMITTER_INDEX.mill]).toBe(0);
    const targets = createFrameTargets();
    expect(targets.uniforms.uRidgeLit.value).toBe(1);
    expect(targets.uniforms.uMillRows.value.x).toBe(0);
    expect(targets.uniforms.uWheelAngle.value).toBe(0);
  });
});
```

- [ ] **Step 7: Run them and see them fail**

Run: `npx vitest run src/gl/lightsFrame.test.ts src/gl/driverLights.test.ts`
Expected: FAIL, `Failed to resolve import "./lightsFrame"`; driverLights fails on the mill at rest and on `uRidgeLit` being undefined.

- [ ] **Step 8: Write `src/gl/lightsFrame.ts`**

```ts
// The Stage 3 light block (spec §4.2, §4.5, §4.6, §5.3, §5.6). applyFrame calls applyLights once per frame after it has
// evaluated the timeline; applyLights owns every write to `lit`. Allocation-free.
import * as THREE from 'three';
import type { FrameInputs, Uniform, ValleyUniforms } from './driverCore';
import { EMITTER_INDEX } from './projection';
import { writeChainLevels } from './chain';

export interface LightUniforms {
  uRidgeLit: Uniform<number>;            // the ridge emitter's level, pulse included
  uMillRows: Uniform<THREE.Vector4>;     // the mill's four row levels, bottom row in x
  uWheelAngle: Uniform<number>;          // radians, integrated on wall time
}

export function createLightUniforms(): LightUniforms {
  return {
    uRidgeLit: { value: 1 },
    uMillRows: { value: new THREE.Vector4(0, 0, 0, 0) },
    uWheelAngle: { value: 0 },
  };
}

export function applyLights(inputs: FrameInputs, u: ValleyUniforms, lit: Float32Array): void {
  writeChainLevels(inputs.introT, inputs.buildT !== null, lit);
  u.uRidgeLit.value = lit[EMITTER_INDEX.ridge];
}
```

- [ ] **Step 9: Wire it into `src/gl/driverCore.ts`**

1. Add `import { applyLights, createLightUniforms, type LightUniforms } from './lightsFrame';`.
2. Change `export interface ValleyUniforms {` to `export interface ValleyUniforms extends LightUniforms {`.
3. In `createUniforms()`, add `...createLightUniforms(),` as the first property of the returned object.
4. Change `REST_LIT` to keep the mill dark at rest:

```ts
export const REST_LIT: Float32Array = Float32Array.from(EMITTERS, (e) => (e.id === 'visitor' || e.id === 'mill' ? 0 : 1));
```

5. In `applyFrame`, replace the last line `writeRestLights(targets.lit);` with:

```ts
  applyLights(inputs, u, targets.lit);
```

(`writeRestLights` stays exported for Stage 2's tests.)

- [ ] **Step 10: Feed `LABEL_ALPHA` from `src/gl/Driver.tsx`**

Add `import { LABEL_ALPHA } from './projection';` (merge into the existing `./projection` import) and `import { writeLabelAlpha } from './chain';`. Directly after `applyFrame(f.inputs, f.targets);` add:

```ts
    writeLabelAlpha(f.inputs.introT, LABEL_ALPHA);
```

- [ ] **Step 11: Run the tests and see them pass**

Run: `npx vitest run src/gl`
Expected: PASS, including Stage 2's `driverCore.test.ts` (its "REST_LIT equals lit at rest" holds because both now keep the mill dark) and its zero-allocation test.

- [ ] **Step 12: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: exit 0.

- [ ] **Step 13: Commit**

```bash
git add src/gl/chain.ts src/gl/chain.test.ts src/gl/lightsFrame.ts src/gl/lightsFrame.test.ts src/gl/frameFixture.ts src/gl/driverLights.test.ts src/gl/driverCore.ts src/gl/Driver.tsx
git commit -m "Run the ignition chain in applyFrame and fade the ignition labels"
```

**Verify:**
- `npx vitest run src/gl` passes.
- `grep -n "applyLights(" src/gl/driverCore.ts` prints exactly one call; `grep -n "writeRestLights(targets" src/gl/driverCore.ts` prints nothing; `grep -n "writeLabelAlpha" src/gl/Driver.tsx` prints the import and one call.
- `npm run dev`, open `http://localhost:3000/?still=1&g=0&t=1.9`: the hut window and the nist cabin are lit, nothing else is, and the hut and nist labels show; `?still=1&g=0&t=5.0`: the hut, cabins, kalshi lamp, bars and hillside sites are lit and the mill is dark.

---

### Task 3.8: Latched ridge and hedge reveals, rain level

Spec §2 (reveals latch: `ridgeReveal` and `hedgeReveal` are running maxima, never un-draw), §4.6 (trickle 0 → 0.01 over 1.2 s; timeline `0.01 + 0.99 · easeInOut(s)` across 02, 1 after; driver writes `max(trickle, timeline, previous)`), §5.1 (`hedgeReveal` 0 before 03, `s` across 03, 1 after; the `rain` curve), §11 (reduced motion: no rain, cuts instead of eases for reveals), §16 (`applyFrame` writes `uReveal` from `g` and latches it). Index Review Focus 3.

Stage 2's `applyFrame` latches the timeline alone. This task moves the latch, the rain level and the counter's feed into the light block. Readings taken: while the chain plays (`introT` not null and below `CHAIN_END`), a timeline `ridgeReveal` at or below the 0.01 floor counts as 0, so the trickle draws the first 1%; under reduced motion the ridge reveal is 1 from the first frame inside 02 (0.01 before) and the hedge reveal is 1 from the first frame inside 03 (0 before).

**Files:**
- Create: `src/gl/reveal.ts`, `src/gl/reveal.test.ts`
- Modify: `src/gl/lightsFrame.ts`, `src/gl/lightsFrame.test.ts`, `src/gl/driverCore.ts`, `src/gl/driverLights.test.ts`, `src/gl/Driver.tsx`

**Interfaces:**
- Consumes: `CHAIN_END`, `SECTIONS`, `Timeline`, `SectionId`, `stepFor` (Task 3.7), `timelineAt(g, ranges)`, `LIVE` (Task 3.5).
- Produces:
  - `RIDGE_FLOOR = 0.01`
  - `trickleReveal(introT: number | null): number`
  - `latchReveals(tl: Pick<Timeline, 'section' | 'ridgeReveal' | 'hedgeReveal'>, introT: number | null, reducedMotion: boolean, latched: { ridge: number; hedge: number }): void`
  - `applyLights(inputs: FrameInputs, tl: Timeline, u: ValleyUniforms, lit: Float32Array, latched: { ridge: number; hedge: number }): void` (the final signature)
  - `LIVE.ridge` written every frame by the Driver

- [ ] **Step 1: Write the failing test `src/gl/reveal.test.ts`**

`timelineAt` returns one shared object, so each test copies the numbers it needs before the next call.

```ts
import { describe, it, expect } from 'vitest';
import { CHAIN_END } from '@/valley/ignition';
import { timelineAt } from '@/valley/timeline';
import { stepFor } from './chain';
import { RIDGE_FLOOR, latchReveals, trickleReveal } from './reveal';
import { fixtureRanges, gAt } from './frameFixture';

const ranges = fixtureRanges();
const trickle = stepFor('ridge');
const at = (id: Parameters<typeof gAt>[1], s: number) => timelineAt(gAt(ranges, id, s), ranges);

describe('trickleReveal (spec §4.6)', () => {
  it('runs 0 to 0.01 over the trickle step, and is 0.01 when the chain is not playing', () => {
    expect(trickleReveal(null)).toBe(RIDGE_FLOOR);
    expect(trickleReveal(0)).toBe(0);
    expect(trickleReveal(trickle.at - 0.01)).toBe(0);
    expect(trickleReveal(trickle.at + trickle.dur / 2)).toBeCloseTo(RIDGE_FLOOR / 2, 9);
    expect(trickleReveal(trickle.at + trickle.dur)).toBeCloseTo(RIDGE_FLOOR, 9);
    expect(trickleReveal(CHAIN_END + 1)).toBe(RIDGE_FLOOR);
  });
});

describe('latchReveals (spec §2, §4.6, §5.1)', () => {
  it('ignores the timeline floor while the chain plays, so the ridge starts at 0', () => {
    const latched = { ridge: 0, hedge: 0 };
    latchReveals(timelineAt(0, ranges), 1.0, false, latched);
    expect(latched.ridge).toBe(0);
  });

  it('holds the floor when the chain is not playing', () => {
    const latched = { ridge: 0, hedge: 0 };
    latchReveals(timelineAt(0, ranges), null, false, latched);
    expect(latched.ridge).toBe(RIDGE_FLOOR);
  });

  it('follows the timeline across 02 and never goes back', () => {
    const latched = { ridge: 0, hedge: 0 };
    const midRidge = at('kalshi', 0.5).ridgeReveal;
    latchReveals(at('kalshi', 0.5), null, false, latched);
    expect(latched.ridge).toBeCloseTo(midRidge, 9);
    latchReveals(timelineAt(0, ranges), null, false, latched);
    expect(latched.ridge).toBeCloseTo(midRidge, 9);
  });

  it('draws the hedge with 03 and never un-draws it', () => {
    const latched = { ridge: 0, hedge: 0 };
    latchReveals(at('kalshi', 0.9), null, false, latched);
    expect(latched.hedge).toBe(0);
    const midHedge = at('heron', 0.5).hedgeReveal;
    latchReveals(at('heron', 0.5), null, false, latched);
    expect(latched.hedge).toBeCloseTo(midHedge, 9);
    latchReveals(timelineAt(0, ranges), null, false, latched);
    expect(latched.hedge).toBeCloseTo(midHedge, 9);
  });

  it('cuts under reduced motion: whole on arrival', () => {
    const latched = { ridge: 0, hedge: 0 };
    latchReveals(timelineAt(0, ranges), null, true, latched);
    expect(latched.ridge).toBe(RIDGE_FLOOR);
    expect(latched.hedge).toBe(0);
    latchReveals(at('kalshi', 0.05), null, true, latched);
    expect(latched.ridge).toBe(1);
    expect(latched.hedge).toBe(0);
    latchReveals(at('heron', 0.05), null, true, latched);
    expect(latched.hedge).toBe(1);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/gl/reveal.test.ts`
Expected: FAIL, `Failed to resolve import "./reveal"`.

- [ ] **Step 3: Write `src/gl/reveal.ts`**

```ts
// The latched reveals (spec §2, §4.6, §5.1, §11). The ridge reveal is max(trickle, timeline, previous); the hedge
// reveal is max(timeline, previous). Neither ever goes back. Allocation-free.
import { CHAIN_END } from '@/valley/ignition';
import { SECTIONS } from '@/valley/sections';
import type { SectionId, Timeline } from '@/valley/types';
import { stepFor } from './chain';

export const RIDGE_FLOOR = 0.01;

const ORDER: readonly SectionId[] = SECTIONS.map((s) => s.id);
const KALSHI = ORDER.indexOf('kalshi');
const HERON = ORDER.indexOf('heron');
const TRICKLE = stepFor('ridge');

export function trickleReveal(introT: number | null): number {
  if (introT === null) return RIDGE_FLOOR;
  const f = (introT - TRICKLE.at) / TRICKLE.dur;
  return RIDGE_FLOOR * Math.min(1, Math.max(0, f));
}

export function latchReveals(
  tl: Pick<Timeline, 'section' | 'ridgeReveal' | 'hedgeReveal'>,
  introT: number | null,
  reducedMotion: boolean,
  latched: { ridge: number; hedge: number },
): void {
  let ridge = tl.ridgeReveal;
  let hedge = tl.hedgeReveal;
  if (reducedMotion) {
    const i = ORDER.indexOf(tl.section);
    ridge = i >= KALSHI ? 1 : RIDGE_FLOOR;
    hedge = i >= HERON ? 1 : 0;
  }
  const chainPlaying = introT !== null && introT < CHAIN_END;
  if (chainPlaying && ridge <= RIDGE_FLOOR) ridge = 0;
  latched.ridge = Math.max(latched.ridge, trickleReveal(introT), ridge);
  latched.hedge = Math.max(latched.hedge, hedge);
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run src/gl/reveal.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Add the failing light-block and Review Focus 3 tests**

Replace `src/gl/lightsFrame.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import { EMITTERS } from '@/valley/lights';
import { ignitionLevel } from '@/valley/ignition';
import { timelineAt } from '@/valley/timeline';
import { EMITTER_INDEX } from './projection';
import { createUniforms } from './driverCore';
import { stepFor } from './chain';
import { applyLights } from './lightsFrame';
import { fixtureInputs, fixtureRanges, gAt } from './frameFixture';

const ranges = fixtureRanges();
const fresh = () => ({ u: createUniforms(), lit: new Float32Array(EMITTERS.length), latched: { ridge: 0, hedge: 0 } });

describe('applyLights: ignition (spec §5.3)', () => {
  it('lights the hut from the schedule mid-chain and nothing ahead of it', () => {
    const { u, lit, latched } = fresh();
    const inputs = fixtureInputs(ranges, { introT: 1.0 });
    applyLights(inputs, timelineAt(inputs.g, ranges), u, lit, latched);
    expect(lit[EMITTER_INDEX.hut]).toBeCloseTo(ignitionLevel(stepFor('hut'), 1.0), 5);
    expect(lit[EMITTER_INDEX.nist]).toBe(0);
    expect(u.uRidgeLit.value).toBe(1);
  });

  it('gives final states when the chain is not playing', () => {
    const { u, lit, latched } = fresh();
    const none = fixtureInputs(ranges, { introT: null, buildT: null });
    applyLights(none, timelineAt(none.g, ranges), u, lit, latched);
    expect(lit[EMITTER_INDEX.hut]).toBe(1);
    expect(lit[EMITTER_INDEX.mill]).toBe(0);
    expect(lit[EMITTER_INDEX.visitor]).toBe(0);
    const built = fixtureInputs(ranges, { introT: null, buildT: 4.4 });
    applyLights(built, timelineAt(built.g, ranges), u, lit, latched);
    expect(lit[EMITTER_INDEX.visitor]).toBe(1);
  });
});

describe('applyLights: reveals and rain (spec §4.6, §5.1, §11)', () => {
  it('writes the latched reveals into the uniforms', () => {
    const { u, lit, latched } = fresh();
    const inputs = fixtureInputs(ranges, { g: gAt(ranges, 'heron', 0.5) });
    applyLights(inputs, timelineAt(inputs.g, ranges), u, lit, latched);
    expect(u.uRidgeReveal.value).toBe(latched.ridge);
    expect(u.uHedgeReveal.value).toBe(latched.hedge);
    expect(latched.ridge).toBe(1);
  });

  it('rains through summers, never under reduced motion', () => {
    const { u, lit, latched } = fresh();
    const inputs = fixtureInputs(ranges, { g: gAt(ranges, 'summers', 0.5) });
    const tl = timelineAt(inputs.g, ranges);
    const rain = tl.rain;
    applyLights(inputs, tl, u, lit, latched);
    expect(u.uRain.value).toBe(rain);
    expect(u.uRain.value).toBe(1);
    applyLights({ ...inputs, reducedMotion: true }, timelineAt(inputs.g, ranges), u, lit, latched);
    expect(u.uRain.value).toBe(0);
  });
});
```

Merge `import { timelineAt } from '@/valley/timeline';` and `gAt` (into the `./frameFixture` import) into the import block at the top of `src/gl/driverLights.test.ts`, then append:

```ts
describe('latched reveals through applyFrame (Review Focus 3, spec §2)', () => {
  it('never draws the ridge backward when 02 is entered mid-chain and left again', () => {
    const targets = createFrameTargets();
    const kalshiMid = gAt(ranges, 'kalshi', 0.5);
    let prev = 0;
    for (let f = 0; f <= 420; f++) {
      const introT = f / 60;
      const g =
        f < 120 ? 0 : f < 180 ? (kalshiMid * (f - 120)) / 60 : f < 300 ? kalshiMid : (kalshiMid * (420 - f)) / 120;
      applyFrame(fixtureInputs(ranges, { g, introT, t: 10 + introT }), targets);
      expect(targets.latched.ridge).toBeGreaterThanOrEqual(prev);
      expect(targets.uniforms.uRidgeReveal.value).toBe(targets.latched.ridge);
      prev = targets.latched.ridge;
    }
    expect(prev).toBeCloseTo(timelineAt(kalshiMid, ranges).ridgeReveal, 6);
  });

  it('starts the ridge at 0 under the chain and trickles to 0.01 by its end', () => {
    const targets = createFrameTargets();
    applyFrame(fixtureInputs(ranges, { introT: 1.0 }), targets);
    expect(targets.latched.ridge).toBe(0);
    applyFrame(fixtureInputs(ranges, { introT: 5.0 }), targets);
    expect(targets.latched.ridge).toBeCloseTo(0.01, 9);
  });

  it('never un-draws the hedge lines', () => {
    const targets = createFrameTargets();
    applyFrame(fixtureInputs(ranges, { g: gAt(ranges, 'heron', 0.5) }), targets);
    const drawn = targets.latched.hedge;
    expect(drawn).toBeGreaterThan(0);
    applyFrame(fixtureInputs(ranges, { g: 0 }), targets);
    expect(targets.latched.hedge).toBe(drawn);
    expect(targets.uniforms.uHedgeReveal.value).toBe(drawn);
  });
});
```

- [ ] **Step 6: Run them and see them fail**

Run: `npx vitest run src/gl/lightsFrame.test.ts src/gl/driverLights.test.ts`
Expected: FAIL (`applyLights` takes three arguments; the chain-start test sees Stage 2's 0.01 floor).

- [ ] **Step 7: Update `src/gl/lightsFrame.ts`**

Add `import type { Timeline } from '@/valley/types';` and `import { latchReveals } from './reveal';`, and replace `applyLights` with:

```ts
export function applyLights(
  inputs: FrameInputs,
  tl: Timeline,
  u: ValleyUniforms,
  lit: Float32Array,
  latched: { ridge: number; hedge: number },
): void {
  writeChainLevels(inputs.introT, inputs.buildT !== null, lit);
  latchReveals(tl, inputs.introT, inputs.reducedMotion, latched);
  u.uRidgeReveal.value = latched.ridge;
  u.uHedgeReveal.value = latched.hedge;
  u.uRidgeLit.value = lit[EMITTER_INDEX.ridge];
  u.uRain.value = inputs.reducedMotion ? 0 : tl.rain;
}
```

- [ ] **Step 8: Update `src/gl/driverCore.ts`**

In `applyFrame`, delete Stage 2's latch block and rain line:

```ts
  const latched = targets.latched;
  if (tl.ridgeReveal > latched.ridge) latched.ridge = tl.ridgeReveal;
  if (tl.hedgeReveal > latched.hedge) latched.hedge = tl.hedgeReveal;
  u.uRidgeReveal.value = latched.ridge;
  u.uHedgeReveal.value = latched.hedge;
```

and `u.uRain.value = inputs.reducedMotion ? 0 : tl.rain;`, and change `applyLights(inputs, u, targets.lit);` to:

```ts
  applyLights(inputs, tl, u, targets.lit, targets.latched);
```

Keep `u.uDarchT.value = ...` and the `uTime` line as they are (Task 3.9 moves `uDarchT`).

- [ ] **Step 9: Feed the counter from `src/gl/Driver.tsx`**

Add `import { LIVE } from './live';` and, directly after `writeLabelAlpha(f.inputs.introT, LABEL_ALPHA);`:

```ts
    LIVE.ridge = f.targets.latched.ridge;
```

- [ ] **Step 10: Run the tests and see them pass**

Run: `npx vitest run src/gl`
Expected: PASS, including Stage 2's latch test in `driverCore.test.ts` (it runs with `introT` null, so the floor and the latch behave as before) and its reduced-motion rain test.

- [ ] **Step 11: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: exit 0.

- [ ] **Step 12: Commit**

```bash
git add src/gl/reveal.ts src/gl/reveal.test.ts src/gl/lightsFrame.ts src/gl/lightsFrame.test.ts src/gl/driverCore.ts src/gl/driverLights.test.ts src/gl/Driver.tsx
git commit -m "Latch the ridge and hedge reveals with the trickle and feed the counter"
```

**Verify:**
- `npx vitest run src/gl/reveal.test.ts src/gl/driverLights.test.ts` passes; the test named `never draws the ridge backward when 02 is entered mid-chain and left again` is present and green (Review Focus 3).
- `grep -n "latched\." src/gl/driverCore.ts` prints nothing (the latch lives in `reveal.ts`); `grep -n "LIVE.ridge" src/gl/Driver.tsx` prints one line.

---

### Task 3.9: Mill rows and the wheel clock

Spec §4.5 (`darchT`: row r lights at 0.03 + 0.03r, bottom-up; lit and turning at 0.5 rad/s from 0.15 to 0.75; row r goes out at 0.78 + 0.05(3 − r), top-down; the wheel spins up over 0–0.15 and coasts to a stop by 1.0; section 04's `s` drives `darchT`; the hero chain plays the same curve once over 1.4 s; scrolling back relights it), §6 (`Windows.tsx`: the mill's 20 instances carry `aRow` 0–3; `MillWheel.tsx` rotation from `darchT` and its own clock), §8 (the wheel turns on wall time), §11 (reduced motion: wheel still).

Readings taken: each row switches over a 0.01-wide ramp in `darchT` so it never pops in one frame; `lit[mill]` is the brightest row (it drives the mill's glow sprite and point light); `FrameInputs.darchOverride`, when defined, wins; otherwise the timeline's `darchT` wins once it is above 0; otherwise, during the chain, `(introT − mill.at) / mill.dur` inside the mill step's window. The windows shader multiplies a mill window's `vLit` by its row level, so a dark row is discarded and the wall shows (Stage 2's discard).

**Files:**
- Create: `src/gl/mill.ts`, `src/gl/mill.test.ts`, `src/gl/shaders/millRows.ts`, `src/gl/shaders/millRows.test.ts`
- Modify: `src/gl/lightsFrame.ts`, `src/gl/driverCore.ts`, `src/gl/driverLights.test.ts`, `src/gl/shaders/windows.ts`, `src/gl/Windows.tsx`, `src/gl/Scene.tsx`, `src/gl/Driver.tsx`

**Interfaces:**
- Consumes: `stepFor` (Task 3.7), `EMITTER_INDEX`, `LightUniforms.uMillRows`, `uWheelAngle` (Task 3.7), `wheelRef` (Task 3.3), `FrameInputs.darchOverride`, `Timeline.darchT`, `patchWindows`, `createWindowsMaterial`, `WINDOWS_CACHE_KEY`, `inject` (`./shaders/inject`), `THREE.ShaderLib.basic` (tests).
- Produces:
  - `MILL_RAMP = 0.01`, `WHEEL_RUN = 0.5`
  - `millRowOn(row: number): number`, `millRowOff(row: number): number`, `millRowLevel(row: number, darchT: number): number`
  - `wheelSpeed(darchT: number): number` (rad/s), `stepWheel(angle: number, darchT: number, dt: number, reducedMotion: boolean): number`
  - `chainDarchT(introT: number | null): number`, `resolveDarchT(override: number | undefined, timelineDarchT: number, introT: number | null): number`
  - `writeMill(darchT: number, dt: number, reducedMotion: boolean, rows: THREE.Vector4, wheel: { value: number }, lit: Float32Array): void`
  - `patchMillRows(shader: { vertexShader: string; uniforms: Record<string, { value: unknown }> }, millRows: { value: THREE.Vector4 }): void`
  - `createWindowsMaterial(millRows?: { value: THREE.Vector4 })`, `Windows({ refs, millRows }: { refs: SceneRefs; millRows?: { value: THREE.Vector4 } })`

- [ ] **Step 1: Write the failing test `src/gl/mill.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { EMITTERS } from '@/valley/lights';
import { EMITTER_INDEX } from './projection';
import { stepFor } from './chain';
import {
  WHEEL_RUN, chainDarchT, millRowLevel, resolveDarchT, stepWheel, wheelSpeed, writeMill,
} from './mill';

const rows = (d: number) => [0, 1, 2, 3].map((r) => millRowLevel(r, d));

describe('mill rows (spec §4.5)', () => {
  it('is dark before and after the year', () => {
    expect(rows(0)).toEqual([0, 0, 0, 0]);
    expect(rows(1)).toEqual([0, 0, 0, 0]);
  });
  it('floods bottom-up: at 0.1 rows 0-2 are lit and row 3 is not (G4)', () => {
    expect(rows(0.1)).toEqual([1, 1, 1, 0]);
  });
  it('runs fully lit at 0.5 (G4)', () => {
    expect(rows(0.5)).toEqual([1, 1, 1, 1]);
  });
  it('goes out top-down: at 0.9 only row 0 is lit (G4)', () => {
    expect(rows(0.9)).toEqual([1, 0, 0, 0]);
  });
  it('ramps each switch over 0.01', () => {
    expect(millRowLevel(0, 0.035)).toBeCloseTo(0.5, 6);
    expect(millRowLevel(3, 0.785)).toBeCloseTo(0.5, 6);
  });
});

describe('mill wheel (spec §4.5, §11)', () => {
  it('spins up, runs at 0.5 rad/s, coasts to a stop by 1.0', () => {
    expect(wheelSpeed(0)).toBe(0);
    expect(wheelSpeed(0.075)).toBeCloseTo(WHEEL_RUN / 2, 9);
    expect(wheelSpeed(0.5)).toBe(WHEEL_RUN);
    expect(wheelSpeed(0.875)).toBeCloseTo(WHEEL_RUN / 2, 9);
    expect(wheelSpeed(1)).toBe(0);
  });
  it('integrates on wall time and holds still under reduced motion', () => {
    expect(stepWheel(1, 0.5, 1, false)).toBeCloseTo(1.5, 9);
    expect(stepWheel(1, 0.5, 1, true)).toBe(1);
  });
});

describe('darchT sources', () => {
  const mill = stepFor('mill');
  it('the chain plays the curve once over the mill step', () => {
    expect(chainDarchT(null)).toBe(0);
    expect(chainDarchT(mill.at - 0.1)).toBe(0);
    expect(chainDarchT(mill.at + mill.dur / 2)).toBeCloseTo(0.5, 9);
    expect(chainDarchT(mill.at + mill.dur + 0.1)).toBe(0);
  });
  it('override wins, then the timeline, then the chain', () => {
    expect(resolveDarchT(0.9, 0.2, mill.at + mill.dur / 2)).toBe(0.9);
    expect(resolveDarchT(1.7, 0, null)).toBe(1);
    expect(resolveDarchT(undefined, 0.2, mill.at + mill.dur / 2)).toBe(0.2);
    expect(resolveDarchT(undefined, 0, mill.at + mill.dur / 2)).toBeCloseTo(0.5, 9);
  });
});

describe('writeMill', () => {
  it('writes the rows, the mill emitter and the wheel', () => {
    const v = new THREE.Vector4();
    const wheel = { value: 0 };
    const lit = new Float32Array(EMITTERS.length);
    writeMill(0.1, 0.5, false, v, wheel, lit);
    expect([v.x, v.y, v.z, v.w]).toEqual([1, 1, 1, 0]);
    expect(lit[EMITTER_INDEX.mill]).toBe(1);
    expect(wheel.value).toBeGreaterThan(0);
    writeMill(1, 0.5, false, v, wheel, lit);
    expect(lit[EMITTER_INDEX.mill]).toBe(0);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/gl/mill.test.ts`
Expected: FAIL, `Failed to resolve import "./mill"`.

- [ ] **Step 3: Write `src/gl/mill.ts`**

```ts
// The mill's year (spec §4.5): four window rows and the wheel as functions of darchT, and where darchT comes from
// (a still override, section 04's s, or the hero chain's 1.4 s replay). Allocation-free.
import type * as THREE from 'three';
import { EMITTER_INDEX } from './projection';
import { stepFor } from './chain';

export const MILL_RAMP = 0.01;
export const WHEEL_RUN = 0.5;
const MILL = stepFor('mill');
const TWO_PI = Math.PI * 2;

export function millRowOn(row: number): number {
  return 0.03 + 0.03 * row;
}

export function millRowOff(row: number): number {
  return 0.78 + 0.05 * (3 - row);
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

export function millRowLevel(row: number, darchT: number): number {
  const on = clamp01((darchT - millRowOn(row)) / MILL_RAMP);
  const off = 1 - clamp01((darchT - millRowOff(row)) / MILL_RAMP);
  return Math.min(on, off);
}

export function wheelSpeed(darchT: number): number {
  if (darchT <= 0 || darchT >= 1) return 0;
  if (darchT < 0.15) return (WHEEL_RUN * darchT) / 0.15;
  if (darchT <= 0.75) return WHEEL_RUN;
  return (WHEEL_RUN * (1 - darchT)) / 0.25;
}

export function stepWheel(angle: number, darchT: number, dt: number, reducedMotion: boolean): number {
  if (reducedMotion) return angle;
  return (angle + wheelSpeed(darchT) * dt) % TWO_PI;
}

export function chainDarchT(introT: number | null): number {
  if (introT === null || introT < MILL.at || introT > MILL.at + MILL.dur) return 0;
  return (introT - MILL.at) / MILL.dur;
}

export function resolveDarchT(override: number | undefined, timelineDarchT: number, introT: number | null): number {
  if (override !== undefined) return clamp01(override);
  if (timelineDarchT > 0) return timelineDarchT;
  return chainDarchT(introT);
}

export function writeMill(
  darchT: number,
  dt: number,
  reducedMotion: boolean,
  rows: THREE.Vector4,
  wheel: { value: number },
  lit: Float32Array,
): void {
  const r0 = millRowLevel(0, darchT);
  const r1 = millRowLevel(1, darchT);
  const r2 = millRowLevel(2, darchT);
  const r3 = millRowLevel(3, darchT);
  rows.set(r0, r1, r2, r3);
  lit[EMITTER_INDEX.mill] = Math.max(r0, r1, r2, r3);
  wheel.value = stepWheel(wheel.value, darchT, dt, reducedMotion);
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run src/gl/mill.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Write the failing test `src/gl/shaders/millRows.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { patchWindows } from './windows';
import { patchMillRows } from './millRows';

const windowsShader = () => {
  const shader = {
    vertexShader: THREE.ShaderLib.basic.vertexShader,
    fragmentShader: THREE.ShaderLib.basic.fragmentShader,
    uniforms: {} as Record<string, { value: unknown }>,
  };
  patchWindows(shader);
  return shader;
};

describe('patchMillRows (spec §4.5, §6)', () => {
  it('scales a mill window by its row level after Stage 2 sets vLit, leaving other windows alone', () => {
    const rows = { value: new THREE.Vector4() };
    const shader = windowsShader();
    patchMillRows(shader, rows);
    expect(shader.vertexShader).toContain('uniform vec4 uMillRows;');
    expect(shader.vertexShader).toContain('if ( aRow > -0.5 ) vLit *= uMillRows[ int( aRow + 0.5 ) ];');
    expect(shader.vertexShader.indexOf('vLit *= uMillRows')).toBeGreaterThan(shader.vertexShader.indexOf('vLit = aLit;'));
    expect(shader.uniforms.uMillRows).toBe(rows);
  });

  it('fails loudly when the windows patch has not run', () => {
    const bare = { vertexShader: THREE.ShaderLib.basic.vertexShader, uniforms: {} };
    expect(() => patchMillRows(bare, { value: new THREE.Vector4() })).toThrow();
  });
});
```

- [ ] **Step 6: Run it and see it fail**

Run: `npx vitest run src/gl/shaders/millRows.test.ts`
Expected: FAIL, `Failed to resolve import "./millRows"`.

- [ ] **Step 7: Write `src/gl/shaders/millRows.ts`**

```ts
// The mill rows in the windows material (spec §4.5, §6): after Stage 2's patchWindows has written vLit and vRow, a
// mill window (aRow 0..3) has vLit scaled by its row's level from uMillRows; every other window (aRow -1) is
// untouched. A row at 0 falls under Stage 2's discard, so the wall shows. inject throws on a missing anchor.
import type * as THREE from 'three';
import { inject } from './inject';

export function patchMillRows(
  shader: { vertexShader: string; uniforms: Record<string, { value: unknown }> },
  millRows: { value: THREE.Vector4 },
): void {
  let v = inject(shader.vertexShader, '#include <common>', '#include <common>\nuniform vec4 uMillRows;');
  v = inject(v, '\tvRow = aRow;', '\tvRow = aRow;\n\tif ( aRow > -0.5 ) vLit *= uMillRows[ int( aRow + 0.5 ) ];');
  shader.vertexShader = v;
  shader.uniforms.uMillRows = millRows;
}
```

- [ ] **Step 8: Run it and see it pass**

Run: `npx vitest run src/gl/shaders/millRows.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Use it in the windows material**

In `src/gl/shaders/windows.ts`, add `import { patchMillRows } from './millRows';` and replace `createWindowsMaterial` with:

```ts
export function createWindowsMaterial(millRows?: { value: THREE.Vector4 }): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ toneMapped: false });
  m.onBeforeCompile = (shader) => {
    patchWindows(shader);
    if (millRows) patchMillRows(shader, millRows);
  };
  m.customProgramCacheKey = () => (millRows ? `${WINDOWS_CACHE_KEY}-mill` : WINDOWS_CACHE_KEY);
  return m;
}
```

In `src/gl/Windows.tsx`, change the signature to `export function Windows({ refs, millRows }: { refs: SceneRefs; millRows?: { value: THREE.Vector4 } })`, change `createWindowsMaterial()` to `createWindowsMaterial(millRows)` inside the mesh `useMemo`, and add `millRows` to that `useMemo`'s dependency list.

In `src/gl/Scene.tsx`, change `<Windows refs={refs} />` to `<Windows refs={refs} millRows={uniforms.uMillRows} />`.

- [ ] **Step 10: Add the mill to the light block and move `uDarchT`**

In `src/gl/lightsFrame.ts`, add `import { resolveDarchT, writeMill } from './mill';` and make the body of `applyLights`:

```ts
  writeChainLevels(inputs.introT, inputs.buildT !== null, lit);
  const darchT = resolveDarchT(inputs.darchOverride, tl.darchT, inputs.introT);
  u.uDarchT.value = darchT;
  writeMill(darchT, inputs.dt, inputs.reducedMotion, u.uMillRows.value, u.uWheelAngle, lit);
  latchReveals(tl, inputs.introT, inputs.reducedMotion, latched);
  u.uRidgeReveal.value = latched.ridge;
  u.uHedgeReveal.value = latched.hedge;
  u.uRidgeLit.value = lit[EMITTER_INDEX.ridge];
  u.uRain.value = inputs.reducedMotion ? 0 : tl.rain;
```

In `src/gl/driverCore.ts`, delete `u.uDarchT.value = inputs.darchOverride ?? tl.darchT;` from `applyFrame` (Stage 2's "darchOverride wins" test still passes: `resolveDarchT` gives the override first).

- [ ] **Step 11: Turn the wheel from `src/gl/Driver.tsx`**

Add `import { wheelRef } from './wheelRef';` and, directly after `LIVE.ridge = f.targets.latched.ridge;`:

```ts
    const wheel = wheelRef.current;
    if (wheel) wheel.rotation.z = -uniforms.uWheelAngle.value;
```

(Negative z: the bottom of the wheel moves downstream, +x, with the river.)

- [ ] **Step 12: Add the integration test to `src/gl/driverLights.test.ts`**

```ts
describe('the mill through applyFrame (spec §4.5, §14 G4)', () => {
  // g → s → darchT goes through two divisions, so a row sitting exactly on its ramp end can read 0.9999...
  const expectRows = (t: ReturnType<typeof createFrameTargets>, want: number[]) => {
    const v = t.uniforms.uMillRows.value;
    [v.x, v.y, v.z, v.w].forEach((r, i) => expect(r).toBeCloseTo(want[i], 3));
  };

  it('scrubs with section 04 and relights on the way back', () => {
    const targets = createFrameTargets();
    applyFrame(fixtureInputs(ranges, { g: gAt(ranges, 'darch', 0.1) }), targets);
    expectRows(targets, [1, 1, 1, 0]);
    applyFrame(fixtureInputs(ranges, { g: gAt(ranges, 'darch', 0.9) }), targets);
    expectRows(targets, [1, 0, 0, 0]);
    applyFrame(fixtureInputs(ranges, { g: gAt(ranges, 'summers', 0.5) }), targets);
    expect(targets.lit[EMITTER_INDEX.mill]).toBe(0);
    applyFrame(fixtureInputs(ranges, { g: gAt(ranges, 'darch', 0.5) }), targets);
    expectRows(targets, [1, 1, 1, 1]);
    expect(targets.lit[EMITTER_INDEX.mill]).toBe(1);
  });

  it('floods during the hero chain and is out when it ends', () => {
    const targets = createFrameTargets();
    applyFrame(fixtureInputs(ranges, { introT: 2.6 }), targets);
    expectRows(targets, [1, 1, 1, 1]);
    applyFrame(fixtureInputs(ranges, { introT: 5.0 }), targets);
    expect(targets.lit[EMITTER_INDEX.mill]).toBe(0);
  });

  it('turns the wheel at 0.5 rad/s while running', () => {
    const targets = createFrameTargets();
    const g = gAt(ranges, 'darch', 0.5);
    for (let f = 0; f < 60; f++) applyFrame(fixtureInputs(ranges, { g, dt: 1 / 60 }), targets);
    expect(targets.uniforms.uWheelAngle.value).toBeCloseTo(0.5, 6);
  });

  it('honours darchOverride', () => {
    const targets = createFrameTargets();
    applyFrame(fixtureInputs(ranges, { g: 0, darchOverride: 0.9 }), targets);
    expectRows(targets, [1, 0, 0, 0]);
    expect(targets.uniforms.uDarchT.value).toBe(0.9);
  });
});
```

- [ ] **Step 13: Run the tests and see them pass**

Run: `npx vitest run src/gl`
Expected: PASS, including Stage 2's windows shader tests and zero-allocation test.

- [ ] **Step 14: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: exit 0.

- [ ] **Step 15: Commit**

```bash
git add src/gl/mill.ts src/gl/mill.test.ts src/gl/shaders/millRows.ts src/gl/shaders/millRows.test.ts src/gl/shaders/windows.ts src/gl/Windows.tsx src/gl/Scene.tsx src/gl/lightsFrame.ts src/gl/driverCore.ts src/gl/driverLights.test.ts src/gl/Driver.tsx
git commit -m "Drive the mill rows and wheel from darchT"
```

**Verify:**
- `npx vitest run src/gl/mill.test.ts src/gl/shaders/millRows.test.ts src/gl/driverLights.test.ts` passes.
- `grep -n "uDarchT" src/gl/driverCore.ts` shows only the interface field and `createUniforms`; `grep -n "rotation.z" src/gl/Driver.tsx` prints one line; `grep -rn "useFrame" src/gl --include=*.tsx | wc -l` prints 1.
- `npm run dev`, open `http://localhost:3000/?still=1&g=0&t=2.6`: all 20 mill windows are lit; `?still=1&g=0&t=3.7`: at most the bottom row is lit.

---

### Task 3.10: Thesis pulse and hut flicker

Spec §3 (06 `alive`: one pulse through every lit thing, build order; 08 `contact`: email hover or focus flickers the hut once), §5.1 (`pulseArm` true while the section is `alive`; the driver fires the pulse on the rising edge and re-arms after 10 s out of the section), §5.6 (`pulseAt`: a 1.2 s wave in build order, each emitter rising to 1.6× and settling over 0.4 s, the mill excluded), §4.2 (the hut's flicker: 0.4 s, brightness dipping to 0.6 and back), §6 (window-level listeners, no R3F pointer events), §11 (reduced motion: the pulse is a single 300 ms brightening), §12 (no allocation in the frame loop).

`pulseAt(t)` returns a new record per call, so it is sampled once at module load into a table (240 samples per second over 2 s) and the frame loop interpolates the table. The Driver steps the pulse gate and the flicker clock and passes `FrameInputs.pulseT` and `FrameInputs.flickerT`; `applyLights` applies both to `lit` before `uRidgeLit` is written, so the ridge pulses too. "In section 06" is an allocation-free scan of the same ranges, with `locate`'s boundary rule (a section owns `[start, end)`, the last one also owns `g = 1`). Readings taken: the flicker also fires under reduced motion; a hover while a flicker runs does not restart it; the email link is Stage 0's `a[data-contact="email"]`.

**Files:**
- Create: `src/gl/pulse.ts`, `src/gl/pulse.test.ts`, `src/gl/flicker.ts`, `src/gl/flicker.test.ts`
- Modify: `src/gl/lightsFrame.ts`, `src/gl/driverLights.test.ts`, `src/gl/Driver.tsx`

**Interfaces:**
- Consumes: `EMITTERS`, `pulseAt(t): Record<EmitterId, number>` (`@/valley/lights`), `EMITTER_INDEX`, `SectionId`, `SectionRange`, `FrameInputs.pulseT`, `FrameInputs.flickerT`.
- Produces:
  - `PULSE_SPAN = 2.0`, `PULSE_RATE = 240`, `PULSE_REARM_S = 10`, `REDUCED_PULSE_S = 0.3`, `PULSE_TABLE: Float32Array`
  - `pulseMultiplier(index: number, pulseT: number): number`, `reducedPulse(pulseT: number): number`
  - `applyPulse(pulseT: number | null, reducedMotion: boolean, lit: Float32Array): void`
  - `interface PulseGate { armed: boolean; firedAt: number | null; leftAt: number | null }`, `createPulseGate(): PulseGate`, `stepPulseGate(gate: PulseGate, inAlive: boolean, t: number): number | null`
  - `inSection(g: number, ranges: readonly SectionRange[], id: SectionId): boolean`
  - `FLICKER_S = 0.4`, `FLICKER_DIP = 0.6`, `EMAIL_SELECTOR = 'a[data-contact="email"]'`, `flickerLevel(flickerT: number | null): number`
  - `interface FlickerClock { pending: boolean; start: number | null }`, `createFlickerClock(): FlickerClock`, `stepFlicker(c: FlickerClock, t: number): number | null`, `isEmailTarget(target: EventTarget | null): boolean`

- [ ] **Step 1: Write the failing test `src/gl/pulse.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { EMITTERS, pulseAt } from '@/valley/lights';
import type { SectionRange } from '@/valley/types';
import { EMITTER_INDEX } from './projection';
import {
  PULSE_REARM_S, PULSE_SPAN, applyPulse, createPulseGate, inSection, pulseMultiplier, reducedPulse, stepPulseGate,
} from './pulse';

describe('pulse table (spec §5.6)', () => {
  it('matches pulseAt at sample points', () => {
    for (const t of [0, 0.25, 0.5, 1.0, 1.5]) {
      const m = pulseAt(t);
      EMITTERS.forEach((e, i) => expect(pulseMultiplier(i, t)).toBeCloseTo(m[e.id], 5));
    }
  });

  it('has settled back to 1 for every emitter by the end of the span', () => {
    const m = pulseAt(PULSE_SPAN);
    for (const e of EMITTERS) expect(m[e.id]).toBeCloseTo(1, 3);
    EMITTERS.forEach((_, i) => expect(pulseMultiplier(i, PULSE_SPAN)).toBe(1));
  });

  it('peaks near 1.6 and reaches the hut before the ridge (build order)', () => {
    const peak = (i: number) => {
      let best = 0;
      let at = 0;
      for (let ms = 0; ms < PULSE_SPAN * 1000; ms++) {
        const v = pulseMultiplier(i, ms / 1000);
        if (v > best) {
          best = v;
          at = ms;
        }
      }
      return { best, at };
    };
    const hut = peak(EMITTER_INDEX.hut);
    expect(hut.best).toBeCloseTo(1.6, 1);
    expect(hut.at).toBeLessThan(peak(EMITTER_INDEX.ridge).at);
  });

  it('never touches the mill', () => {
    const lit = new Float32Array(EMITTERS.length);
    for (let ms = 0; ms < 2000; ms += 10) {
      lit.fill(1);
      applyPulse(ms / 1000, false, lit);
      expect(lit[EMITTER_INDEX.mill]).toBe(1);
    }
  });

  it('is one 300 ms brightening to 1.6 under reduced motion', () => {
    expect(reducedPulse(0)).toBe(1);
    expect(reducedPulse(0.15)).toBeCloseTo(1.6, 9);
    expect(reducedPulse(0.3)).toBe(1);
    const lit = new Float32Array(EMITTERS.length).fill(1);
    applyPulse(0.15, true, lit);
    expect(lit[EMITTER_INDEX.ridge]).toBeCloseTo(1.6, 5);
    expect(lit[EMITTER_INDEX.mill]).toBe(1);
  });

  it('does nothing when no pulse is running', () => {
    const lit = new Float32Array(EMITTERS.length).fill(1);
    applyPulse(null, false, lit);
    for (const v of lit) expect(v).toBe(1);
  });
});

describe('pulse gate (spec §5.1)', () => {
  it('fires on the rising edge only, once per visit', () => {
    const gate = createPulseGate();
    expect(stepPulseGate(gate, false, 0)).toBeNull();
    expect(stepPulseGate(gate, true, 1)).toBe(0);
    expect(stepPulseGate(gate, true, 1.5)).toBeCloseTo(0.5, 9);
    expect(stepPulseGate(gate, true, 1 + PULSE_SPAN + 5)).toBeNull();
    expect(gate.firedAt).toBe(1);
  });

  it('re-arms only after 10 s out of the section', () => {
    const gate = createPulseGate();
    stepPulseGate(gate, true, 1);
    stepPulseGate(gate, false, 3);
    stepPulseGate(gate, false, 3 + PULSE_REARM_S - 1);
    expect(stepPulseGate(gate, true, 3 + PULSE_REARM_S - 0.5)).toBeNull();
    stepPulseGate(gate, false, 20);
    stepPulseGate(gate, false, 20 + PULSE_REARM_S);
    expect(stepPulseGate(gate, true, 20 + PULSE_REARM_S + 1)).toBe(0);
  });
});

describe('inSection', () => {
  const ranges: SectionRange[] = [
    { id: 'open', start: 0, end: 0.5 },
    { id: 'alive', start: 0.5, end: 0.8 },
    { id: 'contact', start: 0.8, end: 1 },
  ];
  it('owns [start, end) and the last section owns g = 1', () => {
    expect(inSection(0.5, ranges, 'alive')).toBe(true);
    expect(inSection(0.79, ranges, 'alive')).toBe(true);
    expect(inSection(0.8, ranges, 'alive')).toBe(false);
    expect(inSection(1, ranges, 'contact')).toBe(true);
    expect(inSection(0.6, [], 'alive')).toBe(false);
  });
});
```

- [ ] **Step 2: Write the failing test `src/gl/flicker.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  EMAIL_SELECTOR, FLICKER_DIP, FLICKER_S, createFlickerClock, flickerLevel, isEmailTarget, stepFlicker,
} from './flicker';

describe('flickerLevel (spec §4.2)', () => {
  it('dips to 0.6 at the middle of 0.4 s and is 1 outside it', () => {
    expect(flickerLevel(null)).toBe(1);
    expect(flickerLevel(0)).toBe(1);
    expect(flickerLevel(FLICKER_S / 2)).toBeCloseTo(FLICKER_DIP, 9);
    expect(flickerLevel(FLICKER_S)).toBe(1);
    expect(flickerLevel(-0.1)).toBe(1);
  });
});

describe('stepFlicker', () => {
  it('starts on a pending hover, runs 0.4 s, ignores hovers mid-flicker', () => {
    const c = createFlickerClock();
    expect(stepFlicker(c, 1)).toBeNull();
    c.pending = true;
    expect(stepFlicker(c, 1)).toBe(0);
    expect(stepFlicker(c, 1.2)).toBeCloseTo(0.2, 9);
    c.pending = true;
    expect(stepFlicker(c, 1.3)).toBeCloseTo(0.3, 9);
    expect(stepFlicker(c, 1.5)).toBeNull();
    c.pending = true;
    expect(stepFlicker(c, 2)).toBe(0);
  });
});

describe('isEmailTarget (spec §3.1 · 08)', () => {
  const el = (match: boolean) => ({ closest: (sel: string) => (match && sel === EMAIL_SELECTOR ? {} : null) });
  it('matches the email link and its children only', () => {
    expect(isEmailTarget(el(true) as unknown as EventTarget)).toBe(true);
    expect(isEmailTarget(el(false) as unknown as EventTarget)).toBe(false);
    expect(isEmailTarget({} as EventTarget)).toBe(false);
    expect(isEmailTarget(null)).toBe(false);
  });
});
```

- [ ] **Step 3: Run them and see them fail**

Run: `npx vitest run src/gl/pulse.test.ts src/gl/flicker.test.ts`
Expected: FAIL, `Failed to resolve import "./pulse"` and `"./flicker"`.

- [ ] **Step 4: Write `src/gl/pulse.ts`**

```ts
// The thesis pulse (spec §5.1, §5.6, §11). pulseAt is sampled once into PULSE_TABLE so the frame loop never allocates;
// the gate turns "in section 06" into a pulse clock that fires on the rising edge and re-arms after 10 s out.
import { EMITTERS, pulseAt } from '@/valley/lights';
import type { SectionId, SectionRange } from '@/valley/types';
import { EMITTER_INDEX } from './projection';

export const PULSE_SPAN = 2.0;
export const PULSE_RATE = 240;
export const PULSE_REARM_S = 10;
export const REDUCED_PULSE_S = 0.3;

const N = EMITTERS.length;
const SAMPLES = PULSE_SPAN * PULSE_RATE + 1;
const MILL = EMITTER_INDEX.mill;

function buildPulseTable(): Float32Array {
  const table = new Float32Array(SAMPLES * N);
  for (let s = 0; s < SAMPLES; s++) {
    const m = pulseAt(s / PULSE_RATE);
    for (let i = 0; i < N; i++) table[s * N + i] = m[EMITTERS[i].id];
  }
  return table;
}

export const PULSE_TABLE: Float32Array = buildPulseTable();

export function pulseMultiplier(index: number, pulseT: number): number {
  if (pulseT < 0 || pulseT >= PULSE_SPAN) return 1;
  const x = pulseT * PULSE_RATE;
  const s0 = Math.floor(x);
  const f = x - s0;
  const s1 = Math.min(SAMPLES - 1, s0 + 1);
  return PULSE_TABLE[s0 * N + index] * (1 - f) + PULSE_TABLE[s1 * N + index] * f;
}

export function reducedPulse(pulseT: number): number {
  if (pulseT <= 0 || pulseT >= REDUCED_PULSE_S) return 1;
  return 1 + 0.6 * Math.sin((Math.PI * pulseT) / REDUCED_PULSE_S);
}

export function applyPulse(pulseT: number | null, reducedMotion: boolean, lit: Float32Array): void {
  if (pulseT === null) return;
  for (let i = 0; i < N; i++) {
    if (i === MILL) continue;
    lit[i] *= reducedMotion ? reducedPulse(pulseT) : pulseMultiplier(i, pulseT);
  }
}

export interface PulseGate {
  armed: boolean;
  firedAt: number | null;
  leftAt: number | null;
}

export function createPulseGate(): PulseGate {
  return { armed: true, firedAt: null, leftAt: null };
}

export function stepPulseGate(gate: PulseGate, inAlive: boolean, t: number): number | null {
  if (inAlive) {
    gate.leftAt = null;
    if (gate.armed) {
      gate.armed = false;
      gate.firedAt = t;
    }
  } else {
    if (gate.leftAt === null) gate.leftAt = t;
    if (!gate.armed && t - gate.leftAt >= PULSE_REARM_S) gate.armed = true;
  }
  if (gate.firedAt === null) return null;
  const p = t - gate.firedAt;
  return p < PULSE_SPAN ? p : null;
}

export function inSection(g: number, ranges: readonly SectionRange[], id: SectionId): boolean {
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    if (r.id !== id) continue;
    const last = i === ranges.length - 1;
    return g >= r.start && (g < r.end || (last && g <= r.end));
  }
  return false;
}
```

- [ ] **Step 5: Write `src/gl/flicker.ts`**

```ts
// The hut flicker (spec §4.2, §3.1 · 08): an email hover or focus starts a 0.4 s dip to 0.6 and back. The Driver
// listens on window (no R3F pointer events) and steps the clock each frame.
export const FLICKER_S = 0.4;
export const FLICKER_DIP = 0.6;
export const EMAIL_SELECTOR = 'a[data-contact="email"]';

export function flickerLevel(flickerT: number | null): number {
  if (flickerT === null || flickerT <= 0 || flickerT >= FLICKER_S) return 1;
  return 1 - (1 - FLICKER_DIP) * Math.sin((Math.PI * flickerT) / FLICKER_S);
}

export interface FlickerClock {
  pending: boolean;
  start: number | null;
}

export function createFlickerClock(): FlickerClock {
  return { pending: false, start: null };
}

export function stepFlicker(c: FlickerClock, t: number): number | null {
  if (c.pending) {
    c.pending = false;
    if (c.start === null || t - c.start >= FLICKER_S) c.start = t;
  }
  if (c.start === null) return null;
  const elapsed = t - c.start;
  if (elapsed >= FLICKER_S) {
    c.start = null;
    return null;
  }
  return elapsed;
}

export function isEmailTarget(target: EventTarget | null): boolean {
  const el = target as { closest?: (selector: string) => unknown } | null;
  return el !== null && typeof el.closest === 'function' && el.closest(EMAIL_SELECTOR) !== null;
}
```

- [ ] **Step 6: Run them and see them pass**

Run: `npx vitest run src/gl/pulse.test.ts src/gl/flicker.test.ts`
Expected: PASS (pulse 9 tests, flicker 3 tests).

- [ ] **Step 7: Apply both in `src/gl/lightsFrame.ts`**

Add `import { applyPulse } from './pulse';` and `import { flickerLevel } from './flicker';`. The body of `applyLights` becomes:

```ts
  writeChainLevels(inputs.introT, inputs.buildT !== null, lit);
  const darchT = resolveDarchT(inputs.darchOverride, tl.darchT, inputs.introT);
  u.uDarchT.value = darchT;
  writeMill(darchT, inputs.dt, inputs.reducedMotion, u.uMillRows.value, u.uWheelAngle, lit);
  applyPulse(inputs.pulseT, inputs.reducedMotion, lit);
  lit[EMITTER_INDEX.hut] *= flickerLevel(inputs.flickerT);
  latchReveals(tl, inputs.introT, inputs.reducedMotion, latched);
  u.uRidgeReveal.value = latched.ridge;
  u.uHedgeReveal.value = latched.hedge;
  u.uRidgeLit.value = lit[EMITTER_INDEX.ridge];
  u.uRain.value = inputs.reducedMotion ? 0 : tl.rain;
```

- [ ] **Step 8: Add the integration test to `src/gl/driverLights.test.ts`**

Merge `import { pulseMultiplier } from './pulse';` into the file's imports, then append:

```ts
describe('pulse and flicker through applyFrame (spec §4.2, §5.6)', () => {
  it('multiplies every lit thing but the mill, and the ridge brightness', () => {
    const targets = createFrameTargets();
    const t = 0.6;
    applyFrame(fixtureInputs(ranges, { pulseT: t }), targets);
    expect(targets.lit[EMITTER_INDEX.hut]).toBeCloseTo(pulseMultiplier(EMITTER_INDEX.hut, t), 5);
    expect(targets.lit[EMITTER_INDEX.mill]).toBe(0);
    expect(targets.uniforms.uRidgeLit.value).toBeCloseTo(pulseMultiplier(EMITTER_INDEX.ridge, t), 5);
  });

  it('dips the hut to 0.6 mid-flicker and leaves the rest alone', () => {
    const targets = createFrameTargets();
    applyFrame(fixtureInputs(ranges, { flickerT: 0.2 }), targets);
    expect(targets.lit[EMITTER_INDEX.hut]).toBeCloseTo(0.6, 5);
    expect(targets.lit[EMITTER_INDEX.nist]).toBe(1);
  });
});
```

- [ ] **Step 9: Step the gate and the flicker in `src/gl/Driver.tsx`**

Add to the imports:

```ts
import { createPulseGate, inSection, stepPulseGate, type PulseGate } from './pulse';
import { createFlickerClock, isEmailTarget, stepFlicker, type FlickerClock } from './flicker';
```

In the component body, after the Task 3.6 effect:

```ts
const pulseGate = useRef<PulseGate>(createPulseGate());
const flicker = useRef<FlickerClock>(createFlickerClock());
useEffect(() => {
  const clock = flicker.current;
  const onEnter = (e: Event) => {
    if (isEmailTarget(e.target)) clock.pending = true;
  };
  window.addEventListener('pointerover', onEnter, { passive: true });
  window.addEventListener('focusin', onEnter);
  return () => {
    window.removeEventListener('pointerover', onEnter);
    window.removeEventListener('focusin', onEnter);
  };
}, []);
```

In `useFrame`, directly after `if (still.g !== null) f.inputs.g = still.g;` and before `applyFrame(f.inputs, f.targets);`:

```ts
    f.inputs.pulseT = stepPulseGate(pulseGate.current, inSection(f.inputs.g, f.inputs.ranges, 'alive'), now);
    f.inputs.flickerT = stepFlicker(flicker.current, now);
```

- [ ] **Step 10: Run the tests and see them pass**

Run: `npx vitest run src/gl`
Expected: PASS, including Stage 2's zero-allocation test.

- [ ] **Step 11: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: exit 0.

- [ ] **Step 12: Commit**

```bash
git add src/gl/pulse.ts src/gl/pulse.test.ts src/gl/flicker.ts src/gl/flicker.test.ts src/gl/lightsFrame.ts src/gl/driverLights.test.ts src/gl/Driver.tsx
git commit -m "Add the thesis pulse and the hut flicker"
```

**Verify:**
- `npx vitest run src/gl/pulse.test.ts src/gl/flicker.test.ts src/gl/driverLights.test.ts` passes.
- `grep -rn "onPointer" src/gl --include=*.tsx` prints nothing; `grep -n "pointerover\|focusin" src/gl/Driver.tsx` prints the two listeners and their removals.
- `npm run dev`: scroll into section 06 and the valley pulses once from the hut outward; scroll out and back within 10 s, no pulse; stay out 10 s, come back, it pulses. In section 08 hover the `email` link and the hut window dips once; tab to it and it dips once.

---

### Task 3.11: Mount the stage in the scene and pin reduced motion

Spec §6 (main-pass draws: wheel, ridge points, crest line, hedge lines, rain; phone drops rain; `MillWheel` is a shadow caster), §11 (phone: no rain, ridge N/5; reduced motion: no chain, no rain, wheel still, cuts for reveals, the pulse a single 300 ms brightening), §4.8 (only `Windows.tsx`, `Glow.tsx`, `Ridge.tsx` and their shaders use `emissive` or `AdditiveBlending`).

**Files:**
- Modify: `src/gl/Scene.tsx`
- Create: `src/gl/sceneStage3.test.ts`, `src/gl/reducedMotion.test.ts`

**Interfaces:**
- Consumes: `Ridge`, `HedgeLines`, `MillWheel`, `Rain` (Tasks 3.1 to 3.4), `uniforms`, `tier`, `shadows`, `reducedMotion` in `ValleyCanvas`, `applyLights` (Task 3.10's final body), `createUniforms`, `shouldPlayIntro`, `writeLabelAlpha`.
- Produces: the four components mounted inside the Canvas; nothing new exported.

- [ ] **Step 1: Write the failing test `src/gl/sceneStage3.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const scene = readFileSync(path.join(process.cwd(), 'src/gl/Scene.tsx'), 'utf8');

describe('Scene mounts the Stage 3 draws (spec §6, §11)', () => {
  it('mounts the ridge, hedge lines and mill wheel on every tier', () => {
    expect(scene).toContain('<Ridge tier={tier} reveal={uniforms.uRidgeReveal} lit={uniforms.uRidgeLit} />');
    expect(scene).toContain('<HedgeLines reveal={uniforms.uHedgeReveal} />');
    expect(scene).toContain('<MillWheel shadows={shadows} />');
  });
  it('mounts rain only on desktop and not under reduced motion', () => {
    expect(scene).toContain(
      "{tier === 'desktop' && !reducedMotion ? <Rain rain={uniforms.uRain} time={uniforms.uTime} /> : null}",
    );
  });
});
```

- [ ] **Step 2: Write the test `src/gl/reducedMotion.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { EMITTERS } from '@/valley/lights';
import { timelineAt } from '@/valley/timeline';
import { EMITTER_INDEX } from './projection';
import { createUniforms } from './driverCore';
import { writeLabelAlpha } from './chain';
import { shouldPlayIntro } from './introGate';
import { applyLights } from './lightsFrame';
import { fixtureInputs, fixtureRanges, gAt } from './frameFixture';

const ranges = fixtureRanges();

describe('reduced motion for Stage 3 (spec §11)', () => {
  it('plays no chain and shows no ignition labels', () => {
    expect(shouldPlayIntro({ reducedMotion: true, introPlayed: false, still: { still: false, g: null, t: null } })).toBe(false);
    const out = new Float32Array(EMITTERS.length).fill(1);
    writeLabelAlpha(null, out);
    for (const v of out) expect(v).toBe(0);
  });

  it('has no rain and a still wheel while the mill still follows the scroll', () => {
    const u = createUniforms();
    const lit = new Float32Array(EMITTERS.length);
    const latched = { ridge: 0, hedge: 0 };
    const inputs = fixtureInputs(ranges, { g: gAt(ranges, 'darch', 0.5), reducedMotion: true });
    for (let f = 0; f < 60; f++) applyLights(inputs, timelineAt(inputs.g, ranges), u, lit, latched);
    expect(u.uRain.value).toBe(0);
    expect(u.uWheelAngle.value).toBe(0);
    expect(u.uMillRows.value.x).toBe(1);
    expect(lit[EMITTER_INDEX.mill]).toBe(1);
  });

  it('cuts the ridge and hedge reveals to whole on arrival', () => {
    const u = createUniforms();
    const lit = new Float32Array(EMITTERS.length);
    const latched = { ridge: 0, hedge: 0 };
    const kalshi = fixtureInputs(ranges, { g: gAt(ranges, 'kalshi', 0.05), reducedMotion: true });
    applyLights(kalshi, timelineAt(kalshi.g, ranges), u, lit, latched);
    expect(u.uRidgeReveal.value).toBe(1);
    expect(u.uHedgeReveal.value).toBe(0);
    const heron = fixtureInputs(ranges, { g: gAt(ranges, 'heron', 0.05), reducedMotion: true });
    applyLights(heron, timelineAt(heron.g, ranges), u, lit, latched);
    expect(u.uHedgeReveal.value).toBe(1);
  });

  it('makes the pulse a single 300 ms brightening', () => {
    const u = createUniforms();
    const lit = new Float32Array(EMITTERS.length);
    const hutAt = (pulseT: number) => {
      const inputs = fixtureInputs(ranges, { pulseT, reducedMotion: true });
      applyLights(inputs, timelineAt(0, ranges), u, lit, { ridge: 0, hedge: 0 });
      return lit[EMITTER_INDEX.hut];
    };
    expect(hutAt(0.15)).toBeCloseTo(1.6, 5);
    expect(hutAt(0.31)).toBe(1);
    expect(hutAt(1.0)).toBe(1);
  });
});
```

- [ ] **Step 3: Run them and see the Scene test fail**

Run: `npx vitest run src/gl/sceneStage3.test.ts src/gl/reducedMotion.test.ts`
Expected: `sceneStage3.test.ts` FAILS (`<Ridge` not found); `reducedMotion.test.ts` PASSES already (it pins behaviour built in Tasks 3.6 to 3.10; if any of it fails, fix the owning module, not the test).

- [ ] **Step 4: Mount the components in `src/gl/Scene.tsx`**

Add the imports:

```ts
import { Ridge } from './Ridge';
import { HedgeLines } from './HedgeLines';
import { MillWheel } from './MillWheel';
import { Rain } from './Rain';
```

In `ValleyCanvas`, inside `<PerformanceMonitor>`, directly after `<Glow refs={refs} />`, add exactly:

```tsx
          <Ridge tier={tier} reveal={uniforms.uRidgeReveal} lit={uniforms.uRidgeLit} />
          <HedgeLines reveal={uniforms.uHedgeReveal} />
          <MillWheel shadows={shadows} />
          {tier === 'desktop' && !reducedMotion ? <Rain rain={uniforms.uRain} time={uniforms.uTime} /> : null}
```

- [ ] **Step 5: Run the whole suite**

Run: `npx vitest run`
Expected: PASS, including Stage 2's `lightRule.test.ts` (spec §4.8) and the zero-allocation test.

- [ ] **Step 6: Typecheck, lint, build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: exit 0; `out/index.html` exists.

- [ ] **Step 7: Look at it**

Run `npm run dev` and open at 1440 × 900:
- `http://localhost:3000/?still=1&g=0&t=5.0`: a thin line of amber lights at the left end of the far ridge over a dark crest line; no hedge lines; no rain.
- `/` scrolled to the middle of section 02: the ridge filled about halfway from the left; the counter under the figure reads a number near half of 30,000.
- `/` scrolled to the middle of section 03: four pale lines bowed from the bars to the lamp, drawn about halfway.
- `/` scrolled into section 04: rain falls; the mill's windows follow the scroll; the wheel turns.
- With the OS reduced-motion setting on, in a fresh tab: no chain, no rain, the wheel does not turn, the ridge is whole as soon as 02 starts.
- `/?tier=phone`: no rain; the ridge is sparser with larger points.

- [ ] **Step 8: Commit**

```bash
git add src/gl/Scene.tsx src/gl/sceneStage3.test.ts src/gl/reducedMotion.test.ts
git commit -m "Mount the ridge, hedge lines, mill wheel and rain; pin reduced motion"
```

**Verify:**
- `npx vitest run` passes; `npx tsc --noEmit`, `npm run lint`, `npm run build` exit 0.
- `grep -rln "AdditiveBlending\|emissive" src/gl --include=*.ts --include=*.tsx | grep -v test` lists only `Windows.tsx`, `Glow.tsx`, `Ridge.tsx` and files under `src/gl/shaders/` (spec §4.8).
- `grep -rn "useFrame" src/gl --include=*.tsx | wc -l` prints 1; `grep -rn "fetch(" src` prints nothing.

---

### Task 3.12: Gates G2, G3, G4

Spec §14 (G2: stills at T0 + 1.0, 1.9, 2.6, 3.2, 3.7, 5.0 show the hut first, the chain accelerating, the mill flooding at 2.6 and 3.2 and going out while the hillside catches at 3.7, the trickle at the ridge's left end at 5.0; labels legible and gone by 7 s. G3: at s = 0.3, 0.6, 1.0 of section 02 the ridge reads as a timeline filling left to right over a crest, not glitter; the counter tracks the reveal. G4: stills at darchT 0.1, 0.5, 0.9 show flood, running, going out; wheel motion visible), §10 (`?still=1`, `?g=`), Task 3.6 (`?t=` with `still=1`). Every gate also needs lint, typecheck, vitest and build green. The implementer captures; an Opus agent judges; nobody self-passes.

Section 04's `s` is `darchT` (spec §4.5), so G4's darchT values are section 04 at s = 0.1, 0.5, 0.9. The gate computes `g` for a section-local `s` with `sectionRanges`'s rule: a section starts at `top / (scrollHeight − innerHeight)` and ends where the next starts (the last at 1). In this stage `?still=1` pins `g` and `t` but does not hide the DOM (that is Stage 5), so copy shows in the stills; the judge looks at the valley.

**Files:**
- Create (gitignored, not committed): `.playwright-mcp/gates/g2-t1.0.png`, `g2-t1.9.png`, `g2-t2.6.png`, `g2-t3.2.png`, `g2-t3.7.png`, `g2-t5.0.png`, `g2-live-hut-label.png`, `g3-s0.3.png`, `g3-s0.6.png`, `g3-s1.0.png`, `g4-d0.1.png`, `g4-d0.5.png`, `g4-d0.5-later.png`, `g4-d0.9.png`

**Interfaces:**
- Consumes: the exported build; `?still=1&g=<g>&t=<seconds>` (Task 3.6); `span[data-label]` (Stage 2 `Labels.tsx`, opacity from `LABEL_ALPHA`); `p[data-counter]` (Task 3.5).
- Produces: the stills and the numbers below, handed to the gate judge.

- [ ] **Step 1: Everything green**

Run: `npm run lint && npx tsc --noEmit && npx vitest run && npm run build`
Expected: exit 0.

- [ ] **Step 2: Serve the export**

Run (in the background): `npx serve out -l 3005`
Expected: `Serving!` on `http://localhost:3005`.

- [ ] **Step 3: G2 stills**

With the Playwright MCP tools: `browser_resize` to 1440 × 900. For each `T` in `1.0, 1.9, 2.6, 3.2, 3.7, 5.0`: `browser_navigate` to `http://localhost:3005/?still=1&g=0&t=T`, `browser_wait_for` time 4 (warm-up, the 4 s compile ceiling and the fade), `browser_take_screenshot` to `.playwright-mcp/gates/g2-tT.png`.

- [ ] **Step 4: G2 labels, live**

`browser_navigate` to `http://localhost:3005/`, `browser_evaluate` `() => sessionStorage.clear()`, `browser_navigate` to `http://localhost:3005/` again, then `browser_evaluate`:

```js
async () => {
  const start = performance.now();
  while (performance.now() - start < 10000) {
    const hut = document.querySelector('span[data-label="hut"]');
    if (hut && Number(getComputedStyle(hut).opacity) > 0.9) return true;
    await new Promise((r) => setTimeout(r, 30));
  }
  return false;
}
```

and immediately `browser_take_screenshot` to `.playwright-mcp/gates/g2-live-hut-label.png`. Then `browser_evaluate` `() => sessionStorage.clear()`, reload, and `browser_evaluate`:

```js
async () => {
  const visible = () =>
    [...document.querySelectorAll('span[data-label]')]
      .filter((e) => Number(getComputedStyle(e).opacity) > 0.05)
      .map((e) => e.getAttribute('data-label'));
  const start = performance.now();
  const seen = [];
  let first = null;
  while (performance.now() - start < 15000) {
    const v = visible();
    for (const k of v) if (!seen.includes(k)) seen.push(k);
    if (v.length && first === null) first = performance.now();
    if (first !== null && v.length === 0 && seen.includes('hillside')) {
      return { seen, goneAfterFirstMs: Math.round(performance.now() - first) };
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  return { timeout: true, seen };
}
```

Pass condition: `seen` holds all seven label keys in chain order (`hut`, `nist`, `mill`, `kalshiLamp`, `wvu`, `bars`, `hillside`, with `LABEL_ANCHORS`'s key spelling) and `goneAfterFirstMs` ≤ 6200 (the hut label shows at T0 + 0.8, so every label is gone by T0 + 7.0).

- [ ] **Step 5: Compute g for sections 02 and 04**

`browser_navigate` to `http://localhost:3005/`, `browser_evaluate` `() => sessionStorage.setItem('introPlayed', '1')`, reload, then `browser_evaluate`:

```js
() => {
  const ids = ['open', 'kalshi', 'heron', 'darch', 'summers', 'alive', 'yours', 'contact'];
  const max = document.documentElement.scrollHeight - innerHeight;
  const tops = ids.map((id) => document.getElementById(id).offsetTop);
  const at = (id, s) => {
    const i = ids.indexOf(id);
    const a = tops[i] / max;
    const b = i + 1 < ids.length ? tops[i + 1] / max : 1;
    return a + s * (b - a);
  };
  return { max, kalshi: [0.3, 0.6, 1.0].map((s) => at('kalshi', s)), darch: [0.1, 0.5, 0.9].map((s) => at('darch', s)) };
}
```

Record the six g values and `max`.

- [ ] **Step 6: G3 stills and the counter**

For each kalshi g (s = 0.3, 0.6, 1.0): `browser_navigate` to `http://localhost:3005/?still=1&g=<g>`, `browser_wait_for` time 4, `browser_take_screenshot` to `.playwright-mcp/gates/g3-s<s>.png`.

Then the counter on the live page: `browser_navigate` to `http://localhost:3005/` (introPlayed still set), and `browser_evaluate` with the three kalshi g values and `max` written in for `G3`, `G6`, `G10` and `MAX`:

```js
async () => {
  const read = () => document.querySelector('[data-counter]').textContent;
  const go = async (g) => {
    window.scrollTo(0, g * MAX);
    await new Promise((r) => setTimeout(r, 2500));
    return read();
  };
  return [await go(G3), await go(G6), await go(G10), await go(G3)];
}
```

Pass condition: the first three numbers strictly increase, the third is `30,000 trades`, and the fourth is still `30,000 trades` (latched: scrolling back never counts down).

- [ ] **Step 7: G4 stills and the wheel**

For each darch g (s = 0.1, 0.5, 0.9): `browser_navigate` to `http://localhost:3005/?still=1&g=<g>`, `browser_wait_for` time 4, `browser_take_screenshot` to `.playwright-mcp/gates/g4-d<s>.png`. On the s = 0.5 page, after its screenshot, `browser_wait_for` time 0.5 and `browser_take_screenshot` to `.playwright-mcp/gates/g4-d0.5-later.png` (0.5 s at 0.5 rad/s is about 14°, half a paddle spacing, so the two frames differ visibly).

- [ ] **Step 8: Hand to the gate judge**

Stop the server. Dispatch an Opus visual-check agent with: the fourteen stills; the numbers from Steps 4 and 6; spec §14's G2, G3 and G4 rows verbatim; spec §2's "If a still reads as Kyoto, Ghibli or a toy town it fails its gate"; and these checks: G2 `t1.0` shows only the hut lit; `t1.9` adds the nist cabin; `t2.6` and `t3.2` show the mill's windows lit; `t3.7` shows the mill's rows going out while the hillside sites light; `t5.0` shows a short trickle of amber at the ridge's left end and the mill dark; `g2-live-hut-label.png` shows the hut label legible next to the hut. G3 shows the ridge filling left to right over a dark crest line, a band and not scattered glitter. G4 `d0.1` shows the bottom three rows lit, `d0.5` all four, `d0.9` only the bottom row, and `d0.5` against `d0.5-later` shows the wheel rotated.

- [ ] **Step 9: Act on the verdict**

On a pass, record it in the stage's ledger entry; nothing is committed (the stills are gitignored). On a failure, apply only spec §14's remedy for that gate as a new task in this file, numbered 3.14 onward (3.13 is the summers arrival labels): G2, retime the gaps or shorten the mill's beat in `src/valley/ignition.ts` (never reorder); G3, widen the jitter band in `src/valley/ridge.ts` or lower `RIDGE_POINT_WORLD` in `src/gl/ridgeGeometry.ts`; G4, retime the row thresholds in `src/gl/mill.ts` or raise `MILL_AXLE_Y` in `src/gl/millWheelGeometry.ts`. Then rerun this task.

**Verify:**
- The fourteen files exist under `.playwright-mcp/gates/` and `git status --short` lists none of them.
- Step 4's result has all seven keys in chain order and `goneAfterFirstMs` ≤ 6200; Step 6's result rises strictly to `30,000 trades` and stays there on the way back.
- The judge's verdict names G2, G3 and G4 individually.

---

### Task 3.13: Section 05's arrival labels (the two cabins)

Spec §3 table, row 05 summers, "triggered on arrival" column: "the two cabin labels (same strings as the ignition labels)". Stage 3 otherwise fades labels only on the intro clock (`writeLabelAlpha(introT)`), so without this task the nist and wvu labels never show again after the chain. **Run this task after Task 3.11 and before the gate, Task 3.12.**

Readings where the spec is silent: "arrival" is the rising edge of `inSection(g, ranges, 'summers')` (Task 3.10's boundary rule); the gate re-arms as soon as the reader leaves section 05, so every arrival shows the labels once. The labels use the ignition timing (`LABEL_FADE_IN`, `LABEL_HOLD`, `LABEL_FADE_OUT`) counted from the arrival, for the `nist` and `wvu` anchors only, and merge with `max()` into `LABEL_ALPHA`, so an intro fade and an arrival fade never fight. The merge happens in `Driver.tsx` right after `writeLabelAlpha`, because that is where `LABEL_ALPHA` is written; `applyLights` owns `lit`, not the label alphas. Allocation-free.

**Files:**
- Create: `src/gl/arrival.ts`
- Test: `src/gl/arrival.test.ts`
- Modify: `src/gl/Driver.tsx` (one ref, one line after `writeLabelAlpha`)

**Interfaces:**
- Consumes: `LABEL_FADE_IN`, `LABEL_HOLD`, `LABEL_FADE_OUT`, `writeLabelAlpha` (`./chain`, Task 3.7); `inSection` (`./pulse`, Task 3.10); `EMITTER_INDEX`, `LABEL_ALPHA`, `EMITTER_COUNT` (`./projection`); `fixtureRanges`, `gAt` (`./frameFixture`, Task 3.7).
- Produces:
  - `export const ARRIVAL_SPAN = LABEL_HOLD + LABEL_FADE_OUT` (2.0 s)
  - `export interface ArrivalGate { inside: boolean; firedAt: number | null }`, `export function createArrivalGate(): ArrivalGate`
  - `export function stepArrivalGate(gate: ArrivalGate, inside: boolean, t: number): number | null` (seconds since the last arrival while under `ARRIVAL_SPAN`, else null)
  - `export function arrivalAlpha(arrivalT: number | null): number`
  - `export function mergeArrivalLabels(arrivalT: number | null, out: Float32Array): void` (raises `out[nist]` and `out[wvu]` to `arrivalAlpha`, never lowers anything)

- [ ] **Step 1: Write the failing test `src/gl/arrival.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { EMITTER_COUNT, EMITTER_INDEX } from './projection';
import { LABEL_FADE_IN, LABEL_HOLD, writeLabelAlpha } from './chain';
import { inSection } from './pulse';
import { fixtureRanges, gAt } from './frameFixture';
import { ARRIVAL_SPAN, arrivalAlpha, createArrivalGate, mergeArrivalLabels, stepArrivalGate } from './arrival';

const ranges = fixtureRanges();

describe('summers arrival labels (spec §3 row 05)', () => {
  it('fires on the rising edge into section 05 and re-arms on leaving', () => {
    const gate = createArrivalGate();
    const darch = gAt(ranges, 'darch', 0.5);
    const summers = gAt(ranges, 'summers', 0.05);
    expect(inSection(summers, ranges, 'summers')).toBe(true);
    expect(stepArrivalGate(gate, inSection(darch, ranges, 'summers'), 10)).toBeNull();
    expect(stepArrivalGate(gate, inSection(summers, ranges, 'summers'), 11)).toBe(0);
    expect(stepArrivalGate(gate, true, 12)).toBe(1);
    expect(stepArrivalGate(gate, true, 11 + ARRIVAL_SPAN + 0.01)).toBeNull();
    expect(stepArrivalGate(gate, false, 20)).toBeNull();
    expect(stepArrivalGate(gate, true, 21)).toBe(0);
  });

  it('a reader already inside at the first frame counts as arriving', () => {
    const gate = createArrivalGate();
    expect(stepArrivalGate(gate, true, 5)).toBe(0);
  });

  it('uses the ignition label timing', () => {
    expect(arrivalAlpha(null)).toBe(0);
    expect(arrivalAlpha(LABEL_FADE_IN / 2)).toBeCloseTo(0.5, 6);
    expect(arrivalAlpha(1)).toBe(1);
    expect(arrivalAlpha(LABEL_HOLD + 0.2)).toBeCloseTo(0.5, 6);
    expect(arrivalAlpha(ARRIVAL_SPAN)).toBe(0);
  });

  it('raises only the nist and wvu labels, by max, after writeLabelAlpha', () => {
    const out = new Float32Array(EMITTER_COUNT);
    writeLabelAlpha(null, out);
    mergeArrivalLabels(1, out);
    expect(out[EMITTER_INDEX.nist]).toBe(1);
    expect(out[EMITTER_INDEX.wvu]).toBe(1);
    expect(out[EMITTER_INDEX.hut]).toBe(0);
    expect(out[EMITTER_INDEX.bar2]).toBe(0);
    out[EMITTER_INDEX.nist] = 1;
    mergeArrivalLabels(LABEL_FADE_IN / 2, out);
    expect(out[EMITTER_INDEX.nist]).toBe(1);
    expect(out[EMITTER_INDEX.wvu]).toBeCloseTo(1, 6);
    mergeArrivalLabels(null, out);
    expect(out[EMITTER_INDEX.nist]).toBe(1);
  });

  it('Driver merges the arrival labels right after writeLabelAlpha', () => {
    const s = readFileSync(new URL('./Driver.tsx', import.meta.url), 'utf8');
    const w = s.indexOf('writeLabelAlpha(f.inputs.introT, LABEL_ALPHA);');
    const m = s.indexOf("mergeArrivalLabels(stepArrivalGate(arrival.current, inSection(f.inputs.g, f.inputs.ranges, 'summers'), now), LABEL_ALPHA);");
    expect(w).toBeGreaterThan(-1);
    expect(m).toBeGreaterThan(w);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/gl/arrival.test.ts`
Expected: FAIL with `Failed to resolve import "./arrival"`.

- [ ] **Step 3: Write `src/gl/arrival.ts`**

```ts
// Section 05's arrival trigger (spec §3 row 05): arriving in summers shows the two cabin labels (nist, wvu) again,
// with the same strings and the same fade timing as the ignition labels. The gate fires on the rising edge into the
// section and re-arms on leaving. The Driver merges the result into LABEL_ALPHA after writeLabelAlpha. Allocation-free.
import { LABEL_FADE_IN, LABEL_FADE_OUT, LABEL_HOLD } from './chain';
import { EMITTER_INDEX } from './projection';

export const ARRIVAL_SPAN = LABEL_HOLD + LABEL_FADE_OUT;

const NIST = EMITTER_INDEX.nist;
const WVU = EMITTER_INDEX.wvu;

export interface ArrivalGate { inside: boolean; firedAt: number | null }

export function createArrivalGate(): ArrivalGate {
  return { inside: false, firedAt: null };
}

export function stepArrivalGate(gate: ArrivalGate, inside: boolean, t: number): number | null {
  if (inside && !gate.inside) gate.firedAt = t;
  gate.inside = inside;
  if (gate.firedAt === null) return null;
  const a = t - gate.firedAt;
  if (a >= ARRIVAL_SPAN) {
    gate.firedAt = null;
    return null;
  }
  return a;
}

export function arrivalAlpha(arrivalT: number | null): number {
  if (arrivalT === null || arrivalT < 0) return 0;
  if (arrivalT < LABEL_FADE_IN) return arrivalT / LABEL_FADE_IN;
  if (arrivalT < LABEL_HOLD) return 1;
  if (arrivalT < ARRIVAL_SPAN) return 1 - (arrivalT - LABEL_HOLD) / LABEL_FADE_OUT;
  return 0;
}

export function mergeArrivalLabels(arrivalT: number | null, out: Float32Array): void {
  const a = arrivalAlpha(arrivalT);
  if (a <= 0) return;
  if (out[NIST] < a) out[NIST] = a;
  if (out[WVU] < a) out[WVU] = a;
}
```

- [ ] **Step 4: Step the gate in `src/gl/Driver.tsx`**

Add `import { createArrivalGate, mergeArrivalLabels, stepArrivalGate, type ArrivalGate } from './arrival';` (`inSection` is already imported from `./pulse` by Task 3.10). In the component body, next to the pulse gate ref:

```ts
const arrival = useRef<ArrivalGate>(createArrivalGate());
```

In `useFrame`, on the line directly after `writeLabelAlpha(f.inputs.introT, LABEL_ALPHA);`:

```ts
    mergeArrivalLabels(stepArrivalGate(arrival.current, inSection(f.inputs.g, f.inputs.ranges, 'summers'), now), LABEL_ALPHA);
```

- [ ] **Step 5: Run the tests and see them pass**

Run: `npx vitest run src/gl/arrival.test.ts src/gl`
Expected: PASS (arrival 5 tests), including Stage 2's zero-allocation Driver test.

- [ ] **Step 6: Lint, typecheck, commit**

```bash
npx tsc --noEmit && npm run lint && npx vitest run
git add src/gl/arrival.ts src/gl/arrival.test.ts src/gl/Driver.tsx
git commit -m "Show the two cabin labels on arrival in section 05"
```

**Verify:**
- `npx vitest run src/gl/arrival.test.ts` passes.
- `grep -n "mergeArrivalLabels" src/gl/Driver.tsx` prints the import and one call, after `writeLabelAlpha`.
- `npm run dev`, intro played: scroll from section 04 into 05; the nist and wvu labels fade in by their cabins, hold about 1.6 s and fade out; the other five labels stay hidden. Scroll back into 04 and down into 05 again: they show again.
