# Drawn, Built, Switched On — Implementation Plan (index)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the forest-walk site with the approved concept: one sentence becoming machines on paper, with a paper and a drafting theme, Lenis smooth scroll, and a visitor input that builds a machine.

**Architecture:** A pure-TypeScript `src/bench/` package defines every machine, count, camera pose and section, and runs in both Node (build-time SVG/og emitter) and the browser. A single React Three Fiber canvas renders six instanced kits through one patched material whose vertex shader owns all motion, plus one stateless points draw for ink. The DOM above it is server-rendered copy in Ethan's voice; Lenis writes scroll and velocity into refs that one `useFrame` driver turns into uniforms. React never re-renders on scroll.

**Tech Stack:** Next.js 16 (App Router), React 19, three r185, @react-three/fiber 9, @react-three/drei 10, lenis 1.3, framer-motion 12 (for `animate` only), Tailwind 4, vitest (new), tsx (new), @resvg/resvg-js (new), Archivo + JetBrains Mono variable via `next/font/local`.

**Spec:** `docs/plans/2026-09-28-drawn-built-switched-on-design.md` (read it first; every task argues from it).

## Global Constraints

- Public numbers only, verbatim from spec §2: Kalshi `30,000 live trades`, `2M contracts traded`, `top 100 all-time crypto profit leaderboard`, `live on kalshi since jan 2026`. Never `$20K`, never `#75`, never `$2M notional`. Darch `3,000`, `20 million`, `85% margins`, past tense. Heron `four cities`. WVU `about $100m`. Every figure labelled `as of sept 2026`.
- Every user-facing string lives in `src/site/copy.ts` or `src/site/facts.ts`; every printed count comes from `src/generated/counts.ts` or is read live from the scene. No hand-typed totals.
- Copy is lowercase, blunt, full sentences, no italics, no title case, no em dashes; it must read as something Ethan would text.
- Two themes from `src/theme/palettes.ts`; no other color literal anywhere in `src/` except that file and `globals.css` token declarations.
- No GSAP, no @react-three/postprocessing, no FBO/GPGPU, no per-frame `instanceMatrix.needsUpdate`, no React state on the scroll path, no per-frame `getBoundingClientRect`, no `backdrop-filter`/`box-shadow` over the canvas.
- `src/bench/**` imports nothing from React, three's renderer, or the DOM (three's math classes are allowed).
- Kind ids, machine ids, primitive ids, attribute names and uniform names are exactly those in `src/bench/types.ts` and `src/gl/material/uniforms.ts` (Stage 1 and 2). Later tasks copy them, never rename.
- Commit after every task on branch `redesign/drawn-built-switched-on`; never commit to `main`.
- Node 25, npm 11. Run `npm run lint`, `npx tsc --noEmit`, `npx vitest run` before every commit that touches `src/`.

## Review Focus

Inputs the spec implies but no gate screenshot exercises, most likely to bite first. Each has a test pinned in the owning task.

1. **Viewport resize mid-visit** (rotate a phone, drag a window): ink must re-register to the headline and section `g` ranges must recompute; expected: no ink spawning off the text, no section jump. Pinned in Stage 3 Task 3.4 (rects) and Stage 0 Task 0.5 (ScrollProvider remeasure).
2. **A visitor sentence with 0 words, 40 words, or only punctuation**: the visitor layout must clamp to caps and never produce NaN scales or an empty geometry; expected: one bar minimum, 24 max, plate text correct. Pinned in Stage 1 Task 1.8.
3. **Scrolling up through a scrubbed compile faster than 250 ms**: `run` must damp to 0 (decelerate) and the machine must un-ink in reverse; expected: no frozen mid-state, no negative machine time. Pinned in Stage 2 Task 2.7 (clocks logic).
4. **Theme toggled while the hero compile is mid-flight**: palette uniforms lerp over 300 ms and the SVG under the canvas flips at once; expected: no flash of the wrong paper, no ink color mismatch. Pinned in Stage 0 Task 0.4 (theme) and Stage 2 Task 2.3 (uniform palette lerp).
5. **WebGL context loss after T0** (GPU reset, tab restore): the error path must show the SVG tier with plates, not a blank canvas over the DOM; expected: the DOM stays complete. Pinned in Stage 6 Task 6.4.

## Stages

Each stage is its own file and ends with a gate from spec §14. Do not start a stage until the previous stage's gate is judged.

| stage | file | delivers | gate |
|---|---|---|---|
| 0 | `2026-09-28-dbso-plan-01-reset.md` | repo reset, deps, fonts, themes, Lenis provider, DOM-only site with all copy | renders both themes, no 3D |
| 1 | `2026-09-28-dbso-plan-02-bench.md` | `src/bench/` pure package with tests: types, layout, all configs, bench, sections, camera, timing, OU, counts, visitor layout, svg plate | vitest green |
| 2 | `2026-09-28-dbso-plan-03-gl-core.md` | Scene, Kits, patched material, kinds, depth, lights, ground, camera rig, clocks driver, tier | G1 quoter still |
| 3 | `2026-09-28-dbso-plan-04-ink-intro.md` | Ink, text sampler, rects, curl, warm-up and cross-fade, hero compile, lever switch-on, ladder | G2 ink and intro |
| 4 | `2026-09-28-dbso-plan-05-sections.md` | merge, bot macro, intake, live bed + hover, balance, splitter, watch, pull-back, visitor input | G3 bed, G4 poster |
| 5 | `2026-09-28-dbso-plan-06-emit-tiers.md` | emitter (hero SVG, ink plates, counts, poses, og), no-GL tier, reduced motion, phone tier | G6 tiers |
| 6 | `2026-09-28-dbso-plan-07-polish-perf.md` | plates pinned to feet, reveals, section strip, dead-scroll audit, step-down ladder, lint/build, branch review | G5 performance |

## Execution notes for the orchestrator

- Stages 0 and 1 are independent of each other and can run in parallel (Stage 1 is pure TS with tests; Stage 0 is DOM). Stage 2 depends on both.
- Within a stage, tasks marked **[parallel-safe]** touch disjoint files and can be assigned to separate agents at once; the rest run in order.
- Every task's "Verify" block is what a reviewer checks. A reviewer that cannot run the verify block rejects the task.
- Gate stills are taken with Playwright at 1440 × 900 and saved under `.playwright-mcp/gates/` (gitignored). The orchestrator judges them; agents do not self-pass a gate.
