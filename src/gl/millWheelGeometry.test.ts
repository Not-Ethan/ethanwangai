import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { MILL_WHEEL_POSITION, MILL_WHEEL_RADIUS, buildMillWheelGeometry } from './millWheelGeometry';

describe('mill wheel (spec §4.5)', () => {
  it('sits over the river at (30, 2.6, -5)', () => {
    expect(MILL_WHEEL_POSITION[0]).toBe(30);
    expect(MILL_WHEEL_POSITION[1]).toBe(2.6);
    expect(MILL_WHEEL_POSITION[2]).toBe(-5);
  });

  it('is one merged, indexed geometry about 3.2 in radius, thin along its axle', () => {
    const g = buildMillWheelGeometry();
    expect(g.getAttribute('position').count).toBeGreaterThan(0);
    expect(g.getAttribute('normal')).toBeDefined();
    expect(g.index).not.toBeNull();
    g.computeBoundingBox();
    const box = g.boundingBox as THREE.Box3;
    expect(box.max.x).toBeGreaterThanOrEqual(MILL_WHEEL_RADIUS);
    expect(box.max.x).toBeLessThan(3.5);
    expect(box.min.y).toBeLessThanOrEqual(-MILL_WHEEL_RADIUS);
    expect(box.max.z).toBeLessThanOrEqual(0.81);
    expect(box.min.z).toBeGreaterThanOrEqual(-0.81);
  });
});
