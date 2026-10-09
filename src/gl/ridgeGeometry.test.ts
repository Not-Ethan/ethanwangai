import { describe, it, expect } from 'vitest';
import { RIDGE } from '@/valley/layout';
import { heightAt } from '@/valley/terrain';
import { RIDGE_FRAG } from './shaders/ridge';
import {
  CREST_LIFT, CREST_SEGMENTS, buildRidgeGeometry, crestLinePoints, pointScale,
} from './ridgeGeometry';

describe('buildRidgeGeometry', () => {
  it('carries position, aBirth and aSize for every point', () => {
    const g = buildRidgeGeometry(6000);
    expect(g.getAttribute('position').count).toBe(6000);
    expect(g.getAttribute('aBirth').count).toBe(6000);
    expect(g.getAttribute('aBirth').itemSize).toBe(1);
    expect(g.getAttribute('aSize').count).toBe(6000);
    expect(g.boundingSphere).not.toBeNull();
  });
});

describe('crestLinePoints', () => {
  it('runs the crest from x0 to x1 on the terrain height', () => {
    const pts = crestLinePoints();
    expect(pts).toHaveLength(CREST_SEGMENTS + 1);
    expect(pts[0][0]).toBe(RIDGE.x0);
    expect(pts[pts.length - 1][0]).toBeCloseTo(RIDGE.x1, 9);
    for (const [x, y, z] of pts) {
      expect(z).toBe(RIDGE.z);
      expect(Number.isFinite(y)).toBe(true);
      expect(y).toBeCloseTo(heightAt(x, RIDGE.z) + CREST_LIFT, 6);
    }
  });
});

describe('pointScale', () => {
  it('is the drawing-buffer pixels per world unit at distance 1', () => {
    expect(pointScale(900, 36)).toBeCloseTo(1384.96, 1);
  });
});

describe('ridge fragment (spec §5.6)', () => {
  it('scales by the pulse level and a band alpha', () => {
    expect(RIDGE_FRAG).toContain('uniform float uLit;');
    expect(RIDGE_FRAG).toContain('uniform float uAlpha;');
    expect(RIDGE_FRAG).toContain('uColor * a * uAlpha * uLit');
  });
});
