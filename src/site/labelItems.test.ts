import { describe, it, expect } from 'vitest';
import { EMITTERS } from '@/valley/lights';
import { copy } from './copy';
import { ignitionLabelItems, LABEL_ANCHORS } from './labelItems';

describe('ignition label items', () => {
  const items = ignitionLabelItems(copy.open.labels);

  it('anchors every label to a registered emitter', () => {
    const ids = new Set(EMITTERS.map((e) => e.id));
    expect(items.length).toBe(7);
    for (const item of items) expect(ids.has(item.anchor), item.key).toBe(true);
    expect(LABEL_ANCHORS.bars).toBe('bar3');
    expect(LABEL_ANCHORS.hillside).toBe('hill2');
  });

  it('carries the spec §3.1 strings verbatim', () => {
    const text = Object.fromEntries(items.map((i) => [i.key, i.text]));
    expect(text).toEqual({
      hut: 'discord bots, middle school. my classmates used them.',
      nist: 'nist, summer 2025',
      mill: 'darch, june 2025 to may 2026',
      kalshiLamp: 'kalshi, since jan 2026',
      wvu: 'wvu medicine, summer 2026',
      bars: 'heron, since june 2026',
      hillside: 'things i built, one house each',
    });
  });
});
