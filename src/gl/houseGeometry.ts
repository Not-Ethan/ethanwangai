// House parts → world-space mesh arrays (spec §4.7, §5.4, §6, §9). Uses only three's math and geometry classes, which
// run in Node, so it is tested without a renderer. Hillside.tsx, VisitorHouse.tsx and Scaffold.tsx wrap its output.
//
// HOUSE_SCALE (0.5) shrinks every grammar house uniformly about its seat point (footprint centre in x and z, wall base in
// y): part boxes, window quads and the scaffold layout (which reads the scaled bounds) all scale together, so a 6-bay
// house is 3 units wide, the hut's size. Part counts are unchanged (spec §5.4's parts are the build units); only their
// world size shrinks. The seat is the lowest corner of the wall (plank) footprint, sunk SINK; porch posts are extended
// down to the slope under each of them.
import { BoxGeometry, BufferAttribute, BufferGeometry, Color } from 'three';
import type { House, Vec3 } from '@/valley/types';
import { PALETTE } from '@/valley/palette';
import { PLACES } from '@/valley/layout';
import { heightAt } from '@/valley/terrain';
import { mulberry32 } from '@/valley/rng';
import { houseFromSentence } from '@/valley/house';

/** §9: house bodies use the building wall and roof colours. */
export const HOUSE_WALL: string = PALETTE.wall;
export const HOUSE_ROOF: string = PALETTE.roof;

export const WINDOW_W = 0.8;          // the hut's window (§4.2); the grammar gives positions, not sizes
export const WINDOW_H = 0.6;
const WINDOW_OUT = 0.03;              // quads sit this far outside the wall so they never z-fight
const SINK = 0.25;                    // seat below the lowest wall corner so no edge floats on the slope
const POST_SINK = 0.2;                // porch posts end this far below the ground at their own (x, z)
/** Uniform world scale of every grammar house, about its seat point. */
export const HOUSE_SCALE = 0.7;
export const SCAFFOLD_BARS = 18;      // §5.5, §6
export const SCAFFOLD_THICKNESS = 0.1;

export const HILL_IDS = ['hill1', 'hill2', 'hill3', 'hill4', 'hill5'] as const;
export type HillId = (typeof HILL_IDS)[number];

export interface WindowQuad { center: Vec3; normal: Vec3; width: number; height: number }
export interface MeshArrays { positions: Float32Array; normals: Float32Array; colors: Float32Array; indices: Uint32Array }
export interface HouseMeshData extends MeshArrays { partCount: number; min: Vec3; max: Vec3; windows: WindowQuad[] }
export interface ScaffoldBar { x: number; y: number; z: number; h: number }

// One unit box, centred at the origin: 24 vertices (4 per face, flat normals), 36 indices, correct winding.
const UNIT = new BoxGeometry(1, 1, 1);
const UNIT_POS = UNIT.getAttribute('position').array;
const UNIT_NRM = UNIT.getAttribute('normal').array;
const UNIT_IDX = UNIT.getIndex()!.array;
const BOX_VERTS = 24;
const BOX_INDICES = 36;

/** The height a footprint of half-size halfW × halfD centred at (x, z) sits at: its lowest corner, minus SINK. */
export function seatY(x: number, z: number, halfW: number, halfD: number): number {
  return Math.min(
    heightAt(x, z),
    heightAt(x - halfW, z - halfD), heightAt(x + halfW, z - halfD),
    heightAt(x - halfW, z + halfD), heightAt(x + halfW, z + halfD),
  ) - SINK;
}

