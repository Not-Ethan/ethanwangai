import { jobTimeline, restPoint, type JobTimeline, type Point, type Rect } from './timeline';
import { jitter } from './agents';

export interface Job { id: number; name: string; /** cached by dispatch */ rect?: Rect | null }
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
    // measure every queued job once; off-screen and vanished ones never take an agent
    for (let k = 0; k < this.queue.length;) {
      const job = this.queue[k];
      if (job.rect === undefined) {
        try { job.rect = measure(job); } catch { job.rect = null; }
      }
      if (!job.rect) { out.dropped.push(job); this.queue.splice(k, 1); continue; }
      if (isOffscreen(job.rect, vp)) { out.instant.push(job); this.queue.splice(k, 1); continue; }
      k++;
    }
    const cx = vp.x + vp.w / 2, cy = vp.y + vp.h / 2;
    while (this.queue.length > 0 && this.agents.some((a) => !a.busy)) {
      // the on-screen job nearest the viewport centre, ties by queue order
      let bi = 0, bd = Infinity;
      for (let k = 0; k < this.queue.length; k++) {
        const r = this.queue[k].rect!;
        const d = (r.x + r.w / 2 - cx) ** 2 + (r.y + r.h / 2 - cy) ** 2;
        if (d < bd) { bd = d; bi = k; }
      }
      const job = this.queue.splice(bi, 1)[0];
      const rect = job.rect!;
      const i = nearestFreeAgent(this.agents, rect.x, rect.y);
      const agent = this.agents[i];
      const tempo = { travel: 0.8 + this.rand() * 0.6, drag: 0.85 + this.rand() * 0.5 };
      const rest = { dx: 6 + this.rand() * 12, dy: 8 + this.rand() * 14 };
      const timeline = jobTimeline({ x: agent.x, y: agent.y }, rect, tempo, rest);
      agent.busy = true; agent.job = job; agent.timeline = timeline; agent.startAt = now + jitter(this.rand);
      out.started.push({ agent, job, timeline });
    }
    return out;
  }

  /** The agent is free again (start of linger): it rests at the box's bottom-right plus its seeded offset. */
  free(agent: AgentState): void {
    if (agent.timeline) { const p = restPoint(agent.timeline); agent.x = p.x; agent.y = p.y; }
    agent.busy = false; agent.job = null; agent.timeline = null; agent.startAt = 0;
  }

  /** The agent leaves its job mid-way (the reader scrolled away) and stops at `at`. */
  abandon(agent: AgentState, at: Point): void {
    agent.x = at.x; agent.y = at.y;
    agent.busy = false; agent.job = null; agent.timeline = null; agent.startAt = 0;
  }

  /** Rebuild: clear the queue and free every agent. A busy agent's logical position stays where it was before the job. */
  reset(): void {
    this.queue.length = 0;
    for (const a of this.agents) { a.busy = false; a.job = null; a.timeline = null; a.startAt = 0; }
  }
}
