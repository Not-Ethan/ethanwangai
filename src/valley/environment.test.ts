import { describe, it, expect } from 'vitest';
import { environmentAt, LIGHT } from './environment';
import { PALETTE, SKY_KEYFRAMES } from './palette';

const lc = (s: string) => s.toLowerCase();
const rgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

describe('environmentAt', () => {
  it('has the four keyframes at tod 0, 0.3, 0.6, 1 (dusk, blue, night, predawn)', () => {
    expect(SKY_KEYFRAMES.map((k) => [k.name, k.tod])).toEqual([['dusk', 0], ['blue', 0.3], ['night', 0.6], ['predawn', 1]]);
  });
  it.each(SKY_KEYFRAMES.map((k) => [k.name, k] as const))('equals the palette exactly at the %s keyframe', (_n, k) => {
    const e = environmentAt(k.tod);
    expect(e.zenith).toBe(lc(k.zenith));
    expect(e.horizon).toBe(lc(k.horizon));
    expect(e.east).toBe(lc(k.east));
    expect(e.sunColor).toBe(lc(k.sun));
    expect(e.sunIntensity).toBeCloseTo(k.sunIntensity, 12);
    expect(e.fogNear).toBeCloseTo(LIGHT[k.name].fogNear, 12);
    expect(e.starAlpha).toBeCloseTo(LIGHT[k.name].starAlpha, 12);
  });
  it('has monotone sky luminance dusk > blue > night and an east lift at predawn', () => {
    const lum = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
    };
    for (const f of ['horizon', 'zenith'] as const) {
      expect(lum(environmentAt(0)[f])).toBeGreaterThan(lum(environmentAt(0.3)[f]));
      expect(lum(environmentAt(0.3)[f])).toBeGreaterThan(lum(environmentAt(0.6)[f]));
    }
    expect(lum(environmentAt(1).east)).toBeGreaterThan(lum(environmentAt(0.6).horizon) * 1.5);
  });
  it('fog follows the horizon; hemisphere sky is the horizon, ground the terrain mid', () => {
    for (const tod of [0, 0.17, 0.45, 0.8, 1]) {
      const e = environmentAt(tod);
      expect(e.fogColor).toBe(e.horizon);
      expect(e.hemiSky).toBe(e.horizon);
      expect(e.hemiGround).toBe(lc(PALETTE.terrainMid));
    }
  });
  it('blends linearly between keyframes (midway dusk → blue)', () => {
    const e = environmentAt(0.15);
    const a = rgb(SKY_KEYFRAMES[0].horizon), b = rgb(SKY_KEYFRAMES[1].horizon), m = rgb(e.horizon);
    for (let i = 0; i < 3; i++) expect(Math.abs(m[i] - (a[i] + b[i]) / 2)).toBeLessThanOrEqual(1);
    expect(e.sunIntensity).toBeCloseTo((10 + 12) / 2, 9);
    expect(e.fogFar).toBeCloseTo((LIGHT.dusk.fogFar + LIGHT.blue.fogFar) / 2, 9);
  });
  it('keeps sunDir unit length, alphas in [0, 1], fog near < far, colours as #rrggbb', () => {
    for (let i = 0; i <= 100; i++) {
      const e = environmentAt(i / 100);
      expect(Math.hypot(...e.sunDir)).toBeCloseTo(1, 9);
      for (const a of [e.starAlpha, e.moonAlpha]) { expect(a).toBeGreaterThanOrEqual(0); expect(a).toBeLessThanOrEqual(1); }
      expect(e.fogNear).toBeLessThan(e.fogFar);
      for (const c of [e.zenith, e.horizon, e.east, e.fogColor, e.sunColor, e.hemiSky, e.hemiGround]) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
  it('clamps tod and maps NaN to dusk', () => {
    expect(environmentAt(-3)).toBe(environmentAt(0));
    expect(environmentAt(7)).toBe(environmentAt(1));
    expect(environmentAt(Number.NaN)).toBe(environmentAt(0));
  });
  it('returns a frozen, shared object for the same tod (no allocation in the frame loop)', () => {
    expect(environmentAt(0.4321)).toBe(environmentAt(0.4321));
    expect(Object.isFrozen(environmentAt(0.5))).toBe(true);
  });
  it('is darkest at night: the night zenith is darker than dusk and predawn', () => {
    const sum = (h: string) => rgb(h).reduce((x, y) => x + y, 0);
    expect(sum(environmentAt(0.6).zenith)).toBeLessThan(sum(environmentAt(0).zenith));
    expect(sum(environmentAt(0.6).zenith)).toBeLessThan(sum(environmentAt(1).zenith));
  });
});
