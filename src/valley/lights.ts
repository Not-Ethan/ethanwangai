// The emitter registry (spec §4.8, §5.6). A light means Ethan built the thing and people used it; nothing else glows.
// EMITTERS order is the order of every per-emitter typed array (driverCore's `lit`, `projected`).
import type { Emitter, EmitterId, Vec3 } from './types';
import { PALETTE } from './palette';
import { PLACES, RIDGE } from './layout';
import { heightAt } from './terrain';

/** Light height above the ground for an emitter standing at `p` (window or lamp-head height). */
const above = (p: Vec3, dy: number): Vec3 => [p[0], p[1] + dy, p[2]];
const ridgeMidX = (RIDGE.x0 + RIDGE.x1) / 2;   // 2

const W = PALETTE.warm;

export const EMITTERS: readonly Emitter[] = [
  { id: 'hut', position: above(PLACES.hut, 1.4), color: W, size: 2.2, meaning: 'discord bots' },
  { id: 'nist', position: above(PLACES.nist, 1.3), color: W, size: 2.0, meaning: 'nist help-desk assistant' },
  { id: 'wvu', position: above(PLACES.wvu, 1.3), color: W, size: 2.0, meaning: 'wvu medicine claims model' },
  { id: 'kalshiLamp', position: above(PLACES.kalshiLamp, 1.2), color: PALETTE.lamp, size: 2.0, meaning: 'kalshi, the market' },
  { id: 'bar1', position: above(PLACES.bar1, 1.6), color: W, size: 2.4, meaning: 'heron' },
  { id: 'bar2', position: above(PLACES.bar2, 1.6), color: W, size: 2.4, meaning: 'heron' },
  { id: 'bar3', position: above(PLACES.bar3, 1.6), color: W, size: 2.4, meaning: 'heron' },
  { id: 'bar4', position: above(PLACES.bar4, 1.6), color: W, size: 2.4, meaning: 'heron' },
  { id: 'mill', position: above(PLACES.mill, 2.2), color: PALETTE.millWindow, size: 3.2, meaning: 'darch' },
  { id: 'ridge', position: [ridgeMidX, heightAt(ridgeMidX, RIDGE.z) + 2, RIDGE.z], color: PALETTE.ridge, size: 1.0, meaning: 'kalshi trades' },
  { id: 'hill1', position: above(PLACES.hill1, 0.45), color: W, size: 1.0, meaning: 'hillside: a discord bot' },
  { id: 'hill2', position: above(PLACES.hill2, 0.45), color: W, size: 1.0, meaning: 'hillside: the kalshi algorithm' },
  { id: 'hill3', position: above(PLACES.hill3, 0.45), color: W, size: 1.0, meaning: 'hillside: the darch pipeline' },
  { id: 'hill4', position: above(PLACES.hill4, 0.45), color: W, size: 1.0, meaning: 'hillside: the help-desk assistant' },
  { id: 'hill5', position: above(PLACES.hill5, 0.45), color: W, size: 1.0, meaning: 'hillside: the heron pricing model' },
  { id: 'visitor', position: above(PLACES.lot, 1.5), color: W, size: 2.2, meaning: "the visitor's sentence" },
];

/** Index of each emitter in EMITTERS (and in every per-emitter typed array). */
export const EMITTER_INDEX: Record<EmitterId, number> = Object.fromEntries(EMITTERS.map((e, i) => [e.id, i])) as Record<EmitterId, number>;

/** The order Ethan built things in (§5.6); the thesis pulse walks it. The mill is not in it: darch ended. */
export const BUILD_ORDER: readonly EmitterId[] = [
  'hut', 'nist', 'kalshiLamp', 'wvu', 'bar1', 'bar2', 'bar3', 'bar4',
  'hill1', 'hill2', 'hill3', 'hill4', 'hill5', 'visitor', 'ridge',
];

export const PULSE = { wave: 1.2, each: 0.4, peak: 1.6 } as const;

const pulse = Object.fromEntries(EMITTERS.map((e) => [e.id, 1])) as Record<EmitterId, number>;
const STEP = (PULSE.wave - PULSE.each) / (BUILD_ORDER.length - 1);

/**
 * Thesis-pulse brightness multipliers at `t` seconds after the pulse fired (§5.6): a 1.2 s wave through BUILD_ORDER,
 * each emitter rising to 1.6× and settling back to 1× over 0.4 s. The mill is always 1. Outside [0, 1.2] every
 * value is 1. Allocation-free: returns the same object every call, overwritten in place; read it, do not keep it.
 */
export function pulseAt(t: number): Record<EmitterId, number> {
  for (let k = 0; k < BUILD_ORDER.length; k++) {
    const u = (t - k * STEP) / PULSE.each;
    pulse[BUILD_ORDER[k]] = u > 0 && u < 1 ? 1 + (PULSE.peak - 1) * Math.sin(Math.PI * u) : 1;
  }
  pulse.mill = 1;
  return pulse;
}
