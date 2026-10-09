import { describe, it, expect } from 'vitest';
import { Color } from 'three';
import { PALETTE } from './palette';
import {
  TERRAIN, MILL_PAD, RIVER_BED, CREST_Z, TREELINE, TERRAIN_VERTEX_COUNT, TERRAIN_INDEX_COUNT,
  heightAt, buildTerrain, groundColor,
} from './terrain';

const terrain = buildTerrain();
const GRID = (TERRAIN.width + 1) * (TERRAIN.depth + 1);   // 161 × 101

describe('heightAt', () => {
  it('is finite everywhere, including the river channel edges (§12 silent killer)', () => {
    for (let x = -80; x <= 80; x += 0.5) {
      for (const z of [-50, -38, -7, -6.0001, -6, -5.9999, -4, -0.5, 0, 0.5, 4, 5.9999, 6, 6.0001, 7, 26, 50]) {
        expect(Number.isFinite(heightAt(x, z))).toBe(true);
      }
    }
  });
  it('cuts the river channel below both banks and below the river surface (y 0.2)', () => {
    for (let x = -80; x <= 80; x += 1) {
      const bed = heightAt(x, 0);
      expect(bed).toBeCloseTo(RIVER_BED, 6);
      expect(bed).toBeLessThan(0.2);
      expect(heightAt(x, 10)).toBeGreaterThan(bed + 1);
      expect(heightAt(x, -10)).toBeGreaterThan(bed + 1);
      expect(heightAt(x, 8)).toBeGreaterThan(0.2);
      expect(heightAt(x, -8)).toBeGreaterThan(0.2);
    }
  });
  it('holds the mill pad flat under the mill: the 14-wide body along its centre line and its 10 × 7 core', () => {
    for (const [dx, dz] of [[-5, -3.5], [5, -3.5], [-5, 3.5], [5, 3.5], [0, 0], [-7, 0], [7, 0]]) {
      expect(heightAt(MILL_PAD.x + dx, MILL_PAD.z + dz)).toBeCloseTo(MILL_PAD.y, 6);
    }
  });
  it('puts the back ridge crest well above the far bank', () => {
    for (let x = -36; x <= 40; x += 2) {
      expect(heightAt(x, CREST_Z)).toBeGreaterThan(heightAt(x, -20) + 6);
    }
  });
  it('raises the hill at the far left above the far bank to its right', () => {
    expect(heightAt(-31, -16)).toBeGreaterThan(heightAt(0, -16) + 4);
  });
});

