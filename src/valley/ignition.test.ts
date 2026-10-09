import { describe, it, expect } from 'vitest';
import type { IgnitionStep } from './types';
import { CHAIN_END, ignitionSchedule, ignitionLevel, finalLevel, millRows, millRowLit } from './ignition';

const S = ignitionSchedule();
const step = (target: string) => S.find((s) => s.target === target)!;
const start = (s: IgnitionStep) => s.at + (s.stagger ?? 0);

describe('ignitionSchedule', () => {
  it('lists every §5.3 target once, in the spec order', () => {
    expect(S.map((s) => s.target)).toEqual(['hut', 'nist', 'mill', 'kalshiLamp', 'wvu', 'bar1', 'bar2', 'bar3', 'bar4',
      'hill1', 'hill2', 'hill3', 'hill4', 'hill5', 'visitor', 'ridge']);
  });
  it('has the §5.3 times, durations and kinds', () => {
    expect(step('hut')).toEqual({ target: 'hut', at: 0.8, dur: 0.5, kind: 'flicker' });
    expect(step('mill')).toEqual({ target: 'mill', at: 2.4, dur: 1.4, kind: 'mill' });
    expect(step('ridge')).toEqual({ target: 'ridge', at: 3.8, dur: 1.2, kind: 'trickle' });
    ['bar1', 'bar2', 'bar3', 'bar4'].forEach((b, i) => expect(step(b).at).toBeCloseTo(3.106 + 0.05 * i, 9));
    ['hill1', 'hill2', 'hill3', 'hill4', 'hill5', 'visitor'].forEach((h, i) => {
      expect(step(h)).toMatchObject({ at: 3.6, dur: 0.4, kind: 'catch' });
      expect(step(h).stagger).toBeCloseTo(0.04 * i, 12);
    });
  });
  it('makes each chain gap 60% of the last, to ±1 ms (abstraction is a force multiplier)', () => {
    const chain = ['hut', 'nist', 'mill', 'kalshiLamp', 'wvu', 'bar1'].map((t) => step(t).at);
    const gaps = chain.slice(1).map((a, i) => a - chain[i]);
    const expected = [1.0, 0.6, 0.36, 0.216, 0.1296];
    gaps.forEach((g, i) => expect(Math.abs(g - expected[i])).toBeLessThanOrEqual(0.001));
    for (let i = 1; i < gaps.length; i++) expect(Math.abs(gaps[i] - 0.6 * gaps[i - 1])).toBeLessThanOrEqual(0.001);
  });
  it('ends at exactly CHAIN_END = 5.0 s', () => {
    expect(CHAIN_END).toBe(5.0);
    expect(Math.max(...S.map((s) => start(s) + s.dur))).toBeCloseTo(CHAIN_END, 12);
  });
});

describe('ignitionLevel', () => {
  it('is 0 before every step starts (and for NaN)', () => {
    for (const s of S) {
      expect(ignitionLevel(s, start(s) - 0.001)).toBe(0);
      expect(ignitionLevel(s, Number.NaN)).toBe(0);
    }
  });
  it('catches flare to at most 1.6 and settle to exactly 1', () => {
    const nist = step('nist');
    let peak = 0;
    for (let t = 1.8; t <= 2.1; t += 0.001) peak = Math.max(peak, ignitionLevel(nist, t));
    expect(peak).toBeGreaterThan(1.55); expect(peak).toBeLessThanOrEqual(1.6);
    expect(ignitionLevel(nist, 2.1)).toBe(1);
    expect(ignitionLevel(step('visitor'), 3.6 + 0.2 + 0.4)).toBe(1);
  });
  it('flickers the hut then holds it at 1', () => {
    const hut = step('hut');
    expect(ignitionLevel(hut, 0.8 + 0.1)).toBeLessThan(0.5);   // the dip at 15–30% of the 0.5 s
    expect(ignitionLevel(hut, 1.3)).toBe(1);
    expect(ignitionLevel(hut, 60)).toBe(1);
  });
  it('plays the §4.5 mill curve: floods bottom-up, holds, ends dark', () => {
    const mill = step('mill');
    expect(ignitionLevel(mill, 2.4 + 1.4 * 0.5)).toBe(1);
    expect(ignitionLevel(mill, 2.4 + 1.4 * 0.04)).toBe(0.25);
    expect(ignitionLevel(mill, 3.8)).toBe(0);
    expect(ignitionLevel(mill, 4.5)).toBe(0);
  });
  it('trickles the ridge reveal 0 → 0.01 over 1.2 s', () => {
    const r = step('ridge');
    expect(ignitionLevel(r, 4.4)).toBeCloseTo(0.005, 9);
    expect(ignitionLevel(r, 5.0)).toBeCloseTo(0.01, 12);
    expect(ignitionLevel(r, 9)).toBeCloseTo(0.01, 12);
  });
  it('gives the final states: everything lit at 1, the mill dark, the ridge at 0.01', () => {
    for (const s of S) {
      const want = s.target === 'mill' ? 0 : s.target === 'ridge' ? 0.01 : 1;
      expect(finalLevel(s)).toBeCloseTo(want, 12);
    }
  });
});

describe('mill rows (§4.5)', () => {
  it('lights row r at darchT 0.03 + 0.03r and puts it out at 0.78 + 0.05(3 − r)', () => {
    for (let r = 0; r < 4; r++) {
      const on = 0.03 + 0.03 * r, off = 0.78 + 0.05 * (3 - r);
      expect(millRowLit(on - 1e-9, r)).toBe(false);
      expect(millRowLit(on, r)).toBe(true);
      expect(millRowLit(off - 1e-9, r)).toBe(true);
      expect(millRowLit(off, r)).toBe(false);
    }
    expect([0, 0.04, 0.07, 0.1, 0.15, 0.5, 0.8, 0.85, 0.9, 0.95, 1].map(millRows)).toEqual([0, 1, 2, 3, 4, 4, 3, 2, 1, 0, 0]);
  });
});
