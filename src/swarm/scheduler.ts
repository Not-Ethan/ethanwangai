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
export const LONG_QUEUE_TEMPO = 0.6;

export const STAGGER_MS = 100;
export const TARGET_Y = 0.35;
export const BAR_HEIGHT = 64;
/** True when less than `minShare` of the element's height is visible below the bar line (viewport top + bar) and above the viewport bottom: not worth a cursor. */
export function mostlyHidden(rect: Rect, vp: Rect, bar = BAR_HEIGHT, minShare = 0.25): boolean {
  if (rect.h <= 0) return false;
  // an element that sits inside the fixed bar (its top is under the bar line) is always drawn, never skipped
  if (rect.y - vp.y < bar && rect.h <= bar) return false;
  const top = Math.max(rect.y, vp.y + bar);
  const bottom = Math.min(rect.y + rect.h, vp.y + vp.h);
  return Math.max(0, bottom - top) < minShare * rect.h;
}

export interface DispatchHooks {
  /** build jobs the reader can barely see instantly instead of drawing them */
  skipCovered?: boolean;
  /** called for the chosen agent right before its timeline is computed (may move the agent) */
  prepare?: (agent: AgentState, rect: Rect) => void;
}

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
  dispatch(now: number, vp: Rect, measure: (job: Job) => Rect | null, hooks: DispatchHooks = {}): Readonly<Dispatch> {
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
      if (isOffscreen(job.rect, vp) || (hooks.skipCovered && mostlyHidden(job.rect, vp))) { out.instant.push(job); this.queue.splice(k, 1); continue; }
      k++;
    }
    // a long queue (more waiting than agents) is worked through faster
    const tempoScale = this.queue.length > this.agents.length ? LONG_QUEUE_TEMPO : 1;
    // headings first after a jump: the target is 35 % down the viewport, not its centre
    const cx = vp.x + vp.w / 2, cy = vp.y + vp.h * TARGET_Y;
    while (this.queue.length > 0 && this.agents.some((a) => !a.busy)) {
      // the on-screen job nearest the target point, ties by queue order
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
      const tempo = { travel: (0.8 + this.rand() * 0.6) * tempoScale, drag: (0.85 + this.rand() * 0.5) * tempoScale };
      const rest = { dx: 6 + this.rand() * 12, dy: 8 + this.rand() * 14 };
      hooks.prepare?.(agent, rect);
      const timeline = jobTimeline({ x: agent.x, y: agent.y }, rect, tempo, rest);
      // the k-th job of one dispatch starts k x 100 ms later, so a group does not move in formation
      agent.busy = true; agent.job = job; agent.timeline = timeline; agent.startAt = now + jitter(this.rand) + out.started.length * STAGGER_MS;
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
