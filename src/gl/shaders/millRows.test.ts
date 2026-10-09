import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { patchWindows } from './windows';
import { patchMillRows } from './millRows';

const windowsShader = () => {
  const shader = {
    vertexShader: THREE.ShaderLib.basic.vertexShader,
    fragmentShader: THREE.ShaderLib.basic.fragmentShader,
    uniforms: {} as Record<string, { value: unknown }>,
  };
  patchWindows(shader);
  return shader;
};

describe('patchMillRows (spec §4.5, §6)', () => {
  it('scales a mill window by its row level after Stage 2 sets vLit, leaving other windows alone', () => {
    const rows = { value: new THREE.Vector4() };
    const shader = windowsShader();
    patchMillRows(shader, rows);
    expect(shader.vertexShader).toContain('uniform vec4 uMillRows;');
    expect(shader.vertexShader).toContain('if ( aRow > -0.5 ) vLit *= uMillRows[ int( aRow + 0.5 ) ];');
    expect(shader.vertexShader.indexOf('vLit *= uMillRows')).toBeGreaterThan(shader.vertexShader.indexOf('vLit = aLit;'));
    expect(shader.uniforms.uMillRows).toBe(rows);
  });

  it('fails loudly when the windows patch has not run', () => {
    const bare = { vertexShader: THREE.ShaderLib.basic.vertexShader, uniforms: {} };
    expect(() => patchMillRows(bare, { value: new THREE.Vector4() })).toThrow();
  });
});
