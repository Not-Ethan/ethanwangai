import { describe, expect, it } from 'vitest';
import { AGENT_COLOURS, agentCount, agentName, idleDrift, initialPosition, jitter } from './agents';
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
