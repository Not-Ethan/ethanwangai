# Stage 1 — The bench package (`src/bench/`, pure TypeScript)

> Part of `2026-09-28-dbso-plan-00-index.md`. Read the index's Global Constraints and spec §4, §5, §3 (camera/sections), §6 (OU texture), §7 (timing), §10 (SVG). Consumes `src/bench/types.ts` and `src/bench/sections.ts` from Stage 0 Task 0.2. Gate: `npx vitest run src/bench` green, and `layout()` for the desktop tier emits the counts below.

Task 1.1 first. Then 1.2. Then 1.3–1.9 are **[parallel-safe]** (disjoint files; they all import 1.1/1.2). 1.10 last.

Local space conventions for every config: the machine's footprint centre is the origin; y = 0 is the bench surface; +x is the machine's long axis; +z is toward the camera's default front. Quaternions are `[x, y, z, w]`. A bar of length L along +x is `scale: [L, 1, 1]` with the identity quaternion; along +z use `quat = rotY(π/2)`; vertical use `quat = rotZ(π/2)`.

---

### Task 1.1: Hash, RNG and math helpers

**Files:**
- Create: `src/bench/hash.ts`, `src/bench/math.ts`, `src/bench/hash.test.ts`

**Interfaces:**
- Produces: `mulberry32(seed: number): () => number`, `hashString(s: string): number` (32-bit FNV-1a), `hash2(i: number, j: number): number` (0..1, deterministic), `rotX(a): Vec4`, `rotY(a): Vec4`, `rotZ(a): Vec4`, `mulQuat(a, b): Vec4`, `IDENTITY_Q: Vec4`, `smoothstep(e0, e1, x)`, `clamp01(x)`, `lerp(a, b, t)`, `expoOut(t)`, `power2InOut(t)`.

- [ ] **Step 1: Failing test `src/bench/hash.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { mulberry32, hashString, hash2 } from './hash';
import { rotY, mulQuat, IDENTITY_Q, expoOut, power2InOut, smoothstep } from './math';

describe('hash', () => {
  it('mulberry32 is deterministic and in [0,1)', () => {
    const a = mulberry32(7), b = mulberry32(7);
    const xs = Array.from({ length: 5 }, () => a());
    expect(xs).toEqual(Array.from({ length: 5 }, () => b()));
    xs.forEach((x) => { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1); });
  });
  it('hashString is stable', () => {
    expect(hashString('now is the best time in history to build things.')).toBe(hashString('now is the best time in history to build things.'));
    expect(hashString('a')).not.toBe(hashString('b'));
  });
  it('hash2 is in [0,1) and varies', () => {
    expect(hash2(3, 4)).not.toBe(hash2(4, 3));
    expect(hash2(1, 1)).toBeLessThan(1);
  });
});
describe('math', () => {
  it('quaternion helpers', () => {
    expect(mulQuat(IDENTITY_Q, rotY(1))).toEqual(rotY(1));
  });
  it('easings hit endpoints', () => {
    expect(expoOut(0)).toBe(0); expect(expoOut(1)).toBe(1);
    expect(power2InOut(0)).toBe(0); expect(power2InOut(1)).toBe(1); expect(power2InOut(0.5)).toBeCloseTo(0.5);
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5);
  });
});
```

- [ ] **Step 2: `src/bench/hash.ts`**

```ts
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
export function hash2(i: number, j: number): number {
  let h = Math.imul(i | 0, 0x9E3779B1) ^ Math.imul((j | 0) + 0x7F4A7C15, 0x85EBCA77);
  h ^= h >>> 15; h = Math.imul(h, 0x2C1B3C6D); h ^= h >>> 12; h = Math.imul(h, 0x297A2D39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
```

- [ ] **Step 3: `src/bench/math.ts`**

```ts
import type { Vec4 } from './types';
export const IDENTITY_Q: Vec4 = [0, 0, 0, 1];
export const rotX = (a: number): Vec4 => [Math.sin(a / 2), 0, 0, Math.cos(a / 2)];
export const rotY = (a: number): Vec4 => [0, Math.sin(a / 2), 0, Math.cos(a / 2)];
export const rotZ = (a: number): Vec4 => [0, 0, Math.sin(a / 2), Math.cos(a / 2)];
export function mulQuat(a: Vec4, b: Vec4): Vec4 {
  const [ax, ay, az, aw] = a, [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export function smoothstep(e0: number, e1: number, x: number) { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); }
export const expoOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const power2InOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
```

- [ ] **Step 4: Run** `npx vitest run src/bench/hash.test.ts` → PASS. **Commit:** `git add src/bench && git commit -m "Add bench hash and math helpers"`

---

### Task 1.2: `layout()` — configs to instances, plus bench placement and timing constants

**Files:**
- Create: `src/bench/layout.ts`, `src/bench/bench.ts`, `src/bench/timing.ts`, `src/bench/layout.test.ts`

**Interfaces:**
- Consumes: `types.ts`, `hash.ts`, `math.ts`.
- Produces:

```ts
// bench.ts
export interface Placement { origin: Vec3; yaw: number }
export const PLACEMENT: Placement[]          // indexed by MachineId (bench space)
export const BENCH_SEED_TEXT = 'now is the best time in history to build things.'
export function toBench(local: Vec3, p: Placement): Vec3
export function quatToBench(q: Vec4, p: Placement): Vec4

// layout.ts
export interface LayoutOptions { tier: Tier; seed: number; configs: MachineConfig[]; groupSpans?: Partial<Record<MachineId, [number, number][]>> }
export function layout(opts: LayoutOptions): LayoutResult
export const DEFAULT_GROUP_SPANS: Record<MachineId, [number, number][]>   // per machine: [start,end] of birth per group

// timing.ts (all seconds unless noted; compile units are 0..1 of uCompile)
export const TIMING = {
  heroCompileS: 2.2, lock0: 0.34, lockSpan: 0.59, lockW: 0.06, inkFlight: 0.6, band: [0.28, 0.62],
  leverAngleRad: Math.PI / 6, runDampS: 0.25, impulse: 0.6, impulseDecayS: 0.4, rateSpikeS: 1.0,
  visitorCompileS: 1.4, visitorTeardownS: 0.6, rebuildOfferAfterS: 60,
  capFlip: { toRad: 1.08 * Math.PI, upS: 0.12, holdS: 0.3, downS: 0.2 },
  heroGuardU: 0.15,        // section 0 local u where the camera rise begins
} as const
export function lockStart(birth: number): number      // lock0 + birth * lockSpan
export function lockEnd(birth: number): number        // lockStart + lockW
export function inkDepart(targetBirth: number): number // max(0, lockStart + lockW/2 - inkFlight)
export function inkLand(targetBirth: number): number   // lockStart + lockW/2
```

- [ ] **Step 1: Failing test `src/bench/layout.test.ts`** (uses a tiny fake config; real configs come in 1.3–1.7)

