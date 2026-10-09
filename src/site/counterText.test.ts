import { describe, it, expect } from 'vitest';
import { copy } from './copy';
import { counterValue, scrambleDigits } from './counterText';

describe('counterValue (spec §3.1 · 02)', () => {
  it('rounds reveal × trades to tens', () => {
    expect(counterValue(0.01, 30000)).toBe(300);
    expect(counterValue(0.5, 30000)).toBe(15000);
    expect(counterValue(0.123456, 30000)).toBe(3700);
    expect(counterValue(1, 30000)).toBe(30000);
  });
  it('is capped at the fact and never negative', () => {
    expect(counterValue(1.2, 30000)).toBe(30000);
    expect(counterValue(-0.5, 30000)).toBe(0);
  });
  it('prints through the copy string', () => {
    expect(copy.kalshi.counter(counterValue(1, 30000))).toBe('30,000 trades');
  });
});

describe('scrambleDigits (spec §9)', () => {
  it('returns the text unchanged at phase 1', () => {
    expect(scrambleDigits('30,000 trades', 1, 30000)).toBe('30,000 trades');
  });
  it('replaces only digits and keeps length, separators and words', () => {
    const s = scrambleDigits('30,000 trades', 0, 30000);
    expect(s).toHaveLength(13);
    expect(s[2]).toBe(',');
    expect(s.slice(6)).toBe(' trades');
    expect(s.slice(0, 6).replace(',', '')).toMatch(/^[0-9]{5}$/);
  });
  it('resolves digits left to right as phase rises', () => {
    expect(scrambleDigits('30,000 trades', 0.5, 30000).slice(0, 2)).toBe('30');
  });
  it('is deterministic for the same text, phase and seed', () => {
    expect(scrambleDigits('12,340 trades', 0.3, 12340)).toBe(scrambleDigits('12,340 trades', 0.3, 12340));
  });
  it('leaves text without digits alone', () => {
    expect(scrambleDigits('about', 0, 1)).toBe('about');
  });
});
