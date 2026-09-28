// Camera pose tables and the pure pose evaluator. Bench space; poses are initial
// values to be tuned at gates G1/G3/G4 and re-emitted.
import type { Tier, Vec3 } from './types';
import { clamp01, lerp, power2InOut } from './math';
import { TIMING } from './timing';

export interface Pose { position: Vec3; lookAt: Vec3; fov: number }
export interface CameraKey { section: number; u: number; pose: Pose }

const D: CameraKey[] = [
  { section: 0, u: 0.00, pose: { position: [6.5, 4.2, 11.5], lookAt: [1.2, 0.4, -2.2], fov: 30 } },   // hero product shot; bench cropped at frame edge
  { section: 0, u: 0.15, pose: { position: [6.5, 4.2, 11.5], lookAt: [1.2, 0.4, -2.2], fov: 30 } },   // hold while the copy is sticky
  { section: 0, u: 1.00, pose: { position: [3.5, 9.5, 8.5], lookAt: [0.2, 0.2, -1.2], fov: 30 } },    // risen; bench enters from the bottom
  { section: 1, u: 0.10, pose: { position: [2.8, 10.5, 5.5], lookAt: [0, 0.3, -2], fov: 30 } },       // high 3/4, ~55°, frame and carriages in frame
  { section: 1, u: 1.00, pose: { position: [2.8, 10.5, 5.5], lookAt: [0, 0.3, -2], fov: 30 } },
  { section: 2, u: 0.30, pose: { position: [-4.3, 0.9, 4.3], lookAt: [-5.4, 0.25, 2.5], fov: 30 } },  // macro on the bot
  { section: 2, u: 0.70, pose: { position: [-1.5, 3.2, 9.0], lookAt: [-2.5, 0.3, 0.0], fov: 30 } },   // bot and quoter share the frame
  { section: 2, u: 1.00, pose: { position: [-1.5, 3.2, 9.0], lookAt: [-2.5, 0.3, 0.0], fov: 30 } },
  { section: 3, u: 0.08, pose: { position: [-9.5, 2.4, 4.5], lookAt: [-4.5, 0.2, -2.0], fov: 30 } },  // dolly start
  { section: 3, u: 0.30, pose: { position: [8.5, 2.4, 4.5], lookAt: [3.5, 0.2, -2.0], fov: 30 } },    // dolly end (the one lateral dolly)
  { section: 3, u: 1.00, pose: { position: [8.5, 2.4, 4.5], lookAt: [3.5, 0.2, -2.0], fov: 30 } },
  { section: 4, u: 0.15, pose: { position: [-4.2, 1.7, 10.0], lookAt: [-4.2, 0.45, 4.4], fov: 30 } }, // side on the balance, quoter behind
  { section: 4, u: 1.00, pose: { position: [-4.2, 1.7, 10.0], lookAt: [-4.2, 0.45, 4.4], fov: 30 } },
  { section: 5, u: 0.15, pose: { position: [-3.6, 1.1, 7.6], lookAt: [1.2, 0.3, 4.4], fov: 30 } },    // long low along the splitter
  { section: 5, u: 1.00, pose: { position: [-3.6, 1.1, 7.6], lookAt: [1.2, 0.3, 4.4], fov: 30 } },
  { section: 6, u: 0.15, pose: { position: [4.6, 4.8, 8.2], lookAt: [4.6, 0.0, 4.4], fov: 30 } },     // high calm on the watch
  { section: 6, u: 1.00, pose: { position: [4.6, 4.8, 8.2], lookAt: [4.6, 0.0, 4.4], fov: 30 } },
  { section: 7, u: 0.60, pose: { position: [4.5, 2.8, 14.0], lookAt: [-0.6, 0.6, -0.5], fov: 30 } },  // poster: small machines large, quoter the wall
  { section: 7, u: 1.00, pose: { position: [4.5, 2.8, 14.0], lookAt: [-0.6, 0.6, -0.5], fov: 30 } },
  { section: 8, u: 0.25, pose: { position: [7.8, 1.3, 10.2], lookAt: [6.0, 0.2, 6.4], fov: 30 } },    // low on the slot
  { section: 8, u: 1.00, pose: { position: [7.8, 1.3, 10.2], lookAt: [6.0, 0.2, 6.4], fov: 30 } },
];

// Phone: fov 38; the hero is a macro on the bed's front-left corner; every other pose is
// pulled 20% closer to its lookAt and raised so machines sit in the lower 55% of a portrait frame.
const PHONE_FOV = 38;
const PHONE_PULL = 0.8;
const PHONE_RAISE = 1.2;
const PHONE_HERO: Pose = { position: [-2.6, 2.2, 5.2], lookAt: [-4.2, 0.3, 0.6], fov: PHONE_FOV };

function toPhone(k: CameraKey): CameraKey {
  if (k.section === 0 && k.u <= TIMING.heroGuardU) return { section: k.section, u: k.u, pose: PHONE_HERO };
  const { position: p, lookAt: l } = k.pose;
  const position: Vec3 = [lerp(l[0], p[0], PHONE_PULL), lerp(l[1], p[1], PHONE_PULL) + PHONE_RAISE, lerp(l[2], p[2], PHONE_PULL)];
  return { section: k.section, u: k.u, pose: { position, lookAt: l, fov: PHONE_FOV } };
}

export const CAMERA_KEYS: Record<Tier, CameraKey[]> = { desktop: D, phone: D.map(toPhone) };

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
