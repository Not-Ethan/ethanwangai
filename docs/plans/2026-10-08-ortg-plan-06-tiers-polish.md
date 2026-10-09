# Stage 5 — Tiers, fallbacks, still capture, performance, a11y, branch review

> Part of `2026-10-08-ortg-plan-00-index.md`: read its Global Constraints, Review Focus and Interface contracts first; they are law here. This stage argues from spec `docs/plans/2026-10-08-only-running-things-glow-design.md` §11 (tiers, step-down ladder, portrait by aspect, reduced motion, no WebGL, storage blocked), §6 (DPR, antialias, shadows, draw counts), §3 (portrait yaw column), §4 (both cameras), §7 (the still as first paint), §8 (the three clocks), §9 (palette, scrims, 4.5:1), §10 (the still and og capture), §12 (budgets and silent killers), §14 (G6, G7) and §16 (verification, branch review). It consumes everything Stages 0–4 built. It ends with gates **G6 tiers** (phone at 390 × 844 under 4× CPU throttling ≥ 45 fps with the valley in the lower 60% and copy legible; `?nogl=1` shows the still, the complete DOM and the SVG house; reduced motion shows no chain and final states) and **G7 performance** (frame time under 16.7 ms at rest for 10 s at g = 0, 0.5, 1 on the exported build; main-pass draws ≤ 18; heap flat over 10 s), both judged by an Opus gate agent from the exported build, then a whole-branch Opus review.

Order: 5.1, 5.2, 5.3 and 5.4 are **[parallel-safe]** with each other. Then 5.5 → 5.6 → 5.7 → 5.8 → 5.9 → 5.10 run in order (they share `Scene.tsx`, `Site.tsx` and `globals.css`). 5.11 (gate agent, Opus) and 5.12 (branch review, Opus) run last.

**Names from earlier stages that are not in the index contracts.** Each task lists the ones it uses under Consumes with a grep that confirms them. If a grep shows Stage 0–4 chose a different name, use the real name, keep every string, number and behaviour in this plan unchanged, and say so in the commit message body. Tests in this stage pin strings and numbers, never key names, so they stay valid either way.

---

### Task 5.1: Re-tune `useTier` and define the step-down ladder **[parallel-safe]**

Spec §11 (phone tier, step-down ladder, `TierSettings` keeps `tier`, `dpr`, `shadows`, `antialias`; `stretch`, `lines`, `msaa` removed; `DPR_FLOOR` 0.85; `PerformanceMonitor` only walks the ladder and never changes `tier`), §6 (DPR 1.25 desktop, 1 phone; antialias on desktop; shadows desktop only; draw counts 16 desktop, 14 phone, +1 scaffold), §4.6 (ridge N on desktop, N/5 at ×1.8 on phone), §4.1 (stars 1,200; phone 400), §12 (the ridge is never below N/10).

The ladder, as this task reads §11: rungs are taken in order and each rung that would change nothing on a tier is skipped. Desktop: DPR 1.25 → 1 → 0.85, ridge halves (N → N/2), rain off, mist off: 5 rungs. Phone: DPR 1 → 0.85, ridge halves (N/5 → N/10): 2 rungs (rain and mist are already off). "Frame time exceeds 20 ms for 60 frames" becomes drei `PerformanceMonitor` with `ms: 250`, `iterations: 5`, `threshold: 0.8`, `bounds: () => [50, Infinity]`: a decline fires only when all five 250 ms windows (1.25 s, at least 60 frames at 20 ms) average under 50 fps, and the infinite upper bound means it never inclines.

**Files:**
- Modify: `src/gl/useTier.ts` (whole file replaced)
- Test: `src/gl/useTier.test.ts` (whole file replaced; the old test rendered React through R3F, this one tests the pure exports only)

**Interfaces:**
- Consumes: `Tier` from `@/valley/types` (index contract); `facts.kalshi.trades` from `@/valley/facts` (spec §2 name; confirm with `grep -n "trades" src/valley/facts.ts`); `useScroll(): { tier: Tier; reducedMotion: boolean; state; scrollTo }` from `@/scroll/ScrollProvider` (kept file).
- Produces (later tasks import these exact names):
  ```ts
  export interface TierSettings { tier: Tier; dpr: number; shadows: boolean; antialias: boolean }
  export interface SceneQuality { ridgeCount: number; ridgeSizeScale: number; stars: number; rain: boolean; mist: boolean }
  export type Rung = 'dpr' | 'ridge' | 'rain' | 'mist';
  export const TIER_SETTINGS: Record<Tier, Omit<TierSettings, 'tier'>>;
  export const DPR_LADDER: readonly [1.25, 1, 0.85];
  export const DPR_FLOOR = 0.85;
  export const PERF_MONITOR: { ms: 250; iterations: 5; threshold: 0.8; bounds: () => [number, number] };
  export function ladder(tier: Tier): Rung[];
  export function maxRung(tier: Tier): number;
  export function settingsAt(tier: Tier, rung: number): { settings: TierSettings; quality: SceneQuality };
  export function expectedMainDraws(quality: SceneQuality, building: boolean, hasVisitor: boolean): number;
  export function tierOverride(search: string): Tier | null;     // ?tier=phone|desktop (kept)
  export function rungOverride(search: string): number | null;   // ?rung=<non-negative integer>
  export function useTier(): TierSettings & SceneQuality & { rung: number; onDecline: () => void };
  ```

- [ ] **Step 1: Write the failing test**

Replace `src/gl/useTier.test.ts` with:

```ts
import { describe, it, expect, vi } from 'vitest';

// useTier.ts imports the scroll provider (Lenis, React context); the pure exports under test never call it.
vi.mock('@/scroll/ScrollProvider', () => ({
  useScroll: () => ({ tier: 'desktop', reducedMotion: false, state: { current: null }, scrollTo() {} }),
}));

import { facts } from '@/valley/facts';
import {
  TIER_SETTINGS, DPR_LADDER, DPR_FLOOR, PERF_MONITOR, ladder, maxRung, settingsAt, expectedMainDraws, tierOverride, rungOverride,
} from './useTier';

const N = facts.kalshi.trades;

describe('TIER_SETTINGS (spec §6, §11)', () => {
  it('keeps tier, dpr, shadows and antialias only: desktop 1.25 with shadows and antialias, phone 1 with neither', () => {
    expect(TIER_SETTINGS).toEqual({
      desktop: { dpr: 1.25, shadows: true, antialias: true },
      phone: { dpr: 1, shadows: false, antialias: false },
    });
  });
});

describe('the step-down ladder (spec §11)', () => {
  it('walks DPR 1.25 → 1 → 0.85, then halves the ridge, then rain off, then mist off, skipping rungs a tier has already taken', () => {
    expect(DPR_LADDER).toEqual([1.25, 1, 0.85]);
    expect(DPR_FLOOR).toBe(0.85);
    expect(ladder('desktop')).toEqual(['dpr', 'dpr', 'ridge', 'rain', 'mist']);
    expect(ladder('phone')).toEqual(['dpr', 'ridge']);
    expect(maxRung('desktop')).toBe(5);
    expect(maxRung('phone')).toBe(2);
  });

  it('desktop, rung by rung: [dpr, ridgeCount, rain, mist]', () => {
    const rows = [0, 1, 2, 3, 4, 5].map((r) => {
      const { settings, quality } = settingsAt('desktop', r);
      return [settings.dpr, quality.ridgeCount, quality.rain, quality.mist];
    });
    expect(rows).toEqual([
      [1.25, N, true, true],
      [1, N, true, true],
      [0.85, N, true, true],
      [0.85, Math.round(N / 2), true, true],
      [0.85, Math.round(N / 2), false, true],
      [0.85, Math.round(N / 2), false, false],
    ]);
  });

  it('phone, rung by rung: N/5 at ×1.8 size, 400 stars, no rain, no mist, then DPR 0.85, then N/10', () => {
    const rows = [0, 1, 2].map((r) => {
      const { settings, quality } = settingsAt('phone', r);
      return [settings.dpr, quality.ridgeCount, quality.rain, quality.mist];
    });
    expect(rows).toEqual([
      [1, Math.round(N / 5), false, false],
      [0.85, Math.round(N / 5), false, false],
      [0.85, Math.round(N / 10), false, false],
    ]);
    expect(settingsAt('phone', 0).quality).toMatchObject({ ridgeSizeScale: 1.8, stars: 400 });
    expect(settingsAt('desktop', 0).quality).toMatchObject({ ridgeSizeScale: 1, stars: 1200 });
  });

  it('never changes tier, shadows or antialias, never goes below DPR 0.85 or N/10, and clamps any rung', () => {
    for (const tier of ['desktop', 'phone'] as const) {
      for (let r = -3; r <= 20; r++) {
        const { settings, quality } = settingsAt(tier, r);
        expect(settings.tier).toBe(tier);
        expect(settings.shadows).toBe(TIER_SETTINGS[tier].shadows);
        expect(settings.antialias).toBe(TIER_SETTINGS[tier].antialias);
        expect(settings.dpr).toBeGreaterThanOrEqual(DPR_FLOOR);
        expect(quality.ridgeCount).toBeGreaterThanOrEqual(Math.round(N / 10));
      }
      expect(settingsAt(tier, 99)).toEqual(settingsAt(tier, maxRung(tier)));
      expect(settingsAt(tier, -1)).toEqual(settingsAt(tier, 0));
    }
  });
});

describe('PERF_MONITOR (spec §11: frame time over 20 ms for 60 frames)', () => {
  it('declines only when every window of a ≥ 1.2 s sample is under 50 fps, and never inclines', () => {
    const [lower, upper] = PERF_MONITOR.bounds();
    expect(1000 / lower).toBe(20);
    expect(upper).toBe(Infinity);
    expect(PERF_MONITOR.ms * PERF_MONITOR.iterations).toBeGreaterThanOrEqual(60 * 20);
    // drei declines when more than iterations·threshold windows are below `lower`: here that means all of them.
    expect(Math.floor(PERF_MONITOR.iterations * PERF_MONITOR.threshold)).toBe(PERF_MONITOR.iterations - 1);
  });
});

describe('expectedMainDraws (spec §6: 16 desktop, 14 phone, +1 scaffold during a build)', () => {
  it('counts mist and rain as the only optional draws, with a visitor house standing', () => {
    expect(expectedMainDraws(settingsAt('desktop', 0).quality, false, true)).toBe(16);
    expect(expectedMainDraws(settingsAt('desktop', 0).quality, true, true)).toBe(17);
    expect(expectedMainDraws(settingsAt('desktop', 5).quality, false, true)).toBe(14);
    expect(expectedMainDraws(settingsAt('phone', 0).quality, false, true)).toBe(14);
    expect(expectedMainDraws(settingsAt('phone', 0).quality, true, true)).toBe(15);
  });
  it('drops one draw while no visitor house exists (its mesh has an empty geometry, so three issues no draw)', () => {
    expect(expectedMainDraws(settingsAt('desktop', 0).quality, false, false)).toBe(15);
    expect(expectedMainDraws(settingsAt('phone', 0).quality, false, false)).toBe(13);
  });
});

describe('query overrides', () => {
  it('?tier= forces phone or desktop and ignores anything else', () => {
    expect(tierOverride('?debug=1&tier=phone')).toBe('phone');
    expect(tierOverride('?tier=desktop')).toBe('desktop');
    expect(tierOverride('?tier=tablet')).toBeNull();
    expect(tierOverride('')).toBeNull();
  });
  it('?rung= takes a non-negative integer and nothing else', () => {
    expect(rungOverride('?rung=3')).toBe(3);
    expect(rungOverride('?debug=1&rung=0')).toBe(0);
    expect(rungOverride('?rung=-1')).toBeNull();
    expect(rungOverride('?rung=2.5')).toBeNull();
    expect(rungOverride('?rung=x')).toBeNull();
    expect(rungOverride('?rung=')).toBeNull();
    expect(rungOverride('')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/gl/useTier.test.ts`
Expected: FAIL (`ladder`, `settingsAt`, `PERF_MONITOR`, `rungOverride` are not exported; `TIER_SETTINGS` still has `msaa`).

- [ ] **Step 3: Implement**

Replace `src/gl/useTier.ts` with:

