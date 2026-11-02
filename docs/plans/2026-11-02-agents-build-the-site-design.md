# Agents Build the Site: design

Date: 2026-11-02. Replaces the "Only Running Things Glow" valley (merged 2026-10-13) in full.

## 1. Intent

Ethan asked for two things, in his words: "make it like this website (layout wise) https://www.aahil-khan.xyz/" and "I want it to look like a swarm of AI agents are building the website as you scroll. So for each main element have a cursor drag a selection box over its bounding box that reveals the element and makes it look like it's being built in real time."

So the site becomes a conventional single-page portfolio with the reference's layout, type scale and visual system, and the one effect that makes it his: the page is empty until a swarm of named, coloured cursors draws each element in, Figma-style, as you scroll. The effect is the argument of the site made visible (a few sentences of plain language now turn into thousands of lines of code; the agents are "building" his page in front of you), and it is also a joke he is in on: the door card at the bottom says they don't exist.

## 2. Goals, non-goals, anti-goals

**Goals**
- Layout fidelity to the reference: same section order, same grid (1180 px wrap, 1036 px content column), same type scale and weights, same card language (2 px ink borders, 14 px radius, hard offset shadows), same cream canvas with a faint grid in the hero, same light theme.
- The swarm: every main element is drawn in by a cursor dragging a selection box over its bounding box; the element is revealed inside the box as it is drawn; several agents work at once; it reads as "being built in real time".
- Static export, zero maintenance, no real-world hooks (standing rule).
- Ethan's voice in every string. Lowercase, blunt, full sentences. The name in the hero is uppercase through CSS only.
- Phone works and the effect still plays there (fewer agents).

**Non-goals**
- No theme toggle, no dark mode. One light theme.
- No project write-up pages, no /canvas, no blog. One page.
- No photos. The "portrait" slot becomes the agents' build log.
- No three.js, no R3F, no Lenis, no framer-motion. Plain React, CSS, one requestAnimationFrame loop.

**Anti-goals (failures even if it works)**
- A page that is readable before the agents touch it (the empty canvas is the point) or a page that stays empty because the queue stalled.
- Cursors that move in lockstep, all start together, or all finish together. It must look like a swarm, not a synchronized animation.
- Jank. The cursors are DOM nodes updated with transforms; nothing reflows per frame.
- Any string that sounds like a resume bullet or like marketing.
- The forbidden numbers (dollar profit, exact leaderboard rank, notional, "contracts") or the phone number anywhere in the site. No resume link, no resume file (the resume is private, Ethan 2026-10-09).

## 3. Constraints (standing)

- Next.js App Router with `output: 'export'`, React 19, Tailwind 4 for utilities, vitest for tests. No API routes, no server, no fetch, no keys, no cron, no shared state. Fonts self-hosted (`@fontsource-variable/space-grotesk` for the display face, the existing local JetBrains Mono for mono).
- Copy lives in `src/site/copy.ts`; numbers come from `src/site/facts.ts`. Tests enforce lowercase, no em/en dashes, no forbidden numbers, no phone, no "resume".
- Subagents: Sonnet implements, Opus reviews and judges visuals. Never Fable.
- Email: `ethan.wanq@gmail.com`. GitHub `Not-Ethan`. LinkedIn `edw173`.

## 4. Visual system

Tokens (match the reference exactly where it is measurable):

```
--canvas: #f7f5ee        page background
--canvas-2: #e3e1da      toolbox band
--canvas-3: #f3f3f3      work band
--canvas-4: #d8d6d0      closer + footer band
--grid: rgba(22,22,22,0.11)   hero grid lines (2 px every 88 px)
--surface: #ffffff       cards
--ink: #161616
--ink-muted: rgba(22,22,22,0.74)
--ink-subtle: rgba(22,22,22,0.60)
--accent: #facc00        yellow
--border: #161616; --bw: 2px
--radius-card: 14px; --radius-chip: 8px; --radius-pill: 999px
--shadow-2: 2px 2px 0 0 var(--ink); --shadow-4: 4px 4px 0 0 var(--ink); --shadow-6: 6px 6px 0 0 var(--ink)
--ease-out: cubic-bezier(.16, 1, .3, 1)
```

Type: Space Grotesk variable, body 17 px / 1.65, weight 400. Scale at 1440 px: eyebrow 12 px / 500 / uppercase / 0.14 em tracking with a 1 px rule to its right; h1 name 168 px / 700 / uppercase / -0.045 em / line-height 0.82; hero headline 60 px / 500 / -0.02 em / 1.12 with a bold run; h2 36 px / 700; about lede 30 px / 500; case h3 48 px / 700 / -0.03 em; closer h2 96 px / 700 / -0.04 em / 0.95; closer mail 32 px / 500 with a 3 px yellow underline. Mono (JetBrains Mono) only for the agents' HUD: cursor tags, box labels, build log, status pill, case numbers ("01 / 2026 · trading").

