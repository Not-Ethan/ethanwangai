// Per-instance buffers for one kit: the rest-pose matrices instanceMatrix is uploaded from once, and the three
// attributes the vertex chunk reads (aExplode, aMeta, aParam; src/gl/shaders/common.glsl.ts). Reserve instances
// trail the layout's parts at scale 0, tagged as visitor ping cells, so the visitor's sentence can be uploaded into
// them later without ever resizing a buffer. Pure three math: no renderer, no React.
import * as THREE from 'three';
import { KIND, MACHINE, type PartInstance, type PRIMITIVE_NAMES } from '@/bench';

/** Instances each kit holds back for the visitor's machine; sums to 31 ≥ VISITOR_RESERVE. */
export const VISITOR_RESERVE_BY_PRIMITIVE: Record<(typeof PRIMITIVE_NAMES)[number], number> = {
  cell: 24, bar: 6, ring: 1, cap: 0, rod: 0, tile: 0,
};

export interface KitAttributes {
  matrices: Float32Array;   // count × 16, column-major, for instanceMatrix
  explode: Float32Array;    // count × 3, aExplode
  meta: Float32Array;       // count × 4, aMeta: birth, machine, kind, col
  param: Float32Array;      // count × 4, aParam
  count: number;            // parts + reserve
}

/** An unbuilt reserve instance: birth 0, the visitor's machine, the ping kind, no column. */
const RESERVE_META: readonly [number, number, number, number] = [0, MACHINE.visitor, KIND.ping, -1];

export function buildKitAttributes(parts: PartInstance[], reserve: number): KitAttributes {
  const count = parts.length + reserve;
  const matrices = new Float32Array(count * 16);
  const explode = new Float32Array(count * 3);
  const meta = new Float32Array(count * 4);
  const param = new Float32Array(count * 4);
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();

  parts.forEach((part, i) => {
    m.compose(p.fromArray(part.position), q.fromArray(part.quaternion), s.fromArray(part.scale)).toArray(matrices, i * 16);
    explode.set(part.explode, i * 3);
    meta.set([part.birth, part.machine, part.kind, part.col], i * 4);
    param.set(part.param, i * 4);
  });

  // Reserve: scale 0 leaves only the matrix's w = 1; explode and param stay zero.
  m.compose(p.set(0, 0, 0), q.identity(), s.set(0, 0, 0));
  for (let i = parts.length; i < count; i++) {
    m.toArray(matrices, i * 16);
    meta.set(RESERVE_META, i * 4);
  }
  return { matrices, explode, meta, param, count };
}
