import { describe, it, expect } from 'vitest';
import { KIND, MACHINE } from '@/bench/types';
import { buildBench } from '@/bench/counts';
import { SECTION_INDEX, SECTIONS } from '@/bench/sections';
import {
  PARTITION, PARTITION_COUNT, PARTITION_SIZES, PARTITION_MACHINE, BAND_ROWS, BAND_PITCH_PX, TRICKLE_FRACTION, SPAWN_STRIDE,
  FIRST_LINE_SLOT, buildInkGeometry, writeSpawnUV, writeCentroids, trickleSlot, type InkGeometryData,
} from './inkGeometry';

const desktop = buildBench('desktop');
const SEED = 1234;

/** Partition p's index range [from, to) in the point buffers. */
function range(d: InkGeometryData, p: number): [number, number] {
  return [d.offsets[p], d.offsets[p] + PARTITION_SIZES.desktop[p]];
}
/** A part's position as the Float32 the buffers store it in, so a lookup by key survives the rounding. */
const key32 = (v: readonly number[]) => v.map(Math.fround).join(',');
function mean(a: Float32Array, from: number, to: number): number {
  let s = 0;
  for (let i = from; i < to; i++) s += a[i];
  return s / (to - from);
}

describe('the partition tables', () => {
  it('names the seven partitions in order and maps each to its target machine (merge targets the quoter bed)', () => {
    expect(PARTITION).toEqual({ quoter: 0, intake: 1, merge: 2, balance: 3, splitter: 4, watch: 5, visitor: 6 });
    expect(PARTITION_COUNT).toBe(7);
    expect(PARTITION_MACHINE).toEqual([MACHINE.quoter, MACHINE.intake, MACHINE.quoter, MACHINE.balance, MACHINE.splitter, MACHINE.watch, MACHINE.visitor]);
    expect(PARTITION_MACHINE).toEqual([0, 1, 0, 2, 3, 4, 7]);
  });

  it('sizes: 32,768 + 6 × 4,096 = 57,344 on desktop and 7,168 + 6 × 1,024 = 13,312 on phone', () => {
    expect(PARTITION_SIZES.desktop).toEqual([32768, 4096, 4096, 4096, 4096, 4096, 4096]);
    expect(PARTITION_SIZES.phone).toEqual([7168, 1024, 1024, 1024, 1024, 1024, 1024]);
    expect(PARTITION_SIZES.desktop.reduce((a, b) => a + b)).toBe(57344);
    expect(PARTITION_SIZES.phone.reduce((a, b) => a + b)).toBe(13312);
  });

  it('bands: 40 rows for the quoter, 8 for every other partition, at a 14 CSS-px pitch; 2% of the quoter trickles', () => {
    expect(BAND_ROWS).toEqual([40, 8, 8, 8, 8, 8, 8]);
    expect(BAND_PITCH_PX).toBe(14);
    expect(TRICKLE_FRACTION).toBe(0.02);
    expect(SPAWN_STRIDE).toBe(7919);
  });
});

