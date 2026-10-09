// Static structures (spec §4.2 to §4.6, §6 Buildings and Windows): every building body merged into one vertex-coloured
// geometry, and the lit window quads as instance data. Pure: three core classes only, runs in Node. Everything faces
// +z (the river and the camera). Dimensions are the spec's; placement comes from layout.ts.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { EmitterId, Vec3 } from '@/valley/types';
import { PLACES } from '@/valley/layout';
import { EMITTERS } from '@/valley/lights';
import { PALETTE } from '@/valley/palette';
import { heightAt } from '@/valley/terrain';
import { EMITTER_INDEX } from './projection';

export interface BuildingSize { w: number; h: number; d: number; rise: number }

export const BUILDING_SIZES = {
  hut: { w: 3, h: 2.5, d: 3, rise: 1.5 },
  cabin: { w: 2.5, h: 2, d: 2.5, rise: 1.0 },
  cabinB: { w: 2.5, h: 2, d: 2.5, rise: 0.7 },
  bar: { w: 5, h: 3, d: 4, rise: 0.6 },
  bar1: { w: 4.4, h: 2.8, d: 3.6, rise: 0.5 },
  bar2: { w: 5.8, h: 3.3, d: 4.2, rise: 0.8 },
  bar3: { w: 4.8, h: 2.6, d: 4.0, rise: 0.4 },
  bar4: { w: 5.2, h: 3.1, d: 3.6, rise: 0.7 },
  mill: { w: 14, h: 5.5, d: 7, rise: 1.6 },
} as const satisfies Record<string, BuildingSize>;

export const LAMP_POST = { w: 0.12, h: 1.2, head: 0.3 } as const;
/** Walls extend this far below the place's y so uneven ground never shows a gap. */
export const PLINTH = 1;
export const WINDOW_OFFSET = 0.03;
const OVERHANG_X = 0.3;
const OVERHANG_Z = 0.4;

const DEG = Math.PI / 180;
/** Seat the base this far below the lowest footprint corner. */
const SEAT = 0.15;

export interface Body { key: string; place: Vec3; size: BuildingSize; yaw: number; setback: number }

const BODIES: readonly Body[] = [
  { key: 'hut', place: PLACES.hut, size: BUILDING_SIZES.hut, yaw: 0, setback: 0 },
  { key: 'nist', place: PLACES.nist, size: BUILDING_SIZES.cabin, yaw: 0, setback: 0 },
  { key: 'wvu', place: PLACES.wvu, size: BUILDING_SIZES.cabinB, yaw: 0, setback: 0 },
  { key: 'bar1', place: PLACES.bar1, size: BUILDING_SIZES.bar1, yaw: -9 * DEG, setback: 1.2 },
  { key: 'bar2', place: PLACES.bar2, size: BUILDING_SIZES.bar2, yaw: 6 * DEG, setback: -0.8 },
  { key: 'bar3', place: PLACES.bar3, size: BUILDING_SIZES.bar3, yaw: -4 * DEG, setback: 0.4 },
  { key: 'bar4', place: PLACES.bar4, size: BUILDING_SIZES.bar4, yaw: 11 * DEG, setback: -1.4 },
  { key: 'mill', place: PLACES.mill, size: BUILDING_SIZES.mill, yaw: 0, setback: 0 },
];

/** World x, z of a body-local offset (lx, lz) from the body centre, after yaw about +y and the z setback. */
function bodyPoint(b: Body, lx: number, lz: number): [number, number] {
  const c = Math.cos(b.yaw);
  const s = Math.sin(b.yaw);
  return [b.place[0] + lx * c + lz * s, b.place[2] + b.setback - lx * s + lz * c];
}

/** The body's four footprint corners on the ground plane (roof overhang excluded). */
export function footprintCorners(b: Body): [number, number][] {
  const hw = b.size.w / 2;
  const hd = b.size.d / 2;
  return [bodyPoint(b, -hw, -hd), bodyPoint(b, hw, -hd), bodyPoint(b, hw, hd), bodyPoint(b, -hw, hd)];
}

