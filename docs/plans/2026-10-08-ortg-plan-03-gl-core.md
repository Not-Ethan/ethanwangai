# Stage 2 — GL core: scene, camera, sky, terrain, river, buildings, windows, glow, driver

> Part of `2026-10-08-ortg-plan-00-index.md`. Read the index's Global Constraints, Review Focus and Interface contracts, then the spec `2026-10-08-only-running-things-glow-design.md` §3 (view conventions and portrait yaw), §4 and §4.1–§4.5 (camera, ground, river, sky, buildings), §4.8 (light rule), §6 (rendering), §7 (warm-up and T0), §8 (clocks), §9 (palette), §11 (no WebGL, `?nogl=1`) and §12 (allocation, silent killers). This stage builds the one fixed R3F canvas over the still: sky, stars, moon, terrain, river, mist, merged building bodies, one instanced draw of window quads, one instanced draw of glow sprites, the camera rig, the pure frame driver and its `useFrame`, the warm-up with its 4 s compile timeout, the error boundary, and the DOM labels wired to projected emitter positions. Ignition, ridge, hedge lines, mill wheel and rows, rain, pulse and houses are Stage 3 and Stage 4: in this stage every registered emitter is simply lit at rest (the visitor stays dark because its lot is empty, §4.7). The stage ends with **Gate G1 (valley still)**.

**Order.** Task 2.1 first. Task 2.2 after 2.1. Tasks 2.3, 2.4 and 2.5 are **[parallel-safe]** after 2.2 (disjoint files). Task 2.6 after 2.5 (it imports `shaders/inject.ts`). Task 2.7 after 2.3–2.6 (it mounts them). Task 2.8 after 2.7 (both edit `Site.tsx`). Task 2.9 (the gate) last.

**Names this stage takes from Stages 0 and 1 that the index does not pin.** The index contracts are law and are used verbatim. These further names come from the Stage 0 and Stage 1 plan files; each task that uses them starts with a check step. If the landed code differs, use the landed name (it shipped first) and change only the import or key, never the value:
- `src/valley/palette.ts` (Stage 0 Task 0.4) exports a flat `PALETTE` of hex strings, including `PALETTE.ink` (`#E9E4DA`), `PALETTE.wall` (`#1A1F28`), `PALETTE.roof` (`#11151C`), `PALETTE.porch` (`#FFD9A0`), `PALETTE.river` (`#6E8AA6`), `PALETTE.mist` (`#8FA3B8`).
- `src/site/copy.ts` (Stage 0 Task 0.5) exports `copy` with `copy.open.labels: Record<IgnitionLabelKey, string>` and `type IgnitionLabelKey = 'hut' | 'nist' | 'mill' | 'kalshiLamp' | 'wvu' | 'bars' | 'hillside'`.
- `src/site/Site.tsx` (Stage 0 Task 0.8) renders, inside `ScrollProvider`, `<div className="valley-canvas" data-valley aria-hidden="true" style={{ backgroundImage: `url(${STILL})` }} />` (the still, z 0, `pointer-events: none` via `globals.css`), then `Nav`, then `<main className="relative z-10">`. `src/site/Labels.tsx` (Task 0.6) exports `Labels()`, the static `ul[data-labels]` list rendered inside `Open`. Stage 0's `exported.test.ts` asserts the exported HTML carries `class="valley-canvas"` with `valley-still.jpg`: keep that div.
- Stage 1 (`2026-10-08-ortg-plan-02-valley.md`): `buildTerrain().colors` are already linear; `timelineAt` returns one shared object overwritten on each call and `environmentAt` returns frozen entries of a precomputed table (tod quantised to 0.001), so neither allocates; `Environment` colours are lower-case `#rrggbb`; `moonPos` is a world point on a 200-unit dome; `EAST_DIR = [1, 0, 0]`; the bars' registry colour is `PALETTE.porch`.
- `src/gl/useTier.ts` (rewired in Stage 0 Task 0.1) returns at least `{ tier, dpr, shadows, onDecline }`; `useScroll()` returns `{ state, reducedMotion, tier }` with `state.current.g` and `state.current.ranges`.

**Light rule (spec §4.8).** A test added in Task 2.6 greps `src/gl/` for `emissive` and `AdditiveBlending` (case-insensitive) and fails if either appears outside `Windows.tsx`, `Glow.tsx`, `Ridge.tsx`, `shaders/windows.ts`, `shaders/glow.ts`, `shaders/ridge.ts`. Do not write either word in any other file under `src/gl/`, comments included.

**Every commit that touches `src/`** runs `npm run lint`, `npx tsc --noEmit` and `npx vitest run` first, all green.

---

### Task 2.1: Projection and camera core (pure)

Spec: §3 (view conventions: yaw and pitch are look-at offsets `tan(angle) · d`, never `camera.rotation`; `fovScale` multiplies the base fov; portrait by aspect), §4 (hero and portrait cameras, every emitter in frame), §6 (`CameraRig`: pointer parallax ±1° damped, recomposition on aspect change; labels from cached projections, no `getBoundingClientRect`), §12 (clamp off-screen labels and hide them). Review Focus 2.

**Files:**
- Create: `src/gl/projection.ts`, `src/gl/cameraCore.ts`
- Test: `src/gl/projection.test.ts`, `src/gl/cameraCore.test.ts`

**Interfaces:**
- Consumes: `EMITTERS` from `@/valley/lights`; `EmitterId`, `Vec3` from `@/valley/types`; `CAMERA_LANDSCAPE`, `CAMERA_PORTRAIT` from `@/valley/layout`.
- Produces:
  - `projection.ts` (imports nothing from three at runtime, so the DOM may import it):
    - `export const EMITTER_COUNT: number`
    - `export const EMITTER_INDEX: Readonly<Record<EmitterId, number>>` (index into `EMITTERS`)
    - `export const EMITTER_POSITIONS: Float32Array` (x, y, z per emitter, `EMITTERS` order)
    - `export const PROJECTED: Float32Array` (length `EMITTER_COUNT * 3`: NDC x, NDC y, visible 0/1 per emitter; the driver writes it, Labels reads it)
    - `export const LABEL_ALPHA: Float32Array` (length `EMITTER_COUNT`, 0..1, all 0 in this stage; Stage 3 writes it)
    - `export interface ProjectionCamera { matrixWorldInverse: { elements: ArrayLike<number> }; projectionMatrix: { elements: ArrayLike<number> } }`
    - `export function projectEmitters(camera: ProjectionCamera, positions: Float32Array, out: Float32Array): void`
    - `export interface LabelPlacement { x: number; y: number; visible: boolean }`
    - `export function placeLabel(projected: Float32Array, i: number, vw: number, vh: number, margin: number, out: LabelPlacement): LabelPlacement`
  - `cameraCore.ts`:
    - `export const PARALLAX_DEG = 1`, `export const PARALLAX_TAU = 0.4`, `export const CAMERA_NEAR = 1`, `export const CAMERA_FAR = 260`
    - `export interface Rig { portrait: boolean; parallaxOn: boolean; pointer: THREE.Vector2; parallax: THREE.Vector2; lookAt: THREE.Vector3 }`
    - `export function createRig(): Rig`
    - `export function setRigMode(rig: Rig, portrait: boolean, parallaxOn: boolean): void`
    - `export function resetPointer(rig: Rig): void`
    - `export function isPortrait(width: number, height: number): boolean`
    - `export function normalizePointer(clientX: number, clientY: number, width: number, height: number, out: THREE.Vector2): THREE.Vector2`
    - `export function composeCamera(rig: Rig, yawDeg: number, pitchDeg: number, fovScale: number, dt: number, camera: THREE.PerspectiveCamera): void`

- [ ] **Step 1: Write the failing test `src/gl/projection.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { EMITTERS } from '@/valley/lights';
import { CAMERA_LANDSCAPE } from '@/valley/layout';
import {
  EMITTER_COUNT, EMITTER_INDEX, EMITTER_POSITIONS, LABEL_ALPHA, PROJECTED,
  placeLabel, projectEmitters, type LabelPlacement,
} from './projection';

function heroCamera(): THREE.PerspectiveCamera {
  const c = new THREE.PerspectiveCamera(CAMERA_LANDSCAPE.fov, 1440 / 900, 1, 260);
  c.position.set(...CAMERA_LANDSCAPE.position);
  c.lookAt(...CAMERA_LANDSCAPE.lookAt);
  c.updateMatrixWorld();
  return c;
}

describe('projection', () => {
  it('indexes every emitter in registry order and sizes the shared buffers', () => {
    EMITTERS.forEach((e, i) => expect(EMITTER_INDEX[e.id]).toBe(i));
    expect(EMITTER_COUNT).toBe(EMITTERS.length);
    expect(EMITTER_POSITIONS.length).toBe(EMITTER_COUNT * 3);
    expect(PROJECTED.length).toBe(EMITTER_COUNT * 3);
    expect(Array.from(LABEL_ALPHA)).toEqual(new Array(EMITTER_COUNT).fill(0));
    EMITTERS.forEach((e, i) => {
      expect(EMITTER_POSITIONS[i * 3]).toBeCloseTo(e.position[0], 5);
      expect(EMITTER_POSITIONS[i * 3 + 1]).toBeCloseTo(e.position[1], 5);
      expect(EMITTER_POSITIONS[i * 3 + 2]).toBeCloseTo(e.position[2], 5);
    });
  });

  it('matches three Vector3.project for every emitter', () => {
    const c = heroCamera();
    const out = new Float32Array(EMITTER_COUNT * 3);
    projectEmitters(c, EMITTER_POSITIONS, out);
    EMITTERS.forEach((e, i) => {
      const v = new THREE.Vector3(...e.position).project(c);
      expect(out[i * 3]).toBeCloseTo(v.x, 4);
      expect(out[i * 3 + 1]).toBeCloseTo(v.y, 4);
      expect(out[i * 3 + 2]).toBe(1);
    });
  });

  it('zeroes and hides a point behind the camera', () => {
    const c = heroCamera();
    const out = Float32Array.of(9, 9, 9);
    projectEmitters(c, Float32Array.of(0, 14, 200), out);
    expect(Array.from(out)).toEqual([0, 0, 0]);
  });

  it('places labels in pixels, clamps them to the margin and hides invalid ones (spec §12)', () => {
    const proj = Float32Array.of(0, 0, 1, 0.999, -0.999, 1, 0.5, 0.5, 0, 40, -90, 1, Number.NaN, 0, 1);
    const out: LabelPlacement = { x: -1, y: -1, visible: false };
    expect(placeLabel(proj, 0, 1440, 900, 16, out)).toEqual({ x: 720, y: 450, visible: true });
    expect(placeLabel(proj, 1, 1440, 900, 16, out)).toEqual({ x: 1424, y: 884, visible: true });
    expect(placeLabel(proj, 2, 1440, 900, 16, out).visible).toBe(false);
    expect(placeLabel(proj, 3, 1440, 900, 16, out)).toEqual({ x: 1424, y: 884, visible: true });
    expect(placeLabel(proj, 4, 1440, 900, 16, out).visible).toBe(false);
    expect(placeLabel(proj, 9, 1440, 900, 16, out).visible).toBe(false);
  });
});
```

- [ ] **Step 2: Write the failing test `src/gl/cameraCore.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { EMITTERS } from '@/valley/lights';
import type { Vec3 } from '@/valley/types';
import { CAMERA_LANDSCAPE, CAMERA_PORTRAIT } from '@/valley/layout';
import {
  CAMERA_FAR, CAMERA_NEAR, PARALLAX_TAU,
  composeCamera, createRig, isPortrait, normalizePointer, setRigMode,
} from './cameraCore';
import { EMITTER_COUNT, EMITTER_INDEX, EMITTER_POSITIONS, projectEmitters } from './projection';

const DEG = Math.PI / 180;
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const D_LAND = dist(CAMERA_LANDSCAPE.position, CAMERA_LANDSCAPE.lookAt);

function camera(width: number, height: number): THREE.PerspectiveCamera {
  return new THREE.PerspectiveCamera(CAMERA_LANDSCAPE.fov, width / height, CAMERA_NEAR, CAMERA_FAR);
}
function project(c: THREE.PerspectiveCamera): Float32Array {
  c.updateMatrixWorld();
  const out = new Float32Array(EMITTER_COUNT * 3);
  projectEmitters(c, EMITTER_POSITIONS, out);
  return out;
}

describe('composeCamera', () => {
  it('sits at the landscape position and looks at the base look-at with no offset', () => {
    const rig = createRig();
    const c = camera(1440, 900);
    composeCamera(rig, 0, 0, 1, 1 / 60, c);
    expect(c.position.toArray()).toEqual([...CAMERA_LANDSCAPE.position]);
    expect(c.fov).toBeCloseTo(CAMERA_LANDSCAPE.fov, 9);
    c.updateMatrixWorld();
    const p = new THREE.Vector3(...CAMERA_LANDSCAPE.lookAt).project(c);
    expect(Math.abs(p.x)).toBeLessThan(1e-6);
    expect(Math.abs(p.y)).toBeLessThan(1e-6);
  });

  it('turns by moving the look-at by tan(angle) times the base distance, never the position (spec §3)', () => {
    const rig = createRig();
    const c = camera(1440, 900);
    composeCamera(rig, 4, 1, 0.96, 1 / 60, c);
    expect(rig.lookAt.x).toBeCloseTo(CAMERA_LANDSCAPE.lookAt[0] + Math.tan(4 * DEG) * D_LAND, 6);
    expect(rig.lookAt.y).toBeCloseTo(CAMERA_LANDSCAPE.lookAt[1] + Math.tan(1 * DEG) * D_LAND, 6);
    expect(rig.lookAt.z).toBeCloseTo(CAMERA_LANDSCAPE.lookAt[2], 9);
    expect(c.position.toArray()).toEqual([...CAMERA_LANDSCAPE.position]);
    expect(c.fov).toBeCloseTo(CAMERA_LANDSCAPE.fov * 0.96, 9);
  });

  it('positive yaw turns the view toward +x, so the mill slides left in the frame', () => {
    const rig = createRig();
    const c = camera(1440, 900);
    composeCamera(rig, 0, 0, 1, 1 / 60, c);
    const before = project(c)[EMITTER_INDEX.mill * 3];
    composeCamera(rig, 7, 0, 0.95, 1 / 60, c);
    const after = project(c)[EMITTER_INDEX.mill * 3];
    expect(after).toBeLessThan(before);
  });

  it('keeps every emitter within 0.85 NDC at 1440 x 900', () => {
    const rig = createRig();
    const c = camera(1440, 900);
    composeCamera(rig, 0, 0, 1, 1 / 60, c);
    const out = project(c);
    EMITTERS.forEach((e, i) => {
      expect(Math.abs(out[i * 3]), e.id).toBeLessThanOrEqual(0.85);
      expect(Math.abs(out[i * 3 + 1]), e.id).toBeLessThanOrEqual(0.85);
    });
  });

  it('recomposes to the portrait camera when the aspect flips, and back (Review Focus 2)', () => {
    const rig = createRig();
    const c = camera(1440, 900);
    composeCamera(rig, 0, 0, 1, 1 / 60, c);
    expect(c.position.toArray()).toEqual([...CAMERA_LANDSCAPE.position]);

    setRigMode(rig, isPortrait(390, 844), false);
    c.aspect = 390 / 844;
    c.updateProjectionMatrix();
    composeCamera(rig, 0, 0, 1, 1 / 60, c);
    expect(c.position.toArray()).toEqual([...CAMERA_PORTRAIT.position]);
    expect(c.fov).toBeCloseTo(CAMERA_PORTRAIT.fov, 9);
    const out = project(c);
    EMITTERS.forEach((e, i) => expect(Math.abs(out[i * 3 + 1]), e.id).toBeLessThanOrEqual(0.85));

    setRigMode(rig, isPortrait(1440, 900), false);
    c.aspect = 1440 / 900;
    c.updateProjectionMatrix();
    composeCamera(rig, 0, 0, 1, 1 / 60, c);
    expect(c.position.toArray()).toEqual([...CAMERA_LANDSCAPE.position]);
    expect(c.fov).toBeCloseTo(CAMERA_LANDSCAPE.fov, 9);
  });

  it('adds at most 1 degree of pointer parallax, damped with tau 0.4 s', () => {
    const rig = createRig();
    const c = camera(1440, 900);
    setRigMode(rig, false, true);
    normalizePointer(1440, 450, 1440, 900, rig.pointer);
    expect(rig.pointer.toArray()).toEqual([1, 0]);
    composeCamera(rig, 0, 0, 1, PARALLAX_TAU, c);
    expect(rig.parallax.x).toBeCloseTo(1 - Math.exp(-1), 6);
    composeCamera(rig, 0, 0, 1, 10, c);
    expect(rig.lookAt.x).toBeCloseTo(CAMERA_LANDSCAPE.lookAt[0] + Math.tan(1 * DEG) * D_LAND, 4);
  });

  it('ignores the pointer when parallax is off (phone, reduced motion)', () => {
    const rig = createRig();
    const c = camera(1440, 900);
    normalizePointer(0, 0, 1440, 900, rig.pointer);
    composeCamera(rig, 0, 0, 1, 10, c);
    expect(rig.lookAt.x).toBeCloseTo(CAMERA_LANDSCAPE.lookAt[0], 9);
    expect(rig.lookAt.y).toBeCloseTo(CAMERA_LANDSCAPE.lookAt[1], 9);
  });
});
```

- [ ] **Step 3: Run both and see them fail**

Run: `npx vitest run src/gl/projection.test.ts src/gl/cameraCore.test.ts`
Expected: FAIL, `Failed to resolve import "./projection"` and `"./cameraCore"`.

- [ ] **Step 4: Write `src/gl/projection.ts`**

```ts
// Emitter projection (spec §6 Driver and Labels, §12 "projected labels off-screen writing huge transforms").
// Pure arithmetic on a camera's two matrices. It imports nothing from three at runtime, so the DOM labels
// (src/site/Labels.tsx) can read PROJECTED without pulling three into the site chunk. Allocation-free per call.
import type { EmitterId } from '@/valley/types';
import { EMITTERS } from '@/valley/lights';

export const EMITTER_COUNT = EMITTERS.length;

export const EMITTER_INDEX: Readonly<Record<EmitterId, number>> = Object.fromEntries(
  EMITTERS.map((e, i) => [e.id, i]),
) as Record<EmitterId, number>;

/** x, y, z per emitter in EMITTERS order: the anchor every label and hit test projects. */
export const EMITTER_POSITIONS: Float32Array = Float32Array.from(
  EMITTERS.flatMap((e) => [e.position[0], e.position[1], e.position[2]]),
);

/** The driver writes NDC x, NDC y and visible (1 or 0) per emitter here every frame; Labels reads it. */
export const PROJECTED = new Float32Array(EMITTER_COUNT * 3);

/** Label opacity per emitter, 0..1. All 0 in Stage 2; Stage 3's ignition writes it. */
export const LABEL_ALPHA = new Float32Array(EMITTER_COUNT);

export interface ProjectionCamera {
  matrixWorldInverse: { elements: ArrayLike<number> };
  projectionMatrix: { elements: ArrayLike<number> };
}

/**
 * Projects every xyz triple in `positions` through the camera into `out` as NDC x, NDC y, visible. A point behind the
 * camera (clip w <= 0) is written as 0, 0, 0. Visible means inside the NDC square. The caller must have run
 * camera.updateMatrixWorld() this frame so matrixWorldInverse is current.
 */
export function projectEmitters(camera: ProjectionCamera, positions: Float32Array, out: Float32Array): void {
  const v = camera.matrixWorldInverse.elements;
  const p = camera.projectionMatrix.elements;
  const n = Math.floor(Math.min(positions.length, out.length) / 3);
  for (let i = 0; i < n; i++) {
    const o = i * 3;
    const x = positions[o];
    const y = positions[o + 1];
    const z = positions[o + 2];
    const vx = v[0] * x + v[4] * y + v[8] * z + v[12];
    const vy = v[1] * x + v[5] * y + v[9] * z + v[13];
    const vz = v[2] * x + v[6] * y + v[10] * z + v[14];
    const cx = p[0] * vx + p[4] * vy + p[8] * vz + p[12];
    const cy = p[1] * vx + p[5] * vy + p[9] * vz + p[13];
    const cw = p[3] * vx + p[7] * vy + p[11] * vz + p[15];
    if (!(cw > 1e-6)) {
      out[o] = 0;
      out[o + 1] = 0;
      out[o + 2] = 0;
      continue;
    }
    const nx = cx / cw;
    const ny = cy / cw;
    out[o] = nx;
    out[o + 1] = ny;
    out[o + 2] = nx >= -1 && nx <= 1 && ny >= -1 && ny <= 1 ? 1 : 0;
  }
}

export interface LabelPlacement { x: number; y: number; visible: boolean }

/**
 * Emitter i's label position in CSS pixels, clamped to [margin, size - margin] on both axes. Hidden when the
 * projection flags it invisible, when either coordinate is not finite, or when i is out of range: a label never
 * receives a huge or NaN transform (spec §12).
 */
export function placeLabel(
  projected: Float32Array, i: number, vw: number, vh: number, margin: number, out: LabelPlacement,
): LabelPlacement {
  const o = i * 3;
  const nx = projected[o];
  const ny = projected[o + 1];
  if (!(projected[o + 2] >= 0.5) || !Number.isFinite(nx) || !Number.isFinite(ny)) {
    out.visible = false;
    return out;
  }
  out.x = Math.min(vw - margin, Math.max(margin, ((nx + 1) / 2) * vw));
  out.y = Math.min(vh - margin, Math.max(margin, ((1 - ny) / 2) * vh));
  out.visible = true;
  return out;
}
```

- [ ] **Step 5: Write `src/gl/cameraCore.ts`**

