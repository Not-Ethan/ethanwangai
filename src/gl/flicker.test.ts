import { describe, it, expect } from 'vitest';
import {
  EMAIL_SELECTOR, FLICKER_DIP, FLICKER_S, createFlickerClock, flickerLevel, isEmailTarget, stepFlicker,
} from './flicker';

describe('flickerLevel (spec §4.2)', () => {
  it('dips to 0.6 at the middle of 0.4 s and is 1 outside it', () => {
    expect(flickerLevel(null)).toBe(1);
    expect(flickerLevel(0)).toBe(1);
    expect(flickerLevel(FLICKER_S / 2)).toBeCloseTo(FLICKER_DIP, 9);
    expect(flickerLevel(FLICKER_S)).toBe(1);
    expect(flickerLevel(-0.1)).toBe(1);
  });
});

describe('stepFlicker', () => {
  it('starts on a pending hover, runs 0.4 s, ignores hovers mid-flicker', () => {
    const c = createFlickerClock();
    expect(stepFlicker(c, 1)).toBeNull();
    c.pending = true;
    expect(stepFlicker(c, 1)).toBe(0);
    expect(stepFlicker(c, 1.2)).toBeCloseTo(0.2, 9);
    c.pending = true;
    expect(stepFlicker(c, 1.3)).toBeCloseTo(0.3, 9);
    expect(stepFlicker(c, 1.5)).toBeNull();
    c.pending = true;
    expect(stepFlicker(c, 2)).toBe(0);
  });
});

describe('isEmailTarget (spec §3.1 · 08)', () => {
  const el = (match: boolean) => ({ closest: (sel: string) => (match && sel === EMAIL_SELECTOR ? {} : null) });
  it('matches the email link and its children only', () => {
    expect(isEmailTarget(el(true) as unknown as EventTarget)).toBe(true);
    expect(isEmailTarget(el(false) as unknown as EventTarget)).toBe(false);
    expect(isEmailTarget({} as EventTarget)).toBe(false);
    expect(isEmailTarget(null)).toBe(false);
  });
});
