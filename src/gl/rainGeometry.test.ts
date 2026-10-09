import { describe, it, expect } from 'vitest';
import { RAIN, buildRainArrays, buildRainGeometry, rainY } from './rainGeometry';

describe('rain (spec §6)', () => {
  it('is 1,500 two-vertex segments inside the 60 × 30 × 40 box', () => {
    const { positions, ends } = buildRainArrays();
    expect(positions.length).toBe(RAIN.count * 2 * 3);
    expect(ends.length).toBe(RAIN.count * 2);
    for (let v = 0; v < RAIN.count * 2; v++) {
      expect(Math.abs(positions[v * 3])).toBeLessThanOrEqual(RAIN.width / 2);
      expect(positions[v * 3 + 1]).toBeGreaterThanOrEqual(0);
      expect(positions[v * 3 + 1]).toBeLessThanOrEqual(RAIN.height);
      expect(Math.abs(positions[v * 3 + 2])).toBeLessThanOrEqual(RAIN.depth / 2);
      expect(ends[v]).toBe(v % 2);
    }
    expect(buildRainGeometry().getAttribute('aEnd').count).toBe(RAIN.count * 2);
  });

  it('both vertices of a drop share x, seed height and z', () => {
    const { positions } = buildRainArrays();
    for (let i = 0; i < RAIN.count; i++) {
      for (let c = 0; c < 3; c++) expect(positions[i * 6 + c]).toBe(positions[i * 6 + 3 + c]);
    }
  });

  it('is deterministic', () => {
    expect(buildRainArrays().positions).toEqual(buildRainArrays().positions);
  });

  it('falls at 18 units/s and wraps inside the box without stretching a drop', () => {
    expect(rainY(20, 0, 0) - rainY(20, 0.1, 0)).toBeCloseTo(1.8, 5);
    for (let time = 0; time < 10; time += 0.37) {
      const top = rainY(3, time, 0);
      const bottom = rainY(3, time, 1);
      expect(top).toBeGreaterThanOrEqual(-RAIN.height / 2);
      expect(top).toBeLessThan(RAIN.height / 2);
      expect(top - bottom).toBeCloseTo(RAIN.streak, 5);
    }
  });
});