function windowQuad(w: Vec3, lo: number[], hi: number[]): WindowQuad {
  // Nearest wall face: 0 = −x, 1 = +x, 2 = −z (back), 3 = +z (front, toward the camera).
  const d = [Math.abs(w[0] - lo[0]), Math.abs(hi[0] - w[0]), Math.abs(w[2] - lo[2]), Math.abs(hi[2] - w[2])];
  let k = 0;
  for (let j = 1; j < 4; j++) if (d[j] < d[k]) k = j;
  const normal: Vec3 = k === 0 ? [-1, 0, 0] : k === 1 ? [1, 0, 0] : k === 2 ? [0, 0, -1] : [0, 0, 1];
  const lx = k === 0 ? lo[0] - WINDOW_OUT : k === 1 ? hi[0] + WINDOW_OUT : w[0];
  const lz = k === 2 ? lo[2] - WINDOW_OUT : k === 3 ? hi[2] + WINDOW_OUT : w[2];
  return { center: [lx, w[1], lz], normal, width: WINDOW_W * HOUSE_SCALE, height: WINDOW_H * HOUSE_SCALE };
}

/** One house as world-space boxes in `house.parts` order, centred on (x, z) and seated on the terrain. */
export function houseMeshData(house: House, x: number, z: number): HouseMeshData {
  const parts = house.parts;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  let wlo = [Infinity, Infinity, Infinity];
  let whi = [-Infinity, -Infinity, -Infinity];
  for (const p of parts) {
    for (let a = 0; a < 3; a++) {
      lo[a] = Math.min(lo[a], p.min[a]);
      hi[a] = Math.max(hi[a], p.max[a]);
      if (p.kind === 'plank') {
        wlo[a] = Math.min(wlo[a], p.min[a]);
        whi[a] = Math.max(whi[a], p.max[a]);
      }
    }
  }
  if (!Number.isFinite(wlo[0])) { wlo = lo.slice(); whi = hi.slice(); }

  // Local → world, scaled about the footprint centre in x, z and the wall base in y, then seated.
  const cx = (lo[0] + hi[0]) / 2, cz = (lo[2] + hi[2]) / 2;
  const S = HOUSE_SCALE;
  const wallHalfW = ((whi[0] - wlo[0]) / 2) * S, wallHalfD = ((whi[2] - wlo[2]) / 2) * S;
  const wallCx = x + ((wlo[0] + whi[0]) / 2 - cx) * S, wallCz = z + ((wlo[2] + whi[2]) / 2 - cz) * S;
  const baseY = seatY(wallCx, wallCz, wallHalfW, wallHalfD);
  const tx = (v: number) => x + (v - cx) * S;
  const ty = (v: number) => baseY + (v - wlo[1]) * S;
  const tz = (v: number) => z + (v - cz) * S;

  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  const n = parts.length;
  const positions = new Float32Array(n * BOX_VERTS * 3);
  const normals = new Float32Array(n * BOX_VERTS * 3);
  const colors = new Float32Array(n * BOX_VERTS * 3);
  const indices = new Uint32Array(n * BOX_INDICES);
  const rand = mulberry32(house.seed);
  const wall = new Color(HOUSE_WALL);
  const roof = new Color(HOUSE_ROOF);
  const c = new Color();

  for (let i = 0; i < n; i++) {
    const p = parts[i];
    const sx = (p.max[0] - p.min[0]) * S, sz = (p.max[2] - p.min[2]) * S;
    const mx = tx((p.min[0] + p.max[0]) / 2);
    const mz = tz((p.min[2] + p.max[2]) / 2);
    let y0 = ty(p.min[1]);
    const y1 = ty(p.max[1]);
    if (p.kind === 'post') y0 = Math.min(y0, heightAt(mx, mz) - POST_SINK);
    const sy = y1 - y0;
    const my = (y0 + y1) / 2;
    c.copy(p.kind === 'slat' || p.kind === 'chimney' ? roof : wall).multiplyScalar(1.15 + 0.25 * rand());   // a touch lighter than the far-bank boxes: these sit outside the fog
    const vb = i * BOX_VERTS;
    for (let v = 0; v < BOX_VERTS; v++) {
      const o = (vb + v) * 3;
      const u = v * 3;
      positions[o] = mx + UNIT_POS[u] * sx;
      positions[o + 1] = my + UNIT_POS[u + 1] * sy;
      positions[o + 2] = mz + UNIT_POS[u + 2] * sz;
      minX = Math.min(minX, positions[o]); maxX = Math.max(maxX, positions[o]);
      minY = Math.min(minY, positions[o + 1]); maxY = Math.max(maxY, positions[o + 1]);
      minZ = Math.min(minZ, positions[o + 2]); maxZ = Math.max(maxZ, positions[o + 2]);
      normals[o] = UNIT_NRM[u];
      normals[o + 1] = UNIT_NRM[u + 1];
      normals[o + 2] = UNIT_NRM[u + 2];
      colors[o] = c.r;
      colors[o + 1] = c.g;
      colors[o + 2] = c.b;
    }
    const ib = i * BOX_INDICES;
    for (let k = 0; k < BOX_INDICES; k++) indices[ib + k] = vb + UNIT_IDX[k];
  }

  return {
    positions, normals, colors, indices,
    partCount: n,
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    windows: house.windows.map((w) => windowQuad(
      [tx(w[0]), ty(w[1]), tz(w[2])], [tx(wlo[0]), 0, tz(wlo[2])], [tx(whi[0]), 0, tz(whi[2])],
    )),
  };
}

