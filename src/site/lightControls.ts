// The lights as controls (a11y) and the phone tap line (spec §11): each emitter's label, the build-order tab order,
// and the screen-space hit test against the driver's projected positions, converted from NDC to CSS px by the caller
// (projectedToPixels; stride 3: x px, y px, visible).
import type { EmitterId } from '@/valley/types';
import { EMITTERS } from '@/valley/lights';
import { copy } from './copy';

export const LIGHT_ORDER: readonly EmitterId[] = [
  'hut', 'nist', 'mill', 'kalshiLamp', 'wvu', 'bar1', 'bar2', 'bar3', 'bar4',
  'hill1', 'hill2', 'hill3', 'hill4', 'hill5', 'visitor', 'ridge',
];

const HILL: Partial<Record<EmitterId, number>> = { hill1: 0, hill2: 1, hill3: 2, hill4: 3, hill5: 4 };

export function lightLabel(id: EmitterId, visitorSentence: string | null): string | null {
  const l = copy.open.labels;
  switch (id) {
    case 'hut': return l.hut;
    case 'nist': return l.nist;
    case 'mill': return l.mill;
    case 'kalshiLamp':
    case 'ridge': return l.kalshiLamp;
    case 'wvu': return l.wvu;
    case 'bar1':
    case 'bar2':
    case 'bar3':
    case 'bar4': return l.bars;
    case 'visitor': return visitorSentence && visitorSentence.trim() !== '' ? visitorSentence.trim() : null;
    default: return copy.yours.hillside[HILL[id] ?? 0];
  }
}

export const TAP_RADIUS_PX = 28;

export function nearestEmitter(px: Float32Array, x: number, y: number, radius = TAP_RADIUS_PX): number {
  let best = -1;
  let bestD2 = radius * radius;
  for (let i = 0; i < EMITTERS.length; i++) {
    if (px[i * 3 + 2] <= 0) continue;
    const dx = px[i * 3] - x;
    const dy = px[i * 3 + 1] - y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= bestD2) { best = i; bestD2 = d2; }
  }
  return best;
}

export function isTap(down: { x: number; y: number; t: number }, up: { x: number; y: number; t: number }): boolean {
  return Math.hypot(up.x - down.x, up.y - down.y) <= 10 && up.t - down.t <= 500;
}
