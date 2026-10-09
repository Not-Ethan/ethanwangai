// The warm-up (spec §7): fonts, compile every program with a 4 s ceiling (a lost context can leave compileAsync
// pending forever, spec §12), draw one frame, fade the canvas in over 200 ms. The end of the fade is T0.
// Dependencies are injected so this runs in Node under fake timers.

export const FADE_MS = 200;
export const COMPILE_TIMEOUT_MS = 4000;

/** Settles to 'done', 'failed' or 'timeout'; never rejects, never hangs past `ms`. */
export function withTimeout(p: Promise<unknown>, ms: number): Promise<'done' | 'timeout' | 'failed'> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve('timeout'), ms);
    p.then(
      () => { clearTimeout(timer); resolve('done'); },
      () => { clearTimeout(timer); resolve('failed'); },
    );
  });
}

export interface WarmUpDeps {
  fontsReady: Promise<unknown>;
  compile: () => Promise<unknown>;
  renderOnce: () => void;
  fadeIn: (ms: number) => void;
  wait: (ms: number) => Promise<void>;
  now: () => number;              // milliseconds, performance.now() in the browser
}

/** Resolves T0 in seconds on the deps' clock. */
export async function warmUp(d: WarmUpDeps): Promise<number> {
  await withTimeout(d.fontsReady, COMPILE_TIMEOUT_MS);
  let compiling: Promise<unknown>;
  try {
    compiling = d.compile();
  } catch (err) {
    compiling = Promise.reject(err);
  }
  await withTimeout(compiling, COMPILE_TIMEOUT_MS);
  try {
    d.renderOnce();
  } catch {
    // A lost context throws here; the context-loss listener and the error boundary take the canvas down.
  }
  d.fadeIn(FADE_MS);
  await d.wait(FADE_MS);
  return d.now() / 1000;
}
