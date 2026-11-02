# Agents Build the Site: implementation plan

> **For agentic workers:** execute task by task. Sonnet implements a task; an Opus reviewer checks it against the spec and this plan; up to two fix rounds; then the next task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the valley site with a one-page portfolio laid out like aahil-khan.xyz, where a swarm of named cursors draws every element in with a selection box as you scroll.

**Architecture:** Next.js static export, React 19, Tailwind 4 utilities plus one global stylesheet of tokens and components. The swarm is four pure, tested modules (`prng`, `easing`, `timeline`, `scheduler`) and one DOM file (`Swarm.tsx`) that owns an `IntersectionObserver`, an overlay of cursor and box nodes, and one `requestAnimationFrame` loop. Every revealed element is a `<Built name>` wrapper.

**Tech stack:** next 16 (output export), react 19, tailwindcss 4, `@fontsource-variable/space-grotesk`, local JetBrains Mono, vitest 4 (node env).

**Spec:** `docs/plans/2026-11-02-agents-build-the-site-design.md` (read it first; section numbers below refer to it).

## Global constraints

- No real-world hooks: no API routes, fetch, keys, cron, storage of any kind. Static export only.
- Every string in `src/site/copy.ts`; every number in `src/site/facts.ts`. Lowercase. No em dash (—), no en dash (–). Never: `$20`, `#75`, `notional`, `contracts`, `240-810`, `resume`, `résumé`.
- The name is uppercase through CSS (`text-transform`), never in the string.
- Keep `src/app/fonts/jetbrains-mono-latin-wght-normal.woff2`; delete the Archivo file.
- Commits: stage by path (`git add <paths>`), message in plain sentences, end with `Co-Authored-By: Claude <model> <noreply@anthropic.com>` using the implementing model's name.
- Checks before every commit: `npm run lint && npm run typecheck && npm test && npm run build`.

## Review focus (things the spec implies but no unit test pins; the visual gate and reviewers check these)

1. Scrolling fast to the bottom must not leave the top half unbuilt or make the bottom wait: popped jobs whose rects are off-screen build instantly (scheduler test), and elements scrolled past before the loop starts still get built.
2. A `Built` element that is inside another `Built` element is forbidden (clip-paths would compound). Reviewers grep for nesting.
3. The hidden state must apply before first paint (the inline script runs before the body is parsed) and must never apply without JS or with reduced motion.
4. Window resize between a job's measure and its drag draws the box at stale coordinates for under a second; acceptable, but the rest spot must be recomputed from the measured rect, never from live layout.
5. The sticky experience index must not jump when the detail column is shorter than the viewport on phone (it is hidden there).

---

## Task 1: Reset, tokens, copy, bar and hero

**Files**
- Delete: `src/gl/`, `src/valley/`, `src/scroll/`, `src/fallback/`, `src/site/` (everything), `src/app/fonts/archivo-latin-wght-normal.woff2`, `public/valley-still.jpg`, `README.md` content about the valley (rewrite README in Task 5).
- Modify: `package.json`, `vitest.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`.
- Create: `src/site/copy.ts`, `src/site/facts.ts`, `src/site/copy.test.ts`, `src/site/Site.tsx`, `src/site/sections/Bar.tsx`, `src/site/sections/Hero.tsx`, `src/site/sections/ToTop.tsx`, `src/site/Built.tsx` (a plain pass-through for now; Task 4 replaces it).

**Interfaces produced**
- `copy` (shape in spec §6, typed `as const`), `facts`.
- `<Built name as className>`: in this task renders `<Tag data-build={name} className>` with no behaviour, so Task 2 can wrap elements and Task 4 only swaps the implementation.

- [ ] **Step 1: Remove the old site and dependencies**

```bash
git rm -r -q src/gl src/valley src/scroll src/fallback src/site public/valley-still.jpg src/app/fonts/archivo-latin-wght-normal.woff2
npm uninstall three @react-three/fiber @react-three/drei @types/three lenis framer-motion
npm install @fontsource-variable/space-grotesk
```

`vitest.config.ts` becomes:

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: { pool: 'forks', include: ['src/**/*.test.ts'], environment: 'node' },
});
```

- [ ] **Step 2: facts.ts**

```ts
// Every public number on the site, hand-edited. Public numbers only: never a dollar profit figure, never an exact
// leaderboard rank, never trade-size or volume figures. The copy tests check strings against these.
export const facts = {
  kalshi: { trades: 30_000, leaderboardTop: 100, since: 'jan 2026' },
  heron: { cities: 4, since: 'june 2026' },
  darch: { videosPerMonth: 3_000, viewsPerMonth: 20_000_000, from: 'june 2025', to: 'may 2026' },
  wvu: { claimsPerYearUsd: 100_000_000 },
  school: { classOf: 2028 },
} as const;
```

- [ ] **Step 3: copy.ts**

Transcribe spec §6 exactly into one `copy` object, `as const`, with these keys: `meta {title, description}`, `bar {mark, links: {label, href}[], cta, ctaHref, status: (agents, built, total) => string}`, `hero {eyebrow, name: [string, string], headline: {plain, bold}, cta, ctaHref, ghost, ghostPhone, ghostBadge, ghostHref}`, `about {eyebrow, h2, logTitle, logEmpty, logReduced, logLine: (agent, element, seconds) => string, lede, notes: string[]}`, `toolbox {eyebrow, h2, rows: {label, chips: string[]}[]}`, `experience {eyebrow, h2, jobs: {id, name, role, sub, when, place, lede, points: string[], chips: string[]}[]}`, `work {eyebrow, h2, intro, cases: {id, no, year, kind, title, tag, lede, chips: string[], shot: 'book'|'tab'|'grid'|'chat'}[]}`, `rest {eyebrow, h2, cards: {title, entries: {name, line}[]}[]}`, `closer {h2: [string, string], p, mail, links: {label, href}[], door: {title, paragraphs: string[], button, note}}`, `footer {left, right, credit, creditLink: {label, href}}`, `totop {aria, glyph}`.

`bar.status` returns `${agents} agents · ${built}/${total} built`. `about.logLine` returns `${agent} · ${element} · ${seconds.toFixed(2)}s`. Links: `about`→`#about`, `work`→`#work`, `experience`→`#experience`, `contact`→`#contact`; cta href `mailto:ethan.wanq@gmail.com`; ghost href `#about`; cta href `#work`.

Strings that contain numbers are built from `facts`, for example:

```ts
lede: `a trading algorithm that climbed into the top ${facts.kalshi.leaderboardTop} all-time on kalshi's crypto markets.`,
points: [..., `about ${facts.kalshi.trades.toLocaleString('en-US')} live trades so far. it runs while i sleep.`],
```

Word numbers stay words (`three thousand videos a month`, `four cities`, `about a hundred million dollars`); the test cross-checks them with a small word map.

- [ ] **Step 4: copy.test.ts**

```ts
import { describe, it, expect } from 'vitest';
import { copy } from './copy';
import { facts } from './facts';

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (typeof v === 'function') return out;
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
}
const ALL = strings(copy);

