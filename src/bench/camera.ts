// Camera pose tables and the pure pose evaluator. Bench space. The tables were re-authored at gate G1 against
// src/bench/cameraClearance.test.ts: every section's subject sits right of the DOM copy column (the left 42% on
// desktop; the hero's copy block is the left 58% down to 65% of the height), framed by lookAt rather than by
// moving the camera, so the whole desktop path stays under 45 units. Hold-then-move keys: no section starts with a cut.
import type { Tier, Vec3 } from './types';
import { clamp01, lerp, power2InOut } from './math';

export interface Pose { position: Vec3; lookAt: Vec3; fov: number }
export interface CameraKey { section: number; u: number; pose: Pose }

// Desktop, fov 30. One far station front-left for the hero and `more` (the rise is a tilt: the small machines enter
// from the bottom edge), a descent to the bot for the macro, one climb along the front row (the kalshi dolly, then the
// balance, splitter and watch by lookAt), the poster from the front, and a drop to the slot.
const D: CameraKey[] = [
  { section: 0, u: 0.00, pose: { position: [-6.7, 11.6, 24.0], lookAt: [-4.1, 3.2, -8.1], fov: 30 } },   // hero: quoter lower-right, tight to the right edge; small machines cropped at the bottom edge
  { section: 0, u: 0.15, pose: { position: [-6.7, 11.6, 24.0], lookAt: [-4.1, 3.2, -8.1], fov: 30 } },   // hold while the copy is sticky
  { section: 0, u: 1.00, pose: { position: [-6.7, 11.6, 24.0], lookAt: [-4.5, 0.2, -1.1], fov: 30 } },   // risen: the tilt brings the bench in from the bottom edge
  { section: 1, u: 0.10, pose: { position: [-6.7, 11.6, 24.0], lookAt: [-5.2, -0.6, 3.2], fov: 30 } },   // whole quoter right of the copy column
  { section: 1, u: 1.00, pose: { position: [-6.7, 11.6, 24.0], lookAt: [-5.2, -0.6, 3.2], fov: 30 } },
  { section: 2, u: 0.30, pose: { position: [-4.4, 3.3, 9.9], lookAt: [-6.8, 0.8, 2.9], fov: 30 } },      // macro on the bot
  { section: 2, u: 0.70, pose: { position: [-4.1, 3.6, 10.7], lookAt: [-7.6, 1.5, 1.5], fov: 30 } },     // bot and quoter share the frame
  { section: 2, u: 1.00, pose: { position: [-4.1, 3.6, 10.7], lookAt: [-7.6, 1.5, 1.5], fov: 30 } },
  { section: 3, u: 0.08, pose: { position: [-4.1, 3.6, 10.7], lookAt: [-7.2, 0.6, 0.0], fov: 30 } },     // dolly start
  { section: 3, u: 0.30, pose: { position: [-2.2, 4.5, 13.0], lookAt: [-6.8, -0.6, -1.8], fov: 30 } },   // dolly end (the one lateral dolly): low oblique along the bed
  { section: 3, u: 1.00, pose: { position: [-2.2, 4.5, 13.0], lookAt: [-6.8, -0.6, -1.8], fov: 30 } },
  { section: 4, u: 0.15, pose: { position: [-1.6, 4.8, 13.7], lookAt: [-5.2, 2.7, 7.2], fov: 30 } },     // on the balance, quoter behind
  { section: 4, u: 1.00, pose: { position: [-1.6, 4.8, 13.7], lookAt: [-5.2, 2.7, 7.2], fov: 30 } },
  { section: 5, u: 0.15, pose: { position: [-1.3, 4.9, 14.0], lookAt: [-1.3, 3.2, 8.2], fov: 30 } },     // low along the splitter
  { section: 5, u: 1.00, pose: { position: [-1.3, 4.9, 14.0], lookAt: [-1.3, 3.2, 8.2], fov: 30 } },
  { section: 6, u: 0.15, pose: { position: [1.4, 7.2, 16.7], lookAt: [0.9, -0.1, 6.0], fov: 30 } },      // high calm on the watch
  { section: 6, u: 1.00, pose: { position: [1.4, 7.2, 16.7], lookAt: [0.9, -0.1, 6.0], fov: 30 } },
  { section: 7, u: 0.60, pose: { position: [6.0, 8.5, 23.8], lookAt: [-2.0, 2.8, 6.0], fov: 30 } },      // poster: whole bench, small machines large in front
  { section: 7, u: 1.00, pose: { position: [6.0, 8.5, 23.8], lookAt: [-2.0, 2.8, 6.0], fov: 30 } },
  { section: 8, u: 0.25, pose: { position: [6.0, 4.4, 15.4], lookAt: [2.6, 0.3, 5.5], fov: 30 } },       // low on the slot
  { section: 8, u: 1.00, pose: { position: [6.0, 4.4, 15.4], lookAt: [2.6, 0.3, 5.5], fov: 30 } },
];

