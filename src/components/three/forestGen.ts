import * as THREE from "three";
import { cameraCurve, makeNoise2D, mulberry32 } from "@/lib/journey";

// Deterministic world-building. Everything is generated once per
// session from fixed seeds so the forest is stable frame to frame
// and identical on every visit.

const noise = makeNoise2D(1337);

const pathPoints: THREE.Vector3[] = cameraCurve.getPoints(260);

/** Distance in the xz plane from (x, z) to the walking path. */
export function pathDistance(x: number, z: number): number {
  let min = Infinity;
  for (let i = 0; i < pathPoints.length; i++) {
    const p = pathPoints[i];
    const dx = p.x - x;
    const dz = p.z - z;
    const d = dx * dx + dz * dz;
    if (d < min) min = d;
  }
  return Math.sqrt(min);
}

function fbm(x: number, z: number): number {
  return (
    noise(x * 0.02, z * 0.02) * 0.62 +
    noise(x * 0.055, z * 0.055) * 0.28 +
    noise(x * 0.14, z * 0.14) * 0.1
  );
}

/** Terrain height. Flat corridor along the path, rolling hills outward. */
export function heightAt(x: number, z: number): number {
  const d = pathDistance(x, z);
  const corridor = THREE.MathUtils.smoothstep(d, 3.5, 14);
  const edgeLift = THREE.MathUtils.smoothstep(Math.abs(x), 30, 110) * 6;
  return fbm(x, z) * 4.2 * corridor + edgeLift * corridor;
}

export interface TreeInstance {
  x: number;
  y: number;
  z: number;
  scale: number;
  rot: number;
  hue: number; // 0 = pine green, 1 = warm/golden variant
}

export function generateTrees(count: number): TreeInstance[] {
  const rand = mulberry32(4242);
  const trees: TreeInstance[] = [];
  let guard = 0;
  while (trees.length < count && guard < count * 40) {
    guard++;
    const x = (rand() - 0.5) * 220;
    const z = 62 - rand() * 210; // z from 62 down to -148
    const d = pathDistance(x, z);
    if (d < 6.5) continue; // keep the walking corridor clear
    if (d > 95) continue;
    // Warmer trees cluster around the golden-hour stretch of the walk.
    const goldenZone = 1 - Math.min(1, Math.abs(z + 12) / 26);
    const hue = rand() < goldenZone * 0.5 ? 0.55 + rand() * 0.45 : rand() * 0.18;
    trees.push({
      x,
      y: heightAt(x, z),
      z,
      scale: 0.7 + rand() * 1.15,
      rot: rand() * Math.PI * 2,
      hue,
    });
  }
  return trees;
}

export interface ScatterInstance {
  x: number;
  y: number;
  z: number;
  scale: number;
  rot: number;
}

export function generateRocks(count: number): ScatterInstance[] {
  const rand = mulberry32(9001);
  const rocks: ScatterInstance[] = [];
  let guard = 0;
  while (rocks.length < count && guard < count * 40) {
    guard++;
    const x = (rand() - 0.5) * 160;
    const z = 58 - rand() * 200;
    const d = pathDistance(x, z);
    if (d < 3.2 || d > 60) continue;
    rocks.push({
      x,
      y: heightAt(x, z) - 0.15,
      z,
      scale: 0.3 + rand() * 0.9,
      rot: rand() * Math.PI * 2,
    });
  }
  return rocks;
}

export interface MushroomInstance extends ScatterInstance {
  warm: boolean; // amber cap instead of teal
}

/** Glowing mushrooms in the dusk grove (the Projects stretch). */
export function generateMushrooms(count: number): MushroomInstance[] {
  const rand = mulberry32(777);
  const shrooms: MushroomInstance[] = [];
  let guard = 0;
  while (shrooms.length < count && guard < count * 60) {
    guard++;
    const x = (rand() - 0.5) * 40;
    const z = -26 - rand() * 28; // grove between z -26 and -54
    const d = pathDistance(x, z);
    if (d < 2.4 || d > 10) continue;
    shrooms.push({
      x,
      y: heightAt(x, z),
      z,
      scale: 0.5 + rand() * 0.8,
      rot: rand() * Math.PI * 2,
      warm: rand() < 0.35,
    });
  }
  return shrooms;
}

/** Vertex-colored, noise-displaced terrain with a worn dirt path. */
export function buildTerrainGeometry(segments: number): THREE.BufferGeometry {
  const width = 260;
  const depth = 240;
  const geo = new THREE.PlaneGeometry(width, depth, segments, segments);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, -42); // z from ~ -162 to +78

  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const moss = new THREE.Color("#2e4a2e");
  const mossLight = new THREE.Color("#49663c");
  const dirt = new THREE.Color("#5c5140");
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, heightAt(x, z));

    const v = (noise(x * 0.07 + 31, z * 0.07 - 17) + 1) / 2;
    tmp.copy(moss).lerp(mossLight, v);
    const d = pathDistance(x, z);
    const pathBlend = 1 - THREE.MathUtils.smoothstep(d, 1.6, 5.5);
    tmp.lerp(dirt, pathBlend * 0.9);

    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}
