export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
export const easeOutCubic = (t: number): number => 1 - (1 - clamp(t, 0, 1)) ** 3;
export const smoothstep = (t: number): number => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };
