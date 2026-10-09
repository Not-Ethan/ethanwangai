import { describe, it, expect } from 'vitest';
import { Color } from 'three';
import { houseFromSentence } from '@/valley/house';
import { PALETTE } from '@/valley/palette';
import { PLACES } from '@/valley/layout';
import { heightAt } from '@/valley/terrain';
import {
  HILL_IDS, HOUSE_ROOF, HOUSE_SCALE, HOUSE_WALL, SCAFFOLD_BARS, WINDOW_H, WINDOW_W,
  clipConstant, hillsideData, houseMeshData, mergeMeshData, scaffoldBars, seatY, toBufferGeometry,
} from './houseGeometry';

const HILLSIDE = [
  'a discord bot for my middle school server',
  'a trading algorithm for kalshi',
  'a pipeline that made three thousand videos a month',
  'a help-desk assistant that reads the docs for you',
  'a pricing model for free-drinks promos at bars',
];

function flatValues(o: unknown): unknown[] {
  return typeof o === 'object' && o !== null ? Object.values(o).flatMap(flatValues) : [o];
}
function allFinite(a: Float32Array): boolean {
  for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) return false;
  return true;
}

describe('houseMeshData', () => {
  const house = houseFromSentence('a trading algorithm for kalshi');
  const [x, , z] = PLACES.lot;
  const d = houseMeshData(house, x, z);

  it('emits one 24-vertex, 36-index box per part', () => {
    expect(d.partCount).toBe(house.parts.length);
    expect(d.positions.length).toBe(house.parts.length * 24 * 3);
    expect(d.normals.length).toBe(d.positions.length);
    expect(d.colors.length).toBe(d.positions.length);
    expect(d.indices.length).toBe(house.parts.length * 36);
    let max = 0;
    for (const i of d.indices) max = Math.max(max, i);
    expect(max).toBe(house.parts.length * 24 - 1);
  });

  it('keeps the parts in build order, so a rising clip plane reveals them in order (spec §5.4, §6)', () => {
    const blockMin = (i: number, axis: number) => {
      let m = Infinity;
      for (let v = 0; v < 24; v++) m = Math.min(m, d.positions[(i * 24 + v) * 3 + axis]);
      return m;
    };
    const n = house.parts.length;
    for (const i of [1, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1]) {
      for (const axis of [0, 1, 2]) {
        // Posts reach down to the slope, so their y is not a pure scale of the grammar's.
        if (axis === 1 && (house.parts[i].kind === 'post' || house.parts[0].kind === 'post')) continue;
        expect(blockMin(i, axis) - blockMin(0, axis)).toBeCloseTo((house.parts[i].min[axis] - house.parts[0].min[axis]) * HOUSE_SCALE, 4);
      }
    }
  });

  it('is deterministic: the same sentence builds the same arrays', () => {
    const again = houseMeshData(houseFromSentence('a trading algorithm for kalshi'), x, z);
    expect(again.positions).toEqual(d.positions);
    expect(again.colors).toEqual(d.colors);
    expect(again.indices).toEqual(d.indices);
  });

  it('sits on its site: centred in x and z, seated at or below the ground', () => {
    expect((d.min[0] + d.max[0]) / 2).toBeCloseTo(x, 4);
    expect((d.min[2] + d.max[2]) / 2).toBeCloseTo(z, 4);
    expect(d.min[1]).toBeLessThanOrEqual(heightAt(x, z));
    expect(d.max[1] - d.min[1]).toBeGreaterThan(1.2);
  });

  it('colours every part from the palette wall or roof colour, scaled 0.9 to 1.1', () => {
    const values = flatValues(PALETTE);
    expect(values).toContain(HOUSE_WALL);
    expect(values).toContain(HOUSE_ROOF);
    const wall = new Color(HOUSE_WALL);
    const roof = new Color(HOUSE_ROOF);
    for (let p = 0; p < house.parts.length; p++) {
      const o = p * 24 * 3;
      const base = house.parts[p].kind === 'slat' || house.parts[p].kind === 'chimney' ? roof : wall;
      const k = d.colors[o] / base.r;
      expect(k).toBeGreaterThanOrEqual(0.9 - 1e-5);
      expect(k).toBeLessThanOrEqual(1.1 + 1e-5);
      expect(d.colors[o + 1]).toBeCloseTo(base.g * k, 5);
      expect(d.colors[o + 2]).toBeCloseTo(base.b * k, 5);
    }
  });

  it('turns every grammar window into an axis-facing quad outside the walls', () => {
    expect(d.windows).toHaveLength(house.windows.length);
    for (const w of d.windows) {
      expect(Math.abs(w.normal[0]) + Math.abs(w.normal[1]) + Math.abs(w.normal[2])).toBe(1);
      expect(w.normal[1]).toBe(0);
      expect(w.width).toBeCloseTo(WINDOW_W * HOUSE_SCALE, 9);
      expect(w.height).toBeCloseTo(WINDOW_H * HOUSE_SCALE, 9);
      expect(w.center[1]).toBeGreaterThan(d.min[1]);
      expect(w.center[1]).toBeLessThan(d.max[1]);
    }
    if (house.windowsPerFace.front > 0) expect(d.windows.some((w) => w.normal[2] === 1)).toBe(true);
  });

  it('never yields an empty or NaN house (index Review Focus 1)', () => {
    for (const s of ['', '   ', 'x'.repeat(60), 'word '.repeat(40)]) {
      const h = houseFromSentence(s);
      const m = houseMeshData(h, x, z);
      expect(m.partCount).toBeGreaterThan(0);
      expect(allFinite(m.positions)).toBe(true);
      expect(allFinite(m.colors)).toBe(true);
    }
  });
});

