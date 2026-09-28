import { describe, it, expect } from 'vitest';
import { BALANCE } from './balance';
import { SPLITTER } from './splitter';
import { WATCH, WATCH_FIELD } from './watch';
import { KIND, MACHINE, PRIMITIVE, type BuildContext, type PartSpec, type Vec3 } from '@/bench/types';
import { mulberry32, hash2 } from '@/bench/hash';
import { layout } from '@/bench/layout';

const desktop: BuildContext = { tier: 'desktop', rng: mulberry32(1), density: 1, caps: true };
const phone: BuildContext = { tier: 'phone', rng: mulberry32(1), density: 0.25, caps: false };
const LEVER_PARAM = [2, -0.5, 0, 0];

const near = (a: readonly number[], b: readonly number[]) => { expect(a).toHaveLength(b.length); a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 6)); };

/** A bar's two end points in machine space, reconstructed from its rest pose: +x rotated by the quaternion, half a length each way. */
function ends(p: PartSpec): [Vec3, Vec3] {
  const [x, y, z, w] = p.quaternion;
  const d: Vec3 = [1 - 2 * (y * y + z * z), 2 * (x * y + w * z), 2 * (x * z - w * y)];
  const h = p.scale[0] / 2;
  return [
    [p.position[0] - d[0] * h, p.position[1] - d[1] * h, p.position[2] - d[2] * h],
    [p.position[0] + d[0] * h, p.position[1] + d[1] * h, p.position[2] + d[2] * h],
  ];
}
const spans = (p: PartSpec, from: Vec3, to: Vec3) => { const [a, b] = ends(p); near(a, from); near(b, to); };

/** Exactly one lever, in the highest group, alone in it. */
function expectLever(parts: PartSpec[], from: Vec3, to: Vec3) {
  const levers = parts.filter((p) => p.kind === KIND.lever);
  expect(levers).toHaveLength(1);
  const lever = levers[0];
  expect(lever.primitive).toBe(PRIMITIVE.bar);
  expect(lever.param).toEqual(LEVER_PARAM);
  const top = Math.max(...parts.map((p) => p.group));
  expect(lever.group).toBe(top);
  expect(parts.filter((p) => p.group === top)).toHaveLength(1);
  spans(lever, from, to);
}

describe('balance', () => {
  const parts = BALANCE.build(desktop);
  const of = (m: string) => parts.filter((p) => p.module === m);

  it('is the balance machine', () => { expect(BALANCE.id).toBe(MACHINE.balance); expect(BALANCE.name).toBe('balance'); });

  it('has one post, one tilting rail and two four-bar trays, all group 0', () => {
    expect(of('post')).toHaveLength(1);
    expect(of('post')[0].primitive).toBe(PRIMITIVE.bar);
    expect(of('post')[0].kind).toBe(KIND.static);
    spans(of('post')[0], [0, 0, 0], [0, 0.9, 0]);

    expect(of('rail')).toHaveLength(1);
    const rail = of('rail')[0];
    expect(rail.kind).toBe(KIND.tilt);
    expect(rail.param).toEqual([0, 0, 0, 0]);
    spans(rail, [-1.4, 0.9, 0], [1.4, 0.9, 0]);

    for (const side of ['left', 'right'] as const) {
      const tray = of(`tray-${side}`);
      expect(tray).toHaveLength(4);
      const sx = side === 'left' ? -1.3 : 1.3;
      tray.forEach((p) => {
        expect(p.primitive).toBe(PRIMITIVE.bar);
        expect(p.kind).toBe(KIND.tilt);
        expect(p.param).toEqual([0, 0, 0, 0]);
        expect(Math.abs(p.position[0] - sx)).toBeLessThan(0.25);
        expect(p.scale[0]).toBeLessThan(0.5);
      });
    }
    [...of('post'), ...of('rail'), ...of('tray-left'), ...of('tray-right')].forEach((p) => expect(p.group).toBe(0));
  });

  it('stacks 48 tiles per side, kind stack, param [side, i, i/48, 0], group 1, explodeMode module', () => {
    const tiles = parts.filter((p) => p.kind === KIND.stack);
    expect(tiles).toHaveLength(96);
    for (const side of [-1, 1]) {
      const stack = tiles.filter((p) => p.param[0] === side);
      expect(stack).toHaveLength(48);
      stack.forEach((p, i) => {
        expect(p.primitive).toBe(PRIMITIVE.tile);
        near(p.position, [side * 1.3, 0.93 + i * 0.025, 0]);
        expect(p.param).toEqual([side, i, i / 48, 0]);
        expect(p.group).toBe(1);
        expect(p.explodeMode).toBe('module');
        expect(p.module).toBe(side < 0 ? 'stack-left' : 'stack-right');
      });
    }
  });

  it('has one lever on the post cap, alone in the highest group, and 107 parts in all', () => {
    expectLever(parts, [0.05, 1.0, 0], [0.45, 1.0, 0]);
    expect(parts).toHaveLength(1 + 1 + 8 + 96 + 1);
  });
});

