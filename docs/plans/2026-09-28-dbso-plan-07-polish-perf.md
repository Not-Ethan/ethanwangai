# Stage 6 — Polish and performance: plates on feet, reveals, chrome, dead-scroll audit, step-down ladder, review

> Part of `2026-09-28-dbso-plan-00-index.md`. Read the index's Global Constraints and spec §9 (plates, DOM motion), §11 (step-down), §12, §14 (G5), §16. Consumes everything before it. Gate **G5**: draw calls ≤ 15 at rest, frame time within budget on the dev machine, the step-down ladder verified by forcing it, lint/typecheck/tests/build clean, and a whole-branch review.

Order: 6.1, 6.2, 6.3 **[parallel-safe]**; 6.4; 6.5; 6.6; 6.7.

---

### Task 6.1: Plates pinned to projected feet **[parallel-safe]**

**Files:** modify `src/gl/Clocks.tsx`, `src/site/chrome/hudSync.ts`, `src/site/Plate.tsx`, `src/app/globals.css`

- [ ] **Step 1:** Clocks projects each `result.machines[m].foot` through the camera every frame into `hud.feet[m] = { x: cssPx, y: cssPx, visible: boolean (inside the viewport and in front of the camera), inked: compile[m] > 0.6 }`. hudSync, when the GL tier is up (`hud.gl === true`), sets each `[data-plate=m]` element to `position: fixed; left: 0; top: 0; transform: translate(x, y)` with `will-change: transform`, class `.is-inked` when inked (ink color) else pencil, and `visibility` from `visible`; in the no-GL tier plates stay in flow. Plates must never overlap the copy column: if `x < copyColumnRight + 16` (measured once from `.copy-col`), push the plate to `copyColumnRight + 16`.
- [ ] **Step 2: Verify:** at every section the plate sits at the foot of its machine, reads pencil until the machine inks, and never covers copy. **Commit:** `git add -A && git commit -m "Pin figure plates to projected machine feet"`

---

### Task 6.2: Reveals, section strip, nav highlight, replay offer, proven deck line **[parallel-safe]**

**Files:** modify `src/site/chrome/hudSync.ts`, `src/site/chrome/Nav.tsx`, `src/site/chrome/SectionStrip.tsx`, `src/site/sections/Sentence.tsx`, `src/gl/Clocks.tsx`

- [ ] **Step 1:** hudSync toggles `.is-in` on `[data-reveal]` when the element's section `u ≥ headingAt` (from `SECTIONS`) and removes it when scrolled back above; sets `.is-current` on the `[data-strip]` and nav item for `hud.section`; the headline click handler and `#rebuild` are already wired. Replay offer: when the user returns to the top after ≥ 60 s away from section 0 (`hud.section !== 0` timer), show a mono `<button id="replay">` next to the plate reading `rebuild`; never auto-replay. Proven deck line: Clocks keeps a 5 s rolling average of frame time; if it stays under 17 ms for 5 s on the desktop tier, hudSync appends `copy.sentence.deckProven` to `#deck` once (spec §3.1).
- [ ] **Step 2: Verify** with stills at three sections and after a return-to-top with the timer forced (`?replayAfter=1`). **Commit:** `git add -A && git commit -m "Add reveals, section highlight, replay offer and the proven deck line"`

---

### Task 6.3: Glyph atlas behind `uGlyph` **[parallel-safe]**

**Files:** `src/gl/glyphAtlas.ts`, modify `src/gl/shaders/ink.frag.ts`, `src/gl/Ink.tsx`

- [ ] **Step 1:** `createGlyphAtlas(): THREE.CanvasTexture` — 512 × 256 canvas, 16 × 4 cells of JetBrains Mono glyphs (`0123456789abcdef{}()[]=;:<>+-*/.,_ |` and letters to fill 64), drawn in white on transparent. The fragment, when `vGlyph > 0.5`, samples the cell chosen by `hash(aSeed)` through `gl_PointCoord` and multiplies alpha. `uGlyph` defaults to 0; `?glyph=1` enables it for the comparison still.
- [ ] **Step 2: Verify:** `/?freeze=0.6&glyph=1` vs `/?freeze=0.6`; the orchestrator decides whether the atlas ships on by default. Either way `uGlyph` stays a runtime switch. **Commit:** `git add -A && git commit -m "Add the optional glyph atlas for the rows band"`

---

### Task 6.4: Dead-scroll audit

**Files:** `src/bench/deadScroll.test.ts`

- [ ] **Step 1: Test:** sample `g` from 0 to 1 in steps of 0.002 over the desktop ranges; for each window of 15 samples (0.03 in g) compute the total change in camera position + lookAt (Euclidean), `merge`, `burst`, and every `compileTarget`; assert every window outside `g ∈ [0, 0.03]` has a nonzero change of at least 0.02 units or 0.01 in a scene scalar. Where it fails, add a camera drift to the key table (a 0.3-unit slow push-in over the dwell) rather than weakening the test.
- [ ] **Step 2: Commit** — `git add -A && git commit -m "Add the dead-scroll audit and fix flat stretches"`

