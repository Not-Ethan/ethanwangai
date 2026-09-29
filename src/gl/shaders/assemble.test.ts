import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Matrix3, Matrix4, Quaternion, ShaderChunk, Vector3 } from 'three';
import { assembleVertex, assembleFragment } from './assemble';
import { KIND_LANE } from './kinds/lane.glsl';
import { KIND_SCAN } from './kinds/scan.glsl';
import { KIND_TILT } from './kinds/tilt.glsl';
import { KIND_STACK } from './kinds/stack.glsl';
import { KIND_CAP } from './kinds/cap.glsl';
import { SPLITTER } from '@/bench/configs/splitter';
import { WATCH } from '@/bench/configs/watch';
import { SLOT } from '@/bench/configs/slot';
import { BALANCE, POST_H } from '@/bench/configs/balance';
import { KIND, PRIMITIVE, type BuildContext, type PartSpec, type Vec3 } from '@/bench/types';
import { mulberry32 } from '@/bench/hash';

// Uniform names are the plan's; src/gl/material/uniforms.ts (BenchUniforms) carries the same list.
// uShadow, uGlyph and uLines belong to the ground, ink and leader-line programs, not the kit material.
const VERTEX_UNIFORMS = [
  'uCompile', 'uMachineTime', 'uRun', 'uFillRate', 'uTilt', 'uTime', 'uVel', 'uMerge', 'uLean', 'uHover',
  'uOU', 'uOUInfo', 'uCellH', 'uPitch', 'uTravelAxis', 'uBenchCenter', 'uBalancePivot', 'uSlotPeriod', 'uSlotPhase',
  'uLock',
];
const FRAGMENT_UNIFORMS = ['uPaper', 'uInkTop', 'uInkKey', 'uInkShade', 'uPencil', 'uHot', 'uKeyDir'];
const KINDS = ['static', 'sweep', 'spin', 'cell', 'cap', 'lever', 'lane', 'scan', 'ping', 'stack', 'tilt'];
const SIGNATURE = '(inout vec3 p, inout vec3 n, inout vec3 world, float a, float mt, int m)';

const declared = (src: string, name: string) => (src.match(new RegExp(`uniform\\s+\\w+\\s+${name}\\b`, 'g')) ?? []).length;
const occurrences = (src: string, needle: string) => src.split(needle).length - 1;
/** Collapse whitespace and the typographic minus and middle dot so a comment in TS and a literal in GLSL compare equal. */
const normalise = (src: string) => src.replace(/−/g, '-').replace(/·/g, '*').replace(/\s+/g, '');
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
/** A bar's two end points in machine space from its rest pose: +x rotated by the quaternion, half a length each way (as mid.test.ts). */
function ends(p: PartSpec): [Vec3, Vec3] {
  const [x, y, z, w] = p.quaternion;
  const d: Vec3 = [1 - 2 * (y * y + z * z), 2 * (x * y + w * z), 2 * (x * z - w * y)];
  const h = p.scale[0] / 2;
  return [
    [p.position[0] - d[0] * h, p.position[1] - d[1] * h, p.position[2] - d[2] * h],
    [p.position[0] + d[0] * h, p.position[1] + d[1] * h, p.position[2] + d[2] * h],
  ];
}

const v = assembleVertex();
const f = assembleFragment();

