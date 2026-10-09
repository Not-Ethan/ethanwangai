import { describe, it, expect } from 'vitest';
import { EMITTERS } from '@/valley/lights';
import { HILL_INDICES, HIT_RADIUS_PX, hillsideHit, labelPosition, projectedToPixels } from './hillsideHit';

function projectedWith(points: Record<string, [number, number, number]>): Float32Array {
  const a = new Float32Array(EMITTERS.length * 3);
  EMITTERS.forEach((e, i) => {
    const p = points[e.id];
    if (p) a.set(p, i * 3);
  });
  return a;
}

describe('hillsideHit', () => {
  it('maps hill1…hill5 to their EMITTERS indices', () => {
    expect(HILL_INDICES.map((i) => EMITTERS[i].id)).toEqual(['hill1', 'hill2', 'hill3', 'hill4', 'hill5']);
  });
  it('finds the nearest visible house within the radius', () => {
    const p = projectedWith({ hill1: [800, 600, 1], hill2: [860, 590, 1], hill5: [700, 640, 1] });
    expect(hillsideHit(805, 602, p)).toBe(0);
    expect(hillsideHit(850, 592, p)).toBe(1);
    expect(hillsideHit(700, 640 + HIT_RADIUS_PX - 1, p)).toBe(4);
    expect(hillsideHit(700, 640 + HIT_RADIUS_PX + 1, p)).toBe(-1);
  });
  it('ignores houses that are not visible, and other emitters entirely', () => {
    const p = projectedWith({ hill3: [500, 500, 0], visitor: [500, 500, 1], hut: [500, 500, 1] });
    expect(hillsideHit(500, 500, p)).toBe(-1);
  });
});

describe('projectedToPixels', () => {
  it('converts NDC to CSS px from the top-left and keeps the visible flag', () => {
    const ndc = new Float32Array([0, 0, 1, -1, 1, 1, 1, -1, 0]);
    const out = new Float32Array(9);
    expect(Array.from(projectedToPixels(ndc, 1440, 900, out))).toEqual([720, 450, 1, 0, 0, 1, 1440, 900, 0]);
  });
  it('feeds hillsideHit in pixel space', () => {
    const ndc = new Float32Array(EMITTERS.length * 3);
    const i = HILL_INDICES[2] * 3;
    ndc.set([0, 0, 1], i);
    const px = projectedToPixels(ndc, 1440, 900, new Float32Array(ndc.length));
    expect(hillsideHit(722, 452, px)).toBe(2);
    expect(hillsideHit(722, 452, ndc)).toBe(-1); // raw NDC is not pixels: no hit
  });
});

describe('labelPosition', () => {
  it('sits up and right of the point, clamped inside the viewport (spec §12)', () => {
    expect(labelPosition(400, 300, 1440, 200)).toEqual([414, 272]);
    expect(labelPosition(1400, 300, 1440, 200)).toEqual([1232, 272]);
    expect(labelPosition(-50, 10, 1440, 200)).toEqual([8, 8]);
  });
});
