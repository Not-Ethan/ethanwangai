// Scrubbed time (spec §3, §5.1): document progress g → time of day, view offsets and the scrubbed reveals.
// Pure and latch-free: the same g always gives the same values; the driver (src/gl/driverCore.ts) latches
// ridgeReveal and hedgeReveal and fires the pulse on pulseArm's rising edge.
import type { SectionId, SectionRange, Timeline, View } from './types';
import { SECTIONS, locate } from './sections';

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** easeInOut used by §4.6 and §5.1: cubic smoothstep on [0, 1]. */
export const easeInOut = (t: number) => { const u = clamp01(t); return u * u * (3 - 2 * u); };

/** Views ease toward the next section's over the last 25% of each section (§3). */
export const VIEW_EASE_FROM = 0.75;

/** The one Timeline object timelineAt writes into and returns (no allocation per frame). */
const OUT: Timeline = {
  tod: 0, section: 'open', s: 0, view: { yaw: 0, pitch: 0, fovScale: 1 },
  ridgeReveal: 0.01, hedgeReveal: 0, darchT: 0, rain: 0, pulseArm: false,
};

const ORDER: Record<SectionId, number> = Object.fromEntries(SECTIONS.map((s, i) => [s.id, i])) as Record<SectionId, number>;

/**
 * Timeline at document progress `g` (clamped to [0, 1]) for the measured section `ranges`.
 * `portrait` (aspect < 1) picks each section's viewPortrait (its own yaw; same pitch and fovScale).
 * Allocation-free: returns the same object every call, overwritten in place. Read it now; copy it to keep it.
 */
export function timelineAt(g: number, ranges: SectionRange[], portrait = false): Timeline {
  const gc = Number.isFinite(g) ? clamp01(g) : 0;
  const { section, s, index } = locate(gc, ranges);
  const def = SECTIONS[index];
  const todStart = index === 0 ? 0 : SECTIONS[index - 1].todEnd;
  const tod = lerp(todStart, def.todEnd, s);

  const here: View = portrait ? def.viewPortrait : def.view;
  const nextDef = SECTIONS[Math.min(index + 1, SECTIONS.length - 1)];
  const next: View = portrait ? nextDef.viewPortrait : nextDef.view;
  const k = s <= VIEW_EASE_FROM ? 0 : easeInOut((s - VIEW_EASE_FROM) / (1 - VIEW_EASE_FROM));
  OUT.view.yaw = lerp(here.yaw, next.yaw, k);
  OUT.view.pitch = lerp(here.pitch, next.pitch, k);
  OUT.view.fovScale = lerp(here.fovScale, next.fovScale, k);

  const at = ORDER[section];
  const phase = (id: SectionId) => (at < ORDER[id] ? -1 : at > ORDER[id] ? 1 : 0);
  const kalshi = phase('kalshi'), heron = phase('heron'), darch = phase('darch');
  OUT.ridgeReveal = kalshi < 0 ? 0.01 : kalshi > 0 ? 1 : 0.01 + 0.99 * easeInOut(s);
  OUT.hedgeReveal = heron < 0 ? 0 : heron > 0 ? 1 : s;
  OUT.darchT = darch < 0 ? 0 : darch > 0 ? 1 : s;

  let rain = 0;
  if (section === 'darch') rain = clamp01(s / 0.3);
  else if (section === 'summers') rain = 1;
  else if (section === 'alive') rain = 1 - clamp01(s / 0.4);

  OUT.tod = tod;
  OUT.section = section;
  OUT.s = s;
  OUT.rain = rain;
  OUT.pulseArm = section === 'alive';
  return OUT;
}
