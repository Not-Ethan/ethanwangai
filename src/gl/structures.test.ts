import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { PLACES } from '@/valley/layout';
import { EMITTERS } from '@/valley/lights';
import { PALETTE } from '@/valley/palette';
import { EMITTER_INDEX } from './projection';
import {
  BUILDING_SIZES, buildingsGeometry, createWindowSet, pushWindow, STATIC_WINDOW_COUNT, staticWindows,
  WINDOW_CAPACITY,
} from './structures';

describe('buildingsGeometry', () => {
  const g = buildingsGeometry();
  it('is one merged, non-indexed geometry with position, normal and colour, all finite', () => {
    expect(g.getIndex()).toBeNull();
    for (const name of ['position', 'normal', 'color']) {
      const a = g.getAttribute(name);
      expect(a, name).toBeDefined();
      for (let i = 0; i < a.array.length; i++) expect(Number.isFinite(a.array[i])).toBe(true);
    }
    expect(g.getAttribute('position').count % 3).toBe(0);
    expect(g.getAttribute('uv')).toBeUndefined();
  });

  it('colours every vertex with the wall or the roof colour', () => {
    const wall = new THREE.Color(PALETTE.wall);
    const roof = new THREE.Color(PALETTE.roof);
    const c = g.getAttribute('color');
    for (let i = 0; i < c.count; i++) {
      const isWall = Math.abs(c.getX(i) - wall.r) < 1e-6 && Math.abs(c.getY(i) - wall.g) < 1e-6 && Math.abs(c.getZ(i) - wall.b) < 1e-6;
      const isRoof = Math.abs(c.getX(i) - roof.r) < 1e-6 && Math.abs(c.getY(i) - roof.g) < 1e-6 && Math.abs(c.getZ(i) - roof.b) < 1e-6;
      expect(isWall || isRoof).toBe(true);
    }
  });

  it('stands a body on every building place and reaches the mill roof', () => {
    g.computeBoundingBox();
    const box = g.boundingBox!;
    for (const key of ['hut', 'nist', 'wvu', 'bar1', 'bar2', 'bar3', 'bar4', 'mill', 'kalshiLamp'] as const) {
      const p = new THREE.Vector3(PLACES[key][0], PLACES[key][1] + 0.5, PLACES[key][2]);
      expect(box.containsPoint(p), key).toBe(true);
    }
    const m = BUILDING_SIZES.mill;
    expect(box.max.y).toBeGreaterThanOrEqual(PLACES.mill[1] + m.h + m.rise - 1e-3);
  });
});

describe('staticWindows', () => {
  const w = staticWindows();
  it('has 32 lit quads: hut 1, cabins 2, bars 4 x (window + porch), mill 20, lamp 1', () => {
    expect(w.length).toBe(STATIC_WINDOW_COUNT);
    expect(STATIC_WINDOW_COUNT).toBe(32);
    const count = (id: string) => w.filter((x) => x.emitter === id).length;
    expect(count('hut')).toBe(1);
    expect(count('nist')).toBe(1);
    expect(count('wvu')).toBe(1);
    for (const b of ['bar1', 'bar2', 'bar3', 'bar4']) expect(count(b)).toBe(2);
    expect(count('mill')).toBe(20);
    expect(count('kalshiLamp')).toBe(1);
  });

  it('gives the mill rows 0 to 3, five windows each, bottom row lowest, and every other window row -1', () => {
    const mill = w.filter((x) => x.emitter === 'mill');
    for (let r = 0; r < 4; r++) expect(mill.filter((x) => x.row === r).length).toBe(5);
    const y = (r: number) => mill.find((x) => x.row === r)!.center[1];
    expect(y(0)).toBeLessThan(y(1));
    expect(y(2)).toBeLessThan(y(3));
    expect(y(3) + 0.6).toBeLessThan(PLACES.mill[1] + BUILDING_SIZES.mill.h);
    w.filter((x) => x.emitter !== 'mill').forEach((x) => expect(x.row).toBe(-1));
  });

  it("puts every window on the +z face of a registered emitter, in that emitter's colour", () => {
    for (const x of w) {
      expect(EMITTER_INDEX[x.emitter]).toBeGreaterThanOrEqual(0);
      const place = PLACES[x.emitter as keyof typeof PLACES];
      expect(x.center[2]).toBeGreaterThan(place[2]);
      expect(x.color).toBe(EMITTERS[EMITTER_INDEX[x.emitter]].color);
    }
  });
});

describe('WindowSet', () => {
  it('packs matrices, linear colours, rows and the emitter map, and stops at capacity', () => {
    const specs = staticWindows();
    const set = createWindowSet(specs);
    expect(set.count).toBe(specs.length);
    expect(set.matrices.length).toBe(WINDOW_CAPACITY * 16);
    expect(set.lit.length).toBe(WINDOW_CAPACITY);
    const s0 = specs[0];
    expect(set.matrices[0]).toBeCloseTo(s0.w, 6);
    expect(set.matrices[5]).toBeCloseTo(s0.h, 6);
    expect(set.matrices[12]).toBeCloseTo(s0.center[0], 5);
    expect(set.matrices[13]).toBeCloseTo(s0.center[1], 5);
    expect(set.matrices[14]).toBeCloseTo(s0.center[2], 5);
    expect(set.emitterOf[0]).toBe(EMITTER_INDEX[s0.emitter]);
    const c = new THREE.Color(s0.color);
    expect(set.colors[0]).toBeCloseTo(c.r, 6);
    expect(set.rows[0]).toBe(s0.row);
    while (set.count < WINDOW_CAPACITY) pushWindow(set, s0);
    expect(pushWindow(set, s0)).toBe(-1);
    expect(set.count).toBe(WINDOW_CAPACITY);
  });
});
