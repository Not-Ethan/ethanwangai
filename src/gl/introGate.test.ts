import { describe, it, expect } from 'vitest';
import { CHAIN_END } from '@/valley/ignition';
import {
  INTRO_KEY, INTRO_TAIL, introClock, markIntroPlayed, readIntroPlayed, shouldPlayIntro, stillParams,
  type StorageLike,
} from './introGate';

function memory(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}
const throwingGetter = (): StorageLike | null => {
  throw new Error('SecurityError');
};
const throwingStore: StorageLike = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

describe('introPlayed (spec §7, §11)', () => {
  it('is false until marked, then true', () => {
    const s = memory();
    expect(readIntroPlayed(() => s)).toBe(false);
    markIntroPlayed(() => s);
    expect(s.data.get(INTRO_KEY)).toBe('1');
    expect(readIntroPlayed(() => s)).toBe(true);
  });
  it('treats blocked storage as not played and never throws (Review Focus 4)', () => {
    expect(readIntroPlayed(throwingGetter)).toBe(false);
    expect(() => markIntroPlayed(throwingGetter)).not.toThrow();
    expect(readIntroPlayed(() => throwingStore)).toBe(false);
    expect(() => markIntroPlayed(() => throwingStore)).not.toThrow();
    expect(readIntroPlayed(() => null)).toBe(false);
  });
});

describe('stillParams (spec §10, §14)', () => {
  it('reads g and t only with still=1', () => {
    expect(stillParams('?still=1&t=2.6')).toEqual({ still: true, g: null, t: 2.6 });
    expect(stillParams('?still=1&g=0.42')).toEqual({ still: true, g: 0.42, t: null });
    expect(stillParams('?t=2.6&g=0.5')).toEqual({ still: false, g: null, t: null });
  });
  it('rejects junk, clamps t to >= 0 and g to 0..1', () => {
    expect(stillParams('?still=1&t=abc&g=')).toEqual({ still: true, g: null, t: null });
    expect(stillParams('?still=1&t=-3&g=1.7')).toEqual({ still: true, g: 1, t: 0 });
  });
});

describe('shouldPlayIntro (spec §5.3, §7, §11)', () => {
  const live = { still: false, g: null, t: null };
  it('plays on a fresh tab', () => {
    expect(shouldPlayIntro({ reducedMotion: false, introPlayed: false, still: live })).toBe(true);
  });
  it('does not play once played or under reduced motion', () => {
    expect(shouldPlayIntro({ reducedMotion: false, introPlayed: true, still: live })).toBe(false);
    expect(shouldPlayIntro({ reducedMotion: true, introPlayed: false, still: live })).toBe(false);
  });
  it('in still mode plays only when t pins it', () => {
    expect(shouldPlayIntro({ reducedMotion: false, introPlayed: true, still: { still: true, g: 0, t: 1.9 } })).toBe(true);
    expect(shouldPlayIntro({ reducedMotion: false, introPlayed: true, still: { still: true, g: 0, t: null } })).toBe(false);
  });
});

describe('introClock', () => {
  it('is null when the chain does not play', () => {
    expect(introClock(false, null, 5, null)).toBeNull();
  });
  it('holds at 0 until T0, then counts seconds since T0', () => {
    expect(introClock(true, null, 5, null)).toBe(0);
    expect(introClock(true, 2, 3.5, null)).toBeCloseTo(1.5, 9);
  });
  it('ends after the chain and its labels', () => {
    expect(introClock(true, 2, 2 + CHAIN_END + INTRO_TAIL - 0.01, null)).not.toBeNull();
    expect(introClock(true, 2, 2 + CHAIN_END + INTRO_TAIL + 0.01, null)).toBeNull();
  });
  it('returns the pinned still time whatever else is set', () => {
    expect(introClock(false, null, 99, 2.6)).toBe(2.6);
    expect(introClock(true, 1, 99, 3.7)).toBe(3.7);
  });
});
