import { KIND, MACHINE, type MachineConfig, type PartSpec, type Vec4 } from '@/bench/types';
import { bar, tile } from './helpers';

// Heron: liability tiles stack on the left end, hedge tiles on the right until the rail re-levels.
// The post stands at the local origin; the rail and everything on it tilt about the post (pivot x = 0).
const POST_H = 0.9;                     // post top; the rail's centre line
const RAIL_HALF = 1.4;                  // the rail runs x ±1.4
const TRAY_X = 1.3;                     // stack and tray centre on each end
const TRAY_HALF = 0.17;                 // tray square half-size: a lip just wider than a 0.2 tile
const TRAY_Y = POST_H + 0.06;           // on the rail's top face, half-buried, so no face is coplanar with the rail
const TILES_PER_SIDE = 48;
const TILE_Y0 = 0.93, TILE_PITCH = 0.025;
const TILT: Vec4 = [0, 0, 0, 0];        // [pivotX, 0, 0, 0]

/** Four short bars framing the rail's end, tilting with it. */
function tray(side: -1 | 1, name: string, out: PartSpec[]) {
  const cx = side * TRAY_X, h = TRAY_HALF, y = TRAY_Y;
  out.push(bar([cx - h, y, -h], [cx + h, y, -h], name, 0, KIND.tilt, TILT));
  out.push(bar([cx - h, y, h], [cx + h, y, h], name, 0, KIND.tilt, TILT));
  out.push(bar([cx - h, y, -h], [cx - h, y, h], name, 0, KIND.tilt, TILT));
  out.push(bar([cx + h, y, -h], [cx + h, y, h], name, 0, KIND.tilt, TILT));
}

export const BALANCE: MachineConfig = {
  id: MACHINE.balance, name: 'balance', footprint: { w: 3.0, d: 0.5 },
  build: () => {
    const out: PartSpec[] = [];
    // Group 0: the post, the long tilting rail, and a tray at each end.
    out.push(bar([0, 0, 0], [0, POST_H, 0], 'post', 0));
    out.push(bar([-RAIL_HALF, POST_H, 0], [RAIL_HALF, POST_H, 0], 'rail', 0, KIND.tilt, TILT));
    for (const side of [-1, 1] as const) {
      const name = side < 0 ? 'left' : 'right';
      tray(side, `tray-${name}`, out);
      // Group 1: 48 tiles per side, appearing by the 8 s game clock in stack order. stack = [side, index, gameClockOffset, 0].
      for (let i = 0; i < TILES_PER_SIDE; i++) {
        out.push(tile([side * TRAY_X, TILE_Y0 + i * TILE_PITCH, 0], `stack-${name}`, 1, KIND.stack, [side, i, i / TILES_PER_SIDE, 0]));
      }
    }
    // Group 2: the lever, last and alone. On the post cap, pivoted at its −x end, pointing +x.
    out.push(bar([0.05, 1.0, 0], [0.45, 1.0, 0], 'lever', 2, KIND.lever, [2, -0.5, 0, 0]));
    return out;
  },
};
