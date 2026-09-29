import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { CAMERA_KEYS } from '@/bench/camera';
import type { HudPose } from './hud';
import { createRig, normalizePointer, orbit, stepRig, PARALLAX_RAD, PARALLAX_TAU, POSE_TAU } from './CameraRig';

const hero = CAMERA_KEYS.desktop[0].pose;
function pose(fov = hero.fov): HudPose {
  return { position: [...hero.position], lookAt: [...hero.lookAt], fov };
}
function camera(): THREE.PerspectiveCamera {
  return new THREE.PerspectiveCamera(30, 1440 / 900, 0.5, 120);
}
/** Where the camera looks: its −z axis in world space. */
function forward(cam: THREE.Camera): THREE.Vector3 {
  return new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
}
const v3 = (a: readonly number[]) => new THREE.Vector3().fromArray(a);
/** The angle between two offsets seen from above: what a yaw about world up changes. */
const yawBetween = (a: THREE.Vector3, b: THREE.Vector3) => a.clone().setY(0).angleTo(b.clone().setY(0));

describe('normalizePointer', () => {
  it('maps the window to −1..1 with y up, the frame R3F uses', () => {
    const out = new THREE.Vector2();
    expect(normalizePointer(0, 0, 1440, 900, out).toArray()).toEqual([-1, 1]);
    expect(normalizePointer(720, 450, 1440, 900, out).toArray()).toEqual([0, 0]);
    expect(normalizePointer(1440, 900, 1440, 900, out).toArray()).toEqual([1, -1]);
  });
});

describe('orbit', () => {
  it('keeps the distance to the lookAt and turns the offset by exactly the yaw', () => {
    const p = v3(hero.position), l = v3(hero.lookAt);
    const before = p.clone().sub(l);
    orbit(p, l, PARALLAX_RAD, 0);
    const after = p.clone().sub(l);
    expect(after.length()).toBeCloseTo(before.length(), 9);
    expect(yawBetween(before, after)).toBeCloseTo(PARALLAX_RAD, 9);
    expect(after.y).toBeCloseTo(before.y, 9);   // yaw is about world up: height unchanged
  });

  it('a positive yaw moves the camera to its right, a positive pitch lifts it', () => {
    const l = new THREE.Vector3(0, 0, 0);
    const p = new THREE.Vector3(0, 0, 10);   // in front, looking down −z: right is +x
    orbit(p, l, 0.1, 0);
    expect(p.x).toBeGreaterThan(0);
    expect(p.y).toBeCloseTo(0, 12);
    const q = new THREE.Vector3(0, 0, 10);
    orbit(q, l, 0, 0.1);
    expect(q.y).toBeGreaterThan(0);
    expect(q.x).toBeCloseTo(0, 12);
    expect(q.length()).toBeCloseTo(10, 9);
  });

  it('looking straight down has no right axis: yaw alone, never NaN', () => {
    const p = new THREE.Vector3(0, 10, 0), l = new THREE.Vector3(0, 0, 0);
    orbit(p, l, 0.1, 0.1);
    expect(Number.isNaN(p.x) || Number.isNaN(p.y) || Number.isNaN(p.z)).toBe(false);
    expect(p.distanceTo(l)).toBeCloseTo(10, 9);
  });
});

