import { describe, it, expect } from 'vitest';
import { EMITTERS } from '@/valley/lights';
import { CHAIN_END, ignitionLevel, ignitionSchedule } from '@/valley/ignition';
import type { EmitterId } from '@/valley/types';
import { LABEL_ANCHORS } from '@/site/labelItems';
import { EMITTER_INDEX } from './projection';
import {
  LABEL_FADE_IN, LABEL_FADE_OUT, LABEL_HOLD, labelAlpha, labelTiming, stepFor, writeChainLevels, writeLabelAlpha,
} from './chain';

const fresh = () => new Float32Array(EMITTERS.length);

describe('writeChainLevels (spec §5.3)', () => {
  it('final state: everything lit but the mill; the visitor only with a house', () => {
    const lit = fresh();
    writeChainLevels(null, false, lit);
    for (const e of EMITTERS) {
      expect(lit[EMITTER_INDEX[e.id]]).toBe(e.id === 'mill' || e.id === 'visitor' ? 0 : 1);
    }
    writeChainLevels(null, true, lit);
    expect(lit[EMITTER_INDEX.visitor]).toBe(1);
  });

  it('is dark at T0 except the ridge emitter, whose reveal is still 0', () => {
    const lit = fresh();
    writeChainLevels(0, true, lit);
    for (const e of EMITTERS) expect(lit[EMITTER_INDEX[e.id]]).toBe(e.id === 'ridge' ? 1 : 0);
  });

  it('follows ignitionLevel for every scheduled target at the G2 times', () => {
    const lit = fresh();
    for (const t of [1.0, 1.9, 2.6, 3.2, 3.7, 5.0]) {
      writeChainLevels(t, true, lit);
      for (const step of ignitionSchedule()) {
        if (step.target === 'ridge') continue;
        if (step.target === 'visitor') continue;
        expect(lit[EMITTER_INDEX[step.target]]).toBeCloseTo(ignitionLevel(step, t), 5);
      }
    }
  });

  it('catches in build order: hut, nist, mill, kalshiLamp, wvu, bar1', () => {
    const lit = fresh();
    const firstLit = (id: EmitterId): number => {
      for (let ms = 0; ms <= CHAIN_END * 1000; ms++) {
        writeChainLevels(ms / 1000, true, lit);
        if (lit[EMITTER_INDEX[id]] > 0) return ms;
      }
      return Number.POSITIVE_INFINITY;
    };
    const times = (['hut', 'nist', 'mill', 'kalshiLamp', 'wvu', 'bar1'] as EmitterId[]).map(firstLit);
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThan(times[i - 1]);
  });
});

describe('ignition labels (spec §3.1 · 01, §14 G2)', () => {
  const anchors = Object.values(LABEL_ANCHORS) as EmitterId[];

  it('times the bars and hillside labels from the first light of their group', () => {
    expect(labelTiming('bar2')).toBe('bar1');
    expect(labelTiming('hill2')).toBe('hill1');
    expect(labelTiming('hut')).toBe('hut');
  });

  it('fades in over 0.2 s, holds to 1.6 s, fades out over 0.4 s', () => {
    for (const a of anchors) {
      const at = stepFor(labelTiming(a)).at;
      expect(labelAlpha(a, at - 0.01)).toBe(0);
      expect(labelAlpha(a, at + LABEL_FADE_IN / 2)).toBeCloseTo(0.5, 6);
      expect(labelAlpha(a, at + 1.0)).toBe(1);
      expect(labelAlpha(a, at + LABEL_HOLD + LABEL_FADE_OUT / 2)).toBeCloseTo(0.5, 6);
      expect(labelAlpha(a, at + LABEL_HOLD + LABEL_FADE_OUT + 0.001)).toBe(0);
    }
  });

  it('writes only the anchors, nothing when the chain is not playing, nothing by 7 s', () => {
    const out = fresh();
    writeLabelAlpha(stepFor('hut').at + 1.0, out);
    expect(out[EMITTER_INDEX.hut]).toBe(1);
    expect(out[EMITTER_INDEX.ridge]).toBe(0);
    expect(out[EMITTER_INDEX.bar1]).toBe(0);
    writeLabelAlpha(null, out);
    for (const v of out) expect(v).toBe(0);
    writeLabelAlpha(7.0, out);
    for (const v of out) expect(v).toBe(0);
  });
});
