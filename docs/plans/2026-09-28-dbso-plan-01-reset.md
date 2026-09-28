# Stage 0 — Reset, themes, copy, scroll provider, DOM shell

> Part of `2026-09-28-dbso-plan-00-index.md`. Read the index's Global Constraints and the spec (§2, §3.1 copy, §8, §9, §13, §15) before starting. Gate: the DOM-only site renders in both themes with all copy, no 3D yet.

Tasks 0.1 → 0.2 run first, in order. Tasks 0.3, 0.4, 0.5 are **[parallel-safe]** after 0.2. Task 0.6 runs last.

---

### Task 0.1: Reset the repo and install the new toolchain

**Files:**
- Delete: `src/components/**`, `src/lib/**`, every `*.png` in the repo root, `resume2.pdf`, `public/file.svg`, `public/vercel.svg`, `public/next.svg`, `public/globe.svg`, `public/window.svg`
- Modify: `package.json`, `.gitignore`, `README.md`
- Create: `vitest.config.ts`, `src/app/fonts/archivo-latin-wght-normal.woff2`, `src/app/fonts/jetbrains-mono-latin-wght-normal.woff2`, `public/resume.pdf`

- [ ] **Step 1: Delete the old site**

```bash
cd /Users/Ethan_1/ethanwangai
git rm -rq src/components src/lib
git rm -q --cached *.png resume2.pdf 2>/dev/null; rm -f *.png resume2.pdf
git rm -q public/file.svg public/vercel.svg public/next.svg public/globe.svg public/window.svg
cp "/Users/Ethan_1/Downloads/untitled folder 4/ethan_wang_quant_resume.pdf" public/resume.pdf
```

- [ ] **Step 2: Swap dependencies**

```bash
npm uninstall @fontsource/fraunces @fontsource/schibsted-grotesk @fontsource/jetbrains-mono @react-three/postprocessing react-icons
npm install @fontsource-variable/archivo @fontsource-variable/jetbrains-mono
npm install -D vitest tsx @resvg/resvg-js
mkdir -p src/app/fonts
cp node_modules/@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2 src/app/fonts/
cp node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2 src/app/fonts/
```

Then in `package.json` set scripts to:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "prebuild": "npm run emit",
  "emit": "tsx scripts/emit.ts",
  "start": "next start",
  "lint": "eslint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run"
}
```

(`scripts/emit.ts` arrives in Stage 5. Until then create a stub `scripts/emit.ts` containing `console.log('emit: nothing to do yet')` so `prebuild` passes.)

- [ ] **Step 3: vitest config**

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: { include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'], environment: 'node' },
});
```

- [ ] **Step 4: gitignore and README**

Append to `.gitignore`:

```
# gate stills
.playwright-mcp/
```

Replace `README.md` with:

```md
# ethanwang.ai

one sentence becoming machines, on paper. next.js + react three fiber.

- `npm run dev` — local dev
- `npm run emit` — regenerate the hero svg, ink plates, counts and og image from `src/bench/`
- `npm test` — vitest over `src/bench/` and the emitter
- spec: `docs/plans/2026-09-28-drawn-built-switched-on-design.md`
```

- [ ] **Step 5: Verify the toolchain**

Run: `npx vitest run` → Expected: "No test files found" exit 0 (or 1 with no tests; acceptable until Task 0.2 adds one). Run: `npx tsx scripts/emit.ts` → Expected: `emit: nothing to do yet`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Reset repo for the redesign: remove forest site, swap fonts and toolchain"
```

---

### Task 0.2: Contracts — bench types and sections

**Files:**
- Create: `src/bench/types.ts`, `src/bench/sections.ts`, `src/bench/sections.test.ts`

**Interfaces:**
- Produces: everything below. Later stages import these names verbatim and never redefine them.

- [ ] **Step 1: Write `src/bench/types.ts`**

```ts
// Pure contracts. No React, no DOM, no three renderer imports in src/bench/**.

export const MACHINE = {
  quoter: 0, intake: 1, balance: 2, splitter: 3, watch: 4, bot: 5, slot: 6, visitor: 7,
} as const;
export type MachineId = (typeof MACHINE)[keyof typeof MACHINE];
export const MACHINE_COUNT = 8;
export const MACHINE_NAMES = ['quoter', 'intake', 'balance', 'splitter', 'watch', 'bot', 'slot', 'visitor'] as const;

/** Vertex-shader behaviour of a part. Numeric because it ships as an attribute. */
export const KIND = {
  static: 0, sweep: 1, spin: 2, cell: 3, cap: 4, lever: 5, lane: 6, scan: 7, ping: 8, stack: 9, tilt: 10,
} as const;
export type KindId = (typeof KIND)[keyof typeof KIND];

/** Which InstancedMesh a part belongs to. */
export const PRIMITIVE = { cell: 0, cap: 1, bar: 2, rod: 3, ring: 4, tile: 5 } as const;
export type PrimitiveId = (typeof PRIMITIVE)[keyof typeof PRIMITIVE];
export const PRIMITIVE_NAMES = ['cell', 'cap', 'bar', 'rod', 'ring', 'tile'] as const;

export type Vec3 = readonly [number, number, number];
export type Vec4 = readonly [number, number, number, number];
export type Tier = 'desktop' | 'phone';

/** What a machine config emits. layout() adds explode and birth. */
export interface PartSpec {
  primitive: PrimitiveId;
  kind: KindId;
  position: Vec3;      // machine-local rest position; y = 0 is the bench surface
  quaternion: Vec4;    // machine-local rest rotation (x, y, z, w)
  scale: Vec3;         // rest scale; a bar of length L is [L, 1, 1]
  param: Vec4;         // per-kind, see src/gl/shaders/kinds/*.glsl.ts headers
  col: number;         // bed column / lane index / -1
  module: string;      // module name for leader lines and SVG grouping
  group: number;       // build hierarchy: lower groups lock first; lever must be the highest group alone
  explodeMode: 'module' | 'rise';  // module: slides in from an offset; rise: grows from a flat pencil grid
}

