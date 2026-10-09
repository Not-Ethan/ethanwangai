// Which emitter each ignition label hangs from (spec §3.1). Pure; the strings come from copy.ts.
import type { EmitterId } from '@/valley/types';
import type { IgnitionLabelKey } from './copy';

export const LABEL_ANCHORS: Readonly<Record<IgnitionLabelKey, EmitterId>> = {
  hut: 'hut',
  nist: 'nist',
  mill: 'mill',
  kalshiLamp: 'kalshiLamp',
  wvu: 'wvu',
  bars: 'bar3',   // bar2 projects under the kalshi lamp, so its label would cross the lamp's glow
  hillside: 'hill2',
};

export interface LabelItem { key: IgnitionLabelKey; anchor: EmitterId; text: string }

/** Extra lift in CSS px above the light, per label: the hillside label clears the house roofs. */
export const LABEL_LIFT_PX: Readonly<Record<IgnitionLabelKey, number>> = {
  hut: 0, nist: 0, mill: 16, kalshiLamp: 0, wvu: 0, bars: 0, hillside: 44,
};

export function ignitionLabelItems(labels: Readonly<Record<IgnitionLabelKey, string>>): LabelItem[] {
  return (Object.keys(LABEL_ANCHORS) as IgnitionLabelKey[]).map((key) => ({
    key,
    anchor: LABEL_ANCHORS[key],
    text: labels[key],
  }));
}
