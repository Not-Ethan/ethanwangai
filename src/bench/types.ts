// Pure contracts. No React, no DOM, no three renderer imports in src/bench/**.

export const MACHINE = {
  quoter: 0, intake: 1, balance: 2, splitter: 3, watch: 4, bot: 5, slot: 6, visitor: 7,
} as const;
export type MachineId = (typeof MACHINE)[keyof typeof MACHINE];
export const MACHINE_COUNT = 8;
export const MACHINE_NAMES = ['quoter', 'intake', 'balance', 'splitter', 'watch', 'bot', 'slot', 'visitor'] as const;

/** Vertex-shader behaviour of a part. Numeric because it ships as an attribute. */
export const KIND = {
  static: 0, sweep: 1, spin: 2, cell: 3, cap: 4, lever: 5, lane: 6, scan: 7, ping: 8, stack: 9, tilt: 10,
} as const;
export type KindId = (typeof KIND)[keyof typeof KIND];

/** Which InstancedMesh a part belongs to. */
export const PRIMITIVE = { cell: 0, cap: 1, bar: 2, rod: 3, ring: 4, tile: 5 } as const;
export type PrimitiveId = (typeof PRIMITIVE)[keyof typeof PRIMITIVE];
export const PRIMITIVE_NAMES = ['cell', 'cap', 'bar', 'rod', 'ring', 'tile'] as const;

export type Vec3 = readonly [number, number, number];
export type Vec4 = readonly [number, number, number, number];
export type Tier = 'desktop' | 'phone';

/** What a machine config emits. layout() adds explode and birth. */
export interface PartSpec {
  primitive: PrimitiveId;
  kind: KindId;
  position: Vec3;      // machine-local rest position; y = 0 is the bench surface
  quaternion: Vec4;    // machine-local rest rotation (x, y, z, w)
  scale: Vec3;         // rest scale; a bar of length L is [L, 1, 1]
  param: Vec4;         // per-kind, see src/gl/shaders/kinds/*.glsl.ts headers
  col: number;         // bed column / lane index / -1
  module: string;      // module name for leader lines and SVG grouping
  group: number;       // build hierarchy: lower groups lock first; lever must be the highest group alone
  explodeMode: 'module' | 'rise';  // module: slides in from an offset; rise: grows from a flat pencil grid
}

export interface PartInstance extends PartSpec {
  machine: MachineId;
  explode: Vec3;       // bench-space offset added while unbuilt ([0,0,0] for rise)
  birth: number;       // 0..1 in lock order; exactly 1 for the lever
}

export interface BuildContext {
  tier: Tier;
  rng: () => number;   // seeded, deterministic
  density: number;     // 1 on desktop, 0.25 on phone (configs divide lattice sizes by 1/density)
  caps: boolean;       // false on phone
}

export interface MachineConfig {
  id: MachineId;
  name: string;
  /** Approximate bench footprint in local units, for placement and plates. */
  footprint: { w: number; d: number };
  build(ctx: BuildContext): PartSpec[];
}

export interface LeaderLine { from: Vec3; to: Vec3; birth: number; machine: MachineId }

export interface MachineSummary {
  id: MachineId;
  count: number;                 // instances emitted
  centroid: Vec3;                // bench space, ink target centroid
  min: Vec3; max: Vec3;          // bench-space bounds of rest poses
  foot: Vec3;                    // bench-space point where the plate pins (front-centre at y=0)
}

export interface LayoutResult {
  parts: PartInstance[];
  byPrimitive: PartInstance[][]; // indexed by PrimitiveId
  machines: MachineSummary[];    // indexed by MachineId
  leaderLines: LeaderLine[];
  counts: { total: number; inkedAtEnd: number; byMachine: number[] };
}
