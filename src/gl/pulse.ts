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