describe('stepRig', () => {
  it('disabled (phone, reduced motion): the camera takes the pose exactly and looks at the lookAt', () => {
    const rig = createRig(false), cam = camera(), hp = pose();
    rig.pointer.set(1, 1);
    stepRig(rig, cam, hp, 1 / 60);
    expect(cam.position.toArray()).toEqual(hp.position);
    const toLook = v3(hp.lookAt).sub(cam.position).normalize();
    expect(forward(cam).distanceTo(toLook)).toBeLessThan(1e-9);
    expect(rig.parallax.toArray()).toEqual([0, 0]);   // the pointer never reaches a disabled rig
  });

  it('damped (reduced motion): takes the first pose exactly, then eases to a new one with τ 0.13 s, 95% there by 400 ms', () => {
    expect(POSE_TAU).toBe(0.13);
    const risen = CAMERA_KEYS.desktop[2].pose;
    const a = pose(), b: HudPose = { position: [...risen.position], lookAt: [...risen.lookAt], fov: risen.fov };
    const pa = v3(a.position), pb = v3(b.position), la = v3(a.lookAt), lb = v3(b.lookAt);
    const rig = createRig(false, true), cam = camera();
    rig.pointer.set(1, 1);
    stepRig(rig, cam, a, 1 / 60);
    expect(cam.position.toArray()).toEqual(a.position);              // the first frame is framed, not eased into
    stepRig(rig, cam, b, POSE_TAU);                                  // one τ: 63.2% of the way, position and lookAt alike
    expect(cam.position.distanceTo(pa) / pb.distanceTo(pa)).toBeCloseTo(1 - Math.exp(-1), 9);
    expect(rig.lookAt.distanceTo(la) / lb.distanceTo(la)).toBeCloseTo(1 - Math.exp(-1), 9);
    const toLook = rig.lookAt.clone().sub(cam.position).normalize();
    expect(forward(cam).distanceTo(toLook)).toBeLessThan(1e-9);     // looking at the eased lookAt
    const lerp = createRig(false, true);
    stepRig(lerp, cam, a, 1 / 60);
    for (let i = 0; i < 24; i++) stepRig(lerp, cam, b, 1 / 60);      // 400 ms
    expect(cam.position.distanceTo(pb) / pb.distanceTo(pa)).toBeLessThan(0.05);
    expect(lerp.lookAt.distanceTo(lb) / lb.distanceTo(la)).toBeLessThan(0.05);
    expect(rig.parallax.toArray()).toEqual([0, 0]);                  // no parallax under reduced motion
  });

  it('updates the projection matrix only when the fov changes', () => {
    const rig = createRig(false), cam = camera();
    const spy = vi.spyOn(cam, 'updateProjectionMatrix');
    stepRig(rig, cam, pose(30), 1 / 60);
    stepRig(rig, cam, pose(30), 1 / 60);
    expect(spy).not.toHaveBeenCalled();
    stepRig(rig, cam, pose(38), 1 / 60);
    expect(cam.fov).toBe(38);
    expect(spy).toHaveBeenCalledTimes(1);
    stepRig(rig, cam, pose(38), 1 / 60);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('enabled: the parallax damps toward the pointer with τ 0.4 s and settles at ±2°', () => {
    const rig = createRig(true), cam = camera(), hp = pose();
    rig.pointer.set(1, 0);
    stepRig(rig, cam, hp, PARALLAX_TAU);
    expect(rig.parallax.x).toBeCloseTo(1 - Math.exp(-1), 9);   // one τ: 63.2% of the way
    expect(PARALLAX_TAU).toBe(0.4);
    for (let i = 0; i < 600; i++) stepRig(rig, cam, hp, 1 / 60);   // 10 s: settled
    const rest = v3(hp.position).sub(v3(hp.lookAt));
    const now = cam.position.clone().sub(v3(hp.lookAt));
    expect(yawBetween(rest, now)).toBeCloseTo(PARALLAX_RAD, 6);
    expect(now.length()).toBeCloseTo(rest.length(), 9);
    expect(PARALLAX_RAD).toBeCloseTo((2 * Math.PI) / 180, 12);
    // still looking at the lookAt, from the new spot
    const toLook = v3(hp.lookAt).sub(cam.position).normalize();
    expect(forward(cam).distanceTo(toLook)).toBeLessThan(1e-9);
  });

  it('pointer up lifts the camera, pointer right moves it right; a centred pointer returns it to the pose', () => {
    const rig = createRig(true), cam = camera(), hp = pose();
    rig.pointer.set(0, 1);
    for (let i = 0; i < 600; i++) stepRig(rig, cam, hp, 1 / 60);
    expect(cam.position.y).toBeGreaterThan(hp.position[1]);
    rig.pointer.set(1, 0);
    for (let i = 0; i < 600; i++) stepRig(rig, cam, hp, 1 / 60);
    // right of the hero view: the camera's own +x axis, projected on the ground plane
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion).setY(0).normalize();
    const moved = cam.position.clone().sub(v3(hp.position)).setY(0);
    expect(moved.dot(right)).toBeGreaterThan(0);
    rig.pointer.set(0, 0);
    for (let i = 0; i < 600; i++) stepRig(rig, cam, hp, 1 / 60);
    expect(cam.position.distanceTo(v3(hp.position))).toBeLessThan(1e-6);
  });
});
