import { describe, it, expect } from 'vitest';
import { MACHINE, MACHINE_COUNT } from '@/bench/types';
import { TIMING } from '@/bench/timing';
import {
  createClockState, stepClocks, motionScale, RUN_TAU, VEL_TAU, IMPULSE_TAU, SPIKE_TAU,
  type ClockState, type ClockInputs,
} from './clocksLogic';

/** A neutral input frame: nothing scrolling, nothing scheduled, no impulse sources. */
function baseInputs(overrides: Partial<ClockInputs> = {}): ClockInputs {
  return {
    dt: 1 / 60,
    compileTarget: new Array<number | null>(MACHINE_COUNT).fill(0),
    heroCompile: 0,
    visitorCompile: 0,
    velocity: 0,
    reducedMotion: false,
    ...overrides,
  };
}

describe('clocksLogic constants', () => {
  it('matches the brief exactly', () => {
    expect(RUN_TAU).toBe(0.25);
    expect(VEL_TAU).toBe(0.18);
    expect(IMPULSE_TAU).toBe(0.13);
    expect(SPIKE_TAU).toBe(0.35);
  });

  it('machine time runs at full pace, or 0.3 under reduced motion (Clocks scans the slot bar at the same pace)', () => {
    expect(motionScale(false)).toBe(1);
    expect(motionScale(true)).toBe(0.3);
  });
});

describe('createClockState', () => {
  it('parks every machine at zero except bot and slot, which run from load', () => {
    const s = createClockState();
    expect(Array.from(s.mt)).toEqual(new Array(MACHINE_COUNT).fill(0));
    expect(Array.from(s.compile)).toEqual(new Array(MACHINE_COUNT).fill(0));
    expect(s.impulse).toBe(0);
    expect(s.rateSpike).toBe(0);
    expect(s.vel).toBe(0);
    expect(s.tilt).toBe(0);
    expect(s.tiltV).toBe(0);
    expect(s.uptime).toBe(0);
    for (let m = 0; m < MACHINE_COUNT; m++) {
      if (m === MACHINE.bot || m === MACHINE.slot) {
        expect(s.run[m], `run[${m}]`).toBe(1);
        expect(s.locked[m], `locked[${m}]`).toBe(1);
      } else {
        expect(s.run[m], `run[${m}]`).toBe(0);
        expect(s.locked[m], `locked[${m}]`).toBe(0);
      }
    }
  });

  it('returns an independent state per call', () => {
    const a = createClockState(), b = createClockState();
    a.mt[MACHINE.balance] = 5;
    expect(b.mt[MACHINE.balance]).toBe(0);
  });
});

describe('stepClocks: lever lock drives run and mt (Review Focus #3a)', () => {
  it('locking the balance lever for 1s ramps run past 0.95; unlocking for 0.5s drops it back below 0.15, with mt monotonic and finite throughout', () => {
    const s = createClockState();
    const dt = 1 / 60;
    let prevMt = s.mt[MACHINE.balance];

    // Phase 1: compileTarget[balance] = 1 (locked) for 1s of 60 steps.
    for (let n = 0; n < 60; n++) {
      const i = baseInputs({ dt, compileTarget: withTarget(MACHINE.balance, 1) });
      stepClocks(s, i);
      expect(s.mt[MACHINE.balance], `mt step ${n}`).toBeGreaterThanOrEqual(prevMt);
      expect(Number.isFinite(s.mt[MACHINE.balance])).toBe(true);
      prevMt = s.mt[MACHINE.balance];
    }
    expect(s.run[MACHINE.balance]).toBeGreaterThan(0.95);
    // Exact solution of the exponential relaxation (tau = RUN_TAU) integrated over 1s
    // from run(0) = 0 to locked = 1 is mt(1) = 1 - RUN_TAU * (1 - e^-4) ≈ 0.7627, i.e.
    // mt[balance] ≈ 0.76 ± 0.1 per the (corrected) brief's Step 1(a).
    const mtAfterPhase1 = s.mt[MACHINE.balance];
    expect(mtAfterPhase1).toBeGreaterThan(0.66);
    expect(mtAfterPhase1).toBeLessThan(0.86);

    // Phase 2: compileTarget[balance] = 0 (unlocked) for 0.5s of 30 steps.
    for (let n = 0; n < 30; n++) {
      const i = baseInputs({ dt, compileTarget: withTarget(MACHINE.balance, 0) });
      stepClocks(s, i);
      expect(s.mt[MACHINE.balance], `mt step ${n}`).toBeGreaterThanOrEqual(prevMt);
      expect(Number.isFinite(s.mt[MACHINE.balance])).toBe(true);
      prevMt = s.mt[MACHINE.balance];
    }
    expect(s.run[MACHINE.balance]).toBeLessThan(0.15);
    const mtIncreasePhase2 = s.mt[MACHINE.balance] - mtAfterPhase1;
    // run decays from ~0.98 towards 0 over 0.5s (2 time constants); its integral works out to
    // ≈0.205, i.e. "less than 0.25" per the (corrected) brief's Step 1(a) — well short of
    // another full second of motion, and strictly positive.
    expect(mtIncreasePhase2).toBeGreaterThan(0);
    expect(mtIncreasePhase2).toBeLessThan(0.25);
  });
});

