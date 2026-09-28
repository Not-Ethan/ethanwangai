import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { buildBench } from '@/bench/counts';
import { hashString } from '@/bench/hash';
import { BENCH_SEED_TEXT, PLACEMENT } from '@/bench/bench';
import { OU, generateOU } from '@/bench/ou';
import { QUOTER_BED } from '@/bench/configs/quoter';
import { SECTION_INDEX } from '@/bench/sections';
import { MACHINE, type Tier } from '@/bench/types';
import { createUniforms } from './material/uniforms';
import { hud } from './hud';
import {
  FILL_WINDOW, HOVER_PLANE, HOVER_SECTIONS, TAP_HOLD_MS,
  bedCell, createHover, ouStep, quoterBedGrid, readQuote, stepHover,
} from './Hover';

const W = 1440, H = 900;
const ouData = generateOU(hashString(BENCH_SEED_TEXT));
const [ox, , oz] = PLACEMENT[MACHINE.quoter].origin;

/** A camera over the quoter aimed at the centre of bed cell (col, row), so the screen centre's ray lands on it. */
function cameraOn(tier: Tier, col: number, row: number): THREE.PerspectiveCamera {
  const g = quoterBedGrid(buildBench(tier));
  const x = g.minX + (col + 0.5) * g.pitch, z = g.minZ + (row + 0.5) * g.pitch;
  const cam = new THREE.PerspectiveCamera(30, W / H, 0.5, 120);
  cam.position.set(x, 12, z + 10);
  cam.lookAt(x, HOVER_PLANE.y, z);
  return cam;
}

function driver(tier: Tier = 'desktop') {
  const uniforms = createUniforms();
  const h = createHover(buildBench(tier), uniforms, ouData);
  return { h, uniforms };
}

/** The quote the readout should show for market `col` at quoter machine time `mt`, straight from the array. */
function expectedQuote(col: number, mt: number) {
  const step = Math.floor(mt * 8) % OU.steps;
  const texel = (s: number) => (((s + OU.steps) % OU.steps) * OU.markets + col) * 4;
  const i = texel(step);
  let fills = 0;
  for (let k = 0; k < 64; k++) if (ouData[texel(step - k) + 3] === 0) fills++;
  return { mid: ouData[i], bid: ouData[i] - ouData[i + 1], ask: ouData[i] + ouData[i + 2], fills };
}

beforeEach(() => {
  hud.section = SECTION_INDEX.kalshi;
  Object.assign(hud.hover, { machine: -1, col: -1, x: 0, y: 0, mid: 0, bid: 0, ask: 0, fills: 0 });
});

describe('quoterBedGrid', () => {
  it("reads the quoter bed's lattice off the layout in bench space: 64 × 48 at 0.15 on desktop, 32 × 24 at 0.30 on phone, one 9.6 × 7.2 bed", () => {
    const d = quoterBedGrid(buildBench('desktop'));
    expect([d.cols, d.rows]).toEqual([QUOTER_BED.cols, QUOTER_BED.rows]);
    expect(d.pitch).toBeCloseTo(QUOTER_BED.pitch, 9);
    expect(d.minX).toBeCloseTo(ox - 4.8, 9);   // the first column's centre, local −4.725, less half a pitch: its near edge
    expect(d.minZ).toBeCloseTo(oz - 3.6, 9);
    const p = quoterBedGrid(buildBench('phone'));
    expect([p.cols, p.rows]).toEqual([32, 24]);
    expect(p.pitch).toBeCloseTo(0.3, 9);
    expect(p.minX).toBeCloseTo(ox - 4.8, 9);
    expect(p.minZ).toBeCloseTo(oz - 3.6, 9);
  });
});

describe('bedCell', () => {
  const g = quoterBedGrid(buildBench('desktop'));
  /** A point given in the quoter's local frame (the bed centred on its origin). */
  const at = (x: number, z: number) => bedCell(g, ox + x, oz + z);
  it('maps a bench point to the cell under it: col = floor((x − bedMinX) / pitch), row likewise in z', () => {
    expect(at(-4.725, -3.525)).toEqual({ col: 0, row: 0 });
    expect(at(4.725, 3.525)).toEqual({ col: 63, row: 47 });
    expect(at(-1.275, 0.1)).toEqual({ col: 23, row: 24 });
    expect(at(0.01, -0.01)).toEqual({ col: 32, row: 23 });
    expect(at(-0.01, 0.01)).toEqual({ col: 31, row: 24 });
  });
  it('clamps the column to the bed, so the frame beyond either end still reads the end market', () => {
    expect(at(-5.9, 0).col).toBe(0);
    expect(at(5.9, 0).col).toBe(63);
  });
});

