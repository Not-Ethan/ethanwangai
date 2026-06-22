// A tiny module-level store for scroll progress.
// R3F reads this every frame inside useFrame WITHOUT triggering React re-renders,
// which keeps the 3D scene buttery smooth while the DOM scrolls.

export type ScrollState = {
  /** Overall page scroll progress, 0 (top) .. 1 (bottom). */
  progress: number;
  /** Smoothed velocity from Lenis, useful for motion-reactive effects. */
  velocity: number;
};

export const scrollState: ScrollState = {
  progress: 0,
  velocity: 0,
};

/** Linear interpolation. */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Smootherstep easing for organic, non-linear transitions. */
export const smoothstep = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
};

/**
 * Maps a global progress value (0..1) onto a list of keyframes and returns
 * the bracketing indices plus an eased local blend factor.
 */
export function segment(progress: number, count: number) {
  const scaled = Math.min(0.99999, Math.max(0, progress)) * (count - 1);
  const a = Math.floor(scaled);
  const b = Math.min(count - 1, a + 1);
  const t = smoothstep(scaled - a);
  return { a, b, t };
}
