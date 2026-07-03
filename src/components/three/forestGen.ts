import * as THREE from "three";
import { cameraCurve, makeNoise2D, mulberry32, trailElevation } from "@/lib/journey";

// Deterministic world-building. Everything is generated once per
// session from fixed seeds so the world is stable frame to frame
// and identical on every visit.
//
// The trail crosses five biomes, keyed off z:
//   z  62..26   dense pine forest (dawn)
//   z  26..4    wildflower meadow (morning)
//   z   4..-26  lakeshore (golden hour)
//   z -26..-52  foothill grove w/ mushrooms (dusk)
//   z -52..-90  alpine summit above the treeline (midnight)

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

// —— The lake (left of the trail on the golden-hour stretch) ——
export const LAKE = { x: -24, z: -16, rx: 18, rz: 24, waterY: -1.3 };

/** 1 inside the lake basin, 0 outside. */
export function lakeMask(x: number, z: number): number {
  const dx = (x - LAKE.x) / LAKE.rx;
  const dz = (z - LAKE.z) / LAKE.rz;
  const d = Math.sqrt(dx * dx + dz * dz);
  return 1 - THREE.MathUtils.smoothstep(d, 0.72, 1.05);
}

/** 1 on the open meadow stretch. */
export function meadowMask(z: number): number {
  return (
    THREE.MathUtils.smoothstep(z, 0, 7) *
    (1 - THREE.MathUtils.smoothstep(z, 23, 30))
  );
}

/** 0 in the valley → 1 at the summit. */
export function ascentMask(z: number): number {
  return THREE.MathUtils.smoothstep(-z, 30, 80);
}

/** Terrain height. Flat corridor along the path, biomes elsewhere. */
export function heightAt(x: number, z: number): number {
  const d = pathDistance(x, z);
  const corridor = THREE.MathUtils.smoothstep(d, 3.5, 14);
  // The mountain: full height near the trail, easing off far to the sides
  // so the summit reads as a peak, not an endless wall.
  const peakFalloff = 1 - THREE.MathUtils.smoothstep(Math.abs(x), 40, 110) * 0.55;
  const edgeLift = THREE.MathUtils.smoothstep(Math.abs(x), 30, 110) * 6;
  let h =
    trailElevation(z) * peakFalloff +
    fbm(x, z) * 4.2 * corridor +
    edgeLift * corridor;
  // Carve the lake basin.
  h = THREE.MathUtils.lerp(h, LAKE.waterY - 1.4, lakeMask(x, z));
  return h;
}