describe('clipConstant', () => {
  it('clips everything at cut 0 and nothing at cut 1', () => {
    expect(clipConstant(2, 8, 0)).toBeLessThan(2);
    expect(clipConstant(2, 8, 1)).toBeGreaterThan(8);
    expect(clipConstant(2, 8, 0.5)).toBeCloseTo(5, 1);
  });
});

describe('scaffoldBars', () => {
  it('stands 18 bars, a front row of 9 and a back row of 9, taller than the house', () => {
    const bars = scaffoldBars([0, 1, 0], [6, 7, 4]);
    expect(bars).toHaveLength(SCAFFOLD_BARS);
    for (let i = 0; i < 9; i++) expect(bars[i].z).toBeGreaterThan(4);
    for (let i = 9; i < 18; i++) expect(bars[i].z).toBeLessThan(0);
    for (const b of bars) {
      expect(b.y).toBe(1);
      expect(b.h).toBeGreaterThan(6);
      expect(b.x).toBeGreaterThanOrEqual(-0.3 - 1e-9);
      expect(b.x).toBeLessThanOrEqual(6.3 + 1e-9);
    }
    expect(bars[0].x).toBeCloseTo(bars[9].x, 9);
  });
});

describe('hillsideData', () => {
  const h = hillsideData(HILLSIDE);
  it('builds the five §3.2 houses, one window group per hill emitter, in hill order', () => {
    expect(h.houses).toHaveLength(5);
    expect(h.windows.map((w) => w.emitter)).toEqual([...HILL_IDS]);
    h.houses.forEach((house, i) => {
      expect(house.parts.length).toBeGreaterThanOrEqual(150);
      expect(house.parts.length).toBeLessThanOrEqual(2200);
      expect(h.windows[i].quads).toHaveLength(house.windows.length);
    });
  });
  it('merges all five into one mesh with offset indices', () => {
    const parts = h.houses.reduce((s, x) => s + x.parts.length, 0);
    expect(h.mesh.positions.length).toBe(parts * 72);
    expect(h.mesh.indices.length).toBe(parts * 36);
    let max = 0;
    for (const i of h.mesh.indices) max = Math.max(max, i);
    expect(max).toBe(parts * 24 - 1);
  });
  it('places each house on its own site', () => {
    h.windows.forEach((w, i) => {
      const p = PLACES[HILL_IDS[i]];
      for (const q of w.quads) {
        expect(Math.abs(q.center[0] - p[0])).toBeLessThan(8);
        expect(Math.abs(q.center[2] - p[2])).toBeLessThan(5);
      }
    });
  });
});

function extent(m: { positions: Float32Array }, axis: number): [number, number] {
  let lo = Infinity, hi = -Infinity;
  for (let i = axis; i < m.positions.length; i += 3) { lo = Math.min(lo, m.positions[i]); hi = Math.max(hi, m.positions[i]); }
  return [lo, hi];
}

