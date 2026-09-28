export const V_MAX_PX_PER_MS = 3;

export function normalizeVelocity(pxPerMs: number): number {
  return Math.max(-1, Math.min(1, pxPerMs / V_MAX_PX_PER_MS));
}

export function deltaVelocity(prevY: number, y: number, dtMs: number): number {
  if (dtMs <= 0) return 0;
  return normalizeVelocity((y - prevY) / dtMs);
}
