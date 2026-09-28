import { KIND, MACHINE, PRIMITIVE_NAMES, type LayoutResult, type LeaderLine, type MachineConfig, type MachineId, type MachineSummary, type PartInstance, type Tier, type Vec3 } from './types';
import { mulberry32, hash2 } from './hash';
import { PLACEMENT, toBench, quatToBench } from './bench';

export interface LayoutOptions {
  tier: Tier; seed: number; configs: MachineConfig[];
  groupSpans?: Partial<Record<MachineId, [number, number][]>>;
}

/** Birth windows per build group. The lever's group is always the last and is pinned to 1. */
export const DEFAULT_GROUP_SPANS: Record<MachineId, [number, number][]> = {
  [MACHINE.quoter]:   [[0, 0.12], [0.12, 0.62], [0.62, 0.68], [0.68, 0.85], [0.85, 0.97]],   // frame, bed, carriage rails, carriages, rotors; lever = group 5
  [MACHINE.intake]:   [[0, 0.3], [0.3, 0.7], [0.7, 0.97]],
  [MACHINE.balance]:  [[0, 0.35], [0.35, 0.97]],
  [MACHINE.splitter]: [[0, 0.3], [0.3, 0.7], [0.7, 0.97]],
  [MACHINE.watch]:    [[0, 0.8], [0.8, 0.97]],
  [MACHINE.bot]:      [[0, 0.97]],
  [MACHINE.slot]:     [[0, 0.97]],
  [MACHINE.visitor]:  [[0, 0.5], [0.5, 0.97]],
};

const AXES: Vec3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1]];

export function layout(opts: LayoutOptions): LayoutResult {
  const parts: PartInstance[] = [];
  const leaderLines: LeaderLine[] = [];
  const machines: MachineSummary[] = [];
  const byMachine = new Array(8).fill(0);
  const density = opts.tier === 'phone' ? 0.25 : 1;

  for (const cfg of opts.configs) {
    const rng = mulberry32((opts.seed ^ (cfg.id * 0x9e3779b1)) >>> 0);
    const specs = cfg.build({ tier: opts.tier, rng, density, caps: opts.tier !== 'phone' });
    const placement = PLACEMENT[cfg.id];
    const spans = opts.groupSpans?.[cfg.id] ?? DEFAULT_GROUP_SPANS[cfg.id];
    const groups = new Map<number, number[]>();
    specs.forEach((s, i) => { (groups.get(s.group) ?? groups.set(s.group, []).get(s.group)!).push(i); });
    const groupIds = [...groups.keys()].sort((x, y) => x - y);
    const leverGroup = groupIds[groupIds.length - 1];
    const hasLever = specs.some((s) => s.kind === KIND.lever);

    // Module explode: one hashed axis per module, magnitude 0.6–1.4, shared by the module's parts.
    const moduleAxis = new Map<string, Vec3>();
    const moduleMag = new Map<string, number>();

    const out: PartInstance[] = specs.map((s, i) => {
      const gi = groupIds.indexOf(s.group);
      const isLeverGroup = hasLever && s.group === leverGroup;
      let birth: number;
      if (isLeverGroup) birth = 1;
      else {
        // Center-of-bucket interpolation: each member sits strictly inside its span, never on
        // an endpoint, so a group's last birth never ties an adjacent group's first (spans are
        // contiguous in DEFAULT_GROUP_SPANS). Also covers the single-member case (fraction 0.5).
        const span = spans[Math.min(gi, spans.length - 1)];
        const members = groups.get(s.group)!;
        const rank = members.indexOf(i);
        birth = span[0] + (span[1] - span[0]) * ((rank + 0.5) / members.length);
      }
      let explode: Vec3 = [0, 0, 0];
      if (s.explodeMode === 'module' && s.kind !== KIND.lever) {
        if (!moduleAxis.has(s.module)) {
          const h = hash2(cfg.id * 131 + s.group, s.module.length * 7 + [...s.module].reduce((a, c) => a + c.charCodeAt(0), 0));
          moduleAxis.set(s.module, AXES[Math.floor(h * AXES.length) % AXES.length]);
          moduleMag.set(s.module, 0.6 + 0.8 * hash2(Math.floor(h * 977), cfg.id));
        }
        const ax = moduleAxis.get(s.module)!, mag = moduleMag.get(s.module)!;
        explode = [ax[0] * mag, ax[1] * mag, ax[2] * mag];
      }
      return {
        ...s,
        machine: cfg.id,
        position: toBench(s.position, placement),
        quaternion: quatToBench(s.quaternion, placement),
        explode, birth,
      };
    });

    if (cfg.id === MACHINE.quoter || cfg.id === MACHINE.intake) {
      out.forEach((p) => {
        if (p.explodeMode === 'module' && p.kind !== KIND.lever) {
          leaderLines.push({ from: [p.position[0] + p.explode[0], p.position[1] + p.explode[1], p.position[2] + p.explode[2]], to: p.position, birth: p.birth, machine: cfg.id });
        }
      });
    }

    const min: number[] = [Infinity, Infinity, Infinity], max: number[] = [-Infinity, -Infinity, -Infinity], sum = [0, 0, 0];
    out.forEach((p) => { for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], p.position[k]); max[k] = Math.max(max[k], p.position[k]); sum[k] += p.position[k]; } });
    const n = Math.max(1, out.length);
    machines[cfg.id] = {
      id: cfg.id, count: out.length,
      centroid: [sum[0] / n, sum[1] / n, sum[2] / n],
      min: [min[0], min[1], min[2]] as Vec3, max: [max[0], max[1], max[2]] as Vec3,
      foot: [(min[0] + max[0]) / 2, 0, max[2]] as Vec3,
    };
    byMachine[cfg.id] = out.length;
    parts.push(...out);
  }

  for (let m = 0; m < 8; m++) if (!machines[m]) machines[m] = { id: m as MachineId, count: 0, centroid: PLACEMENT[m].origin, min: PLACEMENT[m].origin, max: PLACEMENT[m].origin, foot: PLACEMENT[m].origin };

  const byPrimitive = PRIMITIVE_NAMES.map(() => [] as PartInstance[]);
  parts.forEach((p) => byPrimitive[p.primitive].push(p));
  const inkedAtEnd = parts.filter((p) => p.machine !== MACHINE.slot && p.machine !== MACHINE.visitor).length;
  return { parts, byPrimitive, machines, leaderLines, counts: { total: parts.length, inkedAtEnd, byMachine } };
}
