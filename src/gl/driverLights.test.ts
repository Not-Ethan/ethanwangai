import { describe, it, expect } from 'vitest';
import { EMITTERS } from '@/valley/lights';
import { timelineAt } from '@/valley/timeline';
import { EMITTER_INDEX } from './projection';
import { REST_LIT, applyFrame, createFrameTargets } from './driverCore';
import { fixtureInputs, fixtureRanges, gAt } from './frameFixture';

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

describe('latched reveals through applyFrame (Review Focus 3, spec §2)', () => {
  it('never draws the ridge backward when 02 is entered mid-chain and left again', () => {
    const targets = createFrameTargets();
    const kalshiMid = gAt(ranges, 'kalshi', 0.5);
    let prev = 0;
    for (let f = 0; f <= 420; f++) {
      const introT = f / 60;
      const g =
        f < 120 ? 0 : f < 180 ? (kalshiMid * (f - 120)) / 60 : f < 300 ? kalshiMid : (kalshiMid * (420 - f)) / 120;
      applyFrame(fixtureInputs(ranges, { g, introT, t: 10 + introT }), targets);
      expect(targets.latched.ridge).toBeGreaterThanOrEqual(prev);
      expect(targets.uniforms.uRidgeReveal.value).toBe(targets.latched.ridge);
      prev = targets.latched.ridge;
    }
    expect(prev).toBeCloseTo(timelineAt(kalshiMid, ranges).ridgeReveal, 6);
  });

  it('starts the ridge at 0 under the chain and trickles to 0.01 by its end', () => {
    const targets = createFrameTargets();
    applyFrame(fixtureInputs(ranges, { introT: 1.0 }), targets);
    expect(targets.latched.ridge).toBe(0);
    applyFrame(fixtureInputs(ranges, { introT: 5.0 }), targets);
    expect(targets.latched.ridge).toBeCloseTo(0.01, 9);
  });

  it('never un-draws the hedge lines', () => {
    const targets = createFrameTargets();
    applyFrame(fixtureInputs(ranges, { g: gAt(ranges, 'heron', 0.5) }), targets);
    const drawn = targets.latched.hedge;
    expect(drawn).toBeGreaterThan(0);
    applyFrame(fixtureInputs(ranges, { g: 0 }), targets);
    expect(targets.latched.hedge).toBe(drawn);
    expect(targets.uniforms.uHedgeReveal.value).toBe(drawn);
  });
});

describe('the mill through applyFrame (spec §4.5, §14 G4)', () => {
  // g -> s -> darchT goes through two divisions, so a row sitting exactly on its ramp end can read 0.9999...
  const expectRows = (t: ReturnType<typeof createFrameTargets>, want: number[]) => {
    const v = t.uniforms.uMillRows.value;
    [v.x, v.y, v.z, v.w].forEach((r, i) => expect(r).toBeCloseTo(want[i], 3));
  };

  it('scrubs with section 04 and relights on the way back', () => {
    const targets = createFrameTargets();
    applyFrame(fixtureInputs(ranges, { g: gAt(ranges, 'darch', 0.1) }), targets);
    expectRows(targets, [1, 1, 1, 0]);
    applyFrame(fixtureInputs(ranges, { g: gAt(ranges, 'darch', 0.9) }), targets);
    expectRows(targets, [1, 0, 0, 0]);
    applyFrame(fixtureInputs(ranges, { g: gAt(ranges, 'summers', 0.5) }), targets);
    expect(targets.lit[EMITTER_INDEX.mill]).toBe(0);
    applyFrame(fixtureInputs(ranges, { g: gAt(ranges, 'darch', 0.5) }), targets);
    expectRows(targets, [1, 1, 1, 1]);
    expect(targets.lit[EMITTER_INDEX.mill]).toBe(1);
  });

  it('floods during the hero chain and is out when it ends', () => {
    const targets = createFrameTargets();
    applyFrame(fixtureInputs(ranges, { introT: 2.6 }), targets);
    expectRows(targets, [1, 1, 1, 1]);
    applyFrame(fixtureInputs(ranges, { introT: 5.0 }), targets);
    expect(targets.lit[EMITTER_INDEX.mill]).toBe(0);
  });

  it('turns the wheel at 0.5 rad/s while running', () => {
    const targets = createFrameTargets();
    const g = gAt(ranges, 'darch', 0.5);
    for (let f = 0; f < 60; f++) applyFrame(fixtureInputs(ranges, { g, dt: 1 / 60 }), targets);
    expect(targets.uniforms.uWheelAngle.value).toBeCloseTo(0.5, 6);
  });

  it('honours darchOverride', () => {
    const targets = createFrameTargets();
    applyFrame(fixtureInputs(ranges, { g: 0, darchOverride: 0.9 }), targets);
    expectRows(targets, [1, 0, 0, 0]);
    expect(targets.uniforms.uDarchT.value).toBe(0.9);
  });
});
