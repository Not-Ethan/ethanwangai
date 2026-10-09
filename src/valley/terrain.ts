// The valley floor (spec §4.1): a 160 × 100 heightfield at 1-unit resolution, centred on the origin, river along +x
// at z ≈ 0. Two-octave value noise plus authored masks: river channel (|z| < 6), near bank rising toward the camera
// (+z) and easing down again before the near edge so the landscape camera's lowest ray still lands on terrain, far
// bank rising north (−z), a hill at the far left, a ridge along the back (crest at z = −38) and a flat mill pad.
// Built once on the CPU; the same function runs in Node for tests. No React, no DOM, no three renderer.
import { Color } from 'three';
import { PALETTE } from './palette';
import { mulberry32 } from './rng';

export const TERRAIN = { width: 160, depth: 100, res: 1 } as const;

/** The mill pad (§4.5): flat at this height within MILL_PAD.flat units of (x, z), blended out by MILL_PAD.blend. */
export const MILL_PAD = { x: 30, z: -12, y: 2.5, flat: 7, blend: 10 } as const;
/** The river bed height inside the channel; the river ribbon sits at y = 0.2 above it (§4.1). */
export const RIVER_BED = -0.8;
/** The ridge crest line the treeline stands on (§4.1). */
export const CREST_Z = -38;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

/** Integer-lattice hash → [0, 1). `salt` picks the octave. */
function lattice(ix: number, iz: number, salt: number): number {
  let h = Math.imul(ix | 0, 0x27d4eb2d) ^ Math.imul(iz | 0, 0x165667b1) ^ salt;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1). */
function valueNoise(x: number, z: number, salt: number): number {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = lattice(ix, iz, salt), b = lattice(ix + 1, iz, salt);
  const c = lattice(ix, iz + 1, salt), d = lattice(ix + 1, iz + 1, salt);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uz);
}

/** Ground height at world (x, z). Finite for every finite input. */
export function heightAt(x: number, z: number): number {
  const edge = smoothstep(28, 48, z);   // 0 on the valley, 1 at the near edge (z = 50): the swell eases down there
  const noise = ((valueNoise(x / 18, z / 18, 0x51) - 0.5) * 1.6 + (valueNoise(x / 6, z / 6, 0x9e) - 0.5) * 0.5) * (1 - 0.7 * edge);
  const far = 6 * smoothstep(6, 34, -z);
  const near = 1.2 * smoothstep(5, 22, z) * (1 - 0.8 * edge);
  const dz = (z - CREST_Z) / 7;
  const ridge = 10 * Math.exp(-dz * dz);
  const hx = (x + 31) / 11, hz = (z + 16) / 9;
  const hill = 7 * Math.exp(-(hx * hx + hz * hz));
  let h = 1.0 + far + near + ridge + hill + noise;
  const pd = Math.hypot(x - MILL_PAD.x, z - MILL_PAD.z);
  h = lerp(h, MILL_PAD.y, 1 - smoothstep(MILL_PAD.flat, MILL_PAD.blend, pd));
  h = lerp(h, RIVER_BED, 1 - smoothstep(4, 7, Math.abs(z)));
  return h;
}

const GRID_X = TERRAIN.width / TERRAIN.res + 1;   // 161
const GRID_Z = TERRAIN.depth / TERRAIN.res + 1;   // 101
/** Treeline (§4.1): one cone per unit of x along the crest, 6 sides, radius 0.35–0.7, height 0.8–3.4, z jitter ±0.6; about 15% collapse to zero height. */
export const TREELINE = { count: TERRAIN.width, sides: 6, minRadius: 0.35, maxRadius: 0.7, minHeight: 0.8, maxHeight: 3.4, jitter: 0.6, skip: 0.15 } as const;
export const TERRAIN_VERTEX_COUNT = GRID_X * GRID_Z + TREELINE.count * (TREELINE.sides + 1);
export const TERRAIN_INDEX_COUNT = (GRID_X - 1) * (GRID_Z - 1) * 6 + TREELINE.count * TREELINE.sides * 3;

const C_LOW = new Color(PALETTE.terrainLow);
const C_MID = new Color(PALETTE.terrainMid);
const C_SLOPE = new Color(PALETTE.terrainSlope);
const C_CREST = new Color(PALETTE.terrainCrest);
const C_TREE = new Color(PALETTE.treeline);

