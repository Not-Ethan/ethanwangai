// Section 05's arrival trigger (spec §3 row 05): arriving in summers shows the two cabin labels (nist, wvu) again,
// with the same strings and the same fade timing as the ignition labels. The gate fires on the rising edge into the
// section and re-arms on leaving. The Driver merges the result into LABEL_ALPHA after writeLabelAlpha. Allocation-free.
import { LABEL_FADE_OUT, LABEL_HOLD, labelEnvelope } from './chain';
import { EMITTER_INDEX } from './projection';

export const ARRIVAL_SPAN = LABEL_HOLD + LABEL_FADE_OUT;

const NIST = EMITTER_INDEX.nist;
const WVU = EMITTER_INDEX.wvu;

export interface ArrivalGate { inside: boolean; firedAt: number | null }

export function createArrivalGate(): ArrivalGate {
  return { inside: false, firedAt: null };
}

export function stepArrivalGate(gate: ArrivalGate, inside: boolean, t: number): number | null {
  if (inside && !gate.inside) gate.firedAt = t;
  gate.inside = inside;
  if (gate.firedAt === null) return null;
  const a = t - gate.firedAt;
  if (a >= ARRIVAL_SPAN) {
    gate.firedAt = null;
    return null;
  }
  return a;
}

export function arrivalAlpha(arrivalT: number | null): number {
  return arrivalT === null ? 0 : labelEnvelope(arrivalT);
}

export function mergeArrivalLabels(arrivalT: number | null, out: Float32Array): void {
  const a = arrivalAlpha(arrivalT);
  if (a <= 0) return;
  if (out[NIST] < a) out[NIST] = a;
  if (out[WVU] < a) out[WVU] = a;
}
