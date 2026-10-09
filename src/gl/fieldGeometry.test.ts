import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildTerrain, heightAt, TERRAIN } from '@/valley/terrain';
import { SECTIONS } from '@/valley/sections';
import { CAMERA_FAR, CAMERA_NEAR, composeCamera, createRig, setRigMode } from './cameraCore';
import { APRON, APRON_VERTEX_COUNT, MIST_COUNT, mistSeeds, terrainGeometry } from './fieldGeometry';

describe('terrainGeometry', () => {
  it('wraps buildTerrain as is (colours already linear), plus the apron, with an index and finite normals', () => {
    const t = buildTerrain();
    const g = terrainGeometry();
    const pos = g.getAttribute('position');
    const col = g.getAttribute('color');
    const nor = g.getAttribute('normal');
    expect(pos.count).toBe(t.positions.length / 3 + APRON_VERTEX_COUNT);
    expect(pos.count).toBeGreaterThanOrEqual(161 * 101);
    expect(g.getIndex()!.count).toBe(t.indices.length + (APRON_VERTEX_COUNT / 2 - 1) * 6);
    expect(col.count).toBe(pos.count);
    for (let i = 0; i < nor.array.length; i++) expect(Number.isFinite(nor.array[i])).toBe(true);
    for (let i = 0; i < 30; i++) {
      const k = Math.floor((i / 30) * (t.colors.length / 3));
      expect(col.getX(k)).toBe(t.colors[k * 3]);
      expect(col.getY(k)).toBe(t.colors[k * 3 + 1]);
      expect(col.getZ(k)).toBe(t.colors[k * 3 + 2]);
    }
    g.computeBoundingBox();
    expect(g.boundingBox!.max.x - g.boundingBox!.min.x).toBeCloseTo(TERRAIN.width, 0);
    expect(g.boundingBox!.max.z).toBeCloseTo(APRON.z1, 6);
  });

  it('the apron meets the near edge exactly: its first row is the terrain at z = 50', () => {
    const t = buildTerrain();
    const g = terrainGeometry();
    const pos = g.getAttribute('position');
    const first = t.positions.length / 3;
    expect(APRON.z0).toBe(TERRAIN.depth / 2);
    for (const k of [0, 40, 80, 120, 160]) {
      const x = pos.getX(first + k);
      expect(pos.getZ(first + k)).toBe(APRON.z0);
      expect(pos.getY(first + k)).toBeCloseTo(heightAt(x, APRON.z0), 5);
      expect(pos.getZ(first + APRON_VERTEX_COUNT / 2 + k)).toBe(APRON.z1);
    }
  });

  it('the portrait camera sees ground along its whole bottom edge in every section view (G6)', () => {
    const mesh = new THREE.Mesh(terrainGeometry(), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    mesh.updateMatrixWorld(true);
    const cam = new THREE.PerspectiveCamera(44, 390 / 844, CAMERA_NEAR, CAMERA_FAR);
    const rig = createRig();
    setRigMode(rig, true, false);
    const rc = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    for (const view of [{ yaw: 0, pitch: 0, fovScale: 1 }, ...SECTIONS.map((sec) => sec.viewPortrait)]) {
      composeCamera(rig, view.yaw, view.pitch, view.fovScale, 0, cam);
      cam.updateMatrixWorld(true);
      for (const x of [-1, -0.5, 0, 0.5, 1]) {
        rc.setFromCamera(ndc.set(x, -1), cam);
        const hit = rc.intersectObject(mesh, false)[0];
        expect(hit, `yaw ${view.yaw} pitch ${view.pitch} x ${x}`).toBeDefined();
      }
    }
  });
});

describe('mistSeeds', () => {
  it('places 24 sprites along the river band', () => {
    const s = mistSeeds();
    expect(s.length).toBe(MIST_COUNT * 4);
    for (let i = 0; i < MIST_COUNT; i++) {
      const [x, y, z, size] = [s[i * 4], s[i * 4 + 1], s[i * 4 + 2], s[i * 4 + 3]];
      expect(Math.abs(x)).toBeLessThanOrEqual(TERRAIN.width / 2);
      expect(y).toBeGreaterThanOrEqual(0.6);
      expect(y).toBeLessThanOrEqual(1.8);
      expect(Math.abs(z)).toBeLessThanOrEqual(5);
      expect(size).toBeGreaterThanOrEqual(6);
      expect(size).toBeLessThanOrEqual(10);
    }
    expect(Array.from(mistSeeds())).toEqual(Array.from(s));
  });
});
