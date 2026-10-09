# Stage 4 — Houses: hillside, visitor build, Yours wiring, storage, SVG

> Part of `2026-10-08-ortg-plan-00-index.md` (read its Global Constraints, Review Focus and Interface contracts first; they are law). This stage argues from the spec `docs/plans/2026-10-08-only-running-things-glow-design.md` §2 (the visitor's house is local; storage optional), §3.1 · 07 (the yours copy: placeholder, button, 140 characters, clock `{t} / 4.40`, tag `{words} words in · {parts} parts out · 4.40 s on the clock`, hint, hillside labels), §3.2 (the five hillside sentences), §4.7 (the lot and the hillside), §4.8 (light rule), §5.4 (the house grammar and `houseSvg`), §5.5 (`buildStateAt`, latch on wall time, 0.2 s light-out then the new build), §6 (`Hillside.tsx`, `VisitorHouse.tsx` with `clippingPlanes`, `clipShadows`, `DoubleSide` while building, `Scaffold.tsx`, one `useFrame`, window listeners and cached projections, the visitor point light, shadow casters), §11 (phone tap labels, blur on Enter and reframe, reduced motion builds at once, no-GL SVG elevation, storage blocked), §12 (draw budget, silent killers) and §16 (unit tests). It ends with **Gate G5 (house)** from §14.

Task order: 4.1, 4.2 and 4.5 are **[parallel-safe]** and start together. 4.3 needs 4.1 and 4.5 (both may edit `src/gl/driverCore.ts`). 4.4 needs 4.3. 4.6 needs 4.1, 4.2, 4.3 and 4.5. 4.7 needs 4.4 and 4.6. 4.8, 4.9 and 4.10 are **[parallel-safe]** once 4.2 is done (they touch disjoint files and do not need 4.3 to 4.7). 4.11 (the gate) runs last.

**What this stage assumes from Stages 0 to 3** (their plan files were written in parallel with this one; the names below come from the index contracts where the index names them, and are this stage's best reading otherwise). Every task that leans on a non-contract name says so in its first step and tells the implementer how to find the real one:

- `src/valley/house.ts` (Stage 1): `houseFromSentence(sentence): House` and `houseSvg(house): string` per the index contract. `House.parts[i].min/max` and `House.windows[i]` are in one house-local frame with y up; this stage does not rely on where that frame's origin is (it recentres from the parts' bounds).
- `src/valley/build.ts` (Stage 1): `BUILD_SECONDS = 4.4`, `buildStateAt(t)` returning `scaffold` as 18 entries `{ idx: 0..17, grow: 0..1 }` and `clock` as `t.toFixed(2)`.
- `src/valley/layout.ts` (Stage 1): `PLACES.lot`, `PLACES.hill1` … `PLACES.hill5` as `Vec3` with y = `heightAt(x, z)`.
- `src/valley/palette.ts` (Stage 1): exports `PALETTE` containing the §9 building-body colours `#1A1F28` (walls) and `#11151C` (roofs). This plan writes them as `PALETTE.wall` and `PALETTE.roof`; Task 4.1 Step 1 finds the real key path.
- `src/valley/lights.ts`: `EMITTERS` in the order `driverCore`'s `lit` and `projected` arrays use; `EMITTERS[i].color` is a hex string from the palette.
- `src/gl/Windows.tsx` (Stage 2): one `InstancedMesh` (capacity 512) whose base quad is a unit plane facing +z, a per-instance emitter-index attribute, and `mesh.count` equal to the number of static windows it wrote (hut, cabins, bars, porch lights, mill). Task 4.3 Step 1 confirms this.
- `src/gl/driverCore.ts` and `src/gl/Driver.tsx` (Stages 2 and 3): `applyFrame` fills `targets.lit` (EMITTERS order) from the ignition, pulse and flicker clocks, then copies it to uniforms and instance attributes; Driver passes `buildT: null` until this stage. `src/gl/driverCore.test.ts` exists with a helper that builds `FrameTargets` (called `makeTargets()` below).
- `src/gl/projection.ts` (Stage 2): exports the shared `projected: Float32Array` (stride 3: x px, y px from the viewport's top-left, visible 0/1, EMITTERS order) that Driver passes as `targets.projected` and `src/site/Labels.tsx` reads.
- `src/site/copy.ts` (Stage 0): `copy.yours` holds the §3.1 · 07 strings and `copy.yours.hillside` (§3.2). Task 4.2 pins the exact keys this stage reads.
- `src/scroll/ScrollProvider.tsx` (kept, rewired in Stage 0): `useScroll()` returns `{ state, scrollTo, reducedMotion, tier }`.
- `src/gl/useTier.ts` (kept, re-tuned in Stage 5): `useTier()` returns at least `{ tier, shadows }`.

---

### Task 4.1: House geometry, pure part **[parallel-safe]**

Spec: §4.7 (houses on the slope, one merged static mesh), §5.4 (parts in build order, colours from the dark ramp), §6 (house bodies `MeshLambertMaterial` with vertex colours; windows are instances in `Windows.tsx`), §9 (house bodies from the wall and roof colours), §12 (the grammar never yields zero parts; no NaN).

**Files:**
- Create: `src/gl/houseGeometry.ts`
- Test: `src/gl/houseGeometry.test.ts`

**Interfaces:**
- Consumes: `houseFromSentence(sentence: string): House`, `type House`, `type Vec3` (`src/valley/house.ts`, `src/valley/types.ts`); `PALETTE` (`src/valley/palette.ts`); `PLACES` (`src/valley/layout.ts`); `heightAt(x: number, z: number): number` (`src/valley/terrain.ts`); `mulberry32(seed: number): () => number` (`src/valley/rng.ts`).
- Produces (later tasks import these exactly):
  - `export const HOUSE_WALL: string`, `export const HOUSE_ROOF: string`
  - `export const WINDOW_W = 0.8`, `export const WINDOW_H = 0.6`, `export const SCAFFOLD_BARS = 18`, `export const SCAFFOLD_THICKNESS = 0.1`
  - `export const HILL_IDS: readonly ['hill1', 'hill2', 'hill3', 'hill4', 'hill5']`, `export type HillId`
  - `export interface WindowQuad { center: Vec3; normal: Vec3; width: number; height: number }` (world space; `normal` is an axis unit vector)
  - `export interface MeshArrays { positions: Float32Array; normals: Float32Array; colors: Float32Array; indices: Uint32Array }`
  - `export interface HouseMeshData extends MeshArrays { partCount: number; min: Vec3; max: Vec3; windows: WindowQuad[] }` (`min`/`max` are world-space bounds of every part)
  - `export interface ScaffoldBar { x: number; y: number; z: number; h: number }`
  - `export function seatY(x: number, z: number, halfW: number, halfD: number): number`
  - `export function houseMeshData(house: House, x: number, z: number): HouseMeshData`
  - `export function mergeMeshData(list: readonly MeshArrays[]): MeshArrays`
  - `export function toBufferGeometry(m: MeshArrays): BufferGeometry`
  - `export function clipConstant(minY: number, maxY: number, cut: number): number`
  - `export function scaffoldBars(min: Vec3, max: Vec3): ScaffoldBar[]` (18 bars; 0–8 the front row, 9–17 the back row, so `(idx % 9)` pairs a front and a back bar)
  - `export function hillsideData(sentences: readonly string[]): { mesh: MeshArrays; windows: { emitter: HillId; quads: WindowQuad[] }[]; houses: House[] }`

Decisions where the spec is silent (stated here, listed in the stage doubts): each part is an axis-aligned box from `min`/`max` (24 vertices, 36 indices, built from three's unit `BoxGeometry` so the winding is right); slats and the chimney take the roof colour, every other part the wall colour, each part scaled by a seeded 0.9–1.1 so planks read; the house is centred on its site in x and z and seated at the lowest terrain height under its four corners and centre minus 0.1, so the downhill side never floats; each window quad is 0.8 × 0.6 (the hut's size, §4.2) on the nearest wall face, 0.03 outside it; scaffold bars stand 0.5 in front of and behind the walls, 0.3 past the ends, 0.6 taller than the house.

- [ ] **Step 1: Find the palette keys for the two body colours**

Run: `grep -n "1A1F28\|11151C" src/valley/palette.ts`
Expected: two lines. This plan writes `PALETTE.wall` and `PALETTE.roof`. If the keys sit at another path (for example `PALETTE.body.wall`), use that path in the two `HOUSE_` lines of Step 4 and nowhere else. Do not type a hex literal in `src/gl/` (index Global Constraints: colour literals live only in `palette.ts`).

- [ ] **Step 2: Write the failing test `src/gl/houseGeometry.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { Color } from 'three';
import { houseFromSentence } from '@/valley/house';
import { PALETTE } from '@/valley/palette';
import { PLACES } from '@/valley/layout';
import { heightAt } from '@/valley/terrain';
import {
  HILL_IDS, HOUSE_ROOF, HOUSE_WALL, SCAFFOLD_BARS, WINDOW_H, WINDOW_W,
  clipConstant, hillsideData, houseMeshData, mergeMeshData, scaffoldBars, seatY, toBufferGeometry,
} from './houseGeometry';

const HILLSIDE = [
  'a discord bot for my middle school server',
  'a trading algorithm for kalshi',
  'a pipeline that made three thousand videos a month',
  'a help-desk assistant that reads the docs for you',
  'a pricing model for free-drinks promos at bars',
];

function flatValues(o: unknown): unknown[] {
  return typeof o === 'object' && o !== null ? Object.values(o).flatMap(flatValues) : [o];
}
function allFinite(a: Float32Array): boolean {
  for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) return false;
  return true;
}

describe('houseMeshData', () => {
  const house = houseFromSentence('a trading algorithm for kalshi');
  const [x, , z] = PLACES.lot;
  const d = houseMeshData(house, x, z);

  it('emits one 24-vertex, 36-index box per part', () => {
    expect(d.partCount).toBe(house.parts.length);
    expect(d.positions.length).toBe(house.parts.length * 24 * 3);
    expect(d.normals.length).toBe(d.positions.length);
    expect(d.colors.length).toBe(d.positions.length);
    expect(d.indices.length).toBe(house.parts.length * 36);
    let max = 0;
    for (const i of d.indices) max = Math.max(max, i);
    expect(max).toBe(house.parts.length * 24 - 1);
  });

  it('keeps the parts in build order, so a rising clip plane reveals them in order (spec §5.4, §6)', () => {
    const blockMin = (i: number, axis: number) => {
      let m = Infinity;
      for (let v = 0; v < 24; v++) m = Math.min(m, d.positions[(i * 24 + v) * 3 + axis]);
      return m;
    };
    const n = house.parts.length;
    for (const i of [1, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1]) {
      for (const axis of [0, 1, 2]) {
        expect(blockMin(i, axis) - blockMin(0, axis)).toBeCloseTo(house.parts[i].min[axis] - house.parts[0].min[axis], 4);
      }
    }
  });

  it('is deterministic: the same sentence builds the same arrays', () => {
    const again = houseMeshData(houseFromSentence('a trading algorithm for kalshi'), x, z);
    expect(again.positions).toEqual(d.positions);
    expect(again.colors).toEqual(d.colors);
    expect(again.indices).toEqual(d.indices);
  });

  it('sits on its site: centred in x and z, seated at or below the ground', () => {
    expect((d.min[0] + d.max[0]) / 2).toBeCloseTo(x, 4);
    expect((d.min[2] + d.max[2]) / 2).toBeCloseTo(z, 4);
    expect(d.min[1]).toBeLessThanOrEqual(heightAt(x, z));
    expect(d.min[1]).toBeCloseTo(seatY(x, z, (d.max[0] - d.min[0]) / 2, (d.max[2] - d.min[2]) / 2), 4);
    expect(d.max[1] - d.min[1]).toBeGreaterThan(2.5);
  });

  it('colours every part from the palette wall or roof colour, scaled 0.9 to 1.1', () => {
    const values = flatValues(PALETTE);
    expect(values).toContain(HOUSE_WALL);
    expect(values).toContain(HOUSE_ROOF);
    const wall = new Color(HOUSE_WALL);
    const roof = new Color(HOUSE_ROOF);
    for (let p = 0; p < house.parts.length; p++) {
      const o = p * 24 * 3;
      const base = house.parts[p].kind === 'slat' || house.parts[p].kind === 'chimney' ? roof : wall;
      const k = d.colors[o] / base.r;
      expect(k).toBeGreaterThanOrEqual(0.9 - 1e-5);
      expect(k).toBeLessThanOrEqual(1.1 + 1e-5);
      expect(d.colors[o + 1]).toBeCloseTo(base.g * k, 5);
      expect(d.colors[o + 2]).toBeCloseTo(base.b * k, 5);
    }
  });

  it('turns every grammar window into an axis-facing quad outside the walls', () => {
    expect(d.windows).toHaveLength(house.windows.length);
    for (const w of d.windows) {
      expect(Math.abs(w.normal[0]) + Math.abs(w.normal[1]) + Math.abs(w.normal[2])).toBe(1);
      expect(w.normal[1]).toBe(0);
      expect(w.width).toBe(WINDOW_W);
      expect(w.height).toBe(WINDOW_H);
      expect(w.center[1]).toBeGreaterThan(d.min[1]);
      expect(w.center[1]).toBeLessThan(d.max[1]);
    }
    if (house.windowsPerFace.front > 0) expect(d.windows.some((w) => w.normal[2] === 1)).toBe(true);
  });

  it('never yields an empty or NaN house (index Review Focus 1)', () => {
    for (const s of ['', '   ', 'x'.repeat(60), 'word '.repeat(40)]) {
      const h = houseFromSentence(s);
      const m = houseMeshData(h, x, z);
      expect(m.partCount).toBeGreaterThan(0);
      expect(allFinite(m.positions)).toBe(true);
      expect(allFinite(m.colors)).toBe(true);
    }
  });
});

describe('clipConstant', () => {
  it('clips everything at cut 0 and nothing at cut 1', () => {
    expect(clipConstant(2, 8, 0)).toBeLessThan(2);
    expect(clipConstant(2, 8, 1)).toBeGreaterThan(8);
    expect(clipConstant(2, 8, 0.5)).toBeCloseTo(5, 1);
  });
});

describe('scaffoldBars', () => {
  it('stands 18 bars, a front row of 9 and a back row of 9, taller than the house', () => {
    const bars = scaffoldBars([0, 1, 0], [6, 7, 4]);
    expect(bars).toHaveLength(SCAFFOLD_BARS);
    for (let i = 0; i < 9; i++) expect(bars[i].z).toBeGreaterThan(4);
    for (let i = 9; i < 18; i++) expect(bars[i].z).toBeLessThan(0);
    for (const b of bars) {
      expect(b.y).toBe(1);
      expect(b.h).toBeGreaterThan(6);
      expect(b.x).toBeGreaterThanOrEqual(-0.3 - 1e-9);
      expect(b.x).toBeLessThanOrEqual(6.3 + 1e-9);
    }
    expect(bars[0].x).toBeCloseTo(bars[9].x, 9);
  });
});

describe('hillsideData', () => {
  const h = hillsideData(HILLSIDE);
  it('builds the five §3.2 houses, one window group per hill emitter, in hill order', () => {
    expect(h.houses).toHaveLength(5);
    expect(h.windows.map((w) => w.emitter)).toEqual([...HILL_IDS]);
    h.houses.forEach((house, i) => {
      expect(house.parts.length).toBeGreaterThanOrEqual(150);
      expect(house.parts.length).toBeLessThanOrEqual(2200);
      expect(h.windows[i].quads).toHaveLength(house.windows.length);
    });
  });
  it('merges all five into one mesh with offset indices', () => {
    const parts = h.houses.reduce((s, x) => s + x.parts.length, 0);
    expect(h.mesh.positions.length).toBe(parts * 72);
    expect(h.mesh.indices.length).toBe(parts * 36);
    let max = 0;
    for (const i of h.mesh.indices) max = Math.max(max, i);
    expect(max).toBe(parts * 24 - 1);
  });
  it('places each house on its own site', () => {
    h.windows.forEach((w, i) => {
      const p = PLACES[HILL_IDS[i]];
      for (const q of w.quads) {
        expect(Math.abs(q.center[0] - p[0])).toBeLessThan(8);
        expect(Math.abs(q.center[2] - p[2])).toBeLessThan(5);
      }
    });
  });
});

describe('mergeMeshData and toBufferGeometry', () => {
  it('wraps the arrays in an indexed geometry with position, normal and color', () => {
    const a = houseMeshData(houseFromSentence('one'), 0, 10);
    const b = houseMeshData(houseFromSentence('two words'), 10, 10);
    const m = mergeMeshData([a, b]);
    expect(m.indices[a.indices.length]).toBe(a.indices[0] + a.positions.length / 3);
    const g = toBufferGeometry(m);
    expect(g.getIndex()!.count).toBe(m.indices.length);
    expect(g.getAttribute('position').count).toBe(m.positions.length / 3);
    expect(g.getAttribute('normal').count).toBe(m.positions.length / 3);
    expect(g.getAttribute('color').count).toBe(m.positions.length / 3);
    expect(g.boundingSphere).not.toBeNull();
  });
});
```

- [ ] **Step 3: Run it and see it fail**

Run: `npx vitest run src/gl/houseGeometry.test.ts`
Expected: FAIL with `Failed to resolve import "./houseGeometry"`.

- [ ] **Step 4: Write `src/gl/houseGeometry.ts`**

```ts
// House parts → world-space mesh arrays (spec §4.7, §5.4, §6, §9). Uses only three's math and geometry classes, which
// run in Node, so it is tested without a renderer. Hillside.tsx, VisitorHouse.tsx and Scaffold.tsx wrap its output.
import { BoxGeometry, BufferAttribute, BufferGeometry, Color } from 'three';
import type { House, Vec3 } from '@/valley/types';
import { PALETTE } from '@/valley/palette';
import { PLACES } from '@/valley/layout';
import { heightAt } from '@/valley/terrain';
import { mulberry32 } from '@/valley/rng';
import { houseFromSentence } from '@/valley/house';

/** §9: house bodies use the building wall and roof colours. */
export const HOUSE_WALL: string = PALETTE.wall;
export const HOUSE_ROOF: string = PALETTE.roof;

export const WINDOW_W = 0.8;          // the hut's window (§4.2); the grammar gives positions, not sizes
export const WINDOW_H = 0.6;
const WINDOW_OUT = 0.03;              // quads sit this far outside the wall so they never z-fight
const SINK = 0.1;                     // seat below the lowest corner so no edge floats on the slope
export const SCAFFOLD_BARS = 18;      // §5.5, §6
export const SCAFFOLD_THICKNESS = 0.1;

export const HILL_IDS = ['hill1', 'hill2', 'hill3', 'hill4', 'hill5'] as const;
export type HillId = (typeof HILL_IDS)[number];

export interface WindowQuad { center: Vec3; normal: Vec3; width: number; height: number }
export interface MeshArrays { positions: Float32Array; normals: Float32Array; colors: Float32Array; indices: Uint32Array }
export interface HouseMeshData extends MeshArrays { partCount: number; min: Vec3; max: Vec3; windows: WindowQuad[] }
export interface ScaffoldBar { x: number; y: number; z: number; h: number }

// One unit box, centred at the origin: 24 vertices (4 per face, flat normals), 36 indices, correct winding.
const UNIT = new BoxGeometry(1, 1, 1);
const UNIT_POS = UNIT.getAttribute('position').array;
const UNIT_NRM = UNIT.getAttribute('normal').array;
const UNIT_IDX = UNIT.getIndex()!.array;
const BOX_VERTS = 24;
const BOX_INDICES = 36;

/** The height a footprint of half-size halfW × halfD centred at (x, z) sits at: its lowest corner, minus SINK. */
export function seatY(x: number, z: number, halfW: number, halfD: number): number {
  return Math.min(
    heightAt(x, z),
    heightAt(x - halfW, z - halfD), heightAt(x + halfW, z - halfD),
    heightAt(x - halfW, z + halfD), heightAt(x + halfW, z + halfD),
  ) - SINK;
}

function windowQuad(w: Vec3, lo: number[], hi: number[], off: number[]): WindowQuad {
  // Nearest wall face: 0 = −x, 1 = +x, 2 = −z (back), 3 = +z (front, toward the camera).
  const d = [Math.abs(w[0] - lo[0]), Math.abs(hi[0] - w[0]), Math.abs(w[2] - lo[2]), Math.abs(hi[2] - w[2])];
  let k = 0;
  for (let j = 1; j < 4; j++) if (d[j] < d[k]) k = j;
  const normal: Vec3 = k === 0 ? [-1, 0, 0] : k === 1 ? [1, 0, 0] : k === 2 ? [0, 0, -1] : [0, 0, 1];
  const lx = k === 0 ? lo[0] - WINDOW_OUT : k === 1 ? hi[0] + WINDOW_OUT : w[0];
  const lz = k === 2 ? lo[2] - WINDOW_OUT : k === 3 ? hi[2] + WINDOW_OUT : w[2];
  return { center: [lx + off[0], w[1] + off[1], lz + off[2]], normal, width: WINDOW_W, height: WINDOW_H };
}

/** One house as world-space boxes in `house.parts` order, centred on (x, z) and seated on the terrain. */
export function houseMeshData(house: House, x: number, z: number): HouseMeshData {
  const parts = house.parts;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  let wlo = [Infinity, Infinity, Infinity];
  let whi = [-Infinity, -Infinity, -Infinity];
  for (const p of parts) {
    for (let a = 0; a < 3; a++) {
      lo[a] = Math.min(lo[a], p.min[a]);
      hi[a] = Math.max(hi[a], p.max[a]);
      if (p.kind === 'plank') {
        wlo[a] = Math.min(wlo[a], p.min[a]);
        whi[a] = Math.max(whi[a], p.max[a]);
      }
    }
  }
  if (!Number.isFinite(wlo[0])) { wlo = lo.slice(); whi = hi.slice(); }

  const baseY = seatY(x, z, (hi[0] - lo[0]) / 2, (hi[2] - lo[2]) / 2);
  const off = [x - (lo[0] + hi[0]) / 2, baseY - lo[1], z - (lo[2] + hi[2]) / 2];

  const n = parts.length;
  const positions = new Float32Array(n * BOX_VERTS * 3);
  const normals = new Float32Array(n * BOX_VERTS * 3);
  const colors = new Float32Array(n * BOX_VERTS * 3);
  const indices = new Uint32Array(n * BOX_INDICES);
  const rand = mulberry32(house.seed);
  const wall = new Color(HOUSE_WALL);
  const roof = new Color(HOUSE_ROOF);
  const c = new Color();

  for (let i = 0; i < n; i++) {
    const p = parts[i];
    const sx = p.max[0] - p.min[0], sy = p.max[1] - p.min[1], sz = p.max[2] - p.min[2];
    const mx = (p.min[0] + p.max[0]) / 2 + off[0];
    const my = (p.min[1] + p.max[1]) / 2 + off[1];
    const mz = (p.min[2] + p.max[2]) / 2 + off[2];
    c.copy(p.kind === 'slat' || p.kind === 'chimney' ? roof : wall).multiplyScalar(0.9 + 0.2 * rand());
    const vb = i * BOX_VERTS;
    for (let v = 0; v < BOX_VERTS; v++) {
      const o = (vb + v) * 3;
      const u = v * 3;
      positions[o] = mx + UNIT_POS[u] * sx;
      positions[o + 1] = my + UNIT_POS[u + 1] * sy;
      positions[o + 2] = mz + UNIT_POS[u + 2] * sz;
      normals[o] = UNIT_NRM[u];
      normals[o + 1] = UNIT_NRM[u + 1];
      normals[o + 2] = UNIT_NRM[u + 2];
      colors[o] = c.r;
      colors[o + 1] = c.g;
      colors[o + 2] = c.b;
    }
    const ib = i * BOX_INDICES;
    for (let k = 0; k < BOX_INDICES; k++) indices[ib + k] = vb + UNIT_IDX[k];
  }

  return {
    positions, normals, colors, indices,
    partCount: n,
    min: [lo[0] + off[0], lo[1] + off[1], lo[2] + off[2]],
    max: [hi[0] + off[0], hi[1] + off[1], hi[2] + off[2]],
    windows: house.windows.map((w) => windowQuad(w, wlo, whi, off)),
  };
}

/** Concatenate meshes into one (the hillside's single draw), offsetting indices. */
export function mergeMeshData(list: readonly MeshArrays[]): MeshArrays {
  let v = 0;
  let k = 0;
  for (const m of list) { v += m.positions.length; k += m.indices.length; }
  const out: MeshArrays = {
    positions: new Float32Array(v), normals: new Float32Array(v), colors: new Float32Array(v), indices: new Uint32Array(k),
  };
  let vo = 0;
  let ko = 0;
  for (const m of list) {
    out.positions.set(m.positions, vo);
    out.normals.set(m.normals, vo);
    out.colors.set(m.colors, vo);
    const base = vo / 3;
    for (let i = 0; i < m.indices.length; i++) out.indices[ko + i] = m.indices[i] + base;
    vo += m.positions.length;
    ko += m.indices.length;
  }
  return out;
}

export function toBufferGeometry(m: MeshArrays): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(m.positions, 3));
  g.setAttribute('normal', new BufferAttribute(m.normals, 3));
  g.setAttribute('color', new BufferAttribute(m.colors, 3));
  g.setIndex(new BufferAttribute(m.indices, 1));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

/**
 * Constant for a clip plane with normal (0, −1, 0): three discards points whose signed distance (−y + constant) is
 * negative, i.e. everything above the constant. cut 0 hides the whole house, cut 1 shows all of it (§5.5 `cut`).
 */
export function clipConstant(minY: number, maxY: number, cut: number): number {
  return minY - 0.01 + cut * (maxY - minY + 0.02);
}

/** 18 bars: 0–8 along the front wall, 9–17 along the back, so §5.5's `(idx % 9)` stagger raises them in pairs. */
export function scaffoldBars(min: Vec3, max: Vec3): ScaffoldBar[] {
  const h = max[1] - min[1] + 0.6;
  const x0 = min[0] - 0.3;
  const x1 = max[0] + 0.3;
  const bars: ScaffoldBar[] = [];
  for (let row = 0; row < 2; row++) {
    const z = row === 0 ? max[2] + 0.5 : min[2] - 0.5;
    for (let k = 0; k < 9; k++) bars.push({ x: x0 + ((x1 - x0) * k) / 8, y: min[1], z, h });
  }
  return bars;
}

/** The five §3.2 houses on PLACES.hill1…hill5 (§4.7): one merged mesh plus each house's windows under its emitter. */
export function hillsideData(sentences: readonly string[]): {
  mesh: MeshArrays; windows: { emitter: HillId; quads: WindowQuad[] }[]; houses: House[];
} {
  const houses = HILL_IDS.map((_, i) => houseFromSentence(sentences[i] ?? ''));
  const datas = houses.map((h, i) => {
    const p = PLACES[HILL_IDS[i]];
    return houseMeshData(h, p[0], p[2]);
  });
  return {
    mesh: mergeMeshData(datas),
    windows: datas.map((d, i) => ({ emitter: HILL_IDS[i], quads: d.windows })),
    houses,
  };
}
```

- [ ] **Step 5: Run it and see it pass**

Run: `npx vitest run src/gl/houseGeometry.test.ts`
Expected: PASS (all tests in 5 describe blocks). If "places each house on its own site" fails for a house wider than 16 units, the grammar has produced a house the spec's 1–24-word range does not allow: report it, do not widen the bound.

- [ ] **Step 6: Lint, typecheck, full suite**

Run: `npm run lint && npx tsc --noEmit && npx vitest run`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/gl/houseGeometry.ts src/gl/houseGeometry.test.ts
git commit -m "Add house geometry: grammar parts to merged boxes, window quads, scaffold layout"
```

**Verify:**
- `npx vitest run src/gl/houseGeometry.test.ts` passes.
- `grep -nE "#[0-9A-Fa-f]{6}" src/gl/houseGeometry.ts` prints nothing (Stage 0's palette test scans comments too; no hex anywhere in a src .ts/.tsx outside `palette.ts`).
- `grep -n "emissive\|AdditiveBlending" src/gl/houseGeometry.ts` prints nothing.
- Read `houseMeshData`: the outer loop runs over `house.parts` in index order and writes block `i` at vertex offset `i * 24` (part order preserved for the clip).

---

### Task 4.2: Sentence, storage and the copy the build prints **[parallel-safe]**

Spec: §2 (only `localStorage.visitorSentence`; the page works with storage blocked), §3.1 · 07 (max 140 characters; placeholder, button, clock, tag, hint strings), §3.2 (the five sentences), §11 (storage blocked: the house does not persist, no errors), §12 (every storage access in try/catch). Index Review Focus 1 and 4.

**Files:**
- Create: `src/site/visitorSentence.ts`
- Test: `src/site/visitorSentence.test.ts`
- Modify (only if Step 3 finds a mismatch): `src/site/copy.ts`

**Interfaces:**
- Consumes: `copy` (`src/site/copy.ts`, Stage 0).
- Produces:
  - `export const VISITOR_MAX = 140`, `export const VISITOR_STORAGE_KEY = 'visitorSentence'`, `export const VISITOR_EVENT = 'ortg:visitor-sentence'`
  - `export function cleanSentence(raw: string): string | null` (trim, cut to 140 code points, trim; empty → null)
  - `export function countWords(s: string): number` (whitespace-split non-empty count, unclamped)
  - `export function loadVisitorSentence(): string | null`
  - `export function saveVisitorSentence(s: string): boolean`
  - `export function announceVisitorSentence(s: string): void`
  - `export function onVisitorSentence(cb: (s: string) => void): () => void`
  - `export function getVisitorSnapshot(): string | null`, `export function resetVisitorSnapshot(): void` (tests only)
  - `export interface TextSink { textContent: string | null }`, `export const yoursDom: { clock: TextSink | null; tag: TextSink | null }`
  - Copy keys this stage reads, with these exact shapes: `copy.yours.placeholder: string`, `copy.yours.button: string`, `copy.yours.hint: string`, `copy.yours.clock(t: string): string`, `copy.yours.tag(words: number, parts: number): string`, `copy.yours.hillside: readonly string[]`

- [ ] **Step 1: Write the failing test `src/site/visitorSentence.test.ts`**

```ts
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { copy } from '@/site/copy';
import {
  VISITOR_EVENT, VISITOR_MAX, VISITOR_STORAGE_KEY,
  announceVisitorSentence, cleanSentence, countWords, getVisitorSnapshot, loadVisitorSentence, onVisitorSentence,
  resetVisitorSnapshot, saveVisitorSentence,
} from './visitorSentence';

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => { m.delete(k); },
    setItem: (k: string, v: string) => { m.set(k, String(v)); },
  };
}

