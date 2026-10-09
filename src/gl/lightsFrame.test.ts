import { describe, it, expect } from 'vitest';
import { EMITTERS } from '@/valley/lights';
import { ignitionLevel } from '@/valley/ignition';
import { EMITTER_INDEX } from './projection';
import { createUniforms } from './driverCore';
import { stepFor } from './chain';
import { applyLights } from './lightsFrame';
import { fixtureInputs, fixtureRanges } from './frameFixture';

const ranges = fixtureRanges();

describe('applyLights: ignition (spec §5.3)', () => {
  it('lights the hut from the schedule mid-chain and nothing ahead of it', () => {
    const u = createUniforms();
    const lit = new Float32Array(EMITTERS.length);
    applyLights(fixtureInputs(ranges, { introT: 1.0 }), u, lit);
    expect(lit[EMITTER_INDEX.hut]).toBeCloseTo(ignitionLevel(stepFor('hut'), 1.0), 5);
    expect(lit[EMITTER_INDEX.nist]).toBe(0);
    expect(u.uRidgeLit.value).toBe(1);
  });

  it('gives final states when the chain is not playing', () => {
    const u = createUniforms();
    const lit = new Float32Array(EMITTERS.length);
    applyLights(fixtureInputs(ranges, { introT: null, buildT: null }), u, lit);
    expect(lit[EMITTER_INDEX.hut]).toBe(1);
    expect(lit[EMITTER_INDEX.mill]).toBe(0);
    expect(lit[EMITTER_INDEX.visitor]).toBe(0);
    applyLights(fixtureInputs(ranges, { introT: null, buildT: 4.4 }), u, lit);
    expect(lit[EMITTER_INDEX.visitor]).toBe(1);
  });
});