describe('buildTerrain', () => {
  it('has 161 × 101 grid vertices plus the treeline cones, and matching channel lengths', () => {
    expect(TERRAIN_VERTEX_COUNT).toBe(GRID + TREELINE.count * (TREELINE.sides + 1));
    expect(terrain.positions.length).toBe(TERRAIN_VERTEX_COUNT * 3);
    expect(terrain.colors.length).toBe(TERRAIN_VERTEX_COUNT * 3);
    expect(terrain.indices.length).toBe(TERRAIN_INDEX_COUNT);
    expect(terrain.indices.length % 3).toBe(0);
  });
  it('has no NaN and no out-of-range colour channel', () => {
    // One expect per array (a quarter of a million per-element expects timed out under full-suite load).
    let badPos = 0, badCol = 0, badIdx = 0;
    for (const v of terrain.positions) if (!Number.isFinite(v)) badPos++;
    for (const v of terrain.colors) if (!(v >= 0 && v <= 1)) badCol++;
    for (const i of terrain.indices) if (!(i < TERRAIN_VERTEX_COUNT)) badIdx++;
    expect({ badPos, badCol, badIdx }).toEqual({ badPos: 0, badCol: 0, badIdx: 0 });
  });
  it('spans x −80..80 and z −50..50 on the grid and samples heightAt at each grid vertex', () => {
    const p = terrain.positions;
    expect([p[0], p[2]]).toEqual([-80, -50]);
    const last = (GRID - 1) * 3;
    expect([p[last], p[last + 2]]).toEqual([80, 50]);
    expect(p[1]).toBeCloseTo(heightAt(-80, -50), 5);
  });
  it('winds every ground triangle counter-clockwise seen from above (normal y > 0)', () => {
    const p = terrain.positions, idx = terrain.indices;
    const groundTris = TERRAIN.width * TERRAIN.depth * 2;
    let clockwise = 0;
    for (let t = 0; t < groundTris; t++) {
      const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;
      const ux = p[b] - p[a], uz = p[b + 2] - p[a + 2];
      const vx = p[c] - p[a], vz = p[c + 2] - p[a + 2];
      if (!(uz * vx - ux * vz > 0)) clockwise++;   // y component of (b − a) × (c − a)
    }
    expect(clockwise).toBe(0);
  });
  it('winds every treeline cone face outward', () => {
    const p = terrain.positions, idx = terrain.indices;
    const start = TERRAIN.width * TERRAIN.depth * 2;
    let inward = 0;
    for (let t = start; t < idx.length / 3; t++) {
      const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;   // a, c on the base; b is the apex
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
      const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      const nx = uy * vz - uz * vy, nz = ux * vy - uy * vx;
      const ox = (p[a] + p[c]) / 2 - p[b], oz = (p[a + 2] + p[c + 2]) / 2 - p[b + 2];   // apex → base-edge midpoint
      if (nx === 0 && nz === 0) continue;   // a skipped cone collapsed to zero height has no face
      if (!(nx * ox + nz * oz > 0)) inward++;
    }
    expect(inward).toBe(0);
  });
  it('varies the treeline: heights 0.8–3.4, radii 0.35–0.7, about 15% collapsed', () => {
    const p = terrain.positions;
    let skipped = 0, tall = 0;
    for (let t = 0; t < TREELINE.count; t++) {
      const first = GRID + t * (TREELINE.sides + 1);
      const h = p[(first + TREELINE.sides) * 3 + 1] - p[first * 3 + 1];
      if (h === 0) { skipped++; continue; }
      expect(h).toBeGreaterThanOrEqual(0.8 - 1e-4);
      expect(h).toBeLessThanOrEqual(3.4 + 1e-4);
      if (h > 2.5) tall++;
      const r = Math.hypot(p[first * 3] - p[(first + TREELINE.sides) * 3], p[first * 3 + 2] - p[(first + TREELINE.sides) * 3 + 2]);
      expect(r).toBeGreaterThanOrEqual(0.35 - 1e-4);
      expect(r).toBeLessThanOrEqual(0.7 + 1e-4);
    }
    expect(skipped).toBeGreaterThan(TREELINE.count * 0.08);
    expect(skipped).toBeLessThan(TREELINE.count * 0.22);
    expect(tall).toBeGreaterThan(10);
  });
  it('colours the treeline with the palette treeline colour and stays in the dark ramp', () => {
    const tree = new Color(PALETTE.treeline);
    const v = GRID;   // first treeline vertex
    expect(terrain.colors[v * 3]).toBeCloseTo(tree.r, 6);
    expect(terrain.colors[v * 3 + 2]).toBeCloseTo(tree.b, 6);
    const c = new Color();
    groundColor(0, CREST_Z, c);
    const crest = new Color(PALETTE.terrainCrest);
    expect(Math.abs(c.r - crest.r) + Math.abs(c.g - crest.g) + Math.abs(c.b - crest.b)).toBeLessThan(0.02);
    let maxLum = 0;
    for (let i = 0; i < terrain.colors.length; i += 3) maxLum = Math.max(maxLum, terrain.colors[i], terrain.colors[i + 1], terrain.colors[i + 2]);
    expect(maxLum).toBeLessThanOrEqual(new Color(PALETTE.terrainSlope).b * 1.06 + 1e-6);
  });
});
