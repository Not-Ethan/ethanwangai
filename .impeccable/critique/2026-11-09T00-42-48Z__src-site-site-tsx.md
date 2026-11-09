---
target: the homepage (src/site/Site.tsx, served export), third run
total_score: 23
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 3
target_identity: "file:/Users/Ethan_1/ethanwangai/src/site/Site.tsx"
target_fingerprint: "sha256:b5db42508980c40f4a69ae2889101a7f8f9762096525a6576401689d2113e5b4"
target_path: /Users/Ethan_1/ethanwangai/src/site/Site.tsx
timestamp: 2026-11-09T00-42-48Z
slug: src-site-site-tsx
---
Method: dual-agent (A: design review, Opus, own Chromium contexts at 1440×900, 1280×720, 834×1112 and 390×844, reduced motion and default · B: detector + headless overlay, Opus) plus an isolated copy review (C: Opus, every string against Ethan's thesis paragraph, voice rules and facts). Third run, HEAD 809e708, after Ethan said "the copy and layout need a bit of work".

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | pill, nav underline, index dot and log work; pill hidden under 1024 |
| 2 | Match system / real world | 3 | plain words; "watch them" and the log only make sense once the door explains them at the end; "kalshi · independent trader" can read as a job at Kalshi |
| 3 | User control and freedom | 3 | instant jumps, rebuild, reduced motion honoured |
| 4 | Consistency and standards | 3 | dashed pill is a link with the swarm on and not a link with it off; experience lede muted while work lede is ink |
| 5 | Error prevention | 3 | off-state ghost looks like a button |
| 6 | Recognition rather than recall | 2 | kalshi, heron, darch, nist each told twice ~1,800 px apart under different names |
| 7 | Flexibility and efficiency | n/a | portfolio |
| 8 | Aesthetic and minimalist design | 3 | strong system; repetition (projects twice, "agents resting" three times off, index repeats card titles) |
| 9 | Error recovery | 3 | off states explain themselves; footer contradicts them |
| 10 | Help and documentation | n/a | portfolio |
| **Total** | | **23/32 (72 %)** | **Good** (24 last run; the drop is heuristic 6, judged harder this time) |

## Design Specificity Verdict

**LLM assessment (A):** the concept is Ethan's (the swarm, the build log for a portrait, the schematics, the lowercase voice, "four things that ran"); the chassis is aahil-khan.xyz nearly unchanged (section order, 386/578, 319/637, 510/462 columns, chip rows, sticky index, dashed pill, the "oh, and…" door). With the swarm off it is a reskin of another person's portfolio. The copy (C) is strongest where it uses his words or a concrete image; the weak lines are resume facts written as fragments, repeated section by section, with two central thesis ideas (best time in history; diversification) missing and his one verbatim sentence altered ("the coding").

**Deterministic scan (B):** `out/index.html` 25 findings (5 primary / 20 advisory; `--scope layout` 0); URL scans 22 at 1280 and 21 at 390. Every finding is a documented choice (16 hard offset shadows, cream canvas, hero grid, three drawn schematics) or a scanner artifact (next/font family names, Next's error-page `#000`, tight-leading on one-line display headings). B's own checks: no text under 4.5:1 (worst 4.57 on `.case__no`); no horizontal overflow at 390; heading levels in order; the bar fits at 768, 820 and 1024. Real mechanical items: three 42 px `btn-sm` buttons; the off-state door paragraph at 87 ch; DESIGN.md prose stale on the phone bar and the phone closer size.

**Visual overlays:** headless overlay drew 15 boxes at both widths (all hard-offset-shadow); no [Human] tab.

## Overall Impression

The opening and the ending work. The middle tells the same four projects twice before the proof arrives, the hero headline outweighs the thesis it supports, and the copy drifts from his words into fragments. Biggest opportunity: move the work up, cut the repetition, and put his thesis back in his order.

## What's Working

1. The visual system holds everywhere: 2 px ink, flat shadows, one yellow for small fills, mono for machine output.
2. The name and the 96 px closer bookend the page; the sticky index and nav underline are quiet and correct.
3. The fallbacks are honest: no JS, reduced motion and a failed bundle all read fully.

## Priority Issues

- **[P1] The same four projects are told twice and the proof starts 4.5 screens down.** Experience + work are 48 % of the page; work begins at y≈4016 (5056 on phone). Fix: order hero, about, work, experience, toolbox, rest, closer; nav about · work · experience · contact; about band white, bands still alternate. Command: /impeccable layout
- **[P1] The hero headline runs 4 lines at 1440, 62 % of it bold, and the hero overflows the 900 px fold.** Fix: `.headline` `clamp(28px, 3.6vw, 52px)` (3 lines, hero 900); close the hero with a 2 px rule and fade the grid, as the reference. Command: /impeccable layout
- **[P1] The copy drifts from his words.** Missing: "now is the best time in history to build things" and the diversification idea; altered: "never really liked the coding"; 9 fragments; "watch" ×6, "video factory" ×3, darch's end date ×3 in one card; "this summer", "today" (false under reduced motion), "fluent", "i answer all of them", "a bet that i could" unbacked; "open webui", "sized the liability", "venues" jargon. Fix: about in thesis order; experience in full sentences with "i"; each number once; off state says "the agents are off"; index subs name the subject. Command: /impeccable clarify
- **[P2] The portrait slot is underfilled on and a stub off.** `LOG_KEEP = 9` leaves ~140 px blank; off state is a 146 px card beside a 439 px column. Fix: keep 13 lines with a top fade; hide the card off and run the text one column. Command: /impeccable polish
- **[P2] Phone experience is a 2,312 px wall at a 282 px measure; the 768 to 1023 range squeezes the desktop grids** (204 px index, 298 px work body, 217 px rest cards, 540 px empty hero). Fix: phone card padding 24/20 and shorter copy; a tablet query with single columns, index hidden, hero centred. Command: /impeccable adapt
- **[P3] Off-state repetition and small mechanics.** "agents absent" said three times off and the footer says "the agents are done"; the phone ghost is a two-line dashed box; `btn-sm` 42 px; chips 36 px vs the reference's 44; the heron tab and nist chat schematics read as placeholders. Command: /impeccable polish

## Persona Red Flags

**Recruiter on a laptop (1280×720):** name and headline, action row at 635–687; then chips, five job cards, then the same four names again in work ("two internships and side projects stretched to nine entries"); school is the last muted about note and a card at y=5719.

**Engineer at a trading firm:** the kalshi ladder (unlabelled) gets more area than the two sentences of claims; "no write-ups" with nothing to inspect; the experience card and the work case describe one system twice; "kalshi · independent trader" sits in the employer slot.

**Casey (phone, one hand):** 9,672 px page; 2.7 screens of job cards; a malformed-looking ghost box in the thumb zone; contact only via the nav link or a swipe to y≈9033.

## Minor Observations

`.job__lede` and `.job__body` share one colour and size so neither leads; the card title repeats the index entry 80 px away; the phone closer h2 at 42 px orphans "building"; the log card sits between the greeting and the thesis on phone; the grid stops dead at the hero's edge; 13 px uppercase labels are gone, good; the mark at x=72 vs the column at 202 matches the reference.

## Questions to Consider

1. Should experience exist as its own section when four of its five entries are the work?
2. What if the portrait slot listed the 42 instructions the agents were given, full in every state?
3. Does the hero still need the ghost pill on desktop when six cursors and a counting pill are already visible?
4. Would Ethan say on the page that AI agents wrote most of its code from his plain-language instructions? It is true and it is the thesis.
