import { describe, it, expect } from 'vitest';
import { ridgePoints, TRADES_PER_DAY, RIDGE_LIFT, RIDGE_JITTER, RIDGE_JITTER_Y, RIDGE_JITTER_Z, RIDGE_FLOOR_FRACTION, TRICKLE_SIZE_BOOST } from './ridge';
import { RIDGE } from './layout';
import { heightAt } from './terrain';
import { facts } from './facts';

const N = facts.kalshi.trades;   // 30,000 (§4.6); the phone tier passes N / 5
const SEED = 2026;
const r = ridgePoints(N, SEED);

describe('ridgePoints (uniform, the committed tradesPerDay.json is empty)', () => {
  it('ships an empty per-day file, so the spread is uniform', () => {
    expect(TRADES_PER_DAY).toBeNull();
  });
  it('yields exactly N points in every channel', () => {
    expect(r.positions.length).toBe(N * 3);
    expect(r.birth.length).toBe(N);
    expect(r.size.length).toBe(N);
    expect(ridgePoints(N / 5, SEED).birth.length).toBe(N / 5);
  });
  it('has birth monotone in index and in x, inside [0, 1)', () => {
    let bad = 0;
    for (let i = 0; i < N; i++) {
      if (!(r.birth[i] >= 0 && r.birth[i] < 1)) bad++;
      if (i > 0 && !(r.birth[i] >= r.birth[i - 1] && r.positions[i * 3] >= r.positions[(i - 1) * 3])) bad++;
    }
    expect(bad).toBe(0);
  });
  it('keeps every point inside the crest band', () => {
    let bad = 0;
    for (let i = 0; i < N; i++) {
      const x = r.positions[i * 3], y = r.positions[i * 3 + 1], z = r.positions[i * 3 + 2];
      if (x < RIDGE.x0 || x > RIDGE.x1) bad++;
      if (Math.abs(z - RIDGE.z) > RIDGE_JITTER_Z + 1e-4) bad++;
      if (Math.abs(y - (heightAt(x, RIDGE.z) + RIDGE_LIFT)) > RIDGE_JITTER_Y + 1e-3) bad++;
      const boost = r.birth[i] < RIDGE_FLOOR_FRACTION ? TRICKLE_SIZE_BOOST : 1;   // the hero trickle is drawn larger
      if (r.size[i] < 0.6 * boost - 1e-6 || r.size[i] > 1.4 * boost + 1e-6) bad++;
    }
    expect(bad).toBe(0);
  });
  it('uses the thin crest band: lift 0.5, y ±0.35, z ±2.0, and keeps RIDGE_JITTER as the z jitter', () => {
    expect([RIDGE_LIFT, RIDGE_JITTER_Y, RIDGE_JITTER_Z, RIDGE_JITTER]).toEqual([0.5, 0.35, 2.0, 2.0]);
  });
  it('reveals the left end first: the hero trickle (reveal 0.01) shows about 1% of points, all in the left 2% of x', () => {
    let shown = 0;
    let outside = 0;
    for (let i = 0; i < N; i++) if (r.birth[i] <= 0.01) {
      shown++;
      if (r.positions[i * 3] >= RIDGE.x0 + 0.02 * (RIDGE.x1 - RIDGE.x0)) outside++;
    }
    expect(outside).toBe(0);
    expect(shown).toBeGreaterThanOrEqual(290); expect(shown).toBeLessThanOrEqual(310);
  });
  it('is deterministic per seed', () => {
    expect(ridgePoints(500, 9)).toEqual(ridgePoints(500, 9));
    expect(ridgePoints(500, 9).positions).not.toEqual(ridgePoints(500, 10).positions);
  });
  it('returns empty arrays for zero, negative or non-finite counts', () => {
    for (const c of [0, -5, Number.NaN]) expect(ridgePoints(c, 1).birth.length).toBe(0);
  });
});

describe('ridgePoints with a per-day file', () => {
  it('puts births only on days that had trades, still monotone', () => {
    const perDay = [0, 10, 0, 30];   // days 1 and 3 only
    const p = ridgePoints(4000, SEED, perDay);
    let inDay1 = 0;
    for (let i = 0; i < 4000; i++) {
      const b = p.birth[i];
      const day = Math.floor(b * 4);
      expect([1, 3]).toContain(day);
      if (day === 1) inDay1++;
      if (i > 0) expect(b).toBeGreaterThanOrEqual(p.birth[i - 1]);
    }
    expect(inDay1).toBeGreaterThan(900); expect(inDay1).toBeLessThan(1100);   // 10 / 40 of 4000
  });
  it('falls back to uniform for a malformed file', () => {
    expect(ridgePoints(100, 1, [1, -2, 3])).toEqual(ridgePoints(100, 1, null));
    expect(ridgePoints(100, 1, [0, 0])).toEqual(ridgePoints(100, 1, null));
  });
});