describe('splitter', () => {
  const parts = SPLITTER.build(desktop);
  const of = (m: string) => parts.filter((p) => p.module === m);

  it('is the splitter machine', () => { expect(SPLITTER.id).toBe(MACHINE.splitter); expect(SPLITTER.name).toBe('splitter'); });

  it('has one in-rail and a six-plate 0.5 block, group 0', () => {
    expect(of('in-rail')).toHaveLength(1);
    expect(of('in-rail')[0].kind).toBe(KIND.static);
    spans(of('in-rail')[0], [-2.0, 0.3, 0], [-0.4, 0.3, 0]);

    const block = of('block');
    expect(block).toHaveLength(6);
    block.forEach((p) => { expect(p.primitive).toBe(PRIMITIVE.bar); expect(p.kind).toBe(KIND.static); expect(p.group).toBe(0); });
    // The outer faces of the block sit 0.25 from its centre [0, 0.3, 0] on every axis: a 0.5 cube.
    const centre = [0, 0.3, 0];
    for (let k = 0; k < 3; k++) {
      const reach = Math.max(...block.map((p) => Math.abs(p.position[k] - centre[k])));
      expect(reach + 0.06).toBeCloseTo(0.25, 6);
    }
    expect(of('in-rail')[0].group).toBe(0);
  });

  it('has two spoked rings on axis z at [0, 0.75, ±0.3], scale 0.3, kind spin at rate 3.0, group 1', () => {
    const rings = parts.filter((p) => p.primitive === PRIMITIVE.ring);
    expect(rings).toHaveLength(2);
    const spokes = parts.filter((p) => p.primitive === PRIMITIVE.bar && p.kind === KIND.spin);
    expect(spokes).toHaveLength(2);
    for (const z of [0.3, -0.3]) {
      const ring = rings.find((p) => p.position[2] === z)!;
      expect(ring).toBeDefined();
      near(ring.position, [0, 0.75, z]);
      expect(ring.kind).toBe(KIND.spin);
      near(ring.scale, [0.3, 0.3, 0.3]);
      expect(ring.quaternion).toEqual([0, 0, 0, 1]);
      const spoke = spokes.find((p) => p.position[2] === z)!;
      expect(spoke).toBeDefined();
      near(spoke.position, ring.position);
      expect(spoke.scale[0]).toBeCloseTo(0.3, 6);
      expect(spoke.quaternion).toEqual(ring.quaternion);
      [ring, spoke].forEach((p) => { expect(p.param).toEqual([0, 3.0, 0, 0]); expect(p.group).toBe(1); });
    }
  });

  it('fans twelve out-rails from [0.3, 0.3, 0] to [2.2, 0.3, −1.1 + j·0.2], group 1', () => {
    const fan = of('fan');
    expect(fan).toHaveLength(12);
    fan.forEach((p, j) => {
      expect(p.primitive).toBe(PRIMITIVE.bar);
      expect(p.kind).toBe(KIND.static);
      expect(p.group).toBe(1);
      spans(p, [0.3, 0.3, 0], [2.2, 0.3, -1.1 + j * 0.2]);
    });
  });

  it('rests 48 lane tiles at [−1.9, 0.33, 0], 4 jobs × 12 lanes, group 1', () => {
    const tiles = parts.filter((p) => p.kind === KIND.lane);
    expect(tiles).toHaveLength(48);
    tiles.forEach((p, i) => {
      expect(p.primitive).toBe(PRIMITIVE.tile);
      near(p.position, [-1.9, 0.33, 0]);
      expect(p.param).toEqual([2.2, Math.floor(i / 12) / 4, 3.8, 1 + (i % 12)]);
      expect(p.col).toBe(i % 12);
      expect(p.group).toBe(1);
    });
  });

  it('has one lever on the block, alone in the highest group, and 72 parts in all', () => {
    expectLever(parts, [0, 0.6, 0.3], [0.4, 0.6, 0.3]);
    // 1 in-rail + 6 block plates + 2 rings + 2 spokes + 12 out-rails + 48 tiles + 1 lever.
    expect(parts).toHaveLength(1 + 6 + 2 + 2 + 12 + 48 + 1);
  });
});

