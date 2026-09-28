# Drawn, Built, Switched On — Build Spec

**Date:** 2026-09-28
**Status:** approved concept; this document is the single source of truth for the build.
**Replaces:** the forest-walk site (everything under `src/components/three`, `src/lib/journey.ts`, the trail nav, the journey clock, the serif/amber palette). None of it survives except the pieces named in §15.

## 1. What the site is

One sentence becoming machines, on paper.

Ethan's headline sits top-left in large lowercase type: *now is the best time in history to build things.* Ink lifts off the words "build things", prints for six tenths of a second into about forty ragged rows of dots that read as lines of code, then flies onto a pencil exploded-view drawing of a machine. Each part slides into its slot and turns from pencil to solid ink. The machine assembles completely still. Then its last part, a lever, drops with a hard stop and everything starts at once: carriages sweep, rotors spin, a bed of 64 markets starts quoting. That machine is the quoter, his Kalshi trading system, and it keeps running for the rest of the visit. A live ladder under the headline reads `10 words · 40 lines · 7,3xx parts · running 00:00:04`. All of this happens in about two seconds, before anyone scrolls.

Scrolling reveals a bench with more machines waiting as pencil outlines. Each is drawn, inked, and switched on by its own section heading, and keeps running after you scroll past. The last pencil outline is an empty slot with a real text input: type what you want to build, press Enter, and it builds a small machine from your sentence, one bar per word.

Every element derives from a phrase Ethan wrote:

| His phrase | What it becomes |
|---|---|
| a few sentences of plain language results in thousands of lines of code | ink lifts off the DOM sentence, forms rows of dots (lines), lands on parts; the ladder prints the ratio |
| abstraction is a force multiplier / higher and higher level / more with less | six scroll clicks merge 64 markets to 1 while a ladder lights bits → machine code → c → python → a library → a sentence, then bursts back to thousands |
| seeing something I've built come alive | build still, lever drops, everything switches on; three times at three scales |
| era of speed / months and years in an afternoon | the quoter is built and running 2.2 s after the canvas appears; each later build takes a smaller slice of scroll; scroll velocity stretches parts and raises fill rates |
| era of diversification / well rounded / see opportunities everywhere | one kit of six primitives, several machines whose shapes are dictated by their real jobs; unbuilt ones already drawn in pencil at the frame edge |
| I never really liked coding | code exists for 600 ms in flight and leaves toward the thing; never typed, never a lens |
| they run on their own (his description of the payoff) | every built machine keeps running on its own clock after you scroll past |
| from discord bots all the way to kalshi | a six-part bot has pinged at the quoter's corner since load, beside the machine that made the top 100 |
| now is the best time in history to build | the visitor's own sentence builds a machine at the end |

Anything that does not derive from a phrase is cut: no fog, grain, bloom, glow, orbs, drifting layers, distance fades, dark voids.

## 2. Decisions

These are settled. Do not reopen them during the build.

- **Two themes, paper and drafting.** Paper (light) is the primary design target. Drafting (dark) is the same technical-plate idiom inverted: bone machines on dark paper. Theme follows `prefers-color-scheme`, with a toggle in the nav, persisted in `localStorage`, applied before first paint by an inline script. Every color in DOM, SVG and GL reads from one palette object (§9).
- **Public numbers.** Kalshi: `30,000 live trades`, `2M contracts traded`, `top 100` on the all-time crypto profit leaderboard, `live on kalshi since jan 2026`. No dollar profit figure, no exact rank, anywhere, including metadata and the og image. Darch: `3,000 videos a month`, `20 million people`, `85% margins`, past tense (ended May 2026). Heron: `bars signed in four cities`. WVU: `about $100m of claims a year`. Every figure is labelled `as of sept 2026` in mono. No real metric ever animates; only the page's own uptime and part counts tick.
- **The visitor input stays.** It is the argument's last beat.
- **"i never really liked the coding. i liked watching it run."** goes on the page verbatim.
- **Lenis is the scroll engine**, lerp 0.1, no snap, no resistance valley. Ethan asked for Lenis-style smooth scroll specifically.
- **Typeface:** Archivo (variable, self-hosted via `next/font/local`) for display and body; JetBrains Mono (variable, self-hosted) for every number, label, plate, nav item and link. No italics anywhere.
- **Fallback archetype** if the quoter fails its still twice: fewer, larger modules, a press or plotter silhouette, 8 rotors instead of 24. Same kit, same shader, only the config changes.
- **No GSAP, no postprocessing, no FBO or GPGPU, no share link, no retasked bed, no per-frame instance matrix updates.** Each was considered and cut for frame time or for the thesis.
- **Work happens on a branch** (`redesign/drawn-built-switched-on`), merged to `main` when the gates pass.

## 3. Page structure

Nine sections. `g` is document scroll progress 0–1. Fractions below are targets for desktop; the runtime computes each section's actual range from element offsets on resize, so the scene state table is keyed to sections, not to hardcoded fractions.

| # | id | height (desktop / coarse pointer) | g (approx) | machine built here | camera |
|---|---|---|---|---|---|
| 01 | `sentence` | 140vh / 140vh | 0.00–0.16 | quoter (on the clock, never scrubbed) | low 3/4 product shot → rises to high 3/4 while headline stays pinned |
| 02 | `more` | 100vh / 220vh | 0.16–0.28 | none (merge on the quoter) | high 3/4 over the bed, ~55° elevation, frame and carriages in frame |
| 03 | `first` | 60vh / 60vh | 0.28–0.34 | none (bot has run since load) | macro on the bot, pull back until bot and quoter share the frame |
| 04 | `kalshi` | 100vh / 100vh | 0.34–0.46 | intake (scrubbed) | slow lateral dolly along the bed, low oblique; the only lateral dolly on the page |
| 05 | `heron` | 90vh / 90vh | 0.46–0.56 | balance (scrubbed) | side pose on the balance, quoter trading behind |
| 06 | `darch` | 90vh / 90vh | 0.56–0.67 | splitter (scrubbed) | long low pose along the splitter |
| 07 | `summers` | 80vh / 80vh | 0.67–0.76 | watch (scrubbed) | high calm pose on the watch |
| 08 | `alive` | 110vh / 110vh | 0.76–0.88 | none | long pull back and around to the poster pose: whole bench running |
| 09 | `yours` | 100vh / 100vh | 0.88–1.00 | visitor (on Enter) | low front-right on the empty slot |

Total ≈ 870vh desktop, ≈ 990vh coarse pointer.

