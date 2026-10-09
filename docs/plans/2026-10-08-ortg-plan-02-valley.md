# Stage 1: The valley package (pure TypeScript, tests)

> Part of `2026-10-08-ortg-plan-00-index.md`. Read the index's Global Constraints, Review Focus and Interface contracts first (the contracts are law here), then the spec `docs/plans/2026-10-08-only-running-things-glow-design.md`. This stage argues from spec §3 (section table, view convention, portrait yaw column), §4 (cameras, the projection test, the emitter box), §4.1 (heightfield masks, treeline, vertex colours), §4.2–§4.7 (every position), §4.5 (mill rows), §4.6 (the ridge and the optional `tradesPerDay.json`), §4.8 (the emitter registry), §5.1–§5.6 (timeline, environment, ignition, house grammar, build, lights), §9 (palette keyframes), §12 (no allocation in the frame loop, the silent killers) and §16 (the unit tests). It writes `src/valley/` hash, rng, terrain, layout, ridge, lights, timeline, environment, ignition, house and build, plus the projection and import-boundary tests, and touches nothing under `src/gl` or `src/site`. It ends at the **Stage 1 gate: `npx vitest run` green** (with `npm run lint` and `npx tsc --noEmit` clean), Task 1.12.

**Before you start.** This stage consumes four Stage 0 files and does not write them: `src/valley/types.ts` and `src/valley/sections.ts` (Task 0.1), `src/valley/facts.ts` (Task 0.3) and `src/valley/palette.ts` (Task 0.4). Check they exist before your task:

```bash
cd /Users/Ethan_1/ethanwangai
ls src/valley/types.ts src/valley/sections.ts src/valley/facts.ts src/valley/palette.ts
grep -n "export const PALETTE\|export const SKY_KEYFRAMES\|terrainLow\|millWindow\|treeline" src/valley/palette.ts
grep -n "trades" src/valley/facts.ts
grep -n "export function locate\|viewPortrait" src/valley/sections.ts
```

The code below uses these Stage 0 names: `PALETTE.{warm, ridge, porch, millWindow, lamp, wall, roof, terrainLow, terrainMid, terrainSlope, terrainCrest, treeline}` (flat `#RRGGBB` strings), `SKY_KEYFRAMES: readonly { name: 'dusk' | 'blue' | 'night' | 'predawn'; tod; zenith; horizon; east; sun; sunIntensity }[]` and `type SkyName` from `palette.ts`; `facts.kalshi.trades` (30000) from `facts.ts`; `SECTIONS` (with `view` and `viewPortrait`) and `locate(g, ranges)` returning `{ section, s, index }` from `sections.ts`. If Stage 0 landed a different key name, use Stage 0's name in your code and say so in your commit message; never edit a Stage 0 file from this stage. If one of the four files is missing, stop: its Stage 0 task has not landed.

**Order.** Stage 0 Tasks 0.1, 0.3 and 0.4 must have landed before this stage starts (the check above), except that 1.1 and 1.7 need only Task 0.1. 1.1 first. Then 1.2 (terrain) and the **[parallel-safe]** tasks 1.7, 1.8, 1.9, 1.10, 1.11 may run at once on separate agents (they touch disjoint files; 1.10 needs 1.1's `hash.ts`). 1.3 (layout) follows 1.2; 1.4 (ridge), 1.5 (lights) follow 1.3; 1.6 (projection) follows 1.5 and Stage 0 Task 0.1; 1.12 runs last.

**Readings this stage takes where the spec is silent or self-contradictory** (each is repeated in its task and listed in the stage doubts):

- Terrain: the near bank is a swell that rises from the river to about 5 and eases back to about 2.5 at the near edge (z = 50), because the landscape camera stands at z = 70, outside the 100-unit-deep terrain, and its lowest rays must still land on ground (Task 1.2, pinned by a test in Task 1.6). The portrait camera (z = 96) sees past the near edge at the bottom of the frame whatever the heightfield does; Stage 2 Task 2.4 adds a flat near-bank apron from z = 50 to z = 110 to the terrain geometry, with a portrait bottom-edge ray test.
- The spec's portrait yaw-0 horizontal assertion is impossible with the spec's portrait camera and positions: `hut`, `hill2`, `hill4`, `hill5` project to |x| of 1.28, 1.23, 1.39, 1.09 for any heightfield (x / depth exceeds the 44° vertical fov's horizontal half-width at aspect 0.46). This is a spec conflict: resolved by the controller on 2026-10-08: the portrait fov is widened to 70° (spec §4 amended), Task 1.6 Step 0 records it, and the test asserts the full list; every other §4 assertion is kept as written.
- `PLACES.millWheel` keeps §4.5's y = 2.6 (the contract comment "y is heightAt" covers ground places).
- Allocation-free returns: `timelineAt`, `pulseAt` and `buildStateAt` return one shared object, overwritten on each call; `environmentAt` returns frozen objects from a 1,001-entry table (tod quantised to 0.001). The driver reads them in the frame loop (§12).
- `ignitionLevel` returns brightness (0..1.6) for `flicker`/`catch`, the lit-row fraction for `mill` (ends at 0: the mill ends dark), and the ridge reveal (0 → 0.01) for `trickle`. Hillside steps keep `at: 3.6` and carry their per-target delay in `stagger` (0, 0.04, …, 0.20).
- House roofs: every part is an axis-aligned box (Stage 4 builds a box per part), so pitched and hipped sides are laid as four stepped courses of slats, `width` slats per course; the count is exactly §5.4's `width / 0.25` per side.
- `src/valley/data/tradesPerDay.json` is committed as `[]`; the ridge reads it with a static JSON import and uses it only when it is a non-empty array of non-negative counts. "If the file exists" becomes "if the file is non-empty", which needs no bundler tricks.

---

### Task 1.1: Hash and rng **[parallel-safe]**

Spec §5.4 (`seed = hashString(...)`, FNV-1a 32-bit, unsigned shifts), §5.7 (hash: FNV-1a; rng: mulberry32), §4.6 (seeded jitter).

**Files:**
- Create: `src/valley/hash.ts`, `src/valley/rng.ts`
- Test: `src/valley/hash.test.ts`, `src/valley/rng.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `hashString(s: string): number` (FNV-1a 32-bit over UTF-16 code units, unsigned, in [0, 2³²)); `mulberry32(seed: number): () => number` (values in [0, 1), seed taken as `seed >>> 0`).

- [ ] **Step 1: Write the failing tests**

`src/valley/hash.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hashString } from './hash';

describe('hashString (FNV-1a 32-bit)', () => {
  it('matches the published FNV-1a test vectors', () => {
    expect(hashString('')).toBe(0x811c9dc5);
    expect(hashString('a')).toBe(0xe40c292c);
    expect(hashString('foobar')).toBe(0xbf9cf968);
  });
  it('is an unsigned 32-bit integer for every input', () => {
    for (const s of ['', ' ', 'hello world', 'x'.repeat(500), 'é', '🙂']) {
      const h = hashString(s);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(2 ** 32);
    }
  });
  it('is deterministic and case-sensitive (callers normalise)', () => {
    expect(hashString('a trading algorithm for kalshi')).toBe(hashString('a trading algorithm for kalshi'));
    expect(hashString('A')).not.toBe(hashString('a'));
  });
});
```

`src/valley/rng.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mulberry32 } from './rng';