describe('assembleVertex', () => {
  it('declares every vertex-side uniform exactly once and none of the fragment-only ones', () => {
    for (const name of VERTEX_UNIFORMS) expect(declared(v.declarations, name), name).toBe(1);
    for (const name of FRAGMENT_UNIFORMS) expect(declared(v.declarations, name), name).toBe(0);
  });

  it('declares the three per-instance attributes', () => {
    expect(v.declarations).toMatch(/attribute\s+vec3\s+aExplode\s*;/);
    expect(v.declarations).toMatch(/attribute\s+vec4\s+aMeta\s*;/);
    expect(v.declarations).toMatch(/attribute\s+vec4\s+aParam\s*;/);
  });

  it('defines one kind_<name> function per kind with the shared signature', () => {
    for (const name of KINDS) expect(occurrences(v.declarations, `void kind_${name}${SIGNATURE}`), name).toBe(1);
  });

  it('defines quoterHeight before kind_cap, which calls it', () => {
    expect(v.declarations.indexOf('float quoterHeight(')).toBeGreaterThan(-1);
    expect(v.declarations.indexOf('float quoterHeight(')).toBeLessThan(v.declarations.indexOf('void kind_cap('));
  });

  it('does not redefine anything three\'s <common> chunk already #defines (PI2 among them)', () => {
    const defines = [...ShaderChunk.common.matchAll(/^#define\s+(\w+)/gm)].map((m) => m[1]);
    expect(defines).toContain('PI2');
    for (const name of defines) expect(v.declarations).not.toMatch(new RegExp(`(const\\s+\\w+|float|vec[234]|mat[234])\\s+${name}\\s*[=(]`));
  });

  it('localTransform dispatches to every kind and re-derives vNormal after the kinds rotate the normal', () => {
    for (const name of KINDS) expect(v.localTransform).toContain(`kind_${name}(transformed, `);
    const lastKind = Math.max(...KINDS.map((k) => v.localTransform.lastIndexOf(`kind_${k}(`)));
    expect(v.localTransform.indexOf('vNormal =')).toBeGreaterThan(lastKind);
  });

  it('project adds the bench offset after instanceMatrix and writes vWorldY and gl_Position', () => {
    expect(v.project).toMatch(/instanceMatrix\s*\*\s*vec4\(transformed, 1\.0\)/);
    expect(v.project).toContain('worldOffset');
    expect(v.project).toContain('vWorldY =');
    expect(v.project).toContain('gl_Position =');
    expect(v.project).toContain('vec4 mvPosition');
  });
});

describe('assembleFragment', () => {
  it('declares the palette uniforms, uKeyDir and the varyings exactly once', () => {
    for (const name of FRAGMENT_UNIFORMS) expect(declared(f.declarations, name), name).toBe(1);
    for (const name of VERTEX_UNIFORMS) expect(declared(f.declarations, name), name).toBe(0);
    for (const name of ['vA', 'vHot', 'vFlip', 'vJitter', 'vIsCap', 'vWorldY']) expect(occurrences(f.declarations, `varying float ${name};`), name).toBe(1);
  });

  it('reads vNormal, not the later-declared normal, and keeps pencil unlit', () => {
    expect(f.colorFragment).toContain('vNormal');
    expect(f.colorFragment).not.toMatch(/[^v]normal\b/);
    expect(f.colorFragment).toContain('diffuseColor.rgb = mix(uPencil, tone, inkMix);');
    expect(f.roughness).toContain('roughnessFactor = clamp(');
    expect(f.emissive).toContain('totalEmissiveRadiance +=');
    expect(f.output).toContain('gl_FragColor.rgb = mix(uPencil * contact, gl_FragColor.rgb, inkMix);');
  });
});

describe('reduced motion in the kits (design §11)', () => {
  it('never flips a cap while uFillRate is 0: the fill guard zeroes isTraded before the flip angle reads it', () => {
    const cap = KIND_CAP.replace(/\/\/.*$/gm, '').replace(/\s+/g, '');
    const guard = cap.indexOf('isTraded*=step(0.5,uFillRate[m]);');
    expect(guard).toBeGreaterThan(cap.indexOf('floatisTraded='));
    expect(guard).toBeLessThan(cap.indexOf('floatang=flipProfile(t)*isTraded'));
  });
});

describe('shader constants match the configs', () => {
  const desktop: BuildContext = { tier: 'desktop', rng: mulberry32(1), density: 1, caps: true };
  const phone: BuildContext = { tier: 'phone', rng: mulberry32(1), density: 0.25, caps: false };

  it('lane.glsl.ts and configs/splitter.ts carry the same splitter geometry', () => {
    const splitter = read('../../bench/configs/splitter.ts');
    for (const literal of ['SPLIT_D1 2.2', '2.2', '-1.1+j*0.2']) {
      expect(normalise(KIND_LANE), literal).toContain(normalise(literal));
      expect(normalise(splitter), literal).toContain(normalise(literal));
    }
  });

  it('a splitter tile runs SPLIT_D1 along x from its rest onto the fan start, then along the out-rail it is lane j of', () => {
    const d1 = Number(/#define SPLIT_D1 ([\d.]+)/.exec(KIND_LANE)?.[1]);
    expect(d1).toBeGreaterThan(0);
    const parts = SPLITTER.build(desktop);
    const fan = parts.filter((p) => p.module === 'fan');
    expect(fan).toHaveLength(12);
    const tiles = parts.filter((p) => p.kind === KIND.lane);
    expect(tiles.length).toBeGreaterThan(0);
    for (const t of tiles) {
      const j = t.param[3] - 1;
      const [from, to] = ends(fan[j]);
      // first leg: world.x += SPLIT_D1 must land the tile on the fan start, on the rail line
      expect(t.position[0] + d1, `lane ${j} start x`).toBeCloseTo(from[0], 6);
      expect(t.position[2], `lane ${j} start z`).toBeCloseTo(from[2], 6);
      // second leg: the shader's outDir = vec3(2.2 - 0.3, 0.0, (-1.1 + j * 0.2) - 0.0) is this rail's run
      expect(to[0] - from[0], `lane ${j} run x`).toBeCloseTo(2.2 - 0.3, 6);
      expect(to[1] - from[1], `lane ${j} run y`).toBeCloseTo(0, 6);
      expect(to[2] - from[2], `lane ${j} run z`).toBeCloseTo(-1.1 + j * 0.2, 6);
    }
  });

  it('scan rails are flagged by aParam.w = -1 and field cells carry their tier\'s column count in aParam.w', () => {
    expect(KIND_SCAN).toContain('bool isRail = aParam.w < -0.5;');
    expect(KIND_SCAN).toMatch(/cols = aParam\.w/);
    expect(KIND_SCAN).toContain('float railCol = tri * cols;');
    for (const [ctx, cols] of [[desktop, 48], [phone, 24]] as const) {
      const watch = WATCH.build(ctx);
      const rails = [...watch, ...SLOT.build(ctx)].filter((p) => p.kind === KIND.scan && p.primitive === PRIMITIVE.bar);
      expect(rails, ctx.tier).toHaveLength(2);
      for (const r of rails) expect(r.param[3], ctx.tier).toBe(-1);
      const cells = watch.filter((p) => p.primitive === PRIMITIVE.cell);
      expect(Math.max(...cells.map((c) => c.param[0])) + 1, ctx.tier).toBe(cols);
      for (const c of cells) expect(c.param[3], ctx.tier).toBe(cols);
    }
  });

  it('the slot bar (machine 6) scans on uSlotPhase, the phase Clocks integrates, never on mt / uSlotPeriod', () => {
    // The slot has no lever, so its mt runs from load; dividing it by a period that changes per keystroke jumps the bar.
    expect(KIND_SCAN).toContain('float phase = (m == 6) ? uSlotPhase : mt / aParam.y;');
    expect(KIND_SCAN).toContain('float tri = 1.0 - abs(fract(phase) * 2.0 - 1.0);');
    expect(KIND_SCAN).not.toMatch(/mt\s*\/\s*uSlotPeriod/);
    expect(KIND_SCAN).not.toMatch(/\?\s*uSlotPeriod/);
  });

  it('a rail parks at its −x end (tri 0 at phase 0), next to the watch\'s lever, and the hot ring follows the same wave', () => {
    // Task 5.0: abs(fract(x) * 2 − 1) is 1 at x = 0, so a watch whose clock had not started parked its rail at the +x end,
    // away from the lever. Both triangle waves start at 0: the rail's offset and the column the hot ring reads.
    expect(KIND_SCAN).toContain('float tri = 1.0 - abs(fract(phase) * 2.0 - 1.0);');
    expect(KIND_SCAN).toContain('float tri = 1.0 - abs(fract(mt / period) * 2.0 - 1.0);');
    expect(KIND_SCAN.match(/float tri = /g)).toHaveLength(2);
  });

  it('the field cells\' hot-ring period is the watch rail\'s sweep period on both tiers', () => {
    const literals = [...KIND_SCAN.matchAll(/float period = ([\d.]+);/g)].map((m) => Number(m[1]));
    expect(literals).toHaveLength(1);
    for (const ctx of [desktop, phone]) {
      const rail = WATCH.build(ctx).find((p) => p.kind === KIND.scan && p.primitive === PRIMITIVE.bar)!;
      expect(rail.param[1], ctx.tier).toBe(literals[0]);
    }
  });
});

// kind_tilt, mirrored line for line: M = mat3(instanceMatrix), s2 its squared column lengths, R = rotZ(uTilt).
//   rel = instanceMatrix[3].xyz − uBalancePivot + M·p;  world += R·rel − rel;  n = transpose(M)·(R·(M·(n / s2)))
// The lit program then takes the normal to bench space as M·(n / s2) (assemble.ts, LOCAL_TRANSFORM).
describe('kind_tilt: the rail and its trays turn rigidly about the balance pivot, as the tiles riding them do', () => {
  const ctx: BuildContext = { tier: 'desktop', rng: mulberry32(1), density: 1, caps: true };
  const tilting = BALANCE.build(ctx).filter((p) => p.kind === KIND.tilt);
  const pivot = new Vector3(0, POST_H, 0);   // machine space: the post top
  const tilt = 0.12;
  const R = new Matrix4().makeRotationZ(tilt);
  const R3 = new Matrix3().setFromMatrix4(R);
  // the bar primitive's box corners and face normals (kitGeometry.ts: 1 × 0.12 × 0.12)
  const corners = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => new Vector3(0.5 * x, 0.06 * y, 0.06 * z))));
  const normals = ([[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as Vec3[]).map((n) => new Vector3(...n));

  it('turns in bench space about uBalancePivot through the instance matrix, never in the part\'s own frame', () => {
    const src = normalise(KIND_TILT);
    expect(src).toContain('rotZ(uTilt)');
    expect(src).toContain('vec3rel=instanceMatrix[3].xyz-uBalancePivot+M*p;');
    expect(src).toContain('world+=R*rel-rel;');
    expect(src).toContain('n=transpose(M)*(R*(M*(n/s2)));');
    expect(src).not.toContain('p=R*p');
    // the tiles ride the same pivot and the same angle
    expect(normalise(KIND_STACK)).toContain('rest-uBalancePivot');
    expect(normalise(KIND_STACK)).toContain('rotZ(uTilt)');
  });

  it('lands every corner of the rail and the eight tray bars on the rigid turn about the post top, with normals to match', () => {
    expect(tilting.map((p) => p.module)).toEqual(['rail', ...Array(4).fill('tray-left'), ...Array(4).fill('tray-right')]);
    for (const part of tilting) {
      const inst = new Matrix4().compose(new Vector3(...part.position), new Quaternion(...part.quaternion), new Vector3(...part.scale));
      const M = new Matrix3().setFromMatrix4(inst);
      const e = M.elements;   // column-major: column i is e[3i..3i+2]
      const s2 = new Vector3(e[0] ** 2 + e[1] ** 2 + e[2] ** 2, e[3] ** 2 + e[4] ** 2 + e[5] ** 2, e[6] ** 2 + e[7] ** 2 + e[8] ** 2);
      const rest = new Vector3().setFromMatrixPosition(inst);
      for (const p of corners) {
        const rel = rest.clone().sub(pivot).add(p.clone().applyMatrix3(M));
        const world = rel.clone().applyMatrix3(R3).sub(rel);
        const got = p.clone().applyMatrix4(inst).add(world);
        const want = p.clone().applyMatrix4(inst).sub(pivot).applyMatrix4(R).add(pivot);
        expect(got.distanceTo(want), `${part.module} corner`).toBeLessThan(1e-9);
      }
      for (const n of normals) {
        const nk = n.clone().divide(s2).applyMatrix3(M).applyMatrix3(R3).applyMatrix3(M.clone().transpose());
        const got = nk.divide(s2).applyMatrix3(M).normalize();
        const want = n.clone().divide(s2).applyMatrix3(M).normalize().applyMatrix3(R3);
        expect(got.distanceTo(want), `${part.module} normal`).toBeLessThan(1e-9);
      }
    }
  });
});