```ts
'use client';
// The GL layer's rendering tier and the step-down ladder (spec §6, §11). The tier is the scroll layer's detectTier()
// (pointer coarse, width < 820 or hardwareConcurrency ≤ 4), or `?tier=` for stills. TierSettings keeps tier, dpr,
// shadows and antialias. drei's PerformanceMonitor (configured by PERF_MONITOR) calls onDecline, which takes the next
// rung of the ladder: DPR 1.25 → 1 → 0.85, then the ridge halves, then rain off, then mist off. A rung a tier has
// already taken (phone has no rain or mist) is skipped. The monitor never changes the tier. `?rung=n` starts n rungs
// down, so a reviewer can see each rung and G7 can bake one in.
import { useCallback, useMemo, useState } from 'react';
import type { Tier } from '@/valley/types';
import { facts } from '@/valley/facts';
import { useScroll } from '@/scroll/ScrollProvider';

export interface TierSettings { tier: Tier; dpr: number; shadows: boolean; antialias: boolean }

/** What the scene mounts and how dense it draws, per tier and rung. */
export interface SceneQuality { ridgeCount: number; ridgeSizeScale: number; stars: number; rain: boolean; mist: boolean }

export type Rung = 'dpr' | 'ridge' | 'rain' | 'mist';

export const TIER_SETTINGS: Record<Tier, Omit<TierSettings, 'tier'>> = {
  desktop: { dpr: 1.25, shadows: true, antialias: true },
  phone: { dpr: 1, shadows: false, antialias: false },
};

export const DPR_LADDER = [1.25, 1, 0.85] as const;
export const DPR_FLOOR = 0.85;

const BASE_QUALITY: Record<Tier, SceneQuality> = {
  desktop: { ridgeCount: facts.kalshi.trades, ridgeSizeScale: 1, stars: 1200, rain: true, mist: true },
  phone: { ridgeCount: Math.round(facts.kalshi.trades / 5), ridgeSizeScale: 1.8, stars: 400, rain: false, mist: false },
};

/** drei PerformanceMonitor props: decline when all five 250 ms windows average under 50 fps (20 ms); never incline. */
export const PERF_MONITOR = {
  ms: 250,
  iterations: 5,
  threshold: 0.8,
  bounds: (): [number, number] => [50, Infinity],
} as const;

/** The rungs a tier can still take, in order. */
export function ladder(tier: Tier): Rung[] {
  const base = BASE_QUALITY[tier];
  const steps: Rung[] = DPR_LADDER.filter((d) => d < TIER_SETTINGS[tier].dpr).map((): Rung => 'dpr');
  steps.push('ridge');
  if (base.rain) steps.push('rain');
  if (base.mist) steps.push('mist');
  return steps;
}

export function maxRung(tier: Tier): number {
  return ladder(tier).length;
}

/** The tier's settings and scene quality after `rung` rungs (clamped to 0..maxRung). */
export function settingsAt(tier: Tier, rung: number): { settings: TierSettings; quality: SceneQuality } {
  const steps = ladder(tier);
  const r = Number.isFinite(rung) ? Math.max(0, Math.min(steps.length, Math.floor(rung))) : 0;
  const taken = steps.slice(0, r);
  const base = BASE_QUALITY[tier];
  const start = (DPR_LADDER as readonly number[]).indexOf(TIER_SETTINGS[tier].dpr);
  const dprSteps = taken.filter((s) => s === 'dpr').length;
  return {
    settings: { tier, ...TIER_SETTINGS[tier], dpr: DPR_LADDER[Math.min(DPR_LADDER.length - 1, start + dprSteps)] },
    quality: {
      ...base,
      ridgeCount: taken.includes('ridge') ? Math.round(base.ridgeCount / 2) : base.ridgeCount,
      rain: base.rain && !taken.includes('rain'),
      mist: base.mist && !taken.includes('mist'),
    },
  };
}

/**
 * Main-pass draws at rest (spec §6): sky, stars, moon, terrain, river, buildings, windows, glow, wheel, ridge points,
 * crest line, hedge lines, hillside, visitor = 14, plus mist and rain when mounted, plus the scaffold during a build.
 * The visitor's mesh holds an empty BufferGeometry until a sentence exists, and three issues no draw for it, so the
 * count is one lower with no visitor house.
 */
export function expectedMainDraws(quality: SceneQuality, building: boolean, hasVisitor: boolean): number {
  return 13 + (hasVisitor ? 1 : 0) + (quality.mist ? 1 : 0) + (quality.rain ? 1 : 0) + (building ? 1 : 0);
}

/** The tier a `?tier=` query forces, or null when absent or not a tier name. */
export function tierOverride(search: string): Tier | null {
  const t = new URLSearchParams(search).get('tier');
  return t === 'phone' || t === 'desktop' ? t : null;
}

/** The starting rung a `?rung=` query forces: a non-negative integer, or null. */
export function rungOverride(search: string): number | null {
  const raw = new URLSearchParams(search).get('rung');
  if (raw === null || !/^\d+$/.test(raw)) return null;
  return Number(raw);
}

export function useTier(): TierSettings & SceneQuality & { rung: number; onDecline: () => void } {
  const scroll = useScroll();
  const forced = useMemo(() => (typeof window === 'undefined' ? null : tierOverride(window.location.search)), []);
  const tier = forced ?? scroll.tier;
  const [declines, setDeclines] = useState(() => (typeof window === 'undefined' ? 0 : rungOverride(window.location.search) ?? 0));
  const rung = Math.min(declines, maxRung(tier));
  // At the last rung a decline returns the same number, so React bails out and nothing re-renders.
  const onDecline = useCallback(() => setDeclines((n) => Math.min(n + 1, maxRung(tier))), [tier]);
  const { settings, quality } = settingsAt(tier, rung);
  return { ...settings, ...quality, rung, onDecline };
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run src/gl/useTier.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Typecheck the callers and keep the tree green**

Run: `grep -rnE "\b(msaa|stretch|lines)\b" src/gl src/site --include=*.ts --include=*.tsx | grep -v useTier`
Expected: nothing. Stage 2's `ValleyCanvas` reads only `{ tier, dpr, shadows, onDecline }` and Stages 3–4 read `{ shadows }`, all still returned. If the grep does find a caller (most likely `src/gl/Scene.tsx` destructuring `msaa`), make the minimal change in that file in this task: drop the removed field from the destructuring and from wherever it is passed (for `msaa`, the Canvas keeps `antialias` from `useTier()`). Task 5.5 does the full Scene rewiring later; this task only keeps `tsc` green.

Run: `npx tsc --noEmit`
Expected: exit 0, no output. Never commit with `tsc` red.

- [ ] **Step 6: Commit**

```bash
git add src/gl/useTier.ts src/gl/useTier.test.ts   # plus any caller Step 5 changed
git commit -m "Re-tune useTier: tier/dpr/shadows/antialias, DPR floor 0.85, the step-down ladder"
```

**Verify:**
- `npx vitest run src/gl/useTier.test.ts` passes.
- `grep -nE "msaa|stretch|lines" src/gl/useTier.ts` prints nothing.
- `grep -n "DPR_FLOOR = 0.85" src/gl/useTier.ts` prints one line.
- `ladder('phone')` contains no `rain`/`mist` rung (test 'walks DPR…').

---

### Task 5.2: Portrait recomposition by aspect, not tier **[parallel-safe]**

Spec §11 ("Portrait recomposition is by aspect (vw < vh), not tier, so a small landscape laptop keeps the landscape camera"), §4 (hero camera landscape (0, 14, 70) → (0, 2, −10) fov 36; portrait (0, 22, 96) → (0, 0, −12) fov 70; near 1, far 260), §3 (portrait yaw column), §6 (`CameraRig.tsx`: fixed position per aspect, recomposition on aspect change), index Review Focus 2 (resize or rotation mid-visit).

Stage 2 already recomposes: `cameraCore.ts` exports `isPortrait`, `CAMERA_NEAR`, `CAMERA_FAR` and `setRigMode`; `CameraRig.tsx` calls `setRigMode(rig, isPortrait(width, height), parallaxOn)` on every size change; `Driver.tsx` passes `rig.portrait` to `setFrameInputs`; `composeCamera` (called once per frame by the Driver) is the only writer of the camera. This task adds no second camera writer and redefines nothing. It adds a thin `composition.ts` that re-exports Stage 2's names plus `cameraFor`, pins the aspect rule in tests, and checks that nothing in `src/gl/` decides portrait by tier. A square viewport (vw = vh) is landscape: the spec says portrait is aspect < 1.

**Files:**
- Create: `src/gl/composition.ts`
- Test: `src/gl/composition.test.ts`
- Modify: `src/gl/CameraRig.tsx` (only its import line, to read `isPortrait` from `./composition`), and any other `src/gl/*.ts(x)` file the grep in Step 5 finds deciding portrait by tier

**Interfaces:**
- Consumes: `CAMERA_LANDSCAPE`, `CAMERA_PORTRAIT: { position: Vec3; lookAt: Vec3; fov: number }`, `PLACES` from `@/valley/layout`; `Vec3` from `@/valley/types`; `isPortrait`, `CAMERA_NEAR`, `CAMERA_FAR`, `setRigMode` from `./cameraCore` (Stage 2 Task 2.1).
- Produces:
  ```ts
  export { isPortrait, CAMERA_NEAR, CAMERA_FAR } from './cameraCore';   // re-exported, never redefined
  export function cameraFor(width: number, height: number): { position: Vec3; lookAt: Vec3; fov: number };
  ```

- [ ] **Step 1: Write the failing test**

`src/gl/composition.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { CAMERA_LANDSCAPE, CAMERA_PORTRAIT, PLACES } from '@/valley/layout';
import { isPortrait, cameraFor, CAMERA_NEAR, CAMERA_FAR } from './composition';

function ndc(width: number, height: number, p: readonly [number, number, number]): Vector3 {
  const c = cameraFor(width, height);
  const cam = new PerspectiveCamera(c.fov, width / height, CAMERA_NEAR, CAMERA_FAR);
  cam.position.set(c.position[0], c.position[1], c.position[2]);
  cam.lookAt(c.lookAt[0], c.lookAt[1], c.lookAt[2]);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return new Vector3(p[0], p[1] + 3, p[2]).project(cam);
}

describe('composition by aspect (spec §11, §4)', () => {
  it('is portrait only when the viewport is narrower than it is tall', () => {
    expect(isPortrait(390, 844)).toBe(true);
    expect(isPortrait(844, 390)).toBe(false);    // a phone rotated to landscape
    expect(isPortrait(1440, 900)).toBe(false);
    expect(isPortrait(800, 600)).toBe(false);    // phone tier by width (< 820) but landscape: keeps the landscape camera
    expect(isPortrait(800, 800)).toBe(false);    // square is aspect 1, not < 1
  });

  it('picks the portrait camera for portrait and the landscape camera otherwise, near 1 and far 260', () => {
    expect(cameraFor(390, 844)).toBe(CAMERA_PORTRAIT);
    expect(cameraFor(1440, 900)).toBe(CAMERA_LANDSCAPE);
    expect(cameraFor(800, 600)).toBe(CAMERA_LANDSCAPE);
    expect(CAMERA_NEAR).toBe(1);
    expect(CAMERA_FAR).toBe(260);
  });

  it('keeps the hut, the kalshi lamp and the lot in frame through a rotation (index Review Focus 2)', () => {
    for (const [w, h] of [[390, 844], [844, 390], [1440, 900]] as const) {
      for (const id of ['hut', 'kalshiLamp', 'lot'] as const) {
        const p = ndc(w, h, PLACES[id]);
        expect(Math.abs(p.y), `${id} y at ${w}×${h}`).toBeLessThanOrEqual(1);
        expect(p.z, `${id} in front at ${w}×${h}`).toBeLessThan(1);
      }
    }
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/gl/composition.test.ts`
Expected: FAIL with "Failed to resolve import './composition'".

- [ ] **Step 3: Implement**

`src/gl/composition.ts`:

```ts
// Which camera frames the valley (spec §4, §11): portrait is aspect < 1 (vw < vh), never the tier, so a small
// landscape laptop on the phone tier keeps the landscape camera. The names come from Stage 2's cameraCore; this module
// only re-exports them and names the base pose. composeCamera stays the only writer of the camera.
import { CAMERA_LANDSCAPE, CAMERA_PORTRAIT } from '@/valley/layout';
import type { Vec3 } from '@/valley/types';
import { isPortrait } from './cameraCore';

export { isPortrait, CAMERA_NEAR, CAMERA_FAR } from './cameraCore';

export function cameraFor(width: number, height: number): { position: Vec3; lookAt: Vec3; fov: number } {
  return isPortrait(width, height) ? CAMERA_PORTRAIT : CAMERA_LANDSCAPE;
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run src/gl/composition.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Route every portrait decision in `src/gl/` through `composition.ts`**

Run: `grep -nE "CAMERA_PORTRAIT|CAMERA_LANDSCAPE|aspect *<|width *< *[a-z.]*height|innerWidth *< *innerHeight|tier" src/gl/CameraRig.tsx src/gl/Driver.tsx src/gl/driverCore.ts`

Expected and correct (leave them): `CameraRig.tsx`'s `setRigMode(rig, isPortrait(width, height), parallaxOn)` effect and its `parallaxOn = tier === 'desktop' && !reducedMotion` (parallax is desktop-only by spec §6; it does not decide portrait); `Driver.tsx` passing `rig.portrait` into `setFrameInputs`; `cameraCore.ts`'s `composeCamera` choosing the base pose from `rig.portrait`.

Change only:
- In `CameraRig.tsx`, import `isPortrait` from `./composition` instead of `./cameraCore` (same function). Its size effect stays exactly `setRigMode(rig, isPortrait(width, height), parallaxOn)`: it never sets the camera's position, fov or look-at itself. `composeCamera` in the Driver's one `useFrame` stays the only writer of the camera, so nothing competes with it.
- Any hit that picks a camera or a yaw column from `tier` (for example `tier === 'phone'` passed as `portrait`): replace it with `rig.portrait` (in the Driver) or `isPortrait(width, height)` of the canvas size. Stage 2 has none; if Stages 3–4 added one, fix it here.

- [ ] **Step 6: Run the gl tests and typecheck**

Run: `npx vitest run src/gl && npx tsc --noEmit`
Expected: the gl tests pass; `tsc` exits 0 (Task 5.1 left the tree green).

- [ ] **Step 7: Commit**

```bash
git add src/gl/composition.ts src/gl/composition.test.ts src/gl/CameraRig.tsx
# add src/gl/Driver.tsx and/or src/gl/driverCore.ts only if Step 5 changed them
git commit -m "Recompose the camera by aspect through composition.ts, never by tier"
```

**Verify:**
- `npx vitest run src/gl/composition.test.ts` passes.
- `grep -rn "CAMERA_PORTRAIT" src/gl | grep -v "composition\|cameraCore"` prints nothing.
- `grep -nE "export (const|function) (isPortrait|CAMERA_NEAR|CAMERA_FAR)" src/gl/composition.ts` prints nothing (re-exported, not redefined).
- `grep -n "tier" src/gl/CameraRig.tsx` prints only the prop and the `parallaxOn` line.
- `grep -n "camera.position\|camera.lookAt\|camera.fov" src/gl/CameraRig.tsx` prints nothing (composeCamera is the only camera writer).
- In `npm run dev`, resize a desktop window from 1440 × 900 to 600 × 900 and back: the valley re-frames into the lower part of the frame at 600 wide and back to the landscape frame, with no reload.

---

### Task 5.3: The no-WebGL tier module: `Still.tsx` and the GL status store **[parallel-safe]**

Spec §11 ("No WebGL / context loss: the canvas unmounts; the still stays as the picture; the DOM is complete on its own; the ignition labels render as a static list under the deck; the visitor's house renders as the SVG elevation from `houseSvg` with the same parts count. `?nogl=1` forces this tier"), §7 (the still is the first paint), §3.1 (ignition labels, tag), §5.4 (`houseSvg`), §12 (`compileAsync` on a lost context; storage in try/catch), §13 (`src/fallback/Still.tsx`, `glSupport.ts` kept), index Review Focus 5.

This task creates new files only; Task 5.7 wires them into Scene and Yours (and shows Stage 0's label list through `globals.css`). The GL status is one module-level store (no React state on the scroll path): `'unknown'` before the probe, `'ok'` after a passing probe, `'failed'` after a failing probe, an error boundary hit or a lost context. It never goes back to `'ok'`: a lost context is not restored, the still takes over for the rest of the visit. Reading it through `useSyncExternalStore` keeps lint's `react-hooks/set-state-in-effect` rule happy.

This task builds no label list and no house of its own. The static label list is Stage 0's `Labels()` (`ul[data-labels]`, already under the deck in `Open` on every tier and already in the exported HTML); Task 5.7 hides it visually while GL runs and shows it on the no-GL tier. The no-GL house is Stage 4 Task 4.10's `VisitorHouseSvg()`, which prints `copy.yours.tag(countWords(sentence), parts)`: the unclamped word count and the parts count formatted by `toLocaleString('en-US')` (`1,933`), exactly what the GL build prints (Review Focus 1). Task 5.7 mounts it.

**Files:**
- Create: `src/fallback/glStatus.ts`, `src/fallback/Still.tsx`
- Test: `src/fallback/glStatus.test.ts`

**Interfaces:**
- Consumes: `webgl2Available(): boolean` from `@/fallback/glSupport` (kept; already honours `?nogl=1`).
- Produces:
  ```ts
  // src/fallback/glStatus.ts
  export type GlStatus = 'unknown' | 'ok' | 'failed';
  export function glStatus(): GlStatus;
  export function probeGl(probe?: () => boolean): GlStatus;    // runs the probe once, caches; default webgl2Available
  export function markGlFailed(): void;                         // idempotent; notifies subscribers once
  export function subscribeGl(listener: () => void): () => void;
  export function watchContextLoss(target: EventTarget, onLost: () => void): () => void;
  export function resetGlStatusForTests(): void;
  // src/fallback/Still.tsx ('use client')
  export function useGlStatus(): GlStatus;
  export function useGlFailed(): boolean;
  export function Still(): JSX.Element;                          // the fixed still picture, z 0
  ```

- [ ] **Step 1: Write the failing tests**

`src/fallback/glStatus.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { glStatus, probeGl, markGlFailed, subscribeGl, watchContextLoss, resetGlStatusForTests } from './glStatus';

beforeEach(() => resetGlStatusForTests());
afterEach(() => vi.unstubAllGlobals());

describe('the GL status store (spec §11)', () => {
  it('starts unknown, then caches the first probe result and never probes again', () => {
    expect(glStatus()).toBe('unknown');
    const probe = vi.fn(() => true);
    expect(probeGl(probe)).toBe('ok');
    expect(probeGl(probe)).toBe('ok');
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('a failing probe is the no-GL tier', () => {
    expect(probeGl(() => false)).toBe('failed');
    expect(glStatus()).toBe('failed');
  });

  it('?nogl=1 forces the no-GL tier through the real probe without creating a context', () => {
    vi.stubGlobal('location', { search: '?nogl=1' });
    const createElement = vi.fn();
    vi.stubGlobal('document', { createElement });
    expect(probeGl()).toBe('failed');
    expect(createElement).not.toHaveBeenCalled();
  });

  it('markGlFailed flips ok to failed once and notifies each subscriber once', () => {
    probeGl(() => true);
    const a = vi.fn();
    const b = vi.fn();
    const offB = subscribeGl(b);
    subscribeGl(a);
    offB();
    markGlFailed();
    markGlFailed();
    expect(glStatus()).toBe('failed');
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
    expect(probeGl(() => true)).toBe('failed');   // a later probe never resurrects the canvas
  });
});

describe('watchContextLoss (index Review Focus 5)', () => {
  it('a lost context after T0 switches to the no-GL tier, once', () => {
    probeGl(() => true);
    const canvas = new EventTarget();
    const seen = vi.fn();
    subscribeGl(seen);
    watchContextLoss(canvas, markGlFailed);
    canvas.dispatchEvent(new Event('webglcontextlost'));
    canvas.dispatchEvent(new Event('webglcontextlost'));   // R3F's own forceContextLoss on the unmount that follows
    expect(glStatus()).toBe('failed');
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('the returned function stops watching', () => {
    const canvas = new EventTarget();
    const onLost = vi.fn();
    const stop = watchContextLoss(canvas, onLost);
    stop();
    canvas.dispatchEvent(new Event('webglcontextlost'));
    expect(onLost).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run src/fallback/glStatus.test.ts`
Expected: FAIL with "Failed to resolve import './glStatus'".

- [ ] **Step 3: Implement `glStatus.ts`**

`src/fallback/glStatus.ts`:

```ts
// The no-WebGL switch (spec §11). One module-level store, read by Scene (canvas or still), Open (the static label
// list), Yours (the SVG house) and LightControls (hidden without GL). 'unknown' until the probe runs, 'ok' when
// webgl2Available() passes, 'failed' when it does not (or `?nogl=1`), when the GL error boundary catches, or when the
// context is lost. It never returns to 'ok': a lost context is not restored, the still takes over for the visit.
import { webgl2Available } from './glSupport';

export type GlStatus = 'unknown' | 'ok' | 'failed';

let status: GlStatus = 'unknown';
const listeners = new Set<() => void>();

export function glStatus(): GlStatus {
  return status;
}

/** Runs the probe the first time and caches the answer; useSyncExternalStore's getSnapshot, so it never notifies. */
export function probeGl(probe: () => boolean = webgl2Available): GlStatus {
  if (status === 'unknown') status = probe() ? 'ok' : 'failed';
  return status;
}

export function markGlFailed(): void {
  if (status === 'failed') return;
  status = 'failed';
  for (const l of [...listeners]) l();
}