**Phase rule for every section after 01:** camera travel in the first 15–25% (power2.inOut through real depth, never a cut); heading reveal at 12%; build, where there is one, from 12–15% to a section-specific end (05: 45%, 04: 45%, 06: 40%, 07: 35%, an accelerando); then dwell with the machines running. The camera is still for at least 60% of every section.

**Anti-journey rule (hard authoring constraint):** the bench is a compact cluster (~14 × 10 units), not a trail. The quoter is in frame in every pose after the hero except the first 30% of 03's macro. Every other pose holds at least two instruments. One lateral dolly on the whole page (04). Total camera path under ~40 units. Any still that reads as "arriving at a station" gets re-authored.

**Dead-scroll rule:** no `g` range has zero scene derivative. Before the polish gate, plot camera, merge, compile and pull-back curves against `g`; any flat stretch gets a camera drift or is cut.

### 3.1 Section by section

**01 · sentence.** Server-rendered paper. Top-left, painted before JS in a metric-matched fallback: the headline, three lines at ~8vw. Under it the deck and the ladder. Top-right mono nav. Section strip bottom-left. Lower-right two-thirds: the inline hero SVG (§10) of the quoter as an exploded pencil drawing with hairline leader lines on its ~24 modules, its bed a flat pencil grid, six small parts at its front-left corner already solid ink (the bot), and the cropped tops of the smaller pencil figures at the bottom frame edge. First paint is a finished poster with nothing loading.

Warm-up (§11): hydration, `document.fonts.ready`, `renderer.compileAsync`, one hidden frame with the shadow map. Only then does the canvas cross-fade over the SVG in 200 ms, pixel-matched. Call the end of that fade **T0**.

- T0: the bot's cap flips hot once (it has been running since load). `uCompile[quoter]` starts a 2.2 s linear tween (per-part easing lives in the shader). Ink lifts off the glyph pixels of "build things" and streams down-right as 2 px dots along a baked curl field.
- T0 + 0.35 → 0.95: a third of the way down, the dots print into ~40 short rows on a screen-aligned band, top to bottom over 150 ms, hold 300 ms, release toward parts over 150 ms. 14 CSS-px row pitch, ragged right ends. The ladder ticks `10 words · 40 lines`.
- T0 + 0.75 → 2.05: parts lock in birth order, each in ~130 ms: exploded offset to slot with expo-out and a hard mechanical stop, one 6% settle, flat pencil to lit ink at the lock, its leader line fading over the same 130 ms, a real shadow appearing. Frame rails first, then the 64 × 48 bed racking in from the headline side (cells rise from a flat pencil grid to their heights in a front), then six carriages, then 24 rotors with spokes. The machine assembles **still**: its clock is 0, the bed shows one frozen frame, carriages parked at the rail end, rotors stopped. Nothing is static during this: ink in flight, parts locking, leader lines vanishing, the ladder ticking, the bot pinging.
- T0 + 2.05: the lever, last in birth order, a single bar pivoted on the frame's front-left post, drops from 30° to 0 with the hardest stop on the page. Its lock sets `run[quoter] = 1`. All six carriages leave the rail end together; rotors spin up over 400 ms; the first seeded fill flips a cap to show its orange underside; a synthetic velocity impulse of 0.6 stretches every inked part once along the bed axis and relaxes over 400 ms; fill rate runs 3× for one second and settles.
- T0 + 2.2: the ladder finishes `10 words · 40 lines · 7,3xx parts · running 00:00:00` and counts for the visit.
- At rest: carriages drift into polyrhythm over ten seconds (periods 1.6–6 s); each market's mid random-walks so its depth mound slides along the rows; a 2% trickle of ink keeps flowing from the sentence into the quoter; the bot pings every 1.6 s; the pointer tilts the camera by at most 2°.

Scroll: `g` 0–0.03 is a dead guard. 0.03–0.16: the camera rises from the low 3/4 shot to a high 3/4 over the bed while the copy block stays `position: sticky` for the first 40vh; as the frame widens the pencil bench enters from the bottom edge. Scrolling back to the top lands on the built, running quoter. Clicking the headline or the plate's `rebuild` control replays the compile from 0 (deterministic: still, then on). Returning to the top after 60 s away offers a replay on the plate but never forces one.

Copy: headline, deck (`so i build a lot of them. they run on their own.`), ladder, plate (`fig. 1 — the quoter. built from the sentence above. rebuild`, a real button with a hot underline on hover and focus), honesty line (`seeded model of the strategy. not live data.`).

**02 · more.** Camera finishes arriving at the high 3/4 pose with the rail frame, at least two carriages and the flipping caps in frame throughout (this is what keeps it from reading as a cube-wave demo). 10–65%: `uMerge` scrubs 0 → 6 in six clicks; within each click's slice the transition runs over the first 30% with a symmetric smoothstep then holds, so six distinct events land under the finger and reverse identically. Per level L: leader = `aCol mod 2^L == 0`; leaders scale x by 2^L and fetch the OU texture at their own column at `machineTime / 2^L`; members lerp toward their leader then scale to 0.001 inside it; caps follow the leader's width. Merged units tick slower and bigger while carriages keep sweeping and fills keep flipping caps. 65–78%: hold at level 6, one wide market. 78–100%: burst 6 → 0 with a lean kick (`sin(π · local)` along the split axis) and a 4k ink burst lifted from the copy line about thousands of lines, through an eight-row band, onto the re-emerging columns. Instance count never changes. On coarse pointers the section is 220vh with the six clicks over its middle 150vh, because a flick crosses 55vh in ~200 ms.

Copy, revealed per click: `people made languages higher and higher level so you could do more with less.` (clicks 1–4) · `that's the peak.` (hold) · `now a few sentences of plain english turn into thousands of lines of code.` (burst) · `what used to take a year takes an afternoon.` Six-rung mono ladder on the right lights per click: `bits · machine code · c · python · a library · a sentence`.

**03 · first.** Merge returns to 0 across the boundary. 0–30%: dolly to a macro on the six-part bot at the quoter's front-left corner (one bar, four cells, one ring with a spoke): a 2× scale pulse and a 120 ms cap flip every 1.6 s on a seeded chat cadence, exactly as since load. The only pose with one instrument in frame. 30–70%: one slow pull-back until bot and quoter share the frame. 70–100% dwell. The ink trickle now sources from this section's first line; every section's words feed the bench.