describe('hut scale and seating', () => {
  it('keeps the widest hillside house at most 5 units wide in x', () => {
    let widest = 0;
    HILL_IDS.forEach((id, i) => {
      const p = PLACES[id];
      const m = houseMeshData(houseFromSentence(HILLSIDE[i]), p[0], p[2]);
      const [a, b] = extent(m, 0);
      widest = Math.max(widest, b - a);
    });
    expect(widest).toBeLessThanOrEqual(5);
    expect(widest).toBeGreaterThan(2);
  });

  it('scales the mesh bounds linearly with HOUSE_SCALE', () => {
    const house = houseFromSentence(HILLSIDE[1]);
    const p = PLACES.hill2;
    const m = houseMeshData(house, p[0], p[2]);
    const wx = extent(m, 0), wz = extent(m, 2);
    // Grammar-space extent (scale 1) of the same parts.
    let lx0 = Infinity, lx1 = -Infinity, lz0 = Infinity, lz1 = -Infinity;
    for (const q of house.parts) {
      lx0 = Math.min(lx0, q.min[0]); lx1 = Math.max(lx1, q.max[0]);
      lz0 = Math.min(lz0, q.min[2]); lz1 = Math.max(lz1, q.max[2]);
    }
    expect(wx[1] - wx[0]).toBeCloseTo((lx1 - lx0) * HOUSE_SCALE, 4);
    expect(wz[1] - wz[0]).toBeCloseTo((lz1 - lz0) * HOUSE_SCALE, 4);
  });

  it('stands posts on the slope and the lowest wall plank at or below every wall corner', () => {
    HILL_IDS.forEach((id, i) => {
      const house = houseFromSentence(HILLSIDE[i]);
      const p = PLACES[id];
      const m = houseMeshData(house, p[0], p[2]);
      let wallLow = Infinity, wx0 = Infinity, wx1 = -Infinity, wz0 = Infinity, wz1 = -Infinity;
      house.parts.forEach((q, k) => {
        const [x0, x1] = extent({ positions: m.positions.subarray(k * 72, k * 72 + 72) }, 0);
        const [y0] = extent({ positions: m.positions.subarray(k * 72, k * 72 + 72) }, 1);
        const [z0, z1] = extent({ positions: m.positions.subarray(k * 72, k * 72 + 72) }, 2);
        if (q.kind === 'post') expect(y0).toBeLessThanOrEqual(heightAt((x0 + x1) / 2, (z0 + z1) / 2) - 0.2 + 1e-4);
        if (q.kind === 'plank') {
          wallLow = Math.min(wallLow, y0);
          wx0 = Math.min(wx0, x0); wx1 = Math.max(wx1, x1); wz0 = Math.min(wz0, z0); wz1 = Math.max(wz1, z1);
        }
      });
      for (const [cx, cz] of [[wx0, wz0], [wx1, wz0], [wx0, wz1], [wx1, wz1]]) {
        expect(wallLow).toBeLessThanOrEqual(heightAt(cx, cz) + 1e-4);
      }
      expect(wallLow).toBeCloseTo(seatY((wx0 + wx1) / 2, (wz0 + wz1) / 2, (wx1 - wx0) / 2, (wz1 - wz0) / 2), 4);
    });
  });
});

describe('mergeMeshData and toBufferGeometry', () => {
  it('wraps the arrays in an indexed geometry with position, normal and color', () => {
    const a = houseMeshData(houseFromSentence('one'), 0, 10);
    const b = houseMeshData(houseFromSentence('two words'), 10, 10);
    const m = mergeMeshData([a, b]);
    expect(m.indices[a.indices.length]).toBe(a.indices[0] + a.positions.length / 3);
    const g = toBufferGeometry(m);
    expect(g.getIndex()!.count).toBe(m.indices.length);
    expect(g.getAttribute('position').count).toBe(m.positions.length / 3);
    expect(g.getAttribute('normal').count).toBe(m.positions.length / 3);
    expect(g.getAttribute('color').count).toBe(m.positions.length / 3);
    expect(g.boundingSphere).not.toBeNull();
  });
});
