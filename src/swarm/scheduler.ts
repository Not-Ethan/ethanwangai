import { jobTimeline, restPoint, type JobTimeline, type Point, type Rect } from './timeline';
import { jitter } from './agents';

export interface Job { id: number; name: string }
export interface AgentState {
  id: number; x: number; y: number;
  /** idle-drift phase, radians (not the job phase) */
  phase: number;
  busy: boolean; job: Job | null; timeline: JobTimeline | null; startAt: number;
}
export interface Dispatch { started: { agent: AgentState; job: Job; timeline: JobTimeline }[]; instant: Job[]; dropped: Job[] }

const EMPTY: Readonly<Dispatch> = Object.freeze({ started: [], instant: [], dropped: [] });

export const OFFSCREEN_MARGIN = 200;
export const QUEUE_FACTOR = 2;

export function makeAgent(id: number, at: Point, phase: number): AgentState {
  return { id, x: at.x, y: at.y, phase, busy: false, job: null, timeline: null, startAt: 0 };
}

export function nearestFreeAgent(agents: readonly AgentState[], x: number, y: number): number {
  let best = -1, bestD = Infinity;
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    if (a.busy) continue;
    const d = (a.x - x) ** 2 + (a.y - y) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

export function isOffscreen(rect: Rect, vp: Rect, margin = OFFSCREEN_MARGIN): boolean {
  return rect.x + rect.w < vp.x - margin || rect.x > vp.x + vp.w + margin || rect.y + rect.h < vp.y - margin || rect.y > vp.y + vp.h + margin;
}

/** True when an element's bottom edge (document px) lies more than `margin` above the top of the viewport. */
export function scrolledPast(rectBottom: number, scrollY: number, margin = OFFSCREEN_MARGIN): boolean {
  return rectBottom < scrollY - margin;
}

/** The queue and the assignment rule. Knows nothing about the DOM: the caller measures rects. */
export class Scheduler {
  readonly queue: Job[] = [];
  constructor(readonly agents: AgentState[], private readonly rand: () => number) {}

  enqueue(job: Job): void { this.queue.push(job); }

  /** Hands queued jobs to idle agents. `measure` returns a job's rect in document px, or null if its element is gone. */
  dispatch(now: number, vp: Rect, measure: (job: Job) => Rect | null): Readonly<Dispatch> {
    if (this.queue.length === 0) return EMPTY;
    const out: Dispatch = { started: [], instant: [], dropped: [] };
    const cap = QUEUE_FACTOR * this.agents.length;
    while (this.queue.length > cap) out.instant.push(this.queue.shift()!);
    while (this.queue.length > 0 && this.agents.some((a) => !a.busy)) {
      const job = this.queue.shift()!;
      let rect: Rect | null;
      try { rect = measure(job); } catch { rect = null; }
      if (!rect) { out.dropped.push(job); continue; }
      if (isOffscreen(rect, vp)) { out.instant.push(job); continue; }
      const i = nearestFreeAgent(this.agents, rect.x, rect.y);
      const agent = this.agents[i];
      const timeline = jobTimeline({ x: agent.x, y: agent.y }, rect);
      agent.busy = true; agent.job = job; agent.timeline = timeline; agent.startAt = now + jitter(this.rand);
      out.started.push({ agent, job, timeline });
    }
    return out;
  }

  /** The agent is free again (start of linger): it rests at the box's bottom-right plus (6, 8). */
  free(agent: AgentState): void {
    if (agent.timeline) { const p = restPoint(agent.timeline); agent.x = p.x; agent.y = p.y; }
    agent.busy = false; agent.job = null; agent.timeline = null; agent.startAt = 0;
  }

  /** Rebuild: clear the queue and free every agent. A busy agent's logical position stays where it was before the job. */
  reset(): void {
    this.queue.length = 0;
    for (const a of this.agents) { a.busy = false; a.job = null; a.timeline = null; a.startAt = 0; }
  }
}