describe('ouStep', () => {
  it("is the shader's texture row: floor(mt · 8) mod 2048", () => {
    expect(ouStep(0, 8, OU.steps)).toBe(0);
    expect(ouStep(1.2, 8, OU.steps)).toBe(9);
    expect(ouStep(255.99, 8, OU.steps)).toBe(2047);
    expect(ouStep(256, 8, OU.steps)).toBe(0);
    expect(ouStep(256.2, 8, OU.steps)).toBe(1);
  });
});

describe('readQuote', () => {
  // A synthetic tape: no fills anywhere except market 5 at steps 0, 1, 100, 2040 and 2047, and one on market 6 at step 10.
  const tape = new Uint8Array(OU.markets * OU.steps * 4).fill(255);
  const at = (m: number, s: number) => (s * OU.markets + m) * 4;
  for (const s of [0, 1, 100, 2040, 2047]) tape[at(5, s) + 3] = 0;
  tape[at(6, 10) + 3] = 0;
  tape.set([30, 3, 2], at(5, 10));

  it('reads the mid and his quotes as levels: bid = mid − bid offset, ask = mid + ask offset', () => {
    const q = readQuote(tape, 5, 10, { mid: 0, bid: 0, ask: 0, fills: 0 });
    expect(q).toMatchObject({ mid: 30, bid: 27, ask: 32 });
  });

  it('counts the fill flags (steps since fill = 0) in this market over the last 64 steps, wrapping the tape', () => {
    const fills = (s: number) => readQuote(tape, 5, s, { mid: 0, bid: 0, ask: 0, fills: 0 }).fills;
    expect(FILL_WINDOW).toBe(64);
    expect(fills(10)).toBe(4);    // 2019..2047, 0..10: 0, 1, 2040, 2047; market 6's fill at 10 is another market's
    expect(fills(62)).toBe(3);    // 2047, 0..62
    expect(fills(63)).toBe(2);    // 0..63
    expect(fills(64)).toBe(1);    // 1..64
    expect(fills(65)).toBe(0);    // 2..65
    expect(fills(100)).toBe(1);   // 37..100
    expect(fills(163)).toBe(1);   // 100..163
    expect(fills(164)).toBe(0);   // 101..164
  });

  it('writes into the object it is given and returns it, so the frame allocates nothing', () => {
    const out = { mid: 0, bid: 0, ask: 0, fills: 0 };
    expect(readQuote(tape, 5, 10, out)).toBe(out);
  });
});

describe('HOVER_SECTIONS', () => {
  it('raycasts only where the quoter bed is the subject: 02, 04 and 08', () => {
    expect([...HOVER_SECTIONS]).toEqual([SECTION_INDEX.more, SECTION_INDEX.kalshi, SECTION_INDEX.alive]);
  });
});

describe('createHover', () => {
  it('builds one invisible 12 × 8 plane at the bed height (y 0.2), centred on the quoter placement, facing up', () => {
    const { h } = driver();
    const m = h.mesh;
    expect(m.visible).toBe(false);
    const geo = m.geometry as THREE.PlaneGeometry;
    expect(geo.parameters.width).toBe(HOVER_PLANE.w);
    expect(geo.parameters.height).toBe(HOVER_PLANE.d);
    expect([HOVER_PLANE.w, HOVER_PLANE.d, HOVER_PLANE.y]).toEqual([12, 8, 0.2]);
    expect(m.position.toArray()).toEqual([ox, 0.2, oz]);
    const up = new THREE.Vector3(0, 0, 1).applyQuaternion(m.quaternion);
    expect(up.y).toBeCloseTo(1, 9);
    expect(h.pointer.until).toBe(-Infinity);   // no pointer until one moves
  });
});

