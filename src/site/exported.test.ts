import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { copy } from './copy';
import { BUILT_TOTAL } from './Site';

const FILE = path.resolve(__dirname, '../../out/index.html');
const HAVE = existsSync(FILE);
if (!HAVE) console.warn('exported.test: out/index.html is missing, run npm run build first; skipping');

// Keys whose values are identifiers or link targets, not text on the page.
const NOT_TEXT = new Set(['id', 'shot', 'href', 'ctaHref', 'ghostHref']);
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (typeof v === 'function') return out;
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) if (!NOT_TEXT.has(k)) strings(x, out);
  }
  return out;
}

const decode = (s: string) =>
  s.replace(/<!-- -->/g, '').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

describe.skipIf(!HAVE)('exported html', () => {
  const raw = HAVE ? readFileSync(FILE, 'utf8') : '';
  const html = decode(raw);

  it('contains every copy string', () => {
    // logReduced is only rendered by the swarm at runtime (reduced motion), never in the static html.
    for (const s of strings({ ...copy, about: { ...copy.about, logReduced: '' } })) {
      if (s === '' || /^(mailto:|https?:)/.test(s)) continue;
      expect(html, s).toContain(s);
    }
  });
  it('contains nothing forbidden', () => {
    expect(raw).not.toMatch(/\$20|#75|notional|contracts|240-810|r[eé]sum[eé]/i);
  });
  it('sets the swarm attribute from the inline script', () => {
    expect(raw).toContain("dataset.swarm='on'");
  });
  it('has no data-built attribute before the swarm runs', () => {
    expect(raw).not.toMatch(/data-built=/);
  });
  it('wraps exactly BUILT_TOTAL elements', () => {
    expect((raw.match(/data-build="/g) ?? []).length).toBe(BUILT_TOTAL);
  });
  it('links the mail address and sets the title', () => {
    expect(raw).toContain('href="mailto:ethan.wanq@gmail.com"');
    expect(raw).toMatch(/<title>ethan wang<\/title>/);
  });
});
