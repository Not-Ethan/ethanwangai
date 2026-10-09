// The hedge lines' pure part (spec §4.4): four bowed polylines from each bar's door to the kalshi lamp, 24 segments
// each, as LineSegments vertices with the segment index per vertex for the uReveal draw.
import * as THREE from 'three';
import { PLACES } from '@/valley/layout';
import { LAMP_POST, staticWindows } from './structures';
import type { Vec3 } from '@/valley/types';

export const HEDGE_BARS = ['bar1', 'bar2', 'bar3', 'bar4'] as const;
export type HedgeBar = (typeof HEDGE_BARS)[number];
export const HEDGE_SEGMENTS = 24;
/** The lamp head: centre of the lamp's head cube on its post. */
export const HEDGE_LAMP_HEAD: Vec3 = [0, LAMP_POST.h + LAMP_POST.head / 2, 0];

/** Each bar is yawed and set back, so the door is read from the lit door pane (the 0.9 wide quad) in staticWindows(). */
export function hedgeDoor(bar: HedgeBar): Vec3 {
  const pane = staticWindows().find((w) => w.emitter === bar && w.w === 0.9);
  if (!pane) throw new Error(`no door pane for ${bar}`);
  return pane.center;
}
/** Control-point lift as a fraction of the chord: "slightly bowed". */
export const HEDGE_BOW = 0.25;

export function hedgeEnds(bar: HedgeBar): { from: Vec3; to: Vec3 } {
  const l = PLACES.kalshiLamp;
  return {
    from: hedgeDoor(bar),
    to: [l[0] + HEDGE_LAMP_HEAD[0], l[1] + HEDGE_LAMP_HEAD[1], l[2] + HEDGE_LAMP_HEAD[2]],
  };
}

/** Quadratic Bezier from `from` to `to` whose control point is the chord midpoint lifted by HEDGE_BOW · chord. */
export function hedgePoint(from: Vec3, to: Vec3, t: number): [number, number, number] {
  const chord = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const cx = (from[0] + to[0]) / 2;
  const cy = (from[1] + to[1]) / 2 + HEDGE_BOW * chord;
  const cz = (from[2] + to[2]) / 2;
  const a = (1 - t) * (1 - t);
  const b = 2 * (1 - t) * t;
  const c = t * t;
  return [a * from[0] + b * cx + c * to[0], a * from[1] + b * cy + c * to[1], a * from[2] + b * cz + c * to[2]];
}

export function buildHedgeArrays(): { positions: Float32Array; segment: Float32Array } {
  const verts = HEDGE_BARS.length * HEDGE_SEGMENTS * 2;
  const positions = new Float32Array(verts * 3);
  const segment = new Float32Array(verts);
  let v = 0;
  for (const bar of HEDGE_BARS) {
    const { from, to } = hedgeEnds(bar);
    for (let k = 0; k < HEDGE_SEGMENTS; k++) {
      positions.set(hedgePoint(from, to, k / HEDGE_SEGMENTS), v * 3);
      segment[v++] = k;
      positions.set(hedgePoint(from, to, (k + 1) / HEDGE_SEGMENTS), v * 3);
      segment[v++] = k;
    }
  }
  return { positions, segment };
}

export function buildHedgeGeometry(): THREE.BufferGeometry {
  const { positions, segment } = buildHedgeArrays();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('aSegment', new THREE.BufferAttribute(segment, 1));
  g.computeBoundingSphere();
  return g;
}