describe('buildInkGeometry (desktop)', () => {
  const d = buildInkGeometry(desktop, 'desktop', SEED);

  it('has 57,344 points, every buffer sized to it, and offsets that are the prefix sums of the partition sizes', () => {
    expect(d.count).toBe(57344);
    expect(d.target.length).toBe(57344 * 3);
    for (const name of ['targetBirth', 'seed', 'row', 'partition', 'trickle'] as const) expect(d[name].length, name).toBe(57344);
    expect(d.offsets).toEqual([0, 32768, 36864, 40960, 45056, 49152, 53248]);
    let sum = 0;
    for (let p = 0; p < PARTITION_COUNT; p++) { expect(d.offsets[p]).toBe(sum); sum += PARTITION_SIZES.desktop[p]; }
    expect(sum).toBe(d.count);
  });

  it('tags every point with its partition index', () => {
    for (let p = 0; p < PARTITION_COUNT; p++) {
      const [from, to] = range(d, p);
      for (let i = from; i < to; i++) if (d.partition[i] !== p) throw new Error(`point ${i} is tagged ${d.partition[i]}, expected ${p}`);
    }
  });

  it('puts every quoter-partition target inside the quoter\'s bounds', () => {
    const { min, max } = desktop.machines[MACHINE.quoter];
    const [from, to] = range(d, PARTITION.quoter);
    for (let i = from; i < to; i++) {
      for (let k = 0; k < 3; k++) {
        const v = d.target[i * 3 + k];
        if (v < min[k] - 1e-6 || v > max[k] + 1e-6) throw new Error(`point ${i} axis ${k}: ${v} outside [${min[k]}, ${max[k]}]`);
      }
    }
  });

  it('targets only bed cells from the merge partition, with the cell\'s own birth', () => {
    const cells = new Map<string, number>();
    for (const p of desktop.parts) if (p.machine === MACHINE.quoter && p.kind === KIND.cell) cells.set(key32(p.position), p.birth);
    expect(cells.size).toBeGreaterThan(1000);
    const [from, to] = range(d, PARTITION.merge);
    for (let i = from; i < to; i++) {
      const key = `${d.target[i * 3]},${d.target[i * 3 + 1]},${d.target[i * 3 + 2]}`;
      const birth = cells.get(key);
      if (birth === undefined) throw new Error(`merge point ${i} targets ${key}, not a bed cell`);
      expect(d.targetBirth[i]).toBeCloseTo(birth, 6);
    }
  });

  it('targets each small machine\'s own parts', () => {
    for (const p of [PARTITION.intake, PARTITION.balance, PARTITION.splitter, PARTITION.watch]) {
      const m = PARTITION_MACHINE[p];
      const own = new Set(desktop.parts.filter((q) => q.machine === m).map((q) => key32(q.position)));
      const [from, to] = range(d, p);
      for (let i = from; i < to; i++) {
        const key = `${d.target[i * 3]},${d.target[i * 3 + 1]},${d.target[i * 3 + 2]}`;
        if (!own.has(key)) throw new Error(`partition ${p} point ${i} targets ${key}, not machine ${m}`);
      }
    }
  });

  it('flags a hashed 2% ± 0.5% of the quoter partition as trickle and nothing else', () => {
    const [from, to] = range(d, PARTITION.quoter);
    let n = 0;
    for (let i = from; i < to; i++) n += d.trickle[i];
    expect(n).toBeGreaterThanOrEqual(32768 * 0.015);
    expect(n).toBeLessThanOrEqual(32768 * 0.025);
    for (let i = to; i < d.count; i++) if (d.trickle[i] !== 0) throw new Error(`point ${i} outside the quoter trickles`);
  });

  it('orders the quoter partition by birth on average: the first 10% of points have a lower mean birth than the last 10%', () => {
    const [from, to] = range(d, PARTITION.quoter);
    const tenth = Math.floor((to - from) / 10);
    const early = mean(d.targetBirth, from, from + tenth);
    const late = mean(d.targetBirth, to - tenth, to);
    expect(early).toBeLessThan(late);
    expect(late - early).toBeGreaterThan(0.3);   // frame and bed at one end; carriages and rotors at the other
  });

  it('hashes rows into 0..39 for the quoter and 0..7 elsewhere, using the whole range', () => {
    for (let p = 0; p < PARTITION_COUNT; p++) {
      const [from, to] = range(d, p);
      const seen = new Set<number>();
      for (let i = from; i < to; i++) {
        const r = d.row[i];
        if (r !== Math.floor(r) || r < 0 || r >= BAND_ROWS[p]) throw new Error(`partition ${p} point ${i} row ${r}`);
        seen.add(r);
      }
      expect(seen.size, `partition ${p}`).toBe(BAND_ROWS[p]);
    }
  });

  it('seeds every point in [0, 1)', () => {
    for (let i = 0; i < d.count; i++) if (d.seed[i] < 0 || d.seed[i] >= 1) throw new Error(`point ${i} seed ${d.seed[i]}`);
  });

  it('leaves the visitor partition\'s targets and births at zero for the Stage 5 upload', () => {
    const [from, to] = range(d, PARTITION.visitor);
    for (let i = from; i < to; i++) {
      if (d.target[i * 3] !== 0 || d.target[i * 3 + 1] !== 0 || d.target[i * 3 + 2] !== 0) throw new Error(`visitor point ${i} has a target`);
      if (d.targetBirth[i] !== 0) throw new Error(`visitor point ${i} has a birth`);
    }
  });

  it('is deterministic in its seed', () => {
    const again = buildInkGeometry(desktop, 'desktop', SEED);
    expect(again.target).toEqual(d.target);
    expect(again.seed).toEqual(d.seed);
    expect(again.row).toEqual(d.row);
    expect(again.trickle).toEqual(d.trickle);
    const other = buildInkGeometry(desktop, 'desktop', SEED + 1);
    expect(other.seed).not.toEqual(d.seed);
  }, 30_000);
});

