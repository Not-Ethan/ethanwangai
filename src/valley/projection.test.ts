// Spec §4: every emitter projects inside the frame through both hero cameras (three's PerspectiveCamera +
// Vector3.project), and the landscape camera's lowest rays land on terrain (no void under the near edge).
import { describe, it, expect } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import type { EmitterId, View } from './types';
import { CAMERA_LANDSCAPE, CAMERA_PORTRAIT, CAMERA_NEAR, CAMERA_FAR } from './layout';
import { EMITTERS } from './lights';
import { SECTIONS } from './sections';
import { heightAt, TERRAIN } from './terrain';

type Rig = { position: readonly number[]; lookAt: readonly number[]; fov: number };

/** The §3 convention: yaw/pitch are look-at offsets (lookAt += tan(angle) · d), fovScale multiplies the base fov. */
function cameraFor(rig: Rig, width: number, height: number, view: View): PerspectiveCamera {
  const cam = new PerspectiveCamera(rig.fov * view.fovScale, width / height, CAMERA_NEAR, CAMERA_FAR);
  cam.position.set(rig.position[0], rig.position[1], rig.position[2]);
  const target = new Vector3(rig.lookAt[0], rig.lookAt[1], rig.lookAt[2]);
  const d = cam.position.distanceTo(target);
  target.x += Math.tan((view.yaw * Math.PI) / 180) * d;
  target.y += Math.tan((view.pitch * Math.PI) / 180) * d;
  cam.lookAt(target);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return cam;
}

const BASE: View = { yaw: 0, pitch: 0, fovScale: 1 };
const LIFTS = [1, 6];   // §4: emitter y taken as heightAt(x, z) plus 1..6

function ndc(cam: PerspectiveCamera, id: EmitterId, lift: number): Vector3 {
  const e = EMITTERS.find((m) => m.id === id)!;
  const [x, , z] = e.position;
  return new Vector3(x, heightAt(x, z) + lift, z).project(cam);
}

describe('projection: landscape 1440 × 900', () => {
  const cam = cameraFor(CAMERA_LANDSCAPE, 1440, 900, BASE);
  it.each(EMITTERS.map((e) => e.id))('%s sits within ±0.85 NDC on both axes', (id) => {
    for (const lift of LIFTS) {
      const p = ndc(cam, id, lift);
      expect(Math.abs(p.x)).toBeLessThanOrEqual(0.85);
      expect(Math.abs(p.y)).toBeLessThanOrEqual(0.85);
      expect(p.z).toBeLessThan(1);   // in front of the camera, inside far
    }
  });
});

describe('projection: portrait 390 × 844', () => {
  const cam = cameraFor(CAMERA_PORTRAIT, 390, 844, BASE);
  it('keeps every emitter within ±0.85 NDC vertically at yaw 0', () => {
    for (const e of EMITTERS) for (const lift of LIFTS) expect(Math.abs(ndc(cam, e.id, lift).y)).toBeLessThanOrEqual(0.85);
  });
  // Spec §4's list. Option A (portrait fov 70) was chosen, so the full list applies.
  const PORTRAIT_X_IDS: EmitterId[] = [
    'hut', 'kalshiLamp', 'bar1', 'bar2', 'bar3', 'hill1', 'hill2', 'hill3', 'hill4', 'hill5', 'visitor',
  ];
  it('keeps the near and centre emitters within ±0.85 NDC horizontally at yaw 0', () => {
    for (const id of PORTRAIT_X_IDS) for (const lift of LIFTS) expect(Math.abs(ndc(cam, id, lift).x)).toBeLessThanOrEqual(0.85);
  });
  const SUBJECTS: [string, EmitterId[]][] = [
    ['kalshi', ['kalshiLamp']], ['heron', ['bar2']], ['darch', ['mill']], ['summers', ['nist', 'wvu']],
    ['yours', ['visitor']], ['contact', ['hut']],
  ];
  it.each(SUBJECTS)('turns %s to its subject with the portrait yaw', (section, ids) => {
    const view = SECTIONS.find((s) => s.id === section)!.viewPortrait;
    const turned = cameraFor(CAMERA_PORTRAIT, 390, 844, view);
    for (const id of ids) for (const lift of LIFTS) expect(Math.abs(ndc(turned, id, lift).x)).toBeLessThanOrEqual(0.85);
  });
});

describe('projection: the landscape frame has ground under its bottom edge', () => {
  /** March the ray through NDC (nx, −1) and report whether it meets the heightfield inside the terrain. */
  function hitsTerrain(cam: PerspectiveCamera, nx: number): boolean {
    const dir = new Vector3(nx, -1, 0.5).unproject(cam).sub(cam.position).normalize();
    // Step to where the ray crosses the near edge (z = +50); it must still be above the ground there, or the
    // frame would look under the terrain. Then march on until it meets the ground.
    const p = cam.position.clone().addScaledVector(dir, (TERRAIN.depth / 2 - cam.position.z) / dir.z);
    if (Math.abs(p.x) > TERRAIN.width / 2 || p.y <= heightAt(p.x, p.z)) return false;
    while (p.z > -TERRAIN.depth / 2 && Math.abs(p.x) <= TERRAIN.width / 2) {
      p.addScaledVector(dir, 0.1);
      if (p.y <= heightAt(p.x, p.z)) return true;
    }
    return false;
  }
  it.each(SECTIONS.map((s) => s.id))('section %s at 1440 × 900', (id) => {
    const cam = cameraFor(CAMERA_LANDSCAPE, 1440, 900, SECTIONS.find((s) => s.id === id)!.view);
    for (const nx of [-1, 0, 1]) expect(hitsTerrain(cam, nx)).toBe(true);
  });
});
