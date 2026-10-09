import { describe, it, expect } from 'vitest';
import { SECTIONS, sectionRanges, locate } from './sections';
import type { SectionId } from './types';

const ORDER: SectionId[] = ['open', 'kalshi', 'heron', 'darch', 'summers', 'alive', 'yours', 'contact'];

/** Section tops and document height for a page whose sections are exactly their minimum heights. */
function page(vh: number): { tops: number[]; docHeight: number } {
  const tops: number[] = [];
  let y = 0;
  for (const s of SECTIONS) {
    tops.push(y);
    y += (s.heightVh * vh) / 100;
  }
  return { tops, docHeight: y };
}

describe('SECTIONS (spec §3)', () => {
  it('has the eight sections in page order', () => {
    expect(SECTIONS.map((s) => s.id)).toEqual(ORDER);
  });
  it('has the spec heights in vh', () => {
    expect(SECTIONS.map((s) => s.heightVh)).toEqual([100, 180, 120, 180, 100, 120, 140, 150]);
  });
  it('ends each section at the spec tod, 0 through open and 1 at the end of contact', () => {
    expect(SECTIONS.map((s) => s.todEnd)).toEqual([0, 0.3, 0.4, 0.6, 0.65, 0.72, 0.8, 1]);
    for (let i = 1; i < SECTIONS.length; i++) expect(SECTIONS[i].todEnd).toBeGreaterThanOrEqual(SECTIONS[i - 1].todEnd);
  });
  it('turns the landscape view per section (yaw°, pitch°, fovScale)', () => {
    expect(SECTIONS.map((s) => [s.view.yaw, s.view.pitch, s.view.fovScale])).toEqual([
      [0, 0, 1], [4, 1, 0.96], [2, 0, 0.98], [7, 0, 0.95], [-6, 3, 0.97], [0, 1, 1.04], [4, -2, 0.97], [-3, -1, 1],
    ]);
  });
  it('uses the portrait yaw column and shares pitch and fovScale with landscape', () => {
    expect(SECTIONS.map((s) => s.viewPortrait.yaw)).toEqual([0, 0, 0, 12, -12, 0, 3, -6]);
    for (const s of SECTIONS) {
      expect(s.viewPortrait.pitch, s.id).toBe(s.view.pitch);
      expect(s.viewPortrait.fovScale, s.id).toBe(s.view.fovScale);
    }
  });
});

describe('sectionRanges', () => {
  for (const [w, h] of [[1440, 900], [390, 844]] as const) {
    it(`gives every section a contiguous range of positive width at ${w} × ${h}`, () => {
      const { tops, docHeight } = page(h);
      const r = sectionRanges(tops, docHeight, h);
      expect(r.map((x) => x.id)).toEqual(ORDER);
      expect(r[0].start).toBe(0);
      expect(r[r.length - 1].end).toBe(1);
      for (let i = 0; i < r.length; i++) {
        expect(r[i].end - r[i].start, r[i].id).toBeGreaterThan(0);
        if (i > 0) expect(r[i].start, r[i].id).toBe(r[i - 1].end);
      }
    });
  }
  it('starts a section when its top reaches the viewport top', () => {
    const vh = 900;
    const { tops, docHeight } = page(vh);
    const r = sectionRanges(tops, docHeight, vh);
    expect(r[1].start).toBeCloseTo(tops[1] / (docHeight - vh), 9);
    expect(r[7].start).toBeCloseTo(tops[7] / (docHeight - vh), 9);
  });
});

describe('locate', () => {
  const vh = 900;
  const { tops, docHeight } = page(vh);
  const r = sectionRanges(tops, docHeight, vh);

  it('maps the middle of a range to its section at s = 0.5', () => {
    const out = locate((r[1].start + r[1].end) / 2, r);
    expect(out.section).toBe('kalshi');
    expect(out.index).toBe(1);
    expect(out.s).toBeCloseTo(0.5, 9);
  });
  it('puts a range boundary at s = 0 of the later section', () => {
    expect(locate(r[2].start, r)).toEqual({ section: 'heron', s: 0, index: 2 });
  });
  it('clamps g below 0 to open and above 1 to contact', () => {
    expect(locate(-0.5, r)).toEqual({ section: 'open', s: 0, index: 0 });
    expect(locate(1.5, r)).toEqual({ section: 'contact', s: 1, index: 7 });
  });
  it('returns open at s = 0 before the provider has measured any ranges', () => {
    expect(locate(0.4, [])).toEqual({ section: 'open', s: 0, index: 0 });
  });
});