/** localStorage whose very access throws, as in some private modes. */
function blockStorage(): () => void {
  const prev = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new DOMException('denied', 'SecurityError'); },
  });
  return () => {
    if (prev) Object.defineProperty(globalThis, 'localStorage', prev);
    else delete (globalThis as { localStorage?: Storage }).localStorage;
  };
}

beforeEach(() => resetVisitorSnapshot());
afterEach(() => vi.unstubAllGlobals());

describe('cleanSentence and countWords', () => {
  it('trims, caps at 140 characters, and turns blank into null (Review Focus 1)', () => {
    expect(cleanSentence('  a bot that trades  ')).toBe('a bot that trades');
    expect(cleanSentence('')).toBeNull();
    expect(cleanSentence(' \t\n ')).toBeNull();
    expect(cleanSentence('a'.repeat(200))).toBe('a'.repeat(VISITOR_MAX));
    expect(cleanSentence('x'.repeat(60))).toBe('x'.repeat(60));
    expect(Array.from(cleanSentence('😀'.repeat(150))!)).toHaveLength(VISITOR_MAX);
  });
  it('counts the words typed, unclamped', () => {
    expect(countWords('a  bot\tthat\ntrades')).toBe(4);
    expect(countWords('   ')).toBe(0);
    expect(countWords('w '.repeat(30))).toBe(30);
  });
});

describe('localStorage.visitorSentence', () => {
  it('round-trips through storage under the spec key', () => {
    const s = memoryStorage();
    vi.stubGlobal('localStorage', s);
    expect(loadVisitorSentence()).toBeNull();
    expect(saveVisitorSentence('a bar that pays you back')).toBe(true);
    expect(s.getItem(VISITOR_STORAGE_KEY)).toBe('a bar that pays you back');
    expect(loadVisitorSentence()).toBe('a bar that pays you back');
  });
  it('cleans what it loads: blank is null, long is capped', () => {
    const s = memoryStorage();
    vi.stubGlobal('localStorage', s);
    s.setItem(VISITOR_STORAGE_KEY, '   ');
    expect(loadVisitorSentence()).toBeNull();
    s.setItem(VISITOR_STORAGE_KEY, 'b'.repeat(500));
    expect(loadVisitorSentence()).toBe('b'.repeat(VISITOR_MAX));
  });
  it('blocked storage: load is null, save is false, nothing throws (Review Focus 4)', () => {
    const restore = blockStorage();
    try {
      expect(() => loadVisitorSentence()).not.toThrow();
      expect(loadVisitorSentence()).toBeNull();
      expect(saveVisitorSentence('a thing')).toBe(false);
    } finally {
      restore();
    }
  });
  it('a full or read-only store: save is false, nothing throws', () => {
    const s = memoryStorage();
    s.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); };
    vi.stubGlobal('localStorage', s);
    expect(saveVisitorSentence('a thing')).toBe(false);
  });
  it('no storage at all (server render): null and false', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(loadVisitorSentence()).toBeNull();
    expect(saveVisitorSentence('a thing')).toBe(false);
  });
});

describe('announce, subscribe, snapshot', () => {
  it('announces on window and updates the snapshot; unsubscribe stops delivery', () => {
    vi.stubGlobal('window', new EventTarget());
    vi.stubGlobal('localStorage', memoryStorage());
    const got: string[] = [];
    const off = onVisitorSentence((s) => got.push(s));
    announceVisitorSentence('first');
    expect(got).toEqual(['first']);
    expect(getVisitorSnapshot()).toBe('first');
    off();
    announceVisitorSentence('second');
    expect(got).toEqual(['first']);
    expect(getVisitorSnapshot()).toBe('second');
  });
  it('the first snapshot reads storage once', () => {
    const s = memoryStorage();
    s.setItem(VISITOR_STORAGE_KEY, 'stored one');
    vi.stubGlobal('localStorage', s);
    expect(getVisitorSnapshot()).toBe('stored one');
    s.setItem(VISITOR_STORAGE_KEY, 'changed underneath');
    expect(getVisitorSnapshot()).toBe('stored one');
  });
  it('uses the event name the GL bridge and the SVG listen for', () => {
    expect(VISITOR_EVENT).toBe('ortg:visitor-sentence');
  });
});

