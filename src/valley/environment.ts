// Sky, fog and light by time of day (spec §4.1, §5.2, §9): linear blends through the four palette keyframes
// SKY_KEYFRAMES (tod 0 dusk, 0.3 blue, 0.6 night, 1.0 predawn). Fog colour follows the horizon; the hemisphere sky
// is the zenith and its ground the terrain's low colour. The non-colour values per keyframe (fog range, light
// direction, stars, moon) are authored here in LIGHT, keyed by the same names.
// Precomputed at module load for tod in steps of 0.001, so environmentAt never allocates in the frame loop.
import type { Environment, Vec3 } from './types';
import { PALETTE, SKY_KEYFRAMES, type SkyName } from './palette';

/** World direction of the east horizon colour (§4.1 three-stop sky): +x, the right of the hero frame. */
export const EAST_DIR: Vec3 = [1, 0, 0];

/** Per-keyframe values the palette does not hold. moonPos is a world point on a 200-unit dome around the origin. */
export const LIGHT: Record<SkyName, { fogNear: number; fogFar: number; sunDir: Vec3; starAlpha: number; moonPos: Vec3; moonAlpha: number }> = {
  dusk:    { fogNear: 70, fogFar: 260, sunDir: [-0.85, 0.18, -0.5], starAlpha: 0,    moonPos: [120, 15, -155], moonAlpha: 0 },
  blue:    { fogNear: 55, fogFar: 230, sunDir: [-0.6, 0.35, -0.7],  starAlpha: 0.35, moonPos: [90, 32, -173],  moonAlpha: 0.6 },
  night:   { fogNear: 45, fogFar: 210, sunDir: [0.3, 0.8, -0.5],    starAlpha: 1,    moonPos: [40, 42, -191],  moonAlpha: 1 },
  predawn: { fogNear: 55, fogFar: 230, sunDir: [0.75, 0.3, -0.6],   starAlpha: 0.4,  moonPos: [-60, 45, -185], moonAlpha: 0.5 },
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Channel-wise blend of two #rrggbb colours in sRGB, as lower-case #rrggbb; exact at t = 0 and t = 1. */
function mixHex(a: string, b: string, t: number): string {
  if (t <= 0) return a.toLowerCase();
  if (t >= 1) return b.toLowerCase();
  const A = hexToRgb(a), B = hexToRgb(b);
  let out = '#';
  for (let i = 0; i < 3; i++) out += Math.round(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, '0');
  return out;
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function mixVec(a: Vec3, b: Vec3, t: number, normalise: boolean): Vec3 {
  const x = lerp(a[0], b[0], t), y = lerp(a[1], b[1], t), z = lerp(a[2], b[2], t);
  if (!normalise) return [x, y, z];
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

function compute(tod: number): Environment {
  let k = 0;
  while (k < SKY_KEYFRAMES.length - 2 && tod > SKY_KEYFRAMES[k + 1].tod) k++;
  const a = SKY_KEYFRAMES[k], b = SKY_KEYFRAMES[k + 1];
  const la = LIGHT[a.name], lb = LIGHT[b.name];
  const t = Math.min(1, Math.max(0, (tod - a.tod) / (b.tod - a.tod)));
  const zenith = mixHex(a.zenith, b.zenith, t);
  const horizon = mixHex(a.horizon, b.horizon, t);
  return Object.freeze({
    zenith,
    horizon,
    east: mixHex(a.east, b.east, t),
    fogColor: horizon,
    fogNear: lerp(la.fogNear, lb.fogNear, t),
    fogFar: lerp(la.fogFar, lb.fogFar, t),
    sunDir: mixVec(la.sunDir, lb.sunDir, t, true),
    sunColor: mixHex(a.sun, b.sun, t),
    sunIntensity: lerp(a.sunIntensity, b.sunIntensity, t),
    hemiSky: zenith,
    hemiGround: PALETTE.terrainLow.toLowerCase(),
    starAlpha: lerp(la.starAlpha, lb.starAlpha, t),
    moonPos: mixVec(la.moonPos, lb.moonPos, t, false),
    moonAlpha: lerp(la.moonAlpha, lb.moonAlpha, t),
  });
}

export const ENV_STEPS = 1000;
const TABLE: readonly Environment[] = Array.from({ length: ENV_STEPS + 1 }, (_, i) => compute(i / ENV_STEPS));

/** Environment at time of day `tod` (clamped to [0, 1], NaN → 0), quantised to 0.001. Frozen and shared; never allocates. */
export function environmentAt(tod: number): Environment {
  const t = Number.isFinite(tod) ? Math.min(1, Math.max(0, tod)) : 0;
  return TABLE[Math.round(t * ENV_STEPS)];
}
