// The hero chain's lights and labels (spec §5.3, §3.1 · 01). writeChainLevels fills `lit` (EMITTERS order) from the
// ignition schedule, or with final states when introT is null; writeLabelAlpha fills LABEL_ALPHA for Labels.tsx.
// Both are allocation-free per call.
import { EMITTERS } from '@/valley/lights';
import { ignitionLevel, ignitionSchedule } from '@/valley/ignition';
import type { EmitterId, IgnitionStep } from '@/valley/types';
import { LABEL_ANCHORS } from '@/site/labelItems';
import { EMITTER_INDEX } from './projection';

const SCHEDULE: readonly IgnitionStep[] = ignitionSchedule();
const STEP_EMITTER: Int32Array = Int32Array.from(SCHEDULE, (s) => (s.target === 'ridge' ? -1 : EMITTER_INDEX[s.target]));
const N = EMITTERS.length;

export function stepFor(target: EmitterId): IgnitionStep {
  const s = SCHEDULE.find((x) => x.target === target);
  if (!s) throw new Error(`no ignition step for ${target}`);
  return s;
}

export function writeChainLevels(introT: number | null, visitorPresent: boolean, lit: Float32Array): void {
  if (introT === null) {
    lit.fill(1);
    lit[EMITTER_INDEX.mill] = 0;
  } else {
    lit.fill(0);
    for (let i = 0; i < SCHEDULE.length; i++) {
      if (STEP_EMITTER[i] < 0) continue;
      lit[STEP_EMITTER[i]] = ignitionLevel(SCHEDULE[i], introT);
    }
  }
  lit[EMITTER_INDEX.ridge] = 1;
  if (!visitorPresent) lit[EMITTER_INDEX.visitor] = 0;
}

export const LABEL_FADE_IN = 0.2;
export const LABEL_HOLD = 1.6;
export const LABEL_FADE_OUT = 0.4;

const GROUP_FIRST: Partial<Record<EmitterId, EmitterId>> = { bar2: 'bar1', hill2: 'hill1' };

/** The emitter whose catch a label anchored at `anchor` appears with. */
export function labelTiming(anchor: EmitterId): EmitterId {
  return GROUP_FIRST[anchor] ?? anchor;
}

const ANCHORS: readonly EmitterId[] = Object.values(LABEL_ANCHORS) as EmitterId[];
const ANCHOR_INDEX: Int32Array = Int32Array.from(ANCHORS, (a) => EMITTER_INDEX[a]);
const ANCHOR_AT: Float64Array = Float64Array.from(ANCHORS, (a) => stepFor(labelTiming(a)).at);
const AT_BY_EMITTER = new Float64Array(N).fill(Number.NaN);
for (let k = 0; k < ANCHORS.length; k++) AT_BY_EMITTER[ANCHOR_INDEX[k]] = ANCHOR_AT[k];

function alphaAt(at: number, introT: number | null): number {
  if (introT === null || Number.isNaN(at)) return 0;
  const dt = introT - at;
  if (dt < 0) return 0;
  if (dt < LABEL_FADE_IN) return dt / LABEL_FADE_IN;
  if (dt < LABEL_HOLD) return 1;
  if (dt < LABEL_HOLD + LABEL_FADE_OUT) return 1 - (dt - LABEL_HOLD) / LABEL_FADE_OUT;
  return 0;
}

export function labelAlpha(anchor: EmitterId, introT: number | null): number {
  return alphaAt(AT_BY_EMITTER[EMITTER_INDEX[anchor]], introT);
}

export function writeLabelAlpha(introT: number | null, out: Float32Array): void {
  out.fill(0);
  if (introT === null) return;
  for (let k = 0; k < ANCHOR_INDEX.length; k++) out[ANCHOR_INDEX[k]] = alphaAt(ANCHOR_AT[k], introT);
}
