// Ground-level geometry for the GL layer (spec §4.1): the terrain mesh from the valley package, the near-bank apron
// the portrait camera needs, and the mist seeds. Pure: three's core geometry classes only, so it runs in Node.
import * as THREE from 'three';
import { buildTerrain, groundColor, heightAt, TERRAIN } from '@/valley/terrain';
import { PALETTE } from '@/valley/palette';
import { mulberry32 } from '@/valley/rng';
import { hashString } from '@/valley/hash';

/**
 * The near-bank apron: the terrain ends at z = depth / 2 = 50, but the portrait camera (0, 22, 96) meets ground
 * height at z ≈ 60–68 along its bottom edge. A flat strip out to z = 110 keeps ground under every portrait view.
 */
export const APRON = { z0: TERRAIN.depth / 2, z1: 110 } as const;
const APRON_COLS = TERRAIN.width / TERRAIN.res + 1;   // 161, the terrain's own x columns
export const APRON_VERTEX_COUNT = APRON_COLS * 2;

/** buildTerrain() plus the apron as one BufferGeometry: linear vertex colours as they are, normals computed once. */
export function terrainGeometry(): THREE.BufferGeometry {
  const t = buildTerrain();
  const base = t.positions.length / 3;
  const positions = new Float32Array(t.positions.length + APRON_VERTEX_COUNT * 3);
  const colors = new Float32Array(t.colors.length + APRON_VERTEX_COUNT * 3);
  const indices = new Uint32Array(t.indices.length + (APRON_COLS - 1) * 6);
  positions.set(t.positions);
  colors.set(t.colors);
  indices.set(t.indices);
  const c = new THREE.Color();
  const far = new THREE.Color(PALETTE.terrainLow);
  for (let i = 0; i < APRON_COLS; i++) {
    const x = -TERRAIN.width / 2 + i * TERRAIN.res;
    const y = heightAt(x, APRON.z0);
    const near = (base + i) * 3;
    const back = (base + APRON_COLS + i) * 3;
    positions[near] = x; positions[near + 1] = y; positions[near + 2] = APRON.z0;
    positions[back] = x; positions[back + 1] = y; positions[back + 2] = APRON.z1;
    groundColor(x, APRON.z0, c);
    colors[near] = c.r; colors[near + 1] = c.g; colors[near + 2] = c.b;
    colors[back] = far.r; colors[back + 1] = far.g; colors[back + 2] = far.b;
  }
  let k = t.indices.length;
  for (let i = 0; i < APRON_COLS - 1; i++) {
    // Same winding as buildTerrain (CCW seen from above): row z0 is the smaller z, row z1 the larger.
    const a = base + i, b = a + 1, cI = base + APRON_COLS + i, d = cI + 1;
    indices[k++] = a; indices[k++] = cI; indices[k++] = b;
    indices[k++] = b; indices[k++] = cI; indices[k++] = d;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.setIndex(new THREE.BufferAttribute(indices, 1));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

export const MIST_COUNT = 24;

/** Per sprite: x0 in [-width/2, width/2], y in [0.6, 1.8], z in [-5, 5] (inside the river band), size in [6, 10]. */
export function mistSeeds(count: number = MIST_COUNT, seed: number = hashString('mist')): Float32Array {
  const rnd = mulberry32(seed);
  const out = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    out[i * 4] = (rnd() - 0.5) * TERRAIN.width;
    out[i * 4 + 1] = 0.6 + 1.2 * rnd();
    out[i * 4 + 2] = (rnd() - 0.5) * 10;
    out[i * 4 + 3] = 6 + 4 * rnd();
  }
  return out;
}