// Phone, fov 38, portrait: the frame is 2.7× narrower than desktop's, so each section's machine is framed whole
// inside the width and in the lower 55%, under the copy. The quoter sections are far front shots; the small
// machines are closer, each from its own side.
const P: CameraKey[] = [
  { section: 0, u: 0.00, pose: { position: [-11.0, 13.0, 39.0], lookAt: [1.5, 3.8, -6.0], fov: 38 } },   // hero: the whole quoter low in the frame, the bot at its near corner
  { section: 0, u: 0.15, pose: { position: [-11.0, 13.0, 39.0], lookAt: [1.5, 3.8, -6.0], fov: 38 } },
  { section: 0, u: 1.00, pose: { position: [-9.0, 18.0, 40.0], lookAt: [1.0, 3.0, -4.5], fov: 38 } },    // risen
  { section: 1, u: 0.10, pose: { position: [-9.0, 18.0, 40.0], lookAt: [1.0, 3.0, -4.5], fov: 38 } },
  { section: 1, u: 1.00, pose: { position: [-9.0, 18.0, 40.0], lookAt: [1.0, 3.0, -4.5], fov: 38 } },
  { section: 2, u: 0.30, pose: { position: [-6.4, 1.9, 4.5], lookAt: [-5.0, 0.3, 2.1], fov: 38 } },      // macro on the bot
  { section: 2, u: 0.70, pose: { position: [-5.7, 1.8, 5.0], lookAt: [-5.1, -1.3, -2.0], fov: 38 } },    // bot and quoter share the frame
  { section: 2, u: 1.00, pose: { position: [-5.7, 1.8, 5.0], lookAt: [-5.1, -1.3, -2.0], fov: 38 } },
  { section: 3, u: 0.08, pose: { position: [-8.0, 20.0, 40.0], lookAt: [1.5, 3.0, -4.5], fov: 38 } },    // dolly start
  { section: 3, u: 0.30, pose: { position: [-4.0, 20.0, 40.0], lookAt: [1.5, 3.0, -4.5], fov: 38 } },    // dolly end
  { section: 3, u: 1.00, pose: { position: [-4.0, 20.0, 40.0], lookAt: [1.5, 3.0, -4.5], fov: 38 } },
  { section: 4, u: 0.15, pose: { position: [-7.3, 9.2, 12.5], lookAt: [-3.4, 2.1, 3.0], fov: 38 } },     // on the balance
  { section: 4, u: 1.00, pose: { position: [-7.3, 9.2, 12.5], lookAt: [-3.4, 2.1, 3.0], fov: 38 } },
  { section: 5, u: 0.15, pose: { position: [0.5, 5.9, 19.6], lookAt: [-0.1, 3.3, 5.4], fov: 38 } },      // along the splitter
  { section: 5, u: 1.00, pose: { position: [0.5, 5.9, 19.6], lookAt: [-0.1, 3.3, 5.4], fov: 38 } },
  { section: 6, u: 0.15, pose: { position: [3.5, 11.2, 21.1], lookAt: [3.8, 3.8, 4.7], fov: 38 } },      // high on the watch
  { section: 6, u: 1.00, pose: { position: [3.5, 11.2, 21.1], lookAt: [3.8, 3.8, 4.7], fov: 38 } },
  { section: 7, u: 0.60, pose: { position: [10.0, 22.0, 38.0], lookAt: [-2.0, 3.5, -5.0], fov: 38 } },   // poster
  { section: 7, u: 1.00, pose: { position: [10.0, 22.0, 38.0], lookAt: [-2.0, 3.5, -5.0], fov: 38 } },
  { section: 8, u: 0.25, pose: { position: [4.3, 1.9, 12.5], lookAt: [6.5, 0.0, 2.5], fov: 38 } },       // low on the slot
  { section: 8, u: 1.00, pose: { position: [4.3, 1.9, 12.5], lookAt: [6.5, 0.0, 2.5], fov: 38 } },
];

export const CAMERA_KEYS: Record<Tier, CameraKey[]> = { desktop: D, phone: P };

/** Blends the two keys surrounding `section + u` with power2InOut; two keys sharing a pose hold. Writes into `out`; allocates nothing. */
export function evaluatePose(section: number, u: number, tier: Tier, out: { position: number[]; lookAt: number[]; fov: number }): void {
  const keys = CAMERA_KEYS[tier];
  const t = section + u;
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].section + keys[i + 1].u <= t) i++;
  const a = keys[i];
  const b = keys[Math.min(i + 1, keys.length - 1)];
  const ta = a.section + a.u;
  const tb = b.section + b.u;
  const e = tb > ta ? power2InOut(clamp01((t - ta) / (tb - ta))) : 1;
  for (let k = 0; k < 3; k++) {
    out.position[k] = lerp(a.pose.position[k], b.pose.position[k], e);
    out.lookAt[k] = lerp(a.pose.lookAt[k], b.pose.lookAt[k], e);
  }
  out.fov = lerp(a.pose.fov, b.pose.fov, e);
}