Copy: `the little one in the corner has been running since you got here.` · `the first thing i built that people actually used was a discord bot. seventh grade. my classmates.` · `i never really liked the coding. i liked watching it run.` Plate: `fig. 0 — v0. 6 parts. still pinging.`

**04 · kalshi.** The quoter has been trading since T0 + 2.05, so this section adds to it. 0–25%: the longest tracking shot on the page, a slow dolly along the full bed at a low oblique with the long lens; never side-on, never edge-on with a visible baseline. 15–45%: the **intake** compiles under the finger from the section heading: hopper at the headline side and chute onto the bed's near edge (~380 parts: bars, two rods, two rings, 24 tiles), pencil since frame zero, leader lines fading in at compile start and vanishing per lock, assembled still; its lever drops at the end of the slice and the first tile runs the chute onto the bed edge; the ladder ticks up to the quoter's full count. 45–100% dwell on the bed: 64 columns are markets; 48 rows are **price levels, not time**. Each column's cells form a depth mound centred on that market's mid (`height = 0.25 + 0.75 · exp(−|row − mid| / 4) · hashedSize`, clamped to [0.25, 1.0] of cell height, so the bed is a relief, never columns); the mid follows a precomputed Ornstein-Uhlenbeck path so the mound slides along the rows at rest; two hot cells straddle the mid at bid and ask offsets (his quotes); a carriage passing a column re-posts them; a fill flips the cap at the traded level for 300 ms showing its orange underside, then returns over 200 ms. Fill rate rises with |velocity| up to 3×. Hover a column (one invisible-plane raycast): it lifts 20% and a DOM mono readout of the machine's own numbers appears beside the cursor. There is no time axis, so it cannot be read as a price chart from any angle.

Copy: heading `a trading algo i wrote climbed into the top 100 in the world on kalshi.` Body: `it quotes crypto combos and arbs across kalshi's crypto markets. python, a multi-terabyte research set, order management, risk, reconciliation, monitoring. it runs without me.` Oversized mono figures in the copy column, static, labelled `as of sept 2026`: `30,000 live trades` · `2M contracts traded` · `top 100 all-time crypto profit leaderboard`. Mono status beside the static figures: `live on kalshi since jan 2026`. Plates: `fig. 1 — the quoter. quoting.` and `fig. 1b — intake. risk, reconciliation, monitoring.` plus the honesty line.

**05 · heron.** 0–15%: travel to a side pose on the balance, quoter trading in the background. 12–45%: `uCompile[balance]` scrubbed: ink lifts from the h2, passes an eight-row band, the post and the long rail slide home with a hard stop, 96 tiles ink in by birth order; the balance assembles still and level. Its lever (a short bar on the post cap) drops at the end of the slice and `run[balance] = 1`: the first liability tile lands and the rail tips for the first time, with a 0.6 impulse. Scroll up past that point and `run` damps to 0 over 250 ms (it decelerates rather than jumps), then un-inks to pencil in reverse birth order with the ink retracing into its heading; scroll down and it switches on again from where it stopped. 45–100% dwell: over an 8 s game clock, liability tiles stack on the left end and the rail tips; hedge tiles stack on the right until it re-levels (critically damped, no overshoot); at the whistle one hot sweep clears both sides.

Copy: heading `if the home team wins tonight, your drinks are free.` Body: `the bar doesn't eat that. heron prices the promo, carries the liability, and hedges it on prediction markets. co-founded it this summer. bars signed in four cities.` Mono: `co-founder · 2026`. Plate: `fig. 2 — the balance. tips, levels, clears.`

**06 · darch.** 0–15%: travel to a long, low pose along the splitter, balance and quoter behind. 12–40%: compile: intake rail, splitter block, twelve diverging rails and two spoked rings ink in from the h2, still, lanes empty, rings stopped. Its lever on the block drops: rings spin up, the first tile enters, hits the block and becomes twelve. Dwell: one in, twelve out, rate scaled from 3,000 jobs a month; lane speed rises with |velocity| so scrolling fast pushes throughput. The busiest machine by design.

Copy: heading `3,000 videos a month. 20 million people.` Body: `darch was a video pipeline. jobs in one end, clips out the other, nobody touching it. i ran engineering. 85% margins.` Mono: `co-founder, eng lead · 2025–26 · python, fastapi, node, ffmpeg`. Plate: `fig. 3 — the splitter. 1 in, 12 out.`

**07 · summers.** 0–15%: travel to a high, calm pose on the watch. 12–35%: the shortest build: a 48 × 16 field of short cells rises from a flat pencil grid, the scanning rail inks in parked at the left end; its lever at the rail's end drops and the rail starts sweeping. Dwell: smooth low baseline, rare seeded spikes (`hash > 0.995`), a hot ring on each when the scan passes, the rail pausing one beat on it. The calmest section by design.

Copy: heading `some machines just watch.` Body: `wvu medicine: anomaly detection over a pharmacy doing about $100m of claims a year. a spike in denials shows up as a spike. the model is going into production.` Smaller: `nist: a rag help-desk assistant and structured logging in an open webui fork.` Mono footnote: `orbit: semantic search over saved text, audio and video. won most innovative use of technology at tartanhacks 2025.` Plate: `fig. 4 — the watch.`

**08 · alive.** 0–60%: one long power2.inOut pull back and around to a 3/4 pose from behind the small machines, the long lens compressing the bench so balance, splitter, watch and bot are large in the foreground and the quoter is the wall behind. The trickle fades out over 20–40%. 60–100% dwell: this frame is the poster and the og image, rendered from the same layout code at build time. Nothing moves in the DOM except the uptime, large in the copy column.

Copy: `i've always loved building things. the best part is watching something i made come alive and keep going without me.` · `the world doesn't need one more guy who dreams in code. it needs people who've seen enough different things to spot the openings.` · `so that's the plan. build a lot of things, fast, in a lot of different places.` Uptime large in mono: `running 00:04:12`.

**09 · yours.** 0–25%: camera settles low at the front-right of the bench on the empty slot: four pencil rails and a slow scanning bar. A real labelled input (`maxlength=120`) sits in the copy column; each keystroke reseeds the scanning bar's cadence. On Enter, the third switch-on: the layout is the sentence (one bar per word, cap 24; one rail per sentence, cap 4; one spoked ring as the motor; one lever); its pencil drawing appears in the slot in 200 ms; the input's rendered text is sampled into the visitor ink partition (the only buffer upload after load); ink lifts off their words, passes an eight-row band, parts lock in birth order over 1.4 s, still; the lever drops and it pings on a cadence seeded from the sentence. Enter again tears it down in reverse birth order (600 ms) and builds the next; Escape clears. On phones the input blurs on Enter and the camera and scroll reframe so the slot sits above the keyboard. The sentence is only ever text content (input value, plate text, canvas sampler), never HTML, never stored, never in a URL.