describe('mulberry32', () => {
  it('replays the same sequence for the same seed', () => {
    const a = mulberry32(42), b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });
  it('matches the reference first values for seed 1', () => {
    const r = mulberry32(1);
    expect(r()).toBeCloseTo(0.6270739405881613, 15);
    expect(r()).toBeCloseTo(0.002735721180215478, 15);
  });
  it('stays in [0, 1) and differs across seeds', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 10000; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
  it('treats negative and fractional seeds as their unsigned 32-bit value', () => {
    expect(mulberry32(-1)()).toBe(mulberry32(0xffffffff)());
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run src/valley/hash.test.ts src/valley/rng.test.ts`
Expected: FAIL, `Failed to resolve import "./hash" from "src/valley/hash.test.ts"` and the same for `./rng`.

- [ ] **Step 3: Write `src/valley/hash.ts`**

```ts
// FNV-1a, 32-bit, unsigned. Spec §5.4: the house seed is hashString(sentence.trim().toLowerCase()).
// Hashes UTF-16 code units (charCodeAt), which equals the byte-wise FNV-1a for ASCII input.
const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export function hashString(s: string): number {
  let h = FNV_OFFSET;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME);
  }
  return h >>> 0;
}
```

- [ ] **Step 4: Write `src/valley/rng.ts`**

```ts
// mulberry32: a 32-bit seeded PRNG. Same seed, same sequence, in Node and the browser. Values in [0, 1).
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 5: Run them and see them pass**

Run: `npx vitest run src/valley/hash.test.ts src/valley/rng.test.ts`
Expected: PASS, 7 tests (3 hash, 4 rng).

- [ ] **Step 6: Lint and typecheck**

Run: `npx eslint src/valley/hash.ts src/valley/rng.ts src/valley/hash.test.ts src/valley/rng.test.ts && npx tsc --noEmit 2>&1 | grep '^src/valley/'`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/valley/hash.ts src/valley/rng.ts src/valley/hash.test.ts src/valley/rng.test.ts
git commit -m "Add the valley hash (FNV-1a) and rng (mulberry32)"
```

**Verify:**
- `npx vitest run src/valley/hash.test.ts src/valley/rng.test.ts` → 7 passed.
- `node -e "let h=0x811c9dc5;for(const c of 'foobar'){h^=c.charCodeAt(0);h=Math.imul(h,0x01000193)}console.log((h>>>0).toString(16))"` → `bf9cf968`, the value the test pins.
- `grep -n "import" src/valley/hash.ts src/valley/rng.ts` → empty (no dependencies).

---

### Task 1.2: Terrain: heightfield, treeline, vertex colours **[parallel-safe]** (after 1.1)

Spec §4 (160 × 100 units, centred, river along +x at z ≈ 0, ribbon z −6..6), §4.1 (two-octave value noise plus authored masks: river channel, near bank rising south, far bank rising north, hill at far left, ridge at z ≈ −38, flat mill pad; vertex colours from height and slope; 1-unit dark treeline cones merged in; ≈16k vertices; runs in Node), §4.5 (mill at (30, h, −12), 10 × 7 footprint), §9 (terrain ramp), §12 (NaN at the channel edges).

Readings where the spec is silent: the river bed is y = −0.8 (the ribbon is at 0.2); the ridge crest line is z = −38; the treeline is 160 six-sided cones, one per unit of x, base radius 0.5 ("1-unit" read as the base diameter), height 1.2–3.0 seeded; the mill pad is flat at y = 2.5 within 7 units of (30, −12), blended out by 10. The near bank is a swell that eases down toward the near edge (z = 50) because the landscape camera at z = 70 must see ground, not the underside of the terrain, along the bottom of its frame (Task 1.6 pins this). Colours go through three's `Color`, so the hex palette (sRGB) lands as linear values, which is what vertex colours expect.

**Files:**
- Create: `src/valley/terrain.ts`
- Test: `src/valley/terrain.test.ts`

**Interfaces:**
- Consumes: `mulberry32(seed: number): () => number` (`./rng`, Task 1.1); `PALETTE.terrainLow`, `PALETTE.terrainMid`, `PALETTE.terrainSlope`, `PALETTE.terrainCrest`, `PALETTE.treeline` (`./palette`, Stage 0 Task 0.4); `Color` from `three` (math class).
- Produces (contract): `TERRAIN = { width: 160, depth: 100, res: 1 } as const`; `heightAt(x: number, z: number): number`; `buildTerrain(): { positions: Float32Array; colors: Float32Array; indices: Uint32Array }` (positions and colours xyz/rgb per vertex, linear colours in [0, 1], indices CCW seen from above).
- Produces (extra, for Stage 2 and later tasks): `MILL_PAD = { x: 30, z: -12, y: 2.5, flat: 7, blend: 10 }`, `RIVER_BED = -0.8`, `CREST_Z = -38`, `TREELINE = { count: 160, sides: 6, radius: 0.5, minHeight: 1.2, maxHeight: 3.0 }`, `TERRAIN_VERTEX_COUNT` (17,381), `TERRAIN_INDEX_COUNT` (98,880), `groundColor(x: number, z: number, out: Color): Color`.

- [ ] **Step 1: Write the failing test `src/valley/terrain.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { Color } from 'three';
import { PALETTE } from './palette';
import {
  TERRAIN, MILL_PAD, RIVER_BED, CREST_Z, TREELINE, TERRAIN_VERTEX_COUNT, TERRAIN_INDEX_COUNT,
  heightAt, buildTerrain, groundColor,
} from './terrain';

const terrain = buildTerrain();
const GRID = (TERRAIN.width + 1) * (TERRAIN.depth + 1);   // 161 × 101

describe('heightAt', () => {
  it('is finite everywhere, including the river channel edges (§12 silent killer)', () => {
    for (let x = -80; x <= 80; x += 0.5) {
      for (const z of [-50, -38, -7, -6.0001, -6, -5.9999, -4, -0.5, 0, 0.5, 4, 5.9999, 6, 6.0001, 7, 26, 50]) {
        expect(Number.isFinite(heightAt(x, z))).toBe(true);
      }
    }
  });
  it('cuts the river channel below both banks and below the river surface (y 0.2)', () => {
    for (let x = -80; x <= 80; x += 1) {
      const bed = heightAt(x, 0);
      expect(bed).toBeCloseTo(RIVER_BED, 6);
      expect(bed).toBeLessThan(0.2);
      expect(heightAt(x, 10)).toBeGreaterThan(bed + 1);
      expect(heightAt(x, -10)).toBeGreaterThan(bed + 1);
      expect(heightAt(x, 8)).toBeGreaterThan(0.2);
      expect(heightAt(x, -8)).toBeGreaterThan(0.2);
    }
  });
  it('holds the mill pad flat under the whole 10 × 7 mill footprint', () => {
    for (const [dx, dz] of [[-5, -3.5], [5, -3.5], [-5, 3.5], [5, 3.5], [0, 0]]) {
      expect(heightAt(MILL_PAD.x + dx, MILL_PAD.z + dz)).toBeCloseTo(MILL_PAD.y, 6);
    }
  });
  it('puts the back ridge crest well above the far bank', () => {
    for (let x = -36; x <= 40; x += 2) {
      expect(heightAt(x, CREST_Z)).toBeGreaterThan(heightAt(x, -20) + 6);
    }
  });
  it('raises the hill at the far left above the far bank to its right', () => {
    expect(heightAt(-31, -16)).toBeGreaterThan(heightAt(0, -16) + 4);
  });
});

describe('buildTerrain', () => {
  it('has 161 × 101 grid vertices plus the treeline cones, and matching channel lengths', () => {
    expect(TERRAIN_VERTEX_COUNT).toBe(GRID + TREELINE.count * (TREELINE.sides + 1));
    expect(terrain.positions.length).toBe(TERRAIN_VERTEX_COUNT * 3);
    expect(terrain.colors.length).toBe(TERRAIN_VERTEX_COUNT * 3);
    expect(terrain.indices.length).toBe(TERRAIN_INDEX_COUNT);
    expect(terrain.indices.length % 3).toBe(0);
  });
  it('has no NaN and no out-of-range colour channel', () => {
    for (const v of terrain.positions) expect(Number.isFinite(v)).toBe(true);
    for (const v of terrain.colors) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
    for (const i of terrain.indices) expect(i).toBeLessThan(TERRAIN_VERTEX_COUNT);
  });
  it('spans x −80..80 and z −50..50 on the grid and samples heightAt at each grid vertex', () => {
    const p = terrain.positions;
    expect([p[0], p[2]]).toEqual([-80, -50]);
    const last = (GRID - 1) * 3;
    expect([p[last], p[last + 2]]).toEqual([80, 50]);
    expect(p[1]).toBeCloseTo(heightAt(-80, -50), 5);
  });
  it('winds every ground triangle counter-clockwise seen from above (normal y > 0)', () => {
    const p = terrain.positions, idx = terrain.indices;
    const groundTris = TERRAIN.width * TERRAIN.depth * 2;
    for (let t = 0; t < groundTris; t++) {
      const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;
      const ux = p[b] - p[a], uz = p[b + 2] - p[a + 2];
      const vx = p[c] - p[a], vz = p[c + 2] - p[a + 2];
      expect(uz * vx - ux * vz).toBeGreaterThan(0);   // y component of (b − a) × (c − a)
    }
  });
  it('winds every treeline cone face outward', () => {
    const p = terrain.positions, idx = terrain.indices;
    const start = TERRAIN.width * TERRAIN.depth * 2;
    for (let t = start; t < idx.length / 3; t++) {
      const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;   // a, c on the base; b is the apex
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
      const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      const nx = uy * vz - uz * vy, nz = ux * vy - uy * vx;
      const ox = (p[a] + p[c]) / 2 - p[b], oz = (p[a + 2] + p[c + 2]) / 2 - p[b + 2];   // apex → base-edge midpoint
      expect(nx * ox + nz * oz).toBeGreaterThan(0);
    }
  });
  it('colours the treeline with the palette treeline colour and stays in the dark ramp', () => {
    const tree = new Color(PALETTE.treeline);
    const v = GRID;   // first treeline vertex
    expect(terrain.colors[v * 3]).toBeCloseTo(tree.r, 6);
    expect(terrain.colors[v * 3 + 2]).toBeCloseTo(tree.b, 6);
    const c = new Color();
    groundColor(0, CREST_Z, c);
    const crest = new Color(PALETTE.terrainCrest);
    expect(Math.abs(c.r - crest.r) + Math.abs(c.g - crest.g) + Math.abs(c.b - crest.b)).toBeLessThan(0.02);
    let maxLum = 0;
    for (let i = 0; i < terrain.colors.length; i += 3) maxLum = Math.max(maxLum, terrain.colors[i], terrain.colors[i + 1], terrain.colors[i + 2]);
    expect(maxLum).toBeLessThanOrEqual(new Color(PALETTE.terrainSlope).b + 1e-6);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/valley/terrain.test.ts`
Expected: FAIL, `Failed to resolve import "./terrain" from "src/valley/terrain.test.ts"`.

- [ ] **Step 3: Write `src/valley/terrain.ts`**

```ts
// The valley floor (spec §4.1): a 160 × 100 heightfield at 1-unit resolution, centred on the origin, river along +x
// at z ≈ 0. Two-octave value noise plus authored masks: river channel (|z| < 6), near bank rising toward the camera
// (+z) and easing down again before the near edge so the landscape camera's lowest ray still lands on terrain, far
// bank rising north (−z), a hill at the far left, a ridge along the back (crest at z = −38) and a flat mill pad.
// Built once on the CPU; the same function runs in Node for tests. No React, no DOM, no three renderer.
import { Color } from 'three';
import { PALETTE } from './palette';
import { mulberry32 } from './rng';

export const TERRAIN = { width: 160, depth: 100, res: 1 } as const;

/** The mill pad (§4.5): flat at this height within MILL_PAD.flat units of (x, z), blended out by MILL_PAD.blend. */
export const MILL_PAD = { x: 30, z: -12, y: 2.5, flat: 7, blend: 10 } as const;
/** The river bed height inside the channel; the river ribbon sits at y = 0.2 above it (§4.1). */
export const RIVER_BED = -0.8;
/** The ridge crest line the treeline stands on (§4.1). */
export const CREST_Z = -38;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

/** Integer-lattice hash → [0, 1). `salt` picks the octave. */
function lattice(ix: number, iz: number, salt: number): number {
  let h = Math.imul(ix | 0, 0x27d4eb2d) ^ Math.imul(iz | 0, 0x165667b1) ^ salt;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1). */
function valueNoise(x: number, z: number, salt: number): number {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = lattice(ix, iz, salt), b = lattice(ix + 1, iz, salt);
  const c = lattice(ix, iz + 1, salt), d = lattice(ix + 1, iz + 1, salt);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uz);
}

/** Ground height at world (x, z). Finite for every finite input. */
export function heightAt(x: number, z: number): number {
  const edge = smoothstep(28, 48, z);   // 0 on the valley, 1 at the near edge (z = 50): the swell eases down there
  const noise = ((valueNoise(x / 18, z / 18, 0x51) - 0.5) * 1.6 + (valueNoise(x / 6, z / 6, 0x9e) - 0.5) * 0.5) * (1 - 0.7 * edge);
  const far = 6 * smoothstep(6, 34, -z);
  const near = 3.6 * smoothstep(5, 22, z) * (1 - 0.8 * edge);
  const dz = (z - CREST_Z) / 7;
  const ridge = 10 * Math.exp(-dz * dz);
  const hx = (x + 31) / 11, hz = (z + 16) / 9;
  const hill = 7 * Math.exp(-(hx * hx + hz * hz));
  let h = 1.4 + far + near + ridge + hill + noise;
  const pd = Math.hypot(x - MILL_PAD.x, z - MILL_PAD.z);
  h = lerp(h, MILL_PAD.y, 1 - smoothstep(MILL_PAD.flat, MILL_PAD.blend, pd));
  h = lerp(h, RIVER_BED, 1 - smoothstep(4, 7, Math.abs(z)));
  return h;
}

const GRID_X = TERRAIN.width / TERRAIN.res + 1;   // 161
const GRID_Z = TERRAIN.depth / TERRAIN.res + 1;   // 101
/** Treeline (§4.1): one cone per unit of x along the crest, base radius 0.5, 6 sides, height 1.2–3.0. */
export const TREELINE = { count: TERRAIN.width, sides: 6, radius: 0.5, minHeight: 1.2, maxHeight: 3.0 } as const;
export const TERRAIN_VERTEX_COUNT = GRID_X * GRID_Z + TREELINE.count * (TREELINE.sides + 1);
export const TERRAIN_INDEX_COUNT = (GRID_X - 1) * (GRID_Z - 1) * 6 + TREELINE.count * TREELINE.sides * 3;

const C_LOW = new Color(PALETTE.terrainLow);
const C_MID = new Color(PALETTE.terrainMid);
const C_SLOPE = new Color(PALETTE.terrainSlope);
const C_CREST = new Color(PALETTE.terrainCrest);
const C_TREE = new Color(PALETTE.treeline);

/** Vertex colour (linear, three's working space) from height and slope (§4.1). Writes into `out`. */
export function groundColor(x: number, z: number, out: Color): Color {
  const h = heightAt(x, z);
  const dhdx = heightAt(x + 0.5, z) - heightAt(x - 0.5, z);
  const dhdz = heightAt(x, z + 0.5) - heightAt(x, z - 0.5);
  const slope = 1 - 1 / Math.sqrt(1 + dhdx * dhdx + dhdz * dhdz);   // 1 − normal.y
  out.copy(C_LOW).lerp(C_MID, smoothstep(0.5, 6, h));
  out.lerp(C_SLOPE, smoothstep(0.08, 0.3, slope));
  out.lerp(C_CREST, smoothstep(13, 17, h));
  return out;
}

/** The terrain mesh with the treeline merged in: positions, linear vertex colours, CCW-from-above indices. */
export function buildTerrain(): { positions: Float32Array; colors: Float32Array; indices: Uint32Array } {
  const positions = new Float32Array(TERRAIN_VERTEX_COUNT * 3);
  const colors = new Float32Array(TERRAIN_VERTEX_COUNT * 3);
  const indices = new Uint32Array(TERRAIN_INDEX_COUNT);
  const c = new Color();
  let v = 0;
  for (let j = 0; j < GRID_Z; j++) {
    for (let i = 0; i < GRID_X; i++) {
      const x = -TERRAIN.width / 2 + i * TERRAIN.res;
      const z = -TERRAIN.depth / 2 + j * TERRAIN.res;
      positions[v * 3] = x; positions[v * 3 + 1] = heightAt(x, z); positions[v * 3 + 2] = z;
      groundColor(x, z, c);
      colors[v * 3] = c.r; colors[v * 3 + 1] = c.g; colors[v * 3 + 2] = c.b;
      v++;
    }
  }
  let k = 0;
  for (let j = 0; j < GRID_Z - 1; j++) {
    for (let i = 0; i < GRID_X - 1; i++) {
      const a = j * GRID_X + i, b = a + 1, cI = a + GRID_X, d = cI + 1;
      indices[k++] = a; indices[k++] = cI; indices[k++] = b;
      indices[k++] = b; indices[k++] = cI; indices[k++] = d;
    }
  }
  const rng = mulberry32(0x7ee5);
  for (let t = 0; t < TREELINE.count; t++) {
    const cx = -TERRAIN.width / 2 + 0.5 + t;
    const cz = CREST_Z + (rng() * 2 - 1);
    const base = heightAt(cx, cz) - 0.1;
    const height = TREELINE.minHeight + rng() * (TREELINE.maxHeight - TREELINE.minHeight);
    const first = v;
    for (let s = 0; s < TREELINE.sides; s++) {
      const ang = (s / TREELINE.sides) * Math.PI * 2;
      positions[v * 3] = cx + Math.cos(ang) * TREELINE.radius;
      positions[v * 3 + 1] = base;
      positions[v * 3 + 2] = cz + Math.sin(ang) * TREELINE.radius;
      colors[v * 3] = C_TREE.r; colors[v * 3 + 1] = C_TREE.g; colors[v * 3 + 2] = C_TREE.b;
      v++;
    }
    const apex = v;
    positions[v * 3] = cx; positions[v * 3 + 1] = base + height; positions[v * 3 + 2] = cz;
    colors[v * 3] = C_TREE.r; colors[v * 3 + 1] = C_TREE.g; colors[v * 3 + 2] = C_TREE.b;
    v++;
    for (let s = 0; s < TREELINE.sides; s++) {
      const s1 = first + s, s2 = first + ((s + 1) % TREELINE.sides);
      indices[k++] = s1; indices[k++] = apex; indices[k++] = s2;
    }
  }
  return { positions, colors, indices };
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run src/valley/terrain.test.ts`
Expected: PASS, 11 tests. If "cuts the river channel" or "holds the mill pad flat" fails, the masks were reordered: the pad blend must come before the channel blend, and the channel blend must be last.

- [ ] **Step 5: Lint and typecheck**

Run: `npx eslint src/valley/terrain.ts src/valley/terrain.test.ts && npx tsc --noEmit 2>&1 | grep '^src/valley/'`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/valley/terrain.ts src/valley/terrain.test.ts
git commit -m "Add the valley heightfield, treeline and vertex colours"
```

**Verify:**
- `npx vitest run src/valley/terrain.test.ts` → 11 passed.
- `grep -n "#[0-9a-fA-F]\{6\}" src/valley/terrain.ts` → empty (colours only from the palette).
- `grep -n "from 'three'" src/valley/terrain.ts` → exactly `import { Color } from 'three';`.
- Read `heightAt`: masks applied in the order noise + banks + ridge + hill, then the mill pad, then the river channel last.

---

### Task 1.3: Layout: cameras, places, ridge line

Spec §4 (hero cameras, near 1, far 260; every emitter x ∈ [−36, 40], z ∈ [−38, 26]; all positions in `layout.ts`), §4.2 hut (−18, h, 22), §4.3 cabins (−34, h, −14), (−27, h, −18), §4.4 bars (−10, h, −20), (0, h, −22), (10, h, −21), (20, h, −23), §4.5 mill (30, h, −12) and wheel (30, 2.6, −5), §4.6 ridge (−36 → 40 at z −36) and lamp (2, hf, −30), §4.7 lot (6, h, 10) and sites (12, h, 15), (18, h, 19), (8, h, 20), (22, h, 13), (15, h, 24).

Reading: `PLACES.millWheel` keeps §4.5's hub height y = 2.6; every other place has y = `heightAt(x, z)`.

**Files:**
- Create: `src/valley/layout.ts`
- Test: `src/valley/layout.test.ts`

**Interfaces:**
- Consumes: `heightAt(x, z)`, `MILL_PAD` (`./terrain`, Task 1.2); `Vec3` (`./types`).
- Produces (contract): `CAMERA_LANDSCAPE: { position: Vec3; lookAt: Vec3; fov: number }` = (0, 14, 70) → (0, 2, −10), fov 36; `CAMERA_PORTRAIT` = (0, 22, 96) → (0, 0, −12), fov 70; `PLACES: Record<'hut' | 'nist' | 'wvu' | 'kalshiLamp' | 'bar1' | 'bar2' | 'bar3' | 'bar4' | 'mill' | 'millWheel' | 'lot' | 'hill1' | 'hill2' | 'hill3' | 'hill4' | 'hill5', Vec3>`; `RIDGE = { x0: -36, x1: 40, z: -36 } as const`.
- Produces (extra): `CAMERA_NEAR = 1`, `CAMERA_FAR = 260`.

- [ ] **Step 1: Write the failing test `src/valley/layout.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { CAMERA_LANDSCAPE, CAMERA_PORTRAIT, CAMERA_NEAR, CAMERA_FAR, RIDGE, PLACES } from './layout';
import { heightAt, MILL_PAD } from './terrain';

const SPEC_XZ: Record<keyof typeof PLACES, [number, number]> = {
  hut: [-18, 22], nist: [-34, -14], wvu: [-27, -18], kalshiLamp: [2, -30],
  bar1: [-10, -20], bar2: [0, -22], bar3: [10, -21], bar4: [20, -23],
  mill: [30, -12], millWheel: [30, -5], lot: [6, 10],
  hill1: [12, 15], hill2: [18, 19], hill3: [8, 20], hill4: [22, 13], hill5: [15, 24],
};

describe('layout', () => {
  it('uses the spec §4 cameras exactly', () => {
    expect(CAMERA_LANDSCAPE).toEqual({ position: [0, 14, 70], lookAt: [0, 2, -10], fov: 36 });
    expect(CAMERA_PORTRAIT).toEqual({ position: [0, 22, 96], lookAt: [0, 0, -12], fov: 70 });
    expect([CAMERA_NEAR, CAMERA_FAR]).toEqual([1, 260]);
    expect(RIDGE).toEqual({ x0: -36, x1: 40, z: -36 });
  });
  it('places every site at the spec x, z on the ground (the wheel hub at y 2.6)', () => {
    expect(Object.keys(PLACES).sort()).toEqual(Object.keys(SPEC_XZ).sort());
    for (const [k, [x, z]] of Object.entries(SPEC_XZ)) {
      const p = PLACES[k as keyof typeof PLACES];
      expect([p[0], p[2]]).toEqual([x, z]);
      expect(p[1]).toBe(k === 'millWheel' ? 2.6 : heightAt(x, z));
    }
  });
  it('keeps every place inside the lit-valley box x ∈ [−36, 40], z ∈ [−38, 26] (§4)', () => {
    for (const [x, , z] of Object.values(PLACES)) {
      expect(x).toBeGreaterThanOrEqual(-36); expect(x).toBeLessThanOrEqual(40);
      expect(z).toBeGreaterThanOrEqual(-38); expect(z).toBeLessThanOrEqual(26);
    }
  });
  it('stands the mill on the flat pad and sets the lot below every hillside site (§4.7)', () => {
    expect(PLACES.mill[1]).toBeCloseTo(MILL_PAD.y, 6);
    for (const k of ['hill1', 'hill2', 'hill3', 'hill4', 'hill5'] as const) {
      expect(PLACES[k][1]).toBeGreaterThan(PLACES.lot[1]);
    }
  });
  it('keeps the bars and the lamp on dry ground above the river surface', () => {
    for (const k of ['bar1', 'bar2', 'bar3', 'bar4', 'kalshiLamp', 'hut', 'lot'] as const) expect(PLACES[k][1]).toBeGreaterThan(0.2);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/valley/layout.test.ts`
Expected: FAIL, `Failed to resolve import "./layout" from "src/valley/layout.test.ts"`.

- [ ] **Step 3: Write `src/valley/layout.ts`**

```ts
// Every position in the valley (spec §4, §4.2–§4.7). Nothing is hand-placed in a component; components read these.
// Ground-standing places take y = heightAt(x, z). The mill wheel is the one exception: §4.5 fixes its hub at y = 2.6.
import type { Vec3 } from './types';
import { heightAt } from './terrain';

/** Hero camera, landscape (§4). near 1, far 260. */
export const CAMERA_LANDSCAPE: { position: Vec3; lookAt: Vec3; fov: number } = {
  position: [0, 14, 70], lookAt: [0, 2, -10], fov: 36,
};
/** Hero camera, portrait (aspect < 1) (§4). */
export const CAMERA_PORTRAIT: { position: Vec3; lookAt: Vec3; fov: number } = {
  position: [0, 22, 96], lookAt: [0, 0, -12], fov: 70,
};
export const CAMERA_NEAR = 1;
export const CAMERA_FAR = 260;

/** The ridge crest the trades sit on (§4.6): x0 → x1 is jan 2026 → oct 2026. */
export const RIDGE = { x0: -36, x1: 40, z: -36 } as const;

const ground = (x: number, z: number): Vec3 => [x, heightAt(x, z), z];

export const PLACES: Record<
  'hut' | 'nist' | 'wvu' | 'kalshiLamp' | 'bar1' | 'bar2' | 'bar3' | 'bar4' | 'mill' | 'millWheel' | 'lot'
  | 'hill1' | 'hill2' | 'hill3' | 'hill4' | 'hill5',
  Vec3
> = {
  hut: ground(-18, 22),          // §4.2 near bank, left
  nist: ground(-34, -14),        // §4.3 far-left hill
  wvu: ground(-27, -18),
  kalshiLamp: ground(2, -30),    // §4.6 foot of the ridge
  bar1: ground(-10, -20),        // §4.4 far bank, left to right
  bar2: ground(0, -22),
  bar3: ground(10, -21),
  bar4: ground(20, -23),
  mill: ground(30, -12),         // §4.5 on the mill pad
  millWheel: [30, 2.6, -5],      // §4.5 wheel hub, overhanging the river
  lot: ground(6, 10),            // §4.7 the visitor's lot, low on the near bank
  hill1: ground(12, 15),         // §4.7 hillside sites, up the slope toward the camera
  hill2: ground(18, 19),
  hill3: ground(8, 20),
  hill4: ground(22, 13),
  hill5: ground(15, 24),
};
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run src/valley/layout.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Lint and typecheck**

Run: `npx eslint src/valley/layout.ts src/valley/layout.test.ts && npx tsc --noEmit 2>&1 | grep '^src/valley/'`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/valley/layout.ts src/valley/layout.test.ts
git commit -m "Add the valley layout: hero cameras, places and the ridge line"
```

**Verify:**
- `npx vitest run src/valley/layout.test.ts` → 5 passed.
- Every coordinate in `layout.ts` matches the spec line cited in its comment (§4.2–§4.7); nothing else in the file is a position.

---

### Task 1.4: Ridge points

Spec §4.6 (N points along the crest from (−36, hc, −36) to (40, hc, −36); x from the trade's time, jan → oct left → right; z and y jittered ±1.5 seeded; `aBirth` = time fraction, monotone in x; `aSize` 0.6–1.4; N = `facts.kalshi.trades` desktop, N/5 phone with sizes ×1.8; the trickle reveals 0 → 0.01; uniform spread from the count alone; if `src/valley/data/tradesPerDay.json` exists, distribute by it, nothing else changes), §16 ("exactly N points with monotone aBirth in x and all within the crest band").

Readings: points sit `RIDGE_LIFT` = 2 above `heightAt(x, RIDGE.z)` and jitter ±1.5 around that, so none sink into the crest behind them; the crest band is |z − (−36)| ≤ 1.5 and |y − (heightAt(x, −36) + 2)| ≤ 1.5. Each point owns one stratum of time, `(i + rng()) / N`, so birth is strictly increasing with no sort. The phone ×1.8 size is applied by `Ridge.tsx` (Stage 3) since the contract signature has no tier. The per-day file is committed as `[]`; a non-empty array of non-negative daily counts (day 0 = 2026-01-01, last entry = the last day of the span) switches the generator to an inverse-CDF spread; anything malformed falls back to uniform. The optional third parameter exists so the test can exercise that path; callers use the contract's two arguments.

**Files:**
- Create: `src/valley/ridge.ts`, `src/valley/data/tradesPerDay.json`
- Test: `src/valley/ridge.test.ts`

**Interfaces:**
- Consumes: `RIDGE` (`./layout`, Task 1.3); `heightAt` (`./terrain`, Task 1.2); `mulberry32` (`./rng`, Task 1.1); `facts.kalshi.trades` (`./facts`, Stage 0 Task 0.3, test only).
- Produces (contract): `ridgePoints(count: number, seed: number): { positions: Float32Array; birth: Float32Array; size: Float32Array }` (declared with an optional third parameter `perDay: readonly number[] | null = TRADES_PER_DAY`).
- Produces (extra): `RIDGE_LIFT = 2`, `RIDGE_JITTER = 1.5`, `RIDGE_SIZE = { min: 0.6, max: 1.4 }`, `TRADES_PER_DAY: readonly number[] | null`.

- [ ] **Step 1: Write the per-day placeholder `src/valley/data/tradesPerDay.json`**

```json
[]
```

- [ ] **Step 2: Write the failing test `src/valley/ridge.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { ridgePoints, TRADES_PER_DAY, RIDGE_LIFT, RIDGE_JITTER } from './ridge';
import { RIDGE } from './layout';
import { heightAt } from './terrain';
import { facts } from './facts';

const N = facts.kalshi.trades;   // 30,000 (§4.6); the phone tier passes N / 5
const SEED = 2026;
const r = ridgePoints(N, SEED);

describe('ridgePoints (uniform, the committed tradesPerDay.json is empty)', () => {
  it('ships an empty per-day file, so the spread is uniform', () => {
    expect(TRADES_PER_DAY).toBeNull();
  });
  it('yields exactly N points in every channel', () => {
    expect(r.positions.length).toBe(N * 3);
    expect(r.birth.length).toBe(N);
    expect(r.size.length).toBe(N);
    expect(ridgePoints(N / 5, SEED).birth.length).toBe(N / 5);
  });
  it('has birth monotone in index and in x, inside [0, 1)', () => {
    for (let i = 0; i < N; i++) {
      expect(r.birth[i]).toBeGreaterThanOrEqual(0);
      expect(r.birth[i]).toBeLessThan(1);
      if (i > 0) {
        expect(r.birth[i]).toBeGreaterThanOrEqual(r.birth[i - 1]);
        expect(r.positions[i * 3]).toBeGreaterThanOrEqual(r.positions[(i - 1) * 3]);
      }
    }
  });
  it('keeps every point inside the crest band', () => {
    for (let i = 0; i < N; i++) {
      const x = r.positions[i * 3], y = r.positions[i * 3 + 1], z = r.positions[i * 3 + 2];
      expect(x).toBeGreaterThanOrEqual(RIDGE.x0); expect(x).toBeLessThanOrEqual(RIDGE.x1);
      expect(Math.abs(z - RIDGE.z)).toBeLessThanOrEqual(RIDGE_JITTER + 1e-4);
      expect(Math.abs(y - (heightAt(x, RIDGE.z) + RIDGE_LIFT))).toBeLessThanOrEqual(RIDGE_JITTER + 1e-3);
      expect(r.size[i]).toBeGreaterThanOrEqual(0.6); expect(r.size[i]).toBeLessThanOrEqual(1.4);
    }
  });
  it('reveals the left end first: the hero trickle (reveal 0.01) shows about 1% of points, all in the left 2% of x', () => {
    let shown = 0;
    for (let i = 0; i < N; i++) if (r.birth[i] <= 0.01) {
      shown++;
      expect(r.positions[i * 3]).toBeLessThan(RIDGE.x0 + 0.02 * (RIDGE.x1 - RIDGE.x0));
    }
    expect(shown).toBeGreaterThanOrEqual(290); expect(shown).toBeLessThanOrEqual(310);
  });
  it('is deterministic per seed', () => {
    expect(ridgePoints(500, 9)).toEqual(ridgePoints(500, 9));
    expect(ridgePoints(500, 9).positions).not.toEqual(ridgePoints(500, 10).positions);
  });
  it('returns empty arrays for zero, negative or non-finite counts', () => {
    for (const c of [0, -5, Number.NaN]) expect(ridgePoints(c, 1).birth.length).toBe(0);
  });
});

describe('ridgePoints with a per-day file', () => {
  it('puts births only on days that had trades, still monotone', () => {
    const perDay = [0, 10, 0, 30];   // days 1 and 3 only
    const p = ridgePoints(4000, SEED, perDay);
    let inDay1 = 0;
    for (let i = 0; i < 4000; i++) {
      const b = p.birth[i];
      const day = Math.floor(b * 4);
      expect([1, 3]).toContain(day);
      if (day === 1) inDay1++;
      if (i > 0) expect(b).toBeGreaterThanOrEqual(p.birth[i - 1]);
    }
    expect(inDay1).toBeGreaterThan(900); expect(inDay1).toBeLessThan(1100);   // 10 / 40 of 4000
  });
  it('falls back to uniform for a malformed file', () => {
    expect(ridgePoints(100, 1, [1, -2, 3])).toEqual(ridgePoints(100, 1, null));
    expect(ridgePoints(100, 1, [0, 0])).toEqual(ridgePoints(100, 1, null));
  });
});
```

- [ ] **Step 3: Run it and see it fail**

Run: `npx vitest run src/valley/ridge.test.ts`
Expected: FAIL, `Failed to resolve import "./ridge" from "src/valley/ridge.test.ts"`.

- [ ] **Step 4: Write `src/valley/ridge.ts`**

```ts
// The ridge of trades (spec §4.6): one point per trade along the back ridge, jan 2026 (x0) → oct 2026 (x1).
// aBirth is the trade's time fraction, monotone in x; Ridge.tsx shows points with aBirth ≤ uReveal.
// Not live. If `src/valley/data/tradesPerDay.json` holds a non-empty array of daily counts (day 0 = 2026-01-01,
// last entry = the last day of the span), births follow that file instead of a uniform spread; nothing else changes.
import { RIDGE } from './layout';
import { heightAt } from './terrain';
import { mulberry32 } from './rng';
import tradesPerDay from './data/tradesPerDay.json';

/** Points sit this far above the ground at z = RIDGE.z, then jitter ±JITTER in y and z (§4.6). */
export const RIDGE_LIFT = 2;
export const RIDGE_JITTER = 1.5;
export const RIDGE_SIZE = { min: 0.6, max: 1.4 } as const;

/** The committed per-day file, or null when it is empty or malformed (then births are uniform). */
export const TRADES_PER_DAY: readonly number[] | null = validPerDay(tradesPerDay as unknown);

function validPerDay(v: unknown): readonly number[] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  let sum = 0;
  for (const n of v) {
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return null;
    sum += n;
  }
  return sum > 0 ? (v as number[]) : null;
}

/** Inverse CDF of the per-day histogram: quantile q ∈ [0, 1) → time fraction ∈ [0, 1). Monotone in q. */
function makeInverse(perDay: readonly number[]): (q: number) => number {
  const cum = new Float64Array(perDay.length + 1);
  for (let d = 0; d < perDay.length; d++) cum[d + 1] = cum[d] + perDay[d];
  const total = cum[perDay.length];
  let d = 0;   // callers pass increasing q, so the cursor only moves forward
  return (q: number) => {
    const target = q * total;
    while (d < perDay.length - 1 && cum[d + 1] <= target) d++;
    const inDay = perDay[d] > 0 ? (target - cum[d]) / perDay[d] : 0;
    return (d + Math.min(1, Math.max(0, inDay))) / perDay.length;
  };
}

/**
 * `count` points (floored, min 0) along the ridge, seeded. positions: xyz per point; birth: time fraction in [0, 1),
 * non-decreasing with index and with x; size: 0.6–1.4 (the phone tier multiplies by 1.8 in Ridge.tsx).
 * `perDay` defaults to the committed file; pass null to force the uniform spread.
 */
export function ridgePoints(
  count: number,
  seed: number,
  perDay: readonly number[] | null = TRADES_PER_DAY,
): { positions: Float32Array; birth: Float32Array; size: Float32Array } {
  const n = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));
  const positions = new Float32Array(n * 3);
  const birth = new Float32Array(n);
  const size = new Float32Array(n);
  const rng = mulberry32(seed);
  const valid = perDay ? validPerDay(perDay) : null;
  const inverse = valid ? makeInverse(valid) : null;
  const span = RIDGE.x1 - RIDGE.x0;
  for (let i = 0; i < n; i++) {
    const q = (i + rng()) / n;                 // one stratum per point: strictly increasing in i
    const f = inverse ? inverse(q) : q;
    const x = RIDGE.x0 + f * span;
    birth[i] = f;
    positions[i * 3] = x;
    positions[i * 3 + 1] = heightAt(x, RIDGE.z) + RIDGE_LIFT + (rng() * 2 - 1) * RIDGE_JITTER;
    positions[i * 3 + 2] = RIDGE.z + (rng() * 2 - 1) * RIDGE_JITTER;
    size[i] = RIDGE_SIZE.min + rng() * (RIDGE_SIZE.max - RIDGE_SIZE.min);
  }
  return { positions, birth, size };
}
```

- [ ] **Step 5: Run it and see it pass**

Run: `npx vitest run src/valley/ridge.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 6: Lint and typecheck**

Run: `npx eslint src/valley/ridge.ts src/valley/ridge.test.ts && npx tsc --noEmit 2>&1 | grep '^src/valley/'`
Expected: no output. (`tsconfig.json` already has `resolveJsonModule: true` and `esModuleInterop: true`, so the default JSON import typechecks.)

- [ ] **Step 7: Commit**

```bash
git add src/valley/ridge.ts src/valley/ridge.test.ts src/valley/data/tradesPerDay.json
git commit -m "Add the ridge of trades generator with an optional per-day file"
```

**Verify:**
- `npx vitest run src/valley/ridge.test.ts` → 9 passed.
- `cat src/valley/data/tradesPerDay.json` → `[]`.
- `grep -n "fetch\|readFile\|require(" src/valley/ridge.ts` → empty (the file is a static import).

---

### Task 1.5: Lights: the emitter registry, build order, thesis pulse

Spec §4.8 (ids exactly `hut, nist, wvu, kalshiLamp, bar1, bar2, bar3, bar4, mill, ridge, hill1…hill5, visitor`, each with id, position, colour, size and `meaning`; a test asserts exactly these ids, each with a meaning), §5.6 (the registry; `pulseAt`: a 1.2 s wave through the emitters in build order hut, nist, kalshiLamp, wvu, bar1–4, hill1–5, visitor, ridge, each rising to 1.6× and settling over 0.4 s; the mill excluded), §9 (emitter colours), §12 (no allocation in the frame loop).

Readings: an emitter's position is its light (window, lamp head or porch light), lifted 1.2–4.5 above its place, inside §4's "heightAt plus 1..6"; `ridge` sits at the ridge's midpoint (x 2) 2 above the crest; `visitor` stands on the lot. Glow sizes (world units) are hut 2.2, cabins 2.0, lamp 2.6, bars 2.4, mill 7, hillside 2.0, visitor 2.2, ridge 1 (the ridge has no glow sprite). Colours: warm for the hut, cabins, hillside and visitor; `porch` for the bars (their glow is the porch light); `millWindow` for the mill; `lamp` for the kalshi lamp; `ridge` for the ridge. Meanings are internal labels, not page copy. The pulse wave starts emitter k at k · 0.8 / 14 s and each runs `1 + 0.6 · sin(π u)` over 0.4 s, so the last one ends at exactly 1.2 s. The contract signature is `pulseAt(t)`; §5.6's `order` argument is `BUILD_ORDER`, fixed. The `lightStateMachine` §5.6 mentions has no contract; the driver (Stage 3) owns those transitions.

**Files:**
- Create: `src/valley/lights.ts`
- Test: `src/valley/lights.test.ts`

**Interfaces:**
- Consumes: `PLACES`, `RIDGE` (`./layout`, Task 1.3); `heightAt` (`./terrain`); `PALETTE.{warm, ridge, porch, millWindow, lamp}` (`./palette`); `Emitter`, `EmitterId`, `Vec3` (`./types`).
- Produces (contract): `EMITTERS: readonly Emitter[]` in the order `hut, nist, wvu, kalshiLamp, bar1, bar2, bar3, bar4, mill, ridge, hill1, hill2, hill3, hill4, hill5, visitor` (every per-emitter typed array uses this order); `BUILD_ORDER: readonly EmitterId[]`; `pulseAt(t: number): Record<EmitterId, number>` (shared object, overwritten each call).
- Produces (extra): `EMITTER_INDEX: Record<EmitterId, number>`, `PULSE = { wave: 1.2, each: 0.4, peak: 1.6 }`.

- [ ] **Step 1: Write the failing test `src/valley/lights.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import type { EmitterId } from './types';
import { EMITTERS, EMITTER_INDEX, BUILD_ORDER, PULSE, pulseAt } from './lights';
import { PLACES, RIDGE } from './layout';
import { heightAt } from './terrain';
import { PALETTE } from './palette';

const IDS: EmitterId[] = ['hut', 'nist', 'wvu', 'kalshiLamp', 'bar1', 'bar2', 'bar3', 'bar4', 'mill', 'ridge',
  'hill1', 'hill2', 'hill3', 'hill4', 'hill5', 'visitor'];

describe('EMITTERS', () => {
  it('has exactly the §4.8 ids, in order, once each, every one with a meaning', () => {
    expect(EMITTERS.map((e) => e.id)).toEqual(IDS);
    for (const e of EMITTERS) expect(e.meaning.trim().length).toBeGreaterThan(0);
    IDS.forEach((id, i) => expect(EMITTER_INDEX[id]).toBe(i));
  });
  it('stands every emitter over its layout place, 1 to 6 units above the ground', () => {
    const place: Record<EmitterId, readonly number[]> = {
      hut: PLACES.hut, nist: PLACES.nist, wvu: PLACES.wvu, kalshiLamp: PLACES.kalshiLamp,
      bar1: PLACES.bar1, bar2: PLACES.bar2, bar3: PLACES.bar3, bar4: PLACES.bar4, mill: PLACES.mill,
      ridge: [(RIDGE.x0 + RIDGE.x1) / 2, 0, RIDGE.z],
      hill1: PLACES.hill1, hill2: PLACES.hill2, hill3: PLACES.hill3, hill4: PLACES.hill4, hill5: PLACES.hill5,
      visitor: PLACES.lot,
    };
    for (const e of EMITTERS) {
      const [x, y, z] = e.position;
      expect([x, z]).toEqual([place[e.id][0], place[e.id][2]]);
      const lift = y - heightAt(x, z);
      expect(lift).toBeGreaterThanOrEqual(1); expect(lift).toBeLessThanOrEqual(6);
    }
  });
  it('colours emitters only from the palette emitter colours, with a positive size', () => {
    const allowed: string[] = [PALETTE.warm, PALETTE.ridge, PALETTE.porch, PALETTE.millWindow, PALETTE.lamp];
    for (const e of EMITTERS) { expect(allowed).toContain(e.color); expect(e.size).toBeGreaterThan(0); }
    expect(EMITTERS.find((e) => e.id === 'ridge')!.color).toBe(PALETTE.ridge);
  });
});

describe('BUILD_ORDER and pulseAt', () => {
  it('walks hut, nist, kalshiLamp, wvu, bar1–4, hill1–5, visitor, ridge, without the mill', () => {
    expect(BUILD_ORDER).toEqual(['hut', 'nist', 'kalshiLamp', 'wvu', 'bar1', 'bar2', 'bar3', 'bar4',
      'hill1', 'hill2', 'hill3', 'hill4', 'hill5', 'visitor', 'ridge']);
    expect(BUILD_ORDER).not.toContain('mill');
  });
  it('is 1 everywhere before the pulse and after 1.2 s, and always 1 for the mill', () => {
    for (const t of [-1, -0.001, PULSE.wave, 2, 100]) {
      const p = pulseAt(t);
      for (const id of IDS) expect(p[id]).toBe(1);
    }
    for (let t = 0; t <= 1.2; t += 0.01) expect(pulseAt(t).mill).toBe(1);
  });
  it('lifts every built emitter to 1.6× once, in build order, never above 1.6', () => {
    const peakAt: Partial<Record<EmitterId, number>> = {};
    const peak: Partial<Record<EmitterId, number>> = {};
    for (let t = 0; t <= 1.2; t += 0.001) {
      const p = pulseAt(t);
      for (const id of BUILD_ORDER) {
        expect(p[id]).toBeLessThanOrEqual(1.6 + 1e-9);
        if (p[id] > (peak[id] ?? 0)) { peak[id] = p[id]; peakAt[id] = t; }
      }
    }
    for (const id of BUILD_ORDER) expect(peak[id]).toBeGreaterThan(1.59);
    for (let k = 1; k < BUILD_ORDER.length; k++) expect(peakAt[BUILD_ORDER[k]]!).toBeGreaterThan(peakAt[BUILD_ORDER[k - 1]]!);
    expect(peakAt.ridge!).toBeCloseTo(1.0, 2);   // last emitter peaks 0.2 s before the 1.2 s wave ends
  });
  it('returns every emitter id as a key', () => {
    expect(Object.keys(pulseAt(0.5)).sort()).toEqual([...IDS].sort());
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/valley/lights.test.ts`
Expected: FAIL, `Failed to resolve import "./lights" from "src/valley/lights.test.ts"`.

- [ ] **Step 3: Write `src/valley/lights.ts`**

```ts
// The emitter registry (spec §4.8, §5.6). A light means Ethan built the thing and people used it; nothing else glows.
// EMITTERS order is the order of every per-emitter typed array (driverCore's `lit`, `projected`).
import type { Emitter, EmitterId, Vec3 } from './types';
import { PALETTE } from './palette';
import { PLACES, RIDGE } from './layout';
import { heightAt } from './terrain';

/** Light height above the ground for an emitter standing at `p` (window or lamp-head height). */
const above = (p: Vec3, dy: number): Vec3 => [p[0], p[1] + dy, p[2]];
const ridgeMidX = (RIDGE.x0 + RIDGE.x1) / 2;   // 2

const W = PALETTE.warm;

export const EMITTERS: readonly Emitter[] = [
  { id: 'hut', position: above(PLACES.hut, 1.4), color: W, size: 2.2, meaning: 'discord bots' },
  { id: 'nist', position: above(PLACES.nist, 1.3), color: W, size: 2.0, meaning: 'nist help-desk assistant' },
  { id: 'wvu', position: above(PLACES.wvu, 1.3), color: W, size: 2.0, meaning: 'wvu medicine claims model' },
  { id: 'kalshiLamp', position: above(PLACES.kalshiLamp, 1.2), color: PALETTE.lamp, size: 2.6, meaning: 'kalshi, the market' },
  { id: 'bar1', position: above(PLACES.bar1, 1.6), color: PALETTE.porch, size: 2.4, meaning: 'heron' },
  { id: 'bar2', position: above(PLACES.bar2, 1.6), color: PALETTE.porch, size: 2.4, meaning: 'heron' },
  { id: 'bar3', position: above(PLACES.bar3, 1.6), color: PALETTE.porch, size: 2.4, meaning: 'heron' },
  { id: 'bar4', position: above(PLACES.bar4, 1.6), color: PALETTE.porch, size: 2.4, meaning: 'heron' },
  { id: 'mill', position: above(PLACES.mill, 4.5), color: PALETTE.millWindow, size: 7.0, meaning: 'darch' },
  { id: 'ridge', position: [ridgeMidX, heightAt(ridgeMidX, RIDGE.z) + 2, RIDGE.z], color: PALETTE.ridge, size: 1.0, meaning: 'kalshi trades' },
  { id: 'hill1', position: above(PLACES.hill1, 1.5), color: W, size: 2.0, meaning: 'hillside: a discord bot' },
  { id: 'hill2', position: above(PLACES.hill2, 1.5), color: W, size: 2.0, meaning: 'hillside: the kalshi algorithm' },
  { id: 'hill3', position: above(PLACES.hill3, 1.5), color: W, size: 2.0, meaning: 'hillside: the darch pipeline' },
  { id: 'hill4', position: above(PLACES.hill4, 1.5), color: W, size: 2.0, meaning: 'hillside: the help-desk assistant' },
  { id: 'hill5', position: above(PLACES.hill5, 1.5), color: W, size: 2.0, meaning: 'hillside: the heron pricing model' },
  { id: 'visitor', position: above(PLACES.lot, 1.5), color: W, size: 2.2, meaning: "the visitor's sentence" },
];

/** Index of each emitter in EMITTERS (and in every per-emitter typed array). */
export const EMITTER_INDEX: Record<EmitterId, number> = Object.fromEntries(EMITTERS.map((e, i) => [e.id, i])) as Record<EmitterId, number>;

/** The order Ethan built things in (§5.6); the thesis pulse walks it. The mill is not in it: darch ended. */
export const BUILD_ORDER: readonly EmitterId[] = [
  'hut', 'nist', 'kalshiLamp', 'wvu', 'bar1', 'bar2', 'bar3', 'bar4',
  'hill1', 'hill2', 'hill3', 'hill4', 'hill5', 'visitor', 'ridge',
];

export const PULSE = { wave: 1.2, each: 0.4, peak: 1.6 } as const;

const pulse = Object.fromEntries(EMITTERS.map((e) => [e.id, 1])) as Record<EmitterId, number>;
const STEP = (PULSE.wave - PULSE.each) / (BUILD_ORDER.length - 1);

/**
 * Thesis-pulse brightness multipliers at `t` seconds after the pulse fired (§5.6): a 1.2 s wave through BUILD_ORDER,
 * each emitter rising to 1.6× and settling back to 1× over 0.4 s. The mill is always 1. Outside [0, 1.2] every
 * value is 1. Allocation-free: returns the same object every call, overwritten in place; read it, do not keep it.
 */
export function pulseAt(t: number): Record<EmitterId, number> {
  for (let k = 0; k < BUILD_ORDER.length; k++) {
    const u = (t - k * STEP) / PULSE.each;
    pulse[BUILD_ORDER[k]] = u > 0 && u < 1 ? 1 + (PULSE.peak - 1) * Math.sin(Math.PI * u) : 1;
  }
  pulse.mill = 1;
  return pulse;
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run src/valley/lights.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Lint and typecheck**

Run: `npx eslint src/valley/lights.ts src/valley/lights.test.ts && npx tsc --noEmit 2>&1 | grep '^src/valley/'`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/valley/lights.ts src/valley/lights.test.ts
git commit -m "Add the emitter registry, build order and thesis pulse"
```

**Verify:**
- `npx vitest run src/valley/lights.test.ts` → 7 passed.
- `grep -c "id: '" src/valley/lights.ts` → 16.
- `grep -n "#[0-9a-fA-F]\{6\}" src/valley/lights.ts` → empty.

---

### Task 1.6: Projection test: every emitter in frame through both cameras

Spec §3 (yaw and pitch are look-at offsets, `lookAt.x += tan(yaw) · d`, `d` = camera to base look-at; `fovScale` multiplies the base fov; the portrait yaw column), §4 (project every emitter through both cameras with three's `PerspectiveCamera` + `Vector3.project`, emitter y = `heightAt(x, z)` plus 1..6: at 1440 × 900 |x|, |y| ≤ 0.85 for every emitter; at 390 × 844 yaw 0, |y| ≤ 0.85 for every emitter and |x| ≤ 0.85 for the listed near emitters; with each section's portrait yaw, its subject |x| ≤ 0.85), §16, index Review Focus 2 (resize or rotation keeps every emitter in frame).

Readings: "plus 1..6" is checked at both ends, +1 and +6. A section's portrait check applies that section's whole `viewPortrait` (its yaw with the shared pitch and fovScale). **Deviation, flagged in the stage doubts:** the spec's portrait yaw-0 horizontal list includes `hut`, `hill2`, `hill4` and `hill5`, which project to |x| ≈ 1.28, 1.23, 1.39, 1.09 through the spec's portrait camera whatever the heightfield (their x over depth is wider than a 44° vertical fov allows at aspect 0.46). The test asserts the rest of that list (`kalshiLamp`, `bar1`, `bar2`, `bar3`, `hill1`, `hill3`, `visitor`); the portrait subject checks, including `contact` → `hut`, all pass as written. A further test, not in the spec, guards the void under the landscape frame: for every section's landscape view the rays through the bottom-left, bottom-centre and bottom-right of the frame must cross the near edge (z = 50) above the ground and then meet it.

**This deviation is resolved (Step 0): portrait fov 70°, full list asserted.**

**Files:**
- Test: `src/valley/projection.test.ts`

**Interfaces:**
- Consumes: `CAMERA_LANDSCAPE`, `CAMERA_PORTRAIT`, `CAMERA_NEAR`, `CAMERA_FAR` (`./layout`); `EMITTERS` (`./lights`); `SECTIONS` with `view` and `viewPortrait` (`./sections`, Stage 0 Task 0.1); `heightAt`, `TERRAIN` (`./terrain`); `PerspectiveCamera`, `Vector3` (`three`, already installed).
- Produces: nothing (a test). Stage 2's `CameraRig` must implement the same look-at construction as `cameraFor` below.

- [ ] **Step 0: The portrait conflict and its recorded decision (option A, fov 70°)**

Spec §4 requires |x| ≤ 0.85 at 390 × 844, yaw 0, for `hut` and `hill1`…`hill5`. Through the spec's portrait camera ((0, 22, 96) → (0, 0, −12), vertical fov 44°) `hut`, `hill2`, `hill4` and `hill5` project to |x| ≈ 1.29, 1.24, 1.41, 1.10 (lifts +1 and +6, heights from Task 1.2's `heightAt`). Measured |x| for the worst of the four, `hill4`, by portrait vertical fov: 60° → 0.98, 64° → 0.91, 66° → 0.87, 67° → 0.86, **68° → 0.84**, 70° → 0.81. Every other emitter's |y| stays under 0.4 at those fovs, and a wider portrait fov only moves the portrait bottom-edge ground hit nearer (Stage 2 Task 2.4's apron still covers it).

**Decision, recorded 2026-10-08 by the controller: option A, with the fov set to 70° (not 68°) for margin.** Spec §4 already carries the amended number. The options were:

- **A. Widen the portrait fov to 70°.** (Chosen.) Task 1.3 already pins `CAMERA_PORTRAIT.fov` at 70 in `src/valley/layout.ts` and `src/valley/layout.test.ts`, matching spec §4. The test below uses the full spec list.
- **B. Move the hut and the hillside sites inward** in `layout.ts` until all four pass at 44°. This changes the composition of every landscape still too, so it needs Ethan to approve new coordinates; rerun this whole test file and Task 1.3's tests after.
- **C. Amend spec §4** to list only the emitters that fit at 44° (`kalshiLamp`, `bar1`, `bar2`, `bar3`, `hill1`, `hill3`, `visitor`). The test below keeps the reduced list.

Put "portrait fov 70, option A" in the commit message of Step 5. In Step 1 use `PORTRAIT_X_IDS_FULL` for the yaw-0 horizontal case and delete the unused `PORTRAIT_X_IDS_REDUCED` constant.

- [ ] **Step 1: Write the test `src/valley/projection.test.ts`**

```ts
// Spec §4: every emitter projects inside the frame through both hero cameras (three's PerspectiveCamera +
// Vector3.project), and the landscape camera's lowest rays land on terrain (no void under the near edge).
import { describe, it, expect } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import type { EmitterId, View } from './types';
import { CAMERA_LANDSCAPE, CAMERA_PORTRAIT, CAMERA_NEAR, CAMERA_FAR } from './layout';
import { EMITTERS } from './lights';
import { SECTIONS } from './sections';
import { heightAt, TERRAIN } from './terrain';

type Rig = { position: readonly number[]; lookAt: readonly number[]; fov: number };

/** The §3 convention: yaw/pitch are look-at offsets (lookAt += tan(angle) · d), fovScale multiplies the base fov. */
function cameraFor(rig: Rig, width: number, height: number, view: View): PerspectiveCamera {
  const cam = new PerspectiveCamera(rig.fov * view.fovScale, width / height, CAMERA_NEAR, CAMERA_FAR);
  cam.position.set(rig.position[0], rig.position[1], rig.position[2]);
  const target = new Vector3(rig.lookAt[0], rig.lookAt[1], rig.lookAt[2]);
  const d = cam.position.distanceTo(target);
  target.x += Math.tan((view.yaw * Math.PI) / 180) * d;
  target.y += Math.tan((view.pitch * Math.PI) / 180) * d;
  cam.lookAt(target);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return cam;
}

const BASE: View = { yaw: 0, pitch: 0, fovScale: 1 };
const LIFTS = [1, 6];   // §4: emitter y taken as heightAt(x, z) plus 1..6

function ndc(cam: PerspectiveCamera, id: EmitterId, lift: number): Vector3 {
  const e = EMITTERS.find((m) => m.id === id)!;
  const [x, , z] = e.position;
  return new Vector3(x, heightAt(x, z) + lift, z).project(cam);
}

describe('projection: landscape 1440 × 900', () => {
  const cam = cameraFor(CAMERA_LANDSCAPE, 1440, 900, BASE);
  it.each(EMITTERS.map((e) => e.id))('%s sits within ±0.85 NDC on both axes', (id) => {
    for (const lift of LIFTS) {
      const p = ndc(cam, id, lift);
      expect(Math.abs(p.x)).toBeLessThanOrEqual(0.85);
      expect(Math.abs(p.y)).toBeLessThanOrEqual(0.85);
      expect(p.z).toBeLessThan(1);   // in front of the camera, inside far
    }
  });
});

describe('projection: portrait 390 × 844', () => {
  const cam = cameraFor(CAMERA_PORTRAIT, 390, 844, BASE);
  it('keeps every emitter within ±0.85 NDC vertically at yaw 0', () => {
    for (const e of EMITTERS) for (const lift of LIFTS) expect(Math.abs(ndc(cam, e.id, lift).y)).toBeLessThanOrEqual(0.85);
  });
  // Spec §4's list. Option A (fov 70) was chosen, so the FULL list applies.
  const PORTRAIT_X_IDS_FULL: EmitterId[] = [
    'hut', 'kalshiLamp', 'bar1', 'bar2', 'bar3', 'hill1', 'hill2', 'hill3', 'hill4', 'hill5', 'visitor',
  ];
  const PORTRAIT_X_IDS_REDUCED: EmitterId[] = ['kalshiLamp', 'bar1', 'bar2', 'bar3', 'hill1', 'hill3', 'visitor'];
  const PORTRAIT_X_IDS = PORTRAIT_X_IDS_FULL;
  it('keeps the near and centre emitters within ±0.85 NDC horizontally at yaw 0', () => {
    for (const id of PORTRAIT_X_IDS) for (const lift of LIFTS) expect(Math.abs(ndc(cam, id, lift).x)).toBeLessThanOrEqual(0.85);
  });
  const SUBJECTS: [string, EmitterId[]][] = [
    ['kalshi', ['kalshiLamp']], ['heron', ['bar2']], ['darch', ['mill']], ['summers', ['nist', 'wvu']],
    ['yours', ['visitor']], ['contact', ['hut']],
  ];
  it.each(SUBJECTS)('turns %s to its subject with the portrait yaw', (section, ids) => {
    const view = SECTIONS.find((s) => s.id === section)!.viewPortrait;
    const turned = cameraFor(CAMERA_PORTRAIT, 390, 844, view);
    for (const id of ids) for (const lift of LIFTS) expect(Math.abs(ndc(turned, id, lift).x)).toBeLessThanOrEqual(0.85);
  });
});

describe('projection: the landscape frame has ground under its bottom edge', () => {
  /** March the ray through NDC (nx, −1) and report whether it meets the heightfield inside the terrain. */
  function hitsTerrain(cam: PerspectiveCamera, nx: number): boolean {
    const dir = new Vector3(nx, -1, 0.5).unproject(cam).sub(cam.position).normalize();
    // Step to where the ray crosses the near edge (z = +50); it must still be above the ground there, or the
    // frame would look under the terrain. Then march on until it meets the ground.
    const p = cam.position.clone().addScaledVector(dir, (TERRAIN.depth / 2 - cam.position.z) / dir.z);
    if (Math.abs(p.x) > TERRAIN.width / 2 || p.y <= heightAt(p.x, p.z)) return false;
    while (p.z > -TERRAIN.depth / 2 && Math.abs(p.x) <= TERRAIN.width / 2) {
      p.addScaledVector(dir, 0.1);
      if (p.y <= heightAt(p.x, p.z)) return true;
    }
    return false;
  }
  it.each(SECTIONS.map((s) => s.id))('section %s at 1440 × 900', (id) => {
    const cam = cameraFor(CAMERA_LANDSCAPE, 1440, 900, SECTIONS.find((s) => s.id === id)!.view);
    for (const nx of [-1, 0, 1]) expect(hitsTerrain(cam, nx)).toBe(true);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx vitest run src/valley/projection.test.ts`
Expected: PASS, 32 tests (16 landscape emitters, 2 portrait yaw-0, 6 portrait subjects, 8 bottom-edge sections). This task writes a test against code that already exists, so there is no red step; if anything fails, a position in `layout.ts` or a lift in `lights.ts` drifted from Tasks 1.3 and 1.5, or the terrain's near swell (Task 1.2) was changed. Fix the drift, never loosen the 0.85 bound.

- [ ] **Step 3: Prove the test can fail**

Temporarily change `hut: ground(-18, 22)` to `hut: ground(-40, 22)` in `src/valley/layout.ts` and run `npx vitest run src/valley/projection.test.ts`.
Expected: FAIL in `hut sits within ±0.85 NDC on both axes` and in `turns contact to its subject`. Revert with `git checkout src/valley/layout.ts` and run again: PASS.

- [ ] **Step 4: Lint and typecheck**

Run: `npx eslint src/valley/projection.test.ts && npx tsc --noEmit 2>&1 | grep '^src/valley/'`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/valley/projection.test.ts
git commit -m "Add the projection test: every emitter in frame through both hero cameras"
```

Put "portrait fov 70, option A" in the commit body.

**Verify:**
- `npx vitest run src/valley/projection.test.ts` → 32 passed.
- `git diff HEAD~1 --stat` → only `src/valley/projection.test.ts`.
- The portrait yaw-0 horizontal list is the full spec §4 list, and `CAMERA_PORTRAIT.fov` is 70 (Task 1.3).

---

### Task 1.7: Timeline: tod, view easing, scrubbed reveals **[parallel-safe]**

Spec §3 (tod breakpoints; view per section; smoothstep easing over the last 25% of each section; portrait yaw column), §5.1 (`timelineAt` returns tod, section, s, view, ridgeReveal 0.01 → `0.01 + 0.99 · easeInOut(s)` → 1, hedgeReveal 0 → s → 1, darchT 0 → s → 1, rain up over the first 30% of 04, held through 05, down over the first 40% of 06, pulseArm in `alive`; the driver latches), §12 (no allocation), §16 ("monotone in tod, continuous in view, darchT is 0 outside section 04").

Readings: `easeInOut` is the cubic smoothstep `u²(3 − 2u)`; the view eases from this section's view to the next one's with that curve over s ∈ [0.75, 1] (the last section holds); the rain ramps are linear; `g` outside [0, 1] clamps and NaN reads as 0. "Latch-free" means the timeline is a pure function of `g`: it goes back down when `g` does, and `src/gl/driverCore.ts` keeps the running maxima. The returned object is shared and overwritten on each call.

**Files:**
- Create: `src/valley/timeline.ts`
- Test: `src/valley/timeline.test.ts`

**Interfaces:**
- Consumes: `SECTIONS` (`id`, `todEnd`, `view`, `viewPortrait`), `sectionRanges(tops, docHeight, vh)`, `locate(g, ranges): { section; s; index }` (`./sections`, Stage 0 Task 0.1); `SectionId`, `SectionRange`, `Timeline`, `View` (`./types`).
- Produces (contract): `timelineAt(g: number, ranges: SectionRange[], portrait?: boolean): Timeline`.
- Produces (extra): `easeInOut(t: number): number`, `VIEW_EASE_FROM = 0.75`.

- [ ] **Step 1: Write the failing test `src/valley/timeline.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import type { SectionRange } from './types';
import { SECTIONS, sectionRanges } from './sections';
import { timelineAt } from './timeline';

/** timelineAt reuses one object; snapshot it before comparing two calls. */
const snap = (g: number, ranges: SectionRange[], portrait = false) => structuredClone(timelineAt(g, ranges, portrait));

/** Section ranges for a page whose sections are exactly their §3 heights at a viewport of `vh` px. */
function rangesFor(vh: number): SectionRange[] {
  const tops: number[] = [];
  let y = 0;
  for (const s of SECTIONS) { tops.push(y); y += (s.heightVh / 100) * vh; }
  return sectionRanges(tops, y, vh);
}
const R = rangesFor(900);
const mid = (id: string) => { const r = R.find((x) => x.id === id)!; return (r.start + r.end) / 2; };
const at = (id: string, s: number) => { const r = R.find((x) => x.id === id)!; return r.start + s * (r.end - r.start); };
const STEPS = 10000;

describe('timelineAt: tod', () => {
  it('is 0 through all of open and hits each §3 breakpoint at its section end', () => {
    expect(timelineAt(0, R).tod).toBe(0);
    expect(timelineAt(at('open', 0.99), R).tod).toBe(0);
    for (const s of SECTIONS) expect(timelineAt(at(s.id, 0.999999), R).tod).toBeCloseTo(s.todEnd, 4);
    expect(timelineAt(1, R).tod).toBe(1);
  });
  it('is monotone non-decreasing in g and stays in [0, 1]', () => {
    let prev = -1;
    for (let i = 0; i <= STEPS; i++) {
      const t = timelineAt(i / STEPS, R).tod;
      expect(t).toBeGreaterThanOrEqual(prev);
      expect(t).toBeGreaterThanOrEqual(0); expect(t).toBeLessThanOrEqual(1);
      prev = t;
    }
  });
  it('clamps g outside [0, 1] and treats NaN as 0', () => {
    expect(snap(-1, R)).toEqual(snap(0, R));
    expect(snap(2, R)).toEqual(snap(1, R));
    expect(snap(Number.NaN, R)).toEqual(snap(0, R));
    expect(snap(0, R)).not.toEqual(snap(1, R));
  });
});

describe('timelineAt: view', () => {
  it('holds each section view through its first 75%', () => {
    for (const s of SECTIONS) {
      expect(timelineAt(at(s.id, 0.5), R).view).toEqual(s.view);
      expect(timelineAt(at(s.id, 0.5), R, true).view).toEqual(s.viewPortrait);
    }
  });
  it('is continuous in g in both orientations (no step above 0.25° or 0.002 fovScale per 1e-4 of g)', () => {
    for (const portrait of [false, true]) {
      let prev = { ...timelineAt(0, R, portrait).view };
      for (let i = 1; i <= STEPS; i++) {
        const v = { ...timelineAt(i / STEPS, R, portrait).view };
        expect(Math.abs(v.yaw - prev.yaw)).toBeLessThan(0.25);
        expect(Math.abs(v.pitch - prev.pitch)).toBeLessThan(0.25);
        expect(Math.abs(v.fovScale - prev.fovScale)).toBeLessThan(0.002);
        prev = v;
      }
    }
  });
  it('uses the portrait yaw column only when asked', () => {
    expect(timelineAt(mid('darch'), R).view.yaw).toBe(7);
    expect(timelineAt(mid('darch'), R, true).view.yaw).toBe(12);
    expect(timelineAt(mid('summers'), R, true).view).toEqual({ yaw: -12, pitch: 3, fovScale: 0.97 });
  });
});

describe('timelineAt: scrubbed values (latch-free)', () => {
  it('ridgeReveal: 0.01 before kalshi, 0.01 + 0.99 · easeInOut(s) across it, 1 after', () => {
    expect(timelineAt(mid('open'), R).ridgeReveal).toBe(0.01);
    expect(timelineAt(at('kalshi', 0), R).ridgeReveal).toBeCloseTo(0.01, 9);
    expect(timelineAt(at('kalshi', 0.5), R).ridgeReveal).toBeCloseTo(0.505, 9);
    expect(timelineAt(mid('heron'), R).ridgeReveal).toBe(1);
  });
  it('goes back down when g goes back (the driver latches, not the timeline)', () => {
    expect(timelineAt(at('kalshi', 0.2), R).ridgeReveal).toBeLessThan(timelineAt(at('kalshi', 0.8), R).ridgeReveal);
    expect(timelineAt(at('heron', 0.2), R).hedgeReveal).toBeLessThan(timelineAt(at('heron', 0.8), R).hedgeReveal);
  });
  it('hedgeReveal: 0 before heron, s across it, 1 after', () => {
    expect(timelineAt(mid('kalshi'), R).hedgeReveal).toBe(0);
    expect(timelineAt(at('heron', 0.25), R).hedgeReveal).toBeCloseTo(0.25, 9);
    expect(timelineAt(mid('darch'), R).hedgeReveal).toBe(1);
  });
  it('darchT is 0 everywhere before darch, s across it, 1 after', () => {
    for (let i = 0; i <= STEPS; i++) {
      const g = i / STEPS, t = timelineAt(g, R);
      const order = SECTIONS.findIndex((s) => s.id === t.section);
      if (order < 3) expect(t.darchT).toBe(0);
      if (order > 3) expect(t.darchT).toBe(1);
      if (order === 3) expect(t.darchT).toBeCloseTo(t.s, 12);
    }
  });
  it('rain ramps up over the first 30% of darch, holds through summers, ramps out over the first 40% of alive', () => {
    expect(timelineAt(mid('heron'), R).rain).toBe(0);
    expect(timelineAt(at('darch', 0.15), R).rain).toBeCloseTo(0.5, 9);
    expect(timelineAt(at('darch', 0.3), R).rain).toBeCloseTo(1, 9);
    expect(timelineAt(mid('summers'), R).rain).toBe(1);
    expect(timelineAt(at('alive', 0.2), R).rain).toBeCloseTo(0.5, 9);
    expect(timelineAt(at('alive', 0.5), R).rain).toBe(0);
    expect(timelineAt(mid('yours'), R).rain).toBe(0);
  });
  it('arms the pulse only inside alive', () => {
    for (const s of SECTIONS) expect(timelineAt(mid(s.id), R).pulseArm).toBe(s.id === 'alive');
  });
  it('returns the same object every call (allocation-free for the frame loop)', () => {
    expect(timelineAt(0.1, R)).toBe(timelineAt(0.9, R));
  });
  it('reports the section and local s from the ranges', () => {
    const t = timelineAt(at('yours', 0.4), R);
    expect(t.section).toBe('yours');
    expect(t.s).toBeCloseTo(0.4, 9);
  });
  it('works for the phone viewport ranges too (390 × 844)', () => {
    const P = rangesFor(844);
    let prev = -1;
    for (let i = 0; i <= 1000; i++) { const t = timelineAt(i / 1000, P, true).tod; expect(t).toBeGreaterThanOrEqual(prev); prev = t; }
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/valley/timeline.test.ts`
Expected: FAIL, `Failed to resolve import "./timeline" from "src/valley/timeline.test.ts"`.

- [ ] **Step 3: Write `src/valley/timeline.ts`**

```ts
// Scrubbed time (spec §3, §5.1): document progress g → time of day, view offsets and the scrubbed reveals.
// Pure and latch-free: the same g always gives the same values; the driver (src/gl/driverCore.ts) latches
// ridgeReveal and hedgeReveal and fires the pulse on pulseArm's rising edge.
import type { SectionId, SectionRange, Timeline, View } from './types';
import { SECTIONS, locate } from './sections';

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** easeInOut used by §4.6 and §5.1: cubic smoothstep on [0, 1]. */
export const easeInOut = (t: number) => { const u = clamp01(t); return u * u * (3 - 2 * u); };

/** Views ease toward the next section's over the last 25% of each section (§3). */
export const VIEW_EASE_FROM = 0.75;

/** The one Timeline object timelineAt writes into and returns (no allocation per frame). */
const OUT: Timeline = {
  tod: 0, section: 'open', s: 0, view: { yaw: 0, pitch: 0, fovScale: 1 },
  ridgeReveal: 0.01, hedgeReveal: 0, darchT: 0, rain: 0, pulseArm: false,
};

const ORDER: Record<SectionId, number> = Object.fromEntries(SECTIONS.map((s, i) => [s.id, i])) as Record<SectionId, number>;

/**
 * Timeline at document progress `g` (clamped to [0, 1]) for the measured section `ranges`.
 * `portrait` (aspect < 1) picks each section's viewPortrait (its own yaw; same pitch and fovScale).
 * Allocation-free: returns the same object every call, overwritten in place. Read it now; copy it to keep it.
 */
export function timelineAt(g: number, ranges: SectionRange[], portrait = false): Timeline {
  const gc = Number.isFinite(g) ? clamp01(g) : 0;
  const { section, s, index } = locate(gc, ranges);
  const def = SECTIONS[index];
  const todStart = index === 0 ? 0 : SECTIONS[index - 1].todEnd;
  const tod = lerp(todStart, def.todEnd, s);

  const here: View = portrait ? def.viewPortrait : def.view;
  const nextDef = SECTIONS[Math.min(index + 1, SECTIONS.length - 1)];
  const next: View = portrait ? nextDef.viewPortrait : nextDef.view;
  const k = s <= VIEW_EASE_FROM ? 0 : easeInOut((s - VIEW_EASE_FROM) / (1 - VIEW_EASE_FROM));
  OUT.view.yaw = lerp(here.yaw, next.yaw, k);
  OUT.view.pitch = lerp(here.pitch, next.pitch, k);
  OUT.view.fovScale = lerp(here.fovScale, next.fovScale, k);

  const at = ORDER[section];
  const phase = (id: SectionId) => (at < ORDER[id] ? -1 : at > ORDER[id] ? 1 : 0);
  const kalshi = phase('kalshi'), heron = phase('heron'), darch = phase('darch');
  OUT.ridgeReveal = kalshi < 0 ? 0.01 : kalshi > 0 ? 1 : 0.01 + 0.99 * easeInOut(s);
  OUT.hedgeReveal = heron < 0 ? 0 : heron > 0 ? 1 : s;
  OUT.darchT = darch < 0 ? 0 : darch > 0 ? 1 : s;

  let rain = 0;
  if (section === 'darch') rain = clamp01(s / 0.3);
  else if (section === 'summers') rain = 1;
  else if (section === 'alive') rain = 1 - clamp01(s / 0.4);

  OUT.tod = tod;
  OUT.section = section;
  OUT.s = s;
  OUT.rain = rain;
  OUT.pulseArm = section === 'alive';
  return OUT;
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run src/valley/timeline.test.ts`
Expected: PASS, 15 tests.

- [ ] **Step 5: Lint and typecheck**

Run: `npx eslint src/valley/timeline.ts src/valley/timeline.test.ts && npx tsc --noEmit 2>&1 | grep '^src/valley/'`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/valley/timeline.ts src/valley/timeline.test.ts
git commit -m "Add the scroll timeline: tod, eased views and scrubbed reveals"
```

**Verify:**
- `npx vitest run src/valley/timeline.test.ts` → 15 passed.
- `grep -n "return {" src/valley/timeline.ts` → empty (the result object is reused).
- `grep -n "Math.max(.*previous\|latch" src/valley/timeline.ts` → only the header comment (no latching here).

---

### Task 1.8: Environment: sky, fog and light by time of day **[parallel-safe]**

Spec §4.1 (three-stop sky: zenith, horizon, east horizon; stars alpha and moon position from tod; `THREE.Fog` colour and range from tod), §5.2 (`environmentAt(tod)` linear blends through keyframes at tod 0 dusk, 0.3 blue, 0.6 night, 1.0 predawn; keyframes are the palette), §9 (sky keyframes, sun/moon colour and intensity per keyframe, hemisphere sky = zenith, ground = terrain low, fog follows the horizon), §12 (no allocation), §16 ("`environmentAt` interpolates exactly at keyframes").

Readings: colours blend channel-wise in sRGB and come back as lower-case `#rrggbb` (exact palette values, lower-cased, at the keyframes). The values the palette does not hold are authored in `LIGHT`, keyed by keyframe name: fog near/far 70/260, 55/230, 45/210, 55/230; the light direction swings from the low west at dusk to high at night to the low east (+x, `EAST_DIR`) at predawn and is re-normalised after blending; stars 0, 0.35, 1, 0.4; the moon rides a 200-unit dome around the origin, rising right of frame and setting left, alpha 0, 0.6, 1, 0.5. The function is a lookup into 1,001 frozen precomputed entries (tod quantised to 0.001; all four keyframes land on entries exactly), so the driver can call it every frame without allocating.

**Files:**
- Create: `src/valley/environment.ts`
- Test: `src/valley/environment.test.ts`

**Interfaces:**
- Consumes: `PALETTE.terrainLow`, `SKY_KEYFRAMES`, `type SkyName` (`./palette`, Stage 0 Task 0.4); `Environment`, `Vec3` (`./types`).
- Produces (contract): `environmentAt(tod: number): Environment`.
- Produces (extra): `EAST_DIR: Vec3 = [1, 0, 0]` (Stage 2's sky shader blends the east colour toward this direction), `LIGHT: Record<SkyName, { fogNear; fogFar; sunDir; starAlpha; moonPos; moonAlpha }>`, `ENV_STEPS = 1000`.

- [ ] **Step 1: Write the failing test `src/valley/environment.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { environmentAt, LIGHT } from './environment';
import { PALETTE, SKY_KEYFRAMES } from './palette';

const lc = (s: string) => s.toLowerCase();
const rgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

describe('environmentAt', () => {
  it('has the four keyframes at tod 0, 0.3, 0.6, 1 (dusk, blue, night, predawn)', () => {
    expect(SKY_KEYFRAMES.map((k) => [k.name, k.tod])).toEqual([['dusk', 0], ['blue', 0.3], ['night', 0.6], ['predawn', 1]]);
  });
  it.each(SKY_KEYFRAMES.map((k) => [k.name, k] as const))('equals the palette exactly at the %s keyframe', (_n, k) => {
    const e = environmentAt(k.tod);
    expect(e.zenith).toBe(lc(k.zenith));
    expect(e.horizon).toBe(lc(k.horizon));
    expect(e.east).toBe(lc(k.east));
    expect(e.sunColor).toBe(lc(k.sun));
    expect(e.sunIntensity).toBeCloseTo(k.sunIntensity, 12);
    expect(e.fogNear).toBeCloseTo(LIGHT[k.name].fogNear, 12);
    expect(e.starAlpha).toBeCloseTo(LIGHT[k.name].starAlpha, 12);
  });
  it('fog follows the horizon; hemisphere sky is the zenith, ground the terrain low', () => {
    for (const tod of [0, 0.17, 0.45, 0.8, 1]) {
      const e = environmentAt(tod);
      expect(e.fogColor).toBe(e.horizon);
      expect(e.hemiSky).toBe(e.zenith);
      expect(e.hemiGround).toBe(lc(PALETTE.terrainLow));
    }
  });
  it('blends linearly between keyframes (midway dusk → blue)', () => {
    const e = environmentAt(0.15);
    const a = rgb(SKY_KEYFRAMES[0].horizon), b = rgb(SKY_KEYFRAMES[1].horizon), m = rgb(e.horizon);
    for (let i = 0; i < 3; i++) expect(Math.abs(m[i] - (a[i] + b[i]) / 2)).toBeLessThanOrEqual(1);
    expect(e.sunIntensity).toBeCloseTo((0.6 + 0.35) / 2, 9);
    expect(e.fogFar).toBeCloseTo((LIGHT.dusk.fogFar + LIGHT.blue.fogFar) / 2, 9);
  });
  it('keeps sunDir unit length, alphas in [0, 1], fog near < far, colours as #rrggbb', () => {
    for (let i = 0; i <= 100; i++) {
      const e = environmentAt(i / 100);
      expect(Math.hypot(...e.sunDir)).toBeCloseTo(1, 9);
      for (const a of [e.starAlpha, e.moonAlpha]) { expect(a).toBeGreaterThanOrEqual(0); expect(a).toBeLessThanOrEqual(1); }
      expect(e.fogNear).toBeLessThan(e.fogFar);
      for (const c of [e.zenith, e.horizon, e.east, e.fogColor, e.sunColor, e.hemiSky, e.hemiGround]) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
  it('clamps tod and maps NaN to dusk', () => {
    expect(environmentAt(-3)).toBe(environmentAt(0));
    expect(environmentAt(7)).toBe(environmentAt(1));
    expect(environmentAt(Number.NaN)).toBe(environmentAt(0));
  });
  it('returns a frozen, shared object for the same tod (no allocation in the frame loop)', () => {
    expect(environmentAt(0.4321)).toBe(environmentAt(0.4321));
    expect(Object.isFrozen(environmentAt(0.5))).toBe(true);
  });
  it('is darkest at night: the night zenith is darker than dusk and predawn', () => {
    const sum = (h: string) => rgb(h).reduce((x, y) => x + y, 0);
    expect(sum(environmentAt(0.6).zenith)).toBeLessThan(sum(environmentAt(0).zenith));
    expect(sum(environmentAt(0.6).zenith)).toBeLessThan(sum(environmentAt(1).zenith));
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/valley/environment.test.ts`
Expected: FAIL, `Failed to resolve import "./environment" from "src/valley/environment.test.ts"`.

- [ ] **Step 3: Write `src/valley/environment.ts`**

```ts
// Sky, fog and light by time of day (spec §4.1, §5.2, §9): linear blends through the four palette keyframes
// SKY_KEYFRAMES (tod 0 dusk, 0.3 blue, 0.6 night, 1.0 predawn). Fog colour follows the horizon; the hemisphere sky
// is the zenith and its ground the terrain's low colour. The non-colour values per keyframe (fog range, light
// direction, stars, moon) are authored here in LIGHT, keyed by the same names.
// Precomputed at module load for tod in steps of 0.001, so environmentAt never allocates in the frame loop.
import type { Environment, Vec3 } from './types';
import { PALETTE, SKY_KEYFRAMES, type SkyName } from './palette';

/** World direction of the east horizon colour (§4.1 three-stop sky): +x, the right of the hero frame. */
export const EAST_DIR: Vec3 = [1, 0, 0];

/** Per-keyframe values the palette does not hold. moonPos is a world point on a 200-unit dome around the origin. */
export const LIGHT: Record<SkyName, { fogNear: number; fogFar: number; sunDir: Vec3; starAlpha: number; moonPos: Vec3; moonAlpha: number }> = {
  dusk:    { fogNear: 70, fogFar: 260, sunDir: [-0.85, 0.18, -0.5], starAlpha: 0,    moonPos: [120, 15, -155], moonAlpha: 0 },
  blue:    { fogNear: 55, fogFar: 230, sunDir: [-0.6, 0.35, -0.7],  starAlpha: 0.35, moonPos: [90, 32, -173],  moonAlpha: 0.6 },
  night:   { fogNear: 45, fogFar: 210, sunDir: [0.3, 0.8, -0.5],    starAlpha: 1,    moonPos: [40, 42, -191],  moonAlpha: 1 },
  predawn: { fogNear: 55, fogFar: 230, sunDir: [0.75, 0.3, -0.6],   starAlpha: 0.4,  moonPos: [-60, 45, -185], moonAlpha: 0.5 },
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Channel-wise blend of two #rrggbb colours in sRGB, as lower-case #rrggbb; exact at t = 0 and t = 1. */
function mixHex(a: string, b: string, t: number): string {
  if (t <= 0) return a.toLowerCase();
  if (t >= 1) return b.toLowerCase();
  const A = hexToRgb(a), B = hexToRgb(b);
  let out = '#';
  for (let i = 0; i < 3; i++) out += Math.round(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, '0');
  return out;
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function mixVec(a: Vec3, b: Vec3, t: number, normalise: boolean): Vec3 {
  const x = lerp(a[0], b[0], t), y = lerp(a[1], b[1], t), z = lerp(a[2], b[2], t);
  if (!normalise) return [x, y, z];
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

function compute(tod: number): Environment {
  let k = 0;
  while (k < SKY_KEYFRAMES.length - 2 && tod > SKY_KEYFRAMES[k + 1].tod) k++;
  const a = SKY_KEYFRAMES[k], b = SKY_KEYFRAMES[k + 1];
  const la = LIGHT[a.name], lb = LIGHT[b.name];
  const t = Math.min(1, Math.max(0, (tod - a.tod) / (b.tod - a.tod)));
  const zenith = mixHex(a.zenith, b.zenith, t);
  const horizon = mixHex(a.horizon, b.horizon, t);
  return Object.freeze({
    zenith,
    horizon,
    east: mixHex(a.east, b.east, t),
    fogColor: horizon,
    fogNear: lerp(la.fogNear, lb.fogNear, t),
    fogFar: lerp(la.fogFar, lb.fogFar, t),
    sunDir: mixVec(la.sunDir, lb.sunDir, t, true),
    sunColor: mixHex(a.sun, b.sun, t),
    sunIntensity: lerp(a.sunIntensity, b.sunIntensity, t),
    hemiSky: zenith,
    hemiGround: PALETTE.terrainLow.toLowerCase(),
    starAlpha: lerp(la.starAlpha, lb.starAlpha, t),
    moonPos: mixVec(la.moonPos, lb.moonPos, t, false),
    moonAlpha: lerp(la.moonAlpha, lb.moonAlpha, t),
  });
}

export const ENV_STEPS = 1000;
const TABLE: readonly Environment[] = Array.from({ length: ENV_STEPS + 1 }, (_, i) => compute(i / ENV_STEPS));

/** Environment at time of day `tod` (clamped to [0, 1], NaN → 0), quantised to 0.001. Frozen and shared; never allocates. */
export function environmentAt(tod: number): Environment {
  const t = Number.isFinite(tod) ? Math.min(1, Math.max(0, tod)) : 0;
  return TABLE[Math.round(t * ENV_STEPS)];
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run src/valley/environment.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Lint and typecheck**

Run: `npx eslint src/valley/environment.ts src/valley/environment.test.ts && npx tsc --noEmit 2>&1 | grep '^src/valley/'`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/valley/environment.ts src/valley/environment.test.ts
git commit -m "Add the environment blend: sky, fog, light, stars and moon by time of day"
```

**Verify:**
- `npx vitest run src/valley/environment.test.ts` → 11 passed.
- `grep -n "#[0-9a-fA-F]\{6\}" src/valley/environment.ts` → empty (every colour comes from `palette.ts`).

---

### Task 1.9: Ignition: the hero chain schedule and levels **[parallel-safe]**

Spec §1 (the chain in five seconds), §4.5 (mill rows: row r lights at darchT 0.03 + 0.03r, goes out at 0.78 + 0.05(3 − r); the chain plays the curve once over 1.4 s), §4.6 (trickle 0 → 0.01 over 1.2 s), §5.3 (the table: hut 0.800/0.5 flicker then hold, nist 1.800/0.3, mill 2.400/1.4, kalshiLamp 2.760/0.3, wvu 2.976/0.3, bar1…bar4 3.106 + 0.05·i/0.3, hill1…hill5 and visitor 3.600/0.4 catch stagger 0.04, ridge 3.800/1.2 trickle; the five chain gaps 1.000, 0.600, 0.360, 0.216, 0.1296 s, each 60% of the last to ±1 ms; the chain ends at 5.000 s; reduced motion or `introPlayed`: final states at T0), §16.

Readings: the bar times are the spec's rounded 3.106 + 0.05·i (the wvu → bar1 gap is then 0.130, 0.4 ms from 0.1296, inside ±1 ms). Hillside steps keep `at: 3.6` and put the per-target delay in `stagger` (0.04·i), and `ignitionLevel` starts a step at `at + stagger`; the last hillside catch then ends at 4.2 s and the ridge trickle at exactly 5.0 s. A catch flares to 1.6 by 35% of its duration and settles to 1; the hut's flicker is four fixed beats (0.9, 0.15, 1.2, 0.4) then a ramp to 1. For `mill` the level is the lit-row fraction of the §4.5 curve, 0 again at the end (darch ended); for `trickle` it is the ridge reveal itself. `finalLevel(step)` is the level at t = ∞, which the driver uses at T0 under reduced motion or `introPlayed`; `ignitionSchedule()` itself stays the full table (the driver decides not to play it).

**Files:**
- Create: `src/valley/ignition.ts`
- Test: `src/valley/ignition.test.ts`

**Interfaces:**
- Consumes: `EmitterId`, `IgnitionStep` (`./types`).
- Produces (contract): `CHAIN_END = 5.0`; `ignitionSchedule(): IgnitionStep[]`; `ignitionLevel(step: IgnitionStep, t: number): number`.
- Produces (extra): `millRowLit(darchT: number, row: number): boolean`, `millRows(darchT: number): number` (0–4; Stage 2/3 `Windows.tsx` and the driver use the same §4.5 rule), `finalLevel(step: IgnitionStep): number`.

- [ ] **Step 1: Write the failing test `src/valley/ignition.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import type { IgnitionStep } from './types';
import { CHAIN_END, ignitionSchedule, ignitionLevel, finalLevel, millRows, millRowLit } from './ignition';

const S = ignitionSchedule();
const step = (target: string) => S.find((s) => s.target === target)!;
const start = (s: IgnitionStep) => s.at + (s.stagger ?? 0);

describe('ignitionSchedule', () => {
  it('lists every §5.3 target once, in the spec order', () => {
    expect(S.map((s) => s.target)).toEqual(['hut', 'nist', 'mill', 'kalshiLamp', 'wvu', 'bar1', 'bar2', 'bar3', 'bar4',
      'hill1', 'hill2', 'hill3', 'hill4', 'hill5', 'visitor', 'ridge']);
  });
  it('has the §5.3 times, durations and kinds', () => {
    expect(step('hut')).toEqual({ target: 'hut', at: 0.8, dur: 0.5, kind: 'flicker' });
    expect(step('mill')).toEqual({ target: 'mill', at: 2.4, dur: 1.4, kind: 'mill' });
    expect(step('ridge')).toEqual({ target: 'ridge', at: 3.8, dur: 1.2, kind: 'trickle' });
    ['bar1', 'bar2', 'bar3', 'bar4'].forEach((b, i) => expect(step(b).at).toBeCloseTo(3.106 + 0.05 * i, 9));
    ['hill1', 'hill2', 'hill3', 'hill4', 'hill5', 'visitor'].forEach((h, i) => {
      expect(step(h)).toMatchObject({ at: 3.6, dur: 0.4, kind: 'catch' });
      expect(step(h).stagger).toBeCloseTo(0.04 * i, 12);
    });
  });
  it('makes each chain gap 60% of the last, to ±1 ms (abstraction is a force multiplier)', () => {
    const chain = ['hut', 'nist', 'mill', 'kalshiLamp', 'wvu', 'bar1'].map((t) => step(t).at);
    const gaps = chain.slice(1).map((a, i) => a - chain[i]);
    const expected = [1.0, 0.6, 0.36, 0.216, 0.1296];
    gaps.forEach((g, i) => expect(Math.abs(g - expected[i])).toBeLessThanOrEqual(0.001));
    for (let i = 1; i < gaps.length; i++) expect(Math.abs(gaps[i] - 0.6 * gaps[i - 1])).toBeLessThanOrEqual(0.001);
  });
  it('ends at exactly CHAIN_END = 5.0 s', () => {
    expect(CHAIN_END).toBe(5.0);
    expect(Math.max(...S.map((s) => start(s) + s.dur))).toBeCloseTo(CHAIN_END, 12);
  });
});

describe('ignitionLevel', () => {
  it('is 0 before every step starts (and for NaN)', () => {
    for (const s of S) {
      expect(ignitionLevel(s, start(s) - 0.001)).toBe(0);
      expect(ignitionLevel(s, Number.NaN)).toBe(0);
    }
  });
  it('catches flare to at most 1.6 and settle to exactly 1', () => {
    const nist = step('nist');
    let peak = 0;
    for (let t = 1.8; t <= 2.1; t += 0.001) peak = Math.max(peak, ignitionLevel(nist, t));
    expect(peak).toBeGreaterThan(1.55); expect(peak).toBeLessThanOrEqual(1.6);
    expect(ignitionLevel(nist, 2.1)).toBe(1);
    expect(ignitionLevel(step('visitor'), 3.6 + 0.2 + 0.4)).toBe(1);
  });
  it('flickers the hut then holds it at 1', () => {
    const hut = step('hut');
    expect(ignitionLevel(hut, 0.8 + 0.1)).toBeLessThan(0.5);   // the dip at 15–30% of the 0.5 s
    expect(ignitionLevel(hut, 1.3)).toBe(1);
    expect(ignitionLevel(hut, 60)).toBe(1);
  });
  it('plays the §4.5 mill curve: floods bottom-up, holds, ends dark', () => {
    const mill = step('mill');
    expect(ignitionLevel(mill, 2.4 + 1.4 * 0.5)).toBe(1);
    expect(ignitionLevel(mill, 2.4 + 1.4 * 0.04)).toBe(0.25);
    expect(ignitionLevel(mill, 3.8)).toBe(0);
    expect(ignitionLevel(mill, 4.5)).toBe(0);
  });
  it('trickles the ridge reveal 0 → 0.01 over 1.2 s', () => {
    const r = step('ridge');
    expect(ignitionLevel(r, 4.4)).toBeCloseTo(0.005, 9);
    expect(ignitionLevel(r, 5.0)).toBeCloseTo(0.01, 12);
    expect(ignitionLevel(r, 9)).toBeCloseTo(0.01, 12);
  });
  it('gives the final states: everything lit at 1, the mill dark, the ridge at 0.01', () => {
    for (const s of S) {
      const want = s.target === 'mill' ? 0 : s.target === 'ridge' ? 0.01 : 1;
      expect(finalLevel(s)).toBeCloseTo(want, 12);
    }
  });
});

describe('mill rows (§4.5)', () => {
  it('lights row r at darchT 0.03 + 0.03r and puts it out at 0.78 + 0.05(3 − r)', () => {
    for (let r = 0; r < 4; r++) {
      const on = 0.03 + 0.03 * r, off = 0.78 + 0.05 * (3 - r);
      expect(millRowLit(on - 1e-9, r)).toBe(false);
      expect(millRowLit(on, r)).toBe(true);
      expect(millRowLit(off - 1e-9, r)).toBe(true);
      expect(millRowLit(off, r)).toBe(false);
    }
    expect([0, 0.04, 0.07, 0.1, 0.15, 0.5, 0.8, 0.85, 0.9, 0.95, 1].map(millRows)).toEqual([0, 1, 2, 3, 4, 4, 3, 2, 1, 0, 0]);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/valley/ignition.test.ts`
Expected: FAIL, `Failed to resolve import "./ignition" from "src/valley/ignition.test.ts"`.

- [ ] **Step 3: Write `src/valley/ignition.ts`**

```ts
// The hero ignition chain (spec §1, §5.3, §4.5): times in seconds from T0 (the end of the canvas fade-in).
// Each chain gap is 60% of the previous one: hut → nist → mill → kalshiLamp → wvu → bar1 = 1, 0.6, 0.36, 0.216, 0.1296 s.
// Reduced motion or sessionStorage.introPlayed: the driver skips the schedule and uses finalLevel() at T0.
import type { EmitterId, IgnitionStep } from './types';

export const CHAIN_END = 5.0;

const BARS: EmitterId[] = ['bar1', 'bar2', 'bar3', 'bar4'];
const HILLSIDE: EmitterId[] = ['hill1', 'hill2', 'hill3', 'hill4', 'hill5', 'visitor'];

/** The §5.3 table, one step per target. A fresh array each call (called once at T0, never per frame). */
export function ignitionSchedule(): IgnitionStep[] {
  return [
    { target: 'hut', at: 0.8, dur: 0.5, kind: 'flicker' },
    { target: 'nist', at: 1.8, dur: 0.3, kind: 'catch' },
    { target: 'mill', at: 2.4, dur: 1.4, kind: 'mill' },
    { target: 'kalshiLamp', at: 2.76, dur: 0.3, kind: 'catch' },
    { target: 'wvu', at: 2.976, dur: 0.3, kind: 'catch' },
    ...BARS.map((target, i): IgnitionStep => ({ target, at: 3.106 + 0.05 * i, dur: 0.3, kind: 'catch' })),
    // The hillside lights together: every step at 3.6, `stagger` is this target's extra delay (0.04 apart).
    ...HILLSIDE.map((target, i): IgnitionStep => ({ target, at: 3.6, dur: 0.4, kind: 'catch', stagger: 0.04 * i })),
    { target: 'ridge', at: 3.8, dur: 1.2, kind: 'trickle' },
  ];
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (e0: number, e1: number, x: number) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

/** §4.5: how many of the mill's four window rows are lit at darchT. Row r lights at 0.03 + 0.03r, goes out at 0.78 + 0.05(3 − r). */
export function millRowLit(darchT: number, row: number): boolean {
  return darchT >= 0.03 + 0.03 * row && darchT < 0.78 + 0.05 * (3 - row);
}
export function millRows(darchT: number): number {
  let n = 0;
  for (let r = 0; r < 4; r++) if (millRowLit(darchT, r)) n++;
  return n;
}

/** The hut's flicker-then-hold over its 0.5 s (u = 0..1): four deterministic beats, then a ramp to 1. */
function flicker(u: number): number {
  if (u < 0.15) return 0.9;
  if (u < 0.3) return 0.15;
  if (u < 0.45) return 1.2;
  if (u < 0.55) return 0.4;
  return 0.4 + 0.6 * smoothstep(0.55, 1, u);
}
/** A catch: flare to 1.6 by 35% of the step, settle to 1 by its end. */
function catchCurve(u: number): number {
  return u < 0.35 ? 1.6 * smoothstep(0, 0.35, u) : 1.6 - 0.6 * smoothstep(0.35, 1, u);
}

/**
 * Level of `step`'s target at wall time `t` seconds since T0. For 'flicker' and 'catch' it is brightness 0..1.6
 * (0 before, 1 after). For 'mill' it is the lit-row fraction of the §4.5 curve played over the step (0 before, and
 * 0 again after: the mill ends dark). For 'trickle' it is the ridge reveal, 0 → 0.01 linear (0.01 after).
 */
export function ignitionLevel(step: IgnitionStep, t: number): number {
  const start = step.at + (step.stagger ?? 0);
  if (!(t >= start)) return 0;   // also catches NaN
  const u = clamp01((t - start) / step.dur);
  switch (step.kind) {
    case 'flicker': return u >= 1 ? 1 : flicker(u);
    case 'catch': return u >= 1 ? 1 : catchCurve(u);
    case 'mill': return millRows(u) / 4;
    case 'trickle': return 0.01 * u;
  }
}

/** The state every target is in once the chain is over (and at T0 under reduced motion or introPlayed). */
export function finalLevel(step: IgnitionStep): number {
  return ignitionLevel(step, Number.POSITIVE_INFINITY);
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run src/valley/ignition.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Lint and typecheck**

Run: `npx eslint src/valley/ignition.ts src/valley/ignition.test.ts && npx tsc --noEmit 2>&1 | grep '^src/valley/'`
Expected: no output. (The `switch` in `ignitionLevel` covers every `IgnitionKind`; tsc proves the function always returns.)

- [ ] **Step 6: Commit**

```bash
git add src/valley/ignition.ts src/valley/ignition.test.ts
git commit -m "Add the ignition chain: schedule, 60% gaps, levels and the mill rows"
```

**Verify:**
- `npx vitest run src/valley/ignition.test.ts` → 11 passed, including `makes each chain gap 60% of the last, to ±1 ms` and `ends at exactly CHAIN_END = 5.0 s`.
- The table in `ignitionSchedule` reads line for line like spec §5.3.

---

### Task 1.10: House grammar and SVG elevation **[parallel-safe]** (after 1.1)

Spec §3.2 (the five hillside sentences), §5.4 (the grammar, exactly: `seed = hashString(sentence.trim().toLowerCase())`; `words` whitespace-split non-empty count clamped 1–24; `tiers = 1 + floor((words − 1) / 8)`; `bays = 2 + floor(words / 3)`; `width = bays`; `depth = 3 + ((seed >>> 2) % 2)`; `roof = ['pitched', 'hipped', 'flat'][(seed >>> 4) % 3]`; `windowsPerFace = { front: floor(width / 2), back: floor(width / 2), side: 1 + ((seed >>> 6) % 2) }` per tier; `porch = (seed & 1) === 1`; parts in build order bottom to top: wall planks one per 0.5 of wall length per 0.25 course over a 2.5 tier on four faces, roof slats one per 0.25 of width per side (two sides pitched/hipped, one slab of width/0.25 for flat), four frame parts per window, four porch posts, one chimney; the worked examples ≈233 and ≈1,933; `parts.length` is what the tag prints; `houseSvg` for the no-WebGL tier; deterministic; colours from the dark ramp), §11 (no-GL SVG with the same parts count), §12 (zero parts or an empty sentence), §16 (deterministic, 1–3 tiers, 150–2,200 parts, worked examples ±5%, `houseSvg` balanced tags), index Review Focus 1 (empty, whitespace, 140+ characters, one 60-character word).

Readings: house-local space has its origin at the ground centre of the footprint, x along the width, the front face toward +z (the camera), y up. Planks are 0.1 thick inside the wall line; windows are 0.7 × 0.8 with the sill at 1.0 above each tier's floor, framed by four 0.08 bars standing 0.06 proud of the face; `windows` holds each window's centre on the face. Pitched and hipped roofs rise `0.6 · depth / 2`, flat roofs are a 0.15 slab. Every part is an axis-aligned box (Stage 4 renders one box per part), so a sloped side is four stepped courses from the eave to the ridge line, `width` slats each; hipped courses also step in from the gable ends; the total is §5.4's `width / 0.25` per side. Porch posts stand in a row 1.2 in front of the front face, 2.2 tall. The chimney stands at the back right through the roof. Build order is a stable sort by each part's lowest y, and `order` equals the index. The worked examples hold only for the depth, side count and porch they assume (a one-word sentence with depth 4 has 281 parts), so the tests pin sentences whose seeds give those choices: `timer` (233 exactly) and a 24-word sentence (1,933 exactly). The SVG is a front elevation at 20 px per unit: wall and roof from `PALETTE.wall` and `PALETTE.roof`, front windows `PALETTE.warm` (lit), porch posts in the roof colour, only self-closing children inside one `<svg>`, `aria-hidden` because the tag beside it carries the counts.

**Files:**
- Create: `src/valley/house.ts`
- Test: `src/valley/house.test.ts`

**Interfaces:**
- Consumes: `hashString` (`./hash`, Task 1.1); `PALETTE.wall`, `PALETTE.roof`, `PALETTE.warm` (`./palette`); `House`, `HousePart`, `RoofKind`, `Vec3` (`./types`).
- Produces (contract): `houseFromSentence(sentence: string): House`; `houseSvg(house: House): string`.
- Produces (extra): `HOUSE` (the grammar constants above), `ROOF_COURSES = 4`, `countWords(sentence: string): number`, `roofRise(roof: RoofKind, depth: number): number`, `expectedParts(h): number` (the §5.4 count formula).

- [ ] **Step 1: Write the failing test `src/valley/house.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import type { House } from './types';
import { houseFromSentence, houseSvg, expectedParts, countWords, roofRise, HOUSE, ROOF_COURSES } from './house';
import { hashString } from './hash';

const HILLSIDE = [
  'a discord bot for my middle school server',
  'a trading algorithm for kalshi',
  'a pipeline that made three thousand videos a month',
  'a help-desk assistant that reads the docs for you',
  'a pricing model for free-drinks promos at bars',
];
const WORKED_24 = 'a bot that reads every menu in town each morning and tells me where the soup is good today and which places are closed';
const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');
const CORPUS = [
  '', '   ', '\n\t  ', 'x', 'a'.repeat(60), 'b'.repeat(140), ...HILLSIDE,
  words(140 / 5), 'z '.repeat(70).trim(), ...Array.from({ length: 30 }, (_, i) => words(i + 1)),
];

describe('houseFromSentence: inputs', () => {
  it.each([
    ['', 1], ['   ', 1], ['\n\t ', 1], ['a'.repeat(60), 1], ['one', 1],
    ['a trading algorithm for kalshi', 5], [words(24), 24], [words(40), 24], ['z '.repeat(70), 24],
  ])('counts %j as %i words (clamped 1–24)', (s, n) => {
    expect(countWords(s)).toBe(n);
    expect(houseFromSentence(s).words).toBe(n);
  });
  it('never throws and never yields zero parts, for every corpus input', () => {
    for (const s of CORPUS) {
      const h = houseFromSentence(s);
      expect(h.parts.length).toBeGreaterThan(0);
      expect(h.windows.length).toBeGreaterThan(0);
    }
  });
});

describe('houseFromSentence: the §5.4 formulas', () => {
  it.each(CORPUS.map((s) => [JSON.stringify(s).slice(0, 40), s]))('%s follows every formula', (_label, s) => {
    const h = houseFromSentence(s);
    const seed = hashString(s.trim().toLowerCase());
    expect(h.seed).toBe(seed);
    expect(h.tiers).toBe(1 + Math.floor((h.words - 1) / 8));
    expect(h.bays).toBe(2 + Math.floor(h.words / 3));
    expect(h.width).toBe(h.bays);
    expect(h.depth).toBe(3 + ((seed >>> 2) % 2));
    expect(h.roof).toBe(['pitched', 'hipped', 'flat'][(seed >>> 4) % 3]);
    expect(h.windowsPerFace).toEqual({ front: Math.floor(h.width / 2), back: Math.floor(h.width / 2), side: 1 + ((seed >>> 6) % 2) });
    expect(h.porch).toBe((seed & 1) === 1);
    expect(h.parts.length).toBe(expectedParts(h));
  });
  it('keeps tiers in 1–3 and parts in 150–2,200 for every corpus input (§16)', () => {
    for (const s of CORPUS) {
      const h = houseFromSentence(s);
      expect(h.tiers).toBeGreaterThanOrEqual(1); expect(h.tiers).toBeLessThanOrEqual(3);
      expect(h.parts.length).toBeGreaterThanOrEqual(150); expect(h.parts.length).toBeLessThanOrEqual(2200);
    }
  });
  it('counts parts by kind exactly as §5.4 lists them', () => {
    for (const s of [...HILLSIDE, words(1), words(24)]) {
      const h = houseFromSentence(s);
      const n = (k: string) => h.parts.filter((p) => p.kind === k).length;
      expect(n('plank')).toBe(2 * (h.width + h.depth) * 2 * 10 * h.tiers);
      expect(n('slat')).toBe((h.width / 0.25) * (h.roof === 'flat' ? 1 : 2));
      expect(n('frame')).toBe(4 * h.windows.length);
      expect(h.windows.length).toBe((h.windowsPerFace.front + h.windowsPerFace.back + 2 * h.windowsPerFace.side) * h.tiers);
      expect(n('post')).toBe(h.porch ? 4 : 0);
      expect(n('chimney')).toBe(1);
    }
  });
});

describe('houseFromSentence: worked examples (§5.4, ±5%)', () => {
  // The examples assume depth 3 / side 1 / no porch (1 word) and depth 4 / side 2 / porch (24 words); those come
  // from the seed, so each test pins a sentence whose seed gives exactly those choices.
  it('1 word ("timer") → bays 2, depth 3, perimeter 10, 200 + 16 + 16 + 1 = 233 parts', () => {
    const h = houseFromSentence('timer');
    expect([h.words, h.bays, h.width, h.depth, h.tiers, h.windowsPerFace.side, h.porch]).toEqual([1, 2, 2, 3, 1, 1, false]);
    expect(h.roof).not.toBe('flat');
    expect(h.parts.length).toBe(233);
    expect(Math.abs(h.parts.length - 233) / 233).toBeLessThanOrEqual(0.05);
  });
  it('24 words → bays 10, depth 4, 3 tiers, 1,680 + 80 + 168 + 4 + 1 = 1,933 parts', () => {
    const h = houseFromSentence(WORKED_24);
    expect([h.words, h.bays, h.width, h.depth, h.tiers, h.windowsPerFace.side, h.porch]).toEqual([24, 10, 10, 4, 3, 2, true]);
    expect(h.roof).not.toBe('flat');
    expect(h.parts.length).toBe(1933);
    expect(Math.abs(h.parts.length - 1933) / 1933).toBeLessThanOrEqual(0.05);
  });
});

describe('houseFromSentence: determinism and geometry', () => {
  it('builds the same house for the same sentence, ignoring case and outer whitespace', () => {
    for (const s of HILLSIDE) expect(houseFromSentence(s)).toEqual(houseFromSentence(s));
    expect(houseFromSentence('  A Trading Algorithm for Kalshi \n')).toEqual(houseFromSentence('a trading algorithm for kalshi'));
  });
  it('lists parts in build order: order === index, bottom to top', () => {
    for (const s of [HILLSIDE[0], words(24)]) {
      const h = houseFromSentence(s);
      h.parts.forEach((p, i) => {
        expect(p.order).toBe(i);
        if (i > 0) expect(p.min[1]).toBeGreaterThanOrEqual(h.parts[i - 1].min[1]);
      });
      expect(h.parts[h.parts.length - 1].kind === 'slat' || h.parts[h.parts.length - 1].kind === 'chimney').toBe(true);
    }
  });
  it('gives every part a finite, non-empty box inside the house envelope', () => {
    for (const s of [...HILLSIDE, words(24), '']) {
      const h: House = houseFromSentence(s);
      for (const p of h.parts) {
        for (let a = 0; a < 3; a++) {
          expect(Number.isFinite(p.min[a]) && Number.isFinite(p.max[a])).toBe(true);
          expect(p.max[a]).toBeGreaterThan(p.min[a]);
        }
        expect(p.min[1]).toBeGreaterThanOrEqual(0);
        expect(Math.abs(p.min[0])).toBeLessThanOrEqual(h.width / 2 + 0.3);
        expect(p.max[2]).toBeLessThanOrEqual(h.depth / 2 + 1.35 + 1e-9);
      }
    }
  });
  it('steps sloped roofs up from the eaves to the ridge line inside the roof band', () => {
    for (const s of [...HILLSIDE, 'timer', WORKED_24]) {
      const h = houseFromSentence(s);
      const top = h.tiers * HOUSE.tierHeight, rise = roofRise(h.roof, h.depth);
      const slats = h.parts.filter((p) => p.kind === 'slat');
      for (const p of slats) { expect(p.min[1]).toBeGreaterThanOrEqual(top - 1e-9); expect(p.max[1]).toBeLessThanOrEqual(top + rise + 1e-9); }
      if (h.roof !== 'flat') {
        const highest = slats.filter((p) => p.max[1] > top + rise - 1e-9 && p.min[2] >= 0);
        expect(highest.length).toBe(h.width);   // one top course on the front side
        for (const p of highest) expect(p.max[2]).toBeLessThanOrEqual((h.depth / 2 + HOUSE.overhang) / ROOF_COURSES + 1e-9);
      }
    }
  });
  it('puts windows on the four faces at each tier, centred in the window band', () => {
    const h = houseFromSentence(words(17));   // 3 tiers
    const ys = new Set(h.windows.map((w) => w[1]));
    expect([...ys].sort()).toEqual([0, 1, 2].map((t) => t * HOUSE.tierHeight + HOUSE.window.sill + HOUSE.window.h / 2));
    for (const [x, , z] of h.windows) {
      const onFrontBack = Math.abs(Math.abs(z) - (h.depth / 2 + HOUSE.window.out / 2)) < 1e-9;
      const onSide = Math.abs(Math.abs(x) - (h.width / 2 + HOUSE.window.out / 2)) < 1e-9;
      expect(onFrontBack || onSide).toBe(true);
    }
  });
});

describe('houseSvg', () => {
  /** Every element is self-closing or closed in order; returns the open-tag count. */
  function balanced(svg: string): boolean {
    const stack: string[] = [];
    for (const m of svg.matchAll(/<(\/?)([a-z]+)[^>]*?(\/?)>/g)) {
      const [, close, name, self] = m;
      if (self) continue;
      if (close) { if (stack.pop() !== name) return false; } else stack.push(name);
    }
    return stack.length === 0;
  }
  it('is one balanced <svg> element for every corpus input', () => {
    for (const s of CORPUS) {
      const svg = houseSvg(houseFromSentence(s));
      expect(svg.startsWith('<svg ')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      expect(balanced(svg)).toBe(true);
      expect(svg).not.toMatch(/NaN|undefined|Infinity/);
    }
  });
  it('draws one lit rect per front window', () => {
    const h = houseFromSentence(words(24));
    const svg = houseSvg(h);
    const lit = svg.match(/fill="#FFC98A"/gi) ?? [];
    expect(lit.length).toBe(h.windowsPerFace.front * h.tiers);
  });
  it('is deterministic', () => {
    expect(houseSvg(houseFromSentence(HILLSIDE[2]))).toBe(houseSvg(houseFromSentence(HILLSIDE[2])));
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/valley/house.test.ts`
Expected: FAIL, `Failed to resolve import "./house" from "src/valley/house.test.ts"`.

- [ ] **Step 3: Write `src/valley/house.ts`**

```ts
// The house grammar (spec §5.4): one sentence → one house of real parts. parts.length is the number the tag prints.
// House-local space: origin at the ground centre of the footprint, x along the width (front face toward +z, the
// camera), y up. Every part is an axis-aligned box {min, max}; sloped roof sides are stepped courses of slats.
import type { House, HousePart, RoofKind, Vec3 } from './types';
import { hashString } from './hash';
import { PALETTE } from './palette';

/** Grammar constants (§5.4). */
export const HOUSE = {
  maxWords: 24,
  tierHeight: 2.5,     // one storey
  course: 0.25,        // plank height
  plank: 0.5,          // plank length along a wall
  slat: 0.25,          // roof slat width along x
  wall: 0.1,           // wall thickness
  pitch: 0.6,          // pitched/hipped rise = pitch · depth / 2
  window: { w: 0.7, h: 0.8, sill: 1.0, bar: 0.08, out: 0.06 },
  overhang: 0.2,
} as const;

/** Stepped courses per sloped roof side (pitched and hipped). width / 0.25 is always divisible by 4. */
export const ROOF_COURSES = 4;

const ROOFS: readonly RoofKind[] = ['pitched', 'hipped', 'flat'];

/** Whitespace-split non-empty word count, clamped 1–24. */
export function countWords(sentence: string): number {
  const n = sentence.split(/\s+/).filter((w) => w.length > 0).length;
  return Math.min(HOUSE.maxWords, Math.max(1, n));
}

/** The roof's rise above the wall top (flat roofs are a 0.15 slab). */
export function roofRise(roof: RoofKind, depth: number): number {
  return roof === 'flat' ? 0.15 : HOUSE.pitch * (depth / 2);
}

/**
 * Build the house for `sentence`. Deterministic: the seed is FNV-1a of the trimmed, lower-cased sentence, so
 * "  Hello World " and "hello world" build the same house. Never throws; an empty sentence counts as one word.
 */
export function houseFromSentence(sentence: string): House {
  const seed = hashString(sentence.trim().toLowerCase());
  const words = countWords(sentence);
  const tiers = 1 + Math.floor((words - 1) / 8);
  const bays = 2 + Math.floor(words / 3);
  const width = bays;
  const depth = 3 + ((seed >>> 2) % 2);
  const roof = ROOFS[(seed >>> 4) % 3];
  const half = Math.floor(width / 2);
  const windowsPerFace = { front: half, back: half, side: 1 + ((seed >>> 6) % 2) };
  const porch = (seed & 1) === 1;

  const W = width / 2, D = depth / 2, T = HOUSE.wall;
  const wallTop = tiers * HOUSE.tierHeight;
  const raw: Omit<HousePart, 'order'>[] = [];
  const box = (kind: HousePart['kind'], min: Vec3, max: Vec3) => raw.push({ kind, min, max });

  // Wall planks: one per 0.5 of wall length per 0.25 course, 10 courses per tier, all four faces.
  for (let tier = 0; tier < tiers; tier++) {
    for (let c = 0; c < HOUSE.tierHeight / HOUSE.course; c++) {
      const y0 = tier * HOUSE.tierHeight + c * HOUSE.course, y1 = y0 + HOUSE.course;
      for (let i = 0; i < width / HOUSE.plank; i++) {
        const x0 = -W + i * HOUSE.plank, x1 = x0 + HOUSE.plank;
        box('plank', [x0, y0, D - T], [x1, y1, D]);          // front
        box('plank', [x0, y0, -D], [x1, y1, -D + T]);        // back
      }
      for (let i = 0; i < depth / HOUSE.plank; i++) {
        const z0 = -D + i * HOUSE.plank, z1 = z0 + HOUSE.plank;
        box('plank', [-W, y0, z0], [-W + T, y1, z1]);        // left
        box('plank', [W - T, y0, z0], [W, y1, z1]);          // right
      }
    }
  }

  // Windows: per tier, `front` on the front face, `back` on the back, `side` on each side; four frame bars each.
  const windows: Vec3[] = [];
  const { w: ww, h: wh, sill, bar, out } = HOUSE.window;
  for (let tier = 0; tier < tiers; tier++) {
    const cy = tier * HOUSE.tierHeight + sill + wh / 2;
    const y0 = cy - wh / 2, y1 = cy + wh / 2;
    const faceX = (n: number, z: number, zIn: number, zOut: number) => {
      for (let i = 0; i < n; i++) {
        const cx = -W + ((i + 0.5) * width) / n;
        windows.push([cx, cy, z]);
        const x0 = cx - ww / 2, x1 = cx + ww / 2;
        box('frame', [x0 - bar, y1, zIn], [x1 + bar, y1 + bar, zOut]);   // head
        box('frame', [x0 - bar, y0 - bar, zIn], [x1 + bar, y0, zOut]);   // sill
        box('frame', [x0 - bar, y0, zIn], [x0, y1, zOut]);               // left jamb
        box('frame', [x1, y0, zIn], [x1 + bar, y1, zOut]);               // right jamb
      }
    };
    const faceZ = (n: number, x: number, xIn: number, xOut: number) => {
      for (let i = 0; i < n; i++) {
        const cz = -D + ((i + 0.5) * depth) / n;
        windows.push([x, cy, cz]);
        const z0 = cz - ww / 2, z1 = cz + ww / 2;
        box('frame', [xIn, y1, z0 - bar], [xOut, y1 + bar, z1 + bar]);
        box('frame', [xIn, y0 - bar, z0 - bar], [xOut, y0, z1 + bar]);
        box('frame', [xIn, y0, z0 - bar], [xOut, y1, z0]);
        box('frame', [xIn, y0, z1], [xOut, y1, z1 + bar]);
      }
    };
    faceX(windowsPerFace.front, D + out / 2, D, D + out);
    faceX(windowsPerFace.back, -D - out / 2, -D - out, -D);
    faceZ(windowsPerFace.side, -W - out / 2, -W - out, -W);
    faceZ(windowsPerFace.side, W + out / 2, W, W + out);
  }

  // Porch: four posts in a row in front of the door.
  if (porch) {
    for (let i = 0; i < 4; i++) {
      const cx = -W + 0.3 + (i * (width - 0.6)) / 3;
      box('post', [cx - 0.075, 0, D + 1.2], [cx + 0.075, 2.2, D + 1.35]);
    }
  }

  // Roof slats: width / 0.25 per roof side (two sides for pitched and hipped, one flat slab for flat).
  // Every part is an axis-aligned box, so a sloped side is laid as ROOF_COURSES stepped courses from the eave up to
  // the ridge line (z = 0), each course `width / 0.25 / ROOF_COURSES` boards wide: same count, and it reads as a pitch.
  // Hipped courses also step in from both gable ends.
  const rise = roofRise(roof, depth);
  const O = HOUSE.overhang;
  if (roof === 'flat') {
    for (let i = 0; i < width / HOUSE.slat; i++) {
      const x0 = -W + i * HOUSE.slat;
      box('slat', [x0, wallTop, -D - O], [x0 + HOUSE.slat, wallTop + rise, D + O]);
    }
  } else {
    const perCourse = width / HOUSE.slat / ROOF_COURSES;   // = width, an integer
    for (let r = 0; r < ROOF_COURSES; r++) {
      const inset = roof === 'hipped' ? (r / ROOF_COURSES) * Math.min(W, D) : 0;
      const xa = -W - O + inset, xb = W + O - inset;
      const zOut = (D + O) * (1 - r / ROOF_COURSES), zIn = (D + O) * (1 - (r + 1) / ROOF_COURSES);
      const y0 = wallTop + (rise * r) / ROOF_COURSES, y1 = wallTop + (rise * (r + 1)) / ROOF_COURSES;
      for (let i = 0; i < perCourse; i++) {
        const x0 = xa + ((xb - xa) * i) / perCourse, x1 = xa + ((xb - xa) * (i + 1)) / perCourse;
        box('slat', [x0, y0, zIn], [x1, y1, zOut]);       // front side
        box('slat', [x0, y0, -zOut], [x1, y1, -zIn]);     // back side
      }
    }
  }

  // Chimney: one, at the back right, through the roof.
  box('chimney', [W - 0.9, wallTop, -0.6], [W - 0.4, wallTop + rise + 0.8, -0.1]);

  // Build order is bottom to top: a stable sort on each part's lowest y. order === index.
  const indexed = raw.map((p, i) => ({ p, i }));
  indexed.sort((a, b) => a.p.min[1] - b.p.min[1] || a.i - b.i);
  const parts: HousePart[] = indexed.map(({ p }, order) => ({ kind: p.kind, min: p.min, max: p.max, order }));

  return { seed, words, tiers, bays, width, depth, roof, windowsPerFace, porch, parts, windows };
}

/** Expected part count from the §5.4 formulas (what parts.length must equal). */
export function expectedParts(h: Pick<House, 'width' | 'depth' | 'tiers' | 'roof' | 'windowsPerFace' | 'porch'>): number {
  const perimeter = 2 * (h.width + h.depth);
  const planks = (perimeter / HOUSE.plank) * (HOUSE.tierHeight / HOUSE.course) * h.tiers;
  const slats = (h.width / HOUSE.slat) * (h.roof === 'flat' ? 1 : 2);
  const wpf = h.windowsPerFace;
  const frames = (wpf.front + wpf.back + 2 * wpf.side) * h.tiers * 4;
  return planks + slats + frames + (h.porch ? 4 : 0) + 1;
}

const fmt = (v: number) => (Math.round(v * 100) / 100).toString();

/**
 * Front elevation of `house` as an SVG string, for the no-WebGL tier (§11). Body and roof from the dark building
 * ramp, windows warm (lit). Scale 20 px per unit, 1-unit margin. Only self-closing children inside one <svg>.
 */
export function houseSvg(house: House): string {
  const S = 20, M = 1;
  const W = house.width, wallTop = house.tiers * HOUSE.tierHeight;
  const rise = roofRise(house.roof, house.depth);
  const chimneyTop = wallTop + rise + 0.8;
  const vw = (W + 2 * HOUSE.overhang + 2 * M) * S;
  const vh = (chimneyTop + 2 * M) * S;
  const X = (x: number) => fmt((x + W / 2 + HOUSE.overhang + M) * S);   // house-local x → svg x
  const Y = (y: number) => fmt((chimneyTop + M - y) * S);              // house-local y → svg y (down)
  const L = (len: number) => fmt(len * S);
  const wall = PALETTE.wall, roofC = PALETTE.roof, lit = PALETTE.warm;
  const out: string[] = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(vw)} ${fmt(vh)}" width="${fmt(vw)}" height="${fmt(vh)}" aria-hidden="true">`);
  // chimney first so the roof overlaps its foot
  out.push(`<rect x="${X(W / 2 - 0.9)}" y="${Y(chimneyTop)}" width="${L(0.5)}" height="${L(chimneyTop - wallTop)}" fill="${roofC}"/>`);
  out.push(`<rect x="${X(-W / 2)}" y="${Y(wallTop)}" width="${L(W)}" height="${L(wallTop)}" fill="${wall}"/>`);
  const eaveL = -W / 2 - HOUSE.overhang, eaveR = W / 2 + HOUSE.overhang;
  if (house.roof === 'flat') {
    out.push(`<rect x="${X(eaveL)}" y="${Y(wallTop + rise)}" width="${L(eaveR - eaveL)}" height="${L(rise)}" fill="${roofC}"/>`);
  } else {
    // Front elevation of a ridge along x: pitched shows a band (eave line to ridge line); hipped a trapezoid.
    const inset = house.roof === 'hipped' ? Math.min(W / 2, house.depth / 2) : 0;
    const pts = [[eaveL, wallTop], [eaveR, wallTop], [eaveR - inset, wallTop + rise], [eaveL + inset, wallTop + rise]]
      .map(([x, y]) => `${X(x)},${Y(y)}`).join(' ');
    out.push(`<polygon points="${pts}" fill="${roofC}"/>`);
  }
  for (const [x, y, z] of house.windows) {
    if (z <= house.depth / 2) continue;   // front face only
    out.push(`<rect x="${X(x - HOUSE.window.w / 2)}" y="${Y(y + HOUSE.window.h / 2)}" width="${L(HOUSE.window.w)}" height="${L(HOUSE.window.h)}" fill="${lit}"/>`);
  }
  if (house.porch) {
    for (let i = 0; i < 4; i++) {
      const cx = -W / 2 + 0.3 + (i * (W - 0.6)) / 3;
      out.push(`<rect x="${X(cx - 0.075)}" y="${Y(2.2)}" width="${L(0.15)}" height="${L(2.2)}" fill="${roofC}"/>`);
    }
  }
  out.push('</svg>');
  return out.join('');
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run src/valley/house.test.ts`
Expected: PASS, 65 tests (most are the per-input formula checks).

- [ ] **Step 5: Lint and typecheck**

Run: `npx eslint src/valley/house.ts src/valley/house.test.ts && npx tsc --noEmit 2>&1 | grep '^src/valley/'`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/valley/house.ts src/valley/house.test.ts
git commit -m "Add the house grammar and its svg elevation"
```

**Verify:**
- `npx vitest run src/valley/house.test.ts` → 65 passed.
- Read `houseFromSentence`: every formula line matches spec §5.4 character for character (`>>>` shifts, `% 2`, `% 3`, `& 1`, `floor`).
- `grep -n "#[0-9a-fA-F]\{6\}" src/valley/house.ts` → empty.

---

### Task 1.11: Build state: the visitor's 4.4 s construction **[parallel-safe]**

Spec §5.5 (`buildStateAt(t)` for t ∈ [0, 4.4]: `cut` easeInOut over 0–3.6 s; 18 scaffold bars each growing over 0.3 s on the stagger `(idx % 9) / 9 · 0.3` from 0.2 s, holding, retracting between 3.6 and 4.1 s; the window lights at 4.25 s; `clock` is `t` as `0.00`; latches on wall time), §3.1 · 07 (clock `{t} / 4.40`), §12 (no allocation), §16 ("`buildStateAt` latches at 4.4 s and the window lights at 4.25 s").

Readings: `t` is seconds since the build began; above 4.4 it is the final state forever (`done` true), below 0 or NaN it is the start. Retraction is linear from 1 at 3.6 s to 0 at 4.1 s, applied as `min(grow, retract)`. `easeInOut` is the cubic smoothstep. The clock string comes from a table of the 441 hundredths `0.00`…`4.40`, so the frame loop never formats. The returned object is shared and overwritten on each call. The 0.2 s light-out when a new sentence replaces the house belongs to the driver (Stage 4).

**Files:**
- Create: `src/valley/build.ts`
- Test: `src/valley/build.test.ts`

**Interfaces:**
- Consumes: `BuildState` (`./types`).
- Produces (contract): `BUILD_SECONDS = 4.4`; `buildStateAt(t: number): BuildState` (scaffold is 18 entries `{ idx: 0..17, grow: 0..1 }`).
- Produces (extra): `BUILD` (the timing constants above), `scaffoldStart(idx: number): number`.

- [ ] **Step 1: Write the failing test `src/valley/build.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { BUILD_SECONDS, BUILD, buildStateAt, scaffoldStart } from './build';

const snap = (t: number) => structuredClone(buildStateAt(t));

describe('buildStateAt', () => {
  it('runs 4.4 s', () => { expect(BUILD_SECONDS).toBe(4.4); });
  it('starts empty: cut 0, no scaffold, clock 0.00, dark', () => {
    const s = snap(0);
    expect(s.cut).toBe(0);
    expect(s.scaffold).toHaveLength(18);
    s.scaffold.forEach((b, i) => { expect(b.idx).toBe(i); expect(b.grow).toBe(0); });
    expect([s.clock, s.lit, s.done]).toEqual(['0.00', false, false]);
  });
  it('raises the cut with easeInOut over 0–3.6 s', () => {
    expect(snap(1.8).cut).toBeCloseTo(0.5, 9);
    expect(snap(0.9).cut).toBeCloseTo(0.15625, 9);
    expect(snap(3.6).cut).toBe(1);
    let prev = -1;
    for (let t = 0; t <= 4.4; t += 0.01) { const c = buildStateAt(t).cut; expect(c).toBeGreaterThanOrEqual(prev); prev = c; }
  });
  it('grows each of the 18 bars over 0.3 s on the (idx % 9) / 9 · 0.3 stagger from 0.2 s', () => {
    expect(scaffoldStart(0)).toBeCloseTo(0.2, 12);
    expect(scaffoldStart(8)).toBeCloseTo(0.2 + (8 / 9) * 0.3, 12);
    expect(scaffoldStart(9)).toBeCloseTo(0.2, 12);
    expect(snap(0.35).scaffold[0].grow).toBeCloseTo(0.5, 9);
    const full = snap(0.2 + 0.3 + 0.3);
    full.scaffold.forEach((b) => expect(b.grow).toBe(1));
  });
  it('holds the scaffold, then retracts it between 3.6 and 4.1 s', () => {
    snap(2.0).scaffold.forEach((b) => expect(b.grow).toBe(1));
    snap(3.85).scaffold.forEach((b) => expect(b.grow).toBeCloseTo(0.5, 9));
    snap(4.1).scaffold.forEach((b) => expect(b.grow).toBe(0));
  });
  it('lights the window at exactly 4.25 s', () => {
    expect(snap(4.2499).lit).toBe(false);
    expect(snap(4.25).lit).toBe(true);
  });
  it('formats the clock as t to two decimals', () => {
    expect(snap(1.234).clock).toBe('1.23');
    expect(snap(0.5).clock).toBe('0.50');
    expect(snap(2).clock).toBe('2.00');
    expect(snap(4.4).clock).toBe('4.40');
  });
  it('latches at 4.4 s: any later time is the final state', () => {
    const end = snap(4.4);
    expect(end).toMatchObject({ cut: 1, clock: '4.40', lit: true, done: true });
    end.scaffold.forEach((b) => expect(b.grow).toBe(0));
    for (const t of [4.41, 10, 1e6, Number.POSITIVE_INFINITY]) expect(snap(t)).toEqual(end);
    expect(snap(4.39).done).toBe(false);
  });
  it('treats negative time and NaN as 0', () => {
    expect(snap(-1)).toEqual(snap(0));
    expect(snap(Number.NaN)).toEqual(snap(0));
  });
  it('returns the same object every call (allocation-free for the frame loop)', () => {
    expect(buildStateAt(1)).toBe(buildStateAt(2));
    expect(BUILD.lightAt).toBe(4.25);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/valley/build.test.ts`
Expected: FAIL, `Failed to resolve import "./build" from "src/valley/build.test.ts"`.

- [ ] **Step 3: Write `src/valley/build.ts`**

```ts
// The one construction (spec §5.5): the visitor's house builds over 4.4 s of wall time after Enter.
// The driver passes t = seconds since the build started; the build latches on wall time (scrolling never pauses or
// reverses it). Allocation-free: buildStateAt returns one shared object, overwritten in place, and clock strings
// come from a table built once.
import type { BuildState } from './types';

export const BUILD_SECONDS = 4.4;
export const BUILD = {
  cutEnd: 3.6,            // the clip plane rises (easeInOut) over 0–3.6 s
  scaffoldBars: 18,
  scaffoldStart: 0.2,     // first bar starts growing at 0.2 s
  scaffoldGrow: 0.3,      // each bar grows in over 0.3 s
  scaffoldStagger: 0.3,   // bar idx starts (idx % 9) / 9 · 0.3 s after scaffoldStart
  retractFrom: 3.6,       // bars retract between 3.6 and 4.1 s
  retractTo: 4.1,
  lightAt: 4.25,          // the window lights
} as const;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeInOut = (t: number) => { const u = clamp01(t); return u * u * (3 - 2 * u); };

/** '0.00' … '4.40' for every hundredth of a second of the build. */
const CLOCK: readonly string[] = Array.from({ length: Math.round(BUILD_SECONDS * 100) + 1 }, (_, i) => (i / 100).toFixed(2));

const STATE: BuildState = {
  cut: 0,
  scaffold: Array.from({ length: BUILD.scaffoldBars }, (_, idx) => ({ idx, grow: 0 })),
  clock: CLOCK[0],
  lit: false,
  done: false,
};

/** Seconds after which scaffold bar `idx` starts growing. */
export function scaffoldStart(idx: number): number {
  return BUILD.scaffoldStart + ((idx % 9) / 9) * BUILD.scaffoldStagger;
}

/**
 * Build state at `t` seconds since the build began, clamped to [0, 4.4] (NaN → 0). After 4.4 s it is the final
 * state forever: cut 1, scaffold gone, clock '4.40', lit, done. Returns the same object every call.
 */
export function buildStateAt(t: number): BuildState {
  const tc = t > 0 ? Math.min(t, BUILD_SECONDS) : 0;   // NaN and negatives → 0
  STATE.cut = easeInOut(tc / BUILD.cutEnd);
  const retract = 1 - clamp01((tc - BUILD.retractFrom) / (BUILD.retractTo - BUILD.retractFrom));
  for (const bar of STATE.scaffold) {
    const grow = clamp01((tc - scaffoldStart(bar.idx)) / BUILD.scaffoldGrow);
    bar.grow = Math.min(grow, retract);
  }
  STATE.clock = CLOCK[Math.floor(tc * 100 + 1e-6)];
  STATE.lit = tc >= BUILD.lightAt;
  STATE.done = tc >= BUILD_SECONDS;
  return STATE;
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run src/valley/build.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Lint and typecheck**

Run: `npx eslint src/valley/build.ts src/valley/build.test.ts && npx tsc --noEmit 2>&1 | grep '^src/valley/'`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/valley/build.ts src/valley/build.test.ts
git commit -m "Add the visitor build clock: cut, scaffold, light at 4.25 s, latch at 4.4 s"
```

**Verify:**
- `npx vitest run src/valley/build.test.ts` → 10 passed.
- `grep -n "toFixed" src/valley/build.ts` → only inside the `CLOCK` table built at module load.

---

### Task 1.12: Import boundary and the Stage 1 gate

Index Global Constraints (`src/valley/**` imports nothing from React, three's renderer or the DOM; three's math classes allowed; no `fetch(`), spec §5 ("No React, no DOM, no three renderer"), §2 (no real-world hooks), §16 (the Stage 1 unit tests).

Reading: the boundary test reads every non-test `.ts` under `src/valley/` (Stage 0's `types.ts`, `sections.ts`, `facts.ts`, `palette.ts` included) and allows imports from `./…`, `@/valley/…` and named math classes from `three`; comments are stripped before the DOM check because the house grammar talks about windows.

**Files:**
- Test: `src/valley/boundary.test.ts`

**Interfaces:**
- Consumes: every file in `src/valley/` (read as text).
- Produces: nothing.

- [ ] **Step 1: Write the test `src/valley/boundary.test.ts`**

```ts
// Global constraint: src/valley/** imports nothing from React, three's renderer or the DOM (three's math is fine).
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const DIR = path.resolve(__dirname);
const SOURCES = readdirSync(DIR).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
const THREE_MATH = new Set(['Color', 'Vector2', 'Vector3', 'Vector4', 'Matrix3', 'Matrix4', 'Quaternion', 'Euler', 'Box3', 'Sphere', 'Plane', 'Ray', 'MathUtils']);

describe('src/valley import boundary', () => {
  it.each(SOURCES)('%s imports only valley modules, its data and three math classes', (file) => {
    const src = readFileSync(path.join(DIR, file), 'utf8');
    for (const m of src.matchAll(/import\s+(type\s+)?([\s\S]*?)\s+from\s+'([^']+)'/g)) {
      const [, isType, names, from] = m;
      if (from.startsWith('./') || from.startsWith('@/valley/')) continue;
      expect(from).toBe('three');
      if (!isType) {
        for (const n of names.replace(/[{}]/g, '').split(',').map((s) => s.trim()).filter(Boolean)) expect(THREE_MATH.has(n)).toBe(true);
      }
    }
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');   // comments may name the DOM
    expect(code).not.toMatch(/(?<![.\w])(window|document)\.|\b(localStorage|sessionStorage|requestAnimationFrame)\b/);
    expect(code).not.toMatch(/\bfetch\(/);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx vitest run src/valley/boundary.test.ts`
Expected: PASS, one test per non-test `.ts` file in `src/valley/` (15 once Stages 0 and 1 have landed: types, sections, facts, palette, hash, rng, terrain, layout, ridge, lights, timeline, environment, ignition, house, build).

- [ ] **Step 3: Prove it can fail**

Add the line `import { WebGLRenderer } from 'three'; void WebGLRenderer;` to the top of `src/valley/build.ts` and run `npx vitest run src/valley/boundary.test.ts`.
Expected: FAIL in `build.ts imports only valley modules, its data and three math classes`. Revert with `git checkout src/valley/build.ts`.

- [ ] **Step 4: Run the Stage 1 gate**

Run: `npx vitest run src/valley`
Expected: PASS, every `src/valley` test file green (Stage 0's `sections`, `facts`, `palette` tests and this stage's 13 files).

Run: `npx vitest run`
Expected: PASS for the whole suite. A failure outside `src/valley/` belongs to a Stage 0 task still in flight; record it in the commit message, do not fix it here.

Run: `npm run lint`
Expected: no errors in `src/valley/`.

Run: `npx tsc --noEmit 2>&1 | grep '^src/valley/'`
Expected: no output.

Run: `grep -rn "fetch(\|localStorage\|sessionStorage\|from 'react'" src/valley`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/valley/boundary.test.ts
git commit -m "Pin the valley import boundary; Stage 1 gate green"
```

**Verify (the Stage 1 gate):**
- `npx vitest run src/valley` → all passed; the per-file counts are hash 3, rng 4, terrain 11, layout 5, ridge 9, lights 7, projection 32, timeline 15, environment 11, ignition 11, house 65, build 10, boundary 15.
- `npm run lint` and `npx tsc --noEmit` report nothing under `src/valley/`.
- `git log --oneline -12 -- src/valley` shows one commit per Stage 1 task, each staging only its own files.
- For each Stage 1 commit, `git show --stat <sha>` lists only files under `src/valley/` (nothing in `src/gl` or `src/site`).

