import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MACHINE, MACHINE_COUNT } from '@/bench/types';
import { buildBench } from '@/bench/counts';
import { BAND_ROWS, PARTITION } from '@/gl/inkGeometry';
import { COUNTS } from '@/generated/counts';
import { benchLockEnds, inkedTotal, ladderParts } from './inkedCount';
import { Ladder } from './Ladder';

// The ladder is server-rendered with its final counts (spec §11: the DOM is the complete site in every tier, the
// ladder at its final values); hudSync takes it over from the scene's first frame (task 5.2).
describe('<Ladder /> server-rendered', () => {
  const html = renderToStaticMarkup(createElement(Ladder, { words: 10 }));
  const text = (id: string) => new RegExp(`<b id="${id}">([^<]*)</b>`).exec(html)?.[1];

  it('prints the words, the band\'s rows and the quoter and intake\'s parts, from the generated counts', () => {
    expect(text('ladder-words')).toBe('10');
    expect(text('ladder-lines')).toBe(String(BAND_ROWS[PARTITION.quoter]));
    expect(text('ladder-parts')).toBe((COUNTS.desktop.byMachine[MACHINE.quoter] + COUNTS.desktop.byMachine[MACHINE.intake]).toLocaleString('en-US'));
  });

  it('prints what the scene counts up to on desktop, so the two tiers agree once the page is built', () => {
    const lockEnds = benchLockEnds(buildBench('desktop'));
    const built = new Float32Array(MACHINE_COUNT).fill(1);
    expect(text('ladder-parts')).toBe(ladderParts(lockEnds, built).toLocaleString('en-US'));
    expect(inkedTotal(lockEnds, built)).toBe(COUNTS.desktop.inkedAtEnd);   // and the footer's, which Yours prints
  });
});