Fluid sizes: name `clamp(64px, 11.7vw, 168px)`; headline `clamp(28px, 4.2vw, 60px)`; closer h2 `clamp(48px, 6.7vw, 96px)`; case h3 `clamp(32px, 3.3vw, 48px)`.

Components: `.btn` (pill, 2 px border, white, shadow-4, 52 px tall, "see the work" with a yellow circle arrow icon at the right); `.btn-accent` (yellow fill); `.ghost` (dashed 2 px pill, muted text, with a small badge pill inside in yellow, 11 px bold); `.card` (white, 2 px border, 14 px radius, shadow-4, 32 px padding; `.card-6` uses shadow-6 and 14 px padding for the work shots); `.chip` (white, 1.5 px border at 24 % ink, 8 px radius, 15 px, 6 px 14 px padding); `.eyebrow`; `.wrap` (max 1180 px, 72 px side padding at ≥1280, 20 px at phone; content column 1036 px centred inside it); `.totop` (48 px round, fixed bottom-right 32 px, appears after 600 px of scroll).

Hero backdrop: the grid (`linear-gradient` lines, 88 px cells, offset so a line sits 36 px from the left), a radial white glow at 50 % 6 % at 70 % alpha fading by 40 %, and a soft yellow glow (`radial-gradient(circle 220px at 19% 50%, rgba(250,204,0,0.28), transparent)`; on phone `circle 180px at 70% 52%`) behind the name. These are static.

## 5. Layout, section by section (desktop 1440 × 900; phone 390 × 844)

Section ids: `top`, `about`, `toolbox`, `experience`, `work`, `rest`, `contact`.

