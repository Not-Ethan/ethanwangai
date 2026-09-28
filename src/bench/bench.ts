import type { Vec3, Vec4 } from './types';
import { mulQuat, rotY } from './math';

export interface Placement { origin: Vec3; yaw: number }

export const BENCH_SEED_TEXT = 'now is the best time in history to build things.';

/** Compact cluster ~15 × 10. Quoter along the back; bot at its front-left corner; balance, splitter, watch in front; slot front-right. */
export const PLACEMENT: Placement[] = [
  { origin: [0, 0, -2], yaw: 0 },        // quoter (bed 9.6 × 7.2 inside a 12 × 8 frame)
  { origin: [-7.4, 0, -2], yaw: 0 },     // intake: hopper and chute at the headline (−x) end of the quoter
  { origin: [-4.2, 0, 4.6], yaw: 0 },    // balance
  { origin: [0.4, 0, 4.8], yaw: 0 },     // splitter (fan opens toward +x)
  { origin: [4.6, 0, 4.6], yaw: 0 },     // watch
  { origin: [-5.4, 0, 2.5], yaw: 0 },    // bot, touching the quoter's front-left post
  { origin: [6.2, 0, 6.6], yaw: 0 },     // slot
  { origin: [6.2, 0, 6.6], yaw: 0 },     // visitor builds inside the slot
];

export function toBench(local: Vec3, p: Placement): Vec3 {
  const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
  return [p.origin[0] + local[0] * c + local[2] * s, p.origin[1] + local[1], p.origin[2] - local[0] * s + local[2] * c];
}

export function quatToBench(q: Vec4, p: Placement): Vec4 { return p.yaw === 0 ? q : mulQuat(rotY(p.yaw), q); }
