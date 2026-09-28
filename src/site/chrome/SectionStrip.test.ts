import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SECTIONS } from '@/bench/sections';
import { copy } from '@/site/copy';
import { SectionStrip } from './SectionStrip';

// Server render of the rail: pins the one-line markup Stage 6 walks (`data-strip`, `.is-current`)
// and the classes that keep it off phones; the geometry (left edge, rotated, no overlap) is
// checked in Playwright.
const html = renderToStaticMarkup(createElement(SectionStrip));

function classOf(tag: string, index: number): string {
  const start = html.lastIndexOf(`<${tag}`, index);
  const openTag = html.slice(start, html.indexOf('>', start) + 1);
  return /\bclass="([^"]*)"/.exec(openTag)?.[1] ?? '';
}

describe('SectionStrip rail', () => {
  it('is one rail at the left edge on desktop only, with no item current until Stage 6 says so', () => {
    const at = html.indexOf('id="section-strip"');
    expect(at).toBeGreaterThan(-1);
    const cls = classOf('ol', at);
    expect(cls).toMatch(/\bsection-rail\b/);
    expect(cls).toMatch(/\bmono\b/);
    expect(cls).toMatch(/\bhidden\b/);
    expect(cls).toMatch(/\bmd:block\b/);
    expect(cls).toMatch(/\bz-40\b/);
    expect(cls).not.toMatch(/\bfixed\b/);      // the rail's placement lives in one css rule, not utilities
    expect(html).not.toContain('is-current');
  });

  it('lists the nine sections in bench order under their copy labels, separated by middle dots', () => {
    const ids = Array.from(html.matchAll(/data-strip="([^"]+)"/g), (m) => m[1]);
    expect(ids).toEqual(SECTIONS.map((s) => s.id));
    expect(copy.chrome.strip).toHaveLength(SECTIONS.length);
    copy.chrome.strip.forEach((label) => expect(html).toContain(`${label}</li>`));
    expect(html.split(' · ').length - 1).toBe(SECTIONS.length - 1);
  });
});