describe('stepHover', () => {
  it('raycasts the pointer onto the bed, lifts that column (uHover = (0, col)) and writes the readout from the OU tape at the quoter clock', () => {
    const { h, uniforms } = driver();
    uniforms.uMachineTime.value[MACHINE.quoter] = 3.3;   // step 26
    Object.assign(h.pointer, { x: W / 2, y: H / 2, until: Infinity });
    stepHover(h, cameraOn('desktop', 23, 10), W, H, 0);
    expect(uniforms.uHover.value.toArray()).toEqual([MACHINE.quoter, 23]);
    expect(hud.hover).toEqual({ machine: MACHINE.quoter, col: 23, x: W / 2, y: H / 2, ...expectedQuote(23, 3.3) });
  });

  it('follows the machine clock: a later quoter time reads a later row of the tape', () => {
    const { h, uniforms } = driver();
    Object.assign(h.pointer, { x: W / 2, y: H / 2, until: Infinity });
    const cam = cameraOn('desktop', 40, 30);
    for (const mt of [0, 7.9, 300.05]) {
      uniforms.uMachineTime.value[MACHINE.quoter] = mt;
      stepHover(h, cam, W, H, 0);
      expect(hud.hover, `mt ${mt}`).toMatchObject({ col: 40, ...expectedQuote(40, mt) });
    }
  });

  it('uses the phone lattice on phone: 32 columns at pitch 0.30', () => {
    const { h, uniforms } = driver('phone');
    Object.assign(h.pointer, { x: W / 2, y: H / 2, until: Infinity });
    stepHover(h, cameraOn('phone', 20, 5), W, H, 0);
    expect(uniforms.uHover.value.toArray()).toEqual([MACHINE.quoter, 20]);
  });

  it('clears the lift and hides the readout when the pointer leaves the window', () => {
    const { h, uniforms } = driver();
    const cam = cameraOn('desktop', 23, 10);
    Object.assign(h.pointer, { x: W / 2, y: H / 2, until: Infinity });
    stepHover(h, cam, W, H, 0);
    h.pointer.until = -Infinity;
    stepHover(h, cam, W, H, 0);
    expect(uniforms.uHover.value.toArray()).toEqual([-1, -1]);
    expect(hud.hover.machine).toBe(-1);
    expect(hud.hover.col).toBe(-1);
  });

  it('clears when the ray misses the plane', () => {
    const { h, uniforms } = driver();
    const cam = cameraOn('desktop', 23, 10);
    Object.assign(h.pointer, { x: W / 2, y: H / 2, until: Infinity });
    stepHover(h, cam, W, H, 0);
    h.pointer.y = 0;   // the top edge: the ray passes over the far rail
    stepHover(h, cam, W, H, 0);
    expect(uniforms.uHover.value.toArray()).toEqual([-1, -1]);
    expect(hud.hover.machine).toBe(-1);
  });

  it('only raycasts in 02, 04 and 08; anywhere else the bed is not hoverable', () => {
    const { h, uniforms } = driver();
    const cam = cameraOn('desktop', 23, 10);
    Object.assign(h.pointer, { x: W / 2, y: H / 2, until: Infinity });
    for (const id of ['sentence', 'first', 'heron', 'darch', 'summers', 'yours']) {
      hud.section = SECTION_INDEX[id];
      stepHover(h, cam, W, H, 0);
      expect(uniforms.uHover.value.toArray(), id).toEqual([-1, -1]);
      expect(hud.hover.machine, id).toBe(-1);
    }
    for (const id of ['more', 'kalshi', 'alive']) {
      hud.section = SECTION_INDEX[id];
      stepHover(h, cam, W, H, 0);
      expect(uniforms.uHover.value.toArray(), id).toEqual([MACHINE.quoter, 23]);
    }
  });

  it('holds a tap for 2 s, then lets it go', () => {
    const { h, uniforms } = driver('phone');
    const cam = cameraOn('phone', 20, 5);
    const t = 5000;
    Object.assign(h.pointer, { x: W / 2, y: H / 2, until: t + TAP_HOLD_MS });
    expect(TAP_HOLD_MS).toBe(2000);
    stepHover(h, cam, W, H, t);
    expect(hud.hover.machine).toBe(MACHINE.quoter);
    stepHover(h, cam, W, H, t + TAP_HOLD_MS - 1);
    expect(hud.hover.machine).toBe(MACHINE.quoter);
    stepHover(h, cam, W, H, t + TAP_HOLD_MS);
    expect(hud.hover.machine).toBe(-1);
    expect(uniforms.uHover.value.toArray()).toEqual([-1, -1]);
  });
});