/** Base y of a body: the lowest ground under its footprint corners, less SEAT. */
export function bodyBase(b: Body): number {
  let low = Infinity;
  for (const [x, z] of footprintCorners(b)) low = Math.min(low, heightAt(x, z));
  return low - SEAT;
}

export function buildingBodies(): readonly Body[] {
  return BODIES;
}

function paint(g: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  const n = g.getAttribute('position').count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    c[i * 3] = color.r;
    c[i * 3 + 1] = color.g;
    c[i * 3 + 2] = color.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

function box(w: number, h: number, d: number, x: number, y: number, z: number, color: THREE.Color): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  g.deleteAttribute('uv');
  g.translate(x, y, z);
  return paint(g, color);
}

/** A gabled roof: base w x d at y = 0, ridge along x at height rise over z = 0. Flat normals, no bottom face. */
function prism(w: number, d: number, rise: number, x: number, y: number, z: number, color: THREE.Color): THREE.BufferGeometry {
  const hw = w / 2;
  const hd = d / 2;
  const A = [-hw, 0, -hd], B = [hw, 0, -hd], C = [hw, 0, hd], D = [-hw, 0, hd];
  const E = [-hw, rise, 0], F = [hw, rise, 0];
  const tris = [D, C, F, D, F, E, B, A, E, B, E, F, A, D, E, C, B, F];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(tris.flat()), 3));
  g.computeVertexNormals();
  g.translate(x, y, z);
  return paint(g, color);
}

/** Every static body in one geometry: hut, cabins, bars, mill (walls + roof) and the kalshi lamp post. */
export function buildingsGeometry(): THREE.BufferGeometry {
  const wall = new THREE.Color(PALETTE.wall);
  const roof = new THREE.Color(PALETTE.roof);
  const parts: THREE.BufferGeometry[] = [];
  for (const b of BODIES) {
    const { size } = b;
    const [x, y] = b.place;
    const z = b.place[2] + b.setback;
    const bottom = bodyBase(b) - PLINTH;
    const top = y + size.h;
    const walls = box(size.w, top - bottom, size.d, 0, (top + bottom) / 2, 0, wall);
    const gable = prism(size.w + OVERHANG_X, size.d + OVERHANG_Z, size.rise, 0, top, 0, roof);
    for (const g of [walls, gable]) {
      g.rotateY(b.yaw);
      g.translate(x, 0, z);
      parts.push(g);
    }
  }
  const [lx, ly, lz] = PLACES.kalshiLamp;
  parts.push(box(LAMP_POST.w, LAMP_POST.h + PLINTH, LAMP_POST.w, lx, ly + (LAMP_POST.h - PLINTH) / 2, lz, wall));
  parts.push(box(LAMP_POST.head, LAMP_POST.head, LAMP_POST.head, lx, ly + LAMP_POST.h + LAMP_POST.head / 2, lz, roof));
  const merged = mergeGeometries(parts, false);
  if (!merged) throw new Error('buildingsGeometry: merge failed');
  parts.forEach((p) => p.dispose());
  merged.computeBoundingSphere();
  return merged;
}

export interface WindowSpec { emitter: EmitterId; center: Vec3; w: number; h: number; color: string; row: number; yaw?: number; dim?: boolean }

const colorOf = (id: EmitterId) => EMITTERS[EMITTER_INDEX[id]].color;

