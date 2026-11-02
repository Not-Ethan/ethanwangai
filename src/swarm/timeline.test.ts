import { describe, expect, it } from 'vitest';
import { DRAG_SPEED, LINGER, LINGER_FADE, PAD, PRESS, RELEASE, TRAVEL_SPEED, clipFor, jobTimeline, restPoint, sampleJob, type JobSample } from './timeline';

const blank = (): JobSample => ({ phase: 'travel', cx: 0, cy: 0, f: 0, scale: 1, boxAlpha: 0, fillAlpha: 0 });
const rect = { x: 300, y: 200, w: 400, h: 120 };

describe('jobTimeline', () => {
  it('clamps travel to 700 for far jobs and 180 for near ones', () => {
    expect(jobTimeline({ x: 0, y: 0 }, { x: 5000, y: 5000, w: 50, h: 50 }).travel).toBe(700);
    expect(jobTimeline({ x: 100, y: 100 }, { x: 110, y: 110, w: 50, h: 50 }).travel).toBe(180);
  });
  it('clamps drag to 280 for tiny rects and 950 for huge ones', () => {
    expect(jobTimeline({ x: 0, y: 0 }, { x: 0, y: 0, w: 10, h: 10 }).drag).toBe(280);
    expect(jobTimeline({ x: 0, y: 0 }, { x: 0, y: 0, w: 2000, h: 1000 }).drag).toBe(950);
  });
  it('phase end times accumulate', () => {
    const tl = jobTimeline({ x: 0, y: 0 }, rect);
    expect(tl.tPress).toBe(tl.tTravel + 70);
    expect(tl.tDrag).toBe(tl.tPress + tl.drag);
    expect(tl.tRelease).toBe(tl.tDrag + 120);
    expect(tl.tEnd).toBe(tl.tRelease + 600);
  });
});

describe('sampleJob', () => {
  const tl = jobTimeline({ x: -40, y: 50 }, rect);

  it('reaches the top-left at the end of travel', () => {
    const s = sampleJob(tl, tl.tTravel, blank());
    expect(s.cx).toBe(rect.x - PAD);
    expect(s.cy).toBe(rect.y - PAD);
  });
  it('reaches the bottom-right at the end of drag', () => {
    const s = sampleJob(tl, tl.tDrag, blank());
    expect(s.cx).toBe(rect.x + rect.w + PAD);
    expect(s.cy).toBe(rect.y + rect.h + PAD);
  });
  it('f is 0 at press end, 1 at drag end, monotone between', () => {
    expect(sampleJob(tl, tl.tPress, blank()).f).toBe(0);
    expect(sampleJob(tl, tl.tDrag, blank()).f).toBe(1);
    let prev = 0;
    for (let i = 0; i < 100; i++) {
      const t = tl.tPress + ((tl.tDrag - tl.tPress) * i) / 100;
      const f = sampleJob(tl, t, blank()).f;
      expect(f).toBeGreaterThanOrEqual(prev);
      prev = f;
    }
  });
  it('presses at scale 0.92', () => {
    expect(sampleJob(tl, tl.tTravel + 10, blank()).scale).toBe(0.92);
  });
  it('fill is gone at release end', () => {
    expect(sampleJob(tl, tl.tRelease, blank()).fillAlpha).toBe(0);
  });
  it('box fades over the last 250 ms of linger', () => {
    expect(sampleJob(tl, tl.tEnd - 250, blank()).boxAlpha).toBe(1);
    expect(sampleJob(tl, tl.tEnd, blank()).boxAlpha).toBe(0);
  });
  it('reuses the out object', () => {
    const out = blank();
    expect(sampleJob(tl, 10, out)).toBe(out);
  });
});

describe('clipFor and restPoint', () => {
  it('clip at 0 hides everything, at 1 is empty', () => {
    expect(clipFor(0)).toBe('inset(0 100.00% 100.00% 0)');
    expect(clipFor(1)).toBe('');
  });
  it('rest point is the drag end plus (6, 8)', () => {
    const tl = jobTimeline({ x: 0, y: 0 }, rect);
    const end = sampleJob(tl, tl.tDrag, blank());
    const p = restPoint(tl);
    expect(p.x).toBe(end.cx + 6);
    expect(p.y).toBe(end.cy + 8);
  });
});

describe('pinned numbers', () => {
  const tl = jobTimeline({ x: -40, y: 50 }, rect);
  const at = (t: number) => sampleJob(tl, t, blank());

  it('pins the constants', () => {
    expect(PAD).toBe(4);
    expect(TRAVEL_SPEED).toBe(1.8);
    expect(DRAG_SPEED).toBe(1.4);
    expect(PRESS).toBe(70);
    expect(RELEASE).toBe(120);
    expect(LINGER).toBe(600);
    expect(LINGER_FADE).toBe(250);
  });
  it('pins travel and drag durations', () => {
    expect(jobTimeline({ x: 0, y: 0 }, { x: 904, y: 4, w: 10, h: 10 }).travel).toBe(500);
    expect(jobTimeline({ x: 0, y: 0 }, { x: 0, y: 0, w: 336, h: 448 }).drag).toBeCloseTo(400, 6);
  });
  it('pins cursor positions through the phases', () => {
    const p = (t: number) => { const s = at(t); return [s.cx, s.cy]; };
    expect(p(tl.tTravel)).toEqual([296, 196]);
    expect(p(tl.tDrag)).toEqual([704, 324]);
    expect(p(tl.tRelease)).toEqual([710, 332]);
    const mid = p(tl.tDrag + 60);
    expect(mid[0]).toBeCloseTo(707, 6);
    expect(mid[1]).toBeCloseTo(328, 6);
  });
  it('names the phase at each boundary', () => {
    const ts = [0, tl.tTravel, tl.tPress, tl.tDrag, tl.tRelease, tl.tEnd];
    expect(ts.map((t) => at(t).phase)).toEqual(['travel', 'press', 'drag', 'release', 'linger', 'done']);
  });
  it('eases travel out (cubic), not linearly', () => {
    const s = at(tl.travel / 2);
    expect(s.cx).toBeCloseTo(254, 6);
    expect(s.cy).toBeCloseTo(177.75, 6);
  });
  it('smoothsteps the drag', () => {
    expect(at(tl.tPress + tl.drag / 4).f).toBeCloseTo(0.15625, 6);
  });
  it('pins scale, f and alphas', () => {
    const a = at(tl.tTravel + 10);
    expect([a.scale, a.f, a.boxAlpha]).toEqual([0.92, 0, 1]);
    expect(at(tl.tPress + 1).scale).toBe(1);
    expect(at(tl.tDrag + 60).fillAlpha).toBeCloseTo(0.5, 6);
    expect(at(tl.tRelease).boxAlpha).toBe(1);
    expect(at(tl.tEnd - 125).boxAlpha).toBeCloseTo(0.5, 6);
  });
  it('clipFor shows the grown quarter', () => {
    expect(clipFor(0.25)).toBe('inset(0 75.00% 75.00% 0)');
  });
});
