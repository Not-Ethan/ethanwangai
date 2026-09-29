import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { PALETTES, type Palette } from '@/theme/palettes';
import { OU } from '@/bench/ou';
import { QUOTER_BED } from '@/bench/configs/quoter';
import { TIMING } from '@/bench/timing';
import { BAND_ROWS } from '@/gl/inkGeometry';
import { PLACEMENT } from '@/bench/bench';
import { MACHINE } from '@/bench/types';
import { buildBench } from '@/bench/counts';
import { createUniforms, applyPalette, hexToColor, type BenchUniforms } from './uniforms';

/** Palette key → uniform name, the eight colors the shaders consume (`ink` is the type color and the ink dots'). */
const COLOR_KEYS = [
  ['paper', 'uPaper'], ['ink', 'uInk'], ['inkTop', 'uInkTop'], ['inkKey', 'uInkKey'], ['inkShade', 'uInkShade'],
  ['pencil', 'uPencil'], ['hot', 'uHot'], ['shadow', 'uShadow'],
] as const;

function hexOf(c: THREE.Color): string { return `#${c.getHexString().toUpperCase()}`; }

function expectColorWithin(actual: THREE.Color, expected: THREE.Color, tol: number, label: string): void {
  for (const ch of ['r', 'g', 'b'] as const) {
    expect(Math.abs(actual[ch] - expected[ch]), `${label}.${ch}`).toBeLessThanOrEqual(tol);
  }
}

describe('createUniforms', () => {
  const u = createUniforms();

  it('returns the four per-machine arrays at length 8, with uFillRate all 1', () => {
    for (const name of ['uCompile', 'uMachineTime', 'uRun', 'uFillRate'] as const) {
      expect(u[name].value, name).toBeInstanceOf(Float32Array);
      expect(u[name].value.length, name).toBe(8);
    }
    expect(Array.from(u.uCompile.value)).toEqual(new Array(8).fill(0));
    expect(Array.from(u.uMachineTime.value)).toEqual(new Array(8).fill(0));
    expect(Array.from(u.uRun.value)).toEqual(new Array(8).fill(0));
    expect(Array.from(u.uFillRate.value)).toEqual(new Array(8).fill(1));
  });

  it('starts parked: scalars at 0, no hover, no OU texture, glyphs off, lines on', () => {
    for (const name of ['uTilt', 'uTime', 'uVel', 'uMerge', 'uLean'] as const) expect(u[name].value, name).toBe(0);
    expect(u.uHover.value.toArray()).toEqual([-1, -1]);
    expect(u.uOU.value).toBeNull();
    expect(u.uGlyph.value).toBe(0);
    expect(u.uLines.value).toBe(1);
  });

  it('takes its geometry constants from the bench package, not hand-typed', () => {
    expect(u.uOUInfo.value.toArray()).toEqual([OU.markets, OU.steps, OU.rows, 8]);
    expect(u.uCellH.value).toBe(QUOTER_BED.hBase);
    expect(u.uPitch.value).toBe(QUOTER_BED.pitch);
    expect(u.uLock.value.toArray()).toEqual([TIMING.lock0, TIMING.lockSpan, TIMING.lockW]);
    expect(u.uTravelAxis.value.length()).toBeCloseTo(1);
    expect(u.uKeyDir.value.length()).toBeCloseTo(1);
  });

  it('pivots the balance at its post top: the placement origin\'s x/z at the rail\'s height, (−4.2, 0.9, 4.6)', () => {
    const o = PLACEMENT[MACHINE.balance].origin;
    const rail = buildBench('desktop').parts.find((p) => p.machine === MACHINE.balance && p.module === 'rail');
    expect(u.uBalancePivot.value.toArray()).toEqual([o[0], rail?.position[1], o[2]]);
    expect(u.uBalancePivot.value.toArray()).toEqual([-4.2, 0.9, 4.6]);
  });

  it('scans the slot every 3 s until a keystroke reseeds it, from phase 0', () => {
    expect(u.uSlotPeriod.value).toBe(3);
    expect(u.uSlotPhase.value).toBe(0);
  });

  it('starts on the light palette', () => {
    for (const [key, name] of COLOR_KEYS) expect(hexOf(u[name].value), name).toBe(PALETTES.light[key]);
  });

  it('carries the ink points\' entries: eight empty rects and centroids, the band rows, and the trickle on', () => {
    expect(u.uRect.value).toBeInstanceOf(Float32Array);
    expect(u.uRect.value.length).toBe(32);
    expect(Array.from(u.uRect.value)).toEqual(new Array(32).fill(0));
    expect(u.uCentroid.value).toBeInstanceOf(Float32Array);
    expect(u.uCentroid.value.length).toBe(24);
    expect(u.uBandRows.value).toBeInstanceOf(Float32Array);
    expect(Array.from(u.uBandRows.value)).toEqual([...BAND_ROWS, 0]);
    expect(Array.from(u.uBandRows.value)).toEqual([40, 8, 8, 8, 8, 8, 8, 0]);
    expect(u.uActiveRect.value).toBe(0);
    expect(u.uTrickle.value).toBe(1);
    expect(u.uBurst.value).toBe(0);
    expect(u.uCurl.value).toBeNull();
    expect(u.uPixelRatio.value).toBe(1);
    expect(u.uBandPitch.value).toBe(0);
    expect(u.uInk.value).toBeInstanceOf(THREE.Color);
  });

  it('returns an independent registry per call', () => {
    const a = createUniforms(), b = createUniforms();
    a.uCompile.value[0] = 1;
    a.uPaper.value.set(PALETTES.dark.paper);
    expect(b.uCompile.value[0]).toBe(0);
    expect(hexOf(b.uPaper.value)).toBe(PALETTES.light.paper);
  });
});