```ts
import { describe, it, expect } from 'vitest';
import { layout } from './layout';
import { KIND, MACHINE, PRIMITIVE, type MachineConfig, type PartSpec } from './types';
import { IDENTITY_Q } from './math';
import { lockStart, lockEnd, inkDepart, inkLand, TIMING } from './timing';

const fake: MachineConfig = {
  id: MACHINE.balance, name: 'fake', footprint: { w: 2, d: 1 },
  build: () => {
    const parts: PartSpec[] = [];
    for (let i = 0; i < 4; i++) parts.push({ primitive: PRIMITIVE.bar, kind: KIND.static, position: [i, 0, 0], quaternion: IDENTITY_Q, scale: [1, 1, 1], param: [0, 0, 0, 0], col: -1, module: 'frame', group: 0, explodeMode: 'module' });
    for (let i = 0; i < 6; i++) parts.push({ primitive: PRIMITIVE.cell, kind: KIND.cell, position: [i * 0.2, 0, 1], quaternion: IDENTITY_Q, scale: [0.2, 0.4, 0.2], param: [i, 0, 0.5, 0], col: i, module: 'bed', group: 1, explodeMode: 'rise' });
    parts.push({ primitive: PRIMITIVE.bar, kind: KIND.lever, position: [0, 1, 0], quaternion: IDENTITY_Q, scale: [1, 1, 1], param: [0, 0, 0, 0], col: -1, module: 'lever', group: 2, explodeMode: 'module' });
    return parts;
  },
};

describe('layout', () => {
  const a = layout({ tier: 'desktop', seed: 42, configs: [fake] });
  const b = layout({ tier: 'desktop', seed: 42, configs: [fake] });
  it('is deterministic', () => { expect(a).toEqual(b); });
  it('assigns birth by group span, lever exactly 1 and last', () => {
    const lever = a.parts.find((p) => p.kind === KIND.lever)!;
    expect(lever.birth).toBe(1);
    const others = a.parts.filter((p) => p !== lever);
    others.forEach((p) => expect(p.birth).toBeLessThan(1));
    const frame = a.parts.filter((p) => p.module === 'frame').map((p) => p.birth);
    const bed = a.parts.filter((p) => p.module === 'bed').map((p) => p.birth);
    expect(Math.max(...frame)).toBeLessThan(Math.min(...bed));
  });
  it('rise parts have zero explode; module parts explode 0.6–1.4 units axis-aligned', () => {
    a.parts.filter((p) => p.explodeMode === 'rise').forEach((p) => expect(p.explode).toEqual([0, 0, 0]));
    a.parts.filter((p) => p.explodeMode === 'module' && p.kind !== KIND.lever).forEach((p) => {
      const nz = p.explode.filter((v) => v !== 0);
      expect(nz).toHaveLength(1);
      expect(Math.abs(nz[0])).toBeGreaterThanOrEqual(0.6);
      expect(Math.abs(nz[0])).toBeLessThanOrEqual(1.4);
    });
  });
  it('places parts in bench space using PLACEMENT and fills summaries and counts', () => {
    expect(a.counts.total).toBe(11);
    expect(a.counts.byMachine[MACHINE.balance]).toBe(11);
    expect(a.byPrimitive[PRIMITIVE.cell]).toHaveLength(6);
    expect(a.byPrimitive[PRIMITIVE.bar]).toHaveLength(5);
    const m = a.machines[MACHINE.balance];
    expect(m.count).toBe(11);
    expect(m.min[0]).toBeLessThanOrEqual(m.centroid[0]); expect(m.max[0]).toBeGreaterThanOrEqual(m.centroid[0]);
  });
  it('emits leader lines only for module parts of quoter and intake', () => {
    expect(a.leaderLines).toHaveLength(0); // fake is the balance
  });
  it('timing helpers are consistent', () => {
    expect(lockStart(0)).toBe(TIMING.lock0);
    expect(lockEnd(1)).toBeCloseTo(TIMING.lock0 + TIMING.lockSpan + TIMING.lockW);
    expect(inkLand(0.5)).toBeGreaterThan(inkDepart(0.5));
    expect(inkDepart(0)).toBe(0);
  });
});
```

- [ ] **Step 2: `src/bench/timing.ts`** (values from the Interfaces block; helpers are one-liners over `TIMING`).

- [ ] **Step 3: `src/bench/bench.ts`**

```ts
import type { Vec3, Vec4 } from './types';
import { mulQuat, rotY } from './math';
export interface Placement { origin: Vec3; yaw: number }
export const BENCH_SEED_TEXT = 'now is the best time in history to build things.';
/** Compact cluster ~15 × 10. Quoter along the back; bot at its front-left corner; balance, splitter, watch in front; slot front-right. */
export const PLACEMENT: Placement[] = [
  { origin: [0, 0, -2], yaw: 0 },        // quoter (bed 9.6 × 7.2 inside a 12 × 8 frame)
  { origin: [-7.4, 0, -2], yaw: 0 },     // intake: hopper and chute at the headline (−x) end of the quoter
  { origin: [-4.2, 0, 4.6], yaw: 0 },    // balance
  { origin: [0.4, 0, 4.8], yaw: 0 },     // splitter (fan opens toward +x)
  { origin: [4.6, 0, 4.6], yaw: 0 },     // watch
  { origin: [-5.4, 0, 2.5], yaw: 0 },    // bot, touching the quoter's front-left post
  { origin: [6.2, 0, 6.6], yaw: 0 },     // slot
  { origin: [6.2, 0, 6.6], yaw: 0 },     // visitor builds inside the slot
];
export function toBench(local: Vec3, p: Placement): Vec3 {
  const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
  return [p.origin[0] + local[0] * c + local[2] * s, p.origin[1] + local[1], p.origin[2] - local[0] * s + local[2] * c];
}
export function quatToBench(q: Vec4, p: Placement): Vec4 { return p.yaw === 0 ? q : mulQuat(rotY(p.yaw), q); }
```

- [ ] **Step 4: `src/bench/layout.ts`**

