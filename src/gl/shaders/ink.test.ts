import { describe, it, expect } from 'vitest';
import { TIMING } from '@/bench/timing';
import { INK_VERTEX } from './ink.vert';

// GLSL does not run in node, so these pin the rows band's constants and the statements that decide its shape.
const code = INK_VERTEX.replace(/\/\/.*$/gm, '');   // comments may name a variable; only code counts

/** The number a `const float NAME = <n>` declaration gives NAME. */
function glslConst(name: string): number {
  const m = code.match(new RegExp(`\\b${name}\\s*=\\s*(-?[0-9.]+)`));
  if (!m) throw new Error(`${name} is not declared in the ink vertex shader`);
  return Number(m[1]);
}
/** Every right-hand side assigned to `name`, whitespace removed, so a failure prints the statement and not the shader. */
function assigned(name: string): string[] {
  return [...code.matchAll(new RegExp(`\\b${name}\\s*=(?!=)([^;]*);`, 'g'))].map((m) => m[1].replace(/\s+/g, ''));
}

describe('the ink rows band (design §3.1: T0 + 0.35 → 0.95 s)', () => {
  it('runs in one window of the hero compile: 0.35 s and 0.95 s of heroCompileS', () => {
    expect(glslConst('BAND_T0')).toBeCloseTo(0.35 / TIMING.heroCompileS, 4);
    expect(glslConst('BAND_T1')).toBeCloseTo(0.95 / TIMING.heroCompileS, 4);
    expect(glslConst('BAND_T0')).toBeCloseTo(0.159, 3);
    expect(glslConst('BAND_T1')).toBeCloseTo(0.432, 3);
  });

  it("keys the compile band on the machine's own uCompile, shared by the whole partition, not the point's own t", () => {
    expect(assigned('bt')).toEqual(['clamp((uCompile[m]-BAND_T0)/(BAND_T1-BAND_T0),0.0,1.0)']);
  });

  it('prints top row first over the first quarter of the window and releases over the last quarter', () => {
    expect(assigned('front')).toContain('smoothstep(aRow/rows*0.22,aRow/rows*0.22+0.03,bt)');
    expect(assigned('release')).toEqual(['smoothstep(0.75,1.0,bt)']);
  });

  it("puts every point of a partition on one row grid: the origin is the source rect's centre, never the spawn", () => {
    expect(assigned('rectCenter')).toEqual(['vec2(r.x+0.5*r.z,r.y-0.5*r.w)']);
    expect(assigned('bandOrigin')).toEqual(['mix(rectCenter,centroidNdc,BAND_BLEND)']);
    expect(assigned('rowY')).toEqual(['bandOrigin.y+(rows*0.5-aRow)*uBandPitch']);
  });

  it('ends each row at its own hashed length, so the rows end ragged like code', () => {
    const [lineLen] = assigned('lineLen');
    expect(lineLen).toMatch(/aRow/);
    expect(lineLen).not.toMatch(/aSeed/);
  });

  it('stills the curl while a point sits in its row', () => {
    expect(code.replace(/\s+/g, '')).toMatch(/p\+=c\.xy\*[^;]*\*\(1\.0-band\);/);
  });

  it('never lets a trickle point into the band', () => {
    expect(code.replace(/\s+/g, '')).toContain('if(aTrickle>0.5){band=0.0;}');
  });
});
