import { describe, it, expect } from 'vitest';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScrollProvider } from '@/scroll/ScrollProvider';
import { SECTIONS } from '@/bench/sections';
import { MACHINE } from '@/bench/types';
import { Sentence } from './Sentence';
import { More } from './More';
import { First } from './First';
import { Kalshi } from './Kalshi';
import { Heron } from './Heron';
import { Darch } from './Darch';
import { Summers } from './Summers';
import { Alive } from './Alive';
import { Yours } from './Yours';

// Server render, as Nav.test does: ScrollProvider hands out its SSR tier and no effect runs,
// so this pins the DOM shape later stages read (ink sources, plates, the form, the counters)
// and the sticky copy wrapper around it, not the scroll behaviour (Playwright covers that).
const COMPONENT: Record<string, ComponentType> = {
  sentence: Sentence, more: More, first: First, kalshi: Kalshi, heron: Heron, darch: Darch, summers: Summers, alive: Alive, yours: Yours,
};

/** Every id / data hook a later stage reads from inside each section's copy. */
const COPY_HOOKS: Record<string, string[]> = {
  sentence: ['data-ink-source="sentence"', 'data-ink-words', 'id="deck"', 'id="rebuild"', `data-plate="${MACHINE.quoter}"`],
  more: ['data-ink-source="more"', 'data-click="0"', 'data-click="3"'],
  first: ['data-ink-source="first"', `data-plate="${MACHINE.bot}"`],
  kalshi: ['data-ink-source="kalshi"', `data-plate="${MACHINE.quoter}"`, `data-plate="${MACHINE.intake}"`],
  heron: ['data-ink-source="heron"', `data-plate="${MACHINE.balance}"`],
  darch: ['data-ink-source="darch"', `data-plate="${MACHINE.splitter}"`],
  summers: ['data-ink-source="summers"', `data-plate="${MACHINE.watch}"`],
  alive: ['id="uptime"'],
  yours: [
    'data-ink-source="yours"', 'id="yours-form"', 'id="yours-input"', 'id="yours-clear"', 'id="yours-plate"',
    'id="mailto"', 'id="footer-total"', `data-plate="${MACHINE.visitor}"`,
  ],
};

function render(id: string): string {
  return renderToStaticMarkup(createElement(ScrollProvider, null, createElement(COMPONENT[id])));
}

/** The class attribute of the nearest `<tag …>` opening at or before `index`. */
function enclosingClass(html: string, index: number, tag: string): string {
  const start = html.lastIndexOf(`<${tag}`, index);
  if (start < 0) return '';
  const openTag = html.slice(start, html.indexOf('>', start) + 1);
  return /\bclass="([^"]*)"/.exec(openTag)?.[1] ?? '';
}

/** The markup of the element whose `<tag` opens at or before `index`, through its matching close. */
function elementAt(html: string, index: number, tag: string): string {
  const start = html.lastIndexOf(`<${tag}`, index);
  const re = new RegExp(`<${tag}\\b|</${tag}>`, 'g');
  re.lastIndex = start;
  let depth = 0;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    depth += m[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return html.slice(start, m.index + m[0].length);
  }
  return html.slice(start);
}

describe('section copy', () => {
  it('renders every bench section with the hooks later stages read', () => {
    for (const s of SECTIONS) {
      const html = render(s.id);
      expect(html, s.id).toContain(`id="${s.id}"`);
      expect(html, s.id).toContain('min-height:');
      for (const hook of COPY_HOOKS[s.id]) expect(html, `${s.id} keeps ${hook}`).toContain(hook);
    }
  });

  it('wraps the copy of every section but the hero in one sticky copy-col that holds its hooks', () => {
    for (const s of SECTIONS.slice(1)) {
      const html = render(s.id);
      expect(html.split('copy-col').length - 1, `${s.id} has one copy-col`).toBe(1);
      const at = html.indexOf('copy-col');
      const cls = enclosingClass(html, at, 'div');
      expect(cls, s.id).toMatch(/\bsticky\b/);
      expect(cls, s.id).toMatch(/\btop-24\b/);
      expect(cls, s.id).toMatch(/\bmd:top-28\b/);
      const wrapper = elementAt(html, at, 'div');
      for (const hook of COPY_HOOKS[s.id]) expect(wrapper, `${s.id} copy-col holds ${hook}`).toContain(hook);
      // sticky is bounded by its containing block: the grid must stretch to the section's min-height
      const grid = enclosingClass(html, html.indexOf('grid-cols-12'), 'div');
      expect(grid, s.id).toMatch(/(^|\s)min-h-\[inherit\](\s|$)/);
    }
  });

  it('keeps the ladder rungs as their own column beside the sticky copy', () => {
    const html = render('more');
    const wrapper = elementAt(html, html.indexOf('copy-col'), 'div');
    expect(html).toContain('id="rungs"');
    expect(html.split('data-rung=').length - 1).toBe(6);
    expect(wrapper).not.toContain('id="rungs"');
  });

  it('keeps the hero sticky itself, and clears the rail gutter in every section', () => {
    const hero = render('sentence');
    expect(hero).not.toContain('copy-col');
    expect(enclosingClass(hero, hero.indexOf('grid-cols-12'), 'div')).toMatch(/\bsticky\b/);
    for (const s of SECTIONS) {
      const grid = enclosingClass(render(s.id), render(s.id).indexOf('grid-cols-12'), 'div');
      expect(grid, s.id).toMatch(/\bpx-4\b/);
      expect(grid, s.id).toMatch(/\bmd:px-12\b/);
      expect(grid, s.id).not.toMatch(/\bmd:px-8\b/);
    }
  });
});
