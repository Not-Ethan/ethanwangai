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
- Fast scrolling and crowds go faster: when the scroll speed (over the last ~120 ms) is above 600 px/s, or more than `agents.length` queued jobs are at least partly in the viewport, newly started jobs take travel and drag × 0.3 (after the seeded multipliers; floors: travel 90 ms, drag 120 ms) and the press/release separation drops from 120 to 60 ms.
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

### 13.8 After the Impeccable audit (14/20)

- Motion is finite: each shot loop runs once (book breath 3.4 s, grid crawl 4.5 s, chat caret six blinks, tab pulse once) after its shot is built; nothing on the page moves forever (WCAG 2.2.2).
- The off state is CSS, not React: both copy variants are in the server HTML with `when-on` / `when-off` classes and `html[data-swarm="on"]` decides which shows. So the no-JavaScript page and the failed-bundle page (after the 6 s reveal) say the agents stayed home, show no pill and no rebuild button, and the log card collapses to its one line.
- Focus: the to-top link is `visibility: hidden` while hidden; rebuild focuses the h1 after the jump and uses `aria-disabled`; the mark link is labelled `ethan wang, top of page`.
- Space Grotesk is self-hosted through `next/font/local` like the mono face (preloaded); the start gate is `fonts.ready` capped at 600 ms, then 150 ms.
- The animation loop idles when nothing is busy and restarts from the observer, focus, scroll and rebuild.
- The index sub-line uses `--ink-muted`; phone grids use `minmax(0, 1fr)`; SVG fills use tokens.
- The bar tab and chat shots carry no made-up line items: bars and lines stand in for text, and the only words are `drinks · free`, `hedged` and `cited`.
- Tailwind's source scan skips `docs/`.

### 13.9 After the second visual gate

- The log line's element column is the prompt (`agent 02 · my name, huge · 0.61s`); the shot keyframes are namespaced `shot-*` (Tailwind ships a `pulse` of its own) and the tab pulse is a scale, never an opacity change.
- `BUILT_TOTAL` lives in `src/swarm/inventory.ts` and feeds both the site and the store's server snapshot; the pill is `min-width: calc(22ch + 28px)` so double digits never move the nav.
- A job whose element is less than a quarter visible between the bar line (64 px) and the viewport bottom is built instantly; a box whose top is within 92 px of the viewport top gets its label below, so no label is ever drawn over the bar.
- Idle cursors drift 0.8 s before fading; one whose tag lands on another built element fades at once. A faded cursor that gets a job respawns 40 px outside the viewport edge nearest the target, so after a jump the first boxes appear within half a second. A cursor whose tip is outside the viewport is not drawn.
- Copy: rest-card lines carry a no-break space before every `·`; the off paragraph reads `this page is usually drawn in by six cursors while you read it. today they stayed home.` (phone: three); the heron, wvu and nist first points are full sentences in his voice (`i priced the promos, sized the liability and placed the hedges on prediction markets.` / `it watches about a hundred million dollars a year of claims and flags the weeks that look wrong.` / `it finds the right doc, reranks the candidates and digs deeper when the first pass is thin, all inside a custom open webui fork.`); the nist work lede is `a retrieval assistant for nist's internal docs. it answers and says which doc it used.` and the darch work lede `a content pipeline that rendered and shipped the videos itself. about twenty million views a month, for a year.` so experience and work share no phrase.

### 13.10 After the second critique (24/32)

- **No resume bullets.** Each job card is the title, the when line, the lede and one short paragraph of full sentences (`body`); the `points` lists and the job-card chips are gone. Chips stay in the toolbox and the work cases. The bodies, verbatim:
  - kalshi: `it reads the order book and a few crypto venues, places the orders, checks the risk and checks the fills. every idea runs against a replay of old data before it touches real money.`
  - heron: lede `heron sells bars a promo they couldn't afford on their own. i built the models behind it.` body `i priced the promos, sized the liability and placed the hedges on prediction markets. the first bars signed this summer.`
  - wvu: body `it watches about a hundred million dollars a year of pharmacy claims and flags the weeks that look wrong. i built the modeling core, the team wired it into production, and i added tooling so people could ask it questions in open webui.`
  - darch: body `python, node and ffmpeg end to end: scripts in, rendered videos out, distributed. it ended in may 2026.`
  - nist: body `it finds the right doc, sorts the candidates and digs deeper when the first pass is thin, inside a custom open webui fork. i added logging and failure analysis so we knew when it was wrong.`
