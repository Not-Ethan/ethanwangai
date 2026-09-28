import { KIND, PRIMITIVE, type KindId, type PartSpec, type Vec3, type Vec4 } from '@/bench/types';
import { IDENTITY_Q, rotY, rotZ, rotX } from '@/bench/math';

type Axis = 'x' | 'y' | 'z';
const Z4: Vec4 = [0, 0, 0, 0];

/**
 * Rotation that takes local +z onto the given axis. The torus lies in the local XY plane (normal +z)
 * and spin parts rotate about local z, so a ring and its spoke share this quaternion for the same axis.
 */
function axisQuat(axis: Axis): Vec4 {
  return axis === 'z' ? IDENTITY_Q : axis === 'x' ? rotY(Math.PI / 2) : rotX(Math.PI / 2);
}

export function bar(from: Vec3, to: Vec3, module: string, group: number, kind: KindId = KIND.static, param: Vec4 = Z4, explodeMode: PartSpec['explodeMode'] = 'module'): PartSpec {
  const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
  const len = Math.hypot(dx, dy, dz);
  let q: Vec4 = IDENTITY_Q;
  if (Math.abs(dz) > Math.abs(dx) && Math.abs(dz) > Math.abs(dy)) q = rotY(-Math.PI / 2 * Math.sign(dz));
  else if (Math.abs(dy) > Math.abs(dx)) q = rotZ(Math.PI / 2 * Math.sign(dy));
  else if (dx < 0) q = rotY(Math.PI);
  return { primitive: PRIMITIVE.bar, kind, position: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2], quaternion: q, scale: [len, 1, 1], param, col: -1, module, group, explodeMode };
}
export function rod(from: Vec3, to: Vec3, module: string, group: number): PartSpec {
  const b = bar(from, to, module, group);
  // Cylinder geometry is along +y; rotate so its axis follows the bar direction.
  const len = b.scale[0];
  const dx = to[0] - from[0], dz = to[2] - from[2];
  const q: Vec4 = Math.abs(dz) > Math.abs(dx) ? rotX(Math.PI / 2) : rotZ(-Math.PI / 2);
  return { ...b, primitive: PRIMITIVE.rod, quaternion: q, scale: [1, len, 1] };
}
export function ring(at: Vec3, axis: Axis, module: string, group: number, param: Vec4, scale = 1): PartSpec {
  // Torus lies in the XY plane (normal +z). axis = the spin axis (normal).
  return { primitive: PRIMITIVE.ring, kind: KIND.spin, position: at, quaternion: axisQuat(axis), scale: [scale, scale, scale], param, col: -1, module, group, explodeMode: 'module' };
}
export function spoke(at: Vec3, axis: Axis, module: string, group: number, param: Vec4, r = 0.5): PartSpec {
  // A bar of length 2r through the ring centre, lying in the ring's plane and spinning with it (same quaternion as the ring).
  return { primitive: PRIMITIVE.bar, kind: KIND.spin, position: at, quaternion: axisQuat(axis), scale: [2 * r, 0.6, 0.6], param, col: -1, module, group, explodeMode: 'module' };
}
export function tile(at: Vec3, module: string, group: number, kind: KindId, param: Vec4, col = -1): PartSpec {
  return { primitive: PRIMITIVE.tile, kind, position: at, quaternion: IDENTITY_Q, scale: [1, 1, 1], param, col, module, group, explodeMode: 'module' };
}
export function cell(at: Vec3, s: Vec3, module: string, group: number, kind: KindId, param: Vec4, col: number, explodeMode: PartSpec['explodeMode'] = 'rise'): PartSpec {
  return { primitive: PRIMITIVE.cell, kind, position: at, quaternion: IDENTITY_Q, scale: s, param, col, module, group, explodeMode };
}
