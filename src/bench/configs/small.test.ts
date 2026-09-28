import { describe, it, expect } from 'vitest';
import { INTAKE } from './intake'; import { BOT } from './bot'; import { SLOT } from './slot';
import { KIND, PRIMITIVE } from '@/bench/types'; import { mulberry32 } from '@/bench/hash';
const ctx = { tier: 'desktop' as const, rng: mulberry32(3), density: 1, caps: true };
describe('small configs', () => {
  it('intake: hopper, chute, 24 tiles, one lever last', () => {
    const p = INTAKE.build(ctx);
    expect(p.filter((x) => x.primitive === PRIMITIVE.tile)).toHaveLength(24);
    expect(p.filter((x) => x.kind === KIND.lever)).toHaveLength(1);
    expect(p.length).toBeGreaterThan(300); expect(p.length).toBeLessThan(450);
  });
  it('bot: exactly six parts, all ping, no lever', () => {
    const p = BOT.build(ctx);
    expect(p).toHaveLength(6);
    p.forEach((x) => expect(x.kind).toBe(KIND.ping));
  });
  it('slot: four rails and one scanning bar, no lever', () => {
    const p = SLOT.build(ctx);
    expect(p).toHaveLength(5);
    expect(p.filter((x) => x.kind === KIND.scan)).toHaveLength(1);
    expect(p.find((x) => x.kind === KIND.scan)!.param).toEqual([1.6, 3.0, 0, -1]);   // w = -1 marks a scan rail
  });
});