export interface PartInstance extends PartSpec {
  machine: MachineId;
  explode: Vec3;       // bench-space offset added while unbuilt ([0,0,0] for rise)
  birth: number;       // 0..1 in lock order; exactly 1 for the lever
}

export interface BuildContext {
  tier: Tier;
  rng: () => number;   // seeded, deterministic
  density: number;     // 1 on desktop, 0.25 on phone (configs divide lattice sizes by 1/density)
  caps: boolean;       // false on phone
}

export interface MachineConfig {
  id: MachineId;
  name: string;
  /** Approximate bench footprint in local units, for placement and plates. */
  footprint: { w: number; d: number };
  build(ctx: BuildContext): PartSpec[];
}

export interface LeaderLine { from: Vec3; to: Vec3; birth: number; machine: MachineId }

export interface MachineSummary {
  id: MachineId;
  count: number;                 // instances emitted
  centroid: Vec3;                // bench space, ink target centroid
  min: Vec3; max: Vec3;          // bench-space bounds of rest poses
  foot: Vec3;                    // bench-space point where the plate pins (front-centre at y=0)
}

export interface LayoutResult {
  parts: PartInstance[];
  byPrimitive: PartInstance[][]; // indexed by PrimitiveId
  machines: MachineSummary[];    // indexed by MachineId
  leaderLines: LeaderLine[];
  counts: { total: number; inkedAtEnd: number; byMachine: number[] };
}
```

- [ ] **Step 2: Write the failing test `src/bench/sections.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { SECTIONS, sectionRanges, locate, pageHeightVh } from './sections';

describe('sections', () => {
  it('has nine sections in the spec order', () => {
    expect(SECTIONS.map((s) => s.id)).toEqual([
      'sentence', 'more', 'first', 'kalshi', 'heron', 'darch', 'summers', 'alive', 'yours',
    ]);
  });
  it('sums to ~870vh desktop and ~990vh phone', () => {
    expect(pageHeightVh('desktop')).toBe(870);
    expect(pageHeightVh('phone')).toBe(990);
  });
  it('computes g ranges from measured tops and maps g to a section and local u', () => {
    const vh = 900;
    const tops = SECTIONS.reduce<number[]>((acc, s, i) => {
      acc.push(i === 0 ? 0 : acc[i - 1] + SECTIONS[i - 1].vh.desktop * vh / 100);
      return acc;
    }, []);
    const docHeight = tops[8] + SECTIONS[8].vh.desktop * vh / 100;
    const ranges = sectionRanges(tops, docHeight, vh);
    expect(ranges[0].start).toBe(0);
    expect(ranges[8].end).toBe(1);
    expect(ranges[0].end).toBeCloseTo(tops[1] / (docHeight - vh), 6);
    const mid = (ranges[3].start + ranges[3].end) / 2;
    expect(locate(mid, ranges)).toEqual({ index: 3, u: 0.5 });
    expect(locate(-1, ranges)).toEqual({ index: 0, u: 0 });
    expect(locate(2, ranges)).toEqual({ index: 8, u: 1 });
  });
});
```

- [ ] **Step 3: Run it** — `npx vitest run src/bench/sections.test.ts` → FAIL (module not found).

- [ ] **Step 4: Write `src/bench/sections.ts`**

```ts
import { MACHINE, type MachineId, type Tier } from './types';

export interface SectionDef {
  id: string;
  vh: { desktop: number; phone: number };
  machine: MachineId;                 // the machine this section is about (camera subject)
  /** Scrubbed compile in this section: machine and the local-u window. null = no build. */
  build: { machine: MachineId; from: number; to: number } | null;
  /** Local u at which the camera has finished travelling to this section's pose. */
  travelEnd: number;
  headingAt: number;                  // local u at which the heading reveals
}

export const SECTIONS: readonly SectionDef[] = [
  { id: 'sentence', vh: { desktop: 140, phone: 140 }, machine: MACHINE.quoter, build: null, travelEnd: 1.0, headingAt: 0 },
  { id: 'more',     vh: { desktop: 100, phone: 220 }, machine: MACHINE.quoter, build: null, travelEnd: 0.10, headingAt: 0.12 },
  { id: 'first',    vh: { desktop: 60,  phone: 60  }, machine: MACHINE.bot,    build: null, travelEnd: 0.30, headingAt: 0.12 },
  { id: 'kalshi',   vh: { desktop: 100, phone: 100 }, machine: MACHINE.quoter, build: { machine: MACHINE.intake,   from: 0.15, to: 0.45 }, travelEnd: 0.25, headingAt: 0.12 },
  { id: 'heron',    vh: { desktop: 90,  phone: 90  }, machine: MACHINE.balance, build: { machine: MACHINE.balance, from: 0.12, to: 0.45 }, travelEnd: 0.15, headingAt: 0.12 },
  { id: 'darch',    vh: { desktop: 90,  phone: 90  }, machine: MACHINE.splitter, build: { machine: MACHINE.splitter, from: 0.12, to: 0.40 }, travelEnd: 0.15, headingAt: 0.12 },
  { id: 'summers',  vh: { desktop: 80,  phone: 80  }, machine: MACHINE.watch,  build: { machine: MACHINE.watch,    from: 0.12, to: 0.35 }, travelEnd: 0.15, headingAt: 0.12 },
  { id: 'alive',    vh: { desktop: 110, phone: 110 }, machine: MACHINE.quoter, build: null, travelEnd: 0.60, headingAt: 0.12 },
  { id: 'yours',    vh: { desktop: 100, phone: 100 }, machine: MACHINE.slot,   build: null, travelEnd: 0.25, headingAt: 0.12 },
];

export type SectionId = (typeof SECTIONS)[number]['id'];
export const SECTION_INDEX: Record<string, number> = Object.fromEntries(SECTIONS.map((s, i) => [s.id, i]));

export function pageHeightVh(tier: Tier): number {
  return SECTIONS.reduce((sum, s) => sum + s.vh[tier], 0);
}

