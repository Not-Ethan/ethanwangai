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

/** §4.5: is mill row `row` lit at darchT. Row r lights at 0.03 + 0.03r, goes out at 0.78 + 0.05(3 − r). */
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
