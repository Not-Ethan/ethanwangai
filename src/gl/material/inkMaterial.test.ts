import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { assembleVertex, assembleFragment } from '@/gl/shaders/assemble';
import { createUniforms, type BenchUniforms } from './uniforms';
import { createInkMaterial } from './inkMaterial';

type Lib = typeof THREE.ShaderLib.physical;

/** Runs a material's onBeforeCompile against three's own shader sources, as WebGLPrograms would, without a GL context. */
function compileWith(mat: THREE.Material, lib: Lib): THREE.WebGLProgramParametersWithUniforms {
  const shader = {
    vertexShader: lib.vertexShader, fragmentShader: lib.fragmentShader, uniforms: THREE.UniformsUtils.clone(lib.uniforms),
  } as unknown as THREE.WebGLProgramParametersWithUniforms;
  mat.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
  return shader;
}

const count = (src: string, needle: string) => src.split(needle).length - 1;
/** Asserts each needle appears in `src`, in this order, so a spliced piece sits after the chunk it extends. */
function expectOrdered(src: string, needles: string[], label: string): void {
  let last = -1;
  for (const n of needles) {
    const at = src.indexOf(n);
    expect(at, `${label}: ${n.slice(0, 40)}`).toBeGreaterThan(last);
    last = at;
  }
}

// MeshStandardMaterial compiles ShaderLib.physical (WebGLPrograms maps it to 'physical').
const LIB = THREE.ShaderLib.physical;
const v = assembleVertex();
const f = assembleFragment();

describe('createInkMaterial', () => {
  const u: BenchUniforms = createUniforms();
  const mat = createInkMaterial(u);
  const s = compileWith(mat, LIB);

  it('is a MeshStandardMaterial at roughness 0.55 and metalness 0.08', () => {
    expect(mat).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(mat.roughness).toBe(0.55);
    expect(mat.metalness).toBe(0.08);
  });

  it('keys its program cache as dbso-ink-v1 so the patched program is never confused with a stock one', () => {
    expect(mat.customProgramCacheKey()).toBe('dbso-ink-v1');
  });

  it('splices declarations after <common>, localTransform after <begin_vertex>, and project in place of <project_vertex>', () => {
    expectOrdered(s.vertexShader, ['#include <common>', v.declarations, 'void main()', '#include <begin_vertex>', v.localTransform, v.project], 'vertex');
    expect(s.vertexShader).not.toContain('#include <project_vertex>');
    expect(count(s.vertexShader, '#include <common>')).toBe(1);
    expect(count(s.vertexShader, '#include <begin_vertex>')).toBe(1);
  });

  it('splices the fragment pieces after their chunks in shader order, keeping every three chunk', () => {
    const chunks = ['#include <color_fragment>', '#include <roughnessmap_fragment>', '#include <emissivemap_fragment>', '#include <opaque_fragment>'];
    expectOrdered(s.fragmentShader, [
      '#include <common>', f.declarations, 'void main()',
      chunks[0], f.colorFragment, chunks[1], f.roughness, chunks[2], f.emissive, chunks[3], f.output,
    ], 'fragment');
    for (const c of ['#include <common>', ...chunks]) expect(count(s.fragmentShader, c), c).toBe(1);
  });

  it('keeps pencil in the color pass: no clip-volume cull in the ink vertex shader', () => {
    expect(s.vertexShader).not.toContain('gl_Position = vec4(2.0, 2.0, 2.0, 1.0);');
  });

  it('registers every BenchUniforms entry by reference and keeps three\'s own uniforms', () => {
    for (const key of Object.keys(u) as (keyof BenchUniforms)[]) expect(s.uniforms[key], key).toBe(u[key]);
    expect(s.uniforms.diffuse).toBeDefined();
    expect(s.uniforms.roughness).toBeDefined();
    u.uCompile.value[3] = 0.5;
    u.uTilt.value = 0.2;
    expect(s.uniforms.uCompile.value[3]).toBe(0.5);
    expect(s.uniforms.uTilt.value).toBe(0.2);
  });

  it('throws rather than silently skipping when a three chunk it splices against is missing', () => {
    const bare = { vertexShader: '', fragmentShader: '', uniforms: {} } as unknown as THREE.WebGLProgramParametersWithUniforms;
    expect(() => mat.onBeforeCompile(bare, {} as THREE.WebGLRenderer)).toThrow(/#include <common>/);
  });

  it('returns an independent material per call', () => {
    const a = createInkMaterial(createUniforms()), b = createInkMaterial(createUniforms());
    expect(a).not.toBe(b);
    expect(a.uuid).not.toBe(b.uuid);
  });
});