/** Tree acceptance probability per biome. */
function treeDensity(z: number): number {
  if (z > 26) return 1; // dense forest
  if (z > 4) return 0.13; // meadow — just a few lone pines
  if (z > -26) return 0.5; // lakeshore
  if (z > -50) return 0.65; // foothill grove
  // treeline: fade to nothing on the ascent
  return 0.65 * (1 - THREE.MathUtils.smoothstep(-z, 50, 62));
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
  while (trees.length < count && guard < count * 50) {
    guard++;
    const x = (rand() - 0.5) * 220;
    const z = 62 - rand() * 155; // z from 62 down to -93
    const d = pathDistance(x, z);
    if (d < 6.5 || d > 95) continue;
    if (rand() > treeDensity(z)) continue;
    if (lakeMask(x, z) > 0.03) continue;
    // Warmer trees cluster around the golden-hour lakeshore.
    const goldenZone = 1 - Math.min(1, Math.abs(z + 12) / 26);
    const hue = rand() < goldenZone * 0.5 ? 0.55 + rand() * 0.45 : rand() * 0.18;
    // Trees get stunted approaching the treeline.
    const stunt = 1 - THREE.MathUtils.smoothstep(-z, 44, 60) * 0.45;
    trees.push({
      x,
      y: heightAt(x, z),
      z,
      scale: (0.7 + rand() * 1.15) * stunt,
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

export interface RockInstance extends ScatterInstance {
  /** 0 valley gray → 1 snowy alpine. */
  alpine: number;
}

export function generateRocks(count: number): RockInstance[] {
  const rand = mulberry32(9001);
  const rocks: RockInstance[] = [];
  let guard = 0;
  while (rocks.length < count && guard < count * 50) {
    guard++;
    const x = (rand() - 0.5) * 170;
    const z = 58 - rand() * 175; // down to -117
    const d = pathDistance(x, z);
    if (d < 3.2 || d > 70) continue;
    if (lakeMask(x, z) > 0.03) continue;
    // Rockier terrain on the ascent.
    const alpine = ascentMask(z);
    if (rand() > 0.3 + alpine * 0.7) continue;
    rocks.push({
      x,
      y: heightAt(x, z) - 0.15,
      z,
      scale: 0.3 + rand() * (0.9 + alpine * 0.8),
      rot: rand() * Math.PI * 2,
      alpine,
    });
  }
  return rocks;
}

export function generateGrass(count: number): ScatterInstance[] {
  const rand = mulberry32(5150);
  const grass: ScatterInstance[] = [];
  let guard = 0;
  while (grass.length < count && guard < count * 50) {
    guard++;
    const x = (rand() - 0.5) * 70;
    const z = 32 - rand() * 40; // meadow + lake approach
    const d = pathDistance(x, z);
    if (d < 2.2 || d > 30) continue;
    if (lakeMask(x, z) > 0.02) continue;
    if (rand() > meadowMask(z) + 0.12) continue;
    grass.push({
      x,
      y: heightAt(x, z),
      z,
      scale: 0.7 + rand() * 0.9,
      rot: rand() * Math.PI * 2,
    });
  }
  return grass;
}

export interface FlowerInstance extends ScatterInstance {
  color: number; // index into the flower palette
}

export const FLOWER_COLORS = ["#fff3d9", "#ffd27f", "#e88fb0", "#9fb4ff"];

export function generateFlowers(count: number): FlowerInstance[] {
  const rand = mulberry32(7777);
  const flowers: FlowerInstance[] = [];
  let guard = 0;
  while (flowers.length < count && guard < count * 50) {
    guard++;
    const x = (rand() - 0.5) * 64;
    const z = 30 - rand() * 34;
    const d = pathDistance(x, z);
    if (d < 1.8 || d > 26) continue;
    if (lakeMask(x, z) > 0.02) continue;
    if (rand() > meadowMask(z)) continue;
    flowers.push({
      x,
      y: heightAt(x, z) + 0.22,
      z,
      scale: 0.6 + rand() * 0.7,
      rot: rand() * Math.PI * 2,
      color: Math.floor(rand() * FLOWER_COLORS.length),
    });
  }
  return flowers;
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
    const z = -32 - rand() * 24; // grove between z -32 and -56
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

export interface MountainSpec {
  x: number;
  z: number;
  r: number;
  h: number;
  snow: boolean;
}

/** Distant range on the horizon — the destination you climb toward. */
export function generateMountains(): MountainSpec[] {
  const rand = mulberry32(31415);
  const specs: MountainSpec[] = [];
  const slots = [
    { x: -95, z: -135 },
    { x: -48, z: -158 },
    { x: 12, z: -168 },
    { x: 66, z: -150 },
    { x: 110, z: -125 },
    { x: -145, z: -85 },
    { x: 155, z: -75 },
    { x: -150, z: 6 },
    { x: 165, z: 26 },
  ];
  slots.forEach((s, i) => {
    specs.push({
      x: s.x + (rand() - 0.5) * 16,
      z: s.z + (rand() - 0.5) * 16,
      r: 28 + rand() * 18,
      h: 24 + rand() * 18,
      snow: i < 5,
    });
  });
  return specs;
}

/** Vertex-colored, noise-displaced terrain across all five biomes. */
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
  const meadow = new THREE.Color("#6d8a4a");
  const dirt = new THREE.Color("#5c5140");
  const lakebed = new THREE.Color("#5c5a45");
  const alpineRock = new THREE.Color("#59605e");
  const snow = new THREE.Color("#dfe7ee");
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);

    const v = (noise(x * 0.07 + 31, z * 0.07 - 17) + 1) / 2;
    tmp.copy(moss).lerp(mossLight, v);
    // Meadow warms the grass.
    tmp.lerp(meadow, meadowMask(z) * (0.4 + v * 0.4));
    // Alpine: grass gives way to rock, then snow near the summit.
    const rocky = THREE.MathUtils.smoothstep(h, 6, 13);
    tmp.lerp(alpineRock, rocky * 0.85);
    const snowy = THREE.MathUtils.smoothstep(h, 13, 18) * (0.75 + v * 0.25);
    tmp.lerp(snow, snowy);
    // Lakebed under the water.
    tmp.lerp(lakebed, lakeMask(x, z));
    // Worn dirt path.
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
