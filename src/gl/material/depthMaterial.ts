// The kits' customDepthMaterial: the ink material's vertex splice on three's MeshDepthMaterial, so the shadow map
// sees every part where the color pass draws it, then pencil (vA < 0.6) is thrown outside the clip volume so it casts
// no shadow. The fragment stays three's own RGBA depth packing. Same BenchUniforms objects as the ink material.
import * as THREE from 'three';
import { assembleVertex } from '@/gl/shaders/assemble';
import type { BenchUniforms } from './uniforms';
import { spliceVertex, attachUniforms } from './inkMaterial';

/** Appended after the projection: a pencil part's clip position leaves the volume, so no shadow is cast. */
const CULL_PENCIL = 'if (vA < 0.6) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);';

export function createDepthMaterial(u: BenchUniforms): THREE.MeshDepthMaterial {
  const mat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  mat.customProgramCacheKey = () => 'dbso-depth-v1';
  mat.onBeforeCompile = (shader) => {
    const v = assembleVertex();
    shader.vertexShader = spliceVertex(shader.vertexShader, { ...v, project: `${v.project}\n${CULL_PENCIL}` });
    attachUniforms(shader, u);
  };
  return mat;
}
