'use client';
// The GL layer's rendering tier (design §6 DPR/MSAA, §11 phone tier): the scroll layer's tier, which is
// detectTier() (pointer coarse, width < 820 or hardwareConcurrency ≤ 4) kept live by ScrollProvider and the one
// tier the DOM laid its sections out with, plus what the renderer makes of it: DPR, the shadow map and the MSAA
// sample count. drei's PerformanceMonitor calls onDecline, which lowers DPR by 0.25 steps to a floor of 1; the
// rest of the step-down ladder arrives in Stage 6. `?tier=phone` (or `desktop`) forces the GL tier for stills and
// Stage 5's phone checks; the DOM keeps the detected tier.
import { useCallback, useMemo, useState } from 'react';
import type { Tier } from '@/bench/types';
import { useScroll } from '@/scroll/ScrollProvider';

export interface TierSettings { tier: Tier; dpr: number; shadows: boolean; msaa: number }

export const TIER_SETTINGS: Record<Tier, Omit<TierSettings, 'tier'>> = {
  desktop: { dpr: 1.25, shadows: true, msaa: 4 },
  phone: { dpr: 1, shadows: false, msaa: 2 },
};
export const DPR_STEP = 0.25;
export const DPR_FLOOR = 1;

/** DPR after `declines` steps down from the tier's default: 0.25 per step, never below 1. */
export function dprAfterDeclines(tier: Tier, declines: number): number {
  return Math.max(DPR_FLOOR, TIER_SETTINGS[tier].dpr - DPR_STEP * declines);
}

/** The tier a `?tier=` query forces, or null when absent or not a tier name. */
export function tierOverride(search: string): Tier | null {
  const t = new URLSearchParams(search).get('tier');
  return t === 'phone' || t === 'desktop' ? t : null;
}

export function useTier(): TierSettings & { onDecline: () => void } {
  const scroll = useScroll();
  const forced = useMemo(() => (typeof window === 'undefined' ? null : tierOverride(window.location.search)), []);
  const tier = forced ?? scroll.tier;
  const [declines, setDeclines] = useState(0);
  // Stops counting at the floor, so a decline there is a no-op render-wise (same state, React bails out).
  const onDecline = useCallback(() => setDeclines((n) => (dprAfterDeclines(tier, n) > DPR_FLOOR ? n + 1 : n)), [tier]);
  const base = TIER_SETTINGS[tier];
  return { tier, dpr: dprAfterDeclines(tier, declines), shadows: base.shadows, msaa: base.msaa, onDecline };
}
