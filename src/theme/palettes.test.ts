import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PALETTES, CSS_VAR } from './palettes';

describe('palettes', () => {
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  for (const theme of ['light', 'dark'] as const) {
    it(`globals.css declares the ${theme} palette exactly`, () => {
      const block = theme === 'light'
        ? css.slice(css.indexOf(':root'), css.indexOf('[data-theme="dark"]'))
        : css.slice(css.indexOf('[data-theme="dark"]'));
      for (const [key, hex] of Object.entries(PALETTES[theme])) {
        const v = CSS_VAR[key as keyof typeof CSS_VAR];
        expect(block, `${v} in ${theme}`).toMatch(new RegExp(`${v}:\\s*${hex}`, 'i'));
      }
    });
  }
});
