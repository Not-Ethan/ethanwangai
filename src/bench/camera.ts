// Camera pose tables and the pure pose evaluator. Bench space. The tables were re-authored at gate G1 against
// src/bench/cameraClearance.test.ts: every section's subject sits right of the DOM copy column (the left 42% on
// desktop; the hero's copy block is the left 58% down to 65% of the height), each pose pitched and headed as the
// test's elevation and azimuth bounds say, and the whole desktop path stays under 60 units. Hold-then-move keys: no
// section starts with a cut.
import type { Tier, Vec3 } from './types';
import { clamp01, lerp, power2InOut } from './math';

export interface Pose { position: Vec3; lookAt: Vec3; fov: number }
export interface CameraKey { section: number; u: number; pose: Pose }

// Desktop, fov 30. The hero is a 3/4 from front-left (30°) with the quoter filling the lower right, its top at the
// deck and the intake's hopper under the copy block's floor; the rise to the high 3/4 over the bed (41°) for `more` is
// mostly a tilt from a station a unit away; a descent to the bot for the macro; one climb along the front row (the
// kalshi dolly, the only lateral dolly); the balance side-on and low (13°, 22° off its rail's normal); the splitter
// long and low from front-right (camera at y 2.2, 41° round), far enough that the balance and the intake behind it
// sit right of the copy column instead of under the darch copy; the watch from high up (47°); the poster pulled back
// and around to a 3/4 from front-right (55° round, 24° up; re-authored at gate G4) so the front row recedes toward the
// copy column instead of spanning the frame: splitter, watch and slot large in front, the balance and the bot past
// them, every machine clear of the copy column, the quoter the wall behind running out of the right edge; a drop to
// the slot (18°). 57 units.
const D: CameraKey[] = [
  { section: 0, u: 0.00, pose: { position: [-9.9, 18.2, 20.5], lookAt: [-4.8, 4.3, -3.2], fov: 30 } },   // hero: quoter lower-right, its top at the deck, tight to the right edge; intake below the copy block; small machines cropped at the bottom edge
  { section: 0, u: 0.15, pose: { position: [-9.9, 18.2, 20.5], lookAt: [-4.8, 4.3, -3.2], fov: 30 } },   // hold while the copy is sticky
  { section: 0, u: 1.00, pose: { position: [-9.0, 18.7, 19.8], lookAt: [-5.0, -1.7, -3.1], fov: 30 } },  // risen: the tilt (and a short step) to the high 3/4, the whole quoter right of the copy column
  { section: 1, u: 0.10, pose: { position: [-9.0, 18.7, 19.8], lookAt: [-5.0, -1.7, -3.1], fov: 30 } },
  { section: 1, u: 1.00, pose: { position: [-9.0, 18.7, 19.8], lookAt: [-5.0, -1.7, -3.1], fov: 30 } },
  { section: 2, u: 0.30, pose: { position: [-4.6, 3.9, 9.2], lookAt: [-7.4, 1.4, 1.8], fov: 30 } },      // macro on the bot
  { section: 2, u: 0.70, pose: { position: [-4.3, 4.3, 10.0], lookAt: [-7.5, 1.5, 1.6], fov: 30 } },     // bot and quoter share the frame
  { section: 2, u: 1.00, pose: { position: [-4.3, 4.3, 10.0], lookAt: [-7.5, 1.5, 1.6], fov: 30 } },
  { section: 3, u: 0.08, pose: { position: [-4.3, 4.3, 10.0], lookAt: [-7.2, 0.6, 0.0], fov: 30 } },     // dolly start
  { section: 3, u: 0.30, pose: { position: [-2.2, 4.5, 13.0], lookAt: [-6.8, -0.6, -1.8], fov: 30 } },   // dolly end (the one lateral dolly): low oblique along the bed
  { section: 3, u: 1.00, pose: { position: [-2.2, 4.5, 13.0], lookAt: [-6.8, -0.6, -1.8], fov: 30 } },
  { section: 4, u: 0.15, pose: { position: [-2.2, 4.5, 13.0], lookAt: [-6.4, 1.9, 2.6], fov: 30 } },     // side-on and low on the balance, quoter behind: a tilt from the dolly's end station
  { section: 4, u: 1.00, pose: { position: [-2.2, 4.5, 13.0], lookAt: [-6.4, 1.9, 2.6], fov: 30 } },
  { section: 5, u: 0.15, pose: { position: [5.6, 2.2, 16.1], lookAt: [-3.3, -0.6, 5.9], fov: 30 } },     // long and low along the splitter from front-right: the fan opens toward the camera; balance, intake and bot right of the copy column
  { section: 5, u: 1.00, pose: { position: [5.6, 2.2, 16.1], lookAt: [-3.3, -0.6, 5.9], fov: 30 } },
  { section: 6, u: 0.15, pose: { position: [5.0, 9.3, 14.8], lookAt: [1.2, -1.5, 5.3], fov: 30 } },      // high calm on the watch, centred, the quoter's front above it; a rise from the darch station
  { section: 6, u: 1.00, pose: { position: [5.0, 9.3, 14.8], lookAt: [1.2, -1.5, 5.3], fov: 30 } },
  { section: 7, u: 0.60, pose: { position: [13.2, 8.0, 16.4], lookAt: [-0.9, 0.3, 6.4], fov: 30 } },     // poster: small machines large in front, the quoter the wall behind
  { section: 7, u: 1.00, pose: { position: [13.2, 8.0, 16.4], lookAt: [-0.9, 0.3, 6.4], fov: 30 } },
  { section: 8, u: 0.25, pose: { position: [6.5, 4.4, 15.6], lookAt: [2.6, 0.9, 5.8], fov: 30 } },       // low on the slot
  { section: 8, u: 1.00, pose: { position: [6.5, 4.4, 15.6], lookAt: [2.6, 0.9, 5.8], fov: 30 } },
];

