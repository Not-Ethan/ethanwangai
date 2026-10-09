import { describe, it, expect } from 'vitest';
import type { House } from './types';
import { houseFromSentence, houseSvg, expectedParts, countWords, roofRise, HOUSE, ROOF_COURSES } from './house';
import { hashString } from './hash';

const HILLSIDE = [
  'a discord bot for my middle school server',
  'a trading algorithm for kalshi',
  'a pipeline that made three thousand videos a month',
  'a help-desk assistant that reads the docs for you',
  'a pricing model for free-drinks promos at bars',
];
const WORKED_24 = 'a bot that reads every menu in town each morning and tells me where the soup is good today and which places are closed';
const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');
const CORPUS = [
  '', '   ', '\n\t  ', 'x', 'a'.repeat(60), 'b'.repeat(140), ...HILLSIDE,
  words(140 / 5), 'z '.repeat(70).trim(), ...Array.from({ length: 30 }, (_, i) => words(i + 1)),
];

describe('houseFromSentence: inputs', () => {
  it.each([
    ['', 1], ['   ', 1], ['\n\t ', 1], ['a'.repeat(60), 1], ['one', 1],
    ['a trading algorithm for kalshi', 5], [words(24), 24], [words(40), 24], ['z '.repeat(70), 24],
  ])('counts %j as %i words (clamped 1–24)', (s, n) => {
    expect(countWords(s)).toBe(n);
    expect(houseFromSentence(s).words).toBe(n);
  });
  it('never throws and never yields zero parts, for every corpus input', () => {
    for (const s of CORPUS) {
      const h = houseFromSentence(s);
      expect(h.parts.length).toBeGreaterThan(0);
      expect(h.windows.length).toBeGreaterThan(0);
    }
  });
});

describe('houseFromSentence: the §5.4 formulas', () => {
  it.each(CORPUS.map((s) => [JSON.stringify(s).slice(0, 40), s]))('%s follows every formula', (_label, s) => {
    const h = houseFromSentence(s);
    const seed = hashString(s.trim().toLowerCase());
    expect(h.seed).toBe(seed);
    expect(h.tiers).toBe(1 + Math.floor((h.words - 1) / 8));
    expect(h.bays).toBe(2 + Math.floor(h.words / 3));
    expect(h.width).toBe(h.bays);
    expect(h.depth).toBe(3 + ((seed >>> 2) % 2));
    expect(h.roof).toBe(['pitched', 'hipped', 'flat'][(seed >>> 4) % 3]);
    expect(h.windowsPerFace).toEqual({ front: Math.floor(h.width / 2), back: Math.floor(h.width / 2), side: 1 + ((seed >>> 6) % 2) });
    expect(h.porch).toBe((seed & 1) === 1);
    expect(h.parts.length).toBe(expectedParts(h));
  });
  it('keeps tiers in 1–3 and parts in 150–2,200 for every corpus input (§16)', () => {
    for (const s of CORPUS) {
      const h = houseFromSentence(s);
      expect(h.tiers).toBeGreaterThanOrEqual(1); expect(h.tiers).toBeLessThanOrEqual(3);
      expect(h.parts.length).toBeGreaterThanOrEqual(150); expect(h.parts.length).toBeLessThanOrEqual(2200);
    }
  });
  it('counts parts by kind exactly as §5.4 lists them', () => {
    for (const s of [...HILLSIDE, words(1), words(24)]) {
      const h = houseFromSentence(s);
      const n = (k: string) => h.parts.filter((p) => p.kind === k).length;
      expect(n('plank')).toBe(2 * (h.width + h.depth) * 2 * 10 * h.tiers);
      expect(n('slat')).toBe((h.width / 0.25) * (h.roof === 'flat' ? 1 : 2));
      expect(n('frame')).toBe(4 * h.windows.length);
      expect(h.windows.length).toBe((h.windowsPerFace.front + h.windowsPerFace.back + 2 * h.windowsPerFace.side) * h.tiers);
      expect(n('post')).toBe(h.porch ? 4 : 0);
      expect(n('chimney')).toBe(1);
    }
  });
});

describe('houseFromSentence: worked examples (§5.4, ±5%)', () => {
  // The examples assume depth 3 / side 1 / no porch (1 word) and depth 4 / side 2 / porch (24 words); those come
  // from the seed, so each test pins a sentence whose seed gives exactly those choices.
  it('1 word ("timer") → bays 2, depth 3, perimeter 10, 200 + 16 + 16 + 1 = 233 parts', () => {
    const h = houseFromSentence('timer');
    expect([h.words, h.bays, h.width, h.depth, h.tiers, h.windowsPerFace.side, h.porch]).toEqual([1, 2, 2, 3, 1, 1, false]);
    expect(h.roof).not.toBe('flat');
    expect(h.parts.length).toBe(233);
    expect(Math.abs(h.parts.length - 233) / 233).toBeLessThanOrEqual(0.05);
  });
  it('24 words → bays 10, depth 4, 3 tiers, 1,680 + 80 + 168 + 4 + 1 = 1,933 parts', () => {
    const h = houseFromSentence(WORKED_24);
    expect([h.words, h.bays, h.width, h.depth, h.tiers, h.windowsPerFace.side, h.porch]).toEqual([24, 10, 10, 4, 3, 2, true]);
    expect(h.roof).not.toBe('flat');
    expect(h.parts.length).toBe(1933);
    expect(Math.abs(h.parts.length - 1933) / 1933).toBeLessThanOrEqual(0.05);
  });
});

