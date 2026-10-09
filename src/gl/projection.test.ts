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
    expect(placeLabel(proj, 0, 1440, 900, 16, out)).toEqual({ x: 730, y: 450 - 14 - 22, visible: true });
    const low = placeLabel(proj, 1, 1440, 900, 16, out);
    expect([low.x, low.visible]).toEqual([1424, true]);
    expect(low.y).toBeCloseTo(899.55 - 14 - 22, 1);   // above the light, inside the bottom margin
    expect(placeLabel(proj, 2, 1440, 900, 16, out).visible).toBe(false);
    const clamped = placeLabel(proj, 3, 1440, 900, 16, out);
    expect([clamped.x, clamped.visible]).toEqual([1424, true]);
    expect(clamped.y).toBeLessThanOrEqual(900 - 16 - 14);
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
    expect(mid.y).toBeCloseTo(450 - h - 22, 6);
    expect(mid.y + h).toBeLessThan(450);
  });

  it('keeps a label by its light: other side of the light when copy covers the first slot, hidden when nothing is clear', () => {
    const proj = Float32Array.of(-0.5, 0.2, 1);
    const out: LabelPlacement = { x: 0, y: 0, visible: false };
    const free = placeLabel(proj, 0, 1440, 900, 16, out, 300, 14, null);
    const ax = 360, ay = 360;
    expect(free.x).toBeCloseTo(ax + 10, 3);
    expect(free.y).toBeCloseTo(ay - 14 - 22, 3);
    const line = { left: 0, top: ay - 40, right: 900, bottom: ay - 10 };
    const flipped = placeLabel(proj, 0, 1440, 900, 16, out, 300, 14, [line]);
    expect(flipped.visible).toBe(true);
    expect(flipped.y).toBeCloseTo(ay + 14, 3);        // below the light instead
    expect(flipped.x).toBeCloseTo(ax + 10, 3);
    const everywhere = { left: 0, top: 0, right: 1440, bottom: 900 };
    const hidden = placeLabel(proj, 0, 1440, 900, 16, out, 300, 14, [everywhere]);
    expect(hidden.visible).toBe(false);
    const belowFirst = placeLabel(proj, 0, 1440, 900, 16, out, 300, 14, null, 'below');
    expect(belowFirst.y).toBeCloseTo(ay + 14, 3);
  });

  it('applies the lift on either side and can centre a label on its light', () => {
    const proj = Float32Array.of(0, 0, 1);
    const out: LabelPlacement = { x: 0, y: 0, visible: false };
    const up = placeLabel(proj, 0, 1440, 900, 16, out, 200, 14, null, 'above', 30);
    expect(up.y).toBeCloseTo(450 - 14 - 22 - 30, 3);
    const down = placeLabel(proj, 0, 1440, 900, 16, out, 200, 14, null, 'below', 30);
    expect(down.y).toBeCloseTo(450 + 14 + 30, 3);
    const mid = placeLabel(proj, 0, 1440, 900, 16, out, 200, 14, null, 'above', 0, true);
    expect(mid.x).toBeCloseTo(720 - 100, 3);
  });
});