export function subscribeGl(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Calls onLost the first time the canvas loses its context; the returned function stops watching. */
export function watchContextLoss(target: EventTarget, onLost: () => void): () => void {
  const handler = () => onLost();
  target.addEventListener('webglcontextlost', handler, { once: true });
  return () => target.removeEventListener('webglcontextlost', handler);
}

export function resetGlStatusForTests(): void {
  status = 'unknown';
  listeners.clear();
}
```

- [ ] **Step 4: Run the tests and see them pass**

Run: `npx vitest run src/fallback/glStatus.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Implement `Still.tsx`**

`src/fallback/Still.tsx`:

```tsx
'use client';
// The no-WebGL tier's pieces (spec §11, §7): the committed night still as the picture, and the GL status hooks.
// Scene renders <Still /> in place of the canvas until the probe passes, so the still is also the first paint. The
// static label list is Stage 0's Labels() (shown on this tier by Task 5.7) and the house is Stage 4's VisitorHouseSvg().
import { useSyncExternalStore } from 'react';
import { probeGl, subscribeGl, type GlStatus } from './glStatus';

const serverStatus = (): GlStatus => 'unknown';

export function useGlStatus(): GlStatus {
  return useSyncExternalStore(subscribeGl, () => probeGl(), serverStatus);
}

export function useGlFailed(): boolean {
  return useGlStatus() === 'failed';
}

export function Still() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center"
      style={{ backgroundImage: 'url(/valley-still.jpg)' }}
    />
  );
}
```

- [ ] **Step 6: Lint, typecheck, test**

Run: `npx eslint src/fallback && npx tsc --noEmit && npx vitest run src/fallback`
Expected: eslint clean for `src/fallback`; `tsc` exits 0; tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/fallback/glStatus.ts src/fallback/glStatus.test.ts src/fallback/Still.tsx
git commit -m "Add the no-WebGL tier: GL status store and the still"
```

**Verify:**
- `npx vitest run src/fallback` passes, including `?nogl=1` and the context-loss pair.
- `ls src/fallback/stillModel.ts 2>&1` reports no such file (the label list is Stage 0's, the house is Stage 4's).
- `grep -n "fetch(" src/fallback/*` prints nothing.
- `grep -n "useState\|useEffect" src/fallback/Still.tsx` prints nothing (no state, no effects).

---

### Task 5.4: Contrast test over the terrain, the river and the unscrimmed labels **[parallel-safe]**

Spec §9 (palette; "Scrims: each copy column sits on a vertical gradient from the scrim colour at the text to transparent, guaranteeing 4.5:1 on body copy (tested by a contrast unit test against the palette)").

Stage 0 Task 0.4's `src/valley/palette.test.ts` already has a "scrim contrast" describe over every sky keyframe stop (12 cases). This task does not repeat them. It adds what Stage 0 does not cover: body copy (`ink`) and secondary mono (`inkDim`) on the scrim composited over every terrain ramp colour and the river (copy columns can sit over ground on the phone, where the valley fills the lower 60%), and the ignition and hillside labels (`ink`, mono hairline, no scrim, placed near lights on the terrain) over every terrain ramp colour. With the spec palette the worst cases are `inkDim` on scrim over the river (4.75) and raw `ink` over the slope colour (10.0), so the test passes today and fails the day someone brightens the river or dims `inkDim`.

**Dropped from this task: arrow keys that step sections.** An earlier draft added `SectionKeys` (ArrowDown/ArrowRight to the next section, ArrowUp/ArrowLeft back), overriding native arrow-key scrolling. The spec has no such feature (§1: "Anything that does not derive from a phrase is cut"), so it is not built. If Ethan asks for it later, it is a new task.

**Files:**
- Create: `src/site/contrast.ts`
- Test: `src/site/contrast.test.ts`

**Interfaces:**
- Consumes: `PALETTE` from `@/valley/palette` (Stage 0 Task 0.4: flat keys `ink`, `inkDim`, `scrim` (`'rgba(5,7,15,0.72)'`), `terrainLow`, `terrainMid`, `terrainSlope`, `terrainCrest`, `treeline`, `river`). Confirm with `grep -nE "terrainLow|terrainSlope|treeline|river|scrim|inkDim" src/valley/palette.ts`.
- Produces:
  ```ts
  // src/site/contrast.ts
  export type RGB = readonly [number, number, number];
  export function parseColor(css: string): { rgb: RGB; alpha: number };   // '#rrggbb' or 'rgba(r,g,b,a)'
  export function over(fg: RGB, alpha: number, bg: RGB): RGB;
  export function relativeLuminance(rgb: RGB): number;
  export function contrastRatio(a: RGB, b: RGB): number;
  ```

- [ ] **Step 1: Write the failing test**

`src/site/contrast.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { PALETTE } from '@/valley/palette';
import { parseColor, over, relativeLuminance, contrastRatio } from './contrast';

const rgb = (css: string) => parseColor(css).rgb;

/** The ground colours copy and labels can sit over (the sky stops are Stage 0's palette.test.ts). */
function labelBackgrounds(): Record<string, string> {
  return {
    terrainLow: PALETTE.terrainLow,
    terrainMid: PALETTE.terrainMid,
    terrainSlope: PALETTE.terrainSlope,
    terrainCrest: PALETTE.terrainCrest,
    treeline: PALETTE.treeline,
  };
}

function scrimBackgrounds(): Record<string, string> {
  return { ...labelBackgrounds(), river: PALETTE.river };
}

describe('contrast maths (WCAG 2.x)', () => {
  it('parses hex and rgba', () => {
    expect(parseColor('#FFC98A')).toEqual({ rgb: [255, 201, 138], alpha: 1 });
    expect(parseColor('rgba(5,7,15,0.72)')).toEqual({ rgb: [5, 7, 15], alpha: 0.72 });
    expect(parseColor('rgba(5, 7, 15, 0.72)')).toEqual({ rgb: [5, 7, 15], alpha: 0.72 });
  });
  it('matches the reference values', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(contrastRatio([119, 119, 119], [255, 255, 255])).toBeCloseTo(4.48, 2);
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 6);
    expect(over([0, 0, 0], 0.5, [255, 255, 255])).toEqual([127.5, 127.5, 127.5]);
  });
});

