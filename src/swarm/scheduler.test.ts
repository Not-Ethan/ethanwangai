import { describe, expect, it } from 'vitest';
import { mulberry32 } from './prng';
import { OFFSCREEN_MARGIN, QUEUE_FACTOR, Scheduler, isOffscreen, makeAgent, nearestFreeAgent, type Job } from './scheduler';
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
      expect(agent.startAt).toBeLessThan(1120);
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
