// A linear tween on a clock the caller keeps (design §8, clock 2, triggered time): the hero compile from T0, the
// click-to-rebuild, and Stage 4's visitor compile and teardown. No timers and no React: `nowS` is whatever seconds
// the caller reads, so the frame that starts it and the frames that read it agree on time, and a test drives it with
// plain numbers. Per-part easing lives in the shader; this is only the 0..1 the shader eases from.

export interface Tween {
  /** Restarts at `nowS` from `from` toward `to`. The defaults run 0 → 1; `start(now, 1, 0)` is the teardown direction. */
  start(nowS: number, from?: number, to?: number): void;
  /** The value at `nowS`: 0 before any start, `from` before the start time, linear across the duration, `to` after it. */
  value(nowS: number): number;
  /** Whether `nowS` is at or past the end of the last start; false before any start. */
  done(nowS: number): boolean;
  /** True from `start` until a `value` or `done` call has seen the end. */
  active: boolean;
}

/** A start at 10 read at 12.2 spans 2.1999999999999993 s in floats: within this of the end, in units of the duration, is the end. */
const END_TOLERANCE = 1e-9;

export function createTween(durationS: number): Tween {
  let t0: number | null = null;
  let from = 0;
  let to = 1;
  /** Progress 0..1 at `nowS` once started: exactly 1 at or past the end, so `value` lands on `to` and `done` agrees with it. */
  const progress = (nowS: number): number => {
    const k = durationS > 0 ? (nowS - (t0 as number)) / durationS : 1;
    return k >= 1 - END_TOLERANCE ? 1 : k <= 0 ? 0 : k;
  };
  const tween: Tween = {
    active: false,
    start(nowS, f = 0, t = 1) {
      t0 = nowS;
      from = f;
      to = t;
      tween.active = true;
    },
    value(nowS) {
      if (t0 === null) return 0;
      const k = progress(nowS);
      if (k === 1) tween.active = false;
      return from + (to - from) * k;
    },
    done(nowS) {
      const d = t0 !== null && progress(nowS) === 1;
      if (d) tween.active = false;
      return d;
    },
  };
  return tween;
}
