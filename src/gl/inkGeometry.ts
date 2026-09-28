// The ink system's pure tables and point buffers (design §7): seven fixed partitions of one gl.POINTS draw, built once
// from a LayoutResult and never resized, so nothing is uploaded on the scroll path. Each point carries the bench-space
// part it lands on (aTarget) and that part's birth (aTargetBirth), so the shader alone decides when it flies; its
// spawn uv is written later by Ink.tsx from the sampled DOM text (writeSpawnUV). Pure TypeScript: no React, no DOM,
// no three, so the test runs in node and the emitter could count the points.
import { KIND, type LayoutResult, type Tier } from '@/bench/types';
import { SECTIONS } from '@/bench/sections';
import { mulberry32, hash2 } from '@/bench/hash';

export const PARTITION = { quoter: 0, intake: 1, merge: 2, balance: 3, splitter: 4, watch: 5, visitor: 6 } as const;
export type PartitionId = (typeof PARTITION)[keyof typeof PARTITION];
export const PARTITION_COUNT = 7;
export const PARTITION_SIZES: Record<Tier, number[]> = {
  desktop: [32768, 4096, 4096, 4096, 4096, 4096, 4096],
  phone: [7168, 1024, 1024, 1024, 1024, 1024, 1024],
};
/** Which machine's parts each partition targets; the merge burst lands on the quoter bed again. */
export const PARTITION_MACHINE = [0, 1, 0, 2, 3, 4, 7];
/** Rows in the band each partition prints through: ~40 for the quoter, 8 for the small machines, the burst and the visitor. */
export const BAND_ROWS = [40, 8, 8, 8, 8, 8, 8];
/** Row pitch of the band, CSS px; Ink.tsx writes it into uBandPitch in NDC each frame. */
export const BAND_PITCH_PX = 14;
/** The hashed share of the quoter partition that keeps flowing after the compile. */
export const TRICKLE_FRACTION = 0.02;
/** Point i of a partition takes spawn uv[(i · SPAWN_STRIDE) mod count]: a prime stride decorrelates neighbours. */
export const SPAWN_STRIDE = 7919;
/** The eighth uRect slot: section 03's first line, the trickle's source there, which is no partition's own. */
export const FIRST_LINE_SLOT = 7;

/** uRect slot the trickle spawns from, by section id; −1 turns the trickle off (08 · alive). */
const TRICKLE_SOURCE: Record<string, number> = {
  sentence: PARTITION.quoter, more: PARTITION.merge, first: FIRST_LINE_SLOT, kalshi: PARTITION.intake,
  heron: PARTITION.balance, darch: PARTITION.splitter, summers: PARTITION.watch, alive: -1, yours: PARTITION.visitor,
};
const TRICKLE_SLOT: readonly number[] = SECTIONS.map((s) => TRICKLE_SOURCE[s.id] ?? -1);

/** The uRect slot the trickle spawns from in `section`, or −1 when it is off there. */
export function trickleSlot(section: number): number {
  return TRICKLE_SLOT[section] ?? -1;
}

export interface InkGeometryData {
  target: Float32Array;        // count × 3, aTarget: bench-space part position
  targetBirth: Float32Array;   // aTargetBirth
  seed: Float32Array;          // aSeed, [0, 1)
  row: Float32Array;           // aRow, hashed row index in the partition's band
  partition: Float32Array;     // aPartition
  trickle: Float32Array;       // aTrickle, 1 for the quoter's trickle share
  offsets: number[];           // start index of each partition: the prefix sums of the tier's sizes
  count: number;
}

// Hash salts, so the row and the trickle draw independent streams from the same point index.
const ROW_SALT = 0x51ed27;
const TRICKLE_SALT = 0x9e37;

/**
 * N points per partition. Targets come from the machine's parts sorted by birth, one stratum per point with a seeded
 * jitter (a part is hit ~N/M times, with replacement), so the buffer runs early to late birth and every part receives
 * ink. The merge partition targets bed cells only; the visitor's targets stay zero until its sentence is typed.
 */
export function buildInkGeometry(result: LayoutResult, tier: Tier, seed: number): InkGeometryData {
  const sizes = PARTITION_SIZES[tier];
  const offsets: number[] = [];
  let count = 0;
  for (const n of sizes) { offsets.push(count); count += n; }

  const target = new Float32Array(count * 3);
  const targetBirth = new Float32Array(count);
  const seeds = new Float32Array(count);
  const row = new Float32Array(count);
  const partition = new Float32Array(count);
  const trickle = new Float32Array(count);
  const rng = mulberry32(seed);

  for (let p = 0; p < PARTITION_COUNT; p++) {
    const m = PARTITION_MACHINE[p];
    const parts = p === PARTITION.visitor
      ? []
      : result.parts.filter((q) => q.machine === m && (p !== PARTITION.merge || q.kind === KIND.cell)).sort((a, b) => a.birth - b.birth);
    const n = sizes[p];
    const rows = BAND_ROWS[p];
    for (let i = 0; i < n; i++) {
      const k = offsets[p] + i;
      seeds[k] = rng();
      row[k] = Math.floor(hash2(k, ROW_SALT) * rows);
      partition[k] = p;
      trickle[k] = p === PARTITION.quoter && hash2(k, TRICKLE_SALT) < TRICKLE_FRACTION ? 1 : 0;
      if (parts.length === 0) continue;
      const q = parts[Math.min(parts.length - 1, Math.floor(((i + rng()) / n) * parts.length))];
      target[k * 3] = q.position[0];
      target[k * 3 + 1] = q.position[1];
      target[k * 3 + 2] = q.position[2];
      targetBirth[k] = q.birth;
    }
  }
  return { target, targetBirth, seed: seeds, row, partition, trickle, offsets, count };
}

/** Writes a partition's aSpawnUV from a sampled text's uv pairs: point i takes uv[(i · SPAWN_STRIDE) mod count]. An empty sample leaves it. */
export function writeSpawnUV(out: Float32Array, offset: number, size: number, uv: Float32Array, count: number): void {
  if (count <= 0) return;
  for (let i = 0; i < size; i++) {
    const j = (i * SPAWN_STRIDE) % count;
    out[(offset + i) * 2] = uv[j * 2];
    out[(offset + i) * 2 + 1] = uv[j * 2 + 1];
  }
}

/** uCentroid: each partition's source machine centroid in bench space, as a vec3[8]; the eighth stays zero. */
export function writeCentroids(result: LayoutResult, out: Float32Array): Float32Array {
  for (let p = 0; p < PARTITION_COUNT; p++) out.set(result.machines[PARTITION_MACHINE[p]].centroid, p * 3);
  return out;
}
