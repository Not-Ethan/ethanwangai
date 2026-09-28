import { KIND, MACHINE, PRIMITIVE, type MachineConfig, type PartSpec, type Vec3 } from '@/bench/types';
import { hash2 } from '@/bench/hash';
import { IDENTITY_Q } from '@/bench/math';
import { bar, cell, ring, rod, spoke, tile } from './helpers';

export const QUOTER_BED = { cols: 64, rows: 48, pitch: 0.15, cellScale: 0.12, hBase: 0.4 } as const;
// Frame envelope (local): x ±5.8, z ±3.95, top rails at y 1.4, carriage rails at y 1.0.
const FX = 5.8, FZ = 3.95, TOP = 1.4, RAIL_Y = 1.0;
const RAIL_Z = [-2.4, 0, 2.4];

export const QUOTER: MachineConfig = {
  id: MACHINE.quoter, name: 'quoter', footprint: { w: 12, d: 8 },
  build(ctx) {
    const P: PartSpec[] = [];
    // group 0: frame
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(bar([sx * FX, 0, sz * FZ], [sx * FX, TOP, sz * FZ], 'posts', 0));
    for (const sz of [-1, 1]) { P.push(bar([-FX, TOP, sz * FZ], [FX, TOP, sz * FZ], 'topRailsX', 0)); P.push(bar([-FX, 0.06, sz * FZ], [FX, 0.06, sz * FZ], 'baseRailsX', 0)); }
    for (const sx of [-1, 1]) { P.push(bar([sx * FX, TOP, -FZ], [sx * FX, TOP, FZ], 'topRailsZ', 0)); P.push(bar([sx * FX, 0.06, -FZ], [sx * FX, 0.06, FZ], 'baseRailsZ', 0)); }

    // group 1: bed (rise), ordered by column so it racks in from −x
    const cols = Math.round(QUOTER_BED.cols * (ctx.density === 1 ? 1 : 0.5));
    const rows = Math.round(QUOTER_BED.rows * (ctx.density === 1 ? 1 : 0.5));
    const pitch = QUOTER_BED.pitch * (QUOTER_BED.cols / cols);
    const cs = QUOTER_BED.cellScale * (QUOTER_BED.cols / cols);
    const x0 = -((cols - 1) * pitch) / 2, z0 = -((rows - 1) * pitch) / 2;
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const size = 0.6 + 0.4 * hash2(c, r);
      const at: Vec3 = [x0 + c * pitch, 0, z0 + r * pitch];
      P.push(cell(at, [cs, QUOTER_BED.hBase, cs], 'bed', 1, KIND.cell, [c, r, size, 0], c));
    }
    if (ctx.caps) for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const size = 0.6 + 0.4 * hash2(c, r);
      P.push({ primitive: PRIMITIVE.cap, kind: KIND.cap, position: [x0 + c * pitch, QUOTER_BED.hBase, z0 + r * pitch], quaternion: IDENTITY_Q, scale: [cs, 1, cs], param: [c, r, size, 0], col: c, module: 'bed', group: 1, explodeMode: 'rise' });
    }

    // group 2: carriage rails and supports
    RAIL_Z.forEach((z, i) => {
      P.push(bar([-FX + 0.2, RAIL_Y, z], [FX - 0.2, RAIL_Y, z], `rail${i}`, 2));
      for (const sx of [-1, 1]) P.push(bar([sx * (FX - 0.2), 0.06, z], [sx * (FX - 0.2), RAIL_Y, z], `railSupport${i}`, 2));
    });

    // group 3: six carriages, two per rail, parked at opposite rail ends and sweeping toward each other
    let k = 0;
    RAIL_Z.forEach((z) => {
      for (const side of [0, 1]) {
        const m = `carriage${k}`;
        const period = 1.6 + 4.4 * hash2(k, 11), phase = 0, dir = side ? -1 : 1;
        const sweep = [2 * (FX - 0.9), period, phase, dir] as const;
        const x = side ? (FX - 0.9) : -(FX - 0.9);  // sweep offset = dir * len * 0.5 * (1 - cos(2π(mt/period + phase))), so both sides are parked at mt 0
        const y = RAIL_Y;
        P.push(bar([x - 0.45, y, z - 0.45], [x + 0.45, y, z - 0.45], m, 3, KIND.sweep, sweep));
        P.push(bar([x - 0.45, y, z + 0.45], [x + 0.45, y, z + 0.45], m, 3, KIND.sweep, sweep));
        P.push(bar([x - 0.25, y + 0.15, z - 0.5], [x - 0.25, y + 0.15, z + 0.5], m, 3, KIND.sweep, sweep));
        P.push(bar([x + 0.25, y + 0.15, z - 0.5], [x + 0.25, y + 0.15, z + 0.5], m, 3, KIND.sweep, sweep));
        for (const px of [-0.3, 0.3]) for (const pz of [-0.3, 0.3]) P.push(bar([x + px, y - 0.35, z + pz], [x + px, y, z + pz], m, 3, KIND.sweep, sweep));
        P.push({ ...rod([x, y + 0.3, z - 0.4], [x, y + 0.3, z + 0.4], m, 3), kind: KIND.sweep, param: sweep });
        for (const rz of [-0.25, 0.25]) {
          // Rings and spokes ride the carriage, so they take its sweep kind and param rather than spinning.
          P.push({ ...ring([x, y + 0.3, z + rz], 'z', m, 3, sweep, 0.35), kind: KIND.sweep });
          P.push({ ...spoke([x, y + 0.3, z + rz], 'z', m, 3, sweep, 0.17), kind: KIND.sweep });
        }
        for (let tx = 0; tx < 5; tx++) for (let tz = 0; tz < 4; tz++)
          P.push({ ...tile([x - 0.4 + tx * 0.2, y - 0.4, z - 0.3 + tz * 0.2], m, 3, KIND.sweep, sweep), scale: [0.9, 1, 0.9] });
        k++;
      }
    });

    // group 4: rotor banks (12 per side), spinning about x, with a spoke each
    for (const sx of [-1, 1]) for (let i = 0; i < 12; i++) {
      const z = -FZ + 0.55 + i * ((2 * FZ - 1.1) / 11);
      const at: Vec3 = [sx * (FX - 0.55), 0.7, z];
      const spin = [0, 1.2 + 0.8 * hash2(i, sx + 2), hash2(i, 9), 0] as const;
      const m = `rotor${sx > 0 ? 'R' : 'L'}${i}`;
      P.push(ring(at, 'x', m, 4, spin, 0.45));
      P.push(spoke(at, 'x', m, 4, spin, 0.22));
      P.push(rod([at[0] - 0.12, at[1], at[2]], [at[0] + 0.12, at[1], at[2]], m, 4));
    }

    // group 5: the lever, alone; pivot at its −x end on the front-left post at y 1.2, pointing +x, raised 30° until it locks
    P.push({ primitive: PRIMITIVE.bar, kind: KIND.lever, position: [-FX + 0.5, 1.2, FZ], quaternion: IDENTITY_Q, scale: [1.0, 1.4, 1.4], param: [2, -0.5, 0, 0], col: -1, module: 'lever', group: 5, explodeMode: 'module' });
    return P;
  },
};
