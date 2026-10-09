import { describe, it, expect } from 'vitest';
import { BUILD_SECONDS, BUILD, buildStateAt, scaffoldStart } from './build';

const snap = (t: number) => structuredClone(buildStateAt(t));

describe('buildStateAt', () => {
  it('runs 4.4 s', () => { expect(BUILD_SECONDS).toBe(4.4); });
  it('starts empty: cut 0, no scaffold, clock 0.00, dark', () => {
    const s = snap(0);
    expect(s.cut).toBe(0);
    expect(s.scaffold).toHaveLength(18);
    s.scaffold.forEach((b, i) => { expect(b.idx).toBe(i); expect(b.grow).toBe(0); });
    expect([s.clock, s.lit, s.done]).toEqual(['0.00', false, false]);
  });
  it('raises the cut with easeInOut over 0–3.6 s', () => {
    expect(snap(1.8).cut).toBeCloseTo(0.5, 9);
    expect(snap(0.9).cut).toBeCloseTo(0.15625, 9);
    expect(snap(3.6).cut).toBe(1);
    let prev = -1;
    for (let t = 0; t <= 4.4; t += 0.01) { const c = buildStateAt(t).cut; expect(c).toBeGreaterThanOrEqual(prev); prev = c; }
  });
  it('grows each of the 18 bars over 0.3 s on the (idx % 9) / 9 · 0.3 stagger from 0.2 s', () => {
    expect(scaffoldStart(0)).toBeCloseTo(0.2, 12);
    expect(scaffoldStart(8)).toBeCloseTo(0.2 + (8 / 9) * 0.3, 12);
    expect(scaffoldStart(9)).toBeCloseTo(0.2, 12);
    expect(snap(0.35).scaffold[0].grow).toBeCloseTo(0.5, 9);
    const full = snap(0.2 + 0.3 + 0.3);
    full.scaffold.forEach((b) => expect(b.grow).toBe(1));
  });
  it('holds the scaffold, then retracts it between 3.6 and 4.1 s', () => {
    snap(2.0).scaffold.forEach((b) => expect(b.grow).toBe(1));
    snap(3.85).scaffold.forEach((b) => expect(b.grow).toBeCloseTo(0.5, 9));
    snap(4.1).scaffold.forEach((b) => expect(b.grow).toBe(0));
  });
  it('lights the window at exactly 4.25 s', () => {
    expect(snap(4.2499).lit).toBe(false);
    expect(snap(4.25).lit).toBe(true);
  });
  it('formats the clock as t to two decimals', () => {
    expect(snap(1.234).clock).toBe('1.23');
    expect(snap(0.5).clock).toBe('0.50');
    expect(snap(2).clock).toBe('2.00');
    expect(snap(4.4).clock).toBe('4.40');
  });
  it('latches at 4.4 s: any later time is the final state', () => {
    const end = snap(4.4);
    expect(end).toMatchObject({ cut: 1, clock: '4.40', lit: true, done: true });
    end.scaffold.forEach((b) => expect(b.grow).toBe(0));
    for (const t of [4.41, 10, 1e6, Number.POSITIVE_INFINITY]) expect(snap(t)).toEqual(end);
    expect(snap(4.39).done).toBe(false);
  });
  it('treats negative time and NaN as 0', () => {
    expect(snap(-1)).toEqual(snap(0));
    expect(snap(Number.NaN)).toEqual(snap(0));
  });
  it('returns the same object every call (allocation-free for the frame loop)', () => {
    expect(buildStateAt(1)).toBe(buildStateAt(2));
    expect(BUILD.lightAt).toBe(4.25);
  });
});
