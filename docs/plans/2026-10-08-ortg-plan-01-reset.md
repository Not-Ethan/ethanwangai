# Stage 0: Reset, static export, palette, copy, DOM shell

> Part of `2026-10-08-ortg-plan-00-index.md`. Read the index's Global Constraints and Interface contracts, then the spec `2026-10-08-only-running-things-glow-design.md`, before you start. This stage argues from spec §2 (decisions: one dark theme, no real-world hooks, static export, facts, copy rules), §3 and §3.1–3.2 (sections, heights, views, verbatim copy), §5.7 (sections, facts, types, palette), §7 (server-rendered DOM over the still), §9 (palette, type, layout, DOM motion), §11 (no-GL static label list), §13 and §15 (what is kept, deleted, added; dependencies and scripts) and §16 (copy and palette tests). It ends at the Stage 0 gate: the DOM-only site renders every section's copy, `npm run build` exports to `out/`, and `npm run lint`, `npx tsc --noEmit`, `npx vitest run` are green.

**Order.** Task 0.1 runs first (it makes `src/valley/types.ts` and `src/valley/sections.ts` and moves the scroll layer off `src/bench`). Task 0.2 runs next (the delete). Tasks 0.3 and 0.4 are **[parallel-safe]** with each other and must run after 0.2: 0.4's "colour literals live only in palette.ts" test fails while the old `src/theme/palettes.ts` still exists. Stage 1 can start after Tasks 0.1, 0.3 and 0.4 have landed (it imports `facts.kalshi.trades`, `PALETTE` and `SKY_KEYFRAMES`); only its Tasks 1.1 and 1.7 need nothing beyond 0.1 and may start right after it. Task 0.5 needs 0.3. Tasks 0.6, 0.7, 0.8 run in order after 0.4 and 0.5.

**Testing rule for this stage.** vitest runs in `environment: 'node'` and includes only `src/**/*.test.ts`. No React component is rendered in a test. Components are checked by `npx tsc --noEmit`, `npm run lint`, and by Task 0.8's test, which reads the statically exported `out/index.html`.

**Before every commit that touches `src/`:** `npm run lint`, `npx tsc --noEmit`, `npx vitest run`. Commit on branch `redesign/only-running-things-glow`, never on `main`. Stage only the files your task names.

---

### Task 0.1: Valley contracts and sections, scroll layer rewired off `src/bench`

Spec §3 (section table, portrait yaw column, range rule), §5.7, §8 and §15 ("this is the first build task so the tree compiles before `src/bench` is deleted").