- **Each number once.** About note 2 becomes `most of what i've built started as a bet that i could. the ones that worked are below.` The kalshi work lede becomes `it makes markets and trades price gaps between kalshi's crypto markets. about 30,000 trades so far.` (top 100 stays in the about note and the awards card). The door's first paragraph becomes `most of this page was drawn in by a cursor while you read. there are six of them. they don't exist.` (phone: three).
- **The bar at 768 to 1023 px.** The status pill hides under 1024 px (rule order fixed); the phone nav links are at least 44 px tall.
- **The failed-bundle path.** The inline script reveals the page at `load` + 1.5 s or at 6 s, whichever comes first; the pill is invisible until `data-swarm-ready`; the log's off line is `the agents stayed home today.` (copy key `about.logOff`) except under reduced motion, where `about.logReduced` shows (two `when-off` lines switched by the media query in CSS).
- **Micro-labels are lowercase**: the log title, the toolbox row labels and the rest card titles are 13 px, weight 600, ink-muted, no tracking, no uppercase.
- **Swarm:** a cursor freed by the abandon path gets the same fade-at-once check as a normal release; assignment prefers the on-screen job nearest the point 35 % down the viewport (headings first after a jump, not last); the agent colours darken to `#2563eb`, `#dc2626`, `#15803d`, `#7c3aed`, `#c2410c`, `#db2777` so 11 px white text on them reads at 4.5:1 or better.
- **Small things:** log lines are a grid of name, prompt and a right-aligned no-wrap time; the bar background is `rgba(247,245,238,.94)` with `blur(6px)`; the phone closer h2 is 42 px; DESIGN.md says Space Grotesk is self-hosted through next/font (not fontsource).
- **From the second audit (16/20):** `html { scroll-padding-top: 80px }` so a focused element never scrolls under the bar; the mark's accessible name is `ew, ethan wang, top of page`; under 360 px the phone nav shrinks its gaps so `contact` is never cut; the off-state ghost is plain text, not a link; ink-alpha literals in the stylesheet become `color-mix(in srgb, var(--ink) N%, transparent)` and the hero arrow stroke uses the token; `will-change` is set on a cursor or box only while it is working.
- **From the third visual gate:** the build log's list is anchored to its bottom so the newest line is always visible on phone; the log line is a grid (swatch and name, prompt, a no-wrap time) so `·` never starts a line; a flipped tag shifts left at the right edge and flips above the tip at the bottom edge, and the release and linger poses respect the 12 px inset; `respawnPoint` carries a seeded ±150 px offset along the edge and a seeded 40 to 200 px distance outside it, and the k-th job assigned in one dispatch waits k × 100 ms more, so rows never draw in formation; elements inside the fixed bar are exempt from the quarter-visible instant rule, so the opening shows all six cursors.
- **From the final verification:** the quarter-visible instant rule applies only to the part hidden above the bar line; an element still mostly below the viewport stays queued until a quarter of it is in view, so continuous scrolling (wheel, trackpad) always gets a cursor, never a pop-in. The gate script measures this with a 4 px per frame scroll and requires at least 80 % of below-fold elements to be drawn by a box. Jobs assigned together are pushed apart so no two press or release within 120 ms. The heron work lede loses `bars in four cities.` (the job's when line already says it).
- **Skimming:** when the reader scrolls faster than about 600 px/s, or more queued jobs are in view than there are agents, new jobs run at 0.3× tempo (travel ≥ 90 ms, drag ≥ 120 ms) with 60 ms separation, so even a fast skim (20 px per frame) shows a box on at least 80 % of what passes; an agent may set off as soon as an element's top enters the viewport. The chosen job's rect is re-measured at assignment, so elements inside sticky columns are never mistaken for scrolled-past ones. The gate script measures 4 px and 20 px per frame.
- **From the final judge:** an agent may start towards an element as soon as 1 px of it shows between the bar line and the viewport bottom (the quarter-visible rule now only decides instant builds of parts hidden above the bar line); every dispatch re-measures all queued jobs (the queue is capped at 2 × agents), so a sticky element (`.xp__index`) is judged where it is now, not where it was when it was queued; the gate script adds a 20 px per frame pass (`continuousFast`, at least 80 %).
- **Sticky elements:** a job on an element inside a sticky container is re-measured every frame and its box and cursor follow the element, and its off-screen checks use the current position, so the experience column's heading and index are drawn wherever they stick. Content boxes are clipped at the bar line, so a skim never draws over the nav. The gate counts an element as drawn only when its box overlaps it on screen, and runs eight sticky passes (offsets 800 to 1800 px at 8 and 16 px per frame).

## 14. Spawn beat and completion flourish (2026-11-03)

Ethan: "spawn in a swarm of cursors over an empty background first, and also whenever an element is completed it should have a little animation play."

### 14.1 The spawn beat

Before any element is built, the swarm appears over the empty canvas and mills about, then goes to work.

- When the start gate opens (fonts ready, capped at 600 ms), nothing is dispatched yet. Each agent spawns at a seeded point inside the viewport: points are drawn by rejection sampling inside the central 70 % of the viewport width and the band from 18 % to 78 % of its height, at least 110 px apart from one another (30 tries, then accept). The spawn order is seeded; agents spawn 90 ms apart.
- Spawn-in: the cursor (arrow and tag together, `transform-origin` at the tip) scales from 0.4 to 1 and its opacity from 0 to 1 over 260 ms with an overshooting ease-out (`cubic-bezier(.34,1.56,.64,1)`), as a CSS animation on a `cursor--spawn` class.
- Milling: from its spawn until dispatch begins, each cursor wanders around its spawn point with `x = 34·sin(2πt/1.9 + φ) + 14·sin(2πt/0.7 + 2φ)`, `y = 26·cos(2πt/2.3 + φ) + 10·cos(2πt/0.9 + 3φ)` px (φ per agent), clamped 12 px inside the viewport. Tags flip at the right edge as usual.
- Dispatch begins `MILL = 800 ms` after the last spawn (about 1.5 s after the gate on desktop). The first jobs start from wherever each cursor is milling, so the first boxes appear within a few hundred ms of that moment.
- Rebuild replays the beat: the cursors are cleared instantly (the jump to the top hides it), the page resets, and the swarm spawns in again at fresh seeded points before building.
- Until its own job starts, an assigned agent keeps drawing its mill pose (opening) or idle drift (later); travel begins from the position drawn at that moment, so no cursor freezes at dispatch.
- A cursor that reappears later (after fading idle, respawning at an edge for a job) uses the same spawn-in animation at 200 ms so every appearance reads the same way.
- No change to the pill, the log or the fallbacks (no JavaScript, reduced motion and the failed bundle never run the swarm).

### 14.2 The completion flourish

At release (the moment `data-built` is set), three things happen together, all within the box's existing 120 ms release and 600 ms linger:

- The box flashes: stroke, handles and label background jump to the accent `#facc00` (label text ink), hold it for the first 60 % of 260 ms, then cut straight to the agent colour (an sRGB cross-fade passes through grey for the blue, purple and pink agents; the label text switches to white at 60 %, stepped); the four handles pop from scale 1 to 1.6 and back over 220 ms; the label text gets a leading `✓ ` for the rest of the linger.
- The element stamps into place: a `built-in` class runs a one-shot 420 ms animation from `translate(-2px, 2px) scale(.985)` to identity with `cubic-bezier(.16,1,.3,1)`. On the cards this reads as the hard shadow settling; on text as a small drop into place. Nothing changes opacity, so the reveal never dims. The class is removed on `animationend`. `will-change` is not left on afterwards.
- Instant builds (scrolled past, focus, overflow) get no flourish; only cursor-drawn releases do.
- The spec's timing table in §7.5 is unchanged; the flourish rides inside release and linger.

### 14.3 Gate additions

The gate script captures the opening at 0.3, 0.7, 1.1 and 1.5 s (expect: empty canvas with cursors spawning and milling, no box before about 1.3 s; all agents visible by 0.9 s) and a 120 ms burst of three stills around a release in the about section (expect the yellow flash and the check in the label). Reduced motion and no-JS stills unchanged.

## 15. Copy and layout polish (2026-11-08)

Ethan, after the spawn beat shipped: "ok it looks good, the copy and layout need a bit of work." Method: three isolated Opus reviews (A: layout against the reference stills at 1440, 1280, 834 and 390; B: the Impeccable detector plus browser measurements; C: every string against the thesis paragraph, the voice rules and the facts on hand), synthesised here, then the changes below. The critique snapshot is in `.impeccable/critique/`.

### 15.1 Copy (`src/site/copy.ts`; the tests pin the numbers)

- The thesis paragraph is the source, and about now carries its ideas in its own order. Lede: "now is the best time in history to build things. a few sentences of plain language turn into thousands of lines of code, and what used to take months takes an afternoon." Note 1: the era of speed and diversification, "the world doesn't need some master programmer who dreams in code. it needs well rounded people who have been exposed to so many ideas that they see new opportunities everywhere." Note 2: "i've always loved building things, but i never really liked coding." (his sentence, restored) then come alive, discord bots to the top 100. Note 3: school and class year.
- Experience says the role in full sentences with "i" in them; work says the thing. Each number lives once: about 30,000 trades (work), top 100 (note 2 and the award), four cities (the heron place), about a hundred million dollars a year (wvu body), three thousand videos a month (tag), about twenty million times a month (work; the resume says impressions, so not "views"), class of 2028 (note 3, the education card, the meta description).
- The index sub-lines name the subject (trading my own account · pricing and hedging bar promos · a pharmacy claims model · a video pipeline · help-desk search); the card title carries name · role; the when line the dates and place. Nothing is said twice within 400 px.
- Off state: "the agents are off." everywhere, never "today" (reduced motion is every day); the reduced-motion variant adds "you asked for less motion"; the footer says only "that's everything." when no agent ran (`footer.rightOff`, switched by `.when-on` / `.when-off`).
- Claims the facts do not back were removed or corrected: wvu "handed the finished core to the team to put into production" (the resume says delivered for production-workflow integration), heron without "this summer", darch "seen about twenty million times a month", mandarin "spoken" not "fluent", the closer without "i answer all of them", the invented "most of what i've built started as a bet that i could" gone, "the weeks that look wrong" gone.
- Ghost badge "see the log" (the pill links to the log; "watch them" echoed "watch them run" a line above). Work intro: "trading, bars, video and government docs, newest first." Door: "most of this page was drawn in by six cursors while you read. they don't exist. the page was here the whole time." / "no ai runs here and nothing leaves your browser. it's static files on a cdn and some javascript." / "they'll do it again if you ask." Off door: "six cursors usually draw this page in while you read. they're off for you, so you got the finished page." Phone variants swap six for three.
- Prompts: `card kalshi` → "my kalshi trading" (it is not a job at Kalshi); body prompts → "what the algo does", "what heron does", "what darch did", "what the help desk did".
- Left for Ethan: the door could say that the code of this page was mostly written by AI agents from his plain-language instructions. It is true and it is the thesis enacted, but it is a disclosure, so it stays out until he asks.

### 15.2 Layout (departures from the reference, on Ethan's request; DESIGN.md records them)

- Section order: hero, about, **work**, experience, **toolbox**, rest, closer, footer. Experience and work told the same four projects twice and the proof started about 4.5 screens down; now the work starts right after the thesis. Nav: about · work · experience · contact. Bands: about white (`--surface`, as the reference), work mist with rules, experience paper, toolbox stone with rules, rest paper, closer clay with its top rule; no two rules touch.
- Hero: headline `clamp(28px, 3.6vw, 52px)` so it runs 3 lines at 1440 and the hero fits a 900 px viewport (it was 4 lines and 913 px); the hero closes with a 2 px ink rule and the grid fades out over its lower 45 % (a mask), as the reference does.
- About: the log keeps 13 lines (was 9, which left ~140 px blank) with a 28 px fade at the top so a clipped line fades instead of cutting; in the off state the log card is hidden and the text takes one column up to 760 px (it was a 146 px stub beside a 439 px column); on phone the log comes after the lede and notes.
- Experience: the job lede leads in ink at 18 px / 500; the body stays muted 17 px. The 28 px head-to-index gap stays (the reference has it).
- Toolbox chips 9 px 16 px at 16 px type (about 44 px tall, the reference's height), rows at 18 px.
- Work: the heron tab and nist chat schematics enlarged to about 85 % of the panel with one more drawn element each; they read as placeholders next to the ladder and the grid.
- Closer: phone h2 `clamp(36px, 9.7vw, 48px)` (42 px orphaned "building"); off-state door copy capped at 720 px (it ran 87 characters a line).
- Ghost pill: a caption (no border, no badge) in the off state and on phone; the two-line dashed box on phone read as a broken button.
- Tablet 768 to 1023: 40 px gutters, single-column about, experience (index hidden), work and rest, hero content centred, log 320 px.
- Small: `btn-sm` 44 px tall; `.h2` line-height 1.1; phone card padding 24 px 20 px.
- Not adopted: eyebrows (a craft-floor ban, see §13), `<details>` accordions for the phone experience list (no new interactivity; shorter copy and tighter cards instead), a bigger phone name (the reference's is smaller than ours), section numbers.

### 15.3 Tests and gate

- `copy.test.ts` pins: note 2 has the top 100; nav order; the off-state strings never say "today" or "stayed home"; `footer.rightOff` has no agents in it; subs are subjects with neither the role nor a year; the darch lede says "twenty million times a month".
- Gate: the committed script is unchanged; an Opus judge checks the new order, the hero fit at 1440×900 and 1280×720, the about log fill, the off state (no log card, one column, caption ghost, footer line), phone and tablet, and that the swarm still builds 42/42.

### 15.4 Judge fixes (same day)

The judge passed the swarm, the off states, phone, tablet and the console, and failed the hero and some copy. Fixed: the headline's plain half was 854 px against an 851 px cap, so "run." wrapped onto the bold line; the cap is now 17em (it scales with the type; a fixed 880 px broke the run differently at 1280) and from 768 px up the bold run is its own block (plain sentence whole on line one, bold list on two lines, three lines at 1440, 1280, 1024 and 834). The grid's bottom inset was -100 px, so its mask ended 100 px below the hero rule and the grid was still visible at the rule; the inset is 0 now. Nav landings showed two parallel rules 16 px apart (the bar's border and the band's rule); `scroll-margin-top` of -18 px on work and contact and -16 px on experience puts the band rule under the bar's border. Build-log swatches now top-align (a wrapped line kept the swatch between its two lines) and the time column drops its "·". The chat caret sits at the end of its line and the "hedged" chip clears the tab's bottom. Copy: the heron body repeated the work lede (now "i wrote the pricing, the cap on what heron can owe, and the code that places the hedges."), the wvu body said "core" twice, the darch lede dropped ", for a year" (the resume gives no duration for the monthly figure), the chip "rest" became "rest apis", the orbit line no longer repeats "tartanhacks" from the award beside it, and the index sub-lines share one grammar (my own trading system · pricing and hedges for bar promos · a pharmacy claims model · a video pipeline · a help-desk search tool). The cap must come after the shared `width: fit-content; max-width: 100%` rule or it loses; and the three articles in the bold run are pinned to their nouns with no-break spaces (`a\u00a0trading`, `a\u00a0video`, `a\u00a0hedge`) so no line ends on a lone "a" at any width. Left alone: "i never really liked coding" is his sentence; a trading-firm recruiter may read it literally, and that is his call.

## 16. Bolder (2026-11-09)

Ethan, after the polish shipped: "the effect looks good but the page still looks a bit bland and boring." Diagnosis (Impeccable `bolder`: a flat surface is one that opts out of the system's own strongest moves): below the hero the page drops its display type to 36 px headings, uses its yellow only for icons and dots, and keeps the agent colours out of the page entirely, so once the swarm is done it is a tidy cream reskin of the reference. No new colour, font, radius or shadow. Four moves, each in the system's own vocabulary; the swarm itself is unchanged.

### 16.1 Section titles at display scale

`.h2` becomes `clamp(44px, 5vw, 72px)`, weight 700, line-height .98, tracking -.035em; `.section__head` margin 56 px; `.section__intro` 18 px, 18 px below. The type ladder is now name 168 · closer 96 · section 72 · case 48 · lede 30 · body 17. In the experience column the title wraps to two lines ("where / i've been"), which is wanted. Phone keeps 36 px (the closer is 38 px there).

### 16.2 The build log is a terminal

The log card is the one dark surface on the page: ink background, cream text (`--canvas`), the title at 70 % cream, lines at 62 %, times at 45 %, the agent swatch squares keep their colours (the names stay cream: the agent colours at 13 px on ink fail 4.5:1), and a static shell prompt `$ █` (yellow block) sits after the last line (after "waiting for the agents" before any build). Times at 52 % cream (45 % failed 4.5:1). Border stays ink; the shadow gets a 2 px white gap (`0 0 0 2px #fff, 6px 6px 0 0 #161616`) so an ink shadow still reads on an ink card. Off state unchanged (the card is hidden).

### 16.3 The closer is the one big yellow

The closer and footer band (`band-4`) fills with the accent `#facc00` under the existing 2 px rule; the glow goes. Text is ink; the email pill becomes a white `btn` (ink text) so it still pops; github and linkedin stay white pills; the door's dashed border is ink at 50 %, its copy ink at 80 %; the footer is ink at 75 % with an ink underlined credit link. The One Yellow Rule is amended: yellow fills small things everywhere and this one band. Cursors and boxes read on yellow (white tag text on the agent colours is unchanged).

### 16.4 Agent traces

Every element an agent actually drew keeps a trace of its builder: at release `Swarm.tsx` sets `data-agent` and `--agent` on the element, and CSS draws two corner brackets (top-left and bottom-right) in the agent colour: 10 × 10 px, 1.5 px, 6 px outside the box (12 px below and right of `.card` and `.btn`, past their offset shadows), opacity `--trace: .8` (.6 read as dirt at 2.1 to 2.6:1), `pointer-events: none`, via `::before`/`::after` on `main [data-build][data-agent]:not(.row, .log)` (which gets `position: relative`). Only inside `main`: the bar's marks cluttered it and the full-bleed footer's pushed the page 6 px past both edges; the toolbox rows touch, so theirs stacked into a ruler. Instant builds (scrolled past, focus, overflow) carry no trace; rebuild clears `data-agent` with `data-built`. The finished page reads as a canvas in a design tool, still faintly selected by the six who built it. The log card is exempt (`overflow: hidden` would clip them and they would not read on ink). Off state: no traces (nothing was drawn). Also from the judge: the active experience index row is an ink chip (ink background, cream text), the one bold move in the flattest stretch of the page; and the highlight pins "build\u00a0things." so the second highlighted line is the key phrase.

### 16.5 The thesis is highlighted

The lede's first sentence, "now is the best time in history to build things.", is wrapped in `<mark class="hi">` (copy key `about.ledeMark`; `about.lede` is the rest of the paragraph and is rendered after it with a space): accent background, ink text, .12em side padding, `box-decoration-break: clone` so a wrapped highlight keeps its ends. It is the one highlighter stroke on the page.

### 16.6 Gate

Same gate. The judge compares before (`.playwright-mcp/look/d-full.jpeg`, 2026-11-08) and after at 1440 and 390, decides whether the traces read as character or noise at .4 / .6 / .8 opacity, compares the yellow closer with an ink alternative, and checks the swarm still builds 42/42 with traces appearing only on cursor-drawn elements.
