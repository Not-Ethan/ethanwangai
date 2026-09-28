// The DOM chrome's part counts (design §3.1, task 3.6): the hero ladder's `parts` and the footer's total. A part
// counts once its whole lock window has closed, lockEnd(birth) ≤ compile, so the ladder reaches the quoter's full
// count on the frame the lever locks. This is the chrome's own threshold, not the fragment shader's pencil → ink
// crossover (gl/Clocks.tsx's inkedCount at INK_T). Pure: no React, no DOM, no three, so the test runs in node.
import { MACHINE, MACHINE_COUNT, type LayoutResult, type MachineId } from '@/bench/types';
import { lockEnd } from '@/bench/timing';

export type LockEnds = Record<MachineId, Float32Array>;

/** How many of `sortedLockEnds` (ascending) are at or before `compile`: a binary search. */
export function inkedCount(sortedLockEnds: Float32Array, compile: number): number {
  let lo = 0, hi = sortedLockEnds.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sortedLockEnds[mid] <= compile) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Every machine's `lockEnd(part.birth)`, ascending, from the LayoutResult Scene builds for the same tier. Built once per tier. */
export function benchLockEnds(result: LayoutResult): LockEnds {
  const lists: number[][] = Array.from({ length: MACHINE_COUNT }, () => []);
  for (const p of result.parts) lists[p.machine].push(lockEnd(p.birth));
  const out = {} as LockEnds;
  for (let m = 0; m < MACHINE_COUNT; m++) out[m as MachineId] = Float32Array.from(lists[m]).sort();
  return out;
}

/**
 * The ladder's `parts`: the machine the headline builds, the quoter, and the intake 04 adds to it (bench/counts.ts's
 * quoterAtHero, then quoterWithIntake). `compile` is every machine's uCompile, indexed by MachineId.
 */
export function ladderParts(lockEnds: LockEnds, compile: ArrayLike<number>): number {
  return inkedCount(lockEnds[MACHINE.quoter], compile[MACHINE.quoter]) + inkedCount(lockEnds[MACHINE.intake], compile[MACHINE.intake]);
}

/**
 * The footer's total: every inked part on the bench, which reaches the layout's inkedAtEnd once the page is
 * scrolled. Never the slot, which stays a pencil outline, and never the visitor, whose parts are not in this layout.
 */
export function inkedTotal(lockEnds: LockEnds, compile: ArrayLike<number>): number {
  let n = 0;
  for (let m = 0; m < MACHINE_COUNT; m++) {
    if (m === MACHINE.slot || m === MACHINE.visitor) continue;
    n += inkedCount(lockEnds[m as MachineId], compile[m]);
  }
  return n;
}
