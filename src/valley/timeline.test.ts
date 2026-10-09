import { describe, it, expect } from 'vitest';
import type { SectionRange } from './types';
import { SECTIONS, sectionRanges } from './sections';
import { timelineAt } from './timeline';

/** timelineAt reuses one object; snapshot it before comparing two calls. */
const snap = (g: number, ranges: SectionRange[], portrait = false) => structuredClone(timelineAt(g, ranges, portrait));

/** Section ranges for a page whose sections are exactly their §3 heights at a viewport of `vh` px. */
function rangesFor(vh: number): SectionRange[] {
  const tops: number[] = [];
  let y = 0;
  for (const s of SECTIONS) { tops.push(y); y += (s.heightVh / 100) * vh; }
  return sectionRanges(tops, y, vh);
}
const R = rangesFor(900);
const mid = (id: string) => { const r = R.find((x) => x.id === id)!; return (r.start + r.end) / 2; };
const at = (id: string, s: number) => { const r = R.find((x) => x.id === id)!; return r.start + s * (r.end - r.start); };
const STEPS = 10000;

describe('timelineAt: tod', () => {
  it('is 0 through all of open and hits each §3 breakpoint at its section end', () => {
    expect(timelineAt(0, R).tod).toBe(0);
    expect(timelineAt(at('open', 0.99), R).tod).toBe(0);
    for (const s of SECTIONS) expect(timelineAt(at(s.id, 0.999999), R).tod).toBeCloseTo(s.todEnd, 4);
    expect(timelineAt(1, R).tod).toBe(1);
  });
  it('is monotone non-decreasing in g and stays in [0, 1]', () => {
    let prev = -1;
    for (let i = 0; i <= STEPS; i++) {
      const t = timelineAt(i / STEPS, R).tod;
      expect(t).toBeGreaterThanOrEqual(prev);
      expect(t).toBeGreaterThanOrEqual(0); expect(t).toBeLessThanOrEqual(1);
      prev = t;
    }
  });
  it('clamps g outside [0, 1] and treats NaN as 0', () => {
    expect(snap(-1, R)).toEqual(snap(0, R));
    expect(snap(2, R)).toEqual(snap(1, R));
    expect(snap(Number.NaN, R)).toEqual(snap(0, R));
    expect(snap(0, R)).not.toEqual(snap(1, R));
  });
});

describe('timelineAt: view', () => {
  it('holds each section view through its first 75%', () => {
    for (const s of SECTIONS) {
      expect(timelineAt(at(s.id, 0.5), R).view).toEqual(s.view);
      expect(timelineAt(at(s.id, 0.5), R, true).view).toEqual(s.viewPortrait);
    }
  });
  it('is continuous in g in both orientations (no step above 0.25° or 0.004 fovScale per 1e-4 of g)', () => {
    for (const portrait of [false, true]) {
      let prev = { ...timelineAt(0, R, portrait).view };
      for (let i = 1; i <= STEPS; i++) {
        const v = { ...timelineAt(i / STEPS, R, portrait).view };
        expect(Math.abs(v.yaw - prev.yaw)).toBeLessThan(0.25);
        expect(Math.abs(v.pitch - prev.pitch)).toBeLessThan(0.25);
        expect(Math.abs(v.fovScale - prev.fovScale)).toBeLessThan(0.004);   // the portrait yours zoom eases 0.97 → 0.5 over the last quarter of alive
        prev = v;
      }
    }
  });
  it('uses the portrait yaw column only when asked', () => {
    expect(timelineAt(mid('darch'), R).view.yaw).toBe(7);
    expect(timelineAt(mid('darch'), R, true).view.yaw).toBe(12);
    expect(timelineAt(mid('summers'), R, true).view).toEqual({ yaw: -12, pitch: 3, fovScale: 0.97 });
  });
});

describe('timelineAt: scrubbed values (latch-free)', () => {
  it('ridgeReveal: 0.01 before kalshi, 0.01 + 0.99 · easeInOut(s) across it, 1 after', () => {
    expect(timelineAt(mid('open'), R).ridgeReveal).toBe(0.01);
    expect(timelineAt(at('kalshi', 0), R).ridgeReveal).toBeCloseTo(0.01, 9);
    expect(timelineAt(at('kalshi', 0.5), R).ridgeReveal).toBeCloseTo(0.505, 9);
    expect(timelineAt(mid('heron'), R).ridgeReveal).toBe(1);
  });
  it('goes back down when g goes back (the driver latches, not the timeline)', () => {
    expect(timelineAt(at('kalshi', 0.2), R).ridgeReveal).toBeLessThan(timelineAt(at('kalshi', 0.8), R).ridgeReveal);
    expect(timelineAt(at('heron', 0.2), R).hedgeReveal).toBeLessThan(timelineAt(at('heron', 0.8), R).hedgeReveal);
  });
  it('hedgeReveal: 0 before heron, s across it, 1 after', () => {
    expect(timelineAt(mid('kalshi'), R).hedgeReveal).toBe(0);
    expect(timelineAt(at('heron', 0.25), R).hedgeReveal).toBeCloseTo(0.25, 9);
    expect(timelineAt(mid('darch'), R).hedgeReveal).toBe(1);
  });
  it('darchT is 0 everywhere before darch, s across it, 1 after', () => {
    for (let i = 0; i <= STEPS; i++) {
      const g = i / STEPS, t = timelineAt(g, R);
      const order = SECTIONS.findIndex((s) => s.id === t.section);
      if (order < 3) expect(t.darchT).toBe(0);
      if (order > 3) expect(t.darchT).toBe(1);
      if (order === 3) expect(t.darchT).toBeCloseTo(t.s, 12);
    }
  });
  it('rain ramps up over the first 30% of darch, holds through summers, ramps out over the first 40% of alive', () => {
    expect(timelineAt(mid('heron'), R).rain).toBe(0);
    expect(timelineAt(at('darch', 0.15), R).rain).toBeCloseTo(0.5, 9);
    expect(timelineAt(at('darch', 0.3), R).rain).toBeCloseTo(1, 9);
    expect(timelineAt(mid('summers'), R).rain).toBe(1);
    expect(timelineAt(at('alive', 0.2), R).rain).toBeCloseTo(0.5, 9);
    expect(timelineAt(at('alive', 0.5), R).rain).toBe(0);
    expect(timelineAt(mid('yours'), R).rain).toBe(0);
  });
  it('arms the pulse only inside alive', () => {
    for (const s of SECTIONS) expect(timelineAt(mid(s.id), R).pulseArm).toBe(s.id === 'alive');
  });
  it('returns the same object every call (allocation-free for the frame loop)', () => {
    expect(timelineAt(0.1, R)).toBe(timelineAt(0.9, R));
  });
  it('reports the section and local s from the ranges', () => {
    const t = timelineAt(at('yours', 0.4), R);
    expect(t.section).toBe('yours');
    expect(t.s).toBeCloseTo(0.4, 9);
  });
  it('works for the phone viewport ranges too (390 × 844)', () => {
    const P = rangesFor(844);
    let prev = -1;
    for (let i = 0; i <= 1000; i++) { const t = timelineAt(i / 1000, P, true).tod; expect(t).toBeGreaterThanOrEqual(prev); prev = t; }
  });
});
