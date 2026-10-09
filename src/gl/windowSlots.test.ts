import { describe, it, expect, beforeEach } from 'vitest';
import { InstancedBufferAttribute, InstancedMesh, Matrix4, MeshBasicMaterial, PlaneGeometry, Quaternion, Vector3 } from 'three';
import { EMITTERS } from '@/valley/lights';
import type { EmitterId } from '@/valley/types';
import { EMITTER_INDEX } from './projection';
import { createWindowSet, STATIC_WINDOW_COUNT, WINDOW_CAPACITY } from './structures';
import type { WindowQuad } from './houseGeometry';
import {
  DYNAMIC_ORDER, bindWindowBuffers, dynamicWindowCount, resetWindowSlots, setDynamicWindows, windowBuffersFor,
  type WindowBuffers,
} from './windowSlots';

const q = (x: number): WindowQuad => ({ center: [x, 1, 0], normal: [0, 0, 1], width: 0.8, height: 0.6 });

function fake(capacity: number, staticCount: number) {
  const writes: { i: number; x: number; e: EmitterId }[] = [];
  let count = -1;
  const b: WindowBuffers = {
    capacity, staticCount,
    write: (i, quad, e) => writes.push({ i, x: quad.center[0], e }),
    setCount: (n) => { count = n; },
  };
  return { b, writes, count: () => count };
}

/** The mesh Windows.tsx builds over a WindowSet (Stage 2 Task 2.5). */
function windowsMesh() {
  const set = createWindowSet();
  const geometry = new PlaneGeometry(1, 1);
  geometry.setAttribute('aLit', new InstancedBufferAttribute(set.lit, 1));
  geometry.setAttribute('aRow', new InstancedBufferAttribute(set.rows, 1));
  const mesh = new InstancedMesh(geometry, new MeshBasicMaterial(), WINDOW_CAPACITY);
  mesh.instanceMatrix = new InstancedBufferAttribute(set.matrices, 16);
  mesh.instanceColor = new InstancedBufferAttribute(set.colors, 3);
  mesh.count = set.count;
  return { set, mesh };
}

beforeEach(() => resetWindowSlots());

describe('window slots', () => {
  it('orders dynamic windows hill1…hill5 then visitor, after the static ones', () => {
    expect(DYNAMIC_ORDER).toEqual(['hill1', 'hill2', 'hill3', 'hill4', 'hill5', 'visitor']);
    const f = fake(512, 30);
    bindWindowBuffers(f.b);
    setDynamicWindows('visitor', [q(100)]);
    setDynamicWindows('hill2', [q(20), q(21)]);
    setDynamicWindows('hill1', [q(10)]);
    expect(f.count()).toBe(34);
    const last = f.writes.slice(-4);
    expect(last).toEqual([
      { i: 30, x: 10, e: 'hill1' }, { i: 31, x: 20, e: 'hill2' }, { i: 32, x: 21, e: 'hill2' }, { i: 33, x: 100, e: 'visitor' },
    ]);
  });

  it('keeps registrations made before Windows binds, and writes them on bind', () => {
    setDynamicWindows('hill3', [q(1), q(2)]);
    const f = fake(512, 10);
    bindWindowBuffers(f.b);
    expect(f.count()).toBe(12);
    expect(f.writes.map((w) => w.e)).toEqual(['hill3', 'hill3']);
  });

  it('a new visitor house replaces the old one; an empty list removes it', () => {
    const f = fake(512, 0);
    bindWindowBuffers(f.b);
    setDynamicWindows('visitor', [q(1), q(2), q(3)]);
    expect(f.count()).toBe(3);
    setDynamicWindows('visitor', [q(9)]);
    expect(f.count()).toBe(1);
    setDynamicWindows('visitor', []);
    expect(f.count()).toBe(0);
    expect(dynamicWindowCount('visitor')).toBe(0);
  });

  it('never writes past capacity', () => {
    const f = fake(12, 10);
    bindWindowBuffers(f.b);
    setDynamicWindows('hill1', [q(1), q(2), q(3), q(4)]);
    expect(f.count()).toBe(12);
    expect(Math.max(...f.writes.map((w) => w.i))).toBe(11);
  });

  it('does nothing and throws nothing while unbound', () => {
    expect(() => setDynamicWindows('hill1', [q(1)])).not.toThrow();
    expect(dynamicWindowCount('hill1')).toBe(1);
  });
});

describe('windowBuffersFor', () => {
  it('writes the WindowSet slot (matrix, emitter colour, row -1, emitterOf) and grows set.count and mesh.count', () => {
    const { set, mesh } = windowsMesh();
    expect(set.count).toBe(STATIC_WINDOW_COUNT);
    const b = windowBuffersFor(mesh, set);
    expect(b.capacity).toBe(WINDOW_CAPACITY);
    expect(b.staticCount).toBe(STATIC_WINDOW_COUNT);
    const i = STATIC_WINDOW_COUNT;
    const v0 = mesh.instanceMatrix.version;
    b.write(i, { center: [5, 6, 7], normal: [1, 0, 0], width: 0.8, height: 0.6 }, 'hill4');
    b.setCount(i + 1);
    expect(set.count).toBe(i + 1);
    expect(mesh.count).toBe(i + 1);
    expect(mesh.instanceMatrix.version).toBe(v0 + 1);
    expect(set.emitterOf[i]).toBe(EMITTER_INDEX.hill4);
    expect(set.rows[i]).toBe(-1);
    expect(set.colors[i * 3] + set.colors[i * 3 + 1] + set.colors[i * 3 + 2]).toBeGreaterThan(0);
    const m = new Matrix4().fromArray(set.matrices, i * 16);
    const p = new Vector3(), r = new Quaternion(), s = new Vector3();
    m.decompose(p, r, s);
    expect(p.toArray()).toEqual([5, 6, 7]);
    expect(s.x).toBeCloseTo(0.8, 6);
    expect(s.y).toBeCloseTo(0.6, 6);
    const facing = new Vector3(0, 0, 1).applyQuaternion(r);
    expect(facing.x).toBeCloseTo(1, 6);
    expect(facing.z).toBeCloseTo(0, 6);
    expect(EMITTERS[set.emitterOf[i]].id).toBe('hill4');
  });

  it('end to end: a registered hillside window lights through the live sink count', async () => {
    const { attachSink, createSceneRefs, syncScene, createUniforms } = await import('./driverCore');
    const { set, mesh } = windowsMesh();
    const refs = createSceneRefs();
    const attr = mesh.geometry.getAttribute('aLit') as InstancedBufferAttribute;
    attachSink(refs, 'windows', { lit: set.lit, map: set.emitterOf, source: set, attr });
    bindWindowBuffers(windowBuffersFor(mesh, set));
    setDynamicWindows('hill2', [q(3)]);
    const lit = new Float32Array(EMITTERS.length);
    lit[EMITTER_INDEX.hill2] = 1;
    syncScene(refs, createUniforms(), lit);
    expect(set.lit[STATIC_WINDOW_COUNT]).toBe(1);
  });
});
