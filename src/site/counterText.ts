// The ridge counter's pure part (spec §3.1 · 02, §9): the number from the latched reveal, and the seeded digit scramble
// that runs only while the number changes.
import { mulberry32 } from '@/valley/rng';

export const SCRAMBLE_MS = 320;
export const SCRAMBLE_TICKS = 12;

export function counterValue(reveal: number, trades: number): number {
  const r = Math.min(1, Math.max(0, reveal));
  return Math.min(trades, Math.round((r * trades) / 10) * 10);
}

/** Digit k of D resolves once phase >= (k + 1) / D; unresolved digits are seeded noise that changes SCRAMBLE_TICKS times. */
export function scrambleDigits(text: string, phase: number, seed: number): string {
  let digits = 0;
  for (const ch of text) if (ch >= '0' && ch <= '9') digits++;
  if (digits === 0 || phase >= 1) return text;
  const tick = Math.floor(Math.max(0, phase) * SCRAMBLE_TICKS);
  let k = 0;
  let out = '';
  for (const ch of text) {
    if (ch < '0' || ch > '9') {
      out += ch;
      continue;
    }
    if (phase >= (k + 1) / digits) {
      out += ch;
    } else {
      const rng = mulberry32((seed ^ Math.imul(k + 1, 0x9e3779b1) ^ tick) >>> 0);
      out += String(Math.floor(rng() * 10));
    }
    k++;
  }
  return out;
}
