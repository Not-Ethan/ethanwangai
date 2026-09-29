import { describe, it, expect, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { KIND, MACHINE, PRIMITIVE, PRIMITIVE_NAMES, type LayoutResult, type PrimitiveId } from '@/bench/types';
import { PLACEMENT } from '@/bench/bench';
import { layout } from '@/bench/layout';
import { SLOT } from '@/bench/configs/slot';
import { BOT } from '@/bench/configs/bot';
import { VISITOR_RESERVE } from '@/bench/visitorLayout';
import { buildKitAttributes, VISITOR_RESERVE_BY_PRIMITIVE } from './kitAttributes';
import { PARTITION, PARTITION_SIZES } from './inkGeometry';
import { buildBench } from '@/bench/counts';
import { createUniforms } from './material/uniforms';
import { bindVisitorInk, createInkPoints } from './Ink';
import { kitRefs } from './registry';
import { planVisitor, packVisitor, uploadVisitor, clearVisitor, writeVisitorTargets, visitorInk } from './visitor';

/** The 3 × 3 linear part of a column-major Matrix4: all zero for a zero-scaled instance. */
const LINEAR = [0, 1, 2, 4, 5, 6, 8, 9, 10];
const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');

describe('planVisitor', () => {
  it('plans nothing for an empty or blank sentence', () => {
    expect(planVisitor('', 'desktop')).toBeNull();
    expect(planVisitor('   ', 'desktop')).toBeNull();
    expect(planVisitor('\n\t ', 'phone')).toBeNull();
  });

  it('caps a 40-word sentence at the reserve rule: 23 or 24 words, never more than 30 parts', () => {
    for (const tier of ['desktop', 'phone'] as const) {
      const plan = planVisitor(words(40), tier)!;
      expect([23, 24]).toContain(plan.words);
      expect(plan.result.counts.total).toBeLessThanOrEqual(VISITOR_RESERVE);
      expect(plan.result.counts.byMachine[MACHINE.visitor]).toBe(plan.result.counts.total);
    }
  });

  it("counts '...' as one word and one sentence", () => {
    const plan = planVisitor('...', 'desktop')!;
    expect(plan.words).toBe(1);
    expect(plan.sentences).toBe(1);
  });

  it('counts the plate from the layout: 7 words, 2 sentences, 12 parts', () => {
    const plan = planVisitor('build a thing that runs. then another.', 'desktop')!;
    expect(plan).toMatchObject({ words: 7, sentences: 2 });
    expect(plan.result.counts.total).toBe(12);
  });

  it('packs finite matrices whose parts sit inside the slot (origin ± 1.2)', () => {
    const o = PLACEMENT[MACHINE.visitor].origin;
    for (const text of [words(40), 'build a thing that runs. then another.', '...', 'a. b. c. d. e. f.', `a. b. ${words(22)}`]) {
      const up = packVisitor(planVisitor(text, 'desktop')!);
      const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
      let placed = 0;
      for (const [i] of PRIMITIVE_NAMES.entries()) {
        const mats = up.matrices[i as PrimitiveId];
        mats.forEach((v) => expect(Number.isFinite(v)).toBe(true));
        for (let k = 0; k < mats.length / 16; k++) {
          if (LINEAR.every((j) => mats[k * 16 + j] === 0)) continue;   // an unused reserve slot, zero-scaled
          m.fromArray(mats, k * 16).decompose(p, q, s);
          placed++;
          expect(Math.abs(p.x - o[0])).toBeLessThanOrEqual(1.2);
          expect(Math.abs(p.z - o[2])).toBeLessThanOrEqual(1.2);
        }
      }
      expect(placed).toBe(up.count);
    }
  });
});

describe('packVisitor', () => {
  it('fills each kit\'s reserve with the plan\'s parts in layout order and leaves the rest as the kits built it', () => {
    const plan = planVisitor('build a thing that runs. then another.', 'desktop')!;
    const up = packVisitor(plan);
    expect(up).toMatchObject({ count: 12, words: 7, sentences: 2 });
    PRIMITIVE_NAMES.forEach((name, i) => {
      const id = i as PrimitiveId;
      const reserve = VISITOR_RESERVE_BY_PRIMITIVE[name];
      const built = buildKitAttributes(plan.result.byPrimitive[id], reserve - plan.result.byPrimitive[id].length);
      expect(up.matrices[id]).toHaveLength(reserve * 16);
      expect(up.meta[id]).toHaveLength(reserve * 4);
      expect(up.param[id]).toHaveLength(reserve * 4);
      expect(up.explode[id]).toHaveLength(reserve * 3);
      expect(up.matrices[id]).toEqual(built.matrices);
      expect(up.meta[id]).toEqual(built.meta);
    });
    expect(plan.result.byPrimitive[PRIMITIVE.cell]).toHaveLength(7);   // one cell per word
    const bars = plan.result.byPrimitive[PRIMITIVE.bar].length;         // two rails, the spoke, the lever: the lever is the bar kit's last part
    expect(bars).toBe(4);
    expect(Array.from(up.meta[PRIMITIVE.bar].subarray((bars - 1) * 4, bars * 4))).toEqual([1, MACHINE.visitor, KIND.lever, -1]);
    expect(Array.from(up.meta[PRIMITIVE.bar].subarray(bars * 4, (bars + 1) * 4))).toEqual([0, MACHINE.visitor, KIND.ping, -1]);   // a spare slot
  });
});

describe('writeVisitorTargets', () => {
  it('runs the partition early to late birth and lands ink on every part, the lever included', () => {
    const plan = planVisitor('build a thing that runs. then another.', 'desktop')!;
    const parts = plan.result.parts;
    const offset = 5, size = 512;
    const target = new Float32Array((offset + size + 3) * 3).fill(-7);
    const birth = new Float32Array(offset + size + 3).fill(-7);
    writeVisitorTargets(parts, target, birth, offset, size);
    expect(Array.from(birth.subarray(0, offset))).toEqual(new Array(offset).fill(-7));   // other partitions untouched
    expect(Array.from(birth.subarray(offset + size))).toEqual([-7, -7, -7]);
    const hit = new Set<number>();
    for (let i = 0; i < size; i++) {
      const k = offset + i;
      if (i > 0) expect(birth[k]).toBeGreaterThanOrEqual(birth[k - 1]);
      const j = parts.findIndex((p) => Math.fround(p.birth) === birth[k] && p.position.every((v, a) => Math.fround(v) === target[k * 3 + a]));
      expect(j).toBeGreaterThanOrEqual(0);
      hit.add(j);
    }
    expect(hit.size).toBe(parts.length);
    expect(birth[offset + size - 1]).toBe(1);
  });
});

// Kits the way Kits.tsx builds them: a small base layout plus each primitive's reserve, as real InstancedMeshes.
function fakeKits(base: LayoutResult): THREE.InstancedMesh[] {
  return PRIMITIVE_NAMES.map((name, i) => {
    const a = buildKitAttributes(base.byPrimitive[i], VISITOR_RESERVE_BY_PRIMITIVE[name]);
    const g = new THREE.BoxGeometry();
    g.setAttribute('aExplode', new THREE.InstancedBufferAttribute(a.explode, 3));
    g.setAttribute('aMeta', new THREE.InstancedBufferAttribute(a.meta, 4));
    g.setAttribute('aParam', new THREE.InstancedBufferAttribute(a.param, 4));
    const mesh = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial(), a.count);
    mesh.instanceMatrix = new THREE.InstancedBufferAttribute(a.matrices, 16);
    kitRefs[i as PrimitiveId] = mesh;
    return mesh;
  });
}
const ATTRS = ['aMeta', 'aParam', 'aExplode'] as const;
const versions = (m: THREE.InstancedMesh) => [m.instanceMatrix.version, ...ATTRS.map((n) => (m.geometry.getAttribute(n) as THREE.BufferAttribute).version)];
const snapshot = (m: THREE.InstancedMesh) => [Float32Array.from(m.instanceMatrix.array), ...ATTRS.map((n) => Float32Array.from(m.geometry.getAttribute(n).array))];

describe('uploadVisitor and clearVisitor', () => {
  const base = layout({ tier: 'desktop', seed: 1, configs: [BOT, SLOT] });
  const OFFSET = 10, SIZE = 256, TAIL = 4;
  function fakeInk() {
    const g = new THREE.BufferGeometry();
    const target = new THREE.BufferAttribute(new Float32Array((OFFSET + SIZE + TAIL) * 3).fill(-7), 3);
    g.setAttribute('position', target);
    g.setAttribute('aTarget', target);
    g.setAttribute('aTargetBirth', new THREE.BufferAttribute(new Float32Array(OFFSET + SIZE + TAIL).fill(-7), 1));
    const centroid = new Float32Array(8 * 3).fill(-7);
    let resampled = 0;
    visitorInk.current = { geometry: g, offset: OFFSET, size: SIZE, centroid, resample: () => { resampled++; } };
    return { g, centroid, resampled: () => resampled };
  }

  afterEach(() => {
    for (let i = 0; i < PRIMITIVE_NAMES.length; i++) kitRefs[i as PrimitiveId] = null;
    visitorInk.current = null;
  });

  it('writes the plan into the reserve after each kit\'s base count, flags every buffer for upload once, and leaves the base alone', () => {
    const kits = fakeKits(base);
    const before = kits.map(snapshot), v0 = kits.map(versions);
    const plan = planVisitor('build a thing that runs. then another.', 'desktop')!;
    const up = packVisitor(plan);
    uploadVisitor(plan);
    kits.forEach((mesh, i) => {
      const id = i as PrimitiveId;
      const reserve = VISITOR_RESERVE_BY_PRIMITIVE[PRIMITIVE_NAMES[i]];
      const n = base.byPrimitive[i].length;
      expect(mesh.count).toBe(n + reserve);                                          // never resized
      const after = snapshot(mesh);
      [16, 4, 4, 3].forEach((stride, a) => expect(after[a].subarray(0, n * stride)).toEqual(before[i][a].subarray(0, n * stride)));
      if (reserve === 0) { expect(versions(mesh)).toEqual(v0[i]); return; }
      expect(versions(mesh)).toEqual(v0[i].map((v) => v + 1));                     // one needsUpdate each
      expect(after[0].subarray(n * 16)).toEqual(up.matrices[id]);
      expect(after[1].subarray(n * 4)).toEqual(up.meta[id]);
      expect(after[2].subarray(n * 4)).toEqual(up.param[id]);
      expect(after[3].subarray(n * 3)).toEqual(up.explode[id]);
    });
  });

  it('points the visitor ink partition at the parts, moves uCentroid[6] onto them, and re-samples the echo once', () => {
    fakeKits(base);
    const ink = fakeInk();
    const target = ink.g.getAttribute('aTarget') as THREE.BufferAttribute;
    const birth = ink.g.getAttribute('aTargetBirth') as THREE.BufferAttribute;
    const plan = planVisitor('build a thing that runs. then another.', 'desktop')!;
    uploadVisitor(plan);
    expect(target.version).toBe(1);
    expect(birth.version).toBe(1);
    expect(ink.g.getAttribute('position')).toBe(target);                          // one buffer: position is aTarget
    expect(ink.resampled()).toBe(1);
    const t = target.array as Float32Array, b = birth.array as Float32Array;
    expect(Array.from(b.subarray(0, OFFSET))).toEqual(new Array(OFFSET).fill(-7));
    expect(Array.from(b.subarray(OFFSET + SIZE))).toEqual(new Array(TAIL).fill(-7));
    expect(Array.from(t.subarray(0, OFFSET * 3))).toEqual(new Array(OFFSET * 3).fill(-7));
    const o = PLACEMENT[MACHINE.visitor].origin;
    for (let k = OFFSET; k < OFFSET + SIZE; k++) {
      expect(b[k]).toBeGreaterThan(0);
      expect(Math.abs(t[k * 3] - o[0])).toBeLessThanOrEqual(1.2);
      expect(Math.abs(t[k * 3 + 2] - o[2])).toBeLessThanOrEqual(1.2);
    }
    const c = plan.result.machines[MACHINE.visitor].centroid;
    expect(Array.from(ink.centroid.subarray(PARTITION.visitor * 3, PARTITION.visitor * 3 + 3))).toEqual(c.map(Math.fround));
    expect(Array.from(ink.centroid.subarray(0, PARTITION.visitor * 3))).toEqual(new Array(PARTITION.visitor * 3).fill(-7));
  });

  it('a second sentence overwrites the first: fewer words leave the spare reserve zero-scaled', () => {
    const kits = fakeKits(base);
    uploadVisitor(planVisitor(Array(20).fill('w').join(' '), 'desktop')!);
    uploadVisitor(planVisitor('two words', 'desktop')!);
    const cells = kits[PRIMITIVE.cell];
    const n = base.byPrimitive[PRIMITIVE.cell].length;
    const m = cells.instanceMatrix.array as Float32Array;
    for (let k = 0; k < VISITOR_RESERVE_BY_PRIMITIVE.cell; k++) {
      const zero = LINEAR.every((j) => m[(n + k) * 16 + j] === 0);
      expect(zero).toBe(k >= 2);
    }
  });

  it('clearVisitor zero-scales the whole reserve, flags instanceMatrix once, and leaves the base alone', () => {
    const kits = fakeKits(base);
    uploadVisitor(planVisitor('build a thing that runs. then another.', 'desktop')!);
    const before = kits.map(snapshot), v0 = kits.map(versions);
    clearVisitor();
    kits.forEach((mesh, i) => {
      const reserve = VISITOR_RESERVE_BY_PRIMITIVE[PRIMITIVE_NAMES[i]];
      const n = base.byPrimitive[i].length;
      const m = mesh.instanceMatrix.array as Float32Array;
      expect(m.subarray(0, n * 16)).toEqual(before[i][0].subarray(0, n * 16));
      for (let k = 0; k < reserve; k++) expect(LINEAR.every((j) => m[(n + k) * 16 + j] === 0)).toBe(true);
      expect(mesh.instanceMatrix.version).toBe(v0[i][0] + (reserve > 0 ? 1 : 0));
    });
  });

  it('does nothing before the kits and the ink have mounted', () => {
    expect(() => { uploadVisitor(planVisitor('one', 'phone')!); clearVisitor(); }).not.toThrow();
  });
});

