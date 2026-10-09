// Glow sprites (spec §6 Glow): one additive camera-facing sprite per emitter except the ridge, sized from the
// registry, scaled and brightened by aLit (0..1.6), toneMapped false so the pulse reads. MeshBasicMaterial patched
// through onBeforeCompile, like the windows, so instancing, instance colour and the map chunk stay three's own.
import * as THREE from 'three';
import { EMITTERS } from '@/valley/lights';
import { inject } from './inject';

export const GLOW_CACHE_KEY = 'valley-glow';

/** Additive light fades to black with distance instead of mixing toward the fog colour (which would add a halo). */
export const ADDITIVE_FOG = /* glsl */ `
#ifdef USE_FOG
  float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  gl_FragColor.rgb *= 1.0 - fogFactor;
#endif
`;

export function patchGlow(shader: { vertexShader: string; fragmentShader: string }): void {
  let v = shader.vertexShader;
  v = inject(v, '#include <common>', '#include <common>\nattribute float aLit;\nattribute float aSize;\nvarying float vLit;');
  v = inject(v, '#include <project_vertex>', [
    'vLit = aLit;',
    'float glowScale = aSize * clamp( aLit, 0.0, 1.6 );',
    'vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );',
    'mvPosition.xy += position.xy * glowScale;',
    'gl_Position = projectionMatrix * mvPosition;',
  ].join('\n\t'));
  let f = shader.fragmentShader;
  f = inject(f, '#include <common>', '#include <common>\nvarying float vLit;');
  f = inject(f, '#include <color_fragment>', '#include <color_fragment>\n\tdiffuseColor.a *= clamp( vLit, 0.0, 1.0 );\n\tdiffuseColor.rgb *= max( vLit, 1.0 );');
  f = inject(f, '#include <fog_fragment>', ADDITIVE_FOG);
  shader.vertexShader = v;
  shader.fragmentShader = f;
}

export function createGlowMaterial(map: THREE.Texture): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({
    map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  m.onBeforeCompile = (shader) => patchGlow(shader);
  m.customProgramCacheKey = () => GLOW_CACHE_KEY;
  return m;
}

export interface GlowInstances {
  count: number;
  map: Uint8Array;          // EMITTERS index per sprite
  matrices: Float32Array;   // translation-only instance matrices
  colors: Float32Array;     // linear rgb
  sizes: Float32Array;      // world size from the registry
  lit: Float32Array;        // aLit, written by the driver
}

export function glowInstances(): GlowInstances {
  const indices: number[] = [];
  EMITTERS.forEach((e, i) => { if (e.id !== 'ridge') indices.push(i); });
  const count = indices.length;
  const out: GlowInstances = {
    count,
    map: Uint8Array.from(indices),
    matrices: new Float32Array(count * 16),
    colors: new Float32Array(count * 3),
    sizes: new Float32Array(count),
    lit: new Float32Array(count),
  };
  const c = new THREE.Color();
  indices.forEach((ei, k) => {
    const e = EMITTERS[ei];
    const o = k * 16;
    out.matrices[o] = 1;
    out.matrices[o + 5] = 1;
    out.matrices[o + 10] = 1;
    out.matrices[o + 15] = 1;
    out.matrices[o + 12] = e.position[0];
    out.matrices[o + 13] = e.position[1];
    out.matrices[o + 14] = e.position[2];
    c.set(e.color).toArray(out.colors, k * 3);
    out.sizes[k] = e.size;
  });
  return out;
}
