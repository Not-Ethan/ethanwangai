// Pure per-frame clock: advances every machine's run/mt state from lever locks, drives the
// balance rail's spring, and produces the impulse/rateSpike/fillRate the shaders read.
// No React, no three, no DOM — Clocks.ts (Stage 3) owns copying this into uniforms.
import { MACHINE, MACHINE_COUNT } from '@/bench/types';
import { TIMING, lockEnd } from '@/bench/timing';
import { clamp01 } from '@/bench/math';

export interface ClockState {
  mt: Float32Array; run: Float32Array; compile: Float32Array; fillRate: Float32Array;   // [8]
  locked: Uint8Array;                 // lever locked (compile ≥ lockEnd(1) − 1e-3)
  impulse: number; rateSpike: number; vel: number; tilt: number; tiltV: number; uptime: number;
}

export interface ClockInputs {
  dt: number;                          // seconds, clamped to [0, 0.05]
  compileTarget: (number | null)[];    // from sceneState
  heroCompile: number;                 // triggered tween value 0..1 (Stage 3); Stage 2 passes 1 when ?built=1
  visitorCompile: number;              // 0..1
  velocity: number;                    // −1..1 from scroll
  reducedMotion: boolean;
}

export const RUN_TAU = 0.25;
export const VEL_TAU = 0.18;
export const IMPULSE_TAU = 0.13;
export const SPIKE_TAU = 0.35;

/** The small machines (design §3.1 · 08): under reduced motion they run at 0.25, the quoter and the rest at 0.3 (§11). */
const SMALL = new Set<number>([MACHINE.balance, MACHINE.splitter, MACHINE.watch, MACHINE.bot]);

/** Machine `m`'s pace: full, or under reduced motion 0.25 for a small machine and 0.3 for the rest. Clocks scans the slot bar at the slot's. */
export function motionScale(reducedMotion: boolean, m?: number): number {
  if (!reducedMotion) return 1;
  return m !== undefined && SMALL.has(m) ? 0.25 : 0.3;
}

/** Machines with no lever: they run from load and are always locked. */
const NO_LEVER = new Set<number>([MACHINE.bot, MACHINE.slot]);

/** Lever birth is always 1 (types.ts: `birth: exactly 1 for the lever`). */
const LOCK_THRESHOLD = lockEnd(1) - 1e-3;

/** Balance tilt spring: rail settles this fast regardless of how mt drifts. */
const TILT_OMEGA = 10;

export function createClockState(): ClockState {
  const run = new Float32Array(MACHINE_COUNT);
  const locked = new Uint8Array(MACHINE_COUNT);
  for (const m of NO_LEVER) { run[m] = 1; locked[m] = 1; }
  return {
    mt: new Float32Array(MACHINE_COUNT),
    run,
    compile: new Float32Array(MACHINE_COUNT),
    fillRate: new Float32Array(MACHINE_COUNT).fill(1),
    locked,
    impulse: 0, rateSpike: 0, vel: 0, tilt: 0, tiltV: 0, uptime: 0,
  };
}

export function stepClocks(s: ClockState, i: ClockInputs): void {
  const dt = Math.min(0.05, Math.max(0, i.dt));

  let crossed = false;
  for (let m = 0; m < MACHINE_COUNT; m++) {
    const target = i.compileTarget[m];
    s.compile[m] = target ?? (m === MACHINE.quoter ? i.heroCompile : m === MACHINE.visitor ? i.visitorCompile : s.compile[m]);

    const wasLocked = s.locked[m];
    const nowLocked = NO_LEVER.has(m) ? 1 : (s.compile[m] >= LOCK_THRESHOLD ? 1 : 0);
    if (wasLocked === 0 && nowLocked === 1) crossed = true;
    s.locked[m] = nowLocked;
  }

  // Decay first, then re-arm on this step's crossing so a fresh lock reads exactly TIMING.impulse / 1. Reduced motion
  // has no impulse and no rate spike (§11).
  s.impulse *= Math.exp(-dt / IMPULSE_TAU);
  s.rateSpike *= Math.exp(-dt / SPIKE_TAU);
  if (crossed && !i.reducedMotion) { s.impulse = TIMING.impulse; s.rateSpike = 1; }

  // Reduced motion runs a machine from the step its lever locks (the quoter from the first frame): no damped run-up.
  const runGain = 1 - Math.exp(-dt / RUN_TAU);
  for (let m = 0; m < MACHINE_COUNT; m++) {
    s.run[m] = i.reducedMotion ? s.locked[m] : s.run[m] + (s.locked[m] - s.run[m]) * runGain;
    s.mt[m] += dt * s.run[m] * motionScale(i.reducedMotion, m);
  }

  s.vel += (i.velocity - s.vel) * (1 - Math.exp(-dt / VEL_TAU));

  const fillRate = Math.min(3, Math.max(1, 1 + 2 * s.rateSpike + 2 * Math.abs(s.vel)));
  s.fillRate.fill(fillRate);

  // Balance rail tilt: target angle from where mt[balance] sits within its 8-unit cycle.
  const g = ((s.mt[MACHINE.balance] % 8) + 8) % 8;
  const left = clamp01(g / 4) * 48;
  const right = clamp01((g - 4) / 3) * 48;
  const cleared = g > 7.5;
  const target = cleared ? 0 : 0.12 * (left - right) / 48;
  const acc = TILT_OMEGA * TILT_OMEGA * (target - s.tilt) - 2 * TILT_OMEGA * s.tiltV;
  s.tiltV += acc * dt;
  s.tilt += s.tiltV * dt;

  s.uptime += dt;
}