describe('copy.yours strings the build prints (spec §3.1 · 07, §3.2)', () => {
  it('input, button and hint', () => {
    expect(copy.yours.placeholder).toBe("something you'd build");
    expect(copy.yours.button).toBe('build');
    expect(copy.yours.hint).toBe('it stays in this browser. nothing is sent anywhere.');
  });
  it('clock and tag', () => {
    expect(copy.yours.clock('2.15')).toBe('2.15 / 4.40');
    expect(copy.yours.tag(7, 233)).toBe('7 words in · 233 parts out · 4.40 s on the clock');
    expect(copy.yours.tag(24, 1933)).toBe('24 words in · 1,933 parts out · 4.40 s on the clock');
  });
  it('the five hillside sentences, in order', () => {
    expect(copy.yours.hillside).toEqual([
      'a discord bot for my middle school server',
      'a trading algorithm for kalshi',
      'a pipeline that made three thousand videos a month',
      'a help-desk assistant that reads the docs for you',
      'a pricing model for free-drinks promos at bars',
    ]);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/site/visitorSentence.test.ts`
Expected: FAIL with `Failed to resolve import "./visitorSentence"`.

- [ ] **Step 3: Make `copy.yours` match the keys above**

Open `src/site/copy.ts` and find the `yours` block. For each key the test names (`placeholder`, `button`, `hint`, `clock`, `tag`, `hillside`): if it exists with that exact shape and value, leave it. If Stage 0 stored the clock or tag as template strings, or under another key, replace them with exactly these members (keep every other key Stage 0 wrote; if you rename a key, `grep -rn "copy.yours.<oldName>" src/` and update each user):

```ts
    placeholder: "something you'd build",
    button: 'build',
    hint: 'it stays in this browser. nothing is sent anywhere.',
    clock: (t: string) => `${t} / 4.40`,
    tag: (words: number, parts: number) =>
      `${words} words in · ${parts.toLocaleString('en-US')} parts out · 4.40 s on the clock`,
    hillside: [
      'a discord bot for my middle school server',
      'a trading algorithm for kalshi',
      'a pipeline that made three thousand videos a month',
      'a help-desk assistant that reads the docs for you',
      'a pricing model for free-drinks promos at bars',
    ] as const,
```

(The parts count uses `toLocaleString('en-US')`, as the ridge counter does in §3.1 · 02, so a 1,933-part house prints `1,933`, matching §5.4's worked example.)

- [ ] **Step 4: Write `src/site/visitorSentence.ts`**

```ts
// The visitor's sentence (spec §2, §3.1 · 07, §11): cleaning, word count, the only localStorage key this site uses, and
// the window event that carries a submitted sentence to the GL bridge (src/gl/visitorBridge.ts) and the no-GL SVG
// (src/fallback/HouseSvg.tsx). Every storage access is inside try/catch: blocked storage means no persistence, never an
// error. The sentence only ever travels as a string to the grammar and to textContent; it is never HTML, never sent.

export const VISITOR_MAX = 140;
export const VISITOR_STORAGE_KEY = 'visitorSentence';
export const VISITOR_EVENT = 'ortg:visitor-sentence';

/** Trim, cap at 140 code points (so an emoji is never split), trim again; blank → null. */
export function cleanSentence(raw: string): string | null {
  const s = Array.from(raw.trim()).slice(0, VISITOR_MAX).join('').trim();
  return s.length > 0 ? s : null;
}

/** The words typed: whitespace-split, non-empty, not clamped (the tag prints the real count). */
export function countWords(s: string): number {
  return s.split(/\s+/).filter((w) => w.length > 0).length;
}

export function loadVisitorSentence(): string | null {
  try {
    const v = globalThis.localStorage?.getItem(VISITOR_STORAGE_KEY);
    return v == null ? null : cleanSentence(v);
  } catch {
    return null;
  }
}

export function saveVisitorSentence(s: string): boolean {
  try {
    const store = globalThis.localStorage;
    if (!store) return false;
    store.setItem(VISITOR_STORAGE_KEY, s);
    return true;
  } catch {
    return false;
  }
}

// The latest sentence, for useSyncExternalStore. undefined = not read from storage yet.
let latest: string | null | undefined;

export function getVisitorSnapshot(): string | null {
  if (latest === undefined) latest = loadVisitorSentence();
  return latest;
}

/** Tests only: forget the cached snapshot. */
export function resetVisitorSnapshot(): void {
  latest = undefined;
}

export function announceVisitorSentence(s: string): void {
  latest = s;
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<string>(VISITOR_EVENT, { detail: s }));
}

export function onVisitorSentence(cb: (s: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => cb((e as CustomEvent<string>).detail);
  window.addEventListener(VISITOR_EVENT, handler);
  return () => window.removeEventListener(VISITOR_EVENT, handler);
}

export interface TextSink { textContent: string | null }

/** The Yours section's clock and tag lines, registered by Yours.tsx on mount; the GL bridge writes them. */
export const yoursDom: { clock: TextSink | null; tag: TextSink | null } = { clock: null, tag: null };
```

- [ ] **Step 5: Run it and see it pass**

Run: `npx vitest run src/site/visitorSentence.test.ts`
Expected: PASS. Then run `npx vitest run src/site` to confirm Stage 0's copy tests still pass after any Step 3 edit.

- [ ] **Step 6: Lint, typecheck, full suite**

Run: `npm run lint && npx tsc --noEmit && npx vitest run`
Expected: all green.

- [ ] **Step 7: Commit** (add `src/site/copy.ts` only if Step 3 changed it)

```bash
git add src/site/visitorSentence.ts src/site/visitorSentence.test.ts src/site/copy.ts
git commit -m "Add visitor sentence helpers: clean, count, guarded storage, event, yours copy"
```

**Verify:**
- `npx vitest run src/site/visitorSentence.test.ts` passes, including "blocked storage" and "a full or read-only store".
- `grep -n "localStorage" src/site/visitorSentence.ts` shows every use inside a `try` block.
- `grep -rn "localStorage\|sessionStorage" src/ --include=*.ts --include=*.tsx | grep -v test` lists only this file and Stage 3's intro gate.
- `grep -n "fetch(" src/site/visitorSentence.ts` prints nothing.

---
### Task 4.3: Window slots: hillside and visitor windows as `Windows.tsx` instances

Spec: §4.7 ("each house is one emitter driving all of its window instances"), §6 (`Windows.tsx`: one `InstancedMesh`, capacity 512, "the hillside's and the visitor's (positions from the grammar, registered at build; `mesh.count` updated)"), §4.8 (only `Windows.tsx`, `Glow.tsx`, `Ridge.tsx` are emissive; houses register quads, they never draw light themselves).

**Files:**
- Create: `src/gl/windowSlots.ts`
- Test: `src/gl/windowSlots.test.ts`
- Modify: `src/gl/Windows.tsx` (one `useEffect` that binds its mesh and `WindowSet`; the sink passes the set itself)
- Modify: `src/gl/Glow.tsx` (the sink passes `source: data`)
- Modify: `src/gl/driverCore.ts` (`LitSink` reads a live count), `src/gl/driverCore.test.ts` (its `LitSink` cases)

**Interfaces:**
- Consumes: `WindowQuad` (Task 4.1); `EMITTERS` (`src/valley/lights.ts`); `EmitterId` (`src/valley/types.ts`); `EMITTER_INDEX` (`src/gl/projection.ts`, Stage 2 Task 2.1); `WindowSet`, `createWindowSet`, `STATIC_WINDOW_COUNT`, `WINDOW_CAPACITY` (`src/gl/structures.ts`, Stage 2 Task 2.5: the emitter index per slot is CPU-side in `WindowSet.emitterOf: Uint8Array`; the geometry carries only `aLit` and `aRow`); `LitSink`, `scatterLit`, `attachSink` (`src/gl/driverCore.ts`, Stage 2 Task 2.2).
- Produces:
  - `export type DynamicWindowEmitter = 'hill1' | 'hill2' | 'hill3' | 'hill4' | 'hill5' | 'visitor'`
  - `export const DYNAMIC_ORDER: readonly DynamicWindowEmitter[]` (hill1…hill5, visitor: the visitor is last so a rebuild only moves the tail)
  - `export interface WindowBuffers { capacity: number; staticCount: number; write(index: number, quad: WindowQuad, emitter: EmitterId): void; setCount(count: number): void }`
  - `export function bindWindowBuffers(b: WindowBuffers | null): void`
  - `export function setDynamicWindows(emitter: DynamicWindowEmitter, quads: readonly WindowQuad[]): void`
  - `export function dynamicWindowCount(emitter: DynamicWindowEmitter): number`
  - `export function resetWindowSlots(): void` (tests only)
  - `export function windowBuffersFor(mesh: InstancedMesh, set: WindowSet, staticCount?: number): WindowBuffers` (`staticCount` defaults to `STATIC_WINDOW_COUNT`)
  - Changed in `driverCore.ts`: `export interface LitSink { lit: Float32Array; map: Uint8Array; source: { readonly count: number }; attr: THREE.BufferAttribute | null }` (was `count: number`, copied at mount). `sinkLit` calls `scatterLit(lit, sink.map, sink.source.count, sink.lit)`, so a sink over a `WindowSet` follows `set.count` as hillside and visitor windows are added.

Registration is order-independent: `Hillside` and `VisitorHouse` may register before or after `Windows` mounts; every change rewrites the dynamic region (static instances first, then hill1…hill5, then visitor) and sets `set.count` and `mesh.count`. At most about 40 hillside quads plus 42 visitor quads (24 words × 3 tiers, §5.4), far under 512; the code still clamps at capacity.

- [ ] **Step 1: Read Stage 2's window code and confirm four facts**

Open `src/gl/structures.ts`, `src/gl/Windows.tsx` and `src/gl/driverCore.ts` (Stage 2 Tasks 2.2 and 2.5) and confirm: (a) `Windows.tsx` builds its `InstancedMesh` over a `WindowSet` from `createWindowSet()`, with `instanceMatrix` over `set.matrices`, `instanceColor` over `set.colors`, and `aLit`/`aRow` over `set.lit`/`set.rows`; (b) the base quad is `PlaneGeometry(1, 1)` facing +z; (c) there is no per-instance emitter attribute: the emitter index per slot is `set.emitterOf`, read on the CPU by `scatterLit`; (d) `Windows.tsx` registers `attachSink(refs, 'windows', { lit: set.lit, map: set.emitterOf, count: set.count, attr })`, where `count` is a number copied at mount. Because of (d), `scatterLit` stops at the static count and the hillside and visitor windows would never light. Step 6 fixes that by making the sink read the live `set.count`.

- [ ] **Step 2: Write the failing test `src/gl/windowSlots.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { InstancedBufferAttribute, InstancedMesh, Matrix4, MeshBasicMaterial, PlaneGeometry, Quaternion, Vector3 } from 'three';
import { EMITTERS } from '@/valley/lights';
import type { EmitterId } from '@/valley/types';
import { EMITTER_INDEX } from './projection';
import { createWindowSet, STATIC_WINDOW_COUNT, WINDOW_CAPACITY } from './structures';
import type { WindowQuad } from './houseGeometry';
import {
  DYNAMIC_ORDER, bindWindowBuffers, dynamicWindowCount, resetWindowSlots, setDynamicWindows, windowBuffersFor,
  type WindowBuffers,
} from './windowSlots';

const q = (x: number): WindowQuad => ({ center: [x, 1, 0], normal: [0, 0, 1], width: 0.8, height: 0.6 });

function fake(capacity: number, staticCount: number) {
  const writes: { i: number; x: number; e: EmitterId }[] = [];
  let count = -1;
  const b: WindowBuffers = {
    capacity, staticCount,
    write: (i, quad, e) => writes.push({ i, x: quad.center[0], e }),
    setCount: (n) => { count = n; },
  };
  return { b, writes, count: () => count };
}

/** The mesh Windows.tsx builds over a WindowSet (Stage 2 Task 2.5). */
function windowsMesh() {
  const set = createWindowSet();
  const geometry = new PlaneGeometry(1, 1);
  geometry.setAttribute('aLit', new InstancedBufferAttribute(set.lit, 1));
  geometry.setAttribute('aRow', new InstancedBufferAttribute(set.rows, 1));
  const mesh = new InstancedMesh(geometry, new MeshBasicMaterial(), WINDOW_CAPACITY);
  mesh.instanceMatrix = new InstancedBufferAttribute(set.matrices, 16);
  mesh.instanceColor = new InstancedBufferAttribute(set.colors, 3);
  mesh.count = set.count;
  return { set, mesh };
}

beforeEach(() => resetWindowSlots());

describe('window slots', () => {
  it('orders dynamic windows hill1…hill5 then visitor, after the static ones', () => {
    expect(DYNAMIC_ORDER).toEqual(['hill1', 'hill2', 'hill3', 'hill4', 'hill5', 'visitor']);
    const f = fake(512, 30);
    bindWindowBuffers(f.b);
    setDynamicWindows('visitor', [q(100)]);
    setDynamicWindows('hill2', [q(20), q(21)]);
    setDynamicWindows('hill1', [q(10)]);
    expect(f.count()).toBe(34);
    const last = f.writes.slice(-4);
    expect(last).toEqual([
      { i: 30, x: 10, e: 'hill1' }, { i: 31, x: 20, e: 'hill2' }, { i: 32, x: 21, e: 'hill2' }, { i: 33, x: 100, e: 'visitor' },
    ]);
  });

  it('keeps registrations made before Windows binds, and writes them on bind', () => {
    setDynamicWindows('hill3', [q(1), q(2)]);
    const f = fake(512, 10);
    bindWindowBuffers(f.b);
    expect(f.count()).toBe(12);
    expect(f.writes.map((w) => w.e)).toEqual(['hill3', 'hill3']);
  });

  it('a new visitor house replaces the old one; an empty list removes it', () => {
    const f = fake(512, 0);
    bindWindowBuffers(f.b);
    setDynamicWindows('visitor', [q(1), q(2), q(3)]);
    expect(f.count()).toBe(3);
    setDynamicWindows('visitor', [q(9)]);
    expect(f.count()).toBe(1);
    setDynamicWindows('visitor', []);
    expect(f.count()).toBe(0);
    expect(dynamicWindowCount('visitor')).toBe(0);
  });

  it('never writes past capacity', () => {
    const f = fake(12, 10);
    bindWindowBuffers(f.b);
    setDynamicWindows('hill1', [q(1), q(2), q(3), q(4)]);
    expect(f.count()).toBe(12);
    expect(Math.max(...f.writes.map((w) => w.i))).toBe(11);
  });

  it('does nothing and throws nothing while unbound', () => {
    expect(() => setDynamicWindows('hill1', [q(1)])).not.toThrow();
    expect(dynamicWindowCount('hill1')).toBe(1);
  });
});

describe('windowBuffersFor', () => {
  it('writes the WindowSet slot (matrix, emitter colour, row -1, emitterOf) and grows set.count and mesh.count', () => {
    const { set, mesh } = windowsMesh();
    expect(set.count).toBe(STATIC_WINDOW_COUNT);
    const b = windowBuffersFor(mesh, set);
    expect(b.capacity).toBe(WINDOW_CAPACITY);
    expect(b.staticCount).toBe(STATIC_WINDOW_COUNT);
    const i = STATIC_WINDOW_COUNT;
    const v0 = mesh.instanceMatrix.version;
    b.write(i, { center: [5, 6, 7], normal: [1, 0, 0], width: 0.8, height: 0.6 }, 'hill4');
    b.setCount(i + 1);
    expect(set.count).toBe(i + 1);
    expect(mesh.count).toBe(i + 1);
    expect(mesh.instanceMatrix.version).toBe(v0 + 1);
    expect(set.emitterOf[i]).toBe(EMITTER_INDEX.hill4);
    expect(set.rows[i]).toBe(-1);
    expect(set.colors[i * 3] + set.colors[i * 3 + 1] + set.colors[i * 3 + 2]).toBeGreaterThan(0);
    const m = new Matrix4().fromArray(set.matrices, i * 16);
    const p = new Vector3(), r = new Quaternion(), s = new Vector3();
    m.decompose(p, r, s);
    expect(p.toArray()).toEqual([5, 6, 7]);
    expect(s.x).toBeCloseTo(0.8, 6);
    expect(s.y).toBeCloseTo(0.6, 6);
    const facing = new Vector3(0, 0, 1).applyQuaternion(r);
    expect(facing.x).toBeCloseTo(1, 6);
    expect(facing.z).toBeCloseTo(0, 6);
    expect(EMITTERS[set.emitterOf[i]].id).toBe('hill4');
  });

  it('end to end: a registered hillside window lights through the live sink count', async () => {
    const { attachSink, createSceneRefs, syncScene, createUniforms } = await import('./driverCore');
    const { set, mesh } = windowsMesh();
    const refs = createSceneRefs();
    const attr = mesh.geometry.getAttribute('aLit') as InstancedBufferAttribute;
    attachSink(refs, 'windows', { lit: set.lit, map: set.emitterOf, source: set, attr });
    bindWindowBuffers(windowBuffersFor(mesh, set));
    setDynamicWindows('hill2', [q(3)]);
    const lit = new Float32Array(EMITTERS.length);
    lit[EMITTER_INDEX.hill2] = 1;
    syncScene(refs, createUniforms(), lit);
    expect(set.lit[STATIC_WINDOW_COUNT]).toBe(1);
  });
});
```

- [ ] **Step 3: Run it and see it fail**

Run: `npx vitest run src/gl/windowSlots.test.ts`
Expected: FAIL with `Failed to resolve import "./windowSlots"`.

- [ ] **Step 4: Write `src/gl/windowSlots.ts`**

```ts
// Dynamic window instances (spec §4.7, §6): the hillside's and the visitor's windows live in Windows.tsx's one
// InstancedMesh after its static windows. Houses register quads per emitter; this module owns the layout of the
// dynamic region and rewrites it on every change. Windows.tsx binds its mesh and WindowSet once with windowBuffersFor().
import { Color, Matrix4, Quaternion, Vector3, type InstancedMesh } from 'three';
import { EMITTERS } from '@/valley/lights';
import type { EmitterId } from '@/valley/types';
import type { WindowQuad } from './houseGeometry';
import { EMITTER_INDEX } from './projection';
import { STATIC_WINDOW_COUNT, type WindowSet } from './structures';

export type DynamicWindowEmitter = 'hill1' | 'hill2' | 'hill3' | 'hill4' | 'hill5' | 'visitor';
export const DYNAMIC_ORDER: readonly DynamicWindowEmitter[] = ['hill1', 'hill2', 'hill3', 'hill4', 'hill5', 'visitor'];

export interface WindowBuffers {
  capacity: number;
  staticCount: number;
  write(index: number, quad: WindowQuad, emitter: EmitterId): void;
  setCount(count: number): void;
}

const lists = new Map<DynamicWindowEmitter, readonly WindowQuad[]>();
let buffers: WindowBuffers | null = null;

function flush(): void {
  const b = buffers;
  if (!b) return;
  let i = b.staticCount;
  for (const id of DYNAMIC_ORDER) {
    for (const quad of lists.get(id) ?? []) {
      if (i >= b.capacity) break;
      b.write(i, quad, id);
      i++;
    }
  }
  b.setCount(i);
}

export function bindWindowBuffers(b: WindowBuffers | null): void {
  buffers = b;
  flush();
}

export function setDynamicWindows(emitter: DynamicWindowEmitter, quads: readonly WindowQuad[]): void {
  lists.set(emitter, quads);
  flush();
}

export function dynamicWindowCount(emitter: DynamicWindowEmitter): number {
  return lists.get(emitter)?.length ?? 0;
}

/** Tests only. */
export function resetWindowSlots(): void {
  lists.clear();
  buffers = null;
}

const FORWARD = new Vector3(0, 0, 1);   // Windows.tsx's base quad: PlaneGeometry(1, 1) facing +z

/**
 * WindowBuffers over Windows.tsx's mesh and its WindowSet (Stage 2 Task 2.5). A write fills the set's slot: matrix,
 * the emitter's colour (an unset instance colour is black, so the window would never show), row -1 (aRow only means
 * something for the mill), and emitterOf, which the driver's sink reads on the CPU. setCount moves set.count, which
 * the windows LitSink reads live, and mesh.count, and flags the uploads.
 */
export function windowBuffersFor(mesh: InstancedMesh, set: WindowSet, staticCount = STATIC_WINDOW_COUNT): WindowBuffers {
  const pos = new Vector3();
  const nrm = new Vector3();
  const scl = new Vector3();
  const rot = new Quaternion();
  const mat = new Matrix4();
  const col = new Color();
  const rowAttr = mesh.geometry.getAttribute('aRow');
  const litAttr = mesh.geometry.getAttribute('aLit');
  return {
    capacity: set.matrices.length / 16,
    staticCount,
    write(index, quad, emitter) {
      const e = EMITTER_INDEX[emitter];
      pos.set(quad.center[0], quad.center[1], quad.center[2]);
      rot.setFromUnitVectors(FORWARD, nrm.set(quad.normal[0], quad.normal[1], quad.normal[2]));
      scl.set(quad.width, quad.height, 1);
      mat.compose(pos, rot, scl).toArray(set.matrices, index * 16);
      col.set(EMITTERS[e].color).toArray(set.colors, index * 3);
      set.rows[index] = -1;
      set.lit[index] = 0;
      set.emitterOf[index] = e;
    },
    setCount(count) {
      set.count = count;
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      if (rowAttr) rowAttr.needsUpdate = true;
      if (litAttr) litAttr.needsUpdate = true;
    },
  };
}
```

- [ ] **Step 5: Run it and see the first six pass**

Run: `npx vitest run src/gl/windowSlots.test.ts`
Expected: 6 pass; "end to end" fails to typecheck or fails at `source` (the sink still takes `count`). Step 6 fixes it.

- [ ] **Step 6: Make `LitSink` read a live count (`src/gl/driverCore.ts`, `Windows.tsx`, `Glow.tsx`, `driverCore.test.ts`)**

In `src/gl/driverCore.ts` replace the interface and `sinkLit`:

```ts
/**
 * A per-instance level buffer fed from the per-emitter levels: windows (Task 2.5) and glow (Task 2.6). `source.count`
 * is read every frame, so a WindowSet that grows (hillside and visitor windows, Stage 4) lights its new slots.
 */
export interface LitSink { lit: Float32Array; map: Uint8Array; source: { readonly count: number }; attr: THREE.BufferAttribute | null }
```

```ts
function sinkLit(sink: LitSink | null, lit: Float32Array): void {
  if (!sink) return;
  if (scatterLit(lit, sink.map, sink.source.count, sink.lit) && sink.attr) sink.attr.needsUpdate = true;
}
```

In `src/gl/Windows.tsx` change the sink to pass the set itself, and add the bind effect after the `useLayoutEffect`:

```tsx
import { bindWindowBuffers, windowBuffersFor } from './windowSlots';
```

```tsx
    attachSink(refs, 'windows', { lit: set.lit, map: set.emitterOf, source: set, attr });
```

```tsx
  // Hillside and visitor windows (spec §4.7, §6) go after the static ones; see src/gl/windowSlots.ts.
  useEffect(() => {
    bindWindowBuffers(windowBuffersFor(mesh, set));
    return () => bindWindowBuffers(null);
  }, [mesh, set]);
```

In `src/gl/Glow.tsx` change `count: data.count` to `source: data` in its `attachSink` call (the glow instances are fixed; `data.count` never changes).

In `src/gl/driverCore.test.ts`, in "syncScene writes fog range, sun, point light intensities and flags changed sinks", change the sink to `{ lit: attr.array as Float32Array, map: Uint8Array.of(0, 1, 2), source: { count: 3 }, attr }`, and add one case after it:

```ts
  it('a sink follows its source count live (Stage 4 window slots)', () => {
    const refs = createSceneRefs();
    const attr = new THREE.InstancedBufferAttribute(new Float32Array(4), 1);
    const source = { count: 2 };
    attachSink(refs, 'windows', { lit: attr.array as Float32Array, map: Uint8Array.of(0, 0, 0, 0), source, attr });
    const lit = new Float32Array(EMITTER_COUNT).fill(1);
    syncScene(refs, createUniforms(), lit);
    expect(Array.from(attr.array)).toEqual([1, 1, 0, 0]);
    source.count = 4;
    syncScene(refs, createUniforms(), lit);
    expect(Array.from(attr.array)).toEqual([1, 1, 1, 1]);
  });
```

Run: `grep -rn "count: set.count\|count: data.count" src/gl` and expect nothing.

- [ ] **Step 7: Lint, typecheck, full suite**

Run: `npm run lint && npx tsc --noEmit && npx vitest run`
Expected: all green, including `src/gl/windowSlots.test.ts` (7 tests) and `src/gl/driverCore.test.ts`. Stage 2's light-rule test still passes: `windowSlots.ts` names neither `emissive` nor `AdditiveBlending`.

- [ ] **Step 8: Commit**

```bash
git add src/gl/windowSlots.ts src/gl/windowSlots.test.ts src/gl/Windows.tsx src/gl/Glow.tsx src/gl/driverCore.ts src/gl/driverCore.test.ts
git commit -m "Add window slots so hillside and visitor windows join the Windows instances"
```

**Verify:**
- `npx vitest run src/gl/windowSlots.test.ts src/gl/driverCore.test.ts` passes.
- `grep -n "bindWindowBuffers" src/gl/Windows.tsx` shows the bind and the unbind.
- `grep -n "source: set" src/gl/Windows.tsx` and `grep -n "source: data" src/gl/Glow.tsx` each print one line.
- `grep -n "emissive\|AdditiveBlending" src/gl/windowSlots.ts` prints nothing.
- `grep -n "sink.source.count" src/gl/driverCore.ts` prints the `sinkLit` line.

---

### Task 4.4: Hillside: five houses, one static mesh, one emitter each

Spec: §3.2 (the five sentences, built once at load), §4.7 (sites, one merged static mesh, one draw, one emitter per house), §5.3 (hill1…hill5 catch at 3.600 s with a 0.04 s stagger; the windows follow their emitters), §6 (`Hillside.tsx` is a shadow caster on desktop, `MeshLambertMaterial` with vertex colours and flat shading), §12 (merged once).

**Files:**
- Create: `src/gl/Hillside.tsx`
- Test: `src/gl/hillside.test.ts`
- Modify: `src/gl/Scene.tsx` (mount `<Hillside />`)

**Interfaces:**
- Consumes: `hillsideData`, `toBufferGeometry`, `HILL_IDS` (Task 4.1); `setDynamicWindows` (Task 4.3); `copy.yours.hillside` (Task 4.2); `useTier(): { shadows: boolean }` (`src/gl/useTier.ts`); `ignitionSchedule()` (`src/valley/ignition.ts`).
- Produces: `export function Hillside(): JSX.Element` (one mesh, registers hill1…hill5 windows on mount, clears them on unmount).

- [ ] **Step 1: Write the failing test `src/gl/hillside.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { copy } from '@/site/copy';
import { ignitionSchedule } from '@/valley/ignition';
import { HILL_IDS, hillsideData } from './houseGeometry';
import { bindWindowBuffers, resetWindowSlots, setDynamicWindows, type WindowBuffers } from './windowSlots';
import type { EmitterId } from '@/valley/types';

beforeEach(() => resetWindowSlots());

describe('the hillside', () => {
  it('builds from copy.yours.hillside: each hill emitter drives exactly its own house\'s windows', () => {
    const h = hillsideData(copy.yours.hillside);
    const written: EmitterId[] = [];
    let count = 0;
    const b: WindowBuffers = { capacity: 512, staticCount: 40, write: (...args) => { written.push(args[2]); }, setCount: (n) => { count = n; } };
    bindWindowBuffers(b);
    written.length = 0;
    for (const w of h.windows) setDynamicWindows(w.emitter, w.quads);
    const total = h.houses.reduce((s, x) => s + x.windows.length, 0);
    expect(count).toBe(40 + total);
    for (let i = 0; i < 5; i++) {
      const finalPass = written.slice(-total);
      expect(finalPass.filter((e) => e === HILL_IDS[i]).length).toBe(h.houses[i].windows.length);
    }
  });

  it('lights with the chain: hill1…hill5 catch from 3.6 s, 0.04 s apart (spec §5.3)', () => {
    const steps = ignitionSchedule().filter((s) => (HILL_IDS as readonly string[]).includes(s.target as string));
    expect(steps.map((s) => s.target)).toEqual([...HILL_IDS]);
    for (const s of steps) {
      expect(s.kind).toBe('catch');
      expect(s.at).toBeGreaterThanOrEqual(3.6 - 1e-9);
      expect(s.at).toBeLessThanOrEqual(3.6 + 0.04 * 5 + 1e-9);
    }
  });

  it('Hillside.tsx is one Lambert mesh with vertex colours, registers its windows, and casts shadows by tier', () => {
    const src = readFileSync(new URL('./Hillside.tsx', import.meta.url), 'utf8');
    expect(src).toContain('hillsideData(copy.yours.hillside)');
    expect(src).toContain('vertexColors: true');
    expect(src).toContain('flatShading: true');
    expect(src).toContain('setDynamicWindows(');
    expect(src).toContain('castShadow={shadows}');
    expect(src).not.toMatch(/emissive|AdditiveBlending/);
    expect(src.match(/<mesh\b/g)).toHaveLength(1);
  });

  it('Scene mounts the hillside', () => {
    const scene = readFileSync(new URL('./Scene.tsx', import.meta.url), 'utf8');
    expect(scene).toContain('<Hillside />');
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/gl/hillside.test.ts`
Expected: FAIL: the source-reading tests throw `ENOENT ... Hillside.tsx`; the first test passes already (it exercises Tasks 4.1 and 4.3).

- [ ] **Step 3: Write `src/gl/Hillside.tsx`**

```tsx
'use client';
// The five hillside houses (spec §3.2, §4.7): built once from copy.yours.hillside with the house grammar, merged into one
// static mesh (one draw), seated on PLACES.hill1…hill5. Each house's windows are registered under its own emitter, so
// the ignition chain (§5.3) and the pulse light them through Windows.tsx; this mesh itself never emits.
import { useEffect, useMemo } from 'react';
import { MeshLambertMaterial } from 'three';
import { copy } from '@/site/copy';
import { useTier } from './useTier';
import { hillsideData, toBufferGeometry } from './houseGeometry';
import { setDynamicWindows } from './windowSlots';

function registerHillWindows(windows: ReturnType<typeof hillsideData>['windows']): () => void {
  for (const w of windows) setDynamicWindows(w.emitter, w.quads);
  return () => { for (const w of windows) setDynamicWindows(w.emitter, []); };
}

export function Hillside() {
  const { shadows } = useTier();
  const built = useMemo(() => hillsideData(copy.yours.hillside), []);
  const geometry = useMemo(() => toBufferGeometry(built.mesh), [built]);
  const material = useMemo(() => new MeshLambertMaterial({ vertexColors: true, flatShading: true }), []);
  useEffect(() => registerHillWindows(built.windows), [built]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh geometry={geometry} material={material} castShadow={shadows} receiveShadow={shadows} />;
}
```

- [ ] **Step 4: Mount it in `src/gl/Scene.tsx`**

Add `import { Hillside } from './Hillside';` and render `<Hillside />` directly after `<Buildings />` inside the same parent element.

- [ ] **Step 5: Run it and see it pass**

Run: `npx vitest run src/gl/hillside.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Lint, typecheck, full suite, and a look**

Run: `npm run lint && npx tsc --noEmit && npx vitest run`
Expected: all green.
Then `npm run dev`, open `http://localhost:3000/` at 1440 × 900, wait 6 s: five dark houses stand on the near slope right of centre, between the lot and the camera; their windows catch together just after the bars (about 3.6 s after the canvas fades in) and stay lit. Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add src/gl/Hillside.tsx src/gl/hillside.test.ts src/gl/Scene.tsx
git commit -m "Add the hillside: five houses from the true sentences, one mesh, windows per emitter"
```

**Verify:**
- `npx vitest run src/gl/hillside.test.ts` passes.
- `grep -c "<mesh" src/gl/Hillside.tsx` prints `1` (one draw).
- In the dev build, the hillside windows are dark before the chain reaches them and lit after (they are driven by hill1…hill5, not always on).

---

### Task 4.5: The build clock in `driverCore` **[parallel-safe]**

Spec: §5.5 (`buildStateAt`; the build latches on wall time; "a new sentence replaces the house: the old one's light goes out over 0.2 s, then the new build starts"; the window lights at 4.25 s), §6 (the driver advances the build clock on wall time), §11 (reduced motion: "the house appears built with no scaffolding"), §12 (no allocation in `applyFrame`), §16 ("`buildStateAt` latches at 4.4 s and the window lights at 4.25 s").

**Files:**
- Modify: `src/gl/driverCore.ts`
- Test: `src/gl/driverCore.test.ts` (append a describe block)

**Interfaces:**
- Consumes: `BUILD_SECONDS`, `buildStateAt(t: number): BuildState` (`src/valley/build.ts`); `FrameInputs`, `FrameTargets`, `applyFrame` (index contract, Stage 2); `EMITTERS`.
- Produces (all exported from `src/gl/driverCore.ts`; `FrameInputs`/`FrameTargets`/`applyFrame` signatures unchanged):
  - `export const LIGHT_OUT_SECONDS = 0.2`, `export const WINDOW_LIT_AT = 4.25`
  - `export const BUILD_PHASE: { readonly none: 0; readonly lightOut: 1; readonly building: 2; readonly done: 3 }`, `export type BuildPhase = 0 | 1 | 2 | 3`
  - `export interface BuildClock { start: number | null }` (wall time, seconds, at which the current build's t = 0)
  - `export interface BuildTargets { phase: BuildPhase; cut: number; grow: Float32Array /* 18 */; clock: string }`
  - `export function createBuildTargets(): BuildTargets`
  - `export function startBuild(clock: BuildClock, t: number, hadHouse: boolean, reducedMotion: boolean): void`
  - `export function restoreBuild(clock: BuildClock): void`
  - `export function buildTAt(clock: BuildClock, t: number): number | null`
  - `export function buildPhaseAt(buildT: number | null): BuildPhase`
  - `export function visitorFactor(buildT: number | null): number`
  - `export function applyBuild(buildT: number | null, out: BuildTargets): void`

The meaning of `FrameInputs.buildT` (the index declares it; Stage 2 passed `null`), fixed here: seconds of wall time since the current build's t = 0. `null`: no visitor house exists. Negative, in [−0.2, 0): the old house's light is going out before the new build. [0, 4.4): building. ≥ 4.4 (including `Infinity` for a house restored from storage): built. Because it is wall time minus a fixed start, scrolling never pauses or reverses it (the latch). The visitor emitter's brightness is its ignition/pulse value times `visitorFactor(buildT)`: 0 with no house, fading 1 → 0 over the light-out, 0 while building, ramping 0 → 1 from 4.25 s to 4.4 s (the window "lights at 4.25 s" and is full when the clock reads 4.40), 1 after. A restored house therefore still catches with the hillside at 3.6 s (§4.7). Reduced motion sets the start to −∞ like a restored house (buildT = `Infinity`): no scaffold, no light-out, a cut.

- [ ] **Step 1: Find the `targets.lit` write and the test helper**

Open `src/gl/driverCore.ts` and find where `applyFrame` finishes writing `targets.lit` for every emitter and before it copies `lit` into uniforms or instance attributes. Open `src/gl/driverCore.test.ts` and find the helper that builds a `FrameTargets` (called `makeTargets()` below; if it has another name, use it in the two places below).

- [ ] **Step 2: Append the failing tests to `src/gl/driverCore.test.ts`**

Add these imports at the top of the file (merge with the existing ones; `applyFrame` and `makeTargets` are already in scope from the Stage 2 and 3 tests, so do not import them twice):

```ts
import { BUILD_SECONDS, buildStateAt } from '@/valley/build';
import { SECTIONS, sectionRanges } from '@/valley/sections';
import { EMITTERS } from '@/valley/lights';
import {
  BUILD_PHASE, LIGHT_OUT_SECONDS, WINDOW_LIT_AT, applyBuild, buildPhaseAt, buildTAt, createBuildTargets, restoreBuild,
  startBuild, visitorFactor, type BuildClock, type FrameInputs,
} from './driverCore';
```

Append:

```ts
describe('the build clock (spec §5.5)', () => {
  it('starts at 0 with no house, at −0.2 s when an old house must go dark, already built under reduced motion', () => {
    const c: BuildClock = { start: null };
    expect(buildTAt(c, 10)).toBeNull();
    startBuild(c, 10, false, false);
    expect(buildTAt(c, 10)).toBe(0);
    expect(buildTAt(c, 12.5)).toBeCloseTo(2.5, 9);
    startBuild(c, 20, true, false);
    expect(buildTAt(c, 20)).toBeCloseTo(-LIGHT_OUT_SECONDS, 9);
    startBuild(c, 30, true, true);
    expect(buildTAt(c, 30)).toBe(Infinity);
  });

  it('a restored house is simply built', () => {
    const c: BuildClock = { start: null };
    restoreBuild(c);
    expect(buildTAt(c, 3)).toBe(Infinity);
    expect(buildPhaseAt(buildTAt(c, 3))).toBe(BUILD_PHASE.done);
  });

  it('phases', () => {
    expect(buildPhaseAt(null)).toBe(BUILD_PHASE.none);
    expect(buildPhaseAt(-0.1)).toBe(BUILD_PHASE.lightOut);
    expect(buildPhaseAt(0)).toBe(BUILD_PHASE.building);
    expect(buildPhaseAt(4.39)).toBe(BUILD_PHASE.building);
    expect(buildPhaseAt(4.4)).toBe(BUILD_PHASE.done);
  });

  it('WINDOW_LIT_AT is where buildStateAt says the window lights', () => {
    expect(buildStateAt(WINDOW_LIT_AT).lit).toBe(true);
    expect(buildStateAt(WINDOW_LIT_AT - 0.01).lit).toBe(false);
  });

  it('visitorFactor: dark with no house, old light out over 0.2 s, dark while building, lit from 4.25 s', () => {
    expect(visitorFactor(null)).toBe(0);
    expect(visitorFactor(-0.2)).toBeCloseTo(1, 9);
    expect(visitorFactor(-0.1)).toBeCloseTo(0.5, 9);
    expect(visitorFactor(0)).toBe(0);
    expect(visitorFactor(4.2)).toBe(0);
    expect(visitorFactor(4.325)).toBeCloseTo(0.5, 6);
    expect(visitorFactor(4.4)).toBe(1);
    expect(visitorFactor(Infinity)).toBe(1);
  });

  it('applyBuild mirrors buildStateAt while building and holds the built state after', () => {
    const out = createBuildTargets();
    for (const t of [0.5, 2.0, 3.85]) {
      applyBuild(t, out);
      const s = buildStateAt(t);
      expect(out.phase).toBe(BUILD_PHASE.building);
      expect(out.cut).toBeCloseTo(s.cut, 9);
      expect(out.clock).toBe(s.clock);
      for (const b of s.scaffold) expect(out.grow[b.idx]).toBeCloseTo(b.grow, 6);
    }
    applyBuild(0.5, out);
    expect(Array.from(out.grow).some((g) => g > 0)).toBe(true);
    applyBuild(BUILD_SECONDS, out);
    expect(out.phase).toBe(BUILD_PHASE.done);
    expect(out.cut).toBe(1);
    expect(out.clock).toBe(buildStateAt(BUILD_SECONDS).clock);
    expect(Array.from(out.grow).every((g) => g === 0)).toBe(true);
    applyBuild(-0.1, out);
    expect(out.phase).toBe(BUILD_PHASE.lightOut);
    expect(out.cut).toBe(1);
    applyBuild(null, out);
    expect(out.phase).toBe(BUILD_PHASE.none);
    expect(out.cut).toBe(0);
  });
});

describe('applyFrame: the visitor light follows the build clock, not the scroll', () => {
  const V = EMITTERS.findIndex((e) => e.id === 'visitor');
  const VH = 900;
  const tops: number[] = [];
  let y = 0;
  for (const s of SECTIONS) { tops.push(y); y += (s.heightVh * VH) / 100; }
  const RANGES = sectionRanges(tops, y, VH);
  const inputs = (g: number, buildT: number | null): FrameInputs => ({
    g, ranges: RANGES, t: 50, dt: 1 / 60, introT: 100, buildT, pulseT: null, flickerT: null, reducedMotion: false,
  });

  it('is dark with no house, dark mid-build, half-lit at 4.325 s, fully lit when built, at any scroll position', () => {
    const targets = makeTargets();
    applyFrame(inputs(0.5, Infinity), targets);
    const full = targets.lit[V];
    expect(full).toBeGreaterThan(0.5);
    for (const g of [0.02, 0.5, 0.97]) {
      applyFrame(inputs(g, null), targets);
      expect(targets.lit[V]).toBe(0);
      applyFrame(inputs(g, 2.0), targets);
      expect(targets.lit[V]).toBe(0);
      applyFrame(inputs(g, 4.325), targets);
      expect(targets.lit[V]).toBeCloseTo(full * 0.5, 5);
      applyFrame(inputs(g, -0.1), targets);
      expect(targets.lit[V]).toBeCloseTo(full * 0.5, 5);
      applyFrame(inputs(g, Infinity), targets);
      expect(targets.lit[V]).toBeCloseTo(full, 9);
    }
  });
});
```

- [ ] **Step 3: Run it and see it fail**

Run: `npx vitest run src/gl/driverCore.test.ts`
Expected: FAIL with `does not provide an export named 'BUILD_PHASE'` (or a TypeError naming one of the new exports).

- [ ] **Step 4: Add the build clock to `src/gl/driverCore.ts`**

Add to the imports: `import { BUILD_SECONDS, buildStateAt } from '@/valley/build';` (and `EMITTERS` if the file does not import it yet). Add at module level:

```ts
// ---- The visitor build clock (spec §5.5). buildT = wall seconds since the current build's t = 0; see Task 4.5. ----
export const LIGHT_OUT_SECONDS = 0.2;
export const WINDOW_LIT_AT = 4.25;
const WINDOW_RAMP = BUILD_SECONDS - WINDOW_LIT_AT;   // 0.15 s: the window is full when the clock reads 4.40
const SCAFFOLD_COUNT = 18;
const DONE_CLOCK = buildStateAt(BUILD_SECONDS).clock;
const VISITOR_INDEX = EMITTERS.findIndex((e) => e.id === 'visitor');

export const BUILD_PHASE = { none: 0, lightOut: 1, building: 2, done: 3 } as const;
export type BuildPhase = (typeof BUILD_PHASE)[keyof typeof BUILD_PHASE];

export interface BuildClock { start: number | null }
export interface BuildTargets { phase: BuildPhase; cut: number; grow: Float32Array; clock: string }

export function createBuildTargets(): BuildTargets {
  return { phase: BUILD_PHASE.none, cut: 0, grow: new Float32Array(SCAFFOLD_COUNT), clock: '0.00' };
}

/**
 * A new sentence at wall time t. An existing house goes dark first. Reduced motion (§11) cuts straight to the built
 * house: start = −∞, exactly like a restored house, so no light-out and no scaffold.
 */
export function startBuild(clock: BuildClock, t: number, hadHouse: boolean, reducedMotion: boolean): void {
  clock.start = reducedMotion ? -Infinity : t + (hadHouse ? LIGHT_OUT_SECONDS : 0);
}

/** A house restored from localStorage: built since forever (§4.7 "rebuilt silently at load"). */
export function restoreBuild(clock: BuildClock): void {
  clock.start = -Infinity;
}

export function buildTAt(clock: BuildClock, t: number): number | null {
  return clock.start === null ? null : t - clock.start;
}

export function buildPhaseAt(buildT: number | null): BuildPhase {
  if (buildT === null) return BUILD_PHASE.none;
  if (buildT < 0) return BUILD_PHASE.lightOut;
  if (buildT < BUILD_SECONDS) return BUILD_PHASE.building;
  return BUILD_PHASE.done;
}

/** Multiplier on the visitor emitter's brightness. Pure arithmetic: safe inside applyFrame. */
export function visitorFactor(buildT: number | null): number {
  if (buildT === null) return 0;
  if (buildT < 0) return Math.min(1, -buildT / LIGHT_OUT_SECONDS);
  if (buildT < WINDOW_LIT_AT) return 0;
  return Math.min(1, (buildT - WINDOW_LIT_AT) / WINDOW_RAMP);
}

/**
 * The house's clip, scaffold and clock for this frame. Called by the visitor bridge after applyFrame, not inside it:
 * while building it calls buildStateAt, which allocates its result (only during the 4.4 s build).
 */
export function applyBuild(buildT: number | null, out: BuildTargets): void {
  const phase = buildPhaseAt(buildT);
  out.phase = phase;
  if (phase === BUILD_PHASE.building) {
    const s = buildStateAt(buildT as number);
    out.cut = s.cut;
    out.grow.fill(0);
    for (const b of s.scaffold) out.grow[b.idx] = b.grow;
    out.clock = s.clock;
    return;
  }
  out.grow.fill(0);
  out.cut = phase === BUILD_PHASE.none ? 0 : 1;
  out.clock = phase === BUILD_PHASE.done ? DONE_CLOCK : '0.00';
}
```

Then, inside `applyFrame`, at the point Step 1 found (after every `targets.lit[i]` is written, before anything reads `targets.lit`), add:

```ts
  targets.lit[VISITOR_INDEX] *= visitorFactor(inputs.buildT);
```

If `driverCore.ts` already declares a `VISITOR_INDEX` (Stage 2 or 3), delete the new `const VISITOR_INDEX` line and use the existing one.

- [ ] **Step 5: Run it and see it pass**

Run: `npx vitest run src/gl/driverCore.test.ts`
Expected: PASS, including Stage 2/3's existing tests and the zero-allocation test (the new line in `applyFrame` allocates nothing).

- [ ] **Step 6: Lint, typecheck, full suite**

Run: `npm run lint && npx tsc --noEmit && npx vitest run`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/gl/driverCore.ts src/gl/driverCore.test.ts
git commit -m "Add the visitor build clock to driverCore: wall-time latch, light-out, window at 4.25 s"
```

**Verify:**
- `npx vitest run src/gl/driverCore.test.ts` passes, and its existing zero-allocation test still passes.
- `grep -n "visitorFactor(inputs.buildT)" src/gl/driverCore.ts` shows exactly one line, inside `applyFrame`, before the code that copies `lit` out.
- `grep -n "buildStateAt" src/gl/driverCore.ts` shows it only in `applyBuild` and the `DONE_CLOCK` constant, never inside `applyFrame`.

---
### Task 4.6: The visitor bridge: sentence → house → clock → scene and DOM

Spec: §5.5 (one build at a time on wall time; a new sentence replaces the house after a 0.2 s light-out; the window lights at 4.25 s; `clock` formatted `0.00`), §3.1 · 07 (clock `{t} / 4.40` during the build, tag after it with the real counts), §4.7 (a stored sentence is rebuilt silently at load and lights with the hillside), §6 (one `useFrame`: the driver advances the build clock and writes the clip plane and scaffold `aGrow`; the visitor point light is Stage 2's `POINT_LIGHTS` entry, which `syncScene` drives from `lit[visitor]`; nothing else reads time), §11 (reduced motion builds at once), §14 G5 (stills at fixed build times).

This module is the only place the build's state lives. It is plain TypeScript with structural types so Node tests drive it with fakes; `VisitorHouse.tsx`, `Scaffold.tsx`, `Yours.tsx` and `Driver.tsx` (Task 4.7, 4.8) only plug objects into it.

Decisions where the spec is silent (listed in the stage doubts): a sentence submitted while a build is running is queued (latest wins) and starts with its light-out when the running build reaches 4.4 s, so a build is never cut short; the visitor's windows are registered when the cut completes (3.6 s), so dark quads never float above the half-built walls; a restored house prints its tag too (it is a house that exists, with real counts); the bridge owns no light: the visitor point light is Stage 2's `POINT_LIGHTS` entry `{ id: 'visitor', place: 'lot', … }` (Task 2.2), mounted by `SceneLights` and driven by `syncScene` from `lit[visitor]`, so the scene keeps exactly the four point lights of §6; `?visitor=<sentence>&buildT=<seconds>` pins the build at that time for the G5 stills and never touches storage.

**Files:**
- Create: `src/gl/visitorBridge.ts`
- Test: `src/gl/visitorBridge.test.ts`

**Interfaces:**
- Consumes: `houseFromSentence` (`src/valley/house.ts`); `PLACES` (`src/valley/layout.ts`); `BUILD_SECONDS` (`src/valley/build.ts`); `houseMeshData`, `clipConstant`, `HouseMeshData` (Task 4.1); `setDynamicWindows` (Task 4.3); `cleanSentence`, `countWords`, `yoursDom` (Task 4.2); `copy.yours.clock`, `copy.yours.tag` (Task 4.2); `BUILD_PHASE`, `BuildClock`, `applyBuild`, `buildTAt`, `createBuildTargets`, `restoreBuild`, `startBuild` (Task 4.5).
- Produces:
  - `export const WINDOWS_AT = 3.6`
  - `export interface VisitorSceneHooks { swap(data: HouseMeshData | null): void; setBuilding(building: boolean): void }`
  - `export interface GrowTarget { array: Float32Array; needsUpdate: boolean }`
  - `export interface Built { sentence: string; house: House; data: HouseMeshData }`
  - `export class VisitorBridge` with fields `hooks: VisitorSceneHooks | null`, `plane: { constant: number }`, `grow: GrowTarget | null`, `readonly clock: BuildClock`, `readonly targets: BuildTargets`, `current: Built | null`, and methods `request(sentence: string): void`, `restore(sentence: string): void`, `pin(sentence: string, t: number): void`, `beforeFrame(t: number, reducedMotion: boolean): number | null`, `afterFrame(buildT: number | null): void`, `detach(): void`
  - `export const visitorBridge: VisitorBridge` (the app's one instance)
  - `export function buildPinFromSearch(search: string): { sentence: string; t: number } | null`

- [ ] **Step 1: Write the failing test `src/gl/visitorBridge.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { copy } from '@/site/copy';
import { countWords, yoursDom } from '@/site/visitorSentence';
import { houseFromSentence } from '@/valley/house';
import type { HouseMeshData } from './houseGeometry';
import { bindWindowBuffers, dynamicWindowCount, resetWindowSlots } from './windowSlots';
import { VisitorBridge, buildPinFromSearch } from './visitorBridge';

const S1 = 'a bot that books my dentist appointments';
const S2 = 'a tiny tool that tells my roommates when the washing machine is done so nobody leaves wet clothes in it';

function rig(withHooks = true) {
  const b = new VisitorBridge();
  const swaps: (HouseMeshData | null)[] = [];
  const building: boolean[] = [];
  const hooks = { swap: (d: HouseMeshData | null) => { swaps.push(d); }, setBuilding: (on: boolean) => { building.push(on); } };
  if (withHooks) b.hooks = hooks;
  b.plane = { constant: 0 };
  b.grow = { array: new Float32Array(18), needsUpdate: false };
  yoursDom.clock = { textContent: '' };
  yoursDom.tag = { textContent: '' };
  return { b, swaps, building, hooks };
}
function frame(b: VisitorBridge, t: number, reducedMotion = false): number | null {
  const bt = b.beforeFrame(t, reducedMotion);
  b.afterFrame(bt);
  return bt;
}
const tagFor = (s: string) => copy.yours.tag(countWords(s), houseFromSentence(s).parts.length);

beforeEach(() => {
  resetWindowSlots();
  bindWindowBuffers({ capacity: 512, staticCount: 0, write: () => {}, setCount: () => {} });
});

describe('VisitorBridge', () => {
  it('a first sentence builds on wall time: scaffold, cut, windows at 3.6 s, tag at 4.4 s', () => {
    const { b, swaps, building } = rig();
    expect(frame(b, 9)).toBeNull();
    b.request(S1);
    expect(frame(b, 10)).toBe(0);
    expect(swaps).toHaveLength(1);
    expect(swaps[0]!.partCount).toBe(houseFromSentence(S1).parts.length);
    expect(building).toEqual([true]);
    expect(yoursDom.clock!.textContent).toBe(copy.yours.clock('0.00'));

    frame(b, 12);
    const d = swaps[0]!;
    expect(b.plane.constant).toBeGreaterThan(d.min[1]);
    expect(b.plane.constant).toBeLessThan(d.max[1]);
    expect(Array.from(b.grow!.array).some((g) => g > 0)).toBe(true);
    expect(b.grow!.needsUpdate).toBe(true);
    expect(yoursDom.clock!.textContent).toBe(copy.yours.clock('2.00'));
    expect(dynamicWindowCount('visitor')).toBe(0);

    frame(b, 13.65);
    expect(dynamicWindowCount('visitor')).toBe(houseFromSentence(S1).windows.length);

    frame(b, 14.5);
    expect(building).toEqual([true, false]);
    expect(yoursDom.clock!.textContent).toBe('');
    expect(yoursDom.tag!.textContent).toBe(tagFor(S1));
    expect(b.plane.constant).toBeGreaterThan(d.max[1]);
    expect('light' in b).toBe(false); // the visitor light is Stage 2's POINT_LIGHTS entry, not the bridge's
  });

  it('the same sentence builds the same house twice (spec §14 G5)', () => {
    const a = rig();
    a.b.request(S1);
    frame(a.b, 1);
    const b = rig();
    b.b.request(S1);
    frame(b.b, 50);
    expect(b.swaps[0]!.positions).toEqual(a.swaps[0]!.positions);
  });

  it('a new sentence: the old house stays up for 0.2 s while its light goes out, then the new build starts', () => {
    const { b, swaps } = rig();
    b.request(S1);
    frame(b, 10);
    frame(b, 15);
    b.request(S2);
    expect(frame(b, 20)).toBeCloseTo(-0.2, 9);
    expect(swaps).toHaveLength(1);
    expect(b.plane.constant).toBeGreaterThan(swaps[0]!.max[1]);
    frame(b, 20.1);
    expect(swaps).toHaveLength(1);
    expect(frame(b, 20.21)).toBeCloseTo(0.01, 9);
    expect(swaps).toHaveLength(2);
    expect(swaps[1]!.partCount).toBe(houseFromSentence(S2).parts.length);
    expect(yoursDom.tag!.textContent).toBe('');
    expect(dynamicWindowCount('visitor')).toBe(0);
  });

  it('a sentence sent mid-build waits; the running build finishes; the latest queued sentence wins', () => {
    const { b, swaps, building } = rig();
    b.request(S1);
    frame(b, 10);
    frame(b, 11);
    b.request('an earlier idea');
    b.request(S2);
    frame(b, 12);
    frame(b, 14.3);
    expect(swaps).toHaveLength(1);
    expect(frame(b, 14.4)).toBeCloseTo(-0.2, 9);
    expect(building).toEqual([true, false]);
    frame(b, 14.61);
    expect(swaps).toHaveLength(2);
    expect(swaps[1]!.partCount).toBe(houseFromSentence(S2).parts.length);
  });

  it('a stored sentence is rebuilt silently: no scaffold, windows and tag at once', () => {
    const { b, swaps, building } = rig();
    b.restore(S1);
    expect(frame(b, 0.5)).toBe(Infinity);
    expect(swaps).toHaveLength(1);
    expect(building).toEqual([]);
    expect(dynamicWindowCount('visitor')).toBe(houseFromSentence(S1).windows.length);
    expect(yoursDom.tag!.textContent).toBe(tagFor(S1));
  });

  it('reduced motion: the house appears built, no scaffolding (spec §11)', () => {
    const { b, swaps, building } = rig();
    b.request(S1);
    expect(frame(b, 10, true)).toBe(Infinity);
    expect(swaps).toHaveLength(1);
    expect(building).toEqual([]);
    expect(yoursDom.tag!.textContent).toBe(tagFor(S1));
  });

  it('waits for the scene: nothing swaps until VisitorHouse has plugged its hooks in', () => {
    const { b, swaps, hooks } = rig(false);
    b.request(S1);
    frame(b, 10);
    expect(swaps).toHaveLength(0);
    b.hooks = hooks;
    expect(frame(b, 10.5)).toBeCloseTo(0.5, 9);
    expect(swaps).toHaveLength(1);
  });

  it('detach and re-attach (canvas remount) puts the same house back', () => {
    const { b, swaps, hooks } = rig();
    b.request(S1);
    frame(b, 10);
    frame(b, 15);
    b.detach();
    expect(b.hooks).toBeNull();
    expect(dynamicWindowCount('visitor')).toBe(0);
    b.hooks = hooks;
    frame(b, 16);
    expect(swaps).toHaveLength(2);
    expect(swaps[1]!.positions).toEqual(swaps[0]!.positions);
    expect(dynamicWindowCount('visitor')).toBe(houseFromSentence(S1).windows.length);
  });

  it('a pinned build holds its time whatever the clock says (G5 stills)', () => {
    const { b, swaps, building } = rig();
    b.pin(S1, 2);
    expect(frame(b, 0)).toBe(2);
    expect(frame(b, 100)).toBe(2);
    expect(swaps).toHaveLength(1);
    expect(building).toEqual([true]);
    expect(yoursDom.clock!.textContent).toBe(copy.yours.clock('2.00'));
  });

  it('writes nothing to a missing DOM and throws nothing', () => {
    const { b } = rig();
    yoursDom.clock = null;
    yoursDom.tag = null;
    b.request(S1);
    expect(() => { frame(b, 1); frame(b, 3); frame(b, 6); }).not.toThrow();
  });
});

describe('buildPinFromSearch', () => {
  it('reads ?visitor= and ?buildT=, cleans the sentence, clamps the time', () => {
    expect(buildPinFromSearch('?visitor=a%20bot&buildT=2')).toEqual({ sentence: 'a bot', t: 2 });
    expect(buildPinFromSearch('?visitor=a+bot&buildT=9')).toEqual({ sentence: 'a bot', t: 4.4 });
    expect(buildPinFromSearch('?visitor=a&buildT=-1')).toEqual({ sentence: 'a', t: 0 });
    expect(buildPinFromSearch('?visitor=a&buildT=soon')).toBeNull();
    expect(buildPinFromSearch('?visitor=%20%20&buildT=1')).toBeNull();
    expect(buildPinFromSearch('?buildT=1')).toBeNull();
    expect(buildPinFromSearch('')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/gl/visitorBridge.test.ts`
Expected: FAIL with `Failed to resolve import "./visitorBridge"`.

- [ ] **Step 3: Write `src/gl/visitorBridge.ts`**

```ts
// The visitor's house, end to end (spec §5.5, §3.1 · 07, §4.7, §11). Yours.tsx announces a sentence; VisitorHouse.tsx
// forwards it here and plugs in its mesh hooks and clip plane; Scaffold.tsx plugs in its aGrow attribute;
// Driver.tsx calls beforeFrame (→ FrameInputs.buildT) and afterFrame around applyFrame. One build runs at a time, on
// wall time, so scroll never pauses or reverses it. Structural types keep it testable in Node with fakes.
import type { House } from '@/valley/types';
import { houseFromSentence } from '@/valley/house';
import { PLACES } from '@/valley/layout';
import { BUILD_SECONDS } from '@/valley/build';
import { copy } from '@/site/copy';
import { cleanSentence, countWords, yoursDom } from '@/site/visitorSentence';
import {
  BUILD_PHASE, applyBuild, buildTAt, createBuildTargets, restoreBuild, startBuild,
  type BuildClock, type BuildTargets,
} from './driverCore';
import { clipConstant, houseMeshData, type HouseMeshData } from './houseGeometry';
import { setDynamicWindows } from './windowSlots';

export const WINDOWS_AT = 3.6;             // §5.5: the cut completes at 3.6 s; the windows go in with the last wall
const HIDDEN = -1e6;                       // plane constant that clips everything

export interface VisitorSceneHooks { swap(data: HouseMeshData | null): void; setBuilding(building: boolean): void }
export interface GrowTarget { array: Float32Array; needsUpdate: boolean }
export interface Built { sentence: string; house: House; data: HouseMeshData }

export class VisitorBridge {
  hooks: VisitorSceneHooks | null = null;
  plane: { constant: number } = { constant: HIDDEN };
  grow: GrowTarget | null = null;
  readonly clock: BuildClock = { start: null };
  readonly targets: BuildTargets = createBuildTargets();
  current: Built | null = null;
  private pending: Built | null = null;
  private queued: string | null = null;
  private restoring: string | null = null;
  private pinned: { sentence: string; t: number } | null = null;
  private building = false;
  private windowsShown = false;
  private tagWritten = false;
  private lastClock = '';

  /** A submitted sentence. Starts on the next frame, or when the running build reaches 4.4 s. Latest wins. */
  request(sentence: string): void { this.queued = sentence; }
  /** The sentence found in localStorage at load: built at once, no animation (§4.7). */
  restore(sentence: string): void { this.restoring = sentence; }
  /** Gate stills: hold the build of `sentence` at t seconds. */
  pin(sentence: string, t: number): void { this.pinned = { sentence, t }; }

  private make(sentence: string): Built {
    const house = houseFromSentence(sentence);
    return { sentence, house, data: houseMeshData(house, PLACES.lot[0], PLACES.lot[2]) };
  }

  /** Before applyFrame: start queued builds, swap houses, register windows. Returns FrameInputs.buildT. */
  beforeFrame(t: number, reducedMotion: boolean): number | null {
    if (this.pinned) {
      if (!this.current && !this.pending) this.pending = this.make(this.pinned.sentence);
      this.advance(this.pinned.t);
      return this.pinned.t;
    }
    const running = buildTAt(this.clock, t);
    const busy = running !== null && running < BUILD_SECONDS;
    if (this.queued !== null && !busy) {
      const hadHouse = this.current !== null;
      this.pending = this.make(this.queued);
      this.queued = null;
      this.restoring = null;
      startBuild(this.clock, t, hadHouse, reducedMotion);
    } else if (this.restoring !== null && this.clock.start === null) {
      this.pending = this.make(this.restoring);
      this.restoring = null;
      restoreBuild(this.clock);
    }
    const bt = buildTAt(this.clock, t);
    this.advance(bt);
    return bt;
  }

  private advance(bt: number | null): void {
    if (bt === null || !this.hooks) return;
    if (this.pending && bt >= 0) {
      this.current = this.pending;
      this.pending = null;
      this.hooks.swap(this.current.data);
      setDynamicWindows('visitor', []);
      this.windowsShown = false;
      this.tagWritten = false;
      this.lastClock = '';
      if (yoursDom.tag) yoursDom.tag.textContent = '';
    }
    const cur = this.current;
    if (!cur) return;
    const wantBuilding = bt >= 0 && bt < BUILD_SECONDS;
    if (wantBuilding !== this.building) {
      this.building = wantBuilding;
      this.hooks.setBuilding(wantBuilding);
    }
    if (!this.windowsShown && bt >= WINDOWS_AT) {
      setDynamicWindows('visitor', cur.data.windows);
      this.windowsShown = true;
    }
  }

  /** After applyFrame: clip plane, scaffold growth, and the clock/tag lines in Yours. The visitor point light is
   *  Stage 2's POINT_LIGHTS entry, driven by syncScene from lit[visitor]; the bridge owns no light. */
  afterFrame(buildT: number | null): void {
    const out = this.targets;
    applyBuild(buildT, out);
    const cur = this.current;
    this.plane.constant = cur ? clipConstant(cur.data.min[1], cur.data.max[1], out.cut) : HIDDEN;
    if (this.grow) {
      this.grow.array.set(out.grow);
      this.grow.needsUpdate = true;
    }
    if (!cur) return;
    if (out.phase === BUILD_PHASE.building) {
      if (out.clock !== this.lastClock && yoursDom.clock) {
        yoursDom.clock.textContent = copy.yours.clock(out.clock);
        this.lastClock = out.clock;
      }
    } else if (out.phase === BUILD_PHASE.done && !this.tagWritten && yoursDom.tag) {
      if (yoursDom.clock) yoursDom.clock.textContent = '';
      yoursDom.tag.textContent = copy.yours.tag(countWords(cur.sentence), cur.house.parts.length);
      this.tagWritten = true;
    }
  }

  /** VisitorHouse unmounted (canvas lost or remounted): keep the house so the next mount puts it back. */
  detach(): void {
    if (this.current && !this.pending) this.pending = this.current;
    this.current = null;
    this.hooks = null;
    this.grow = null;
    this.plane = { constant: HIDDEN };
    this.building = false;
    this.windowsShown = false;
    setDynamicWindows('visitor', []);
  }
}

export const visitorBridge = new VisitorBridge();

/** `?visitor=<sentence>&buildT=<seconds>`: hold a build for the G5 stills. Never stored. */
export function buildPinFromSearch(search: string): { sentence: string; t: number } | null {
  const q = new URLSearchParams(search);
  const raw = q.get('visitor');
  const tRaw = q.get('buildT');
  if (raw === null || tRaw === null) return null;
  const sentence = cleanSentence(raw);
  const t = Number(tRaw);
  if (sentence === null || !Number.isFinite(t)) return null;
  return { sentence, t: Math.min(BUILD_SECONDS, Math.max(0, t)) };
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run src/gl/visitorBridge.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Lint, typecheck, full suite**

Run: `npm run lint && npx tsc --noEmit && npx vitest run`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/gl/visitorBridge.ts src/gl/visitorBridge.test.ts
git commit -m "Add the visitor bridge: queued builds, light-out swap, windows, clock and tag"
```

**Verify:**
- `npx vitest run src/gl/visitorBridge.test.ts` passes.
- `grep -n "localStorage\|innerHTML\|fetch(" src/gl/visitorBridge.ts` prints nothing (the sentence only reaches the grammar and `textContent`; the pin is never stored).
- Read `beforeFrame`: the build time comes only from `t` and `clock.start` (wall time), never from `g`.

---
### Task 4.7: `VisitorHouse`, `Scaffold` and the driver hook-up

Spec: §6 ("`VisitorHouse.tsx`: one mesh rebuilt on a new sentence, clipped during the build with `material.clippingPlanes = [plane]`, `clipShadows: true`, `side: DoubleSide` while building. `Scaffold.tsx`: 18 instanced bars with `aGrow`, mounted only during a build"; `gl.localClippingEnabled`; one `useFrame`; shadow casters. The visitor point light is Stage 2's `POINT_LIGHTS` entry and is not mounted here), §4.7 (the lot, the stored sentence rebuilt at load), §12 (≤ 18 main-pass draws on desktop at rest, +1 scaffold during a build).

**Files:**
- Create: `src/gl/VisitorHouse.tsx`, `src/gl/Scaffold.tsx`
- Test: `src/gl/visitorWiring.test.ts`
- Modify: `src/gl/Driver.tsx` (three lines around `applyFrame`), `src/gl/Scene.tsx` (mount `<VisitorHouse />`)

**Interfaces:**
- Consumes: `visitorBridge`, `buildPinFromSearch`, `type GrowTarget` (Task 4.6); `toBufferGeometry`, `scaffoldBars`, `HOUSE_ROOF`, `SCAFFOLD_BARS`, `SCAFFOLD_THICKNESS`, `type HouseMeshData` (Task 4.1); `getVisitorSnapshot`, `onVisitorSentence` (Task 4.2); `useTier()`.
- Produces: `export function VisitorHouse(): JSX.Element`, `export function Scaffold(): JSX.Element`. Driver now passes a real `buildT` into `FrameInputs`.

All mutation of three objects happens in plain module functions called from effects (`attachVisitorHouse`, `attachScaffold`), the pattern the repo already uses to keep `eslint-plugin-react-hooks` 7's compiler rules quiet. The clip plane stays in `clippingPlanes` for the material's whole life (its constant moves; at rest it sits above the roof), so the program never recompiles for clipping; only the `side` flip sets `needsUpdate`, twice per build.

- [ ] **Step 1: Write the failing test `src/gl/visitorWiring.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = (p: string) => readFileSync(new URL(`./${p}`, import.meta.url), 'utf8');

describe('visitor house wiring (spec §6)', () => {
  it('VisitorHouse clips with shadows, enables local clipping, is DoubleSide only while building, mounts no light', () => {
    const s = src('VisitorHouse.tsx');
    for (const token of [
      'clippingPlanes: [plane]', 'clipShadows: true', 'localClippingEnabled = true', 'DoubleSide', 'FrontSide',
      'visitorBridge.detach()', 'castShadow={shadows}', '{building && <Scaffold />}',
      'buildPinFromSearch(', 'getVisitorSnapshot()', 'onVisitorSentence(',
    ]) expect(s, token).toContain(token);
    expect(s).not.toMatch(/emissive|AdditiveBlending|pointLight|PointLight/);
  });

  it('Scaffold is 18 instanced bars grown by aGrow, no shadow, no light', () => {
    const s = src('Scaffold.tsx');
    for (const token of ['InstancedMesh', "'aGrow'", 'SCAFFOLD_BARS', 'transformed.y *= aGrow', 'visitorBridge.grow']) {
      expect(s, token).toContain(token);
    }
    expect(s).not.toMatch(/castShadow|emissive|AdditiveBlending/);
  });

  it('Driver runs the build clock around the one applyFrame call', () => {
    const s = src('Driver.tsx');
    const before = s.indexOf('visitorBridge.beforeFrame(');
    const apply = s.indexOf('applyFrame(');
    const after = s.indexOf('visitorBridge.afterFrame(');
    expect(before).toBeGreaterThan(-1);
    expect(apply).toBeGreaterThan(before);
    expect(after).toBeGreaterThan(apply);
    expect(s.match(/useFrame\(/g)).toHaveLength(1);
  });

  it('Scene mounts the hillside and the visitor house; nothing else in src/gl calls useFrame', () => {
    expect(src('Scene.tsx')).toContain('<VisitorHouse />');
    for (const f of ['Hillside.tsx', 'VisitorHouse.tsx', 'Scaffold.tsx']) expect(src(f)).not.toContain('useFrame');
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/gl/visitorWiring.test.ts`
Expected: FAIL with `ENOENT: no such file or directory, open '.../src/gl/VisitorHouse.tsx'`.

- [ ] **Step 3: Write `src/gl/Scaffold.tsx`**

```tsx
'use client';
// The only construction on the page (spec §5.5, §6): 18 timber bars around the visitor's house, each grown by its own
// aGrow (0..1) from buildStateAt's stagger. Mounted by VisitorHouse only while a build runs, so it is one extra draw
// for 4.4 s and none at rest. Not a shadow caster and not a light.
import { useEffect, useMemo } from 'react';
import { BoxGeometry, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshLambertMaterial } from 'three';
import { HOUSE_ROOF, SCAFFOLD_BARS, SCAFFOLD_THICKNESS, scaffoldBars } from './houseGeometry';
import { visitorBridge, type GrowTarget } from './visitorBridge';

function createScaffold(): InstancedMesh {
  const cur = visitorBridge.current;
  const bars = cur ? scaffoldBars(cur.data.min, cur.data.max) : [];
  const geometry = new BoxGeometry(SCAFFOLD_THICKNESS, 1, SCAFFOLD_THICKNESS);
  geometry.translate(0, 0.5, 0);   // base at y = 0, so scaling y by aGrow grows the bar up from the ground
  geometry.setAttribute('aGrow', new InstancedBufferAttribute(new Float32Array(SCAFFOLD_BARS), 1));
  const material = new MeshLambertMaterial({ color: HOUSE_ROOF, flatShading: true });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aGrow;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y *= aGrow;');
  };
  const mesh = new InstancedMesh(geometry, material, SCAFFOLD_BARS);
  const m = new Matrix4();
  bars.forEach((b, i) => mesh.setMatrixAt(i, m.makeScale(1, b.h, 1).setPosition(b.x, b.y, b.z)));
  mesh.count = bars.length;
  mesh.frustumCulled = false;
  return mesh;
}

function attachScaffold(mesh: InstancedMesh): () => void {
  visitorBridge.grow = mesh.geometry.getAttribute('aGrow') as unknown as GrowTarget;
  return () => {
    visitorBridge.grow = null;
    mesh.geometry.dispose();
    (mesh.material as MeshLambertMaterial).dispose();
    mesh.dispose();
  };
}

export function Scaffold() {
  const mesh = useMemo(() => createScaffold(), []);
  useEffect(() => attachScaffold(mesh), [mesh]);
  return <primitive object={mesh} />;
}
```

- [ ] **Step 4: Write `src/gl/VisitorHouse.tsx`**

```tsx
'use client';
// The visitor's house on the lot (spec §4.7, §5.5, §6). One mesh whose geometry the bridge swaps when a new build
// starts; clipped from the ground up by one plane during the build (clipShadows so its shadow rises with it), drawn
// DoubleSide while open so the inside of the cut walls is not see-through, FrontSide at rest. The visitor point light
// is Stage 2's POINT_LIGHTS entry (driven by syncScene from lit[visitor]), so none is mounted here. The bridge (src/gl/visitorBridge.ts) owns all timing; this file only plugs in.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { BufferGeometry, DoubleSide, FrontSide, MeshLambertMaterial, Plane, Vector3, type Mesh, type WebGLRenderer } from 'three';
import { getVisitorSnapshot, onVisitorSentence } from '@/site/visitorSentence';
import { useTier } from './useTier';
import { toBufferGeometry, type HouseMeshData } from './houseGeometry';
import { buildPinFromSearch, visitorBridge } from './visitorBridge';
import { Scaffold } from './Scaffold';

function enableLocalClipping(gl: WebGLRenderer): void {
  gl.localClippingEnabled = true;
}

function attachVisitorHouse(
  mesh: Mesh, material: MeshLambertMaterial, plane: Plane, setBuilding: (on: boolean) => void,
): () => void {
  visitorBridge.plane = plane;
  visitorBridge.hooks = {
    swap(data: HouseMeshData | null) {
      const old = mesh.geometry;
      mesh.geometry = data ? toBufferGeometry(data) : new BufferGeometry();
      old.dispose();
    },
    setBuilding(on: boolean) {
      material.side = on ? DoubleSide : FrontSide;
      material.needsUpdate = true;
      setBuilding(on);
    },
  };
  return () => {
    visitorBridge.detach();
    mesh.geometry.dispose();
  };
}

/** Pinned (gate stills) > stored sentence > nothing; then every announced sentence becomes a build request. */
function feedVisitorBridge(): () => void {
  const pin = buildPinFromSearch(window.location.search);
  if (pin) {
    visitorBridge.pin(pin.sentence, pin.t);
    return () => {};
  }
  const stored = getVisitorSnapshot();
  if (stored) visitorBridge.restore(stored);
  return onVisitorSentence((s) => visitorBridge.request(s));
}

export function VisitorHouse() {
  const gl = useThree((s) => s.gl);
  const { shadows } = useTier();
  const mesh = useRef<Mesh>(null);
  const [building, setBuilding] = useState(false);
  const plane = useMemo(() => new Plane(new Vector3(0, -1, 0), -1e6), []);
  const material = useMemo(
    () => new MeshLambertMaterial({ vertexColors: true, flatShading: true, clippingPlanes: [plane], clipShadows: true, side: FrontSide }),
    [plane],
  );

  useEffect(() => enableLocalClipping(gl), [gl]);
  useEffect(() => {
    if (!mesh.current) return;
    return attachVisitorHouse(mesh.current, material, plane, setBuilding);
  }, [material, plane]);
  useEffect(() => feedVisitorBridge(), []);
  useEffect(() => () => material.dispose(), [material]);

  return (
    <group>
      <mesh ref={mesh} material={material} castShadow={shadows} receiveShadow={shadows} />
      {building && <Scaffold />}
    </group>
  );
}
```

Notes for the implementer: `<mesh>` with no geometry gets an empty `BufferGeometry` from R3F, so before the first swap it draws nothing. `clipShadows: true` makes three clip the shadow-map depth pass with the same plane (§6). The visitor point light is not mounted here: it is the fourth of §6's four point lights, Stage 2's `POINT_LIGHTS` entry `visitor` at `PLACES.lot`, which `SceneLights` mounts and `syncScene` drives from `lit[visitor]`. Mounting a second one would give the scene five point lights and recompile every lit shader.

- [ ] **Step 5: Hook the driver**

In `src/gl/Driver.tsx`, add `import { visitorBridge } from './visitorBridge';` and change the body of the one `useFrame` so the `applyFrame` call is wrapped like this (`t` is the same wall-clock seconds value the Driver already writes into `inputs.t`; `reducedMotion` is the same value it writes into `inputs.reducedMotion`; `inputs` and `targets` are the Driver's existing preallocated objects):

```ts
    inputs.buildT = visitorBridge.beforeFrame(t, reducedMotion);
    applyFrame(inputs, targets);
    visitorBridge.afterFrame(inputs.buildT);
```

Delete whatever line previously set `inputs.buildT = null` each frame.

- [ ] **Step 6: Mount it in `src/gl/Scene.tsx`**

Add `import { VisitorHouse } from './VisitorHouse';` and render `<VisitorHouse />` directly after `<Hillside />`.

- [ ] **Step 7: Run the tests and see them pass**

Run: `npx vitest run src/gl/visitorWiring.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 8: Lint, typecheck, full suite**

Run: `npm run lint && npx tsc --noEmit && npx vitest run`
Expected: all green (including Stage 2's emissive/`AdditiveBlending` grep test and Driver's zero-allocation test).

- [ ] **Step 9: A manual build in dev**

Run `npm run dev` and open `http://localhost:3000/?visitor=a%20bot%20that%20books%20my%20dentist%20appointments&buildT=2` at 1440 × 900. Scroll to the yours section (run `window.scrollTo(0, document.getElementById('yours').offsetTop)` in the console). Expected: on the lot (right of centre, low, in front of the hillside) a half-built house is cut horizontally about 60% of the way up, with 18 thin bars around it; the cut walls show their inner faces, not the sky through them. Then open `http://localhost:3000/` (no query), type a sentence in the yours input, press Enter (Task 4.8 wires the input; until then, run `window.dispatchEvent(new CustomEvent('ortg:visitor-sentence', { detail: 'a bot that books my dentist appointments' }))` in the console): the bars rise, the cut rises, the bars retract, the window and the visitor point light (Stage 2's, following `lit[visitor]`) come on at about 4.3 s. Stop the dev server.

- [ ] **Step 10: Commit**

```bash
git add src/gl/VisitorHouse.tsx src/gl/Scaffold.tsx src/gl/visitorWiring.test.ts src/gl/Driver.tsx src/gl/Scene.tsx
git commit -m "Add the visitor house and scaffold; drive the build clock from the one useFrame"
```

**Verify:**
- `npx vitest run src/gl/visitorWiring.test.ts` passes.
- `grep -rn "useFrame(" src/gl/ | grep -v test` prints only `Driver.tsx`.
- In dev at `?visitor=...&buildT=0.5`, `2`, `3.85`, `4.4`: scaffolding rising; cut part-way; bars retracting; window lit and no bars.
- Read `VisitorHouse.tsx`: `{building && <Scaffold />}` is the only place `Scaffold` is rendered, so the scaffold draw exists only between the bridge's `setBuilding(true)` and `setBuilding(false)`.

---
### Task 4.8: Wire the Yours section **[parallel-safe]**

Spec: §3.1 · 07 (h2, body, placeholder `something you'd build`, button `build`, max 140 characters, clock during the build, tag after it, hint `it stays in this browser. nothing is sent anywhere.`), §3 (07 has no scrubbed or arrival trigger; "the build is triggered by Enter"), §11 (phone: "the input blurs on Enter and the view reframes so the lot sits above the keyboard"; storage blocked: no persistence, no errors). Index Review Focus 1 and 4.

Decisions where the spec is silent: Enter and the button both submit the one `<form>`; a blank submission does nothing (no build, no storage write); the input is prefilled with a stored sentence on load; "reframe" is `scrollTo('yours')` after the blur (the section top comes to the viewport top, and section 07's portrait yaw, +3, already turns the view to the lot).

**Files:**
- Create: `src/site/yoursSubmit.ts`
- Test: `src/site/yoursSubmit.test.ts`
- Modify: `src/site/sections/Yours.tsx`

**Interfaces:**
- Consumes: `cleanSentence`, `saveVisitorSentence`, `announceVisitorSentence`, `loadVisitorSentence`, `VISITOR_MAX`, `yoursDom` (Task 4.2); `copy.yours.*` (Task 4.2); `useScroll(): { tier, scrollTo }` (`src/scroll/ScrollProvider.tsx`); `SECTIONS` (`src/valley/sections.ts`); `type Tier`.
- Produces:
  - `export interface YoursInput { value: string; blur(): void }`
  - `export interface YoursDeps { save(s: string): boolean; announce(s: string): void }`
  - `export function submitYours(input: YoursInput, tier: Tier, scrollTo: (id: string) => void, deps?: YoursDeps): string | null`
  - DOM ids: `#yours-input`, `#yours-clock`, `#yours-tag` (the G5 gate reads `#yours-tag`).

- [ ] **Step 1: Write the failing test `src/site/yoursSubmit.test.ts`**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { houseFromSentence } from '@/valley/house';
import { submitYours, type YoursDeps } from './yoursSubmit';
import { VISITOR_MAX } from './visitorSentence';

function input(value: string) {
  return { value, blur: vi.fn() };
}
function deps(saveOk = true) {
  const d = { save: vi.fn(() => saveOk), announce: vi.fn() };
  return d as typeof d & YoursDeps;
}

afterEach(() => vi.unstubAllGlobals());

describe('submitYours', () => {
  it('Enter on a sentence: trimmed, saved, announced; the input keeps what was typed', () => {
    const i = input('  a bot that books my dentist appointments  ');
    const d = deps();
    expect(submitYours(i, 'desktop', vi.fn(), d)).toBe('a bot that books my dentist appointments');
    expect(d.save).toHaveBeenCalledWith('a bot that books my dentist appointments');
    expect(d.announce).toHaveBeenCalledWith('a bot that books my dentist appointments');
    expect(i.value).toBe('  a bot that books my dentist appointments  ');
  });

  it('blank or whitespace builds nothing and stores nothing (Review Focus 1)', () => {
    for (const v of ['', '   ', '\t\n']) {
      const d = deps();
      expect(submitYours(input(v), 'desktop', vi.fn(), d)).toBeNull();
      expect(d.save).not.toHaveBeenCalled();
      expect(d.announce).not.toHaveBeenCalled();
    }
  });

  it('caps at 140 characters, and a single 60-character word still builds a real house (Review Focus 1)', () => {
    const d = deps();
    expect(submitYours(input('w'.repeat(300)), 'desktop', vi.fn(), d)).toBe('w'.repeat(VISITOR_MAX));
    const long = submitYours(input('x'.repeat(60)), 'desktop', vi.fn(), d)!;
    expect(long).toBe('x'.repeat(60));
    expect(houseFromSentence(long).parts.length).toBeGreaterThan(0);
  });

  it('phone: closes the keyboard and reframes on the yours section; desktop does neither', () => {
    const p = input('a thing');
    const scrollP = vi.fn();
    submitYours(p, 'phone', scrollP, deps());
    expect(p.blur).toHaveBeenCalledTimes(1);
    expect(scrollP).toHaveBeenCalledWith('yours');
    const q = input('a thing');
    const scrollQ = vi.fn();
    submitYours(q, 'desktop', scrollQ, deps());
    expect(q.blur).not.toHaveBeenCalled();
    expect(scrollQ).not.toHaveBeenCalled();
  });

  it('storage blocked: still builds, nothing throws (Review Focus 4)', () => {
    const d = deps(false);
    expect(submitYours(input('a thing'), 'desktop', vi.fn(), d)).toBe('a thing');
    expect(d.announce).toHaveBeenCalledWith('a thing');
  });

  it('with the real helpers and a localStorage that throws, it announces and does not throw', () => {
    const win = new EventTarget();
    const got: string[] = [];
    win.addEventListener('ortg:visitor-sentence', (e) => got.push((e as CustomEvent<string>).detail));
    vi.stubGlobal('window', win);
    vi.stubGlobal('localStorage', { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } });
    expect(() => submitYours(input('a thing'), 'desktop', vi.fn())).not.toThrow();
    expect(got).toEqual(['a thing']);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/site/yoursSubmit.test.ts`
Expected: FAIL with `Failed to resolve import "./yoursSubmit"`.

- [ ] **Step 3: Write `src/site/yoursSubmit.ts`**

```ts
// Enter (or the build button) in section 07 (spec §3.1 · 07, §11). The sentence is cleaned, stored in this browser if
// storage allows, and announced on window for the GL bridge (or the no-GL SVG) to build. On phones the keyboard closes
// and the page reframes on the section so the lot is visible. Nothing is sent anywhere.
import type { Tier } from '@/valley/types';
import { announceVisitorSentence, cleanSentence, saveVisitorSentence } from './visitorSentence';

export interface YoursInput { value: string; blur(): void }
export interface YoursDeps { save(s: string): boolean; announce(s: string): void }

const DEFAULT_DEPS: YoursDeps = { save: saveVisitorSentence, announce: announceVisitorSentence };

export function submitYours(
  input: YoursInput, tier: Tier, scrollTo: (id: string) => void, deps: YoursDeps = DEFAULT_DEPS,
): string | null {
  const sentence = cleanSentence(input.value);
  if (sentence === null) return null;
  deps.save(sentence);
  deps.announce(sentence);
  if (tier === 'phone') {
    input.blur();
    scrollTo('yours');
  }
  return sentence;
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run src/site/yoursSubmit.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Wire `src/site/sections/Yours.tsx`**

Open the file Stage 0 wrote. Keep its section wrapper (`section.section`), `.section-grid`, `<Reveal className="copy-col scrim">`, `data-reveal` attributes, h2 and body, and the `#yours-form` id that Stage 0 lists as a hook for later stages, exactly as they are (the block below reproduces them; keep Stage 0's actual key names if they differ). Replace the rest of the file's logic and the input region so the component reads as follows:

```tsx
'use client';
import { useEffect, useRef, type FormEvent } from 'react';
import { copy } from '@/site/copy';
import { SECTIONS } from '@/valley/sections';
import { Reveal } from '@/site/Reveal';
import { useScroll } from '@/scroll/ScrollProvider';
import { submitYours } from '@/site/yoursSubmit';
import { VISITOR_MAX, loadVisitorSentence, yoursDom } from '@/site/visitorSentence';

const HEIGHT_VH = SECTIONS.find((s) => s.id === 'yours')!.heightVh;

/** Hand the clock and tag lines to the GL bridge, and show a stored sentence in the input. */
function bindYours(input: HTMLInputElement | null, clock: HTMLElement | null, tag: HTMLElement | null): () => void {
  yoursDom.clock = clock;
  yoursDom.tag = tag;
  const stored = loadVisitorSentence();
  if (stored && input && input.value === '') input.value = stored;
  return () => {
    yoursDom.clock = null;
    yoursDom.tag = null;
  };
}

export function Yours() {
  const { tier, scrollTo } = useScroll();
  const c = copy.yours;
  const input = useRef<HTMLInputElement>(null);
  const clock = useRef<HTMLParagraphElement>(null);
  const tag = useRef<HTMLParagraphElement>(null);

  useEffect(() => bindYours(input.current, clock.current, tag.current), []);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.current) submitYours(input.current, tier, scrollTo);
  };

  return (
    <section id="yours" className="section" style={{ minHeight: `${HEIGHT_VH}vh` }}>
      <div className="section-grid">
        <Reveal className="copy-col scrim">
          <h2 className="h2" data-reveal>{c.heading}</h2>
          <p className="body mt-5" data-reveal>{c.body}</p>
          {/* Enter and the button both submit. The sentence is only ever text: never HTML, never sent (spec §2). */}
          <form id="yours-form" className="mt-6 flex items-end gap-4" onSubmit={onSubmit}>
            <input
              ref={input}
              id="yours-input"
              type="text"
              name="sentence"
              className="yours-input mono"
              maxLength={VISITOR_MAX}
              placeholder={c.placeholder}
              aria-label={c.placeholder}
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="go"
            />
            <button type="submit" className="mono link">{c.button}</button>
          </form>
          <p className="mono ink-dim mt-3">{c.hint}</p>
          <p ref={clock} id="yours-clock" className="mono mt-4" aria-live="off" />
          <p ref={tag} id="yours-tag" className="mono mt-1" aria-live="polite" />
        </Reveal>
      </div>
    </section>
  );
}
```

If Stage 0 gave the input or button classes for the dark palette (an underline rule, a placeholder colour), keep those class strings on the new elements. No `box-shadow`, no `backdrop-filter`, no border box (§2, §9).

- [ ] **Step 6: Lint, typecheck, full suite**

Run: `npm run lint && npx tsc --noEmit && npx vitest run`
Expected: all green. If Stage 0 has a server-render test of `Yours` (for example `src/site/sections/sections.test.ts` rendering every section to static markup), it must still pass: the new markup server-renders with an empty clock and tag.

- [ ] **Step 7: Commit**

```bash
git add src/site/yoursSubmit.ts src/site/yoursSubmit.test.ts src/site/sections/Yours.tsx
git commit -m "Wire the yours input: Enter builds, guarded storage, clock and tag lines, phone reframe"
```

**Verify:**
- `npx vitest run src/site/yoursSubmit.test.ts` passes.
- `grep -n "maxLength={VISITOR_MAX}" src/site/sections/Yours.tsx` matches; `VISITOR_MAX` is 140.
- `grep -n 'id="yours-form"\|section-grid\|copy-col' src/site/sections/Yours.tsx` prints three lines (Stage 0's hooks and wrappers kept).
- `grep -n "innerHTML\|fetch(" src/site/sections/Yours.tsx src/site/yoursSubmit.ts` prints nothing.
- In dev (after Task 4.7): type `a bot that books my dentist appointments`, press Enter: `#yours-clock` counts `0.00 / 4.40` up to about `4.39 / 4.40`, then clears, and `#yours-tag` reads `7 words in · N parts out · 4.40 s on the clock` with N equal to `houseFromSentence(...).parts.length`. Reload: the input shows the sentence, the house is standing and lit, the tag is back. In a private window with storage blocked (Safari private, or DevTools → Application → block storage): Enter still builds, reload shows an empty lot, the console has no errors.

---

### Task 4.9: Hillside labels on hover and tap **[parallel-safe]**

Spec: §3.1 · 07 ("Hillside labels (mono, on hover or tap of a pre-built house): the sentence it was built from"), §6 (canvas `pointer-events: none`; "hover, tap and parallax use window-level pointer listeners with screen-space hit tests against `projection.ts`'s cached projected emitter positions. No R3F pointer events"), §11 (phone: "tap on a hillside house … shows its label as a bottom-aligned mono line"), §12 (labels clamped to the viewport).

Decisions where the spec is silent: the hit radius is 36 px around the projected hill emitter (a 4-unit house is about 100 px wide at 1440 × 900); the hover label sits 14 px right of and 28 px above that point, clamped 8 px inside the viewport; mouse and pen hover, touch taps (a tap elsewhere hides the line); pointers over links, buttons and inputs never show a label; labels are written straight to the DOM (no React state), only on pointer and scroll events, never per frame.

**Files:**
- Create: `src/site/hillsideHit.ts`, `src/site/HillsideLabel.tsx`
- Test: `src/site/hillsideHit.test.ts`
- Modify: `src/site/Site.tsx` (mount `<HillsideLabel />` directly after `<ProjectedLabels />`)

**Interfaces:**
- Consumes: `EMITTERS` (`src/valley/lights.ts`); the driver's projected array (`PROJECTED: Float32Array` from `src/gl/projection.ts`, Stage 2 Task 2.1: NDC, stride 3: NDC x, NDC y, visible 0/1). `HillsideLabel` converts it into a preallocated CSS-px scratch array with `projectedToPixels` before every hit test; `hillsideHit` and `labelPosition` work in pixel space only; `copy.yours.hillside` (Task 4.2).
- Produces:
  - `export const HILL_INDICES: readonly number[]` (EMITTERS indices of hill1…hill5)
  - `export const HIT_RADIUS_PX = 36`
  - `export function projectedToPixels(ndc: Float32Array, vw: number, vh: number, out: Float32Array): Float32Array` (stride 3: x px, y px from the viewport's top-left, visible 0/1; allocation-free)
  - `export function hillsideHit(px: number, py: number, projected: Float32Array, indices?: readonly number[], radius?: number): number` (0–4 for hill1–hill5, −1 for none)
  - `export function labelPosition(x: number, y: number, vw: number, width: number): [number, number]`
  - `export function HillsideLabel(): JSX.Element`

- [ ] **Step 1: Confirm the projected array's source and units**

Open `src/gl/projection.ts` (Stage 2 Task 2.1). The export is `PROJECTED`, length `EMITTER_COUNT * 3`, holding NDC x, NDC y and visible 0/1 per emitter. It is not in pixels. `HillsideLabel.tsx` therefore imports `PROJECTED` and converts it into a preallocated scratch `Float32Array` with `projectedToPixels` (x = (ndcX + 1) / 2 * innerWidth, y = (1 − ndcY) / 2 * innerHeight) before calling `hillsideHit` or `labelPosition`. Both of those stay in pixel space.

- [ ] **Step 2: Write the failing test `src/site/hillsideHit.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { EMITTERS } from '@/valley/lights';
import { HILL_INDICES, HIT_RADIUS_PX, hillsideHit, labelPosition, projectedToPixels } from './hillsideHit';

function projectedWith(points: Record<string, [number, number, number]>): Float32Array {
  const a = new Float32Array(EMITTERS.length * 3);
  EMITTERS.forEach((e, i) => {
    const p = points[e.id];
    if (p) a.set(p, i * 3);
  });
  return a;
}

describe('hillsideHit', () => {
  it('maps hill1…hill5 to their EMITTERS indices', () => {
    expect(HILL_INDICES.map((i) => EMITTERS[i].id)).toEqual(['hill1', 'hill2', 'hill3', 'hill4', 'hill5']);
  });
  it('finds the nearest visible house within the radius', () => {
    const p = projectedWith({ hill1: [800, 600, 1], hill2: [860, 590, 1], hill5: [700, 640, 1] });
    expect(hillsideHit(805, 602, p)).toBe(0);
    expect(hillsideHit(850, 592, p)).toBe(1);
    expect(hillsideHit(700, 640 + HIT_RADIUS_PX - 1, p)).toBe(4);
    expect(hillsideHit(700, 640 + HIT_RADIUS_PX + 1, p)).toBe(-1);
  });
  it('ignores houses that are not visible, and other emitters entirely', () => {
    const p = projectedWith({ hill3: [500, 500, 0], visitor: [500, 500, 1], hut: [500, 500, 1] });
    expect(hillsideHit(500, 500, p)).toBe(-1);
  });
});

describe('projectedToPixels', () => {
  it('converts NDC to CSS px from the top-left and keeps the visible flag', () => {
    const ndc = new Float32Array([0, 0, 1, -1, 1, 1, 1, -1, 0]);
    const out = new Float32Array(9);
    expect(Array.from(projectedToPixels(ndc, 1440, 900, out))).toEqual([720, 450, 1, 0, 0, 1, 1440, 900, 0]);
  });
  it('feeds hillsideHit in pixel space', () => {
    const ndc = new Float32Array(EMITTERS.length * 3);
    const i = HILL_INDICES[2] * 3;
    ndc.set([0, 0, 1], i);
    const px = projectedToPixels(ndc, 1440, 900, new Float32Array(ndc.length));
    expect(hillsideHit(722, 452, px)).toBe(2);
    expect(hillsideHit(722, 452, ndc)).toBe(-1); // raw NDC is not pixels: no hit
  });
});

describe('labelPosition', () => {
  it('sits up and right of the point, clamped inside the viewport (spec §12)', () => {
    expect(labelPosition(400, 300, 1440, 200)).toEqual([414, 272]);
    expect(labelPosition(1400, 300, 1440, 200)).toEqual([1232, 272]);
    expect(labelPosition(-50, 10, 1440, 200)).toEqual([8, 8]);
  });
});
```

- [ ] **Step 3: Run it and see it fail**

Run: `npx vitest run src/site/hillsideHit.test.ts`
Expected: FAIL with `Failed to resolve import "./hillsideHit"`.

- [ ] **Step 4: Write `src/site/hillsideHit.ts`**

```ts
// Screen-space hit test for the hillside labels (spec §3.1 · 07, §6): no raycasts, no R3F pointer events, just the
// driver's cached projected emitter positions. PROJECTED holds NDC; projectedToPixels converts it to CSS px
// (stride 3: x px, y px, visible) and everything else here works in pixels.
import { EMITTERS } from '@/valley/lights';

export const HILL_INDICES: readonly number[] = (['hill1', 'hill2', 'hill3', 'hill4', 'hill5'] as const).map((id) =>
  EMITTERS.findIndex((e) => e.id === id),
);
export const HIT_RADIUS_PX = 36;

/** PROJECTED (NDC x, NDC y, visible) into CSS px from the viewport's top-left. Writes `out`, allocates nothing. */
export function projectedToPixels(ndc: Float32Array, vw: number, vh: number, out: Float32Array): Float32Array {
  for (let o = 0; o + 2 < ndc.length; o += 3) {
    out[o] = ((ndc[o] + 1) / 2) * vw;
    out[o + 1] = ((1 - ndc[o + 1]) / 2) * vh;
    out[o + 2] = ndc[o + 2];
  }
  return out;
}

/** Index 0–4 of the nearest visible hill house within `radius` px of (px, py), or −1. */
export function hillsideHit(
  px: number, py: number, projected: Float32Array, indices: readonly number[] = HILL_INDICES, radius = HIT_RADIUS_PX,
): number {
  let best = -1;
  let bestD = radius * radius;
  for (let k = 0; k < indices.length; k++) {
    const i = indices[k] * 3;
    if (projected[i + 2] < 0.5) continue;
    const dx = projected[i] - px;
    const dy = projected[i + 1] - py;
    const d = dx * dx + dy * dy;
    if (d <= bestD) { bestD = d; best = k; }
  }
  return best;
}

/** Top-left of a label `width` px wide for a point at (x, y): 14 px right, 28 px up, 8 px inside the viewport. */
export function labelPosition(x: number, y: number, vw: number, width: number): [number, number] {
  return [Math.min(Math.max(8, x + 14), vw - width - 8), Math.max(8, y - 28)];
}
```

- [ ] **Step 5: Run it and see it pass**

Run: `npx vitest run src/site/hillsideHit.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Write `src/site/HillsideLabel.tsx`**

```tsx
'use client';
// Hover (mouse, pen) or tap (touch) a hillside house to read the sentence it was built from (spec §3.1 · 07, §11).
// Window listeners only; the canvas never receives pointer events. Writes the DOM directly, only on pointer and scroll
// events. In the no-GL tier the projected array stays all-invisible, so nothing ever shows.
import { useEffect, useRef } from 'react';
import { copy } from '@/site/copy';
import { PROJECTED } from '@/gl/projection';
import { HILL_INDICES, hillsideHit, labelPosition, projectedToPixels } from '@/site/hillsideHit';

const INTERACTIVE = 'a, button, input, textarea, select, label';

function overUi(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(INTERACTIVE) !== null;
}

// CSS-px copy of PROJECTED, refreshed on each pointer or scroll event (PROJECTED itself is NDC).
const PX = new Float32Array(PROJECTED.length);
const pixels = () => projectedToPixels(PROJECTED, window.innerWidth, window.innerHeight, PX);

function listen(hover: HTMLSpanElement, tap: HTMLParagraphElement): () => void {
  let px = -1;
  let py = -1;
  let shown = -1;
  const show = (k: number) => {
    if (k < 0) {
      hover.style.opacity = '0';
      shown = -1;
      return;
    }
    if (k !== shown) {
      hover.textContent = copy.yours.hillside[k];
      shown = k;
    }
    const i = HILL_INDICES[k] * 3;
    const [x, y] = labelPosition(PX[i], PX[i + 1], window.innerWidth, hover.offsetWidth);
    hover.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    hover.style.opacity = '1';
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    px = e.clientX;
    py = e.clientY;
    show(overUi(e.target) ? -1 : hillsideHit(px, py, pixels()));
  };
  const onScroll = () => {
    if (px >= 0) show(hillsideHit(px, py, pixels()));
  };
  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    const k = overUi(e.target) ? -1 : hillsideHit(e.clientX, e.clientY, pixels());
    tap.textContent = k < 0 ? '' : copy.yours.hillside[k];
    tap.style.opacity = k < 0 ? '0' : '1';
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerdown', onDown);
    window.removeEventListener('scroll', onScroll);
  };
}

export function HillsideLabel() {
  const hover = useRef<HTMLSpanElement>(null);
  const tap = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!hover.current || !tap.current) return;
    return listen(hover.current, tap.current);
  }, []);
  return (
    <>
      <span
        ref={hover}
        className="mono pointer-events-none fixed left-0 top-0 z-20 whitespace-nowrap opacity-0"
        aria-hidden="true"
      />
      <p ref={tap} className="mono pointer-events-none fixed inset-x-4 bottom-4 z-20 opacity-0" aria-live="polite" />
    </>
  );
}
```

- [ ] **Step 7: Mount it in `src/site/Site.tsx`**

Add `import { HillsideLabel } from '@/site/HillsideLabel';` and render `<HillsideLabel />` directly after `<ProjectedLabels />` in `src/site/Site.tsx` (Stage 2 Task 2.8 mounts it there; Stage 0's `<Labels />` lives inside `Open.tsx`, not Site.tsx).

- [ ] **Step 8: Lint, typecheck, full suite**

Run: `npm run lint && npx tsc --noEmit && npx vitest run`
Expected: all green.

- [ ] **Step 9: Commit**

```bash
git add src/site/hillsideHit.ts src/site/hillsideHit.test.ts src/site/HillsideLabel.tsx src/site/Site.tsx
git commit -m "Add hillside labels: hover and tap read the sentence each house was built from"
```

**Verify:**
- `npx vitest run src/site/hillsideHit.test.ts` passes.
- `grep -n "getBoundingClientRect\|onPointer\|useFrame" src/site/HillsideLabel.tsx` prints nothing.
- In dev at 1440 × 900 after the chain: hovering each hillside house shows its §3.2 sentence in mono beside it; moving off hides it; hovering the yours input shows nothing. With DevTools device mode (390 × 844, touch), tapping a house shows its sentence as a line at the bottom; tapping empty sky hides it.

---

### Task 4.10: The SVG elevation for the no-GL tier **[parallel-safe]**

Spec: §5.4 ("`houseSvg(house)` returns an SVG elevation string of the same house for the no-WebGL tier"), §11 ("the visitor's house renders as the SVG elevation from `houseSvg` with the same parts count"; `?nogl=1` forces the tier), §16 (`houseSvg` has balanced tags). `Still.tsx` (Stage 5) renders the component this task makes.

**Files:**
- Create: `src/fallback/houseSvgView.ts`, `src/fallback/HouseSvg.tsx`
- Test: `src/fallback/houseSvgView.test.ts`

**Interfaces:**
- Consumes: `houseFromSentence`, `houseSvg` (`src/valley/house.ts`); `cleanSentence`, `countWords`, `getVisitorSnapshot`, `onVisitorSentence` (Task 4.2); `copy.yours.tag` (Task 4.2).
- Produces:
  - `export interface HouseSvgView { svg: string; tag: string; words: number; parts: number }`
  - `export function houseSvgView(sentence: string | null): HouseSvgView | null`
  - `export function VisitorHouseSvg(): JSX.Element | null` (renders the visitor's latest sentence as the SVG elevation plus the tag line; nothing when there is no sentence)

- [ ] **Step 1: Write the failing test `src/fallback/houseSvgView.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { copy } from '@/site/copy';
import { houseFromSentence } from '@/valley/house';
import { houseSvgView } from './houseSvgView';

describe('houseSvgView', () => {
  it('is the same house as the GL build: same parts count, same tag', () => {
    const s = 'a bot that books my dentist appointments';
    const v = houseSvgView(s)!;
    expect(v.parts).toBe(houseFromSentence(s).parts.length);
    expect(v.words).toBe(7);
    expect(v.tag).toBe(copy.yours.tag(7, v.parts));
  });

  it('is deterministic and a single well-formed svg element', () => {
    const a = houseSvgView('a trading algorithm for kalshi')!;
    const b = houseSvgView('a trading algorithm for kalshi')!;
    expect(a.svg).toBe(b.svg);
    expect(a.svg.trimStart().startsWith('<svg')).toBe(true);
    expect(a.svg.trimEnd().endsWith('</svg>')).toBe(true);
    expect(a.svg).not.toMatch(/<script|on[a-z]+=/i);
  });

  it('never carries markup from the sentence into the svg', () => {
    const v = houseSvgView('<img src=x onerror=alert(1)> a bar')!;
    expect(v.svg).not.toContain('<img');
    expect(v.svg).not.toContain('onerror');
  });

  it('nothing for no sentence or a blank one', () => {
    expect(houseSvgView(null)).toBeNull();
    expect(houseSvgView('   ')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/fallback/houseSvgView.test.ts`
Expected: FAIL with `Failed to resolve import "./houseSvgView"`.

- [ ] **Step 3: Write `src/fallback/houseSvgView.ts`**

```ts
// The visitor's house for the no-WebGL tier (spec §5.4, §11): the grammar's own SVG elevation and the same tag the GL
// build prints, so both tiers show the same parts count.
import { houseFromSentence, houseSvg } from '@/valley/house';
import { copy } from '@/site/copy';
import { cleanSentence, countWords } from '@/site/visitorSentence';

export interface HouseSvgView { svg: string; tag: string; words: number; parts: number }

export function houseSvgView(sentence: string | null): HouseSvgView | null {
  if (sentence === null) return null;
  const clean = cleanSentence(sentence);
  if (clean === null) return null;
  const house = houseFromSentence(clean);
  const words = countWords(clean);
  const parts = house.parts.length;
  return { svg: houseSvg(house), tag: copy.yours.tag(words, parts), words, parts };
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run src/fallback/houseSvgView.test.ts`
Expected: PASS (4 tests). If "never carries markup" fails, Stage 1's `houseSvg` embeds the sentence unescaped: fix it in `src/valley/house.ts` by escaping `&`, `<`, `>`, `"` and `'` in any text it writes (or by not writing text at all), add `src/valley/house.ts` to this task's commit, and rerun `npx vitest run src/valley/house.test.ts src/fallback/houseSvgView.test.ts`.

- [ ] **Step 5: Write `src/fallback/HouseSvg.tsx`**

```tsx
'use client';
// Rendered by Still.tsx (Stage 5) in the no-WebGL tier: the visitor's latest sentence as an SVG elevation with its tag.
// useSyncExternalStore: the server and the hydration pass render nothing; the stored or newly typed sentence follows.
import { useMemo, useSyncExternalStore } from 'react';
import { getVisitorSnapshot, onVisitorSentence } from '@/site/visitorSentence';
import { houseSvgView } from './houseSvgView';

const subscribe = (cb: () => void) => onVisitorSentence(() => cb());
const serverSnapshot = () => null;

export function VisitorHouseSvg() {
  const sentence = useSyncExternalStore(subscribe, getVisitorSnapshot, serverSnapshot);
  const view = useMemo(() => houseSvgView(sentence), [sentence]);
  if (!view) return null;
  return (
    <figure className="mt-6 max-w-[34ch]">
      {/* houseSvg is generated from numbers by the grammar; the test above proves no sentence text reaches it */}
      <div role="img" aria-label={view.tag} dangerouslySetInnerHTML={{ __html: view.svg }} />
      <figcaption className="mono mt-2">{view.tag}</figcaption>
    </figure>
  );
}
```

- [ ] **Step 6: Lint, typecheck, full suite**

Run: `npm run lint && npx tsc --noEmit && npx vitest run`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/fallback/houseSvgView.ts src/fallback/houseSvgView.test.ts src/fallback/HouseSvg.tsx
git commit -m "Add the no-GL house: SVG elevation of the visitor's sentence with the same parts count"
```

**Verify:**
- `npx vitest run src/fallback/houseSvgView.test.ts` passes.
- `grep -n "dangerouslySetInnerHTML" src/fallback/HouseSvg.tsx` shows one use, fed only by `houseSvg(house)`.
- Until Stage 5 mounts it in `Still.tsx`, a reviewer can check it by temporarily rendering `<VisitorHouseSvg />` under the yours input in dev with `?nogl=1`, typing a sentence and pressing Enter: an elevation appears with `N words in · M parts out · 4.40 s on the clock`, and M equals the GL tag's count for the same sentence. Revert the temporary render before committing.

---
### Task 4.11: Gate G5 (house)

Spec: §14 G5 ("stills at 0.5, 2.0, 3.85, 4.4 s show scaffolding, the cut rising, retraction, the window lighting; the tag shows true counts; the same sentence builds the same house twice; the hillside with six houses still reads sober, not a toy town"; on failure "fix the grammar before anything else; darken the house ramp"), §2 (do-not-build list: not Kyoto, not Ghibli, not a toy town), §14 preamble (lint, typecheck, vitest and build green; stills against the exported build at 1440 × 900; an Opus agent judges; implementers do not self-pass).

**Files:** none committed. Stills go to `.playwright-mcp/gates/` (gitignored).

**Interfaces:**
- Consumes: everything above; the `?visitor=&buildT=` pin (Task 4.6); `#yours-input`, `#yours-tag` (Task 4.8); `sessionStorage.introPlayed` (Stage 3's intro gate; this gate writes `'1'`, which Stage 3 treats as played).
- Produces: a pass or fail verdict with the stills, recorded in the orchestrator's ledger.

- [ ] **Step 1: Everything green**

Run: `npm run lint && npx tsc --noEmit && npx vitest run && npm run build`
Expected: all four exit 0; `out/index.html` exists.

- [ ] **Step 2: Serve the export**

Run (in the background): `npx serve out -l 3005`
Expected: `Serving!` on `http://localhost:3005`.

- [ ] **Step 3: Take the build stills (gate agent, Playwright MCP, 1440 × 900)**

For each `T` in `0.5`, `2.0`, `3.85`, `4.4`:
1. `browser_resize` to 1440 × 900.
2. `browser_navigate` to `http://localhost:3005/`, then `browser_evaluate` `() => sessionStorage.setItem('introPlayed', '1')`.
3. `browser_navigate` to `http://localhost:3005/?visitor=a%20bot%20that%20books%20my%20dentist%20appointments&buildT=T`.
4. `browser_evaluate` `() => window.scrollTo(0, document.getElementById('yours').offsetTop)`, then `browser_wait_for` 3 s (Lenis settles; the view turns to the lot).
5. `browser_take_screenshot` to `.playwright-mcp/gates/g5-build-T.png`.

Expected, judged in Step 6: 0.5 s scaffolding rising around a nearly empty lot; 2.0 s the cut about two-thirds up, bars standing; 3.85 s walls and roof complete, bars retracting; 4.4 s no bars, the house's window and its glow lit, the point light warming the ground in front.

- [ ] **Step 4: Take the typed-build stills and read the tag**

1. Navigate to `http://localhost:3005/` (introPlayed still set), scroll to `#yours` as above, wait 3 s.
2. `browser_type` into `#yours-input` the text `a bot that books my dentist appointments` and press Enter (`browser_press_key` `Enter`).
3. `browser_wait_for` 5 s, `browser_take_screenshot` to `.playwright-mcp/gates/g5-typed.png`, and `browser_evaluate` `() => document.getElementById('yours-tag').textContent`. Record it as TAG1.
4. Reload the page, scroll to `#yours`, wait 3 s, read `#yours-tag` again (the stored house, rebuilt silently). Record TAG2. Screenshot `.playwright-mcp/gates/g5-restored.png`.
5. Clear the input, type the same sentence again, press Enter, wait 5 s, read the tag. Record TAG3.
6. Run `npx vitest run src/fallback/houseSvgView.test.ts -t "same house"` (it prints nothing new; it proves the counts come from `houseFromSentence`), and confirm TAG1 = TAG2 = TAG3 = `7 words in · N parts out · 4.40 s on the clock` with N between 150 and 2,200.

- [ ] **Step 5: The hillside with six houses, and the phone**

1. With the restored house standing, scroll to `#yours` exactly as in Step 4, item 1, and take `.playwright-mcp/gates/g5-hillside.png`: five hillside houses plus the visitor's, all lit.
2. Hover the mouse (`browser_hover` is element-based; use `browser_run_code_unsafe` with `page.mouse.move(x, y)` at a hillside house's position read from the still) and take `.playwright-mcp/gates/g5-hover.png`: the house's §3.2 sentence in mono beside it.
3. `browser_resize` to 390 × 844, reload, scroll to `#yours`, type a sentence, press Enter, wait 5 s, take `.playwright-mcp/gates/g5-phone.png`: the keyboard is gone, the lot and the new house are in frame, the tag reads true counts.

- [ ] **Step 6: Judge (Opus gate agent, not the implementer)**

The judge opens every still from Steps 3 to 5 and the three tags and passes G5 only if all hold:
- The four build stills read as scaffolding → rising cut → retraction → lit window, in that order.
- TAG1 = TAG2 = TAG3 and N is the grammar's count (the same sentence builds the same house twice).
- The hillside with six houses reads as dark timber-and-tin houses on a slope at night: sober, not Kyoto, not Ghibli, not a toy town; no saturated colour; lights only in windows and glows.
- Nothing floats: no house edge hangs over the slope, no dark window quads hang in the air during the build.

On failure, per §14: fix the grammar first (Stage 1 `house.ts`: proportions, roof, window counts), then darken the house ramp (the wall and roof values in `src/valley/palette.ts`, and `globals.css` to match); re-run this task from Step 1. Record the verdict and the still paths in the orchestrator's ledger. Stop the server.

**Verify:**
- The nine stills exist under `.playwright-mcp/gates/` (`g5-build-0.5.png`, `g5-build-2.0.png`, `g5-build-3.85.png`, `g5-build-4.4.png`, `g5-typed.png`, `g5-restored.png`, `g5-hillside.png`, `g5-hover.png`, `g5-phone.png`).
- The verdict names the judge model (Opus) and quotes TAG1, TAG2 and TAG3.
- `git status` shows no stills staged (the directory is gitignored).
