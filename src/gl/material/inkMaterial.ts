// The one kit material: three's MeshStandardMaterial with the assembler's pieces spliced in through onBeforeCompile.
// customProgramCacheKey keys the patched program apart from a stock standard material so every InstancedMesh shares
// one compile. depthMaterial.ts reuses spliceVertex and attachUniforms so the shadow pass moves exactly as the color
// pass does and both programs read the same BenchUniforms objects; Clocks.ts writes the registry once per frame.
import * as THREE from 'three';
import { assembleVertex, assembleFragment, type VertexPieces } from '@/gl/shaders/assemble';
import type { BenchUniforms } from './uniforms';

const INK_ROUGHNESS = 0.55;
const INK_METALNESS = 0.08;

/** Replaces the first `chunk` in `src`; throws if three's shader no longer carries it, rather than silently shipping an unpatched program. */
function splice(src: string, chunk: string, replacement: string): string {
  if (!src.includes(chunk)) throw new Error(`dbso material: ${chunk} is not in three's shader`);
  return src.replace(chunk, () => replacement);
}

/** Keeps `chunk` and appends `piece` after it. */
function spliceAfter(src: string, chunk: string, piece: string): string {
  return splice(src, chunk, `${chunk}\n${piece}`);
}

/** The vertex patch both materials share: declarations after <common>, localTransform after <begin_vertex>, project in place of <project_vertex>. */
export function spliceVertex(src: string, v: VertexPieces): string {
  src = spliceAfter(src, '#include <common>', v.declarations);
  src = spliceAfter(src, '#include <begin_vertex>', v.localTransform);
  return splice(src, '#include <project_vertex>', v.project);
}

/** Points each shader uniform at the registry's own `{ value }` object, by reference, so one write reaches every program. */
export function attachUniforms(shader: THREE.WebGLProgramParametersWithUniforms, u: BenchUniforms): void {
  for (const key of Object.keys(u) as (keyof BenchUniforms)[]) shader.uniforms[key] = u[key];
}

export function createInkMaterial(u: BenchUniforms): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ roughness: INK_ROUGHNESS, metalness: INK_METALNESS });
  mat.customProgramCacheKey = () => 'dbso-ink-v1';
  mat.onBeforeCompile = (shader) => {
    const f = assembleFragment();
    shader.vertexShader = spliceVertex(shader.vertexShader, assembleVertex());
    let frag = spliceAfter(shader.fragmentShader, '#include <common>', f.declarations);
    frag = spliceAfter(frag, '#include <color_fragment>', f.colorFragment);
    frag = spliceAfter(frag, '#include <roughnessmap_fragment>', f.roughness);
    frag = spliceAfter(frag, '#include <emissivemap_fragment>', f.emissive);
    shader.fragmentShader = spliceAfter(frag, '#include <opaque_fragment>', f.output);
    attachUniforms(shader, u);
  };
  return mat;
}
