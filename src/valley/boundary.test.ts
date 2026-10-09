// Global constraint: src/valley/** imports nothing from React, three's renderer or the DOM (three's math is fine).
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const DIR = path.resolve(__dirname);
const SOURCES = readdirSync(DIR).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
const THREE_MATH = new Set(['Color', 'Vector2', 'Vector3', 'Vector4', 'Matrix3', 'Matrix4', 'Quaternion', 'Euler', 'Box3', 'Sphere', 'Plane', 'Ray', 'MathUtils']);

describe('src/valley import boundary', () => {
  it.each(SOURCES)('%s imports only valley modules, its data and three math classes', (file) => {
    const src = readFileSync(path.join(DIR, file), 'utf8');
    for (const m of src.matchAll(/import\s+(type\s+)?([\s\S]*?)\s+from\s+'([^']+)'/g)) {
      const [, isType, names, from] = m;
      if (from.startsWith('./') || from.startsWith('@/valley/')) continue;
      expect(from).toBe('three');
      if (!isType) {
        for (const n of names.replace(/[{}]/g, '').split(',').map((s) => s.trim()).filter(Boolean)) expect(THREE_MATH.has(n)).toBe(true);
      }
    }
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');   // comments may name the DOM
    expect(code).not.toMatch(/(?<![.\w])(window|document)\.|\b(localStorage|sessionStorage|requestAnimationFrame)\b/);
    expect(code).not.toMatch(/\bfetch\(/);
  });
});
