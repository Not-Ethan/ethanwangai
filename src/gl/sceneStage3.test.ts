import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const scene = readFileSync(path.join(process.cwd(), 'src/gl/Scene.tsx'), 'utf8');

describe('Scene mounts the Stage 3 draws (spec §6, §11)', () => {
  it('mounts the ridge, hedge lines and mill wheel on every tier', () => {
    expect(scene).toContain('<Ridge tier={tier} reveal={uniforms.uRidgeReveal} lit={uniforms.uRidgeLit} />');
    expect(scene).toContain('<HedgeLines reveal={uniforms.uHedgeReveal} />');
    expect(scene).toContain('<MillWheel shadows={shadows} />');
  });
  it('mounts rain only on desktop and not under reduced motion', () => {
    expect(scene).toContain(
      "{tier === 'desktop' && !reducedMotion ? <Rain rain={uniforms.uRain} time={uniforms.uTime} /> : null}",
    );
  });
});