```ts
import { KIND, MACHINE, PRIMITIVE_NAMES, type LayoutResult, type LeaderLine, type MachineConfig, type MachineId, type MachineSummary, type PartInstance, type Tier, type Vec3 } from './types';
import { mulberry32, hash2 } from './hash';
import { PLACEMENT, toBench, quatToBench } from './bench';

export interface LayoutOptions {
  tier: Tier; seed: number; configs: MachineConfig[];
  groupSpans?: Partial<Record<MachineId, [number, number][]>>;
}

/** Birth windows per build group. The lever's group is always the last and is pinned to 1. */
export const DEFAULT_GROUP_SPANS: Record<MachineId, [number, number][]> = {
  [MACHINE.quoter]:   [[0, 0.12], [0.12, 0.62], [0.62, 0.68], [0.68, 0.85], [0.85, 0.97]],   // frame, bed, carriage rails, carriages, rotors; lever = group 5
  [MACHINE.intake]:   [[0, 0.3], [0.3, 0.7], [0.7, 0.97]],
  [MACHINE.balance]:  [[0, 0.35], [0.35, 0.97]],
  [MACHINE.splitter]: [[0, 0.3], [0.3, 0.7], [0.7, 0.97]],
  [MACHINE.watch]:    [[0, 0.8], [0.8, 0.97]],
  [MACHINE.bot]:      [[0, 0.97]],
  [MACHINE.slot]:     [[0, 0.97]],
  [MACHINE.visitor]:  [[0, 0.5], [0.5, 0.97]],
};

const AXES: Vec3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1]];

export function layout(opts: LayoutOptions): LayoutResult {
  const parts: PartInstance[] = [];
  const leaderLines: LeaderLine[] = [];
  const machines: MachineSummary[] = [];
  const byMachine = new Array(8).fill(0);
  const density = opts.tier === 'phone' ? 0.25 : 1;

  for (const cfg of opts.configs) {
    const rng = mulberry32((opts.seed ^ (cfg.id * 0x9e3779b1)) >>> 0);
    const specs = cfg.build({ tier: opts.tier, rng, density, caps: opts.tier !== 'phone' });
    const placement = PLACEMENT[cfg.id];
    const spans = opts.groupSpans?.[cfg.id] ?? DEFAULT_GROUP_SPANS[cfg.id];
    const groups = new Map<number, number[]>();
    specs.forEach((s, i) => { (groups.get(s.group) ?? groups.set(s.group, []).get(s.group)!).push(i); });
    const groupIds = [...groups.keys()].sort((x, y) => x - y);
    const leverGroup = groupIds[groupIds.length - 1];
    const hasLever = specs.some((s) => s.kind === KIND.lever);

    // Module explode: one hashed axis per module, magnitude 0.6–1.4, shared by the module's parts.
    const moduleAxis = new Map<string, Vec3>();
    const moduleMag = new Map<string, number>();

    const out: PartInstance[] = specs.map((s, i) => {
      const gi = groupIds.indexOf(s.group);
      const isLeverGroup = hasLever && s.group === leverGroup;
      let birth: number;
      if (isLeverGroup) birth = 1;
      else {
        const span = spans[Math.min(gi, spans.length - 1)];
        const members = groups.get(s.group)!;
        const rank = members.indexOf(i);
        birth = span[0] + (span[1] - span[0]) * (members.length === 1 ? 0.5 : rank / (members.length - 1));
      }
      let explode: Vec3 = [0, 0, 0];
      if (s.explodeMode === 'module' && s.kind !== KIND.lever) {
        if (!moduleAxis.has(s.module)) {
          const h = hash2(cfg.id * 131 + s.group, s.module.length * 7 + [...s.module].reduce((a, c) => a + c.charCodeAt(0), 0));
          moduleAxis.set(s.module, AXES[Math.floor(h * AXES.length) % AXES.length]);
          moduleMag.set(s.module, 0.6 + 0.8 * hash2(Math.floor(h * 977), cfg.id));
        }
        const ax = moduleAxis.get(s.module)!, mag = moduleMag.get(s.module)!;
        explode = [ax[0] * mag, ax[1] * mag, ax[2] * mag];
      }
      return {
        ...s,
        machine: cfg.id,
        position: toBench(s.position, placement),
        quaternion: quatToBench(s.quaternion, placement),
        explode, birth,
      };
    });

    if (cfg.id === MACHINE.quoter || cfg.id === MACHINE.intake) {
      out.forEach((p) => {
        if (p.explodeMode === 'module' && p.kind !== KIND.lever) {
          leaderLines.push({ from: [p.position[0] + p.explode[0], p.position[1] + p.explode[1], p.position[2] + p.explode[2]], to: p.position, birth: p.birth, machine: cfg.id });
        }
      });
    }

    const min: number[] = [Infinity, Infinity, Infinity], max: number[] = [-Infinity, -Infinity, -Infinity], sum = [0, 0, 0];
    out.forEach((p) => { for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], p.position[k]); max[k] = Math.max(max[k], p.position[k]); sum[k] += p.position[k]; } });
    const n = Math.max(1, out.length);
    machines[cfg.id] = {
      id: cfg.id, count: out.length,
      centroid: [sum[0] / n, sum[1] / n, sum[2] / n],
      min: [min[0], min[1], min[2]] as Vec3, max: [max[0], max[1], max[2]] as Vec3,
      foot: [(min[0] + max[0]) / 2, 0, max[2]] as Vec3,
    };
    byMachine[cfg.id] = out.length;
    parts.push(...out);
  }

  for (let m = 0; m < 8; m++) if (!machines[m]) machines[m] = { id: m as MachineId, count: 0, centroid: PLACEMENT[m].origin, min: PLACEMENT[m].origin, max: PLACEMENT[m].origin, foot: PLACEMENT[m].origin };

  const byPrimitive = PRIMITIVE_NAMES.map(() => [] as PartInstance[]);
  parts.forEach((p) => byPrimitive[p.primitive].push(p));
  const inkedAtEnd = parts.filter((p) => p.machine !== MACHINE.slot && p.machine !== MACHINE.visitor).length;
  return { parts, byPrimitive, machines, leaderLines, counts: { total: parts.length, inkedAtEnd, byMachine } };
}
```

- [ ] **Step 5: Run** `npx vitest run src/bench/layout.test.ts` → PASS. **Commit:** `git add src/bench && git commit -m "Add layout(), bench placement and timing constants"`

---

### Task 1.3: The quoter config (hand-authored modules) **[parallel-safe]**

**Files:**
- Create: `src/bench/configs/quoter.ts`, `src/bench/configs/quoter.test.ts`, `src/bench/configs/helpers.ts`

**Interfaces:**
- Consumes: `types.ts`, `math.ts`, `hash.ts`.
- Produces: `QUOTER: MachineConfig`; `QUOTER_BED = { cols: 64, rows: 48, pitch: 0.15, cellScale: 0.12, hBase: 0.4 }` (phone: 32 × 24, pitch 0.30, cellScale 0.24); helpers `bar(from: Vec3, to: Vec3, module, group, kind?)`, `vbar(at, h, ...)`, `ring(at, axis: 'x'|'y'|'z', r, module, group, param)`, `rod(...)`, `tile(at, module, group, kind, param)`.
- Param conventions used by the shader (Stage 2 copies these exactly):
  - `cell`: `[col, row, hashedSize (0.6–1.0), 0]`
  - `cap`: same as its cell
  - `sweep`: `[railLength, periodS (1.6–6), phase (0–1), direction ±1]`; the part sweeps along its local +x (bench x after placement)
  - `spin`: `[0, baseRateRadPerS, phase, 0]`; spin parts always rotate about their **local z** (the ring's normal; spokes are oriented so local z is the ring's normal too)
  - `lever`: `[pivotAxis (2 = local z), pivotOffsetLocalX (−0.5 = the −x end), 0, 0]`