**Files:**
- Create: `src/valley/types.ts`
- Create: `src/valley/sections.ts`
- Test: `src/valley/sections.test.ts`
- Modify: `src/scroll/ScrollProvider.tsx` (lines 4–5, the two `@/bench` imports)
- Modify: `src/scroll/tier.ts` (line 1)
- Modify: `src/gl/useTier.ts` (line 10)
- Modify: `src/gl/useTier.test.ts` (line 5)
- Delete: `src/gl/Clocks.test.ts`, `src/fallback/StaticPlates.test.ts` (old tests that pass bench-typed `{ id: string }` ranges into `ScrollState`; once the provider takes valley's `SectionRange` they are the only two tsc errors in the tree. Task 0.2 deletes everything else under `src/gl` and `src/fallback/StaticPlates*` anyway.)

**Interfaces:**
- Consumes: nothing.
- Produces (verbatim from the index contracts; later stages import these names and never rename them):
  - `src/valley/types.ts`: `Tier`, `SectionId`, `EmitterId`, `Vec3`, `LightState`, `Emitter`, `SectionRange`, `View`, `Timeline`, `Environment`, `IgnitionKind`, `IgnitionStep`, `RoofKind`, `HousePart`, `House`, `BuildState`.
  - `src/valley/sections.ts`: `interface SectionDef { id: SectionId; heightVh: number; todEnd: number; view: View; viewPortrait: View }`, `const SECTIONS: readonly SectionDef[]`, `sectionRanges(tops: number[], docHeight: number, vh: number): SectionRange[]`, `locate(g: number, ranges: SectionRange[]): { section: SectionId; s: number; index: number }`.

- [ ] **Step 1: Write `src/valley/types.ts`** (copied from the index contract block, nothing added)

```ts
// Pure contracts for the valley (spec §5.7). src/valley/** imports nothing from React, three's renderer or the DOM.
// These names are law: later stages copy them and never rename them (plan index, Interface contracts).

export type Tier = 'desktop' | 'phone';
export type SectionId = 'open' | 'kalshi' | 'heron' | 'darch' | 'summers' | 'alive' | 'yours' | 'contact';
export type EmitterId = 'hut' | 'nist' | 'wvu' | 'kalshiLamp' | 'bar1' | 'bar2' | 'bar3' | 'bar4' | 'mill' | 'ridge'
  | 'hill1' | 'hill2' | 'hill3' | 'hill4' | 'hill5' | 'visitor';
export type Vec3 = readonly [number, number, number];
export type LightState = 'dark' | 'igniting' | 'lit' | 'out';
export interface Emitter { id: EmitterId; position: Vec3; color: string; size: number; meaning: string }
export interface SectionRange { id: SectionId; start: number; end: number }          // g space, start < end
export interface View { yaw: number; pitch: number; fovScale: number }               // degrees, degrees, multiplier
export interface Timeline { tod: number; section: SectionId; s: number; view: View; ridgeReveal: number; hedgeReveal: number; darchT: number; rain: number; pulseArm: boolean }
export interface Environment { zenith: string; horizon: string; east: string; fogColor: string; fogNear: number; fogFar: number; sunDir: Vec3; sunColor: string; sunIntensity: number; hemiSky: string; hemiGround: string; starAlpha: number; moonPos: Vec3; moonAlpha: number }
export type IgnitionKind = 'flicker' | 'catch' | 'mill' | 'trickle';
export interface IgnitionStep { target: EmitterId | 'ridge'; at: number; dur: number; kind: IgnitionKind; stagger?: number }
export type RoofKind = 'pitched' | 'hipped' | 'flat';
export interface HousePart { kind: 'plank' | 'slat' | 'frame' | 'post' | 'chimney'; min: Vec3; max: Vec3; order: number }
export interface House { seed: number; words: number; tiers: number; bays: number; width: number; depth: number; roof: RoofKind; windowsPerFace: { front: number; back: number; side: number }; porch: boolean; parts: HousePart[]; windows: Vec3[] }
export interface BuildState { cut: number; scaffold: { idx: number; grow: number }[]; clock: string; lit: boolean; done: boolean }
```

- [ ] **Step 2: Write the failing test `src/valley/sections.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { SECTIONS, sectionRanges, locate } from './sections';
import type { SectionId } from './types';

const ORDER: SectionId[] = ['open', 'kalshi', 'heron', 'darch', 'summers', 'alive', 'yours', 'contact'];

/** Section tops and document height for a page whose sections are exactly their minimum heights. */
function page(vh: number): { tops: number[]; docHeight: number } {
  const tops: number[] = [];
  let y = 0;
  for (const s of SECTIONS) {
    tops.push(y);
    y += (s.heightVh * vh) / 100;
  }
  return { tops, docHeight: y };
}

describe('SECTIONS (spec §3)', () => {
  it('has the eight sections in page order', () => {
    expect(SECTIONS.map((s) => s.id)).toEqual(ORDER);
  });
  it('has the spec heights in vh', () => {
    expect(SECTIONS.map((s) => s.heightVh)).toEqual([100, 180, 120, 180, 100, 120, 140, 150]);
  });
  it('ends each section at the spec tod, 0 through open and 1 at the end of contact', () => {
    expect(SECTIONS.map((s) => s.todEnd)).toEqual([0, 0.3, 0.4, 0.6, 0.65, 0.72, 0.8, 1]);
    for (let i = 1; i < SECTIONS.length; i++) expect(SECTIONS[i].todEnd).toBeGreaterThanOrEqual(SECTIONS[i - 1].todEnd);
  });
  it('turns the landscape view per section (yaw°, pitch°, fovScale)', () => {
    expect(SECTIONS.map((s) => [s.view.yaw, s.view.pitch, s.view.fovScale])).toEqual([
      [0, 0, 1], [4, 1, 0.96], [2, 0, 0.98], [7, 0, 0.95], [-6, 3, 0.97], [0, 1, 1.04], [4, -2, 0.97], [-3, -1, 1],
    ]);
  });
  it('uses the portrait yaw column and shares pitch and fovScale with landscape', () => {
    expect(SECTIONS.map((s) => s.viewPortrait.yaw)).toEqual([0, 0, 0, 12, -12, 0, 3, -6]);
    for (const s of SECTIONS) {
      expect(s.viewPortrait.pitch, s.id).toBe(s.view.pitch);
      expect(s.viewPortrait.fovScale, s.id).toBe(s.view.fovScale);
    }
  });
});

describe('sectionRanges', () => {
  for (const [w, h] of [[1440, 900], [390, 844]] as const) {
    it(`gives every section a contiguous range of positive width at ${w} × ${h}`, () => {
      const { tops, docHeight } = page(h);
      const r = sectionRanges(tops, docHeight, h);
      expect(r.map((x) => x.id)).toEqual(ORDER);
      expect(r[0].start).toBe(0);
      expect(r[r.length - 1].end).toBe(1);
      for (let i = 0; i < r.length; i++) {
        expect(r[i].end - r[i].start, r[i].id).toBeGreaterThan(0);
        if (i > 0) expect(r[i].start, r[i].id).toBe(r[i - 1].end);
      }
    });
  }
  it('starts a section when its top reaches the viewport top', () => {
    const vh = 900;
    const { tops, docHeight } = page(vh);
    const r = sectionRanges(tops, docHeight, vh);
    expect(r[1].start).toBeCloseTo(tops[1] / (docHeight - vh), 9);
    expect(r[7].start).toBeCloseTo(tops[7] / (docHeight - vh), 9);
  });
});

describe('locate', () => {
  const vh = 900;
  const { tops, docHeight } = page(vh);
  const r = sectionRanges(tops, docHeight, vh);

  it('maps the middle of a range to its section at s = 0.5', () => {
    const out = locate((r[1].start + r[1].end) / 2, r);
    expect(out.section).toBe('kalshi');
    expect(out.index).toBe(1);
    expect(out.s).toBeCloseTo(0.5, 9);
  });
  it('puts a range boundary at s = 0 of the later section', () => {
    expect(locate(r[2].start, r)).toEqual({ section: 'heron', s: 0, index: 2 });
  });
  it('clamps g below 0 to open and above 1 to contact', () => {
    expect(locate(-0.5, r)).toEqual({ section: 'open', s: 0, index: 0 });
    expect(locate(1.5, r)).toEqual({ section: 'contact', s: 1, index: 7 });
  });
  it('returns open at s = 0 before the provider has measured any ranges', () => {
    expect(locate(0.4, [])).toEqual({ section: 'open', s: 0, index: 0 });
  });
});
```

- [ ] **Step 3: Run it and see it fail**

Run: `npx vitest run src/valley/sections.test.ts`
Expected: FAIL, `Failed to resolve import "./sections"`.

- [ ] **Step 4: Write `src/valley/sections.ts`**

```ts
// The eight sections (spec §3): ids, minimum heights, tod at each section's end, and the view each section turns to.
// sectionRanges and locate keep the signatures ScrollProvider used with src/bench (spec §3, §15).
import type { SectionId, SectionRange, View } from './types';

export interface SectionDef { id: SectionId; heightVh: number; todEnd: number; view: View; viewPortrait: View }

const view = (yaw: number, pitch: number, fovScale: number): View => ({ yaw, pitch, fovScale });

/** viewPortrait is the spec §3 portrait yaw column; pitch and fovScale are shared with the landscape view. */
export const SECTIONS: readonly SectionDef[] = [
  { id: 'open',    heightVh: 100, todEnd: 0,    view: view(0, 0, 1),     viewPortrait: view(0, 0, 1) },
  { id: 'kalshi',  heightVh: 180, todEnd: 0.3,  view: view(4, 1, 0.96),  viewPortrait: view(0, 1, 0.96) },
  { id: 'heron',   heightVh: 120, todEnd: 0.4,  view: view(2, 0, 0.98),  viewPortrait: view(0, 0, 0.98) },
  { id: 'darch',   heightVh: 180, todEnd: 0.6,  view: view(7, 0, 0.95),  viewPortrait: view(12, 0, 0.95) },
  { id: 'summers', heightVh: 100, todEnd: 0.65, view: view(-6, 3, 0.97), viewPortrait: view(-12, 3, 0.97) },
  { id: 'alive',   heightVh: 120, todEnd: 0.72, view: view(0, 1, 1.04),  viewPortrait: view(0, 1, 1.04) },
  { id: 'yours',   heightVh: 140, todEnd: 0.8,  view: view(4, -2, 0.97), viewPortrait: view(3, -2, 0.97) },
  { id: 'contact', heightVh: 150, todEnd: 1,    view: view(-3, -1, 1),   viewPortrait: view(-6, -1, 1) },
];

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * g ranges: a section's range starts when its top reaches the viewport top and ends where the next one starts;
 * the first starts at 0 and the last ends at 1. `tops` are the sections' page tops in px, in SECTIONS order.
 */
export function sectionRanges(tops: number[], docHeight: number, vh: number): SectionRange[] {
  const max = Math.max(1, docHeight - vh);
  const last = SECTIONS.length - 1;
  return SECTIONS.map((s, i) => ({
    id: s.id,
    start: i === 0 ? 0 : clamp01((tops[i] ?? 0) / max),
    end: i === last ? 1 : clamp01((tops[i + 1] ?? 0) / max),
  }));
}

/** The section g falls in and the local progress s (0..1) inside its range. With no ranges yet, open at s = 0. */
export function locate(g: number, ranges: SectionRange[]): { section: SectionId; s: number; index: number } {
  const last = ranges.length - 1;
  if (last < 0) return { section: 'open', s: 0, index: 0 };
  if (g <= ranges[0].start) return { section: ranges[0].id, s: 0, index: 0 };
  if (g >= 1) return { section: ranges[last].id, s: 1, index: last };
  for (let i = 0; i <= last; i++) {
    const r = ranges[i];
    if (g < r.end || i === last) {
      const span = Math.max(1e-6, r.end - r.start);
      return { section: r.id, s: clamp01((g - r.start) / span), index: i };
    }
  }
  return { section: ranges[last].id, s: 1, index: last };
}
```

- [ ] **Step 5: Run it and see it pass**

Run: `npx vitest run src/valley/sections.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 6: Rewire the scroll layer and `useTier` to `@/valley`**

In `src/scroll/ScrollProvider.tsx` replace lines 4–5:

```ts
import { SECTIONS, sectionRanges, type SectionRange } from '@/bench/sections';
import type { Tier } from '@/bench/types';
```

with:

```ts
import { SECTIONS, sectionRanges } from '@/valley/sections';
import type { SectionRange, Tier } from '@/valley/types';
```

Nothing else in the provider changes: it still measures `SECTIONS.map((sec) => document.getElementById(sec.id)?.offsetTop)` and calls `sectionRanges(s.tops, docHeight, s.vh)`.

In `src/scroll/tier.ts` replace line 1 `import type { Tier } from '@/bench/types';` with:

```ts
import type { Tier } from '@/valley/types';
```

In `src/gl/useTier.ts` replace line 10 `import type { Tier } from '@/bench/types';` with:

```ts
import type { Tier } from '@/valley/types';
```

In `src/gl/useTier.test.ts` replace line 5 `import type { Tier } from '@/bench/types';` with:

```ts
import type { Tier } from '@/valley/types';
```

`useTier.ts` is only rewired here; its re-tune (§11: drop `stretch`, `lines`, `msaa`, `DPR_FLOOR` 0.85) is Stage 5's.

- [ ] **Step 7: Remove the two old tests that no longer typecheck, then check the whole tree compiles**

The provider now types its ranges with valley's `SectionRange` (`id: SectionId`). Two old tests still pass bench-typed ranges (`id: string`) into it. Both are old-build files that Task 0.2 deletes anyway, so remove them now and keep the tree green (spec §15: the tree compiles before `src/bench` is deleted):

```bash
git rm -q src/gl/Clocks.test.ts src/fallback/StaticPlates.test.ts
```

Run: `npx tsc --noEmit`
Expected: exit 0, no output. (Checked against the current tree: with Steps 1–6 applied, these two files are the only tsc errors. If tsc reports any other file, it is an old-build test under `src/gl`, `src/site` or `src/fallback/StaticPlates*`: `git rm` it here too and list it in your report. Never leave tsc red at a commit.)

Run: `npx vitest run src/valley src/scroll src/gl/useTier.test.ts src/fallback/glSupport.test.ts`
Expected: PASS.

Run: `grep -rn "@/bench" src/scroll src/gl/useTier.ts src/gl/useTier.test.ts`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
npx tsc --noEmit
git add src/valley/types.ts src/valley/sections.ts src/valley/sections.test.ts src/scroll/ScrollProvider.tsx src/scroll/tier.ts src/gl/useTier.ts src/gl/useTier.test.ts
git commit -m "Add valley types and sections; move the scroll layer off src/bench"
```

**Verify:**
- `npx vitest run src/valley/sections.test.ts` → 12 passed.
- `npx tsc --noEmit` → exit 0, no output.
- `git ls-files src/gl/Clocks.test.ts src/fallback/StaticPlates.test.ts` → empty.
- `grep -rn "from 'react'\|from 'three'\|document\.\|window\." src/valley` → empty (valley stays pure).
- `sed -n '/^\/\/ src\/valley\/types.ts/,/^```/p' docs/plans/2026-10-08-ortg-plan-00-index.md | grep -v '^//\|^```' | while IFS= read -r l; do grep -qxF -- "$l" src/valley/types.ts || echo "missing: $l"; done` → empty (every contract line copied verbatim).

---

### Task 0.2: Delete the old build; static export, scripts, dependencies, resume

Spec §2 (one theme; static export; `npm start` removed), §10 (no build-time emitter: `prebuild`, `emit`, `check:emit` and `scripts/**` deleted), §13 (the deleted list), §15 (kept; dependencies removed; scripts), and the `public/resume.pdf` line of §13/§15.

**Files:**
- Delete: `src/bench/**`, `src/generated/**`, `src/theme/**`, `scripts/**`, `public/plates/**`, `src/app/opengraph-image.tsx`, `src/app/opengraph-image.test.ts`, every file under `src/site/` (all of them are old; the new ones arrive in Tasks 0.5–0.8), every file under `src/gl/` except `src/gl/useTier.ts` and `src/gl/useTier.test.ts`, `src/fallback/StaticPlates.tsx`, `src/fallback/staticPlates.css` (`src/fallback/StaticPlates.test.ts` and `src/gl/Clocks.test.ts` went in Task 0.1)
- Modify: `next.config.ts`, `package.json`, `package-lock.json`, `vitest.config.ts`, `README.md`, `src/app/layout.tsx` (replace), `src/app/page.tsx` (replace)
- Replace: `public/resume.pdf` (copied from `/Users/Ethan_1/Downloads/ethan_wang_swe_trading_infrastructure_resume.pdf`)

**Interfaces:**
- Consumes: Task 0.1's rewired `src/scroll/*` and `src/gl/useTier.ts` (they must no longer import anything this task deletes).
- Produces: a tree that holds only `src/app/{favicon.ico,fonts/*,globals.css,layout.tsx,page.tsx}`, `src/fallback/glSupport{,.test}.ts`, `src/gl/useTier{,.test}.ts`, `src/scroll/*`, `src/valley/{types,sections,sections.test}.ts`; `next build` writing a static `out/`; `package.json` scripts exactly `dev`, `build`, `lint`, `typecheck`, `test`. `layout.tsx` exports `RootLayout` with the two `next/font/local` variables `--font-display` and `--font-mono` on `<html>`, no theme script, no provider. Task 0.5 adds `metadata`; Task 0.8 replaces `page.tsx`.

- [ ] **Step 1: Delete the old code**

```bash
cd /Users/Ethan_1/ethanwangai
git rm -rq src/bench src/generated src/theme scripts public/plates src/site
git rm -q src/app/opengraph-image.tsx src/app/opengraph-image.test.ts
git rm -q src/fallback/StaticPlates.tsx src/fallback/staticPlates.css
git ls-files src/gl | grep -vE '^src/gl/useTier(\.test)?\.ts$' | xargs git rm -q
```

Run: `git ls-files src | sort`
Expected exactly:

```
src/app/favicon.ico
src/app/fonts/archivo-latin-wght-normal.woff2
src/app/fonts/jetbrains-mono-latin-wght-normal.woff2
src/app/globals.css
src/app/layout.tsx
src/app/page.tsx
src/fallback/glSupport.test.ts
src/fallback/glSupport.ts
src/gl/useTier.test.ts
src/gl/useTier.ts
src/scroll/ScrollProvider.tsx
src/scroll/tier.ts
src/scroll/velocity.test.ts
src/scroll/velocity.ts
src/valley/sections.test.ts
src/valley/sections.ts
src/valley/types.ts
```

Then `ls src/gl src/site 2>&1`: if any untracked leftovers remain (empty dirs, stray files), remove them with `rm -rf src/site` and `find src/gl -mindepth 1 ! -name 'useTier.ts' ! -name 'useTier.test.ts' -exec rm -rf {} +`.

- [ ] **Step 2: Replace `src/app/layout.tsx`** (no theme script, no ThemeProvider, no `suppressHydrationWarning`; metadata is added by Task 0.5 from `copy.ts`)

```tsx
import localFont from 'next/font/local';
import './globals.css';

// Archivo variable and JetBrains Mono variable, self-hosted (spec §9). One dark theme, no theme script (spec §2).
const display = localFont({
  src: './fonts/archivo-latin-wght-normal.woff2', variable: '--font-display', weight: '100 900', display: 'swap', adjustFontFallback: 'Arial',
});
const mono = localFont({
  src: './fonts/jetbrains-mono-latin-wght-normal.woff2', variable: '--font-mono', weight: '100 800', display: 'swap', adjustFontFallback: false,
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Replace `src/app/page.tsx` with a stub** (Task 0.8 puts the site back)

```tsx
export default function Home() {
  return <main />;
}
```

- [ ] **Step 4: Static export in `next.config.ts`**

```ts
import type { NextConfig } from 'next';

// Static export (spec §2): the site is files on a CDN. No server, no API routes, no image optimizer.
const nextConfig: NextConfig = {
  output: 'export',
};

export default nextConfig;
```

- [ ] **Step 5: Dependencies and scripts**

```bash
npm uninstall tsx @fontsource-variable/archivo @fontsource-variable/jetbrains-mono @fontsource/archivo
```

Then set the `scripts` block in `package.json` to exactly:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "lint": "eslint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run"
}
```

- [ ] **Step 6: vitest only looks in `src/`** (`scripts/` is gone). Replace `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
```

- [ ] **Step 7: The resume and the README**

```bash
cp /Users/Ethan_1/Downloads/ethan_wang_swe_trading_infrastructure_resume.pdf public/resume.pdf
```

Replace `README.md` with:

```md
# ethanwang.ai

one river valley at blue hour. the only light in it comes from things i built. next.js static export + react three fiber.

- `npm run dev`: local dev
- `npm run build`: static export to `out/` (serve it with `npx serve out -l 3005`)
- `npm test`: vitest over `src/`
- spec: `docs/plans/2026-10-08-only-running-things-glow-design.md`
```

- [ ] **Step 8: Run the checks**

Run: `npx tsc --noEmit` → Expected: no output.
Run: `npm run lint` → Expected: no errors.
Run: `npx vitest run` → Expected: PASS (sections, velocity, glSupport, useTier).
Run: `npm run build && ls out/index.html` → Expected: the build prints `○ /` as static and `out/index.html` exists.
Run: `grep -c '"tsx"\|fontsource' package.json` → Expected: `0`.
Run: `cmp public/resume.pdf /Users/Ethan_1/Downloads/ethan_wang_swe_trading_infrastructure_resume.pdf && echo same` → Expected: `same`.

- [ ] **Step 9: Commit** (the deletions are already staged by `git rm`)

```bash
git add next.config.ts package.json package-lock.json vitest.config.ts README.md public/resume.pdf src/app/layout.tsx src/app/page.tsx
git commit -m "Delete the paper build; static export, trimmed scripts and deps, new resume"
```

**Verify:**
- `git ls-files src | sort` matches the 17-line list in Step 1.
- `git ls-files scripts public/plates src/bench src/theme src/generated` → empty.
- `grep -rn "THEME_SCRIPT\|ThemeProvider\|data-theme" src` → empty.
- `node -e "const p=require('./package.json');console.log(Object.keys(p.scripts).join(','))"` → `dev,build,lint,typecheck,test`.
- `npm run build` → exit 0 and `out/index.html` exists; `ls src/app/api 2>&1` → `No such file or directory`.

---

### Task 0.3: Public facts **[parallel-safe]**

Spec §2 ("All numbers come from `src/valley/facts.ts` ... every one labelled `as of oct 2026`. Public numbers only"), §5.7, §16 (forbidden numbers).

**Files:**
- Create: `src/valley/facts.ts`
- Test: `src/valley/facts.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `AS_OF: 'oct 2026'`; `facts` (readonly):
  `facts.kalshi: { trades: 30000; leaderboardTop: 100; since: 'jan 2026'; asOf }`,
  `facts.heron: { cities: 4; since: 'june 2026'; asOf }`,
  `facts.darch: { videosPerMonth: 3000; viewsPerMonth: 20000000; from: 'june 2025'; to: 'may 2026'; asOf }`,
  `facts.wvu: { claimsPerYearUsd: 100000000; asOf }`.
  Stage 1's `ridge.ts` reads `facts.kalshi.trades` for N; Task 0.5's copy test and Task 0.6's `Counter` read it too.

- [ ] **Step 1: Write the failing test `src/valley/facts.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { facts, AS_OF } from './facts';

/** Every key path in an object, e.g. 'kalshi.trades'. */
function keys(o: object, prefix = ''): string[] {
  return Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v as object, `${prefix}${k}.`) : [`${prefix}${k}`]);
}
function numbers(o: object): number[] {
  return Object.values(o).flatMap((v) => (typeof v === 'number' ? [v] : v && typeof v === 'object' ? numbers(v as object) : []));
}