```ts
// The camera rig's pure core (spec §3 view conventions, §4 cameras, §6 CameraRig). The camera position never changes
// for an aspect: yaw and pitch move the look-at by tan(angle) times the base camera-to-look-at distance, fovScale
// multiplies the base fov. Portrait (width < height) swaps in CAMERA_PORTRAIT. Pointer parallax adds up to
// PARALLAX_DEG to yaw and pitch, damped with PARALLAX_TAU. Driver.tsx calls composeCamera from the one useFrame;
// CameraRig.tsx only keeps the rig's mode and pointer current. Allocation-free per call.
import * as THREE from 'three';
import { CAMERA_LANDSCAPE, CAMERA_PORTRAIT } from '@/valley/layout';

export const PARALLAX_DEG = 1;
export const PARALLAX_TAU = 0.4;
export const CAMERA_NEAR = 1;
export const CAMERA_FAR = 260;
const DEG = Math.PI / 180;

export interface Rig {
  portrait: boolean;          // aspect < 1: CAMERA_PORTRAIT
  parallaxOn: boolean;        // desktop tier and full motion
  pointer: THREE.Vector2;     // target, -1..1, x right, y up
  parallax: THREE.Vector2;    // damped toward pointer
  lookAt: THREE.Vector3;      // this frame's composed look-at
}

export function createRig(): Rig {
  return {
    portrait: false,
    parallaxOn: false,
    pointer: new THREE.Vector2(),
    parallax: new THREE.Vector2(),
    lookAt: new THREE.Vector3(...CAMERA_LANDSCAPE.lookAt),
  };
}

export function setRigMode(rig: Rig, portrait: boolean, parallaxOn: boolean): void {
  rig.portrait = portrait;
  rig.parallaxOn = parallaxOn;
  if (!parallaxOn) resetPointer(rig);
}

export function resetPointer(rig: Rig): void {
  rig.pointer.set(0, 0);
}

export function isPortrait(width: number, height: number): boolean {
  return width < height;
}

/** A window pointer position in -1..1 with y up. */
export function normalizePointer(
  clientX: number, clientY: number, width: number, height: number, out: THREE.Vector2,
): THREE.Vector2 {
  return out.set((clientX / Math.max(1, width)) * 2 - 1, 1 - (clientY / Math.max(1, height)) * 2);
}

/**
 * One frame of the camera: base pose for the rig's aspect, parallax damped, look-at offset by yaw and pitch, fov
 * scaled. Touches the projection matrix only when fov, near or far changed (R3F updates it on resize itself).
 */
export function composeCamera(
  rig: Rig, yawDeg: number, pitchDeg: number, fovScale: number, dt: number, camera: THREE.PerspectiveCamera,
): void {
  const base = rig.portrait ? CAMERA_PORTRAIT : CAMERA_LANDSCAPE;
  if (rig.parallaxOn) rig.parallax.lerp(rig.pointer, 1 - Math.exp(-Math.max(0, dt) / PARALLAX_TAU));
  else rig.parallax.set(0, 0);
  const yaw = (yawDeg + rig.parallax.x * PARALLAX_DEG) * DEG;
  const pitch = (pitchDeg + rig.parallax.y * PARALLAX_DEG) * DEG;
  const [px, py, pz] = base.position;
  const [lx, ly, lz] = base.lookAt;
  const d = Math.hypot(lx - px, ly - py, lz - pz);
  rig.lookAt.set(lx + Math.tan(yaw) * d, ly + Math.tan(pitch) * d, lz);
  camera.position.set(px, py, pz);
  camera.lookAt(rig.lookAt);
  const fov = base.fov * fovScale;
  if (camera.fov !== fov || camera.near !== CAMERA_NEAR || camera.far !== CAMERA_FAR) {
    camera.fov = fov;
    camera.near = CAMERA_NEAR;
    camera.far = CAMERA_FAR;
    camera.updateProjectionMatrix();
  }
}
```

(Array destructuring of a `readonly [number, number, number]` compiles to indexed reads; it does not allocate.)

- [ ] **Step 6: Run both and see them pass**

Run: `npx vitest run src/gl/projection.test.ts src/gl/cameraCore.test.ts`
Expected: PASS, 11 tests. If "keeps every emitter within 0.85 NDC" fails, the layout in `src/valley/layout.ts` violates spec §4; stop and report it against Stage 1 rather than loosening the bound.

- [ ] **Step 7: Lint, typecheck, full suite, commit**

```bash
npm run lint && npx tsc --noEmit && npx vitest run
git add src/gl/projection.ts src/gl/projection.test.ts src/gl/cameraCore.ts src/gl/cameraCore.test.ts
git commit -m "Add emitter projection and the camera rig core"
```

**Verify:** `npx vitest run src/gl/projection.test.ts src/gl/cameraCore.test.ts` passes; `grep -n "from 'three'" src/gl/projection.ts` prints only an `import type` line or nothing; `grep -n "rotation" src/gl/cameraCore.ts` prints nothing (yaw is a look-at offset).

---

### Task 2.2: driverCore — uniforms, applyFrame, scene sync (pure)

Spec: §5.1 (timeline fields, reveals latch), §5.2 (environment keyframes), §6 (Driver: reads the scroll ref, evaluates `timelineAt` and `environmentAt`, latches reveals, writes uniforms and instance attributes, updates fog and lights; four point lights at the hut, the mill, the kalshi lamp and the visitor house with intensities from their `aLit`), §8 (reduced motion freezes ambient time), §12 (no allocation in the frame loop, tested by `heapUsed` over 1,000 calls), §16 integration (`applyFrame` writes `uReveal` from `g` and latches it). Index contract `src/gl/driverCore.ts`. Review Focus 3 is Stage 3's; this task builds the latch it extends.

**Decisions this task makes where the index is silent (also in doubts):**
- `ValleyUniforms` is not spelled out in the index; it is defined here as plain `{ value }` holders with three `Color` and `Vector3` (math classes, fine in Node). Shader materials share these holders by reference.
- `FrameInputs` gains one optional field, `portrait?: boolean`, because `timelineAt(g, ranges, portrait?)` needs it and the contract has no aspect input. Every other field is the contract's, unchanged.
- `applyFrame` has no camera, so it does not project. `FrameTargets.projected` is filled by `projectEmitters` (Task 2.1) from `Driver.tsx` right after `applyFrame` and the camera compose, in the same `useFrame`.
- `timelineAt` (one shared result object) and `environmentAt` (frozen entries of a precomputed table) do not allocate (Stage 1). `applyFrame` calls `timelineAt` every frame and rewrites the environment uniforms only when `environmentAt` hands back a different table entry or a different uniforms object. Do not cache the timeline object across frames: Stage 1 overwrites it on every call, from any caller.
- Colours are written from the environment's `#rrggbb` strings by a char-code parser into existing `Color`s (`Color.set(string)` runs a regex and allocates).
- At rest every emitter's level is 1 except `visitor`, which is 0 (empty lot, §4.7).

**Files:**
- Create: `src/gl/driverCore.ts`
- Test: `src/gl/driverCore.test.ts`

**Interfaces:**
- Consumes: `timelineAt`, `environmentAt`, `SECTIONS`, `sectionRanges`, `EMITTERS` and the types `EmitterId`, `Environment`, `SectionRange`, `Timeline` from `@/valley/*`; `EMITTER_COUNT`, `EMITTER_INDEX`, `PROJECTED` from `./projection` (Task 2.1).
- Produces:
  - `export interface Uniform<T> { value: T }`
  - `export interface ValleyUniforms { uTime; uTod; uZenith; uHorizon; uEast; uFogColor; uFogNear; uFogFar; uSunDir; uSunColor; uSunIntensity; uHemiSky; uHemiGround; uStarAlpha; uMoonPos; uMoonAlpha; uYaw; uPitch; uFovScale; uRidgeReveal; uHedgeReveal; uDarchT; uRain }` (types in the code below)
  - `export function createUniforms(): ValleyUniforms`
  - `export interface FrameInputs` (the contract's fields plus `portrait?: boolean`), `export interface FrameTargets` (the contract's, verbatim)
  - `export function applyFrame(inputs: FrameInputs, targets: FrameTargets): void`
  - `export function createFrameTargets(uniforms?: ValleyUniforms, projected?: Float32Array): FrameTargets` (fresh uniforms and a fresh projected array by default; the name Stages 3 and 5 use in their tests)
  - `export interface Frame { inputs: FrameInputs; targets: FrameTargets }`, `export function createFrame(uniforms: ValleyUniforms, projected?: Float32Array): Frame` (`projected` defaults to the live `PROJECTED`)
  - `export function setFrameInputs(inputs: FrameInputs, g: number, ranges: SectionRange[], t: number, dt: number, introT: number | null, reducedMotion: boolean, portrait: boolean): void`
  - `export const MAX_DT = 0.1`, `export const REST_LIT: Float32Array`, `export function writeRestLights(lit: Float32Array): void`
  - `export function hexToColor(hex: string, out: THREE.Color): THREE.Color`
  - `export function scatterLit(lit: Float32Array, map: Uint8Array, count: number, out: Float32Array): boolean`
  - `export interface LitSink { lit: Float32Array; map: Uint8Array; count: number; attr: THREE.BufferAttribute | null }`
  - `export interface PointLightSpec { id: EmitterId; place: 'hut' | 'mill' | 'kalshiLamp' | 'lot'; lift: number; forward: number; base: number; distance: number }`, `export const POINT_LIGHTS: readonly PointLightSpec[]`
  - `export interface SceneRefs { fog; sun; points; windows; glow }` (types below), `export function createSceneRefs(): SceneRefs`
  - `export function attachFog(refs: SceneRefs, fog: { near: number; far: number } | null): void`
  - `export function attachSun(refs: SceneRefs, sun: { position: THREE.Vector3; intensity: number } | null): void`
  - `export function attachPointLight(refs: SceneRefs, k: number, light: { intensity: number } | null): void`
  - `export function attachSink(refs: SceneRefs, which: 'windows' | 'glow', sink: LitSink | null): void`
  - `export const SUN_DISTANCE = 80`, `export function syncScene(refs: SceneRefs, u: ValleyUniforms, lit: Float32Array): void`

- [ ] **Step 1: Write the failing test `src/gl/driverCore.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import type { SectionId, SectionRange } from '@/valley/types';
import { SECTIONS, sectionRanges } from '@/valley/sections';
import { timelineAt } from '@/valley/timeline';
import { environmentAt } from '@/valley/environment';
import { EMITTERS } from '@/valley/lights';
import {
  applyFrame, attachFog, attachPointLight, attachSink, attachSun, createFrame, createFrameTargets, createSceneRefs, createUniforms,
  hexToColor, POINT_LIGHTS, REST_LIT, scatterLit, setFrameInputs, SUN_DISTANCE, syncScene,
} from './driverCore';
import { EMITTER_COUNT, EMITTER_INDEX } from './projection';

function rangesAt(vh: number): SectionRange[] {
  let top = 0;
  const tops: number[] = [];
  for (const s of SECTIONS) {
    tops.push(top);
    top += (s.heightVh / 100) * vh;
  }
  return sectionRanges(tops, top, vh);
}
const RANGES = rangesAt(900);
function mid(id: SectionId): number {
  const r = RANGES.find((x) => x.id === id)!;
  return (r.start + r.end) / 2;
}
function frameAt(g: number, opts: { portrait?: boolean; reducedMotion?: boolean; t?: number } = {}) {
  const f = createFrame(createUniforms(), new Float32Array(EMITTER_COUNT * 3));
  setFrameInputs(f.inputs, g, RANGES, opts.t ?? 1, 1 / 60, null, opts.reducedMotion ?? false, opts.portrait ?? false);
  applyFrame(f.inputs, f.targets);
  return f;
}
const hex = (c: THREE.Color) => `#${c.getHexString()}`;

