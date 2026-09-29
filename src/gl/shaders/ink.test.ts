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
    expect(assigned('bandOrigin')).toEqual([`mix(rectCenter,centroidNdc,part==${PARTITION.merge}?BURST_BLEND:BAND_BLEND)`]);
    expect(assigned('rowY')).toEqual(['bandOrigin.y+(rows*0.5-aRow)*uBandPitch']);
  });

  it("gives the merge burst its own origin, a quarter of the way from the copy to the bed, its rows starting there (Task 5.0)", () => {
    // With the hero's blend and margin the burst's eight rows landed on the bed. Halfway, flush, at the hero's lengths,
    // they started past the intake's hopper and ran over it, the in-rail and the frame (s02-burst-rows at 1440 × 900).
    // At 0.27 they start about 40 px (1440 × 900) and 20 px (1280 × 720) right of the copy line's last word, clear of
    // the hopper. Every other partition keeps the hero's.
    expect(glslConst('BURST_BLEND')).toBe(0.27);
    expect(glslConst('BURST_MARGIN')).toBe(0);
    expect(glslConst('BAND_BLEND')).toBe(0.33);
    expect(glslConst('BAND_MARGIN')).toBe(0.32);
    expect(assigned('rowPt')[0]).toBe(`vec2(bandOrigin.x+(part==${PARTITION.merge}?BURST_MARGIN:BAND_MARGIN)+xInLine,rowY)`);
  });

  it('ends each row at its own hashed length, so the rows end ragged like code', () => {
    const [ragged] = assigned('ragged');
    expect(ragged).toMatch(/aRow/);
    expect(ragged).not.toMatch(/aSeed/);
    expect(assigned('lineLen')).toEqual(
      [`part==${PARTITION.merge}?BURST_LINE_MIN+BURST_LINE_RAG*ragged:LINE_MIN+LINE_RAG*ragged`],
    );
  });

  it("keeps the burst's rows short enough to sit on the paper between the copy line and the hopper (Task 5.0)", () => {
    // The gap from the copy line's right edge to the hopper is about 0.15 NDC wide at 1440 × 900 (≈ 405 → 515 px) and
    // at 1280 × 720 (≈ 377 → 476 px). The hero's lengths (0.14 to 0.60) cannot fit in it; the burst's run 0.05 to 0.11.
    const [min, rag] = ['BURST_LINE_MIN', 'BURST_LINE_RAG'].map(glslConst);
    expect([min, rag]).toEqual([0.05, 0.06]);
    expect(min + rag).toBeLessThan(glslConst('LINE_MIN'));   // the longest burst row is shorter than the hero's shortest
    expect(glslConst('BURST_BLEND')).toBeLessThan(glslConst('BAND_BLEND'));
  });

  it('stills the curl while a point sits in its row', () => {
    expect(code.replace(/\s+/g, '')).toMatch(/p\+=c\.xy\*[^;]*\*\(1\.0-band\);/);
  });

  it('never lets a trickle point into the band', () => {
    expect(code.replace(/\s+/g, '')).toContain('if(aTrickle>0.5){band=0.0;}');
  });
});