describe('houseFromSentence: determinism and geometry', () => {
  it('builds the same house for the same sentence, ignoring case and outer whitespace', () => {
    for (const s of HILLSIDE) expect(houseFromSentence(s)).toEqual(houseFromSentence(s));
    expect(houseFromSentence('  A Trading Algorithm for Kalshi \n')).toEqual(houseFromSentence('a trading algorithm for kalshi'));
  });
  it('lists parts in build order: order === index, bottom to top', () => {
    for (const s of [HILLSIDE[0], words(24)]) {
      const h = houseFromSentence(s);
      h.parts.forEach((p, i) => {
        expect(p.order).toBe(i);
        if (i > 0) expect(p.min[1]).toBeGreaterThanOrEqual(h.parts[i - 1].min[1]);
      });
      expect(h.parts[h.parts.length - 1].kind === 'slat' || h.parts[h.parts.length - 1].kind === 'chimney').toBe(true);
    }
  });
  it('gives every part a finite, non-empty box inside the house envelope', () => {
    for (const s of [...HILLSIDE, words(24), '']) {
      const h: House = houseFromSentence(s);
      for (const p of h.parts) {
        for (let a = 0; a < 3; a++) {
          expect(Number.isFinite(p.min[a]) && Number.isFinite(p.max[a])).toBe(true);
          expect(p.max[a]).toBeGreaterThan(p.min[a]);
        }
        expect(p.min[1]).toBeGreaterThanOrEqual(0);
        expect(Math.abs(p.min[0])).toBeLessThanOrEqual(h.width / 2 + 0.3);
        expect(p.max[2]).toBeLessThanOrEqual(h.depth / 2 + 1.35 + 1e-9);
      }
    }
  });
  it('steps sloped roofs up from the eaves to the ridge line inside the roof band', () => {
    for (const s of [...HILLSIDE, 'timer', WORKED_24]) {
      const h = houseFromSentence(s);
      const top = h.tiers * HOUSE.tierHeight, rise = roofRise(h.roof, h.depth);
      const slats = h.parts.filter((p) => p.kind === 'slat');
      for (const p of slats) { expect(p.min[1]).toBeGreaterThanOrEqual(top - 1e-9); expect(p.max[1]).toBeLessThanOrEqual(top + rise + 1e-9); }
      if (h.roof !== 'flat') {
        const highest = slats.filter((p) => p.max[1] > top + rise - 1e-9 && p.min[2] >= 0);
        expect(highest.length).toBe(h.width);   // one top course on the front side
        for (const p of highest) expect(p.max[2]).toBeLessThanOrEqual((h.depth / 2 + HOUSE.overhang) / ROOF_COURSES + 1e-9);
      }
    }
  });
  it('puts windows on the four faces at each tier, centred in the window band', () => {
    const h = houseFromSentence(words(17));   // 3 tiers
    const ys = new Set(h.windows.map((w) => w[1]));
    expect([...ys].sort()).toEqual([0, 1, 2].map((t) => t * HOUSE.tierHeight + HOUSE.window.sill + HOUSE.window.h / 2));
    for (const [x, , z] of h.windows) {
      const onFrontBack = Math.abs(Math.abs(z) - (h.depth / 2 + HOUSE.window.out / 2)) < 1e-9;
      const onSide = Math.abs(Math.abs(x) - (h.width / 2 + HOUSE.window.out / 2)) < 1e-9;
      expect(onFrontBack || onSide).toBe(true);
    }
  });
});

describe('houseSvg', () => {
  /** Every element is self-closing or closed in order; returns the open-tag count. */
  function balanced(svg: string): boolean {
    const stack: string[] = [];
    for (const m of svg.matchAll(/<(\/?)([a-z]+)[^>]*?(\/?)>/g)) {
      const [, close, name, self] = m;
      if (self) continue;
      if (close) { if (stack.pop() !== name) return false; } else stack.push(name);
    }
    return stack.length === 0;
  }
  it('is one balanced <svg> element for every corpus input', () => {
    for (const s of CORPUS) {
      const svg = houseSvg(houseFromSentence(s));
      expect(svg.startsWith('<svg ')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      expect(balanced(svg)).toBe(true);
      expect(svg).not.toMatch(/NaN|undefined|Infinity/);
    }
  });
  it('draws one lit rect per front window', () => {
    const h = houseFromSentence(words(24));
    const svg = houseSvg(h);
    const lit = svg.match(/fill="#FFC98A"/gi) ?? [];
    expect(lit.length).toBe(h.windowsPerFace.front * h.tiers);
  });
  it('is deterministic', () => {
    expect(houseSvg(houseFromSentence(HILLSIDE[2]))).toBe(houseSvg(houseFromSentence(HILLSIDE[2])));
  });
});
