import { describe, expect, it } from 'vitest';
import { AGENT_COLOURS, IDLE_INSET, JITTER_MAX, MILL, SPAWN_IN, SPAWN_STAGGER, agentCount, agentName, idleDrift, idlePose, initialPosition, jitter, millOffset, respawnPoint, spawnPoints } from './agents';
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
  it('jitter is in [0, 240)', () => {
    const r = mulberry32(5);
    for (let i = 0; i < 500; i++) {
      const j = jitter(r);
      expect(j).toBeGreaterThanOrEqual(0);
      expect(j).toBeLessThan(240);
    }
  });
});

describe('agents, pinned', () => {
  it('has the spec colours in order', () => {
    expect([...AGENT_COLOURS]).toEqual(['#2563eb', '#dc2626', '#15803d', '#7c3aed', '#c2410c', '#db2777']);
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
    expect(JITTER_MAX).toBe(240);
    const r = mulberry32(8);
    let max = 0;
    for (let i = 0; i < 500; i++) max = Math.max(max, jitter(r));
    expect(max).toBeGreaterThan(110);
  });
});

describe('respawnPoint', () => {
  const v = { x: 0, y: 2000, w: 1440, h: 900 };
  it('uses the side edge for a target well below the top', () => {
    for (let s = 1; s <= 20; s++) {
      const l = respawnPoint({ x: 300, y: 2200 }, v, mulberry32(s));
      expect(l.x).toBeLessThanOrEqual(-40); expect(l.x).toBeGreaterThanOrEqual(-200);
      expect(Math.abs(l.y - 2200)).toBeLessThanOrEqual(150);
      const r = respawnPoint({ x: 1300, y: 2400 }, v, mulberry32(s));
      expect(r.x).toBeGreaterThanOrEqual(1480); expect(r.x).toBeLessThanOrEqual(1640);
      expect(Math.abs(r.y - 2400)).toBeLessThanOrEqual(150);
    }
  });
  it('uses the top edge for a target near the top', () => {
    const ys = new Set<number>();
    for (let s = 1; s <= 20; s++) {
      const p = respawnPoint({ x: 700, y: 2020 }, v, mulberry32(s));
      expect(p.y).toBeLessThanOrEqual(1960); expect(p.y).toBeGreaterThanOrEqual(1800);
      expect(Math.abs(p.x - 700)).toBeLessThanOrEqual(150);
      ys.add(p.y);
    }
    expect(ys.size).toBeGreaterThan(5);
  });
});

describe('spawn beat', () => {
  it('places 6 points in the band, 110 px apart, deterministically', () => {
    for (const seed of [1, 2026, 77]) {
      const pts = spawnPoints(6, vp, mulberry32(seed));
      expect(pts).toHaveLength(6);
      for (const p of pts) {
        expect(p.x).toBeGreaterThanOrEqual(1440 * 0.15);
        expect(p.x).toBeLessThanOrEqual(1440 * 0.85);
        expect(p.y).toBeGreaterThanOrEqual(900 * 0.18);
        expect(p.y).toBeLessThanOrEqual(900 * 0.78);
      }
      for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) expect(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)).toBeGreaterThanOrEqual(110);
      expect(spawnPoints(6, vp, mulberry32(seed))).toEqual(pts);
    }
  });
  it('offsets spawn points by the viewport origin', () => {
    const pts = spawnPoints(3, { x: 100, y: 2000, w: 800, h: 600 }, mulberry32(5));
    for (const p of pts) { expect(p.x).toBeGreaterThanOrEqual(100 + 120); expect(p.y).toBeGreaterThanOrEqual(2000 + 108); }
  });
  it('mills within 48 and 36 px', () => {
    const out = { x: 0, y: 0 };
    for (let i = 0; i < 1000; i++) {
      millOffset(i * 0.013, i % 7, out);
      expect(Math.abs(out.x)).toBeLessThanOrEqual(48);
      expect(Math.abs(out.y)).toBeLessThanOrEqual(36);
    }
  });
  it('has the spec constants', () => {
    expect([SPAWN_STAGGER, SPAWN_IN, MILL]).toEqual([90, 260, 800]);
  });
});
