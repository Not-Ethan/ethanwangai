import { describe, it, expect } from 'vitest';
import { buildBench, benchCounts } from '@/bench/counts';
import { MACHINE, MACHINE_COUNT, type Tier } from '@/bench/types';
import { lockEnd } from '@/bench/timing';
import { benchLockEnds, inkedCount, inkedTotal, ladderParts } from './inkedCount';

// The DOM chrome's part counts (task 3.6): a part counts once its lock window has closed, lockEnd(birth) ≤ compile,
// by one binary search over each machine's sorted lock ends. At every compile 1 they land on Stage 1's counts.
describe('inkedCount', () => {
  const ends = Float32Array.from([0.4, 0.5, 0.9, 1.0]);

  it('counts the sorted lock ends at or before compile', () => {
    expect(inkedCount(ends, 0.45)).toBe(1);
    expect(inkedCount(ends, 0.9)).toBe(3);
    expect(inkedCount(ends, 1)).toBe(4);
    expect(inkedCount(ends, 0)).toBe(0);
  });
});

describe.each<Tier>(['desktop', 'phone'])('the %s bench', (tier) => {
  const result = buildBench(tier);
  const counts = benchCounts(result);
  const ends = benchLockEnds(result);
  const allAt = (c: number) => new Float32Array(MACHINE_COUNT).fill(c);

  it('holds each machine\'s lockEnd(birth), one per part, ascending', () => {
    for (let m = 0; m < MACHINE_COUNT; m++) {
      const own = result.parts.filter((p) => p.machine === m).map((p) => Math.fround(lockEnd(p.birth))).sort((a, b) => a - b);
      expect(Array.from(ends[m as keyof typeof ends]), `machine ${m}`).toEqual(own);
    }
  });

  it('the ladder counts the quoter alone at the hero and adds the intake once 04 builds it', () => {
    const hero = allAt(0);
    hero[MACHINE.quoter] = 1;
    hero[MACHINE.bot] = 1;
    hero[MACHINE.slot] = 1;
    expect(ladderParts(ends, hero)).toBe(counts.quoterAtHero);
    expect(ladderParts(ends, allAt(1))).toBe(counts.quoterWithIntake);
    expect(ladderParts(ends, allAt(0))).toBe(0);
  });

  it('ticks up as the quoter compiles, and the lever is the last part it counts', () => {
    const c = allAt(0);
    let last = 0;
    for (let k = 0; k <= 100; k++) {
      c[MACHINE.quoter] = k / 100;
      const n = ladderParts(ends, c);
      expect(n).toBeGreaterThanOrEqual(last);
      last = n;
    }
    c[MACHINE.quoter] = Math.fround(lockEnd(1)) - 1e-4;
    expect(ladderParts(ends, c)).toBe(counts.quoterAtHero - 1);
  });

  it('the footer total is every inked part: the bench\'s inkedAtEnd once scrolled, never the slot', () => {
    expect(inkedTotal(ends, allAt(1))).toBe(counts.inkedAtEnd);
    expect(inkedTotal(ends, allAt(0))).toBe(0);
  });
});
