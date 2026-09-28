import type { Vec4 } from './types';
export const IDENTITY_Q: Vec4 = [0, 0, 0, 1];
export const rotX = (a: number): Vec4 => [Math.sin(a / 2), 0, 0, Math.cos(a / 2)];
export const rotY = (a: number): Vec4 => [0, Math.sin(a / 2), 0, Math.cos(a / 2)];
export const rotZ = (a: number): Vec4 => [0, 0, Math.sin(a / 2), Math.cos(a / 2)];
export function mulQuat(a: Vec4, b: Vec4): Vec4 {
  const [ax, ay, az, aw] = a, [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export function smoothstep(e0: number, e1: number, x: number) { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); }
export const expoOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const power2InOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