describe('facts (spec §2)', () => {
  it('carries the public numbers', () => {
    expect(facts.kalshi.trades).toBe(30_000);
    expect(facts.kalshi.leaderboardTop).toBe(100);
    expect(facts.kalshi.since).toBe('jan 2026');
    expect(facts.heron.cities).toBe(4);
    expect(facts.heron.since).toBe('june 2026');
    expect(facts.darch.videosPerMonth).toBe(3_000);
    expect(facts.darch.viewsPerMonth).toBe(20_000_000);
    expect(facts.darch.from).toBe('june 2025');
    expect(facts.darch.to).toBe('may 2026');
    expect(facts.wvu.claimsPerYearUsd).toBe(100_000_000);
  });
  it('labels every project as of oct 2026', () => {
    expect(AS_OF).toBe('oct 2026');
    for (const [name, entry] of Object.entries(facts)) expect(entry.asOf, name).toBe('oct 2026');
  });
  it('never holds a private number: no profit, no exact rank, no notional, no contract volume', () => {
    for (const k of keys(facts)) expect(k).not.toMatch(/profit|pnl|rank|notional|contract|volume|dollar/i);
    const ns = numbers(facts);
    expect(ns).not.toContain(75);
    expect(ns).not.toContain(20_000);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/valley/facts.test.ts`
Expected: FAIL, `Failed to resolve import "./facts"`.

- [ ] **Step 3: Write `src/valley/facts.ts`**

```ts
// Every public number on the site (spec §2), hand-edited, each labelled as of oct 2026. Public numbers only:
// never a dollar profit figure, never an exact leaderboard rank, never notional or contract volume.
export const AS_OF = 'oct 2026';

export const facts = {
  kalshi: { trades: 30_000, leaderboardTop: 100, since: 'jan 2026', asOf: AS_OF },
  heron: { cities: 4, since: 'june 2026', asOf: AS_OF },
  darch: { videosPerMonth: 3_000, viewsPerMonth: 20_000_000, from: 'june 2025', to: 'may 2026', asOf: AS_OF },
  wvu: { claimsPerYearUsd: 100_000_000, asOf: AS_OF },
} as const;
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run src/valley/facts.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/valley/facts.ts src/valley/facts.test.ts
git commit -m "Add the public facts, as of oct 2026"
```

**Verify:**
- `npx vitest run src/valley/facts.test.ts` → 3 passed.
- `grep -n "75\|20000\|20_000\b\|notional\|contract" src/valley/facts.ts` → empty.

---

### Task 0.4: Dark palette, `globals.css` type system and layout classes **[parallel-safe]**

Spec §2 (one theme), §9 (every palette value, scrims, typography, layout), §16 ("the palette and `globals.css` agree; the scrim contrast test"), and the global constraint "the only colour literals in `.ts`/`.tsx` are in `palette.ts`".

**Files:**
- Create: `src/valley/palette.ts`
- Test: `src/valley/palette.test.ts`
- Modify: `src/app/globals.css` (replace entirely)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `PALETTE` (readonly hex strings): `ink, inkDim, rule, scrim, warm, ridge, porch, millWindow, lamp, hedge, rain, wall, roof, terrainLow, terrainMid, terrainSlope, terrainCrest, treeline, river, mist`.
  - `ALPHA: { hedge: 0.5; rain: 0.35 }`.
  - `type SkyName = 'dusk' | 'blue' | 'night' | 'predawn'`; `interface SkyKeyframe { name: SkyName; tod: number; zenith: string; horizon: string; east: string; sun: string; sunIntensity: number }`; `SKY_KEYFRAMES: readonly SkyKeyframe[]` at tod 0, 0.3, 0.6, 1.0 (Stage 1's `environmentAt` blends these; hemisphere sky = zenith, ground = `PALETTE.terrainLow`, fog = horizon, per §9).
  - `cssVars(): [name: string, value: string][]`: the CSS custom property for every colour (`--ink`, `--ink-dim`, `--mill-window`, `--terrain-low`, ..., `--sky-night-zenith`, `--sky-dusk-sun`, ...).
  - CSS classes for Tasks 0.6–0.8: `.display .h2 .body .mono .mono-figure .ink-dim .link .valley-canvas .section .section-grid .copy-col .open-col .scrim .nav .yours-input`; Tailwind colour utilities `text-ink`, `text-ink-dim`, `text-rule`.

- [ ] **Step 1: Write the failing test `src/valley/palette.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PALETTE, ALPHA, SKY_KEYFRAMES, cssVars } from './palette';

const SRC = fileURLToPath(new URL('..', import.meta.url));
const css = readFileSync(path.join(SRC, 'app/globals.css'), 'utf8');

function rgb(color: string): [number, number, number] {
  if (color.startsWith('#')) return [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)) as [number, number, number];
  const m = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (!m) throw new Error(`unparsed colour ${color}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}
function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
const contrast = (a: [number, number, number], b: [number, number, number]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('PALETTE (spec §9)', () => {
  it('has the spec values', () => {
    expect(PALETTE).toEqual({
      ink: '#E9E4DA', inkDim: '#9A958C', rule: '#2A2C33', scrim: 'rgba(5,7,15,0.72)',
      warm: '#FFC98A', ridge: '#FFB45A', porch: '#FFD9A0', millWindow: '#FFC27A', lamp: '#FFD2A0',
      hedge: '#8FA3B8', rain: '#9AAEC4',
      wall: '#1A1F28', roof: '#11151C',
      terrainLow: '#16241C', terrainMid: '#1F3326', terrainSlope: '#2B3340', terrainCrest: '#0C0F16', treeline: '#090B10',
      river: '#6E8AA6', mist: '#8FA3B8',
    });
    expect(ALPHA).toEqual({ hedge: 0.5, rain: 0.35 });
  });
  it('has the four sky keyframes at tod 0, 0.3, 0.6, 1', () => {
    expect(SKY_KEYFRAMES).toEqual([
      { name: 'dusk', tod: 0, zenith: '#1B2238', horizon: '#C9825A', east: '#2A2E48', sun: '#E8A070', sunIntensity: 0.6 },
      { name: 'blue', tod: 0.3, zenith: '#0E1426', horizon: '#3E5A7A', east: '#141A2E', sun: '#8FA8D0', sunIntensity: 0.35 },
      { name: 'night', tod: 0.6, zenith: '#05070F', horizon: '#101830', east: '#070A14', sun: '#9FB2D8', sunIntensity: 0.25 },
      { name: 'predawn', tod: 1, zenith: '#0A0F1E', horizon: '#1E2A40', east: '#3E5068', sun: '#B8C4D8', sunIntensity: 0.3 },
    ]);
  });
});

describe('globals.css mirrors the palette', () => {
  it('declares every palette colour as a CSS variable with the same value', () => {
    const vars = cssVars();
    expect(vars.length).toBe(Object.keys(PALETTE).length + SKY_KEYFRAMES.length * 4);
    for (const [name, value] of vars) expect(css, name).toContain(`${name}: ${value};`);
  });
  it('declares one theme only', () => {
    expect(css).not.toMatch(/data-theme|prefers-color-scheme/);
  });
});

describe('scrim contrast (spec §9: 4.5:1 on copy)', () => {
  const scrim = rgb(PALETTE.scrim);
  const a = 0.72;
  for (const k of SKY_KEYFRAMES) {
    for (const where of ['zenith', 'horizon', 'east'] as const) {
      it(`ink and inkDim clear 4.5:1 on the scrim over the ${k.name} ${where}`, () => {
        const sky = rgb(k[where]);
        const bg = sky.map((c, i) => a * scrim[i] + (1 - a) * c) as [number, number, number];
        expect(contrast(rgb(PALETTE.ink), bg)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(rgb(PALETTE.inkDim), bg)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

describe('colour literals live only in palette.ts', () => {
  it('no other .ts or .tsx under src/ (tests aside) holds a hex or rgb() colour', () => {
    const files = (readdirSync(SRC, { recursive: true }) as string[])
      .filter((f) => /\.tsx?$/.test(f) && !/\.test\.ts$/.test(f) && !f.endsWith(path.join('valley', 'palette.ts')));
    for (const f of files) {
      const text = readFileSync(path.join(SRC, f), 'utf8');
      expect(text, f).not.toMatch(/#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?\b|\brgba?\(/);
    }
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/valley/palette.test.ts`
Expected: FAIL, `Failed to resolve import "./palette"`.

- [ ] **Step 3: Write `src/valley/palette.ts`**

```ts
// The one dark palette (spec §9). The only place colour literals exist in .ts/.tsx; src/app/globals.css declares the
// same values as CSS variables (palette.test.ts checks both, and the scrim contrast).

export const PALETTE = {
  // copy
  ink: '#E9E4DA',
  inkDim: '#9A958C',
  rule: '#2A2C33',
  scrim: 'rgba(5,7,15,0.72)',
  // emitters: warm is the hut, cabins, visitor and hillside
  warm: '#FFC98A',
  ridge: '#FFB45A',
  porch: '#FFD9A0',
  millWindow: '#FFC27A',
  lamp: '#FFD2A0',
  // lines and weather (alphas in ALPHA)
  hedge: '#8FA3B8',
  rain: '#9AAEC4',
  // building and house bodies
  wall: '#1A1F28',
  roof: '#11151C',
  // terrain ramp, river, mist
  terrainLow: '#16241C',
  terrainMid: '#1F3326',
  terrainSlope: '#2B3340',
  terrainCrest: '#0C0F16',
  treeline: '#090B10',
  river: '#6E8AA6',
  mist: '#8FA3B8',
} as const;

export const ALPHA = { hedge: 0.5, rain: 0.35 } as const;

export type SkyName = 'dusk' | 'blue' | 'night' | 'predawn';
export interface SkyKeyframe { name: SkyName; tod: number; zenith: string; horizon: string; east: string; sun: string; sunIntensity: number }

/** Sky and sun/moon keyframes. Hemisphere sky = zenith, hemisphere ground = PALETTE.terrainLow, fog follows the horizon. */
export const SKY_KEYFRAMES: readonly SkyKeyframe[] = [
  { name: 'dusk', tod: 0, zenith: '#1B2238', horizon: '#C9825A', east: '#2A2E48', sun: '#E8A070', sunIntensity: 0.6 },
  { name: 'blue', tod: 0.3, zenith: '#0E1426', horizon: '#3E5A7A', east: '#141A2E', sun: '#8FA8D0', sunIntensity: 0.35 },
  { name: 'night', tod: 0.6, zenith: '#05070F', horizon: '#101830', east: '#070A14', sun: '#9FB2D8', sunIntensity: 0.25 },
  { name: 'predawn', tod: 1, zenith: '#0A0F1E', horizon: '#1E2A40', east: '#3E5068', sun: '#B8C4D8', sunIntensity: 0.3 },
];

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Every colour as [CSS custom property, value]: --ink-dim for PALETTE.inkDim, --sky-night-zenith for night's zenith. */
export function cssVars(): [string, string][] {
  const flat = Object.entries(PALETTE).map(([k, v]): [string, string] => [`--${kebab(k)}`, v]);
  const sky = SKY_KEYFRAMES.flatMap((k) =>
    (['zenith', 'horizon', 'east', 'sun'] as const).map((f): [string, string] => [`--sky-${k.name}-${f}`, k[f]]));
  return [...flat, ...sky];
}
```

- [ ] **Step 4: Replace `src/app/globals.css`**

```css
@import "tailwindcss";

/* The one dark palette (spec §9). Mirrors src/valley/palette.ts; src/valley/palette.test.ts checks every line. */
:root {
  --ink: #E9E4DA;
  --ink-dim: #9A958C;
  --rule: #2A2C33;
  --scrim: rgba(5,7,15,0.72);
  --warm: #FFC98A;
  --ridge: #FFB45A;
  --porch: #FFD9A0;
  --mill-window: #FFC27A;
  --lamp: #FFD2A0;
  --hedge: #8FA3B8;
  --rain: #9AAEC4;
  --wall: #1A1F28;
  --roof: #11151C;
  --terrain-low: #16241C;
  --terrain-mid: #1F3326;
  --terrain-slope: #2B3340;
  --terrain-crest: #0C0F16;
  --treeline: #090B10;
  --river: #6E8AA6;
  --mist: #8FA3B8;
  --sky-dusk-zenith: #1B2238;
  --sky-dusk-horizon: #C9825A;
  --sky-dusk-east: #2A2E48;
  --sky-dusk-sun: #E8A070;
  --sky-blue-zenith: #0E1426;
  --sky-blue-horizon: #3E5A7A;
  --sky-blue-east: #141A2E;
  --sky-blue-sun: #8FA8D0;
  --sky-night-zenith: #05070F;
  --sky-night-horizon: #101830;
  --sky-night-east: #070A14;
  --sky-night-sun: #9FB2D8;
  --sky-predawn-zenith: #0A0F1E;
  --sky-predawn-horizon: #1E2A40;
  --sky-predawn-east: #3E5068;
  --sky-predawn-sun: #B8C4D8;
  color-scheme: dark;
}

@theme inline {
  --color-ink: var(--ink);
  --color-ink-dim: var(--ink-dim);
  --color-rule: var(--rule);
}

html { scroll-behavior: auto; }
html, body { background: var(--sky-night-zenith); color: var(--ink); }
body {
  font-family: var(--font-display), Arial, sans-serif;
  font-weight: 500;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

/* type (spec §9). Copy is already lowercase in copy.ts; no font axis animates, no kinetic type. */
.display {
  font-family: var(--font-display), Arial, sans-serif;
  font-weight: 700; font-size: clamp(2.5rem, 7vw, 7rem); line-height: 0.95; letter-spacing: -0.03em;
}
.h2 {
  font-family: var(--font-display), Arial, sans-serif;
  font-weight: 700; font-size: clamp(1.6rem, 3.8vw, 3.2rem); line-height: 1.02; letter-spacing: -0.025em;
}
.body { font-size: clamp(1.125rem, 1.35vw, 1.25rem); font-weight: 500; line-height: 1.45; max-width: 34ch; }
.mono {
  font-family: var(--font-mono), ui-monospace, monospace;
  font-size: clamp(0.75rem, 0.9vw, 0.875rem); letter-spacing: 0.02em; font-variant-numeric: tabular-nums;
}
.mono-figure {
  font-family: var(--font-mono), ui-monospace, monospace;
  font-size: clamp(3rem, 5vw, 4.5rem); line-height: 1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums;
}
.ink-dim { color: var(--ink-dim); }
.link { text-underline-offset: 0.2em; }
.link:hover, .link:focus-visible { text-decoration: underline; }
:focus-visible { outline: 1px solid var(--ink); outline-offset: 3px; }
::selection { background: var(--warm); color: var(--sky-night-zenith); }

/* the valley: fixed behind the DOM at z 0 (spec §6, §7). Its background image, the committed still, is set inline by
   Site.tsx so the first paint is a finished picture and the no-WebGL tier keeps it. pointer-events none: all hover
   and tap are window listeners (spec §6). */
.valley-canvas {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background-color: var(--sky-night-zenith); background-position: center; background-size: cover; background-repeat: no-repeat;
}

/* sections: copy in a left column (grid columns 1–5 of 12) over the valley (spec §9 layout). The section's inline
   min-height is its heightVh; the grid inherits it so the sticky column has room to hold. */
.section { position: relative; }
.section-grid {
  display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 1rem;
  min-height: inherit; padding: 6rem 1rem 0;
}
.copy-col { grid-column: 1 / -1; align-self: start; position: sticky; top: 6rem; }
.open-col { grid-column: 1 / -1; align-self: start; }
@media (min-width: 48rem) {
  .section-grid { padding: 7rem 3rem 0; }
  .copy-col { grid-column: 1 / span 5; top: 7rem; }
  .open-col { grid-column: 1 / span 8; }
}

/* scrim (spec §9): a vertical gradient from the scrim colour at the text to transparent above and below, only as
   wide as the text. No blur, no box-shadow, no border over the canvas. palette.test.ts pins 4.5:1 for ink and
   ink-dim on it. */
.scrim {
  width: fit-content; max-width: calc(100% + 1.5rem); padding: 1.25rem 0.75rem; margin-inline: -0.75rem;
  background: linear-gradient(to bottom, transparent, var(--scrim) 1.25rem, var(--scrim) calc(100% - 1.25rem), transparent);
}

/* fixed mono chrome (spec §9): home mark top-left, nav top-right. No band, no panel. */
.nav {
  position: fixed; inset-inline: 0; top: 0; z-index: 40;
  display: flex; align-items: flex-start; justify-content: space-between; padding: 1rem;
}
@media (min-width: 48rem) { .nav { padding: 1.25rem 3rem; } }

/* 07's one input: a hairline rule under the text, the palette's rule colour. */
.yours-input {
  background: transparent; color: var(--ink); border-bottom: 1px solid var(--rule);
  padding: 0.5rem 0; width: min(100%, 34ch);
}
.yours-input::placeholder { color: var(--ink-dim); }
```

- [ ] **Step 5: Run it and see it pass**

Run: `npx vitest run src/valley/palette.test.ts`
Expected: PASS, 17 tests (2 palette, 2 mirror, 12 contrast, 1 literal scan). The worst contrast case is inkDim on the scrim over the dusk horizon, about 4.58:1.

- [ ] **Step 6: Commit**

```bash
git add src/valley/palette.ts src/valley/palette.test.ts src/app/globals.css
git commit -m "Add the dark palette, its css mirror and the type and layout classes"
```

**Verify:**
- `npx vitest run src/valley/palette.test.ts` → 17 passed.
- `grep -n "paper\|pencil\|--hot\|data-theme" src/app/globals.css` → empty.
- `grep -rnE "#[0-9a-fA-F]{6}" src --include=*.ts --include=*.tsx | grep -v "palette.ts\|\.test\.ts"` → empty.
- `grep -n "backdrop-filter\|box-shadow" src/app/globals.css` → empty.

---

### Task 0.5: Copy, verbatim, and the page metadata

Spec §3.1 (every string, verbatim), §3.2 (the five hillside sentences), §2 (copy rules: lowercase, no italics, no title case, no em dashes; every string in `src/site/copy.ts`), §16 ("copy contains no uppercase letters outside URLs, no `$20`, no `#75`, no `notional`, no `contracts`").

**Files:**
- Create: `src/site/copy.ts`
- Test: `src/site/copy.test.ts`
- Modify: `src/app/layout.tsx` (add `metadata`)

**Interfaces:**
- Consumes: `facts` from `@/valley/facts` (Task 0.3), only in the test (figures cross-checked against the facts); `SectionId` from `@/valley/types` (Task 0.1).
- Produces: `copy` (readonly) with exactly these members, used by Tasks 0.6–0.8 and Stages 2–5:
  - `copy.meta: { title; description }`
  - `copy.nav: { home; items: readonly { label: string; section: SectionId }[]; resume; separator }`
  - `copy.open: { headline; deck; scrollCue; labels: Record<IgnitionLabelKey, string> }` with `type IgnitionLabelKey = 'hut' | 'nist' | 'mill' | 'kalshiLamp' | 'wvu' | 'bars' | 'hillside'` (exported), in chain order
  - `copy.kalshi: { heading; body; figures: readonly string[]; mono; counter(n: number): string }`
  - `copy.heron: { heading; body; mono }`
  - `copy.darch: { heading; body; figures: readonly string[]; mono }`
  - `copy.summers: { heading; body; figures: readonly string[]; mono }`
  - `copy.alive: { heading; body }`
  - `copy.yours: { heading; body; placeholder; button; maxLength: 140; clock(t: string): string; tag(words: number, parts: number): string; hint; hillside: readonly [string, string, string, string, string] }`
  - `copy.contact: { heading; body; links: readonly { label: string; href: string; external: boolean }[]; mono }`
  - `RESUME_HREF = '/resume.pdf'` (exported; the nav and contact both link it)

- [ ] **Step 1: Write the failing test `src/site/copy.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { copy, RESUME_HREF } from './copy';
import { facts } from '@/valley/facts';

/** Every string in copy, with each function called on sample arguments. */
function strings(o: unknown, out: string[] = []): string[] {
  if (typeof o === 'string') out.push(o);
  else if (typeof o === 'function') out.push(String((o as (...a: unknown[]) => string)(12, 812)));
  else if (o && typeof o === 'object') Object.values(o).forEach((v) => strings(v, out));
  return out;
}
const ALL = strings(copy).concat(copy.yours.clock('2.17'), copy.kalshi.counter(12_340));
const withoutUrls = (s: string) => s.replace(/(https?:\/\/|mailto:)\S+/g, '');

describe('copy rules (spec §2, §16)', () => {
  it('has no uppercase letters outside URLs', () => {
    for (const s of ALL) expect(withoutUrls(s), s).toBe(withoutUrls(s).toLowerCase());
  });
  it('never prints a private number', () => {
    for (const s of ALL) {
      expect(s, s).not.toMatch(/\$20/);
      expect(s, s).not.toMatch(/#\s?75/);
      expect(s, s).not.toMatch(/notional/i);
      expect(s, s).not.toMatch(/contracts/i);
    }
  });
  it('has no em dashes and no en dashes', () => {
    for (const s of ALL) expect(s, s).not.toMatch(/[—–]/);
  });
});

describe('copy is the spec §3.1 copy', () => {
  it('meta and nav', () => {
    expect(copy.meta.title).toBe('ethan wang');
    expect(copy.meta.description).toBe('now is the best time in history to build things. everything lit on this page is something i built that people used.');
    expect(copy.nav.home).toBe('ethan wang');
    expect([...copy.nav.items.map((i) => i.label), copy.nav.resume].join(` ${copy.nav.separator} `))
      .toBe('kalshi · heron · darch · summers · contact · resume');
    expect(copy.nav.items.map((i) => i.section)).toEqual(['kalshi', 'heron', 'darch', 'summers', 'contact']);
  });
  it('01 open', () => {
    expect(copy.open.headline).toBe('now is the best time in history to build things.');
    expect(copy.open.deck).toBe('everything lit here is something i built that people used.');
    expect(copy.open.scrollCue).toBe('scroll');
    expect(copy.open.labels).toEqual({
      hut: 'discord bots, middle school. my classmates used them.',
      nist: 'nist, summer 2025',
      mill: 'darch, june 2025 to may 2026',
      kalshiLamp: 'kalshi, since jan 2026',
      wvu: 'wvu medicine, summer 2026',
      bars: 'heron, since june 2026',
      hillside: 'things i built, one house each',
    });
    expect(Object.keys(copy.open.labels)).toEqual(['hut', 'nist', 'mill', 'kalshiLamp', 'wvu', 'bars', 'hillside']);
  });
  it('02 kalshi', () => {
    expect(copy.kalshi.heading).toBe('every light on that ridge is a trade my algorithm made.');
    expect(copy.kalshi.figures).toEqual(['about 30,000 trades', 'top 100 all-time, crypto']);
    expect(copy.kalshi.mono).toBe('jan 2026 → oct 2026 · as of oct 2026 · not live');
    expect(copy.kalshi.counter(30_000)).toBe('30,000 trades');
    expect(copy.kalshi.counter(12_340)).toBe('12,340 trades');
  });
  it('03 heron, 04 darch, 05 summers, 06 alive', () => {
    expect(copy.heron.heading).toBe('if the home team wins tonight, your drinks are free.');
    expect(copy.heron.mono).toBe('co-founder · since june 2026 · as of oct 2026');
    expect(copy.darch.heading).toBe('darch made three thousand videos a month. it ended in may 2026.');
    expect(copy.darch.figures).toEqual(['3,000 videos a month', '20 million views a month']);
    expect(copy.darch.mono).toBe('co-founder · june 2025 to may 2026');
    expect(copy.summers.heading).toBe('i spent two summers building things for other people.');
    expect(copy.summers.figures).toEqual(['about $100m of claims a year']);
    expect(copy.summers.mono).toBe('nist, summer 2025 · wvu medicine, summer 2026');
    expect(copy.alive.heading).toBe('a few sentences of plain language turn into thousands of lines of code now.');
    expect(copy.alive.body.endsWith('i never really liked the coding. i liked watching it run.')).toBe(true);
  });
  it('07 yours and the five hillside sentences (§3.2)', () => {
    expect(copy.yours.heading).toBe('type one sentence about something you\'d build.');
    expect(copy.yours.body).toBe('watch it turn into a house with the lights on. yours gets a light too.');
    expect(copy.yours.placeholder).toBe('something you\'d build');
    expect(copy.yours.button).toBe('build');
    expect(copy.yours.maxLength).toBe(140);
    expect(copy.yours.clock('2.17')).toBe('2.17 / 4.40');
    expect(copy.yours.tag(12, 812)).toBe('12 words in · 812 parts out · 4.40 s on the clock');
    expect(copy.yours.tag(24, 1933)).toBe('24 words in · 1,933 parts out · 4.40 s on the clock');
    expect(copy.yours.hint).toBe('it stays in this browser. nothing is sent anywhere.');
    expect(copy.yours.hillside).toEqual([
      'a discord bot for my middle school server',
      'a trading algorithm for kalshi',
      'a pipeline that made three thousand videos a month',
      'a help-desk assistant that reads the docs for you',
      'a pricing model for free-drinks promos at bars',
    ]);
  });
  it('08 contact', () => {
    expect(copy.contact.heading).toBe('it\'s late and i\'m probably up building something.');
    expect(copy.contact.body).toBe('the first light on this page is still the discord bot.');
    expect(copy.contact.links).toEqual([
      { label: 'email', href: 'mailto:ethan.wanq@gmail.com', external: false },
      { label: 'github', href: 'https://github.com/Not-Ethan', external: true },
      { label: 'linkedin', href: 'https://linkedin.com/in/edw173', external: true },
      { label: 'resume', href: '/resume.pdf', external: true },
    ]);
    expect(RESUME_HREF).toBe('/resume.pdf');
    expect(copy.contact.mono).toBe('ethan wang · cleveland · as of oct 2026');
  });
});

describe('figures agree with facts.ts', () => {
  it('prints the facts, not hand-typed numbers that drifted', () => {
    expect(copy.kalshi.figures[0]).toBe(`about ${facts.kalshi.trades.toLocaleString('en-US')} trades`);
    expect(copy.kalshi.figures[1]).toBe(`top ${facts.kalshi.leaderboardTop} all-time, crypto`);
    expect(copy.darch.figures[0]).toBe(`${facts.darch.videosPerMonth.toLocaleString('en-US')} videos a month`);
    expect(copy.darch.figures[1]).toBe(`${facts.darch.viewsPerMonth / 1_000_000} million views a month`);
    expect(copy.summers.figures[0]).toBe(`about $${facts.wvu.claimsPerYearUsd / 1_000_000}m of claims a year`);
    expect(facts.heron.cities).toBe(4);
    expect(copy.heron.body).toContain('four cities');
    expect(copy.kalshi.mono).toContain(`as of ${facts.kalshi.asOf}`);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/site/copy.test.ts`
Expected: FAIL, `Failed to resolve import "./copy"`.

- [ ] **Step 3: Write `src/site/copy.ts`** (every string verbatim from spec §3.1 and §3.2; do not edit a word)

```ts
// Every user-facing string on the site (spec §3.1, §3.2), in Ethan's voice: lowercase, full sentences, no italics,
// no title case, no em dashes. Agents do not improvise lines; change a string here only when the spec changes.
import type { SectionId } from '@/valley/types';

export const RESUME_HREF = '/resume.pdf';

/** The ignition labels, in chain order (spec §3.1 · 01). Keys name what each label sits near. */
export type IgnitionLabelKey = 'hut' | 'nist' | 'mill' | 'kalshiLamp' | 'wvu' | 'bars' | 'hillside';

const NAV_ITEMS: readonly { label: string; section: SectionId }[] = [
  { label: 'kalshi', section: 'kalshi' },
  { label: 'heron', section: 'heron' },
  { label: 'darch', section: 'darch' },
  { label: 'summers', section: 'summers' },
  { label: 'contact', section: 'contact' },
];

const LABELS: Record<IgnitionLabelKey, string> = {
  hut: 'discord bots, middle school. my classmates used them.',
  nist: 'nist, summer 2025',
  mill: 'darch, june 2025 to may 2026',
  kalshiLamp: 'kalshi, since jan 2026',
  wvu: 'wvu medicine, summer 2026',
  bars: 'heron, since june 2026',
  hillside: 'things i built, one house each',
};

const HILLSIDE = [
  'a discord bot for my middle school server',
  'a trading algorithm for kalshi',
  'a pipeline that made three thousand videos a month',
  'a help-desk assistant that reads the docs for you',
  'a pricing model for free-drinks promos at bars',
] as const;

const CONTACT_LINKS: readonly { label: string; href: string; external: boolean }[] = [
  { label: 'email', href: 'mailto:ethan.wanq@gmail.com', external: false },
  { label: 'github', href: 'https://github.com/Not-Ethan', external: true },
  { label: 'linkedin', href: 'https://linkedin.com/in/edw173', external: true },
  { label: 'resume', href: RESUME_HREF, external: true },
];

export const copy = {
  meta: {
    title: 'ethan wang',
    description: 'now is the best time in history to build things. everything lit on this page is something i built that people used.',
  },
  nav: {
    home: 'ethan wang',
    items: NAV_ITEMS,
    resume: 'resume',
    separator: '·',
  },
  open: {
    headline: 'now is the best time in history to build things.',
    deck: 'everything lit here is something i built that people used.',
    scrollCue: 'scroll',
    labels: LABELS,
  },
  kalshi: {
    heading: 'every light on that ridge is a trade my algorithm made.',
    body: 'about thirty thousand of them since january 2026. i built the whole thing: the feeds, the quoting, the risk checks, the replay stack i use to find out what went wrong. somewhere in there it climbed into the top 100 all-time on kalshi\'s crypto leaderboard.',
    figures: ['about 30,000 trades', 'top 100 all-time, crypto'],
    mono: 'jan 2026 → oct 2026 · as of oct 2026 · not live',
    /** The ridge counter (spec §3.1 · 02); n is already rounded and capped by the caller. */
    counter: (n: number) => `${n.toLocaleString('en-US')} trades`,
  },
  heron: {
    heading: 'if the home team wins tonight, your drinks are free.',
    body: 'the bar doesn\'t eat that. heron prices the promo, covers the payout, and hedges it on prediction markets. the lines from each bar run to the market. co-founded it this summer. we have bars signed in four cities.',
    mono: 'co-founder · since june 2026 · as of oct 2026',
  },
  darch: {
    heading: 'darch made three thousand videos a month. it ended in may 2026.',
    body: 'it ran on python, node and ffmpeg. what it made got about twenty million views a month. scroll back and it lights up again. that\'s the only thing on this page that does.',
    figures: ['3,000 videos a month', '20 million views a month'],
    mono: 'co-founder · june 2025 to may 2026',
  },
  summers: {
    heading: 'i spent two summers building things for other people.',
    body: 'at nist i built a help-desk assistant that searches the internal docs and answers from them. at wvu medicine i built a model over about a hundred million dollars a year of pharmacy claims. when denials spike, it notices.',
    figures: ['about $100m of claims a year'],
    mono: 'nist, summer 2025 · wvu medicine, summer 2026',
  },
  alive: {
    heading: 'a few sentences of plain language turn into thousands of lines of code now.',
    body: 'people kept making languages higher level so you could do more with less. this is the top of that. what used to take months takes an afternoon. the world doesn\'t need a master programmer who dreams in code. it needs people who\'ve seen so many ideas that they see opportunities everywhere. i never really liked the coding. i liked watching it run.',
  },
  yours: {
    heading: 'type one sentence about something you\'d build.',
    body: 'watch it turn into a house with the lights on. yours gets a light too.',
    placeholder: 'something you\'d build',
    button: 'build',
    maxLength: 140,
    /** The build clock (spec §3.1 · 07); t is already formatted 0.00. */
    clock: (t: string) => `${t} / 4.40`,
    /** The tag after the build; parts is the real parts.length of the house. */
    tag: (words: number, parts: number) => `${words} words in · ${parts.toLocaleString('en-US')} parts out · 4.40 s on the clock`,
    hint: 'it stays in this browser. nothing is sent anywhere.',
    hillside: HILLSIDE,
  },
  contact: {
    heading: 'it\'s late and i\'m probably up building something.',
    body: 'the first light on this page is still the discord bot.',
    links: CONTACT_LINKS,
    mono: 'ethan wang · cleveland · as of oct 2026',
  },
} as const;
```

- [ ] **Step 4: Run it and see it pass**

Run: `npx vitest run src/site/copy.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Page metadata from copy.** In `src/app/layout.tsx`, add below `import './globals.css';`:

```tsx
import type { Metadata } from 'next';
import { copy } from '@/site/copy';
```

and below the two `localFont` calls:

```tsx
export const metadata: Metadata = {
  title: copy.meta.title,
  description: copy.meta.description,
  metadataBase: new URL('https://ethanwang.ai'),
  openGraph: { title: copy.meta.title, description: copy.meta.description, url: 'https://ethanwang.ai', type: 'website' },
};
```

(`public/og.png` arrives with the still in Stage 5, which adds `images: ['/og.png']` here.)

- [ ] **Step 6: Run the checks**

Run: `npx tsc --noEmit && npm run lint && npx vitest run` → Expected: clean, all PASS.
Run: `npm run build && grep -o '<title>[^<]*</title>' out/index.html` → Expected: `<title>ethan wang</title>`.

- [ ] **Step 7: Commit**

```bash
git add src/site/copy.ts src/site/copy.test.ts src/app/layout.tsx
git commit -m "Add the site copy verbatim from the spec and the page metadata"
```

- [ ] **Step 8: Two copy questions, already settled (do not change the copy)**

1. The darch and summers mono lines carry no `as of oct 2026`. Settled: §2's label applies to lines that state a current figure (kalshi, heron, contact); the verbatim §3.1 strings stay as written.
2. The email `ethan.wanq@gmail.com` (with a `q`) is the address the live site on `main` already uses. It is correct; keep it.

**Verify:**
- `npx vitest run src/site/copy.test.ts` → 10 passed.
- Read `src/site/copy.ts` side by side with spec §3.1 and §3.2: every body string matches word for word (the tests pin headings, figures, mono lines, labels, links and sentences; the bodies are pinned by this read).
- `grep -n "—\|–" src/site/copy.ts` → empty.

---

### Task 0.6: Placeholder still and the DOM primitives: Figure, Reveal, Counter, Labels

Spec §7 (the still as the first paint, §10 for its file), §9 (`Reveal` implements `[data-reveal]`: translateY 100% → 0 plus opacity, 0.5 s power3.out, stagger 0.06, reversing on scroll-back; `Counter` is the ridge counter; `Figure` the oversized mono figures; no count-ups elsewhere), §11 (no-GL: "the ignition labels render as a static list under the deck").

**Files:**
- Create: `public/valley-still.jpg` (placeholder, generated; Stage 5's gate agent replaces it with the real still)
- Create: `src/site/Figure.tsx`
- Create: `src/site/Reveal.tsx`
- Create: `src/site/Counter.tsx`
- Create: `src/site/Labels.tsx`

**Interfaces:**
- Consumes: `copy` (Task 0.5), `facts` (Task 0.3), `useScroll(): { state; scrollTo(id: string): void; reducedMotion: boolean; tier: Tier }` from `@/scroll/ScrollProvider`; `animate`, `stagger` from `framer-motion` 12.
- Produces:
  - `Figure({ children }: { children: string }): JSX.Element` (a `.mono-figure` line marked `data-reveal`).
  - `Reveal({ children, className }: { children: ReactNode; className?: string }): JSX.Element` (a `div` that animates its `[data-reveal]` descendants in when it enters the viewport and back out when it leaves below on scroll-back).
  - `Counter(): JSX.Element` (a `p.mono[data-counter]` showing `copy.kalshi.counter(facts.kalshi.trades)`, i.e. `30,000 trades`; Stage 3 drives it from the ridge reveal).
  - `Labels(): JSX.Element` (the static `ul[data-labels]` of the seven ignition labels in chain order; Stage 2 adds the projected spans).
  - `/valley-still.jpg`, 1440 × 900 JPEG.

- [ ] **Step 1: Generate the placeholder still** (a 1440 × 900 vertical gradient from the night zenith `#05070F` to the night horizon `#101830`, PNG written with Node built-ins, converted to JPEG q82 with macOS `sips`; the generator is a temp file and is not committed)

```bash
cat > "$TMPDIR/still.mjs" <<'EOF'
// 1440x900 PNG, vertical gradient night zenith #05070F (top) to night horizon #101830 (bottom). Node built-ins only.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
const W = 1440, H = 900, top = [0x05, 0x07, 0x0f], bot = [0x10, 0x18, 0x30];
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) {
  const t = y / (H - 1), row = y * (W * 3 + 1);
  raw[row] = 0;
  const px = top.map((c, i) => Math.round(c + (bot[i] - c) * t));
  for (let x = 0; x < W; x++) raw.set(px, row + 1 + x * 3);
}
const table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
writeFileSync(process.argv[2], Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
]));
EOF
node "$TMPDIR/still.mjs" "$TMPDIR/valley-still.png"
sips -s format jpeg -s formatOptions 82 "$TMPDIR/valley-still.png" --out public/valley-still.jpg
sips -g pixelWidth -g pixelHeight -g format public/valley-still.jpg
```

Expected: `pixelWidth: 1440`, `pixelHeight: 900`, `format: jpeg`; the file is about 28 KB.

- [ ] **Step 2: Write `src/site/Figure.tsx`**

```tsx
/** An oversized mono evidence figure (spec §9: 48–72 px, tabular numerals). No count-up: it is printed as is. */
export function Figure({ children }: { children: string }) {
  return <p className="mono-figure" data-reveal>{children}</p>;
}
```

- [ ] **Step 3: Write `src/site/Reveal.tsx`**

```tsx
'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { animate, stagger } from 'framer-motion';
import { useScroll } from '@/scroll/ScrollProvider';

// power3.out as a cubic-bezier (spec §9 DOM motion).
const EASE = [0.215, 0.61, 0.355, 1] as const;
const HIDDEN = 'translateY(100%)';
const SHOWN = 'translateY(0%)';

/**
 * Triggered line reveals on [data-reveal] (spec §9): when the wrapper enters the viewport its lines rise 100% → 0
 * with opacity, 0.5 s power3.out, 0.06 s apart; when it leaves below the viewport (scroll-back) they reverse.
 * The server HTML is fully visible: lines are hidden only after hydration, and only if the wrapper starts below
 * the fold, so no-JS and no-WebGL visitors always see the whole page. Reduced motion: no reveal at all.
 * One IntersectionObserver per wrapper; no per-frame layout reads.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { reducedMotion } = useScroll();

  useEffect(() => {
    const root = ref.current;
    if (!root || reducedMotion) return;
    const lines = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (lines.length === 0) return;
    let shown = true;
    let first = true;
    const io = new IntersectionObserver(([entry]) => {
      const below = entry.boundingClientRect.top > 0;
      if (first) {
        first = false;
        if (!entry.isIntersecting && below) {
          for (const el of lines) { el.style.opacity = '0'; el.style.transform = HIDDEN; }
          shown = false;
        }
        return;
      }
      if (entry.isIntersecting && !shown) {
        shown = true;
        animate(lines, { opacity: [0, 1], transform: [HIDDEN, SHOWN] }, { duration: 0.5, ease: EASE, delay: stagger(0.06) });
      } else if (!entry.isIntersecting && shown && below) {
        shown = false;
        animate(lines, { opacity: [1, 0], transform: [SHOWN, HIDDEN] }, { duration: 0.5, ease: EASE, delay: stagger(0.06, { from: 'last' }) });
      }
    }, { threshold: 0.15 });
    io.observe(root);
    return () => {
      io.disconnect();
      for (const el of lines) { el.style.opacity = ''; el.style.transform = ''; }
    };
  }, [reducedMotion]);

  return <div ref={ref} className={className}>{children}</div>;
}
```

- [ ] **Step 4: Write `src/site/Counter.tsx`**

```tsx
import { copy } from '@/site/copy';
import { facts } from '@/valley/facts';

/**
 * The ridge counter (spec §3.1 · 02), under the ridge figure. Static at the full count for now, which is also what
 * the no-WebGL tier shows. Stage 3 writes the live value into this node from the driver (round(reveal × trades / 10)
 * × 10, capped at the fact) and adds the digit scramble.
 */
export function Counter() {
  return <p className="mono ink-dim mt-2" data-counter>{copy.kalshi.counter(facts.kalshi.trades)}</p>;
}
```

- [ ] **Step 5: Write `src/site/Labels.tsx`**

```tsx
import { copy } from '@/site/copy';

/**
 * The ignition labels (spec §3.1 · 01) as the static list the no-WebGL tier shows under the deck (spec §11), in chain
 * order. Stage 2 adds the projected label spans positioned from the driver; this list stays as the fallback.
 */
export function Labels() {
  return (
    <ul className="mono ink-dim mt-6 flex flex-col gap-1" data-labels>
      {Object.entries(copy.open.labels).map(([key, text]) => (
        <li key={key} data-label={key}>{text}</li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 6: Run the checks**

Run: `npx tsc --noEmit` → Expected: no output.
Run: `npm run lint` → Expected: no errors.
Run: `npx vitest run` → Expected: PASS (the palette literal scan now also covers these four files).

- [ ] **Step 7: Commit**

```bash
git add public/valley-still.jpg src/site/Figure.tsx src/site/Reveal.tsx src/site/Counter.tsx src/site/Labels.tsx
git commit -m "Add the placeholder still and the figure, reveal, counter and label primitives"
```

**Verify:**
- `sips -g pixelWidth -g pixelHeight -g format public/valley-still.jpg` → 1440, 900, jpeg.
- `grep -n "getBoundingClientRect\|useState\|gsap" src/site/Reveal.tsx` → empty (IntersectionObserver entries only, no React state).
- `grep -n "animate\b" src/site/Reveal.tsx` → `animate` imported from `framer-motion` only; no `motion.` components.
- `npx tsc --noEmit && npm run lint` → clean.

---

### Task 0.7: Nav and the eight sections with their copy

Spec §3 (eight `<section id>`s with minimum heights, copy in a fixed left column), §3.1 (what each section prints), §9 (layout: columns 1–5 of 12, max 34ch; fixed mono chrome: nav top-right, home mark top-left, scroll cue bottom-left in 01 only; no cards, panels, blur or borders), §11 (no-GL static label list under the deck).

**Files:**
- Create: `src/site/chrome/Nav.tsx`
- Create: `src/site/sections/Open.tsx`, `src/site/sections/Kalshi.tsx`, `src/site/sections/Heron.tsx`, `src/site/sections/Darch.tsx`, `src/site/sections/Summers.tsx`, `src/site/sections/Alive.tsx`, `src/site/sections/Yours.tsx`, `src/site/sections/Contact.tsx`

**Interfaces:**
- Consumes: `copy`, `RESUME_HREF` (Task 0.5); `SECTIONS` (Task 0.1); `Reveal`, `Figure`, `Counter`, `Labels` (Task 0.6); `useScroll().scrollTo(id: string)` from `@/scroll/ScrollProvider`; CSS classes from Task 0.4.
- Produces: `Nav()`, `Open()`, `Kalshi()`, `Heron()`, `Darch()`, `Summers()`, `Alive()`, `Yours()`, `Contact()`, each a component with no props. Each section renders `<section id={SectionId} className="section" style={{ minHeight: '<heightVh>vh' }}>`. DOM hooks later stages rely on: `#yours-input` (the input, `maxLength` 140), `#yours-form`, `[data-counter]`, `[data-labels]`, `a[data-contact="email"]` (Stage 3 flickers the hut on its hover/focus).

Phone nav (spec silent; simplest reading): below 768 px the four project links are hidden and the nav shows `contact · resume`, because the full line does not fit beside the home mark at 390 px.

- [ ] **Step 1: Write `src/site/chrome/Nav.tsx`**

```tsx
'use client';
import { copy, RESUME_HREF } from '@/site/copy';
import { useScroll } from '@/scroll/ScrollProvider';

/** Fixed mono chrome (spec §3.1 nav, §9): home mark top-left, `kalshi · heron · darch · summers · contact · resume` top-right. */
export function Nav() {
  const { scrollTo } = useScroll();
  const n = copy.nav;
  return (
    <header className="nav">
      <button type="button" className="mono link" onClick={() => scrollTo('open')}>{n.home}</button>
      <nav className="flex items-center gap-2">
        {n.items.map((it) => (
          <span key={it.section} className={it.section === 'contact' ? 'flex items-center gap-2' : 'hidden items-center gap-2 md:flex'}>
            <button type="button" className="mono link" onClick={() => scrollTo(it.section)}>{it.label}</button>
            <span className="mono ink-dim" aria-hidden="true">{n.separator}</span>
          </span>
        ))}
        <a className="mono link" href={RESUME_HREF} target="_blank" rel="noopener noreferrer">{n.resume}</a>
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: Write `src/site/sections/Open.tsx`**

```tsx
import { copy } from '@/site/copy';
import { SECTIONS } from '@/valley/sections';
import { Labels } from '@/site/Labels';

const HEIGHT_VH = SECTIONS.find((s) => s.id === 'open')?.heightVh ?? 100;

/** 01 · open (spec §3.1): the headline over the sky, the deck, the ignition labels as a static list, the scroll cue. */
export function Open() {
  const c = copy.open;
  return (
    <section id="open" className="section" style={{ minHeight: `${HEIGHT_VH}vh` }}>
      <div className="section-grid">
        <div className="open-col scrim">
          <h1 className="display">{c.headline}</h1>
          <p className="mono mt-6">{c.deck}</p>
          <Labels />
        </div>
      </div>
      <p className="mono ink-dim absolute bottom-6 left-4 md:left-12">{c.scrollCue}</p>
    </section>
  );
}
```

- [ ] **Step 3: Write `src/site/sections/Kalshi.tsx`**

```tsx
import { copy } from '@/site/copy';
import { SECTIONS } from '@/valley/sections';
import { Reveal } from '@/site/Reveal';
import { Figure } from '@/site/Figure';
import { Counter } from '@/site/Counter';

const HEIGHT_VH = SECTIONS.find((s) => s.id === 'kalshi')?.heightVh ?? 100;

/** 02 · kalshi (spec §3.1): heading, body, the two figures with the counter under the ridge figure, the mono line. */
export function Kalshi() {
  const c = copy.kalshi;
  return (
    <section id="kalshi" className="section" style={{ minHeight: `${HEIGHT_VH}vh` }}>
      <div className="section-grid">
        <Reveal className="copy-col scrim">
          <h2 className="h2" data-reveal>{c.heading}</h2>
          <p className="body mt-5" data-reveal>{c.body}</p>
          <div className="mt-6">
            <Figure>{c.figures[0]}</Figure>
            <Counter />
          </div>
          <div className="mt-4">
            <Figure>{c.figures[1]}</Figure>
          </div>
          <p className="mono ink-dim mt-4" data-reveal>{c.mono}</p>
        </Reveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Write `src/site/sections/Heron.tsx`**

```tsx
import { copy } from '@/site/copy';
import { SECTIONS } from '@/valley/sections';
import { Reveal } from '@/site/Reveal';

const HEIGHT_VH = SECTIONS.find((s) => s.id === 'heron')?.heightVh ?? 100;

/** 03 · heron (spec §3.1). */
export function Heron() {
  const c = copy.heron;
  return (
    <section id="heron" className="section" style={{ minHeight: `${HEIGHT_VH}vh` }}>
      <div className="section-grid">
        <Reveal className="copy-col scrim">
          <h2 className="h2" data-reveal>{c.heading}</h2>
          <p className="body mt-5" data-reveal>{c.body}</p>
          <p className="mono ink-dim mt-4" data-reveal>{c.mono}</p>
        </Reveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Write `src/site/sections/Darch.tsx`**

```tsx
import { copy } from '@/site/copy';
import { SECTIONS } from '@/valley/sections';
import { Reveal } from '@/site/Reveal';
import { Figure } from '@/site/Figure';

const HEIGHT_VH = SECTIONS.find((s) => s.id === 'darch')?.heightVh ?? 100;

/** 04 · darch (spec §3.1): past tense; the two figures. */
export function Darch() {
  const c = copy.darch;
  return (
    <section id="darch" className="section" style={{ minHeight: `${HEIGHT_VH}vh` }}>
      <div className="section-grid">
        <Reveal className="copy-col scrim">
          <h2 className="h2" data-reveal>{c.heading}</h2>
          <p className="body mt-5" data-reveal>{c.body}</p>
          <div className="mt-6 flex flex-col gap-4">
            {c.figures.map((f) => <Figure key={f}>{f}</Figure>)}
          </div>
          <p className="mono ink-dim mt-4" data-reveal>{c.mono}</p>
        </Reveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Write `src/site/sections/Summers.tsx`**

```tsx
import { copy } from '@/site/copy';
import { SECTIONS } from '@/valley/sections';
import { Reveal } from '@/site/Reveal';
import { Figure } from '@/site/Figure';

const HEIGHT_VH = SECTIONS.find((s) => s.id === 'summers')?.heightVh ?? 100;

/** 05 · summers (spec §3.1): nist and wvu medicine; one figure. */
export function Summers() {
  const c = copy.summers;
  return (
    <section id="summers" className="section" style={{ minHeight: `${HEIGHT_VH}vh` }}>
      <div className="section-grid">
        <Reveal className="copy-col scrim">
          <h2 className="h2" data-reveal>{c.heading}</h2>
          <p className="body mt-5" data-reveal>{c.body}</p>
          <div className="mt-6 flex flex-col gap-4">
            {c.figures.map((f) => <Figure key={f}>{f}</Figure>)}
          </div>
          <p className="mono ink-dim mt-4" data-reveal>{c.mono}</p>
        </Reveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Write `src/site/sections/Alive.tsx`**

```tsx
import { copy } from '@/site/copy';
import { SECTIONS } from '@/valley/sections';
import { Reveal } from '@/site/Reveal';

const HEIGHT_VH = SECTIONS.find((s) => s.id === 'alive')?.heightVh ?? 100;

/** 06 · alive (spec §3.1): the thesis. */
export function Alive() {
  const c = copy.alive;
  return (
    <section id="alive" className="section" style={{ minHeight: `${HEIGHT_VH}vh` }}>
      <div className="section-grid">
        <Reveal className="copy-col scrim">
          <h2 className="h2" data-reveal>{c.heading}</h2>
          <p className="body mt-5" data-reveal>{c.body}</p>
        </Reveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 8: Write `src/site/sections/Yours.tsx`** (a real input and button; submitting does nothing yet, Stage 4 wires the build)

```tsx
'use client';
import type { FormEvent } from 'react';
import { copy } from '@/site/copy';
import { SECTIONS } from '@/valley/sections';
import { Reveal } from '@/site/Reveal';

const HEIGHT_VH = SECTIONS.find((s) => s.id === 'yours')?.heightVh ?? 100;

/** 07 · yours (spec §3.1): one sentence, max 140 characters. Enter or `build` submits; Stage 4 builds the house. */
export function Yours() {
  const c = copy.yours;
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };
  return (
    <section id="yours" className="section" style={{ minHeight: `${HEIGHT_VH}vh` }}>
      <div className="section-grid">
        <Reveal className="copy-col scrim">
          <h2 className="h2" data-reveal>{c.heading}</h2>
          <p className="body mt-5" data-reveal>{c.body}</p>
          <form id="yours-form" className="mt-6 flex items-end gap-4" onSubmit={onSubmit}>
            <input
              id="yours-input"
              type="text"
              name="sentence"
              className="yours-input mono"
              maxLength={c.maxLength}
              placeholder={c.placeholder}
              aria-label={c.placeholder}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="mono link">{c.button}</button>
          </form>
          <p className="mono ink-dim mt-3">{c.hint}</p>
        </Reveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 9: Write `src/site/sections/Contact.tsx`**

```tsx
import { copy } from '@/site/copy';
import { SECTIONS } from '@/valley/sections';
import { Reveal } from '@/site/Reveal';

const HEIGHT_VH = SECTIONS.find((s) => s.id === 'contact')?.heightVh ?? 100;

/** 08 · contact (spec §3.1): the links in mono. Stage 3 flickers the hut on the email link's hover or focus. */
export function Contact() {
  const c = copy.contact;
  return (
    <section id="contact" className="section" style={{ minHeight: `${HEIGHT_VH}vh` }}>
      <div className="section-grid">
        <Reveal className="copy-col scrim">
          <h2 className="h2" data-reveal>{c.heading}</h2>
          <p className="body mt-5" data-reveal>{c.body}</p>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2" data-reveal>
            {c.links.map((l) => (
              <li key={l.label}>
                <a
                  className="mono link"
                  href={l.href}
                  data-contact={l.label}
                  {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mono ink-dim mt-4" data-reveal>{c.mono}</p>
        </Reveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 10: Run the checks**

Run: `npx tsc --noEmit` → Expected: no output.
Run: `npm run lint` → Expected: no errors.
Run: `npx vitest run` → Expected: PASS (the palette literal scan covers the new files).

- [ ] **Step 11: Commit**

```bash
git add src/site/chrome/Nav.tsx src/site/sections/Open.tsx src/site/sections/Kalshi.tsx src/site/sections/Heron.tsx src/site/sections/Darch.tsx src/site/sections/Summers.tsx src/site/sections/Alive.tsx src/site/sections/Yours.tsx src/site/sections/Contact.tsx
git commit -m "Add the nav and the eight sections with their copy"
```

**Verify:**
- `grep -rn "'[a-z][a-z ,.']\{12,\}'" src/site/sections src/site/chrome | grep -v noopener` → empty (no inline user-facing strings; every string comes from `copy`).
- `grep -rln "<em\|<i>\|italic" src/site` → empty.
- `grep -rn "backdrop\|shadow\|border" src/site --include=*.tsx` → empty.
- `npx tsc --noEmit && npm run lint` → clean.

---

### Task 0.8: Site, page and canvas wrapper; the Stage 0 gate

Spec §6 ("one fixed R3F `<Canvas>` behind the DOM (z 0; `main` at z 10). The canvas wrapper is `pointer-events: none`"), §7 (the DOM is server-rendered with every section's copy, the links and the input; behind it the committed still as a CSS background on the canvas wrapper), §9 (`Site.tsx` composes `chrome/Nav`, `sections/*` and `Labels`), §14 (gates require lint, tsc, vitest and build green), §16 (`npm run build` produces `out/` with no server features; no `fetch(`; no `app/api`).

**Files:**
- Create: `src/site/Site.tsx`
- Modify: `src/app/page.tsx` (replace the stub)
- Test: `src/site/exported.test.ts`

**Interfaces:**
- Consumes: `ScrollProvider` from `@/scroll/ScrollProvider`; `Nav` and the eight section components (Task 0.7); `copy` (Task 0.5); `facts` (Task 0.3); `SECTIONS` (Task 0.1).
- Produces: `Site(): JSX.Element`, mounting, inside `ScrollProvider`, the canvas wrapper `div.valley-canvas[data-valley]` (z 0, `pointer-events: none`, background `/valley-still.jpg`; Stage 2 mounts the R3F `<Canvas>` inside it), then `Nav`, then `<main className="relative z-10">` with the sections in `SECTIONS` order. The labels render inside `Open` (static list under the deck); Stage 2 adds the projected labels to `Site`.

- [ ] **Step 1: Write the failing gate test `src/site/exported.test.ts`** (it reads the static export; it runs only when `out/index.html` is newer than every file in `src/`, so a stale export never fails or falsely passes it)

```ts
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

/** The page's HTML with scripts removed, React's text separators dropped and entities decoded. */
function pageText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
    .replace(/<!-- -->/g, '')
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
    c.nav.home, ...c.nav.items.map((i) => i.label), c.nav.resume,
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
```

- [ ] **Step 2: Build and run it to see it fail**

Run: `npm run build && npx vitest run src/site/exported.test.ts`
Expected: FAIL (the stub page renders an empty `<main>`; `renders now is the best time in history to build things.` and the others fail, the section-order test fails).

- [ ] **Step 3: Write `src/site/Site.tsx`**

```tsx
'use client';
import { ScrollProvider } from '@/scroll/ScrollProvider';
import { Nav } from './chrome/Nav';
import { Open } from './sections/Open';
import { Kalshi } from './sections/Kalshi';
import { Heron } from './sections/Heron';
import { Darch } from './sections/Darch';
import { Summers } from './sections/Summers';
import { Alive } from './sections/Alive';
import { Yours } from './sections/Yours';
import { Contact } from './sections/Contact';

// The committed night still (spec §7, §10): the first paint and the no-WebGL picture.
const STILL = '/valley-still.jpg';

/**
 * The site (spec §6, §9): the fixed valley wrapper at z 0 with the still as its background (Stage 2 mounts the canvas
 * inside it), the fixed nav, and the eight sections in <main> at z 10. The DOM is complete on its own.
 */
export function Site() {
  return (
    <ScrollProvider>
      <div className="valley-canvas" data-valley aria-hidden="true" style={{ backgroundImage: `url(${STILL})` }} />
      <Nav />
      <main className="relative z-10">
        <Open />
        <Kalshi />
        <Heron />
        <Darch />
        <Summers />
        <Alive />
        <Yours />
        <Contact />
      </main>
    </ScrollProvider>
  );
}
```

- [ ] **Step 4: Replace `src/app/page.tsx`**

```tsx
import { Site } from '@/site/Site';

export default function Home() {
  return <Site />;
}
```

- [ ] **Step 5: Build and run the gate test to see it pass**

Run: `npm run build && npx vitest run src/site/exported.test.ts`
Expected: PASS, every `renders …` case plus the three structure tests, 0 skipped. (If it reports the suite as skipped, the export is older than a file in `src/`: rebuild.)

- [ ] **Step 6: Run the full gate checks**

Run: `npm run lint` → Expected: no errors.
Run: `npx tsc --noEmit` → Expected: no output.
Run: `npx vitest run` → Expected: all PASS, nothing skipped (run right after the build).
Run: `grep -rn "fetch(" src/; ls src/app/api 2>&1; grep -rln "process\.env" src/` → Expected: no `fetch(` and no `process.env` matches, and `No such file or directory` for `src/app/api`.
Run: `ls out/index.html out/valley-still.jpg out/resume.pdf` → Expected: all three exist.

- [ ] **Step 7: Look at it.** Run `npx serve out -l 3005` and open `http://localhost:3005` at 1440 × 900 and at 390 × 844 (Playwright or a browser). Expected: dark page over the gradient still; the headline, deck and seven labels at the top; scrolling shows each section's copy rise in once; the nav top-right (`contact · resume` only at 390 px); no horizontal scroll at 390 px; the input accepts typing, stops at 140 characters, and Enter does nothing. Save the two screenshots to `.playwright-mcp/gates/stage0-desktop.png` and `.playwright-mcp/gates/stage0-phone.png` (gitignored) for the gate judge.

- [ ] **Step 8: Commit**

```bash
git add src/site/Site.tsx src/app/page.tsx src/site/exported.test.ts
git commit -m "Compose the DOM-only site over the still; Stage 0 gate test on the export"
```

**Verify (the Stage 0 gate):**
- `npm run build && npx vitest run src/site/exported.test.ts` → all passed, 0 skipped.
- `npm run lint && npx tsc --noEmit && npx vitest run` → green.
- `test -d out && test ! -d src/app/api && ! grep -rq "fetch(" src/ && echo ok` → `ok`.
- The two screenshots under `.playwright-mcp/gates/` show every section's copy in the left column over the dark still, nav top-right, home mark top-left, scroll cue bottom-left in 01, no panels, borders or blur.