describe('buildInkGeometry (phone)', () => {
  it('has 13,312 points with the same partition layout', () => {
    const d = buildInkGeometry(buildBench('phone'), 'phone', SEED);
    expect(d.count).toBe(13312);
    expect(d.offsets).toEqual([0, 7168, 8192, 9216, 10240, 11264, 12288]);
    expect(d.partition[7167]).toBe(0);
    expect(d.partition[7168]).toBe(1);
    expect(d.partition[13311]).toBe(6);
  });
});

describe('writeSpawnUV', () => {
  it('gives point i of the partition uv[(i · 7919) mod count]', () => {
    const uv = Float32Array.from([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]);   // three samples
    const out = new Float32Array(2 * 8).fill(-1);
    writeSpawnUV(out, 2, 5, uv, 3);
    for (let i = 0; i < 5; i++) {
      const j = (i * SPAWN_STRIDE) % 3;
      expect(out[(2 + i) * 2]).toBeCloseTo(uv[j * 2], 6);
      expect(out[(2 + i) * 2 + 1]).toBeCloseTo(uv[j * 2 + 1], 6);
    }
    expect(Array.from(out.subarray(0, 4))).toEqual([-1, -1, -1, -1]);   // before the partition
    expect(out[14]).toBe(-1);                                           // after it
  });

  it('leaves the partition alone when the source sampled nothing', () => {
    const out = new Float32Array(6).fill(0.5);
    writeSpawnUV(out, 0, 3, new Float32Array(0), 0);
    expect(Array.from(out)).toEqual([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
  });
});

describe('writeCentroids', () => {
  it('writes each partition\'s source machine centroid, by partition, into a vec3[8]', () => {
    const out = writeCentroids(desktop, new Float32Array(24));
    for (let p = 0; p < PARTITION_COUNT; p++) {
      const c = desktop.machines[PARTITION_MACHINE[p]].centroid;
      expect(Array.from(out.subarray(p * 3, p * 3 + 3)), `partition ${p}`).toEqual(Array.from(Float32Array.from(c)));
    }
    expect(Array.from(out.subarray(21, 24))).toEqual([0, 0, 0]);
    expect(out.subarray(0, 3)).not.toEqual(out.subarray(9, 12));   // quoter and balance sit apart
  });
});

describe('trickleSlot', () => {
  it('names the uRect slot the trickle spawns from in each section, and turns it off in 08', () => {
    const expected: Record<string, number> = {
      sentence: PARTITION.quoter, more: PARTITION.merge, first: FIRST_LINE_SLOT, kalshi: PARTITION.intake,
      heron: PARTITION.balance, darch: PARTITION.splitter, summers: PARTITION.watch, alive: -1, yours: PARTITION.visitor,
    };
    expect(FIRST_LINE_SLOT).toBe(7);
    for (const s of SECTIONS) expect(trickleSlot(SECTION_INDEX[s.id]), s.id).toBe(expected[s.id]);
    expect(trickleSlot(99)).toBe(-1);
  });
});
