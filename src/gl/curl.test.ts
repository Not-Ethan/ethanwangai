import { describe, it, expect } from 'vitest';
import { generateCurl } from './curl';

const SIZE = 32;

/** Mulberry32, seeded, so "50 random interior voxels" is reproducible across runs. */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('generateCurl', () => {
  const field = generateCurl(SIZE, 7);

  it('returns RGBA8 bytes, size³ × 4 long', () => {
    expect(field).toBeInstanceOf(Uint8Array);
    expect(field.length).toBe(SIZE ** 3 * 4);
  });

  it('has full alpha on every voxel', () => {
    for (let i = 3; i < field.length; i += 4) expect(field[i]).toBe(255);
  });

  it('has an R mean near the byte midpoint (potential is zero-mean)', () => {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < field.length; i += 4) { sum += field[i]; count += 1; }
    const mean = sum / count;
    expect(mean).toBeGreaterThan(128 - 6);
    expect(mean).toBeLessThan(128 + 6);
  });

  it('is not constant', () => {
    const first = field[0];
    let varies = false;
    for (let i = 4; i < field.length; i += 4) if (field[i] !== first) { varies = true; break; }
    expect(varies).toBe(true);
  });

  it('is divergence-free to first order at 50 random interior voxels', () => {
    const next = rng(11);
    const idx = (x: number, y: number, z: number) => (z * SIZE * SIZE + y * SIZE + x) * 4;
    for (let n = 0; n < 50; n++) {
      const x = 1 + Math.floor(next() * (SIZE - 2));
      const y = 1 + Math.floor(next() * (SIZE - 2));
      const z = 1 + Math.floor(next() * (SIZE - 2));
      const dRdx = field[idx(x + 1, y, z)] - field[idx(x - 1, y, z)];
      const dGdy = field[idx(x, y + 1, z) + 1] - field[idx(x, y - 1, z) + 1];
      const dBdz = field[idx(x, y, z + 1) + 2] - field[idx(x, y, z - 1) + 2];
      const divergence = Math.abs(dRdx + dGdy + dBdz);
      expect(divergence).toBeLessThan(12);
    }
  });
});
