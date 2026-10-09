import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { GLOW_SIZE, glowAlpha, glowPixels, getGlowTexture } from './glowTexture';

describe('glow texture', () => {
  it('falls off from 1 at the centre to 0 at the rim, monotonically', () => {
    expect(glowAlpha(0)).toBe(1);
    expect(glowAlpha(1)).toBe(0);
    expect(glowAlpha(1.4)).toBe(0);
    for (let r = 0; r < 1; r += 0.05) expect(glowAlpha(r + 0.05)).toBeLessThanOrEqual(glowAlpha(r));
  });

  it('is a white 64 x 64 RGBA sprite, bright in the middle, clear in the corners, symmetric', () => {
    const px = glowPixels();
    expect(px.length).toBe(GLOW_SIZE * GLOW_SIZE * 4);
    const a = (i: number, j: number) => px[(j * GLOW_SIZE + i) * 4 + 3];
    expect(a(31, 31)).toBeGreaterThanOrEqual(240);
    expect(a(0, 0)).toBe(0);
    expect(a(63, 63)).toBe(0);
    for (let j = 0; j < GLOW_SIZE; j += 7) for (let i = 0; i < GLOW_SIZE; i += 5) {
      expect(a(i, j)).toBe(a(GLOW_SIZE - 1 - i, j));
      expect(a(i, j)).toBe(a(i, GLOW_SIZE - 1 - j));
    }
    for (let k = 0; k < px.length; k += 4) expect([px[k], px[k + 1], px[k + 2]]).toEqual([255, 255, 255]);
  });

  it('is generated once and shared', () => {
    const t = getGlowTexture();
    expect(t).toBe(getGlowTexture());
    expect(t.image.width).toBe(GLOW_SIZE);
    expect(t.generateMipmaps).toBe(false);
    expect(t.minFilter).toBe(THREE.LinearFilter);
  });
});
