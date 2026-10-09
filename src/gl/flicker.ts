// The hut flicker (spec §4.2, §3.1 · 08): an email hover or focus starts a 0.4 s dip to 0.6 and back. The Driver
// listens on window (no R3F pointer events) and steps the clock each frame.
export const FLICKER_S = 0.4;
export const FLICKER_DIP = 0.6;
export const EMAIL_SELECTOR = 'a[data-contact="email"]';

export function flickerLevel(flickerT: number | null): number {
  if (flickerT === null || flickerT <= 0 || flickerT >= FLICKER_S) return 1;
  return 1 - (1 - FLICKER_DIP) * Math.sin((Math.PI * flickerT) / FLICKER_S);
}

export interface FlickerClock {
  pending: boolean;
  start: number | null;
}

export function createFlickerClock(): FlickerClock {
  return { pending: false, start: null };
}

export function stepFlicker(c: FlickerClock, t: number): number | null {
  if (c.pending) {
    c.pending = false;
    if (c.start === null || t - c.start >= FLICKER_S) c.start = t;
  }
  if (c.start === null) return null;
  const elapsed = t - c.start;
  if (elapsed >= FLICKER_S) {
    c.start = null;
    return null;
  }
  return elapsed;
}

export function isEmailTarget(target: EventTarget | null): boolean {
  const el = target as { closest?: (selector: string) => unknown } | null;
  return el !== null && typeof el.closest === 'function' && el.closest(EMAIL_SELECTOR) !== null;
}
