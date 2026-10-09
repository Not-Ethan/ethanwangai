# Only Running Things Glow — Build Spec

**Date:** 2026-10-08 (revised the same day after a three-lens Opus review)
**Status:** approved concept (Ethan, 2026-10-08: "ok do that"); this document is the single source of truth for the build.
**Replaces:** the paused "Drawn, Built, Switched On" build on branch `redesign/drawn-built-switched-on` (paper, pencil machines, ink, two themes). Nothing of its scene survives. The pieces that do survive are named in §15.
**Standing rules from Ethan:** no real-world hooks (no API routes, no fetches, no keys, no cron, no database, no shared state), zero maintenance, keep it simple. Sonnet agents build; Opus agents review, validate and judge visuals; never the session model.

## 1. What the site is

One river valley seen from one spot at blue hour. The only light in the world comes from things Ethan built.

The page opens on rolling dark ridges with a bare treeline, a pale river, a peach horizon, and no lights anywhere. The headline sits over the sky in large lowercase type: *now is the best time in history to build things.* Under it, in small mono: *everything lit here is something i built that people used.* Then, on the near bank, one small hut window catches, labelled *discord bots, middle school. my classmates used them.* From it a chain of ignitions runs across the valley, each light catching from the last in 60% of the previous gap: a window on the hill (nist), the mill floods with light and holds and then goes dark row by row (darch, which ended), a signal lamp at the foot of the far ridge (kalshi), a second hill window (wvu), four bar windows across the river (heron). Then the hillside houses on the near slope light together. Last, a thin trickle of lights appears at the left end of the far ridge: the first trades of january 2026. All of it in five seconds, before anyone scrolls.

The camera never travels. Scroll moves the clock from dusk through night to pre-dawn, and each section turns the view a few degrees toward the thing it is about. The ridge fills with about thirty thousand lights, one per trade. Hedge lines draw from each bar to the lamp. The mill's year replays under the thumb and goes out again in may 2026. On the thesis section the whole valley pulses once in the order he built it. Near the end the visitor types one sentence and the only construction on the page happens: a house assembles on the empty lot from their words, with scaffolding and a clock, and its window lights. The page ends before dawn with the first light still on.

Every element derives from a phrase Ethan wrote:

| His phrase | What it becomes |
|---|---|
| seeing something I've built come alive | the light rule: a thing emits light because it was built and used; dark means it ended or was never built |
| from discord bots all the way to kalshi | the hut lights first; the chain runs in the order he built things; the ridge is the trading algorithm |
| abstraction is a force multiplier / more with less | each ignition catches in 60% of the previous gap: the chain accelerates |
| a few sentences of plain language results in thousands of lines of code | one sentence from the visitor becomes a house of hundreds to a couple of thousand real parts, with the counts printed |
| era of speed | the whole valley is lit in five seconds; the visitor's house in 4.40 s on the clock |
| I never really liked coding / I liked watching it run | nothing on the page shows code; everything shows things that ran |
| darch ended | the mill is the biggest building in the valley and it is dark; scrolling its section relights it and puts it out again |
| now is the best time in history to build | the visitor's sentence is the last build, and it gets a light too |

Anything that does not derive from a phrase is cut.

## 2. Decisions

These are settled. Do not reopen them during the build.

