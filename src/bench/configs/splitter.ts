import { KIND, MACHINE, PRIMITIVE, type MachineConfig, type PartSpec, type Vec3, type Vec4 } from '@/bench/types';
import { IDENTITY_Q, rotX, rotY } from '@/bench/math';
import { bar, ring, spoke, tile } from './helpers';

// Darch: one job in along the in-rail, split at the block into twelve, out along the fan.
// The lane shader hardcodes the in-rail length (SPLIT_D1 1.6) and the fan end points; keep them exact.
const RAIL_Y = 0.3;
const IN_FROM: Vec3 = [-2.0, RAIL_Y, 0], IN_TO: Vec3 = [-0.4, RAIL_Y, 0];
const BLOCK_C: Vec3 = [0, RAIL_Y, 0];
const BLOCK = 0.5;                                 // the block is a 0.5 cube
const BAR_T = 0.12;                                // a bar's cross-section
const PLATE_OFF = BLOCK / 2 - BAR_T / 2;           // plate centre from the cube centre, so the outer face sits at ±0.25
const FAN_FROM: Vec3 = [0.3, RAIL_Y, 0];
const FAN_X = 2.2, FAN_Z0 = -1.1, FAN_DZ = 0.2;    // out-rail j ends at [2.2, 0.3, −1.1 + j·0.2]
const LANES = 12, JOBS = 4;
const RING_Y = 0.75, RING_Z = 0.3, RING_SCALE = 0.3;
const SPIN: Vec4 = [0, 3.0, 0, 0];                 // [0, baseRate, phase, 0] about local z
const REST: Vec3 = [-1.9, 0.33, 0];                // every tile rests here; a job's twelve read as one until the block splits them

/** One face of the block: a bar stretched into a 0.5 × 0.5 × 0.12 plate whose thin axis (local z) is the face normal. */
function plate(axis: 0 | 1 | 2, sign: -1 | 1): PartSpec {
  const off = sign * PLATE_OFF;
  const position: Vec3 = [BLOCK_C[0] + (axis === 0 ? off : 0), BLOCK_C[1] + (axis === 1 ? off : 0), BLOCK_C[2] + (axis === 2 ? off : 0)];
  const quaternion = axis === 0 ? rotY(Math.PI / 2) : axis === 1 ? rotX(-Math.PI / 2) : IDENTITY_Q;
  return { primitive: PRIMITIVE.bar, kind: KIND.static, position, quaternion, scale: [BLOCK, BLOCK / BAR_T, 1], param: [0, 0, 0, 0], col: -1, module: 'block', group: 0, explodeMode: 'module' };
}

/** Out-rail j, diagonal in the xz plane. helpers.bar() only orients along an axis, so the yaw is set here. */
function outRail(j: number): PartSpec {
  const to: Vec3 = [FAN_X, RAIL_Y, FAN_Z0 + j * FAN_DZ];
  const dx = to[0] - FAN_FROM[0], dz = to[2] - FAN_FROM[2];
  return { ...bar(FAN_FROM, to, 'fan', 1), quaternion: rotY(-Math.atan2(dz, dx)) };
}

export const SPLITTER: MachineConfig = {
  id: MACHINE.splitter, name: 'splitter', footprint: { w: 4.2, d: 2.4 },
  build: () => {
    const out: PartSpec[] = [];
    // Group 0: the in-rail and the block.
    out.push(bar(IN_FROM, IN_TO, 'in-rail', 0));
    for (const axis of [0, 1, 2] as const) for (const sign of [-1, 1] as const) out.push(plate(axis, sign));
    // Group 1: two spoked rings above the block, the twelve-rail fan, then the payload.
    for (const z of [RING_Z, -RING_Z]) {
      const at: Vec3 = [0, RING_Y, z];
      out.push(ring(at, 'z', 'rings', 1, SPIN, RING_SCALE));
      out.push(spoke(at, 'z', 'rings', 1, SPIN, RING_SCALE / 2));
    }
    for (let j = 0; j < LANES; j++) out.push(outRail(j));
    // 48 tiles = 4 jobs × 12 lanes. lane = [rate, phase, segLen, j]; tile i is lane 1 + (i % 12) of job floor(i / 12).
    for (let i = 0; i < JOBS * LANES; i++) {
      out.push(tile(REST, 'tiles', 1, KIND.lane, [2.2, Math.floor(i / LANES) / JOBS, 3.8, 1 + (i % LANES)], i % LANES));
    }
    // Group 2: the lever, last and alone. On the block's top front edge, pivoted at its −x end, pointing +x.
    out.push(bar([0, 0.6, 0.3], [0.4, 0.6, 0.3], 'lever', 2, KIND.lever, [2, -0.5, 0, 0]));
    return out;
  },
};
