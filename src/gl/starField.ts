// Star positions (spec §4.1 "1,200 points on the sphere", §11 "stars 400" on phone). Seeded, deterministic, pure.
import { mulberry32 } from '@/valley/rng';
import { hashString } from '@/valley/hash';

export const STAR_RADIUS = 180;
export const STARS_DESKTOP = 1200;
export const STARS_PHONE = 400;
const MIN_ELEVATION_SIN = Math.sin((3 * Math.PI) / 180);

export interface StarField { positions: Float32Array; sizes: Float32Array; phases: Float32Array }

/** Uniform over the sphere cap above 3 degrees elevation (y uniform in [sin 3°, 1] is area-uniform on a sphere). */
export function starField(count: number, seed: number = hashString('stars')): StarField {
  const rnd = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const y = MIN_ELEVATION_SIN + (1 - MIN_ELEVATION_SIN) * rnd();
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = rnd() * Math.PI * 2;
    positions[i * 3] = Math.cos(theta) * ring * STAR_RADIUS;
    positions[i * 3 + 1] = y * STAR_RADIUS;
    positions[i * 3 + 2] = Math.sin(theta) * ring * STAR_RADIUS;
    sizes[i] = 1 + 1.4 * rnd();
    phases[i] = rnd() * Math.PI * 2;
  }
  return { positions, sizes, phases };
}
