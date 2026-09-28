# Stage 4 — Sections in the world: merge, bot, intake and live bed, balance, splitter, watch, poster, visitor input

> Part of `2026-09-28-dbso-plan-00-index.md`. Read the index's Global Constraints and spec §3.1 (02–09), §6 (hover), §8 (input). Consumes Stage 1–3 (`sceneState` fields `merge/lean/burst/active/trickle/rung/click`, the ink partitions, `hud`, the visitor layout, `VISITOR_RESERVE_BY_PRIMITIVE`, `kitRefs`). Gates **G3** (bed reading) and **G4** (poster).

Most of the scene behaviour already exists by construction (the shader kinds read `uMerge`, `uCompile`, `uTilt`, machine time). This stage wires the DOM sources, adds hover, the visitor build, and verifies each section against the spec with stills. Order: 4.1 → 4.2 → 4.3; 4.4 and 4.5 **[parallel-safe]**; 4.6; 4.7.

---

### Task 4.1: Section 02 — merge clicks, rungs and the burst ink

**Files:** modify `src/site/sections/More.tsx`, `src/gl/Clocks.tsx`, `src/site/chrome/hudSync.ts`

- [ ] **Step 1:** In `More.tsx`, give the third line (`copy.more.lines[2]`, the one about thousands of lines) `data-ink-source="more"`; each line `<p data-reveal data-click={i}>`; rungs `<ol id="rungs"><li data-rung={i}>`. Reveals in this section are keyed to `hud.click` (hudSync toggles `.is-in` on `[data-click]` with `i ≤ hud.click`) and rungs to `hud.rung` (`.is-lit` on `[data-rung]` with `i ≤ hud.rung`). Add to `globals.css`:

```css
[data-reveal] { opacity: 0; transform: translateY(0.6em); transition: opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1), transform 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
[data-reveal].is-in { opacity: 1; transform: none; }
[data-rung] { color: var(--pencil); transition: color 0.2s; }
[data-rung].is-lit { color: var(--ink); }
[data-rung].is-lit:last-child, [data-rung].is-current { color: var(--hot); }
@media (prefers-reduced-motion: reduce) { [data-reveal] { transition-duration: 0.2s; transform: none; } }
```

- [ ] **Step 2:** Clocks writes `uMerge = state.merge`, `uLean = state.lean`, `uBurst = state.burst`, `hud.rung`, `hud.click` every frame (already partially in Stage 2; complete it).
- [ ] **Step 3: Verify:** scroll through `#more` with `?built=1`: six distinct merge steps land (columns pair up, then quads, up to one wide market with the caps following); hold; burst back with a lean and ink from the third line onto the columns; scrolling up reverses identically. Take `.playwright-mcp/gates/s02-merge3.png` (u ≈ 0.375) and `s02-burst.png` (u ≈ 0.9). **Commit:** `git add -A && git commit -m "Wire section 02: merge clicks, rungs, burst ink"`

---

### Task 4.2: Section 03 — the bot macro and the trickle source

**Files:** modify `src/site/sections/First.tsx`, `src/gl/Ink.tsx`

- [ ] **Step 1:** The first line of `First.tsx` gets `data-ink-source="first"`; `Ink.tsx` maps the trickle's `uActiveRect` to a spare rect slot (index 7) that tracks this element while section 03 is active. Verify the bot pings on its 1.6 s cadence with a hot flash, the macro pose has one instrument in frame, and the pull-back lands with both machines in frame. Still: `s03-macro.png`, `s03-pullback.png`. **Commit:** `git add -A && git commit -m "Wire section 03: bot macro and trickle source"`

---

### Task 4.3: Section 04 — intake compile, live bed, hover readout

**Files:** `src/gl/Hover.tsx`, `src/site/Readout.tsx`, modify `src/gl/Scene.tsx`, `src/site/Site.tsx`

