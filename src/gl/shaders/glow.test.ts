import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { EMITTERS } from '@/valley/lights';
import { EMITTER_INDEX } from '../projection';
import { getGlowTexture } from '../glowTexture';
import { ADDITIVE_FOG, createGlowMaterial, GLOW_CACHE_KEY, glowInstances, patchGlow } from './glow';
import { RIDGE_FRAG, RIDGE_VERT } from './ridge';

describe('glow', () => {
  it('has one sprite per emitter except the ridge, at the emitter, in its colour and size', () => {
    const g = glowInstances();
    expect(g.count).toBe(EMITTERS.length - 1);
    expect(Array.from(g.map)).not.toContain(EMITTER_INDEX.ridge);
    for (let k = 0; k < g.count; k++) {
      const e = EMITTERS[g.map[k]];
      expect(g.sizes[k]).toBeCloseTo(e.size, 6);
      expect(g.matrices[k * 16 + 12]).toBeCloseTo(e.position[0], 5);
      expect(g.matrices[k * 16 + 13]).toBeCloseTo(e.position[1], 5);
      expect(g.matrices[k * 16 + 14]).toBeCloseTo(e.position[2], 5);
      expect(g.matrices[k * 16]).toBe(1);
      const c = new THREE.Color(e.color);
      expect(g.colors[k * 3]).toBeCloseTo(c.r, 6);
    }
  });

  it('billboards, scales by aLit and fades to black in fog', () => {
    const shader = { vertexShader: THREE.ShaderLib.basic.vertexShader, fragmentShader: THREE.ShaderLib.basic.fragmentShader };
    patchGlow(shader);
    expect(shader.vertexShader).toContain('attribute float aLit;');
    expect(shader.vertexShader).toContain('attribute float aSize;');
    expect(shader.vertexShader).toContain('mvPosition.xy += position.xy * glowScale;');
    expect(shader.vertexShader).not.toContain('#include <project_vertex>');
    expect(shader.fragmentShader).not.toContain('#include <fog_fragment>');
    expect(shader.fragmentShader).toContain('gl_FragColor.rgb *= 1.0 - fogFactor;');
  });

  it('is additive, untoned, depth-write off, with its own program cache key', () => {
    const m = createGlowMaterial(getGlowTexture());
    expect(m.blending).toBe(THREE.AdditiveBlending);
    expect(m.toneMapped).toBe(false);
    expect(m.depthWrite).toBe(false);
    expect(m.transparent).toBe(true);
    expect(m.map).toBe(getGlowTexture());
    expect(m.customProgramCacheKey()).toBe(GLOW_CACHE_KEY);
  });

  it('the ridge shader reveals by birth and shares the additive fog fade', () => {
    expect(RIDGE_VERT).toContain('attribute float aBirth;');
    expect(RIDGE_VERT).toContain('attribute float aSize;');
    expect(RIDGE_VERT).toContain('step( aBirth, uReveal )');
    expect(RIDGE_FRAG).toContain(ADDITIVE_FOG.trim());
  });
});