---

### Task 6.5: Step-down ladder and performance instrumentation

**Files:** modify `src/gl/useTier.ts`, `src/gl/Scene.tsx`, `src/gl/Clocks.tsx`, `src/gl/hud.ts`

- [ ] **Step 1:** Clocks records `hud.frameMs` (EMA of `performance.now` deltas) and `hud.calls = gl.info.render.calls`. drei `PerformanceMonitor` with `bounds` such that `onDecline` fires when fps < 50 for 60 frames; each decline applies the next rung: DPR 1.5 → 1.25 → 1; shadow map PCFSoft → PCF → 1024 → off (contact only); `uGlyph = 0`; ink count halves (draw range); `uLines = 0`. `?step=<n>` forces rung n for testing. `?perf=1` shows a fixed mono overlay `#perf` with `frameMs`, `calls`, `dpr`, `rung`.
- [ ] **Step 2: Verify:** `/?perf=1&built=1` at rest reports `calls ≤ 15` (6 instanced + 6 shadow + ink + ground + lines only during compiles); `/?step=3` shows no shadows and still reads well. Record `frameMs` at the hero, kalshi and poster in the commit message. **Commit:** `git add -A && git commit -m "Add the performance step-down ladder and perf overlay"`

---

### Task 6.6: Lint, typecheck, tests, build, emit check

- [ ] **Step 1:** `npm run lint && npx tsc --noEmit && npx vitest run && npm run check:emit && npm run build` all clean. Fix anything that fails.
- [ ] **Step 2:** grep gate: `grep -rn "\$20\|#75\|notional" src/ docs/plans/2026-09-28-drawn-built-switched-on-design.md` returns only the spec's own prohibition line. `grep -rn "fraunces\|schibsted\|postprocessing\|react-icons\|gsap" src/ package.json` returns nothing.
- [ ] **Step 3: Commit** — `git add -A && git commit -m "Green build: lint, types, tests, emit, next build"`

---

### Task 6.7: Whole-branch review and merge

- [ ] **Step 1:** The orchestrator runs a review workflow over the branch diff (spec conformance, correctness, performance rules from §12, copy rules) and fixes confirmed findings.
- [ ] **Step 2:** Final gate stills: hero (T0 + 3 s) light and dark, kalshi, poster, yours-built, phone hero, `?nogl=1`, reduced motion. Save to `.playwright-mcp/gates/final-*.png`.
- [ ] **Step 3:** `git checkout main && git merge --no-ff redesign/drawn-built-switched-on -m "Ship Drawn, Built, Switched On"` only after the orchestrator confirms every gate.

---

### Task 6.0: Phone hero on the production build, and the no-WebGL clock (added after judging G6) **[parallel-safe with 6.4]**

G6 verdict: desktop, reduced motion and the no-WebGL tier read as a complete site; the phone tier does on the dev server (`.playwright-mcp/gates/g6-phone-hero.png`: the macro shows the bot, lever, carriages, cells ≈ 17 px). On the **production build** (`next build && next start`) the phone hero shows the pencil SVG plate instead of the GL machine while the ladder still ticks (`g6-final-phone-hero.png`): the canvas is not covering the SVG. Also, the no-WebGL ladder prints `running --:--:--`, which reads as broken.

**Files:** `src/gl/Scene.tsx`, `src/fallback/StaticPlates.tsx` / `staticPlates.css`, `src/site/chrome/hudSync.ts`, `src/site/chrome/Ladder.tsx`, `src/site/sections/Alive.tsx` (only as needed)

- [ ] **Step 1: Reproduce on production.** `npm run build && npx next start -p 3111`; Playwright at 390 × 844 (which makes `detectTier()` phone), load `/`, wait to T0 + 4 s, screenshot. Confirm whether the canvas is present (`document.querySelector('canvas')`), its wrapper's computed opacity, its z-index relative to the StaticPlates layer, and whether `window.__dbso.t0` was set. Compare with the dev server at the same size. Find the cause (candidates: the cross-fade never completes on the phone tier in prod so the wrapper stays at opacity 0; the portrait plate's layer ordering differs in the production CSS bundle; the canvas renders transparent). Fix it at the cause; do not paper over with a timeout.
- [ ] **Step 2: No-WebGL clock.** When `hud.gl` is false (no scene ever drove the clock), hide the ladder's `running` item and section 08's uptime line instead of printing `--:--:--`; the SSR markup keeps the final counts (40 lines, the quoter+intake parts, the footer total). The GL tier is unchanged.
- [ ] **Step 3: Stills** on the production server: `g6b-phone-hero.png` (390 × 844, T0 + 4 s), `g6b-phone-hero-375.png` (375 × 667), `g6b-nogl-hero-dark.png` (`?nogl=1` after toggling to dark), `g6b-nogl-alive.png`. Zero console errors. Stop the server.
- [ ] **Step 4: Verify** `npx vitest run` green, tsc clean, lint clean, `npm run build` clean. **Commit:** `git add -A && git commit -m "Fix the phone hero on the production build; hide the clock in the no-WebGL tier"`
