import { describe, it, expect } from 'vitest';
import { EMITTERS } from '@/valley/lights';
import { timelineAt } from '@/valley/timeline';
import { EMITTER_INDEX } from './projection';
import { createUniforms } from './driverCore';
import { writeLabelAlpha } from './chain';
import { shouldPlayIntro } from './introGate';
import { applyLights } from './lightsFrame';
import { fixtureInputs, fixtureRanges, gAt } from './frameFixture';

const ranges = fixtureRanges();

describe('reduced motion for Stage 3 (spec §11)', () => {
  it('plays no chain and shows no ignition labels', () => {
    expect(shouldPlayIntro({ reducedMotion: true, introPlayed: false, still: { still: false, g: null, t: null } })).toBe(false);
    const out = new Float32Array(EMITTERS.length).fill(1);
    writeLabelAlpha(null, out);
    for (const v of out) expect(v).toBe(0);
  });

  it('has no rain and a still wheel while the mill still follows the scroll', () => {
    const u = createUniforms();
    const lit = new Float32Array(EMITTERS.length);
    const latched = { ridge: 0, hedge: 0 };
    const inputs = fixtureInputs(ranges, { g: gAt(ranges, 'darch', 0.5), reducedMotion: true });
    for (let f = 0; f < 60; f++) applyLights(inputs, timelineAt(inputs.g, ranges), u, lit, latched);
    expect(u.uRain.value).toBe(0);
    expect(u.uWheelAngle.value).toBe(0);
    expect(u.uMillRows.value.x).toBe(1);
    expect(lit[EMITTER_INDEX.mill]).toBe(1);
  });

  it('cuts the ridge and hedge reveals to whole on arrival', () => {
    const u = createUniforms();
    const lit = new Float32Array(EMITTERS.length);
    const latched = { ridge: 0, hedge: 0 };
    const kalshi = fixtureInputs(ranges, { g: gAt(ranges, 'kalshi', 0.05), reducedMotion: true });
    applyLights(kalshi, timelineAt(kalshi.g, ranges), u, lit, latched);
    expect(u.uRidgeReveal.value).toBe(1);
    expect(u.uHedgeReveal.value).toBe(0);
    const heron = fixtureInputs(ranges, { g: gAt(ranges, 'heron', 0.05), reducedMotion: true });
    applyLights(heron, timelineAt(heron.g, ranges), u, lit, latched);
    expect(u.uHedgeReveal.value).toBe(1);
  });

  it('makes the pulse a single 300 ms brightening', () => {
    const u = createUniforms();
    const lit = new Float32Array(EMITTERS.length);
    const hutAt = (pulseT: number) => {
      const inputs = fixtureInputs(ranges, { pulseT, reducedMotion: true });
      applyLights(inputs, timelineAt(0, ranges), u, lit, { ridge: 0, hedge: 0 });
      return lit[EMITTER_INDEX.hut];
    };
    expect(hutAt(0.15)).toBeCloseTo(1.6, 5);
    expect(hutAt(0.31)).toBe(1);
    expect(hutAt(1.0)).toBe(1);
  });
});
