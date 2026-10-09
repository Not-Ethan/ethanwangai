import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { inject } from './inject';
import { createWindowsMaterial, patchWindows, WINDOWS_CACHE_KEY } from './windows';

describe('windows shader patch', () => {
  it('adds aLit and aRow, scales the colour by the level and discards unlit instances', () => {
    const shader = { vertexShader: THREE.ShaderLib.basic.vertexShader, fragmentShader: THREE.ShaderLib.basic.fragmentShader };
    patchWindows(shader);
    expect(shader.vertexShader).toContain('attribute float aLit;');
    expect(shader.vertexShader).toContain('attribute float aRow;');
    expect(shader.vertexShader).toContain('vLit = aLit;');
    expect(shader.fragmentShader).toContain('if ( vLit < 0.001 ) discard;');
    expect(shader.fragmentShader).toContain('diffuseColor.rgb *= vLit;');
    expect(shader.vertexShader).toContain('#include <project_vertex>');
    expect(shader.fragmentShader).toContain('#include <fog_fragment>');
    expect(shader.fragmentShader).toContain('#include <colorspace_fragment>');
  });

  it('inject throws on a missing anchor so a three upgrade fails loudly', () => {
    expect(() => inject('void main() {}', '#include <nope>', '')).toThrow('#include <nope>');
  });

  it('the material is untoned, fogged and has its own program cache key', () => {
    const m = createWindowsMaterial();
    expect(m).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(m.toneMapped).toBe(false);
    expect(m.fog).toBe(true);
    expect(m.customProgramCacheKey()).toBe(WINDOWS_CACHE_KEY);
  });
});
