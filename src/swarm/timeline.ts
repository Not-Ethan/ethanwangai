import { clamp, easeOutCubic, smoothstep } from './easing';

export interface Rect { x: number; y: number; w: number; h: number }
export interface Point { x: number; y: number }
export type Phase = 'travel' | 'press' | 'drag' | 'release' | 'linger' | 'done';

export const PAD = 4;
export const TRAVEL_SPEED = 1.8;   // px per ms
export const TRAVEL_MIN = 180, TRAVEL_MAX = 700;
export const PRESS = 70;
export const DRAG_SPEED = 1.4;     // px per ms along the diagonal
export const DRAG_MIN = 280, DRAG_MAX = 950;
export const RELEASE = 120;
export const LINGER = 600;
export const LINGER_FADE = 250;    // the last 250 ms of linger fade the box out

export interface JobTimeline {
  from: Point; rect: Rect;
  travel: number; drag: number;
  tTravel: number; tPress: number; tDrag: number; tRelease: number; tEnd: number;   // phase end times, ms from start
}

export function jobTimeline(from: Point, rect: Rect): JobTimeline {
  const dist = Math.hypot(rect.x - PAD - from.x, rect.y - PAD - from.y);
  const travel = clamp(dist / TRAVEL_SPEED, TRAVEL_MIN, TRAVEL_MAX);
  const drag = clamp(Math.hypot(rect.w, rect.h) / DRAG_SPEED, DRAG_MIN, DRAG_MAX);
  const tTravel = travel, tPress = tTravel + PRESS, tDrag = tPress + drag, tRelease = tDrag + RELEASE, tEnd = tRelease + LINGER;
  return { from: { x: from.x, y: from.y }, rect: { ...rect }, travel, drag, tTravel, tPress, tDrag, tRelease, tEnd };
}

export interface JobSample {
  phase: Phase;
  cx: number; cy: number;   // cursor tip, document px
  f: number;                // drag progress 0..1 (eased)
  scale: number;            // cursor scale (0.92 while pressed)
  boxAlpha: number;         // stroke, handles and label opacity
  fillAlpha: number;        // fill opacity (1 while dragging, fades through release)
}

/** Where the agent rests after the job: the drag end plus (6, 8). The cursor arrives there through the release phase. */
export function restPoint(tl: JobTimeline): Point {
  return { x: tl.rect.x + tl.rect.w + PAD + 6, y: tl.rect.y + tl.rect.h + PAD + 8 };
}

/** Samples the job at t ms from its start. Allocation-free: writes into `out`. */
export function sampleJob(tl: JobTimeline, t: number, out: JobSample): JobSample {
  const { rect } = tl;
  const sx = rect.x - PAD, sy = rect.y - PAD, ex = rect.x + rect.w + PAD, ey = rect.y + rect.h + PAD;
  if (t < tl.tTravel) {
    const u = easeOutCubic(t / tl.travel);
    out.phase = 'travel'; out.cx = tl.from.x + (sx - tl.from.x) * u; out.cy = tl.from.y + (sy - tl.from.y) * u;
    out.f = 0; out.scale = 1; out.boxAlpha = 0; out.fillAlpha = 0;
  } else if (t < tl.tPress) {
    out.phase = 'press'; out.cx = sx; out.cy = sy; out.f = 0; out.scale = 0.92; out.boxAlpha = 1; out.fillAlpha = 1;
  } else if (t < tl.tDrag) {
    const f = smoothstep((t - tl.tPress) / tl.drag);
    out.phase = 'drag'; out.cx = sx + (ex - sx) * f; out.cy = sy + (ey - sy) * f; out.f = f; out.scale = 1; out.boxAlpha = 1; out.fillAlpha = 1;
  } else if (t < tl.tRelease) {
    const u = (t - tl.tDrag) / RELEASE;
    out.phase = 'release'; out.cx = ex + 6 * u; out.cy = ey + 8 * u; out.f = 1; out.scale = 1; out.boxAlpha = 1; out.fillAlpha = 1 - u;
  } else if (t < tl.tEnd) {
    const left = tl.tEnd - t;
    out.phase = 'linger'; out.cx = ex + 6; out.cy = ey + 8; out.f = 1; out.scale = 1; out.fillAlpha = 0;
    out.boxAlpha = left < LINGER_FADE ? left / LINGER_FADE : 1;
  } else {
    out.phase = 'done'; out.cx = ex + 6; out.cy = ey + 8; out.f = 1; out.scale = 1; out.boxAlpha = 0; out.fillAlpha = 0;
  }
  return out;
}

/** The element's clip for a drag progress f: the box from the top-left grows to the bottom-right. */
export function clipFor(f: number): string {
  const r = ((1 - f) * 100).toFixed(2);
  return f >= 1 ? '' : `inset(0 ${r}% ${r}% 0)`;
}
