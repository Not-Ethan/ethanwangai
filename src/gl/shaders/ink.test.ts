import { describe, it, expect } from 'vitest';
import { TIMING, inkDepart, inkLand } from '@/bench/timing';
import { buildBench } from '@/bench/counts';
import { BENCH_SEED_TEXT } from '@/bench/bench';
import { hashString } from '@/bench/hash';
import { BAND_ROWS, PARTITION, buildInkGeometry } from '../inkGeometry';
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

/** GLSL's smoothstep. */
function smooth(e0: number, e1: number, x: number): number {
  const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return k * k * (3 - 2 * k);
}

describe('the rows dissolving toward the parts at T0 + 0.8 s (Step 3), with the band window unchanged', () => {
  // The quoter's compile points as the page builds them, stepped through the shader's own statements for t, bt,
  // release, ownFade, the in-leg and band at a ?freeze=<s> frame (uCompile = s / heroCompileS).
  const d = buildInkGeometry(buildBench('desktop'), 'desktop', hashString(BENCH_SEED_TEXT));
  const rows = BAND_ROWS[PARTITION.quoter];
  const at = (s: number) => {
    const u = s / TIMING.heroCompileS;
    const [b0, b1, leave, lateLeg] = ['BAND_T0', 'BAND_T1', 'ROW_LEAVE', 'LATE_LEG'].map(glslConst);
    const bt = Math.min(1, Math.max(0, (u - b0) / (b1 - b0)));
    const release = smooth(0.75, 1, bt);
    const inRow = new Array<number>(rows).fill(0);
    let departed = 0, leaving = 0;
    for (let i = d.offsets[PARTITION.quoter]; i < d.offsets[PARTITION.quoter + 1]; i++) {
      if (d.trickle[i] > 0.5) continue;
      const depart = inkDepart(d.targetBirth[i]), land = inkLand(d.targetBirth[i]);
      const t = Math.min(1, Math.max(0, (u - depart) / Math.max(1e-4, land - depart)));
      if (t < 0.001 || t >= 1) continue;   // on its glyph, or landed: hidden either way
      departed++;
      const aRow = d.row[i];
      const ownFade = 1 - smooth(leave, 1, t);
      const front = smooth(aRow / rows * 0.22, aRow / rows * 0.22 + 0.03, bt);
      const seated = b0 + (aRow / rows * 0.22 + 0.03) * (b1 - b0);
      const seat = front * Math.min(1, Math.max(0, (u - depart) / Math.max(lateLeg, seated - depart)));
      // band ≥ 0.97 keeps a dot within a few px of its row; ownFade < 0.97 has it on its way to its part
      if ((1 - release) * ownFade * seat >= 0.97) inRow[aRow]++;
      if (ownFade < 0.97) leaving++;
    }
    return { release, inRow, departed, leaving };
  };

  it("leaves each row on the point's own clock, from t = ROW_LEAVE, not on a moved band window", () => {
    expect(assigned('ownFade')).toEqual(['step(0.001,t)*(1.0-smoothstep(ROW_LEAVE,1.0,t))']);
    expect(assigned('release')).toEqual(['smoothstep(0.75,1.0,bt)']);
  });

  it('holds every row intact through T0 + 0.7 s', () => {
    for (const s of [0.6, 0.7]) {
      const f = at(s);
      expect(f.release).toBeLessThan(1e-6);
      expect(f.leaving / f.departed).toBeLessThan(0.01);
    }
  });

  it('at T0 + 0.8 s the band has not begun its release, yet the rows thin toward the parts and all still read', () => {
    const held = at(0.6), f = at(0.8);
    expect(f.release).toBeLessThan(1e-6);   // bt is 0.75: the dissolve comes from the points, not the window
    expect(f.leaving / f.departed).toBeGreaterThan(0.1);
    // every one of the 40 rows keeps at least 60% of the dots it held at 0.6 s, so at least 20 distinct rows remain,
    // and every row has lost at least a tenth of them to the parts
    const kept = f.inRow.map((n, row) => n / held.inRow[row]);
    expect(Math.min(...kept)).toBeGreaterThanOrEqual(0.6);
    expect(Math.max(...kept)).toBeLessThan(0.9);
  });
});