- [ ] **Step 1: Failing test `src/bench/configs/quoter.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { QUOTER, QUOTER_BED } from './quoter';
import { KIND, PRIMITIVE } from '@/bench/types';
import { mulberry32 } from '@/bench/hash';

describe('quoter config', () => {
  const desktop = QUOTER.build({ tier: 'desktop', rng: mulberry32(1), density: 1, caps: true });
  const phone = QUOTER.build({ tier: 'phone', rng: mulberry32(1), density: 0.25, caps: false });
  it('has a 64 × 48 bed of cells with caps on desktop', () => {
    expect(desktop.filter((p) => p.kind === KIND.cell)).toHaveLength(QUOTER_BED.cols * QUOTER_BED.rows);
    expect(desktop.filter((p) => p.kind === KIND.cap)).toHaveLength(QUOTER_BED.cols * QUOTER_BED.rows);
  });
  it('phone tier is a quarter-density bed with no caps', () => {
    expect(phone.filter((p) => p.kind === KIND.cell)).toHaveLength(32 * 24);
    expect(phone.filter((p) => p.kind === KIND.cap)).toHaveLength(0);
  });
  it('has six carriages, 24 spoked rotors and exactly one lever in the last group', () => {
    const carriages = new Set(desktop.filter((p) => p.module.startsWith('carriage')).map((p) => p.module));
    expect(carriages.size).toBe(6);
    const rings = desktop.filter((p) => p.primitive === PRIMITIVE.ring && p.module.startsWith('rotor'));
    expect(rings).toHaveLength(24);
    const spokes = desktop.filter((p) => p.primitive === PRIMITIVE.bar && p.kind === KIND.spin && p.module.startsWith('rotor'));
    expect(spokes).toHaveLength(24);
    const levers = desktop.filter((p) => p.kind === KIND.lever);
    expect(levers).toHaveLength(1);
    expect(levers[0].group).toBe(Math.max(...desktop.map((p) => p.group)));
    expect(desktop.filter((p) => p.group === levers[0].group)).toHaveLength(1);
  });
  it('total is within the spec band and the bed cells rise (no explode)', () => {
    expect(desktop.length).toBeGreaterThan(6000);
    expect(desktop.length).toBeLessThan(9000);
    desktop.filter((p) => p.kind === KIND.cell || p.kind === KIND.cap).forEach((p) => expect(p.explodeMode).toBe('rise'));
  });
  it('bed cells are ordered by column so they rack in from the −x side', () => {
    const cells = desktop.filter((p) => p.kind === KIND.cell);
    for (let i = 1; i < cells.length; i++) expect(cells[i].position[0]).toBeGreaterThanOrEqual(cells[i - 1].position[0] - 1e-9);
  });
});
```

- [ ] **Step 2: `src/bench/configs/helpers.ts`**

```ts
import { KIND, PRIMITIVE, type KindId, type PartSpec, type Vec3, type Vec4 } from '@/bench/types';
import { IDENTITY_Q, rotY, rotZ, rotX } from '@/bench/math';

const Z4: Vec4 = [0, 0, 0, 0];
export function bar(from: Vec3, to: Vec3, module: string, group: number, kind: KindId = KIND.static, param: Vec4 = Z4, explodeMode: PartSpec['explodeMode'] = 'module'): PartSpec {
  const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
  const len = Math.hypot(dx, dy, dz);
  let q: Vec4 = IDENTITY_Q;
  if (Math.abs(dz) > Math.abs(dx) && Math.abs(dz) > Math.abs(dy)) q = rotY(-Math.PI / 2 * Math.sign(dz));
  else if (Math.abs(dy) > Math.abs(dx)) q = rotZ(Math.PI / 2 * Math.sign(dy));
  else if (dx < 0) q = rotY(Math.PI);
  return { primitive: PRIMITIVE.bar, kind, position: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2], quaternion: q, scale: [len, 1, 1], param, col: -1, module, group, explodeMode };
}
export function rod(from: Vec3, to: Vec3, module: string, group: number): PartSpec {
  const b = bar(from, to, module, group);
  // Cylinder geometry is along +y; rotate so its axis follows the bar direction.
  const len = b.scale[0];
  const dx = to[0] - from[0], dz = to[2] - from[2];
  const q: Vec4 = Math.abs(dz) > Math.abs(dx) ? rotX(Math.PI / 2) : rotZ(-Math.PI / 2);
  return { ...b, primitive: PRIMITIVE.rod, quaternion: q, scale: [1, len, 1] };
}
export function ring(at: Vec3, axis: 'x' | 'y' | 'z', module: string, group: number, param: Vec4, scale = 1): PartSpec {
  // Torus lies in the XY plane (normal +z). axis = the spin axis (normal).
  const q: Vec4 = axis === 'z' ? IDENTITY_Q : axis === 'x' ? rotY(Math.PI / 2) : rotX(Math.PI / 2);
  return { primitive: PRIMITIVE.ring, kind: KIND.spin, position: at, quaternion: q, scale: [scale, scale, scale], param, col: -1, module, group, explodeMode: 'module' };
}
export function spoke(at: Vec3, axis: 'x' | 'y' | 'z', module: string, group: number, param: Vec4, r = 0.5): PartSpec {
  // A bar of length 2r through the ring centre, perpendicular to the axis, spinning with it.
  const q: Vec4 = axis === 'x' ? rotY(Math.PI / 2) : axis === 'y' ? IDENTITY_Q : IDENTITY_Q;
  return { primitive: PRIMITIVE.bar, kind: KIND.spin, position: at, quaternion: q, scale: [2 * r, 0.6, 0.6], param, col: -1, module, group, explodeMode: 'module' };
}
export function tile(at: Vec3, module: string, group: number, kind: KindId, param: Vec4, col = -1): PartSpec {
  return { primitive: PRIMITIVE.tile, kind, position: at, quaternion: IDENTITY_Q, scale: [1, 1, 1], param, col, module, group, explodeMode: 'module' };
}
export function cell(at: Vec3, s: Vec3, module: string, group: number, kind: KindId, param: Vec4, col: number, explodeMode: PartSpec['explodeMode'] = 'rise'): PartSpec {
  return { primitive: PRIMITIVE.cell, kind, position: at, quaternion: IDENTITY_Q, scale: s, param, col, module, group, explodeMode };
}
```

- [ ] **Step 3: `src/bench/configs/quoter.ts`**

