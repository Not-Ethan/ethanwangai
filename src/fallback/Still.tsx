'use client';
// The no-WebGL tier's pieces (spec §11, §7): the committed night still as the picture, and the GL status hooks.
// Scene renders <Still /> in place of the canvas until the probe passes, so the still is also the first paint. The
// static label list is Stage 0's Labels() (shown on this tier by Task 5.7) and the house is Stage 4's VisitorHouseSvg().
import { useSyncExternalStore } from 'react';
import { probeGl, subscribeGl, type GlStatus } from './glStatus';

const serverStatus = (): GlStatus => 'unknown';

export function useGlStatus(): GlStatus {
  return useSyncExternalStore(subscribeGl, () => probeGl(), serverStatus);
}

export function useGlFailed(): boolean {
  return useGlStatus() === 'failed';
}

export function Still() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center"
      style={{ backgroundImage: 'url(/valley-still.jpg)' }}
    />
  );
}
