import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { EMITTERS } from '@/valley/lights';
import type { Vec3 } from '@/valley/types';
import { CAMERA_LANDSCAPE, CAMERA_PORTRAIT } from '@/valley/layout';
import {
  CAMERA_FAR, CAMERA_NEAR, PARALLAX_TAU,
  composeCamera, createRig, isPortrait, normalizePointer, setRigMode,
} from './cameraCore';
import { EMITTER_COUNT, EMITTER_INDEX, EMITTER_POSITIONS, projectEmitters } from './projection';

const DEG = Math.PI / 180;
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const D_LAND = dist(CAMERA_LANDSCAPE.position, CAMERA_LANDSCAPE.lookAt);

function camera(width: number, height: number): THREE.PerspectiveCamera {
  return new THREE.PerspectiveCamera(CAMERA_LANDSCAPE.fov, width / height, CAMERA_NEAR, CAMERA_FAR);
}
function project(c: THREE.PerspectiveCamera): Float32Array {
  c.updateMatrixWorld();
  const out = new Float32Array(EMITTER_COUNT * 3);
  projectEmitters(c, EMITTER_POSITIONS, out);
  return out;
}

describe('composeCamera', () => {
  it('sits at the landscape position and looks at the base look-at with no offset', () => {
    const rig = createRig();
    const c = camera(1440, 900);
    composeCamera(rig, 0, 0, 1, 1 / 60, c);
    expect(c.position.toArray()).toEqual([...CAMERA_LANDSCAPE.position]);
    expect(c.fov).toBeCloseTo(CAMERA_LANDSCAPE.fov, 9);
    c.updateMatrixWorld();
    const p = new THREE.Vector3(...CAMERA_LANDSCAPE.lookAt).project(c);
    expect(Math.abs(p.x)).toBeLessThan(1e-6);
    expect(Math.abs(p.y)).toBeLessThan(1e-6);
  });

  it('turns by moving the look-at by tan(angle) times the base distance, never the position (spec §3)', () => {
    const rig = createRig();
    const c = camera(1440, 900);
    composeCamera(rig, 4, 1, 0.96, 1 / 60, c);
    expect(rig.lookAt.x).toBeCloseTo(CAMERA_LANDSCAPE.lookAt[0] + Math.tan(4 * DEG) * D_LAND, 6);
    expect(rig.lookAt.y).toBeCloseTo(CAMERA_LANDSCAPE.lookAt[1] + Math.tan(1 * DEG) * D_LAND, 6);
    expect(rig.lookAt.z).toBeCloseTo(CAMERA_LANDSCAPE.lookAt[2], 9);
    expect(c.position.toArray()).toEqual([...CAMERA_LANDSCAPE.position]);
    expect(c.fov).toBeCloseTo(CAMERA_LANDSCAPE.fov * 0.96, 9);
  });

  it('positive yaw turns the view toward +x, so the mill slides left in the frame', () => {
    const rig = createRig();
    const c = camera(1440, 900);
    composeCamera(rig, 0, 0, 1, 1 / 60, c);
    const before = project(c)[EMITTER_INDEX.mill * 3];
    composeCamera(rig, 7, 0, 0.95, 1 / 60, c);
    const after = project(c)[EMITTER_INDEX.mill * 3];
    expect(after).toBeLessThan(before);
  });

  it('keeps every emitter within 0.85 NDC at 1440 x 900', () => {
    const rig = createRig();
    const c = camera(1440, 900);
    composeCamera(rig, 0, 0, 1, 1 / 60, c);
    const out = project(c);
    EMITTERS.forEach((e, i) => {
      expect(Math.abs(out[i * 3]), e.id).toBeLessThanOrEqual(0.85);
      expect(Math.abs(out[i * 3 + 1]), e.id).toBeLessThanOrEqual(0.85);
    });
  });

  it('recomposes to the portrait camera when the aspect flips, and back (Review Focus 2)', () => {
    const rig = createRig();
    const c = camera(1440, 900);
    composeCamera(rig, 0, 0, 1, 1 / 60, c);
    expect(c.position.toArray()).toEqual([...CAMERA_LANDSCAPE.position]);

    setRigMode(rig, isPortrait(390, 844), false);
    c.aspect = 390 / 844;
    c.updateProjectionMatrix();
    composeCamera(rig, 0, 0, 1, 1 / 60, c);
    expect(c.position.toArray()).toEqual([...CAMERA_PORTRAIT.position]);
    expect(c.fov).toBeCloseTo(CAMERA_PORTRAIT.fov, 9);
    const out = project(c);
    EMITTERS.forEach((e, i) => expect(Math.abs(out[i * 3 + 1]), e.id).toBeLessThanOrEqual(0.85));

    setRigMode(rig, isPortrait(1440, 900), false);
    c.aspect = 1440 / 900;
    c.updateProjectionMatrix();
    composeCamera(rig, 0, 0, 1, 1 / 60, c);
    expect(c.position.toArray()).toEqual([...CAMERA_LANDSCAPE.position]);
    expect(c.fov).toBeCloseTo(CAMERA_LANDSCAPE.fov, 9);
  });

  it('adds at most 1 degree of pointer parallax, damped with tau 0.4 s', () => {
    const rig = createRig();
    const c = camera(1440, 900);
    setRigMode(rig, false, true);
    normalizePointer(1440, 450, 1440, 900, rig.pointer);
    expect(rig.pointer.toArray()).toEqual([1, 0]);
    composeCamera(rig, 0, 0, 1, PARALLAX_TAU, c);
    expect(rig.parallax.x).toBeCloseTo(1 - Math.exp(-1), 6);
    composeCamera(rig, 0, 0, 1, 10, c);
    expect(rig.lookAt.x).toBeCloseTo(CAMERA_LANDSCAPE.lookAt[0] + Math.tan(1 * DEG) * D_LAND, 4);
  });

  it('ignores the pointer when parallax is off (phone, reduced motion)', () => {
    const rig = createRig();
    const c = camera(1440, 900);
    normalizePointer(0, 0, 1440, 900, rig.pointer);
    composeCamera(rig, 0, 0, 1, 10, c);
    expect(rig.lookAt.x).toBeCloseTo(CAMERA_LANDSCAPE.lookAt[0], 9);
    expect(rig.lookAt.y).toBeCloseTo(CAMERA_LANDSCAPE.lookAt[1], 9);
  });
});
