// The six kit primitives (design §5), one base geometry per PrimitiveId. Cell and tile stand on the bench with
// their origin at the base, so the cell kind can scale height from y = 0; the bar is a unit length along x that
// a part's scale.x stretches; the cap is centred and pivots on an edge in the cap kind. Kits.tsx clones each per
// kit before adding instanced attributes, so these stay pristine.
import * as THREE from 'three';
import { PRIMITIVE, type PrimitiveId } from '@/bench';

export function createKitGeometries(): Record<PrimitiveId, THREE.BufferGeometry> {
  return {
    [PRIMITIVE.cell]: new THREE.BoxGeometry(0.8, 1, 0.8).translate(0, 0.5, 0),
    [PRIMITIVE.cap]: new THREE.BoxGeometry(0.8, 0.03, 0.8),
    [PRIMITIVE.bar]: new THREE.BoxGeometry(1, 0.12, 0.12),
    [PRIMITIVE.rod]: new THREE.CylinderGeometry(0.05, 0.05, 1, 8),
    [PRIMITIVE.ring]: new THREE.TorusGeometry(0.5, 0.06, 8, 24),
    [PRIMITIVE.tile]: new THREE.BoxGeometry(0.2, 0.02, 0.2).translate(0, 0.01, 0),
  };
}