```ts
import { KIND, MACHINE, PRIMITIVE, type MachineConfig, type PartSpec, type Vec3 } from '@/bench/types';
import { hash2 } from '@/bench/hash';
import { IDENTITY_Q } from '@/bench/math';
import { bar, cell, ring, rod, spoke, tile } from './helpers';

export const QUOTER_BED = { cols: 64, rows: 48, pitch: 0.15, cellScale: 0.12, hBase: 0.4 } as const;
// Frame envelope (local): x ±5.8, z ±3.95, top rails at y 1.4, carriage rails at y 1.0.
const FX = 5.8, FZ = 3.95, TOP = 1.4, RAIL_Y = 1.0;
const RAIL_Z = [-2.4, 0, 2.4];

export const QUOTER: MachineConfig = {
  id: MACHINE.quoter, name: 'quoter', footprint: { w: 12, d: 8 },
  build(ctx) {
    const P: PartSpec[] = [];
    // group 0: frame
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(bar([sx * FX, 0, sz * FZ], [sx * FX, TOP, sz * FZ], 'posts', 0));
    for (const sz of [-1, 1]) { P.push(bar([-FX, TOP, sz * FZ], [FX, TOP, sz * FZ], 'topRailsX', 0)); P.push(bar([-FX, 0.06, sz * FZ], [FX, 0.06, sz * FZ], 'baseRailsX', 0)); }
    for (const sx of [-1, 1]) { P.push(bar([sx * FX, TOP, -FZ], [sx * FX, TOP, FZ], 'topRailsZ', 0)); P.push(bar([sx * FX, 0.06, -FZ], [sx * FX, 0.06, FZ], 'baseRailsZ', 0)); }

    // group 1: bed (rise), ordered by column so it racks in from −x
    const cols = Math.round(QUOTER_BED.cols * (ctx.density === 1 ? 1 : 0.5));
    const rows = Math.round(QUOTER_BED.rows * (ctx.density === 1 ? 1 : 0.5));
    const pitch = QUOTER_BED.pitch * (QUOTER_BED.cols / cols);
    const cs = QUOTER_BED.cellScale * (QUOTER_BED.cols / cols);
    const x0 = -((cols - 1) * pitch) / 2, z0 = -((rows - 1) * pitch) / 2;
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const size = 0.6 + 0.4 * hash2(c, r);
      const at: Vec3 = [x0 + c * pitch, 0, z0 + r * pitch];
      P.push(cell(at, [cs, QUOTER_BED.hBase, cs], 'bed', 1, KIND.cell, [c, r, size, 0], c));
    }
    if (ctx.caps) for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const size = 0.6 + 0.4 * hash2(c, r);
      P.push({ primitive: PRIMITIVE.cap, kind: KIND.cap, position: [x0 + c * pitch, QUOTER_BED.hBase, z0 + r * pitch], quaternion: IDENTITY_Q, scale: [cs, 1, cs], param: [c, r, size, 0], col: c, module: 'bed', group: 1, explodeMode: 'rise' });
    }

    // group 2: carriage rails and supports
    RAIL_Z.forEach((z, i) => {
      P.push(bar([-FX + 0.2, RAIL_Y, z], [FX - 0.2, RAIL_Y, z], `rail${i}`, 2));
      for (const sx of [-1, 1]) P.push(bar([sx * (FX - 0.2), 0.06, z], [sx * (FX - 0.2), RAIL_Y, z], `railSupport${i}`, 2));
    });

    // group 3: six carriages, two per rail, opposite phases
    let k = 0;
    RAIL_Z.forEach((z, i) => {
      for (const side of [0, 1]) {
        const m = `carriage${k}`;
        const period = 1.6 + 4.4 * hash2(k, 11), phase = 0, dir = side ? -1 : 1;
        const sweep = [2 * (FX - 0.9), period, phase, dir] as const;
        const x = side ? (FX - 0.9) : -(FX - 0.9);  // parked at opposite rail ends; sweep offset = dir * len * 0.5 * (1 - cos(2π(mt/period + phase)))
        const y = RAIL_Y;
        P.push(bar([x - 0.45, y, z - 0.45], [x + 0.45, y, z - 0.45], m, 3, KIND.sweep, sweep));
        P.push(bar([x - 0.45, y, z + 0.45], [x + 0.45, y, z + 0.45], m, 3, KIND.sweep, sweep));
        P.push(bar([x - 0.25, y + 0.15, z - 0.5], [x - 0.25, y + 0.15, z + 0.5], m, 3, KIND.sweep, sweep));
        P.push(bar([x + 0.25, y + 0.15, z - 0.5], [x + 0.25, y + 0.15, z + 0.5], m, 3, KIND.sweep, sweep));
        for (const px of [-0.3, 0.3]) for (const pz of [-0.3, 0.3]) P.push(bar([x + px, y - 0.35, z + pz], [x + px, y, z + pz], m, 3, KIND.sweep, sweep));
        P.push({ ...rod([x, y + 0.3, z - 0.4], [x, y + 0.3, z + 0.4], m, 3), kind: KIND.sweep, param: sweep });
        for (const rz of [-0.25, 0.25]) {
          P.push({ ...ring([x, y + 0.3, z + rz], 'z', m, 3, [2, 2.4, hash2(k, 5), 0], 0.35), kind: KIND.sweep, param: sweep });
          P.push({ ...spoke([x, y + 0.3, z + rz], 'z', m, 3, [2, 2.4, hash2(k, 5), 0], 0.17), kind: KIND.sweep, param: sweep });
        }
        for (let tx = 0; tx < 5; tx++) for (let tz = 0; tz < 4; tz++)
          P.push({ ...tile([x - 0.4 + tx * 0.2, y - 0.4, z - 0.3 + tz * 0.2], m, 3, KIND.sweep, sweep), scale: [0.9, 1, 0.9] });
        k++;
      }
    });

    // group 4: rotor banks (12 per side), spinning about x, with a spoke each
    for (const sx of [-1, 1]) for (let i = 0; i < 12; i++) {
      const z = -FZ + 0.55 + i * ((2 * FZ - 1.1) / 11);
      const at: Vec3 = [sx * (FX - 0.55), 0.7, z];
      const spin = [0, 1.2 + 0.8 * hash2(i, sx + 2), hash2(i, 9), 0] as const;
      P.push(ring(at, 'x', `rotor${sx > 0 ? 'R' : 'L'}${i}`, 4, spin, 0.45));
      P.push(spoke(at, 'x', `rotor${sx > 0 ? 'R' : 'L'}${i}`, 4, spin, 0.22));
      P.push(rod([at[0] - 0.12, at[1], at[2]], [at[0] + 0.12, at[1], at[2]], `rotor${sx > 0 ? 'R' : 'L'}${i}`, 4));
    }

    // group 5: the lever, alone; pivot at its −x end on the front-left post at y 1.2, pointing +x, raised 30° until it locks
    P.push({ primitive: PRIMITIVE.bar, kind: KIND.lever, position: [-FX + 0.5, 1.2, FZ], quaternion: IDENTITY_Q, scale: [1.0, 1.4, 1.4], param: [2, -0.5, 0, 0], col: -1, module: 'lever', group: 5, explodeMode: 'module' });
    return P;
  },
};
```

- [ ] **Step 4: Run** → PASS. If counts fall outside 6,000–9,000, adjust tile grids, never the bed. **Commit:** `git add src/bench/configs && git commit -m "Add the hand-authored quoter config"`

---

### Task 1.4: Intake, bot and slot configs **[parallel-safe]**

**Files:** `src/bench/configs/intake.ts`, `src/bench/configs/bot.ts`, `src/bench/configs/slot.ts`, `src/bench/configs/small.test.ts`

**Interfaces:** `INTAKE`, `BOT`, `SLOT: MachineConfig`. Param conventions: `lane`: `[rate, phase, segLen, j]` with `j = 0` for the intake chute and `j = 1..12` for a splitter out-lane; `ping`: `[periodS, phase, pulseScale (2.0), 0]`; `scan`: `[fieldWidth, sweepPeriodS, 0, 0]` for the rail.

