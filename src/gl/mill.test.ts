import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { EMITTERS } from '@/valley/lights';
import { EMITTER_INDEX } from './projection';
import { stepFor } from './chain';
import {
  WHEEL_RUN, chainDarchT, millRowLevel, resolveDarchT, stepWheel, wheelSpeed, writeMill,
} from './mill';

const rows = (d: number) => [0, 1, 2, 3].map((r) => millRowLevel(r, d));

describe('mill rows (spec §4.5)', () => {
  it('is dark before and after the year', () => {
    expect(rows(0)).toEqual([0, 0, 0, 0]);
    expect(rows(1)).toEqual([0, 0, 0, 0]);
  });
  it('floods bottom-up: at 0.1 rows 0-2 are lit and row 3 is not (G4)', () => {
    expect(rows(0.1)).toEqual([1, 1, 1, 0]);
  });
  it('runs fully lit at 0.5 (G4)', () => {
    expect(rows(0.5)).toEqual([1, 1, 1, 1]);
  });
  it('goes out top-down: at 0.9 only row 0 is lit (G4)', () => {
    expect(rows(0.9)).toEqual([1, 0, 0, 0]);
  });
  it('ramps each switch over 0.01', () => {
    expect(millRowLevel(0, 0.035)).toBeCloseTo(0.5, 6);
    expect(millRowLevel(3, 0.785)).toBeCloseTo(0.5, 6);
  });
});

describe('mill wheel (spec §4.5, §11)', () => {
  it('spins up, runs at 0.5 rad/s, coasts to a stop by 1.0', () => {
    expect(wheelSpeed(0)).toBe(0);
    expect(wheelSpeed(0.075)).toBeCloseTo(WHEEL_RUN / 2, 9);
    expect(wheelSpeed(0.5)).toBe(WHEEL_RUN);
    expect(wheelSpeed(0.875)).toBeCloseTo(WHEEL_RUN / 2, 9);
    expect(wheelSpeed(1)).toBe(0);
  });
  it('integrates on wall time and holds still under reduced motion', () => {
    expect(stepWheel(1, 0.5, 1, false)).toBeCloseTo(1.5, 9);
    expect(stepWheel(1, 0.5, 1, true)).toBe(1);
  });
});

describe('darchT sources', () => {
  const mill = stepFor('mill');
  it('the chain plays the curve once over the mill step', () => {
    expect(chainDarchT(null)).toBe(0);
    expect(chainDarchT(mill.at - 0.1)).toBe(0);
    expect(chainDarchT(mill.at + mill.dur / 2)).toBeCloseTo(0.5, 9);
    expect(chainDarchT(mill.at + mill.dur + 0.1)).toBe(0);
  });
  it('override wins, then the timeline, then the chain', () => {
    expect(resolveDarchT(0.9, 0.2, mill.at + mill.dur / 2)).toBe(0.9);
    expect(resolveDarchT(1.7, 0, null)).toBe(1);
    expect(resolveDarchT(undefined, 0.2, mill.at + mill.dur / 2)).toBe(0.2);
    expect(resolveDarchT(undefined, 0, mill.at + mill.dur / 2)).toBeCloseTo(0.5, 9);
  });
});

describe('writeMill', () => {
  it('writes the rows, the mill emitter and the wheel', () => {
    const v = new THREE.Vector4();
    const wheel = { value: 0 };
    const lit = new Float32Array(EMITTERS.length);
    writeMill(0.1, 0.5, false, v, wheel, lit);
    expect([v.x, v.y, v.z, v.w]).toEqual([1, 1, 1, 0]);
    expect(lit[EMITTER_INDEX.mill]).toBe(1);
    expect(wheel.value).toBeGreaterThan(0);
    writeMill(1, 0.5, false, v, wheel, lit);
    expect(lit[EMITTER_INDEX.mill]).toBe(0);
  });
});
