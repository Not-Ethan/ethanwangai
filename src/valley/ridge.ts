// The ridge of trades (spec §4.6): one point per trade along the back ridge, jan 2026 (x0) → oct 2026 (x1).
// aBirth is the trade's time fraction, monotone in x; Ridge.tsx shows points with aBirth ≤ uReveal.
// Not live. If `src/valley/data/tradesPerDay.json` holds a non-empty array of daily counts (day 0 = 2026-01-01,
// last entry = the last day of the span), births follow that file instead of a uniform spread; nothing else changes.
import { RIDGE } from './layout';
import { heightAt } from './terrain';
import { mulberry32 } from './rng';
import tradesPerDay from './data/tradesPerDay.json';

/** Points sit this far above the ground at z = RIDGE.z, then jitter ±JITTER in y and z (§4.6). */
export const RIDGE_LIFT = 2;
export const RIDGE_JITTER = 1.5;
export const RIDGE_SIZE = { min: 0.6, max: 1.4 } as const;

/** The committed per-day file, or null when it is empty or malformed (then births are uniform). */
export const TRADES_PER_DAY: readonly number[] | null = validPerDay(tradesPerDay as unknown);

function validPerDay(v: unknown): readonly number[] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  let sum = 0;
  for (const n of v) {
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return null;
    sum += n;
  }
  return sum > 0 ? (v as number[]) : null;
}

/** Inverse CDF of the per-day histogram: quantile q ∈ [0, 1) → time fraction ∈ [0, 1). Monotone in q. */
function makeInverse(perDay: readonly number[]): (q: number) => number {
  const cum = new Float64Array(perDay.length + 1);
  for (let d = 0; d < perDay.length; d++) cum[d + 1] = cum[d] + perDay[d];
  const total = cum[perDay.length];
  let d = 0;   // callers pass increasing q, so the cursor only moves forward
  return (q: number) => {
    const target = q * total;
    while (d < perDay.length - 1 && cum[d + 1] <= target) d++;
    const inDay = perDay[d] > 0 ? (target - cum[d]) / perDay[d] : 0;
    return (d + Math.min(1, Math.max(0, inDay))) / perDay.length;
  };
}

/**
 * `count` points (floored, min 0) along the ridge, seeded. positions: xyz per point; birth: time fraction in [0, 1),
 * non-decreasing with index and with x; size: 0.6–1.4 (the phone tier multiplies by 1.8 in Ridge.tsx).
 * `perDay` defaults to the committed file; pass null to force the uniform spread.
 */
export function ridgePoints(
  count: number,
  seed: number,
  perDay: readonly number[] | null = TRADES_PER_DAY,
): { positions: Float32Array; birth: Float32Array; size: Float32Array } {
  const n = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));
  const positions = new Float32Array(n * 3);
  const birth = new Float32Array(n);
  const size = new Float32Array(n);
  const rng = mulberry32(seed);
  const valid = perDay ? validPerDay(perDay) : null;
  const inverse = valid ? makeInverse(valid) : null;
  const span = RIDGE.x1 - RIDGE.x0;
  for (let i = 0; i < n; i++) {
    const q = (i + rng()) / n;                 // one stratum per point: strictly increasing in i
    const f = inverse ? inverse(q) : q;
    const x = RIDGE.x0 + f * span;
    birth[i] = f;
    positions[i * 3] = x;
    positions[i * 3 + 1] = heightAt(x, RIDGE.z) + RIDGE_LIFT + (rng() * 2 - 1) * RIDGE_JITTER;
    positions[i * 3 + 2] = RIDGE.z + (rng() * 2 - 1) * RIDGE_JITTER;
    size[i] = RIDGE_SIZE.min + rng() * (RIDGE_SIZE.max - RIDGE_SIZE.min);
  }
  return { positions, birth, size };
}
