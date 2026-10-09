import { describe, it, expect } from 'vitest';
import { CHAIN_END } from '@/valley/ignition';
import { timelineAt } from '@/valley/timeline';
import { stepFor } from './chain';
import { RIDGE_FLOOR, latchReveals, trickleReveal } from './reveal';
import { fixtureRanges, gAt } from './frameFixture';

const ranges = fixtureRanges();
const trickle = stepFor('ridge');
const at = (id: Parameters<typeof gAt>[1], s: number) => timelineAt(gAt(ranges, id, s), ranges);

describe('trickleReveal (spec §4.6)', () => {
  it('runs 0 to 0.01 over the trickle step, and is 0.01 when the chain is not playing', () => {
    expect(trickleReveal(null)).toBe(RIDGE_FLOOR);
    expect(trickleReveal(0)).toBe(0);
    expect(trickleReveal(trickle.at - 0.01)).toBe(0);
    expect(trickleReveal(trickle.at + trickle.dur / 2)).toBeCloseTo(RIDGE_FLOOR / 2, 9);
    expect(trickleReveal(trickle.at + trickle.dur)).toBeCloseTo(RIDGE_FLOOR, 9);
    expect(trickleReveal(CHAIN_END + 1)).toBe(RIDGE_FLOOR);
  });
});

describe('latchReveals (spec §2, §4.6, §5.1)', () => {
  it('ignores the timeline floor while the chain plays, so the ridge starts at 0', () => {
    const latched = { ridge: 0, hedge: 0 };
    latchReveals(timelineAt(0, ranges), 1.0, false, latched);
    expect(latched.ridge).toBe(0);
  });

  it('holds the floor when the chain is not playing', () => {
    const latched = { ridge: 0, hedge: 0 };
    latchReveals(timelineAt(0, ranges), null, false, latched);
    expect(latched.ridge).toBe(RIDGE_FLOOR);
  });

  it('follows the timeline across 02 and never goes back', () => {
    const latched = { ridge: 0, hedge: 0 };
    const midRidge = at('kalshi', 0.5).ridgeReveal;
    latchReveals(at('kalshi', 0.5), null, false, latched);
    expect(latched.ridge).toBeCloseTo(midRidge, 9);
    latchReveals(timelineAt(0, ranges), null, false, latched);
    expect(latched.ridge).toBeCloseTo(midRidge, 9);
  });

  it('draws the hedge with 03 and never un-draws it', () => {
    const latched = { ridge: 0, hedge: 0 };
    latchReveals(at('kalshi', 0.9), null, false, latched);
    expect(latched.hedge).toBe(0);
    const midHedge = at('heron', 0.5).hedgeReveal;
    latchReveals(at('heron', 0.5), null, false, latched);
    expect(latched.hedge).toBeCloseTo(midHedge, 9);
    latchReveals(timelineAt(0, ranges), null, false, latched);
    expect(latched.hedge).toBeCloseTo(midHedge, 9);
  });

  it('cuts under reduced motion: whole on arrival', () => {
    const latched = { ridge: 0, hedge: 0 };
    latchReveals(timelineAt(0, ranges), null, true, latched);
    expect(latched.ridge).toBe(RIDGE_FLOOR);
    expect(latched.hedge).toBe(0);
    latchReveals(at('kalshi', 0.05), null, true, latched);
    expect(latched.ridge).toBe(1);
    expect(latched.hedge).toBe(0);
    latchReveals(at('heron', 0.05), null, true, latched);
    expect(latched.hedge).toBe(1);
  });
});