export interface SectionRange { id: string; start: number; end: number }

/** g ranges: a section spans from its top reaching the viewport top to the next section's top doing so. */
export function sectionRanges(tops: number[], docHeight: number, vh: number): SectionRange[] {
  const max = Math.max(1, docHeight - vh);
  return SECTIONS.map((s, i) => ({
    id: s.id,
    start: i === 0 ? 0 : Math.min(1, tops[i] / max),
    end: i === SECTIONS.length - 1 ? 1 : Math.min(1, tops[i + 1] / max),
  }));
}

export function locate(g: number, ranges: SectionRange[]): { index: number; u: number } {
  if (g <= 0) return { index: 0, u: 0 };
  if (g >= 1) return { index: ranges.length - 1, u: 1 };
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    if (g < r.end || i === ranges.length - 1) {
      const span = Math.max(1e-6, r.end - r.start);
      return { index: i, u: Math.min(1, Math.max(0, (g - r.start) / span)) };
    }
  }
  return { index: ranges.length - 1, u: 1 };
}
```

- [ ] **Step 5: Run it** — `npx vitest run src/bench/sections.test.ts` → PASS.

- [ ] **Step 6: Commit** — `git add src/bench && git commit -m "Add bench contracts and section table"`

---

### Task 0.3: Themes, fonts, root layout **[parallel-safe]**

**Files:**
- Create: `src/theme/palettes.ts`, `src/theme/palettes.test.ts`, `src/theme/themeScript.ts`, `src/theme/ThemeProvider.tsx`, `src/site/chrome/ThemeToggle.tsx`
- Modify: `src/app/globals.css` (replace), `src/app/layout.tsx` (replace)

**Interfaces:**
- Produces: `PALETTES: Record<ThemeName, Palette>`, `type ThemeName = 'light' | 'dark'`, `type Palette = { paper, ink, inkTop, inkKey, inkShade, pencil, hot, shadow }` (hex strings); `useTheme(): { theme, setTheme, toggle }`; CSS variables `--paper --ink --ink-top --ink-key --ink-shade --pencil --hot --shadow`, font variables `--font-display`, `--font-mono`.

- [ ] **Step 1: `src/theme/palettes.ts`**

```ts
export type ThemeName = 'light' | 'dark';
export interface Palette {
  paper: string; ink: string; inkTop: string; inkKey: string; inkShade: string;
  pencil: string; hot: string; shadow: string;
}
export const PALETTES: Record<ThemeName, Palette> = {
  light: { paper: '#F1EEE9', ink: '#141416', inkTop: '#34343A', inkKey: '#222226', inkShade: '#141416', pencil: '#B9B4AC', hot: '#FF4A1C', shadow: '#D8D3CB' },
  dark:  { paper: '#17171A', ink: '#ECE8E0', inkTop: '#F2EEE6', inkKey: '#E0DBD2', inkShade: '#C9C3B8', pencil: '#4E4E56', hot: '#FF5A2C', shadow: '#0A0A0C' },
};
/** CSS custom property name for each palette key. */
export const CSS_VAR: Record<keyof Palette, string> = {
  paper: '--paper', ink: '--ink', inkTop: '--ink-top', inkKey: '--ink-key', inkShade: '--ink-shade',
  pencil: '--pencil', hot: '--hot', shadow: '--shadow',
};
```

- [ ] **Step 2: Failing test `src/theme/palettes.test.ts`** (pins CSS ↔ TS consistency)

```ts
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
```

- [ ] **Step 3: Run it** → FAIL (globals.css lacks tokens).

- [ ] **Step 4: Replace `src/app/globals.css`**

```css
@import "tailwindcss";

:root, :root[data-theme="light"] {
  --paper: #F1EEE9; --ink: #141416; --ink-top: #34343A; --ink-key: #222226; --ink-shade: #141416;
  --pencil: #B9B4AC; --hot: #FF4A1C; --shadow: #D8D3CB;
  color-scheme: light;
}
:root[data-theme="dark"] {
  --paper: #17171A; --ink: #ECE8E0; --ink-top: #F2EEE6; --ink-key: #E0DBD2; --ink-shade: #C9C3B8;
  --pencil: #4E4E56; --hot: #FF5A2C; --shadow: #0A0A0C;
  color-scheme: dark;
}

@theme inline {
  --color-paper: var(--paper);
  --color-ink: var(--ink);
  --color-pencil: var(--pencil);
  --color-hot: var(--hot);
  --color-shadow: var(--shadow);
  --font-display: var(--font-display), Arial, sans-serif;
  --font-mono: var(--font-mono), ui-monospace, monospace;
}

