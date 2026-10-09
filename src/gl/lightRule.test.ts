// Spec §4.8: nothing in the GL tree but the windows, the glow and the ridge (and their shaders) is lit additively or
// uses an emissive material.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'src/gl');
const ALLOWED = new Set(['Windows.tsx', 'Glow.tsx', 'Ridge.tsx', 'shaders/windows.ts', 'shaders/glow.ts', 'shaders/ridge.ts']);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe('light rule', () => {
  it('keeps emissive and AdditiveBlending inside the windows, glow and ridge files', () => {
    const offenders = walk(ROOT)
      .filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.test.ts'))
      .filter((f) => /emissive|AdditiveBlending/i.test(readFileSync(f, 'utf8')))
      .map((f) => path.relative(ROOT, f).split(path.sep).join('/'))
      .filter((rel) => !ALLOWED.has(rel));
    expect(offenders).toEqual([]);
  });
});
