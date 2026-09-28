import { describe, it, expect } from 'vitest';
import { layout } from './layout';
import { KIND, MACHINE, PRIMITIVE, type MachineConfig, type PartSpec } from './types';
import { IDENTITY_Q } from './math';
import { lockStart, lockEnd, inkDepart, inkLand, TIMING } from './timing';

const fake: MachineConfig = {
  id: MACHINE.balance, name: 'fake', footprint: { w: 2, d: 1 },
  build: () => {
    const parts: PartSpec[] = [];
    for (let i = 0; i < 4; i++) parts.push({ primitive: PRIMITIVE.bar, kind: KIND.static, position: [i, 0, 0], quaternion: IDENTITY_Q, scale: [1, 1, 1], param: [0, 0, 0, 0], col: -1, module: 'frame', group: 0, explodeMode: 'module' });
    for (let i = 0; i < 6; i++) parts.push({ primitive: PRIMITIVE.cell, kind: KIND.cell, position: [i * 0.2, 0, 1], quaternion: IDENTITY_Q, scale: [0.2, 0.4, 0.2], param: [i, 0, 0.5, 0], col: i, module: 'bed', group: 1, explodeMode: 'rise' });
    parts.push({ primitive: PRIMITIVE.bar, kind: KIND.lever, position: [0, 1, 0], quaternion: IDENTITY_Q, scale: [1, 1, 1], param: [0, 0, 0, 0], col: -1, module: 'lever', group: 2, explodeMode: 'module' });
    return parts;
  },
};

describe('layout', () => {
  const a = layout({ tier: 'desktop', seed: 42, configs: [fake] });
  const b = layout({ tier: 'desktop', seed: 42, configs: [fake] });
  it('is deterministic', () => { expect(a).toEqual(b); });
  it('assigns birth by group span, lever exactly 1 and last', () => {
    const lever = a.parts.find((p) => p.kind === KIND.lever)!;
    expect(lever.birth).toBe(1);
    const others = a.parts.filter((p) => p !== lever);
    others.forEach((p) => expect(p.birth).toBeLessThan(1));
    const frame = a.parts.filter((p) => p.module === 'frame').map((p) => p.birth);
    const bed = a.parts.filter((p) => p.module === 'bed').map((p) => p.birth);
    expect(Math.max(...frame)).toBeLessThan(Math.min(...bed));
  });
  it('rise parts have zero explode; module parts explode 0.6–1.4 units axis-aligned', () => {
    a.parts.filter((p) => p.explodeMode === 'rise').forEach((p) => expect(p.explode).toEqual([0, 0, 0]));
    a.parts.filter((p) => p.explodeMode === 'module' && p.kind !== KIND.lever).forEach((p) => {
      const nz = p.explode.filter((v) => v !== 0);
      expect(nz).toHaveLength(1);
      expect(Math.abs(nz[0])).toBeGreaterThanOrEqual(0.6);
      expect(Math.abs(nz[0])).toBeLessThanOrEqual(1.4);
    });
  });
  it('places parts in bench space using PLACEMENT and fills summaries and counts', () => {
    expect(a.counts.total).toBe(11);
    expect(a.counts.byMachine[MACHINE.balance]).toBe(11);
    expect(a.byPrimitive[PRIMITIVE.cell]).toHaveLength(6);
    expect(a.byPrimitive[PRIMITIVE.bar]).toHaveLength(5);
    const m = a.machines[MACHINE.balance];
    expect(m.count).toBe(11);
    expect(m.min[0]).toBeLessThanOrEqual(m.centroid[0]); expect(m.max[0]).toBeGreaterThanOrEqual(m.centroid[0]);
  });
  it('emits leader lines only for module parts of quoter and intake', () => {
    expect(a.leaderLines).toHaveLength(0); // fake is the balance
  });
  it('timing helpers are consistent', () => {
    expect(lockStart(0)).toBe(TIMING.lock0);
    expect(lockEnd(1)).toBeCloseTo(TIMING.lock0 + TIMING.lockSpan + TIMING.lockW);
    expect(inkLand(0.5)).toBeGreaterThan(inkDepart(0.5));
    expect(inkDepart(0)).toBe(0);
  });
});