1. **Bar** (fixed, 64 px, canvas at 88 % with `backdrop-filter: blur(8px)`, 1 px bottom rule at 10 % ink; once the page is scrolled more than 8 px the rule becomes 2 px solid ink, as in the reference). Left: mark `ew`, 46 px square, yellow, 2 px border, 8 px radius, 700. Right: links `about · work · experience · contact` 15 px / 500 / muted; then the status pill (see §7, desktop only); then `say hi ↗` pill (`.btn` at 42 px tall, shadow-2) → `mailto:`. Phone: mark, status pill hidden, links hidden, `say hi` pill kept.
2. **Hero** (`#top`, min-height 100 svh, content column starts 145 px from the top). Eyebrow `cleveland, ohio`. Name on two lines `ethan` / `wang` (uppercase via CSS). Headline with a bold run. Actions row: `.btn` "see the work" → `#work`; `.ghost` with dot, text and badge → `#about`.
3. **About** (`#about`, 108 px vertical padding). Section head (eyebrow + h2). Two columns 386 px + 578 px with 72 px gap: left a `.card` that is the build log (§7.6), fixed height 482 px to match the reference portrait slot; right the lede (30 px) then three notes paragraphs (17 px, muted).
4. **Toolbox** (`#toolbox`, band `--canvas-2`, 81 px padding). Section head. Then five rows, each a 152 px label column (12 px uppercase eyebrow style, subtle) and a wrap of chips; rows separated by 1 px rules at 10 % ink.
5. **Experience** (`#experience`, 108 px padding). Grid 319 px index + 637 px detail, 80 px gap. Index is `position: sticky; top: 96px`: section head then an `ol` of five items (name 17 px / 500 and a sub-line 13 px subtle); the item whose card is nearest the viewport centre is highlighted with a 5 % ink background, 8 px radius, and a filled yellow dot (others hollow). Clicking scrolls to the card. Detail: five `.card` job cards stacked with 36 px gaps; each: when line (14 px, 500 for the dates, subtle for the place), lede (17 px), a bullet list with small yellow square bullets, a chip row. Phone: index hidden, cards stacked, each card gains a title line `{company} · {role}` above the when line.
6. **Work** (`#work`, band `--canvas-3`, 108 px padding). Section head with a 17 px muted paragraph under the h2. Four cases, 90 px apart, alternating: shot left (510 px, `.card-6`) and body right (462 px), then mirrored. Body: mono number line (13 px, subtle, 0.1 em tracking), h3, tag (20 px muted), lede (17 px), chips. No "read the write-up" button. The shot is an inline SVG schematic (§6.7), 16:9 inside the card, no raster images.
7. **Rest** (`#rest`, 108 px padding). Section head. Three `.card`s in a row (332 px each, 20 px gaps, 28 px padding), each with a 12 px eyebrow-style title and a list of entries separated by 1 px rules: entry name (17 px / 700) and a muted line under it.
8. **Closer** (`#contact`, band `--canvas-4`, 144 px padding, with the reference's soft yellow/grey radial field at the top-left). h2 on two lines, 18 px muted paragraph (max 554 px), the mail link (32 px, 3 px yellow underline), a row of pills `github ↗`, `linkedin ↗`. Then the door: a dashed 2 px card (38 % ink), 32 px padding, two columns: copy (title 16 px / 700 muted, three 16 px paragraphs) and on the right a `.btn-accent` "rebuild the page ↻" with a 16 px muted note under it.
9. **Footer** (band `--canvas-4`, 32 px padding, 15 px subtle): left `ethan wang · cleveland`, right `that's everything. the agents are done.`; a second line 13 px: `layout after` + link `aahil-khan.xyz`.

Phone (≤ 767 px): one column everywhere, 20 px gutters; the hero block is vertically centred in the viewport (as in the reference); the name at 64 px; headline 28 px; about card 100 % wide and 320 px tall; toolbox label above its chips; work shot above body, never mirrored; rest cards stacked; closer h2 48 px; the door stacks with the button under the copy; `.totop` 44 px.

## 6. Copy (verbatim; `src/site/copy.ts` is the source, tests pin it)

All lowercase. No em dashes, no en dashes (use "to" or a comma). `·` is allowed. Arrows `→ ↗ ↻ ↑` are allowed.

1. meta: title `ethan wang`; description `i build things, then watch them run. a trading algorithm, a video factory, a hedge for bar promos.`
2. bar: mark `ew`; links `about` `work` `experience` `contact`; cta `say hi ↗`; status pill format `{agents} agents · {built}/{total} built`.
3. hero: eyebrow `cleveland, ohio`; name lines `ethan` `wang`; headline plain `i build things, then watch them run.` + bold `a trading algorithm, a video factory, a hedge for bar promos.`; cta `see the work`; ghost `six agents are building this page while you read it` badge `watch them` (phone: `three agents are building this page while you read it`; when the swarm is off, reduced motion: `the agents are resting today. the page is already built.` with no badge).
4. about: eyebrow `about`; h2 `hi. i'm ethan.`; log title `build log`; log empty line `waiting for the agents`; log line format `{agent} · {element} · {seconds}s`; lede `a few sentences of plain language turn into thousands of lines of code now. what used to take months takes an afternoon. i've always loved building things. i never really liked the coding.`; notes:
   - `the best part is watching something i built come alive. my classmates in middle school using my discord bots. a trading algorithm i wrote climbing into the top 100 on kalshi.`
   - `right now i trade on kalshi and i'm co-founding heron, which prices and hedges free-drink promos for bars. before that i co-founded darch, a video factory that ran for a year.`
   - `cwru, computer science and math, class of 2028. i speak mandarin.`
5. toolbox: eyebrow `toolbox`; h2 `what i build with`; rows: `languages`: python, typescript, java, c, sql · `backend`: fastapi, node, websockets, rest, ffmpeg · `data`: postgresql, mongodb, pandas, numpy, pytorch · `infra`: linux, docker, git · `markets`: kalshi, order books, hedging, prediction markets.
6. experience: eyebrow `experience`; h2 `where i've been`; jobs (id, name, role, sub, when, place, lede, points, chips):
   - kalshi · `kalshi` · `independent trader` · `since jan 2026` · `jan 2026 to now` · `cleveland` · `a trading algorithm that climbed into the top 100 all-time on kalshi's crypto markets.` · [`a python platform that reads kalshi's order book and crypto reference feeds from a few venues, places orders, checks risk and reconciles fills.`, `a multi-terabyte research and replay stack, so every idea gets tested out of sample before it trades.`, `about 30,000 live trades so far. it runs while i sleep.`] · python, websockets, postgresql, pandas
   - heron · `heron` · `co-founder` · `since june 2026` · `june 2026 to now` · `four cities` · `if the home team wins tonight, your drinks are free. the bar doesn't eat that.` · [`heron prices the promo, covers the payout and hedges it on prediction markets.`, `i built the pricing, liability and hedge-execution models.`, `bars signed in four cities.`] · python, fastapi, kalshi
   - wvu · `wvu medicine` · `ml intern` · `summer 2026` · `summer 2026` · `morgantown` · `a model that watches about a hundred million dollars a year of pharmacy claims and notices when denials spike.` · [`anomaly detection over the claims stream. i built the modeling core. the team wired it into production.`, `tooling to plug it into open webui so people could ask it questions.`] · python, pytorch, pandas
   - darch · `darch` · `co-founder` · `2025 to 2026` · `june 2025 to may 2026` · `remote` · `a video factory. three thousand videos a month, about twenty million views a month. it ended in may 2026.` · [`python, node and ffmpeg end to end. scripts in, rendered videos out, distributed.`, `i ran engineering. it ran for a year.`] · python, fastapi, node, ffmpeg, mongodb
   - nist · `nist` · `software intern` · `summer 2025` · `summer 2025` · `gaithersburg` · `a help-desk assistant that reads the internal docs so people don't have to.` · [`retrieval, reranking and deep search inside a custom open webui fork.`, `structured logging and failure analysis, so we knew when it was wrong.`] · python, rag, docker
7. work: eyebrow `selected work`; h2 `four things that ran`; intro `no write-ups. just what each one was and what it did.`; cases (no, year, kind, title, tag, lede, chips, shot):
   - `01` `2026` `trading` · `kalshi algo` · `it trades while i sleep.` · `a market-making and stat-arb system on kalshi's crypto markets. top 100 all-time, about 30,000 trades.` · python, websockets, postgresql · shot `book`: an order-book ladder, eight rows of bars growing from a centre line, bids in ink at 60 %, asks in yellow, a small sparkline along the bottom.
   - `02` `2026` `product` · `heron` · `free drinks if the home team wins.` · `the bar doesn't eat that. heron prices the promo, covers the payout and hedges it on prediction markets. bars in four cities.` · python, fastapi · shot `tab`: a bar tab receipt with four line items, the last reading `drinks · free` in yellow, and a hedge line with a tick.
   - `03` `2025` `system` · `darch` · `three thousand videos a month.` · `a content pipeline on python, node and ffmpeg. about twenty million views a month for a year. it ended in may 2026.` · python, node, ffmpeg · shot `grid`: a 4 × 3 grid of video tiles with play triangles, one tile yellow, a progress bar under the grid.
   - `04` `2025` `tool` · `nist help desk` · `reads the docs so you don't.` · `a retrieval assistant inside a custom open webui fork, with logging so we knew when it was wrong.` · python, rag, docker · shot `chat`: a chat window with a question bubble, an answer bubble, and a small cited-doc chip in yellow.
8. rest: eyebrow `the rest of it`; h2 `school, awards, the early stuff`; cards:
   - `education`: `b.s. computer science` / `case western reserve university · secondary major in mathematics · class of 2028`; `mandarin` / `fluent`
   - `awards`: `top 100 all-time` / `kalshi crypto profit leaderboard · 2026`; `innovation award` / `tartanhacks 2025, for orbit`
   - `the early stuff`: `discord bots` / `middle school. my classmates used them. the first thing i built that ran.`; `orbit` / `a chrome extension, built in a weekend at tartanhacks, feb 2025`
9. closer: h2 lines `i'm probably up` `building something.`; p `email is the fastest way to reach me. i answer all of them.`; mail `ethan.wanq@gmail.com`; links `github ↗` → `https://github.com/Not-Ethan`, `linkedin ↗` → `https://linkedin.com/in/edw173`; door title `oh, and about the agents.`; door paragraphs `every element on this page was drawn in by a cursor as you scrolled. there are six of them. they don't exist.` (phone variant: `… there are three of them. they don't exist.`) / `nothing is sent anywhere. there's no server behind this page. it's files on a cdn and some javascript.` / `they'll do it again if you ask.`; door button `rebuild the page ↻`; door note `it takes about as long as reading it did.`
10. footer: left `ethan wang · cleveland`; right `that's everything. the agents are done.`; credit `layout after` + link text `aahil-khan.xyz` → `https://www.aahil-khan.xyz/`.
11. totop label (aria) `back to top`, glyph `↑`.

Facts (`src/site/facts.ts`): kalshi trades 30,000 (approx), leaderboard top 100, since jan 2026; heron cities 4, since june 2026; darch 3,000 videos a month, 20,000,000 views a month, june 2025 to may 2026; wvu claims about $100M a year; cwru class of 2028. Copy tests check the numbers in strings against these.

## 7. The swarm

### 7.1 What the viewer sees

The page loads as the cream canvas with the grid and the bar's status pill reading `6 agents · 0/43 built`. Six cursors fly in from outside the viewport. Each goes to an element, presses, and drags a selection box from the element's top-left to its bottom-right; the element appears inside the box as it is drawn. The box has four corner handles and a small label naming the element. On release the box snaps to the element, holds for a beat, and fades; the cursor drifts slightly where it stopped until it is given the next element. As you scroll, elements entering the viewport are handed to the nearest free cursor. The log card in About fills with lines like `agent 02 · h1 name · 0.61s`. The status pill counts up.

### 7.2 Agents

- Count: 6 at ≥ 768 px, 3 below. Decided once at mount.
- Names `agent 01` … `agent 06`. Colours in order: `#2563eb`, `#e5484d`, `#16a34a`, `#7c3aed`, `#f97316`, `#db2777`.
- Cursor: an 18 px arrow SVG (the standard pointer silhouette), filled with the agent colour, 1.5 px white stroke, a 1 px 20 % ink drop shadow. Name tag: mono 11 px, white text on the agent colour, 2 px 6 px padding, 4 px radius, placed 14 px right and 16 px below the tip; when the tag would cross the viewport's right edge it flips to the left of the tip so it is never cut off. During the press the whole cursor scales to 0.92 for the hold then back.
- Initial positions: 40 px outside the viewport. Agent i sits on edge `i mod 3` (top, left, right) at a seeded random coordinate along that edge, in document coordinates at mount.
- Idle drift: when idle, the cursor adds `(5·sin(2π t/2.4 + φ), 4·cos(2π t/3.1 + φ))` px to its rest position, φ per agent. An idle cursor whose rest point is inside the viewport is drawn clamped 12 px inside the edges; one whose rest point is outside is not drawn at all until it has a job (so the opening cursors arrive from off-screen).

### 7.3 Elements

Every element listed in §7.7 is wrapped in `<Built name="h1 name">`. Before it is built, the element keeps its layout box and is hidden with `opacity: 0; pointer-events: none` (not a full clip: Chrome's IntersectionObserver never reports a fully clipped element as intersecting, found in Task 4). From the press on, the swarm writes inline `opacity: 1` plus the drag clip, so the element appears inside the box as it is drawn. After the release both inline styles are removed and the element gets `data-built="1"`.

No flash: an inline script in `<head>` runs before paint and sets `document.documentElement.dataset.swarm = "on"` when JS runs and `prefers-reduced-motion` is not `reduce`. CSS: `html[data-swarm="on"] [data-build]:not([data-built]) { opacity: 0; pointer-events: none }`. Without JS the attribute is never set and the page is fully visible (tested on the exported HTML). With reduced motion the attribute is never set either; elements are simply visible, no cursors, no observer. If the inline script ran but the app never hydrates (a blocked or failed bundle), the script removes the attribute after 6 s and the page shows itself; `Swarm` marks `data-swarm-ready` on mount to cancel that.

### 7.4 Scheduling

- Registration: each `Built` registers on mount with the swarm context, in DOM order, and observes itself with one shared `IntersectionObserver` (`threshold: 0.1`, `rootMargin: '0px 0px 80px 0px'`). The first intersection enqueues a job `{ id, name, el }`; the element is unobserved after that.
- Start: nothing moves until `document.fonts.ready` resolves plus 250 ms. Jobs enqueued before then wait.
- Assignment, each frame: while the queue is not empty and some agent is idle, measure every queued job's rect once (`getBoundingClientRect` + scroll offsets, cached on the job; the queue is capped, so this is cheap), build the off-screen ones instantly, then take the on-screen job whose centre is nearest the viewport centre (not the oldest: after an anchor jump the reader is looking at the destination, not at what flew past) and give it to the idle agent nearest its top-left corner (Euclidean distance; ties by lower index). The agent starts after a seeded jitter of 0 to 240 ms, and each job's travel and drag durations carry seeded tempo multipliers (travel ×0.8 to 1.4, drag ×0.85 to 1.35, applied after the clamps) so simultaneous jobs never launch or finish in lockstep.
- Instant rule: when a job is popped and its rect lies entirely outside the viewport expanded by 200 px on each side (the user scrolled past it), it is built instantly with no cursor. When the queue is longer than 2 × agents, the oldest jobs beyond that are built instantly too. Instant builds are not logged; the status pill still counts them.
- Done: a job completes at release. The agent returns to idle at the box's bottom-right corner plus a seeded (6 to 18, 8 to 22) px so cursors do not stack on shared corners.
- Abandon: the 250 ms sweep also checks jobs in flight. If a job's measured rect lies entirely outside the viewport ±200 px (the reader scrolled away mid-drag), the element is built instantly, its box is hidden, and the agent is freed where its cursor is (no log line). The reader never waits on work they cannot see.
- Sweep: every 250 ms the swarm checks every unbuilt, unqueued element; any whose box lies entirely above the viewport (bottom edge above `scrollY - 200`) was scrolled past without ever intersecting (a scrollbar drag or an instant jump) and is built instantly. Nothing above the reader is ever left hidden; things below still wait to be seen.
- Rebuild (`door` button): the page jumps to the top (instant scroll, so nothing is above the reader for the sweep to take), every built element loses `data-built` and is hidden again, the log clears, the counts reset, the observer re-observes every element, and the page rebuilds as the reader scrolls down again. The button is disabled while a rebuild is in flight (any agent busy or queue non-empty) and when the swarm is off.

### 7.5 One job's timeline (pure, tested)

Given the agent's current position `(ax, ay)` and the element rect `(x, y, w, h)` in document px:

| phase | duration | cursor | box / clip |
|---|---|---|---|
| travel | `clamp(dist / 1.8, 180, 700) × tempo` ms, `dist` = distance from `(ax, ay)` to `(x - 4, y - 4)`, tempo seeded in [0.8, 1.4]; ease-out cubic | moves to `(x - 4, y - 4)` | none |
| press | 70 ms | holds; scale 0.92 | box appears at `(x, y)`, 0 × 0 |
| drag | `clamp(diag / 1.4, 280, 950) × tempo` ms, `diag = hypot(w, h)`, tempo seeded in [0.85, 1.35]; smoothstep | moves straight to `(x + w + 4, y + h + 4)` | box = `(x, y, f·w, f·h)`; clip = `inset(0 (1-f)·100% (1-f)·100% 0)` |
| release | 120 ms | eases from the drag end to the rest point, drag end + (6, 8) | box snaps to the full rect; fill drops to 0; `data-built` set at the start of this phase and the inline clip removed |
| linger | 600 ms | idle drift begins | box stroke and label fade out over the last 250 ms |

`f` is the eased drag progress in [0, 1]. The agent is free again at the start of `linger` (so the cursor can leave while the box fades). Total active time per element is at most 70 + 700 + 950 + 120 = 1.84 s and typically under a second.

Selection box: 1.5 px solid agent colour; fill agent colour at 8 %; four 7 × 7 px handles (white, 1.5 px agent border) centred on the corners; label pill (mono 11 px, white on agent colour) sitting 22 px above the top-left corner reading the element name. When the box's top is within 88 px of the viewport's top edge (under or on the fixed bar), the label sits below the box instead. Box, handles and label are three DOM nodes per agent, reused.

### 7.6 HUD

- Status pill in the bar (desktop): `6 agents · 12/43 built`, mono 12 px, white, 2 px border, pill, no shadow.
- Build log card (About): title `build log` as the card's eyebrow, then the last 9 completed jobs, newest at the bottom, each `agent 02 · h1 name · 0.61s` in mono 13 px with the agent's name in the agent's colour. The seconds are the job's drag + travel time. Before the first line: `waiting for the agents`. The log card is itself a `Built` element; it starts logging as soon as it exists (its own build appears in it).

### 7.7 Element inventory (43)

bar: mark · links · say hi (3). hero: eyebrow · name · headline · actions (4). about: head · log card · lede · notes (4). toolbox: head · 5 rows (6). experience: head · index · 5 cards (7). work: head · 4 × (shot, body) (9). rest: head · 3 cards (4). closer: h2 · p · mail · links · door (5). footer (1). The status pill, the cursors and the to-top button are never wrapped.

Names are short, mono-friendly, and say what the thing is: `mark`, `nav`, `cta`, `eyebrow`, `h1 name`, `headline`, `actions`, `h2 about`, `log`, `lede`, `notes`, `h2 toolbox`, `row languages` …, `h2 experience`, `index`, `card kalshi` …, `h2 work`, `shot kalshi`, `body kalshi` …, `h2 rest`, `card education` …, `h2 contact`, `p contact`, `mail`, `links`, `door`, `footer`.

### 7.8 Performance

One `requestAnimationFrame` loop owned by the swarm. It may run continuously (the per-frame work is a handful of transform writes); idle agents outside the viewport are skipped. Per frame: for each agent, compute the sample from the pure timeline and write `transform` on the cursor, `transform` + `width` + `height` on the box, `clip-path` on the element. No layout reads per frame; the rect is read once per job. The overlay is `position: absolute; top: 0; left: 0; width: 0; height: 0; overflow: visible; pointer-events: none; z-index: 60` as the first child of `body`, so document coordinates are the only coordinates.

## 8. Architecture

```
src/app/layout.tsx        fonts, metadata, the pre-paint swarm script
src/app/page.tsx          <Site/>
src/app/globals.css       tokens, type, components, sections, phone, swarm overlay
src/site/copy.ts          every string (§6)             copy.test.ts
src/site/facts.ts         every number                  (checked by copy.test.ts)
src/site/Site.tsx         assembles the sections inside <Swarm>
src/site/sections/        Bar, Hero, About, Toolbox, Experience, Work, Rest, Closer, Footer, ToTop
src/site/Shots.tsx        the four SVG schematics
src/site/exported.test.ts the exported HTML: every string present, nothing forbidden, no data-build hidden by default
src/swarm/prng.ts         seeded mulberry32                     prng.test.ts
src/swarm/easing.ts       easeOutCubic, smoothstep, clamp       easing.test.ts
src/swarm/timeline.ts     jobTimeline(), sampleJob()            timeline.test.ts
src/swarm/scheduler.ts    pure queue + assignment (no DOM)      scheduler.test.ts
src/swarm/agents.ts       names, colours, counts, initial positions
src/swarm/Swarm.tsx       context, overlay DOM, observer, rAF loop, rebuild, stats
src/swarm/Built.tsx       <Built name as className>; registers, clips, exposes data-build
src/swarm/useSwarmStats.ts  { agents, built, total, log } for the pill and the log card
```

The pure modules carry the behaviour and the tests; `Swarm.tsx` is the only file that touches the DOM for the effect.

## 9. Tiers

- Desktop, motion allowed: the full effect, 6 agents.
- Phone (< 768 px), motion allowed: 3 agents, same rules; name tags 10 px.
- `prefers-reduced-motion: reduce`: no swarm. Everything visible from the first paint. The status pill is hidden and the log card shows the single line `the agents are resting. you asked for less motion.` (copy key `about.logReduced`).
- No JavaScript: everything visible. The pill shows `6 agents · 0/43 built` as rendered and never updates; acceptable.

## 10. Validation

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` green.
- Unit: prng determinism; easing bounds; timeline durations clamped and endpoints exact; scheduler nearest-free assignment, instant rule, queue cap, rebuild reset; copy voice rules and facts; exported HTML.
- Visual gate (Opus judge with Playwright against the built export): stills at 1440 × 900 at t = 0.4 s, 1.0 s, 2.0 s, 4.0 s after load (cursors mid-flight, boxes mid-drag, partial reveals, then the hero complete); scroll to each section and capture at +0.5 s and +2.5 s; a phone pass at 390 × 844; reduced-motion pass; no-JS pass. The judge compares layout to the reference stills in `.playwright-mcp/ref-*.jpeg` and answers: does the layout match the reference; does it look like agents are building the page in real time; is it a swarm (not lockstep); any jank or stalled elements; any voice or forbidden-content miss.

## 11. Calls I made for Ethan (flag if he objects)

- Light theme and the reference's visual system, not just its layout; the grid canvas reads as the design surface the agents build on.
- The portrait slot is the build log.
- Six agents on desktop, three on phone.
- The case shots are drawn schematics, not screenshots (there are none, and screenshots would date).
- A credit line in the footer naming the reference site.
- The "rebuild the page" button is the only interactive extra.
- Copy drafted in his voice from his thesis and the facts; new lines are marked as mine in the plan's copy test if he wants to edit them (every string is in one file).

## 12. Left to the builder

Exact SVG geometry of the four shots within the descriptions above; exact easing of the cursor scale on press; the sticky index's "nearest card" measure (a scroll listener at 100 ms throttle is fine); the handle placement arithmetic; the grid offset so the hero rule lines up with the name's left edge.

## 13. Amendments after the Impeccable critique (2026-11-02, score 21/32)

The critique is in `.impeccable/critique/`. These amendments override the sections above where they conflict. Copy here is verbatim; implementers transcribe it.

### 13.1 Eyebrows and numbered labels go

Every `.eyebrow` is deleted (the hero's `cleveland, ohio` and the six section kickers; the location stays in the footer). A section head is the h2 alone. The work number line drops the ordinal: `2026 · trading`, `2026 · product`, `2025 · system`, `2025 · tool`. Copy keys `eyebrow` are removed everywhere. The element inventory loses `eyebrow`: 42 elements; `BUILT_TOTAL` is 42. Section ids and nav targets are unchanged.

### 13.2 Nav order follows page order

`about · experience · work · contact`. The active section's link is underlined (2 px accent underline, offset 6 px) while its section is nearest the viewport centre (same measure as the experience index). Phone: the status pill and the `say hi` pill leave the bar and the four links show at 13 px, so a phone reader has section links.

### 13.3 The email is the primary action; rebuild is demoted

The closer's mail link becomes a `.btn btn-accent` pill at 22 px (phone 18 px) with the address as its text, hover translate like every button, and a focus ring. The door's `rebuild the page ↻` becomes an outlined `.btn` (white) inside the door; the note stays. When the swarm is off (reduced motion or a failed bundle), the door shows a single paragraph `this page is usually drawn in by six cursors while you read it. you asked for less motion, so they stayed home.` (copy key `closer.door.offParagraph`; phone variant says `three cursors`) and no button or note; the log card loses its fixed height (`height: auto`) and shows only `about.logReduced`.

### 13.4 The agents say what they were told

Each element carries a short instruction in Ethan's voice, the thing an agent was asked to build. It is the box label while the box is drawn and the element column of the log line (`agent 02 · my name, huge · 0.61s`). `Built` passes it as `data-prompt`; the swarm reads `dataset.prompt` and falls back to the name. Copy key `prompts: Record<name, string>`:

mark `my initials, top left` · nav `links to the sections` · cta `a way to say hi` · h1 name `my name, huge` · headline `what i do, in one line` · actions `two buttons` · h2 about `a hello` · log `a log of what you've built` · lede `the thesis` · notes `three notes about me` · h2 toolbox `a heading for the tools` · row languages `the languages` · row backend `the backend stuff` · row data `the data stuff` · row infra `the infra` · row markets `the markets` · h2 experience `a heading for the jobs` · index `a list of the jobs` · card kalshi `the kalshi job` · card heron `the heron job` · card wvu `the wvu job` · card darch `the darch job` · card nist `the nist job` · h2 work `a heading for the work` · shot kalshi `draw an order book` · body kalshi `the kalshi story` · shot heron `draw a bar tab` · body heron `the heron story` · shot darch `draw a grid of videos` · body darch `the darch story` · shot nist `draw a chat window` · body nist `the nist story` · h2 rest `a heading for the rest` · card education `where i went to school` · card awards `the awards` · card the early stuff `the early stuff` · h2 contact `a big goodbye` · p contact `how to reach me` · mail `my email, big` · links `github and linkedin` · door `the bit about you` · footer `a footer`.

A test checks that every registered name has a prompt and every prompt is lowercase.

### 13.5 The effect never blocks reading

- In-page links (nav, `see the work`, the ghost, the index, the to-top) scroll instantly (`scroll-behavior: auto`), so the agents arrive on the destination at once instead of the reader waiting out a 1.3 s fly-through plus a build.
- Focus builds: a `focusin` on or inside an unbuilt element builds it instantly (no cursor), so keyboard users never focus something invisible.
- Long queues go faster: when the queue is longer than the agent count, new jobs take tempo 0.6 (after the seeded multiplier) until it drains.
- Idle cursors leave: an idle cursor drifts for 1.5 s, then fades out over 300 ms and is not drawn until its next job (it flies in from where it faded). At 42/42 no cursor remains on the page.
- Rebuild announces itself: the door note becomes `it jumps to the top and takes about as long as reading it did.`

### 13.6 Experience says the role; work says the thing

Every job card shows `{name} · {role}` as its title at every size; the index sub-line is `{role} · {year}`. Experience copy (role, what he did) and work copy (what the thing did) no longer repeat each other:

experience jobs (id · name · role · sub · when · place · lede · points · chips):
- kalshi · `kalshi` · `independent trader` · `independent trader · 2026` · `jan 2026 to now` · `cleveland` · `i trade my own money on kalshi's crypto markets with a system i wrote.` · [`it reads the order book and a few crypto venues, places orders, checks risk and reconciles fills.`, `every idea gets tested out of sample on a replay stack before it trades.`] · python, websockets, postgresql, pandas
- heron · `heron` · `co-founder` · `co-founder · 2026` · `june 2026 to now` · `four cities` · `heron hedges free-drink promos for bars. i built the models.` · [`pricing, liability and hedge execution on prediction markets.`, `bars signed in four cities.`] · python, fastapi, kalshi
- wvu · `wvu medicine` · `ml intern` · `ml intern · summer 2026` · `summer 2026` · `morgantown` · `a model that watches pharmacy claims and notices when denials spike.` · [`anomaly detection over about a hundred million dollars a year of claims.`, `i built the modeling core. the team wired it into production.`, `tooling to plug it into open webui so people could ask it questions.`] · python, pytorch, pandas
- darch · `darch` · `co-founder` · `co-founder · 2025 to 2026` · `june 2025 to may 2026` · `remote` · `i ran engineering at a video factory for a year.` · [`python, node and ffmpeg end to end. scripts in, rendered videos out, distributed.`, `it ended in may 2026.`] · python, fastapi, node, ffmpeg, mongodb
- nist · `nist` · `software intern` · `software intern · summer 2025` · `summer 2025` · `gaithersburg` · `a help-desk assistant that reads the internal docs so people don't have to.` · [`retrieval, reranking and deep search inside a custom open webui fork.`, `logging and failure analysis, so we knew when it was wrong.`] · python, retrieval, docker

work cases (id · year · kind · title · tag · lede · chips · shot):
- kalshi · `2026` · `trading` · `kalshi algo` · `it trades while i sleep.` · `it makes markets and trades price gaps between kalshi's crypto markets. top 100 all-time on the profit leaderboard, about 30,000 trades.` · python, websockets, postgresql · book
- heron · `2026` · `product` · `heron` · `free drinks if the home team wins.` · `the bar doesn't eat that. heron prices the promo, covers the payout and hedges it on prediction markets. bars in four cities.` · python, fastapi · tab
- darch · `2025` · `system` · `darch` · `three thousand videos a month.` · `a content pipeline on python, node and ffmpeg. about twenty million views a month, for a year.` · python, node, ffmpeg · grid
- nist · `2025` · `tool` · `nist help desk` · `reads the docs so you don't.` · `a retrieval assistant inside a custom open webui fork. it answers from the internal docs and says which one.` · python, retrieval, docker · chat

The copy tests that pinned old strings change with these; the facts checks stay (`top ${facts.kalshi.leaderboardTop}` now in about, work and awards; the trades count in the work lede).

### 13.7 Contrast, focus, wrapping, small things

- Footer text and the toolbox row labels use `--ink-muted` (the 60 % ink fails 4.5:1 on the darker bands).
- Log lines: the agent name is ink, preceded by an 8 px square swatch in the agent colour (no coloured text on white).
- `:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; box-shadow: 0 0 0 5px var(--ink) }` on every interactive element; `::selection { background: var(--accent); color: var(--ink) }`.
- `p, li { text-wrap: pretty }`; `h1, h2, h3 { text-wrap: balance }` (the name keeps its two spans).
- The status pill gets `min-width: 15ch` so a digit change does not move the nav; the rebuild button gets `cursor: pointer`.
- The to-top button is hidden on phone.
- The education line is `case western reserve university · secondary major in mathematics · class of 2028` with a no-break space before each `·` so the separator never starts a line.
- The four shots get one small loop each after they are built (CSS keyframes, paused under reduced motion): the order book's bars breathe (three bars scale on x between 0.85 and 1.15 over 2.6 to 3.4 s), the video grid's progress fill crawls from 40 % to 70 % and back over 6 s, the chat's answer bubble shows a blinking caret, the bar tab's `drinks · free` pill pulses once every 4 s. Nothing moves before the element is built.
- DESIGN.md token lists gain the 26 px and 4 px radii and the 10, 13, 14, 15, 18, 22 and 24 px sizes its prose already documents.