**Interfaces:**
- `<Hover result uniforms ouData tier />` — desktop only. An invisible `planeGeometry` (12 × 8) at the quoter bed height (y = 0.2) positioned at the quoter's placement; R3F `onPointerMove` gives the bench-space point; `col = floor((x − bedMinX) / pitch)` clamped to `[0, cols − 1]`, `row = floor((z − bedMinZ) / pitch)`; sets `uHover = (0, col)` and writes `hud.hover = { machine: 0, col, x: clientX, y: clientY, mid, bid, ask, fills }` where `mid/bid/ask` come from the CPU OU array at `step = floor(mt[quoter] · 8) mod 2048` for market `col`, and `fills` is the count of fill flags in the last 64 steps. `onPointerLeave` sets `uHover = (−1, −1)`. Because the Canvas wrapper has `pointer-events: none`, this plane's events come from a `pointermove` listener on `window` that the component raycasts manually (`raycaster.setFromCamera(ndc, camera)` against the plane mesh) inside its own `useFrame` when the section is `kalshi`, `more` or `alive`; no React state.
- `<Readout />` — a `position: fixed` mono element `#readout` that hudSync positions at `hud.hover.x + 14, hud.hover.y + 14` and fills with `market 23 · bid 21 · ask 26 · fills 3` (labels from `copy.kalshi.readout`); hidden when `machine === −1`. On phones, tap on the bed does the same for 2 s.

- [ ] **Step 1: Implement.** `Kalshi.tsx` already has the plates and figures from Stage 0.
- [ ] **Step 2: Verify:** scrolling through `#kalshi`: the dolly runs along the bed; the intake (hopper and chute) compiles from the heading under the finger with leader lines, sits still, its lever drops and tiles run the chute; the ladder ticks up to the full quoter+intake count; hovering a column lifts it and shows the readout. Stills: `g3-kalshi-dwell-light.png`, `g3-kalshi-dwell-dark.png`, `g3-kalshi-intake-mid.png` (u ≈ 0.3), `g3-hover.png`.
- [ ] **Step 3: Gate G3 judged by the orchestrator:** the bed reads as a relief with frame, carriages and caps in frame and cannot be read as a chart. **Commit:** `git add -A && git commit -m "Wire section 04: intake compile, live bed, hover readout"`

---

### Task 4.4: Sections 05–07 — balance, splitter, watch **[parallel-safe]**

**Files:** modify `src/site/sections/Heron.tsx`, `Darch.tsx`, `Summers.tsx` (only if the `data-ink-source` attributes are missing), `src/gl/Clocks.tsx` (`uTilt`, `uBalancePivot`)

- [ ] **Step 1:** Confirm `uTilt = state.tilt` and `uBalancePivot = [balance.origin.x, 0.9, balance.origin.z]` are written each frame; confirm `uSlotPeriod` defaults to 3.0.
- [ ] **Step 2: Verify each section** down and back up: the machine's pencil outline is on the bench from load; ink lifts from the h2 through an eight-row band; parts slide home with hard stops; the machine assembles still; its lever drops at the end of the build window and it switches on with an impulse; scrolling up past the lever un-inks it in reverse with the ink retracing; the balance tips left as liability tiles land, re-levels as hedge tiles land, and clears at the whistle with a hot sweep; the splitter turns one tile into twelve and lane speed rises when scrolling fast; the watch field shows a calm baseline with rare spikes and a hot ring when the scan passes. Stills: `s05-still.png` (u ≈ 0.44), `s05-tipped.png`, `s06-split.png`, `s07-scan.png`, and one `s05-reverse.png` taken after scrolling down past the lever and back up to u ≈ 0.3.
- [ ] **Step 3: Commit** — `git add -A && git commit -m "Verify sections 05-07 and fix tilt pivot wiring"`

---

### Task 4.5: Section 08 — the poster **[parallel-safe]**

- [ ] **Step 1:** Confirm `uTrickle = 0` in `alive`; the pull-back runs over 0–60% with power2.inOut; nothing in the DOM moves except the uptime. Stills: `g4-poster-light.png`, `g4-poster-dark.png` at u ≈ 0.8.
- [ ] **Step 2: Gate G4 judged by the orchestrator:** small machines large in the foreground, quoter as the wall behind, all running, reads as a product photograph of a family of instruments. Re-author the section-7 keys in `camera.ts` if not. **Commit** any key changes: `git commit -am "Tune the poster pose"`.

---

### Task 4.6: Section 09 — the visitor input builds a machine

