// The camera rig's pure core (spec §3 view conventions, §4 cameras, §6 CameraRig). The camera position never changes
// for an aspect: yaw and pitch move the look-at by tan(angle) times the base camera-to-look-at distance, fovScale
// multiplies the base fov. Portrait (width < height) swaps in CAMERA_PORTRAIT. Pointer parallax adds up to
// PARALLAX_DEG to yaw and pitch, damped with PARALLAX_TAU. Driver.tsx calls composeCamera from the one useFrame;
// CameraRig.tsx only keeps the rig's mode and pointer current. Allocation-free per call.
import * as THREE from 'three';
import { CAMERA_LANDSCAPE, CAMERA_PORTRAIT, CAMERA_NEAR, CAMERA_FAR } from '@/valley/layout';

export { CAMERA_NEAR, CAMERA_FAR };
export const PARALLAX_DEG = 1;
export const PARALLAX_TAU = 0.4;
const DEG = Math.PI / 180;

export interface Rig {
  portrait: boolean;          // aspect < 1: CAMERA_PORTRAIT
  parallaxOn: boolean;        // desktop tier and full motion
  pointer: THREE.Vector2;     // target, -1..1, x right, y up
  parallax: THREE.Vector2;    // damped toward pointer
  lookAt: THREE.Vector3;      // this frame's composed look-at
}

export function createRig(): Rig {
  return {
    portrait: false,
    parallaxOn: false,
    pointer: new THREE.Vector2(),
    parallax: new THREE.Vector2(),
    lookAt: new THREE.Vector3(...CAMERA_LANDSCAPE.lookAt),
  };
}

export function setRigMode(rig: Rig, portrait: boolean, parallaxOn: boolean): void {
  rig.portrait = portrait;
  rig.parallaxOn = parallaxOn;
  if (!parallaxOn) resetPointer(rig);
}

export function resetPointer(rig: Rig): void {
  rig.pointer.set(0, 0);
}

export function isPortrait(width: number, height: number): boolean {
  return width < height;
}

/** A window pointer position in -1..1 with y up. */
export function normalizePointer(
  clientX: number, clientY: number, width: number, height: number, out: THREE.Vector2,
): THREE.Vector2 {
  return out.set((clientX / Math.max(1, width)) * 2 - 1, 1 - (clientY / Math.max(1, height)) * 2);
}

/**
 * One frame of the camera: base pose for the rig's aspect, parallax damped, look-at offset by yaw and pitch, fov
 * scaled. Touches the projection matrix only when fov, near or far changed (R3F updates it on resize itself).
 */
export function composeCamera(
  rig: Rig, yawDeg: number, pitchDeg: number, fovScale: number, dt: number, camera: THREE.PerspectiveCamera,
): void {
  const base = rig.portrait ? CAMERA_PORTRAIT : CAMERA_LANDSCAPE;
  if (rig.parallaxOn) rig.parallax.lerp(rig.pointer, 1 - Math.exp(-Math.max(0, dt) / PARALLAX_TAU));
  else rig.parallax.set(0, 0);
  const yaw = (yawDeg + rig.parallax.x * PARALLAX_DEG) * DEG;
  const pitch = (pitchDeg + rig.parallax.y * PARALLAX_DEG) * DEG;
  const [px, py, pz] = base.position;
  const [lx, ly, lz] = base.lookAt;
  const d = Math.hypot(lx - px, ly - py, lz - pz);
  rig.lookAt.set(lx + Math.tan(yaw) * d, ly + Math.tan(pitch) * d, lz);
  camera.position.set(px, py, pz);
  camera.lookAt(rig.lookAt);
  const fov = base.fov * fovScale;
  if (camera.fov !== fov || camera.near !== CAMERA_NEAR || camera.far !== CAMERA_FAR) {
    camera.fov = fov;
    camera.near = CAMERA_NEAR;
    camera.far = CAMERA_FAR;
    camera.updateProjectionMatrix();
  }
}