/** Concatenate meshes into one (the hillside's single draw), offsetting indices. */
export function mergeMeshData(list: readonly MeshArrays[]): MeshArrays {
  let v = 0;
  let k = 0;
  for (const m of list) { v += m.positions.length; k += m.indices.length; }
  const out: MeshArrays = {
    positions: new Float32Array(v), normals: new Float32Array(v), colors: new Float32Array(v), indices: new Uint32Array(k),
  };
  let vo = 0;
  let ko = 0;
  for (const m of list) {
    out.positions.set(m.positions, vo);
    out.normals.set(m.normals, vo);
    out.colors.set(m.colors, vo);
    const base = vo / 3;
    for (let i = 0; i < m.indices.length; i++) out.indices[ko + i] = m.indices[i] + base;
    vo += m.positions.length;
    ko += m.indices.length;
  }
  return out;
}

export function toBufferGeometry(m: MeshArrays): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(m.positions, 3));
  g.setAttribute('normal', new BufferAttribute(m.normals, 3));
  g.setAttribute('color', new BufferAttribute(m.colors, 3));
  g.setIndex(new BufferAttribute(m.indices, 1));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

/**
 * Constant for a clip plane with normal (0, −1, 0): three discards points whose signed distance (−y + constant) is
 * negative, i.e. everything above the constant. cut 0 hides the whole house, cut 1 shows all of it (§5.5 `cut`).
 */
export function clipConstant(minY: number, maxY: number, cut: number): number {
  return minY - 0.01 + cut * (maxY - minY + 0.02);
}

/** 18 bars: 0–8 along the front wall, 9–17 along the back, so §5.5's `(idx % 9)` stagger raises them in pairs. */
export function scaffoldBars(min: Vec3, max: Vec3): ScaffoldBar[] {
  const h = max[1] - min[1] + 0.6;
  const x0 = min[0] - 0.3;
  const x1 = max[0] + 0.3;
  const bars: ScaffoldBar[] = [];
  for (let row = 0; row < 2; row++) {
    const z = row === 0 ? max[2] + 0.5 : min[2] - 0.5;
    for (let k = 0; k < 9; k++) bars.push({ x: x0 + ((x1 - x0) * k) / 8, y: min[1], z, h });
  }
  return bars;
}

/** The five §3.2 houses on PLACES.hill1…hill5 (§4.7): one merged mesh plus each house's windows under its emitter. */
export function hillsideData(sentences: readonly string[]): {
  mesh: MeshArrays; windows: { emitter: HillId; quads: WindowQuad[] }[]; houses: House[];
} {
  const houses = HILL_IDS.map((_, i) => houseFromSentence(sentences[i] ?? ''));
  const datas = houses.map((h, i) => {
    const p = PLACES[HILL_IDS[i]];
    return houseMeshData(h, p[0], p[2]);
  });
  return {
    mesh: mergeMeshData(datas),
    windows: datas.map((d, i) => ({ emitter: HILL_IDS[i], quads: d.windows })),
    houses,
  };
}