// Phone, fov 38, portrait: the frame is 2.7× narrower than desktop's, so each section's machine is framed whole
// inside the width and in the lower 55%, under the copy. The quoter sections are far front shots; the small
// machines are closer, each from its own side. Far and near alternate, so the transits are long (40 units where
// desktop moves 3); each one spans its section's travel window, and a section that opens with a lead-in key
// (u ≤ 0.10) holds the previous station across it, as on desktop, so no section starts with a cut.
const P: CameraKey[] = [
  { section: 0, u: 0.00, pose: { position: [-11.0, 13.0, 39.0], lookAt: [1.5, 3.8, -6.0], fov: 38 } },   // hero: the whole quoter low in the frame, the bot at its near corner
  { section: 0, u: 0.15, pose: { position: [-11.0, 13.0, 39.0], lookAt: [1.5, 3.8, -6.0], fov: 38 } },
  { section: 0, u: 1.00, pose: { position: [-9.0, 18.0, 40.0], lookAt: [1.0, 3.0, -4.5], fov: 38 } },    // risen
  { section: 1, u: 0.10, pose: { position: [-9.0, 18.0, 40.0], lookAt: [1.0, 3.0, -4.5], fov: 38 } },
  { section: 1, u: 1.00, pose: { position: [-9.0, 18.0, 40.0], lookAt: [1.0, 3.0, -4.5], fov: 38 } },
  { section: 2, u: 0.30, pose: { position: [-6.4, 1.9, 4.5], lookAt: [-5.0, 0.3, 2.1], fov: 38 } },      // macro on the bot
  { section: 2, u: 0.70, pose: { position: [-5.7, 1.8, 5.0], lookAt: [-5.1, -1.3, -2.0], fov: 38 } },    // bot and quoter share the frame
  { section: 2, u: 1.00, pose: { position: [-5.7, 1.8, 5.0], lookAt: [-5.1, -1.3, -2.0], fov: 38 } },
  { section: 3, u: 0.08, pose: { position: [-5.7, 1.8, 5.0], lookAt: [-4.7, -1.0, -2.4], fov: 38 } },     // lead-in at the pull-back station: a small tilt toward the bed, the bot still in frame (no cut)
  { section: 3, u: 0.30, pose: { position: [-6.0, 20.0, 43.0], lookAt: [-0.6, 3.0, -4.5], fov: 38 } },   // one eased pull up and back over 0.08→0.30: the whole quoter and the intake it builds inside the width
  { section: 3, u: 1.00, pose: { position: [-6.0, 20.0, 43.0], lookAt: [-0.6, 3.0, -4.5], fov: 38 } },
  { section: 4, u: 0.15, pose: { position: [-7.2, 10.2, 15.3], lookAt: [-3.4, 2.3, 3.0], fov: 38 } },    // on the balance, from the kalshi station's side so the drop stays one eased transit
  { section: 4, u: 1.00, pose: { position: [-7.2, 10.2, 15.3], lookAt: [-3.4, 2.3, 3.0], fov: 38 } },
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
