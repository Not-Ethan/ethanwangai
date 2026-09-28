import { describe, it, expect } from 'vitest';
import { SECTIONS, sectionRanges, locate, pageHeightVh } from './sections';

describe('sections', () => {
  it('has nine sections in the spec order', () => {
    expect(SECTIONS.map((s) => s.id)).toEqual([
      'sentence', 'more', 'first', 'kalshi', 'heron', 'darch', 'summers', 'alive', 'yours',
    ]);
  });
  it('sums to ~870vh desktop and ~990vh phone', () => {
    expect(pageHeightVh('desktop')).toBe(870);
    expect(pageHeightVh('phone')).toBe(990);
  });
  it('computes g ranges from measured tops and maps g to a section and local u', () => {
    const vh = 900;
    const tops = SECTIONS.reduce<number[]>((acc, s, i) => {
      acc.push(i === 0 ? 0 : acc[i - 1] + SECTIONS[i - 1].vh.desktop * vh / 100);
      return acc;
    }, []);
    const docHeight = tops[8] + SECTIONS[8].vh.desktop * vh / 100;
    const ranges = sectionRanges(tops, docHeight, vh);
    expect(ranges[0].start).toBe(0);
    expect(ranges[8].end).toBe(1);
    expect(ranges[0].end).toBeCloseTo(tops[1] / (docHeight - vh), 6);
    const mid = (ranges[3].start + ranges[3].end) / 2;
    expect(locate(mid, ranges)).toEqual({ index: 3, u: 0.5 });
    expect(locate(-1, ranges)).toEqual({ index: 0, u: 0 });
    expect(locate(2, ranges)).toEqual({ index: 8, u: 1 });
  });
});
