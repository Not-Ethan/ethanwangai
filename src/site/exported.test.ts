import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { copy } from './copy';
import { facts } from '@/valley/facts';
import { SECTIONS } from '@/valley/sections';

const SRC = fileURLToPath(new URL('..', import.meta.url));
const OUT = path.join(SRC, '..', 'out', 'index.html');

function newestMtime(dir: string): number {
  let newest = 0;
  for (const f of readdirSync(dir, { recursive: true }) as string[]) {
    const st = statSync(path.join(dir, f));
    if (st.isFile()) newest = Math.max(newest, st.mtimeMs);
  }
  return newest;
}
const fresh = existsSync(OUT) && statSync(OUT).mtimeMs >= newestMtime(SRC);

/** The page's HTML with scripts removed, React's text separators and figure nowrap spans dropped and entities decoded. */
function pageText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
    .replace(/<!-- -->/g, '')
    .replace(/<span style="white-space:nowrap">([^<]*)<\/span>/g, '$1')
    .replace(/&#x27;|&#39;/g, '\'')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Every string the DOM-only site must render (spec §3.1). Not here: the hillside sentences (hover labels, Stage 4)
 *  and the build clock and tag (shown during and after a build, Stage 4). */
function domStrings(): string[] {
  const c = copy;
  return [
    c.meta.title, c.meta.description,
    c.nav.home, ...c.nav.items.map((i) => i.label),
    c.open.headline, c.open.deck, c.open.scrollCue, ...Object.values(c.open.labels),
    c.kalshi.heading, c.kalshi.body, ...c.kalshi.figures, c.kalshi.mono, c.kalshi.counter(facts.kalshi.trades),
    c.heron.heading, c.heron.body, c.heron.mono,
    c.darch.heading, c.darch.body, ...c.darch.figures, c.darch.mono,
    c.summers.heading, c.summers.body, ...c.summers.figures, c.summers.mono,
    c.alive.heading, c.alive.body,
    c.yours.heading, c.yours.body, c.yours.placeholder, c.yours.button, c.yours.hint,
    c.contact.heading, c.contact.body, ...c.contact.links.flatMap((l) => [l.label, l.href]), c.contact.mono,
  ];
}

describe.skipIf(!fresh)('the exported page, out/index.html (run `npm run build` first)', () => {
  const html = fresh ? readFileSync(OUT, 'utf8') : '';
  const text = pageText(html);

  it.each(domStrings())('renders %s', (s) => {
    expect(text).toContain(s);
  });
  it('has the eight sections in page order', () => {
    const at = SECTIONS.map((s) => html.indexOf(`<section id="${s.id}"`));
    for (const [i, p] of at.entries()) expect(p, SECTIONS[i].id).toBeGreaterThan(-1);
    for (let i = 1; i < at.length; i++) expect(at[i]).toBeGreaterThan(at[i - 1]);
  });
  it('paints the still behind the DOM and has the real input', () => {
    expect(html).toMatch(/class="valley-canvas"[^>]*valley-still\.jpg|valley-still\.jpg[^>]*class="valley-canvas"/);
    expect(html).toMatch(/<input[^>]*id="yours-input"[^>]*maxLength="140"|<input[^>]*maxLength="140"[^>]*id="yours-input"/i);
  });
  it('carries no theme script, no italics and no private numbers', () => {
    expect(html).not.toMatch(/data-theme/);
    expect(text).not.toMatch(/<(em|i)>/);
    expect(text).not.toMatch(/\$20|#\s?75|notional|contracts/i);
  });
});
