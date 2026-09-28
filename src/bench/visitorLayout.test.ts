import { describe, it, expect } from 'vitest';
import { parseSentence, visitorConfig, VISITOR_RESERVE } from './visitorLayout';
import { KIND, MACHINE, PRIMITIVE } from './types';
import { mulberry32 } from './hash';
import { layout } from './layout';

const ctx = { tier: 'desktop' as const, rng: mulberry32(1), density: 1, caps: true };
const words = (n: number) => Array(n).fill('w').join(' ');

describe('visitor layout', () => {
  it('parses words and sentences with caps', () => {
    expect(parseSentence('a bot that trades. and a bar.')).toEqual({ words: ['a', 'bot', 'that', 'trades.', 'and', 'a', 'bar.'], sentences: 2 });
    expect(parseSentence('   ')).toEqual({ words: [], sentences: 0 });
    expect(parseSentence('...')).toEqual({ words: ['...'], sentences: 1 });
    expect(parseSentence(words(40)).words).toHaveLength(24);
    expect(parseSentence('a. b. c. d. e. f.').sentences).toBe(4);
  });
  it('builds bars = words, rails = sentences, one ring, one lever, within the reserve', () => {
    const p = visitorConfig('build a thing that runs. then another.').build(ctx);
    expect(p.filter((x) => x.kind === KIND.ping)).toHaveLength(7);       // words as pulsing cells
    expect(p.filter((x) => x.kind === KIND.static)).toHaveLength(2);     // rails
    expect(p.filter((x) => x.kind === KIND.spin)).toHaveLength(2);       // ring + spoke
    expect(p.filter((x) => x.kind === KIND.lever)).toHaveLength(1);
    expect(p.length).toBeLessThanOrEqual(VISITOR_RESERVE);
    p.forEach((x) => x.scale.forEach((s) => expect(Number.isFinite(s) && s > 0).toBe(true)));
  });
  it('empty text builds nothing', () => { expect(visitorConfig('').build(ctx)).toHaveLength(0); });

  it('never exceeds the reserve: 24 words in one run, and 24 words forced onto four rows', () => {
    expect(visitorConfig(words(24)).build(ctx).length).toBeLessThanOrEqual(VISITOR_RESERVE);
    // 'a.' and 'b.' each take a row; 22 more words wrap 12 + 10 onto two more: four rails, so the word cap drops to 23.
    const text = `a. b. ${words(22)}`;
    const parsed = parseSentence(text);
    expect(parsed.words).toHaveLength(23);
    const p = visitorConfig(text).build(ctx);
    expect(p.filter((x) => x.kind === KIND.ping)).toHaveLength(23);
    expect(p.filter((x) => x.kind === KIND.static)).toHaveLength(4);
    expect(p).toHaveLength(VISITOR_RESERVE);
  });
  it('wraps a run longer than 12 words onto the next rail, and caps rails at four', () => {
    const one = visitorConfig(words(13)).build(ctx);
    expect(one.filter((x) => x.kind === KIND.static)).toHaveLength(2);
    const many = visitorConfig('a. b. c. d. e. f.').build(ctx);
    expect(many.filter((x) => x.kind === KIND.static)).toHaveLength(4);
  });
  it('uses the primitives the plan names and keeps the lever alone in the highest group', () => {
    const p = visitorConfig('one two. three!').build(ctx);
    p.filter((x) => x.kind === KIND.ping).forEach((x) => expect(x.primitive).toBe(PRIMITIVE.cell));
    p.filter((x) => x.kind === KIND.static).forEach((x) => expect(x.primitive).toBe(PRIMITIVE.bar));
    expect(p.filter((x) => x.kind === KIND.spin).map((x) => x.primitive).sort()).toEqual([PRIMITIVE.bar, PRIMITIVE.ring]);
    const lever = p.find((x) => x.kind === KIND.lever)!;
    expect(lever.primitive).toBe(PRIMITIVE.bar);
    const top = Math.max(...p.map((x) => x.group));
    expect(lever.group).toBe(top);
    expect(p.filter((x) => x.group === top)).toHaveLength(1);
    p.filter((x) => x.kind !== KIND.lever).forEach((x) => expect(x.group).toBeLessThan(top));
  });
  it('places word cells along x at pitch 0.14 with height from word length, pinging on the sentence', () => {
    const p = visitorConfig('a longerword').build(ctx);
    const cells = p.filter((x) => x.kind === KIND.ping);
    expect(cells[1].position[0] - cells[0].position[0]).toBeCloseTo(0.14);
    expect(cells[0].position[2]).toBe(cells[1].position[2]);
    expect(cells[0].scale[1]).toBeCloseTo(0.15 + 0.03 * 1);
    expect(cells[1].scale[1]).toBeCloseTo(0.15 + 0.03 * 10);
    cells.forEach((c, i) => {
      expect(c.param[0]).toBeGreaterThanOrEqual(1.2); expect(c.param[0]).toBeLessThanOrEqual(1.8);
      expect(c.param[1]).toBeCloseTo(i / cells.length);
      expect(c.param[2]).toBe(1.6);
      expect(c.explodeMode).toBe('module');
    });
  });
  it('is deterministic for the same sentence and plugs into layout() as the visitor', () => {
    const text = 'build a thing that runs. then another.';
    expect(visitorConfig(text).build(ctx)).toEqual(visitorConfig(text).build(ctx));
    const r = layout({ tier: 'desktop', seed: 7, configs: [visitorConfig(text)] });
    expect(r.counts.byMachine[MACHINE.visitor]).toBe(12);
    expect(r.counts.inkedAtEnd).toBe(0);                                  // the visitor is not in the emitted total
    const lever = r.parts.find((x) => x.kind === KIND.lever)!;
    expect(lever.birth).toBe(1);
    r.parts.filter((x) => x !== lever).forEach((x) => expect(x.birth).toBeLessThan(1));
  });
});
