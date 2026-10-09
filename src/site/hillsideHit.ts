// Screen-space hit test for the hillside labels (spec §3.1 · 07, §6): no raycasts, no R3F pointer events, just the
// driver's cached projected emitter positions. PROJECTED holds NDC; projectedToPixels converts it to CSS px
// (stride 3: x px, y px, visible) and everything else here works in pixels.
import { EMITTERS } from '@/valley/lights';

export const HILL_INDICES: readonly number[] = (['hill1', 'hill2', 'hill3', 'hill4', 'hill5'] as const).map((id) =>
  EMITTERS.findIndex((e) => e.id === id),
);
export const HIT_RADIUS_PX = 36;

/** PROJECTED (NDC x, NDC y, visible) into CSS px from the viewport's top-left. Writes `out`, allocates nothing. */
export function projectedToPixels(ndc: Float32Array, vw: number, vh: number, out: Float32Array): Float32Array {
  for (let o = 0; o + 2 < ndc.length; o += 3) {
    out[o] = ((ndc[o] + 1) / 2) * vw;
    out[o + 1] = ((1 - ndc[o + 1]) / 2) * vh;
    out[o + 2] = ndc[o + 2];
  }
  return out;
}

/** Index 0–4 of the nearest visible hill house within `radius` px of (px, py), or −1. */
export function hillsideHit(
  px: number, py: number, projected: Float32Array, indices: readonly number[] = HILL_INDICES, radius = HIT_RADIUS_PX,
): number {
  let best = -1;
  let bestD = radius * radius;
  for (let k = 0; k < indices.length; k++) {
    const i = indices[k] * 3;
    if (projected[i + 2] < 0.5) continue;
    const dx = projected[i] - px;
    const dy = projected[i + 1] - py;
    const d = dx * dx + dy * dy;
    if (d <= bestD) { bestD = d; best = k; }
  }
  return best;
}

/** Top-left of a label `width` px wide for a point at (x, y): 14 px right, 28 px up, 8 px inside the viewport. */
export function labelPosition(x: number, y: number, vw: number, width: number): [number, number] {
  return [Math.min(Math.max(8, x + 14), vw - width - 8), Math.max(8, y - 28)];
}