Copy: `you're at the top of the stack too. type what you want to build.` Placeholder: `a sentence.` Live plate: `fig. 5 — yours. 9 words, 1 sentence. 12 parts. running 00:00:03.` Mono note: `(one bar per word. one rail per sentence. the real one goes to my inbox.)` Below: `ethan.wanq@gmail.com` as a large mono mailto with the typed sentence prefilled as subject, `github Not-Ethan`, `linkedin edw173`, `resume`, `case western, cs + math, may 2028.` Footer mono: `this page is one bench, N parts, built from the words on it.` where N is the inked total emitted from the layout at build time plus the visitor's parts live.

## 4. The bench and its machines

Bench: a compact cluster ~14 × 10 units on a paper ground plane. The quoter along the back; the bot at its front-left corner touching the frame; balance, splitter and watch in a row in front; the slot front-right. Machine origins and yaw live in `src/bench/bench.ts`.

Machine ids (`aMachine`): 0 quoter · 1 intake · 2 balance · 3 splitter · 4 watch · 5 bot · 6 slot · 7 visitor.

| machine | job it depicts | shape | parts (desktop, approx) | last part |
|---|---|---|---|---|
| quoter | Kalshi trading system | 12 × 4 × 8 rail frame with bilateral symmetry, four rails, a 64 × 48 bed of cells with caps, six carriages (~40 parts each), 24 rotors on rods with spokes | 3,072 cells + 3,072 caps + ~1,000 bars + 192 rods + 96 rings ≈ 7,400 | lever on the front-left post |
| intake | risk, reconciliation, monitoring | hopper at the headline side, chute onto the bed's near edge, 24 tiles | ~380 | lever on the hopper |
| balance | Heron: liability accrues, hedge levels it | a post, a long tilting rail, 96 tiles stacked at both ends | ~100 | lever on the post cap |
| splitter | Darch: one job in, twelve out | intake rail, splitter block, twelve diverging rails, two spoked rings, ~40 tiles | ~215 | lever on the block |
| watch | WVU: anomaly detection | a 48 × 16 field of short cells, a scanning rail | 769 | lever at the rail's end |
| bot | seventh-grade Discord bot | one bar, four cells, one ring with a spoke | 6 | none (runs from load) |
| slot | the visitor's empty slot | four pencil rails, one scanning bar | 5 | none |
| visitor | the visitor's sentence | bars = words (cap 24), rails = sentences (cap 4), one spoked ring, one lever | ≤ 30 (reserve, scale 0 until built) | lever |

About 8,900 inked parts at the end on desktop. Phone divides every config's density by 4 and drops caps (~1,800).

**The quoter's macro layout is hand-authored** as JSON of ~24 named modules with a three-size scale system; `layout()` fills repeats, birth order, jitter and exploded offsets only. This is the single point of failure (§14) and is gated by a still before any motion work.

## 5. Layout system (`src/bench/`, pure TypeScript, runs in Node and the browser)

`layout(config: MachineConfig, seed: number): LayoutResult` expands a config into per-instance records, deterministically (`seed = hash(headline)`), so the browser, the build-time SVG emitter and every printed count agree.

```ts
type Kind = 'static' | 'sweep' | 'spin' | 'cell' | 'cap' | 'lever' | 'lane' | 'scan' | 'ping' | 'stack' | 'tilt';
type Primitive = 'cell' | 'cap' | 'bar' | 'rod' | 'ring' | 'tile';

interface PartInstance {
  machine: MachineId;      // 0–7
  primitive: Primitive;    // which InstancedMesh it belongs to
  kind: Kind;              // which vertex-shader behaviour
  slot: { position: [x,y,z]; quaternion: [x,y,z,w]; scale: [x,y,z] };  // rest pose
  explode: [x,y,z];        // axis-aligned 0.6–1.4 units plus hashed tilt for modules; zero for bed/field cells
  birth: number;           // 0–1, strict hierarchy: frame → bed → carriages → rotors → lever
  param: [a,b,c,d];        // per-kind: rail axis + period + phase, or lattice i,j, or pivot data
  col: number;             // bed column (quoter) or lane index
  module: string;          // for leader lines and SVG grouping
}

interface LayoutResult {
  parts: PartInstance[];
  byPrimitive: Record<Primitive, PartInstance[]>;
  counts: { total: number; inkedAtEnd: number; byMachine: Record<MachineId, number> };
  leaderLines: Array<{ from: [x,y,z]; to: [x,y,z]; birth: number; machine: MachineId }>;
}
```

Primitives (one `InstancedMesh` each, one shared patched material):

| primitive | geometry | used by |
|---|---|---|
| cell | Box(0.8, 1, 0.8), origin at base | quoter bed, watch field, bot, visitor bars |
| cap | Box(0.8, 0.03, 0.8), pivoted on one edge | quoter bed (desktop only) |
| bar | Box(1, 0.12, 0.12) | frames, rails, carriage bodies, posts, splitter block, ring spokes, levers |
| rod | Cylinder(r 0.05, 8 seg) | axles |
| ring | Torus(0.5, 0.06, 8, 24) | rotors, each with one bar spoke |
| tile | Box(0.2, 0.02, 0.2) | balance stacks, splitter and intake payload |

`instanceMatrix` is uploaded once from `slot` and never touched again; all animation lives in the vertex shader.

Other pure modules in `src/bench/`: `bench.ts` (machine placement), `camera.ts` (pose table, `evaluatePose(g, tier)` with hold-then-move timing, per-tier tables), `sections.ts` (section ids, heights, machine per section, phase timings), `ou.ts` (OU texture generator), `counts.ts`, `hash.ts` (mulberry32 and hash, moved from `journey.ts`), `configs/*.ts` (one file per machine), `visitorLayout.ts` (sentence → config).

## 6. Rendering (`src/gl/`)

Single fixed R3F `Canvas` behind the DOM. `gl: { antialias: true, powerPreference: 'high-performance' }`, WebGL2 required (instancing, `sampler3D`); otherwise the SVG tier. `scene.background` equals the theme's paper color. No postprocessing, no fog, no environment map.

**DPR / MSAA:** desktop default DPR 1.25 with 4× MSAA, promoted to 1.5 only if the measured frame budget allows; phone DPR 1 with 2× MSAA.