describe('applyFrame', () => {
  it('writes the environment for the timeline tod (spec §5.2)', () => {
    for (const g of [0, mid('kalshi'), mid('darch'), 1]) {
      const f = frameAt(g);
      const u = f.targets.uniforms;
      const tl = timelineAt(g, RANGES, false);
      const env = environmentAt(tl.tod);
      expect(u.uTod.value).toBeCloseTo(tl.tod, 9);
      expect(hex(u.uZenith.value)).toBe(env.zenith.toLowerCase());
      expect(hex(u.uHorizon.value)).toBe(env.horizon.toLowerCase());
      expect(hex(u.uEast.value)).toBe(env.east.toLowerCase());
      expect(hex(u.uFogColor.value)).toBe(env.fogColor.toLowerCase());
      expect(hex(u.uHemiSky.value)).toBe(env.hemiSky.toLowerCase());
      expect(hex(u.uHemiGround.value)).toBe(env.hemiGround.toLowerCase());
      expect(hex(u.uSunColor.value)).toBe(env.sunColor.toLowerCase());
      expect(u.uFogNear.value).toBe(env.fogNear);
      expect(u.uFogFar.value).toBe(env.fogFar);
      expect(u.uSunIntensity.value).toBe(env.sunIntensity);
      expect(u.uStarAlpha.value).toBe(env.starAlpha);
      expect(u.uMoonAlpha.value).toBe(env.moonAlpha);
      expect(u.uSunDir.value.toArray()).toEqual([...env.sunDir]);
      expect(u.uMoonPos.value.toArray()).toEqual([...env.moonPos]);
    }
  });

  it('writes the view and picks the portrait yaw column when portrait (spec §3)', () => {
    const g = mid('darch');
    const land = frameAt(g).targets.uniforms;
    const port = frameAt(g, { portrait: true }).targets.uniforms;
    expect(land.uYaw.value).toBeCloseTo(timelineAt(g, RANGES, false).view.yaw, 9);
    expect(port.uYaw.value).toBeCloseTo(timelineAt(g, RANGES, true).view.yaw, 9);
    expect(land.uPitch.value).toBeCloseTo(timelineAt(g, RANGES, false).view.pitch, 9);
    expect(land.uFovScale.value).toBeCloseTo(timelineAt(g, RANGES, false).view.fovScale, 9);
  });

  it('writes uRidgeReveal and uHedgeReveal from g and latches them (spec §2 reveals latch, §16)', () => {
    const f = createFrame(createUniforms(), new Float32Array(EMITTER_COUNT * 3));
    const u = f.targets.uniforms;
    const step = (g: number) => {
      setFrameInputs(f.inputs, g, RANGES, 1, 1 / 60, null, false, false);
      applyFrame(f.inputs, f.targets);
    };
    step(0);
    expect(u.uRidgeReveal.value).toBeCloseTo(0.01, 6);
    step(mid('kalshi'));
    const half = u.uRidgeReveal.value;
    expect(half).toBeGreaterThan(0.1);
    expect(half).toBeLessThan(1);
    step(0);
    expect(u.uRidgeReveal.value).toBe(half);
    step(mid('heron'));
    expect(u.uRidgeReveal.value).toBe(1);
    const hedge = u.uHedgeReveal.value;
    expect(hedge).toBeGreaterThan(0.1);
    step(0);
    expect(u.uHedgeReveal.value).toBe(hedge);
    expect(f.targets.latched).toEqual({ ridge: 1, hedge });
  });

  it('lets darchOverride win over the timeline', () => {
    const f = frameAt(0);
    f.inputs.darchOverride = 0.5;
    applyFrame(f.inputs, f.targets);
    expect(f.targets.uniforms.uDarchT.value).toBe(0.5);
  });

  it('freezes ambient time and drops rain under reduced motion (spec §8, §11)', () => {
    const live = frameAt(mid('darch'), { t: 42 });
    expect(live.targets.uniforms.uTime.value).toBe(42);
    expect(live.targets.uniforms.uRain.value).toBeCloseTo(timelineAt(mid('darch'), RANGES).rain, 9);
    const still = frameAt(mid('darch'), { t: 42, reducedMotion: true });
    expect(still.targets.uniforms.uTime.value).toBe(0);
    expect(still.targets.uniforms.uRain.value).toBe(0);
  });

  it('survives empty ranges (the provider has not measured yet) with finite values', () => {
    const f = createFrame(createUniforms(), new Float32Array(EMITTER_COUNT * 3));
    setFrameInputs(f.inputs, 0.3, [], 1, 1 / 60, null, false, false);
    expect(() => applyFrame(f.inputs, f.targets)).not.toThrow();
    const u = f.targets.uniforms;
    for (const v of [u.uTod.value, u.uYaw.value, u.uFovScale.value, u.uFogNear.value, u.uRidgeReveal.value]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('survives a NaN g by treating it as 0', () => {
    const f = frameAt(Number.NaN);
    expect(f.targets.uniforms.uTod.value).toBe(timelineAt(0, RANGES).tod);
  });

  it('createFrameTargets hands out independent targets', () => {
    const a = createFrameTargets();
    const b = createFrameTargets();
    expect(a.uniforms).not.toBe(b.uniforms);
    expect(a.projected).not.toBe(b.projected);
    expect(a.lit.length).toBe(EMITTER_COUNT);
    expect(a.latched).toEqual({ ridge: 0, hedge: 0 });
  });

  it('writes a new uniforms object even when g has not changed', () => {
    const g = mid('darch');
    frameAt(g);
    const second = frameAt(g);
    expect(hex(second.targets.uniforms.uZenith.value)).toBe(environmentAt(timelineAt(g, RANGES).tod).zenith.toLowerCase());
  });

  it('lights every registered emitter at rest except the visitor (Stage 2, spec §4.7)', () => {
    const f = frameAt(0);
    expect(f.targets.lit.length).toBe(EMITTERS.length);
    EMITTERS.forEach((e, i) => expect(f.targets.lit[i], e.id).toBe(e.id === 'visitor' ? 0 : 1));
    expect(Array.from(REST_LIT)).toEqual(Array.from(f.targets.lit));
  });

  it('allocates nothing per frame at rest (spec §12)', () => {
    const f = createFrame(createUniforms(), new Float32Array(EMITTER_COUNT * 3));
    setFrameInputs(f.inputs, mid('darch'), RANGES, 0, 1 / 60, null, false, false);
    for (let i = 0; i < 500; i++) {
      f.inputs.t = i / 60;
      applyFrame(f.inputs, f.targets);
    }
    const before = process.memoryUsage().heapUsed;
    for (let i = 0; i < 1000; i++) {
      f.inputs.t = 10 + i / 60;
      applyFrame(f.inputs, f.targets);
    }
    expect(process.memoryUsage().heapUsed - before).toBeLessThan(128 * 1024);
  });
});

describe('helpers', () => {
  it('hexToColor matches Color.set for every environment colour', () => {
    const env = environmentAt(0.45);
    for (const h of [env.zenith, env.horizon, env.east, env.fogColor, env.sunColor]) {
      const a = hexToColor(h, new THREE.Color());
      const b = new THREE.Color(h);
      expect(a.r).toBeCloseTo(b.r, 6);
      expect(a.g).toBeCloseTo(b.g, 6);
      expect(a.b).toBeCloseTo(b.b, 6);
    }
  });

  it('scatterLit copies per-emitter levels to per-instance slots and reports change', () => {
    const lit = Float32Array.of(0.25, 1, 1.6);
    const map = Uint8Array.of(2, 0, 0, 1);
    const out = new Float32Array(4);
    expect(scatterLit(lit, map, 4, out)).toBe(true);
    expect(Array.from(out)).toEqual([1.600000023841858, 0.25, 0.25, 1]);
    expect(scatterLit(lit, map, 4, out)).toBe(false);
    expect(scatterLit(lit, map, 2, new Float32Array(1))).toBe(true);
  });

  it('syncScene writes fog range, sun, point light intensities and flags changed sinks', () => {
    const u = createUniforms();
    u.uFogNear.value = 30;
    u.uFogFar.value = 200;
    u.uSunDir.value.set(0, 2, 0);
    u.uSunIntensity.value = 0.35;
    const refs = createSceneRefs();
    const fog = new THREE.Fog(u.uFogColor.value, 1, 2);
    const sun = new THREE.DirectionalLight();
    const points = POINT_LIGHTS.map(() => new THREE.PointLight());
    attachFog(refs, fog);
    attachSun(refs, sun);
    points.forEach((p, k) => attachPointLight(refs, k, p));
    const attr = new THREE.InstancedBufferAttribute(new Float32Array(3), 1);
    attachSink(refs, 'windows', { lit: attr.array as Float32Array, map: Uint8Array.of(0, 1, 2), count: 3, attr });
    const lit = new Float32Array(EMITTER_COUNT).fill(1);
    lit[EMITTER_INDEX.visitor] = 0;
    const v0 = attr.version;
    syncScene(refs, u, lit);
    expect([fog.near, fog.far]).toEqual([30, 200]);
    expect(sun.position.toArray()).toEqual([0, SUN_DISTANCE, 0]);
    expect(sun.intensity).toBe(0.35);
    POINT_LIGHTS.forEach((p, k) => expect(points[k].intensity).toBe(p.base * lit[EMITTER_INDEX[p.id]]));
    expect(attr.version).toBe(v0 + 1);
    syncScene(refs, u, lit);
    expect(attr.version).toBe(v0 + 1);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/gl/driverCore.test.ts`
Expected: FAIL, `Failed to resolve import "./driverCore"`.

- [ ] **Step 3: Write `src/gl/driverCore.ts`**

```ts
// The frame driver's pure core (spec §6 Driver, §8 clocks, §12 no allocation in the frame loop). Driver.tsx calls
// applyFrame once per frame from the one useFrame; this module touches no React, no DOM and no renderer, so it runs
// in Node with plain uniform holders. Stage 2 writes the timeline, the environment, the latched reveals and every
// light at rest. Stage 3 layers the ignition, the ridge trickle, the pulse and the hut flicker over writeRestLights.
import * as THREE from 'three';
import type { EmitterId, Environment, SectionRange, Timeline } from '@/valley/types';
import { SECTIONS, sectionRanges } from '@/valley/sections';
import { timelineAt } from '@/valley/timeline';
import { environmentAt } from '@/valley/environment';
import { EMITTERS } from '@/valley/lights';
import { EMITTER_COUNT, EMITTER_INDEX, PROJECTED } from './projection';

export interface Uniform<T> { value: T }

/** Every value the driver writes. Shader materials share these holders by reference. */
export interface ValleyUniforms {
  uTime: Uniform<number>;            // ambient seconds; frozen under reduced motion
  uTod: Uniform<number>;
  uZenith: Uniform<THREE.Color>;
  uHorizon: Uniform<THREE.Color>;
  uEast: Uniform<THREE.Color>;
  uFogColor: Uniform<THREE.Color>;
  uFogNear: Uniform<number>;
  uFogFar: Uniform<number>;
  uSunDir: Uniform<THREE.Vector3>;
  uSunColor: Uniform<THREE.Color>;
  uSunIntensity: Uniform<number>;
  uHemiSky: Uniform<THREE.Color>;
  uHemiGround: Uniform<THREE.Color>;
  uStarAlpha: Uniform<number>;
  uMoonPos: Uniform<THREE.Vector3>;
  uMoonAlpha: Uniform<number>;
  uYaw: Uniform<number>;             // degrees
  uPitch: Uniform<number>;           // degrees
  uFovScale: Uniform<number>;
  uRidgeReveal: Uniform<number>;     // latched
  uHedgeReveal: Uniform<number>;     // latched
  uDarchT: Uniform<number>;
  uRain: Uniform<number>;
}

export function createUniforms(): ValleyUniforms {
  return {
    uTime: { value: 0 },
    uTod: { value: 0 },
    uZenith: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uEast: { value: new THREE.Color() },
    uFogColor: { value: new THREE.Color() },
    uFogNear: { value: 40 },
    uFogFar: { value: 240 },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color() },
    uSunIntensity: { value: 0 },
    uHemiSky: { value: new THREE.Color() },
    uHemiGround: { value: new THREE.Color() },
    uStarAlpha: { value: 0 },
    uMoonPos: { value: new THREE.Vector3(0, 1, 0) },
    uMoonAlpha: { value: 0 },
    uYaw: { value: 0 },
    uPitch: { value: 0 },
    uFovScale: { value: 1 },
    uRidgeReveal: { value: 0 },
    uHedgeReveal: { value: 0 },
    uDarchT: { value: 0 },
    uRain: { value: 0 },
  };
}

// The index contract's FrameInputs plus `portrait`, which timelineAt needs and the contract has no field for.
export interface FrameInputs {
  g: number; ranges: SectionRange[]; t: number; dt: number;
  introT: number | null; buildT: number | null; pulseT: number | null; flickerT: number | null;
  darchOverride?: number; reducedMotion: boolean;
  portrait?: boolean;
}
export interface FrameTargets {
  uniforms: ValleyUniforms;
  lit: Float32Array /* per emitter, EMITTERS order */;
  projected: Float32Array /* x,y,visible per emitter */;
  latched: { ridge: number; hedge: number };
}

export interface Frame { inputs: FrameInputs; targets: FrameTargets }

/** Fresh targets: by default new uniforms and a private projected array (tests, Stage 3 and 5 checks). */
export function createFrameTargets(
  uniforms: ValleyUniforms = createUniforms(), projected: Float32Array = new Float32Array(EMITTER_COUNT * 3),
): FrameTargets {
  return { uniforms, lit: new Float32Array(EMITTER_COUNT), projected, latched: { ridge: 0, hedge: 0 } };
}

/** The driver's frame: preallocated inputs and targets. `projected` defaults to the live PROJECTED the labels read. */
export function createFrame(uniforms: ValleyUniforms, projected: Float32Array = PROJECTED): Frame {
  return {
    inputs: {
      g: 0, ranges: [], t: 0, dt: 0, introT: null, buildT: null, pulseT: null, flickerT: null,
      reducedMotion: false, portrait: false,
    },
    targets: createFrameTargets(uniforms, projected),
  };
}

export const MAX_DT = 0.1;

/** Fills the driver's preallocated inputs in place. dt is clamped to [0, MAX_DT] so a background tab never jumps. */
export function setFrameInputs(
  inputs: FrameInputs, g: number, ranges: SectionRange[], t: number, dt: number,
  introT: number | null, reducedMotion: boolean, portrait: boolean,
): void {
  inputs.g = g;
  inputs.ranges = ranges;
  inputs.t = t;
  inputs.dt = Math.min(MAX_DT, Math.max(0, dt));
  inputs.introT = introT;
  inputs.reducedMotion = reducedMotion;
  inputs.portrait = portrait;
}

/** Stage 2's light at rest: every registered emitter lit, except the visitor, whose lot is empty until a build. */
export const REST_LIT: Float32Array = Float32Array.from(EMITTERS, (e) => (e.id === 'visitor' ? 0 : 1));

export function writeRestLights(lit: Float32Array): void {
  lit.set(REST_LIT);
}

// Ranges for a 900 px viewport from the section heights, used until the provider has measured the DOM.
const FALLBACK_RANGES: SectionRange[] = (() => {
  const vh = 900;
  let top = 0;
  const tops: number[] = [];
  for (const s of SECTIONS) {
    tops.push(top);
    top += (s.heightVh / 100) * vh;
  }
  return sectionRanges(tops, top, vh);
})();

function hexDigit(c: number): number {
  return c <= 57 ? c - 48 : (c | 32) - 87;
}

/** Parses '#rrggbb' (sRGB) into `out` without allocating. Anything else falls back to Color.set. */
export function hexToColor(hex: string, out: THREE.Color): THREE.Color {
  const o = hex.charCodeAt(0) === 35 ? 1 : 0;
  if (hex.length - o !== 6) return out.set(hex);
  let n = 0;
  for (let k = 0; k < 6; k++) n = n * 16 + hexDigit(hex.charCodeAt(o + k));
  return out.setHex(n, THREE.SRGBColorSpace);
}

function writeEnvironment(env: Environment, u: ValleyUniforms): void {
  hexToColor(env.zenith, u.uZenith.value);
  hexToColor(env.horizon, u.uHorizon.value);
  hexToColor(env.east, u.uEast.value);
  hexToColor(env.fogColor, u.uFogColor.value);
  u.uFogNear.value = env.fogNear;
  u.uFogFar.value = env.fogFar;
  u.uSunDir.value.set(env.sunDir[0], env.sunDir[1], env.sunDir[2]);
  hexToColor(env.sunColor, u.uSunColor.value);
  u.uSunIntensity.value = env.sunIntensity;
  hexToColor(env.hemiSky, u.uHemiSky.value);
  hexToColor(env.hemiGround, u.uHemiGround.value);
  u.uStarAlpha.value = env.starAlpha;
  u.uMoonPos.value.set(env.moonPos[0], env.moonPos[1], env.moonPos[2]);
  u.uMoonAlpha.value = env.moonAlpha;
}

// environmentAt returns frozen table entries: rewrite the colours only when the entry (or the uniforms) changes.
const written = { env: null as Environment | null, u: null as ValleyUniforms | null };

/** One frame of scene state. Allocation-free (timelineAt and environmentAt do not allocate either). */
export function applyFrame(inputs: FrameInputs, targets: FrameTargets): void {
  const u = targets.uniforms;
  const g = Number.isFinite(inputs.g) ? Math.min(1, Math.max(0, inputs.g)) : 0;
  const ranges = inputs.ranges.length > 0 ? inputs.ranges : FALLBACK_RANGES;
  const tl: Timeline = timelineAt(g, ranges, inputs.portrait === true);   // shared object: read it now, never keep it
  const env = environmentAt(tl.tod);
  if (env !== written.env || u !== written.u) {
    writeEnvironment(env, u);
    written.env = env;
    written.u = u;
  }

  u.uTod.value = tl.tod;
  u.uYaw.value = tl.view.yaw;
  u.uPitch.value = tl.view.pitch;
  u.uFovScale.value = tl.view.fovScale;

  const latched = targets.latched;
  if (tl.ridgeReveal > latched.ridge) latched.ridge = tl.ridgeReveal;
  if (tl.hedgeReveal > latched.hedge) latched.hedge = tl.hedgeReveal;
  u.uRidgeReveal.value = latched.ridge;
  u.uHedgeReveal.value = latched.hedge;
  u.uDarchT.value = inputs.darchOverride ?? tl.darchT;
  u.uRain.value = inputs.reducedMotion ? 0 : tl.rain;
  if (!inputs.reducedMotion) u.uTime.value = inputs.t;

  writeRestLights(targets.lit);
}

/** out[i] = lit[map[i]] for i < count. Returns true when any slot changed, so the caller uploads only then. */
export function scatterLit(lit: Float32Array, map: Uint8Array, count: number, out: Float32Array): boolean {
  let changed = false;
  const n = Math.min(count, map.length, out.length);
  for (let i = 0; i < n; i++) {
    const v = lit[map[i]];
    if (out[i] !== v) {
      out[i] = v;
      changed = true;
    }
  }
  return changed;
}

/** A per-instance level buffer fed from the per-emitter levels: windows (Task 2.5) and glow (Task 2.6). */
export interface LitSink { lit: Float32Array; map: Uint8Array; count: number; attr: THREE.BufferAttribute | null }

export interface PointLightSpec {
  id: EmitterId;
  place: 'hut' | 'mill' | 'kalshiLamp' | 'lot';
  lift: number;      // metres above PLACES[place]
  forward: number;   // metres toward +z (the lit face)
  base: number;      // intensity at level 1, candela
  distance: number;
}

/** Spec §6: four point lights at the hut, the mill, the kalshi lamp and the visitor house. */
export const POINT_LIGHTS: readonly PointLightSpec[] = [
  { id: 'hut', place: 'hut', lift: 1.4, forward: 2.2, base: 6, distance: 14 },
  { id: 'mill', place: 'mill', lift: 4.5, forward: 5, base: 20, distance: 30 },
  { id: 'kalshiLamp', place: 'kalshiLamp', lift: 1.3, forward: 0.4, base: 4, distance: 10 },
  { id: 'visitor', place: 'lot', lift: 1.6, forward: 2, base: 6, distance: 14 },
];

export interface PointLightRef { emitter: number; base: number; light: { intensity: number } | null }

export interface SceneRefs {
  fog: { near: number; far: number } | null;
  sun: { position: THREE.Vector3; intensity: number } | null;
  points: PointLightRef[];
  windows: LitSink | null;
  glow: LitSink | null;
}

export function createSceneRefs(): SceneRefs {
  return {
    fog: null,
    sun: null,
    points: POINT_LIGHTS.map((p) => ({ emitter: EMITTER_INDEX[p.id], base: p.base, light: null })),
    windows: null,
    glow: null,
  };
}

// Setters, so components register objects through a call instead of assigning into a prop (react-hooks lint).
export function attachFog(refs: SceneRefs, fog: { near: number; far: number } | null): void { refs.fog = fog; }
export function attachSun(refs: SceneRefs, sun: { position: THREE.Vector3; intensity: number } | null): void { refs.sun = sun; }
export function attachPointLight(refs: SceneRefs, k: number, light: { intensity: number } | null): void {
  if (refs.points[k]) refs.points[k].light = light;
}
export function attachSink(refs: SceneRefs, which: 'windows' | 'glow', sink: LitSink | null): void {
  refs[which] = sink;
}

export const SUN_DISTANCE = 80;

function sinkLit(sink: LitSink | null, lit: Float32Array): void {
  if (!sink) return;
  if (scatterLit(lit, sink.map, sink.count, sink.lit) && sink.attr) sink.attr.needsUpdate = true;
}

/** Copies this frame's uniforms and levels onto the scene objects that are not shader uniforms. Allocation-free. */
export function syncScene(refs: SceneRefs, u: ValleyUniforms, lit: Float32Array): void {
  const fog = refs.fog;
  if (fog) {
    fog.near = u.uFogNear.value;
    fog.far = u.uFogFar.value;
  }
  const sun = refs.sun;
  if (sun) {
    sun.position.copy(u.uSunDir.value).normalize().multiplyScalar(SUN_DISTANCE);
    sun.intensity = u.uSunIntensity.value;
  }
  for (let k = 0; k < refs.points.length; k++) {
    const p = refs.points[k];
    if (p.light) p.light.intensity = p.base * lit[p.emitter];
  }
  sinkLit(refs.windows, lit);
  sinkLit(refs.glow, lit);
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run src/gl/driverCore.test.ts`
Expected: PASS, 14 tests. If "allocates nothing per frame at rest" fails, look for a fresh object, closure, array spread or string in `applyFrame`, `writeRestLights` or `hexToColor` (and confirm Stage 1's `timelineAt` and `environmentAt` still return shared objects); do not raise the bound.

- [ ] **Step 5: Lint, typecheck, full suite, commit**

```bash
npm run lint && npx tsc --noEmit && npx vitest run
git add src/gl/driverCore.ts src/gl/driverCore.test.ts
git commit -m "Add the frame driver core: uniforms, applyFrame, scene sync"
```

**Verify:** `npx vitest run src/gl/driverCore.test.ts` passes; `grep -nE "from 'react'|document\.|window\." src/gl/driverCore.ts` prints nothing; reading `applyFrame`, `writeEnvironment`, `hexToColor`, `scatterLit` and `syncScene` shows no `new`, no array or object literal, no spread, no closure and no template string; `new` appears only in `createUniforms`, `createFrameTargets`, `createFrame`, `createSceneRefs`, `REST_LIT` and `FALLBACK_RANGES`.

---

### Task 2.3: Sky, stars and moon **[parallel-safe]**

Spec: §4.1 (sky: a large inverted sphere with a three-stop gradient, zenith, horizon, east horizon, all uniforms blended by `tod`; stars: points on the sphere, alpha from `tod`; moon: one sprite, position from `tod`), §4.8 (sky, moon and stars are not emitters and are not lit additively), §6 (one draw each), §9 (palette), §11 (phone: stars 400).

**Decisions where the spec is silent (also in doubts):** the "east horizon" stop sits toward +x (the right of the hero frame). The sky, stars and moon are `toneMapped: false`, so the palette keyframes reach the screen as authored. `Environment.moonPos` is treated as a direction: the moon is drawn at `normalize(moonPos) · 170`. Stars sit on the upper cap of a 180-unit sphere (elevation above 3°), 1–2.4 px, with a slow twinkle on ambient time. The moon is a camera-facing disc drawn by its own small shader (a "sprite" in the spec's sense), not a `THREE.Sprite`, so its position and alpha are shared uniforms the driver already writes.

**Files:**
- Create: `src/gl/shaders/sky.ts`, `src/gl/starField.ts`, `src/gl/Sky.tsx`, `src/gl/Stars.tsx`, `src/gl/Moon.tsx`
- Test: `src/gl/shaders/sky.test.ts`, `src/gl/starField.test.ts`

**Interfaces:**
- Consumes: `ValleyUniforms` (Task 2.2); `PALETTE.ink` from `@/valley/palette`; `mulberry32` from `@/valley/rng`; `hashString` from `@/valley/hash`; `Tier` from `@/valley/types`.
- Produces:
  - `shaders/sky.ts`: `SKY_RADIUS = 200`, `MOON_DISTANCE = 170`, `MOON_SIZE = 7`, `SKY_VERT`, `SKY_FRAG`, `STARS_VERT`, `STARS_FRAG`, `MOON_VERT`, `MOON_FRAG` (strings), `createSkyMaterial(u: Pick<ValleyUniforms, 'uZenith' | 'uHorizon' | 'uEast'>): THREE.ShaderMaterial`, `createStarsMaterial(u: Pick<ValleyUniforms, 'uTime' | 'uStarAlpha'>): THREE.ShaderMaterial`, `createMoonMaterial(u: Pick<ValleyUniforms, 'uMoonPos' | 'uMoonAlpha'>): THREE.ShaderMaterial`
  - `starField.ts`: `STAR_RADIUS = 180`, `STARS_DESKTOP = 1200`, `STARS_PHONE = 400`, `interface StarField { positions: Float32Array; sizes: Float32Array; phases: Float32Array }`, `starField(count: number, seed?: number): StarField`
  - Components: `Sky({ uniforms }: { uniforms: ValleyUniforms })`, `Stars({ uniforms, tier }: { uniforms: ValleyUniforms; tier: Tier })`, `Moon({ uniforms }: { uniforms: ValleyUniforms })`

- [ ] **Step 1: Check the assumed names**

Run: `grep -n "export const PALETTE\|ink" src/valley/palette.ts | head -5 && grep -n "export function mulberry32" src/valley/rng.ts && grep -n "export function hashString" src/valley/hash.ts`
Expected: `PALETTE` with an `ink` key, `mulberry32`, `hashString`. If the palette export or key is named differently, use Stage 1's name in Step 4 below.

- [ ] **Step 2: Write the failing tests**

`src/gl/shaders/sky.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createUniforms } from '../driverCore';
import {
  createMoonMaterial, createSkyMaterial, createStarsMaterial,
  MOON_FRAG, MOON_VERT, SKY_FRAG, STARS_FRAG, STARS_VERT,
} from './sky';

describe('sky materials', () => {
  it('shares the gradient uniforms with the driver by reference and draws inside-out, untoned, unfogged', () => {
    const u = createUniforms();
    const m = createSkyMaterial(u);
    expect(m.uniforms.uZenith).toBe(u.uZenith);
    expect(m.uniforms.uHorizon).toBe(u.uHorizon);
    expect(m.uniforms.uEast).toBe(u.uEast);
    expect(m.side).toBe(THREE.BackSide);
    expect(m.depthWrite).toBe(false);
    expect(m.toneMapped).toBe(false);
    expect(m.fog).toBe(false);
    expect(SKY_FRAG).toContain('#include <colorspace_fragment>');
  });

  it('stars share time and alpha, blend normally and stay unfogged', () => {
    const u = createUniforms();
    const m = createStarsMaterial(u);
    expect(m.uniforms.uTime).toBe(u.uTime);
    expect(m.uniforms.uStarAlpha).toBe(u.uStarAlpha);
    expect(m.blending).toBe(THREE.NormalBlending);
    expect(m.transparent).toBe(true);
    expect(m.depthWrite).toBe(false);
    expect(m.fog).toBe(false);
    expect(STARS_VERT).toContain('gl_PointSize');
    expect(STARS_FRAG).toContain('discard');
  });

  it('the moon shares position and alpha and guards a zero direction', () => {
    const u = createUniforms();
    const m = createMoonMaterial(u);
    expect(m.uniforms.uMoonPos).toBe(u.uMoonPos);
    expect(m.uniforms.uMoonAlpha).toBe(u.uMoonAlpha);
    expect(m.blending).toBe(THREE.NormalBlending);
    expect(MOON_VERT).toContain('length( uMoonPos ) > 0.0001');
    expect(MOON_FRAG).toContain('uMoonAlpha');
  });
});
```

`src/gl/starField.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { STAR_RADIUS, STARS_DESKTOP, STARS_PHONE, starField } from './starField';

describe('starField', () => {
  it('puts the requested count on the upper cap of the star sphere', () => {
    for (const n of [STARS_DESKTOP, STARS_PHONE]) {
      const f = starField(n);
      expect(f.positions.length).toBe(n * 3);
      expect(f.sizes.length).toBe(n);
      expect(f.phases.length).toBe(n);
      for (let i = 0; i < n; i++) {
        const x = f.positions[i * 3], y = f.positions[i * 3 + 1], z = f.positions[i * 3 + 2];
        expect(Math.hypot(x, y, z)).toBeCloseTo(STAR_RADIUS, 2);
        expect(y).toBeGreaterThan(0);
        expect(f.sizes[i]).toBeGreaterThanOrEqual(1);
        expect(f.sizes[i]).toBeLessThanOrEqual(2.4);
        expect(Number.isFinite(f.phases[i])).toBe(true);
      }
    }
  });

  it('is deterministic for a seed', () => {
    expect(Array.from(starField(50, 7).positions)).toEqual(Array.from(starField(50, 7).positions));
    expect(Array.from(starField(50, 7).positions)).not.toEqual(Array.from(starField(50, 8).positions));
  });
});
```

- [ ] **Step 3: Run them and see them fail**

Run: `npx vitest run src/gl/shaders/sky.test.ts src/gl/starField.test.ts`
Expected: FAIL, `Failed to resolve import "./sky"` and `"./starField"`.

- [ ] **Step 4: Write `src/gl/shaders/sky.ts`**

```ts
// Sky, stars and moon (spec §4.1). Not emitters: normal blending, no tone mapping, so the palette keyframes the
// driver writes (uZenith, uHorizon, uEast) reach the screen as authored. The east stop sits toward +x.
import * as THREE from 'three';
import { PALETTE } from '@/valley/palette';
import type { ValleyUniforms } from '../driverCore';

export const SKY_RADIUS = 200;
export const MOON_DISTANCE = 170;
export const MOON_SIZE = 7;

export const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;

export const SKY_FRAG = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uEast;
varying vec3 vDir;
void main() {
  vec3 d = normalize( vDir );
  float h = clamp( d.y, -0.2, 1.0 );
  vec3 col = mix( uHorizon, uZenith, smoothstep( 0.0, 0.55, h ) );
  float east = smoothstep( -0.1, 0.9, d.x ) * ( 1.0 - smoothstep( 0.0, 0.35, h ) );
  col = mix( col, uEast, east * 0.85 );
  gl_FragColor = vec4( col, 1.0 );
  #include <colorspace_fragment>
}
`;

export const STARS_VERT = /* glsl */ `
attribute float aSize;
attribute float aPhase;
uniform float uTime;
uniform float uStarAlpha;
varying float vAlpha;
void main() {
  vAlpha = uStarAlpha * ( 0.7 + 0.3 * sin( uTime * 1.3 + aPhase ) );
  gl_PointSize = aSize;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;

export const STARS_FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  if ( dot( c, c ) > 0.25 || vAlpha <= 0.0 ) discard;
  gl_FragColor = vec4( uColor, vAlpha );
  #include <colorspace_fragment>
}
`;

export const MOON_VERT = /* glsl */ `
uniform vec3 uMoonPos;
uniform float uMoonSize;
uniform float uMoonDistance;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 dir = length( uMoonPos ) > 0.0001 ? normalize( uMoonPos ) : vec3( 0.0, 1.0, 0.0 );
  vec4 mv = viewMatrix * vec4( dir * uMoonDistance, 1.0 );
  mv.xy += position.xy * uMoonSize;
  gl_Position = projectionMatrix * mv;
}
`;

export const MOON_FRAG = /* glsl */ `
uniform vec3 uMoonColor;
uniform float uMoonAlpha;
varying vec2 vUv;
void main() {
  float r = length( vUv - 0.5 ) * 2.0;
  float a = uMoonAlpha * ( 1.0 - smoothstep( 0.86, 1.0, r ) );
  if ( a <= 0.0 ) discard;
  gl_FragColor = vec4( uMoonColor, a );
  #include <colorspace_fragment>
}
`;

export function createSkyMaterial(u: Pick<ValleyUniforms, 'uZenith' | 'uHorizon' | 'uEast'>): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    uniforms: { uZenith: u.uZenith, uHorizon: u.uHorizon, uEast: u.uEast },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });
}

export function createStarsMaterial(u: Pick<ValleyUniforms, 'uTime' | 'uStarAlpha'>): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: STARS_VERT,
    fragmentShader: STARS_FRAG,
    uniforms: { uTime: u.uTime, uStarAlpha: u.uStarAlpha, uColor: { value: new THREE.Color(PALETTE.ink) } },
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    fog: false,
    toneMapped: false,
  });
}

export function createMoonMaterial(u: Pick<ValleyUniforms, 'uMoonPos' | 'uMoonAlpha'>): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: MOON_VERT,
    fragmentShader: MOON_FRAG,
    uniforms: {
      uMoonPos: u.uMoonPos,
      uMoonAlpha: u.uMoonAlpha,
      uMoonSize: { value: MOON_SIZE },
      uMoonDistance: { value: MOON_DISTANCE },
      uMoonColor: { value: new THREE.Color(PALETTE.ink) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    fog: false,
    toneMapped: false,
  });
}
```

- [ ] **Step 5: Write `src/gl/starField.ts`**

```ts
// Star positions (spec §4.1 "1,200 points on the sphere", §11 "stars 400" on phone). Seeded, deterministic, pure.
import { mulberry32 } from '@/valley/rng';
import { hashString } from '@/valley/hash';

export const STAR_RADIUS = 180;
export const STARS_DESKTOP = 1200;
export const STARS_PHONE = 400;
const MIN_ELEVATION_SIN = Math.sin((3 * Math.PI) / 180);

export interface StarField { positions: Float32Array; sizes: Float32Array; phases: Float32Array }

/** Uniform over the sphere cap above 3 degrees elevation (y uniform in [sin 3°, 1] is area-uniform on a sphere). */
export function starField(count: number, seed: number = hashString('stars')): StarField {
  const rnd = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const y = MIN_ELEVATION_SIN + (1 - MIN_ELEVATION_SIN) * rnd();
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = rnd() * Math.PI * 2;
    positions[i * 3] = Math.cos(theta) * ring * STAR_RADIUS;
    positions[i * 3 + 1] = y * STAR_RADIUS;
    positions[i * 3 + 2] = Math.sin(theta) * ring * STAR_RADIUS;
    sizes[i] = 1 + 1.4 * rnd();
    phases[i] = rnd() * Math.PI * 2;
  }
  return { positions, sizes, phases };
}
```

- [ ] **Step 6: Run the tests and see them pass**

Run: `npx vitest run src/gl/shaders/sky.test.ts src/gl/starField.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 7: Write the three components**

`src/gl/Sky.tsx`:

```tsx
'use client';
// The sky dome (spec §4.1): one inverted sphere, drawn first (renderOrder -2), never culled, depth never written.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { ValleyUniforms } from './driverCore';
import { createSkyMaterial, SKY_RADIUS } from './shaders/sky';

export function Sky({ uniforms }: { uniforms: ValleyUniforms }) {
  const geometry = useMemo(() => new THREE.SphereGeometry(SKY_RADIUS, 48, 24), []);
  const material = useMemo(() => createSkyMaterial(uniforms), [uniforms]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  return <mesh geometry={geometry} material={material} renderOrder={-2} frustumCulled={false} />;
}
```

`src/gl/Stars.tsx`:

```tsx
'use client';
// Stars (spec §4.1, §11): one points draw, 1,200 on desktop and 400 on phone, alpha from tod via uStarAlpha.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Tier } from '@/valley/types';
import type { ValleyUniforms } from './driverCore';
import { createStarsMaterial } from './shaders/sky';
import { starField, STARS_DESKTOP, STARS_PHONE } from './starField';

export function Stars({ uniforms, tier }: { uniforms: ValleyUniforms; tier: Tier }) {
  const geometry = useMemo(() => {
    const f = starField(tier === 'phone' ? STARS_PHONE : STARS_DESKTOP);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(f.positions, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(f.sizes, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(f.phases, 1));
    return g;
  }, [tier]);
  const material = useMemo(() => createStarsMaterial(uniforms), [uniforms]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  return <points geometry={geometry} material={material} renderOrder={-1} frustumCulled={false} />;
}
```

`src/gl/Moon.tsx`:

```tsx
'use client';
// The moon (spec §4.1): one camera-facing disc placed by uMoonPos in its vertex shader, alpha from uMoonAlpha.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { ValleyUniforms } from './driverCore';
import { createMoonMaterial } from './shaders/sky';

export function Moon({ uniforms }: { uniforms: ValleyUniforms }) {
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const material = useMemo(() => createMoonMaterial(uniforms), [uniforms]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  return <mesh geometry={geometry} material={material} renderOrder={-1} frustumCulled={false} />;
}
```

- [ ] **Step 8: Lint, typecheck, full suite, commit**

```bash
npm run lint && npx tsc --noEmit && npx vitest run
git add src/gl/shaders/sky.ts src/gl/shaders/sky.test.ts src/gl/starField.ts src/gl/starField.test.ts src/gl/Sky.tsx src/gl/Stars.tsx src/gl/Moon.tsx
git commit -m "Add the sky dome, stars and moon"
```

**Verify:** `npx vitest run src/gl/shaders/sky.test.ts src/gl/starField.test.ts` passes; `grep -rn "#[0-9A-Fa-f]\{6\}" src/gl/shaders/sky.ts src/gl/starField.ts src/gl/Sky.tsx src/gl/Stars.tsx src/gl/Moon.tsx` prints nothing (colours come from the palette or the driver). The components render in Task 2.7.

---

### Task 2.4: Terrain, river and mist **[parallel-safe]**

Spec: §4.1 (terrain from `buildTerrain`, vertex colours, treeline merged in, flat shading; river ribbon 160 × 12 at y = 0.2, two scrolling noise octaves, pale blue-grey, opacity 0.85, tinted by the horizon uniform, ambient; mist: 24 soft sprites along the river band drifting +x at 0.3 units/s, wrapping, alpha 0.12, off on phone), §6 (`Terrain.tsx` `MeshLambertMaterial` with `flatShading`; the terrain only receives shadows; `River.tsx` custom shader with fog chunks; `Mist.tsx` instanced, desktop only), §8 (ambient time frozen under reduced motion: river and mist read `uTime`, which the driver freezes), §9 (`river #6E8AA6`, `mist #8FA3B8`).

**Decisions where the spec is silent (also in doubts):** `buildTerrain().colors` are already linear (Stage 1 runs the palette through three's `Color`), so they go to the GPU as they are; the test pins that no conversion happens. The mist is drawn with a radial falloff computed in its own fragment shader (no texture), normal blending. **Near-bank apron:** the terrain ends at z = 50, but the portrait camera at (0, 22, 96) looks past that edge; its bottom-edge rays meet ground height at z ≈ 60–68 for every portrait section view (Stage 1 flagged this: "it would need ground out to about z = 70"). Without ground there, the G6 phone still ("valley in the lower 60%") would show sky or the clear colour under the near bank. `terrainGeometry()` therefore appends a flat apron from z = 50 to z = 110 across the full width: its near row copies the terrain's last row exactly (same x, `heightAt(x, 50)`, `groundColor(x, 50)`, so there is no crack and no colour seam), its far row holds the same heights at z = 110 coloured `PALETTE.terrainLow`. It is merged into the same geometry, so it is the same draw. `heightAt` and `buildTerrain` (Stage 1) are unchanged.

**Files:**
- Create: `src/gl/fieldGeometry.ts`, `src/gl/shaders/river.ts`, `src/gl/Terrain.tsx`, `src/gl/River.tsx`, `src/gl/Mist.tsx`
- Test: `src/gl/fieldGeometry.test.ts`, `src/gl/shaders/river.test.ts`

**Interfaces:**
- Consumes: `buildTerrain`, `heightAt`, `groundColor`, `TERRAIN` from `@/valley/terrain`; `mulberry32`, `hashString`; `PALETTE.river`, `PALETTE.mist`, `PALETTE.terrainLow`; `ValleyUniforms` (Task 2.2); `createRig`, `setRigMode`, `composeCamera`, `CAMERA_NEAR`, `CAMERA_FAR` (Task 2.1, test only); `SECTIONS` (test only).
- Produces:
  - `fieldGeometry.ts`: `terrainGeometry(): THREE.BufferGeometry` (buildTerrain plus the near-bank apron, one geometry), `APRON = { z0: 50, z1: 110 }`, `APRON_VERTEX_COUNT`, `MIST_COUNT = 24`, `mistSeeds(count?: number, seed?: number): Float32Array` (x0, y, z, size per sprite)
  - `shaders/river.ts`: `RIVER_Y = 0.2`, `RIVER_WIDTH = 12`, `RIVER_OPACITY = 0.85`, `MIST_SPEED = 0.3`, `MIST_ALPHA = 0.12`, `RIVER_VERT`, `RIVER_FRAG`, `MIST_VERT`, `MIST_FRAG`, `createRiverMaterial(u: Pick<ValleyUniforms, 'uTime' | 'uHorizon'>): THREE.ShaderMaterial`, `createMistMaterial(u: Pick<ValleyUniforms, 'uTime'>): THREE.ShaderMaterial`
  - Components: `Terrain({ shadows }: { shadows: boolean })`, `River({ uniforms }: { uniforms: ValleyUniforms })`, `Mist({ uniforms }: { uniforms: ValleyUniforms })`

- [ ] **Step 1: Check the assumed names**

Run: `grep -n "export function buildTerrain\|export const TERRAIN" src/valley/terrain.ts && grep -n "river\|mist" src/valley/palette.ts && grep -n "linear" src/valley/terrain.ts | head -3`
Expected: `buildTerrain`, `TERRAIN`, palette keys `river` and `mist`, and `terrain.ts` documenting linear vertex colours. If `terrain.ts` says its colours are sRGB instead, convert them in `terrainGeometry` with `Color.setRGB(r, g, b, THREE.SRGBColorSpace)` and change the test's equality to that conversion.

- [ ] **Step 2: Write the failing tests**

`src/gl/fieldGeometry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildTerrain, heightAt, TERRAIN } from '@/valley/terrain';
import { SECTIONS } from '@/valley/sections';
import { CAMERA_FAR, CAMERA_NEAR, composeCamera, createRig, setRigMode } from './cameraCore';
import { APRON, APRON_VERTEX_COUNT, MIST_COUNT, mistSeeds, terrainGeometry } from './fieldGeometry';

describe('terrainGeometry', () => {
  it('wraps buildTerrain as is (colours already linear), plus the apron, with an index and finite normals', () => {
    const t = buildTerrain();
    const g = terrainGeometry();
    const pos = g.getAttribute('position');
    const col = g.getAttribute('color');
    const nor = g.getAttribute('normal');
    expect(pos.count).toBe(t.positions.length / 3 + APRON_VERTEX_COUNT);
    expect(pos.count).toBeGreaterThanOrEqual(161 * 101);
    expect(g.getIndex()!.count).toBe(t.indices.length + (APRON_VERTEX_COUNT / 2 - 1) * 6);
    expect(col.count).toBe(pos.count);
    for (let i = 0; i < nor.array.length; i++) expect(Number.isFinite(nor.array[i])).toBe(true);
    for (let i = 0; i < 30; i++) {
      const k = Math.floor((i / 30) * col.count);
      expect(col.getX(k)).toBe(t.colors[k * 3]);
      expect(col.getY(k)).toBe(t.colors[k * 3 + 1]);
      expect(col.getZ(k)).toBe(t.colors[k * 3 + 2]);
    }
    g.computeBoundingBox();
    expect(g.boundingBox!.max.x - g.boundingBox!.min.x).toBeCloseTo(TERRAIN.width, 0);
    expect(g.boundingBox!.max.z).toBeCloseTo(APRON.z1, 6);
  });

  it('the apron meets the near edge exactly: its first row is the terrain at z = 50', () => {
    const t = buildTerrain();
    const g = terrainGeometry();
    const pos = g.getAttribute('position');
    const first = t.positions.length / 3;
    expect(APRON.z0).toBe(TERRAIN.depth / 2);
    for (const k of [0, 40, 80, 120, 160]) {
      const x = pos.getX(first + k);
      expect(pos.getZ(first + k)).toBe(APRON.z0);
      expect(pos.getY(first + k)).toBeCloseTo(heightAt(x, APRON.z0), 5);
      expect(pos.getZ(first + APRON_VERTEX_COUNT / 2 + k)).toBe(APRON.z1);
    }
  });

  it('the portrait camera sees ground along its whole bottom edge in every section view (G6)', () => {
    const mesh = new THREE.Mesh(terrainGeometry(), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    mesh.updateMatrixWorld(true);
    const cam = new THREE.PerspectiveCamera(44, 390 / 844, CAMERA_NEAR, CAMERA_FAR);
    const rig = createRig();
    setRigMode(rig, true, false);
    const rc = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    for (const view of [{ yaw: 0, pitch: 0, fovScale: 1 }, ...SECTIONS.map((sec) => sec.viewPortrait)]) {
      composeCamera(rig, view.yaw, view.pitch, view.fovScale, 0, cam);
      cam.updateMatrixWorld(true);
      for (const x of [-1, -0.5, 0, 0.5, 1]) {
        rc.setFromCamera(ndc.set(x, -1), cam);
        const hit = rc.intersectObject(mesh, false)[0];
        expect(hit, `yaw ${view.yaw} pitch ${view.pitch} x ${x}`).toBeDefined();
      }
    }
  });
});

describe('mistSeeds', () => {
  it('places 24 sprites along the river band', () => {
    const s = mistSeeds();
    expect(s.length).toBe(MIST_COUNT * 4);
    for (let i = 0; i < MIST_COUNT; i++) {
      const [x, y, z, size] = [s[i * 4], s[i * 4 + 1], s[i * 4 + 2], s[i * 4 + 3]];
      expect(Math.abs(x)).toBeLessThanOrEqual(TERRAIN.width / 2);
      expect(y).toBeGreaterThanOrEqual(0.6);
      expect(y).toBeLessThanOrEqual(1.8);
      expect(Math.abs(z)).toBeLessThanOrEqual(5);
      expect(size).toBeGreaterThanOrEqual(6);
      expect(size).toBeLessThanOrEqual(10);
    }
    expect(Array.from(mistSeeds())).toEqual(Array.from(s));
  });
});
```

`src/gl/shaders/river.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createUniforms } from '../driverCore';
import {
  createMistMaterial, createRiverMaterial, MIST_ALPHA, MIST_FRAG, MIST_SPEED, MIST_VERT,
  RIVER_FRAG, RIVER_OPACITY, RIVER_VERT,
} from './river';

describe('river and mist materials', () => {
  it('the river shares time and horizon, is fogged through the fog chunks, and is 0.85 opaque', () => {
    const u = createUniforms();
    const m = createRiverMaterial(u);
    expect(m.uniforms.uTime).toBe(u.uTime);
    expect(m.uniforms.uHorizon).toBe(u.uHorizon);
    expect(m.uniforms.uOpacity.value).toBe(RIVER_OPACITY);
    expect(RIVER_OPACITY).toBe(0.85);
    expect(m.fog).toBe(true);
    for (const k of ['fogColor', 'fogNear', 'fogFar']) expect(m.uniforms[k]).toBeDefined();
    expect(m.transparent).toBe(true);
    expect(m.blending).toBe(THREE.NormalBlending);
    expect(RIVER_VERT).toContain('#include <fog_vertex>');
    expect(RIVER_FRAG).toContain('#include <fog_fragment>');
  });

  it('the mist drifts +x at 0.3 units/s at alpha 0.12 on shared time, normal blending', () => {
    const u = createUniforms();
    const m = createMistMaterial(u);
    expect(m.uniforms.uTime).toBe(u.uTime);
    expect(m.uniforms.uSpeed.value).toBe(MIST_SPEED);
    expect(MIST_SPEED).toBe(0.3);
    expect(m.uniforms.uAlpha.value).toBe(MIST_ALPHA);
    expect(MIST_ALPHA).toBe(0.12);
    expect(m.blending).toBe(THREE.NormalBlending);
    expect(m.depthWrite).toBe(false);
    expect(MIST_VERT).toContain('mod(');
    expect(MIST_FRAG).toContain('#include <fog_fragment>');
  });
});
```

- [ ] **Step 3: Run them and see them fail**

Run: `npx vitest run src/gl/fieldGeometry.test.ts src/gl/shaders/river.test.ts`
Expected: FAIL, `Failed to resolve import "./fieldGeometry"` and `"./river"`.

- [ ] **Step 4: Write `src/gl/fieldGeometry.ts`**

```ts
// Ground-level geometry for the GL layer (spec §4.1): the terrain mesh from the valley package, the near-bank apron
// the portrait camera needs, and the mist seeds. Pure: three's core geometry classes only, so it runs in Node.
import * as THREE from 'three';
import { buildTerrain, groundColor, heightAt, TERRAIN } from '@/valley/terrain';
import { PALETTE } from '@/valley/palette';
import { mulberry32 } from '@/valley/rng';
import { hashString } from '@/valley/hash';

/**
 * The near-bank apron: the terrain ends at z = depth / 2 = 50, but the portrait camera (0, 22, 96) meets ground
 * height at z ≈ 60–68 along its bottom edge. A flat strip out to z = 110 keeps ground under every portrait view.
 */
export const APRON = { z0: TERRAIN.depth / 2, z1: 110 } as const;
const APRON_COLS = TERRAIN.width / TERRAIN.res + 1;   // 161, the terrain's own x columns
export const APRON_VERTEX_COUNT = APRON_COLS * 2;

/** buildTerrain() plus the apron as one BufferGeometry: linear vertex colours as they are, normals computed once. */
export function terrainGeometry(): THREE.BufferGeometry {
  const t = buildTerrain();
  const base = t.positions.length / 3;
  const positions = new Float32Array(t.positions.length + APRON_VERTEX_COUNT * 3);
  const colors = new Float32Array(t.colors.length + APRON_VERTEX_COUNT * 3);
  const indices = new Uint32Array(t.indices.length + (APRON_COLS - 1) * 6);
  positions.set(t.positions);
  colors.set(t.colors);
  indices.set(t.indices);
  const c = new THREE.Color();
  const far = new THREE.Color(PALETTE.terrainLow);
  for (let i = 0; i < APRON_COLS; i++) {
    const x = -TERRAIN.width / 2 + i * TERRAIN.res;
    const y = heightAt(x, APRON.z0);
    const near = (base + i) * 3;
    const back = (base + APRON_COLS + i) * 3;
    positions[near] = x; positions[near + 1] = y; positions[near + 2] = APRON.z0;
    positions[back] = x; positions[back + 1] = y; positions[back + 2] = APRON.z1;
    groundColor(x, APRON.z0, c);
    colors[near] = c.r; colors[near + 1] = c.g; colors[near + 2] = c.b;
    colors[back] = far.r; colors[back + 1] = far.g; colors[back + 2] = far.b;
  }
  let k = t.indices.length;
  for (let i = 0; i < APRON_COLS - 1; i++) {
    // Same winding as buildTerrain (CCW seen from above): row z0 is the smaller z, row z1 the larger.
    const a = base + i, b = a + 1, cI = base + APRON_COLS + i, d = cI + 1;
    indices[k++] = a; indices[k++] = cI; indices[k++] = b;
    indices[k++] = b; indices[k++] = cI; indices[k++] = d;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.setIndex(new THREE.BufferAttribute(indices, 1));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

export const MIST_COUNT = 24;

/** Per sprite: x0 in [-width/2, width/2], y in [0.6, 1.8], z in [-5, 5] (inside the river band), size in [6, 10]. */
export function mistSeeds(count: number = MIST_COUNT, seed: number = hashString('mist')): Float32Array {
  const rnd = mulberry32(seed);
  const out = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    out[i * 4] = (rnd() - 0.5) * TERRAIN.width;
    out[i * 4 + 1] = 0.6 + 1.2 * rnd();
    out[i * 4 + 2] = (rnd() - 0.5) * 10;
    out[i * 4 + 3] = 6 + 4 * rnd();
  }
  return out;
}
```

- [ ] **Step 5: Write `src/gl/shaders/river.ts`**

```ts
// River and mist (spec §4.1). Ambient motion runs on uTime, which the driver freezes under reduced motion. Both are
// fogged through three's fog chunks (the material's fog flag makes three refresh fogColor, fogNear and fogFar).
import * as THREE from 'three';
import { PALETTE } from '@/valley/palette';
import { TERRAIN } from '@/valley/terrain';
import type { ValleyUniforms } from '../driverCore';

export const RIVER_Y = 0.2;
export const RIVER_WIDTH = 12;
export const RIVER_OPACITY = 0.85;
export const MIST_SPEED = 0.3;
export const MIST_ALPHA = 0.12;

export const RIVER_VERT = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec2 vWorld;
void main() {
  vec4 world = modelMatrix * vec4( position, 1.0 );
  vWorld = world.xz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

export const RIVER_FRAG = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform float uTime;
uniform vec3 uRiverColor;
uniform vec3 uHorizon;
uniform float uOpacity;
varying vec2 vWorld;
float rvHash( vec2 p ) {
  p = fract( p * vec2( 123.34, 456.21 ) );
  p += dot( p, p + 45.32 );
  return fract( p.x * p.y );
}
float rvNoise( vec2 p ) {
  vec2 i = floor( p );
  vec2 f = fract( p );
  vec2 s = f * f * ( 3.0 - 2.0 * f );
  float a = rvHash( i );
  float b = rvHash( i + vec2( 1.0, 0.0 ) );
  float c = rvHash( i + vec2( 0.0, 1.0 ) );
  float d = rvHash( i + vec2( 1.0, 1.0 ) );
  return mix( mix( a, b, s.x ), mix( c, d, s.x ), s.y );
}
void main() {
  vec2 p = vWorld * vec2( 0.08, 0.35 );
  float n = 0.6 * rvNoise( p - vec2( uTime * 0.12, 0.0 ) ) + 0.4 * rvNoise( p * 2.3 - vec2( uTime * 0.27, 0.0 ) );
  float edge = smoothstep( 6.0, 4.5, abs( vWorld.y ) );
  vec3 col = mix( uRiverColor, uHorizon, 0.35 + 0.25 * n );
  col *= 0.75 + 0.35 * n;
  gl_FragColor = vec4( col, uOpacity * ( 0.6 + 0.4 * edge ) );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export const MIST_VERT = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
attribute vec4 aSeed;
uniform float uTime;
uniform float uSpeed;
uniform float uSpan;
varying vec2 vUv;
void main() {
  vUv = uv;
  float x = mod( aSeed.x + uSpan * 0.5 + uSpeed * uTime, uSpan ) - uSpan * 0.5;
  vec4 mvPosition = modelViewMatrix * vec4( x, aSeed.y, aSeed.z, 1.0 );
  mvPosition.xy += position.xy * aSeed.w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

export const MIST_FRAG = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uColor;
uniform float uAlpha;
varying vec2 vUv;
void main() {
  float r = length( vUv - 0.5 ) * 2.0;
  float a = uAlpha * ( 1.0 - smoothstep( 0.2, 1.0, r ) );
  if ( a <= 0.0 ) discard;
  gl_FragColor = vec4( uColor, a );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export function createRiverMaterial(u: Pick<ValleyUniforms, 'uTime' | 'uHorizon'>): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: RIVER_VERT,
    fragmentShader: RIVER_FRAG,
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uTime: u.uTime,
      uHorizon: u.uHorizon,
      uRiverColor: { value: new THREE.Color(PALETTE.river) },
      uOpacity: { value: RIVER_OPACITY },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    fog: true,
  });
}

export function createMistMaterial(u: Pick<ValleyUniforms, 'uTime'>): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: MIST_VERT,
    fragmentShader: MIST_FRAG,
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uTime: u.uTime,
      uSpeed: { value: MIST_SPEED },
      uSpan: { value: TERRAIN.width },
      uColor: { value: new THREE.Color(PALETTE.mist) },
      uAlpha: { value: MIST_ALPHA },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    fog: true,
  });
}
```

- [ ] **Step 6: Run the tests and see them pass**

Run: `npx vitest run src/gl/fieldGeometry.test.ts src/gl/shaders/river.test.ts`
Expected: PASS, 6 tests. If "the portrait camera sees ground" fails, read which view and NDC x miss: a miss at z > 110 means `APRON.z1` is too short for that view (raise it); a miss at |x| > 80 means the apron needs to be wider than the terrain (extend its x range). Do not delete the case.

- [ ] **Step 7: Write the three components**

`src/gl/Terrain.tsx`:

```tsx
'use client';
// The ground (spec §4.1, §6): one flat-shaded Lambert mesh with vertex colours and the treeline merged in. It only
// receives shadows.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { terrainGeometry } from './fieldGeometry';

export function Terrain({ shadows }: { shadows: boolean }) {
  const geometry = useMemo(() => terrainGeometry(), []);
  const material = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), []);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  return <mesh geometry={geometry} material={material} receiveShadow={shadows} />;
}
```

`src/gl/River.tsx`:

```tsx
'use client';
// The river ribbon (spec §4.1): 160 x 12 at y = 0.2 along +x, flow shader on ambient time.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { TERRAIN } from '@/valley/terrain';
import type { ValleyUniforms } from './driverCore';
import { createRiverMaterial, RIVER_WIDTH, RIVER_Y } from './shaders/river';

export function River({ uniforms }: { uniforms: ValleyUniforms }) {
  const geometry = useMemo(() => new THREE.PlaneGeometry(TERRAIN.width, RIVER_WIDTH, 1, 1).rotateX(-Math.PI / 2), []);
  const material = useMemo(() => createRiverMaterial(uniforms), [uniforms]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  return <mesh geometry={geometry} material={material} position={[0, RIVER_Y, 0]} renderOrder={1} />;
}
```

`src/gl/Mist.tsx`:

```tsx
'use client';
// River mist (spec §4.1): 24 camera-facing sprites in one instanced draw, drifting +x and wrapping in the vertex
// shader. Scene mounts it on desktop only.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { ValleyUniforms } from './driverCore';
import { MIST_COUNT, mistSeeds } from './fieldGeometry';
import { createMistMaterial } from './shaders/river';

export function Mist({ uniforms }: { uniforms: ValleyUniforms }) {
  const mesh = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(mistSeeds(), 4));
    const m = new THREE.InstancedMesh(geometry, createMistMaterial(uniforms), MIST_COUNT);
    m.frustumCulled = false;
    m.renderOrder = 2;
    return m;
  }, [uniforms]);
  useEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    mesh.dispose();
  }, [mesh]);
  return <primitive object={mesh} />;
}
```

- [ ] **Step 8: Lint, typecheck, full suite, commit**

```bash
npm run lint && npx tsc --noEmit && npx vitest run
git add src/gl/fieldGeometry.ts src/gl/fieldGeometry.test.ts src/gl/shaders/river.ts src/gl/shaders/river.test.ts src/gl/Terrain.tsx src/gl/River.tsx src/gl/Mist.tsx
git commit -m "Add the terrain, river and mist"
```

**Verify:** `npx vitest run src/gl/fieldGeometry.test.ts src/gl/shaders/river.test.ts` passes (including the portrait bottom-edge ray case); `grep -n "APRON" src/gl/fieldGeometry.ts` shows the apron merged inside `terrainGeometry`, not a second mesh; `grep -rn "#[0-9A-Fa-f]\{6\}" src/gl/fieldGeometry.ts src/gl/shaders/river.ts src/gl/Terrain.tsx src/gl/River.tsx src/gl/Mist.tsx` prints nothing; `grep -n "castShadow" src/gl/Terrain.tsx` prints nothing (the terrain only receives).

---

### Task 2.5: Buildings and windows **[parallel-safe]**

Spec: §4.2 (hut 3 × 2.5 × 3, pitched roof, one 0.8 × 0.6 window), §4.3 (cabins 2.5 × 2 × 2.5, one window each), §4.4 (bars 5 × 3 × 4, wide front window 2.4 × 1.0, porch light over the door, one emitter per bar), §4.5 (mill 10 × 9 × 7, 5 × 4 window grid on the river face, 20 instances with `aRow` 0–3, bottom row 0), §4.6 (kalshi lamp: a 1.2 m post with a lamp head), §6 (`Buildings.tsx`: all static bodies merged into one geometry with vertex colours, `MeshLambertMaterial`, one draw, built from `layout.ts`, shadow caster; `Windows.tsx`: one `InstancedMesh` of quads, capacity 512, per-instance `aLit` 0–1.6, `MeshBasicMaterial` through `onBeforeCompile` so instancing, fog and colour space stay correct, `toneMapped: false`, one draw, `mesh.count` updated), §9 (walls `#1A1F28`, roofs `#11151C`, porch `#FFD9A0`).

**Decisions where the spec is silent (also in doubts):** every building faces +z (the river and the camera); windows sit on the +z face 0.03 units proud of the wall. Each body's walls extend 1 unit below `PLACES[...].y` (a plinth) so uneven ground never shows a gap. Roofs are prisms with the ridge along x: rise 1.2 (hut), 1.0 (cabins), 0.6 (bars), 2.5 (mill), overhang 0.3 in x and 0.4 in z. Window placement (relative to the place, `d` = depth): hut window centre (0, 1.3, d/2); cabin windows 0.7 × 0.6 at (0, 1.1, d/2); bar window at (−0.8, 1.5, 2), porch light 0.3 × 0.3 at (1.7, 2.55, 2); mill grid columns at x = (c − 2) · 1.8, rows at y = 1.6 + 2r, each 1.1 × 1.2, z = 3.5. The kalshi lamp head is a 0.3 cube housing on the post plus one 0.25 × 0.25 lit quad on its +z face, owned by the `kalshiLamp` emitter. Every quad takes its emitter's registry colour (Stage 1 gives the hut and cabins `PALETTE.warm`, the bars `PALETTE.porch`, the mill `PALETTE.millWindow`, the lamp `PALETTE.lamp`), so a bar's window and porch light share the porch colour. That is 32 static instances. An unlit instance is discarded in the fragment shader so the wall shows through. Stage 4 Task 4.3 writes the hillside and visitor windows into the same `WindowSet` after the static ones (`windowSlots.ts`) and changes `LitSink` to read the set's live `count`, so the new slots light.

**Files:**
- Create: `src/gl/structures.ts`, `src/gl/shaders/inject.ts`, `src/gl/shaders/windows.ts`, `src/gl/Buildings.tsx`, `src/gl/Windows.tsx`
- Test: `src/gl/structures.test.ts`, `src/gl/shaders/windows.test.ts`

**Interfaces:**
- Consumes: `PLACES` from `@/valley/layout`; `EMITTERS` from `@/valley/lights`; `EmitterId`, `Vec3`; `PALETTE.wall`, `PALETTE.roof`; `EMITTER_INDEX` (Task 2.1); `SceneRefs`, `attachSink` (Task 2.2).
- Produces:
  - `structures.ts`: `interface BuildingSize { w: number; h: number; d: number; rise: number }`, `BUILDING_SIZES: { hut; cabin; bar; mill }`, `LAMP_POST = { w: 0.12, h: 1.2, head: 0.3 }`, `PLINTH = 1`, `WINDOW_OFFSET = 0.03`, `buildingsGeometry(): THREE.BufferGeometry`, `interface WindowSpec { emitter: EmitterId; center: Vec3; w: number; h: number; color: string; row: number }`, `staticWindows(): WindowSpec[]`, `STATIC_WINDOW_COUNT = 32`, `WINDOW_CAPACITY = 512`, `interface WindowSet { count: number; matrices: Float32Array; colors: Float32Array; rows: Float32Array; lit: Float32Array; emitterOf: Uint8Array }`, `createWindowSet(specs?: readonly WindowSpec[]): WindowSet`, `pushWindow(set: WindowSet, spec: WindowSpec): number` (slot index, or −1 when full)
  - `shaders/inject.ts`: `inject(source: string, anchor: string, replacement: string): string` (throws when the anchor is missing)
  - `shaders/windows.ts`: `WINDOWS_CACHE_KEY = 'valley-windows'`, `patchWindows(shader: { vertexShader: string; fragmentShader: string }): void`, `createWindowsMaterial(): THREE.MeshBasicMaterial`
  - Components: `Buildings({ shadows }: { shadows: boolean })`, `Windows({ refs }: { refs: SceneRefs })` (registers `refs.windows` via `attachSink`)

- [ ] **Step 1: Check the assumed names**

Run: `grep -n "wall\|roof" src/valley/palette.ts && grep -n "export const PLACES" src/valley/layout.ts && grep -n "color:" src/valley/lights.ts | head -5`
Expected: flat palette keys `wall` and `roof`; `PLACES`; an emitter `color` field per registry entry. If a key differs, use the landed name in Steps 2 and 6.

- [ ] **Step 2: Write the failing test `src/gl/structures.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { PLACES } from '@/valley/layout';
import { EMITTERS } from '@/valley/lights';
import { PALETTE } from '@/valley/palette';
import { EMITTER_INDEX } from './projection';
import {
  BUILDING_SIZES, buildingsGeometry, createWindowSet, pushWindow, STATIC_WINDOW_COUNT, staticWindows,
  WINDOW_CAPACITY,
} from './structures';

describe('buildingsGeometry', () => {
  const g = buildingsGeometry();
  it('is one merged, non-indexed geometry with position, normal and colour, all finite', () => {
    expect(g.getIndex()).toBeNull();
    for (const name of ['position', 'normal', 'color']) {
      const a = g.getAttribute(name);
      expect(a, name).toBeDefined();
      for (let i = 0; i < a.array.length; i++) expect(Number.isFinite(a.array[i])).toBe(true);
    }
    expect(g.getAttribute('position').count % 3).toBe(0);
    expect(g.getAttribute('uv')).toBeUndefined();
  });

  it('colours every vertex with the wall or the roof colour', () => {
    const wall = new THREE.Color(PALETTE.wall);
    const roof = new THREE.Color(PALETTE.roof);
    const c = g.getAttribute('color');
    for (let i = 0; i < c.count; i++) {
      const isWall = Math.abs(c.getX(i) - wall.r) < 1e-6 && Math.abs(c.getY(i) - wall.g) < 1e-6 && Math.abs(c.getZ(i) - wall.b) < 1e-6;
      const isRoof = Math.abs(c.getX(i) - roof.r) < 1e-6 && Math.abs(c.getY(i) - roof.g) < 1e-6 && Math.abs(c.getZ(i) - roof.b) < 1e-6;
      expect(isWall || isRoof).toBe(true);
    }
  });

  it('stands a body on every building place and reaches the mill roof', () => {
    g.computeBoundingBox();
    const box = g.boundingBox!;
    for (const key of ['hut', 'nist', 'wvu', 'bar1', 'bar2', 'bar3', 'bar4', 'mill', 'kalshiLamp'] as const) {
      const p = new THREE.Vector3(PLACES[key][0], PLACES[key][1] + 0.5, PLACES[key][2]);
      expect(box.containsPoint(p), key).toBe(true);
    }
    const m = BUILDING_SIZES.mill;
    expect(box.max.y).toBeGreaterThanOrEqual(PLACES.mill[1] + m.h + m.rise - 1e-3);
  });
});

describe('staticWindows', () => {
  const w = staticWindows();
  it('has 32 lit quads: hut 1, cabins 2, bars 4 x (window + porch), mill 20, lamp 1', () => {
    expect(w.length).toBe(STATIC_WINDOW_COUNT);
    expect(STATIC_WINDOW_COUNT).toBe(32);
    const count = (id: string) => w.filter((x) => x.emitter === id).length;
    expect(count('hut')).toBe(1);
    expect(count('nist')).toBe(1);
    expect(count('wvu')).toBe(1);
    for (const b of ['bar1', 'bar2', 'bar3', 'bar4']) expect(count(b)).toBe(2);
    expect(count('mill')).toBe(20);
    expect(count('kalshiLamp')).toBe(1);
  });

  it('gives the mill rows 0 to 3, five windows each, bottom row lowest, and every other window row -1', () => {
    const mill = w.filter((x) => x.emitter === 'mill');
    for (let r = 0; r < 4; r++) expect(mill.filter((x) => x.row === r).length).toBe(5);
    const y = (r: number) => mill.find((x) => x.row === r)!.center[1];
    expect(y(0)).toBeLessThan(y(1));
    expect(y(2)).toBeLessThan(y(3));
    expect(y(3) + 0.6).toBeLessThan(PLACES.mill[1] + BUILDING_SIZES.mill.h);
    w.filter((x) => x.emitter !== 'mill').forEach((x) => expect(x.row).toBe(-1));
  });

  it('puts every window on the +z face of a registered emitter, in that emitter's colour', () => {
    for (const x of w) {
      expect(EMITTER_INDEX[x.emitter]).toBeGreaterThanOrEqual(0);
      const place = PLACES[x.emitter as keyof typeof PLACES];
      expect(x.center[2]).toBeGreaterThan(place[2]);
      expect(x.color).toBe(EMITTERS[EMITTER_INDEX[x.emitter]].color);
    }
  });
});

describe('WindowSet', () => {
  it('packs matrices, linear colours, rows and the emitter map, and stops at capacity', () => {
    const specs = staticWindows();
    const set = createWindowSet(specs);
    expect(set.count).toBe(specs.length);
    expect(set.matrices.length).toBe(WINDOW_CAPACITY * 16);
    expect(set.lit.length).toBe(WINDOW_CAPACITY);
    const s0 = specs[0];
    expect(set.matrices[0]).toBeCloseTo(s0.w, 6);
    expect(set.matrices[5]).toBeCloseTo(s0.h, 6);
    expect(set.matrices[12]).toBeCloseTo(s0.center[0], 5);
    expect(set.matrices[13]).toBeCloseTo(s0.center[1], 5);
    expect(set.matrices[14]).toBeCloseTo(s0.center[2], 5);
    expect(set.emitterOf[0]).toBe(EMITTER_INDEX[s0.emitter]);
    const c = new THREE.Color(s0.color);
    expect(set.colors[0]).toBeCloseTo(c.r, 6);
    expect(set.rows[0]).toBe(s0.row);
    while (set.count < WINDOW_CAPACITY) pushWindow(set, s0);
    expect(pushWindow(set, s0)).toBe(-1);
    expect(set.count).toBe(WINDOW_CAPACITY);
  });
});
```

- [ ] **Step 3: Write the failing test `src/gl/shaders/windows.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { inject } from './inject';
import { createWindowsMaterial, patchWindows, WINDOWS_CACHE_KEY } from './windows';

describe('windows shader patch', () => {
  it('adds aLit and aRow, scales the colour by the level and discards unlit instances', () => {
    const shader = { vertexShader: THREE.ShaderLib.basic.vertexShader, fragmentShader: THREE.ShaderLib.basic.fragmentShader };
    patchWindows(shader);
    expect(shader.vertexShader).toContain('attribute float aLit;');
    expect(shader.vertexShader).toContain('attribute float aRow;');
    expect(shader.vertexShader).toContain('vLit = aLit;');
    expect(shader.fragmentShader).toContain('if ( vLit < 0.001 ) discard;');
    expect(shader.fragmentShader).toContain('diffuseColor.rgb *= vLit;');
    expect(shader.vertexShader).toContain('#include <project_vertex>');
    expect(shader.fragmentShader).toContain('#include <fog_fragment>');
    expect(shader.fragmentShader).toContain('#include <colorspace_fragment>');
  });

  it('inject throws on a missing anchor so a three upgrade fails loudly', () => {
    expect(() => inject('void main() {}', '#include <nope>', '')).toThrow('#include <nope>');
  });

  it('the material is untoned, fogged and has its own program cache key', () => {
    const m = createWindowsMaterial();
    expect(m).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(m.toneMapped).toBe(false);
    expect(m.fog).toBe(true);
    expect(m.customProgramCacheKey()).toBe(WINDOWS_CACHE_KEY);
  });
});
```

- [ ] **Step 4: Run both and see them fail**

Run: `npx vitest run src/gl/structures.test.ts src/gl/shaders/windows.test.ts`
Expected: FAIL, `Failed to resolve import "./structures"`, `"./inject"`, `"./windows"`.

- [ ] **Step 5: Write `src/gl/shaders/inject.ts`**

```ts
// String surgery on three's built-in shaders for onBeforeCompile patches.

/** Replaces the first `anchor` in `source`, or throws naming it, so a renamed chunk fails loudly instead of silently. */
export function inject(source: string, anchor: string, replacement: string): string {
  if (!source.includes(anchor)) throw new Error(`shader anchor not found: ${anchor}`);
  return source.replace(anchor, () => replacement);
}
```

- [ ] **Step 6: Write `src/gl/structures.ts`**

```ts
// Static structures (spec §4.2 to §4.6, §6 Buildings and Windows): every building body merged into one vertex-coloured
// geometry, and the lit window quads as instance data. Pure: three core classes only, runs in Node. Everything faces
// +z (the river and the camera). Dimensions are the spec's; placement comes from layout.ts.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { EmitterId, Vec3 } from '@/valley/types';
import { PLACES } from '@/valley/layout';
import { EMITTERS } from '@/valley/lights';
import { PALETTE } from '@/valley/palette';
import { EMITTER_INDEX } from './projection';

export interface BuildingSize { w: number; h: number; d: number; rise: number }

export const BUILDING_SIZES = {
  hut: { w: 3, h: 2.5, d: 3, rise: 1.2 },
  cabin: { w: 2.5, h: 2, d: 2.5, rise: 1.0 },
  bar: { w: 5, h: 3, d: 4, rise: 0.6 },
  mill: { w: 10, h: 9, d: 7, rise: 2.5 },
} as const satisfies Record<string, BuildingSize>;

export const LAMP_POST = { w: 0.12, h: 1.2, head: 0.3 } as const;
/** Walls extend this far below the place's y so uneven ground never shows a gap. */
export const PLINTH = 1;
export const WINDOW_OFFSET = 0.03;
const OVERHANG_X = 0.3;
const OVERHANG_Z = 0.4;

const BODIES: readonly { place: Vec3; size: BuildingSize }[] = [
  { place: PLACES.hut, size: BUILDING_SIZES.hut },
  { place: PLACES.nist, size: BUILDING_SIZES.cabin },
  { place: PLACES.wvu, size: BUILDING_SIZES.cabin },
  { place: PLACES.bar1, size: BUILDING_SIZES.bar },
  { place: PLACES.bar2, size: BUILDING_SIZES.bar },
  { place: PLACES.bar3, size: BUILDING_SIZES.bar },
  { place: PLACES.bar4, size: BUILDING_SIZES.bar },
  { place: PLACES.mill, size: BUILDING_SIZES.mill },
];

function paint(g: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  const n = g.getAttribute('position').count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    c[i * 3] = color.r;
    c[i * 3 + 1] = color.g;
    c[i * 3 + 2] = color.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

function box(w: number, h: number, d: number, x: number, y: number, z: number, color: THREE.Color): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  g.deleteAttribute('uv');
  g.translate(x, y, z);
  return paint(g, color);
}

/** A gabled roof: base w x d at y = 0, ridge along x at height rise over z = 0. Flat normals, no bottom face. */
function prism(w: number, d: number, rise: number, x: number, y: number, z: number, color: THREE.Color): THREE.BufferGeometry {
  const hw = w / 2;
  const hd = d / 2;
  const A = [-hw, 0, -hd], B = [hw, 0, -hd], C = [hw, 0, hd], D = [-hw, 0, hd];
  const E = [-hw, rise, 0], F = [hw, rise, 0];
  const tris = [D, C, F, D, F, E, B, A, E, B, E, F, A, D, E, C, B, F];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(tris.flat()), 3));
  g.computeVertexNormals();
  g.translate(x, y, z);
  return paint(g, color);
}

/** Every static body in one geometry: hut, cabins, bars, mill (walls + roof) and the kalshi lamp post. */
export function buildingsGeometry(): THREE.BufferGeometry {
  const wall = new THREE.Color(PALETTE.wall);
  const roof = new THREE.Color(PALETTE.roof);
  const parts: THREE.BufferGeometry[] = [];
  for (const { place, size } of BODIES) {
    const [x, y, z] = place;
    parts.push(box(size.w, size.h + PLINTH, size.d, x, y + (size.h - PLINTH) / 2, z, wall));
    parts.push(prism(size.w + OVERHANG_X, size.d + OVERHANG_Z, size.rise, x, y + size.h, z, roof));
  }
  const [lx, ly, lz] = PLACES.kalshiLamp;
  parts.push(box(LAMP_POST.w, LAMP_POST.h + PLINTH, LAMP_POST.w, lx, ly + (LAMP_POST.h - PLINTH) / 2, lz, wall));
  parts.push(box(LAMP_POST.head, LAMP_POST.head, LAMP_POST.head, lx, ly + LAMP_POST.h + LAMP_POST.head / 2, lz, roof));
  const merged = mergeGeometries(parts, false);
  if (!merged) throw new Error('buildingsGeometry: merge failed');
  parts.forEach((p) => p.dispose());
  merged.computeBoundingSphere();
  return merged;
}

export interface WindowSpec { emitter: EmitterId; center: Vec3; w: number; h: number; color: string; row: number }

const colorOf = (id: EmitterId) => EMITTERS[EMITTER_INDEX[id]].color;

/** The 32 static lit quads (spec §4.2 to §4.6). Stage 4 appends hillside and visitor windows with pushWindow. */
export function staticWindows(): WindowSpec[] {
  const out: WindowSpec[] = [];
  const front = (place: Vec3, d: number) => place[2] + d / 2 + WINDOW_OFFSET;

  const hut = PLACES.hut;
  out.push({ emitter: 'hut', center: [hut[0], hut[1] + 1.3, front(hut, BUILDING_SIZES.hut.d)], w: 0.8, h: 0.6, color: colorOf('hut'), row: -1 });

  for (const id of ['nist', 'wvu'] as const) {
    const p = PLACES[id];
    out.push({ emitter: id, center: [p[0], p[1] + 1.1, front(p, BUILDING_SIZES.cabin.d)], w: 0.7, h: 0.6, color: colorOf(id), row: -1 });
  }

  for (const id of ['bar1', 'bar2', 'bar3', 'bar4'] as const) {
    const p = PLACES[id];
    const z = front(p, BUILDING_SIZES.bar.d);
    out.push({ emitter: id, center: [p[0] - 0.8, p[1] + 1.5, z], w: 2.4, h: 1.0, color: colorOf(id), row: -1 });
    out.push({ emitter: id, center: [p[0] + 1.7, p[1] + 2.55, z], w: 0.3, h: 0.3, color: colorOf(id), row: -1 });
  }

  const mill = PLACES.mill;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      out.push({
        emitter: 'mill',
        center: [mill[0] + (c - 2) * 1.8, mill[1] + 1.6 + r * 2.0, front(mill, BUILDING_SIZES.mill.d)],
        w: 1.1, h: 1.2, color: colorOf('mill'), row: r,
      });
    }
  }

  const lamp = PLACES.kalshiLamp;
  out.push({
    emitter: 'kalshiLamp',
    center: [lamp[0], lamp[1] + LAMP_POST.h + LAMP_POST.head / 2, lamp[2] + LAMP_POST.head / 2 + WINDOW_OFFSET],
    w: 0.25, h: 0.25, color: colorOf('kalshiLamp'), row: -1,
  });
  return out;
}

export const STATIC_WINDOW_COUNT = 32;
export const WINDOW_CAPACITY = 512;

export interface WindowSet {
  count: number;
  matrices: Float32Array;   // 16 per slot, column-major
  colors: Float32Array;     // linear rgb per slot
  rows: Float32Array;       // mill row 0..3, -1 elsewhere
  lit: Float32Array;        // aLit per slot, written by the driver
  emitterOf: Uint8Array;    // EMITTERS index per slot
}

const _m = new THREE.Matrix4();
const _c = new THREE.Color();

export function pushWindow(set: WindowSet, spec: WindowSpec): number {
  if (set.count >= WINDOW_CAPACITY) return -1;
  const i = set.count;
  _m.makeScale(spec.w, spec.h, 1).setPosition(spec.center[0], spec.center[1], spec.center[2]).toArray(set.matrices, i * 16);
  _c.set(spec.color).toArray(set.colors, i * 3);
  set.rows[i] = spec.row;
  set.lit[i] = 0;
  set.emitterOf[i] = EMITTER_INDEX[spec.emitter];
  set.count = i + 1;
  return i;
}

export function createWindowSet(specs: readonly WindowSpec[] = staticWindows()): WindowSet {
  const set: WindowSet = {
    count: 0,
    matrices: new Float32Array(WINDOW_CAPACITY * 16),
    colors: new Float32Array(WINDOW_CAPACITY * 3),
    rows: new Float32Array(WINDOW_CAPACITY),
    lit: new Float32Array(WINDOW_CAPACITY),
    emitterOf: new Uint8Array(WINDOW_CAPACITY),
  };
  for (const s of specs) pushWindow(set, s);
  return set;
}
```

- [ ] **Step 7: Write `src/gl/shaders/windows.ts`**

```ts
// The window quads' material (spec §6 Windows): MeshBasicMaterial patched through onBeforeCompile so three's own
// instancing, instance colour, fog and colour-space chunks stay intact. aLit 0..1.6 scales the colour; an unlit
// instance is discarded so the wall shows. aRow (mill rows 0..3) is carried for Stage 3's row lighting.
import * as THREE from 'three';
import { inject } from './inject';

export const WINDOWS_CACHE_KEY = 'valley-windows';

export function patchWindows(shader: { vertexShader: string; fragmentShader: string }): void {
  let v = shader.vertexShader;
  v = inject(v, '#include <common>', '#include <common>\nattribute float aLit;\nattribute float aRow;\nvarying float vLit;\nvarying float vRow;');
  v = inject(v, '#include <color_vertex>', '#include <color_vertex>\n\tvLit = aLit;\n\tvRow = aRow;');
  let f = shader.fragmentShader;
  f = inject(f, '#include <common>', '#include <common>\nvarying float vLit;\nvarying float vRow;');
  f = inject(f, '#include <color_fragment>', '#include <color_fragment>\n\tif ( vLit < 0.001 ) discard;\n\tdiffuseColor.rgb *= vLit;');
  shader.vertexShader = v;
  shader.fragmentShader = f;
}

export function createWindowsMaterial(): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ toneMapped: false });
  m.onBeforeCompile = (shader) => patchWindows(shader);
  m.customProgramCacheKey = () => WINDOWS_CACHE_KEY;
  return m;
}
```

- [ ] **Step 8: Run both tests and see them pass**

Run: `npx vitest run src/gl/structures.test.ts src/gl/shaders/windows.test.ts`
Expected: PASS, 10 tests. If "stands a body on every building place" fails for `kalshiLamp`, the lamp post box is 0.12 wide: check that `PLACES.kalshiLamp` is the post's foot, not its head.

- [ ] **Step 9: Write `src/gl/Buildings.tsx`**

```tsx
'use client';
// Every static building body in one draw (spec §6): merged at load, vertex colours, flat Lambert, a shadow caster.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { buildingsGeometry } from './structures';

export function Buildings({ shadows }: { shadows: boolean }) {
  const geometry = useMemo(() => buildingsGeometry(), []);
  const material = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), []);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  return <mesh geometry={geometry} material={material} castShadow={shadows} receiveShadow={shadows} />;
}
```

- [ ] **Step 10: Write `src/gl/Windows.tsx`**

```tsx
'use client';
// Every window, porch light and lamp head in one InstancedMesh of capacity 512 (spec §6). The instance data lives in
// a WindowSet; the driver scatters per-emitter levels into its `lit` array each frame through refs.windows.
import { useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { attachSink, type SceneRefs } from './driverCore';
import { createWindowSet, WINDOW_CAPACITY } from './structures';
import { createWindowsMaterial } from './shaders/windows';

export function Windows({ refs }: { refs: SceneRefs }) {
  const set = useMemo(() => createWindowSet(), []);
  const mesh = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.setAttribute('aLit', new THREE.InstancedBufferAttribute(set.lit, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aRow', new THREE.InstancedBufferAttribute(set.rows, 1));
    const m = new THREE.InstancedMesh(geometry, createWindowsMaterial(), WINDOW_CAPACITY);
    m.instanceMatrix = new THREE.InstancedBufferAttribute(set.matrices, 16);
    m.instanceColor = new THREE.InstancedBufferAttribute(set.colors, 3);
    m.count = set.count;
    m.frustumCulled = false;
    return m;
  }, [set]);

  useLayoutEffect(() => {
    const attr = mesh.geometry.getAttribute('aLit') as THREE.BufferAttribute;
    attachSink(refs, 'windows', { lit: set.lit, map: set.emitterOf, count: set.count, attr });
    return () => attachSink(refs, 'windows', null);
  }, [refs, set, mesh]);

  useEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    mesh.dispose();
  }, [mesh]);

  return <primitive object={mesh} />;
}
```

- [ ] **Step 11: Lint, typecheck, full suite, commit**

```bash
npm run lint && npx tsc --noEmit && npx vitest run
git add src/gl/structures.ts src/gl/structures.test.ts src/gl/shaders/inject.ts src/gl/shaders/windows.ts src/gl/shaders/windows.test.ts src/gl/Buildings.tsx src/gl/Windows.tsx
git commit -m "Add the merged building bodies and the instanced windows"
```

**Verify:** `npx vitest run src/gl/structures.test.ts src/gl/shaders/windows.test.ts` passes; `grep -rn "#[0-9A-Fa-f]\{6\}" src/gl/structures.ts src/gl/shaders/windows.ts src/gl/Buildings.tsx src/gl/Windows.tsx` prints nothing; `grep -rn "Additive" src/gl/structures.ts src/gl/Windows.tsx src/gl/shaders/windows.ts` prints nothing (windows blend normally).

---

### Task 2.6: Glow sprites, the glow texture, the ridge shader and the light-rule test

Spec: §4.6 (ridge points: one `THREE.Points` draw with an additive glow sprite, `uReveal` shows points with `aBirth ≤ uReveal`, `aSize`), §4.8 (the grep test: `emissive` and `AdditiveBlending` only in `Windows.tsx`, `Glow.tsx`, `Ridge.tsx` and their shaders), §6 (`Glow.tsx`: one instanced additive sprite per emitter, the ridge excluded, size from the registry, scaled by `aLit`, same material approach, one draw; `glowTexture.ts` makes the 64 × 64 radial sprite every glow and ridge point samples), §12 (the glow sprite is the only texture, generated once).

**Decisions where the spec is silent (also in doubts):** the 64 × 64 sprite is computed as pixels in a pure function and uploaded as a `DataTexture` instead of drawn on a 2D canvas: same image, generated once, and testable in Node. Additive sprites fade to black in fog instead of mixing toward the fog colour (mixing would add a fog-coloured halo); the ridge shader shares that fog fade. The ridge shader strings are written here because they share the glow's fog fade; `Ridge.tsx` and its material arrive in Stage 3. Glow sprites billboard in the vertex shader around each instance's translation.

**Files:**
- Create: `src/gl/glowTexture.ts`, `src/gl/shaders/glow.ts`, `src/gl/shaders/ridge.ts`, `src/gl/Glow.tsx`
- Test: `src/gl/glowTexture.test.ts`, `src/gl/shaders/glow.test.ts`, `src/gl/lightRule.test.ts`

**Interfaces:**
- Consumes: `EMITTERS`; `inject` (Task 2.5); `SceneRefs`, `attachSink` (Task 2.2).
- Produces:
  - `glowTexture.ts`: `GLOW_SIZE = 64`, `glowAlpha(r: number): number`, `glowPixels(size?: number): Uint8Array`, `getGlowTexture(): THREE.DataTexture` (one shared instance; the name Stage 3 imports)
  - `shaders/glow.ts`: `GLOW_CACHE_KEY = 'valley-glow'`, `ADDITIVE_FOG: string`, `patchGlow(shader: { vertexShader: string; fragmentShader: string }): void`, `createGlowMaterial(map: THREE.Texture): THREE.MeshBasicMaterial`, `interface GlowInstances { count: number; map: Uint8Array; matrices: Float32Array; colors: Float32Array; sizes: Float32Array; lit: Float32Array }`, `glowInstances(): GlowInstances`
  - `shaders/ridge.ts`: `RIDGE_VERT`, `RIDGE_FRAG` (uniforms `uReveal`, `uPixelScale`, `uMap`, `uColor`; attributes `aBirth`, `aSize`), for Stage 3's `Ridge.tsx`
  - Component: `Glow({ refs }: { refs: SceneRefs })` (registers `refs.glow`)

- [ ] **Step 1: Write the failing tests**

`src/gl/glowTexture.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { GLOW_SIZE, glowAlpha, glowPixels, getGlowTexture } from './glowTexture';

describe('glow texture', () => {
  it('falls off from 1 at the centre to 0 at the rim, monotonically', () => {
    expect(glowAlpha(0)).toBe(1);
    expect(glowAlpha(1)).toBe(0);
    expect(glowAlpha(1.4)).toBe(0);
    for (let r = 0; r < 1; r += 0.05) expect(glowAlpha(r + 0.05)).toBeLessThanOrEqual(glowAlpha(r));
  });

  it('is a white 64 x 64 RGBA sprite, bright in the middle, clear in the corners, symmetric', () => {
    const px = glowPixels();
    expect(px.length).toBe(GLOW_SIZE * GLOW_SIZE * 4);
    const a = (i: number, j: number) => px[(j * GLOW_SIZE + i) * 4 + 3];
    expect(a(31, 31)).toBeGreaterThanOrEqual(240);
    expect(a(0, 0)).toBe(0);
    expect(a(63, 63)).toBe(0);
    for (let j = 0; j < GLOW_SIZE; j += 7) for (let i = 0; i < GLOW_SIZE; i += 5) {
      expect(a(i, j)).toBe(a(GLOW_SIZE - 1 - i, j));
      expect(a(i, j)).toBe(a(i, GLOW_SIZE - 1 - j));
    }
    for (let k = 0; k < px.length; k += 4) expect([px[k], px[k + 1], px[k + 2]]).toEqual([255, 255, 255]);
  });

  it('is generated once and shared', () => {
    const t = getGlowTexture();
    expect(t).toBe(getGlowTexture());
    expect(t.image.width).toBe(GLOW_SIZE);
    expect(t.generateMipmaps).toBe(false);
    expect(t.minFilter).toBe(THREE.LinearFilter);
  });
});
```

`src/gl/shaders/glow.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { EMITTERS } from '@/valley/lights';
import { EMITTER_INDEX } from '../projection';
import { getGlowTexture } from '../glowTexture';
import { ADDITIVE_FOG, createGlowMaterial, GLOW_CACHE_KEY, glowInstances, patchGlow } from './glow';
import { RIDGE_FRAG, RIDGE_VERT } from './ridge';

describe('glow', () => {
  it('has one sprite per emitter except the ridge, at the emitter, in its colour and size', () => {
    const g = glowInstances();
    expect(g.count).toBe(EMITTERS.length - 1);
    expect(Array.from(g.map)).not.toContain(EMITTER_INDEX.ridge);
    for (let k = 0; k < g.count; k++) {
      const e = EMITTERS[g.map[k]];
      expect(g.sizes[k]).toBeCloseTo(e.size, 6);
      expect(g.matrices[k * 16 + 12]).toBeCloseTo(e.position[0], 5);
      expect(g.matrices[k * 16 + 13]).toBeCloseTo(e.position[1], 5);
      expect(g.matrices[k * 16 + 14]).toBeCloseTo(e.position[2], 5);
      expect(g.matrices[k * 16]).toBe(1);
      const c = new THREE.Color(e.color);
      expect(g.colors[k * 3]).toBeCloseTo(c.r, 6);
    }
  });

  it('billboards, scales by aLit and fades to black in fog', () => {
    const shader = { vertexShader: THREE.ShaderLib.basic.vertexShader, fragmentShader: THREE.ShaderLib.basic.fragmentShader };
    patchGlow(shader);
    expect(shader.vertexShader).toContain('attribute float aLit;');
    expect(shader.vertexShader).toContain('attribute float aSize;');
    expect(shader.vertexShader).toContain('mvPosition.xy += position.xy * glowScale;');
    expect(shader.vertexShader).not.toContain('#include <project_vertex>');
    expect(shader.fragmentShader).not.toContain('#include <fog_fragment>');
    expect(shader.fragmentShader).toContain('gl_FragColor.rgb *= 1.0 - fogFactor;');
  });

  it('is additive, untoned, depth-write off, with its own program cache key', () => {
    const m = createGlowMaterial(getGlowTexture());
    expect(m.blending).toBe(THREE.AdditiveBlending);
    expect(m.toneMapped).toBe(false);
    expect(m.depthWrite).toBe(false);
    expect(m.transparent).toBe(true);
    expect(m.map).toBe(getGlowTexture());
    expect(m.customProgramCacheKey()).toBe(GLOW_CACHE_KEY);
  });

  it('the ridge shader reveals by birth and shares the additive fog fade', () => {
    expect(RIDGE_VERT).toContain('attribute float aBirth;');
    expect(RIDGE_VERT).toContain('attribute float aSize;');
    expect(RIDGE_VERT).toContain('step( aBirth, uReveal )');
    expect(RIDGE_FRAG).toContain(ADDITIVE_FOG.trim());
  });
});
```

`src/gl/lightRule.test.ts`:

```ts
// Spec §4.8: nothing in the GL tree but the windows, the glow and the ridge (and their shaders) is lit additively or
// uses an emissive material.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'src/gl');
const ALLOWED = new Set(['Windows.tsx', 'Glow.tsx', 'Ridge.tsx', 'shaders/windows.ts', 'shaders/glow.ts', 'shaders/ridge.ts']);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe('light rule', () => {
  it('keeps emissive and AdditiveBlending inside the windows, glow and ridge files', () => {
    const offenders = walk(ROOT)
      .filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.test.ts'))
      .filter((f) => /emissive|AdditiveBlending/i.test(readFileSync(f, 'utf8')))
      .map((f) => path.relative(ROOT, f).split(path.sep).join('/'))
      .filter((rel) => !ALLOWED.has(rel));
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run src/gl/glowTexture.test.ts src/gl/shaders/glow.test.ts src/gl/lightRule.test.ts`
Expected: FAIL for the first two with `Failed to resolve import`. `lightRule.test.ts` may already pass (nothing offends yet); that is expected, it guards later tasks.

- [ ] **Step 3: Write `src/gl/glowTexture.ts`**

```ts
// The one texture in the scene (spec §6, §12): a 64 x 64 white radial sprite that every glow sprite and ridge point
// samples. Computed as pixels (pure, testable in Node) and uploaded once as a DataTexture.
import * as THREE from 'three';

export const GLOW_SIZE = 64;

/** Alpha at normalised radius r (0 centre, 1 rim). */
export function glowAlpha(r: number): number {
  return r >= 1 ? 0 : Math.pow(1 - r, 2.2);
}

export function glowPixels(size: number = GLOW_SIZE): Uint8Array {
  const px = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const dx = ((i + 0.5) / size) * 2 - 1;
      const dy = ((j + 0.5) / size) * 2 - 1;
      const o = (j * size + i) * 4;
      px[o] = 255;
      px[o + 1] = 255;
      px[o + 2] = 255;
      px[o + 3] = Math.round(glowAlpha(Math.hypot(dx, dy)) * 255);
    }
  }
  return px;
}

let shared: THREE.DataTexture | null = null;

/** The shared sprite. Never disposed by a component: Glow and Ridge both sample it for the page's lifetime. */
export function getGlowTexture(): THREE.DataTexture {
  if (shared) return shared;
  const t = new THREE.DataTexture(glowPixels(), GLOW_SIZE, GLOW_SIZE, THREE.RGBAFormat);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  shared = t;
  return t;
}
```

- [ ] **Step 4: Write `src/gl/shaders/glow.ts`**

```ts
// Glow sprites (spec §6 Glow): one additive camera-facing sprite per emitter except the ridge, sized from the
// registry, scaled and brightened by aLit (0..1.6), toneMapped false so the pulse reads. MeshBasicMaterial patched
// through onBeforeCompile, like the windows, so instancing, instance colour and the map chunk stay three's own.
import * as THREE from 'three';
import { EMITTERS } from '@/valley/lights';
import { inject } from './inject';

export const GLOW_CACHE_KEY = 'valley-glow';

/** Additive light fades to black with distance instead of mixing toward the fog colour (which would add a halo). */
export const ADDITIVE_FOG = /* glsl */ `
#ifdef USE_FOG
  float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  gl_FragColor.rgb *= 1.0 - fogFactor;
#endif
`;

export function patchGlow(shader: { vertexShader: string; fragmentShader: string }): void {
  let v = shader.vertexShader;
  v = inject(v, '#include <common>', '#include <common>\nattribute float aLit;\nattribute float aSize;\nvarying float vLit;');
  v = inject(v, '#include <project_vertex>', [
    'vLit = aLit;',
    'float glowScale = aSize * clamp( aLit, 0.0, 1.6 );',
    'vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );',
    'mvPosition.xy += position.xy * glowScale;',
    'gl_Position = projectionMatrix * mvPosition;',
  ].join('\n\t'));
  let f = shader.fragmentShader;
  f = inject(f, '#include <common>', '#include <common>\nvarying float vLit;');
  f = inject(f, '#include <color_fragment>', '#include <color_fragment>\n\tdiffuseColor.a *= clamp( vLit, 0.0, 1.0 );\n\tdiffuseColor.rgb *= max( vLit, 1.0 );');
  f = inject(f, '#include <fog_fragment>', ADDITIVE_FOG);
  shader.vertexShader = v;
  shader.fragmentShader = f;
}

export function createGlowMaterial(map: THREE.Texture): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({
    map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  m.onBeforeCompile = (shader) => patchGlow(shader);
  m.customProgramCacheKey = () => GLOW_CACHE_KEY;
  return m;
}

export interface GlowInstances {
  count: number;
  map: Uint8Array;          // EMITTERS index per sprite
  matrices: Float32Array;   // translation-only instance matrices
  colors: Float32Array;     // linear rgb
  sizes: Float32Array;      // world size from the registry
  lit: Float32Array;        // aLit, written by the driver
}

export function glowInstances(): GlowInstances {
  const indices: number[] = [];
  EMITTERS.forEach((e, i) => { if (e.id !== 'ridge') indices.push(i); });
  const count = indices.length;
  const out: GlowInstances = {
    count,
    map: Uint8Array.from(indices),
    matrices: new Float32Array(count * 16),
    colors: new Float32Array(count * 3),
    sizes: new Float32Array(count),
    lit: new Float32Array(count),
  };
  const c = new THREE.Color();
  indices.forEach((ei, k) => {
    const e = EMITTERS[ei];
    const o = k * 16;
    out.matrices[o] = 1;
    out.matrices[o + 5] = 1;
    out.matrices[o + 10] = 1;
    out.matrices[o + 15] = 1;
    out.matrices[o + 12] = e.position[0];
    out.matrices[o + 13] = e.position[1];
    out.matrices[o + 14] = e.position[2];
    c.set(e.color).toArray(out.colors, k * 3);
    out.sizes[k] = e.size;
  });
  return out;
}
```

- [ ] **Step 5: Write `src/gl/shaders/ridge.ts`**

```ts
// The ridge's point shader (spec §4.6), for Stage 3's Ridge.tsx: a point shows when aBirth <= uReveal, sized by aSize
// with perspective, sampling the shared glow sprite, additive, fading to black in fog like the glow sprites.
import { ADDITIVE_FOG } from './glow';

export const RIDGE_VERT = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
attribute float aBirth;
attribute float aSize;
uniform float uReveal;
uniform float uPixelScale;
varying float vShown;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
  vShown = step( aBirth, uReveal );
  gl_PointSize = vShown * aSize * uPixelScale / max( 1.0, -mvPosition.z );
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

export const RIDGE_FRAG = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform sampler2D uMap;
uniform vec3 uColor;
varying float vShown;
void main() {
  if ( vShown < 0.5 ) discard;
  float a = texture2D( uMap, gl_PointCoord ).a;
  gl_FragColor = vec4( uColor * a, 1.0 );
  #include <colorspace_fragment>
  ${ADDITIVE_FOG}
}
`;
```

- [ ] **Step 6: Run the tests and see them pass**

Run: `npx vitest run src/gl/glowTexture.test.ts src/gl/shaders/glow.test.ts src/gl/lightRule.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 7: Write `src/gl/Glow.tsx`**

```tsx
'use client';
// One additive glow sprite per lit emitter, the ridge excluded (spec §6), in one instanced draw. The driver scatters
// the per-emitter levels into aLit each frame through refs.glow.
import { useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { attachSink, type SceneRefs } from './driverCore';
import { getGlowTexture } from './glowTexture';
import { createGlowMaterial, glowInstances } from './shaders/glow';

export function Glow({ refs }: { refs: SceneRefs }) {
  const data = useMemo(() => glowInstances(), []);
  const mesh = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.setAttribute('aLit', new THREE.InstancedBufferAttribute(data.lit, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aSize', new THREE.InstancedBufferAttribute(data.sizes, 1));
    const m = new THREE.InstancedMesh(geometry, createGlowMaterial(getGlowTexture()), data.count);
    m.instanceMatrix = new THREE.InstancedBufferAttribute(data.matrices, 16);
    m.instanceColor = new THREE.InstancedBufferAttribute(data.colors, 3);
    m.frustumCulled = false;
    m.renderOrder = 3;
    return m;
  }, [data]);

  useLayoutEffect(() => {
    const attr = mesh.geometry.getAttribute('aLit') as THREE.BufferAttribute;
    attachSink(refs, 'glow', { lit: data.lit, map: data.map, count: data.count, attr });
    return () => attachSink(refs, 'glow', null);
  }, [refs, data, mesh]);

  useEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    mesh.dispose();
  }, [mesh]);

  return <primitive object={mesh} />;
}
```

- [ ] **Step 8: Lint, typecheck, full suite, commit**

```bash
npm run lint && npx tsc --noEmit && npx vitest run
git add src/gl/glowTexture.ts src/gl/glowTexture.test.ts src/gl/shaders/glow.ts src/gl/shaders/glow.test.ts src/gl/shaders/ridge.ts src/gl/Glow.tsx src/gl/lightRule.test.ts
git commit -m "Add the glow sprites, the glow texture, the ridge shader and the light-rule test"
```

**Verify:** `npx vitest run src/gl/glowTexture.test.ts src/gl/shaders/glow.test.ts src/gl/lightRule.test.ts` passes; `grep -rln "AdditiveBlending\|emissive" src/gl --include=*.ts --include=*.tsx | grep -v test` lists only files in the allowed set.

---

### Task 2.7: Scene, warm-up, error boundary, camera rig, driver, and mounting the canvas

Spec: §6 (one fixed canvas behind the DOM at z 0, `main` at z 10, wrapper `pointer-events: none`; `gl`: antialias on desktop, `powerPreference: 'high-performance'`, `alpha: false`, `localClippingEnabled: true`, ACES tone mapping, sRGB output; DPR 1.25 desktop, 1 phone; one 1024 directional shadow map on desktop from the moon/sun direction, casters `Buildings` (the others arrive in Stages 3 and 4), terrain receives, none on phone; lights: one hemisphere, one directional, four point lights; `CameraRig`: fixed position per aspect, look direction and fov from the timeline, pointer parallax ±1° damped, recomposition on aspect change; `Driver`: the one `useFrame`, nothing else reads scroll), §7 (still as the CSS background of the canvas wrapper so first paint is a picture; the canvas mounts at opacity 0, waits for `document.fonts.ready`, `gl.compileAsync` with a 4 s timeout after which it proceeds, one rendered frame, then fades in over 200 ms; the end of the fade is T0), §11 (no WebGL or context loss: the canvas unmounts, the still stays, the DOM is complete; `?nogl=1` forces it; mist off on phone), §12 (`compileAsync` never resolving on a lost context: the 4 s timeout), §16 (a lost-context timeout resolves). Review Focus 5.

**Decisions where the spec is silent (also in doubts):** the fonts wait shares the 4 s ceiling too (a font that never loads must not hold the scene; spec §7 only names the compile timeout). T0 is `performance.now() / 1000` at the end of the fade, the same clock `Driver` passes as `t`; it is kept in a ref and handed to `applyFrame` as `introT = t − T0` for Stage 3. Hemisphere intensity is 0.9. The lights live in a small `SceneLights` component inside `Scene.tsx` (the spec lists no lights file). The still stays where Stage 0 put it, as the background of `div.valley-canvas` in `Site.tsx`; `Scene` mounts inside that div and renders nothing of its own when it fails, so the still is what remains. The one live frame (`{ inputs, targets }`) is a module singleton in `src/gl/frame.ts`: `Driver` writes it, `Scene` binds its uniforms, and later stages read it.

**Files:**
- Create: `src/gl/warmup.ts`, `src/gl/frame.ts`, `src/gl/CameraRig.tsx`, `src/gl/Driver.tsx`, `src/gl/Scene.tsx`
- Modify: `src/site/Site.tsx` (mount `Scene` through `next/dynamic` inside Stage 0's `div.valley-canvas`)
- Test: `src/gl/warmup.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2.1–2.6 (`createRig`, `setRigMode`, `resetPointer`, `isPortrait`, `normalizePointer`, `composeCamera`, `CAMERA_NEAR`, `CAMERA_FAR`; `createUniforms`, `createSceneRefs`, `createFrame`, `Frame`, `setFrameInputs`, `applyFrame`, `syncScene`, `attachFog`, `attachSun`, `attachPointLight`, `POINT_LIGHTS`; `projectEmitters`, `EMITTER_POSITIONS`; the components `Sky`, `Stars`, `Moon`, `Terrain`, `River`, `Mist`, `Buildings`, `Windows`, `Glow`); `CAMERA_LANDSCAPE`, `PLACES`; `webgl2Available` from `@/fallback/glSupport`; `useScroll` from `@/scroll/ScrollProvider`; `useTier` from `./useTier`.
- Produces:
  - `warmup.ts`: `FADE_MS = 200`, `COMPILE_TIMEOUT_MS = 4000`, `withTimeout(p: Promise<unknown>, ms: number): Promise<'done' | 'timeout' | 'failed'>`, `interface WarmUpDeps { fontsReady: Promise<unknown>; compile: () => Promise<unknown>; renderOnce: () => void; fadeIn: (ms: number) => void; wait: (ms: number) => Promise<void>; now: () => number }`, `warmUp(d: WarmUpDeps): Promise<number>` (resolves T0 in seconds)
  - `frame.ts`: `export const frame: Frame` (the one live frame; `frame.targets.uniforms` is the uniforms every material binds, `frame.targets.projected` is `PROJECTED`)
  - `CameraRig({ rig, tier, reducedMotion }: { rig: Rig; tier: Tier; reducedMotion: boolean })`
  - `Driver({ refs, rig, t0 }: { refs: SceneRefs; rig: Rig; t0: RefObject<number | null> })`
  - `Scene()`, `GLErrorBoundary`, `HEMI_INTENSITY = 0.9`, `SHADOW_MAP_SIZE = 1024`

- [ ] **Step 1: Write the failing test `src/gl/warmup.test.ts`**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { COMPILE_TIMEOUT_MS, FADE_MS, warmUp, withTimeout, type WarmUpDeps } from './warmup';

afterEach(() => { vi.useRealTimers(); });

function deps(log: string[], over: Partial<WarmUpDeps> = {}): WarmUpDeps {
  return {
    fontsReady: Promise.resolve().then(() => { log.push('fonts'); }),
    compile: () => { log.push('compile'); return Promise.resolve(); },
    renderOnce: () => { log.push('render'); },
    fadeIn: (ms) => { log.push(`fade ${ms}`); },
    wait: (ms) => new Promise<void>((resolve) => setTimeout(() => { log.push(`waited ${ms}`); resolve(); }, ms)),
    now: () => 12_345,
    ...over,
  };
}

describe('withTimeout', () => {
  it('reports done, failed or timeout', async () => {
    vi.useFakeTimers();
    await expect(withTimeout(Promise.resolve(1), 10)).resolves.toBe('done');
    await expect(withTimeout(Promise.reject(new Error('lost')), 10)).resolves.toBe('failed');
    const hanging = withTimeout(new Promise(() => {}), COMPILE_TIMEOUT_MS);
    await vi.advanceTimersByTimeAsync(COMPILE_TIMEOUT_MS);
    await expect(hanging).resolves.toBe('timeout');
  });
});

describe('warmUp (spec §7)', () => {
  it('waits for fonts, compiles, draws one frame, fades over 200 ms, then resolves T0 in seconds', async () => {
    vi.useFakeTimers();
    const log: string[] = [];
    const p = warmUp(deps(log));
    await vi.advanceTimersByTimeAsync(FADE_MS);
    await expect(p).resolves.toBe(12.345);
    expect(FADE_MS).toBe(200);
    expect(log).toEqual(['fonts', 'compile', 'render', 'fade 200', 'waited 200']);
  });

  it('proceeds after 4 s when compileAsync never settles (lost context, Review Focus 5)', async () => {
    vi.useFakeTimers();
    const log: string[] = [];
    const p = warmUp(deps(log, { compile: () => { log.push('compile'); return new Promise(() => {}); } }));
    await vi.advanceTimersByTimeAsync(COMPILE_TIMEOUT_MS - 1);
    expect(log).not.toContain('render');
    await vi.advanceTimersByTimeAsync(1 + FADE_MS);
    await expect(p).resolves.toBe(12.345);
    expect(log).toContain('render');
    expect(COMPILE_TIMEOUT_MS).toBe(4000);
  });

  it('proceeds when compile throws or rejects and when the first frame throws', async () => {
    vi.useFakeTimers();
    const log: string[] = [];
    const p = warmUp(deps(log, {
      compile: () => { throw new Error('context lost'); },
      renderOnce: () => { throw new Error('context lost'); },
    }));
    await vi.advanceTimersByTimeAsync(FADE_MS);
    await expect(p).resolves.toBe(12.345);
    expect(log).toContain('fade 200');
  });

  it('does not wait forever on fonts', async () => {
    vi.useFakeTimers();
    const log: string[] = [];
    const p = warmUp(deps(log, { fontsReady: new Promise(() => {}) }));
    await vi.advanceTimersByTimeAsync(COMPILE_TIMEOUT_MS + FADE_MS);
    await expect(p).resolves.toBe(12.345);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/gl/warmup.test.ts`
Expected: FAIL, `Failed to resolve import "./warmup"`.

- [ ] **Step 3: Write `src/gl/warmup.ts`**

```ts
// The warm-up (spec §7): fonts, compile every program with a 4 s ceiling (a lost context can leave compileAsync
// pending forever, spec §12), draw one frame, fade the canvas in over 200 ms. The end of the fade is T0.
// Dependencies are injected so this runs in Node under fake timers.

export const FADE_MS = 200;
export const COMPILE_TIMEOUT_MS = 4000;

/** Settles to 'done', 'failed' or 'timeout'; never rejects, never hangs past `ms`. */
export function withTimeout(p: Promise<unknown>, ms: number): Promise<'done' | 'timeout' | 'failed'> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve('timeout'), ms);
    p.then(
      () => { clearTimeout(timer); resolve('done'); },
      () => { clearTimeout(timer); resolve('failed'); },
    );
  });
}

export interface WarmUpDeps {
  fontsReady: Promise<unknown>;
  compile: () => Promise<unknown>;
  renderOnce: () => void;
  fadeIn: (ms: number) => void;
  wait: (ms: number) => Promise<void>;
  now: () => number;              // milliseconds, performance.now() in the browser
}

/** Resolves T0 in seconds on the deps' clock. */
export async function warmUp(d: WarmUpDeps): Promise<number> {
  await withTimeout(d.fontsReady, COMPILE_TIMEOUT_MS);
  let compiling: Promise<unknown>;
  try {
    compiling = d.compile();
  } catch (err) {
    compiling = Promise.reject(err);
  }
  await withTimeout(compiling, COMPILE_TIMEOUT_MS);
  try {
    d.renderOnce();
  } catch {
    // A lost context throws here; the context-loss listener and the error boundary take the canvas down.
  }
  d.fadeIn(FADE_MS);
  await d.wait(FADE_MS);
  return d.now() / 1000;
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run src/gl/warmup.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Write `src/gl/frame.ts`**

```ts
// The one live frame (spec §6 Driver): preallocated inputs and targets. Driver.tsx writes it every frame; Scene.tsx
// binds frame.targets.uniforms into every material; frame.targets.projected is PROJECTED, which the DOM labels read
// through @/gl/projection (so the site chunk never imports this module or three).
import { createFrame, createUniforms, type Frame } from './driverCore';

export const frame: Frame = createFrame(createUniforms());
```

- [ ] **Step 6: Write `src/gl/CameraRig.tsx`**

```tsx
'use client';
// Keeps the rig's mode and pointer current (spec §6 CameraRig). It never moves the camera itself: Driver.tsx calls
// composeCamera from the one useFrame. Portrait follows the canvas aspect (width < height), not the tier, so a
// small landscape laptop keeps the landscape camera (spec §11). Parallax: desktop, full motion, window listeners
// (the canvas wrapper has pointer-events: none and R3F pointer events are not used).
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { Tier } from '@/valley/types';
import { isPortrait, normalizePointer, resetPointer, setRigMode, type Rig } from './cameraCore';

export function CameraRig({ rig, tier, reducedMotion }: { rig: Rig; tier: Tier; reducedMotion: boolean }) {
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const parallaxOn = tier === 'desktop' && !reducedMotion;

  useEffect(() => {
    setRigMode(rig, isPortrait(width, height), parallaxOn);
  }, [rig, width, height, parallaxOn]);

  useEffect(() => {
    if (!parallaxOn) return;
    const onMove = (e: PointerEvent) => {
      normalizePointer(e.clientX, e.clientY, window.innerWidth, window.innerHeight, rig.pointer);
    };
    const onLeave = () => resetPointer(rig);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [rig, parallaxOn]);

  return null;
}
```

- [ ] **Step 7: Write `src/gl/Driver.tsx`**

```tsx
'use client';
// The one useFrame (spec §6 Driver, §8). Reads the scroll ref, runs applyFrame, copies uniforms onto fog and lights,
// composes the camera, and projects every emitter into PROJECTED for the DOM labels. Nothing else in the GL tree
// reads scroll. Allocation-free per frame at rest.
import type { RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type * as THREE from 'three';
import { useScroll } from '@/scroll/ScrollProvider';
import { applyFrame, setFrameInputs, syncScene, type SceneRefs } from './driverCore';
import { composeCamera, type Rig } from './cameraCore';
import { EMITTER_POSITIONS, projectEmitters } from './projection';
import { frame } from './frame';

export function Driver({ refs, rig, t0 }: { refs: SceneRefs; rig: Rig; t0: RefObject<number | null> }) {
  const { state, reducedMotion } = useScroll();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

  useFrame((_, delta) => {
    const { inputs, targets } = frame;
    const u = targets.uniforms;
    const s = state.current;
    const t = performance.now() / 1000;
    const start = t0.current;
    setFrameInputs(inputs, s.g, s.ranges, t, delta, start === null ? null : t - start, reducedMotion, rig.portrait);
    applyFrame(inputs, targets);
    syncScene(refs, u, targets.lit);
    composeCamera(rig, u.uYaw.value, u.uPitch.value, u.uFovScale.value, inputs.dt, camera);
    camera.updateMatrixWorld();
    projectEmitters(camera, EMITTER_POSITIONS, targets.projected);
  });

  return null;
}
```

- [ ] **Step 8: Write `src/gl/Scene.tsx`**

```tsx
'use client';
// The GL layer's root (spec §6, §7, §11). It mounts inside Stage 0's fixed div.valley-canvas, whose CSS background is
// the committed still, so the first paint is a picture. The canvas mounts at opacity 0; the warm-up fades it in and
// records T0. No WebGL2 (or ?nogl=1, read by webgl2Available), a renderer error, or a lost context unmounts the canvas
// and leaves the still and the DOM. Sky, stars, moon, terrain, river, mist (desktop), buildings, windows, glow, the lights, the
// camera rig and the driver are the scene for this stage.
import { Component, useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, type RootState } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { CAMERA_LANDSCAPE, PLACES } from '@/valley/layout';
import { webgl2Available } from '@/fallback/glSupport';
import { useScroll } from '@/scroll/ScrollProvider';
import { useTier } from './useTier';
import {
  attachFog, attachPointLight, attachSun, createSceneRefs, POINT_LIGHTS, type SceneRefs, type ValleyUniforms,
} from './driverCore';
import { CAMERA_FAR, CAMERA_NEAR, createRig } from './cameraCore';
import { warmUp } from './warmup';
import { frame } from './frame';
import { CameraRig } from './CameraRig';
import { Driver } from './Driver';
import { Sky } from './Sky';
import { Stars } from './Stars';
import { Moon } from './Moon';
import { Terrain } from './Terrain';
import { River } from './River';
import { Mist } from './Mist';
import { Buildings } from './Buildings';
import { Windows } from './Windows';
import { Glow } from './Glow';

export const HEMI_INTENSITY = 0.9;
export const SHADOW_MAP_SIZE = 1024;
const SHADOW_EXTENT = 70;

const HIDDEN = { opacity: 0 } as const;
const SHADOW_MAP = { type: THREE.PCFShadowMap } as const;
const CAMERA_OPTIONS = {
  position: [CAMERA_LANDSCAPE.position[0], CAMERA_LANDSCAPE.position[1], CAMERA_LANDSCAPE.position[2]] as [number, number, number],
  fov: CAMERA_LANDSCAPE.fov,
  near: CAMERA_NEAR,
  far: CAMERA_FAR,
};

/** A renderer failure must not take the DOM down; it unmounts the canvas and the still stays (spec §11). */
export class GLErrorBoundary extends Component<{ onError: () => void; children?: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function Scene() {
  const [failed, setFailed] = useState(() => !webgl2Available());
  const fail = useCallback(() => setFailed(true), []);
  if (failed) return null;
  return (
    <GLErrorBoundary onError={fail}>
      <ValleyCanvas onFail={fail} />
    </GLErrorBoundary>
  );
}

function ValleyCanvas({ onFail }: { onFail: () => void }) {
  const { tier, dpr, shadows, onDecline } = useTier();
  const { reducedMotion } = useScroll();
  const uniforms = frame.targets.uniforms;
  const refs = useMemo(() => createSceneRefs(), []);
  const rig = useMemo(() => createRig(), []);
  const t0 = useRef<number | null>(null);
  const fade = useRef<HTMLDivElement>(null);
  const fog = useMemo(() => {
    const f = new THREE.Fog(uniforms.uFogColor.value, uniforms.uFogNear.value, uniforms.uFogFar.value);
    f.color = uniforms.uFogColor.value;   // shared by reference: the driver writes it, the fog reads it
    return f;
  }, [uniforms]);
  const gl = useMemo(
    () => ({ antialias: tier === 'desktop', powerPreference: 'high-performance' as const, alpha: false }),
    [tier],
  );

  const onCreated = useCallback((state: RootState) => {
    state.gl.localClippingEnabled = true;
    state.gl.toneMapping = THREE.ACESFilmicToneMapping;
    state.gl.outputColorSpace = THREE.SRGBColorSpace;
    state.scene.fog = fog;
    attachFog(refs, fog);
    state.gl.domElement.addEventListener('webglcontextlost', onFail, { once: true });
    void warmUp({
      fontsReady: document.fonts.ready,
      compile: () => state.gl.compileAsync(state.scene, state.camera),
      renderOnce: () => state.gl.render(state.scene, state.camera),
      fadeIn: (ms) => {
        const el = fade.current;
        if (!el) return;
        el.style.transition = `opacity ${ms}ms`;
        el.style.opacity = '1';
      },
      wait: (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
      now: () => performance.now(),
    }).then((t) => { t0.current = t; });
  }, [fog, refs, onFail]);

  return (
    <div ref={fade} data-valley-fade="" className="absolute inset-0" style={HIDDEN}>
      <Canvas
        dpr={dpr}
        shadows={shadows ? SHADOW_MAP : false}
        gl={gl}
        camera={CAMERA_OPTIONS}
        frameloop="always"
        onCreated={onCreated}
      >
        <PerformanceMonitor onDecline={onDecline}>
          <SceneLights uniforms={uniforms} refs={refs} shadows={shadows} />
          <Sky uniforms={uniforms} />
          <Stars uniforms={uniforms} tier={tier} />
          <Moon uniforms={uniforms} />
          <Terrain shadows={shadows} />
          <River uniforms={uniforms} />
          {tier === 'desktop' && <Mist uniforms={uniforms} />}
          <Buildings shadows={shadows} />
          <Windows refs={refs} />
          <Glow refs={refs} />
          <CameraRig rig={rig} tier={tier} reducedMotion={reducedMotion} />
          <Driver refs={refs} rig={rig} t0={t0} />
        </PerformanceMonitor>
      </Canvas>
    </div>
  );
}

/** One hemisphere, one directional (moon/sun) with the desktop shadow map, four point lights (spec §6). */
function SceneLights({ uniforms, refs, shadows }: { uniforms: ValleyUniforms; refs: SceneRefs; shadows: boolean }) {
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const points = useRef<(THREE.PointLight | null)[]>([]);

  useLayoutEffect(() => {
    const h = hemi.current;
    const s = sun.current;
    if (h) {
      h.color = uniforms.uHemiSky.value;
      h.groundColor = uniforms.uHemiGround.value;
    }
    if (s) s.color = uniforms.uSunColor.value;
    attachSun(refs, s);
    POINT_LIGHTS.forEach((_, k) => attachPointLight(refs, k, points.current[k] ?? null));
    return () => {
      attachSun(refs, null);
      POINT_LIGHTS.forEach((_, k) => attachPointLight(refs, k, null));
    };
  }, [uniforms, refs]);

  return (
    <>
      <hemisphereLight ref={hemi} intensity={HEMI_INTENSITY} />
      <directionalLight
        ref={sun}
        castShadow={shadows}
        shadow-mapSize-width={SHADOW_MAP_SIZE}
        shadow-mapSize-height={SHADOW_MAP_SIZE}
        shadow-camera-left={-SHADOW_EXTENT}
        shadow-camera-right={SHADOW_EXTENT}
        shadow-camera-top={SHADOW_EXTENT}
        shadow-camera-bottom={-SHADOW_EXTENT}
        shadow-camera-near={1}
        shadow-camera-far={200}
        shadow-bias={-0.0005}
      />
      {POINT_LIGHTS.map((p, k) => {
        const at = PLACES[p.place];
        return (
          <pointLight
            key={p.id}
            ref={(light) => { points.current[k] = light; }}
            position={[at[0], at[1] + p.lift, at[2] + p.forward]}
            distance={p.distance}
            decay={2}
            intensity={0}
          />
        );
      })}
    </>
  );
}
```

- [ ] **Step 9: Mount the scene in `src/site/Site.tsx`**

Open `src/site/Site.tsx` (Stage 0 Task 0.8; it starts with `'use client';`, which `next/dynamic` with `ssr: false` requires). Make these two changes and nothing else:

1. Add under the existing imports:

```tsx
import dynamic from 'next/dynamic';

// The canvas is client-only and loads after hydration. Until then (and forever on the no-WebGL tier) the still behind
// it is div.valley-canvas's own CSS background, server-rendered, so the first paint is the finished picture (spec §7).
const Scene = dynamic(() => import('@/gl/Scene').then((m) => m.Scene), { ssr: false, loading: () => null });
```

2. Give Stage 0's self-closing still div a child, so it reads exactly:

```tsx
      <div className="valley-canvas" data-valley aria-hidden="true" style={{ backgroundImage: `url(${STILL})` }}>
        <Scene />
      </div>
```

Keep the div's class, `data-valley` and inline background exactly as they are: Stage 0's `exported.test.ts` asserts them in the exported HTML. `main` keeps `className="relative z-10"`.

- [ ] **Step 10: Lint, typecheck, full suite, build**

```bash
npm run lint && npx tsc --noEmit && npx vitest run && npm run build
```

Expected: all green, including Stage 0's `src/site/exported.test.ts` (run `npx vitest run` after the build so it is not skipped); `out/index.html` exists. If `tsc` reports that `useTier()` has no `shadows` or `onDecline`, read `src/gl/useTier.ts` (Stage 0) and use its field names; do not edit `useTier.ts` in this task.

- [ ] **Step 11: See it run**

Run `npm run dev` and, with the Playwright MCP tools (or a browser), at 1440 × 900:
- `http://localhost:3000/`: the still paints first, then within about 2 s the canvas fades in over it showing sky, terrain, river, buildings and lit windows with glow. `browser_evaluate` `() => document.querySelector('[data-valley-fade]').style.opacity` returns `"1"`.
- Move the pointer across the window: the view shifts by about a degree, eased.
- `browser_evaluate` `() => { document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext(); }`, wait 500 ms, then `() => document.querySelector('canvas')` returns `null` and the still is still visible behind the copy.
- `http://localhost:3000/?nogl=1`: no `canvas` element; `div.valley-canvas` is still there with the still as its background, and every section of copy renders.
- Resize to 390 × 844: the frame recomposes to the portrait camera (valley low in the frame, sky band above).
- `browser_console_messages` shows no errors on any of the above.

- [ ] **Step 12: Commit**

```bash
git add src/gl/warmup.ts src/gl/warmup.test.ts src/gl/frame.ts src/gl/CameraRig.tsx src/gl/Driver.tsx src/gl/Scene.tsx src/site/Site.tsx
git commit -m "Mount the valley canvas: warm-up, error boundary, camera rig and the frame driver"
```

**Verify:** `npx vitest run src/gl/warmup.test.ts` passes; `grep -rn "useFrame" src/gl --include=*.tsx` lists only `Driver.tsx`; `grep -rn "onPointer\|onClick" src/gl --include=*.tsx` prints nothing; `grep -n "state.current" src/gl/*.tsx` lists only `Driver.tsx`; the Step 11 checks reproduce, including the context-loss and `?nogl=1` cases.

---

### Task 2.8: Labels wired to the projected positions

Spec: §3.1 (the ignition labels' strings, mono hairline, near each light; one hillside label at the hillside's centre), §6 (`Labels.tsx` in `src/site/`: DOM spans positioned from the driver's projected positions each frame, no `getBoundingClientRect`), §12 (projected labels off-screen are clamped to the viewport and hidden). Review Focus 2 (labels re-project on resize).

**Decisions where the spec is silent (also in doubts):** the bars' one label anchors to `bar2` and the hillside label to `hill2` (the site nearest the five sites' centroid, (15, 18.2)). Opacity per label comes from `LABEL_ALPHA`, which stays 0 in this stage; Stage 3's ignition drives it, so in this stage the labels are placed every frame but invisible. Positions are read each animation frame from `PROJECTED` (written by `Driver`), converted with `placeLabel`, and written only when they move by more than half a pixel. The viewport size is cached from `resize`, not read per frame. The projected spans are `aria-hidden` (Stage 0's static `ul[data-labels]` list inside `Open` already carries the same strings and stays as it is; which of the two shows on which tier is Stage 3's and Stage 5's call).

**Files:**
- Create: `src/site/labelItems.ts`
- Modify: `src/site/Labels.tsx` (add `ProjectedLabels` beside Stage 0's static `Labels`), `src/site/Site.tsx` (render `<ProjectedLabels />`)
- Test: `src/site/labelItems.test.ts`

**Interfaces:**
- Consumes: `copy.open.labels` and `type IgnitionLabelKey` from `@/site/copy` (Stage 0); `EmitterId`; `EMITTERS`; `PROJECTED`, `LABEL_ALPHA`, `EMITTER_INDEX`, `placeLabel`, `LabelPlacement` from `@/gl/projection` (Task 2.1; it has no runtime three import, so the site chunk stays three-free).
- Produces:
  - `labelItems.ts`: `LABEL_ANCHORS: Readonly<Record<IgnitionLabelKey, EmitterId>>` (`hut → hut`, `nist → nist`, `mill → mill`, `kalshiLamp → kalshiLamp`, `wvu → wvu`, `bars → bar2`, `hillside → hill2`), `interface LabelItem { key: IgnitionLabelKey; anchor: EmitterId; text: string }`, `ignitionLabelItems(labels: Readonly<Record<IgnitionLabelKey, string>>): LabelItem[]`
  - `Labels.tsx`: Stage 0's `Labels()` unchanged, plus `LABEL_MARGIN = 16`, `IGNITION_LABELS: LabelItem[]`, `ProjectedLabels({ items }: { items?: readonly LabelItem[] })` (one `span[data-projected-label]` per label)

- [ ] **Step 1: Check the assumed copy keys**

Run: `grep -n "IgnitionLabelKey\|labels:" src/site/copy.ts && sed -n '1,40p' src/site/Labels.tsx`
Expected: `export type IgnitionLabelKey = 'hut' | 'nist' | 'mill' | 'kalshiLamp' | 'wvu' | 'bars' | 'hillside'`, `copy.open.labels` keyed by it, and Stage 0's static `Labels()`. If the keys differ, keep `LABEL_ANCHORS` keyed by the landed keys (same anchors) and adjust the test's expected object keys only.

- [ ] **Step 2: Write the failing test `src/site/labelItems.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { EMITTERS } from '@/valley/lights';
import { copy } from './copy';
import { ignitionLabelItems, LABEL_ANCHORS } from './labelItems';

describe('ignition label items', () => {
  const items = ignitionLabelItems(copy.open.labels);

  it('anchors every label to a registered emitter', () => {
    const ids = new Set(EMITTERS.map((e) => e.id));
    expect(items.length).toBe(7);
    for (const item of items) expect(ids.has(item.anchor), item.key).toBe(true);
    expect(LABEL_ANCHORS.bars).toBe('bar2');
    expect(LABEL_ANCHORS.hillside).toBe('hill2');
  });

  it('carries the spec §3.1 strings verbatim', () => {
    const text = Object.fromEntries(items.map((i) => [i.key, i.text]));
    expect(text).toEqual({
      hut: 'discord bots, middle school. my classmates used them.',
      nist: 'nist, summer 2025',
      mill: 'darch, june 2025 to may 2026',
      kalshiLamp: 'kalshi, since jan 2026',
      wvu: 'wvu medicine, summer 2026',
      bars: 'heron, since june 2026',
      hillside: 'things i built, one house each',
    });
  });
});
```

- [ ] **Step 3: Run it and see it fail**

Run: `npx vitest run src/site/labelItems.test.ts`
Expected: FAIL, `Failed to resolve import "./labelItems"`.

- [ ] **Step 4: Write `src/site/labelItems.ts`**

```ts
// Which emitter each ignition label hangs from (spec §3.1). Pure; the strings come from copy.ts.
import type { EmitterId } from '@/valley/types';
import type { IgnitionLabelKey } from './copy';

export const LABEL_ANCHORS: Readonly<Record<IgnitionLabelKey, EmitterId>> = {
  hut: 'hut',
  nist: 'nist',
  mill: 'mill',
  kalshiLamp: 'kalshiLamp',
  wvu: 'wvu',
  bars: 'bar2',
  hillside: 'hill2',
};

export interface LabelItem { key: IgnitionLabelKey; anchor: EmitterId; text: string }

export function ignitionLabelItems(labels: Readonly<Record<IgnitionLabelKey, string>>): LabelItem[] {
  return (Object.keys(LABEL_ANCHORS) as IgnitionLabelKey[]).map((key) => ({
    key,
    anchor: LABEL_ANCHORS[key],
    text: labels[key],
  }));
}
```

- [ ] **Step 5: Run it and see it pass**

Run: `npx vitest run src/site/labelItems.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 6: Add `ProjectedLabels` to `src/site/Labels.tsx`**

Keep Stage 0's `Labels()` function and its JSDoc exactly as they are. Put `'use client';` as the file's first line (the new component uses effects; `Site.tsx` is already a client boundary, so `Open` is unaffected). Replace the file's import block with the imports below, then append everything after them to the end of the file:

```tsx
'use client';
import { useEffect, useRef } from 'react';
import { EMITTER_INDEX, LABEL_ALPHA, PROJECTED, placeLabel, type LabelPlacement } from '@/gl/projection';
import { copy } from '@/site/copy';
import { ignitionLabelItems, type LabelItem } from './labelItems';

// ...Stage 0's Labels() stays here, unchanged...

// Projected labels over the canvas (spec §6 Labels): spans positioned every animation frame from PROJECTED, the
// driver's targets.projected. No getBoundingClientRect; the viewport size is cached on resize. placeLabel clamps to
// the viewport and hides anything off-screen or invalid (spec §12). Opacity comes from LABEL_ALPHA (0 until Stage 3).
export const LABEL_MARGIN = 16;
export const IGNITION_LABELS: LabelItem[] = ignitionLabelItems(copy.open.labels);

export function ProjectedLabels({ items = IGNITION_LABELS }: { items?: readonly LabelItem[] }) {
  const spans = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const indices = items.map((it) => EMITTER_INDEX[it.anchor]);
    const lastX = new Float32Array(items.length).fill(Number.NaN);
    const lastY = new Float32Array(items.length).fill(Number.NaN);
    const lastA = new Float32Array(items.length).fill(Number.NaN);
    const place: LabelPlacement = { x: 0, y: 0, visible: false };
    let vw = window.innerWidth;
    let vh = window.innerHeight;
    const onResize = () => { vw = window.innerWidth; vh = window.innerHeight; };
    window.addEventListener('resize', onResize);

    let raf = 0;
    const loop = () => {
      for (let k = 0; k < items.length; k++) {
        const el = spans.current[k];
        if (!el) continue;
        const i = indices[k];
        placeLabel(PROJECTED, i, vw, vh, LABEL_MARGIN, place);
        const alpha = place.visible ? LABEL_ALPHA[i] : 0;
        if (place.visible && (Math.abs(place.x - lastX[k]) > 0.5 || Math.abs(place.y - lastY[k]) > 0.5 || Number.isNaN(lastX[k]))) {
          el.style.transform = `translate3d(${place.x.toFixed(1)}px, ${place.y.toFixed(1)}px, 0) translate(-50%, -160%)`;
          lastX[k] = place.x;
          lastY[k] = place.y;
        }
        if (alpha !== lastA[k]) {
          el.style.opacity = String(alpha);
          lastA[k] = alpha;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [items]);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden" aria-hidden>
      {items.map((it, k) => (
        <span
          key={it.key}
          data-projected-label={it.key}
          ref={(el) => { spans.current[k] = el; }}
          className="mono absolute left-0 top-0 whitespace-nowrap text-[12px] leading-none"
          style={{ opacity: 0, color: 'var(--ink)' }}
        >
          {it.text}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Render it in `src/site/Site.tsx`**

Add `import { ProjectedLabels } from './Labels';` and render `<ProjectedLabels />` inside `<ScrollProvider>` directly after the closing `</main>`. Leave Stage 0's static `<Labels />` inside `Open` alone.

- [ ] **Step 8: Lint, typecheck, full suite, build**

```bash
npm run lint && npx tsc --noEmit && npx vitest run && npm run build
```

Expected: all green.

- [ ] **Step 9: See it placed**

`npm run dev`, Playwright at 1440 × 900 on `http://localhost:3000/`, wait 3 s, then `browser_evaluate`:

```js
() => [...document.querySelectorAll('[data-projected-label]')].map((e) => [e.dataset.projectedLabel, e.style.transform, e.style.opacity])
```

Expected: seven entries; every transform is a `translate3d(...)` with x in [16, 1424] and y in [16, 884]; every opacity is `"0"`. Resize to 390 × 844, wait 1 s, evaluate again: the transforms changed and stay within [16, 374] × [16, 828]. `grep -n "getBoundingClientRect" src/site/Labels.tsx` prints nothing.

- [ ] **Step 10: Commit**

```bash
git add src/site/labelItems.ts src/site/labelItems.test.ts src/site/Labels.tsx src/site/Site.tsx
git commit -m "Wire the DOM labels to the projected emitter positions"
```

**Verify:** `npx vitest run src/site/labelItems.test.ts` passes; Step 9's evaluate output reproduces at both sizes; `grep -n "three" src/site/Labels.tsx src/site/labelItems.ts` prints nothing (no three in the site chunk).

---

### Task 2.9: Gate G1, the valley still

Spec: §14 G1 ("terrain, river, sky, buildings, windows lit": passes when the lit night view reads as one place with depth and weather, dark and sober, not Kyoto, not a toy town; every light visible is a registered emitter; every emitter is in frame; on failure re-author the layout and the palette keyframes once, then simplify the buildings to silhouettes with windows), §2 (do not build list; stylized, not photoreal; sober materials), §14 preamble (Opus judges from Playwright stills against the exported build at 1440 × 900, saved under `.playwright-mcp/gates/`; lint, typecheck, vitest and build green). The implementer does not judge this gate.

**Files:**
- None created or modified in `src/`. Stills go to `.playwright-mcp/gates/` (gitignored).

**Interfaces:**
- Consumes: the exported build of Tasks 2.1–2.8.
- Produces: the G1 stills and the judge's written verdict, reported to the orchestrator.

- [ ] **Step 1: Everything green**

```bash
npm run lint && npx tsc --noEmit && npx vitest run && npm run build
```

Expected: all four succeed. `grep -rn "fetch(" src/` prints nothing.

- [ ] **Step 2: Serve the export**

Run in the background: `npx serve out -l 3005`. Expected: `http://localhost:3005` answers.

- [ ] **Step 3: Take the stills (Playwright MCP)**

`browser_resize` 1440 × 900, then for each row: `browser_navigate` to the URL, wait 6 s (warm-up and fade), run the scroll expression with `browser_evaluate`, wait 3 s (Lenis settles), `browser_take_screenshot` to the file.

| file | url | scroll expression | what it shows |
|---|---|---|---|
| `.playwright-mcp/gates/g1-open.png` | `http://localhost:3005/` | `() => window.scrollTo(0, 0)` | tod 0, dusk |
| `.playwright-mcp/gates/g1-kalshi.png` | `http://localhost:3005/` | `() => { const s = document.getElementById('kalshi'); window.scrollTo(0, s.offsetTop + s.offsetHeight / 2 - innerHeight / 2); }` | blue hour |
| `.playwright-mcp/gates/g1-night.png` | `http://localhost:3005/` | `() => { const s = document.getElementById('darch'); window.scrollTo(0, s.offsetTop + s.offsetHeight / 2 - innerHeight / 2); }` | the lit night view G1 judges |
| `.playwright-mcp/gates/g1-predawn.png` | `http://localhost:3005/` | `() => window.scrollTo(0, document.documentElement.scrollHeight)` | predawn |
| `.playwright-mcp/gates/g1-night-bare.png` | `http://localhost:3005/` | the `g1-night` expression, then `() => { document.querySelector('main').style.visibility = 'hidden'; }` | the same night frame without copy |
| `.playwright-mcp/gates/g1-nogl.png` | `http://localhost:3005/?nogl=1` | `() => window.scrollTo(0, 0)` | the still and the DOM, no canvas |

Also `browser_console_messages` after each: no errors.

- [ ] **Step 4: Hand the stills to an Opus judge**

The orchestrator dispatches an Opus agent (never the implementer, never the session model) with the six stills, spec §1, §2, §4 and §14, and this prompt:

> You are judging Gate G1 (valley still) of the Only Running Things Glow build. Look at `g1-night.png` and `g1-night-bare.png` first, then the others. Pass only if all hold: (1) the lit night view reads as one place with depth and weather, dark and sober; (2) it does not read as Kyoto, Ghibli or a toy town, and nothing on the spec §2 do-not-build list appears; (3) every light visible is one of the registered emitters (hut window, two hill cabin windows, four bar windows with porch lights, the mill's 20 windows, the kalshi lamp, and glow sprites at the five hillside sites, which have no houses until Stage 4); (4) every emitter is in frame; (5) `g1-nogl.png` shows the still and complete copy with no canvas. Answer PASS or FAIL, then one line per criterion with what you see, then for a FAIL the smallest change that would fix it, chosen from spec §14's remedy (re-author the layout and the palette keyframes once; on a second failure simplify the buildings to silhouettes with windows).

- [ ] **Step 5: Record the verdict**

Report the verdict and the judge's lines to the orchestrator. On FAIL, the remedy edits `src/valley/layout.ts` and `src/valley/palette.ts` (Stage 1 files) under a new task the orchestrator writes; re-run Steps 1–4 after it. Stage 3 does not start until G1 passes.

**Verify:** the six stills exist under `.playwright-mcp/gates/`; Step 1's four commands are green on the commit being judged; the verdict came from an Opus agent and names each of the five criteria.

---

## Self-review against the spec (for the reviewer of this stage file)

- §4.1 terrain, river, mist, sky, stars, moon, fog: Tasks 2.3, 2.4, 2.7 (fog object shared with `uFogColor`, range from `syncScene`).
- §4.2–§4.6 building bodies, windows (hut, cabins, bars with porch lights, mill 20 with `aRow`, lamp head): Task 2.5. Mill wheel, ridge draw, hedge lines: Stage 3. Hillside and visitor houses: Stage 4.
- §4.8 light rule: Task 2.6 grep test; windows and glow are the only lit draws in this stage.
- §6 canvas config, shadows, lights, one `useFrame`, `CameraRig`, `Driver`, `Labels`: Tasks 2.1, 2.2, 2.7, 2.8.
- §7 warm-up with the 4 s compile timeout and T0: Task 2.7.
- §11 no-GL and context loss, `?nogl=1`, mist off on phone, stars 400 on phone: Tasks 2.3, 2.7.
- §12 allocation-free `applyFrame`, clamped labels, `compileAsync` timeout: Tasks 2.2, 2.1, 2.7.
- §16 integration: `applyFrame` latches the reveal (2.2), projected labels clamp (2.1), lost-context timeout resolves (2.7).
- Review Focus 2 (resize/rotation): 2.1 aspect recompose test, 2.7 `CameraRig` size effect, 2.8 resize check. Review Focus 5 (context loss, hanging compile): 2.7 tests and the Step 11 context-loss check.