describe('reduced motion (design §11: no ink transit)', () => {
  it('hides every point through uInkEnabled, a multiplier on vAlpha, so the point size and the fragment both drop it', () => {
    expect(code).toMatch(/uniform\s+float\s+uInkEnabled\s*;/);
    const [alpha] = assigned('vAlpha');
    expect(alpha.startsWith('uInkEnabled*')).toBe(true);
    expect(assigned('gl_PointSize')[0]).toMatch(/step\(0\.001,vAlpha\)$/);
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

describe('the band on phones: under the copy, not beside it (Task 5.4; Task 3.8 concern 3)', () => {
  // Beside the copy the band is a margin and lengths in NDC from an origin a third of the way to the machine. Where the
  // copy spans the width (phones: col-span-12 between 16 px gutters) that put 40 rows in a 117 px column at the right
  // edge of 390 × 844, over the headline. There the band prints under the copy instead: from the source's left edge,
  // rows 10–40% of the viewport wide, its first row a 16 px gap under the source or at the copy's floor (the upper
  // 45%, spec §9 phone layout) if that is higher, the pitch tightened only as far as keeps the last row on screen.
  const consts = () => ['UNDER_ROOM', 'COPY_FLOOR', 'UNDER_GAP_PX', 'UNDER_LINE_MIN', 'UNDER_LINE_RAG'].map(glslConst);
  /** The rect Ink.tsx writes for a source at CSS px (left, top, right, bottom) in a w × h viewport: NDC x, top y, w, h. */
  const rect = (l: number, t: number, r: number, b: number, w: number, h: number) =>
    [l / w * 2 - 1, 1 - t / h * 2, (r - l) / w * 2, (b - t) / h * 2] as const;
  /** The shader's under-the-copy placement, in CSS px from the viewport's top-left. */
  const under = (rc: readonly number[], rows: number, w: number, h: number) => {
    const [room, floor, gapPx] = consts();
    const [x, y, rw, rh] = rc;
    const on = x + rw >= 1 - room ? 1 : 0;
    const gap = (gapPx * 2) / h;
    const top = Math.min(y - rh - gap, floor);
    const pitch = Math.min((14 * 2) / h, (top + 1 - gap) / rows);
    const px = (ndcY: number) => (1 - ndcY) / 2 * h;
    return { on, first: px(top - 0.5 * pitch), last: px(top - (rows - 0.5) * pitch), pitchPx: (pitch / 2) * h, left: (x + 1) / 2 * w };
  };

  it('reads the viewport in CSS px from uViewport and declares its constants', () => {
    const [, floor, gapPx, min, rag] = consts();
    expect(code).toMatch(/uniform\s+vec2\s+uViewport\s*;/);
    expect(floor).toBeCloseTo(1 - 2 * 0.45, 9);   // NDC y of the copy's floor: 45% down
    expect(gapPx).toBe(16);
    expect(min + rag).toBeCloseTo(0.8, 9);        // the longest row: 40% of the viewport
    expect(min).toBeCloseTo(0.2, 9);              // the shortest: 10%
  });

  it('takes the placement only where the source leaves no room on its right, and keeps every other statement', () => {
    expect(assigned('under')).toEqual(['step(1.0-UNDER_ROOM,r.x+r.z)']);
    expect(assigned('gap')).toEqual(['UNDER_GAP_PX*2.0/uViewport.y']);
    expect(assigned('underTop')).toEqual(['min(r.y-r.w-gap,COPY_FLOOR)']);
    expect(assigned('underPitch')).toEqual(['min(uBandPitch,(underTop+1.0-gap)/rows)']);
    expect(assigned('underPt')).toEqual(['vec2(r.x+fract(aSeed*13.7)*(UNDER_LINE_MIN+UNDER_LINE_RAG*ragged),underTop-(aRow+0.5)*underPitch)']);
    expect(assigned('rowPt')).toHaveLength(2);
    expect(assigned('rowPt')[1]).toBe('mix(rowPt,underPt,under)');
  });

  it('prints the hero\'s 40 rows under its copy at 390 × 844 and 375 × 667, from the gutter, all on screen', () => {
    // The hero's source is its whole copy block, as the browser lays it out with the phone rules (globals.css):
    // 16 → 374 px wide at 390, its plate and honesty line ending at 371 px.
    for (const [w, h] of [[390, 844], [375, 667]]) {
      const b = under(rect(16, 56, w - 16, 371, w, h), 40, w, h);
      expect(b.on, `${w} × ${h}`).toBe(1);
      expect(b.left).toBeCloseTo(16, 6);
      expect(b.first, `${w} × ${h}: first row under the copy`).toBeGreaterThanOrEqual(371 + 16);
      expect(b.last, `${w} × ${h}: last row on screen`).toBeLessThanOrEqual(h - 16 + 1e-6);
      expect(b.pitchPx).toBeLessThanOrEqual(14);
    }
    // 390 × 844 keeps a readable pitch; a small section's eight rows keep the full 14 px under a heading
    expect(under(rect(16, 56, 374, 371, 390, 844), 40, 390, 844).pitchPx).toBeGreaterThan(10);
    const small = under(rect(16, 96, 374, 180, 390, 844), 8, 390, 844);
    expect(small.first).toBeGreaterThanOrEqual(0.45 * 844);   // at the copy's floor, not in the body under the heading
    expect(small.pitchPx).toBeCloseTo(14, 9);
  });

  it('leaves the desktop band beside the copy: the hero\'s 7-of-12 column and a 5-of-12 heading at 1280 and 1440', () => {
    for (const w of [1280, 1440]) {
      const col = (span: number) => 48 + ((w - 96 - 11 * 16) / 12) * span + (span - 1) * 16;
      expect(under(rect(48, 96, col(7), 520, w, 900), 40, w, 900).on, `hero at ${w}`).toBe(0);
      expect(under(rect(48, 112, col(5), 200, w, 900), 8, w, 900).on, `heading at ${w}`).toBe(0);
    }
  });
});
