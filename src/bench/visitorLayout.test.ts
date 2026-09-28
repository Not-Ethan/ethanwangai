import { describe, it, expect } from 'vitest';
import { parseSentence, visitorConfig, VISITOR_RESERVE, ROW_CAP, WORD_PITCH } from './visitorLayout';
import { KIND, MACHINE, PRIMITIVE } from './types';
import { mulberry32 } from './hash';
import { layout } from './layout';
import { PLACEMENT } from './bench';
import { SLOT } from './configs/slot';

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
  it('caps the last row at twelve: what does not fit on four rails is dropped, not hung off the end', () => {
    const text = `a. b. c. ${words(21)}`;   // three one-word sentences take three rails; only twelve of the 21 fit on the fourth
    expect(parseSentence(text)).toEqual({ words: ['a.', 'b.', 'c.', ...Array(12).fill('w')], sentences: 4 });
    const p = visitorConfig(text).build(ctx);
    expect(p.filter((x) => x.kind === KIND.ping)).toHaveLength(15);
    expect(p.filter((x) => x.kind === KIND.ping && x.module === 'row3')).toHaveLength(ROW_CAP);
    const rails = p.filter((x) => x.kind === KIND.static);
    expect(rails).toHaveLength(4);
    expect(rails[3].scale[0]).toBeCloseTo(ROW_CAP * WORD_PITCH);
  });
  it('sits centred on the slot: rails on its pencil rails, a full row spanning its field, motor past the -x end', () => {
    const slotRails = SLOT.build(ctx).filter((x) => x.kind === KIND.static);
    const rails = visitorConfig('a. b. c. d.').build(ctx).filter((x) => x.kind === KIND.static);
    expect(rails).toHaveLength(slotRails.length);
    rails.forEach((r, i) => {
      expect(r.position[1]).toBeCloseTo(slotRails[i].position[1]);
      expect(r.position[2]).toBeCloseTo(slotRails[i].position[2]);
    });
    const full = visitorConfig(words(ROW_CAP)).build(ctx);
    const rail = full.find((x) => x.kind === KIND.static)!;
    expect(rail.position[0]).toBeCloseTo(0);
    expect(rail.scale[0]).toBeCloseTo(ROW_CAP * WORD_PITCH);
    const cells = full.filter((x) => x.kind === KIND.ping);
    expect(cells[0].position[0]).toBeCloseTo(-cells[ROW_CAP - 1].position[0]);
    expect(Math.abs(cells[0].position[0])).toBeLessThan(rail.scale[0] / 2);
    full.filter((x) => x.kind === KIND.spin).forEach((m) => expect(m.position[0]).toBeLessThan(rail.position[0] - rail.scale[0] / 2));
  });
  it('keeps every part within the slot origin +/- 1.2 through layout(), for any sentence shape', () => {
    const o = PLACEMENT[MACHINE.visitor].origin;
    for (const text of [words(24), `a. b. ${words(22)}`, `a. b. c. ${words(21)}`, 'a. b. c. d. e. f.', 'one', words(13)]) {
      const r = layout({ tier: 'desktop', seed: 7, configs: [visitorConfig(text)] });
      expect(r.parts.length).toBeGreaterThan(0);
      r.parts.forEach((p) => {
        expect(Math.abs(p.position[0] - o[0])).toBeLessThanOrEqual(1.2);
        expect(Math.abs(p.position[2] - o[2])).toBeLessThanOrEqual(1.2);
      });
      r.parts.filter((p) => p.kind === KIND.static).forEach((p) => expect(p.scale[0]).toBeLessThanOrEqual(ROW_CAP * WORD_PITCH + 1e-9));
    }
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
