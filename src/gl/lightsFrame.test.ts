import { describe, it, expect } from 'vitest';
import { EMITTERS } from '@/valley/lights';
import { ignitionLevel } from '@/valley/ignition';
import { timelineAt } from '@/valley/timeline';
import { EMITTER_INDEX } from './projection';
import { createUniforms } from './driverCore';
import { stepFor } from './chain';
import { applyLights } from './lightsFrame';
import { fixtureInputs, fixtureRanges, gAt } from './frameFixture';

const ranges = fixtureRanges();
const fresh = () => ({ u: createUniforms(), lit: new Float32Array(EMITTERS.length), latched: { ridge: 0, hedge: 0 } });

describe('applyLights: ignition (spec §5.3)', () => {
  it('lights the hut from the schedule mid-chain and nothing ahead of it', () => {
    const { u, lit, latched } = fresh();
    const inputs = fixtureInputs(ranges, { introT: 1.0 });
    applyLights(inputs, timelineAt(inputs.g, ranges), u, lit, latched);
    expect(lit[EMITTER_INDEX.hut]).toBeCloseTo(ignitionLevel(stepFor('hut'), 1.0), 5);
    expect(lit[EMITTER_INDEX.nist]).toBe(0);
    expect(u.uRidgeLit.value).toBe(1);
  });

  it('gives final states when the chain is not playing', () => {
    const { u, lit, latched } = fresh();
    const none = fixtureInputs(ranges, { introT: null, buildT: null });
    applyLights(none, timelineAt(none.g, ranges), u, lit, latched);
    expect(lit[EMITTER_INDEX.hut]).toBe(1);
    expect(lit[EMITTER_INDEX.mill]).toBe(0);
    expect(lit[EMITTER_INDEX.visitor]).toBe(0);
    const built = fixtureInputs(ranges, { introT: null, buildT: 4.4 });
    applyLights(built, timelineAt(built.g, ranges), u, lit, latched);
    expect(lit[EMITTER_INDEX.visitor]).toBe(1);
  });
});

describe('applyLights: reveals and rain (spec §4.6, §5.1, §11)', () => {
  it('writes the latched reveals into the uniforms', () => {
    const { u, lit, latched } = fresh();
    const inputs = fixtureInputs(ranges, { g: gAt(ranges, 'heron', 0.5) });
    applyLights(inputs, timelineAt(inputs.g, ranges), u, lit, latched);
    expect(u.uRidgeReveal.value).toBe(latched.ridge);
    expect(u.uHedgeReveal.value).toBe(latched.hedge);
    expect(latched.ridge).toBe(1);
  });

  it('rains through summers, never under reduced motion', () => {
    const { u, lit, latched } = fresh();
    const inputs = fixtureInputs(ranges, { g: gAt(ranges, 'summers', 0.5) });
    const tl = timelineAt(inputs.g, ranges);
    const rain = tl.rain;
    applyLights(inputs, tl, u, lit, latched);
    expect(u.uRain.value).toBe(rain);
    expect(u.uRain.value).toBe(1);
    applyLights({ ...inputs, reducedMotion: true }, timelineAt(inputs.g, ranges), u, lit, latched);
    expect(u.uRain.value).toBe(0);
  });
});