- [ ] **Step 1: Failing test `src/bench/configs/small.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { INTAKE } from './intake'; import { BOT } from './bot'; import { SLOT } from './slot';
import { KIND, PRIMITIVE } from '@/bench/types'; import { mulberry32 } from '@/bench/hash';
const ctx = { tier: 'desktop' as const, rng: mulberry32(3), density: 1, caps: true };
describe('small configs', () => {
  it('intake: hopper, chute, 24 tiles, one lever last', () => {
    const p = INTAKE.build(ctx);
    expect(p.filter((x) => x.primitive === PRIMITIVE.tile)).toHaveLength(24);
    expect(p.filter((x) => x.kind === KIND.lever)).toHaveLength(1);
    expect(p.length).toBeGreaterThan(300); expect(p.length).toBeLessThan(450);
  });
  it('bot: exactly six parts, all ping, no lever', () => {
    const p = BOT.build(ctx);
    expect(p).toHaveLength(6);
    p.forEach((x) => expect(x.kind).toBe(KIND.ping));
  });
  it('slot: four rails and one scanning bar, no lever', () => {
    const p = SLOT.build(ctx);
    expect(p).toHaveLength(5);
    expect(p.filter((x) => x.kind === KIND.scan)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: `intake.ts`** — local origin is at the quoter's −x end (placement handles it). Group 0 `hopper`: a 1.2 × 1.2 × 1.2 box frame of 12 bars centred at `[0, 1.6, 0]` plus 4 legs; group 1 `chute`: two rails from `[0.6, 1.1, ±0.35]` down to `[1.4, 0.45, ±0.35]` (kind static) and 24 tiles (kind lane, param `[4.0, i/24, 1.0, 0]`) resting in the hopper at a 6 × 4 grid `[−0.3 + (i%6)·0.12, 1.15, −0.18 + floor(i/6)·0.12]`; group 2: the lever, a bar on the hopper's top-front edge at `[−0.6, 2.2, 0.6]`, `param [2, −0.5, 0, 0]`. Fill the hopper frame with a grille of short bars: a 7 × 7 mesh on each of the three closed walls and the floor (interior mesh lines only, the frame is the border; the +x wall stays open for the chute), (7 − 1) · 7 · 2 = 84 bars per face, 336 in all, so the count lands at 379 (12 frame + 4 legs + 336 grille + 2 rails + 24 tiles + 1 lever), inside the test's 300–450 bound.
- [ ] **Step 3: `bot.ts`** — one bar `[−0.3,0.3,0]→[0.3,0.3,0]` kind ping param `[1.6, 0, 2.0, 0]`; four cells `[−0.22 + i·0.15, 0, 0]` scale `[0.12, 0.25, 0.12]` kind ping param `[1.6, i·0.1, 2.0, 0]` explodeMode 'module'; one ring at `[0, 0.55, 0]` axis z scale 0.18 kind ping (spin visual comes from param phase; keep kind ping so it pulses) param `[1.6, 0.05, 2.0, 0]`. All group 0.
- [ ] **Step 4: `slot.ts`** — four bars along x, length 1.6, at z `−0.45, −0.15, 0.15, 0.45`, y 0.06, kind static (these never ink: the slot machine is excluded from `inkedAtEnd`); one scanning bar along z, length 1.0, kind scan param `[1.6, 3.0, 0, 0]` at `[−0.8, 0.12, 0]`. All group 0.
- [ ] **Step 5: Run** → PASS. **Commit:** `git add src/bench/configs && git commit -m "Add intake, bot and slot configs"`

---

### Task 1.5: Balance, splitter and watch configs **[parallel-safe]**

**Files:** `src/bench/configs/balance.ts`, `src/bench/configs/splitter.ts`, `src/bench/configs/watch.ts`, `src/bench/configs/mid.test.ts`

**Interfaces:** `BALANCE`, `SPLITTER`, `WATCH: MachineConfig`; `WATCH_FIELD = { cols: 48, rows: 16, pitch: 0.07 }`. Params: `tilt`: `[pivotX (local x of the post), 0, 0, 0]` on rail parts; `stack`: `[side (−1 left / +1 right), indexInStack, gameClockOffset, 0]` on tiles; `lane` as in 1.4: splitter tiles are 48 = 4 jobs × 12 lanes, tile `i` has `j = 1 + (i % 12)` and `phase = floor(i / 12) / 4`; `scan` field cells: `[col, row, hashedBaseline, 0]`; scan rail: `[fieldWidth, sweepPeriodS, 0, 0]`.

- [ ] **Step 1: Failing test** asserting: balance has one post, one rail of kind tilt, 96 tiles of kind stack (48 per side), one lever; splitter has 1 in-rail, 12 out-rails, 2 rings + 2 spokes (spin), 48 tiles (lane) and one lever, total 180–260; watch has 48 × 16 cells (kind scan, explodeMode 'rise'), one rail (kind scan), one lever, total 769 ± 2 on desktop and ≈ 194 on phone (24 × 8 + 2).
- [ ] **Step 2: `balance.ts`** — post: vertical bar `[0,0,0]→[0,0.9,0]` group 0; rail: bar `[−1.4,0.9,0]→[1.4,0.9,0]` kind tilt param `[0,0,0,0]` group 0; two end trays: 4 short bars each at x ±1.3 group 0; tiles: for side ∈ {−1, +1}, i ∈ 0..47: tile at `[side·1.3, 0.93 + i·0.025, 0]` kind stack param `[side, i, i/48, 0]` group 1 (tiles are `explodeMode 'module'`); lever: bar on the post cap `[0.05, 1.0, 0]→[0.45, 1.0, 0]` kind lever param `[2, −0.5, 0, 0]` group 2.
- [ ] **Step 3: `splitter.ts`** — in-rail: bar `[−2.0, 0.3, 0]→[−0.4, 0.3, 0]` group 0; block: 6 bars forming a 0.5 cube at `[0,0.3,0]` group 0; two rings axis z at `[0, 0.75, ±0.3]` scale 0.3 with spokes, kind spin param `[2, 3.0, 0, 0]` group 1; twelve out-rails: from `[0.3, 0.3, 0]` to `[2.2, 0.3, −1.1 + j·0.2]`, j 0..11, group 1; tiles: 48 kind lane, param `[2.2, Math.floor(i / 12) / 4, 3.8, 1 + (i % 12)]` resting on the in-rail at `[−1.9, 0.33, 0]` (all twelve of a job stack at the same rest point so one tile reads as one until the block splits it), group 1; lever: on the block `[0, 0.6, 0.3]→[0.4, 0.6, 0.3]` kind lever group 2.
- [ ] **Step 4: `watch.ts`** — field: cols × rows cells (phone: /2 each), pitch 0.07 (phone 0.14), scale `[0.05, 0.12, 0.05]` (phone doubled), kind scan param `[c, r, hash2(c,r), 0]`, explodeMode 'rise', group 0, ordered by column; rail: bar along z spanning the field depth at x = field min, y 0.2, kind scan param `[fieldWidth, 4.0, 0, 0]` group 0; lever: at the rail's −z end `[fieldMinX, 0.35, fieldMinZ − 0.1]` pointing +x, kind lever group 1.
- [ ] **Step 5: Run** → PASS. **Commit:** `git add src/bench/configs && git commit -m "Add balance, splitter and watch configs"`

---

### Task 1.6: Visitor layout (sentence → config) **[parallel-safe]**

**Files:** `src/bench/visitorLayout.ts`, `src/bench/visitorLayout.test.ts`

**Interfaces:** `parseSentence(text: string): { words: string[]; sentences: number }` (words = whitespace-split non-empty tokens, cap 24; sentences = count of `[.!?]`-terminated runs, min 1 if any word, cap 4); `visitorConfig(text: string): MachineConfig` (id `MACHINE.visitor`); `VISITOR_RESERVE = 30` (the instance budget the kits reserve at scale 0).

- [ ] **Step 1: Failing test** (Review Focus #2):

```ts
import { describe, it, expect } from 'vitest';
import { parseSentence, visitorConfig, VISITOR_RESERVE } from './visitorLayout';
import { KIND } from './types'; import { mulberry32 } from './hash';
const ctx = { tier: 'desktop' as const, rng: mulberry32(1), density: 1, caps: true };
describe('visitor layout', () => {
  it('parses words and sentences with caps', () => {
    expect(parseSentence('a bot that trades. and a bar.')).toEqual({ words: ['a', 'bot', 'that', 'trades.', 'and', 'a', 'bar.'], sentences: 2 });
    expect(parseSentence('   ')).toEqual({ words: [], sentences: 0 });
    expect(parseSentence('...')).toEqual({ words: ['...'], sentences: 1 });
    expect(parseSentence(Array(40).fill('w').join(' ')).words).toHaveLength(24);
    expect(parseSentence('a. b. c. d. e. f.').sentences).toBe(4);
  });
  it('builds bars = words, rails = sentences, one ring, one lever, within the reserve', () => {
    const p = visitorConfig('build a thing that runs. then another.').build(ctx);
    expect(p.filter((x) => x.kind === KIND.ping)).toHaveLength(7);       // words as pulsing cells
    expect(p.filter((x) => x.kind === KIND.static)).toHaveLength(2);     // rails
    expect(p.filter((x) => x.kind === KIND.spin)).toHaveLength(2);       // ring + spoke
    expect(p.filter((x) => x.kind === KIND.lever)).toHaveLength(1);
    expect(p.length).toBeLessThanOrEqual(VISITOR_RESERVE);
    p.forEach((x) => x.scale.forEach((s) => expect(Number.isFinite(s) && s > 0).toBe(true)));
  });
  it('empty text builds nothing', () => { expect(visitorConfig('').build(ctx)).toHaveLength(0); });
});
```

- [ ] **Step 2: Implement.** Words become cells (`KIND.ping`, param `[1.2 + 0.6·hash, i/words, 1.6, 0]`, scale `[0.1, 0.15 + 0.03·min(len, 12), 0.1]`, placed along x at pitch 0.14 in rows of up to 12, one row per sentence up to 4, explodeMode 'module'); rails are bars along x under each row (`KIND.static`); the motor is a ring + spoke at the row's −x end (`KIND.spin`, param `[2, 2.0, 0, 0]`); the lever is the last group. Cap 24 words + 4 rails + 2 + 1 = 31 → reduce the word cap to 23 in `parseSentence` if the sum exceeds `VISITOR_RESERVE`, and assert in a test that `words(24)` builds ≤ 30 parts. **Commit:** `git add src/bench/visitorLayout* && git commit -m "Add visitor sentence layout"`

---

### Task 1.7: OU texture generator **[parallel-safe]**

**Files:** `src/bench/ou.ts`, `src/bench/ou.test.ts`

**Interfaces:** `OU = { markets: 256, steps: 2048, rows: 48 }`; `generateOU(seed: number): Uint8Array` (RGBA8, length markets × steps × 4, row-major by step then market: index `((step × markets) + market) × 4`); channels R = mid level 0..47, G = bid offset 1..4, B = ask offset 1..4, A = fill flag 0 or 255.

- [ ] **Step 1: Failing test**: length; R within [0, 47]; G,B within [1, 4]; fill rate between 3% and 10%; fills cluster (probability of a fill given a fill in the previous step is at least 2× the base rate); mean-reversion (the mean of R over all steps is within 24 ± 4 for every market; the lag-1 autocorrelation of R is > 0.9).
- [ ] **Step 2: Implement** with `mulberry32(seed)`: for each market, `x` starts at 24 + 8·(rand−0.5); each step `x += 0.05·(24 − x) + 0.9·gauss()`; `R = clamp(round(x), 0, 47)`; `G = 1 + floor(4·rand^2)`, `B` likewise; Hawkes-style fills: intensity `λ = base(0.04) + excite`, `excite *= 0.7` each step, on a fill `excite += 0.25`; A = 255 if `rand < λ`. `gauss()` via Box–Muller from the same rng. **Commit:** `git add src/bench/ou* && git commit -m "Add seeded OU quote texture generator"`

---

### Task 1.8: Camera poses and `sceneState(g)` **[parallel-safe]**

**Files:** `src/bench/camera.ts`, `src/bench/sceneState.ts`, `src/bench/sceneState.test.ts`

**Interfaces:**

```ts
// camera.ts
export interface Pose { position: Vec3; lookAt: Vec3; fov: number }
export interface CameraKey { section: number; u: number; pose: Pose }
export const CAMERA_KEYS: Record<Tier, CameraKey[]>
export function evaluatePose(section: number, u: number, tier: Tier, out: { position: number[]; lookAt: number[]; fov: number }): void
// sceneState.ts
export interface SceneState {
  section: number; u: number;
  pose: { position: number[]; lookAt: number[]; fov: number };
  compileTarget: (number | null)[];   // per machine; null = not scroll-driven (quoter, visitor)
  merge: number;                      // 0..6
  lean: number;                       // -1..1
  burst: number;                      // 0..1 (merge burst-back progress, drives the merge ink partition)
  active: MachineId;                  // shadow-fit subject
  trickle: boolean;
  rung: number;                       // -1..5, lit ladder rung in section 02
  click: number;                      // -1..3, revealed copy line in section 02
}
export function sceneState(g: number, ranges: SectionRange[], tier: Tier, out: SceneState): SceneState
```

- [ ] **Step 1: Failing test** for `sceneState`: at g 0 → section 0, u 0, compileTarget all null/0/1 as specified (bot 1, slot 1, intake 0, balance 0, splitter 0, watch 0, quoter null, visitor null), merge 0, trickle true; in section 1 at u 0.375 → merge ≈ 3 (within 0.05 of an integer after the smoothstep window), rung 2, click 2; at u 0.9 → burst ≈ 0.55, lean ≈ sin(π·0.55), merge < 3; section 4 (heron) at u 0.285 → compileTarget[balance] ≈ 0.5; section 6 at u 1 → compileTarget[balance] = 1, [splitter] = 1, [watch] = 1; section 7 (alive) → trickle false; scrolling back to section 4 u 0 → compileTarget[balance] = 0 (reverses). Use the desktop heights to build `ranges` as in Stage 0's test.
- [ ] **Step 2: `camera.ts`** — the key tables. Desktop keys (bench space; initial values, to be tuned at gate G1/G3/G4 and re-emitted):

```ts
const D: CameraKey[] = [
  { section: 0, u: 0.00, pose: { position: [6.5, 4.2, 11.5], lookAt: [1.2, 0.4, -2.2], fov: 30 } },   // hero product shot; bench cropped at frame edge
  { section: 0, u: 0.15, pose: { position: [6.5, 4.2, 11.5], lookAt: [1.2, 0.4, -2.2], fov: 30 } },   // hold while the copy is sticky
  { section: 0, u: 1.00, pose: { position: [3.5, 9.5, 8.5], lookAt: [0.2, 0.2, -1.2], fov: 30 } },    // risen; bench enters from the bottom
  { section: 1, u: 0.10, pose: { position: [2.8, 10.5, 5.5], lookAt: [0, 0.3, -2], fov: 30 } },       // high 3/4, ~55°, frame and carriages in frame
  { section: 1, u: 1.00, pose: { position: [2.8, 10.5, 5.5], lookAt: [0, 0.3, -2], fov: 30 } },
  { section: 2, u: 0.30, pose: { position: [-4.3, 0.9, 4.3], lookAt: [-5.4, 0.25, 2.5], fov: 30 } },  // macro on the bot
  { section: 2, u: 0.70, pose: { position: [-1.5, 3.2, 9.0], lookAt: [-2.5, 0.3, 0.0], fov: 30 } },   // bot and quoter share the frame
  { section: 2, u: 1.00, pose: { position: [-1.5, 3.2, 9.0], lookAt: [-2.5, 0.3, 0.0], fov: 30 } },
  { section: 3, u: 0.00, pose: { position: [-9.5, 2.4, 4.5], lookAt: [-4.5, 0.2, -2.0], fov: 30 } },  // dolly start
  { section: 3, u: 0.25, pose: { position: [8.5, 2.4, 4.5], lookAt: [3.5, 0.2, -2.0], fov: 30 } },    // dolly end (the one lateral dolly)
  { section: 3, u: 1.00, pose: { position: [8.5, 2.4, 4.5], lookAt: [3.5, 0.2, -2.0], fov: 30 } },
  { section: 4, u: 0.15, pose: { position: [-4.2, 1.7, 10.0], lookAt: [-4.2, 0.45, 4.4], fov: 30 } }, // side on the balance, quoter behind
  { section: 4, u: 1.00, pose: { position: [-4.2, 1.7, 10.0], lookAt: [-4.2, 0.45, 4.4], fov: 30 } },
  { section: 5, u: 0.15, pose: { position: [-3.6, 1.1, 7.6], lookAt: [1.2, 0.3, 4.4], fov: 30 } },    // long low along the splitter
  { section: 5, u: 1.00, pose: { position: [-3.6, 1.1, 7.6], lookAt: [1.2, 0.3, 4.4], fov: 30 } },
  { section: 6, u: 0.15, pose: { position: [4.6, 4.8, 8.2], lookAt: [4.6, 0.0, 4.4], fov: 30 } },     // high calm on the watch
  { section: 6, u: 1.00, pose: { position: [4.6, 4.8, 8.2], lookAt: [4.6, 0.0, 4.4], fov: 30 } },
  { section: 7, u: 0.60, pose: { position: [4.5, 2.8, 14.0], lookAt: [-0.6, 0.6, -0.5], fov: 30 } },  // poster: small machines large, quoter the wall
  { section: 7, u: 1.00, pose: { position: [4.5, 2.8, 14.0], lookAt: [-0.6, 0.6, -0.5], fov: 30 } },
  { section: 8, u: 0.25, pose: { position: [7.8, 1.3, 10.2], lookAt: [6.0, 0.2, 6.4], fov: 30 } },    // low on the slot
  { section: 8, u: 1.00, pose: { position: [7.8, 1.3, 10.2], lookAt: [6.0, 0.2, 6.4], fov: 30 } },
];
```

Phone keys: same structure with fov 38, the hero a macro on the bed's front-left corner (`position [-2.6, 2.2, 5.2], lookAt [-4.2, 0.3, 0.6]`), and every other pose pulled 20% closer to its lookAt and raised so machines sit in the lower 55% of a portrait frame (`position.y += 1.2`). `evaluatePose` finds the surrounding keys by `section + u`, blends with `power2InOut`, and holds when both keys share a pose.

- [ ] **Step 3: `sceneState.ts`** — pure function per the interface. Merge: in section 1, for `u ∈ [0.10, 0.65]` the level `L = floor(6·(u−0.10)/0.55)`, `f = smoothstep(0, 0.3, fract(6·(u−0.10)/0.55))`, `merge = min(6, L + f)`; hold at 6 for `u ∈ [0.65, 0.78]`; burst for `u ∈ [0.78, 1]`: `burst = (u−0.78)/0.22`, `merge = 6·(1 − burst)`, `lean = sin(π·burst)`; `rung = clamp(floor(merge) − 1, −1, 5)`; `click`: 0..3 by merge thresholds (`merge ≥ 1 → 0`, `≥ 3 → 1`, `burst > 0 → 2`, `burst > 0.5 → 3`). Compile targets from `SECTIONS[i].build` windows; machines built in earlier sections are 1; bot and slot are 1 always; quoter and visitor null. `active = SECTIONS[section].machine`. `trickle = SECTIONS[section].id !== 'alive'`.
- [ ] **Step 4: Run** → PASS. **Commit:** `git add src/bench/camera.ts src/bench/sceneState* && git commit -m "Add camera key tables and pure sceneState(g)"`

---

### Task 1.9: SVG plate projection **[parallel-safe]**

**Files:** `src/bench/svgPlate.ts`, `src/bench/svgPlate.test.ts`

**Interfaces:** `projectParts(result: LayoutResult, pose: Pose, aspect: number): Array<{ part: PartInstance; x: number; y: number; w: number; h: number; depth: number }>` (NDC, y up); `heroPlateSvg(result, pose, aspect, opts: { inkMachines: MachineId[]; pencilMachines: MachineId[]; cropMachines: MachineId[] }): string` (viewBox `-1 -1 2 2`, `transform="scale(1,-1)"` so NDC y-up maps to SVG, hairline `stroke="var(--pencil)"` rects for pencil module parts, leader lines as `<line>` from explode to slot, the bed as one `<polygon fill="url(#bedgrid)">` built from the bed's four corner cells, ink machines as filled rects `fill="var(--ink)"`); `inkPlateSvg(result, machine: MachineId, pose, aspect, cap = 2500): string` (assembled ink plate, largest projected rects first, a flat `<ellipse>` shadow `fill="var(--shadow)"`). Projection uses three's `PerspectiveCamera` and `Vector3.project` (math only; `import { PerspectiveCamera, Vector3 } from 'three'` is allowed in bench).

- [ ] **Step 1: Failing test**: with the desktop layout of all configs (Task 1.10 exposes `ALL_CONFIGS`; until then build the list inline from 1.3–1.5) and the section-0 desktop pose, `heroPlateSvg` contains `<svg`, a `viewBox="-1 -1 2 2"`, more than 300 `<rect` (module parts) and at least 300 `<line` (leader lines), exactly one `<polygon` (the bed), and 6 `fill="var(--ink)"` rects (the bot); every projected `x`/`y` in `projectParts` for the quoter is finite; `inkPlateSvg(quoter)` contains at most 2,500 `<rect`.
- [ ] **Step 2: Implement.** Per part, project the rest position and a second point offset by the part's largest scale axis to estimate the on-screen width/height (a bar's projected length; a cell's projected footprint). Emit `<rect x y width height>` in NDC units. Write the file in one string builder; no DOM. **Commit:** `git add src/bench/svgPlate* && git commit -m "Add SVG plate projection for the emitter"`

---

### Task 1.10: `ALL_CONFIGS`, counts and the bench index

**Files:** `src/bench/index.ts`, `src/bench/counts.ts`, `src/bench/counts.test.ts`

**Interfaces:** `ALL_CONFIGS: MachineConfig[]` (quoter, intake, balance, splitter, watch, bot, slot; the visitor config is built per sentence); `buildBench(tier: Tier): LayoutResult` (= `layout({ tier, seed: hashString(BENCH_SEED_TEXT), configs: ALL_CONFIGS })`); `benchCounts(result): { total, inkedAtEnd, byMachine, quoterAtHero (quoter only), quoterWithIntake }`; `index.ts` re-exports everything public from the package.

- [ ] **Step 1: Failing test**: desktop `buildBench` total in [7,500, 10,500]; `inkedAtEnd` excludes slot and visitor; `quoterAtHero` equals `byMachine[quoter]`; phone total in [1,600, 2,600]; the layout is deterministic across two calls; `machines[quoter].foot` has y 0 and z near the quoter's front (`> 1.5`).
- [ ] **Step 2: Implement** and run the whole package: `npx vitest run src/bench` → PASS. Print the desktop counts to the console in the test (`console.info(JSON.stringify(counts))`) and paste them into the commit message.
- [ ] **Step 3: Commit** — `git add src/bench && git commit -m "Add bench index and counts (desktop total N, inked M)"`

**Stage gate:** `npx vitest run` green; `npx tsc --noEmit` clean; the desktop count is inside the band. The orchestrator records the counts in the Stage 2 brief.
