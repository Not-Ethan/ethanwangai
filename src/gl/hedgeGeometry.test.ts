import { describe, it, expect } from 'vitest';
import { PLACES } from '@/valley/layout';
import {
  HEDGE_BARS, HEDGE_LAMP_HEAD, hedgeDoor, HEDGE_SEGMENTS, buildHedgeArrays, buildHedgeGeometry, hedgeEnds, hedgePoint,
} from './hedgeGeometry';

const VERTS_PER_LINE = HEDGE_SEGMENTS * 2;

describe('hedge lines (spec §4.4)', () => {
  it('is four polylines of 24 segments, two vertices per segment', () => {
    const { positions, segment } = buildHedgeArrays();
    expect(positions.length).toBe(4 * VERTS_PER_LINE * 3);
    expect(segment.length).toBe(4 * VERTS_PER_LINE);
    expect(buildHedgeGeometry().getAttribute('aSegment').count).toBe(4 * VERTS_PER_LINE);
  });

  it('runs from each bar door to the lamp head', () => {
    const { positions } = buildHedgeArrays();
    HEDGE_BARS.forEach((bar, line) => {
      const d = hedgeDoor(bar);
      const l = PLACES.kalshiLamp;
      const first = line * VERTS_PER_LINE * 3;
      const last = (line * VERTS_PER_LINE + VERTS_PER_LINE - 1) * 3;
      for (let c = 0; c < 3; c++) {
        expect(positions[first + c]).toBeCloseTo(d[c], 4);
        expect(positions[last + c]).toBeCloseTo(l[c] + HEDGE_LAMP_HEAD[c], 4);
      }
    });
  });

  it('is continuous: each segment starts where the last one ended', () => {
    const { positions } = buildHedgeArrays();
    for (let line = 0; line < 4; line++) {
      for (let k = 1; k < HEDGE_SEGMENTS; k++) {
        const prevEnd = (line * VERTS_PER_LINE + (k - 1) * 2 + 1) * 3;
        const start = (line * VERTS_PER_LINE + k * 2) * 3;
        for (let c = 0; c < 3; c++) expect(positions[start + c]).toBeCloseTo(positions[prevEnd + c], 5);
      }
    }
  });

  it('tags both vertices of segment k with k, in draw order', () => {
    const { segment } = buildHedgeArrays();
    for (let line = 0; line < 4; line++) {
      for (let k = 0; k < HEDGE_SEGMENTS; k++) {
        expect(segment[line * VERTS_PER_LINE + k * 2]).toBe(k);
        expect(segment[line * VERTS_PER_LINE + k * 2 + 1]).toBe(k);
      }
    }
  });

  it('bows upward: the arc midpoint is above the chord midpoint', () => {
    for (const bar of HEDGE_BARS) {
      const { from, to } = hedgeEnds(bar);
      expect(hedgePoint(from, to, 0.5)[1]).toBeGreaterThan((from[1] + to[1]) / 2 + 0.5);
    }
  });
});
