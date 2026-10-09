import { describe, it, expect } from 'vitest';
import { EMITTERS, pulseAt } from '@/valley/lights';
import type { SectionRange } from '@/valley/types';
import { EMITTER_INDEX } from './projection';
import {
  PULSE_REARM_S, PULSE_SPAN, applyPulse, createPulseGate, inSection, pulseMultiplier, reducedPulse, stepPulseGate,
} from './pulse';

describe('pulse table (spec §5.6)', () => {
  it('matches pulseAt at sample points', () => {
    for (const t of [0, 0.25, 0.5, 1.0, 1.5]) {
      const m = pulseAt(t);
      EMITTERS.forEach((e, i) => expect(pulseMultiplier(i, t)).toBeCloseTo(m[e.id], 5));
    }
  });

  it('has settled back to 1 for every emitter by the end of the span', () => {
    const m = pulseAt(PULSE_SPAN);
    for (const e of EMITTERS) expect(m[e.id]).toBeCloseTo(1, 3);
    EMITTERS.forEach((_, i) => expect(pulseMultiplier(i, PULSE_SPAN)).toBe(1));
  });

  it('peaks near 1.6 and reaches the hut before the ridge (build order)', () => {
    const peak = (i: number) => {
      let best = 0;
      let at = 0;
      for (let ms = 0; ms < PULSE_SPAN * 1000; ms++) {
        const v = pulseMultiplier(i, ms / 1000);
        if (v > best) {
          best = v;
          at = ms;
        }
      }
      return { best, at };
    };
    const hut = peak(EMITTER_INDEX.hut);
    expect(hut.best).toBeCloseTo(1.6, 1);
    expect(hut.at).toBeLessThan(peak(EMITTER_INDEX.ridge).at);
  });

  it('never touches the mill', () => {
    const lit = new Float32Array(EMITTERS.length);
    for (let ms = 0; ms < 2000; ms += 10) {
      lit.fill(1);
      applyPulse(ms / 1000, false, lit);
      expect(lit[EMITTER_INDEX.mill]).toBe(1);
    }
  });

  it('is one 300 ms brightening to 1.6 under reduced motion', () => {
    expect(reducedPulse(0)).toBe(1);
    expect(reducedPulse(0.15)).toBeCloseTo(1.6, 9);
    expect(reducedPulse(0.3)).toBe(1);
    const lit = new Float32Array(EMITTERS.length).fill(1);
    applyPulse(0.15, true, lit);
    expect(lit[EMITTER_INDEX.ridge]).toBeCloseTo(1.6, 5);
    expect(lit[EMITTER_INDEX.mill]).toBe(1);
  });

  it('does nothing when no pulse is running', () => {
    const lit = new Float32Array(EMITTERS.length).fill(1);
    applyPulse(null, false, lit);
    for (const v of lit) expect(v).toBe(1);
  });
});

describe('pulse gate (spec §5.1)', () => {
  it('fires on the rising edge only, once per visit', () => {
    const gate = createPulseGate();
    expect(stepPulseGate(gate, false, 0)).toBeNull();
    expect(stepPulseGate(gate, true, 1)).toBe(0);
    expect(stepPulseGate(gate, true, 1.5)).toBeCloseTo(0.5, 9);
    expect(stepPulseGate(gate, true, 1 + PULSE_SPAN + 5)).toBeNull();
    expect(gate.firedAt).toBe(1);
  });

  it('re-arms only after 10 s out of the section', () => {
    const gate = createPulseGate();
    stepPulseGate(gate, true, 1);
    stepPulseGate(gate, false, 3);
    stepPulseGate(gate, false, 3 + PULSE_REARM_S - 1);
    expect(stepPulseGate(gate, true, 3 + PULSE_REARM_S - 0.5)).toBeNull();
    stepPulseGate(gate, false, 20);
    stepPulseGate(gate, false, 20 + PULSE_REARM_S);
    expect(stepPulseGate(gate, true, 20 + PULSE_REARM_S + 1)).toBe(0);
  });
});

describe('inSection', () => {
  const ranges: SectionRange[] = [
    { id: 'open', start: 0, end: 0.5 },
    { id: 'alive', start: 0.5, end: 0.8 },
    { id: 'contact', start: 0.8, end: 1 },
  ];
  it('owns [start, end) and the last section owns g = 1', () => {
    expect(inSection(0.5, ranges, 'alive')).toBe(true);
    expect(inSection(0.79, ranges, 'alive')).toBe(true);
    expect(inSection(0.8, ranges, 'alive')).toBe(false);
    expect(inSection(1, ranges, 'contact')).toBe(true);
    expect(inSection(0.6, [], 'alive')).toBe(false);
  });
});
