// The no-WebGL switch (spec §11). One module-level store, read by Scene (canvas or still), Open (the static label
// list), Yours (the SVG house) and LightControls (hidden without GL). 'unknown' until the probe runs, 'ok' when
// webgl2Available() passes, 'failed' when it does not (or `?nogl=1`), when the GL error boundary catches, or when the
// context is lost. It never returns to 'ok': a lost context is not restored, the still takes over for the visit.
import { webgl2Available } from './glSupport';

export type GlStatus = 'unknown' | 'ok' | 'failed';

let status: GlStatus = 'unknown';
const listeners = new Set<() => void>();

export function glStatus(): GlStatus {
  return status;
}

/** Runs the probe the first time and caches the answer; useSyncExternalStore's getSnapshot, so it never notifies. */
function flagFailed(): void {
  if (typeof document !== 'undefined' && document.documentElement) document.documentElement.setAttribute('data-gl', 'failed');
}

export function probeGl(probe: () => boolean = webgl2Available): GlStatus {
  if (status === 'unknown') {
    status = probe() ? 'ok' : 'failed';
    if (status === 'failed') flagFailed();
  }
  return status;
}

export function markGlFailed(): void {
  if (status === 'failed') return;
  status = 'failed';
  flagFailed();
  for (const l of [...listeners]) l();
}

export function subscribeGl(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Calls onLost the first time the canvas loses its context; the returned function stops watching. */
export function watchContextLoss(target: EventTarget, onLost: () => void): () => void {
  const handler = () => onLost();
  target.addEventListener('webglcontextlost', handler, { once: true });
  return () => target.removeEventListener('webglcontextlost', handler);
}

export function resetGlStatusForTests(): void {
  status = 'unknown';
  listeners.clear();
}