- **One theme, dark.** There is no light theme and no toggle. Ethan asked for a dark theme alongside paper on 2026-09-28; he scrapped the paper theme on 2026-10-08 and a night valley has one theme by nature. `ThemeProvider`, `themeScript` and `palettes` are deleted. One palette object (§9) feeds CSS variables and GL uniforms.
- **No real-world hooks.** No `app/api`, no `fetch` anywhere in `src/`, no environment variables, no third-party scripts, no analytics. The only browser storage is `sessionStorage.introPlayed` (the chain plays once per tab) and `localStorage.visitorSentence` (the visitor's house survives a reload). Both are optional: the page works with storage blocked.
- **Static export.** `next.config.ts` sets `output: 'export'`. The site is files on a CDN. `opengraph-image.tsx` is deleted; `public/og.png` is a committed still (§10). `npm start` is removed; the exported site is served for gates with `npx serve out -l 3005`.
- **All numbers come from `src/valley/facts.ts`**, hand-edited, every one labelled `as of oct 2026`. Public numbers only: Kalshi `about 30,000 trades`, `top 100` on the all-time crypto profit leaderboard, `since jan 2026`. Never a dollar profit figure, never an exact rank, never notional or contract volume. Darch `3,000 videos a month`, `20 million views a month`, past tense, ended may 2026. Heron `bars signed in four cities`, no city names. WVU `about $100m of claims a year`. The ridge's count is labelled approximate; the per-day shape is not claimed to be real (§4.6).
- **The light rule, stated truthfully.** A light means Ethan built the thing and people used it. The mill is dark because darch ended. The spec does not claim the discord bots, the nist assistant or the wvu model run today. *Open question for Ethan, non-blocking:* if any of them still runs, the deck may tighten to "that runs"; until then the copy says "that people used".
- **Stylized, not photoreal.** Flat-shaded low-poly geometry with vertex-colour gradients, atmospheric fog, emissive windows and additive glow sprites. No textures, no normal maps, no post-processing, no bloom pass. The painterly quality comes from palette, fog and light. Sober materials, no characters, no bounce.
- **Do not build:** pagodas, torii, paper or string lanterns, blossom, fireflies, wisps, characters, vehicles, drivable or physics props, saturated toy colours, rice terraces. Buildings are plain timber-and-tin silhouettes in the terrain's dark ramp with porch lights, not lanterns. If a still reads as Kyoto, Ghibli or a toy town it fails its gate.
- **No GSAP, no @react-three/postprocessing, no FBO/GPGPU, no React state on the scroll path, no per-frame `getBoundingClientRect`, no R3F pointer events, no `backdrop-filter` or `box-shadow` over the canvas.** framer-motion's `animate` is allowed for triggered DOM reveals only.
- **Lenis is the scroll engine**, lerp 0.1, no snap. Keep the existing `ScrollProvider`, rewired (§15).
- **Copy is lowercase, blunt, full sentences, in Ethan's voice.** No italics, no title case, no em dashes, no hype, no resume fragments. Every string lives in `src/site/copy.ts`. The copy in §3 is the copy; agents do not improvise lines.
- **The ridge is not live.** About 30,000 points spread across jan 2026 → oct 2026 with seeded jitter from `facts.kalshi.trades`. The section's mono label says `as of oct 2026 · not live`. If Ethan ever commits `src/valley/data/tradesPerDay.json` the generator reads it instead; nothing else changes.
- **Reveals latch.** `ridgeReveal` and `hedgeReveal` are running maxima in the driver: the ridge and the hedge lines never un-draw. `darchT` is the only state that un-does with scroll, and the darch copy says so.
- **The visitor's house is local.** It is built in the browser from the sentence, stored only in that browser, never sent anywhere. The hillside's other houses are built from five true sentences about things Ethan made (§3.2), baked into copy.

## 3. Page structure

Eight sections, each a DOM `<section id>` with a minimum height, copy in a fixed left column over a fixed full-viewport canvas. `g` is Lenis-smoothed document progress 0..1. Section ranges come from `src/valley/sections.ts` (`sectionRanges(tops, docHeight, vh)` and `locate(g, ranges)`, same signatures the `ScrollProvider` uses today): a section's range starts when its top reaches the viewport top and ends where the next one starts; the last ends at 1. Each section exposes a local progress `s` 0..1 inside its range. A unit test asserts every range has width > 0 for the heights below at 1440 × 900 and 390 × 844.

| # | id | height | `tod` at section end | view (yaw°, pitch°, fovScale) | scrubbed by `s` | triggered on arrival |
|---|---|---|---|---|---|---|
| 01 | `open` | 100vh | 0.00 | 0, 0, 1.00 | nothing | the ignition chain (once per tab) |
| 02 | `kalshi` | 180vh | 0.30 | +4, +1, 0.96 | ridge reveal 0.01 → 1 (latched), counter | nothing |
| 03 | `heron` | 120vh | 0.40 | +2, 0, 0.98 | hedge lines 0 → 1 (latched) | nothing |
| 04 | `darch` | 180vh | 0.60 | +7, 0, 0.95 | the mill's year: flood, run, go out | nothing |
| 05 | `summers` | 100vh | 0.65 | −6, +3, 0.97 | nothing | the two cabin labels (same strings as the ignition labels) |
| 06 | `alive` | 120vh | 0.72 | 0, +1, 1.04 | nothing | one pulse through every lit thing, build order |
| 07 | `yours` | 140vh | 0.80 | +4, −2, 0.97 (portrait: +1, −8, 0.50, the §11 reframe onto the lot) | nothing | nothing; the build is triggered by Enter |
| 08 | `contact` | 150vh | 1.00 | −3, −1, 1.00 | nothing | email hover or focus flickers the hut once |

Conventions: yaw turns the view toward the section's subject; positive yaw moves the look-at toward +x (the right of the frame), negative toward −x. It is implemented as a look-at offset, `lookAt.x += tan(yaw) · d` where `d` is the distance from the camera to the base look-at, never as `camera.rotation.y`. Pitch positive looks up, same construction on y. `fovScale` multiplies the base fov (1.04 is a pull-back, 0.95 a push). The camera position never changes; only the look direction and fov. `tod` is piecewise linear between the breakpoints above and 0 through all of 01. View values ease between sections with smoothstep over the last 25% of each section.

Portrait (aspect < 1) uses its own yaw column so each subject comes into the narrow frame; pitch and `fovScale` are shared: open 0, kalshi 0, heron 0, darch +12, summers −12, alive 0, yours +3, contact −6.

### 3.1 Copy (verbatim; `src/site/copy.ts`)

**meta.** title `ethan wang`. description `now is the best time in history to build things. everything lit on this page is something i built that people used.`

**nav** (fixed, top-right, mono): `kalshi · heron · darch · summers · contact`. Home mark top-left: `ethan wang`. No resume link; the resume is private (Ethan, 2026-10-09).

**01 · open.**
Headline: `now is the best time in history to build things.`
Deck (mono, under the headline): `everything lit here is something i built that people used.`
Scroll cue (mono, bottom-left): `scroll`.
Ignition labels (mono hairline, near each light as it catches, fade out after 1.6 s):
- hut: `discord bots, middle school. my classmates used them.`
- nist: `nist, summer 2025`
- mill: `darch, june 2025 to may 2026`
- kalshi lamp: `kalshi, since jan 2026`
- wvu: `wvu medicine, summer 2026`
- bars: `heron, since june 2026`
- hillside: `things i built, one house each` (one label at the hillside's centre)

**02 · kalshi.**
h2: `every light on that ridge is a trade my algorithm made.`
Body: `about thirty thousand of them since january 2026. i built the whole thing: the feeds, the quoting, the risk checks, the replay stack i use to find out what went wrong. somewhere in there it climbed into the top 100 all-time on kalshi's crypto leaderboard.`
Figures (oversized mono, in the copy column): `about 30,000 trades` · `top 100 all-time, crypto`.
Mono: `jan 2026 → oct 2026 · as of oct 2026 · not live`.
Counter (mono, under the ridge figure, counts with the reveal): `{n} trades`, where n = round(reveal × facts.kalshi.trades / 10) × 10 formatted with `toLocaleString('en-US')`, capped at the fact.

**03 · heron.**
h2: `if the home team wins tonight, your drinks are free.`
Body: `the bar doesn't eat that. heron prices the promo, covers the payout, and hedges it on prediction markets. the lines from each bar run to the market. co-founded it this summer. we have bars signed in four cities.`
Mono: `co-founder · since june 2026 · as of oct 2026`.

**04 · darch.**
h2: `darch made three thousand videos a month. it ended in may 2026.`
Body: `it ran on python, node and ffmpeg. what it made got about twenty million views a month. scroll back and it lights up again. that's the only thing on this page that does.`
Figures: `3,000 videos a month` · `20 million views a month`.
Mono: `co-founder · june 2025 to may 2026`.

**05 · summers.**
h2: `i spent two summers building things for other people.`
Body: `at nist i built a help-desk assistant that searches the internal docs and answers from them. at wvu medicine i built a model over about a hundred million dollars a year of pharmacy claims. when denials spike, it notices.`
Figure: `about $100m of claims a year`.
Mono: `nist, summer 2025 · wvu medicine, summer 2026`.

**06 · alive.**
h2: `a few sentences of plain language turn into thousands of lines of code now.`
Body: `people kept making languages higher level so you could do more with less. this is the top of that. what used to take months takes an afternoon. the world doesn't need a master programmer who dreams in code. it needs people who've seen so many ideas that they see opportunities everywhere. i never really liked the coding. i liked watching it run.`

**07 · yours.**
h2: `type one sentence about something you'd build.`
Body: `watch it turn into a house with the lights on. yours gets a light too.`
Input placeholder: `something you'd build`. Button: `build`. Max 140 characters.
Clock (mono, during the build): `{t} / 4.40`.
Tag (mono, after the build): `{words} words in · {parts} parts out · 4.40 s on the clock`.
Hillside labels (mono, on hover or tap of a pre-built house): the sentence it was built from.
Hint under the input (mono): `it stays in this browser. nothing is sent anywhere.`

**08 · contact.**
h2: `it's late and i'm probably up building something.`
Body: `the first light on this page is still the discord bot.`
Links (mono): `email` → `mailto:ethan.wanq@gmail.com`, `github` → `https://github.com/Not-Ethan`, `linkedin` → `https://linkedin.com/in/edw173`. No resume link (private).
Mono: `ethan wang · cleveland · as of oct 2026`.

### 3.2 The five hillside sentences (`copy.yours.hillside`, true things, in his voice)

1. `a discord bot for my middle school server`
2. `a trading algorithm for kalshi`
3. `a pipeline that made three thousand videos a month`
4. `a help-desk assistant that reads the docs for you`
5. `a pricing model for free-drinks promos at bars`

Each is built once at load with the house grammar (§5.4) and sits on the near slope above the lot, between the lot and the camera. Their windows light at the end of the ignition chain (§5.3).

## 4. The valley

Scene units: 1 unit ≈ 1 m. The terrain is 160 × 100 units, centred at the origin, the river running along +x at z ≈ 0 (the ribbon spans z −6..6). All positions live in `src/valley/layout.ts` as named constants; nothing is hand-placed in a component. Every emitter's x lies in [−36, 40] and z in [−38, 26] so the whole lit valley fits one landscape frame.

**Hero camera (desktop, landscape):** position (0, 14, 70), look-at (0, 2, −10), fov 36, near 1, far 260. **Portrait (aspect < 1):** position (0, 22, 96), look-at (0, 0, −12), fov 70 (44 could not hold the hut and the hillside inside the narrow frame; at 70° the worst emitter, `hill4`, projects to |x| 0.81), so the valley sits in the lower 60% of the frame and the copy sits in the sky band; the portrait frame is too narrow to hold the whole valley at once, which is why portrait has its own yaw column (§3). A unit test projects every emitter in `layout.ts` through both cameras with three's `PerspectiveCamera` + `Vector3.project` (emitter y taken as `heightAt(x, z)` plus 1..6) and asserts: at 1440 × 900, |x|, |y| ≤ 0.85 NDC for every emitter; at 390 × 844 with yaw 0, |y| ≤ 0.85 for every emitter and |x| ≤ 0.85 for `hut`, `kalshiLamp`, `bar1`, `bar2`, `bar3`, `hill1`…`hill5`, `visitor`; and at 390 × 844 with each section's portrait yaw applied, that section's subject (kalshi: `kalshiLamp`; heron: `bar2`; darch: `mill`; summers: `nist` and `wvu`; yours: `visitor`; contact: `hut`) has |x| ≤ 0.85.

### 4.1 Ground, river, sky

- **Terrain:** a 160 × 100 plane at 1 unit resolution (161 × 101 vertices) displaced by a seeded heightfield (`src/valley/terrain.ts`: two-octave value noise plus authored masks: a river channel along +x between z −6 and 6, a near bank rising gently to the south (at most about 2.4 at z = 22, so the hero camera's sight line to the river clears it; amended after G1), a far bank rising to the north, a hill at the far left, a ridge along the back at z ≈ −38, a flat mill pad at the far bank's right end). Vertex colours from height and slope: dark moss greens low, grey-blue rock on slopes, near-black at the ridge crest. A bare treeline is a row of 1-unit dark cones along the ridge crest merged into the terrain mesh. Flat shading. Built once on the CPU at load (≈16k vertices); the same function runs in Node for tests.
- **River:** a 160 × 12 ribbon at y = 0.2 with a flow shader (two scrolling noise octaves, pale blue-grey, opacity 0.85, tinted by the sky horizon uniform). Ambient, continuous.
- **Mist:** 24 soft sprites along the river band drifting +x at 0.3 units/s, wrapping; alpha 0.12. Ambient, continuous. Off on phone.
- **Sky:** a large inverted sphere with a three-stop gradient shader (zenith, horizon, east horizon), all three colours uniforms blended by `tod`. Stars: 1,200 points on the sphere, alpha from `tod`. Moon: one sprite, position from `tod`.
- **Fog:** `THREE.Fog`, colour and range from `tod`.

### 4.2 The hut (discord bots)

Near bank, left, (−18, h, 22). A 3 × 2.5 × 3 box with a pitched roof and one window (0.8 × 0.6 emissive quad, warm). The first light. Lit from the chain onward and never goes out; a `flicker` transient (0.4 s, brightness dipping to 0.6 then back) fires on email hover or focus in 08.

### 4.3 The hill cabins (nist, wvu)

Far-left hill, (−34, h, −14) and (−27, h, −18). Two 2.5 × 2 × 2.5 cabins, one window each. nist lights second in the chain, wvu fifth.

### 4.4 The bars (heron)

Far bank, (−10, h, −20), (0, h, −22), (10, h, −21), (20, h, −23). Four 5 × 3 × 4 buildings with a wide front window (2.4 × 1.0) and a porch light over the door (a 0.3 glow). Each bar is one emitter driving its window and porch-light instances. All four light in the chain with a 0.05 s stagger left to right. In section 03 a hedge line draws from each bar's door to the kalshi lamp: one `LineSegments` draw, four polylines of 24 segments each, slightly bowed, pale, `uReveal` by segment index.

### 4.5 The mill (darch)

Far bank, right end, on the mill pad at (30, h, −12), its wheel side facing the river. The biggest building, long and low: 14 × 5.5 × 7 with a 5 × 4 grid of small windows on the river face (amended after G1: a 10 × 9 box read as an office block) (20 instances in `Windows.tsx` with per-instance `aRow` 0–3, bottom row 0) and a wheel (a 3.2-radius ring of 12 paddles) overhanging the river at (30, 2.6, −5). Its state is `darchT` ∈ [0, 1]: 0–0.15 the rows flood bottom-up (row r lights at darchT = 0.03 + 0.03r) and the wheel spins up; 0.15–0.75 lit and turning at 0.5 rad/s; 0.75–1.0 the rows go out top-down (row r goes out at darchT = 0.78 + 0.05(3 − r)) and the wheel coasts to a stop by 1.0. Section 04's `s` drives `darchT` directly. The chain in the hero plays the same curve once over 1.4 s. Scrolling back relights it.

### 4.6 The ridge (kalshi)

The back ridge crest runs from (−36, hc, −36) to (40, hc, −36) with the crest height from the terrain. `src/valley/ridge.ts` generates N points along it: x from the trade's time (jan 2026 → oct 2026 mapped left → right), z and y jittered ±1.5 with a seeded RNG, `aBirth` = time fraction (monotone in x), `aSize` 0.6–1.4. N = `facts.kalshi.trades` (30,000) on desktop, N/5 on phone with sizes ×1.8. One `THREE.Points` draw with an additive glow sprite, amber, `toneMapped: false`. `uReveal` shows points with `aBirth ≤ uReveal`. The ridge is a registered emitter (`ridge`, meaning: kalshi trades). The kalshi lamp at the ridge's foot (2, hf, −30) is a 1.2 m post with a lamp head, warm, lit fourth in the chain; it stands for kalshi, the market.

Reveal: the hero trickle takes `uReveal` from 0 to 0.01 over 1.2 s; the timeline gives `0.01 + 0.99 · easeInOut(s)` across 02 and 1 after; the driver writes `max(trickle, timeline, previous)`. A faint crest line (one `Line`, 2 px, near-black) sits under the points so the ridge reads as a horizon, not glitter.

The spread along x is uniform with jitter, from the count alone. The copy says the count is approximate and the section is labelled not live. If `src/valley/data/tradesPerDay.json` exists, the generator distributes points by that file instead; no component changes.

### 4.7 The lot and the hillside (visitor)

Near bank, right. The near bank rises toward the camera (+z), so "up the slope" is toward larger z. The lot sits low at (6, h, 10), and the five house sites sit above it at (12, h, 15), (18, h, 19), (8, h, 20), (22, h, 13), (15, h, 24). The five sites are built at load from the hillside sentences (§3.2) with the house grammar into one merged static mesh (`Hillside.tsx`, one draw). Each house is one emitter driving all of its window instances. The lot is empty until the visitor builds; if `localStorage.visitorSentence` exists it is rebuilt silently at load and lights with the hillside.

### 4.8 Light rule enforcement

`src/valley/lights.ts` lists every emitter with its id, position, colour, size and `meaning` (a short string naming the project). The emitter ids are exactly: `hut`, `nist`, `wvu`, `kalshiLamp`, `bar1`, `bar2`, `bar3`, `bar4`, `mill`, `ridge`, `hill1`…`hill5`, `visitor`. A unit test asserts the registry has exactly these ids, each with a `meaning`. The sky, moon, stars, river and mist are not emitters and are not emissive. Nothing else in the scene may use an emissive material or a glow sprite; a test greps `src/gl/` for `emissive` and `AdditiveBlending` and asserts they appear only in `Windows.tsx`, `Glow.tsx`, `Ridge.tsx` and their shaders.

## 5. Scene state (`src/valley/`, pure TypeScript, runs in Node and the browser)

No React, no DOM, no three renderer. three's math classes are allowed.

### 5.1 `timeline.ts`

`timelineAt(g, ranges)` returns `{ tod, section, s, view, ridgeReveal, hedgeReveal, darchT, rain, pulseArm }` where:
- `tod` ∈ [0, 1]: piecewise linear through the breakpoints in §3 (0 through 01, then 0.30 at the end of 02, 0.40, 0.60, 0.65, 0.72, 0.80, 1.00 at the end of 08).
- `view`: `{ yaw, pitch, fovScale }` from §3, eased between sections with smoothstep over the last 25% of each section.
- `ridgeReveal`: 0.01 before 02, `0.01 + 0.99 · easeInOut(s)` across 02, 1 after. The driver latches it.
- `hedgeReveal`: 0 before 03, `s` across 03, 1 after. The driver latches it.
- `darchT`: 0 before 04, `s` across 04, 1 after.
- `rain`: 0 before 04, ramps to 1 across the first 30% of 04, holds through 05, ramps to 0 across the first 40% of 06.
- `pulseArm`: true while `section === 'alive'`; the driver fires the pulse on the rising edge and re-arms after 10 s out of the section.

### 5.2 `environment.ts`

`environmentAt(tod)` returns `{ zenith, horizon, east, fogColor, fogNear, fogFar, sunDir, sunColor, sunIntensity, hemiSky, hemiGround, starAlpha, moonPos, moonAlpha }`, linear blends through four authored keyframes at tod 0 (dusk), 0.3 (blue), 0.6 (night), 1.0 (predawn). Keyframes are the palette (§9).

### 5.3 `ignition.ts`

`ignitionSchedule()` returns the hero chain as `[{ target, at, dur, kind }]` with `at` in seconds from T0 and `target` an emitter id (§4.8):

| target | at | dur | kind |
|---|---|---|---|
| hut | 0.800 | 0.5 | flicker then hold |
| nist | 1.800 | 0.3 | catch |
| mill | 2.400 | 1.4 | flood, run, out (the §4.5 curve) |
| kalshiLamp | 2.760 | 0.3 | catch |
| wvu | 2.976 | 0.3 | catch |
| bar1…bar4 | 3.106 + 0.05·i | 0.3 | catch |
| hill1…hill5, visitor | 3.600 | 0.4 | catch, stagger 0.04 |
| ridge | 3.800 | 1.2 | trickle 0 → 0.01 |

The five chain gaps hut→nist→mill→kalshiLamp→wvu→bar1 are 1.000, 0.600, 0.360, 0.216, 0.1296 s: each exactly 60% of the last (tested to ±1 ms). The bar stagger, the hillside and the trickle are not chain gaps. The chain ends at 5.000 s. Reduced motion or `introPlayed`: every target is in its final state at T0 and the schedule is empty.

### 5.4 `house.ts` (the grammar)

`houseFromSentence(sentence)` → `{ seed, words, tiers, bays, width, depth, roof, windowsPerFace, porch, parts }`:
- `seed = hashString(sentence.trim().toLowerCase())` (FNV-1a 32-bit, in `hash.ts`); all shifts are unsigned (`>>>`).
- `words` = whitespace-split non-empty count, clamped 1–24. `tiers = 1 + floor((words − 1) / 8)` (1–3). `bays = 2 + floor(words / 3)` (2–10). `width = bays` units, `depth = 3 + ((seed >>> 2) % 2)`. `roof = ['pitched', 'hipped', 'flat'][(seed >>> 4) % 3]`. `windowsPerFace = { front: floor(width / 2), back: floor(width / 2), side: 1 + ((seed >>> 6) % 2) }` per tier. `porch = (seed & 1) === 1`.
- `parts` is the real list of boxes the geometry is built from, in build order (bottom to top): wall planks, one per 0.5 unit of wall length per course, courses every 0.25 unit of height over a 2.5-unit tier, on all four faces; roof slats, one per 0.25 unit of width per roof side (two sides for pitched and hipped, one flat slab of width/0.25 slats for flat); four frame parts per window; four porch posts if `porch`; one chimney. Worked examples: 1 word → bays 2, depth 3, perimeter 10, 20 planks × 10 courses × 1 tier = 200, roof 16, windows (1+1+1+1) × 4 = 16, chimney 1 ≈ 233 parts; 24 words → bays 10, depth 4, perimeter 28, 56 × 10 × 3 = 1,680, roof 80, windows (5+5+2+2) × 3 tiers × 4 = 168, posts 4, chimney 1 ≈ 1,933 parts. `parts.length` is what the tag prints, never a made-up number.
- `houseSvg(house)` returns an SVG elevation string of the same house for the no-WebGL tier.
- Deterministic: the same sentence always builds the same house (tested). Colours come from the terrain's dark ramp (§9), never a saturated colour.

### 5.5 `build.ts` (the one construction)

`buildStateAt(t)` for `t` ∈ [0, 4.4] s: `{ cut, scaffold: [{ idx, grow }], clock, lit }` where `cut` is the clip height fraction (easeInOut over 0–3.6 s), each of the 18 scaffold bars grows in over 0.3 s on the stagger `(idx % 9) / 9 · 0.3` starting at 0.2 s, holds, and retracts between 3.6 and 4.1 s; the window lights at 4.25 s; `clock` is `t` formatted `0.00`. The build latches on wall time: scrolling away does not pause or reverse it. A new sentence replaces the house: the old one's light goes out over 0.2 s, then the new build starts.

### 5.6 `lights.ts`

The emitter registry (§4.8) plus `lightStateMachine`: each emitter is `dark | igniting | lit | out`, with a `flicker` transient on `hut`, transitions driven by the ignition schedule, `darchT` (mill only), the visitor build and the contact hover. `pulseAt(t, order)` returns per-emitter brightness multipliers for the thesis pulse: a 1.2 s wave through the emitters in build order (hut, nist, kalshiLamp, wvu, bar1–4, hill1–5, visitor, ridge), each rising to 1.6× and settling over 0.4 s; the mill is excluded. Window and glow materials are `toneMapped: false` so the pulse reads.

### 5.7 `sections.ts`, `facts.ts`, `types.ts`, `hash.ts`, `rng.ts`, `palette.ts`

Sections: the eight ids and heights, `sectionRanges`, `locate`, `SectionRange`. Facts: every number with `asOf: 'oct 2026'`. Types: `Tier`, ids, emitter records, the house record. Hash: FNV-1a. Rng: mulberry32. Palette: §9.

## 6. Rendering (`src/gl/`)

One fixed R3F `<Canvas>` behind the DOM (z 0; `main` at z 10). The canvas wrapper is `pointer-events: none`; hover, tap and parallax use window-level pointer listeners with screen-space hit tests against `projection.ts`'s cached projected emitter positions. No R3F pointer events. `gl`: antialias on desktop, `powerPreference: 'high-performance'`, `alpha: false`, `localClippingEnabled: true`, ACES tone mapping, sRGB output. DPR 1.25 desktop, 1 phone. Shadows: one directional shadow map 1024 on desktop from the moon/sun direction; casters are `Buildings`, `Hillside`, `VisitorHouse` and `MillWheel`; the terrain only receives; none on phone.

`Scene.tsx` mounts the Canvas, the warm-up (§7), the error boundary (§11) and the components below; `glowTexture.ts` makes the 64 × 64 radial sprite every glow and ridge point samples (§12).

Components (each one main-pass draw unless stated):
- `Sky.tsx` (sphere, gradient shader), `Stars.tsx` (points), `Moon.tsx` (sprite)
- `Terrain.tsx` (vertex-colour mesh with the treeline merged in, `MeshLambertMaterial` with `flatShading`)
- `River.tsx` (ribbon, custom shader with fog chunks), `Mist.tsx` (instanced sprites; desktop only)
- `Buildings.tsx`: all static building bodies merged into one `BufferGeometry` with vertex colours (hut, cabins, bars, mill body, lamp post), `MeshLambertMaterial`, one draw. Built from `layout.ts`.
- `Windows.tsx`: one `InstancedMesh` of emissive quads, fixed capacity 512, holding every window and porch light: the hut's, the cabins', the bars' (window + porch light), the mill's 20 (with `aRow`), the hillside's and the visitor's (positions from the grammar, registered at build; `mesh.count` updated). Per-instance `aLit` (0–1.6). Material: `MeshBasicMaterial` extended through `onBeforeCompile` so instancing, fog and colour space stay correct; `toneMapped: false`. One draw. `Glow.tsx`: one instanced additive sprite per emitter (the ridge excluded), size from the registry, scaled by `aLit`, same material approach. One draw.
- `MillWheel.tsx`: the wheel, rotation from `darchT` and its own clock.
- `Ridge.tsx`: the points draw plus the crest line (§4.6).
- `HedgeLines.tsx`: the line draw (§4.4).
- `Rain.tsx`: 1,500 line segments in a 60 × 30 × 40 box around the camera, falling at 18 units/s, alpha from `rain`; desktop only.
- `Hillside.tsx`: the five houses merged into one static mesh. `VisitorHouse.tsx`: one mesh rebuilt on a new sentence, clipped during the build with `material.clippingPlanes = [plane]`, `clipShadows: true`, `side: DoubleSide` while building. `Scaffold.tsx`: 18 instanced bars with `aGrow`, mounted only during a build.
- `CameraRig.tsx`: fixed position per aspect (§4), look direction and fov from the timeline, pointer parallax ±1° damped, recomposition on aspect change.
- `Driver.tsx`: the one `useFrame`. It calls `applyFrame(inputs, targets)` from `src/gl/driverCore.ts`, a pure function tested in Node: reads the scroll ref, evaluates `timelineAt` and `environmentAt`, advances the ignition, pulse, flicker and build clocks on wall time, latches the reveals, writes uniforms and instance attributes, updates fog and lights, and writes projected label positions into a typed array the DOM labels read. Nothing else in the GL tree reads scroll.
- `Labels.tsx` (DOM, in `src/site/`): the ignition, cabin and hillside labels are DOM spans positioned from the driver's projected positions each frame (no `getBoundingClientRect`).

Main-pass draws at rest: sky, stars, moon, terrain, river, mist, buildings, windows, glow, wheel, ridge points, crest line, hedge lines, rain, hillside, visitor = 16 on desktop (+1 scaffold during a build); phone drops mist and rain: 14 (+1 scaffold during a build). Shadow pass on desktop: 4 casters. Lights: one hemisphere, one directional (moon/sun), four point lights parented to the hut, the mill, the kalshi lamp and the visitor house, intensities from their `aLit`.

## 7. Warm-up, first paint and T0

The DOM is server-rendered with the headline, deck, every section's copy, the links and the input. Behind it, at z 0, sits `public/valley-still.jpg` (the committed night still, §10) as a CSS background on the canvas wrapper, so the first paint is a finished picture. The canvas mounts at opacity 0, waits for `document.fonts.ready`, `gl.compileAsync` (with a 4 s timeout, after which it proceeds), one rendered frame, then fades in over 200 ms. The end of that fade is T0 and the ignition chain starts, unless `sessionStorage.introPlayed` is set (then every light is already in its final state and `ridgeReveal` follows the timeline). The still shows the lit night valley; the chain starts from dark, so the fade is a cut from lit to dark over 200 ms. That is accepted: the still is for the first paint and the fallback, not a pixel match.

## 8. Scroll and time

`ScrollProvider` (kept, rewired to `@/valley/sections` and `@/valley/types`) writes `g`, `scrollY`, `velocity`, section ranges and tops into a ref. The driver reads it in `useFrame`. React never re-renders on scroll. Velocity is unused by the scene and the DOM; `velocity.ts` stays only because the provider imports it.

Clocks: scrubbed time (`g` → `timelineAt`), triggered time (the chain, the pulse, the flicker, the build, line reveals), and ambient time (river, mist, wheel idle, stars twinkle) which is wall time and continuous. Reduced motion freezes ambient time and cuts instead of easing.

## 9. Palette, type and layout (`src/valley/palette.ts`, `src/app/globals.css`)

One palette object, dark, the only place colour literals exist in `.ts`/`.tsx`; `globals.css` declares the same values as CSS variables (a test checks they match):
- copy `ink` `#E9E4DA`, `inkDim` `#9A958C`, `rule` `#2A2C33`, scrim `rgba(5,7,15,0.72)`
- emitters: warm `#FFC98A` (hut, cabins, visitor, hillside), ridge amber `#FFB45A`, porch light `#FFD9A0`, mill windows `#FFC27A`, lamp `#FFD2A0`
- hedge line `#8FA3B8` at alpha 0.5; rain `#9AAEC4` at alpha 0.35
- building bodies `#1A1F28` walls, `#11151C` roofs; house bodies from the same two
- sky keyframes: dusk zenith `#1B2238`, horizon `#C9825A`, east `#2A2E48`; blue zenith `#0E1426`, horizon `#2E4360`, east `#141A2E`; night zenith `#05070F`, horizon `#101830`, east `#070A14`; predawn zenith `#0A0F1E`, horizon `#1E2A40`, east `#5A6E8C` (horizon luminance strictly falls dusk → blue → night; predawn's east is a visible lift; amended after G1)
- sun/moon colour per keyframe: dusk `#E8A070` intensity 10, blue `#8FA8D0` 12, night `#9FB2D8` 16, predawn `#B8C4D8` 14 (three's physically based light units; the Lambert ground needs them); hemisphere intensity 8, hemisphere sky = horizon, ground = terrain mid; fog near/far dusk 50/230, blue 40/200, night 30/180, predawn 40/200 (amended after G1: the first values left the ground black)
- terrain ramp: low `#1B2C22`, mid `#26402E`, slope `#33404F`, crest `#0E121A`, treeline `#090B10` (lifted one step after G1); river `#6E8AA6`; mist `#8FA3B8`
- fog colour follows the horizon.

Scrims: each copy column sits in one soft ellipse of the scrim colour at about half strength (a pseudo-element behind the column, centred on the text block, fading out in every direction: no corner, no straight edge, never a card), and every line of copy carries a faint halo in the scrim colour (`text-shadow`), which is what guarantees legibility at the block's corners and over the bright dusk sky. The contrast unit test pins 4.5:1 for ink on the scrim colour. Amended twice after G1: a text-wide gradient read as a card, and a masked left vignette read as a boxed panel over the sky.

Typography: Archivo variable (kept, `next/font/local`, metric fallback), display `clamp(2.5rem, 7vw, 7rem)` weight 700, line-height 0.95, tracking −0.03em, lowercase; h2 `clamp(1.6rem, 3.8vw, 3.2rem)`; body 18–20 px weight 500, max 34ch; JetBrains Mono (kept) 12–14 px for every number, label, nav and link, tabular numerals; oversized mono figures 48–72 px for the evidence numbers. No kinetic type. No font axis animates.

Layout: copy in a left column (grid columns 1–5 of 12, max 34ch), the valley across the whole frame, each section's yaw turning toward its subject; subjects at the far left (the cabins) sit beside the column, whose scrim is only as wide as the text. `Site.tsx` composes `chrome/Nav`, `sections/*` and `Labels`; `Reveal` implements `[data-reveal]`; `Counter` is the ridge counter; `Figure` renders the oversized mono figures. Fixed mono chrome: nav top-right, home mark top-left, scroll cue bottom-left in 01 only. No cards, panels, blur or borders.

DOM motion: triggered line reveals on `[data-reveal]`, translateY 100% → 0 plus opacity, 0.5 s power3.out, stagger 0.06, reversing on scroll-back; the ridge counter scramble-decodes digits only (seeded, deterministic, run only while the value changes); no count-ups on any other figure; no parallax on text.

## 10. The still (`public/valley-still.jpg`, `public/og.png`)

Both are committed files produced by the visual gate agent with Playwright at 1440 × 900 against the exported build on `/?still=1`: the query sets `sessionStorage.introPlayed`, pins `g` to the alive section's midpoint (the driver reads a `?g=` override when `still=1`), hides `main`, and holds the frame. Saved as JPEG q82 (≈150 KB) and a 1200 × 630 centre crop as `og.png`. The gate agent regenerates them whenever the scene changes materially and commits them. There is no build-time emitter; `prebuild`, `emit`, `check:emit` and `scripts/**` are deleted.

## 11. Tiers and fallbacks

**Desktop:** everything in §6.

**Phone tier** (`detectTier`, kept: pointer coarse, width < 820, or `hardwareConcurrency ≤ 4`): DPR 1, no shadows, no rain, no mist, ridge N/5 at ×1.8 size, stars 400; tap on a hillside house or an emitter shows its label as a bottom-aligned mono line; the input blurs on Enter and the view reframes so the lot sits above the keyboard. **Portrait recomposition is by aspect (vw < vh), not tier**, so a small landscape laptop keeps the landscape camera. drei's `PerformanceMonitor` only walks the step-down ladder and never changes `tier`. Step-down ladder on any tier if frame time exceeds 20 ms for 60 frames: DPR 1.25 → 1 → 0.85 (`DPR_FLOOR` becomes 0.85), then ridge halves, then rain off, then mist off. `TierSettings` keeps `tier`, `dpr`, `shadows`, `antialias`; `stretch`, `lines` and `msaa` are removed.

**Reduced motion:** no chain (final states at T0), no rain, river and mist frozen, wheel still, cuts instead of eases for view offsets and reveals, the house appears built with no scaffolding, the pulse is a single 300 ms brightening.

**No WebGL / context loss:** the canvas unmounts; the still stays as the picture; the DOM is complete on its own; the ignition labels render as a static list under the deck; the visitor's house renders as the SVG elevation from `houseSvg` with the same parts count. `?nogl=1` forces this tier.

**Storage blocked:** the chain plays every load; the house does not persist. No errors.

## 12. Performance budget and silent killers

- Main-pass draws ≤ 18 at rest on desktop, ≤ 14 at rest and ≤ 15 during a build on phone; shadow pass ≤ 6 on desktop. One `useFrame`. No allocation in the frame loop (preallocated vectors, typed arrays; `applyFrame` is tested for zero allocation by comparing `process.memoryUsage().heapUsed` deltas over 1,000 calls in Node, which is coarse, and by review).
- Terrain ≈ 16k vertices built once; buildings merged once; windows and glow instanced; the ridge one points draw; the hillside one mesh; the visitor house rebuilt only on a new sentence.
- Rain is the first thing dropped, then mist. The ridge is never below N/10.
- Textures: none except the glow sprite (64 × 64, generated once on a 2D canvas).
- JS budget: three + R3F + drei + framer-motion `animate` ≈ 180 kB gz; the valley package < 25 kB gz. Lenis stays.
- Silent killers to test for: NaN in the heightfield at the river channel edges; the house grammar producing zero parts or an empty sentence; projected labels off-screen writing huge transforms (clamp to the viewport and hide); `compileAsync` never resolving on a lost context (the 4 s timeout); `sessionStorage` or `localStorage` throwing in private mode (every access in try/catch).

## 13. Module layout

```
next.config.ts           output: 'export'
src/app/                 layout.tsx (fonts, metadata, no theme script), page.tsx, globals.css, fonts/
src/valley/              types.ts, facts.ts, palette.ts, sections.ts, layout.ts, terrain.ts, ridge.ts,
                         timeline.ts, environment.ts, ignition.ts, lights.ts, house.ts, build.ts, hash.ts, rng.ts
src/scroll/              ScrollProvider.tsx (kept, rewired), tier.ts (kept, rewired), velocity.ts (kept)
src/gl/                  Scene.tsx, Driver.tsx, driverCore.ts, CameraRig.tsx, useTier.ts (kept, re-tuned), projection.ts,
                         Sky.tsx, Stars.tsx, Moon.tsx, Terrain.tsx, River.tsx, Mist.tsx, Buildings.tsx, Windows.tsx,
                         Glow.tsx, MillWheel.tsx, Ridge.tsx, HedgeLines.tsx, Rain.tsx, Hillside.tsx, VisitorHouse.tsx,
                         Scaffold.tsx, glowTexture.ts, shaders/ (sky, river, windows, glow, ridge, hedge)
src/site/                Site.tsx, copy.ts, Labels.tsx, Reveal.tsx, Counter.tsx, Figure.tsx, chrome/Nav.tsx,
                         sections/ (Open, Kalshi, Heron, Darch, Summers, Alive, Yours, Contact)
src/fallback/            Still.tsx (no-GL tier: still + static labels + SVG house), glSupport.ts (kept)
public/                  valley-still.jpg, og.png, favicon.ico (no resume: it is private)
```

**Deleted:** `src/bench/**`, `src/generated/**`, `src/theme/**`, `scripts/**`, `public/plates/**`, `src/app/opengraph-image.*`, and every file under `src/site/`, `src/gl/` and `src/fallback/` that is not listed above (including `src/site/facts.ts`, which moves to `src/valley/facts.ts`, `Plate.tsx`, `Readout.*`, `chrome/Ladder`, `SectionStrip`, `ThemeToggle`, `hudSync`, `inkedCount`, `sections/Sentence`, `More`, `First`, `src/gl/material/**`, `src/fallback/StaticPlates.*`, `src/fallback/staticPlates.css`, and their tests). The gitignored `.superpowers/` ledgers are untouched.

## 14. Gates

Each gate is judged by an Opus visual-check agent from Playwright stills against the exported build (`npm run build && npx serve out -l 3005`) at 1440 × 900 (and 390 × 844 for phone) saved under `.playwright-mcp/gates/` (gitignored). Agents do not self-pass a gate. Every gate also requires `npm run lint`, `npx tsc --noEmit`, `npx vitest run` and `npm run build` green.

| gate | after | passes when | on failure |
|---|---|---|---|
| G1 valley still | terrain, river, sky, buildings, windows lit | the lit night view reads as one place with depth and weather, dark and sober, not Kyoto, not a toy town; every light visible is a registered emitter; every emitter is in frame | re-author the layout and the palette keyframes once; on a second failure, simplify the buildings to silhouettes with windows |
| G2 ignition | chain + labels | stills at T0+1.0, 1.9, 2.6, 3.2, 3.7, 5.0 show the hut first, the chain accelerating, the mill flooding (2.6, 3.2) and going out while the hillside catches (3.7), the trickle at the ridge's left end (5.0); labels legible and gone by 7 s | retime the gaps; shorten the mill's beat; never reorder |
| G3 ridge | ridge reveal + counter | at s = 0.3, 0.6, 1.0 of section 02 the ridge reads as a timeline filling left to right over a crest, not glitter; the counter tracks the reveal | widen the jitter band, reduce the point size |
| G4 darch | mill scrub | stills at darchT 0.1, 0.5, 0.9 show flood, running, going out; wheel motion visible | retime; raise the wheel |
| G5 house | visitor build, hillside in frame | stills at 0.5, 2.0, 3.85, 4.4 s show scaffolding, the cut rising, retraction, the window lighting; the tag shows true counts; the same sentence builds the same house twice; the hillside with six houses still reads sober, not a toy town | fix the grammar before anything else; darken the house ramp |
| G6 tiers | phone, no-GL, reduced motion | phone still at 390 × 844 on the exported build with CDP CPU throttling 4×: valley in the lower 60%, copy legible, ≥ 45 fps; no-GL: still + DOM complete + SVG house; reduced motion: no chain, final states | drop ridge density first, then mist |
| G7 performance | polish | frame time under 16.7 ms at rest on the dev machine for 10 s at g = 0, 0.5, 1 on the exported build; main-pass draws ≤ 18; heap flat over 10 s | apply the step-down ladder permanently to the offender |

## 15. What is kept, deleted and added

**Kept, rewired:** `src/scroll/ScrollProvider.tsx` and `src/scroll/tier.ts` (imports move from `@/bench/sections` and `@/bench/types` to `@/valley/sections` and `@/valley/types`; this is the first build task so the tree compiles before `src/bench` is deleted), `src/scroll/velocity.ts`, `src/gl/useTier.ts` (re-tuned per §11), `src/fallback/glSupport.ts`, `src/app/fonts/*`, the vitest and eslint setup, the Playwright gate convention.

**Deleted:** everything listed in §13.

**Added:** `src/valley/**`, the new `src/gl/**`, `src/site/**` and `src/fallback/Still.tsx`, `public/valley-still.jpg`, `public/og.png`, `next.config.ts` with `output: 'export'`.

**Dependencies:** none added. Removed: `tsx`, `@fontsource-variable/archivo`, `@fontsource-variable/jetbrains-mono`, `@fontsource/archivo` (the fonts are already in `src/app/fonts`). Scripts become `dev`, `build`, `lint`, `typecheck`, `test`.

## 16. Verification

- Unit (vitest, Node): heightfield has no NaN and the river channel is below both banks; the ridge generator yields exactly N points with monotone `aBirth` in x and all within the crest band; the projection assertions in §4 hold for both cameras; every section range has width > 0; `timelineAt` is monotone in `tod`, continuous in `view`, and `darchT` is 0 outside section 04; `environmentAt` interpolates exactly at keyframes; the five ignition chain gaps are each 60% of the last (±1 ms) and the chain ends at 5.0 s; the house grammar is deterministic, yields 1–3 tiers and 150–2,200 parts, matches the two worked examples within ±5%, and `houseSvg` has balanced tags; `buildStateAt` latches at 4.4 s and the window lights at 4.25 s; the light registry has exactly the ids in §4.8 with meanings; the palette and `globals.css` agree; the scrim contrast test; copy contains no uppercase letters outside URLs, no `$20`, no `#75`, no `notional`, no `contracts`.
- Integration (vitest, Node): `applyFrame` writes `uReveal` from `g` and latches it; projected label positions are clamped; a lost-context timeout resolves.
- Visual: the gates in §14, judged by Opus from stills.
- Build: `npm run build` produces `out/` with no server features; `grep -r "fetch(" src/` returns nothing; no `app/api`.
- Branch review: a whole-branch Opus review before merge to `main`.
