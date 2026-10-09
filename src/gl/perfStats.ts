// Pure maths for the ?debug=1 overlay and the G7 verdict (spec §12, §14).
import type { Tier } from '@/valley/types';

export class FrameWindow {
  private readonly buf: Float64Array;
  private readonly capacity: number;
  private n = 0;
  private head = 0;

  constructor(capacity = 2400) {
    this.capacity = capacity;
    this.buf = new Float64Array(capacity);
  }

  push(ms: number): void {
    if (!Number.isFinite(ms) || ms < 0) return;
    this.buf[this.head] = ms;
    this.head = (this.head + 1) % this.capacity;
    if (this.n < this.capacity) this.n++;
  }

  reset(): void {
    this.n = 0;
    this.head = 0;
  }

  stats(): { frames: number; meanMs: number; p95Ms: number; maxMs: number } {
    if (this.n === 0) return { frames: 0, meanMs: 0, p95Ms: 0, maxMs: 0 };
    const vals = Array.from(this.buf.subarray(0, this.n)).sort((a, b) => a - b);
    const sum = vals.reduce((a, b) => a + b, 0);
    const p95 = vals[Math.min(vals.length - 1, Math.ceil(0.95 * vals.length) - 1)];
    return { frames: this.n, meanMs: sum / this.n, p95Ms: p95, maxMs: vals[vals.length - 1] };
  }
}

export function splitDraws(totalCalls: number, casters: number, shadowLights: number, shadowsEnabled: boolean): { main: number; shadow: number } {
  const shadow = shadowsEnabled ? casters * shadowLights : 0;
  return { main: Math.max(0, totalCalls - shadow), shadow };
}

export function drawBudget(tier: Tier, building: boolean): number {
  if (tier === 'desktop') return 18;
  return building ? 15 : 14;
}

export interface PerfSnapshot {
  tier: Tier; rung: number; dpr: number;
  frames: number; meanMs: number; p95Ms: number; maxMs: number; fps: number; renderMs: number;
  calls: number; mainDraws: number; shadowDraws: number; heapGrowthMB: number | null;
}

export function verdict(s: PerfSnapshot): { frame: boolean; draws: boolean; shadow: boolean; heap: boolean | null } {
  return {
    frame: s.meanMs < 16.7,
    draws: s.mainDraws <= drawBudget(s.tier, false),
    shadow: s.tier === 'desktop' ? s.shadowDraws <= 6 : s.shadowDraws === 0,
    heap: s.heapGrowthMB === null ? null : s.heapGrowthMB <= 2,
  };
}

export function formatOverlay(s: PerfSnapshot): string {
  const heap = s.heapGrowthMB === null ? 'n/a' : `${s.heapGrowthMB >= 0 ? '+' : ''}${s.heapGrowthMB.toFixed(1)} mb`;
  return [
    `fps ${s.fps.toFixed(1)}  mean ${s.meanMs.toFixed(2)} ms  p95 ${s.p95Ms.toFixed(2)}  max ${s.maxMs.toFixed(2)}  (${s.frames} frames)`,
    `render ${s.renderMs.toFixed(2)} ms  draws ${s.mainDraws} main + ${s.shadowDraws} shadow (${s.calls} calls)`,
    `dpr ${s.dpr}  rung ${s.rung}  tier ${s.tier}  heap ${heap}`,
  ].join('\n');
}
