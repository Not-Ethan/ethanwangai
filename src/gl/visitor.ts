// Section 09's switch-on (design §3.1 · 09): the visitor's sentence becomes a machine in the slot. planVisitor lays the
// sentence out (visitorLayout.ts through layout(), so every count on the plate is the layout's); uploadVisitor writes
// its parts into the reserve instances each kit holds back at scale 0 (kitAttributes.ts) and its ink targets into the
// visitor partition, the one upload after load; clearVisitor zero-scales the reserve again. The kits' buffers are
// never resized: the reserve is the first VISITOR_RESERVE_BY_PRIMITIVE[p] instances after each kit's base count.
// Clocks.tsx calls the uploads from its frame, on the renderer's clock, once a teardown has finished.
import * as THREE from 'three';
import { MACHINE, PRIMITIVE_NAMES, type LayoutResult, type PartInstance, type PrimitiveId, type Tier } from '@/bench/types';
import { layout } from '@/bench/layout';
import { parseSentence, visitorConfig } from '@/bench/visitorLayout';
import { hashString, mulberry32 } from '@/bench/hash';
import { BENCH_SEED_TEXT } from '@/bench/bench';
import { buildKitAttributes, VISITOR_RESERVE_BY_PRIMITIVE } from './kitAttributes';
import { PARTITION } from './inkGeometry';
import { kitRefs } from './registry';

export interface VisitorPlan { result: LayoutResult; words: number; sentences: number }

/** The reserve slots' contents per primitive, reserve-sized: the plan's parts first, then zero-scaled unused slots. */
export interface VisitorUpload {
  matrices: Record<PrimitiveId, Float32Array>;   // reserve × 16, for instanceMatrix
  meta: Record<PrimitiveId, Float32Array>;       // reserve × 4, aMeta
  param: Record<PrimitiveId, Float32Array>;      // reserve × 4, aParam
  explode: Record<PrimitiveId, Float32Array>;    // reserve × 3, aExplode
  count: number;                                 // the visitor's parts
  words: number;
  sentences: number;
}

/** The ink points' visitor partition. Ink.tsx hands it in as it mounts and takes it back as it unmounts. */
export interface VisitorInk {
  geometry: THREE.BufferGeometry;   // carries aTarget (also `position`) and aTargetBirth
  offset: number;                   // the partition's first point
  size: number;                     // and its point count
  centroid: Float32Array;           // uCentroid's vec3[8]: slot PARTITION.visitor is the visitor's
  /** Re-samples #yours-echo, which Yours has written the sentence into, into the partition's aSpawnUV. */
  resample(): void;
}
export const visitorInk: { current: VisitorInk | null } = { current: null };

const SEED = hashString(BENCH_SEED_TEXT);

/** The sentence as a laid-out machine and its counts, or null when it has no words. */
export function planVisitor(text: string, tier: Tier): VisitorPlan | null {
  const { words, sentences } = parseSentence(text);
  if (words.length === 0) return null;
  return { result: layout({ tier, seed: SEED, configs: [visitorConfig(text)] }), words: words.length, sentences };
}

const record = () => ({}) as Record<PrimitiveId, Float32Array>;

/** Packs the plan into each kit's reserve: parts first, the rest zero-scaled as the kits built them. */
export function packVisitor(plan: VisitorPlan): VisitorUpload {
  const up: VisitorUpload = {
    matrices: record(), meta: record(), param: record(), explode: record(),
    count: plan.result.counts.total, words: plan.words, sentences: plan.sentences,
  };
  PRIMITIVE_NAMES.forEach((name, i) => {
    const id = i as PrimitiveId;
    const parts = plan.result.byPrimitive[id];
    const reserve = VISITOR_RESERVE_BY_PRIMITIVE[name];
    if (parts.length > reserve) throw new Error(`visitor: ${parts.length} ${name} parts overflow a reserve of ${reserve}`);
    const a = buildKitAttributes(parts, reserve - parts.length);
    up.matrices[id] = a.matrices;
    up.meta[id] = a.meta;
    up.param[id] = a.param;
    up.explode[id] = a.explode;
  });
  return up;
}

/**
 * The visitor partition's targets from the plan's parts in birth order, one stratum per point with a seeded jitter,
 * as buildInkGeometry does for every other machine: the buffer runs early to late birth and every part receives ink.
 */
export function writeVisitorTargets(parts: readonly PartInstance[], target: Float32Array, targetBirth: Float32Array, offset: number, size: number): void {
  if (parts.length === 0) return;
  const sorted = [...parts].sort((a, b) => a.birth - b.birth);
  const rng = mulberry32(SEED);
  for (let i = 0; i < size; i++) {
    const k = offset + i;
    const q = sorted[Math.min(sorted.length - 1, Math.floor(((i + rng()) / size) * sorted.length))];
    target.set(q.position, k * 3);
    targetBirth[k] = q.birth;
  }
}

/** Each kit that holds a reserve, with the first reserve instance's index. */
function reserves(each: (mesh: THREE.InstancedMesh, id: PrimitiveId, base: number, reserve: number) => void): void {
  PRIMITIVE_NAMES.forEach((name, i) => {
    const id = i as PrimitiveId;
    const reserve = VISITOR_RESERVE_BY_PRIMITIVE[name];
    const mesh = kitRefs[id];
    if (mesh && reserve > 0) each(mesh, id, mesh.count - reserve, reserve);
  });
}

function writeAttribute(geometry: THREE.BufferGeometry, name: string, values: Float32Array, offset: number): void {
  const a = geometry.getAttribute(name) as THREE.BufferAttribute;
  (a.array as Float32Array).set(values, offset);
  a.needsUpdate = true;
}

const _m = new THREE.Matrix4();

/** Writes the plan into the kits' reserve and the visitor ink partition, each buffer flagged for upload once. */
export function uploadVisitor(plan: VisitorPlan): void {
  const up = packVisitor(plan);
  reserves((mesh, id, base, reserve) => {
    for (let k = 0; k < reserve; k++) mesh.setMatrixAt(base + k, _m.fromArray(up.matrices[id], k * 16));
    mesh.instanceMatrix.needsUpdate = true;
    writeAttribute(mesh.geometry, 'aMeta', up.meta[id], base * 4);
    writeAttribute(mesh.geometry, 'aParam', up.param[id], base * 4);
    writeAttribute(mesh.geometry, 'aExplode', up.explode[id], base * 3);
  });

  const ink = visitorInk.current;
  if (!ink) return;
  const target = ink.geometry.getAttribute('aTarget') as THREE.BufferAttribute;
  const birth = ink.geometry.getAttribute('aTargetBirth') as THREE.BufferAttribute;
  const parts = plan.result.parts.filter((p) => p.machine === MACHINE.visitor);
  writeVisitorTargets(parts, target.array as Float32Array, birth.array as Float32Array, ink.offset, ink.size);
  target.needsUpdate = true;
  birth.needsUpdate = true;
  ink.centroid.set(plan.result.machines[MACHINE.visitor].centroid, PARTITION.visitor * 3);
  ink.resample();
}

/** A reserve instance at rest: scale 0, as the kits built it. */
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

/** Zero-scales every reserve instance, so the slot is empty again. */
export function clearVisitor(): void {
  reserves((mesh, _id, base, reserve) => {
    for (let k = 0; k < reserve; k++) mesh.setMatrixAt(base + k, ZERO);
    mesh.instanceMatrix.needsUpdate = true;
  });
}
