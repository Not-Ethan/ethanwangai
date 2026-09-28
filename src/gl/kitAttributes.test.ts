import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { KIND, MACHINE, PRIMITIVE, PRIMITIVE_NAMES, VISITOR_RESERVE, type PartInstance } from '@/bench';
import { buildKitAttributes, VISITOR_RESERVE_BY_PRIMITIVE } from './kitAttributes';

const ROT_Y_90: PartInstance['quaternion'] = [0, Math.SQRT1_2, 0, Math.SQRT1_2];

const base: PartInstance = {
  primitive: PRIMITIVE.bar, kind: KIND.static, position: [0, 0, 0], quaternion: [0, 0, 0, 1], scale: [1, 1, 1],
  param: [0, 0, 0, 0], col: -1, module: 'frame', group: 0, explodeMode: 'module',
  machine: MACHINE.quoter, explode: [0, 0, 0], birth: 0,
};
const parts: PartInstance[] = [
  { ...base, position: [1, 0, 0], explode: [0.75, 0, 0], birth: 0.25, param: [1, 2, 3, 4], col: 3 },
  { ...base, position: [0, 0.5, 0], quaternion: ROT_Y_90, kind: KIND.sweep, machine: MACHINE.intake, birth: 0.5 },
  { ...base, position: [2.5, 0.25, -3], scale: [3, 1, 1], kind: KIND.lever, birth: 1 },
];

const matrixAt = (m: Float32Array, i: number) => new THREE.Matrix4().fromArray(m, i * 16);
const slice = (a: Float32Array, from: number, n: number) => Array.from(a.subarray(from, from + n));

describe('buildKitAttributes', () => {
  const a = buildKitAttributes(parts, 2);

  it('counts parts plus reserve and sizes every buffer to that count', () => {
    expect(a.count).toBe(5);
    expect(a.matrices.length).toBe(80);
    expect(a.explode.length).toBe(15);
    expect(a.meta.length).toBe(20);
    expect(a.param.length).toBe(20);
  });

  it('writes the third matrix\'s translation from the part\'s position', () => {
    expect(slice(a.matrices, 2 * 16 + 12, 3)).toEqual([2.5, 0.25, -3]);
  });

  it('composes position, quaternion and scale so a rotated part turns its axis and a scaled part keeps its length', () => {
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    matrixAt(a.matrices, 2).decompose(p, q, s);
    expect(s.toArray()).toEqual([3, 1, 1]);
    const x = new THREE.Vector3(1, 0, 0).applyMatrix4(matrixAt(a.matrices, 1));
    expect(x.x).toBeCloseTo(0, 5);
    expect(x.y).toBeCloseTo(0.5, 5);
    expect(x.z).toBeCloseTo(-1, 5);
  });

  it('packs aExplode, aMeta (birth, machine, kind, col) and aParam per part', () => {
    expect(slice(a.explode, 0, 3)).toEqual([0.75, 0, 0]);
    expect(slice(a.meta, 0, 4)).toEqual([0.25, MACHINE.quoter, KIND.static, 3]);
    expect(slice(a.meta, 4, 4)).toEqual([0.5, MACHINE.intake, KIND.sweep, -1]);
    expect(slice(a.meta, 8, 4)).toEqual([1, MACHINE.quoter, KIND.lever, -1]);
    expect(slice(a.param, 0, 4)).toEqual([1, 2, 3, 4]);
  });

  it('gives reserve instances zero scale and meta [0, 7, 8, -1]', () => {
    expect(a.meta[4 * 3 + 1]).toBe(7);
    for (const i of [3, 4]) {
      expect(matrixAt(a.matrices, i).getMaxScaleOnAxis()).toBe(0);
      expect(slice(a.meta, i * 4, 4)).toEqual([0, MACHINE.visitor, KIND.ping, -1]);
      expect(slice(a.explode, i * 3, 3)).toEqual([0, 0, 0]);
      expect(slice(a.param, i * 4, 4)).toEqual([0, 0, 0, 0]);
    }
  });

  it('handles an empty kit and a zero reserve', () => {
    expect(buildKitAttributes([], 0).count).toBe(0);
    expect(buildKitAttributes(parts, 0).count).toBe(3);
    expect(buildKitAttributes([], 4).matrices.length).toBe(64);
  });
});

describe('VISITOR_RESERVE_BY_PRIMITIVE', () => {
  it('reserves cell 24, bar 6, ring 1 and nothing else', () => {
    expect(VISITOR_RESERVE_BY_PRIMITIVE).toEqual({ cell: 24, bar: 6, ring: 1, cap: 0, rod: 0, tile: 0 });
  });

  it('names every primitive and covers the visitor reserve in total', () => {
    expect(Object.keys(VISITOR_RESERVE_BY_PRIMITIVE).sort()).toEqual([...PRIMITIVE_NAMES].sort());
    const total = PRIMITIVE_NAMES.reduce((n, name) => n + VISITOR_RESERVE_BY_PRIMITIVE[name], 0);
    expect(total).toBeGreaterThanOrEqual(VISITOR_RESERVE);
  });
});
