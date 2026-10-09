import { describe, it, expect } from 'vitest';
import { EMITTERS } from '@/valley/lights';
import { LIGHT_ORDER, lightLabel, nearestEmitter, isTap, TAP_RADIUS_PX } from './lightControls';

describe('LIGHT_ORDER', () => {
  it('holds every emitter exactly once, hut first, in build order with the mill after nist', () => {
    expect([...LIGHT_ORDER].sort()).toEqual(EMITTERS.map((e) => e.id).sort());
    expect(LIGHT_ORDER.slice(0, 5)).toEqual(['hut', 'nist', 'mill', 'kalshiLamp', 'wvu']);
    expect(LIGHT_ORDER[LIGHT_ORDER.length - 1]).toBe('ridge');
  });
});

describe('lightLabel (spec §3.1, §3.2)', () => {
  it('uses the ignition labels verbatim', () => {
    expect(lightLabel('hut', null)).toBe('discord bots, middle school. my classmates used them.');
    expect(lightLabel('nist', null)).toBe('nist, summer 2025');
    expect(lightLabel('mill', null)).toBe('darch, june 2025 to may 2026');
    expect(lightLabel('kalshiLamp', null)).toBe('kalshi, since jan 2026');
    expect(lightLabel('ridge', null)).toBe('kalshi, since jan 2026');
    expect(lightLabel('wvu', null)).toBe('wvu medicine, summer 2026');
    for (const id of ['bar1', 'bar2', 'bar3', 'bar4'] as const) expect(lightLabel(id, null)).toBe('heron, since june 2026');
  });
  it('labels each hillside house with the sentence it was built from', () => {
    expect(lightLabel('hill1', null)).toBe('a discord bot for my middle school server');
    expect(lightLabel('hill2', null)).toBe('a trading algorithm for kalshi');
    expect(lightLabel('hill3', null)).toBe('a pipeline that made three thousand videos a month');
    expect(lightLabel('hill4', null)).toBe('a help-desk assistant that reads the docs for you');
    expect(lightLabel('hill5', null)).toBe('a pricing model for free-drinks promos at bars');
  });
  it('labels the visitor house with the visitor\'s sentence, or nothing before there is one', () => {
    expect(lightLabel('visitor', 'a garden that waters itself')).toBe('a garden that waters itself');
    expect(lightLabel('visitor', null)).toBeNull();
    expect(lightLabel('visitor', '   ')).toBeNull();
  });
});

describe('nearestEmitter (screen-space hit test, spec §6)', () => {
  const projected = new Float32Array(EMITTERS.length * 3);
  projected[0 * 3] = 100; projected[0 * 3 + 1] = 100; projected[0 * 3 + 2] = 1;
  projected[1 * 3] = 120; projected[1 * 3 + 1] = 100; projected[1 * 3 + 2] = 1;
  projected[2 * 3] = 300; projected[2 * 3 + 1] = 300; projected[2 * 3 + 2] = 0;

  it('returns the nearest visible emitter inside the radius', () => {
    expect(nearestEmitter(projected, 104, 100)).toBe(0);
    expect(nearestEmitter(projected, 117, 101)).toBe(1);
  });
  it('ignores hidden emitters and returns -1 when nothing is near', () => {
    expect(nearestEmitter(projected, 300, 300)).toBe(-1);
    expect(nearestEmitter(projected, 100, 100 + TAP_RADIUS_PX + 1)).toBe(-1);
    expect(TAP_RADIUS_PX).toBe(28);
  });
});

describe('isTap', () => {
  it('is a short touch that barely moved; a scroll drag is not', () => {
    expect(isTap({ x: 10, y: 10, t: 0 }, { x: 14, y: 16, t: 200 })).toBe(true);
    expect(isTap({ x: 10, y: 10, t: 0 }, { x: 10, y: 40, t: 200 })).toBe(false);
    expect(isTap({ x: 10, y: 10, t: 0 }, { x: 10, y: 10, t: 900 })).toBe(false);
  });
});