describe('watch', () => {
  it('declares a 48 × 16 field at pitch 0.07', () => {
    expect(WATCH_FIELD).toEqual({ cols: 48, rows: 16, pitch: 0.07 });
    expect(WATCH.id).toBe(MACHINE.watch);
    expect(WATCH.name).toBe('watch');
  });

  it('desktop: 768 scan cells that rise, ordered by column, hashed baseline, w = 48 columns, then one rail (w = -1) and one lever = 770', () => {
    const parts = WATCH.build(desktop);
    expect(parts).toHaveLength(48 * 16 + 2);
    const cells = parts.filter((p) => p.primitive === PRIMITIVE.cell);
    expect(cells).toHaveLength(768);
    const w = 48 * 0.07, d = 16 * 0.07;
    cells.forEach((p, k) => {
      const c = Math.floor(k / 16), r = k % 16;
      expect(parts[k]).toBe(p);
      expect(p.kind).toBe(KIND.scan);
      expect(p.explodeMode).toBe('rise');
      expect(p.group).toBe(0);
      expect(p.module).toBe('field');
      expect(p.col).toBe(c);
      expect(p.param).toEqual([c, r, hash2(c, r), 48]);
      expect(p.param[2]).toBeGreaterThanOrEqual(0);
      expect(p.param[2]).toBeLessThan(1);
      near(p.position, [-w / 2 + (c + 0.5) * 0.07, 0, -d / 2 + (r + 0.5) * 0.07]);
      near(p.scale, [0.05, 0.12, 0.05]);
    });

    const rails = parts.filter((p) => p.kind === KIND.scan && p.primitive === PRIMITIVE.bar);
    expect(rails).toHaveLength(1);
    const rail = rails[0];
    expect(rail.group).toBe(0);
    expect(rail.explodeMode).toBe('module');
    spans(rail, [-w / 2, 0.2, -d / 2], [-w / 2, 0.2, d / 2]);
    near(rail.param, [w, 4.0, 0, -1]);

    expectLever(parts, [-w / 2, 0.35, -d / 2 - 0.1], [-w / 2 + 0.4, 0.35, -d / 2 - 0.1]);
  });

  it('phone: halves each field axis and doubles pitch and cell scale, keeping the footprint = 194; cells carry w = 24', () => {
    const parts = WATCH.build(phone);
    expect(parts).toHaveLength(24 * 8 + 2);
    const cells = parts.filter((p) => p.primitive === PRIMITIVE.cell);
    expect(cells).toHaveLength(192);
    const w = 24 * 0.14, d = 8 * 0.14;
    expect(w).toBeCloseTo(48 * 0.07, 6);
    cells.forEach((p, k) => {
      const c = Math.floor(k / 8), r = k % 8;
      expect(p.param).toEqual([c, r, hash2(c, r), 24]);
      near(p.position, [-w / 2 + (c + 0.5) * 0.14, 0, -d / 2 + (r + 0.5) * 0.14]);
      near(p.scale, [0.1, 0.24, 0.1]);
    });
    const rail = parts.find((p) => p.kind === KIND.scan && p.primitive === PRIMITIVE.bar)!;
    spans(rail, [-w / 2, 0.2, -d / 2], [-w / 2, 0.2, d / 2]);
    near(rail.param, [w, 4.0, 0, -1]);
    expectLever(parts, [-w / 2, 0.35, -d / 2 - 0.1], [-w / 2 + 0.4, 0.35, -d / 2 - 0.1]);
  });
});

describe('through layout()', () => {
  it('counts every part per machine and births each lever last at exactly 1', () => {
    const r = layout({ tier: 'desktop', seed: 7, configs: [BALANCE, SPLITTER, WATCH] });
    expect(r.counts.byMachine[MACHINE.balance]).toBe(107);
    expect(r.counts.byMachine[MACHINE.splitter]).toBe(72);
    expect(r.counts.byMachine[MACHINE.watch]).toBe(770);
    expect(r.counts.total).toBe(107 + 72 + 770);
    expect(r.leaderLines).toHaveLength(0);
    for (const m of [MACHINE.balance, MACHINE.splitter, MACHINE.watch]) {
      const mine = r.parts.filter((p) => p.machine === m);
      const lever = mine.filter((p) => p.kind === KIND.lever);
      expect(lever).toHaveLength(1);
      expect(lever[0].birth).toBe(1);
      const others = mine.filter((p) => p.kind !== KIND.lever).map((p) => p.birth);
      expect(Math.max(...others)).toBeLessThan(1);
    }
    r.parts.filter((p) => p.explodeMode === 'rise').forEach((p) => expect(p.explode).toEqual([0, 0, 0]));
  });
});
