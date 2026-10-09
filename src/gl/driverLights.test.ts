import { describe, it, expect } from 'vitest';
import { EMITTERS } from '@/valley/lights';
import { EMITTER_INDEX } from './projection';
import { REST_LIT, applyFrame, createFrameTargets } from './driverCore';
import { fixtureInputs, fixtureRanges } from './frameFixture';

const ranges = fixtureRanges();

describe('applyFrame runs the chain (spec §5.3, §7)', () => {
  it('is dark at T0, lit from the schedule, final when the chain is over', () => {
    const targets = createFrameTargets();
    applyFrame(fixtureInputs(ranges, { introT: 0 }), targets);
    for (const e of EMITTERS) if (e.id !== 'ridge') expect(targets.lit[EMITTER_INDEX[e.id]]).toBe(0);
    applyFrame(fixtureInputs(ranges, { introT: 1.0 }), targets);
    expect(targets.lit[EMITTER_INDEX.nist]).toBe(0);
    applyFrame(fixtureInputs(ranges, { introT: null }), targets);
    expect(Array.from(targets.lit)).toEqual(Array.from(REST_LIT));
  });

  it('keeps the mill dark at rest (spec §1, §4.5) and exposes the Stage 3 uniforms', () => {
    expect(REST_LIT[EMITTER_INDEX.mill]).toBe(0);
    const targets = createFrameTargets();
    expect(targets.uniforms.uRidgeLit.value).toBe(1);
    expect(targets.uniforms.uMillRows.value.x).toBe(0);
    expect(targets.uniforms.uWheelAngle.value).toBe(0);
  });
});
