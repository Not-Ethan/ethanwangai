// The mill wheel's mesh, for the Driver to turn without React (spec §6: one useFrame). Null until MillWheel mounts
// and again after it unmounts.
import type * as THREE from 'three';

export const wheelRef: { current: THREE.Object3D | null } = { current: null };
