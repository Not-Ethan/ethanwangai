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
