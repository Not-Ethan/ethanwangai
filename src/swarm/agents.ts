import { clamp } from './easing';
import type { Point, Rect } from './timeline';

export const AGENT_COLOURS = ['#2563eb', '#e5484d', '#16a34a', '#7c3aed', '#f97316', '#db2777'] as const;
export const agentName = (i: number): string => `agent ${String(i + 1).padStart(2, '0')}`;
export const agentCount = (viewportWidth: number): number => (viewportWidth >= 768 ? 6 : 3);
export const OUTSIDE = 40;

/** Agent i starts 40 px outside the viewport on edge i % 3 (top, left, right), somewhere along it. `vp` is in document px. */
export function initialPosition(i: number, vp: Rect, rand: () => number): Point {
  const edge = i % 3;
  if (edge === 0) return { x: vp.x + rand() * vp.w, y: vp.y - OUTSIDE };
  if (edge === 1) return { x: vp.x - OUTSIDE, y: vp.y + rand() * vp.h };
  return { x: vp.x + vp.w + OUTSIDE, y: vp.y + rand() * vp.h };
}

/** Where a faded cursor reappears for a job: OUTSIDE px beyond the viewport edge (top, left or right) nearest the target (top weighted double), keeping the target's x (top) or y (sides). All document px. */
export function respawnPoint(target: Point, vp: Rect): Point {
  // the top edge counts double: the bar sits there, so cursors only drop in from above for targets near the top
  const dTop = 2 * Math.abs(target.y - vp.y);
  const dLeft = Math.abs(target.x - vp.x);
  const dRight = Math.abs(vp.x + vp.w - target.x);
  const m = Math.min(dTop, dLeft, dRight);
  if (m === dTop) return { x: target.x, y: vp.y - OUTSIDE };
  if (m === dLeft) return { x: vp.x - OUTSIDE, y: target.y };
  return { x: vp.x + vp.w + OUTSIDE, y: target.y };
}

/** Idle breathing, in px, for time t (seconds) and a per-agent phase. */
export function idleDrift(t: number, phase: number, out: Point): Point {
  out.x = 5 * Math.sin((2 * Math.PI * t) / 2.4 + phase);
  out.y = 4 * Math.cos((2 * Math.PI * t) / 3.1 + phase);
  return out;
}

export const JITTER_MAX = 240;
export const jitter = (rand: () => number): number => rand() * JITTER_MAX;

export const IDLE_INSET = 12;
/** Draw pose for an idle agent: false when its rest point is outside the viewport (not drawn), else `out` holds the drifted position clamped IDLE_INSET px inside the viewport. */
export function idlePose(a: { x: number; y: number; phase: number }, vp: Rect, tSec: number, out: Point): boolean {
  if (a.x < vp.x || a.x > vp.x + vp.w || a.y < vp.y || a.y > vp.y + vp.h) return false;
  idleDrift(tSec, a.phase, out);
  out.x = clamp(a.x + out.x, vp.x + IDLE_INSET, vp.x + vp.w - IDLE_INSET);
  out.y = clamp(a.y + out.y, vp.y + IDLE_INSET, vp.y + vp.h - IDLE_INSET);
  return true;
}
