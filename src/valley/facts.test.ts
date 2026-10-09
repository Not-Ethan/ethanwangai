import { describe, it, expect } from 'vitest';
import { facts, AS_OF } from './facts';

/** Every key path in an object, e.g. 'kalshi.trades'. */
function keys(o: object, prefix = ''): string[] {
  return Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v as object, `${prefix}${k}.`) : [`${prefix}${k}`]);
}
function numbers(o: object): number[] {
  return Object.values(o).flatMap((v) => (typeof v === 'number' ? [v] : v && typeof v === 'object' ? numbers(v as object) : []));
}

describe('facts (spec §2)', () => {
  it('carries the public numbers', () => {
    expect(facts.kalshi.trades).toBe(30_000);
    expect(facts.kalshi.leaderboardTop).toBe(100);
    expect(facts.kalshi.since).toBe('jan 2026');
    expect(facts.heron.cities).toBe(4);
    expect(facts.heron.since).toBe('june 2026');
    expect(facts.darch.videosPerMonth).toBe(3_000);
    expect(facts.darch.viewsPerMonth).toBe(20_000_000);
    expect(facts.darch.from).toBe('june 2025');
    expect(facts.darch.to).toBe('may 2026');
    expect(facts.wvu.claimsPerYearUsd).toBe(100_000_000);
  });
  it('labels every project as of oct 2026', () => {
    expect(AS_OF).toBe('oct 2026');
    for (const [name, entry] of Object.entries(facts)) expect(entry.asOf, name).toBe('oct 2026');
  });
  it('never holds a private number: no profit, no exact rank, no notional, no contract volume', () => {
    for (const k of keys(facts)) expect(k).not.toMatch(/profit|pnl|rank|notional|contract|volume|dollar/i);
    const ns = numbers(facts);
    expect(ns).not.toContain(75);
    expect(ns).not.toContain(20_000);
  });
});