**Files:** `src/gl/visitor.ts`, `src/gl/visitor.test.ts`, modify `src/site/sections/Yours.tsx`, `src/gl/Clocks.tsx`, `src/gl/Ink.tsx`

**Interfaces:**

```ts
// visitor.ts
export interface VisitorUpload { matrices: Record<PrimitiveId, Float32Array>; meta: ...; param: ...; explode: ...; count: number; words: number; sentences: number }
export function planVisitor(text: string, tier: Tier): { result: LayoutResult; words: number; sentences: number } | null   // null when empty
export function uploadVisitor(plan: NonNullable<ReturnType<typeof planVisitor>>): void
//   writes the visitor parts into each kit's reserve slots (first VISITOR_RESERVE_BY_PRIMITIVE[p] instances after the base count), zero-scales unused reserve slots,
//   sets instanceMatrix.needsUpdate and each attribute's needsUpdate = true once; updates uCentroid[6] and the visitor ink partition's targets (aTarget/aTargetBirth) with needsUpdate once.
export function clearVisitor(): void   // zero-scales the reserve
```

Clocks: `visitorTween = createTween(TIMING.visitorCompileS)`; on `dbso:visitor:build` event with `{ text }`: if a visitor is already built, run a teardown tween (`createTween(TIMING.visitorTeardownS).start(now, 1, 0)`), then on completion `uploadVisitor(plan)` and start the build tween 0 → 1; `visitorCompile` feeds `stepClocks`. On `dbso:visitor:clear`: teardown then `clearVisitor()`. `uSlotPeriod`: on `dbso:visitor:key` set `slotPeriod = 0.4 + 2.6·exp(−0.3·keystrokes)` and relax toward 3.0 with τ 10 s.

`Yours.tsx`: `<form id="yours-form" onSubmit>`: prevent default; `text = input.value.trim()`; if empty, dispatch clear; else write `#yours-echo` (a visually-hidden-but-rendered `<span aria-hidden>` with the same font as the input, positioned inside the copy column so the sampler can see it), dispatch `dbso:visitor:build`, set `#yours-plate` to `copy.yours.plate(words, sentences, parts)`, set `#mailto` href to `mailto:${email}?subject=${encodeURIComponent(copy.yours.mailSubject(text))}`; on phones (`tier === 'phone'`) `input.blur()` and `scrollTo('yours')`. `onInput`: dispatch `dbso:visitor:key`. `Escape` key on the input: clear. The text is never inserted as HTML: `textContent` only.

- [ ] **Step 1: Failing test** for `planVisitor` (Review Focus #2): `''` → null; `'   '` → null; a 40-word string → `words 23 or 24` (per the reserve rule) and `result.counts.total ≤ 30`; `'...'` → 1 word, 1 sentence; matrices are finite and the visitor parts sit inside the slot's bounds (`PLACEMENT[7].origin` ± 1.2).
- [ ] **Step 2: Implement.** Reserve slots: `kitRefs[p].count` stays `base + reserve`; write `matrices[i]` via `mesh.setMatrixAt(base + i, m)`; attributes via `attr.array.set(...)` then `attr.needsUpdate = true` (the only upload after load).
- [ ] **Step 3: Verify:** type `build a thing that runs. then another.` and press Enter: a pencil drawing of 7 bars on 2 rails with a motor and lever appears in the slot in 200 ms, ink lifts off the typed words (from the echo span), parts lock over 1.4 s, the lever drops and it pings; the plate reads `fig. 5 — yours. 7 words, 2 sentences. 12 parts.` (count from the layout), the mailto subject is prefilled; Enter again tears down and rebuilds; Escape clears. Stills: `s09-built.png`. **Commit:** `git add -A && git commit -m "Add the visitor input that builds a machine from a sentence"`

---

### Task 4.7: Full-page pass

- [ ] **Step 1:** Playwright: scroll from top to bottom in 40 steps and back up, 1440 × 900, both themes; console errors must be zero; save `.playwright-mcp/gates/s-all-<i>.png` for i in the stations listed in this stage. Confirm the ladder's final parts count equals `counts.inkedAtEnd` (desktop) after everything is built and the footer total matches.
- [ ] **Step 2:** `npm run lint && npx tsc --noEmit && npx vitest run` clean. **Commit** any fixes.
