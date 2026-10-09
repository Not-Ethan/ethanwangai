import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createUniforms } from '../driverCore';
import {
  createMistMaterial, createRiverMaterial, MIST_ALPHA, MIST_FRAG, MIST_SPEED, MIST_VERT,
  RIVER_FRAG, RIVER_OPACITY, RIVER_VERT,
} from './river';

describe('river and mist materials', () => {
  it('the river shares time and horizon, is fogged through the fog chunks, and is 0.85 opaque', () => {
    const u = createUniforms();
    const m = createRiverMaterial(u);
    expect(m.uniforms.uTime).toBe(u.uTime);
    expect(m.uniforms.uHorizon).toBe(u.uHorizon);
    expect(m.uniforms.uOpacity.value).toBe(RIVER_OPACITY);
    expect(RIVER_OPACITY).toBe(0.85);
    expect(m.fog).toBe(true);
    for (const k of ['fogColor', 'fogNear', 'fogFar']) expect(m.uniforms[k]).toBeDefined();
    expect(m.transparent).toBe(true);
    expect(m.blending).toBe(THREE.NormalBlending);
    expect(RIVER_VERT).toContain('#include <fog_vertex>');
    expect(RIVER_FRAG).toContain('#include <fog_fragment>');
  });

  it('the mist drifts +x at 0.3 units/s at alpha 0.12 on shared time, normal blending', () => {
    const u = createUniforms();
    const m = createMistMaterial(u);
    expect(m.uniforms.uTime).toBe(u.uTime);
    expect(m.uniforms.uSpeed.value).toBe(MIST_SPEED);
    expect(MIST_SPEED).toBe(0.3);
    expect(m.uniforms.uAlpha.value).toBe(MIST_ALPHA);
    expect(MIST_ALPHA).toBe(0.12);
    expect(m.blending).toBe(THREE.NormalBlending);
    expect(m.depthWrite).toBe(false);
    expect(MIST_VERT).toContain('mod(');
    expect(MIST_FRAG).toContain('#include <fog_fragment>');
  });
});
