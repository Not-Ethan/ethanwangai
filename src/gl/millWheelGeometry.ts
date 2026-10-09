// The mill wheel (spec §4.5): an outer rim of radius 3.2, an inner ring, a hub on a z axle, six spokes (twelve
// radii) and twelve paddles, merged into one geometry. The wheel lies in the x-y plane and turns about z.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PLACES } from '@/valley/layout';
import type { Vec3 } from '@/valley/types';

export const MILL_WHEEL_RADIUS = 3.2;
export const MILL_WHEEL_PADDLES = 12;
export const MILL_AXLE_Y = 2.6;
export const MILL_WHEEL_POSITION: Vec3 = [PLACES.millWheel[0], MILL_AXLE_Y, PLACES.millWheel[2]];

export function buildMillWheelGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [
    new THREE.TorusGeometry(MILL_WHEEL_RADIUS, 0.12, 6, 36),
    new THREE.TorusGeometry(MILL_WHEEL_RADIUS * 0.55, 0.08, 6, 24),
    new THREE.CylinderGeometry(0.45, 0.45, 1.6, 10).rotateX(Math.PI / 2),
  ];
  for (let i = 0; i < 6; i++) {
    parts.push(new THREE.BoxGeometry(MILL_WHEEL_RADIUS * 2, 0.14, 0.14).rotateZ((i * Math.PI) / 6));
  }
  for (let i = 0; i < MILL_WHEEL_PADDLES; i++) {
    const a = (i * 2 * Math.PI) / MILL_WHEEL_PADDLES;
    const r = MILL_WHEEL_RADIUS - 0.4;
    parts.push(new THREE.BoxGeometry(1.0, 0.12, 1.4).rotateZ(a).translate(Math.cos(a) * r, Math.sin(a) * r, 0));
  }
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!merged) throw new Error('mill wheel: parts did not merge');
  merged.computeBoundingSphere();
  return merged;
}
