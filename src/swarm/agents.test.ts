import { describe, expect, it } from 'vitest';
import { AGENT_COLOURS, IDLE_INSET, JITTER_MAX, agentCount, agentName, idleDrift, idlePose, initialPosition, jitter } from './agents';
import { mulberry32 } from './prng';

const vp = { x: 0, y: 0, w: 1440, h: 900 };

describe('agents', () => {
  it('pads names to two digits', () => {
    expect(agentName(0)).toBe('agent 01');
    expect(agentName(5)).toBe('agent 06');
    expect(agentName(9)).toBe('agent 10');
  });
  it('has six colours', () => {
    expect(AGENT_COLOURS).toHaveLength(6);
  });
  it('counts 6 at 768 and 3 at 767', () => {
    expect(agentCount(768)).toBe(6);
    expect(agentCount(767)).toBe(3);
  });
  it('starts every agent outside the viewport on its edge', () => {
    const r = mulberry32(3);
    for (let i = 0; i < 6; i++) {
      const p = initialPosition(i, vp, r);
      if (i % 3 === 0) expect(p.y).toBe(-40);
      if (i % 3 === 1) expect(p.x).toBe(-40);
      if (i % 3 === 2) expect(p.x).toBe(vp.x + vp.w + 40);
      const outside = p.x < vp.x || p.x > vp.x + vp.w || p.y < vp.y || p.y > vp.y + vp.h;
      expect(outside).toBe(true);
    }
  });
  it('keeps right-edge agents beyond the right side', () => {
    const r = mulberry32(9);
    for (const i of [2, 5]) expect(initialPosition(i, vp, r).x).toBeGreaterThan(vp.x + vp.w);
  });
  it('drift stays within 5 and 4 px', () => {
    const out = { x: 0, y: 0 };
    for (let i = 0; i < 500; i++) {
      idleDrift(i * 0.07, 1.3, out);
      expect(Math.abs(out.x)).toBeLessThanOrEqual(5);
      expect(Math.abs(out.y)).toBeLessThanOrEqual(4);
    }
  });
  it('jitter is in [0, 120)', () => {
    const r = mulberry32(5);
    for (let i = 0; i < 500; i++) {
      const j = jitter(r);
      expect(j).toBeGreaterThanOrEqual(0);
      expect(j).toBeLessThan(120);
    }
  });
});

describe('agents, pinned', () => {
  it('has the spec colours in order', () => {
    expect([...AGENT_COLOURS]).toEqual(['#2563eb', '#e5484d', '#16a34a', '#7c3aed', '#f97316', '#db2777']);
  });
  it('pins idle drift values', () => {
    const out = { x: 0, y: 0 };
    expect(idleDrift(0.6, 0, out).x).toBeCloseTo(5, 6);
    expect(idleDrift(0, 0, out).y).toBe(4);
    expect(idleDrift(1.55, 0, out).y).toBeCloseTo(-4, 6);
  });
  it('places agents on their edges', () => {
    const v = { x: 0, y: 2000, w: 1440, h: 900 };
    const r = mulberry32(11);
    const a = initialPosition(0, v, r);
    expect(a.y).toBe(1960);
    expect(a.x).toBeGreaterThanOrEqual(0);
    expect(a.x).toBeLessThanOrEqual(1440);
    const b = initialPosition(1, v, r);
    expect(b.x).toBe(-40);
    expect(b.y).toBeGreaterThanOrEqual(2000);
    expect(b.y).toBeLessThanOrEqual(2900);
    expect(initialPosition(2, v, r).x).toBe(1480);
    const draws = [0.2, 0.7];
    for (const i of [0, 1, 2]) {
      const p = initialPosition(i, v, () => draws[0]);
      const q = initialPosition(i, v, () => draws[1]);
      expect(i === 0 ? p.x !== q.x : p.y !== q.y).toBe(true);
    }
  });
  it('idlePose skips agents outside the viewport and leaves out alone', () => {
    const v = { x: 0, y: 2000, w: 1440, h: 900 };
    const out = { x: 1, y: 2 };
    for (const a of [{ x: -40, y: 2400 }, { x: 1480, y: 2400 }, { x: 700, y: 1960 }, { x: 700, y: 2940 }]) {
      expect(idlePose({ ...a, phase: 0 }, v, 0, out)).toBe(false);
    }
    expect(out).toEqual({ x: 1, y: 2 });
  });
  it('idlePose clamps inside the viewport and drifts a central agent', () => {
    const v = { x: 0, y: 2000, w: 1440, h: 900 };
    const out = { x: 0, y: 0 };
    expect(IDLE_INSET).toBe(12);
    expect(idlePose({ x: 1435, y: 2010, phase: 0 }, v, 0, out)).toBe(true);
    expect(out.x).toBe(1428);
    expect(out.y).toBeGreaterThanOrEqual(2012);
    for (let i = 0; i < 200; i++) {
      expect(idlePose({ x: 700, y: 2400, phase: 0.4 }, v, i * 0.13, out)).toBe(true);
      expect(Math.abs(out.x - 700)).toBeLessThanOrEqual(5 + 1e-9);
      expect(Math.abs(out.y - 2400)).toBeLessThanOrEqual(4 + 1e-9);
    }
  });
  it('jitter reaches near its max', () => {
    expect(JITTER_MAX).toBe(120);
    const r = mulberry32(8);
    let max = 0;
    for (let i = 0; i < 500; i++) max = Math.max(max, jitter(r));
    expect(max).toBeGreaterThan(110);
  });
});
