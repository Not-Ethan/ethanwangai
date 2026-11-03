import { describe, expect, it } from 'vitest';
import { mulberry32 } from './prng';
import { OFFSCREEN_MARGIN, QUEUE_FACTOR, Scheduler, isOffscreen, mostlyHidden, makeAgent, scrolledPast, nearestFreeAgent, type Job } from './scheduler';
import { restPoint, type Rect } from './timeline';

const vp: Rect = { x: 0, y: 0, w: 1440, h: 900 };
const job = (id: number): Job => ({ id, name: `job ${id}` });
const rectAt = (x: number, y: number): Rect => ({ x, y, w: 200, h: 80 });
const makeAgents = (n: number, spread = 100) =>
  Array.from({ length: n }, (_, i) => makeAgent(i, { x: i * spread, y: 0 }, i));

describe('nearestFreeAgent', () => {
  it('picks the nearest idle agent, skips busy ones, returns -1 when all busy', () => {
    const agents = [makeAgent(0, { x: 0, y: 0 }, 0), makeAgent(1, { x: 500, y: 0 }, 0), makeAgent(2, { x: 1000, y: 0 }, 0)];
    expect(nearestFreeAgent(agents, 520, 10)).toBe(1);
    agents[1].busy = true;
    expect(nearestFreeAgent(agents, 520, 10)).toBe(2);
    for (const a of agents) a.busy = true;
    expect(nearestFreeAgent(agents, 520, 10)).toBe(-1);
  });
  it('breaks ties by the lower index', () => {
    const agents = [makeAgent(0, { x: 0, y: 0 }, 0), makeAgent(1, { x: 0, y: 0 }, 0)];
    expect(nearestFreeAgent(agents, 10, 10)).toBe(0);
  });
});

describe('isOffscreen', () => {
  it('treats rects beyond the 200 px margin as offscreen', () => {
    expect(isOffscreen(rectAt(100, 1300), vp)).toBe(true);
    expect(isOffscreen(rectAt(100, 1050), vp)).toBe(false);
  });
});

