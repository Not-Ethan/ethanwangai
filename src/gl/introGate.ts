// The intro gate (spec §7, §10, §11): whether the ignition chain plays in this tab, the still overrides the gates use
// (?still=1 with ?g= and ?t=), and the chain clock the Driver passes as FrameInputs.introT. Every storage access is
// inside try/catch: with storage blocked the chain plays every load and nothing throws.
import { CHAIN_END } from '@/valley/ignition';
import type { SectionRange } from '@/valley/types';

export const INTRO_KEY = 'introPlayed';
/** Seconds after CHAIN_END until the clock returns null (the last label is gone at 5.6 s). */
export const INTRO_TAIL = 2.0;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export type StorageGetter = () => StorageLike | null;

/** Reading window.sessionStorage itself can throw (blocked site data), so callers only touch it inside try. */
export const sessionStore: StorageGetter = () => (typeof window === 'undefined' ? null : window.sessionStorage);

export function readIntroPlayed(get: StorageGetter): boolean {
  try {
    const s = get();
    return s !== null && s.getItem(INTRO_KEY) !== null;
  } catch {
    return false;
  }
}

export function markIntroPlayed(get: StorageGetter): void {
  try {
    get()?.setItem(INTRO_KEY, '1');
  } catch {
    // storage blocked: the chain plays again on the next load (spec §11)
  }
}

export interface StillParams {
  still: boolean;
  debug?: boolean;   // ?debug=1 (Task 5.8): the perf overlay; honours ?g= too
  g: number | null;
  t: number | null;
}

function num(q: URLSearchParams, key: string): number | null {
  const raw = q.get(key);
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function stillParams(search: string): StillParams {
  const q = new URLSearchParams(search);
  const still = q.get('still') === '1';
  const debug = q.get('debug') === '1';
  if (!still && !debug) return { still: false, g: null, t: null };
  const g = num(q, 'g');
  const t = still ? num(q, 't') : null;
  const out: StillParams = { still, g: g === null ? null : Math.min(1, Math.max(0, g)), t: t === null ? null : Math.max(0, t) };
  if (debug) out.debug = true;
  return out;
}

/** The g the driver uses instead of the scroll's, or null: ?g= when still or debug, else the alive midpoint in
 *  still mode (spec §10). Allocation-free: it runs every frame. */
export function pinnedG(p: StillParams, ranges: readonly SectionRange[]): number | null {
  if (p.g !== null) return p.g;
  if (!p.still) return null;
  for (let i = 0; i < ranges.length; i++) {
    if (ranges[i].id === 'alive') return (ranges[i].start + ranges[i].end) / 2;
  }
  return null;
}

/** Still mode "holds the frame" by freezing ambient time, except when ?t= pins the chain clock for a G2 still. */
export function holdsFrame(p: StillParams): boolean {
  return p.still && p.t === null;
}

export function shouldPlayIntro(o: { reducedMotion: boolean; introPlayed: boolean; still: StillParams }): boolean {
  if (o.still.still) return o.still.t !== null;
  if (o.reducedMotion) return false;
  return !o.introPlayed;
}

export function introClock(play: boolean, t0: number | null, now: number, stillT: number | null): number | null {
  if (stillT !== null) return stillT;
  if (!play) return null;
  if (t0 === null) return 0;
  const elapsed = now - t0;
  return elapsed > CHAIN_END + INTRO_TAIL ? null : Math.max(0, elapsed);
}
