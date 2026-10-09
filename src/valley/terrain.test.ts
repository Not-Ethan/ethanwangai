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
  it('holds the mill pad flat under the whole 10 × 7 mill footprint', () => {
    for (const [dx, dz] of [[-5, -3.5], [5, -3.5], [-5, 3.5], [5, 3.5], [0, 0]]) {
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
    for (const v of terrain.positions) expect(Number.isFinite(v)).toBe(true);
    for (const v of terrain.colors) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
    for (const i of terrain.indices) expect(i).toBeLessThan(TERRAIN_VERTEX_COUNT);
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
    for (let t = 0; t < groundTris; t++) {
      const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;
      const ux = p[b] - p[a], uz = p[b + 2] - p[a + 2];
      const vx = p[c] - p[a], vz = p[c + 2] - p[a + 2];
      expect(uz * vx - ux * vz).toBeGreaterThan(0);   // y component of (b − a) × (c − a)
    }
  });
  it('winds every treeline cone face outward', () => {
    const p = terrain.positions, idx = terrain.indices;
    const start = TERRAIN.width * TERRAIN.depth * 2;
    for (let t = start; t < idx.length / 3; t++) {
      const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;   // a, c on the base; b is the apex
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
      const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      const nx = uy * vz - uz * vy, nz = ux * vy - uy * vx;
      const ox = (p[a] + p[c]) / 2 - p[b], oz = (p[a + 2] + p[c + 2]) / 2 - p[b + 2];   // apex → base-edge midpoint
      expect(nx * ox + nz * oz).toBeGreaterThan(0);
    }
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
    expect(maxLum).toBeLessThanOrEqual(new Color(PALETTE.terrainSlope).b + 1e-6);
  });
});
