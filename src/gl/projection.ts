// Emitter projection (spec §6 Driver and Labels, §12 "projected labels off-screen writing huge transforms").
// Pure arithmetic on a camera's two matrices. It imports nothing from three at runtime, so the DOM labels
// (src/site/Labels.tsx) can read PROJECTED without pulling three into the site chunk. Allocation-free per call.
import type { EmitterId } from '@/valley/types';
import { EMITTERS } from '@/valley/lights';

export const EMITTER_COUNT = EMITTERS.length;

export const EMITTER_INDEX: Readonly<Record<EmitterId, number>> = Object.fromEntries(
  EMITTERS.map((e, i) => [e.id, i]),
) as Record<EmitterId, number>;

/** x, y, z per emitter in EMITTERS order: the anchor every label and hit test projects. */
export const EMITTER_POSITIONS: Float32Array = Float32Array.from(
  EMITTERS.flatMap((e) => [e.position[0], e.position[1], e.position[2]]),
);

/** The driver writes NDC x, NDC y and visible (1 or 0) per emitter here every frame; Labels reads it. */
export const PROJECTED = new Float32Array(EMITTER_COUNT * 3);

/** Label opacity per emitter, 0..1. All 0 in Stage 2; Stage 3's ignition writes it. */
export const LABEL_ALPHA = new Float32Array(EMITTER_COUNT);

export interface ProjectionCamera {
  matrixWorldInverse: { elements: ArrayLike<number> };
  projectionMatrix: { elements: ArrayLike<number> };
}

/**
 * Projects every xyz triple in `positions` through the camera into `out` as NDC x, NDC y, visible. A point behind the
 * camera (clip w <= 0) is written as 0, 0, 0. Visible means inside the NDC square. The caller must have run
 * camera.updateMatrixWorld() this frame so matrixWorldInverse is current.
 */
export function projectEmitters(camera: ProjectionCamera, positions: Float32Array, out: Float32Array): void {
  const v = camera.matrixWorldInverse.elements;
  const p = camera.projectionMatrix.elements;
  const n = Math.floor(Math.min(positions.length, out.length) / 3);
  for (let i = 0; i < n; i++) {
    const o = i * 3;
    const x = positions[o];
    const y = positions[o + 1];
    const z = positions[o + 2];
    const vx = v[0] * x + v[4] * y + v[8] * z + v[12];
    const vy = v[1] * x + v[5] * y + v[9] * z + v[13];
    const vz = v[2] * x + v[6] * y + v[10] * z + v[14];
    const cx = p[0] * vx + p[4] * vy + p[8] * vz + p[12];
    const cy = p[1] * vx + p[5] * vy + p[9] * vz + p[13];
    const cw = p[3] * vx + p[7] * vy + p[11] * vz + p[15];
    if (!(cw > 1e-6)) {
      out[o] = 0;
      out[o + 1] = 0;
      out[o + 2] = 0;
      continue;
    }
    const nx = cx / cw;
    const ny = cy / cw;
    out[o] = nx;
    out[o + 1] = ny;
    out[o + 2] = nx >= -1 && nx <= 1 && ny >= -1 && ny <= 1 ? 1 : 0;
  }
}

export interface LabelPlacement { x: number; y: number; visible: boolean }

/**
 * Emitter i's label box, top-left in CSS pixels. The box starts 10 px right of the anchor, or ends 10 px left of it when
 * that would pass vw - margin; its top sits 6 px above the anchor. Both axes are clamped so the whole box stays inside
 * [margin, size - margin] (labelW and labelH default to 0, which clamps the point only). Hidden when the projection
 * flags it invisible, when either coordinate is not finite, or when i is out of range: a label never receives a huge or
 * NaN transform (spec §12).
 */
/** A screen rectangle in CSS px that labels keep clear of (the hero copy block while the chain plays). */
export interface AvoidRect { left: number; top: number; right: number; bottom: number }

export function placeLabel(
  projected: Float32Array, i: number, vw: number, vh: number, margin: number, out: LabelPlacement,
  labelW = 0, labelH = 0, avoid: AvoidRect | null = null,
): LabelPlacement {
  const o = i * 3;
  const nx = projected[o];
  const ny = projected[o + 1];
  if (!(projected[o + 2] >= 0.5) || !Number.isFinite(nx) || !Number.isFinite(ny)) {
    out.visible = false;
    return out;
  }
  const ax = ((nx + 1) / 2) * vw;
  const ay = ((1 - ny) / 2) * vh;
  let x = ax + 10;
  if (x + labelW > vw - margin) x = ax - 10 - labelW;
  out.x = Math.max(margin, Math.min(vw - margin - labelW, x));
  const h = labelH > 0 ? labelH : 14;
  let y = ay - h - 22;   // clearly above the light, never across its window
  if (avoid && out.x < avoid.right && out.x + labelW > avoid.left && y < avoid.bottom && y + h > avoid.top) {
    // the box would print over the copy: drop it just under the copy block (the light itself may sit under the copy)
    y = avoid.bottom + 6;
  }
  out.y = Math.max(margin, Math.min(vh - margin - h, y));
  out.visible = true;
  return out;
}