html { scroll-behavior: auto; }
html, body { background: var(--paper); color: var(--ink); }
body {
  font-family: var(--font-display), Arial, sans-serif;
  font-weight: 500;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

/* type system (spec §9) */
.display {
  font-family: var(--font-display), Arial, sans-serif;
  font-weight: 700; font-size: clamp(2.75rem, 8vw, 8rem); line-height: 0.92; letter-spacing: -0.03em;
  text-transform: lowercase;
}
.h2 {
  font-family: var(--font-display), Arial, sans-serif;
  font-weight: 700; font-size: clamp(1.9rem, 4.2vw, 3.6rem); line-height: 1.0; letter-spacing: -0.025em;
  text-transform: lowercase;
}
.body { font-size: clamp(1.125rem, 1.35vw, 1.25rem); line-height: 1.45; max-width: 34ch; }
.mono {
  font-family: var(--font-mono), ui-monospace, monospace;
  font-size: 0.8125rem; letter-spacing: 0.04em; font-variant-numeric: tabular-nums; text-transform: lowercase;
}
.mono-figure { font-family: var(--font-mono), ui-monospace, monospace; font-size: clamp(3rem, 5vw, 4.5rem); line-height: 1; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; }
.rule { border-top: 1px solid var(--pencil); }
.hot { color: var(--hot); }
.pencil { color: var(--pencil); }
a { text-underline-offset: 0.18em; }
a:hover, button.link:hover { color: var(--hot); }
::selection { background: var(--hot); color: var(--paper); }
:focus-visible { outline: 2px solid var(--hot); outline-offset: 3px; }
```

- [ ] **Step 5: `src/theme/themeScript.ts`** (inlined before paint)

```ts
/** Runs before first paint; sets data-theme from localStorage or the OS. Keep it dependency-free. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme','light')}})();`;
```

- [ ] **Step 6: `src/theme/ThemeProvider.tsx`**

```tsx
'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ThemeName } from './palettes';

interface ThemeCtx { theme: ThemeName; setTheme: (t: ThemeName) => void; toggle: () => void }
const Ctx = createContext<ThemeCtx | null>(null);

function read(): ThemeName {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('light');
  useEffect(() => { setThemeState(read()); }, []);
  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('theme', t); } catch {}
    window.dispatchEvent(new CustomEvent('themechange', { detail: t }));
  }, []);
  const toggle = useCallback(() => setTheme(read() === 'dark' ? 'light' : 'dark'), [setTheme]);
  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme outside ThemeProvider');
  return ctx;
}
```

The `themechange` window event is what the GL palette lerp (Stage 2) listens to, so GL never depends on React context.

- [ ] **Step 7: `src/site/chrome/ThemeToggle.tsx`**

```tsx
'use client';
import { useTheme } from '@/theme/ThemeProvider';
import { copy } from '@/site/copy';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const next = theme === 'dark' ? copy.nav.theme.light : copy.nav.theme.dark;
  return (
    <button type="button" className="mono link" onClick={toggle} aria-label={`switch to ${next} theme`}>
      {next}
    </button>
  );
}
```

- [ ] **Step 8: Replace `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { THEME_SCRIPT } from '@/theme/themeScript';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { copy } from '@/site/copy';

const display = localFont({
  src: './fonts/archivo-latin-wght-normal.woff2', variable: '--font-display', weight: '100 900', display: 'swap', adjustFontFallback: 'Arial',
});
const mono = localFont({
  src: './fonts/jetbrains-mono-latin-wght-normal.woff2', variable: '--font-mono', weight: '100 800', display: 'swap', adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: copy.meta.title,
  description: copy.meta.description,
  metadataBase: new URL('https://ethanwang.ai'),
  openGraph: { title: copy.meta.title, description: copy.meta.description, url: 'https://ethanwang.ai', type: 'website', images: ['/og.png'] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 9: Run** `npx vitest run src/theme` → PASS. `npx tsc --noEmit` will fail until Task 0.4 provides `copy`; that is expected if 0.3 lands before 0.4. Otherwise it must pass.

- [ ] **Step 10: Commit** — `git add src/theme src/site/chrome/ThemeToggle.tsx src/app && git commit -m "Add paper and drafting themes, self-hosted fonts, root layout"`

---

### Task 0.4: Copy and facts **[parallel-safe]**

**Files:**
- Create: `src/site/facts.ts`, `src/site/copy.ts`, `src/site/copy.test.ts`

**Interfaces:**
- Produces: `facts` (readonly object below) and `copy` (readonly object below). Section components read only these.

- [ ] **Step 1: `src/site/facts.ts`** (spec §2, public numbers only)

```ts
export const facts = {
  asOf: 'as of sept 2026',
  kalshi: {
    trades: '30,000', tradesLabel: 'live trades',
    contracts: '2M', contractsLabel: 'contracts traded',
    rank: 'top 100', rankLabel: 'all-time crypto profit leaderboard',
    since: 'live on kalshi since jan 2026',
  },
  heron: { cities: 'four', year: '2026' },
  darch: { jobs: '3,000', people: '20 million', margins: '85%', years: '2025–26' },
  wvu: { claims: 'about $100m' },
  school: 'case western, cs + math, may 2028.',
  links: {
    email: 'ethan.wanq@gmail.com',
    github: { href: 'https://github.com/Not-Ethan', label: 'github Not-Ethan' },
    linkedin: { href: 'https://linkedin.com/in/edw173', label: 'linkedin edw173' },
    resume: { href: '/resume.pdf', label: 'resume' },
  },
} as const;
```

- [ ] **Step 2: Failing test `src/site/copy.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { copy } from './copy';
import { facts } from './facts';

function strings(o: unknown, out: string[] = []): string[] {
  if (typeof o === 'string') out.push(o);
  else if (typeof o === 'function') out.push(String((o as (...a: number[]) => string)(9, 1, 12)));
  else if (o && typeof o === 'object') Object.values(o).forEach((v) => strings(v, out));
  return out;
}

describe('copy', () => {
  const all = strings(copy).concat(strings(facts));
  it('never prints the private numbers', () => {
    for (const s of all) {
      expect(s).not.toMatch(/\$20/i);
      expect(s).not.toMatch(/#\s?75\b/);
      expect(s).not.toMatch(/notional/i);
    }
  });
  it('is lowercase sentences, no title case, no em dash in sentences', () => {
    const prose = strings({ ...copy, nav: undefined, meta: undefined });
    for (const s of prose) {
      if (s.startsWith('fig.')) continue;                  // plates use the figure idiom with an em dash
      expect(s, s).toBe(s.toLowerCase().replace(/\bnot-ethan\b/g, 'Not-Ethan'));
      expect(s, s).not.toContain('—');
    }
  });
  it('carries the thesis verbatim', () => {
    expect(copy.sentence.headline).toBe('now is the best time in history to build things.');
    expect(copy.sentence.headline.split(' ')).toHaveLength(10);
  });
});
```

- [ ] **Step 3: Run it** → FAIL (no copy module).

- [ ] **Step 4: `src/site/copy.ts`** (spec §3.1; every string on the page; his voice)

```ts
import { facts as f } from './facts';

export const copy = {
  meta: {
    title: 'ethan wang',
    description: 'now is the best time in history to build things. so i build a lot of them. they run on their own.',
  },
  nav: {
    items: [
      { label: 'kalshi', section: 'kalshi' },
      { label: 'heron', section: 'heron' },
      { label: 'darch', section: 'darch' },
      { label: 'summers', section: 'summers' },
      { label: 'contact', section: 'yours' },
    ],
    resume: 'resume',
    menu: 'menu',
    theme: { light: 'light', dark: 'dark' },
    home: 'ethan wang',
  },
  sentence: {
    headline: 'now is the best time in history to build things.',
    inkFrom: 'build things',                // the words the ink lifts from
    deck: 'so i build a lot of them. they run on their own.',
    deckProven: 'this page is one of them.', // appended only when 60 fps is proven (Stage 6)
    ladder: { words: 'words', lines: 'lines', parts: 'parts', running: 'running' },
    plate: 'fig. 1 — the quoter. built from the sentence above.',
    rebuild: 'rebuild',
    honesty: 'seeded model of the strategy. not live data.',
    scrollCue: 'scroll',
  },
  more: {
    lines: [
      'people made languages higher and higher level so you could do more with less.',
      "that's the peak.",
      'now a few sentences of plain english turn into thousands of lines of code.',
      'what used to take a year takes an afternoon.',
    ],
    rungs: ['bits', 'machine code', 'c', 'python', 'a library', 'a sentence'],
  },
  first: {
    lines: [
      'the little one in the corner has been running since you got here.',
      'the first thing i built that people actually used was a discord bot. seventh grade. my classmates.',
      'i never really liked the coding. i liked watching it run.',
    ],
    plate: 'fig. 0 — v0. 6 parts. still pinging.',
  },
  kalshi: {
    heading: 'a trading algo i wrote climbed into the top 100 in the world on kalshi.',
    body: "it quotes crypto combos and arbs across kalshi's crypto markets. python, a multi-terabyte research set, order management, risk, reconciliation, monitoring. it runs without me.",
    figures: [
      { value: f.kalshi.trades, label: f.kalshi.tradesLabel },
      { value: f.kalshi.contracts, label: f.kalshi.contractsLabel },
      { value: f.kalshi.rank, label: f.kalshi.rankLabel },
    ],
    asOf: f.asOf,
    status: f.kalshi.since,
    plate: 'fig. 1 — the quoter. quoting.',
    plateIntake: 'fig. 1b — intake. risk, reconciliation, monitoring.',
    honesty: 'seeded model of the strategy. not live data.',
    readout: { market: 'market', bid: 'bid', ask: 'ask', fills: 'fills' },
  },
  heron: {
    heading: 'if the home team wins tonight, your drinks are free.',
    body: `the bar doesn't eat that. heron prices the promo, carries the liability, and hedges it on prediction markets. co-founded it this summer. bars signed in ${f.heron.cities} cities.`,
    mono: `co-founder · ${f.heron.year}`,
    plate: 'fig. 2 — the balance. tips, levels, clears.',
  },
  darch: {
    heading: `${f.darch.jobs} videos a month. ${f.darch.people} people.`,
    body: `darch was a video pipeline. jobs in one end, clips out the other, nobody touching it. i ran engineering. ${f.darch.margins} margins.`,
    mono: `co-founder, eng lead · ${f.darch.years} · python, fastapi, node, ffmpeg`,
    plate: 'fig. 3 — the splitter. 1 in, 12 out.',
  },
  summers: {
    heading: 'some machines just watch.',
    wvu: `wvu medicine: anomaly detection over a pharmacy doing ${f.wvu.claims} of claims a year. a spike in denials shows up as a spike. the model is going into production.`,
    nist: 'nist: a rag help-desk assistant and structured logging in an open webui fork.',
    orbit: 'orbit: semantic search over saved text, audio and video. won most innovative use of technology at tartanhacks 2025.',
    plate: 'fig. 4 — the watch.',
  },
  alive: {
    lines: [
      "i've always loved building things. the best part is watching something i made come alive and keep going without me.",
      "the world doesn't need one more guy who dreams in code. it needs people who've seen enough different things to spot the openings.",
      "so that's the plan. build a lot of things, fast, in a lot of different places.",
    ],
    running: 'running',
  },
  yours: {
    heading: "you're at the top of the stack too. type what you want to build.",
    label: 'what do you want to build?',
    placeholder: 'a sentence.',
    plate: (words: number, sentences: number, parts: number) =>
      `fig. 5 — yours. ${words} ${words === 1 ? 'word' : 'words'}, ${sentences} ${sentences === 1 ? 'sentence' : 'sentences'}. ${parts} parts.`,
    plateEmpty: 'fig. 5 — yours. empty slot.',
    note: '(one bar per word. one rail per sentence. the real one goes to my inbox.)',
    mailSubject: (sentence: string) => (sentence ? `i want to build: ${sentence}` : 'hi ethan'),
    school: f.school,
    footer: (n: number) => `this page is one bench, ${n.toLocaleString('en-US')} parts, built from the words on it.`,
    clear: 'clear',
  },
  chrome: {
    strip: ['01 sentence', '02 more with less', '03 the first thing', '04 kalshi', '05 heron', '06 darch', '07 summers', '08 alive', '09 yours'],
  },
} as const;
```

- [ ] **Step 5: Run** `npx vitest run src/site` → PASS.

- [ ] **Step 6: Commit** — `git add src/site/copy.ts src/site/facts.ts src/site/copy.test.ts && git commit -m "Add site copy in Ethan's voice and the public facts"`

---

### Task 0.5: Scroll provider (Lenis) and tier detection **[parallel-safe]**

**Files:**
- Create: `src/scroll/tier.ts`, `src/scroll/velocity.ts`, `src/scroll/velocity.test.ts`, `src/scroll/ScrollProvider.tsx`

**Interfaces:**
- Consumes: `SECTIONS`, `sectionRanges`, `SectionRange` from `src/bench/sections.ts`; `Tier` from `src/bench/types.ts`.
- Produces:

```ts
export interface ScrollState {
  g: number;            // 0..1 document progress (Lenis-smoothed scroll / maxScroll)
  scrollY: number;      // Lenis-smoothed scroll in px
  velocity: number;     // normalized, damped elsewhere; raw here: px per ms clamped to [-3, 3]
  maxScroll: number;
  vh: number;
  vw: number;
  ranges: SectionRange[];
  tops: number[];       // section page tops in px (remeasured on resize)
}
export function useScroll(): { state: RefObject<ScrollState>; scrollTo: (id: string) => void; reducedMotion: boolean; tier: Tier }
export function detectTier(): Tier
export function normalizeVelocity(pxPerMs: number): number   // clamp to [-1, 1] at 3 px/ms
```

- [ ] **Step 1: `src/scroll/tier.ts`**

```ts
import type { Tier } from '@/bench/types';
export function detectTier(): Tier {
  if (typeof window === 'undefined') return 'desktop';
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.innerWidth < 820;
  const weak = (navigator.hardwareConcurrency ?? 8) <= 4;
  return coarse || narrow || weak ? 'phone' : 'desktop';
}
```

- [ ] **Step 2: Failing test `src/scroll/velocity.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { normalizeVelocity, deltaVelocity } from './velocity';
describe('velocity', () => {
  it('clamps px/ms to [-1, 1] at 3 px/ms', () => {
    expect(normalizeVelocity(0)).toBe(0);
    expect(normalizeVelocity(1.5)).toBeCloseTo(0.5);
    expect(normalizeVelocity(9)).toBe(1);
    expect(normalizeVelocity(-9)).toBe(-1);
  });
  it('derives velocity from scroll deltas on touch (spec §8 clock 4)', () => {
    expect(deltaVelocity(1000, 1300, 100)).toBeCloseTo(1);      // 3 px/ms → 1
    expect(deltaVelocity(1000, 1000, 100)).toBe(0);
    expect(deltaVelocity(1000, 900, 0)).toBe(0);                 // dt 0 guards
  });
});
```

- [ ] **Step 3: `src/scroll/velocity.ts`**

```ts
export const V_MAX_PX_PER_MS = 3;
export function normalizeVelocity(pxPerMs: number): number {
  return Math.max(-1, Math.min(1, pxPerMs / V_MAX_PX_PER_MS));
}
export function deltaVelocity(prevY: number, y: number, dtMs: number): number {
  if (dtMs <= 0) return 0;
  return normalizeVelocity((y - prevY) / dtMs);
}
```

- [ ] **Step 4: Run** → PASS.

- [ ] **Step 5: `src/scroll/ScrollProvider.tsx`** (Lenis only; no snap; no valley; native touch)

```tsx
'use client';
import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode, type RefObject } from 'react';
import Lenis from 'lenis';
import { SECTIONS, sectionRanges, type SectionRange } from '@/bench/sections';
import type { Tier } from '@/bench/types';
import { detectTier } from './tier';
import { normalizeVelocity, deltaVelocity } from './velocity';

export interface ScrollState {
  g: number; scrollY: number; velocity: number; maxScroll: number; vh: number; vw: number;
  ranges: SectionRange[]; tops: number[];
}
interface Ctx { state: RefObject<ScrollState>; scrollTo: (id: string) => void; reducedMotion: boolean; tier: Tier }
const ScrollCtx = createContext<Ctx | null>(null);

function subscribeRM(cb: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
function useReducedMotion() {
  return useSyncExternalStore(subscribeRM, () => window.matchMedia('(prefers-reduced-motion: reduce)').matches, () => false);
}

export function ScrollProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const tier = useMemo(() => detectTier(), []);
  const state = useRef<ScrollState>({ g: 0, scrollY: 0, velocity: 0, maxScroll: 1, vh: 900, vw: 1440, ranges: [], tops: [] });
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const s = state.current;
    const measure = () => {
      s.vh = window.innerHeight; s.vw = window.innerWidth;
      s.tops = SECTIONS.map((sec) => {
        const el = document.getElementById(sec.id);
        return el ? el.offsetTop : 0;
      });
      const docHeight = document.documentElement.scrollHeight;
      s.maxScroll = Math.max(1, docHeight - s.vh);
      s.ranges = sectionRanges(s.tops, docHeight, s.vh);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.documentElement);
    window.addEventListener('resize', measure);

    let prevY = window.scrollY, prevT = performance.now();
    const onNative = () => {
      const now = performance.now();
      s.scrollY = window.scrollY;
      s.velocity = deltaVelocity(prevY, s.scrollY, now - prevT);
      prevY = s.scrollY; prevT = now;
      s.g = Math.min(1, Math.max(0, s.scrollY / s.maxScroll));
    };

    if (reducedMotion) {
      onNative();
      window.addEventListener('scroll', onNative, { passive: true });
      return () => { window.removeEventListener('scroll', onNative); window.removeEventListener('resize', measure); ro.disconnect(); };
    }

    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, syncTouch: false, smoothWheel: true });
    lenisRef.current = lenis;
    lenis.on('scroll', ({ scroll, velocity }: { scroll: number; velocity: number }) => {
      const now = performance.now();
      s.scrollY = scroll;
      // Lenis reports px per frame; on touch (native) fall back to deltas so velocity is never silently zero.
      s.velocity = velocity !== 0 ? normalizeVelocity(velocity / 16.67) : deltaVelocity(prevY, scroll, now - prevT);
      prevY = scroll; prevT = now;
      s.g = Math.min(1, Math.max(0, scroll / s.maxScroll));
    });
    let raf = 0;
    const loop = (t: number) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf); lenis.destroy(); lenisRef.current = null;
      window.removeEventListener('resize', measure); ro.disconnect();
    };
  }, [reducedMotion]);

  const value = useMemo<Ctx>(() => ({
    state, reducedMotion, tier,
    scrollTo: (id: string) => {
      const el = document.getElementById(id);
      if (!el) return;
      const lenis = lenisRef.current;
      if (lenis) lenis.scrollTo(el, { duration: 1.4, easing: (t: number) => 1 - Math.pow(1 - t, 3) });
      else el.scrollIntoView({ behavior: 'auto' });
    },
  }), [reducedMotion, tier]);

  return <ScrollCtx.Provider value={value}>{children}</ScrollCtx.Provider>;
}

export function useScroll(): Ctx {
  const c = useContext(ScrollCtx);
  if (!c) throw new Error('useScroll outside ScrollProvider');
  return c;
}
```

- [ ] **Step 6: Verify** `npx vitest run src/scroll` → PASS; `npx tsc --noEmit` → clean once 0.2 is in.

- [ ] **Step 7: Commit** — `git add src/scroll && git commit -m "Add Lenis scroll provider with section ranges, velocity and tier"`

---

### Task 0.6: DOM site shell with all sections and copy

**Files:**
- Create: `src/site/Site.tsx`, `src/site/chrome/Nav.tsx`, `src/site/chrome/SectionStrip.tsx`, `src/site/chrome/Ladder.tsx`, `src/site/Plate.tsx`, `src/site/sections/Sentence.tsx`, `More.tsx`, `First.tsx`, `Kalshi.tsx`, `Heron.tsx`, `Darch.tsx`, `Summers.tsx`, `Alive.tsx`, `Yours.tsx`
- Modify: `src/app/page.tsx` (replace)

**Interfaces:**
- Consumes: `copy`, `facts`, `SECTIONS`, `useScroll`, `ThemeToggle`.
- Produces: section elements with `id={SECTIONS[i].id}`, each `min-height: <vh>vh` from `SECTIONS[i].vh[tier]`; the hero copy block has `data-ink-source="sentence"` and the words `copy.sentence.inkFrom` wrapped in `<span data-ink-words>`; every h2 that feeds ink has `data-ink-source="<sectionId>"`; the ladder has ids `#ladder-lines`, `#ladder-parts`, `#ladder-running`; the uptime `#uptime`; the plate for a machine is `<Plate machine={MachineId}>` rendering `<figcaption data-plate={machine}>`; the input is `<input id="yours-input">`. Stage 2–5 hook these by id/data attribute; do not rename.

- [ ] **Step 1: `src/site/Plate.tsx`**

```tsx
import type { MachineId } from '@/bench/types';
import type { ReactNode } from 'react';
/** A figure plate. Stage 6 pins it to the machine's projected foot; until then it sits in flow. */
export function Plate({ machine, children, control }: { machine: MachineId; children: ReactNode; control?: ReactNode }) {
  return (
    <figcaption data-plate={machine} className="mono pencil mt-4 flex flex-wrap items-baseline gap-x-2">
      <span>{children}</span>
      {control}
    </figcaption>
  );
}
```

- [ ] **Step 2: `src/site/chrome/Ladder.tsx`** (static now; Stage 3 drives the numbers)

```tsx
import { copy } from '@/site/copy';
export function Ladder({ words }: { words: number }) {
  const l = copy.sentence.ladder;
  return (
    <p className="mono mt-5 flex flex-wrap gap-x-2" aria-hidden="false">
      <span><b id="ladder-words">{words}</b> {l.words}</span><span className="pencil">·</span>
      <span><b id="ladder-lines">0</b> {l.lines}</span><span className="pencil">·</span>
      <span><b id="ladder-parts">0</b> {l.parts}</span><span className="pencil">·</span>
      <span>{l.running} <b id="ladder-running">00:00:00</b></span>
    </p>
  );
}
```

- [ ] **Step 3: `src/site/chrome/Nav.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { copy } from '@/site/copy';
import { facts } from '@/site/facts';
import { useScroll } from '@/scroll/ScrollProvider';
import { ThemeToggle } from './ThemeToggle';

export function Nav() {
  const { scrollTo } = useScroll();
  const [open, setOpen] = useState(false);
  const go = (id: string) => { setOpen(false); scrollTo(id); };
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex items-start justify-between px-4 py-4 md:px-8">
      <button type="button" className="mono link" onClick={() => go('sentence')}>{copy.nav.home}</button>
      <nav aria-label="sections" className="hidden items-center gap-5 md:flex">
        {copy.nav.items.map((it) => (
          <button key={it.section} type="button" className="mono link" onClick={() => go(it.section)}>{it.label}</button>
        ))}
        <a className="mono" href={facts.links.resume.href} target="_blank" rel="noopener noreferrer">{copy.nav.resume}</a>
        <ThemeToggle />
      </nav>
      <div className="flex items-center gap-4 md:hidden">
        <a className="mono" href={facts.links.resume.href} target="_blank" rel="noopener noreferrer">{copy.nav.resume}</a>
        <button type="button" className="mono link" aria-expanded={open} onClick={() => setOpen(!open)}>{copy.nav.menu}</button>
      </div>
      {open && (
        <div className="fixed inset-0 z-30 flex flex-col justify-center gap-6 bg-paper px-6 md:hidden">
          {copy.nav.items.map((it) => (
            <button key={it.section} type="button" className="h2 text-left" onClick={() => go(it.section)}>{it.label}</button>
          ))}
          <ThemeToggle />
        </div>
      )}
    </header>
  );
}
```

- [ ] **Step 4: `src/site/chrome/SectionStrip.tsx`**

```tsx
import { copy } from '@/site/copy';
import { SECTIONS } from '@/bench/sections';
export function SectionStrip() {
  return (
    <ol id="section-strip" className="mono pencil fixed bottom-4 left-4 z-40 hidden flex-col gap-1 md:flex" aria-label="progress">
      {SECTIONS.map((s, i) => (
        <li key={s.id} data-strip={s.id} className="transition-colors">{copy.chrome.strip[i]}</li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 5: Sections.** Each file exports one component; each root is `<section id={id} style={{ minHeight: vh }}>` where `vh` comes from `SECTIONS` for the current tier via `useScroll().tier`. Copy column is `<div className="relative z-10 grid grid-cols-12 gap-4 px-4 md:px-8"><div className="col-span-12 md:col-span-5">…</div></div>`. Write all nine. Two are shown in full; the rest follow the same shape with their `copy.<section>` fields and the plate text from the spec.

`src/site/sections/Sentence.tsx`:

```tsx
'use client';
import { copy } from '@/site/copy';
import { SECTIONS } from '@/bench/sections';
import { MACHINE } from '@/bench/types';
import { useScroll } from '@/scroll/ScrollProvider';
import { Ladder } from '@/site/chrome/Ladder';
import { Plate } from '@/site/Plate';

export function Sentence() {
  const { tier } = useScroll();
  const c = copy.sentence;
  const [before, after] = c.headline.split(c.inkFrom);
  return (
    <section id="sentence" style={{ minHeight: `${SECTIONS[0].vh[tier]}vh` }} className="relative">
      <div className="sticky top-0 grid min-h-[40vh] grid-cols-12 gap-4 px-4 pt-24 md:px-8">
        <div className="col-span-12 md:col-span-7" data-ink-source="sentence">
          <h1 className="display">
            {before}<span data-ink-words>{c.inkFrom}</span>{after}
          </h1>
          <p className="body mt-5" id="deck">{c.deck}</p>
          <Ladder words={c.headline.split(' ').length} />
          <Plate machine={MACHINE.quoter} control={<button type="button" id="rebuild" className="mono link underline">{c.rebuild}</button>}>
            {c.plate}
          </Plate>
          <p className="mono pencil mt-1">{c.honesty}</p>
        </div>
      </div>
    </section>
  );
}
```

`src/site/sections/Kalshi.tsx`:

```tsx
'use client';
import { copy } from '@/site/copy';
import { SECTIONS } from '@/bench/sections';
import { MACHINE } from '@/bench/types';
import { useScroll } from '@/scroll/ScrollProvider';
import { Plate } from '@/site/Plate';

export function Kalshi() {
  const { tier } = useScroll();
  const c = copy.kalshi;
  return (
    <section id="kalshi" style={{ minHeight: `${SECTIONS[3].vh[tier]}vh` }} className="relative">
      <div className="grid grid-cols-12 gap-4 px-4 pt-24 md:px-8">
        <div className="col-span-12 md:col-span-5">
          <h2 className="h2" data-ink-source="kalshi" data-reveal>{c.heading}</h2>
          <p className="body mt-5" data-reveal>{c.body}</p>
          <dl className="mt-8 space-y-4">
            {c.figures.map((fig) => (
              <div key={fig.label}>
                <dd className="mono-figure">{fig.value}</dd>
                <dt className="mono pencil">{fig.label}</dt>
              </div>
            ))}
          </dl>
          <p className="mono pencil mt-2">{c.asOf} · {c.status}</p>
          <Plate machine={MACHINE.quoter}>{c.plate}</Plate>
          <Plate machine={MACHINE.intake}>{c.plateIntake}</Plate>
          <p className="mono pencil mt-1">{c.honesty}</p>
        </div>
      </div>
    </section>
  );
}
```

Remaining sections: `More` (four `data-reveal` lines with `data-click={i}` and a `<ol id="rungs">` of six `<li data-rung={i}>`), `First` (three lines, Plate bot), `Heron` (h2 with `data-ink-source="heron"`, body, mono, Plate balance), `Darch` (h2 `data-ink-source="darch"`, Plate splitter), `Summers` (h2 `data-ink-source="summers"`, wvu, nist smaller, orbit mono footnote, Plate watch), `Alive` (three lines, `<p className="mono-figure">running <span id="uptime">00:00:00</span></p>`), `Yours` (h2 `data-ink-source="yours"`, `<form id="yours-form">` with `<label htmlFor="yours-input">`, `<input id="yours-input" maxLength={120} placeholder>`, `<button type="button" id="yours-clear">`, `<Plate machine={MACHINE.visitor}><span id="yours-plate">{copy.yours.plateEmpty}</span></Plate>`, note, mailto `<a id="mailto" href="mailto:...">`, github, linkedin, resume, school, `<footer><p className="mono pencil" id="footer-total">{copy.yours.footer(0)}</p></footer>`).

- [ ] **Step 6: `src/site/Site.tsx` and `src/app/page.tsx`**

```tsx
// src/site/Site.tsx
'use client';
import { ScrollProvider } from '@/scroll/ScrollProvider';
import { Nav } from './chrome/Nav';
import { SectionStrip } from './chrome/SectionStrip';
import { Sentence } from './sections/Sentence';
import { More } from './sections/More';
import { First } from './sections/First';
import { Kalshi } from './sections/Kalshi';
import { Heron } from './sections/Heron';
import { Darch } from './sections/Darch';
import { Summers } from './sections/Summers';
import { Alive } from './sections/Alive';
import { Yours } from './sections/Yours';

export function Site() {
  return (
    <ScrollProvider>
      {/* Stage 2 mounts <Scene /> here, fixed behind the DOM. */}
      <Nav />
      <SectionStrip />
      <main className="relative z-10">
        <Sentence /><More /><First /><Kalshi /><Heron /><Darch /><Summers /><Alive /><Yours />
      </main>
    </ScrollProvider>
  );
}
```

```tsx
// src/app/page.tsx
import { Site } from '@/site/Site';
export default function Home() { return <Site />; }
```

- [ ] **Step 7: Verify**

Run `npm run lint && npx tsc --noEmit && npx vitest run` → all clean. Start `npm run dev -- --port 3111`, then with Playwright at 1440 × 900: screenshot the top of the page in light, toggle the theme, screenshot in dark; scroll to `#yours`, confirm the input is present and the footer text reads `this page is one bench, 0 parts, built from the words on it.`; console has zero errors. Save stills to `.playwright-mcp/gates/stage0-light.png`, `stage0-dark.png`.

- [ ] **Step 8: Commit** — `git add -A && git commit -m "Add DOM site shell: nav, strip, ladder, nine sections with copy"`
