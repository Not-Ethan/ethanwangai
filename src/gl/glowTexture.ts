// The one texture in the scene (spec §6, §12): a 64 x 64 white radial sprite that every glow sprite and ridge point
// samples. Computed as pixels (pure, testable in Node) and uploaded once as a DataTexture.
import * as THREE from 'three';

export const GLOW_SIZE = 64;

/** Alpha at normalised radius r (0 centre, 1 rim). */
export function glowAlpha(r: number): number {
  return r >= 1 ? 0 : Math.pow(1 - r, 2.2);
}

export function glowPixels(size: number = GLOW_SIZE): Uint8Array {
  const px = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const dx = ((i + 0.5) / size) * 2 - 1;
      const dy = ((j + 0.5) / size) * 2 - 1;
      const o = (j * size + i) * 4;
      px[o] = 255;
      px[o + 1] = 255;
      px[o + 2] = 255;
      px[o + 3] = Math.round(glowAlpha(Math.hypot(dx, dy)) * 255);
    }
  }
  return px;
}

let shared: THREE.DataTexture | null = null;

/** The shared sprite. Never disposed by a component: Glow and Ridge both sample it for the page's lifetime. */
export function getGlowTexture(): THREE.DataTexture {
  if (shared) return shared;
  const t = new THREE.DataTexture(glowPixels(), GLOW_SIZE, GLOW_SIZE, THREE.RGBAFormat);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  shared = t;
  return t;
}
