---
target: the homepage (src/site/Site.tsx, served export)
total_score: 21
max_score: 32
na_heuristics: 7,10
p0_count: 1
p1_count: 3
target_identity: "file:/Users/Ethan_1/ethanwangai/src/site/Site.tsx"
target_fingerprint: "sha256:2437218f4635c9d9d780be06863a3e30dfbe6cd55774e82270b471011eed99df"
target_path: /Users/Ethan_1/ethanwangai/src/site/Site.tsx
timestamp: 2026-11-02T23-48-06Z
slug: src-site-site-tsx
---
Method: dual-agent (A: design review, Opus, Playwright at 1440×900 and 390×844 · B: detector + headless overlay, Opus)

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | pill and log are good; each screen arrives blank for 0.5–1.5 s; pill hidden on phone; nav has no active state |
| 2 | Match system / real world | 3 | voice is plain; box labels are html jargon (`h1 name`, `p contact`); stat-arb, out of sample, rag, reconciles fills unexplained |
| 3 | User control and freedom | 2 | content gated by time; no skip; rebuild jumps to the top without warning |
| 4 | Consistency and standards | 2 | job titles only on phone; nav order differs from page order; default blue focus ring; rebuild has cursor: default |
| 5 | Error prevention | 3 | rebuild disabled while busy; focus lands on opacity-0 elements; bare mailto |
| 6 | Recognition rather than recall | 3 | desktop nav and sticky index good; phone has no section links on a 10,479 px page |
| 7 | Flexibility and efficiency | n/a | one-page portfolio, no repeat tasks |
| 8 | Aesthetic and minimalist design | 2 | four projects told twice; "top 100" four times; idle cursors sit on text; reduced-motion log card is an empty 482 px box |
| 9 | Error recovery | 3 | no-js, failed-bundle and reduced-motion paths degrade; 6 s blank on a failed bundle; reduced-motion door copy is false |
| 10 | Help and documentation | n/a | the door card explains the effect |
| **Total** | | **21/32 (66 %)** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment:** split. The interaction layer (the swarm, the counting pill, the self-logging build log, the door's "they don't exist", the voice) is authored for Ethan. The composition and visual system are a near copy of aahil-khan.xyz, which Ethan asked for, and are therefore category-interchangeable: remove the swarm and it is someone else's site. Missed chances: the agents draw design-tool selection boxes with anonymous names while the thesis is "plain language becomes code", and nothing on the page shows language becoming anything; the work shots are static on a site whose headline is "watch them run".

**Deterministic scan (B):** `out/index.html` 37 findings (12 primary, 25 advisory); URL scan of the built page 44 (12/32); 390 px URL scan 43 (10/33). True positives: hero-eyebrow-chip and kicker-above-heading ×5 (the eyebrows: a craft-floor ban), low-contrast on the footer (4.1:1 on #d8d6d0), toolbox labels (4.3:1 on #e3e1da), agent-coloured log names on white (2.8:1 orange, 3.3:1 green, 3.9:1 red), stragglers ×4 desktop and ×6 phone (no text-wrap: pretty), numbered-section-labels ×4, and body-text-viewport-edge at 390 px (confirmed: the hero block is 599 px wide). Intentional and documented in DESIGN.md: cream palette, hard offset shadows ×15, the 88 px hero grid, the shape-assembled SVG shots. False positives: tight-leading on 32–48 px display headings, design-system-font (next/font class resolves to JetBrains Mono), design-system-color #000 (Next error-page payload), design-system-radius 26 px and 4 px and most font-size findings (documented in DESIGN.md prose but missing from its token lists).

**Visual overlays:** the overlay ran in a headless browser (37 boxes drawn on the built page); no visible [Human] tab was presented.

## Overall Impression

The swarm works and is the only reason to visit; the first 1.5 s are the best moment on the site. Around it sits a borrowed portfolio layout with a real phone bug, a weak ending (the toy outranks the email) and a middle that tells the same four projects twice.

## What's Working

1. The swarm is the argument and is carefully built: nearest-centre assignment, seeded tempo, abandon rule, instant builds for anything scrolled past, and complete fallbacks (no js, 6 s failed-bundle reveal, reduced motion with changed copy).
2. The voice is his: "the bar doesn't eat that.", "i never really liked the coding.", "it runs while i sleep." No resume bullets.
3. The type hierarchy holds: one focal point per section, consistent card language.

## Priority Issues

- **[P0] Content is cut off on phones.** At 390 px the hero block is 599 px wide (the eyebrow rule's fixed 420 px width inside fit-content wrappers inflates the min-content of the flex-column hero and the phone experience grid); the headline, the ghost pill and all five job cards are clipped. Fix: let the rule shrink (`flex: 0 1 420px; min-width: 32px`), `min-width: 0` on the hero inner, `minmax(0, 1fr)` on the phone experience grid; a test at 360 and 390 px that no built element's right edge exceeds the viewport. Command: /impeccable adapt
- **[P1] The email is not the primary action at the end.** The only yellow-filled shadowed button is "rebuild the page ↻"; the email is a bare text link without hover. Fix: the email becomes the filled yellow pill with hover and focus; rebuild becomes an outlined pill inside the door. Command: /impeccable bolder (and quieter on the door)
- **[P1] The effect blocks reading** (Product Principle 3). Anchor jumps land on an empty band for 1–2.6 s; keyboard focus lands on opacity-0 elements; idle cursors sit on top of text forever. Fix: instant scroll for in-page links so agents arrive on the destination immediately; build on focus; compress tempo when the queue is long; fade idle cursors after 1.5 s so none rests on text. Command: /impeccable animate
- **[P1] On desktop the experience section never states a role.** The card title is phone-only and the index sub-line is a date. Fix: `company · role` on every card at every size; index sub-line `role · year`. Command: /impeccable clarify
- **[P2] The same four projects are told twice.** kalshi, heron, darch and nist appear in experience and work with overlapping sentences; "top 100" four times. Fix: experience covers the role (what he did), work covers the thing (what it did); each fact once. Command: /impeccable distill
- **[P2] Eyebrows and numbered labels.** Six kickers above headings (a craft-floor ban) and "01 / 2026 · trading" labels. Fix: delete the eyebrows and let the headings carry the section; drop the "01 /" prefix and keep "2026 · trading". Command: /impeccable typeset

## Persona Red Flags

**Jordan (first-timer, non-technical recruiter):** 0.6 s of empty grid with "0/43 built" reads like loading; box labels are markup jargon; "watch them" goes to #about but the explanation is at the bottom; desktop jobs have no titles; stat-arb, rag, open webui fork unexplained; nav "work" skips past experience; bare mailto with no hover.

**Riley (stress tester):** tab focus lands on opacity-0 elements; after rebuild, focus falls to body; under reduced motion the door still claims cursors drew the page and shows a disabled rebuild button with "it takes about as long as reading it did"; the log card is a 482 px white box with one line; a failed bundle gives 6 s of blank; the pill grows from 7 to 11 and shifts the nav; cursor tags collide (agent 05 on "row languages"); at 1280×720 "see the work" is below the fold.

**Casey (distracted phone user):** headline and ghost pill cut off on the first screen; all job cards cut off; no section links on phone, the only control is "say hi" at the top; the 320 px log card pushes his own words down; each screen waits about a second with three agents; the to-top button covers text; the email has scrolled off by the last screen.

## Minor Observations

No custom :focus-visible (1 px blue ring on 2 px ink borders); the education line breaks before "· class of 2028"; the pill needs a min-width; the footer says "the agents are done" while cursors still drift; job points have no bold anchors; agent names carry no character; the shots never move once built; hero actions end at 861 px at 1440×900.

## Questions to Consider

1. Why do the agents draw selection boxes instead of showing the sentence that produced each element ("my name, huge" → the box)?
2. Once the swarm stops, nothing runs. What if the four shots were the live part?
3. Remove the swarm: what is left that is not aahil-khan.xyz?