describe('bindVisitorInk (Ink.tsx)', () => {
  afterEach(() => { visitorInk.current = null; vi.unstubAllGlobals(); });

  it('hands the real visitor partition and uCentroid to the upload, and a stale release leaves a newer binding alone', () => {
    const bench = buildBench('phone');
    const points = createInkPoints(bench, 'phone', 1);
    const u = createUniforms();
    const release = bindVisitorInk(points, u);
    const h = visitorInk.current!;
    expect(h.geometry).toBe(points.geometry);
    expect(h.offset).toBe(points.data.offsets[PARTITION.visitor]);
    expect(h.size).toBe(PARTITION_SIZES.phone[PARTITION.visitor]);
    expect(h.offset + h.size).toBe(points.data.count);
    expect(h.centroid).toBe(u.uCentroid.value);

    // the whole upload through it: the visitor's points turn toward its parts, every other partition keeps its own
    vi.stubGlobal('document', { querySelector: () => null });          // no echo to re-sample in node
    const before = Float32Array.from(points.data.target);
    uploadVisitor(planVisitor('build a thing that runs. then another.', 'phone')!);
    expect(points.data.target.subarray(0, h.offset * 3)).toEqual(before.subarray(0, h.offset * 3));
    expect(points.data.targetBirth.subarray(h.offset).every((b) => b > 0)).toBe(true);
    expect((points.geometry.getAttribute('aSpawnUV') as THREE.BufferAttribute).version).toBe(0);   // no sample, no upload

    const newer = bindVisitorInk(createInkPoints(bench, 'phone', 2), u);
    release();
    expect(visitorInk.current).not.toBeNull();
    newer();
    expect(visitorInk.current).toBeNull();
  });
});