/** Vertex colour (linear, three's working space) from height and slope (§4.1). Writes into `out`. */
export function groundColor(x: number, z: number, out: Color): Color {
  const h = heightAt(x, z);
  const dhdx = heightAt(x + 0.5, z) - heightAt(x - 0.5, z);
  const dhdz = heightAt(x, z + 0.5) - heightAt(x, z - 0.5);
  const slope = 1 - 1 / Math.sqrt(1 + dhdx * dhdx + dhdz * dhdz);   // 1 − normal.y
  out.copy(C_LOW).lerp(C_MID, smoothstep(0.5, 6, h));
  out.lerp(C_SLOPE, smoothstep(0.08, 0.3, slope));
  out.lerp(C_CREST, smoothstep(13, 17, h));
  return out;
}

/** The terrain mesh with the treeline merged in: positions, linear vertex colours, CCW-from-above indices. */
export function buildTerrain(): { positions: Float32Array; colors: Float32Array; indices: Uint32Array } {
  const positions = new Float32Array(TERRAIN_VERTEX_COUNT * 3);
  const colors = new Float32Array(TERRAIN_VERTEX_COUNT * 3);
  const indices = new Uint32Array(TERRAIN_INDEX_COUNT);
  const c = new Color();
  let v = 0;
  for (let j = 0; j < GRID_Z; j++) {
    for (let i = 0; i < GRID_X; i++) {
      const x = -TERRAIN.width / 2 + i * TERRAIN.res;
      const z = -TERRAIN.depth / 2 + j * TERRAIN.res;
      positions[v * 3] = x; positions[v * 3 + 1] = heightAt(x, z); positions[v * 3 + 2] = z;
      groundColor(x, z, c);
      colors[v * 3] = c.r; colors[v * 3 + 1] = c.g; colors[v * 3 + 2] = c.b;
      v++;
    }
  }
  let k = 0;
  for (let j = 0; j < GRID_Z - 1; j++) {
    for (let i = 0; i < GRID_X - 1; i++) {
      const a = j * GRID_X + i, b = a + 1, cI = a + GRID_X, d = cI + 1;
      indices[k++] = a; indices[k++] = cI; indices[k++] = b;
      indices[k++] = b; indices[k++] = cI; indices[k++] = d;
    }
  }
  const rng = mulberry32(0x7ee5);
  for (let t = 0; t < TREELINE.count; t++) {
    const cx = -TERRAIN.width / 2 + 0.5 + t;
    const cz = CREST_Z + (rng() * 2 - 1) * TREELINE.jitter;
    const base = heightAt(cx, cz) - 0.1;
    const radius = TREELINE.minRadius + rng() * (TREELINE.maxRadius - TREELINE.minRadius);
    const grown = TREELINE.minHeight + rng() * (TREELINE.maxHeight - TREELINE.minHeight);
    const height = rng() < TREELINE.skip ? 0 : grown;   // a skipped cone keeps its vertices, collapsed at its site
    const first = v;
    for (let s = 0; s < TREELINE.sides; s++) {
      const ang = (s / TREELINE.sides) * Math.PI * 2;
      positions[v * 3] = cx + Math.cos(ang) * radius;
      positions[v * 3 + 1] = base;
      positions[v * 3 + 2] = cz + Math.sin(ang) * radius;
      colors[v * 3] = C_TREE.r; colors[v * 3 + 1] = C_TREE.g; colors[v * 3 + 2] = C_TREE.b;
      v++;
    }
    const apex = v;
    positions[v * 3] = cx; positions[v * 3 + 1] = base + height; positions[v * 3 + 2] = cz;
    colors[v * 3] = C_TREE.r; colors[v * 3 + 1] = C_TREE.g; colors[v * 3 + 2] = C_TREE.b;
    v++;
    for (let s = 0; s < TREELINE.sides; s++) {
      const s1 = first + s, s2 = first + ((s + 1) % TREELINE.sides);
      indices[k++] = s1; indices[k++] = apex; indices[k++] = s2;
    }
  }
  return { positions, colors, indices };
}
