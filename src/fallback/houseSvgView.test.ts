import { describe, it, expect } from 'vitest';
import { copy } from '@/site/copy';
import { houseFromSentence } from '@/valley/house';
import { houseSvgView } from './houseSvgView';

describe('houseSvgView', () => {
  it('is the same house as the GL build: same parts count, same tag', () => {
    const s = 'a bot that books my dentist appointments';
    const v = houseSvgView(s)!;
    expect(v.parts).toBe(houseFromSentence(s).parts.length);
    expect(v.words).toBe(7);
    expect(v.tag).toBe(copy.yours.tag(7, v.parts));
  });

  it('is deterministic and a single well-formed svg element', () => {
    const a = houseSvgView('a trading algorithm for kalshi')!;
    const b = houseSvgView('a trading algorithm for kalshi')!;
    expect(a.svg).toBe(b.svg);
    expect(a.svg.trimStart().startsWith('<svg')).toBe(true);
    expect(a.svg.trimEnd().endsWith('</svg>')).toBe(true);
    expect(a.svg).not.toMatch(/<script|on[a-z]+=/i);
  });

  it('never carries markup from the sentence into the svg', () => {
    const v = houseSvgView('<img src=x onerror=alert(1)> a bar')!;
    expect(v.svg).not.toContain('<img');
    expect(v.svg).not.toContain('onerror');
  });

  it('nothing for no sentence or a blank one', () => {
    expect(houseSvgView(null)).toBeNull();
    expect(houseSvgView('   ')).toBeNull();
  });
});
