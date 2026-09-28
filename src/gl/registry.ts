// Module-level handles to the live scene objects that per-frame code and the visitor upload reach without React:
// Kits.tsx fills kitRefs as its meshes mount; Lights.tsx and CameraRig.tsx fill lightRef and cameraRef. Each entry
// is null until its owner mounts and again after it unmounts. Plain { current } objects, so they pass as React refs.
import type * as THREE from 'three';
import { PRIMITIVE, type PrimitiveId } from '@/bench';

/** One InstancedMesh per primitive, for the Stage 4 visitor upload into the reserve instances. */
export const kitRefs: Record<PrimitiveId, THREE.InstancedMesh | null> = {
  [PRIMITIVE.cell]: null, [PRIMITIVE.cap]: null, [PRIMITIVE.bar]: null,
  [PRIMITIVE.rod]: null, [PRIMITIVE.ring]: null, [PRIMITIVE.tile]: null,
};

/** The key light, whose shadow camera Clocks fits each frame. */
export const lightRef: { current: THREE.DirectionalLight | null } = { current: null };

/** The scene camera, for the ink projection and the shadow fit. */
export const cameraRef: { current: THREE.PerspectiveCamera | null } = { current: null };

/** Lights.tsx hands its DirectionalLight in as it mounts and null as it unmounts; Clocks fits lightRef's shadow camera each frame. */
export function setLightRef(l: THREE.DirectionalLight | null): void {
  lightRef.current = l;
}
