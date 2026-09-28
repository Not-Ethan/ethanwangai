'use client';
// The camera rig (design §6 Camera, §8 Pointer): useFrame at priority 0, after Clocks (−1) has written this frame's
// pose into hud.pose. Applies the pointer parallax, an orbit of at most 2° about the lookAt damped with τ 0.4 s and
// off on phone and under reduced motion, then sets the camera's position, lookAt and fov, touching the projection
// matrix only when the fov changes. The pointer comes from a window pointermove: the canvas wrapper has
// pointer-events: none, so R3F's own pointer never updates.
import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useScroll } from '@/scroll/ScrollProvider';
import { hud, type HudPose } from './hud';
import { cameraRef } from './registry';

export const PARALLAX_RAD = (2 * Math.PI) / 180;
export const PARALLAX_TAU = 0.4;

export interface Rig {
  enabled: boolean;
  pointer: THREE.Vector2;    // target, −1..1, x right and y up
  parallax: THREE.Vector2;   // damped toward pointer
  position: THREE.Vector3;   // scratch: this frame's camera position
  lookAt: THREE.Vector3;
}

export function createRig(enabled: boolean): Rig {
  return { enabled, pointer: new THREE.Vector2(), parallax: new THREE.Vector2(), position: new THREE.Vector3(), lookAt: new THREE.Vector3() };
}

/** A window pointer in −1..1 with y up, the frame R3F's own pointer uses. */
export function normalizePointer(clientX: number, clientY: number, width: number, height: number, out: THREE.Vector2): THREE.Vector2 {
  return out.set((clientX / width) * 2 - 1, 1 - (clientY / height) * 2);
}

const UP = new THREE.Vector3(0, 1, 0);
const _offset = new THREE.Vector3();
const _right = new THREE.Vector3();

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

/** One frame: pose in, parallax damped and applied, camera written. Pointer right / up moves the camera right / up. */
export function stepRig(rig: Rig, camera: THREE.PerspectiveCamera, pose: HudPose, dt: number): void {
  rig.position.fromArray(pose.position);
  rig.lookAt.fromArray(pose.lookAt);
  if (rig.enabled) {
    rig.parallax.lerp(rig.pointer, 1 - Math.exp(-dt / PARALLAX_TAU));
    orbit(rig.position, rig.lookAt, rig.parallax.x * PARALLAX_RAD, rig.parallax.y * PARALLAX_RAD);
  }
  camera.position.copy(rig.position);
  camera.lookAt(rig.lookAt);
  if (camera.fov !== pose.fov) {
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
  }
}

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const { tier, reducedMotion } = useScroll();
  const rig = useMemo(() => createRig(tier === 'desktop' && !reducedMotion), [tier, reducedMotion]);

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
