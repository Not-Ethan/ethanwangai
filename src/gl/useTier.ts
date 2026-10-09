'use client';
// The GL layer's rendering tier and the step-down ladder (spec §6, §11). The tier is the scroll layer's detectTier()
// (pointer coarse, width < 820 or hardwareConcurrency ≤ 4), or `?tier=` for stills. TierSettings keeps tier, dpr,
// shadows and antialias. drei's PerformanceMonitor (configured by PERF_MONITOR) calls onDecline, which takes the next
// rung of the ladder: DPR 1.25 → 1 → 0.85, then the ridge halves, then rain off, then mist off. A rung a tier has
// already taken (phone has no rain or mist) is skipped. The monitor never changes the tier. `?rung=n` starts n rungs
// down, so a reviewer can see each rung and G7 can bake one in.
import { useCallback, useMemo, useState } from 'react';
import type { Tier } from '@/valley/types';
import { facts } from '@/valley/facts';
import { useScroll } from '@/scroll/ScrollProvider';

export interface TierSettings { tier: Tier; dpr: number; shadows: boolean; antialias: boolean }

/** What the scene mounts and how dense it draws, per tier and rung. */
export interface SceneQuality { ridgeCount: number; ridgeSizeScale: number; stars: number; rain: boolean; mist: boolean }

export type Rung = 'dpr' | 'ridge' | 'rain' | 'mist';

export const TIER_SETTINGS: Record<Tier, Omit<TierSettings, 'tier'>> = {
  desktop: { dpr: 1.25, shadows: true, antialias: true },
  phone: { dpr: 1, shadows: false, antialias: false },
};

export const DPR_LADDER = [1.25, 1, 0.85] as const;
export const DPR_FLOOR = 0.85;

const BASE_QUALITY: Record<Tier, SceneQuality> = {
  desktop: { ridgeCount: facts.kalshi.trades, ridgeSizeScale: 1, stars: 1200, rain: true, mist: true },
  phone: { ridgeCount: Math.round(facts.kalshi.trades / 5), ridgeSizeScale: 1.8, stars: 400, rain: false, mist: false },
};

/** drei PerformanceMonitor props: decline when all five 250 ms windows average under 50 fps (20 ms); never incline. */
export const PERF_MONITOR = {
  ms: 250,
  iterations: 5,
  threshold: 0.8,
  bounds: (): [number, number] => [50, Infinity],
} as const;

/** The rungs a tier can still take, in order. */
export function ladder(tier: Tier): Rung[] {
  const base = BASE_QUALITY[tier];
  const steps: Rung[] = DPR_LADDER.filter((d) => d < TIER_SETTINGS[tier].dpr).map((): Rung => 'dpr');
  steps.push('ridge');
  if (base.rain) steps.push('rain');
  if (base.mist) steps.push('mist');
  return steps;
}

export function maxRung(tier: Tier): number {
  return ladder(tier).length;
}

/** The tier's settings and scene quality after `rung` rungs (clamped to 0..maxRung). */
export function settingsAt(tier: Tier, rung: number): { settings: TierSettings; quality: SceneQuality } {
  const steps = ladder(tier);
  const r = Number.isFinite(rung) ? Math.max(0, Math.min(steps.length, Math.floor(rung))) : 0;
  const taken = steps.slice(0, r);
  const base = BASE_QUALITY[tier];
  const start = (DPR_LADDER as readonly number[]).indexOf(TIER_SETTINGS[tier].dpr);
  const dprSteps = taken.filter((s) => s === 'dpr').length;
  return {
    settings: { tier, ...TIER_SETTINGS[tier], dpr: DPR_LADDER[Math.min(DPR_LADDER.length - 1, start + dprSteps)] },
    quality: {
      ...base,
      ridgeCount: taken.includes('ridge') ? Math.round(base.ridgeCount / 2) : base.ridgeCount,
      rain: base.rain && !taken.includes('rain'),
      mist: base.mist && !taken.includes('mist'),
    },
  };
}

/**
 * Main-pass draws at rest (spec §6): sky, stars, moon, terrain, river, buildings, windows, glow, wheel, ridge points,
 * crest line, hedge lines, hillside, visitor = 14, plus mist and rain when mounted, plus the scaffold during a build.
 * The visitor's mesh holds an empty BufferGeometry until a sentence exists, and three issues no draw for it, so the
 * count is one lower with no visitor house.
 */
export function expectedMainDraws(quality: SceneQuality, building: boolean, hasVisitor: boolean): number {
  return 13 + (hasVisitor ? 1 : 0) + (quality.mist ? 1 : 0) + (quality.rain ? 1 : 0) + (building ? 1 : 0);
}

/** The tier a `?tier=` query forces, or null when absent or not a tier name. */
export function tierOverride(search: string): Tier | null {
  const t = new URLSearchParams(search).get('tier');
  return t === 'phone' || t === 'desktop' ? t : null;
}

/** The starting rung a `?rung=` query forces: a non-negative integer, or null. */
export function rungOverride(search: string): number | null {
  const raw = new URLSearchParams(search).get('rung');
  if (raw === null || !/^\d+$/.test(raw)) return null;
  return Number(raw);
}

export function useTier(): TierSettings & SceneQuality & { rung: number; onDecline: () => void } {
  const scroll = useScroll();
  const forced = useMemo(() => (typeof window === 'undefined' ? null : tierOverride(window.location.search)), []);
  const tier = forced ?? scroll.tier;
  const [declines, setDeclines] = useState(() => (typeof window === 'undefined' ? 0 : rungOverride(window.location.search) ?? 0));
  const rung = Math.min(declines, maxRung(tier));
  // At the last rung a decline returns the same number, so React bails out and nothing re-renders.
  const onDecline = useCallback(() => setDeclines((n) => Math.min(n + 1, maxRung(tier))), [tier]);
  const { settings, quality } = settingsAt(tier, rung);
  return { ...settings, ...quality, rung, onDecline };
}
