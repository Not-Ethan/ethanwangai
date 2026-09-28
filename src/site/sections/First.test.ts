// Section 03's plate prints the bot's own part count. copy.ts documents it as "a live count
// (MachineSummary.count for the bot machine), never hand-typed" (task 4.2, design §3.1 · 03): the
// bot's build spec is one bar, four cells and one ring — six parts, fixed, from the same layout()
// the rest of the bench uses, not a literal written into First.tsx or copy.ts.
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScrollProvider } from '@/scroll/ScrollProvider';
import { MACHINE } from '@/bench/types';
import { layout } from '@/bench/layout';
import { BOT } from '@/bench/configs/bot';
import { hashString } from '@/bench/hash';
import { BENCH_SEED_TEXT } from '@/bench/bench';
import { copy } from '@/site/copy';
import { First } from './First';

// ScrollProvider's SSR snapshot is always the 'desktop' tier (no effect runs server-side).
const expectedCount = layout({ tier: 'desktop', seed: hashString(BENCH_SEED_TEXT), configs: [BOT] }).machines[MACHINE.bot].count;

function render(): string {
  return renderToStaticMarkup(createElement(ScrollProvider, null, createElement(First)));
}

describe("First's plate: the bot's part count", () => {
  it('is six, from the bot config\'s own build spec: one bar, four cells, one ring', () => {
    expect(BOT.build({ tier: 'desktop', rng: () => 0, density: 1, caps: true })).toHaveLength(6);
    expect(expectedCount).toBe(6);
  });

  it('prints that count in the plate, not a hand-typed literal', () => {
    const html = render();
    expect(html).toContain(copy.first.plate(expectedCount));
    expect(html).not.toContain(copy.first.plate(0));
  });
});
