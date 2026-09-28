import { KIND, MACHINE, type MachineConfig, type PartSpec, type Vec3 } from '@/bench/types';
import { hash2 } from '@/bench/hash';
import { bar, cell } from './helpers';

// WVU: a field of short cells with a scanning rail. The field is centred on the local origin.
// Phone halves each field axis and doubles the pitch and cell scale, so the footprint is the same on both tiers.
export const WATCH_FIELD = { cols: 48, rows: 16, pitch: 0.07 } as const;
const CELL_SCALE: Vec3 = [0.05, 0.12, 0.05];
const RAIL_Y = 0.2;
const SWEEP_PERIOD_S = 4.0;
const LEVER_Y = 0.35, LEVER_LEN = 0.4, LEVER_Z_GAP = 0.1;

export const WATCH: MachineConfig = {
  id: MACHINE.watch, name: 'watch', footprint: { w: 3.4, d: 1.4 },
  build: (ctx) => {
    const div = ctx.tier === 'phone' ? 2 : 1;
    const cols = WATCH_FIELD.cols / div, rows = WATCH_FIELD.rows / div, pitch = WATCH_FIELD.pitch * div;
    const scale: Vec3 = [CELL_SCALE[0] * div, CELL_SCALE[1] * div, CELL_SCALE[2] * div];
    const w = cols * pitch, d = rows * pitch;
    const minX = -w / 2, minZ = -d / 2;
    const out: PartSpec[] = [];
    // Group 0: the field, ordered by column, then the rail parked at the field's −x edge.
    // scan cell = [col, row, hashedBaseline, 0]; scan rail = [fieldWidth, sweepPeriodS, 0, 0].
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      out.push(cell([minX + (c + 0.5) * pitch, 0, minZ + (r + 0.5) * pitch], scale, 'field', 0, KIND.scan, [c, r, hash2(c, r), 0], c));
    }
    out.push(bar([minX, RAIL_Y, minZ], [minX, RAIL_Y, minZ + d], 'rail', 0, KIND.scan, [w, SWEEP_PERIOD_S, 0, 0]));
    // Group 1: the lever, last and alone. Just off the rail's −z end, pivoted at its −x end, pointing +x.
    const lz = minZ - LEVER_Z_GAP;
    out.push(bar([minX, LEVER_Y, lz], [minX + LEVER_LEN, LEVER_Y, lz], 'lever', 1, KIND.lever, [2, -0.5, 0, 0]));
    return out;
  },
};
