import { describe, it, expect } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { CAMERA_LANDSCAPE, CAMERA_PORTRAIT, PLACES } from '@/valley/layout';
import { isPortrait, cameraFor, CAMERA_NEAR, CAMERA_FAR } from './composition';

function ndc(width: number, height: number, p: readonly [number, number, number]): Vector3 {
  const c = cameraFor(width, height);
  const cam = new PerspectiveCamera(c.fov, width / height, CAMERA_NEAR, CAMERA_FAR);
  cam.position.set(c.position[0], c.position[1], c.position[2]);
  cam.lookAt(c.lookAt[0], c.lookAt[1], c.lookAt[2]);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return new Vector3(p[0], p[1] + 3, p[2]).project(cam);
}

describe('composition by aspect (spec §11, §4)', () => {
  it('is portrait only when the viewport is narrower than it is tall', () => {
    expect(isPortrait(390, 844)).toBe(true);
    expect(isPortrait(844, 390)).toBe(false);
    expect(isPortrait(1440, 900)).toBe(false);
    expect(isPortrait(800, 600)).toBe(false);
    expect(isPortrait(800, 800)).toBe(false);
  });

  it('picks the portrait camera for portrait and the landscape camera otherwise, near 1 and far 260', () => {
    expect(cameraFor(390, 844)).toBe(CAMERA_PORTRAIT);
    expect(cameraFor(1440, 900)).toBe(CAMERA_LANDSCAPE);
    expect(cameraFor(800, 600)).toBe(CAMERA_LANDSCAPE);
    expect(CAMERA_NEAR).toBe(1);
    expect(CAMERA_FAR).toBe(260);
  });

  it('keeps the hut, the kalshi lamp and the lot in frame through a rotation (index Review Focus 2)', () => {
    for (const [w, h] of [[390, 844], [844, 390], [1440, 900]] as const) {
      for (const id of ['hut', 'kalshiLamp', 'lot'] as const) {
        const p = ndc(w, h, PLACES[id]);
        expect(Math.abs(p.y), `${id} y at ${w}×${h}`).toBeLessThanOrEqual(1);
        expect(p.z, `${id} in front at ${w}×${h}`).toBeLessThan(1);
      }
    }
  });
});