describe('hexToColor', () => {
  it('reads an sRGB hex into a linear-space Color that round-trips', () => {
    const hex = PALETTES.light.paper, c = hexToColor(hex);
    expect(hexOf(c)).toBe(hex);
    expect(c.r).toBeCloseTo(new THREE.Color(hex).r, 6);
    expect(c.r).not.toBeCloseTo(parseInt(hex.slice(1, 3), 16) / 255, 2);   // linear, not raw sRGB
  });
});

describe('applyPalette', () => {
  const light: Palette = PALETTES.light, dark: Palette = PALETTES.dark;
  let u: BenchUniforms;

  it('t = 0 sets every color to the from palette', () => {
    u = createUniforms();
    applyPalette(u, light, dark, 0);
    for (const [key, name] of COLOR_KEYS) expect(hexOf(u[name].value), name).toBe(light[key]);
  });

  it('t = 1 sets every color to the to palette', () => {
    u = createUniforms();
    applyPalette(u, light, dark, 1);
    for (const [key, name] of COLOR_KEYS) expect(hexOf(u[name].value), name).toBe(dark[key]);
  });

  it('t = 0.5 lands each channel on the linear midpoint within 1/255', () => {
    u = createUniforms();
    applyPalette(u, light, dark, 0.5);
    for (const [key, name] of COLOR_KEYS) {
      const a = new THREE.Color(light[key]), b = new THREE.Color(dark[key]);
      const mid = new THREE.Color(a.r + (b.r - a.r) * 0.5, a.g + (b.g - a.g) * 0.5, a.b + (b.b - a.b) * 0.5);
      expectColorWithin(u[name].value, mid, 1 / 255, name);
    }
  });

  it('writes into the existing Color instances rather than replacing them', () => {
    u = createUniforms();
    const before = u.uPaper.value;
    applyPalette(u, light, dark, 1);
    expect(u.uPaper.value).toBe(before);
    expect(hexOf(before)).toBe(dark.paper);
  });
});