describe('stepClocks: lock crossing fires the impulse and rate spike exactly once (Review Focus #3b)', () => {
  it('sets impulse to TIMING.impulse and rateSpike to 1 on the 0→1 crossing, then decays both', () => {
    const s = createClockState();
    const dt = 1 / 60;
    const target = withTarget(MACHINE.watch, 1);

    // Step 1: crosses.
    stepClocks(s, baseInputs({ dt, compileTarget: target }));
    expect(s.impulse).toBe(TIMING.impulse);
    expect(s.rateSpike).toBe(1);

    // Step 2: already locked, no second crossing — impulse only decays from here.
    stepClocks(s, baseInputs({ dt, compileTarget: target }));
    expect(s.impulse).toBeLessThan(TIMING.impulse);
    expect(s.impulse).toBeGreaterThan(0);

    // Decays below 0.05 well within 0.5s (IMPULSE_TAU = 0.13 → ~4 time constants at t≈0.32s).
    for (let n = 0; n < 30; n++) stepClocks(s, baseInputs({ dt, compileTarget: target }));
    expect(s.impulse).toBeLessThan(0.05);
  });

  it('never re-fires the impulse while already locked', () => {
    const s = createClockState();
    const dt = 1 / 60;
    const target = withTarget(MACHINE.watch, 1);
    stepClocks(s, baseInputs({ dt, compileTarget: target }));
    // Let it decay most of the way, then keep stepping locked — it must not jump back up.
    for (let n = 0; n < 20; n++) stepClocks(s, baseInputs({ dt, compileTarget: target }));
    const before = s.impulse;
    stepClocks(s, baseInputs({ dt, compileTarget: target }));
    expect(s.impulse).toBeLessThanOrEqual(before);
  });
});

describe('stepClocks: bot and slot run from the first step (Review Focus #3c)', () => {
  it('advances bot.mt on the very first step with no compile input at all', () => {
    const s = createClockState();
    stepClocks(s, baseInputs({ dt: 1 / 60 }));
    expect(s.mt[MACHINE.bot]).toBeGreaterThan(0);
    expect(s.mt[MACHINE.slot]).toBeGreaterThan(0);
    expect(s.locked[MACHINE.bot]).toBe(1);
    expect(s.locked[MACHINE.slot]).toBe(1);
  });
});

describe('stepClocks: heroCompile locks the quoter (Review Focus #3d)', () => {
  it('quoter has a null compileTarget, so heroCompile = 1 drives it to locked', () => {
    const s = createClockState();
    const i = baseInputs({ heroCompile: 1, compileTarget: withTarget(MACHINE.quoter, null) });
    stepClocks(s, i);
    expect(s.compile[MACHINE.quoter]).toBe(1);
    expect(s.locked[MACHINE.quoter]).toBe(1);
  });

  it('visitorCompile drives the visitor the same way', () => {
    const s = createClockState();
    const i = baseInputs({ visitorCompile: 1, compileTarget: withTarget(MACHINE.visitor, null) });
    stepClocks(s, i);
    expect(s.compile[MACHINE.visitor]).toBe(1);
    expect(s.locked[MACHINE.visitor]).toBe(1);
  });
});

