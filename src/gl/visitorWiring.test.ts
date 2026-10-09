import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = (p: string) => readFileSync(new URL(`./${p}`, import.meta.url), 'utf8');

describe('visitor house wiring (spec §6)', () => {
  it('VisitorHouse clips with shadows, enables local clipping, is DoubleSide only while building, mounts no light', () => {
    const s = src('VisitorHouse.tsx');
    for (const token of [
      'clippingPlanes: [plane]', 'clipShadows: true', 'localClippingEnabled = true', 'DoubleSide', 'FrontSide',
      'visitorBridge.detach()', 'castShadow={shadows}', '{building && <Scaffold />}',
      'buildPinFromSearch(', 'getVisitorSnapshot()', 'onVisitorSentence(',
    ]) expect(s, token).toContain(token);
    expect(s).not.toMatch(/emissive|AdditiveBlending|pointLight|PointLight/);
  });

  it('Scaffold is 18 instanced bars grown by aGrow, no shadow, no light', () => {
    const s = src('Scaffold.tsx');
    for (const token of ['InstancedMesh', "'aGrow'", 'SCAFFOLD_BARS', 'transformed.y *= aGrow', 'visitorBridge.grow']) {
      expect(s, token).toContain(token);
    }
    expect(s).not.toMatch(/castShadow|emissive|AdditiveBlending/);
  });

  it('Driver runs the build clock around the one applyFrame call', () => {
    const s = src('Driver.tsx');
    const before = s.indexOf('visitorBridge.beforeFrame(');
    const apply = s.indexOf('applyFrame(');
    const after = s.indexOf('visitorBridge.afterFrame(');
    expect(before).toBeGreaterThan(-1);
    expect(apply).toBeGreaterThan(before);
    expect(after).toBeGreaterThan(apply);
    expect(s.match(/useFrame\(/g)).toHaveLength(1);
  });

  it('Scene mounts the hillside and the visitor house; nothing else in src/gl calls useFrame', () => {
    expect(src('Scene.tsx')).toContain('<VisitorHouse />');
    for (const f of ['Hillside.tsx', 'VisitorHouse.tsx', 'Scaffold.tsx']) expect(src(f)).not.toContain('useFrame');
  });
});
