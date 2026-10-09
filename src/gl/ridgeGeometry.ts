// The ridge's pure part (spec §4.6, §11): how many trade points a tier draws, the points geometry, the crest line under
// them, and the point-size scale. Runs in Node for tests; Ridge.tsx renders it.
import * as THREE from 'three';
import { facts } from '@/valley/facts';
import { ridgePoints } from '@/valley/ridge';
import { RIDGE } from '@/valley/layout';
import { heightAt } from '@/valley/terrain';

/** World size of a point with aSize 1 (spec §14 G3's remedy is to lower this). About 1.2 px at the ridge at 1440 × 900. */
export const RIDGE_POINT_WORLD = 0.09;
/** Per-point brightness under additive blending, so overlapping points read as a band, not a white bar. */
export const RIDGE_ALPHA = 0.16;
export const CREST_SEGMENTS = 152;
/** The crest line sits this far above the terrain crest so the terrain does not z-fight it. */
export const CREST_LIFT = 0.05;

export function buildRidgeGeometry(count: number): THREE.BufferGeometry {
  const { positions, birth, size } = ridgePoints(count, facts.kalshi.trades);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('aBirth', new THREE.BufferAttribute(birth, 1));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.computeBoundingSphere();
  return g;
}

export function crestLinePoints(): [number, number, number][] {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= CREST_SEGMENTS; i++) {
    const x = RIDGE.x0 + ((RIDGE.x1 - RIDGE.x0) * i) / CREST_SEGMENTS;
    pts.push([x, heightAt(x, RIDGE.z) + CREST_LIFT, RIDGE.z]);
  }
  return pts;
}

/** Stage 2's ridge shader sizes a point as aSize · uPixelScale / viewDepth; uPixelScale = this × world size. */
export function pointScale(bufferHeightPx: number, fovDeg: number): number {
  return bufferHeightPx / (2 * Math.tan((fovDeg * Math.PI) / 360));
}
