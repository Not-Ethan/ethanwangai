import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ShaderChunk } from 'three';
import { assembleVertex, assembleFragment } from './assemble';
import { KIND_LANE } from './kinds/lane.glsl';
import { KIND_SCAN } from './kinds/scan.glsl';
import { SPLITTER } from '@/bench/configs/splitter';
import { WATCH } from '@/bench/configs/watch';
import { SLOT } from '@/bench/configs/slot';
import { KIND, PRIMITIVE, type BuildContext, type PartSpec, type Vec3 } from '@/bench/types';
import { mulberry32 } from '@/bench/hash';

// Uniform names are the plan's; src/gl/material/uniforms.ts (BenchUniforms) carries the same list.
// uShadow, uGlyph and uLines belong to the ground, ink and leader-line programs, not the kit material.
const VERTEX_UNIFORMS = [
  'uCompile', 'uMachineTime', 'uRun', 'uFillRate', 'uTilt', 'uTime', 'uVel', 'uMerge', 'uLean', 'uHover',
  'uOU', 'uOUInfo', 'uCellH', 'uPitch', 'uTravelAxis', 'uBenchCenter', 'uBalancePivot', 'uSlotPeriod', 'uLock',
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

  it('the field cells\' hot-ring period is the watch rail\'s sweep period on both tiers', () => {
    const literals = [...KIND_SCAN.matchAll(/float period = ([\d.]+);/g)].map((m) => Number(m[1]));
    expect(literals).toHaveLength(1);
    for (const ctx of [desktop, phone]) {
      const rail = WATCH.build(ctx).find((p) => p.kind === KIND.scan && p.primitive === PRIMITIVE.bar)!;
      expect(rail.param[1], ctx.tier).toBe(literals[0]);
    }
  });
});
