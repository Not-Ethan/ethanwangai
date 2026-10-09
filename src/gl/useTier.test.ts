import { describe, it, expect, vi } from 'vitest';

// useTier.ts imports the scroll provider (Lenis, React context); the pure exports under test never call it.
vi.mock('@/scroll/ScrollProvider', () => ({
  useScroll: () => ({ tier: 'desktop', reducedMotion: false, state: { current: null }, scrollTo() {} }),
}));

import { facts } from '@/valley/facts';
import {
  TIER_SETTINGS, DPR_LADDER, DPR_FLOOR, PERF_MONITOR, ladder, maxRung, settingsAt, expectedMainDraws, tierOverride, rungOverride,
} from './useTier';

const N = facts.kalshi.trades;

describe('TIER_SETTINGS (spec §6, §11)', () => {
  it('keeps tier, dpr, shadows and antialias only: desktop 1.25 with shadows and antialias, phone 1 with neither', () => {
    expect(TIER_SETTINGS).toEqual({
      desktop: { dpr: 1.25, shadows: true, antialias: true },
      phone: { dpr: 1, shadows: false, antialias: false },
    });
  });
});

describe('the step-down ladder (spec §11)', () => {
  it('walks DPR 1.25 → 1 → 0.85, then halves the ridge, then rain off, then mist off, skipping rungs a tier has already taken', () => {
    expect(DPR_LADDER).toEqual([1.25, 1, 0.85]);
    expect(DPR_FLOOR).toBe(0.85);
    expect(ladder('desktop')).toEqual(['dpr', 'dpr', 'ridge', 'rain', 'mist']);
    expect(ladder('phone')).toEqual(['dpr', 'ridge']);
    expect(maxRung('desktop')).toBe(5);
    expect(maxRung('phone')).toBe(2);
  });

  it('desktop, rung by rung: [dpr, ridgeCount, rain, mist]', () => {
    const rows = [0, 1, 2, 3, 4, 5].map((r) => {
      const { settings, quality } = settingsAt('desktop', r);
      return [settings.dpr, quality.ridgeCount, quality.rain, quality.mist];
    });
    expect(rows).toEqual([
      [1.25, N, true, true],
      [1, N, true, true],
      [0.85, N, true, true],
      [0.85, Math.round(N / 2), true, true],
      [0.85, Math.round(N / 2), false, true],
      [0.85, Math.round(N / 2), false, false],
    ]);
  });

  it('phone, rung by rung: N/5 at ×1.8 size, 400 stars, no rain, no mist, then DPR 0.85, then N/10', () => {
    const rows = [0, 1, 2].map((r) => {
      const { settings, quality } = settingsAt('phone', r);
      return [settings.dpr, quality.ridgeCount, quality.rain, quality.mist];
    });
    expect(rows).toEqual([
      [1, Math.round(N / 5), false, false],
      [0.85, Math.round(N / 5), false, false],
      [0.85, Math.round(N / 10), false, false],
    ]);
    expect(settingsAt('phone', 0).quality).toMatchObject({ ridgeSizeScale: 1.8, stars: 400 });
    expect(settingsAt('desktop', 0).quality).toMatchObject({ ridgeSizeScale: 1, stars: 1200 });
  });

  it('never changes tier, shadows or antialias, never goes below DPR 0.85 or N/10, and clamps any rung', () => {
    for (const tier of ['desktop', 'phone'] as const) {
      for (let r = -3; r <= 20; r++) {
        const { settings, quality } = settingsAt(tier, r);
        expect(settings.tier).toBe(tier);
        expect(settings.shadows).toBe(TIER_SETTINGS[tier].shadows);
        expect(settings.antialias).toBe(TIER_SETTINGS[tier].antialias);
        expect(settings.dpr).toBeGreaterThanOrEqual(DPR_FLOOR);
        expect(quality.ridgeCount).toBeGreaterThanOrEqual(Math.round(N / 10));
      }
      expect(settingsAt(tier, 99)).toEqual(settingsAt(tier, maxRung(tier)));
      expect(settingsAt(tier, -1)).toEqual(settingsAt(tier, 0));
    }
  });
});

describe('PERF_MONITOR (spec §11: frame time over 20 ms for 60 frames)', () => {
  it('declines only when every window of a ≥ 1.2 s sample is under 50 fps, and never inclines', () => {
    const [lower, upper] = PERF_MONITOR.bounds();
    expect(1000 / lower).toBe(20);
    expect(upper).toBe(Infinity);
    expect(PERF_MONITOR.ms * PERF_MONITOR.iterations).toBeGreaterThanOrEqual(60 * 20);
    // drei declines when more than iterations·threshold windows are below `lower`: here that means all of them.
    expect(Math.floor(PERF_MONITOR.iterations * PERF_MONITOR.threshold)).toBe(PERF_MONITOR.iterations - 1);
  });
});

describe('expectedMainDraws (spec §6: 16 desktop, 14 phone, +1 scaffold during a build)', () => {
  it('counts mist and rain as the only optional draws, with a visitor house standing', () => {
    expect(expectedMainDraws(settingsAt('desktop', 0).quality, false, true)).toBe(16);
    expect(expectedMainDraws(settingsAt('desktop', 0).quality, true, true)).toBe(17);
    expect(expectedMainDraws(settingsAt('desktop', 5).quality, false, true)).toBe(14);
    expect(expectedMainDraws(settingsAt('phone', 0).quality, false, true)).toBe(14);
    expect(expectedMainDraws(settingsAt('phone', 0).quality, true, true)).toBe(15);
  });
  it('drops one draw while no visitor house exists (its mesh has an empty geometry, so three issues no draw)', () => {
    expect(expectedMainDraws(settingsAt('desktop', 0).quality, false, false)).toBe(15);
    expect(expectedMainDraws(settingsAt('phone', 0).quality, false, false)).toBe(13);
  });
});

describe('query overrides', () => {
  it('?tier= forces phone or desktop and ignores anything else', () => {
    expect(tierOverride('?debug=1&tier=phone')).toBe('phone');
    expect(tierOverride('?tier=desktop')).toBe('desktop');
    expect(tierOverride('?tier=tablet')).toBeNull();
    expect(tierOverride('')).toBeNull();
  });
  it('?rung= takes a non-negative integer and nothing else', () => {
    expect(rungOverride('?rung=3')).toBe(3);
    expect(rungOverride('?debug=1&rung=0')).toBe(0);
    expect(rungOverride('?rung=-1')).toBeNull();
    expect(rungOverride('?rung=2.5')).toBeNull();
    expect(rungOverride('?rung=x')).toBeNull();
    expect(rungOverride('?rung=')).toBeNull();
    expect(rungOverride('')).toBeNull();
  });
});
