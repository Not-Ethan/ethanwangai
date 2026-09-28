import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { PRIMITIVE, PRIMITIVE_NAMES } from '@/bench';
import { createKitGeometries } from './kitGeometry';

/** Bounding box of a geometry as [min, max] tuples. */
function bounds(g: THREE.BufferGeometry): [number[], number[]] {
  g.computeBoundingBox();
  const b = g.boundingBox!;
  return [b.min.toArray(), b.max.toArray()];
}
const close = (got: number[], want: number[]) => got.forEach((v, i) => expect(v).toBeCloseTo(want[i], 6));

describe('createKitGeometries', () => {
  const g = createKitGeometries();

  it('returns one BufferGeometry per primitive id, fresh per call', () => {
    for (const name of PRIMITIVE_NAMES) expect(g[PRIMITIVE[name]]).toBeInstanceOf(THREE.BufferGeometry);
    expect(Object.keys(g)).toHaveLength(PRIMITIVE_NAMES.length);
    expect(createKitGeometries()[PRIMITIVE.cell]).not.toBe(g[PRIMITIVE.cell]);
  });

  it('cell and tile stand on the bench with their origin at the base', () => {
    const [cMin, cMax] = bounds(g[PRIMITIVE.cell]);
    close(cMin, [-0.4, 0, -0.4]); close(cMax, [0.4, 1, 0.4]);
    const [tMin, tMax] = bounds(g[PRIMITIVE.tile]);
    close(tMin, [-0.1, 0, -0.1]); close(tMax, [0.1, 0.02, 0.1]);
  });

  it('cap, bar, rod and ring are centred at the plan\'s sizes', () => {
    const [capMin, capMax] = bounds(g[PRIMITIVE.cap]);
    close(capMin, [-0.4, -0.015, -0.4]); close(capMax, [0.4, 0.015, 0.4]);
    const [barMin, barMax] = bounds(g[PRIMITIVE.bar]);
    close(barMin, [-0.5, -0.06, -0.06]); close(barMax, [0.5, 0.06, 0.06]);
    const [rodMin, rodMax] = bounds(g[PRIMITIVE.rod]);
    close([rodMin[1], rodMax[1]], [-0.5, 0.5]);
    expect(Math.max(Math.abs(rodMin[0]), Math.abs(rodMax[0]))).toBeCloseTo(0.05, 6);
    const [ringMin, ringMax] = bounds(g[PRIMITIVE.ring]);
    close([ringMin[0], ringMax[0]], [-0.56, 0.56]);
    close([ringMin[2], ringMax[2]], [-0.06, 0.06]);
  });
});
