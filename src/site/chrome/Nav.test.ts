import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScrollProvider } from '@/scroll/ScrollProvider';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { copy } from '@/site/copy';
import { Nav } from './Nav';

// Server render of the chrome: providers hand out their SSR snapshots, no effects run,
// so this pins the markup order and the stacking classes, not the tap behaviour
// (the phone gate in Playwright covers open / close / Escape).
function render(defaultOpen: boolean): string {
  return renderToStaticMarkup(
    createElement(ScrollProvider, null,
      createElement(ThemeProvider, null,
        createElement(Nav, { defaultOpen }))));
}

/** The class attribute of the nearest `<tag …>` opening before `index` (the tag that contains it). */
function enclosingClass(html: string, index: number, tag: string): string {
  const start = html.lastIndexOf(`<${tag}`, index);
  if (start < 0) return '';
  const openTag = html.slice(start, html.indexOf('>', start) + 1);
  return /\bclass="([^"]*)"/.exec(openTag)?.[1] ?? '';
}

describe('Nav phone menu', () => {
  it('is closed by default and the toggle says so', () => {
    const html = render(false);
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('bg-paper');
  });

  it('paints the overlay under the toggle so the menu can be closed', () => {
    const html = render(true);
    const toggle = html.indexOf('aria-expanded="true"');
    const overlay = html.indexOf('bg-paper');
    expect(toggle).toBeGreaterThan(-1);
    expect(overlay).toBeGreaterThan(-1);
    // the overlay comes first in DOM order …
    expect(overlay).toBeLessThan(toggle);
    // … carries no z-index of its own (header is the stacking context; in-order paint) …
    const overlayClass = enclosingClass(html, overlay, 'div');
    expect(overlayClass).toMatch(/\bfixed\b/);
    expect(overlayClass).toMatch(/\binset-0\b/);
    expect(overlayClass).not.toMatch(/\bz-\d+\b/);
    // … and the row holding the toggle is positioned above it.
    const rowClass = enclosingClass(html, toggle, 'div');
    expect(rowClass).toMatch(/\brelative\b/);
    expect(rowClass).toMatch(/\bz-10\b/);
    expect(rowClass).toMatch(/\bmd:hidden\b/);
  });

  it('keeps the home button reachable over the open overlay', () => {
    const html = render(true);
    const home = html.indexOf(`>${copy.nav.home}<`);
    expect(home).toBeGreaterThan(-1);
    expect(html.indexOf('bg-paper')).toBeLessThan(home);
    const homeClass = enclosingClass(html, home, 'button');
    expect(homeClass).toMatch(/\brelative\b/);
    expect(homeClass).toMatch(/\bz-10\b/);
  });

  it('lists every section once in the overlay, from copy', () => {
    const html = render(true);
    // the overlay is rendered before the home button; the desktop nav after it repeats the labels
    const overlay = html.slice(html.indexOf('bg-paper'), html.indexOf(`>${copy.nav.home}<`));
    for (const it of copy.nav.items) {
      expect(overlay.split(`>${it.label}<`).length - 1).toBe(1);
    }
    expect(html.split(`>${copy.nav.menu}<`).length - 1).toBe(1);
  });
});