**Material:** one `MeshStandardMaterial` patched via `onBeforeCompile` with `customProgramCacheKey` set. Roughness 0.55, metalness 0.08, ±0.08 per-instance roughness jitter, height-based darkening at the base for cheap contact AO.

Per-instance attributes: `aSlot` (position, quaternion, scale packed as three vec4/vec3 attributes), `aExplode` vec3, `aBirth` float, `aMachine` float, `aKind` float, `aParam` vec4, `aCol` float.

Uniforms: `uCompile[8]`, `uMachineTime[8]`, `uRun[8]`, `uFillRate[8]`, `uTilt` (balance), `uTime` (wall, for ink and trickle only), `uVel`, `uMerge`, `uLean`, `uHover` vec2 (machine, column), `uPointer`, `uOU` sampler2D, `uActive`, `uContact` vec2[8], `uGlyph`, `uLines`, and the palette: `uPaper`, `uInkTop`, `uInkKey`, `uInkShade`, `uPencil`, `uHot`.

**Vertex chunk** (`src/gl/shaders/common.glsl.ts` + one file per kind under `src/gl/shaders/kinds/`, concatenated by `src/gl/shaders/assemble.ts`):

```
a = smoothstep(aBirth, aBirth + 0.06, uCompile[aMachine]);
position = mix(aSlot + aExplode, aSlot, expoOut(a)) + settle(a) * 0.06;
```

- `lever`: rotates about its pivot from 30° to 0 with expoOut, no settle.
- `cell`: height = `mix(0.05, processHeight, a)`; quoter cells read the depth profile around the OU mid at `(aCol, wrapped machineTime)`; hot flag where `row == mid − bidOffset || row == mid + askOffset`; merge logic per §3.1/02; hover lift.
- `cap`: fill at the traded level flips: smoothstep to 1.08π over 120 ms, hold 300 ms, return over 200 ms.
- `spin`: angular rate = `base + k · uFillRate[machine]` (a tachometer, not an ornament); every ring has a bar spoke so spin is visible.
- `sweep`: carriage travel along the rail axis, `sin` with 1.6–6 s periods from `aParam`.
- `lane`: `travel = fract(mt · rate · (1 + 2|uVel|) + phase)` with a split at the lane midpoint (splitter) or a straight run (intake).
- `scan`: field baseline = smooth noise, spike where `hash > 0.995`; scan rail = triangle wave that pauses one beat on a spike.
- `ping`: seeded 2× scale pulse on a chat cadence.
- `stack` / `tilt`: balance tiles appear by the 8 s game clock; rail and post-cap parts rotate by `uTilt`, critically damped in JS.
- Every mechanical motion reads `uMachineTime[aMachine]`, so parts are parked and processes frozen until the lever locks.
- Velocity stretch along the camera travel axis up to 1.3×, decaying at rest.

**Fragment:** below `a = 0.6` the part is flat unlit pencil (`uPencil`, no specular, no shadow receive); above it, ink with three-tone face shading added to the PBR result from the world normal (top `uInkTop`, key side `uInkKey`, shade `uInkShade`) so near-black geometry keeps edge contrast on paper. Emissive `uHot` at 0.6 on events (cap undersides on fills selected by the flipped normal, his quotes, a clear, a spike ring, a ping) so it reads as running, not glowing. If three-tone reads flat in the day-1 still, a tiny procedural PMREM is the fallback.

**Depth:** the same vertex chunk is injected into a `customDepthMaterial` that writes `gl_Position` outside the clip volume while `a < 0.6`, so pencil casts no shadow and inked shadows follow the animation exactly. `frustumCulled = false` with fitted bounding spheres. `receiveShadow` on the kits.

**Leader lines:** one `LineSegments` draw of hairlines from each module part's exploded position to its slot, pencil color, per-vertex `aBirth` and `aMachine`, `alpha = smoothstep(0, 0.02, uCompile[m]) · (1 − a)`. They exist only while a machine is compiling: quoter modules (hero) and intake (04) only; never cells, never the small machines; desktop only; `uLines` is a runtime kill switch. The SVG hero plate draws exactly the same lines so the cross-fade is consistent. If the day-3 still shows shimmer, the lines come out of both.

**OU texture:** the only process texture, precomputed once on the CPU with a seeded RNG: 256 markets × 2048 steps, RGBA8 (mid level 0–47, bid offset, ask offset, fill flag with Hawkes-style clustering), 2 MB, linear filtering, no float dependency. Every other machine is a pure function of its clock and hashes, so the scene is stateless and reversal is exact.

**Light:** one `DirectionalLight` upper-left-front, intensity 2.4, `castShadow`, orthographic shadow camera fitted each frame to `uActive` plus its immediate neighbours and lerped with the camera pose, 2048 PCFSoft on desktop stepping to PCF then 1024, `normalBias` tuned against the 0.12-unit bars. `HemisphereLight` sky = paper, ground = shadow tone, 0.6.

**Ground:** a 200 × 200 paper plane with `ShadowMaterial` at 0.22 opacity (light) / 0.5 (dark), a 1-bit dither against banding, radial contact darkening under each machine (`uContact`); no distance fade. On phone there is no shadow map and contact darkening carries the grounding.

**Camera:** `PerspectiveCamera` fov 30 (long lens, product photograph); nine authored poses (position, lookAt, fov) in `src/bench/camera.ts` evaluated from `g` with hold-then-move timing; the hero pose is the SVG's pose; per-tier tables (desktop, phone portrait). Pointer parallax ±2°, damped.

**Draw calls at rest:** 6 instanced + 6 shadow + 1 points + 1 ground + 1 lines during compiles = 14–15.

## 7. Ink (`src/gl/Ink.tsx`)

One `gl.POINTS` draw, stateless, no FBO, fixed partitions so nothing is uploaded on the scroll path.

Partitions (desktop): quoter 32,768 (a hashed 2% double as the trickle after the compile), intake 4,096, merge burst 4,096, balance 4,096, splitter 4,096, watch 4,096, visitor 4,096 = 57,344. Phone 12,288 scaled the same way.

**Registration:** `aSpawnUV` is the point's position inside its source element's box, sampled once after `document.fonts.ready` from an offscreen 2D canvas of the same text in the same font string at a 3 px stride (`src/gl/textSampler.ts`); re-sampled on debounced resize. Each frame `useFrame` writes `uRect[8]`, each source element's viewport rect in NDC from its page rect cached at layout minus the Lenis scroll offset (`src/gl/rects.ts`); the hero's sticky block is computed analytically from its section's cached rect: `viewportTop = max(min(sectionTop − scroll, 0), sectionTop + sectionHeight − blockHeight − scroll)`. No per-frame `getBoundingClientRect` anywhere. If canvas metrics differ from the DOM by more than 6%, spawn from a blurred glyph density instead.