describe('Scheduler', () => {
  it('assigns at most one job per idle agent, with jitter and the agent position as origin', () => {
    const agents = makeAgents(3);
    const s = new Scheduler(agents, mulberry32(1));
    for (let i = 0; i < 5; i++) s.enqueue(job(i));
    const d = s.dispatch(1000, vp, () => rectAt(300, 300));
    expect(d.started).toHaveLength(3);
    expect(s.queue).toHaveLength(2);
    for (const { agent, timeline } of d.started) {
      expect(agent.busy).toBe(true);
      expect(agent.startAt).toBeGreaterThanOrEqual(1000);
      expect(agent.startAt).toBeLessThan(1240);
      expect(timeline.from).toEqual({ x: agent.x, y: agent.y });
    }
  });

  it('turns the oldest jobs beyond 2 x agents into instant builds', () => {
    const agents = makeAgents(6);
    const s = new Scheduler(agents, mulberry32(1));
    for (let i = 0; i < 20; i++) s.enqueue(job(i));
    const d = s.dispatch(0, vp, () => rectAt(300, 300));
    expect(d.instant.map((j) => j.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(d.started).toHaveLength(6);
    expect(s.queue).toHaveLength(6);
  });

  it('builds offscreen jobs instantly without using an agent', () => {
    const agents = makeAgents(2);
    const s = new Scheduler(agents, mulberry32(1));
    s.enqueue(job(1));
    const d = s.dispatch(0, vp, () => rectAt(100, 1300));
    expect(d.instant).toHaveLength(1);
    expect(d.started).toHaveLength(0);
    expect(agents.every((a) => !a.busy)).toBe(true);
  });

  it('drops a job whose element is gone, leaving agents untouched', () => {
    const agents = makeAgents(2);
    const s = new Scheduler(agents, mulberry32(1));
    s.enqueue(job(1));
    const d = s.dispatch(0, vp, () => null);
    expect(d.dropped).toHaveLength(1);
    expect(d.started).toHaveLength(0);
    expect(agents.every((a) => !a.busy)).toBe(true);
  });

  it('free moves the agent to the rest point and it can take the next job', () => {
    const agents = makeAgents(1);
    const s = new Scheduler(agents, mulberry32(1));
    s.enqueue(job(1));
    const d = s.dispatch(0, vp, () => rectAt(300, 300));
    const rest = restPoint(d.started[0].timeline);
    expect(rest.x).toBe(300 + 200 + 4 + d.started[0].timeline.restDx);
    expect(d.started[0].timeline.restDx).toBeGreaterThanOrEqual(6);
    expect(d.started[0].timeline.restDx).toBeLessThan(18);
    expect(d.started[0].timeline.restDy).toBeGreaterThanOrEqual(8);
    expect(d.started[0].timeline.restDy).toBeLessThan(22);
    s.free(agents[0]);
    expect(agents[0].x).toBe(rest.x);
    expect(agents[0].y).toBe(rest.y);
    expect(agents[0].job).toBeNull();
    expect(agents[0].busy).toBe(false);
    s.enqueue(job(2));
    expect(s.dispatch(0, vp, () => rectAt(300, 300)).started).toHaveLength(1);
  });

  it('reset empties the queue and frees every agent', () => {
    const agents = makeAgents(2);
    const s = new Scheduler(agents, mulberry32(1));
    for (let i = 0; i < 4; i++) s.enqueue(job(i));
    s.dispatch(0, vp, () => rectAt(300, 300));
    s.reset();
    expect(s.queue).toHaveLength(0);
    expect(agents.every((a) => !a.busy && a.job === null && a.timeline === null)).toBe(true);
  });

  it('starts jobs in enqueue order with a single agent', () => {
    const agents = makeAgents(1);
    const s = new Scheduler(agents, mulberry32(1));
    s.enqueue(job(1));
    s.enqueue(job(2));
    const first = s.dispatch(0, vp, () => rectAt(300, 300));
    expect(first.started[0].job.id).toBe(1);
    s.free(agents[0]);
    const second = s.dispatch(0, vp, () => rectAt(300, 300));
    expect(second.started[0].job.id).toBe(2);
  });
});

describe('Scheduler: centre-first assignment, tempo, abandon', () => {
  it('starts the job nearest the viewport centre first, ties by queue order, and caches rects', () => {
    const agents = makeAgents(3);
    agents[1].busy = true; agents[2].busy = true;   // one free agent; the cap (6) leaves all three queued
    const s = new Scheduler(agents, mulberry32(1));
    const rects: Record<number, Rect> = { 1: rectAt(100, 20), 2: rectAt(620, 410), 3: rectAt(620, 410) };
    for (const id of [1, 2, 3]) s.enqueue(job(id));
    let calls = 0;
    const d = s.dispatch(0, vp, (j) => { calls++; return rects[j.id]; });
    expect(d.started.map((x) => x.job.id)).toEqual([2]);
    expect(calls).toBe(3);
    expect(s.queue.map((j) => j.id)).toEqual([1, 3]);
    expect(s.queue[0].rect).toEqual(rects[1]);
    s.free(agents[0]);
    s.dispatch(0, vp, () => { calls++; return null; });
    expect(calls).toBe(3);
  });
  it('builds off-screen jobs instantly even when no agent is free', () => {
    const agents = makeAgents(1);
    agents[0].busy = true;
    const s = new Scheduler(agents, mulberry32(1));
    s.enqueue(job(1)); s.enqueue(job(2));
    const d = s.dispatch(0, vp, (j) => (j.id === 1 ? rectAt(100, 5000) : rectAt(100, 100)));
    expect(d.instant.map((j) => j.id)).toEqual([1]);
    expect(s.queue.map((j) => j.id)).toEqual([2]);
  });
  it('draws seeded tempo and rest offsets within range and stores them on the timeline', () => {
    const agents = makeAgents(6);
    const s = new Scheduler(agents, mulberry32(7));
    for (let i = 0; i < 6; i++) s.enqueue(job(i));
    const d = s.dispatch(0, vp, () => rectAt(300, 300));
    for (const { timeline: tl } of d.started) {
      expect(tl.tempo.travel).toBeGreaterThanOrEqual(0.8); expect(tl.tempo.travel).toBeLessThan(1.4);
      expect(tl.tempo.drag).toBeGreaterThanOrEqual(0.85); expect(tl.tempo.drag).toBeLessThan(1.35);
      expect(tl.restDy).toBeGreaterThanOrEqual(8); expect(tl.restDy).toBeLessThan(22);
    }
    expect(new Set(d.started.map((x) => x.timeline.travel)).size).toBeGreaterThan(1);
  });
  it('takes tempo 0.6x while more jobs wait than there are agents', () => {
    const slow = new Scheduler(makeAgents(6), mulberry32(7));
    for (let i = 0; i < 8; i++) slow.enqueue(job(i));
    const d = slow.dispatch(0, vp, () => rectAt(300, 300));
    expect(d.started.length).toBe(6);
    for (const { timeline: tl } of d.started) {
      expect(tl.tempo.travel).toBeLessThanOrEqual(0.6 * 1.4); expect(tl.tempo.drag).toBeLessThanOrEqual(0.6 * 1.35);
    }
    const fast = new Scheduler(makeAgents(6), mulberry32(7));
    for (let i = 0; i < 3; i++) fast.enqueue(job(i));
    const f = fast.dispatch(0, vp, () => rectAt(300, 300));
    for (const { timeline: tl } of f.started) {
      expect(tl.tempo.travel).toBeGreaterThanOrEqual(0.8); expect(tl.tempo.drag).toBeGreaterThanOrEqual(0.85);
    }
    // same seed, same first draw: exactly 0.6x
    expect(d.started[0].timeline.tempo.travel).toBeCloseTo(0.6 * f.started[0].timeline.tempo.travel, 10);
  });
  it('abandon frees a busy agent at the given point', () => {
    const agents = makeAgents(1);
    const s = new Scheduler(agents, mulberry32(1));
    s.enqueue(job(1));
    s.dispatch(0, vp, () => rectAt(300, 300));
    expect(agents[0].busy).toBe(true);
    s.abandon(agents[0], { x: 12, y: 34 });
    expect([agents[0].x, agents[0].y]).toEqual([12, 34]);
    expect(agents[0].busy).toBe(false);
    expect(agents[0].job).toBeNull();
    expect(agents[0].timeline).toBeNull();
  });
});

describe('scheduler, pinned', () => {
  const r10 = (x: number, y: number): Rect => ({ x, y, w: 10, h: 10 });
  it('isOffscreen boundaries', () => {
    expect(isOffscreen(r10(100, 1100), vp)).toBe(false);
    expect(isOffscreen(r10(100, 1101), vp)).toBe(true);
    expect(isOffscreen(r10(-210, 100), vp)).toBe(false);
    expect(isOffscreen(r10(-211, 100), vp)).toBe(true);
    expect(isOffscreen(r10(1640, 100), vp)).toBe(false);
    expect(isOffscreen(r10(1641, 100), vp)).toBe(true);
    expect(isOffscreen({ x: 100, y: -280, w: 10, h: 80 }, vp)).toBe(false);
    expect(isOffscreen({ x: 100, y: -290, w: 10, h: 80 }, vp)).toBe(true);
  });
  it('scrolledPast boundaries', () => {
    expect(scrolledPast(1000 - 201, 1000)).toBe(true);
    expect(scrolledPast(1000 - 199, 1000)).toBe(false);
  });
  it('pins the constants', () => {
    expect(OFFSCREEN_MARGIN).toBe(200);
    expect(QUEUE_FACTOR).toBe(2);
  });
  it('a throwing measure drops only that job and keeps earlier starts', () => {
    const agents = makeAgents(2);
    const s = new Scheduler(agents, mulberry32(1));
    s.enqueue(job(1));
    s.enqueue(job(2));
    const d = s.dispatch(0, vp, (j) => { if (j.id === 2) throw new Error('boom'); return rectAt(300, 300); });
    expect(d.started.map((x) => x.job.id)).toEqual([1]);
    expect(d.dropped.map((j) => j.id)).toEqual([2]);
    expect(agents.filter((a) => a.busy)).toHaveLength(1);
    expect(agents.filter((a) => !a.busy)).toHaveLength(1);
  });
  it('reset leaves a busy agent at its pre-job position', () => {
    const agents = makeAgents(1);
    const s = new Scheduler(agents, mulberry32(1));
    s.enqueue(job(1));
    s.dispatch(0, vp, () => rectAt(300, 300));
    s.reset();
    expect([agents[0].x, agents[0].y]).toEqual([0, 0]);
    expect(agents[0].busy).toBe(false);
  });
  it('an empty-queue dispatch returns empty arrays', () => {
    const s = new Scheduler(makeAgents(2), mulberry32(1));
    const d = s.dispatch(0, vp, () => rectAt(300, 300));
    expect(d.started).toEqual([]);
    expect(d.instant).toEqual([]);
    expect(d.dropped).toEqual([]);
  });
});

describe('mostlyHidden', () => {
  const v = { x: 0, y: 1000, w: 1440, h: 900 };
  it('flags an element mostly under the bar or below the viewport', () => {
    expect(mostlyHidden({ x: 0, y: 1000, w: 300, h: 70 }, v)).toBe(true);
    expect(mostlyHidden({ x: 0, y: 1880, w: 300, h: 200 }, v)).toBe(true);
  });
  it('keeps an element that mostly shows', () => {
    expect(mostlyHidden({ x: 0, y: 1030, w: 300, h: 100 }, v)).toBe(false);
    expect(mostlyHidden({ x: 0, y: 1500, w: 300, h: 100 }, v)).toBe(false);
  });
});
