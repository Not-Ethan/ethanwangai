// The `window.__dbso` record the gate stills and their Playwright checks read (design §14; task 3.7 polls t0 and reads
// samples[0]). Clocks writes T0 and the query pins, Ink the glyph pixels it sampled per partition. Nothing in the
// scene reads it back: it is a window onto the intro for tests, not state the frame depends on.

export interface DbsoDebug {
  t0: number | null;        // performance.now() at the frame that last started the hero tween (T0, or a rebuild); null before the fade ends
  freeze: number | null;    // the ?freeze=<s> seconds, when given
  built: boolean;           // ?built=1
  samples: number[];        // glyph pixels sampled into aSpawnUV per ink partition, from the latest registerSources
}

export const dbso: DbsoDebug = { t0: null, freeze: null, built: false, samples: [] };

/** Puts the record on `window.__dbso`. */
export function exposeDebug(): void {
  (window as Window & { __dbso?: DbsoDebug }).__dbso = dbso;
}
