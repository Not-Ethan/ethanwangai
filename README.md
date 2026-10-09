# ethanwang.ai

one river valley at blue hour. the only light in it comes from things i built. next.js static export and react three fiber.

- `npm run dev`: local dev on :3000
- `npm run build`: static export to `out/`; serve it with `npx serve out -l 3005`
- `npm run lint`, `npm run typecheck`, `npm test`: eslint, tsc, vitest
- numbers live in `src/valley/facts.ts` (hand-edited, as of oct 2026); every string lives in `src/site/copy.ts`
- query flags: `?nogl=1` the no-webgl tier · `?tier=phone|desktop` force the gl tier · `?rung=n` start n rungs down the step-down ladder · `?still=1` and `?g=0..1` the still capture · `?debug=1` the perf overlay and `window.__ortgPerf`
- `public/valley-still.jpg` and `public/og.png` are committed screenshots of the exported build; regenerate them when the scene changes (task 5.11 in `docs/plans/2026-10-08-ortg-plan-06-tiers-polish.md`)
- no api routes, no fetches, no env vars, no analytics
- spec: `docs/plans/2026-10-08-only-running-things-glow-design.md`
