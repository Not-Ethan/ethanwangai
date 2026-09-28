import { KIND, MACHINE, type MachineConfig, type PartSpec, type Vec3 } from '@/bench/types';
import { bar, tile } from './helpers';

// Local origin sits at the quoter's −x (headline) end; PLACEMENT moves it. The chute runs toward +x onto the bed's near edge.
const HALF = 0.6;                       // the hopper is a 1.2 cube
const CY = 1.6;                         // hopper centre height
const Y0 = CY - HALF, Y1 = CY + HALF;   // hopper bottom and top (1.0, 2.2)
const MESH = 7;                         // grille: a 7 × 7 mesh of short bars per face, border left to the frame; 84 per face, 336 over four faces, 379 parts in all
const LEVER_LEN = 0.6;

/** 12 frame edges plus 4 legs to the bench. */
function frame(out: PartSpec[]) {
  const s = [-HALF, HALF];
  for (const y of [Y0, Y1]) for (const z of s) out.push(bar([-HALF, y, z], [HALF, y, z], 'hopper', 0));
  for (const y of [Y0, Y1]) for (const x of s) out.push(bar([x, y, -HALF], [x, y, HALF], 'hopper', 0));
  for (const x of s) for (const z of s) out.push(bar([x, Y0, z], [x, Y1, z], 'hopper', 0));
  for (const x of s) for (const z of s) out.push(bar([x, 0, z], [x, Y0, z], 'hopper', 0));
}

/** One grille face: interior mesh lines along u and v, each split into MESH short bars. (MESH − 1) · MESH · 2 parts. */
function grille(map: (u: number, v: number) => Vec3, out: PartSpec[]) {
  const p = (2 * HALF) / MESH;
  for (let k = 1; k < MESH; k++) {
    const c = -HALF + k * p;
    for (let i = 0; i < MESH; i++) {
      const a = -HALF + i * p, b = a + p;
      out.push(bar(map(a, c), map(b, c), 'hopper', 0));
      out.push(bar(map(c, a), map(c, b), 'hopper', 0));
    }
  }
}

export const INTAKE: MachineConfig = {
  id: MACHINE.intake, name: 'intake', footprint: { w: 2.6, d: 1.2 },
  build: () => {
    const out: PartSpec[] = [];
    // Group 0: hopper. Frame, then a grille on the three closed walls and the floor; the +x wall is open for the chute.
    frame(out);
    grille((u, v) => [-HALF, CY + v, u], out);
    grille((u, v) => [u, CY + v, -HALF], out);
    grille((u, v) => [u, CY + v, HALF], out);
    grille((u, v) => [u, Y0, v], out);
    // Group 1: chute. Two rails from the hopper's +x face down to the bed edge, and 24 lane tiles resting in the hopper.
    for (const z of [-0.35, 0.35]) out.push(bar([HALF, 1.1, z], [1.4, 0.45, z], 'chute', 1));
    for (let i = 0; i < 24; i++) {
      out.push(tile([-0.3 + (i % 6) * 0.12, 1.15, -0.18 + Math.floor(i / 6) * 0.12], 'chute', 1, KIND.lane, [4.0, i / 24, 1.0, 0], 0));
    }
    // Group 2: the lever, last. Pivoted at the hopper's top-front corner, pointing outward along −x.
    out.push(bar([-HALF, Y1, HALF], [-HALF - LEVER_LEN, Y1, HALF], 'lever', 2, KIND.lever, [2, -0.5, 0, 0]));
    return out;
  },
};
