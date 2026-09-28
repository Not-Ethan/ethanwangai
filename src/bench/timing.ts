// All seconds unless noted; compile units are 0..1 of uCompile.
export const TIMING = {
  heroCompileS: 2.2, lock0: 0.34, lockSpan: 0.59, lockW: 0.06, inkFlight: 0.6, band: [0.28, 0.62],
  leverAngleRad: Math.PI / 6, runDampS: 0.25, impulse: 0.6, impulseDecayS: 0.4, rateSpikeS: 1.0,
  visitorCompileS: 1.4, visitorTeardownS: 0.6, rebuildOfferAfterS: 60,
  capFlip: { toRad: 1.08 * Math.PI, upS: 0.12, holdS: 0.3, downS: 0.2 },
  heroGuardU: 0.15,        // section 0 local u where the camera rise begins
} as const;

export function lockStart(birth: number): number {
  return TIMING.lock0 + birth * TIMING.lockSpan;
}
export function lockEnd(birth: number): number {
  return lockStart(birth) + TIMING.lockW;
}
export function inkDepart(targetBirth: number): number {
  return Math.max(0, lockStart(targetBirth) + TIMING.lockW / 2 - TIMING.inkFlight);
}
export function inkLand(targetBirth: number): number {
  return lockStart(targetBirth) + TIMING.lockW / 2;
}
