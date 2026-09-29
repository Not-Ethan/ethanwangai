'use client';
// The camera rig (design §6 Camera, §8 Pointer): useFrame at priority 0, after Clocks (−1) has written this frame's
// pose into hud.pose. Applies the pointer parallax, an orbit of at most 2° about the lookAt damped with τ 0.4 s and
// off on phone and under reduced motion, then sets the camera's position, lookAt and fov, touching the projection
// matrix only when the fov changes. Under reduced motion the pose is the pose table's nearest station (Clocks.ts,
// stationPose), and the rig eases toward it with τ 0.13 s instead of taking it, so a camera move is a ~400 ms lerp
// between poses (design §11). The pointer comes from a window pointermove: the canvas wrapper has pointer-events:
// none, so R3F's own pointer never updates.
import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useScroll } from '@/scroll/ScrollProvider';
import { hud, type HudPose } from './hud';
import { cameraRef } from './registry';

export const PARALLAX_RAD = (2 * Math.PI) / 180;
export const PARALLAX_TAU = 0.4;
/** Reduced motion's pose damping: 95% of a move in 3τ ≈ 400 ms. */
export const POSE_TAU = 0.13;

export interface Rig {
  enabled: boolean;          // the pointer parallax: desktop, full motion
  damped: boolean;           // reduced motion: ease toward the pose instead of taking it
  primed: boolean;           // the damped rig has taken its first pose
  pointer: THREE.Vector2;    // target, −1..1, x right and y up
  parallax: THREE.Vector2;   // damped toward pointer
  position: THREE.Vector3;   // the pose's position this frame (damped: eased), before the parallax
  lookAt: THREE.Vector3;
}

export function createRig(enabled: boolean, damped = false): Rig {
  return {
    enabled, damped, primed: false,
    pointer: new THREE.Vector2(), parallax: new THREE.Vector2(), position: new THREE.Vector3(), lookAt: new THREE.Vector3(),
  };
}

/** A window pointer in −1..1 with y up, the frame R3F's own pointer uses. */
export function normalizePointer(clientX: number, clientY: number, width: number, height: number, out: THREE.Vector2): THREE.Vector2 {
  return out.set((clientX / width) * 2 - 1, 1 - (clientY / height) * 2);
}

const UP = new THREE.Vector3(0, 1, 0);
const _offset = new THREE.Vector3();
const _right = new THREE.Vector3();
const _to = new THREE.Vector3();
const _eye = new THREE.Vector3();

/**
 * Orbits `position` about `lookAt` in place, in radians: yaw about world up (positive moves the camera to its right),
 * then pitch about the view's right axis (positive lifts it). Looking straight down there is no right axis: yaw alone.
 */
export function orbit(position: THREE.Vector3, lookAt: THREE.Vector3, yaw: number, pitch: number): void {
  _offset.copy(position).sub(lookAt);
  _right.crossVectors(UP, _offset);
  _offset.applyAxisAngle(UP, yaw);
  if (_right.lengthSq() > 1e-12) _offset.applyAxisAngle(_right.normalize(), -pitch);
  position.copy(lookAt).add(_offset);
}

/**
 * One frame: pose in (damped: eased toward it, the first taken exactly), parallax damped and applied, camera written.
 * Pointer right / up moves the camera right / up.
 */
export function stepRig(rig: Rig, camera: THREE.PerspectiveCamera, pose: HudPose, dt: number): void {
  if (rig.damped && rig.primed) {
    const k = 1 - Math.exp(-dt / POSE_TAU);
    rig.position.lerp(_to.fromArray(pose.position), k);
    rig.lookAt.lerp(_to.fromArray(pose.lookAt), k);
  } else {
    rig.position.fromArray(pose.position);
    rig.lookAt.fromArray(pose.lookAt);
    rig.primed = true;
  }
  _eye.copy(rig.position);
  if (rig.enabled) {
    rig.parallax.lerp(rig.pointer, 1 - Math.exp(-dt / PARALLAX_TAU));
    orbit(_eye, rig.lookAt, rig.parallax.x * PARALLAX_RAD, rig.parallax.y * PARALLAX_RAD);
  }
  camera.position.copy(_eye);
  camera.lookAt(rig.lookAt);
  if (camera.fov !== pose.fov) {
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
  }
}

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const { tier, reducedMotion } = useScroll();
  const rig = useMemo(() => createRig(tier === 'desktop' && !reducedMotion, reducedMotion), [tier, reducedMotion]);

  useEffect(() => {
    cameraRef.current = camera;
    return () => { cameraRef.current = null; };
  }, [camera]);

  useEffect(() => {
    if (!rig.enabled) return;
    const onMove = (e: PointerEvent) => { normalizePointer(e.clientX, e.clientY, window.innerWidth, window.innerHeight, rig.pointer); };
    const onLeave = () => { rig.pointer.set(0, 0); };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [rig]);

  useFrame((_, delta) => stepRig(rig, camera, hud.pose, delta), 0);
  return null;
}
