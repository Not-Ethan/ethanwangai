import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PALETTE, ALPHA, SKY_KEYFRAMES, cssVars } from './palette';

const SRC = fileURLToPath(new URL('..', import.meta.url));
const css = readFileSync(path.join(SRC, 'app/globals.css'), 'utf8');

function rgb(color: string): [number, number, number] {
  if (color.startsWith('#')) return [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)) as [number, number, number];
  const m = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (!m) throw new Error(`unparsed colour ${color}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}
function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
const contrast = (a: [number, number, number], b: [number, number, number]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('PALETTE (spec §9)', () => {
  it('has the spec values', () => {
    expect(PALETTE).toEqual({
      ink: '#E9E4DA', inkDim: '#9A958C', rule: '#2A2C33', scrim: 'rgba(5,7,15,0.72)',
      warm: '#FFC98A', ridge: '#FFB45A', porch: '#FFD9A0', millWindow: '#FFC27A', lamp: '#FFD2A0',
      hedge: '#8FA3B8', rain: '#9AAEC4',
      wall: '#1A1F28', roof: '#11151C',
      terrainLow: '#1B2C22', terrainMid: '#26402E', terrainSlope: '#33404F', terrainCrest: '#0E121A', treeline: '#090B10',
      river: '#6E8AA6', mist: '#8FA3B8',
    });
    expect(ALPHA).toEqual({ hedge: 0.5, rain: 0.35 });
  });
  it('has the four sky keyframes at tod 0, 0.18, 0.6, 1', () => {
    expect(SKY_KEYFRAMES).toEqual([
      { name: 'dusk', tod: 0, zenith: '#1B2238', horizon: '#C9825A', east: '#2A2E48', sun: '#E8A070', sunIntensity: 10 },
      { name: 'blue', tod: 0.18, zenith: '#0E1426', horizon: '#2E4360', east: '#141A2E', sun: '#8FA8D0', sunIntensity: 12 },
      { name: 'night', tod: 0.6, zenith: '#05070F', horizon: '#101830', east: '#070A14', sun: '#9FB2D8', sunIntensity: 16 },
      { name: 'predawn', tod: 1, zenith: '#0A0F1E', horizon: '#1E2A40', east: '#5A6E8C', sun: '#B8C4D8', sunIntensity: 14 },
    ]);
  });
});

describe('globals.css mirrors the palette', () => {
  it('declares every palette colour as a CSS variable with the same value', () => {
    const vars = cssVars();
    expect(vars.length).toBe(Object.keys(PALETTE).length + SKY_KEYFRAMES.length * 4);
    for (const [name, value] of vars) expect(css, name).toContain(`${name}: ${value};`);
  });
  it('declares one theme only', () => {
    expect(css).not.toMatch(/data-theme|prefers-color-scheme/);
  });
});

describe('scrim contrast (spec §9: 4.5:1 on copy)', () => {
  const scrim = rgb(PALETTE.scrim);
  const a = 0.72;
  for (const k of SKY_KEYFRAMES) {
    for (const where of ['zenith', 'horizon', 'east'] as const) {
      it(`ink and inkDim clear 4.5:1 on the scrim over the ${k.name} ${where}`, () => {
        const sky = rgb(k[where]);
        const bg = sky.map((c, i) => a * scrim[i] + (1 - a) * c) as [number, number, number];
        expect(contrast(rgb(PALETTE.ink), bg)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(rgb(PALETTE.inkDim), bg)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

describe('colour literals live only in palette.ts', () => {
  it('no other .ts or .tsx under src/ (tests aside) holds a hex or rgb() colour', () => {
    const files = (readdirSync(SRC, { recursive: true }) as string[])
      .filter((f) => /\.tsx?$/.test(f) && !/\.test\.ts$/.test(f) && !f.endsWith(path.join('valley', 'palette.ts')));
    for (const f of files) {
      const text = readFileSync(path.join(SRC, f), 'utf8');
      expect(text, f).not.toMatch(/#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?\b|\brgba?\(/);
    }
  });
});
