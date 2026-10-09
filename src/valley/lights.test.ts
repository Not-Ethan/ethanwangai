import { describe, it, expect } from 'vitest';
import type { EmitterId } from './types';
import { EMITTERS, EMITTER_INDEX, BUILD_ORDER, PULSE, pulseAt } from './lights';
import { PLACES, RIDGE } from './layout';
import { heightAt } from './terrain';
import { PALETTE } from './palette';

const IDS: EmitterId[] = ['hut', 'nist', 'wvu', 'kalshiLamp', 'bar1', 'bar2', 'bar3', 'bar4', 'mill', 'ridge',
  'hill1', 'hill2', 'hill3', 'hill4', 'hill5', 'visitor'];

describe('EMITTERS', () => {
  it('has exactly the §4.8 ids, in order, once each, every one with a meaning', () => {
    expect(EMITTERS.map((e) => e.id)).toEqual(IDS);
    for (const e of EMITTERS) expect(e.meaning.trim().length).toBeGreaterThan(0);
    IDS.forEach((id, i) => expect(EMITTER_INDEX[id]).toBe(i));
  });
  it('stands every emitter over its layout place, 0.7 to 6 units above the ground', () => {
    const place: Record<EmitterId, readonly number[]> = {
      hut: PLACES.hut, nist: PLACES.nist, wvu: PLACES.wvu, kalshiLamp: PLACES.kalshiLamp,
      bar1: PLACES.bar1, bar2: PLACES.bar2, bar3: PLACES.bar3, bar4: PLACES.bar4, mill: PLACES.mill,
      ridge: [(RIDGE.x0 + RIDGE.x1) / 2, 0, RIDGE.z],
      hill1: PLACES.hill1, hill2: PLACES.hill2, hill3: PLACES.hill3, hill4: PLACES.hill4, hill5: PLACES.hill5,
      visitor: PLACES.lot,
    };
    for (const e of EMITTERS) {
      const [x, y, z] = e.position;
      expect([x, z]).toEqual([place[e.id][0], place[e.id][2]]);
      const lift = y - heightAt(x, z);
      expect(lift).toBeGreaterThanOrEqual(0.7 - 1e-6); expect(lift).toBeLessThanOrEqual(6);
    }
  });
  it('colours emitters only from the palette emitter colours, with a positive size', () => {
    const allowed: string[] = [PALETTE.warm, PALETTE.ridge, PALETTE.porch, PALETTE.millWindow, PALETTE.lamp];
    for (const e of EMITTERS) { expect(allowed).toContain(e.color); expect(e.size).toBeGreaterThan(0); }
    expect(EMITTERS.find((e) => e.id === 'ridge')!.color).toBe(PALETTE.ridge);
  });
});

describe('BUILD_ORDER and pulseAt', () => {
  it('walks hut, nist, kalshiLamp, wvu, bar1–4, hill1–5, visitor, ridge, without the mill', () => {
    expect(BUILD_ORDER).toEqual(['hut', 'nist', 'kalshiLamp', 'wvu', 'bar1', 'bar2', 'bar3', 'bar4',
      'hill1', 'hill2', 'hill3', 'hill4', 'hill5', 'visitor', 'ridge']);
    expect(BUILD_ORDER).not.toContain('mill');
  });
  it('is 1 everywhere before the pulse and after 1.2 s, and always 1 for the mill', () => {
    for (const t of [-1, -0.001, PULSE.wave, 2, 100]) {
      const p = pulseAt(t);
      for (const id of IDS) expect(p[id]).toBe(1);
    }
    for (let t = 0; t <= 1.2; t += 0.01) expect(pulseAt(t).mill).toBe(1);
  });
  it('lifts every built emitter to 1.6× once, in build order, never above 1.6', () => {
    const peakAt: Partial<Record<EmitterId, number>> = {};
    const peak: Partial<Record<EmitterId, number>> = {};
    for (let t = 0; t <= 1.2; t += 0.001) {
      const p = pulseAt(t);
      for (const id of BUILD_ORDER) {
        expect(p[id]).toBeLessThanOrEqual(1.6 + 1e-9);
        if (p[id] > (peak[id] ?? 0)) { peak[id] = p[id]; peakAt[id] = t; }
      }
    }
    for (const id of BUILD_ORDER) expect(peak[id]).toBeGreaterThan(1.59);
    for (let k = 1; k < BUILD_ORDER.length; k++) expect(peakAt[BUILD_ORDER[k]]!).toBeGreaterThan(peakAt[BUILD_ORDER[k - 1]]!);
    expect(peakAt.ridge!).toBeCloseTo(1.0, 2);   // last emitter peaks 0.2 s before the 1.2 s wave ends
  });
  it('returns every emitter id as a key', () => {
    expect(Object.keys(pulseAt(0.5)).sort()).toEqual([...IDS].sort());
  });
});
