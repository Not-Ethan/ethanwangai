import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ShaderChunk } from 'three';
import { assembleVertex, assembleFragment } from './assemble';
import { KIND_LANE } from './kinds/lane.glsl';
import { KIND_SCAN } from './kinds/scan.glsl';
import { WATCH } from '@/bench/configs/watch';
import { SLOT } from '@/bench/configs/slot';
import { KIND, PRIMITIVE, type BuildContext } from '@/bench/types';
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
  it('lane.glsl.ts and configs/splitter.ts carry the same splitter geometry', () => {
    const splitter = read('../../bench/configs/splitter.ts');
    for (const literal of ['SPLIT_D1 1.6', '2.2', '-1.1+j*0.2']) {
      expect(normalise(KIND_LANE), literal).toContain(normalise(literal));
      expect(normalise(splitter), literal).toContain(normalise(literal));
    }
  });

  it('scan rails are flagged by aParam.w = 1 in both the shader and the watch and slot configs', () => {
    expect(KIND_SCAN).toContain('aParam.w > 0.5');
    const ctx: BuildContext = { tier: 'desktop', rng: mulberry32(1), density: 1, caps: true };
    const rails = [...WATCH.build(ctx), ...SLOT.build(ctx)].filter((p) => p.kind === KIND.scan && p.primitive === PRIMITIVE.bar);
    expect(rails).toHaveLength(2);
    for (const r of rails) expect(r.param[3]).toBe(1);
    for (const c of WATCH.build(ctx).filter((p) => p.primitive === PRIMITIVE.cell)) expect(c.param[3]).toBe(0);
  });
});
