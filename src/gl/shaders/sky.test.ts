import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createUniforms } from '../driverCore';
import {
  createMoonMaterial, createSkyMaterial, createStarsMaterial,
  MOON_FRAG, MOON_VERT, SKY_FRAG, STARS_FRAG, STARS_VERT,
} from './sky';

describe('sky materials', () => {
  it('shares the gradient uniforms with the driver by reference and draws inside-out, untoned, unfogged', () => {
    const u = createUniforms();
    const m = createSkyMaterial(u);
    expect(m.uniforms.uZenith).toBe(u.uZenith);
    expect(m.uniforms.uHorizon).toBe(u.uHorizon);
    expect(m.uniforms.uEast).toBe(u.uEast);
    expect(m.side).toBe(THREE.BackSide);
    expect(m.depthWrite).toBe(false);
    expect(m.toneMapped).toBe(false);
    expect(m.fog).toBe(false);
    expect(SKY_FRAG).toContain('#include <colorspace_fragment>');
  });

  it('stars share time and alpha, blend normally and stay unfogged', () => {
    const u = createUniforms();
    const m = createStarsMaterial(u);
    expect(m.uniforms.uTime).toBe(u.uTime);
    expect(m.uniforms.uStarAlpha).toBe(u.uStarAlpha);
    expect(m.blending).toBe(THREE.NormalBlending);
    expect(m.transparent).toBe(true);
    expect(m.depthWrite).toBe(false);
    expect(m.fog).toBe(false);
    expect(STARS_VERT).toContain('gl_PointSize');
    expect(STARS_FRAG).toContain('discard');
  });

  it('the moon shares position and alpha and guards a zero direction', () => {
    const u = createUniforms();
    const m = createMoonMaterial(u);
    expect(m.uniforms.uMoonPos).toBe(u.uMoonPos);
    expect(m.uniforms.uMoonAlpha).toBe(u.uMoonAlpha);
    expect(m.blending).toBe(THREE.NormalBlending);
    expect(MOON_VERT).toContain('length( uMoonPos ) > 0.0001');
    expect(MOON_FRAG).toContain('uMoonAlpha');
  });
});
