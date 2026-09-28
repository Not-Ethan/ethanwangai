import { describe, it, expect } from 'vitest';
import { OU, generateOU } from './ou';

const { markets, steps, rows } = OU;
const idx = (step: number, market: number) => ((step * markets) + market) * 4;
const tex = generateOU(1);
const mismatches = (a: Uint8Array, b: Uint8Array) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };

describe('generateOU', () => {
  it('is RGBA8 of markets × steps and deterministic in the seed', () => {
    expect(tex).toBeInstanceOf(Uint8Array);
    expect(tex.length).toBe(markets * steps * 4);
    expect(mismatches(generateOU(1), tex)).toBe(0);
    expect(mismatches(generateOU(2), tex)).toBeGreaterThan(0);
  });

  it('keeps R within [0, rows) and G, B within [1, 4]', () => {
    let rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
    for (let i = 0; i < tex.length; i += 4) {
      rMax = Math.max(rMax, tex[i]);
      gMin = Math.min(gMin, tex[i + 1]); gMax = Math.max(gMax, tex[i + 1]);
      bMin = Math.min(bMin, tex[i + 2]); bMax = Math.max(bMax, tex[i + 2]);
    }
    expect(rMax).toBeLessThanOrEqual(rows - 1);
    expect(gMin).toBeGreaterThanOrEqual(1); expect(gMax).toBeLessThanOrEqual(4);
    expect(bMin).toBeGreaterThanOrEqual(1); expect(bMax).toBeLessThanOrEqual(4);
  });

  it('A counts steps since the last fill: 0 on a fill, otherwise previous + 1 saturating at 255', () => {
    let violations = 0;
    for (let m = 0; m < markets; m++) {
      let prev = 255;
      for (let s = 0; s < steps; s++) {
        const a = tex[idx(s, m) + 3];
        if (a !== 0 && a !== Math.min(255, prev + 1)) violations++;
        prev = a;
      }
    }
    expect(violations).toBe(0);
  });

  it('fills land on 3% to 10% of steps and cluster after a fill', () => {
    let fills = 0, afterFill = 0, pairs = 0;
    for (let m = 0; m < markets; m++) {
      let prev = false;
      for (let s = 0; s < steps; s++) {
        const fill = tex[idx(s, m) + 3] === 0;
        if (fill) fills++;
        if (prev) { afterFill++; if (fill) pairs++; }
        prev = fill;
      }
    }
    const rate = fills / (markets * steps);
    expect(rate).toBeGreaterThan(0.03);
    expect(rate).toBeLessThan(0.10);
    expect(pairs / afterFill).toBeGreaterThanOrEqual(2 * rate);
  });

  it('R mean-reverts to the middle row in every market with lag-1 autocorrelation above 0.9', () => {
    let num = 0, den = 0;
    for (let m = 0; m < markets; m++) {
      let sum = 0;
      for (let s = 0; s < steps; s++) sum += tex[idx(s, m)];
      const mean = sum / steps;
      expect(mean).toBeGreaterThanOrEqual(20);
      expect(mean).toBeLessThanOrEqual(28);
      for (let s = 0; s < steps; s++) {
        const d = tex[idx(s, m)] - mean;
        den += d * d;
        if (s > 0) num += d * (tex[idx(s - 1, m)] - mean);
      }
    }
    expect(num / den).toBeGreaterThan(0.9);
  });
});