/** The 32 static lit quads (spec §4.2 to §4.6). Stage 4 appends hillside and visitor windows with pushWindow. */
export function staticWindows(): WindowSpec[] {
  const out: WindowSpec[] = [];
  const front = (place: Vec3, d: number) => place[2] + d / 2 + WINDOW_OFFSET;

  const hut = PLACES.hut;
  out.push({ emitter: 'hut', center: [hut[0], hut[1] + 1.3, front(hut, BUILDING_SIZES.hut.d)], w: 0.8, h: 0.6, color: colorOf('hut'), row: -1 });

  for (const id of ['nist', 'wvu'] as const) {
    const p = PLACES[id];
    out.push({ emitter: id, center: [p[0], p[1] + 1.1, front(p, BUILDING_SIZES.cabin.d)], w: 0.7, h: 0.6, color: colorOf(id), row: -1 });
  }

  for (const body of BODIES.filter((x) => x.key.startsWith('bar'))) {
    const id = body.key as 'bar1' | 'bar2' | 'bar3' | 'bar4';
    const { w, d } = body.size;
    const spec = (lx: number, ly: number, qw: number, qh: number, color: string): WindowSpec => {
      const [wx, wz] = bodyPoint(body, lx, d / 2 + WINDOW_OFFSET);
      return { emitter: id, center: [wx, heightAt(wx, wz) + ly, wz], w: qw, h: qh, color, row: -1, yaw: body.yaw };
    };
    // Door height from the ground at the pane's own spot: a pane whose sill is a step above the ground.
    out.push(spec(-0.6, 0.55 + 0.15, 0.9, 1.1, PALETTE.warm));
    out.push(spec(w / 2 - 0.6, 1.9, 0.3, 0.3, PALETTE.porch));
  }

  const mill = PLACES.mill;
  const MILL_W = [0.55, 0.8, 0.65, 0.9, 0.6];
  const MILL_H = [0.8, 0.7, 0.85, 0.75, 0.8];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      out.push({
        emitter: 'mill',
        center: [mill[0] + (c - 2) * 2.4 + (r % 2 === 1 ? 1.2 : 0), mill[1] + 0.9 + r * 1.05, front(mill, BUILDING_SIZES.mill.d)],
        w: MILL_W[c], h: MILL_H[c], color: colorOf('mill'), row: r,
        dim: (r === 3 && c === 4) || (r === 0 && c === 0),
      });
    }
  }

  const lamp = PLACES.kalshiLamp;
  out.push({
    emitter: 'kalshiLamp',
    center: [lamp[0], lamp[1] + LAMP_POST.h + LAMP_POST.head / 2, lamp[2] + LAMP_POST.head / 2 + WINDOW_OFFSET],
    w: 0.25, h: 0.25, color: colorOf('kalshiLamp'), row: -1,
  });
  return out;
}

export const STATIC_WINDOW_COUNT = 32;
export const WINDOW_CAPACITY = 512;

export interface WindowSet {
  count: number;
  matrices: Float32Array;   // 16 per slot, column-major
  colors: Float32Array;     // linear rgb per slot
  rows: Float32Array;       // mill row 0..3, -1 elsewhere
  lit: Float32Array;        // aLit per slot, written by the driver
  emitterOf: Uint8Array;    // EMITTERS index per slot
}

const _m = new THREE.Matrix4();
const _c = new THREE.Color();
const _s = new THREE.Vector3();
/** A dim window keeps its instance (so a mill row still has five) at this fraction of its colour. */
const DIM = 0.25;

export function pushWindow(set: WindowSet, spec: WindowSpec): number {
  if (set.count >= WINDOW_CAPACITY) return -1;
  const i = set.count;
  _m.makeRotationY(spec.yaw ?? 0).scale(_s.set(spec.w, spec.h, 1)).setPosition(spec.center[0], spec.center[1], spec.center[2]).toArray(set.matrices, i * 16);
  _c.set(spec.color);
  if (spec.dim) _c.multiplyScalar(DIM);
  _c.toArray(set.colors, i * 3);
  set.rows[i] = spec.row;
  set.lit[i] = 0;
  set.emitterOf[i] = EMITTER_INDEX[spec.emitter];
  set.count = i + 1;
  return i;
}

export function createWindowSet(specs: readonly WindowSpec[] = staticWindows()): WindowSet {
  const set: WindowSet = {
    count: 0,
    matrices: new Float32Array(WINDOW_CAPACITY * 16),
    colors: new Float32Array(WINDOW_CAPACITY * 3),
    rows: new Float32Array(WINDOW_CAPACITY),
    lit: new Float32Array(WINDOW_CAPACITY),
    emitterOf: new Uint8Array(WINDOW_CAPACITY),
  };
  for (const s of specs) pushWindow(set, s);
  return set;
}