describe('voice', () => {
  it('is lowercase everywhere except urls', () => {
    for (const s of ALL) if (!/^(https?:|mailto:)/.test(s)) expect(s, s).toBe(s.toLowerCase());
  });
  it('has no em or en dashes', () => { for (const s of ALL) expect(s, s).not.toMatch(/[—–]/); });
  it('never prints the private or forbidden things', () => {
    for (const s of ALL) expect(s, s).not.toMatch(/\$20|#75|notional|contracts|240-810|r[eé]sum[eé]/i);
  });
  it('is not empty and has no leading or trailing space', () => { for (const s of ALL) expect(s).toBe(s.trim()); expect(ALL.length).toBeGreaterThan(80); });
});

describe('facts in the copy', () => {
  it('prints kalshi facts from facts.ts', () => {
    const k = copy.experience.jobs.find((j) => j.id === 'kalshi')!;
    expect(k.lede).toContain(`top ${facts.leaderboardTop ?? facts.kalshi.leaderboardTop}`);
    expect(k.points.join(' ')).toContain(facts.kalshi.trades.toLocaleString('en-US'));
    expect(copy.work.cases[0].lede).toContain(`top ${facts.kalshi.leaderboardTop}`);
  });
  it('spells the word numbers to match facts', () => {
    expect(facts.darch.videosPerMonth).toBe(3_000); expect(copy.experience.jobs.find((j) => j.id === 'darch')!.lede).toContain('three thousand videos a month');
    expect(facts.darch.viewsPerMonth).toBe(20_000_000); expect(copy.work.cases[2].lede).toContain('twenty million views a month');
    expect(facts.heron.cities).toBe(4); expect(copy.work.cases[1].lede).toContain('four cities');
    expect(facts.wvu.claimsPerYearUsd).toBe(100_000_000); expect(copy.experience.jobs.find((j) => j.id === 'wvu')!.lede).toContain('a hundred million dollars');
    expect(copy.rest.cards[0].entries[0].line).toContain(`class of ${facts.school.classOf}`);
  });
  it('formats the hud lines', () => {
    expect(copy.bar.status(6, 12, 43)).toBe('6 agents · 12/43 built');
    expect(copy.about.logLine('agent 02', 'h1 name', 0.614)).toBe('agent 02 · h1 name · 0.61s');
  });
  it('has the sections, jobs and cases the spec lists', () => {
    expect(copy.bar.links.map((l) => l.label)).toEqual(['about', 'work', 'experience', 'contact']);
    expect(copy.experience.jobs.map((j) => j.id)).toEqual(['kalshi', 'heron', 'wvu', 'darch', 'nist']);
    expect(copy.work.cases.map((c) => c.shot)).toEqual(['book', 'tab', 'grid', 'chat']);
    expect(copy.toolbox.rows.map((r) => r.label)).toEqual(['languages', 'backend', 'data', 'infra', 'markets']);
    expect(copy.closer.links.map((l) => l.label)).toEqual(['github ↗', 'linkedin ↗']);
    expect(copy.closer.mail).toBe('ethan.wanq@gmail.com');
  });
});
```

(Drop the `facts.leaderboardTop ??` fallback; use `facts.kalshi.leaderboardTop`.)

- [ ] **Step 5: globals.css**

Replace the file. Keep `@import "tailwindcss";` first. Then tokens (spec §4), base, type, components, the bar and hero, and the phone rules. Required selectors and values:

```css
:root {
  --canvas: #f7f5ee; --canvas-2: #e3e1da; --canvas-3: #f3f3f3; --canvas-4: #d8d6d0;
  --grid: rgba(22,22,22,0.11); --surface: #fff;
  --ink: #161616; --ink-muted: rgba(22,22,22,0.74); --ink-subtle: rgba(22,22,22,0.6);
  --accent: #facc00; --border: #161616; --bw: 2px;
  --radius-card: 14px; --radius-chip: 8px; --radius-pill: 999px;
  --shadow-2: 2px 2px 0 0 var(--ink); --shadow-4: 4px 4px 0 0 var(--ink); --shadow-6: 6px 6px 0 0 var(--ink);
  --ease-out: cubic-bezier(.16, 1, .3, 1);
  color-scheme: light;
}
html { scroll-behavior: smooth; }
html, body { background: var(--canvas); color: var(--ink); }
body { font-family: 'Space Grotesk Variable', system-ui, sans-serif; font-size: 17px; line-height: 1.65; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
.mono { font-family: var(--font-mono), ui-monospace, monospace; font-variant-numeric: tabular-nums; }
.wrap { max-width: 1180px; margin: 0 auto; padding: 0 72px; }
.eyebrow { display: flex; align-items: center; gap: 16px; font-size: 12px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-subtle); }
.eyebrow::after { content: ''; flex: 0 0 min(420px, 42%); height: 1px; background: rgba(22,22,22,.18); }
.h2 { font-size: 36px; font-weight: 700; line-height: 1.05; letter-spacing: -.01em; margin-top: 14px; }
.btn { display: inline-flex; align-items: center; gap: 12px; height: 52px; padding: 0 8px 0 24px; border: var(--bw) solid var(--border); border-radius: var(--radius-pill); background: var(--surface); box-shadow: var(--shadow-4); font-weight: 500; font-size: 16px; color: var(--ink); text-decoration: none; transition: transform .2s var(--ease-out), box-shadow .2s var(--ease-out); }
.btn:hover { transform: translate(2px, 2px); box-shadow: 2px 2px 0 0 var(--ink); }
.btn__icon { width: 38px; height: 38px; border-radius: 50%; background: var(--accent); display: grid; place-items: center; }
.btn-sm { height: 42px; padding: 0 16px; box-shadow: var(--shadow-2); font-size: 15px; }
.btn-accent { background: var(--accent); }
.ghost { display: inline-flex; align-items: center; gap: 12px; height: 52px; padding: 0 20px; border: var(--bw) dashed rgba(22,22,22,.32); border-radius: var(--radius-pill); color: var(--ink-muted); font-weight: 500; text-decoration: none; }
.ghost__dot { width: 8px; height: 8px; border-radius: 50%; border: 2px solid var(--accent); }
.badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border: 1.5px solid var(--ink); border-radius: var(--radius-pill); background: var(--accent); color: var(--ink); }
.card { background: var(--surface); border: var(--bw) solid var(--border); border-radius: var(--radius-card); box-shadow: var(--shadow-4); padding: 32px; }
.card-6 { box-shadow: var(--shadow-6); padding: 14px; }
.chip { display: inline-flex; align-items: center; padding: 6px 14px; border: 1.5px solid rgba(22,22,22,.24); border-radius: var(--radius-chip); background: var(--surface); font-size: 15px; line-height: 1.4; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.muted { color: var(--ink-muted); } .subtle { color: var(--ink-subtle); }
```

Bar and hero:

```css
.bar { position: fixed; inset: 0 0 auto 0; height: 64px; z-index: 40; display: flex; align-items: center; justify-content: space-between; padding: 0 72px; background: rgba(247,245,238,.88); backdrop-filter: blur(8px); border-bottom: 1px solid rgba(22,22,22,.1); }
.mark { width: 46px; height: 46px; display: grid; place-items: center; background: var(--accent); border: var(--bw) solid var(--border); border-radius: 8px; font-weight: 700; text-decoration: none; color: var(--ink); }
.bar__nav { display: flex; align-items: center; gap: 4px; }
.bar__nav a { padding: 10px 14px; font-size: 15px; font-weight: 500; color: var(--ink-muted); text-decoration: none; } .bar__nav a:hover { color: var(--ink); }
.bar__right { display: flex; align-items: center; gap: 16px; }
.status { font-size: 12px; height: 32px; padding: 0 12px; display: inline-flex; align-items: center; border: var(--bw) solid var(--border); border-radius: var(--radius-pill); background: var(--surface); }
.hero { position: relative; min-height: 100svh; overflow: hidden; }
.hero__grid { position: absolute; inset: -114px -44px; background-image: linear-gradient(var(--grid) 2px, transparent 2px), linear-gradient(90deg, var(--grid) 2px, transparent 2px); background-size: 96px 96px; }
.hero__glow { position: absolute; inset: 0; background: radial-gradient(circle at 50% 6%, rgba(255,255,255,.7), transparent 40%), radial-gradient(circle at 18% 55%, rgba(250,204,0,.28), transparent 32%); }
.hero__inner { position: relative; padding-top: 145px; padding-bottom: 108px; }
.name { margin-top: 36px; font-size: clamp(64px, 11.7vw, 168px); font-weight: 700; line-height: .82; letter-spacing: -.045em; text-transform: uppercase; }
.name span { display: block; }
.headline { margin-top: 28px; max-width: 851px; font-size: clamp(28px, 4.2vw, 60px); font-weight: 500; line-height: 1.12; letter-spacing: -.02em; }
.headline b { font-weight: 700; }
.hero__actions { margin-top: 36px; display: flex; flex-wrap: wrap; gap: 14px; align-items: center; }
.totop { position: fixed; right: 32px; bottom: 32px; width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; background: var(--surface); border: var(--bw) solid var(--border); box-shadow: var(--shadow-4); text-decoration: none; color: var(--ink); opacity: 0; pointer-events: none; transition: opacity .25s; z-index: 40; }
.totop[data-show="1"] { opacity: 1; pointer-events: auto; }
@media (max-width: 767px) {
  .wrap { padding: 0 20px; } .bar { padding: 0 20px; } .bar__nav, .status { display: none; }
  .hero__inner { padding-top: 120px; } .headline { margin-top: 20px; } .totop { width: 44px; height: 44px; right: 20px; bottom: 20px; }
}
```

- [ ] **Step 6: layout.tsx and page.tsx**

```tsx
import '@fontsource-variable/space-grotesk';
import localFont from 'next/font/local';
import './globals.css';
import type { Metadata } from 'next';
import { copy } from '@/site/copy';

const mono = localFont({ src: './fonts/jetbrains-mono-latin-wght-normal.woff2', variable: '--font-mono', weight: '100 800', display: 'swap', adjustFontFallback: false });

export const metadata: Metadata = {
  title: copy.meta.title, description: copy.meta.description, metadataBase: new URL('https://ethanwang.ai'),
  openGraph: { title: copy.meta.title, description: copy.meta.description, url: 'https://ethanwang.ai', type: 'website', images: [{ url: '/og.png', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', title: copy.meta.title, description: copy.meta.description, images: ['/og.png'] },
};

// Runs before the body is parsed: with JS and without reduced motion the page starts hidden and the swarm reveals it
// (spec §7.3). Without JS the attribute is never set and everything is visible.
// If the app never hydrates (a blocked or failed bundle) the page shows itself after 6 s: Swarm.tsx sets swarmReady on mount.
const SWARM_SCRIPT = "(function(){try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;var d=document.documentElement;d.dataset.swarm='on';setTimeout(function(){if(!d.dataset.swarmReady){delete d.dataset.swarm}},6000)}catch(e){}})()";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mono.variable}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: SWARM_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
```

`page.tsx` renders `<Site />`. `Site.tsx` renders `<Bar/>`, `<main>` with `<Hero/>` (other sections come in Task 2), `<ToTop/>`.

- [ ] **Step 7: Built.tsx (pass-through for now)**

```tsx
import { createElement, type ReactNode } from 'react';
export type BuiltTag = 'div' | 'section' | 'header' | 'footer' | 'nav' | 'ul' | 'ol' | 'li' | 'p' | 'h1' | 'h2' | 'article' | 'a' | 'span';
export interface BuiltProps { name: string; as?: BuiltTag; className?: string; id?: string; href?: string; children?: ReactNode }
/** A thing the agents build. Task 4 gives it behaviour; until then it only carries data-build. */
export function Built({ name, as = 'div', className, id, href, children }: BuiltProps) {
  return createElement(as, { 'data-build': name, className, id, href }, children);
}
```

- [ ] **Step 8: Bar, Hero, ToTop**

Bar: `<header class="bar">` with `<Built name="mark" as="a" className="mark" href="#top">ew</Built>`, `<Built name="nav" as="nav" className="bar__nav">` holding the four links, and `<div class="bar__right">` holding `<span class="status mono" data-status>` (text from `copy.bar.status(6, 0, 43)`; the 43 comes from an exported constant `BUILT_TOTAL = 43` in `src/site/Site.tsx`) and `<Built name="cta" as="a" className="btn btn-sm" href={copy.bar.ctaHref}>`.

Hero: `<section id="top" class="hero">` with `.hero__grid`, `.hero__glow`, then `<div class="wrap hero__inner">`: `<Built name="eyebrow" as="p" className="eyebrow">`, `<Built name="h1 name" as="h1" className="name">` with two spans, `<Built name="headline" as="p" className="headline">` plain text then `<b>` bold, `<Built name="actions" className="hero__actions">` with the `.btn` (text span + `.btn__icon` containing a 16 px → arrow SVG) and the `.ghost` (dot, text, badge). The ghost text switches to `ghostPhone` under 768 px with two spans and CSS (`.only-phone` / `.only-desktop`).

ToTop: a client component; `<a class="totop" href="#top" aria-label>` whose `data-show` flips at `scrollY > 600` (passive scroll listener).

- [ ] **Step 9: Checks and commit**

Run `npm run lint && npm run typecheck && npm test && npm run build`. Expect green; `out/index.html` exists. Commit: `Reset the site: tokens, copy and facts, bar and hero in the reference layout`.

---

## Task 2: The remaining sections, shots and phone layout

**Files**
- Create: `src/site/sections/About.tsx`, `Toolbox.tsx`, `Experience.tsx`, `Work.tsx`, `Rest.tsx`, `Closer.tsx`, `Footer.tsx`, `src/site/Shots.tsx`, `src/site/exported.test.ts`.
- Modify: `src/site/Site.tsx`, `src/app/globals.css`.

**Interfaces**
- Consumes `copy`, `Built`.
- Produces: the About log card renders `<Built name="log" className="card log">` with a `<p class="eyebrow">build log</p>` and `<ol class="log__lines mono" data-log>` containing a single `<li>` with `copy.about.logEmpty` (Task 4 fills it). The Closer door renders `<button class="btn btn-accent" data-rebuild>` (Task 4 wires it).

- [ ] **Step 1: Section components** (markup per spec §5, names per §7.7)

About (`#about`): `.wrap` → `<Built name="h2 about" className="section__head">` (eyebrow + h2) → `.about__grid` (grid-template-columns 386px 1fr; gap 72px) → log card (left; `height: 482px`) and right column with `<Built name="lede" as="p" className="lede">` and `<Built name="notes" className="notes">` (three `<p class="muted">`).

Toolbox (`#toolbox`, class `band-2`): head `h2 toolbox`; `.rows` → for each row `<Built name={`row ${row.label}`} className="row">` with `<h3 class="row__label">` and `.chips`.

Experience (`#experience`): `.xp` grid `319px 1fr`, gap 80 px. `<aside class="xp__index">` (sticky top 96 px) with head `h2 experience` and `<Built name="index" as="ol" className="xp__list">`: each `<li><a href="#job-{id}">` with a dot span, name, sub. The detail column: for each job `<Built name={`card ${job.id}`} as="article" className="card job" id={`job-${id}`}>`: `<h3 class="job__title only-phone">{name} · {role}</h3>`, `<p class="job__when"><b>{when}</b> · <span class="subtle">{place}</span></p>`, `<p class="job__lede">`, `<ul class="job__points">` (yellow 8 px square bullets via `::before`), `.chips`. A small client component `IndexHighlight` sets `data-active` on the index item whose card centre is nearest the viewport centre (rAF-throttled scroll listener).

Work (`#work`, class `band-3`): head `h2 work` (eyebrow, h2, `<p class="muted">` intro). `.cases` → for each case `<article class="case" data-flip={i % 2 === 1}>`: `<Built name={`shot ${id}`} className="card card-6 case__shot">` containing `<Shot kind={case.shot} />` and `<Built name={`body ${id}`} className="case__body">` with `<p class="mono case__no">{no} / {year} · {kind}</p>`, `<h3>`, `<p class="case__tag muted">`, `<p class="case__lede">`, `.chips`. Grid `510px 1fr` gap 64 px; `[data-flip="true"]` swaps column order (`direction: rtl` on the grid with `direction: ltr` reset on children, or `order`).

Rest (`#rest`): head `h2 rest`; `.creds` three columns gap 20 px; each `<Built name={`card ${title}`} className="card cred">` with `<h3 class="eyebrow-sm">` (12 px uppercase subtle, no rule) and `<ul>` of entries (`<b>` name, `<span class="muted">` line), entries separated by 1 px rules.

Closer (`#contact`, class `band-4 closer`): `.closer__field` absolute radial (`radial-gradient(circle at 12% 30%, rgba(250,204,0,.35), transparent 28%)`), `.wrap` → `<Built name="h2 contact" as="h2" className="closer__h2">` two spans, `<Built name="p contact" as="p" className="closer__p muted">`, `<Built name="mail" as="a" className="closer__mail" href="mailto:…">`, `<Built name="links" className="closer__links">` two `.btn.btn-sm` anchors (`target="_blank" rel="noopener noreferrer"`), `<Built name="door" className="door">` → `.door__copy` (title + paragraphs) and `.door__go` (`<button class="btn btn-accent" data-rebuild>` + note).

Footer: `<Built name="footer" as="footer" className="foot band-4">` → `.wrap` with the left/right spans and the credit line.

- [ ] **Step 2: Shots.tsx**

`export function Shot({ kind }: { kind: 'book' | 'tab' | 'grid' | 'chat' })` returns an inline `<svg viewBox="0 0 480 270" class="shot" aria-hidden>` on a `#fbfaf6` ground with a 1 px `rgba(22,22,22,.12)` frame, 10 px radius. Geometry:
- `book`: a vertical centre line at x 240; eight rows (y 34 to 230, 28 px apart): to the left a bar in `rgba(22,22,22,.6)` with widths [120, 96, 150, 72, 132, 60, 110, 84], to the right a bar in `#facc00` with widths [84, 140, 66, 118, 52, 126, 90, 108], each 14 px tall with a 2 px radius; a polyline sparkline along y 250 ± 10 in ink 1.5 px over 12 points.
- `tab`: a 300 × 230 receipt centred (white, ink 2 px border, 12 px radius); five text lines in mono 13 px drawn as `<text>`: `heron bar tab`, `2 pints · 14.00`, `wings · 12.00`, `home team won · yes`, `drinks · free` (the last in `#facc00` on an ink pill); below it `hedged on kalshi ✓` 11 px subtle; a zig-zag bottom edge is optional.
- `grid`: 4 × 3 tiles 96 × 54 with 12 px gaps starting at (40, 30), each `rgba(22,22,22,.08)` with a 10 px play triangle in ink at 60 %; tile index 5 is `#facc00` with an ink triangle; a 400 × 6 progress track at y 246 with a 62 % ink fill.
- `chat`: a 400 × 210 window at (40, 30) white with ink 2 px border and a 28 px title bar (three 8 px dots); a right-aligned question bubble (`rgba(22,22,22,.08)`, text `where's the vpn doc?` mono 12 px), a left answer bubble (white, 1.5 px border, text `it-handbook, section 4. here's the link.`), and a chip under it `cited: it-handbook.pdf` on `#facc00`.

Text in shots is drawn with `<text>` using the mono font and is lowercase; it is not in `copy.ts` (it is decoration) but the exported test's forbidden check still covers it.

- [ ] **Step 3: CSS for the sections and the phone**

Add to `globals.css`: `.band-2/.band-3/.band-4` backgrounds; section paddings (about 108 px, toolbox 81 px, experience 108 px, work 108 px, rest 108 px, closer 144 px, footer 32 px); `.section__head` margin-bottom 48 px; `.lede` 30 px / 500 / 1.35 / -.02em; `.notes p + p` margin 20 px; `.log` is `display:flex; flex-direction:column`; `.log__lines` 13 px mono, gap 6 px, `li` with the agent name coloured via `style="--agent: …"` and `.log__agent { color: var(--agent) }`; `.rows .row` grid `152px 1fr`, padding 14 px 0, border-top 1 px `rgba(22,22,22,.1)` (first row border-bottom too); `.row__label` 12 px uppercase subtle .14em; `.xp` grid; `.xp__index { position: sticky; top: 96px; align-self: start }`; `.xp__list li a` block, padding 11 px 12 px, radius 8 px, `[data-active] a { background: rgba(22,22,22,.05) }`, dot 10 px round hollow 1.5 px ink, filled `#facc00` with ink border when active; `.job + .job` margin-top 36 px; `.job__points li::before` 8 px yellow square with 1.5 px ink border; `.case` grid, `.case + .case` margin-top 90 px; `.case__no` 13 px .1em subtle; `.case h3` clamp(32px, 3.3vw, 48px) 700 -.03em 1.05; `.case__tag` 20 px; `.shot { display:block; width:100%; height:auto; border-radius: 10px }`; `.creds` grid 3 × 1fr gap 20 px; `.cred ul li + li { border-top: 1px solid rgba(22,22,22,.12); margin-top: 14px; padding-top: 14px }`; `.closer` relative with the field; `.closer__h2` clamp(48px, 6.7vw, 96px) 700 .95 -.04em; `.closer__p` 18 px max-width 554 px margin-top 28 px; `.closer__mail` 32 px 500 -.02em, `border-bottom: 3px solid var(--accent)`, inline-block, margin-top 36 px; `.closer__links` margin-top 36 px, flex gap 12 px; `.door` dashed 2 px `rgba(22,22,22,.38)`, radius 14 px, padding 32 px, margin-top 72 px, grid `1fr 240px` gap 48 px; `.door__title` 16 px 700 muted; `.door p` 16 px muted; `.door__note` 16 px muted margin-top 12 px, text-align center; `.foot` 15 px subtle, `.wrap` flex space-between wrap, credit line 13 px full width margin-top 8 px with underlined link.

Phone (`max-width: 767px`): `.about__grid`, `.xp`, `.case`, `.creds`, `.door` all `grid-template-columns: 1fr`; `.log { height: 320px }`; `.xp__index { display: none }`; `.only-phone { display: block }` and `.only-desktop { display: none }` (defaults inverted on desktop); `.row { grid-template-columns: 1fr; gap: 10px }`; `.case[data-flip] { direction: ltr }` and the shot always first; `.closer { padding: 96px 0 }`; `.door__go { text-align: left }`.

- [ ] **Step 4: exported.test.ts**

Builds nothing itself; reads `out/index.html` (skip with a clear message if it does not exist) and checks: every string from `copy` (the same `strings()` helper; skip functions and hrefs starting with `mailto:`/`https:`) appears after decoding `&#x27;`, `&quot;`, `&amp;`, `&lt;`, `&gt;` and stripping `<!-- -->`; the forbidden regex never matches the HTML; the inline script contains `dataset.swarm='on'`; no `data-built=` attribute is present; the count of `data-build="` equals `BUILT_TOTAL` (import it from `@/site/Site`); `href="mailto:ethan.wanq@gmail.com"` is present; the `<title>` is `ethan wang`.

Because `npm test` runs before `npm run build` in the check line, order the check line as `npm run lint && npm run typecheck && npm run build && npm test` from this task on, and say so in the commit message.

- [ ] **Step 5: Checks and commit**

Green checks; `BUILT_TOTAL` is 43 and the count matches. Commit: `Add the remaining sections, the four drawn shots and the phone layout`.

---

## Task 3: The swarm's pure modules

**Files**
- Create: `src/swarm/prng.ts`, `prng.test.ts`, `easing.ts`, `easing.test.ts`, `timeline.ts`, `timeline.test.ts`, `scheduler.ts`, `scheduler.test.ts`, `agents.ts`, `agents.test.ts`.

**Interfaces produced** (Task 4 consumes these exactly)

- [ ] **Step 1: prng.ts**

```ts
/** mulberry32: small, seeded, deterministic. Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

Test: same seed → same first 10 values; different seed differs; 1,000 draws all in [0, 1).

- [ ] **Step 2: easing.ts**

```ts
export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
export const easeOutCubic = (t: number): number => 1 - (1 - clamp(t, 0, 1)) ** 3;
export const smoothstep = (t: number): number => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };
```

Test: endpoints 0 and 1; monotone over 100 samples; clamp outside [0, 1].

- [ ] **Step 3: timeline.ts** (spec §7.5)

```ts
import { clamp, easeOutCubic, smoothstep } from './easing';

export interface Rect { x: number; y: number; w: number; h: number }
export interface Point { x: number; y: number }
export type Phase = 'travel' | 'press' | 'drag' | 'release' | 'linger' | 'done';

export const PAD = 4;
export const TRAVEL_SPEED = 1.8;   // px per ms
export const TRAVEL_MIN = 180, TRAVEL_MAX = 700;
export const PRESS = 70;
export const DRAG_SPEED = 1.4;     // px per ms along the diagonal
export const DRAG_MIN = 280, DRAG_MAX = 950;
export const RELEASE = 120;
export const LINGER = 600;
export const LINGER_FADE = 250;    // the last 250 ms of linger fade the box out

export interface JobTimeline {
  from: Point; rect: Rect;
  travel: number; drag: number;
  tTravel: number; tPress: number; tDrag: number; tRelease: number; tEnd: number;   // phase end times, ms from start
}

export function jobTimeline(from: Point, rect: Rect): JobTimeline {
  const dist = Math.hypot(rect.x - PAD - from.x, rect.y - PAD - from.y);
  const travel = clamp(dist / TRAVEL_SPEED, TRAVEL_MIN, TRAVEL_MAX);
  const drag = clamp(Math.hypot(rect.w, rect.h) / DRAG_SPEED, DRAG_MIN, DRAG_MAX);
  const tTravel = travel, tPress = tTravel + PRESS, tDrag = tPress + drag, tRelease = tDrag + RELEASE, tEnd = tRelease + LINGER;
  return { from: { x: from.x, y: from.y }, rect: { ...rect }, travel, drag, tTravel, tPress, tDrag, tRelease, tEnd };
}

export interface JobSample {
  phase: Phase;
  cx: number; cy: number;   // cursor tip, document px
  f: number;                // drag progress 0..1 (eased)
  scale: number;            // cursor scale (0.92 while pressed)
  boxAlpha: number;         // stroke, handles and label opacity
  fillAlpha: number;        // fill opacity (1 while dragging, fades through release)
}

/** Where the agent rests after the job: the drag end plus (6, 8). */
export function restPoint(tl: JobTimeline): Point {
  return { x: tl.rect.x + tl.rect.w + PAD + 6, y: tl.rect.y + tl.rect.h + PAD + 8 };
}

/** Samples the job at t ms from its start. Allocation-free: writes into `out`. */
export function sampleJob(tl: JobTimeline, t: number, out: JobSample): JobSample {
  const { rect } = tl;
  const sx = rect.x - PAD, sy = rect.y - PAD, ex = rect.x + rect.w + PAD, ey = rect.y + rect.h + PAD;
  if (t < tl.tTravel) {
    const u = easeOutCubic(t / tl.travel);
    out.phase = 'travel'; out.cx = tl.from.x + (sx - tl.from.x) * u; out.cy = tl.from.y + (sy - tl.from.y) * u;
    out.f = 0; out.scale = 1; out.boxAlpha = 0; out.fillAlpha = 0;
  } else if (t < tl.tPress) {
    out.phase = 'press'; out.cx = sx; out.cy = sy; out.f = 0; out.scale = 0.92; out.boxAlpha = 1; out.fillAlpha = 1;
  } else if (t < tl.tDrag) {
    const f = smoothstep((t - tl.tPress) / tl.drag);
    out.phase = 'drag'; out.cx = sx + (ex - sx) * f; out.cy = sy + (ey - sy) * f; out.f = f; out.scale = 1; out.boxAlpha = 1; out.fillAlpha = 1;
  } else if (t < tl.tRelease) {
    const u = (t - tl.tDrag) / RELEASE;
    out.phase = 'release'; out.cx = ex; out.cy = ey; out.f = 1; out.scale = 1; out.boxAlpha = 1; out.fillAlpha = 1 - u;
  } else if (t < tl.tEnd) {
    const left = tl.tEnd - t;
    out.phase = 'linger'; out.cx = ex; out.cy = ey; out.f = 1; out.scale = 1; out.fillAlpha = 0;
    out.boxAlpha = left < LINGER_FADE ? left / LINGER_FADE : 1;
  } else {
    out.phase = 'done'; out.cx = ex; out.cy = ey; out.f = 1; out.scale = 1; out.boxAlpha = 0; out.fillAlpha = 0;
  }
  return out;
}

/** The element's clip for a drag progress f: the box from the top-left grows to the bottom-right. */
export function clipFor(f: number): string {
  const r = ((1 - f) * 100).toFixed(2);
  return f >= 1 ? '' : `inset(0 ${r}% ${r}% 0)`;
}
```

Tests: a far job clamps travel to 700 and a near one to 180; a 10 × 10 rect clamps drag to 280 and a 2000 × 1000 one to 950; at `t = tTravel` the cursor is at `(x - 4, y - 4)`; at `t = tDrag` at `(x + w + 4, y + h + 4)`; `f` is monotone through the drag and exactly 0 at `tPress` and 1 at `tDrag`; `fillAlpha` is 0 at `tRelease`; `boxAlpha` is 1 at `tEnd - 250` and 0 at `tEnd`; `clipFor(0)` is `inset(0 100.00% 100.00% 0)`, `clipFor(1)` is `''`; `restPoint` is the drag end plus (6, 8); `sampleJob` reuses `out` (same object identity).

- [ ] **Step 4: agents.ts** (spec §7.2)

```ts
import type { Point, Rect } from './timeline';

export const AGENT_COLOURS = ['#2563eb', '#e5484d', '#16a34a', '#7c3aed', '#f97316', '#db2777'] as const;
export const agentName = (i: number): string => `agent ${String(i + 1).padStart(2, '0')}`;
export const agentCount = (viewportWidth: number): number => (viewportWidth >= 768 ? 6 : 3);
export const OUTSIDE = 40;

/** Agent i starts 40 px outside the viewport on edge i % 3 (top, left, right), somewhere along it. `vp` is in document px. */
export function initialPosition(i: number, vp: Rect, rand: () => number): Point {
  const edge = i % 3;
  if (edge === 0) return { x: vp.x + rand() * vp.w, y: vp.y - OUTSIDE };
  if (edge === 1) return { x: vp.x - OUTSIDE, y: vp.y + rand() * vp.h };
  return { x: vp.x + vp.w + OUTSIDE, y: vp.y + rand() * vp.h };
}

/** Idle breathing, in px, for time t (seconds) and a per-agent phase. */
export function idleDrift(t: number, phase: number, out: Point): Point {
  out.x = 5 * Math.sin((2 * Math.PI * t) / 2.4 + phase);
  out.y = 4 * Math.cos((2 * Math.PI * t) / 3.1 + phase);
  return out;
}

export const JITTER_MAX = 120;
export const jitter = (rand: () => number): number => rand() * JITTER_MAX;
```

Tests: names pad to two digits; counts 6 / 3 at 768 / 767; positions lie outside the viewport on the right edge for each i; drift stays within ±5 / ±4; jitter in [0, 120).

- [ ] **Step 5: scheduler.ts** (spec §7.4)

```ts
import { jobTimeline, restPoint, type JobTimeline, type Point, type Rect } from './timeline';
import { jitter } from './agents';

export interface Job { id: number; name: string }
export interface AgentState {
  id: number; x: number; y: number; phase: number;
  busy: boolean; job: Job | null; timeline: JobTimeline | null; startAt: number;
}
export interface Dispatch { started: { agent: AgentState; job: Job; timeline: JobTimeline }[]; instant: Job[]; dropped: Job[] }

export const OFFSCREEN_MARGIN = 200;
export const QUEUE_FACTOR = 2;

export function makeAgent(id: number, at: Point, phase: number): AgentState {
  return { id, x: at.x, y: at.y, phase, busy: false, job: null, timeline: null, startAt: 0 };
}

export function nearestFreeAgent(agents: readonly AgentState[], x: number, y: number): number {
  let best = -1, bestD = Infinity;
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    if (a.busy) continue;
    const d = (a.x - x) ** 2 + (a.y - y) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

export function isOffscreen(rect: Rect, vp: Rect, margin = OFFSCREEN_MARGIN): boolean {
  return rect.x + rect.w < vp.x - margin || rect.x > vp.x + vp.w + margin || rect.y + rect.h < vp.y - margin || rect.y > vp.y + vp.h + margin;
}

/** The queue and the assignment rule. Knows nothing about the DOM: the caller measures rects. */
export class Scheduler {
  readonly queue: Job[] = [];
  constructor(readonly agents: AgentState[], private readonly rand: () => number) {}

  enqueue(job: Job): void { this.queue.push(job); }

  /** Hands queued jobs to idle agents. `measure` returns a job's rect in document px, or null if its element is gone. */
  dispatch(now: number, vp: Rect, measure: (job: Job) => Rect | null): Dispatch {
    const out: Dispatch = { started: [], instant: [], dropped: [] };
    const cap = QUEUE_FACTOR * this.agents.length;
    while (this.queue.length > cap) out.instant.push(this.queue.shift()!);
    while (this.queue.length > 0 && this.agents.some((a) => !a.busy)) {
      const job = this.queue.shift()!;
      const rect = measure(job);
      if (!rect) { out.dropped.push(job); continue; }
      if (isOffscreen(rect, vp)) { out.instant.push(job); continue; }
      const i = nearestFreeAgent(this.agents, rect.x, rect.y);
      const agent = this.agents[i];
      const timeline = jobTimeline({ x: agent.x, y: agent.y }, rect);
      agent.busy = true; agent.job = job; agent.timeline = timeline; agent.startAt = now + jitter(this.rand);
      out.started.push({ agent, job, timeline });
    }
    return out;
  }

  /** The agent is free again (start of linger): it rests at the box's bottom-right plus (6, 8). */
  free(agent: AgentState): void {
    if (agent.timeline) { const p = restPoint(agent.timeline); agent.x = p.x; agent.y = p.y; }
    agent.busy = false; agent.job = null; agent.timeline = null; agent.startAt = 0;
  }

  /** Rebuild: clear the queue and free every agent where it stands. */
  reset(): void {
    this.queue.length = 0;
    for (const a of this.agents) { if (a.busy && a.timeline) { a.x = a.timeline.from.x; a.y = a.timeline.from.y; } a.busy = false; a.job = null; a.timeline = null; a.startAt = 0; }
  }
}
```

Tests (`scheduler.test.ts`, with `mulberry32(1)` and a viewport `{x:0,y:0,w:1440,h:900}`):
1. nearest free: three idle agents at (0,0), (500,0), (1000,0); job rect at (520, 10) → agent 1; a busy agent is skipped; `-1` when all busy.
2. offscreen: a rect at y 1300 (below 900 + 200) is instant; at y 1050 it is not.
3. dispatch assigns at most one job per idle agent per call, sets `busy`, `startAt` in `[now, now + 120)`, and the timeline's `from` is the agent's position.
4. queue cap: 6 agents, 20 jobs enqueued, all on-screen → 8 oldest become instant, 6 start, 6 remain queued.
5. a `measure` returning null drops the job without touching an agent.
6. `free` moves the agent to `restPoint` and clears the job; the next dispatch can use it.
7. `reset` empties the queue and frees all agents.
8. Ordering: with one agent, jobs start in enqueue order.

- [ ] **Step 6: Checks and commit**

Green. Commit: `Add the swarm's pure modules: prng, easing, job timeline, scheduler, agents`.

---

## Task 4: The swarm in the DOM

**Files**
- Create: `src/swarm/Swarm.tsx`, `src/swarm/useSwarmStats.ts`, `src/swarm/swarmStore.ts`.
- Modify: `src/site/Built.tsx` (real implementation), `src/site/Site.tsx` (wrap in `<Swarm>`), `src/site/sections/Bar.tsx` (live status), `src/site/sections/About.tsx` (live log), `src/site/sections/Closer.tsx` (rebuild button), `src/app/globals.css` (hidden state, overlay, cursors, boxes, log colours), `src/site/exported.test.ts` (unchanged assertions must still pass).

**Interfaces**
- Consumes everything from Task 3.
- Produces `useSwarmStats(): { on: boolean; agents: number; built: number; total: number; log: LogLine[]; rebuild(): void; busy: boolean }` where `LogLine = { id: number; agent: number; name: string; seconds: number }`.

- [ ] **Step 1: swarmStore.ts**

A tiny external store for `useSyncExternalStore`: `createSwarmStore()` returns `{ get, subscribe, set(partial) }` holding `{ on, agents, built, total, log, busy }`. `set` replaces the snapshot object (new identity) and notifies. The server snapshot is `{ on: false, agents: 6, built: 0, total: 43, log: [], busy: false }`.

- [ ] **Step 2: Swarm.tsx**

A client component `<Swarm>{children}</Swarm>` that provides `SwarmContext = { register(el: HTMLElement, name: string): () => void }` and renders the overlay before the children:

```tsx
<div className="swarm" ref={overlayRef} aria-hidden />
{children}
```

In one `useEffect` on mount:
0. `document.documentElement.dataset.swarmReady = '1'` first thing (cancels the inline script's 6 s reveal fallback).
1. `on = document.documentElement.dataset.swarm === 'on'`. If not on: store `{ on: false }`, and `register` becomes a no-op that only increments `total`. Return.
2. `n = agentCount(window.innerWidth)`; `rand = mulberry32(2026)`; `vp()` reads `{ x: scrollX, y: scrollY, w: innerWidth, h: innerHeight }`; agents = `makeAgent(i, initialPosition(i, vp(), rand), rand() * Math.PI * 2)`; `scheduler = new Scheduler(agents, rand)`.
3. Overlay nodes, created with `document.createElement` into `overlayRef.current`: per agent a `.cursor` (`<svg>` arrow + `<span class="cursor__tag mono">` with the name, `style="--agent: colour"`), and a pool of `2n` `.selbox` nodes (each with four `.selbox__h` handles and a `.selbox__label mono`). Keep them in arrays.
4. Registry: `Map<HTMLElement, { id, name, el, built }>`; `register` adds, observes with the shared `IntersectionObserver` (`threshold: 0.1`, `rootMargin: '0px 0px 80px 0px'`), updates `total`, and returns an unregister that unobserves and deletes. The observer callback enqueues `{ id, name }` for intersecting entries and unobserves them (`pending` set so a re-observe after rebuild works).
5. Start gate: `started = false`; `document.fonts.ready.then(() => setTimeout(() => { started = true }, 250))`.
6. The loop (`requestAnimationFrame`): `now = performance.now()`; if started, `dispatch(now, vp(), measure)` where `measure` finds the entry by id, returns null if the element is detached, else `getBoundingClientRect()` plus scroll offsets. For `instant` and `dropped` jobs: mark built (`el.dataset.built = '1'`, `built++`). For `started` jobs: take a free box from the pool (`boxUntil <= now`), set its `--agent`, label text, and `boxUntil = startAt + timeline.tEnd`; remember `{ box, entry }` on the agent. Then for every agent: if busy, `t = now - startAt`; if `t < 0` write the cursor at the agent's current position; else `sampleJob` and write cursor `transform: translate3d(cx, cy, 0) scale(s)`; write the box `transform: translate3d(rect.x, rect.y, 0)`, `width: f·w`, `height: f·h` (0 × 0 during press), `opacity: boxAlpha`, `--fill: fillAlpha`; write `el.style.clipPath = clipFor(f)` during press and drag; at the first frame with `phase === 'release'`: `el.dataset.built = '1'`, `el.style.clipPath = ''`, `built++`, push a log line `{ agent: id, name, seconds: (timeline.tDrag) / 1000 }` (keep the last 9), notify the store; at the first frame with `phase === 'linger'`: `scheduler.free(agent)`. If idle: if the cursor is inside the viewport (plus 40 px), write `transform` with `idleDrift(now / 1000, phase)` added to `(x, y)`, clamped 12 px inside the viewport; else skip. Lingering boxes (not attached to a busy agent) keep sampling their own stored timeline for `opacity` until `boxUntil`; then `opacity: 0`.
7. `busy` in the store is `agents.some(busy) || queue.length > 0`; update it when it changes.
8. `rebuild()`: for each entry: `delete el.dataset.built`, `entry.built = false`, `observer.observe(el)`; `scheduler.reset()`; all boxes `opacity: 0`, `boxUntil = 0`; store `{ built: 0, log: [] }`.
9. Cleanup: cancel the frame, disconnect the observer, remove overlay children.

The cursor SVG (18 px): `<svg viewBox="0 0 18 18"><path d="M2 1.5 L2 14.5 L5.6 11.2 L8 16.5 L10.6 15.4 L8.2 10.2 L13 10.2 Z" fill="var(--agent)" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`. The tip is the SVG's (2, 1.5), so offset the cursor node by `(-2, -1.5)` px.

- [ ] **Step 3: Built.tsx (real)**

```tsx
'use client';
import { createElement, useContext, useEffect, useRef, type ReactNode } from 'react';
import { SwarmContext } from '@/swarm/Swarm';
export type BuiltTag = 'div' | 'section' | 'header' | 'footer' | 'nav' | 'ul' | 'ol' | 'li' | 'p' | 'h1' | 'h2' | 'article' | 'a' | 'span';
export interface BuiltProps { name: string; as?: BuiltTag; className?: string; id?: string; href?: string; children?: ReactNode }
export function Built({ name, as = 'div', className, id, href, children }: BuiltProps) {
  const ref = useRef<HTMLElement>(null);
  const swarm = useContext(SwarmContext);
  useEffect(() => { const el = ref.current; if (!el || !swarm) return; return swarm.register(el, name); }, [swarm, name]);
  return createElement(as, { ref, 'data-build': name, className, id, href }, children);
}
```

- [ ] **Step 4: CSS**

```css
html[data-swarm="on"] [data-build]:not([data-built]) { clip-path: inset(0 100% 100% 0); }
.swarm { position: absolute; top: 0; left: 0; width: 0; height: 0; overflow: visible; pointer-events: none; z-index: 60; }
.cursor { position: absolute; top: -1.5px; left: -2px; width: 18px; height: 18px; will-change: transform; filter: drop-shadow(0 1px 1px rgba(22,22,22,.2)); }
.cursor__tag { position: absolute; left: 14px; top: 16px; white-space: nowrap; font-size: 11px; line-height: 1; padding: 3px 6px; border-radius: 4px; background: var(--agent); color: #fff; }
.selbox { position: absolute; top: 0; left: 0; opacity: 0; border: 1.5px solid var(--agent); background: color-mix(in srgb, var(--agent) calc(var(--fill, 1) * 8%), transparent); will-change: transform, width, height; }
.selbox__h { position: absolute; width: 7px; height: 7px; background: #fff; border: 1.5px solid var(--agent); }
.selbox__h:nth-child(1) { left: -4.5px; top: -4.5px; } .selbox__h:nth-child(2) { right: -4.5px; top: -4.5px; }
.selbox__h:nth-child(3) { left: -4.5px; bottom: -4.5px; } .selbox__h:nth-child(4) { right: -4.5px; bottom: -4.5px; }
.selbox__label { position: absolute; left: -1.5px; top: -24px; white-space: nowrap; font-size: 11px; line-height: 1; padding: 3px 6px; border-radius: 4px; background: var(--agent); color: #fff; }
@media (max-width: 767px) { .cursor__tag, .selbox__label { font-size: 10px; } }
```

If `color-mix` is a concern, set the background as `rgb(from var(--agent) r g b / calc(var(--fill, 1) * .08))`; either is fine in current browsers, and the fill is decorative.

- [ ] **Step 5: HUD wiring**

Bar: `StatusPill` client component: `const s = useSwarmStats(); if (!s.on) return null` on the client, but SSR renders the default text, so render `<span class="status mono" data-status hidden={!s.on && hydrated}>` and prefer: render the text from the store snapshot always (`copy.bar.status(s.agents, s.built, s.total)`) and add `data-off` when `!s.on` after mount; CSS hides `[data-off]`. About log: `BuildLog` client component renders `copy.about.logReduced` when the store says `on === false` after mount and the media query matches reduced motion, `copy.about.logEmpty` when the log is empty, else the lines with `<span class="log__agent" style={{ '--agent': AGENT_COLOURS[line.agent] }}>`. Closer: `RebuildButton` client component calls `rebuild()` and is `disabled` while `busy`.

- [ ] **Step 6: Checks and commit**

Green, including `exported.test.ts` (`data-build` count 43; no `data-built`). Then run the dev server and look once with Playwright at 1440 × 900 at t = 1 s after load to confirm cursors and boxes exist (`document.querySelectorAll('.cursor').length === 6`, at least one `.selbox` with opacity 1 during the first two seconds, and all hero elements `data-built` within 6 s). Commit: `Add the swarm: cursors draw every element in with a selection box as it scrolls into view`.

---

## Task 5: Visual gate, fixes, og image, README

- [ ] **Step 1: Visual gate (Opus judge, Playwright)**

Serve `out/` (`npx serve out -l 3011` or `npx http-server out -p 3011 -s`). Capture at 1440 × 900: `t = 0.4, 1.0, 2.0, 4.0 s` after `load` (use `page.screenshot` from `browser_run_code_unsafe`); then for each of `#about #toolbox #experience #work #rest #contact`, `scrollIntoView` and capture at +0.5 s and +2.5 s; one full-page capture after 12 s and a scroll to the bottom and back (everything should be built). Phone 390 × 844: load, 1.0 s, 3.0 s, then `#work` at +2.5 s. Reduced motion (`page.emulateMedia({ reducedMotion: 'reduce' })`): load + 0.3 s (everything visible, no cursors). No JS (`context.setJavaScriptEnabled(false)` or `page.route` blocking `*.js`): everything visible.

The judge compares to `.playwright-mcp/ref-hero.jpeg`, `ref-about.jpeg`, `ref-skills.jpeg`, `ref-xp.jpeg`, `ref-work.jpeg`, `ref-creds.jpeg`, `ref-closer.jpeg`, `ref-phone.jpeg`, `ref-phone-xp.jpeg`, `ref-phone-work.jpeg` and answers, with evidence per still: (1) layout fidelity (structure, spacing, type scale, card language); (2) does it read as agents building the page in real time; (3) is it a swarm (several boxes at once, staggered, cursors arriving from different directions); (4) any element left unbuilt after the full scroll, any jank, any box misaligned with its element; (5) voice or forbidden content. Pass requires all five clean.

- [ ] **Step 2: Fix round(s)** (Sonnet, from the judge's list), re-gate until pass. Cap: three rounds; then report what is left.

- [ ] **Step 3: og.png**

From the served export at 1200 × 630, wait 6 s (hero built), screenshot to `public/og.png`. Commit.

- [ ] **Step 4: README**

Replace with ten lines: what the site is, the swarm in two sentences, `npm run dev`, `npm run build`, the checks, and where copy and facts live.

- [ ] **Step 5: Final checks and commit**

Green. Commit: `Visual gate fixes, og image and README`.
