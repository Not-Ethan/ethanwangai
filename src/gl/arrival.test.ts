import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { EMITTER_COUNT, EMITTER_INDEX } from './projection';
import { LABEL_FADE_IN, LABEL_HOLD, writeLabelAlpha } from './chain';
import { inSection } from './pulse';
import { fixtureRanges, gAt } from './frameFixture';
import { ARRIVAL_SPAN, arrivalAlpha, createArrivalGate, mergeArrivalLabels, stepArrivalGate } from './arrival';

const ranges = fixtureRanges();

describe('summers arrival labels (spec §3 row 05)', () => {
  it('fires on the rising edge into section 05 and re-arms on leaving', () => {
    const gate = createArrivalGate();
    const darch = gAt(ranges, 'darch', 0.5);
    const summers = gAt(ranges, 'summers', 0.05);
    expect(inSection(summers, ranges, 'summers')).toBe(true);
    expect(stepArrivalGate(gate, inSection(darch, ranges, 'summers'), 10)).toBeNull();
    expect(stepArrivalGate(gate, inSection(summers, ranges, 'summers'), 11)).toBe(0);
    expect(stepArrivalGate(gate, true, 12)).toBe(1);
    expect(stepArrivalGate(gate, true, 11 + ARRIVAL_SPAN + 0.01)).toBeNull();
    expect(stepArrivalGate(gate, false, 20)).toBeNull();
    expect(stepArrivalGate(gate, true, 21)).toBe(0);
  });

  it('a reader already inside at the first frame counts as arriving', () => {
    const gate = createArrivalGate();
    expect(stepArrivalGate(gate, true, 5)).toBe(0);
  });

  it('uses the ignition label timing', () => {
    expect(arrivalAlpha(null)).toBe(0);
    expect(arrivalAlpha(LABEL_FADE_IN / 2)).toBeCloseTo(0.5, 6);
    expect(arrivalAlpha(1)).toBe(1);
    expect(arrivalAlpha(LABEL_HOLD + 0.2)).toBeCloseTo(0.5, 6);
    expect(arrivalAlpha(ARRIVAL_SPAN)).toBe(0);
  });

  it('raises only the nist and wvu labels, by max, after writeLabelAlpha', () => {
    const out = new Float32Array(EMITTER_COUNT);
    writeLabelAlpha(null, out);
    mergeArrivalLabels(1, out);
    expect(out[EMITTER_INDEX.nist]).toBe(1);
    expect(out[EMITTER_INDEX.wvu]).toBe(1);
    expect(out[EMITTER_INDEX.hut]).toBe(0);
    expect(out[EMITTER_INDEX.bar2]).toBe(0);
    out[EMITTER_INDEX.nist] = 1;
    mergeArrivalLabels(LABEL_FADE_IN / 2, out);
    expect(out[EMITTER_INDEX.nist]).toBe(1);
    expect(out[EMITTER_INDEX.wvu]).toBeCloseTo(1, 6);
    mergeArrivalLabels(null, out);
    expect(out[EMITTER_INDEX.nist]).toBe(1);
  });

  it('Driver merges the arrival labels right after writeLabelAlpha', () => {
    const s = readFileSync(new URL('./Driver.tsx', import.meta.url), 'utf8');
    const w = s.indexOf('writeLabelAlpha(inputs.introT, LABEL_ALPHA);');
    const m = s.indexOf("mergeArrivalLabels(stepArrivalGate(arrival.current, inSection(inputs.g, inputs.ranges, 'summers'), t), LABEL_ALPHA);");
    expect(w).toBeGreaterThan(-1);
    expect(m).toBeGreaterThan(w);
  });
});