describe('copy contrast over the ground (spec §9: 4.5:1; the sky stops are Stage 0\'s)', () => {
  const scrim = parseColor(PALETTE.scrim);

  it('body copy and mono over the scrim on every terrain colour and the river are ≥ 4.5:1', () => {
    for (const [name, bg] of Object.entries(scrimBackgrounds())) {
      const behind = over(scrim.rgb, scrim.alpha, rgb(bg));
      expect(contrastRatio(rgb(PALETTE.ink), behind), `ink on scrim over ${name}`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(rgb(PALETTE.inkDim), behind), `inkDim on scrim over ${name}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('labels (ink, no scrim) over every terrain ramp colour are ≥ 4.5:1', () => {
    for (const [name, bg] of Object.entries(labelBackgrounds())) {
      expect(contrastRatio(rgb(PALETTE.ink), rgb(bg)), `ink over ${name}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/site/contrast.test.ts`
Expected: FAIL with "Failed to resolve import './contrast'".

- [ ] **Step 3: Implement `contrast.ts`**

`src/site/contrast.ts`:

```ts
// WCAG 2.x relative luminance and contrast ratio, and alpha compositing, for the palette contrast test (spec §9).

export type RGB = readonly [number, number, number];

export function parseColor(css: string): { rgb: RGB; alpha: number } {
  const s = css.trim();
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(s);
  if (hex) return { rgb: [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16)], alpha: 1 };
  const rgba = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(s);
  if (rgba) return { rgb: [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])], alpha: rgba[4] === undefined ? 1 : Number(rgba[4]) };
  throw new Error(`parseColor: unsupported colour ${css}`);
}

export function over(fg: RGB, alpha: number, bg: RGB): RGB {
  return [fg[0] * alpha + bg[0] * (1 - alpha), fg[1] * alpha + bg[1] * (1 - alpha), fg[2] * alpha + bg[2] * (1 - alpha)];
}

function channel(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(rgb: RGB): number {
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

export function contrastRatio(a: RGB, b: RGB): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
```

`contrast.ts` holds no colour literal: Stage 0's scan (`/#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?\b|\brgba?\(/` over non-test files) matches neither `#([0-9a-f]{2})` nor `rgba?\(` in the regex source. The hex and rgba strings live only in the `.test.ts` file, which the scan skips. Step 4 runs that scan to prove it.

- [ ] **Step 4: Run the tests and see them pass**

Run: `npx vitest run src/site/contrast.test.ts src/valley/palette.test.ts`
Expected: PASS. If a palette contrast case fails, the palette in `src/valley/palette.ts` does not match spec §9: compare its hex values with §9 and fix the palette (and `globals.css`), never the threshold.

- [ ] **Step 5: Lint, typecheck, test**

Run: `npx eslint src/site/contrast.ts src/site/contrast.test.ts && npx tsc --noEmit && npx vitest run src/site src/valley`
Expected: clean; `tsc` exits 0; tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/site/contrast.ts src/site/contrast.test.ts
git commit -m "Add the contrast test over the terrain, the river and the labels"
```

**Verify:**
- `npx vitest run src/site/contrast.test.ts` passes.
- `grep -n "SKY_KEYFRAMES\|sky\." src/site/contrast.test.ts` prints nothing (the sky stops stay in Stage 0's test, not duplicated).
- `ls src/site/SectionKeys.tsx src/site/sectionKeys.ts 2>&1` reports no such files.

---

### Task 5.5: Wire the ladder and the phone tier into the scene

Spec §11 (phone tier: DPR 1, no shadows, no rain, no mist, ridge N/5 at ×1.8, stars 400; the ladder on any tier; `PerformanceMonitor` only walks the ladder), §6 (antialias on desktop; `gl` options; shadows 1024 on desktop only), §4.6 (ridge N on desktop; one `THREE.Points` draw), §12 (rain dropped first, then mist; the ridge never below N/10), §11 reduced motion ("no rain").

Antialias is a context-creation option: R3F reads `gl` once when the canvas is created. This task does not remount the canvas on a tier change; antialias follows the tier the canvas mounted with, while DPR, shadows and the scene quality follow the live tier and rung. Halving the ridge regenerates it with `ridgePoints(count, seed)` (a uniform spread over the whole crest, every `aBirth` still in 0..1), never a draw range, which would drop the right half of the timeline.

**Files:**
- Modify: `src/gl/Scene.tsx`, `src/gl/Ridge.tsx`, `src/gl/ridgeGeometry.ts` (delete `ridgeConfig`), `src/gl/Stars.tsx`, `src/site/yoursSubmit.ts` (only if Step 5 finds the blur missing)
- Test: `src/gl/sceneStage3.test.ts` (Stage 3 Task 3.11: its two expected strings change), `src/gl/ridgeGeometry.test.ts` (Stage 3 Task 3.1: its `ridgeConfig` describe is deleted)

**Interfaces:**
- Consumes: from Task 5.1 `useTier(): TierSettings & SceneQuality & { rung: number; onDecline: () => void }`, `PERF_MONITOR`; Stage 3's `buildRidgeGeometry(count)` (it already calls `ridgePoints(count, seed)`) and `createRidgeMaterial(reveal, lit, sizeScale)` from `./ridgeGeometry` and `./Ridge`; `uniforms.uRidgeReveal`, `uniforms.uRidgeLit`, `uniforms.uRain`, `uniforms.uTime`; `PerformanceMonitor` from `@react-three/drei` (props `ms`, `iterations`, `threshold`, `bounds`, `onDecline`); `useScroll().reducedMotion`; Stage 2's `Stars({ uniforms, tier })` and `Mist({ uniforms })`, Stage 3's `Ridge({ tier, reveal, lit })` and `Rain({ rain, time })` (confirm with `grep -n "<Stars\|<Ridge\|<Mist\|<Rain\|PerformanceMonitor\|useTier" src/gl/Scene.tsx`).
- Produces: `Ridge` props `{ count: number; sizeScale: number; reveal: { value: number }; lit: { value: number } }` (Stage 3's `reveal` and `lit` kept); `Stars` props `{ uniforms: ValleyUniforms; count: number }`; Scene mounts `Mist` only when `mist`, `Rain` only when `rain && !reducedMotion`, each with Stage 2/3's uniform props unchanged.

- [ ] **Step 1: Read the current wiring**

Run: `grep -n "useTier\|TIER_SETTINGS\|msaa\|stretch\|PerformanceMonitor\|dpr=\|shadows=\|gl=\|<Stars\|<Ridge\|<Mist\|<Rain\|tier ===\|tier==" src/gl/Scene.tsx src/gl/Ridge.tsx src/gl/Stars.tsx src/gl/Mist.tsx src/gl/Rain.tsx`
Note every place that derives a count, a size or a mount from `tier`; Steps 2–4 replace each with the ladder's value.

- [ ] **Step 2: Scene: Canvas options, the monitor, and the mounts**

In `src/gl/Scene.tsx`, inside the component that renders `<Canvas>` (Stage 2 calls it `GLLayer` or `Scene`):

```tsx
import { useMemo } from 'react';
import { PerformanceMonitor } from '@react-three/drei';
import { PERF_MONITOR, useTier } from './useTier';
import { useScroll } from '@/scroll/ScrollProvider';

// inside the component:
const { tier, dpr, shadows, antialias, ridgeCount, ridgeSizeScale, stars, rain, mist, onDecline } = useTier();
const { reducedMotion } = useScroll();
// Read once at canvas creation (R3F ignores later changes); memoised so a re-render hands R3F the same object.
const glOptions = useMemo(() => ({ antialias, powerPreference: 'high-performance' as const, alpha: false }), [antialias]);
```

On `<Canvas>` set `dpr={dpr}`, `gl={glOptions}`, and keep Stage 2's `shadows` expression but driven by the hook's `shadows` (for example `shadows={shadows ? SHADOW_MAP : false}` where `SHADOW_MAP` is Stage 2's constant). Keep Stage 2's `onCreated` (where `localClippingEnabled`, tone mapping and the warm-up live) unchanged.

Wrap the scene children in the monitor (replace any existing `<PerformanceMonitor …>` opening tag):

```tsx
<PerformanceMonitor ms={PERF_MONITOR.ms} iterations={PERF_MONITOR.iterations} threshold={PERF_MONITOR.threshold} bounds={PERF_MONITOR.bounds} onDecline={onDecline}>
```

Inside it, make these four children read exactly (each keeps the uniform props Stages 2 and 3 gave it; only the count, size and mount condition move to the ladder):

```tsx
<Stars uniforms={uniforms} count={stars} />
<Ridge count={ridgeCount} sizeScale={ridgeSizeScale} reveal={uniforms.uRidgeReveal} lit={uniforms.uRidgeLit} />
{mist ? <Mist uniforms={uniforms} /> : null}
{rain && !reducedMotion ? <Rain rain={uniforms.uRain} time={uniforms.uTime} /> : null}
```

Without `reveal` and `lit` the ridge would never reveal or pulse; without `rain` and `time` `Rain` fails `tsc`. Remove every remaining `tier === 'phone'`/`tier === 'desktop'` mount condition for Mist and Rain, and every use of `msaa`, `stretch` or `lines`. Leave `rung` out of the destructuring in this task (an unused variable fails lint); Task 5.8 adds it.

Update Stage 3's pinned strings in `src/gl/sceneStage3.test.ts` to the new mounts:

```ts
    expect(scene).toContain('<Ridge count={ridgeCount} sizeScale={ridgeSizeScale} reveal={uniforms.uRidgeReveal} lit={uniforms.uRidgeLit} />');
```

```ts
  it('mounts rain only when the ladder allows it and not under reduced motion', () => {
    expect(scene).toContain(
      '{rain && !reducedMotion ? <Rain rain={uniforms.uRain} time={uniforms.uTime} /> : null}',
    );
  });
```

- [ ] **Step 3: Ridge: count and size from props**

Stage 3's `buildRidgeGeometry(count)` already calls `ridgePoints(count, facts.kalshi.trades)` and `createRidgeMaterial(reveal, lit, sizeScale)` already applies the size scale through `uPixelScale`, so only the props change. In `src/gl/Ridge.tsx` replace `RidgeProps` and the first three lines of `Ridge`:

```tsx
export interface RidgeProps { count: number; sizeScale: number; reveal: { value: number }; lit: { value: number } }

export function Ridge({ count, sizeScale, reveal, lit }: RidgeProps) {
  const geometry = useMemo(() => buildRidgeGeometry(count), [count]);
  const material = useMemo(() => createRidgeMaterial(reveal, lit, sizeScale), [reveal, lit, sizeScale]);
```

Keep the rest of Stage 3's component as it is: the crest line, the `setPixelScale` effect (it already reads `sizeScale`), and the two dispose effects `useEffect(() => () => geometry.dispose(), [geometry])` and `useEffect(() => () => material.dispose(), [material])`, which free the old buffers when a rung changes `count`. Remove `ridgeConfig` from Ridge's import and the now-unused `import type { Tier }`.

In `src/gl/ridgeGeometry.ts` delete `ridgeConfig(tier)` (the ladder's `ridgeCount` and `ridgeSizeScale` replace it; `Math.round(N / 5)` and Stage 3's `Math.floor(N / 5)` are both 6,000 for N = 30,000) and its now-unused `Tier` import. In `src/gl/ridgeGeometry.test.ts` delete the `describe('ridgeConfig (spec §4.6, §11)', …)` block and `ridgeConfig` from the import (Task 5.1's `useTier.test.ts` pins the same numbers).

- [ ] **Step 4: Stars: count from a prop**

In `src/gl/Stars.tsx`, change the props to `{ uniforms, count }: { uniforms: ValleyUniforms; count: number }`, call `starField(count)` in place of `starField(tier === 'phone' ? STARS_PHONE : STARS_DESKTOP)`, key the geometry memo on `[count]`, and drop the `Tier`, `STARS_DESKTOP` and `STARS_PHONE` imports. Keep `createStarsMaterial(uniforms)` as it is.

- [ ] **Step 5: Phone input check (spec §11: "the input blurs on Enter")**

Run: `grep -n "blur()" src/site/yoursSubmit.ts`
Expected: one hit, `input.blur();` inside `submitYours`'s phone branch (Stage 4 Task 4.8 puts the blur there; `Yours.tsx` only calls `submitYours`). If there is none, add it there and include `src/site/yoursSubmit.ts` in this task's commit.

- [ ] **Step 6: Typecheck, lint, test**

Run: `npx tsc --noEmit && npx eslint src/gl src/site && npx vitest run`
Expected: all clean.

- [ ] **Step 7: Look at each rung**

Run `npm run dev` and open, at 1440 × 900: `/?rung=0`, `/?rung=3`, `/?rung=5`, and `/?tier=phone`. Expected: rung 3 shows a visibly sparser ridge spread across the whole crest (not the left half only); rung 5 has no rain in darch and no mist on the river; phone shows no rain or mist, a sparser ridge with larger points, fewer stars. No console errors on any of them.

- [ ] **Step 8: Commit**

```bash
git add src/gl/Scene.tsx src/gl/Ridge.tsx src/gl/ridgeGeometry.ts src/gl/ridgeGeometry.test.ts src/gl/Stars.tsx src/gl/sceneStage3.test.ts
# add src/site/yoursSubmit.ts only if Step 5 changed it
git commit -m "Drive DPR, antialias, ridge, stars, rain and mist from the tier and the step-down ladder"
```

**Verify:**
- `grep -rnE "msaa|stretch|uLines" src/gl` prints nothing.
- `grep -n "tier" src/gl/Ridge.tsx src/gl/Stars.tsx` prints nothing.
- `grep -n "<Rain" src/gl/Scene.tsx` shows `rain && !reducedMotion ? <Rain rain={uniforms.uRain} time={uniforms.uTime} />`; `grep -n "<Mist" src/gl/Scene.tsx` shows `mist ? <Mist uniforms={uniforms} />`.
- `grep -n "<Ridge" src/gl/Scene.tsx` shows `reveal={uniforms.uRidgeReveal} lit={uniforms.uRidgeLit}`; `grep -rn "ridgeConfig" src` prints nothing.
- `npx vitest run src/gl/sceneStage3.test.ts src/gl/ridgeGeometry.test.ts` passes.
- `npx vitest run` and `npx tsc --noEmit` pass.

---

### Task 5.6: Reduced motion audit across every system

Spec §11 ("Reduced motion: no chain (final states at T0), no rain, river and mist frozen, wheel still, cuts instead of eases for view offsets and reveals, the house appears built with no scaffolding, the pulse is a single 300 ms brightening"), §8 ("Reduced motion freezes ambient time and cuts instead of easing"), §5.3 ("Reduced motion or `introPlayed`: every target is in its final state at T0 and the schedule is empty"), §9 (DOM motion: line reveals, the counter scramble).

This task writes the tests first against the driver's contract surfaces (`lit`, `latched`, every uniform) and the gates Stages 3 and 4 already built, then fixes whatever fails. A test that already passes means an earlier stage got that rule right; keep the test and move on. Stage 3 owns the chain gate (`shouldPlayIntro`, `introClock` in `src/gl/introGate.ts`: reduced motion means `introT` is `null`, so every light is final) and the reduced pulse (`reducedPulse(pulseT)` and `REDUCED_PULSE_S` in `src/gl/pulse.ts`, applied by `applyPulse(pulseT, reducedMotion, lit)`: one 300 ms brightening of every emitter except the mill, peak 1.6× at 150 ms). Stage 4 owns the built-at-once house (`startBuild(clock, t, hadHouse, reducedMotion)` sets the clock so `buildTAt` is already past `BUILD_SECONDS`, so `setBuilding(true)` never fires and the scaffold never mounts). This task reuses those names and never re-implements them.

Stage 3 Task 3.11 already created `src/gl/reducedMotion.test.ts` with four Stage 3 tests. This task does not touch that file: its tests go in a new file, `src/gl/reducedMotionAudit.test.ts`.

**Files:**
- Create: `src/gl/motion.ts` (only `cutView`)
- Test: `src/gl/reducedMotionAudit.test.ts` (new; Stage 3's `src/gl/reducedMotion.test.ts` stays as it is)
- Modify, only where the audit finds a gap: `src/gl/driverCore.ts`, `src/gl/CameraRig.tsx` or `src/gl/Driver.tsx` (wherever `timeline.view` is applied), `src/gl/Scene.tsx` (Scaffold mount, fade), `src/site/Reveal.tsx`, `src/site/Counter.tsx`

**Interfaces:**
- Consumes: `shouldPlayIntro`, `introClock` (`./introGate`, Stage 3 Task 3.6); `reducedPulse`, `REDUCED_PULSE_S` (`./pulse`, Stage 3 Task 3.10); `startBuild`, `buildTAt`, `BuildClock { start: number | null }` (`./driverCore`, Stage 4 Task 4.5); `applyFrame(inputs: FrameInputs, targets: FrameTargets): void`, `FrameInputs`, `FrameTargets` (index contract); a factory that returns a fresh `FrameTargets` from `src/gl/driverCore.ts` (Stage 2; this plan calls it `createFrameTargets()`; confirm with `grep -n "export function" src/gl/driverCore.ts` and use the one returning `FrameTargets`); `ValleyUniforms` is a record of three uniforms (`{ value }`); `SECTIONS`, `sectionRanges`, `locate` from `@/valley/sections`; `timelineAt` from `@/valley/timeline`; `EMITTERS` from `@/valley/lights`; `CHAIN_END` from `@/valley/ignition`; `View`, `SectionRange` from `@/valley/types`.
- Produces:
  ```ts
  // src/gl/motion.ts (the reduced pulse is Stage 3's reducedPulse in ./pulse; not repeated here)
  export function cutView(g: number, ranges: SectionRange[], portrait: boolean, out: View): View;   // allocation-free
  ```

- [ ] **Step 1: Write the failing test**

`src/gl/reducedMotionAudit.test.ts` (a new file; do not edit Stage 3's `src/gl/reducedMotion.test.ts`):

```ts
import { describe, it, expect } from 'vitest';
import { SECTIONS, sectionRanges } from '@/valley/sections';
import { timelineAt } from '@/valley/timeline';
import { EMITTERS } from '@/valley/lights';
import { CHAIN_END } from '@/valley/ignition';
import { BUILD_SECONDS } from '@/valley/build';
import type { SectionRange, View } from '@/valley/types';
import { applyFrame, buildTAt, createFrameTargets, startBuild, type BuildClock, type FrameInputs, type FrameTargets } from './driverCore';
import { introClock, shouldPlayIntro } from './introGate';
import { REDUCED_PULSE_S, reducedPulse } from './pulse';
import { cutView } from './motion';

const VH = 900;
function ranges(): SectionRange[] {
  const tops: number[] = [];
  let y = 0;
  for (const s of SECTIONS) { tops.push(y); y += (s.heightVh / 100) * VH; }
  return sectionRanges(tops, y, VH);
}
const R = ranges();
const gAt = (id: string, s: number) => { const r = R.find((x) => x.id === id)!; return r.start + s * (r.end - r.start); };
const idx = (id: string) => EMITTERS.findIndex((e) => e.id === id);

function inputs(over: Partial<FrameInputs>): FrameInputs {
  return { g: 0, ranges: R, t: 10, dt: 1 / 60, introT: CHAIN_END + 10, buildT: null, pulseT: null, flickerT: null, reducedMotion: true, ...over };
}

/** Every number the driver writes: uniform values (numbers, booleans, vectors and colours), lit, projected, latches. */
function snapshot(targets: FrameTargets): number[] {
  const out: number[] = [];
  for (const u of Object.values(targets.uniforms as unknown as Record<string, { value: unknown }>)) {
    const v = u.value;
    if (typeof v === 'number') out.push(v);
    else if (typeof v === 'boolean') out.push(v ? 1 : 0);
    else if (v !== null && typeof v === 'object' && typeof (v as { toArray?: unknown }).toArray === 'function') {
      out.push(...(v as { toArray(): number[] }).toArray());
    }
  }
  out.push(...targets.lit, ...targets.projected, targets.latched.ridge, targets.latched.hedge);
  return out;
}

function run(over: Partial<FrameInputs>, frames: number, targets = createFrameTargets()): FrameTargets {
  const inp = inputs(over);
  for (let i = 0; i < frames; i++) { applyFrame(inp, targets); inp.t += inp.dt; }
  return targets;
}

describe('reduced motion: ambient time is frozen (river, mist, wheel, stars; spec §8, §11)', () => {
  for (const [id, s] of [['open', 0.5], ['darch', 0.5], ['alive', 0.5], ['contact', 0.9]] as const) {
    it(`nothing the driver writes changes over 5 s at a fixed scroll in ${id}`, () => {
      const targets = createFrameTargets();
      const inp = inputs({ g: gAt(id, s) });
      applyFrame(inp, targets);
      const before = snapshot(targets);
      for (let i = 0; i < 300; i++) { inp.t += inp.dt; applyFrame(inp, targets); }
      expect(snapshot(targets)).toEqual(before);
    });
  }

  it('without reduced motion the same 5 s does move something (the test can see ambient time)', () => {
    const targets = createFrameTargets();
    const inp = inputs({ g: gAt('darch', 0.5), reducedMotion: false });
    applyFrame(inp, targets);
    const before = snapshot(targets);
    for (let i = 0; i < 300; i++) { inp.t += inp.dt; applyFrame(inp, targets); }
    expect(snapshot(targets)).not.toEqual(before);
  });
});

describe('reduced motion: no chain, final states at T0 (spec §5.3), through Stage 3\'s gate', () => {
  it('the gate never plays the chain, so the driver sees introT null: the finished state', () => {
    const still = { still: false, g: null, t: null };
    const play = shouldPlayIntro({ reducedMotion: true, introPlayed: false, still });
    expect(play).toBe(false);
    const introT = introClock(play, 10, 10.2, null);
    expect(introT).toBeNull();
    const reduced = run({ g: gAt('open', 0.1), introT, reducedMotion: true }, 1);
    const finished = run({ g: gAt('open', 0.1), introT: CHAIN_END + 10, reducedMotion: false }, 1);
    expect(Array.from(reduced.lit)).toEqual(Array.from(finished.lit));
    expect(reduced.latched).toEqual(finished.latched);
    expect(reduced.lit[idx('hut')]).toBeGreaterThan(0);
  });
});

describe('reduced motion: the house appears built, no scaffolding (spec §11), through Stage 4\'s clock', () => {
  it('0.1 s after Enter the build clock is already past the build, and the visitor light is final', () => {
    const clock: BuildClock = { start: null };   // Stage 4 Task 4.5's BuildClock
    startBuild(clock, 20, false, true);
    const buildT = buildTAt(clock, 20.1);
    expect(buildT).not.toBeNull();
    expect(buildT!).toBeGreaterThanOrEqual(BUILD_SECONDS);   // past the build: the scaffold never mounts
    const reduced = run({ g: gAt('yours', 0.5), buildT, reducedMotion: true }, 1);
    const built = run({ g: gAt('yours', 0.5), buildT: 10, reducedMotion: false }, 1);
    expect(built.lit[idx('visitor')]).toBeGreaterThan(0);
    expect(reduced.lit[idx('visitor')]).toBeCloseTo(built.lit[idx('visitor')], 6);
  });
});

describe('reduced motion: the pulse is one 300 ms brightening (spec §11), Stage 3\'s reducedPulse', () => {
  it('reducedPulse peaks at 1.6 at 150 ms and is 1 outside the 300 ms', () => {
    expect(REDUCED_PULSE_S).toBe(0.3);
    expect(reducedPulse(-0.1)).toBe(1);
    expect(reducedPulse(0.15)).toBeCloseTo(1.6, 6);
    expect(reducedPulse(0.05)).toBeGreaterThan(1);
    expect(reducedPulse(0.05)).toBeLessThan(1.6);
    expect(reducedPulse(0.3)).toBe(1);
  });

  it('every lit emitter brightens at once (no wave), the mill does not', () => {
    const g = gAt('alive', 0.5);
    const base = run({ g, pulseT: null }, 1);
    const peak = run({ g, pulseT: 0.15 }, 1);
    const after = run({ g, pulseT: 0.35 }, 1);
    for (const id of ['hut', 'bar4', 'hill5'] as const) {
      expect(peak.lit[idx(id)], id).toBeCloseTo(base.lit[idx(id)] * 1.6, 5);
      expect(after.lit[idx(id)], id).toBeCloseTo(base.lit[idx(id)], 6);
    }
    expect(peak.lit[idx('mill')]).toBeCloseTo(base.lit[idx('mill')], 6);
  });
});

describe('reduced motion: view offsets cut at section boundaries (spec §11)', () => {
  it('cutView holds each section\'s own view through its last 25%, where timelineAt eases', () => {
    const out: View = { yaw: 0, pitch: 0, fovScale: 1 };
    SECTIONS.forEach((sec, i) => {
      const g = gAt(sec.id, 0.9);
      expect(cutView(g, R, false, out), sec.id).toEqual(sec.view);
      expect(cutView(g, R, true, out), `${sec.id} portrait`).toEqual(sec.viewPortrait);
      if (i < SECTIONS.length - 1) expect(timelineAt(g, R).view, `${sec.id} eases`).not.toEqual(sec.view);
    });
  });

  it('writes into the object it is given and falls back to the first section with no ranges', () => {
    const out: View = { yaw: 9, pitch: 9, fovScale: 9 };
    expect(cutView(0.5, [], false, out)).toBe(out);
    expect(out).toEqual(SECTIONS[0].view);
  });
});
```

- [ ] **Step 2: Run it and see what fails**

Run: `npx vitest run src/gl/reducedMotionAudit.test.ts`
Expected: FAIL at least with "Failed to resolve import './motion'". If `createFrameTargets`, `startBuild`, `buildTAt` or `BuildClock` are exported under other names, use Stage 2/4's names and rerun. Write down which of the other describe blocks fail; Steps 4–7 fix only those.

- [ ] **Step 3: Implement `motion.ts`**

`src/gl/motion.ts`:

```ts
// Reduced-motion view (spec §11): view offsets cut at section boundaries instead of easing. Allocation-free for the
// frame loop. The reduced pulse is Stage 3's reducedPulse in ./pulse.
import { SECTIONS } from '@/valley/sections';
import type { SectionRange, View } from '@/valley/types';

/** The view of the section g is in, with no easing; ranges are in SECTIONS order. */
export function cutView(g: number, ranges: SectionRange[], portrait: boolean, out: View): View {
  let index = 0;
  if (ranges.length > 0) {
    index = ranges.length - 1;
    for (let i = 0; i < ranges.length; i++) {
      if (g < ranges[i].end) { index = i; break; }
    }
  }
  const sec = SECTIONS[Math.min(index, SECTIONS.length - 1)];
  const v = portrait ? sec.viewPortrait : sec.view;
  out.yaw = v.yaw;
  out.pitch = v.pitch;
  out.fovScale = v.fovScale;
  return out;
}
```

Run: `npx vitest run src/gl/reducedMotionAudit.test.ts`. The `cutView` tests now pass; the others pass or fail depending on Stages 2–4.

- [ ] **Step 4: Fix frozen ambient time (only if that describe failed)**

Run: `grep -n "dt\|inputs.t\b\|\.t)" src/gl/driverCore.ts`
Find each place that advances an ambient clock (river flow, mist drift, wheel idle and spin, star twinkle, rain fall) from `inputs.t` or `inputs.dt`. Ambient time must be a clock that only advances when motion is allowed. If driverCore keeps a module-level or targets-level ambient clock, make its update read:

```ts
if (!inputs.reducedMotion) ambient.t += inputs.dt;   // spec §8: reduced motion freezes ambient time
```

and make every ambient uniform read `ambient.t` instead of `inputs.t`. If the wheel's angle integrates `darchT`-driven speed, integrate only when `!inputs.reducedMotion` and leave the angle where it is otherwise. Rerun the test.

- [ ] **Step 5: The chain and the build (only if those describes failed)**

Both rules already live in earlier stages; fix the owning module, never add a second path in `applyFrame`:
- Chain: `shouldPlayIntro` in `src/gl/introGate.ts` must return `false` when `reducedMotion` is true and `still.still` is false, and `introClock(false, …)` must return `null`. `writeChainLevels(null, …)` (Stage 3 Task 3.7) then writes every final state.
- Build: `startBuild(clock, t, hadHouse, true)` in `src/gl/driverCore.ts` (Stage 4 Task 4.5) must set `clock.start` so that `buildTAt(clock, t + ε)` is at least `BUILD_SECONDS` (Stage 4 sets it to `-Infinity`). With that, `visitorBridge` never calls `setBuilding(true)` and `<Scaffold />` never mounts.

Rerun the test.

- [ ] **Step 6: The pulse (only if that describe failed)**

The pulse is applied by Stage 3's `applyPulse(pulseT, reducedMotion, lit)` in `src/gl/pulse.ts`, called from `applyLights`. Under reduced motion it must multiply every emitter except the mill by `reducedPulse(pulseT)`, and the Driver's `stepPulseGate` must still produce `pulseT` under reduced motion. Fix whichever of those two is wrong in `src/gl/pulse.ts` or `src/gl/Driver.tsx`; do not add a pulse branch to `applyFrame`. Rerun the test.

- [ ] **Step 7: Cut the view, the DOM reveals, the counter, the scaffold and the fade**

These are not reachable from `applyFrame`'s contract surface; fix each by reading the file:

1. View: `grep -rn "\.view\b\|view\.yaw\|fovScale" src/gl/*.ts src/gl/*.tsx`. At the one place the eased `timeline.view` is applied to the camera (CameraRig or the driver), use a preallocated `const cut: View = { yaw: 0, pitch: 0, fovScale: 1 };` declared at module or ref scope, and:

```ts
const view = reducedMotion ? cutView(g, ranges, portrait, cut) : timeline.view;
```

   The pointer parallax (±1°, damped) must be 0 under reduced motion: multiply its offset by `reducedMotion ? 0 : 1`.
2. DOM reveals: in `src/site/Reveal.tsx`, at the start of the code path that animates an element (framer-motion `animate(...)`), add:

```ts
if (reducedMotion) { el.style.opacity = '1'; el.style.transform = 'none'; return; }
```

   where `reducedMotion` comes from `useScroll()`. Scroll-back reversal under reduced motion sets `opacity = '0'` and `transform = 'translateY(100%)'` the same way, without animating.
3. Counter: in `src/site/Counter.tsx`, under reduced motion write the final formatted value directly and skip the scramble.
4. Scaffold: `grep -rn "<Scaffold" src/gl` shows Stage 4's `{building && <Scaffold />}` only. Leave it: under reduced motion `building` never becomes true (Step 5's build rule), and Stage 4's `visitorWiring.test.ts` pins that exact string.
5. Canvas fade: in Scene's warm-up, when reduced motion is on, set the wrapper's transition to `none` before setting opacity to 1 (T0 is still declared after the same 200 ms wait, so the intro gate timing is unchanged).

- [ ] **Step 8: Run everything**

Run: `npx vitest run && npx tsc --noEmit && npx eslint src`
Expected: all green, including every describe in `src/gl/reducedMotionAudit.test.ts` and Stage 3's `src/gl/reducedMotion.test.ts`.

- [ ] **Step 9: Look at it**

`npm run dev`, Chrome DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion: reduce", clear `sessionStorage`, reload. Expected: every light is lit (mill dark) the moment the canvas appears, no chain, the river and mist do not move, scrolling into darch shows no rain and a still wheel, section changes cut the view, copy lines appear without sliding, typing a sentence and pressing Enter shows the finished house at once with no scaffolding.

- [ ] **Step 10: Commit**

```bash
git add src/gl/motion.ts src/gl/reducedMotionAudit.test.ts
# plus only the files Steps 4–7 changed, by path, from: src/gl/driverCore.ts src/gl/introGate.ts src/gl/pulse.ts src/gl/CameraRig.tsx src/gl/Driver.tsx src/gl/Scene.tsx src/site/Reveal.tsx src/site/Counter.tsx
git commit -m "Reduced motion audit: frozen ambient time, final states, built house, 300 ms pulse, cuts"
```

**Verify:**
- `npx vitest run src/gl/reducedMotionAudit.test.ts src/gl/reducedMotion.test.ts` passes (the audit's 11 tests and Stage 3's 4, untouched).
- `git diff <task start>..HEAD -- src/gl/reducedMotion.test.ts` is empty.
- `grep -nE "reducedPulse|REDUCED_PULSE" src/gl/motion.ts` prints nothing (the pulse lives only in `src/gl/pulse.ts`).
- `grep -n "reducedMotion" src/site/Reveal.tsx src/site/Counter.tsx` shows a branch in each.
- The Step 9 walk-through holds.

---

### Task 5.7: Wire the no-WebGL tier into Scene, Open and Yours

Spec §11 (no WebGL / context loss / `?nogl=1`), §7 (the still on the canvas wrapper is the first paint), §12 (`compileAsync` on a lost context: the 4 s timeout), §2 (storage optional), index Review Focus 5.

**Files:**
- Modify: `src/gl/Scene.tsx`, `src/fallback/glStatus.ts` (flag the failed tier on `<html>`), `src/fallback/glStatus.test.ts`, `src/app/globals.css` (hide Stage 0's label list while GL runs), `src/site/sections/Yours.tsx`, `src/site/Site.tsx` (only the dynamic import's `loading` placeholder)

**Interfaces:**
- Consumes: from Task 5.3 `useGlStatus()`, `useGlFailed()`, `Still`, `markGlFailed()`, `probeGl()`, `watchContextLoss(target, onLost)`; Stage 0's `Labels()` (`ul[data-labels]`, rendered inside `Open` under the deck on every tier and pinned in the server HTML by Stage 0's `src/site/exported.test.ts`); Stage 4 Task 4.10's `VisitorHouseSvg()` from `@/fallback/HouseSvg`; Stage 4 Task 4.8's `Yours.tsx` (no React state: it binds `#yours-clock` and `#yours-tag` into `yoursDom`, and the sentence flows through `getVisitorSnapshot`/`onVisitorSentence`); Stage 2's `GLErrorBoundary` with `onError` and the inner canvas component (confirm with `grep -n "webgl2Available\|GLErrorBoundary\|webglcontextlost\|watchContextLoss\|onCreated" src/gl/Scene.tsx`).
- Produces: `Scene` renders `<Still />` while the status is `'unknown'` or `'failed'` and the canvas only while `'ok'`; every GL failure path calls `markGlFailed()`; `<html data-gl="failed">` whenever the status is `'failed'`; Stage 0's label list is visually hidden (still in the HTML, still read by screen readers) unless `data-gl="failed"`.

- [ ] **Step 1: Scene: one switch, three ways in**

In `src/gl/Scene.tsx`:
- Remove Stage 2's own probe state (a `useState(() => !webgl2Available())` or similar) and its `webgl2Available` import.
- Make the exported `Scene` read:

```tsx
import { Still, useGlStatus } from '@/fallback/Still';
import { markGlFailed, watchContextLoss } from '@/fallback/glStatus';

export function Scene() {
  const status = useGlStatus();
  // 'unknown' is the first client render; the still is the picture until the probe says the canvas can run.
  return status === 'ok' ? <GLLayer onFail={markGlFailed} /> : <Still />;
}
```

  (`GLLayer` is the inner component that owns `<Canvas>`; use Stage 2's name and keep its `onFail` prop, or add one.)
- The error boundary's `onError` calls `onFail` (i.e. `markGlFailed`).
- In `onCreated`, replace any existing context-loss listener with `watchContextLoss(state.gl.domElement, onFail);` before the warm-up starts.
- Leave the warm-up's 4 s `compileAsync` timeout as Stage 2 wrote it (§12): a lost context during warm-up fires `webglcontextlost`, which now switches to the still, and the timeout lets the warm-up promise settle.

- [ ] **Step 2: Site: the loading placeholder is the still**

In `src/site/Site.tsx`, the `dynamic(() => import('@/gl/Scene')…, { ssr: false, loading })` placeholder must be the still so the server HTML carries it (§7):

```tsx
import { Still } from '@/fallback/Still';
const Scene = dynamic(() => import('@/gl/Scene').then((m) => m.Scene), { ssr: false, loading: () => <Still /> });
```

If Stage 2 already shows the still another way (a CSS background on a server-rendered wrapper), keep that and make `loading` return `null` instead, so there is one still on screen, not two.

- [ ] **Step 3: One label list: Stage 0's, visible only on the no-GL tier**

Stage 0's `Open` already renders `<Labels />` (`ul[data-labels]`) under the deck on every tier, and Stage 0's `exported.test.ts` needs those seven strings in the server HTML, so the list stays in the markup. Spec §11 shows it as a static list only on the no-GL tier; on the GL tier the labels are Stage 2's projected spans. No second list is added (there is no `StillLabels`). Instead the list is visually hidden unless the GL status is `'failed'`, and stays readable by screen readers either way (the projected spans are `aria-hidden`).

In `src/fallback/glStatus.ts`, flag the tier on `<html>` wherever the status becomes `'failed'`:

```ts
function flagFailed(): void {
  if (typeof document !== 'undefined' && document.documentElement) document.documentElement.setAttribute('data-gl', 'failed');
}
```

Call `flagFailed()` in `probeGl` right after `status` is set to `'failed'` by the probe, and in `markGlFailed` right after `status = 'failed'`. Append to `src/fallback/glStatus.test.ts`:

```ts
describe('the failed tier is flagged on <html> for the CSS (spec §11)', () => {
  it('sets data-gl="failed" on a failed probe and on markGlFailed', () => {
    const attrs: Record<string, string> = {};
    vi.stubGlobal('document', { documentElement: { setAttribute: (k: string, v: string) => { attrs[k] = v; } } });
    probeGl(() => false);
    expect(attrs['data-gl']).toBe('failed');
    resetGlStatusForTests();
    delete attrs['data-gl'];
    probeGl(() => true);
    expect(attrs['data-gl']).toBeUndefined();
    markGlFailed();
    expect(attrs['data-gl']).toBe('failed');
  });
});
```

In `src/app/globals.css`, after the `.scrim` rule:

```css
/* spec §11: the ignition labels show as a static list only on the no-GL tier; with GL they are the projected spans.
   Visually hidden, not display:none, so the strings stay in the HTML and in the accessibility tree. */
html:not([data-gl='failed']) [data-labels] {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}
```

Do not edit `src/site/Labels.tsx` or `src/site/sections/Open.tsx` in this task.

- [ ] **Step 4: Yours: Stage 4's SVG house on the no-GL tier**

Stage 4 Task 4.10 already built `VisitorHouseSvg()` for this tier (it subscribes to the visitor sentence itself and prints `copy.yours.tag(countWords(sentence), parts)`, the same unclamped word count and `1,933`-style parts count the GL build prints). `Yours.tsx` holds no sentence state, so nothing is passed in. In `src/site/sections/Yours.tsx`:
- Import `useGlFailed` from `@/fallback/Still` and `VisitorHouseSvg` from `@/fallback/HouseSvg`.
- `const glFailed = useGlFailed();`
- Render `{glFailed ? <VisitorHouseSvg /> : null}` directly after the hint line.
- Add `hidden={glFailed}` to `<p ref={clock} id="yours-clock" …>` and `<p ref={tag} id="yours-tag" …>`. They stay mounted, so `bindYours` keeps its refs, but with no canvas the bridge never writes them and `VisitorHouseSvg` prints the tag instead.
- The submit path needs no guard: `submitYours` stores and announces the sentence; with no canvas the visitor bridge is not mounted, and `VisitorHouseSvg` picks the announcement up.

- [ ] **Step 5: Typecheck, lint, test**

Run: `npx tsc --noEmit && npx eslint src && npx vitest run`
Expected: all green.

- [ ] **Step 6: Check the three ways in on the exported build**

```bash
npm run build && npx serve out -l 3005
```

With the Playwright MCP (or a browser): open `http://localhost:3005/?nogl=1` at 1440 × 900. Expected: no `<canvas>` (`document.querySelectorAll('canvas').length === 0`), `document.documentElement.dataset.gl === 'failed'`, the still fills the background, every section's copy is present, seven mono labels sit under the deck exactly once (`document.querySelectorAll('[data-labels]').length === 1`), typing `a tool that tells me when my train is late` and Enter shows an SVG house and `10 words in · N parts out · 4.40 s on the clock` with the grammar's N, zero console errors. Then open `http://localhost:3005/` and in the console run `document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()`. Expected: the canvas disappears, the still shows, the label list appears under the deck, zero uncaught errors. Before the context loss, at 1440 × 900 with GL running, `getComputedStyle(document.querySelector('[data-labels]')).position === 'absolute'` and the list is not visible under the deck.

- [ ] **Step 7: Commit**

```bash
git add src/gl/Scene.tsx src/fallback/glStatus.ts src/fallback/glStatus.test.ts src/app/globals.css src/site/sections/Yours.tsx src/site/Site.tsx
git commit -m "Switch to the still, the static label list and the SVG house on no WebGL, ?nogl=1 or a lost context"
```

**Verify:**
- `grep -n "webgl2Available" src/gl/Scene.tsx` prints nothing (the probe lives in `glStatus`).
- `grep -n "markGlFailed\|watchContextLoss" src/gl/Scene.tsx` shows both.
- `grep -rn "StillLabels\|StillHouse\|staticLabels" src` prints nothing (one label list, Stage 0's; one no-GL house, Stage 4's).
- `npx vitest run src/site/exported.test.ts` still passes after `npm run build` (the label strings are in the server HTML).
- The Step 6 checks hold on the exported build.

---

### Task 5.8: Gate instrumentation: `?still=1`, `?g=`, `?debug=1` and the perf overlay

Spec §10 ("the query sets `sessionStorage.introPlayed`, pins `g` to the alive section's midpoint (the driver reads a `?g=` override when `still=1`), hides `main`, and holds the frame"), §14 G7 (frame time, main-pass draws, heap over 10 s at g = 0, 0.5, 1), §12 (draw budgets: ≤ 18 desktop, ≤ 14 phone at rest, ≤ 15 during a build, shadow pass ≤ 6), §6 (one `useFrame`).

Stage 3 Task 3.6 already parses `?still=1`, `?g=` and `?t=` in `introGate.stillParams`, marks `introPlayed` from the Driver, and pins g with `if (still.g !== null) f.inputs.g = still.g;`; its doubts say this task should absorb that parser rather than add a second one. So this task adds no `gateQuery.ts`: it extends `introGate.ts` with `debug`, `pinnedG` and `holdsFrame`, replaces Stage 3's `still.g` line with one `pinnedG` call, and leaves every `sessionStorage` access in `introGate.ts`.

Readings this task takes: `?g=` is honoured with `still=1` (the spec) and with `debug=1` (so G7 can pin g = 0, 0.5, 1 without scrolling); it is clamped to 0..1. With `still=1` and no `?g=`, g is the alive section's midpoint (spec §10). "Holds the frame" is read as: still mode runs the driver with reduced motion, which freezes ambient time (Task 5.6), so a capture taken 3 s after T0 is stable, but only when `?t=` is absent: Stage 3's G2 stills (`?still=1&t=`) pin the chain clock and must keep playing it. "Hides main" also hides the fixed chrome and labels, so the picture has no text. The perf probe never adds a `useFrame`: it runs its own `requestAnimationFrame` loop outside React and reads `renderer.info`, which three resets at the start of every `render`, so a read between frames is the last frame's totals. `renderer.info.render.calls` includes the shadow pass; the probe subtracts one draw per visible shadow-casting mesh per shadow-casting light (a caster culled by the shadow camera makes this overcount main draws, which errs toward failing, never toward passing). Frame time is the mean `requestAnimationFrame` interval; `renderMs` (CPU time inside `gl.render`) is reported alongside. Heap is Chrome's `performance.memory.usedJSHeapSize`; "flat" is ≤ 2 MB growth over the window. The overlay's text is debug output, not site copy, so it does not live in `copy.ts`.

**Files:**
- Create: `src/gl/perfStats.ts`, `src/gl/perfProbe.ts`
- Test: `src/gl/perfStats.test.ts`; append to Stage 3's `src/gl/introGate.test.ts`
- Modify: `src/gl/introGate.ts` (Stage 3), `src/gl/Scene.tsx`, `src/gl/Driver.tsx`, `src/app/globals.css`, `src/site/chrome/Nav.tsx`, `src/site/Labels.tsx` (the `ProjectedLabels` container), `src/site/HillsideLabel.tsx` (its two fixed elements)

**Interfaces:**
- Consumes: `SectionRange`, `Tier` from `@/valley/types`; `useTier()` (`tier`, `rung`) from Task 5.1; Stage 3's `introGate.ts` (`StillParams`, `stillParams`, the Driver's `still` memo, `markIntroPlayed`) and its Driver lines `setFrameInputs(...)` and `if (still.g !== null) f.inputs.g = still.g;` (confirm with `grep -n "stillParams\|still.g\|setFrameInputs" src/gl/Driver.tsx`).
- Produces:
  ```ts
  // src/gl/introGate.ts (extended, Stage 3's names kept)
  export interface StillParams { still: boolean; debug?: boolean; g: number | null; t: number | null }
  export function stillParams(search: string): StillParams;   // now also reads ?debug=1, and ?g= with debug
  export function pinnedG(p: StillParams, ranges: readonly SectionRange[]): number | null;   // allocation-free
  export function holdsFrame(p: StillParams): boolean;        // still && t === null
  // src/gl/perfStats.ts
  export class FrameWindow { constructor(capacity?: number); push(ms: number): void; reset(): void; stats(): { frames: number; meanMs: number; p95Ms: number; maxMs: number } }
  export function splitDraws(totalCalls: number, casters: number, shadowLights: number, shadowsEnabled: boolean): { main: number; shadow: number };
  export function drawBudget(tier: Tier, building: boolean): number;   // 18 desktop; phone 14, 15 building
  export interface PerfSnapshot { tier: Tier; rung: number; dpr: number; frames: number; meanMs: number; p95Ms: number; maxMs: number; fps: number; renderMs: number; calls: number; mainDraws: number; shadowDraws: number; heapGrowthMB: number | null }
  export function verdict(s: PerfSnapshot): { frame: boolean; draws: boolean; shadow: boolean; heap: boolean | null };
  export function formatOverlay(s: PerfSnapshot): string;
  // src/gl/perfProbe.ts
  export function setPerfContext(tier: Tier, rung: number): void;
  export function attachPerfProbe(gl: WebGLRenderer, scene: Scene): () => void;   // window.__ortgPerf = { snapshot, reset, verdict }
  ```

- [ ] **Step 1: Write the failing tests**

Append to Stage 3's `src/gl/introGate.test.ts` (keep every existing case; `debug` is an optional field, so Stage 3's `toEqual` expectations and literals stay valid). Merge the two import lines below into the file's existing import block at the top:

```ts
import { holdsFrame, pinnedG } from './introGate';
import type { SectionRange } from '@/valley/types';

const R: SectionRange[] = [
  { id: 'open', start: 0, end: 0.1 }, { id: 'kalshi', start: 0.1, end: 0.3 }, { id: 'heron', start: 0.3, end: 0.4 },
  { id: 'darch', start: 0.4, end: 0.6 }, { id: 'summers', start: 0.6, end: 0.66 }, { id: 'alive', start: 0.66, end: 0.78 },
  { id: 'yours', start: 0.78, end: 0.9 }, { id: 'contact', start: 0.9, end: 1 },
];

describe('stillParams with ?debug=1 (spec §14 G7, Task 5.8)', () => {
  it('reads debug and a clamped g with debug=1, never t without still', () => {
    expect(stillParams('?debug=1&g=1')).toEqual({ still: false, debug: true, g: 1, t: null });
    expect(stillParams('?debug=1&g=7&t=2')).toEqual({ still: false, debug: true, g: 1, t: null });
    expect(stillParams('?debug=1&g=-2')).toEqual({ still: false, debug: true, g: 0, t: null });
    expect(stillParams('?still=1&debug=1&g=0.5')).toEqual({ still: true, debug: true, g: 0.5, t: null });
  });
  it('without still or debug nothing is pinned', () => {
    expect(stillParams('?g=0.5')).toEqual({ still: false, g: null, t: null });
    expect(stillParams('?still=0&debug=0&g=0.5')).toEqual({ still: false, g: null, t: null });
  });
});

describe('pinnedG (spec §10: still pins the alive midpoint unless ?g= says otherwise)', () => {
  it('a given g wins; still alone pins the alive midpoint; otherwise nothing is pinned', () => {
    expect(pinnedG({ still: true, g: 0.25, t: null }, R)).toBe(0.25);
    expect(pinnedG({ still: true, g: null, t: null }, R)).toBeCloseTo(0.72, 10);
    expect(pinnedG({ still: false, debug: true, g: 0.5, t: null }, R)).toBe(0.5);
    expect(pinnedG({ still: false, debug: true, g: null, t: null }, R)).toBeNull();
    expect(pinnedG({ still: false, g: null, t: null }, R)).toBeNull();
    expect(pinnedG({ still: true, g: null, t: null }, [])).toBeNull();   // before the first measure
  });
});

describe('holdsFrame (spec §10 "holds the frame")', () => {
  it('freezes ambient time in still mode only when no chain time is pinned, so ?t= G2 stills still play the chain', () => {
    expect(holdsFrame({ still: true, g: null, t: null })).toBe(true);
    expect(holdsFrame({ still: true, g: 0, t: 2.6 })).toBe(false);
    expect(holdsFrame({ still: false, debug: true, g: 0.5, t: null })).toBe(false);
    expect(holdsFrame({ still: false, g: null, t: null })).toBe(false);
  });
});
```

`src/gl/perfStats.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { FrameWindow, splitDraws, drawBudget, verdict, formatOverlay, type PerfSnapshot } from './perfStats';

describe('FrameWindow', () => {
  it('mean, p95 and max over the frames pushed since reset', () => {
    const w = new FrameWindow(1000);
    for (let i = 0; i < 94; i++) w.push(10);
    for (let i = 0; i < 6; i++) w.push(40);
    expect(w.stats()).toEqual({ frames: 100, meanMs: 11.8, p95Ms: 40, maxMs: 40 });
    w.reset();
    for (let i = 0; i < 95; i++) w.push(10);
    for (let i = 0; i < 5; i++) w.push(40);
    expect(w.stats().p95Ms).toBe(10);
  });
  it('keeps only the last `capacity` frames, ignores junk, and is empty after reset', () => {
    const w = new FrameWindow(4);
    for (const ms of [100, 1, 2, 3, 4]) w.push(ms);
    w.push(NaN);
    w.push(-5);
    expect(w.stats()).toEqual({ frames: 4, meanMs: 2.5, p95Ms: 4, maxMs: 4 });
    w.reset();
    expect(w.stats()).toEqual({ frames: 0, meanMs: 0, p95Ms: 0, maxMs: 0 });
  });
});

describe('splitDraws (renderer.info counts the shadow pass too)', () => {
  it('subtracts one draw per caster per shadow-casting light when shadows are on', () => {
    expect(splitDraws(20, 4, 1, true)).toEqual({ main: 16, shadow: 4 });
    expect(splitDraws(14, 4, 1, false)).toEqual({ main: 14, shadow: 0 });
    expect(splitDraws(2, 4, 1, true)).toEqual({ main: 0, shadow: 4 });
  });
});

describe('budgets and the G7 verdict (spec §12, §14)', () => {
  const base: PerfSnapshot = {
    tier: 'desktop', rung: 0, dpr: 1.25, frames: 600, meanMs: 16.4, p95Ms: 17, maxMs: 20, fps: 61, renderMs: 2.1,
    calls: 20, mainDraws: 16, shadowDraws: 4, heapGrowthMB: 0.4,
  };
  it('draw budgets: 18 desktop, 14 phone at rest, 15 phone during a build', () => {
    expect(drawBudget('desktop', false)).toBe(18);
    expect(drawBudget('phone', false)).toBe(14);
    expect(drawBudget('phone', true)).toBe(15);
  });
  it('passes under 16.7 ms, ≤ 18 main draws, ≤ 6 shadow draws, ≤ 2 MB heap growth', () => {
    expect(verdict(base)).toEqual({ frame: true, draws: true, shadow: true, heap: true });
    expect(verdict({ ...base, meanMs: 16.7 }).frame).toBe(false);
    expect(verdict({ ...base, mainDraws: 19 }).draws).toBe(false);
    expect(verdict({ ...base, shadowDraws: 7 }).shadow).toBe(false);
    expect(verdict({ ...base, heapGrowthMB: 2.5 }).heap).toBe(false);
    expect(verdict({ ...base, heapGrowthMB: null }).heap).toBeNull();
    expect(verdict({ ...base, tier: 'phone', mainDraws: 15, shadowDraws: 0 }).draws).toBe(false);
    expect(verdict({ ...base, tier: 'phone', mainDraws: 14, shadowDraws: 1 }).shadow).toBe(false);
  });
  it('formats three lowercase lines', () => {
    const text = formatOverlay(base);
    expect(text.split('\n')).toHaveLength(3);
    expect(text).toBe(text.toLowerCase());
    expect(text).toContain('16 main');
    expect(text).toContain('rung 0');
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run src/gl/introGate.test.ts src/gl/perfStats.test.ts`
Expected: FAIL: `holdsFrame` and `pinnedG` are not exported from `./introGate`, and "Failed to resolve import './perfStats'". Stage 3's existing `introGate` cases still pass.

- [ ] **Step 3: Extend Stage 3's `src/gl/introGate.ts` (no new parser)**

Change `StillParams` and `stillParams`, and add `pinnedG` and `holdsFrame` below `stillParams`:

```ts
export interface StillParams {
  still: boolean;
  debug?: boolean;   // ?debug=1 (Task 5.8): the perf overlay; honours ?g= too
  g: number | null;
  t: number | null;
}

export function stillParams(search: string): StillParams {
  const q = new URLSearchParams(search);
  const still = q.get('still') === '1';
  const debug = q.get('debug') === '1';
  if (!still && !debug) return { still: false, g: null, t: null };
  const g = num(q, 'g');
  const t = still ? num(q, 't') : null;
  const out: StillParams = { still, g: g === null ? null : Math.min(1, Math.max(0, g)), t: t === null ? null : Math.max(0, t) };
  if (debug) out.debug = true;
  return out;
}

/** The g the driver uses instead of the scroll's, or null: ?g= when still or debug, else the alive midpoint in
 *  still mode (spec §10). Allocation-free: it runs every frame. */
export function pinnedG(p: StillParams, ranges: readonly SectionRange[]): number | null {
  if (p.g !== null) return p.g;
  if (!p.still) return null;
  for (let i = 0; i < ranges.length; i++) {
    if (ranges[i].id === 'alive') return (ranges[i].start + ranges[i].end) / 2;
  }
  return null;
}

/** Still mode "holds the frame" by freezing ambient time, except when ?t= pins the chain clock for a G2 still. */
export function holdsFrame(p: StillParams): boolean {
  return p.still && p.t === null;
}
```

Add `import type { SectionRange } from '@/valley/types';`. Nothing else in `introGate.ts` changes; `markIntroPlayed` stays the only `sessionStorage` write in `src`, and the Driver's Stage 3 effect (`if (still.still) markIntroPlayed(sessionStore);`) already marks the intro played in still mode.

- [ ] **Step 4: Implement `perfStats.ts`**

`src/gl/perfStats.ts`:

```ts
// Pure maths for the ?debug=1 overlay and the G7 verdict (spec §12, §14).
import type { Tier } from '@/valley/types';

export class FrameWindow {
  private readonly buf: Float64Array;
  private readonly capacity: number;
  private n = 0;
  private head = 0;

  constructor(capacity = 2400) {
    this.capacity = capacity;
    this.buf = new Float64Array(capacity);
  }

  push(ms: number): void {
    if (!Number.isFinite(ms) || ms < 0) return;
    this.buf[this.head] = ms;
    this.head = (this.head + 1) % this.capacity;
    if (this.n < this.capacity) this.n++;
  }

  reset(): void {
    this.n = 0;
    this.head = 0;
  }

  stats(): { frames: number; meanMs: number; p95Ms: number; maxMs: number } {
    if (this.n === 0) return { frames: 0, meanMs: 0, p95Ms: 0, maxMs: 0 };
    const vals = Array.from(this.buf.subarray(0, this.n)).sort((a, b) => a - b);
    const sum = vals.reduce((a, b) => a + b, 0);
    const p95 = vals[Math.min(vals.length - 1, Math.ceil(0.95 * vals.length) - 1)];
    return { frames: this.n, meanMs: sum / this.n, p95Ms: p95, maxMs: vals[vals.length - 1] };
  }
}

export function splitDraws(totalCalls: number, casters: number, shadowLights: number, shadowsEnabled: boolean): { main: number; shadow: number } {
  const shadow = shadowsEnabled ? casters * shadowLights : 0;
  return { main: Math.max(0, totalCalls - shadow), shadow };
}

export function drawBudget(tier: Tier, building: boolean): number {
  if (tier === 'desktop') return 18;
  return building ? 15 : 14;
}

export interface PerfSnapshot {
  tier: Tier; rung: number; dpr: number;
  frames: number; meanMs: number; p95Ms: number; maxMs: number; fps: number; renderMs: number;
  calls: number; mainDraws: number; shadowDraws: number; heapGrowthMB: number | null;
}

export function verdict(s: PerfSnapshot): { frame: boolean; draws: boolean; shadow: boolean; heap: boolean | null } {
  return {
    frame: s.meanMs < 16.7,
    draws: s.mainDraws <= drawBudget(s.tier, false),
    shadow: s.tier === 'desktop' ? s.shadowDraws <= 6 : s.shadowDraws === 0,
    heap: s.heapGrowthMB === null ? null : s.heapGrowthMB <= 2,
  };
}

export function formatOverlay(s: PerfSnapshot): string {
  const heap = s.heapGrowthMB === null ? 'n/a' : `${s.heapGrowthMB >= 0 ? '+' : ''}${s.heapGrowthMB.toFixed(1)} mb`;
  return [
    `fps ${s.fps.toFixed(1)}  mean ${s.meanMs.toFixed(2)} ms  p95 ${s.p95Ms.toFixed(2)}  max ${s.maxMs.toFixed(2)}  (${s.frames} frames)`,
    `render ${s.renderMs.toFixed(2)} ms  draws ${s.mainDraws} main + ${s.shadowDraws} shadow (${s.calls} calls)`,
    `dpr ${s.dpr}  rung ${s.rung}  tier ${s.tier}  heap ${heap}`,
  ].join('\n');
}
```

- [ ] **Step 5: Run the tests and see them pass**

Run: `npx vitest run src/gl/introGate.test.ts src/gl/perfStats.test.ts`
Expected: PASS, including every Stage 3 `introGate` case.

- [ ] **Step 6: Implement `perfProbe.ts`**

`src/gl/perfProbe.ts`:

```ts
// The ?debug=1 overlay (spec §14 G7). A requestAnimationFrame loop outside React (the scene keeps its one useFrame):
// frame intervals into a FrameWindow, gl.render wrapped for CPU time, renderer.info read between frames (three resets
// it at the start of each render, so this is the last frame's total). Exposes window.__ortgPerf for the gate agent.
import type { Camera, Object3D, Scene, WebGLRenderer } from 'three';
import type { Tier } from '@/valley/types';
import { FrameWindow, formatOverlay, splitDraws, verdict, type PerfSnapshot } from './perfStats';

const context: { tier: Tier; rung: number } = { tier: 'desktop', rung: 0 };

export function setPerfContext(tier: Tier, rung: number): void {
  context.tier = tier;
  context.rung = rung;
}

function heapMB(): number | null {
  const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return mem ? mem.usedJSHeapSize / 1048576 : null;
}

function countShadows(scene: Scene): { casters: number; lights: number } {
  let casters = 0;
  let lights = 0;
  scene.traverseVisible((o) => {
    const flags = o as Object3D & { isMesh?: boolean; isLight?: boolean };
    if (flags.isMesh && o.castShadow) casters++;
    if (flags.isLight && o.castShadow) lights++;
  });
  return { casters, lights };
}

interface PerfApi { snapshot(): PerfSnapshot; reset(): void; verdict(): ReturnType<typeof verdict> }

export function attachPerfProbe(gl: WebGLRenderer, scene: Scene): () => void {
  const frames = new FrameWindow(2400);
  let renderMs = 0;
  let heapStart = heapMB();
  let shadows = countShadows(scene);

  const originalRender = gl.render;
  gl.render = function timedRender(this: WebGLRenderer, s: Object3D, c: Camera) {
    const t0 = performance.now();
    originalRender.call(this, s, c);
    renderMs = performance.now() - t0;
  };

  const pre = document.createElement('pre');
  pre.id = 'perf';
  pre.className = 'mono';
  document.body.appendChild(pre);

  const snapshot = (): PerfSnapshot => {
    const f = frames.stats();
    const draws = splitDraws(gl.info.render.calls, shadows.casters, shadows.lights, gl.shadowMap.enabled);
    const now = heapMB();
    return {
      tier: context.tier, rung: context.rung, dpr: gl.getPixelRatio(),
      frames: f.frames, meanMs: f.meanMs, p95Ms: f.p95Ms, maxMs: f.maxMs, fps: f.meanMs > 0 ? 1000 / f.meanMs : 0,
      renderMs, calls: gl.info.render.calls, mainDraws: draws.main, shadowDraws: draws.shadow,
      heapGrowthMB: now === null || heapStart === null ? null : now - heapStart,
    };
  };
  const reset = () => {
    frames.reset();
    heapStart = heapMB();
  };
  const api: PerfApi = { snapshot, reset, verdict: () => verdict(snapshot()) };
  (window as Window & { __ortgPerf?: PerfApi }).__ortgPerf = api;

  let last = performance.now();
  let count = 0;
  let raf = requestAnimationFrame(function tick(now: number) {
    frames.push(now - last);
    last = now;
    count++;
    if (count % 30 === 0) {
      shadows = countShadows(scene);
      pre.textContent = formatOverlay(snapshot());
    }
    raf = requestAnimationFrame(tick);
  });

  return () => {
    cancelAnimationFrame(raf);
    gl.render = originalRender;
    pre.remove();
    delete (window as Window & { __ortgPerf?: PerfApi }).__ortgPerf;
  };
}
```

- [ ] **Step 7: Wire Scene and Driver**

In `src/gl/Scene.tsx`, inside the component that renders `<Canvas>`:

```tsx
import { useEffect, useMemo, useRef } from 'react';
import { stillParams } from './introGate';
import { attachPerfProbe, setPerfContext } from './perfProbe';

// with the other hooks (tier and rung come from useTier(), Task 5.1; add `rung` to that destructuring now):
const query = useMemo(() => stillParams(typeof window === 'undefined' ? '' : window.location.search), []);
const detachPerf = useRef<(() => void) | null>(null);
useEffect(() => {
  if (query.still) document.documentElement.dataset.still = '1';   // spec §10: hides the DOM for the capture
  return () => detachPerf.current?.();
}, [query]);
useEffect(() => setPerfContext(tier, rung), [tier, rung]);
```

and at the end of the existing `onCreated` callback:

```tsx
if (query.debug) detachPerf.current = attachPerfProbe(state.gl, state.scene);
```

In `src/gl/Driver.tsx`, extend the `./introGate` import with `holdsFrame, pinnedG`, and replace Stage 3's two lines

```ts
    setFrameInputs(f.inputs, s.g, s.ranges, now, delta, introT, reducedMotion, rig.portrait);
    if (still.g !== null) f.inputs.g = still.g;
```

with

```ts
    setFrameInputs(f.inputs, s.g, s.ranges, now, delta, introT, reducedMotion || holdsFrame(still), rig.portrait);
    const pin = pinnedG(still, f.inputs.ranges);
    if (pin !== null) f.inputs.g = pin;
```

Keep Stage 3.10's two lines (`pulseT`, `flickerT`) directly after these, as before. `still` is Stage 3's `useMemo(stillParams(...))`, so `?debug=1&g=` now pins g too, `?still=1` alone pins the alive midpoint, and `?still=1&t=` keeps the chain playing at a fixed time (G2) because `holdsFrame` is false there. Everything downstream (camera, labels, arrival gate) reads `f.inputs.g`, so the whole frame agrees.

- [ ] **Step 8: Hide the DOM in still mode, style the overlay**

Add `data-still-hide` to:
- the root element of `src/site/chrome/Nav.tsx` (and the home mark if it is a separate root);
- the container `ProjectedLabels` renders in `src/site/Labels.tsx` (Stage 2 Task 2.8: it sits outside `main`, so hiding `main` does not hide it). Stage 0's `Labels()` list is inside `main` and needs nothing;
- both fixed elements `HillsideLabel` renders in `src/site/HillsideLabel.tsx` (Stage 4 Task 4.9: the hover `span` and the tap `p`).

Append to `src/app/globals.css`:

```css
/* spec §10: ?still=1 hides the DOM so the capture is the valley alone */
html[data-still] main,
html[data-still] [data-still-hide] { visibility: hidden !important; }

/* ?debug=1 perf overlay (spec §14 G7) */
#perf {
  position: fixed; left: 8px; bottom: 8px; z-index: 50; margin: 0;
  font-size: 11px; line-height: 1.4; white-space: pre; pointer-events: none;
}
```

- [ ] **Step 9: Typecheck, lint, test**

Run: `npx tsc --noEmit && npx eslint src && npx vitest run`
Expected: all green. `grep -rn "useFrame(" src --include=*.tsx | grep -v "\.test\." ` lists only `src/gl/Driver.tsx`.

- [ ] **Step 10: Look at it on the exported build**

```bash
npm run build && npx serve out -l 3005
```

Open `http://localhost:3005/?debug=1&g=0.5` at 1440 × 900 in a fresh profile (no stored sentence): the three-line overlay sits bottom-left and updates twice a second; in the console `window.__ortgPerf.snapshot()` returns the fields above and `mainDraws` equals `expectedMainDraws(quality, false, false)`, 15 on desktop at rung 0 (the empty visitor mesh issues no draw). Then type a sentence in the yours input, press Enter, wait 5 s: `mainDraws` is 16, `expectedMainDraws(quality, false, true)`. Open `http://localhost:3005/?still=1`: no text anywhere (no nav, no projected labels, no hillside label), the alive view, every light lit, the river still; `sessionStorage.getItem('introPlayed')` is set. Open `http://localhost:3005/?still=1&g=0&t=2.6`: the chain is caught mid-flight (the mill lit), as in Stage 3's G2.

- [ ] **Step 11: Commit**

```bash
git add src/gl/introGate.ts src/gl/introGate.test.ts src/gl/perfStats.ts src/gl/perfStats.test.ts src/gl/perfProbe.ts src/gl/Scene.tsx src/gl/Driver.tsx src/app/globals.css src/site/chrome/Nav.tsx src/site/Labels.tsx src/site/HillsideLabel.tsx
git commit -m "Add the gate instrumentation: ?still=1, ?g=, ?debug=1 perf overlay from renderer.info"
```

**Verify:**
- `npx vitest run src/gl/introGate.test.ts src/gl/perfStats.test.ts` passes.
- `ls src/gl/gateQuery.ts 2>&1` reports no such file; `grep -rn "sessionStorage" src --include=*.ts --include=*.tsx` prints only `src/gl/introGate.ts` (Stage 3's Verify still holds).
- `grep -n "still.g" src/gl/Driver.tsx` prints nothing; `grep -n "pinnedG(still" src/gl/Driver.tsx` prints one line.
- `grep -rn "useFrame(" src --include=*.tsx | grep -v test` lists `Driver.tsx` only.
- `/?debug=1&g=0.5` on the exported build shows the overlay; `/?still=1` shows no text.
- `/` without flags shows no overlay and `window.__ortgPerf` is `undefined`.

---

### Task 5.9: Every light a focusable control; phone tap labels as a bottom mono line

Spec §11 (phone: "tap on a hillside house or an emitter shows its label as a bottom-aligned mono line"), §6 (no R3F pointer events; window-level listeners with screen-space hit tests against the cached projected emitter positions), §3.1 (the ignition labels; hillside labels are the sentence the house was built from), §3.2 (the five hillside sentences), §4.8 (the emitter ids), §9 (scrims; mono), index contract `FrameTargets.projected` (x, y, visible per emitter, `EMITTERS` order).

Readings this task takes: each emitter gets one `<button>` whose accessible name (its `aria-label`) is the emitter's label: the ignition label for `hut`, `nist`, `mill`, `kalshiLamp`, `wvu`; the heron label for `bar1`…`bar4`; the hillside sentence for `hill1`…`hill5` (in §3.2 order); the visitor's sentence for `visitor` (or the input placeholder `something you'd build` before there is one); the kalshi label for `ridge`. The group's name is the deck line. Buttons are in build order, keyboard-only (`pointer-events: none`, invisible until `:focus-visible`), and on focus or activation they move onto their light and put the label in the bottom line. The tap line is the same line: a touch tap within 28 px of a visible projected emitter shows its label; a tap on empty valley clears it; taps on links, buttons and the input are ignored. The driver's projected positions (`PROJECTED`, Stage 2 Task 2.1) are NDC x, NDC y and visible per emitter, not pixels: every read converts them into a preallocated CSS-px scratch array with Stage 4's `projectedToPixels(PROJECTED, innerWidth, innerHeight, out)` (`src/site/hillsideHit.ts`, Task 4.9) before the hit test or the button transform. The visitor sentence is read with Stage 4's `getVisitorSnapshot()` (`src/site/visitorSentence.ts`) when a control is focused or a light tapped, so this file touches no storage and no effect sets state. **One tap line:** Stage 4's `HillsideLabel` also showed a bottom line on a touch tap of a hillside house; this task removes that touch path (it keeps HillsideLabel's mouse hover), so `LightControls` owns the single bottom line for every emitter, hills included, and a tap never shows two overlapping lines.

**Files:**
- Create: `src/site/lightControls.ts`, `src/site/LightControls.tsx`
- Test: `src/site/lightControls.test.ts`
- Modify: `src/site/Site.tsx`, `src/app/globals.css`, `src/site/HillsideLabel.tsx` (drop its touch path and tap line; hover stays)

**Interfaces:**
- Consumes: `EMITTERS`, `EmitterId` (index contracts); `PROJECTED` from `@/gl/projection` (Stage 2 Task 2.1: NDC x, NDC y, visible per emitter, the array `Labels.tsx` reads); `projectedToPixels` from `@/site/hillsideHit` (Stage 4 Task 4.9); `getVisitorSnapshot` from `@/site/visitorSentence` (Stage 4 Task 4.2); `copy.open.deck`, `copy.open.labels` keyed by Stage 0's `IgnitionLabelKey` (`hut`, `nist`, `mill`, `kalshiLamp`, `wvu`, `bars`, `hillside`), `copy.yours.hillside: readonly string[]`, `copy.yours.placeholder`; `useGlFailed()` from `@/fallback/Still` (Task 5.3).
- Produces:
  ```ts
  // src/site/lightControls.ts
  export const LIGHT_ORDER: readonly EmitterId[];
  export function lightLabel(id: EmitterId, visitorSentence: string | null): string | null;
  export const TAP_RADIUS_PX = 28;
  export function nearestEmitter(px: Float32Array, x: number, y: number, radius?: number): number;   // px: CSS px stride 3 (from projectedToPixels); EMITTERS index or -1
  export function isTap(down: { x: number; y: number; t: number }, up: { x: number; y: number; t: number }): boolean;
  // src/site/LightControls.tsx
  export function LightControls(): JSX.Element | null;
  ```

- [ ] **Step 1: Write the failing test**

`src/site/lightControls.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { EMITTERS } from '@/valley/lights';
import { LIGHT_ORDER, lightLabel, nearestEmitter, isTap, TAP_RADIUS_PX } from './lightControls';

describe('LIGHT_ORDER', () => {
  it('holds every emitter exactly once, hut first, in build order with the mill after nist', () => {
    expect([...LIGHT_ORDER].sort()).toEqual(EMITTERS.map((e) => e.id).sort());
    expect(LIGHT_ORDER.slice(0, 5)).toEqual(['hut', 'nist', 'mill', 'kalshiLamp', 'wvu']);
    expect(LIGHT_ORDER[LIGHT_ORDER.length - 1]).toBe('ridge');
  });
});

describe('lightLabel (spec §3.1, §3.2)', () => {
  it('uses the ignition labels verbatim', () => {
    expect(lightLabel('hut', null)).toBe('discord bots, middle school. my classmates used them.');
    expect(lightLabel('nist', null)).toBe('nist, summer 2025');
    expect(lightLabel('mill', null)).toBe('darch, june 2025 to may 2026');
    expect(lightLabel('kalshiLamp', null)).toBe('kalshi, since jan 2026');
    expect(lightLabel('ridge', null)).toBe('kalshi, since jan 2026');
    expect(lightLabel('wvu', null)).toBe('wvu medicine, summer 2026');
    for (const id of ['bar1', 'bar2', 'bar3', 'bar4'] as const) expect(lightLabel(id, null)).toBe('heron, since june 2026');
  });
  it('labels each hillside house with the sentence it was built from', () => {
    expect(lightLabel('hill1', null)).toBe('a discord bot for my middle school server');
    expect(lightLabel('hill2', null)).toBe('a trading algorithm for kalshi');
    expect(lightLabel('hill3', null)).toBe('a pipeline that made three thousand videos a month');
    expect(lightLabel('hill4', null)).toBe('a help-desk assistant that reads the docs for you');
    expect(lightLabel('hill5', null)).toBe('a pricing model for free-drinks promos at bars');
  });
  it('labels the visitor house with the visitor\'s sentence, or nothing before there is one', () => {
    expect(lightLabel('visitor', 'a garden that waters itself')).toBe('a garden that waters itself');
    expect(lightLabel('visitor', null)).toBeNull();
    expect(lightLabel('visitor', '   ')).toBeNull();
  });
});

describe('nearestEmitter (screen-space hit test, spec §6)', () => {
  const projected = new Float32Array(EMITTERS.length * 3);
  projected[0 * 3] = 100; projected[0 * 3 + 1] = 100; projected[0 * 3 + 2] = 1;   // emitter 0 visible at (100, 100)
  projected[1 * 3] = 120; projected[1 * 3 + 1] = 100; projected[1 * 3 + 2] = 1;   // emitter 1 visible at (120, 100)
  projected[2 * 3] = 300; projected[2 * 3 + 1] = 300; projected[2 * 3 + 2] = 0;   // emitter 2 hidden at (300, 300)

  it('returns the nearest visible emitter inside the radius', () => {
    expect(nearestEmitter(projected, 104, 100)).toBe(0);
    expect(nearestEmitter(projected, 117, 101)).toBe(1);
  });
  it('ignores hidden emitters and returns -1 when nothing is near', () => {
    expect(nearestEmitter(projected, 300, 300)).toBe(-1);
    expect(nearestEmitter(projected, 100, 100 + TAP_RADIUS_PX + 1)).toBe(-1);
    expect(TAP_RADIUS_PX).toBe(28);
  });
});

describe('isTap', () => {
  it('is a short touch that barely moved; a scroll drag is not', () => {
    expect(isTap({ x: 10, y: 10, t: 0 }, { x: 14, y: 16, t: 200 })).toBe(true);
    expect(isTap({ x: 10, y: 10, t: 0 }, { x: 10, y: 40, t: 200 })).toBe(false);
    expect(isTap({ x: 10, y: 10, t: 0 }, { x: 10, y: 10, t: 900 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/site/lightControls.test.ts`
Expected: FAIL with "Failed to resolve import './lightControls'".

- [ ] **Step 3: Implement `lightControls.ts`**

`src/site/lightControls.ts`:

```ts
// The lights as controls (a11y) and the phone tap line (spec §11): each emitter's label, the build-order tab order,
// and the screen-space hit test against the driver's projected positions, converted from NDC to CSS px by the caller
// (projectedToPixels; stride 3: x px, y px, visible).
import type { EmitterId } from '@/valley/types';
import { EMITTERS } from '@/valley/lights';
import { copy } from './copy';

export const LIGHT_ORDER: readonly EmitterId[] = [
  'hut', 'nist', 'mill', 'kalshiLamp', 'wvu', 'bar1', 'bar2', 'bar3', 'bar4',
  'hill1', 'hill2', 'hill3', 'hill4', 'hill5', 'visitor', 'ridge',
];

const HILL: Partial<Record<EmitterId, number>> = { hill1: 0, hill2: 1, hill3: 2, hill4: 3, hill5: 4 };

export function lightLabel(id: EmitterId, visitorSentence: string | null): string | null {
  const l = copy.open.labels;
  switch (id) {
    case 'hut': return l.hut;
    case 'nist': return l.nist;
    case 'mill': return l.mill;
    case 'kalshiLamp':
    case 'ridge': return l.kalshiLamp;
    case 'wvu': return l.wvu;
    case 'bar1':
    case 'bar2':
    case 'bar3':
    case 'bar4': return l.bars;
    case 'visitor': return visitorSentence && visitorSentence.trim() !== '' ? visitorSentence.trim() : null;
    default: return copy.yours.hillside[HILL[id] ?? 0];
  }
}

export const TAP_RADIUS_PX = 28;

export function nearestEmitter(px: Float32Array, x: number, y: number, radius = TAP_RADIUS_PX): number {
  let best = -1;
  let bestD2 = radius * radius;
  for (let i = 0; i < EMITTERS.length; i++) {
    if (px[i * 3 + 2] <= 0) continue;
    const dx = px[i * 3] - x;
    const dy = px[i * 3 + 1] - y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= bestD2) { best = i; bestD2 = d2; }
  }
  return best;
}

export function isTap(down: { x: number; y: number; t: number }, up: { x: number; y: number; t: number }): boolean {
  return Math.hypot(up.x - down.x, up.y - down.y) <= 10 && up.t - down.t <= 500;
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run src/site/lightControls.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement `LightControls.tsx`**

`src/site/LightControls.tsx`:

```tsx
'use client';
// Keyboard: one button per light, in build order, named by its label; focus moves the (invisible) button onto its
// light so the focus ring circles it, and puts the label in the bottom mono line. Touch: a tap near a light shows its
// label in the same line (spec §11 phone). Reads the projected positions only on focus or tap, never per frame.
import { useEffect, useRef, useState } from 'react';
import type { EmitterId } from '@/valley/types';
import { EMITTERS } from '@/valley/lights';
import { PROJECTED } from '@/gl/projection';
import { useGlFailed } from '@/fallback/Still';
import { copy } from './copy';
import { projectedToPixels } from './hillsideHit';
import { getVisitorSnapshot } from './visitorSentence';
import { LIGHT_ORDER, isTap, lightLabel, nearestEmitter } from './lightControls';

const INDEX = new Map<EmitterId, number>(EMITTERS.map((e, i) => [e.id, i]));
const INTERACTIVE = 'a, button, input, textarea, select, label';
// CSS-px copy of PROJECTED (which is NDC), refreshed on each tap or focus, never per frame.
const PX = new Float32Array(PROJECTED.length);
const pixels = () => projectedToPixels(PROJECTED, window.innerWidth, window.innerHeight, PX);

export function LightControls() {
  const failed = useGlFailed();
  const [line, setLine] = useState('');
  const [sentence, setSentence] = useState<string | null>(null);
  const down = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    if (failed) return;
    const onDown = (e: PointerEvent) => {
      down.current = e.pointerType === 'touch' ? { x: e.clientX, y: e.clientY, t: e.timeStamp } : null;
    };
    const onUp = (e: PointerEvent) => {
      const d = down.current;
      down.current = null;
      if (!d || e.pointerType !== 'touch') return;
      if (!isTap(d, { x: e.clientX, y: e.clientY, t: e.timeStamp })) return;
      if ((e.target as Element | null)?.closest?.(INTERACTIVE)) return;
      const i = nearestEmitter(pixels(), e.clientX, e.clientY);
      setLine(i < 0 ? '' : lightLabel(EMITTERS[i].id, getVisitorSnapshot()) ?? '');
    };
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
    };
  }, [failed]);

  if (failed) return null;

  const show = (id: EmitterId, el: HTMLElement) => {
    const s = getVisitorSnapshot();
    setSentence(s);
    const i = INDEX.get(id) ?? 0;
    const px = pixels();
    el.style.transform = `translate(${px[i * 3]}px, ${px[i * 3 + 1]}px)`;
    setLine(lightLabel(id, s) ?? '');
  };

  return (
    <>
      <div role="group" aria-label={copy.open.deck}>
        {LIGHT_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            className="light-control"
            aria-label={lightLabel(id, sentence) ?? copy.yours.placeholder}
            onFocus={(e) => show(id, e.currentTarget)}
            onClick={(e) => show(id, e.currentTarget)}
            onBlur={() => setLine('')}
          />
        ))}
      </div>
      <p className="tap-line mono" aria-live="polite" data-still-hide hidden={line === ''}>{line}</p>
    </>
  );
}
```

- [ ] **Step 6: Mount it and style it**

In `src/site/Site.tsx`, import `LightControls` from `./LightControls` and render `<LightControls />` immediately after `<main>…</main>` inside the provider, so the lights come after the copy in tab order.

In `src/site/HillsideLabel.tsx` (Stage 4 Task 4.9), remove the touch path so there is one bottom line: delete the `onDown` handler and its `pointerdown` listener and removal, the `tap` parameter of `listen`, the `tap` ref, and the `<p ref={tap} …>` element (with the `data-still-hide` Task 5.8 put on it). Keep the mouse/pen hover span and its `pointermove`/`scroll` listeners exactly as they are. The component now returns just the hover `<span>`.

Append to `src/app/globals.css` (use the scrim variable Stage 0 declared for the copy column's gradient; find it with `grep -n "0.72" src/app/globals.css` and put its name where this block says `var(--scrim)` if it differs):

```css
/* every light a focusable control (a11y): invisible and click-through until keyboard focus moves it onto its light */
.light-control {
  position: fixed; left: -22px; top: -22px; z-index: 30;
  width: 44px; height: 44px; border: 0; border-radius: 9999px;
  background: transparent; color: inherit; opacity: 0; pointer-events: none;
}
.light-control:focus-visible { opacity: 1; outline: 2px solid currentColor; outline-offset: 2px; }

