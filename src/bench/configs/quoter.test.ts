import { describe, it, expect } from 'vitest';
import { QUOTER, QUOTER_BED } from './quoter';
import { KIND, PRIMITIVE } from '@/bench/types';
import { mulberry32 } from '@/bench/hash';

describe('quoter config', () => {
  const desktop = QUOTER.build({ tier: 'desktop', rng: mulberry32(1), density: 1, caps: true });
  const phone = QUOTER.build({ tier: 'phone', rng: mulberry32(1), density: 0.25, caps: false });
  it('has a 64 × 48 bed of cells with caps on desktop', () => {
    expect(desktop.filter((p) => p.kind === KIND.cell)).toHaveLength(QUOTER_BED.cols * QUOTER_BED.rows);
    expect(desktop.filter((p) => p.kind === KIND.cap)).toHaveLength(QUOTER_BED.cols * QUOTER_BED.rows);
  });
  it('phone tier is a quarter-density bed with no caps', () => {
    expect(phone.filter((p) => p.kind === KIND.cell)).toHaveLength(32 * 24);
    expect(phone.filter((p) => p.kind === KIND.cap)).toHaveLength(0);
  });
  it('has six carriages, 24 spoked rotors and exactly one lever in the last group', () => {
    const carriages = new Set(desktop.filter((p) => p.module.startsWith('carriage')).map((p) => p.module));
    expect(carriages.size).toBe(6);
    const rings = desktop.filter((p) => p.primitive === PRIMITIVE.ring && p.module.startsWith('rotor'));
    expect(rings).toHaveLength(24);
    const spokes = desktop.filter((p) => p.primitive === PRIMITIVE.bar && p.kind === KIND.spin && p.module.startsWith('rotor'));
    expect(spokes).toHaveLength(24);
    const levers = desktop.filter((p) => p.kind === KIND.lever);
    expect(levers).toHaveLength(1);
    expect(levers[0].group).toBe(Math.max(...desktop.map((p) => p.group)));
    expect(desktop.filter((p) => p.group === levers[0].group)).toHaveLength(1);
  });
  it('total is within the spec band and the bed cells rise (no explode)', () => {
    expect(desktop.length).toBeGreaterThan(6000);
    expect(desktop.length).toBeLessThan(9000);
    desktop.filter((p) => p.kind === KIND.cell || p.kind === KIND.cap).forEach((p) => expect(p.explodeMode).toBe('rise'));
  });
  it('bed cells are ordered by column so they rack in from the −x side', () => {
    const cells = desktop.filter((p) => p.kind === KIND.cell);
    for (let i = 1; i < cells.length; i++) expect(cells[i].position[0]).toBeGreaterThanOrEqual(cells[i - 1].position[0] - 1e-9);
  });
});
