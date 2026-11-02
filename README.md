# ethanwang.ai

a one-page portfolio that a swarm of cursors builds in front of you. every main element is hidden until a named, coloured cursor drags a selection box over it; the element appears inside the box as it is drawn. six agents on desktop, three on phone, none of them real. next.js static export, react, tailwind, no three.js.

- `npm run dev`: local dev on :3000
- `npm run build`: static export to `out/`; serve it with `npx serve out -l 3011`
- `npm run lint`, `npm run typecheck`, `npm test`: eslint, tsc, vitest (run `build` before `test`; the exported-html test reads `out/index.html`)
- every string lives in `src/site/copy.ts`; every number in `src/site/facts.ts` (hand-edited)
- the swarm: pure, tested modules in `src/swarm/` (prng, easing, timeline, scheduler, agents) and one dom file, `src/swarm/Swarm.tsx`; `<Built name>` in `src/site/Built.tsx` marks an element the agents build
- reduced motion shows the page at once with no cursors; if the bundle never loads, the inline script in `src/app/layout.tsx` reveals the page after 6 s
- `public/og.png` is a committed screenshot of the exported hero at 1200×630; regenerate it when the hero changes
- no api routes, no fetches, no storage, no env vars, no analytics
- spec: `docs/plans/2026-11-02-agents-build-the-site-design.md`; plan beside it
