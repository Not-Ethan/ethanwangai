// Rain's pure part (spec §6): 1,500 drops seeded in a 60 × 30 × 40 box centred on the camera (x and z centred on 0,
// seed height 0..30). The shader moves them; rainY mirrors its fall so the wrap is tested in Node.
import * as THREE from 'three';
import { mulberry32 } from '@/valley/rng';

export const RAIN = { count: 1500, width: 60, height: 30, depth: 40, speed: 18, streak: 0.6, seed: 0x7a1d } as const;

export function buildRainArrays(): { positions: Float32Array; ends: Float32Array } {
  const rng = mulberry32(RAIN.seed);
  const positions = new Float32Array(RAIN.count * 6);
  const ends = new Float32Array(RAIN.count * 2);
  for (let i = 0; i < RAIN.count; i++) {
    const x = (rng() - 0.5) * RAIN.width;
    const y = rng() * RAIN.height;
    const z = (rng() - 0.5) * RAIN.depth;
    positions.set([x, y, z, x, y, z], i * 6);
    ends[i * 2] = 0;
    ends[i * 2 + 1] = 1;
  }
  return { positions, ends };
}

export function buildRainGeometry(): THREE.BufferGeometry {
  const { positions, ends } = buildRainArrays();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('aEnd', new THREE.BufferAttribute(ends, 1));
  return g;
}

/** GLSL mod(y0 - time·speed, height) - height/2 - end·streak. */
export function rainY(y0: number, time: number, end: number): number {
  const h = RAIN.height;
  const x = y0 - time * RAIN.speed;
  return x - h * Math.floor(x / h) - h / 2 - end * RAIN.streak;
}
