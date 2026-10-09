// Which emitter each ignition label hangs from (spec §3.1). Pure; the strings come from copy.ts.
import type { EmitterId } from '@/valley/types';
import type { IgnitionLabelKey } from './copy';

export const LABEL_ANCHORS: Readonly<Record<IgnitionLabelKey, EmitterId>> = {
  hut: 'hut',
  nist: 'nist',
  mill: 'mill',
  kalshiLamp: 'kalshiLamp',
  wvu: 'wvu',
  bars: 'bar2',
  hillside: 'hill2',
};

export interface LabelItem { key: IgnitionLabelKey; anchor: EmitterId; text: string }

export function ignitionLabelItems(labels: Readonly<Record<IgnitionLabelKey, string>>): LabelItem[] {
  return (Object.keys(LABEL_ANCHORS) as IgnitionLabelKey[]).map((key) => ({
    key,
    anchor: LABEL_ANCHORS[key],
    text: labels[key],
  }));
}