/* the phone tap line and the focused light's label (spec §11): bottom-aligned mono over the scrim */
.tap-line {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; margin: 0;
  padding: 32px 16px 16px; pointer-events: none;
  background: linear-gradient(to top, var(--scrim), transparent);
}
.tap-line[hidden] { display: none; }
```

- [ ] **Step 7: Typecheck, lint, test**

Run: `npx tsc --noEmit && npx eslint src && npx vitest run`
Expected: all green.

- [ ] **Step 8: Look at it**

`npm run dev` at 1440 × 900, chain finished: press Tab until focus leaves the contact links: a ring circles the hut window and `discord bots, middle school. my classmates used them.` appears at the bottom; Tab again moves to nist, then the mill, and so on, ending at the ridge. VoiceOver (Cmd+F5) reads each label. At 390 × 844 with touch emulation in DevTools, tap the hut: its label shows at the bottom; tap empty sky: it clears; drag to scroll: nothing shows. With `?nogl=1` no light buttons exist (`document.querySelectorAll('.light-control').length === 0`).

- [ ] **Step 9: Commit**

```bash
git add src/site/lightControls.ts src/site/lightControls.test.ts src/site/LightControls.tsx src/site/Site.tsx src/app/globals.css src/site/HillsideLabel.tsx
git commit -m "Make every light a focusable control and show tapped labels as a bottom mono line"
```

**Verify:**
- `npx vitest run src/site/lightControls.test.ts` passes.
- `grep -n "getBoundingClientRect\|useFrame\|onPointer" src/site/LightControls.tsx` prints nothing.
- `grep -n "localStorage\|sessionStorage" src/site/LightControls.tsx src/site/lightControls.ts` prints nothing (Stage 4's storage rule holds).
- `grep -n "PROJECTED\[" src/site/LightControls.tsx` prints nothing (positions are always read through `projectedToPixels`).
- `grep -n "pointerdown\|bottom-4" src/site/HillsideLabel.tsx` prints nothing (one tap line, `LightControls`'s).
- `grep -nE "l\.(kalshi|heron)\b" src/site/lightControls.ts` prints nothing (Stage 0's keys are `kalshiLamp` and `bars`).
- The Step 8 keyboard, screen reader, touch and `?nogl=1` checks hold.

---

### Task 5.10: Lint, typecheck, tests, build, repo-wide checks and the README

Spec §2 (no hooks, static export, scripts), §12 (budgets, one `useFrame`), §14 ("Every gate also requires `npm run lint`, `npx tsc --noEmit`, `npx vitest run` and `npm run build` green"), §16 (build: `out/` with no server features, `grep -r "fetch(" src/` empty, no `app/api`), §15 (scripts `dev`, `build`, `lint`, `typecheck`, `test`).

**Files:**
- Modify: `README.md`, and any `src/**` file a check below fails on (fix in place; list each in the commit)

**Interfaces:**
- Consumes: everything Stages 0–5 built.
- Produces: a branch on which every check below passes; the README a newcomer runs the site from.

- [ ] **Step 1: The four green commands**

```bash
npm run lint && npx tsc --noEmit && npx vitest run && npm run build
```

Expected: each exits 0; `out/index.html` exists. Fix any failure at its source (never by disabling a rule or skipping a test) and rerun until all four pass.

- [ ] **Step 2: The repo-wide checks**

Run each; the expected output is given after the arrow.

```bash
grep -rn "fetch(" src/                                              # → nothing
ls src/app/api 2>/dev/null                                          # → nothing
grep -rn "process\.env" src/                                        # → nothing
grep -rnE "gsap|@react-three/postprocessing|backdrop-filter|box-shadow" src/   # → nothing
grep -rn "useFrame(" src --include=*.tsx | grep -v "\.test\."       # → src/gl/Driver.tsx only
grep -rlnE "emissive|AdditiveBlending" src/gl | grep -v "\.test\."  # → only Windows.tsx, Glow.tsx, Ridge.tsx, shaders/*
grep -rnE "localStorage|sessionStorage" src --include=*.ts --include=*.tsx | grep -v "\.test\."   # → each inside a try block
grep -rnE "#75|\\\$20|notional|contracts" src/site/copy.ts          # → nothing
cat package.json | grep -A7 '"scripts"'                             # → dev, build, lint, typecheck, test only
ls out/valley-still.jpg out/og.png out/resume.pdf                   # → all three exist
```

For the storage line, open each hit and confirm the access is inside `try { … } catch`. Fix any failure in its own source file.

- [ ] **Step 3: Bundle size (spec §12, reported, not gated)**

```bash
find out/_next/static/chunks -name "*.js" -exec gzip -9c {} \; | wc -c
```

Record the total gzipped bytes in the commit body. Spec §12 budgets three + R3F + drei + framer-motion at about 180 kB gz and the valley package under 25 kB gz; if the total is above 260 kB, say so in the commit body so the branch review looks at it.

- [ ] **Step 4: Replace `README.md`**

```md
# ethanwang.ai

one river valley at blue hour. the only light in it comes from things i built. next.js static export and react three fiber.

- `npm run dev`: local dev on :3000
- `npm run build`: static export to `out/`; serve it with `npx serve out -l 3005`
- `npm run lint`, `npm run typecheck`, `npm test`: eslint, tsc, vitest
- numbers live in `src/valley/facts.ts` (hand-edited, as of oct 2026); every string lives in `src/site/copy.ts`
- query flags: `?nogl=1` the no-webgl tier · `?tier=phone|desktop` force the gl tier · `?rung=n` start n rungs down the step-down ladder · `?still=1` and `?g=0..1` the still capture · `?debug=1` the perf overlay and `window.__ortgPerf`
- `public/valley-still.jpg` and `public/og.png` are committed screenshots of the exported build; regenerate them when the scene changes (task 5.11 in `docs/plans/2026-10-08-ortg-plan-06-tiers-polish.md`)
- no api routes, no fetches, no env vars, no analytics
- spec: `docs/plans/2026-10-08-only-running-things-glow-design.md`
```

- [ ] **Step 5: Rerun the four green commands**

```bash
npm run lint && npx tsc --noEmit && npx vitest run && npm run build
```

Expected: all exit 0.

- [ ] **Step 6: Commit**

```bash
git add README.md
# plus each src/** file Steps 1–2 fixed, by path
git commit -m "Green lint, typecheck, tests and build; repo-wide checks; README for the valley"
```

**Verify:**
- The Step 1 command exits 0 on a clean checkout of the branch.
- Every Step 2 command prints what its arrow says.
- `README.md` names every query flag this stage added.

---

### Task 5.11: Capture the still and og image, then judge G6 and G7 (gate agent, Opus)

Spec §10 (Playwright at 1440 × 900 against the exported build on `/?still=1`; JPEG q82 ≈ 150 KB; a 1200 × 630 centre crop as `og.png`; committed), §14 G6 and G7, §11, §12. Run by an Opus gate agent with the Playwright MCP, never by the implementer of 5.1–5.10 and never by the session model. Gate stills go under `.playwright-mcp/gates/` (gitignored); only `public/valley-still.jpg` and `public/og.png` are committed.

The still is captured first because the no-WebGL tier (G6) shows it. Frame-time numbers are only meaningful on a hardware GPU: Step 2 checks the renderer string, and if it says SwiftShader or llvmpipe the agent stops and reports that G7 must be run in a headed Chrome on the dev machine.

**Files:**
- Create/replace: `public/valley-still.jpg`, `public/og.png`
- Modify: `src/app/layout.tsx` (`openGraph.images` and the twitter card point at `/og.png`, Step 3)
- Create (gitignored, not committed): `.playwright-mcp/gates/g6-*.png`, `.playwright-mcp/gates/g7-*.json`

**Interfaces:**
- Consumes: `?still=1`, `?debug=1`, `?g=`, `window.__ortgPerf.{snapshot,reset,verdict}` (Task 5.8); `?nogl=1` (Task 5.7); `?rung=` (Task 5.1).
- Produces: the committed still and og image; a G6 and a G7 verdict with evidence.

- [ ] **Step 1: Serve the exported build**

```bash
cd /Users/Ethan_1/ethanwangai && npm run build && mkdir -p .playwright-mcp/gates
npx serve out -l 3005      # run in the background; leave it running for the whole task
```

- [ ] **Step 2: Capture the still and the og crop**

With the Playwright MCP's run-code tool (`browser_run_code_unsafe`):

```js
async (page) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3005/?still=1');
  await page.waitForSelector('canvas', { timeout: 15000 });
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return gl && ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'none';
  });
  await page.waitForTimeout(7000);   // warm-up (≤ 4 s) + 200 ms fade + the 300 ms reduced pulse, settled
  await page.screenshot({ path: '/Users/Ethan_1/ethanwangai/public/valley-still.jpg', type: 'jpeg', quality: 82, scale: 'css' });
  await page.screenshot({ path: '/Users/Ethan_1/ethanwangai/public/og.png', type: 'png', scale: 'css', clip: { x: 120, y: 135, width: 1200, height: 630 } });
  return renderer;
}
```

Record the returned renderer string. Then check the files:

```bash
sips -g pixelWidth -g pixelHeight public/valley-still.jpg public/og.png   # → 1440 × 900 and 1200 × 630
ls -l public/valley-still.jpg                                             # → roughly 80–300 KB
```

Look at both images. Pass for the still: the lit night valley at the alive view, no text, no overlay, every light a registered emitter, not Kyoto, not a toy town (the G1 bar). If text is visible, Task 5.8's hide rule missed an element: report it and stop.

- [ ] **Step 3: Reference og.png from the page metadata, then commit the still and og**

Stage 0 Task 0.5 left `openGraph` without an image ("Stage 5 adds `images: ['/og.png']` here"). In `src/app/layout.tsx`, change the `metadata` export so the committed image is referenced:

```tsx
export const metadata: Metadata = {
  title: copy.meta.title,
  description: copy.meta.description,
  metadataBase: new URL('https://ethanwang.ai'),
  openGraph: {
    title: copy.meta.title, description: copy.meta.description, url: 'https://ethanwang.ai', type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', title: copy.meta.title, description: copy.meta.description, images: ['/og.png'] },
};
```

```bash
npx tsc --noEmit && npm run build
grep -o 'og:image" content="[^"]*' out/index.html        # → https://ethanwang.ai/og.png
grep -o 'twitter:card" content="[^"]*' out/index.html    # → summary_large_image
git add public/valley-still.jpg public/og.png src/app/layout.tsx
git commit -m "Capture the night still and og image from the exported build; reference og.png in the metadata"
```

Rebuild so `out/` serves the new still for G6: `npm run build` (restart `npx serve out -l 3005`).

- [ ] **Step 4: G6 phone under 4× CPU throttling**

```js
async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://localhost:3005/?debug=1');
  await page.waitForSelector('canvas', { timeout: 20000 });
  await page.waitForTimeout(9000);                     // chain done
  await page.screenshot({ path: '/Users/Ethan_1/ethanwangai/.playwright-mcp/gates/g6-phone-open.png', scale: 'css' });
  await page.evaluate(() => window.__ortgPerf.reset());
  await page.waitForTimeout(10500);
  const perf = await page.evaluate(() => window.__ortgPerf.snapshot());
  for (const id of ['kalshi', 'darch', 'alive', 'yours']) {
    await page.evaluate((i) => document.getElementById(i).scrollIntoView(), id);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `/Users/Ethan_1/ethanwangai/.playwright-mcp/gates/g6-phone-${id}.png`, scale: 'css' });
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  return { perf, fps: 1000 / perf.meanMs, errors };
}
```

Pass: `fps ≥ 45`, `perf.tier === 'phone'`, `perf.mainDraws ≤ 14`, `perf.shadowDraws === 0`, `errors` empty; in each still the valley sits in the lower 60% of the frame, the copy is legible over its scrim, each section's subject is in frame (kalshi: the lamp and ridge; darch: the mill; yours: the lot).

Then the phone keyboard reframe (spec §11: "the input blurs on Enter and the view reframes so the lot sits above the keyboard"). Playwright cannot open a soft keyboard, so the open keyboard is simulated by shrinking the viewport to the height left above a typical iOS keyboard (844 − 336 = 508):

```js
async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3005/?tier=phone');
  await page.waitForSelector('canvas', { timeout: 20000 });
  await page.waitForTimeout(9000);
  await page.evaluate(() => document.getElementById('yours').scrollIntoView());
  await page.waitForTimeout(1500);
  await page.focus('#yours-input');
  await page.setViewportSize({ width: 390, height: 508 });        // keyboard open
  await page.fill('#yours-input', 'a bot that books my dentist appointments');
  await page.keyboard.press('Enter');
  const blurred = await page.evaluate(() => document.activeElement?.id !== 'yours-input');
  await page.setViewportSize({ width: 390, height: 844 });        // keyboard closes on blur
  await page.waitForTimeout(5500);                                // the 4.4 s build
  const top = await page.evaluate(() => Math.round(document.getElementById('yours').getBoundingClientRect().top));
  await page.screenshot({ path: '/Users/Ethan_1/ethanwangai/.playwright-mcp/gates/g6-phone-keyboard.png', scale: 'css' });
  return { blurred, top };
}
```

Pass: `blurred` is true, `top` is within 2 px of 0 (the reframe scrolled the yours section to the top), and in `g6-phone-keyboard.png` the lot with the finished house and its lit window sits inside the upper 508 px of the frame (above where the keyboard was). If the house sits lower, the fix is section 07's portrait view (`SECTIONS` `yours` `viewPortrait`, Stage 0) or the reframe target in `submitYours` (Stage 4 Task 4.8), named in the report.

- [ ] **Step 5: G6 no WebGL**

```js
async (page) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://localhost:3005/?nogl=1');
  await page.waitForTimeout(2000);
  const input = page.locator('input[placeholder="something you\'d build"]');
  await input.fill('a tool that tells me when my train is late');
  await input.press('Enter');
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/Users/Ethan_1/ethanwangai/.playwright-mcp/gates/g6-nogl.png', fullPage: true, scale: 'css' });
  return await page.evaluate(() => ({
    canvases: document.querySelectorAll('canvas').length,
    sections: ['open', 'kalshi', 'heron', 'darch', 'summers', 'alive', 'yours', 'contact'].filter((id) => document.getElementById(id)).length,
    labels: document.querySelectorAll('#open ul li').length,
    svg: !!document.querySelector('#yours figure svg'),
    tag: document.querySelector('#yours figcaption')?.textContent ?? null,
    lightControls: document.querySelectorAll('.light-control').length,
  })).then((dom) => ({ dom, errors }));
}
```

Pass: `canvases 0`, `sections 8`, `labels 7`, `svg true`, `tag` matches `10 words in · <n> parts out · 4.40 s on the clock`, `lightControls 0`, `errors` empty, and the screenshot shows the still behind complete copy.

- [ ] **Step 6: G6 reduced motion**

```js
async (page) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('http://localhost:3005/');
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/Users/Ethan_1/ethanwangai/.playwright-mcp/gates/g6-rm-t0.png', scale: 'css' });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: '/Users/Ethan_1/ethanwangai/.playwright-mcp/gates/g6-rm-t4.png', scale: 'css' });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
}
```

Pass: `g6-rm-t0.png` already shows every light in its final state (hut, cabins, lamp, bars, hillside lit; mill dark; the ridge trickle at its left end), with no ignition label mid-fade, and `g6-rm-t4.png` is the same picture (no chain played between them).

- [ ] **Step 7: G7 performance at g = 0, 0.5, 1 on desktop**

Run once per g in `[0, 0.5, 1]`:

```js
async (page) => {
  const g = 0.5;   // then 0 and 1
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`http://localhost:3005/?debug=1&g=${g}`);
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForTimeout(8000);
  await page.evaluate(() => window.__ortgPerf.reset());
  await page.waitForTimeout(10500);
  const snapshot = await page.evaluate(() => window.__ortgPerf.snapshot());
  const verdict = await page.evaluate(() => window.__ortgPerf.verdict());
  return { g, snapshot, verdict };
}
```

Save each returned object to `.playwright-mcp/gates/g7-g<g>.json`. Pass: for all three, `verdict.frame`, `verdict.draws` (main ≤ 18) and `verdict.shadow` (≤ 6) are true, `verdict.heap` is true (≤ 2 MB growth over 10 s), `snapshot.rung === 0` (the monitor did not have to step down), and the renderer string from Step 2 is a hardware GPU.

- [ ] **Step 8: On failure (spec §14)**

- G6 failure: drop ridge density first (phone base `ridgeCount` from N/5 toward N/10 in `BASE_QUALITY.phone`, Task 5.1's file), then mist; re-run Step 4.
- G7 failure: find the lowest `?rung=n` at which Step 7 passes (`?debug=1&g=…&rung=n`), name the offender (the rung's subject: DPR, ridge, rain or mist), and open a fix task that applies that rung permanently in `BASE_QUALITY`/`TIER_SETTINGS` (Task 5.1's file) with its test rows updated; re-run Step 7 after it lands.
- Write the verdict for each gate as: gate, pass/fail, the numbers, the paths of the stills, and for a fail the one change requested. The gate agent does not edit `src/`.

**Verify:**
- `git show --stat` of the capture commit lists only `public/valley-still.jpg`, `public/og.png` and `src/app/layout.tsx`.
- `out/index.html` carries `og:image` pointing at `/og.png` and `twitter:card` `summary_large_image`.
- `.playwright-mcp/gates/` holds `g6-phone-*.png`, `g6-nogl.png`, `g6-rm-t0.png`, `g6-rm-t4.png` and `g7-g0.json`, `g7-g0.5.json`, `g7-g1.json`.
- The verdicts cite numbers from those files.

---

### Task 5.12: Whole-branch review (Opus) and hand-off

Spec §16 ("Branch review: a whole-branch Opus review before merge to `main`"), §2 (decisions), index Global Constraints and Review Focus. Runs after G6 and G7 pass.

**Files:**
- None created by the reviewer. Fix tasks the review raises touch the files they name.

**Interfaces:**
- Consumes: the branch `redesign/only-running-things-glow` against `main`; the spec; the index; the G1–G7 verdicts.
- Produces: a findings list; fix tasks implemented by Sonnet and re-reviewed by Opus; a branch ready for Ethan to merge.

- [ ] **Step 1: Dispatch the review**

Dispatch one reviewer subagent with `model: "opus"` (explicit; never the session model, never a model above Opus). Prompt:

```text
Review the whole branch redesign/only-running-things-glow against main in /Users/Ethan_1/ethanwangai
(`git diff main...HEAD`). The spec is docs/plans/2026-10-08-only-running-things-glow-design.md and the plan index
is docs/plans/2026-10-08-ortg-plan-00-index.md; read both first. Report correctness bugs and spec violations only,
each with file:line, the failing input, and the observed vs expected behaviour. Check in particular:
1. Global constraints: no fetch(, no app/api, no env vars, storage only sessionStorage.introPlayed and
   localStorage.visitorSentence and every access in try/catch; colour literals only in src/valley/palette.ts
   (and globals.css); every user-facing string in src/site/copy.ts and verbatim from spec §3.1/§3.2; no uppercase,
   no em dashes, no #75, $20, notional, contracts.
2. Light rule (§4.8): emitter ids exactly as listed; emissive/AdditiveBlending only in Windows, Glow, Ridge and
   their shaders; the mill dark outside darch; reveals latch (§2); darchT the only state that un-does.
3. One useFrame (Driver), applyFrame allocation-free, no React state on the scroll path, no per-frame
   getBoundingClientRect, no R3F pointer events.
4. The index Review Focus: sentences that are empty, whitespace, 140+ chars or one 60-char word; resize and
   rotation mid-visit; scrolling into kalshi while the chain runs; storage throwing; context loss and a hanging
   compileAsync.
5. Tiers (§11): the ladder order and floors; portrait by aspect not tier; reduced motion in every system;
   ?nogl=1 complete; the gate flags (?still, ?g, ?debug, ?rung, ?tier) inert without their query.
6. Static export: npm run build produces out/ with no server features; scripts are dev, build, lint, typecheck, test.
Run `npm run lint && npx tsc --noEmit && npx vitest run && npm run build` and report the result. Do not edit files.
```

- [ ] **Step 2: Triage**

For each finding, apply superpowers:receiving-code-review: verify it against the code and the spec before accepting it. Accepted findings become fix tasks in this file's format (Files, Interfaces, failing test, implement, pass, commit), appended below as "Task 5.12.n", implemented by Sonnet, each re-reviewed by a fresh Opus reviewer. Rejected findings get a one-line reason in the hand-off.

- [ ] **Step 3: Final green run**

```bash
npm run lint && npx tsc --noEmit && npx vitest run && npm run build
git status --short     # → clean
```

Expected: all exit 0, the tree is clean.

- [ ] **Step 4: Hand off**

Use superpowers:finishing-a-development-branch. Do not merge to `main` and do not push without Ethan's say-so. Give Ethan: the branch name, the G1–G7 verdicts with their still paths, the review's accepted and rejected findings, the bundle size from Task 5.10, and the open spec questions:
1. §2: whether any of the discord bots, the nist assistant or the wvu model still runs, which would let the deck say "that runs".
2. §5.6 names a `lightStateMachine` (dark | igniting | lit | out) as a unit. The build has no such module: the transitions live in `chain.ts` (ignition), `mill.ts` (the mill's rows), `pulse.ts` (the thesis pulse), `flicker.ts` (the hut) and `visitorBridge.ts` (the visitor's light-out and build), and `LightState` in `src/valley/types.ts` is exported but unused. Ask whether that split is acceptable or whether he wants a named `lightStateMachine` (a fix task would wrap those five behind one function that reports a `LightState` per emitter, with a test per transition).
3. §12 says the glow sprite is "generated once on a 2D canvas"; Stage 2 generates it as a `DataTexture` (same falloff, works in Node tests). Ask whether that is acceptable.
4. §13 lists `public/favicon.ico`; the favicon stays at `src/app/favicon.ico` (Next's app-router convention, served at `/favicon.ico` either way). Ask whether the file must move.
5. §4's portrait assertion and Ethan's Stage 1 Task 1.6 choice (wider portrait fov, moved sites, or an amended spec): restate what was chosen so the spec can be amended to match.

**Verify:**
- The reviewer was dispatched with an explicit `model: "opus"`.
- Every accepted finding has a committed fix task with a test and an Opus re-review.
- Step 3's commands exit 0 and `git status` is clean.
