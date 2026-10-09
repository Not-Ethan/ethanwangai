import { describe, it, expect } from 'vitest';
import { FrameWindow, splitDraws, drawBudget, verdict, formatOverlay, type PerfSnapshot } from './perfStats';

describe('FrameWindow', () => {
  it('mean, p95 and max over the frames pushed since reset', () => {
    const w = new FrameWindow(1000);
    for (let i = 0; i < 94; i++) w.push(10);
    for (let i = 0; i < 6; i++) w.push(40);
    expect(w.stats()).toEqual({ frames: 100, meanMs: 11.8, p95Ms: 40, maxMs: 40 });
    w.reset();
    for (let i = 0; i < 95; i++) w.push(10);
    for (let i = 0; i < 5; i++) w.push(40);
    expect(w.stats().p95Ms).toBe(10);
  });
  it('keeps only the last `capacity` frames, ignores junk, and is empty after reset', () => {
    const w = new FrameWindow(4);
    for (const ms of [100, 1, 2, 3, 4]) w.push(ms);
    w.push(NaN);
    w.push(-5);
    expect(w.stats()).toEqual({ frames: 4, meanMs: 2.5, p95Ms: 4, maxMs: 4 });
    w.reset();
    expect(w.stats()).toEqual({ frames: 0, meanMs: 0, p95Ms: 0, maxMs: 0 });
  });
});

describe('splitDraws (renderer.info counts the shadow pass too)', () => {
  it('subtracts one draw per caster per shadow-casting light when shadows are on', () => {
    expect(splitDraws(20, 4, 1, true)).toEqual({ main: 16, shadow: 4 });
    expect(splitDraws(14, 4, 1, false)).toEqual({ main: 14, shadow: 0 });
    expect(splitDraws(2, 4, 1, true)).toEqual({ main: 0, shadow: 4 });
  });
});

describe('budgets and the G7 verdict (spec §12, §14)', () => {
  const base: PerfSnapshot = {
    tier: 'desktop', rung: 0, dpr: 1.25, frames: 600, meanMs: 16.4, p95Ms: 17, maxMs: 20, fps: 61, renderMs: 2.1,
    calls: 20, mainDraws: 16, shadowDraws: 4, heapGrowthMB: 0.4,
  };
  it('draw budgets: 18 desktop, 14 phone at rest, 15 phone during a build', () => {
    expect(drawBudget('desktop', false)).toBe(18);
    expect(drawBudget('phone', false)).toBe(14);
    expect(drawBudget('phone', true)).toBe(15);
  });
  it('passes under 16.7 ms, ≤ 18 main draws, ≤ 6 shadow draws, ≤ 2 MB heap growth', () => {
    expect(verdict(base)).toEqual({ frame: true, draws: true, shadow: true, heap: true });
    expect(verdict({ ...base, meanMs: 16.7 }).frame).toBe(false);
    expect(verdict({ ...base, mainDraws: 19 }).draws).toBe(false);
    expect(verdict({ ...base, shadowDraws: 7 }).shadow).toBe(false);
    expect(verdict({ ...base, heapGrowthMB: 2.5 }).heap).toBe(false);
    expect(verdict({ ...base, heapGrowthMB: null }).heap).toBeNull();
    expect(verdict({ ...base, tier: 'phone', mainDraws: 15, shadowDraws: 0 }).draws).toBe(false);
    expect(verdict({ ...base, tier: 'phone', mainDraws: 14, shadowDraws: 1 }).shadow).toBe(false);
  });
  it('formats three lowercase lines', () => {
    const text = formatOverlay(base);
    expect(text.split('\n')).toHaveLength(3);
    expect(text).toBe(text.toLowerCase());
    expect(text).toContain('16 main');
    expect(text).toContain('rung 0');
  });
});
