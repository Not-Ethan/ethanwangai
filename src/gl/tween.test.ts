import { describe, it, expect } from 'vitest';
import { TIMING } from '@/bench/timing';
import { createTween } from './tween';

describe('createTween', () => {
  it('reads 0, not done and not active before it is started', () => {
    const t = createTween(TIMING.heroCompileS);
    expect(t.value(0)).toBe(0);
    expect(t.value(1e9)).toBe(0);
    expect(t.done(1e9)).toBe(false);
    expect(t.active).toBe(false);
  });

  it('runs 0 → 1 linearly over its duration from the start time it is given: halfway at 11.1 for a 2.2 s tween started at 10', () => {
    const t = createTween(2.2);
    t.start(10);
    expect(t.active).toBe(true);
    expect(t.value(10)).toBe(0);
    expect(t.value(11.1)).toBeCloseTo(0.5, 12);
    expect(t.value(10.55)).toBeCloseTo(0.25, 12);
    expect(t.value(9)).toBe(0);          // before its own start: clamped, never negative
    expect(t.done(12.1)).toBe(false);
    expect(t.active).toBe(true);
    expect(t.done(12.2)).toBe(true);
    expect(t.active).toBe(false);        // the end has been observed
    expect(t.value(12.2)).toBe(1);
    expect(t.value(30)).toBe(1);         // holds its end value
  });

  it('start(now, 1, 0) is the teardown direction: 1 → 0 over the same duration', () => {
    const t = createTween(2.2);
    t.start(20, 1, 0);
    expect(t.active).toBe(true);
    expect(t.value(20)).toBe(1);
    expect(t.value(21.1)).toBeCloseTo(0.5, 12);
    expect(t.value(22.2)).toBe(0);
    expect(t.done(22.2)).toBe(true);
    expect(t.active).toBe(false);
  });

  it('restarts from wherever it is asked to, so a rebuild mid-compile goes back to 0 and runs the full duration again', () => {
    const t = createTween(2.2);
    t.start(0);
    expect(t.value(1.1)).toBeCloseTo(0.5, 12);
    t.start(1.1, 0, 1);
    expect(t.value(1.1)).toBe(0);
    expect(t.value(2.2)).toBeCloseTo(0.5, 12);
    expect(t.done(3.3)).toBe(true);
    expect(t.active).toBe(false);
    t.start(5);
    expect(t.active).toBe(true);
    expect(t.value(5)).toBe(0);
  });

  it('takes its own duration: the 0.6 s teardown reaches halfway at 0.3 s', () => {
    const t = createTween(TIMING.visitorTeardownS);
    t.start(0, 1, 0);
    expect(t.value(0.3)).toBeCloseTo(0.5, 12);
    expect(t.done(0.6)).toBe(true);
  });
});
