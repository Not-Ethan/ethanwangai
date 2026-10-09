import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { EMITTERS } from '@/valley/lights';
import { CAMERA_LANDSCAPE } from '@/valley/layout';
import {
  EMITTER_COUNT, EMITTER_INDEX, EMITTER_POSITIONS, LABEL_ALPHA, PROJECTED,
  placeLabel, projectEmitters, type LabelPlacement,
} from './projection';

function heroCamera(): THREE.PerspectiveCamera {
  const c = new THREE.PerspectiveCamera(CAMERA_LANDSCAPE.fov, 1440 / 900, 1, 260);
  c.position.set(...CAMERA_LANDSCAPE.position);
  c.lookAt(...CAMERA_LANDSCAPE.lookAt);
  c.updateMatrixWorld();
  return c;
}

describe('projection', () => {
  it('indexes every emitter in registry order and sizes the shared buffers', () => {
    EMITTERS.forEach((e, i) => expect(EMITTER_INDEX[e.id]).toBe(i));
    expect(EMITTER_COUNT).toBe(EMITTERS.length);
    expect(EMITTER_POSITIONS.length).toBe(EMITTER_COUNT * 3);
    expect(PROJECTED.length).toBe(EMITTER_COUNT * 3);
    expect(Array.from(LABEL_ALPHA)).toEqual(new Array(EMITTER_COUNT).fill(0));
    EMITTERS.forEach((e, i) => {
      expect(EMITTER_POSITIONS[i * 3]).toBeCloseTo(e.position[0], 5);
      expect(EMITTER_POSITIONS[i * 3 + 1]).toBeCloseTo(e.position[1], 5);
      expect(EMITTER_POSITIONS[i * 3 + 2]).toBeCloseTo(e.position[2], 5);
    });
  });

  it('matches three Vector3.project for every emitter', () => {
    const c = heroCamera();
    const out = new Float32Array(EMITTER_COUNT * 3);
    projectEmitters(c, EMITTER_POSITIONS, out);
    EMITTERS.forEach((e, i) => {
      const v = new THREE.Vector3(...e.position).project(c);
      expect(out[i * 3]).toBeCloseTo(v.x, 4);
      expect(out[i * 3 + 1]).toBeCloseTo(v.y, 4);
      expect(out[i * 3 + 2]).toBe(1);
    });
  });

  it('zeroes and hides a point behind the camera', () => {
    const c = heroCamera();
    const out = Float32Array.of(9, 9, 9);
    projectEmitters(c, Float32Array.of(0, 14, 200), out);
    expect(Array.from(out)).toEqual([0, 0, 0]);
  });

  it('places labels beside their anchor in pixels, clamps them and hides invalid ones (spec §12)', () => {
    const proj = Float32Array.of(0, 0, 1, 0.999, -0.999, 1, 0.5, 0.5, 0, 40, -90, 1, Number.NaN, 0, 1);
    const out: LabelPlacement = { x: -1, y: -1, visible: false };
    expect(placeLabel(proj, 0, 1440, 900, 16, out)).toEqual({ x: 730, y: 444, visible: true });
    expect(placeLabel(proj, 1, 1440, 900, 16, out)).toEqual({ x: 1424, y: 884, visible: true });
    expect(placeLabel(proj, 2, 1440, 900, 16, out).visible).toBe(false);
    expect(placeLabel(proj, 3, 1440, 900, 16, out)).toEqual({ x: 1424, y: 884, visible: true });
    expect(placeLabel(proj, 4, 1440, 900, 16, out).visible).toBe(false);
    expect(placeLabel(proj, 9, 1440, 900, 16, out).visible).toBe(false);
  });

  it('keeps the whole label box inside the margin, flips left at the right edge and sits above the anchor', () => {
    const out: LabelPlacement = { x: 0, y: 0, visible: false };
    const nx = (px: number) => (px / 1440) * 2 - 1;
    const ny = (py: number) => 1 - (py / 900) * 2;
    const proj = Float32Array.of(nx(2), ny(450), 1, nx(1380), ny(450), 1, nx(700), ny(2), 1, nx(700), ny(450), 1);
    const w = 120, h = 12;
    const left = placeLabel(proj, 0, 1440, 900, 16, out, w, h);
    expect(left.x).toBeGreaterThanOrEqual(16);
    const flipped = placeLabel(proj, 1, 1440, 900, 16, out, w, h);
    expect(flipped.x + w).toBeLessThanOrEqual(1380 - 10 + 1e-3);
    expect(flipped.x + w).toBeLessThanOrEqual(1440 - 16);
    const top = placeLabel(proj, 2, 1440, 900, 16, out, w, h);
    expect(top.y).toBeGreaterThanOrEqual(16);
    const mid = placeLabel(proj, 3, 1440, 900, 16, out, w, h);
    expect(mid.x).toBeCloseTo(710, 6);
    expect(mid.y).toBeCloseTo(450 - h - 6, 6);
    expect(mid.y + h).toBeLessThan(450);
  });
});