**Flight:** the vertex shader forms spawn in NDC at a fixed text-plane depth, projects `aTarget` through the real camera, and blends in NDC: `p = quadraticBezier(spawn, ctrl, target, easeOutExpo(t)) + curl(aSpawnUV · 2, aSeed, uTime · 0.15) · sin(πt) · (0.6 + 2.0|uVel|)`, curl from a 32³ RGBA8 `Data3DTexture` baked once (`src/gl/curl.ts`). Depth: in-flight z sits at the near end of the clip range for `t < 0.9` and blends to a hair in front of the target's depth over 0.9–1.0, so dots are never swallowed by nearer frame rails mid-flight and are hidden by their part only once landed; `depthTest` on, `depthWrite` off.

`t = clamp((uCompile[m] − aSeed · 0.4) / 0.6, 0, 1)` for compile points; keyed to burst progress for the merge partition; `fract(uTime · 0.12 + aSeed)` for trickle points gated to the active partition (off in 08).

**Rows band:** for `t ∈ [0.28, 0.62]`, `p` is pulled by a smooth bump toward a row-quantized point on a screen-aligned band a third of the way from the rect toward the target centroid: y snapped to a 14 CSS-px pitch (~40 rows for the quoter, 8 for the small machines and the visitor's), x from a left margin by `aRow` within a hashed line length so rows end ragged like code, rows appearing top to bottom over the first 150 ms (a printing front), holding, then releasing toward parts. Default rendering is 2 px dots in rows. `uGlyph = 1` renders a hashed 15% at 12 px × DPR from a 512 × 256 runtime canvas atlas (16 × 4 JetBrains Mono glyphs) through `gl_PointCoord`; off by default, enabled only if the T0 + 0.6 s still earns it. Trickle points never enter the band. If the band is ever cut, the ladder drops its "lines" rung so the page never prints a step the scene did not show.

`alpha = 0.85 · smoothstep(0, 0.03, t) · (1 − smoothstep(0.92, 1, t))`; size 0 when done; drawn after the kits, never sorted.

## 8. Scroll and clocks (`src/scroll/`, `src/gl/Clocks.ts`)

**Lenis only.** `lerp: 0.1`, no snap, `syncTouch: false` (native touch). The resistance valley in the old `SmoothScroll.tsx` is deleted. Lenis writes progress, scroll and velocity into refs; `useFrame` reads them and writes uniforms; React never re-renders for scroll. `scrollTo(sectionId)` for nav, plates and keyboard section jumps.

**Four clocks:**
1. **Scroll time**, scrubbed: camera, merge clicks, lean, the intake's and small machines' compiles, the pull-back, plate and ladder highlights are pure functions of `g` from one `sceneState(g)` table and reverse exactly.
2. **Triggered time**, once or on event: the hero compile (2.2 s from T0), click-to-rebuild, the visitor compile (1.4 s) and teardown (0.6 s), DOM line reveals. framer-motion's `animate` or a 20-line tween helper.
3. **Machine time**, one clock per machine, integrated in JS as `mt[i] += dt · run[i]`, `run[i]` damped over 250 ms toward the lever's lock state. The bot's runs from load. A built machine never stops while inked. A machine scrubbed back to pencil decelerates to a stop and resumes from where it stopped. The uptime runs on wall time.
4. **Velocity**, decaying: Lenis velocity normalized, clamped, damped with τ 180 ms into `uVel`; on touch, derived from scroll deltas so velocity effects are not silently zero on phones. Parts stretch along the travel axis up to 1.3×, ink curl amplitude rises, fill and sweep rates up to 3×, lanes speed up; all decay at rest; nothing in the DOM responds to velocity.

**Switch-on rule:** every machine's last part in birth order is a lever that drops 30° → 0 with the hardest stop on the page; its lock is the cause the eye follows. On the upward crossing JS sets `run[i] = 1`, fires a 0.6 `uVel` impulse decaying over 400 ms and a 1 s rate spike. The quoter's lever drops on the clock at T0 + 2.05, the intake's and the small machines' under the finger at the end of their scrubbed compile slices, the visitor's on Enter.

**Pointer:** ±2° damped camera parallax; in evidence sections one invisible-plane raycast per machine resolves the cell, sets `uHover`, lifts it 20% and positions a DOM mono readout beside the cursor. No custom cursor, no magnetic buttons.

**Keyboard / a11y:** sections are landmarks; tab order follows the DOM; the canvas is `aria-hidden`; the input is a normal labelled form control; the rebuild control is a real button; counters are static text with `aria-live` off; arrow and page keys move by section.

## 9. Theme, type and layout (`src/theme/`, `src/app/globals.css`)

**Palettes** (`src/theme/palettes.ts`; CSS custom properties on `:root[data-theme]`, and GL uniforms lerped over 300 ms on change):

| token | paper (light) | drafting (dark) | used for |
|---|---|---|---|
| paper | `#F1EEE9` | `#17171A` | page, bench, scene background (identical) |
| ink | `#141416` | `#ECE8E0` | type, ink dots |
| inkTop | `#34343A` | `#F2EEE6` | top faces of built parts |
| inkKey | `#222226` | `#E0DBD2` | key-side faces |
| inkShade | `#141416` | `#C9C3B8` | shade faces |
| pencil | `#B9B4AC` | `#4E4E56` | unbuilt parts, leader lines, hairline rules |
| hot | `#FF4A1C` | `#FF5A2C` | events and things currently running; the only signal color |
| shadow | `#D8D3CB` | `#0A0A0C` | ground shadow tone, hemisphere ground |

Theme resolution: `localStorage.theme` → `prefers-color-scheme` → paper. An inline script in `<head>` sets `data-theme` before first paint. The toggle in the nav is a real button labelled `light` / `dark`. The hero SVG and fallback plates use `currentColor` and CSS variables so they flip with the DOM. No gradients except the contact darkening; no glow, grain, vignette, glass, fog.

**Typography:** Archivo variable, self-hosted via `next/font/local` with `adjustFontFallback` so the SSR headline paints in a metric-matched fallback and the DOM rect never moves on swap; wght 500–800, never animated. Display `clamp(2.75rem, 8vw, 8rem)`, weight 700, line-height 0.92, tracking −0.03em, lowercase only, no italics, always full sentences in his voice, never titles; body 18–20 px at 500, max 34ch. JetBrains Mono variable at 12–14 px, lowercase, +0.04em tracking, tabular numerals, for every live number, the ladder, the uptime, nav, plates, ladder rungs and links, plus oversized mono figures (48–72 px) for the evidence numbers inside the copy column. No kinetic type; no font axis is ever animated.

**Layout:** copy in a left column (grid columns 1–5 of 12, max 34ch) flat on paper with 1 px pencil rules, no cards, panels, blur or borders; the bench occupies the right 60% in most framings and the full width in the hero and the poster shot; copy and machines never overlap on desktop (no paragraph sits over more than 20% machine coverage at any breakpoint, baked into every camera pose). Each machine carries a mono plate pinned to its projected foot like a figure in a technical book, pencil-toned until inked, ink after; the quoter's plate is also the rebuild control. Fixed mono chrome: nav top-right (`kalshi · heron · darch · summers · contact · resume · light/dark`), section strip bottom-left, the ratio ladder under the deck in the hero and pinned bottom-right as the uptime afterwards. Evidence numbers sit inside the copy column as oversized mono figures, not tiles.

**DOM motion:** triggered line reveals on `[data-reveal]`, translateY 100% → 0 plus opacity, 0.5 s power3.out, stagger 0.06, reversing on scroll-back; in 02 keyed to the merge clicks; no count-ups on real numbers; no parallax on text; no springs, no hover wobble. Ladder, plate and section-strip highlights are imperative class toggles from `useFrame`, written after all rect reads in the frame.

**Phone layout:** single column, copy in the upper 45% on plain paper (verified to fit headline, deck and ladder at 375 × 667; the deck drops below the bench if it does not), bench framed in the lower 55% at every section along the active machine's long axis, plates collapse to one line, nav collapses to `menu` and `resume`, 16 px gutters, no horizontal scroll.

## 10. Build-time emitter (`scripts/emit.ts`, run by `npm run emit` and `prebuild`)

A Node script (via `tsx`) imports `src/bench/*`, runs `layout(config, seed)` for every machine, projects through the hero pose (landscape and portrait) and the poster pose using three's `PerspectiveCamera` + `Vector3.project`, and emits:

- `src/generated/heroPlate.ts`: the hero SVG (landscape and portrait variants) as string constants, `viewBox="-1 -1 2 2"`, which the page scales in x by `referenceAspect / currentAspect` so it matches the GL projection at any viewport. Quoter as a tight pencil plate with module leader lines and the bed as one pattern-filled polygon; the bot's six parts as solid ink; the small machines' pencil outlines cropped at the frame edge. ~40 kB, inlined in SSR HTML. Colors via `currentColor` and CSS variables.
- `public/plates/<machine>.svg`: assembled ink plate per machine capped at 2,500 rects, largest first, with a flat ellipse shadow; fetched only when the GL tier fails, never inlined.
- `src/generated/counts.ts`: every count the DOM prints (ladder totals, per-machine plate counts, footer total), so no total is ever hand-typed.
- `src/generated/poses.ts`: the camera pose table snapshot the SVG was rendered with (guards drift between emitter and runtime).
- `public/og.png` (1200 × 630) from the poster pose via `@resvg/resvg-js`, in the paper theme.

Generated files are committed so `next build` never depends on the script having run, and CI runs `npm run emit` and fails on a diff.

## 11. Tiers, warm-up and fallbacks

**Warm-up:** the Canvas mounts at opacity 0 behind the SVG. After `document.fonts.ready`, `await renderer.compileAsync(scene, camera)`, render one frame with the shadow map. Only when both are done does the canvas cross-fade over the SVG in 200 ms. T0 budget is 0.8–1.2 s cold on an integrated-GPU laptop; the SVG is a finished poster, not a loader.

**Phone tier** (`src/gl/useTier.ts`, from the old `detectLowTier`: pointer coarse, width < 820, or `hardwareConcurrency ≤ 4`; plus drei's `PerformanceMonitor` demoting desktop after 60 frames under 50 fps): every config's density divided by 4 (bed 32 × 24), no cap kit (fills flip the cell's top face hot instead), ~1,800 instances; 12,288 ink points with the rows band as dots (no glyph atlas); no GL leader lines (the SVG frame keeps them); no shadow map (contact darkening only); DPR 1, 2× MSAA, fov 38; the hero pose is a macro on the bed's front corner with two carriages, the lever and the bot, so cells are 12+ px and the switch-on reads; portrait camera poses with machines in the lower 55%; hover replaced by tap-to-readout; velocity from scroll deltas, stretch halved; compileAsync warm-up still runs; the still-then-lever intro is kept; the small compiles still scrub and switch on under the thumb; the input still builds, with blur-on-Enter and a reframe so the slot sits above the keyboard. Section 02 is 220vh.

**Step-down ladder** on any tier if frame time exceeds 20 ms for 60 frames: DPR 1.5 → 1.25 → 1 first, then PCFSoft → PCF → 1024 → contact only, then `uGlyph = 0`, then point count halves, then `uLines = 0`.

**Reduced motion:** intro skipped and `uCompile[quoter]` pinned to 1 with `run = 1`, so the quoter renders fully built and working at 0.3× rate; the small machines flip pencil to ink in a 300 ms fade at section entry with no ink transit, no rows band, no still beat and no impulse, and run at 25% rate; the bed steps at 1 Hz with no interpolation; caps do not flip (hot is a static highlight); trickle off; velocity off; camera moves become 400 ms crossfades between poses; DOM reveals become plain fades; the merge clicks still follow scroll because they are user-driven, without the lean kick; the visitor's compile is a 300 ms fade; the uptime still counts.

**No WebGL / SSR:** on context loss, no WebGL2, or a failed instancing check, the error boundary keeps the hero SVG visible and fades in the ink plates section by section with ~24 hot rects ticking on CSS keyframes (paused under reduced motion); the input adds bars = words and rails = sentences to the slot as SVG rects in plain JS. Headline, ladder (final values), copy, plates, links, the input and the resume are server-rendered DOM in every tier, so the DOM is the complete site on its own. A `?nogl=1` query parameter forces this tier for testing.

## 12. Performance budget and silent killers

Budget on an Iris Xe class laptop at 1440 × 900 × 1.25: instanced ~2.5 ms, shadow pass ~1.5–2.5 ms, points ~0.6 ms (+~1 ms during a band), MSAA resolve ~1.5–2 ms: 7–9 ms. Phone ~7 ms on an A15 or mid Android.

Never: per-frame `instanceMatrix.needsUpdate`; React state on the scroll path; `EffectComposer`; `backdrop-filter` or `box-shadow` over the canvas; font-variation animation; sorted transparency; buffer uploads on scroll; per-frame `getBoundingClientRect`; analytic noise in the vertex shader; first-frame shader compile; a global shadow camera; hand-typed counts.

## 13. Module layout

```
src/
  app/layout.tsx            fonts (next/font/local), theme pre-paint script, metadata, og
  app/page.tsx              <Site />
  app/globals.css           palette tokens, type system, DOM styles
  theme/palettes.ts         the two palettes as typed objects
  theme/ThemeProvider.tsx   context + toggle + localStorage; themeScript.ts for pre-paint
  scroll/ScrollProvider.tsx Lenis; progress/scroll/velocity refs; section ranges; scrollTo
  bench/                    pure TS (no React, no DOM): types, hash, layout, bench, camera, sections, ou, counts, visitorLayout, configs/*
  gl/Scene.tsx              Canvas, warm-up, cross-fade, error boundary, tier
  gl/Kits.tsx               six InstancedMeshes from LayoutResult; attributes
  gl/material/              inkMaterial.ts (patch), depthMaterial.ts, uniforms.ts (registry + palette lerp)
  gl/shaders/               common.glsl.ts, fragment.glsl.ts, assemble.ts, kinds/<kind>.glsl.ts, ink.vert.ts, ink.frag.ts
  gl/Ink.tsx                points system; textSampler.ts; rects.ts; curl.ts
  gl/Clocks.ts              per-frame driver (useFrame priority -1): machine clocks, run states, lever lock, impulses, uniforms
  gl/CameraRig.tsx          pose evaluation, parallax, velocity
  gl/Lights.tsx  gl/Ground.tsx  gl/LeaderLines.tsx  gl/Hover.tsx  gl/useTier.ts
  site/Site.tsx             providers + Scene + Chrome + sections
  site/chrome/              Nav.tsx, SectionStrip.tsx, Ladder.tsx (ratio ladder + uptime), ThemeToggle.tsx
  site/sections/            Sentence.tsx, More.tsx, First.tsx, Kalshi.tsx, Heron.tsx, Darch.tsx, Summers.tsx, Alive.tsx, Yours.tsx
  site/Plate.tsx  site/Reveal.tsx  site/Readout.tsx
  site/copy.ts              every string on the page, in his voice
  site/facts.ts             the public numbers, with asOf
  fallback/StaticPlates.tsx hero SVG + lazy ink plates + no-GL input behaviour
  generated/                heroPlate.ts, counts.ts, poses.ts (emitted, committed)
scripts/emit.ts             build-time emitter
public/plates/*.svg  public/og.png  public/resume.pdf
```

Boundaries: `bench/` has no React or DOM imports and is the only place geometry, counts, poses or sections are defined. `gl/shaders/kinds/*` are the only files that know a kind's motion. `site/copy.ts` and `site/facts.ts` are the only files with user-facing strings. Anything printed as a number comes from `generated/counts.ts` or `facts.ts`.

## 14. Gates and fallbacks

Each gate is a screenshot judged before the next stage starts.

| gate | when | passes if | if it fails |
|---|---|---|---|
| G1 quoter still | after kits + configs + shading | the assembled quoter at the hero pose reads as a designed instrument in both themes; pencil plate reads as a drawing | re-author modules once; on a second failure, switch to the fallback archetype (fewer, larger modules; press/plotter silhouette; 8 rotors) |
| G2 ink and intro | after Ink + Clocks | stills at T0+0.3, 0.6, 1.2, 2.2, 3.0 show ink lifting off the real glyphs, rows reading as lines, parts locking, the still beat, then the switch-on | thin the stream; shorten the still by moving the lever's birth earlier, never before the bed completes; drop the band and its ladder rung |
| G3 bed reading | after the OU bed and kalshi pose | the bed cannot be read as a chart; frame, carriages and caps in frame; hover readout works | re-author the pose; reduce height range |
| G4 poster | after 08 | the pull-back frame works as a poster and og image in both themes | re-author the pose |
| G5 performance | before merge to main | draw calls ≤ 15 at rest; frame time under budget on the dev machine; step-down ladder verified by forcing it | apply the step-down defaults |
| G6 tiers | before merge | phone 390 × 844, reduced motion, and `?nogl=1` each read as a complete site with no console errors | fix before merge |

## 15. What is kept, deleted and added

**Kept (moved or renamed):** the Lenis provider shape and `MotionValue` progress from `src/components/scroll/SmoothScroll.tsx` (minus the valley); `detectLowTier` and the error boundary from `ForestCanvas.tsx`; the damped-value pattern from `CameraRig.tsx`; the reveal helper idea from `sections/reveal.ts`; `mulberry32` from `journey.ts`; JetBrains Mono.

**Deleted:** `src/components/three/*` (Forest, Sky, Aurora, Water, Atmosphere, Effects, forestGen, textures), `src/lib/journey.ts`, `Journey.tsx`, `JourneyClock.tsx`, `TrailNav.tsx`, `Navbar.tsx`, `Hero/About/Experience/Projects/Contact.tsx`, `src/lib/data.ts`, the screenshot PNGs in the repo root, `resume2.pdf` (replaced by `public/resume.pdf` from the Sept 2026 resume), `@fontsource/fraunces`, `@fontsource/schibsted-grotesk`, `@react-three/postprocessing`, `react-icons`.

**Added:** `@fontsource-variable/archivo`, `@fontsource-variable/jetbrains-mono` (font files copied into `src/app/fonts/` for `next/font/local`), `tsx` and `@resvg/resvg-js` as dev dependencies.

## 16. Verification

- `npm run lint`, `npx tsc --noEmit`, `npm run emit` (no diff), `npm run build` all clean.
- Playwright: desktop 1440 × 900 and phone 390 × 844, both themes, screenshots at every section going down and back up; console has zero errors; stills for every gate in §14.
- Reduced-motion emulation renders the built quoter with no intro.
- `?nogl=1` renders the SVG tier with plates and a working input.
- The page prints no number that is not in `facts.ts` or `generated/counts.ts`; a grep for `$20`, `#75` and `75` in `src/` returns nothing user-facing.
- Every sentence of copy passes a "would he text this" read against his own passage.
