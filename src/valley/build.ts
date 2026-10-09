// The one construction (spec §5.5): the visitor's house builds over 4.4 s of wall time after Enter.
// The driver passes t = seconds since the build started; the build latches on wall time (scrolling never pauses or
// reverses it). Allocation-free: buildStateAt returns one shared object, overwritten in place, and clock strings
// come from a table built once.
import type { BuildState } from './types';

export const BUILD_SECONDS = 4.4;
export const BUILD = {
  cutEnd: 3.6,            // the clip plane rises (easeInOut) over 0–3.6 s
  scaffoldBars: 18,
  scaffoldStart: 0.2,     // first bar starts growing at 0.2 s
  scaffoldGrow: 0.3,      // each bar grows in over 0.3 s
  scaffoldStagger: 0.3,   // bar idx starts (idx % 9) / 9 · 0.3 s after scaffoldStart
  retractFrom: 3.6,       // bars retract between 3.6 and 4.1 s
  retractTo: 4.1,
  lightAt: 4.25,          // the window lights
} as const;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeInOut = (t: number) => { const u = clamp01(t); return u * u * (3 - 2 * u); };

/** '0.00' … '4.40' for every hundredth of a second of the build. */
const CLOCK: readonly string[] = Array.from({ length: Math.round(BUILD_SECONDS * 100) + 1 }, (_, i) => (i / 100).toFixed(2));

const STATE: BuildState = {
  cut: 0,
  scaffold: Array.from({ length: BUILD.scaffoldBars }, (_, idx) => ({ idx, grow: 0 })),
  clock: CLOCK[0],
  lit: false,
  done: false,
};

/** Seconds after which scaffold bar `idx` starts growing. */
export function scaffoldStart(idx: number): number {
  return BUILD.scaffoldStart + ((idx % 9) / 9) * BUILD.scaffoldStagger;
}

/**
 * Build state at `t` seconds since the build began, clamped to [0, 4.4] (NaN → 0). After 4.4 s it is the final
 * state forever: cut 1, scaffold gone, clock '4.40', lit, done. Returns the same object every call.
 */
export function buildStateAt(t: number): BuildState {
  const tc = t > 0 ? Math.min(t, BUILD_SECONDS) : 0;   // NaN and negatives → 0
  STATE.cut = easeInOut(tc / BUILD.cutEnd);
  const retract = 1 - clamp01((tc - BUILD.retractFrom) / (BUILD.retractTo - BUILD.retractFrom));
  for (const bar of STATE.scaffold) {
    const grow = clamp01((tc - scaffoldStart(bar.idx)) / BUILD.scaffoldGrow);
    bar.grow = Math.min(grow, retract);
  }
  STATE.clock = CLOCK[Math.floor(tc * 100 + 1e-6)];
  STATE.lit = tc >= BUILD.lightAt;
  STATE.done = tc >= BUILD_SECONDS;
  return STATE;
}
