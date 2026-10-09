// The mill rows in the windows material (spec §4.5, §6): after Stage 2's patchWindows has written vLit and vRow, a
// mill window (aRow 0..3) has vLit scaled by its row's level from uMillRows; every other window (aRow -1) is
// untouched. A row at 0 falls under Stage 2's discard, so the wall shows. inject throws on a missing anchor.
import type * as THREE from 'three';
import { inject } from './inject';

export function patchMillRows(
  shader: { vertexShader: string; uniforms: Record<string, { value: unknown }> },
  millRows: { value: THREE.Vector4 },
): void {
  let v = inject(shader.vertexShader, '#include <common>', '#include <common>\nuniform vec4 uMillRows;');
  v = inject(v, '\tvRow = aRow;', '\tvRow = aRow;\n\tif ( aRow > -0.5 ) vLit *= uMillRows[ int( aRow + 0.5 ) ];');
  shader.vertexShader = v;
  shader.uniforms.uMillRows = millRows;
}
