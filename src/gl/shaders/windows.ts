// The window quads' material (spec §6 Windows): MeshBasicMaterial patched through onBeforeCompile so three's own
// instancing, instance colour, fog and colour-space chunks stay intact. aLit 0..1.6 scales the colour; an unlit
// instance is discarded so the wall shows. aRow (mill rows 0..3) is carried for Stage 3's row lighting.
import * as THREE from 'three';
import { inject } from './inject';
import { patchMillRows } from './millRows';

export const WINDOWS_CACHE_KEY = 'valley-windows';

export function patchWindows(shader: { vertexShader: string; fragmentShader: string }): void {
  let v = shader.vertexShader;
  v = inject(v, '#include <common>', '#include <common>\nattribute float aLit;\nattribute float aRow;\nvarying float vLit;\nvarying float vRow;');
  v = inject(v, '#include <color_vertex>', '#include <color_vertex>\n\tvLit = aLit;\n\tvRow = aRow;');
  let f = shader.fragmentShader;
  f = inject(f, '#include <common>', '#include <common>\nvarying float vLit;\nvarying float vRow;');
  f = inject(f, '#include <color_fragment>', '#include <color_fragment>\n\tif ( vLit < 0.001 ) discard;\n\tdiffuseColor.rgb *= vLit;');
  shader.vertexShader = v;
  shader.fragmentShader = f;
}

export function createWindowsMaterial(millRows?: { value: THREE.Vector4 }): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ toneMapped: false });
  m.onBeforeCompile = (shader) => {
    patchWindows(shader);
    if (millRows) patchMillRows(shader, millRows);
  };
  m.customProgramCacheKey = () => (millRows ? `${WINDOWS_CACHE_KEY}-mill` : WINDOWS_CACHE_KEY);
  return m;
}
