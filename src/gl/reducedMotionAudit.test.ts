import { describe, it, expect } from 'vitest';
import { SECTIONS, sectionRanges } from '@/valley/sections';
import { timelineAt } from '@/valley/timeline';
import { EMITTERS } from '@/valley/lights';
import { CHAIN_END } from '@/valley/ignition';
import { BUILD_SECONDS } from '@/valley/build';
import type { SectionRange, View } from '@/valley/types';
import { applyFrame, buildTAt, createFrameTargets, startBuild, type BuildClock, type FrameInputs, type FrameTargets } from './driverCore';
import { introClock, shouldPlayIntro } from './introGate';
import { REDUCED_PULSE_S, reducedPulse } from './pulse';
import { cutView } from './motion';

const VH = 900;
function ranges(): SectionRange[] {
  const tops: number[] = [];
  let y = 0;
  for (const s of SECTIONS) { tops.push(y); y += (s.heightVh / 100) * VH; }
  return sectionRanges(tops, y, VH);
}
const R = ranges();
const gAt = (id: string, s: number) => { const r = R.find((x) => x.id === id)!; return r.start + s * (r.end - r.start); };
const idx = (id: string) => EMITTERS.findIndex((e) => e.id === id);

function inputs(over: Partial<FrameInputs>): FrameInputs {
  return { g: 0, ranges: R, t: 10, dt: 1 / 60, introT: CHAIN_END + 10, buildT: null, pulseT: null, flickerT: null, reducedMotion: true, ...over };
}

/** Every number the driver writes: uniform values (numbers, booleans, vectors and colours), lit, projected, latches. */
function snapshot(targets: FrameTargets): number[] {
  const out: number[] = [];
  for (const u of Object.values(targets.uniforms as unknown as Record<string, { value: unknown }>)) {
    const v = u.value;
    if (typeof v === 'number') out.push(v);
    else if (typeof v === 'boolean') out.push(v ? 1 : 0);
    else if (v !== null && typeof v === 'object' && typeof (v as { toArray?: unknown }).toArray === 'function') {
      out.push(...(v as { toArray(): number[] }).toArray());
    }
  }
  out.push(...targets.lit, ...targets.projected, targets.latched.ridge, targets.latched.hedge);
  return out;
}

function run(over: Partial<FrameInputs>, frames: number, targets = createFrameTargets()): FrameTargets {
  const inp = inputs(over);
  for (let i = 0; i < frames; i++) { applyFrame(inp, targets); inp.t += inp.dt; }
  return targets;
}

describe('reduced motion: ambient time is frozen (river, mist, wheel, stars; spec §8, §11)', () => {
  for (const [id, s] of [['open', 0.5], ['darch', 0.5], ['alive', 0.5], ['contact', 0.9]] as const) {
    it(`nothing the driver writes changes over 5 s at a fixed scroll in ${id}`, () => {
      const targets = createFrameTargets();
      const inp = inputs({ g: gAt(id, s) });
      applyFrame(inp, targets);
      const before = snapshot(targets);
      for (let i = 0; i < 300; i++) { inp.t += inp.dt; applyFrame(inp, targets); }
      expect(snapshot(targets)).toEqual(before);
    });
  }

  it('without reduced motion the same 5 s does move something (the test can see ambient time)', () => {
    const targets = createFrameTargets();
    const inp = inputs({ g: gAt('darch', 0.5), reducedMotion: false });
    applyFrame(inp, targets);
    const before = snapshot(targets);
    for (let i = 0; i < 300; i++) { inp.t += inp.dt; applyFrame(inp, targets); }
    expect(snapshot(targets)).not.toEqual(before);
  });
});

