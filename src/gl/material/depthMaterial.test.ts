import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { assembleVertex } from '@/gl/shaders/assemble';
import { createUniforms, type BenchUniforms } from './uniforms';
import { createInkMaterial } from './inkMaterial';
import { createDepthMaterial } from './depthMaterial';

/** Runs a material's onBeforeCompile against three's own shader sources, as WebGLPrograms would, without a GL context. */
function compileWith(mat: THREE.Material, lib: typeof THREE.ShaderLib.depth): THREE.WebGLProgramParametersWithUniforms {
  const shader = {
    vertexShader: lib.vertexShader, fragmentShader: lib.fragmentShader, uniforms: THREE.UniformsUtils.clone(lib.uniforms),
  } as unknown as THREE.WebGLProgramParametersWithUniforms;
  mat.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
  return shader;
}

// MeshDepthMaterial compiles ShaderLib.depth.
const LIB = THREE.ShaderLib.depth;
const CULL_PENCIL = 'if (vA < 0.6) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);';
const v = assembleVertex();

describe('createDepthMaterial', () => {
  const u: BenchUniforms = createUniforms();
  const mat = createDepthMaterial(u);
  const s = compileWith(mat, LIB);

  it('is a MeshDepthMaterial packing depth into RGBA', () => {
    expect(mat).toBeInstanceOf(THREE.MeshDepthMaterial);
    expect(mat.depthPacking).toBe(THREE.RGBADepthPacking);
  });

  it('keys its program cache as dbso-depth-v1', () => {
    expect(mat.customProgramCacheKey()).toBe('dbso-depth-v1');
  });

  it('splices the same vertex pieces as the ink material so shadows follow the animation', () => {
    for (const piece of [v.declarations, v.localTransform, v.project]) expect(s.vertexShader).toContain(piece);
    expect(s.vertexShader.indexOf('#include <common>')).toBeLessThan(s.vertexShader.indexOf(v.declarations));
    expect(s.vertexShader.indexOf('#include <begin_vertex>')).toBeLessThan(s.vertexShader.indexOf(v.localTransform));
    expect(s.vertexShader).not.toContain('#include <project_vertex>');
  });

  it('moves pencil outside the clip volume after the projection, before three reads gl_Position for depth', () => {
    expect(s.vertexShader).toContain(CULL_PENCIL);
    const projected = s.vertexShader.indexOf('gl_Position = projectionMatrix * mvPosition;');
    const culled = s.vertexShader.indexOf(CULL_PENCIL);
    const packed = s.vertexShader.indexOf('vHighPrecisionZW = gl_Position.zw;');
    expect(projected).toBeGreaterThan(-1);
    expect(culled).toBeGreaterThan(projected);
    expect(packed).toBeGreaterThan(culled);
  });

  it('leaves the fragment shader untouched', () => {
    expect(s.fragmentShader).toBe(LIB.fragmentShader);
  });

  it('shares uniform objects with an ink material built from the same registry, so Clocks writes once for both', () => {
    const shared = createUniforms();
    const ink = compileWith(createInkMaterial(shared), THREE.ShaderLib.physical);
    const depth = compileWith(createDepthMaterial(shared), LIB);
    for (const key of Object.keys(shared) as (keyof BenchUniforms)[]) {
      expect(depth.uniforms[key], key).toBe(shared[key]);
      expect(depth.uniforms[key], key).toBe(ink.uniforms[key]);
    }
    shared.uMachineTime.value[1] = 4.5;
    shared.uVel.value = -0.7;
    expect(depth.uniforms.uMachineTime.value[1]).toBe(4.5);
    expect(ink.uniforms.uMachineTime.value[1]).toBe(4.5);
    expect(depth.uniforms.uVel.value).toBe(-0.7);
    expect(ink.uniforms.uVel.value).toBe(-0.7);
  });
});
