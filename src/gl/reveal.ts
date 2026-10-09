// The latched reveals (spec §2, §4.6, §5.1, §11). The ridge reveal is max(trickle, timeline, previous); the hedge
// reveal is max(timeline, previous). Neither ever goes back. Allocation-free.
import { CHAIN_END } from '@/valley/ignition';
import { SECTIONS } from '@/valley/sections';
import type { SectionId, Timeline } from '@/valley/types';
import { stepFor } from './chain';

export const RIDGE_FLOOR = 0.01;

const ORDER: readonly SectionId[] = SECTIONS.map((s) => s.id);
const KALSHI = ORDER.indexOf('kalshi');
const HERON = ORDER.indexOf('heron');
const TRICKLE = stepFor('ridge');

export function trickleReveal(introT: number | null): number {
  if (introT === null) return RIDGE_FLOOR;
  const f = (introT - TRICKLE.at) / TRICKLE.dur;
  return RIDGE_FLOOR * Math.min(1, Math.max(0, f));
}

export function latchReveals(
  tl: Pick<Timeline, 'section' | 'ridgeReveal' | 'hedgeReveal'>,
  introT: number | null,
  reducedMotion: boolean,
  latched: { ridge: number; hedge: number },
): void {
  let ridge = tl.ridgeReveal;
  let hedge = tl.hedgeReveal;
  if (reducedMotion) {
    const i = ORDER.indexOf(tl.section);
    ridge = i >= KALSHI ? 1 : RIDGE_FLOOR;
    hedge = i >= HERON ? 1 : 0;
  }
  const chainPlaying = introT !== null && introT < CHAIN_END;
  if (chainPlaying && ridge <= RIDGE_FLOOR) ridge = 0;
  // The very first chain frame (introT 0) is before the trickle: nothing may latch, whatever the timeline says.
  if (introT === 0) ridge = 0;
  latched.ridge = Math.max(latched.ridge, trickleReveal(introT), ridge);
  latched.hedge = Math.max(latched.hedge, hedge);
}
