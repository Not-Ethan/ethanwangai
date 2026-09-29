// Camera clearance: where a set of machines lands on screen through a pose, as an NDC bounding box, so the key
// tables can be checked numerically against the DOM's copy columns (design §3.1, gate G1). Pure: three's math
// classes only, no renderer.
import { PerspectiveCamera, Vector3 } from 'three';
import { MACHINE_COUNT, type LayoutResult, type MachineId, type Vec3 } from './types';
import type { Pose } from './camera';

/** NDC box, x right and y up, of projected rest positions; the frame is [−1, 1] on both axes. */
export interface NdcBounds { left: number; right: number; top: number; bottom: number }

/** The poses the clearance test checks: the hero and its risen end, then one dwell per section. */
export const DWELL: Array<{ section: number; u: number }> = [
  { section: 0, u: 0 }, { section: 0, u: 1 }, { section: 1, u: 0.5 }, { section: 2, u: 0.30 }, { section: 2, u: 0.85 },
  { section: 3, u: 0.6 }, { section: 4, u: 0.7 }, { section: 5, u: 0.7 }, { section: 6, u: 0.7 }, { section: 7, u: 0.8 },
  { section: 8, u: 0.6 },
];

/** The Scene canvas's clip planes (CAMERA in src/gl/Scene.tsx); the projection matrix needs them, the bounds barely do. */
const NEAR = 0.5, FAR = 120;

/**
 * Projects every rest position of the listed machines' parts through a PerspectiveCamera at `pose` and returns their
 * NDC bounding box, or null when no part is in front of the camera. Parts behind the camera plane are skipped rather
 * than mirrored through it, which is what a naive project() would do.
 */
export function projectBounds(result: LayoutResult, machines: MachineId[], pose: Pose, aspect: number): NdcBounds | null {
  const cam = cameraAt(pose, aspect);
  const listed = new Array<boolean>(MACHINE_COUNT).fill(false);
  for (const m of machines) listed[m] = true;
  const v = new Vector3();
  let left = Infinity, right = -Infinity, top = -Infinity, bottom = Infinity;
  for (const p of result.parts) {
    if (!listed[p.machine]) continue;
    v.set(p.position[0], p.position[1], p.position[2]).applyMatrix4(cam.matrixWorldInverse);
    if (v.z >= 0) continue;                    // on or behind the camera plane
    v.applyMatrix4(cam.projectionMatrix);      // applyMatrix4 divides by w: this is project() without the mirror
    if (v.x < left) left = v.x;
    if (v.x > right) right = v.x;
    if (v.y > top) top = v.y;
    if (v.y < bottom) bottom = v.y;
  }
  return left === Infinity ? null : { left, right, top, bottom };
}

/** NDC [x, y] of one bench-space point through `pose`, or null when it is on or behind the camera plane. */
export function projectPoint(point: Vec3, pose: Pose, aspect: number): [number, number] | null {
  const cam = cameraAt(pose, aspect);
  const v = new Vector3(point[0], point[1], point[2]).applyMatrix4(cam.matrixWorldInverse);
  if (v.z >= 0) return null;
  v.applyMatrix4(cam.projectionMatrix);
  return [v.x, v.y];
}

function cameraAt(pose: Pose, aspect: number): PerspectiveCamera {
  const cam = new PerspectiveCamera(pose.fov, aspect, NEAR, FAR);
  cam.position.set(pose.position[0], pose.position[1], pose.position[2]);
  cam.lookAt(pose.lookAt[0], pose.lookAt[1], pose.lookAt[2]);
  cam.updateMatrixWorld(true);
  cam.updateProjectionMatrix();
  return cam;
}

/** Camera pitch above the bench plane in degrees: asin((position.y − lookAt.y) / |position − lookAt|). */
export function elevationDeg(pose: Pose): number {
  const dx = pose.position[0] - pose.lookAt[0], dy = pose.position[1] - pose.lookAt[1], dz = pose.position[2] - pose.lookAt[2];
  return Math.asin(dy / Math.hypot(dx, dy, dz)) * 180 / Math.PI;
}

/**
 * Heading of the horizontal view direction in degrees: 0 looks straight along −z toward the back of the bench, +90
 * along +x, −90 along −x. The balance's rail runs along x, so a side-on view of it has an azimuth near 0.
 */
export function azimuthDeg(pose: Pose): number {
  return Math.atan2(pose.lookAt[0] - pose.position[0], pose.position[2] - pose.lookAt[2]) * 180 / Math.PI;
}
