import { describe, expect, it } from 'vitest';
import { PAD, clipFor, jobTimeline, restPoint, sampleJob, type JobSample } from './timeline';

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