describe('reduced motion: no chain, final states at T0 (spec §5.3), through Stage 3\'s gate', () => {
  it('the gate never plays the chain, so the driver sees introT null: the finished state', () => {
    const still = { still: false, g: null, t: null };
    const play = shouldPlayIntro({ reducedMotion: true, introPlayed: false, still });
    expect(play).toBe(false);
    const introT = introClock(play, 10, 10.2, null);
    expect(introT).toBeNull();
    const reduced = run({ g: gAt('open', 0.1), introT, reducedMotion: true }, 1);
    const finished = run({ g: gAt('open', 0.1), introT: CHAIN_END + 10, reducedMotion: false }, 1);
    expect(Array.from(reduced.lit)).toEqual(Array.from(finished.lit));
    expect(reduced.latched).toEqual(finished.latched);
    expect(reduced.lit[idx('hut')]).toBeGreaterThan(0);
  });
});

describe('reduced motion: the house appears built, no scaffolding (spec §11), through Stage 4\'s clock', () => {
  it('0.1 s after Enter the build clock is already past the build, and the visitor light is final', () => {
    const clock: BuildClock = { start: null };   // Stage 4 Task 4.5's BuildClock
    startBuild(clock, 20, false, true);
    const buildT = buildTAt(clock, 20.1);
    expect(buildT).not.toBeNull();
    expect(buildT!).toBeGreaterThanOrEqual(BUILD_SECONDS);   // past the build: the scaffold never mounts
    const reduced = run({ g: gAt('yours', 0.5), buildT, reducedMotion: true }, 1);
    const built = run({ g: gAt('yours', 0.5), buildT: 10, reducedMotion: false }, 1);
    expect(built.lit[idx('visitor')]).toBeGreaterThan(0);
    expect(reduced.lit[idx('visitor')]).toBeCloseTo(built.lit[idx('visitor')], 6);
  });
});

describe('reduced motion: the pulse is one 300 ms brightening (spec §11), Stage 3\'s reducedPulse', () => {
  it('reducedPulse peaks at 1.6 at 150 ms and is 1 outside the 300 ms', () => {
    expect(REDUCED_PULSE_S).toBe(0.3);
    expect(reducedPulse(-0.1)).toBe(1);
    expect(reducedPulse(0.15)).toBeCloseTo(1.6, 6);
    expect(reducedPulse(0.05)).toBeGreaterThan(1);
    expect(reducedPulse(0.05)).toBeLessThan(1.6);
    expect(reducedPulse(0.3)).toBe(1);
  });

  it('every lit emitter brightens at once (no wave), the mill does not', () => {
    const g = gAt('alive', 0.5);
    const base = run({ g, pulseT: null }, 1);
    const peak = run({ g, pulseT: 0.15 }, 1);
    const after = run({ g, pulseT: 0.35 }, 1);
    for (const id of ['hut', 'bar4', 'hill5'] as const) {
      expect(peak.lit[idx(id)], id).toBeCloseTo(base.lit[idx(id)] * 1.6, 5);
      expect(after.lit[idx(id)], id).toBeCloseTo(base.lit[idx(id)], 6);
    }
    expect(peak.lit[idx('mill')]).toBeCloseTo(base.lit[idx('mill')], 6);
  });
});

describe('reduced motion: view offsets cut at section boundaries (spec §11)', () => {
  it('cutView holds each section\'s own view through its last 25%, where timelineAt eases', () => {
    const out: View = { yaw: 0, pitch: 0, fovScale: 1 };
    SECTIONS.forEach((sec, i) => {
      const g = gAt(sec.id, 0.9);
      expect(cutView(g, R, false, out), sec.id).toEqual(sec.view);
      expect(cutView(g, R, true, out), `${sec.id} portrait`).toEqual(sec.viewPortrait);
      if (i < SECTIONS.length - 1) expect(timelineAt(g, R).view, `${sec.id} eases`).not.toEqual(sec.view);
    });
  });

  it('writes into the object it is given and falls back to the first section with no ranges', () => {
    const out: View = { yaw: 9, pitch: 9, fovScale: 9 };
    expect(cutView(0.5, [], false, out)).toBe(out);
    expect(out).toEqual(SECTIONS[0].view);
  });
});
