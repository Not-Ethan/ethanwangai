import { describe, it, expect } from 'vitest';
import { CAMERA_LANDSCAPE, CAMERA_PORTRAIT, CAMERA_NEAR, CAMERA_FAR, RIDGE, PLACES } from './layout';
import { heightAt, MILL_PAD } from './terrain';

const SPEC_XZ: Record<keyof typeof PLACES, [number, number]> = {
  hut: [-18, 22], nist: [-34, -14], wvu: [-27, -18], kalshiLamp: [2, -30],
  bar1: [-10, -20], bar2: [0, -22], bar3: [10, -21], bar4: [20, -23],
  mill: [30, -12], millWheel: [30, -5], lot: [1, 9],
  hill1: [12, 15], hill2: [18, 19], hill3: [8, 20], hill4: [22, 13], hill5: [15, 24],
};

describe('layout', () => {
  it('uses the spec §4 cameras exactly', () => {
    expect(CAMERA_LANDSCAPE).toEqual({ position: [0, 14, 70], lookAt: [0, 2, -10], fov: 36 });
    expect(CAMERA_PORTRAIT).toEqual({ position: [0, 22, 96], lookAt: [0, 7, -12], fov: 70 });
    expect([CAMERA_NEAR, CAMERA_FAR]).toEqual([1, 260]);
    expect(RIDGE).toEqual({ x0: -36, x1: 40, z: -36 });
  });
  it('places every site at the spec x, z on the ground (the wheel hub at y 2.6)', () => {
    expect(Object.keys(PLACES).sort()).toEqual(Object.keys(SPEC_XZ).sort());
    for (const [k, [x, z]] of Object.entries(SPEC_XZ)) {
      const p = PLACES[k as keyof typeof PLACES];
      expect([p[0], p[2]]).toEqual([x, z]);
      expect(p[1]).toBe(k === 'millWheel' ? 2.6 : heightAt(x, z));
    }
  });
  it('keeps every place inside the lit-valley box x ∈ [−36, 40], z ∈ [−38, 26] (§4)', () => {
    for (const [x, , z] of Object.values(PLACES)) {
      expect(x).toBeGreaterThanOrEqual(-36); expect(x).toBeLessThanOrEqual(40);
      expect(z).toBeGreaterThanOrEqual(-38); expect(z).toBeLessThanOrEqual(26);
    }
  });
  it('stands the mill on the flat pad and sets the lot below every hillside site (§4.7)', () => {
    expect(PLACES.mill[1]).toBeCloseTo(MILL_PAD.y, 6);
    for (const k of ['hill1', 'hill2', 'hill3', 'hill4', 'hill5'] as const) {
      expect(PLACES[k][1]).toBeGreaterThan(PLACES.lot[1]);
    }
  });
  it('keeps the bars and the lamp on dry ground above the river surface', () => {
    for (const k of ['bar1', 'bar2', 'bar3', 'bar4', 'kalshiLamp', 'hut', 'lot'] as const) expect(PLACES[k][1]).toBeGreaterThan(0.2);
  });
});