describe('stepClocks: fillRate stays within [1, 3] (Review Focus #3e)', () => {
  it('clamps fillRate under an extreme spike and extreme velocity', () => {
    const s = createClockState();
    // Force a lock crossing (rateSpike = 1) plus max velocity in the same frame.
    stepClocks(s, baseInputs({ compileTarget: withTarget(MACHINE.splitter, 1), velocity: 1 }));
    for (let m = 0; m < MACHINE_COUNT; m++) {
      expect(s.fillRate[m], `fillRate[${m}]`).toBeLessThanOrEqual(3);
      expect(s.fillRate[m], `fillRate[${m}]`).toBeGreaterThanOrEqual(1);
    }
    // Keep driving it at full velocity for a while; still clamped.
    for (let n = 0; n < 60; n++) {
      stepClocks(s, baseInputs({ compileTarget: withTarget(MACHINE.splitter, 1), velocity: -1 }));
      for (let m = 0; m < MACHINE_COUNT; m++) {
        expect(s.fillRate[m]).toBeLessThanOrEqual(3);
        expect(s.fillRate[m]).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe('stepClocks: stays finite over 10,000 random steps (Review Focus #3f)', () => {
  it('produces no NaN in any field under randomized inputs', () => {
    const s = createClockState();
    let seed = 42;
    const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let n = 0; n < 10_000; n++) {
      const compileTarget: (number | null)[] = new Array(MACHINE_COUNT);
      for (let m = 0; m < MACHINE_COUNT; m++) {
        compileTarget[m] = rng() < 0.1 ? null : rng();
      }
      const i: ClockInputs = {
        dt: rng() * 0.05,
        compileTarget,
        heroCompile: rng(),
        visitorCompile: rng(),
        velocity: rng() * 2 - 1,
        reducedMotion: rng() < 0.5,
      };
      stepClocks(s, i);
    }
    const scalars: (keyof ClockState)[] = ['impulse', 'rateSpike', 'vel', 'tilt', 'tiltV', 'uptime'];
    for (const key of scalars) expect(Number.isFinite(s[key] as number), key).toBe(true);
    for (const arr of [s.mt, s.run, s.compile, s.fillRate] as Float32Array[]) {
      for (let m = 0; m < MACHINE_COUNT; m++) expect(Number.isFinite(arr[m])).toBe(true);
    }
  });
});

describe('stepClocks: dt is clamped to [0, 0.05]', () => {
  it('never advances mt more than a 0.05s step would, even if dt is huge', () => {
    const s = createClockState();
    stepClocks(s, baseInputs({ dt: 10, compileTarget: withTarget(MACHINE.bot, 1) }));
    expect(s.mt[MACHINE.bot]).toBeLessThanOrEqual(0.05 + 1e-9);
    expect(s.uptime).toBeLessThanOrEqual(0.05 + 1e-9);
  });

  it('negative dt is clamped to 0 and advances nothing', () => {
    const s = createClockState();
    stepClocks(s, baseInputs({ dt: -1 }));
    expect(s.mt[MACHINE.bot]).toBe(0);
    expect(s.uptime).toBe(0);
  });
});

describe('stepClocks: balance tilt is a critically damped spring on mt[balance] mod 8', () => {
  it('stays at zero while the balance lever never locks', () => {
    const s = createClockState();
    for (let n = 0; n < 120; n++) stepClocks(s, baseInputs({ dt: 1 / 60 }));
    expect(s.tilt).toBe(0);
    expect(s.tiltV).toBe(0);
  });

  it('tilts positive (left pan down) once mt[balance] has crossed into the left quarter, tracking the (left − right) target', () => {
    const s = createClockState();
    const dt = 1 / 60;
    // Lock the balance lever so run -> 1 and mt[balance] accumulates uptime-like.
    for (let n = 0; n < 300; n++) stepClocks(s, baseInputs({ dt, compileTarget: withTarget(MACHINE.balance, 1) }));
    // mt[balance] ≈ 4.76 after 5s (g < 8, so g === mt): left is maxed at 48, right is rising,
    // so target = 0.12·(left−right)/48 is small and positive, and the critically damped spring
    // (ω = 10, settling in ~0.3-0.4s) has long since caught up to that slowly drifting target.
    expect(s.mt[MACHINE.balance]).toBeGreaterThan(4);
    expect(s.tilt).toBeGreaterThan(0.05);
    expect(s.tilt).toBeLessThan(0.15);
    expect(Number.isFinite(s.tiltV)).toBe(true);
  });
});

/** compileTarget for every machine at its rest value 0, except `m` which is set to `v`. */
function withTarget(m: number, v: number | null): (number | null)[] {
  const t = new Array<number | null>(MACHINE_COUNT).fill(0);
  t[m] = v;
  return t;
}
