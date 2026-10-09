// Static structures (spec §4.2 to §4.6, §6 Buildings and Windows): every building body merged into one vertex-coloured
// geometry, and the lit window quads as instance data. Pure: three core classes only, runs in Node. Everything faces
// +z (the river and the camera). Dimensions are the spec's; placement comes from layout.ts.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { EmitterId, Vec3 } from '@/valley/types';
import { PLACES } from '@/valley/layout';
import { EMITTERS } from '@/valley/lights';
import { PALETTE } from '@/valley/palette';
import { EMITTER_INDEX } from './projection';

export interface BuildingSize { w: number; h: number; d: number; rise: number }

export const BUILDING_SIZES = {
  hut: { w: 3, h: 2.5, d: 3, rise: 1.2 },
  cabin: { w: 2.5, h: 2, d: 2.5, rise: 1.0 },
  bar: { w: 5, h: 3, d: 4, rise: 0.6 },
  mill: { w: 10, h: 9, d: 7, rise: 2.5 },
} as const satisfies Record<string, BuildingSize>;

export const LAMP_POST = { w: 0.12, h: 1.2, head: 0.3 } as const;
/** Walls extend this far below the place's y so uneven ground never shows a gap. */
export const PLINTH = 1;
export const WINDOW_OFFSET = 0.03;
const OVERHANG_X = 0.3;
const OVERHANG_Z = 0.4;

const BODIES: readonly { place: Vec3; size: BuildingSize }[] = [
  { place: PLACES.hut, size: BUILDING_SIZES.hut },
  { place: PLACES.nist, size: BUILDING_SIZES.cabin },
  { place: PLACES.wvu, size: BUILDING_SIZES.cabin },
  { place: PLACES.bar1, size: BUILDING_SIZES.bar },
  { place: PLACES.bar2, size: BUILDING_SIZES.bar },
  { place: PLACES.bar3, size: BUILDING_SIZES.bar },
  { place: PLACES.bar4, size: BUILDING_SIZES.bar },
  { place: PLACES.mill, size: BUILDING_SIZES.mill },
];

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
  for (const { place, size } of BODIES) {
    const [x, y, z] = place;
    parts.push(box(size.w, size.h + PLINTH, size.d, x, y + (size.h - PLINTH) / 2, z, wall));
    parts.push(prism(size.w + OVERHANG_X, size.d + OVERHANG_Z, size.rise, x, y + size.h, z, roof));
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

export interface WindowSpec { emitter: EmitterId; center: Vec3; w: number; h: number; color: string; row: number }

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

  for (const id of ['bar1', 'bar2', 'bar3', 'bar4'] as const) {
    const p = PLACES[id];
    const z = front(p, BUILDING_SIZES.bar.d);
    out.push({ emitter: id, center: [p[0] - 0.8, p[1] + 1.5, z], w: 2.4, h: 1.0, color: colorOf(id), row: -1 });
    out.push({ emitter: id, center: [p[0] + 1.7, p[1] + 2.55, z], w: 0.3, h: 0.3, color: colorOf(id), row: -1 });
  }

  const mill = PLACES.mill;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      out.push({
        emitter: 'mill',
        center: [mill[0] + (c - 2) * 1.8, mill[1] + 1.6 + r * 2.0, front(mill, BUILDING_SIZES.mill.d)],
        w: 1.1, h: 1.2, color: colorOf('mill'), row: r,
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

export function pushWindow(set: WindowSet, spec: WindowSpec): number {
  if (set.count >= WINDOW_CAPACITY) return -1;
  const i = set.count;
  _m.makeScale(spec.w, spec.h, 1).setPosition(spec.center[0], spec.center[1], spec.center[2]).toArray(set.matrices, i * 16);
  _c.set(spec.color).toArray(set.colors, i * 3);
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
