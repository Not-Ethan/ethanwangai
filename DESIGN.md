---
name: ethan wang
description: A one-page personal site in warm paper tones, hard black outlines and offset shadows, one yellow accent, built in front of the reader by six named colored cursors.
colors:
  canvas: "#f7f5ee"
  canvas-toolbox: "#e3e1da"
  canvas-work: "#f3f3f3"
  canvas-closer: "#facc00"
  surface: "#ffffff"
  ink: "#161616"
  ink-muted: "rgba(22,22,22,0.74)"
  ink-subtle: "rgba(22,22,22,0.6)"
  grid-line: "rgba(22,22,22,0.11)"
  accent: "#facc00"
  agent-blue: "#2563eb"
  agent-red: "#dc2626"
  agent-green: "#15803d"
  agent-violet: "#7c3aed"
  agent-orange: "#c2410c"
  agent-pink: "#db2777"
typography:
  name:
    fontFamily: "Space Grotesk Variable, system-ui, sans-serif"
    fontSize: "clamp(64px, 11.7vw, 168px)"
    fontWeight: 700
    lineHeight: 0.82
    letterSpacing: "-0.045em"
  closer-headline:
    fontFamily: "Space Grotesk Variable, system-ui, sans-serif"
    fontSize: "clamp(48px, 6.7vw, 96px)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.04em"
  hero-headline:
    fontFamily: "Space Grotesk Variable, system-ui, sans-serif"
    fontSize: "clamp(28px, 3.6vw, 52px)"
    fontWeight: 500
    lineHeight: 1.12
    letterSpacing: "-0.02em"
  case-title:
    fontFamily: "Space Grotesk Variable, system-ui, sans-serif"
    fontSize: "clamp(32px, 3.3vw, 48px)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  section-title:
    fontFamily: "Space Grotesk Variable, system-ui, sans-serif"
    fontSize: "clamp(44px, 5vw, 72px)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  mail-link:
    fontFamily: "Space Grotesk Variable, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  lede:
    fontFamily: "Space Grotesk Variable, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "-0.02em"
  job-lede:
    fontFamily: "Space Grotesk Variable, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.5
  job-title:
    fontFamily: "Space Grotesk Variable, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.65
  body:
    fontFamily: "Space Grotesk Variable, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.65
  button:
    fontFamily: "Space Grotesk Variable, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.65
  label:
    fontFamily: "Space Grotesk Variable, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.65
    letterSpacing: "0.14em"
  hud:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1
  hud-phone:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "10px"
    fontWeight: 400
    lineHeight: 1
  nav-phone:
    fontFamily: "Space Grotesk Variable, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.65
  small:
    fontFamily: "Space Grotesk Variable, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.65
  nav:
    fontFamily: "Space Grotesk Variable, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.65
  closer-body:
    fontFamily: "Space Grotesk Variable, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.65
  mail-phone:
    fontFamily: "Space Grotesk Variable, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.3
  mail-desktop:
    fontFamily: "Space Grotesk Variable, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  lede-phone:
    fontFamily: "Space Grotesk Variable, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 500
    lineHeight: 1.35
rounded:
  mark: "8px"
  tag: "4px"
  chip: "8px"
  shot: "10px"
  card: "14px"
  pill: "999px"
spacing:
  gap-chip: "8px"
  gap-actions: "14px"
  gutter-phone: "20px"
  card-pad: "32px"
  wrap-pad: "72px"
  section-pad: "108px"
components:
  btn:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0 8px 0 24px"
    height: "52px"
  btn-hover:
    backgroundColor: "{colors.surface}"
  btn-sm:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  btn-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "52px"
  ghost:
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "52px"
  badge:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "32px"
  card-6:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "14px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
    padding: "9px 16px"
    typography: "16px / 1.4"
  status-pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.hud}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "32px"
  mark:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
    rounded: "{rounded.mark}"
    size: "46px"
  totop:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "48px"
  cursor-tag:
    backgroundColor: "{colors.agent-blue}"
    textColor: "{colors.surface}"
    typography: "{typography.hud}"
    rounded: "4px"
    padding: "3px 6px"
---

# Design System: ethan wang

<!-- Descriptive language below (north star, color names, component feel) was written from PRODUCT.md and the code; Ethan has not confirmed it. -->

## Overview

**Creative North Star: "The Drafting Table"**

The page is a warm paper sheet with a heavy black pencil outline around everything that matters, and the page assembles itself while you watch. Six colored cursors, each with a name tag, drag selection boxes over the elements, and each element appears as its box is drawn. The system is a hard-edged, neo-brutalist card language (2px ink outlines, flat offset shadows, one yellow accent) borrowed on purpose from https://www.aahil-khan.xyz/, because Ethan asked for that layout. The cursors are the only multi-color thing on the page; the site itself stays paper, ink and yellow.

Density is medium and editorial. Sections are separated by generous vertical padding (108px) and, three times, by tinted bands closed with 2px ink rules. Type is one family (Space Grotesk) used loud at the top (an uppercase name up to 168px) and plain everywhere else. Monospace appears only in the swarm HUD and in a few facts that read as machine output (status pill, build log, case numbers, the drawn schematics).

The system rejects softness. There are no blurs on content, no gradients except one static glow behind the hero and the grid fade under it, one dark surface (the build log card) and one full yellow band (the closer), no dark mode (`color-scheme: light`), no photos, no logos, no icons beyond a few inline SVG arrows.

**Key Characteristics:**
- Warm off-white paper (#f7f5ee) with true-black ink (#161616); everything outlined at 2px.
- Flat offset shadows (no blur) as the only elevation: 2, 4, or 6px down-right in solid ink.
- One yellow accent (#facc00), used for fills of small things: icon circle, badge, mark, bullets, dots, underline.
- Six agent colors live only inside the swarm overlay and the build log.
- Pills for actions, 14px rounded cards for content, 8px for chips.
- Lowercase copy; the name is the only uppercase display text.
- Motion is the swarm. Nothing else moves except a button nudge and the to-top fade.

## Colors

A warm paper neutral base, near-black ink, one saturated yellow, and a separate six-color agent set that only appears as cursor, box and log color.

### Primary
- **Marker Yellow** (`{colors.accent}`, #facc00): the single accent. Fills the circular arrow icon inside `btn`, the whole `btn-accent`, the `badge`, the `mark` square, the active dot and square bullets (outlined in ink), and the email pill's white-on-yellow companion in the closer. Also appears as one soft static glow in the hero (rgba(250,204,0,.28)), the yellow bars in the drawn schematics, the block caret in the build log, the one highlighter stroke (`<mark class="hi">` on the lede's first sentence, ink text, .12em side padding), and, once, the whole closer and footer band. It is never used for text.

### Secondary (the agent set; swarm only)
- **Agent Blue** (#2563eb), **Agent Red** (#dc2626), **Agent Green** (#15803d), **Agent Violet** (#7c3aed), **Agent Orange** (#c2410c), **Agent Pink** (#db2777): agent 01 to 06, in that order. Each agent's color is also drawn on the page as two 10px corner brackets (top-left and bottom-right, 1.5px, 6px outside the box, opacity `--trace` .6, `pointer-events: none`) on every element that agent drew; instant builds (scrolled past, focus) carry none, the log card is exempt, rebuild clears them. Each agent's color is its cursor fill, name tag background, selection box border and 8% box fill, handle border, box label background, and the agent name in the build log. Phones use the first three. Colors are set per element through the `--agent` custom property. Tag and label text is white on these fills.

### Neutral
- **Paper** (`{colors.canvas}`, #f7f5ee): page background, hero, experience, rest; also the bar at 88% alpha.
- **Toolbox Stone** (`{colors.canvas-toolbox}`, #e3e1da): the toolbox band.
- **Work Mist** (`{colors.canvas-work}`, #f3f3f3): the work band (cooler, near neutral grey).
- **Closer Yellow** (`{colors.canvas-closer}`, #facc00, the accent): the closer and footer band, the one big yellow. Text on it is ink (paragraph and door copy 80%, door dashed border 50%, footer 75%, credit link ink); focus rings flip to an ink outline with a white halo.
- **Card White** (`{colors.surface}`, #ffffff): the about band, cards, buttons, chips, status pill, to-top, selection handles.
- **Ink** (`{colors.ink}`, #161616): text, every 2px border, every offset shadow, band rules.
- **Ink Muted** (`{colors.ink-muted}`, 74% ink): secondary body copy, nav links, job leads, ghost text.
- **Ink Subtle** (`{colors.ink-subtle}`, 60% ink): sub-lines, build log lines, case numbers. Row labels and the footer use Ink Muted (the 60% ink fails 4.5:1 on the darker bands).
- **Grid Line** (`{colors.grid-line}`, 11% ink): the 88px hero grid, 2px lines. Other hairlines use ink at 10 to 38% alpha (1px section rules at 10 to 12%, chip border at 24%, ghost dash at 32%, door dash at 38%); these are alpha variants of ink, not separate tokens.

### Named Rules
**The One Yellow Rule.** Yellow is the only accent. It fills small things everywhere (icons, badges, dots, the caret, the highlighter stroke) and, once, the closer band. Nothing else gets a large yellow panel. If a new element wants a second hue, it must be an agent color and live in the swarm overlay.

**The Agent Color Rule.** Red, green, violet, orange, pink and blue exist only as agent identity: the cursors, boxes, log and the corner-bracket traces on elements an agent drew. Never use them for page content, links, states or decoration. Traces: two 10px corner brackets (1.5px, the agent colour at `--trace: .8`, 6px outside the box; 12px below and right of cards and pills so they clear the offset shadow) on every element inside `main` that a cursor drew; the toolbox rows, the log card, the bar and the footer carry none, and nothing does when the swarm is off.

**The Ink Outline Rule.** Borders are ink (#161616) at 2px for structure; translucent ink is for hairlines and dashes only. Never a grey solid border.

## Typography

**Display Font:** Space Grotesk Variable (with system-ui, sans-serif), self-hosted through `next/font/local` (preloaded)
**Body Font:** Space Grotesk Variable (same)
**Label/Mono Font:** JetBrains Mono (variable, weights 100 to 800, latin, self-hosted via `next/font/local` as `--font-mono`, fallback ui-monospace), tabular numerals

**Character:** A geometric grotesque at heavy weight and tight tracking for the name and headings, plain weight for reading. The mono face is reserved for text that the swarm or a machine produced.

### Hierarchy
- **Name** (700, `clamp(64px, 11.7vw, 168px)`, line-height 0.82, tracking -0.045em, uppercase): the two-line "ethan / wang" h1. Phone floor is 64px. The only uppercase display text.
- **Closer headline** (700, `clamp(48px, 6.7vw, 96px)`, 0.95, -0.04em; `clamp(36px, 9.7vw, 48px)` on phone): the two-line contact h2.
- **Hero headline** (500 with one bold run at 700, `clamp(28px, 3.6vw, 52px)`, 1.12, -0.02em, max 17em so the cap scales with the type): the thesis line under the name. From 768px up the bold run is its own block, so the plain sentence sits whole on line one and the bold list takes two lines; on phone the run is inline (four lines).
- **Case title** (700, `clamp(32px, 3.3vw, 48px)`, 1.05, -0.03em): h3 of the four work cases.
- **Section title** (700, `clamp(44px, 5vw, 72px)`, 0.98, -0.035em; 36px, 1.1, -0.01em on phone): `.h2`, the whole section head (no eyebrow above it). The ladder is name 168 · closer 96 · section 72 · case 48 · lede 30 · body 17. The section intro is 18px, 18px below.
- **Mail link** (500, 22px, 1.3, -0.02em; 18px on phone): the email, set inside a `btn-accent` pill.
- **Lede** (500, 30px, 1.35, -0.02em; 24px on phone): the about paragraph.
- **Title** (700, 20px): job titles (`.job__title`) and case tags (400, 20px).
- **Job lede** (500, 18px, 1.5, ink): the lead line of each job; the body under it stays muted at 17px.
- **Body** (400, 17px, 1.65): default. Closer paragraph 18px, door paragraphs 16px at 1.6, footer 15px, footer credit 13px, chips 16px at 1.4, nav links 15px.
- **Button** (500, 16px; 15px at `btn-sm`).
- **Label** (600, 13px, lowercase, ink muted): `.eyebrow-sm` (card titles, the build log title) and the toolbox row labels. There are no eyebrows above headings.
- **HUD mono** (11px, line-height 1; 10px on phone): cursor tags and box labels. Also 13px build log lines (1.5), 12px status pill, 13px case numbers (0.1em tracking).

### Named Rules
**The Lowercase Rule.** Copy is lowercase. The name is uppercase only through CSS `text-transform` on display type, and card titles are uppercase through CSS on their lowercase source.

**The Mono Is A Machine Rule.** JetBrains Mono marks swarm output and machine-like facts only. Do not use it for headings, nav or body.

**The Weight Ladder Rule.** 700 for headings and names, 500 for leads, buttons, nav and labels, 400 for reading. No 300, no italics.

## Layout

A single-column editorial page on a 1180px max container (`.wrap`) with 72px side padding, which leaves a 1036px content column; on phones the padding is 20px. The fixed bar is 64px tall with the same side padding. Sections stack in this order, ids in parens: bar, hero (`top`), about, work, experience, toolbox, rest, closer (`contact`), footer.

Vertical rhythm is one big number: 108px section padding (about, experience, work, rest), 81px for the toolbox, 144px for the closer, 32px for the footer; 72 / 60 / 96 on phones. Section heads sit 56px above their content (32px for the experience index).

Grids, all `minmax(0, …fr)` ratios taken from the reference:
- About: 386fr / 578fr, 72px gap (build log card left, lede and notes right); the log card is a fixed 482px tall (320px on phone and tablet) and keeps 13 lines with a 28px fade at the top so a clipped line fades instead of being cut. With the swarm off the log card is hidden and about is one column (text capped at 760px). On phone the lede and notes come before the log card.
- Toolbox: rows of a 152px label and a flowing chip wrap, 18px row padding, separated by 1px rules at 10% ink; the label has 11px top padding to sit level with the first chip row.
- Experience: 319fr / 637fr, 80px gap; job ledes are ink 18px / 500, bodies muted; the left index is sticky at `top: 96px`; job cards stack with 36px gaps; job anchors scroll-margin 96px.
- Work: cases at 510fr / 462fr, 64px gap, 90px between cases, alternating sides via `direction: rtl` on every second case.
- Rest: three equal columns, 20px gap, 28px card padding.
- Closer: left aligned stack; the "door" is a two-column box (1fr / 240px, 48px gap, 32px padding, 72px above).

Hero is `min-height: 100svh` with a 2px ink rule at its bottom, and the 88px grid (which ends at the hero's bottom edge, not below it) fades out (mask, solid to 55% then transparent) before the rule. Nav landings on work and contact use `scroll-margin-top: -18px` and experience `-16px`, so a band's top rule lands under the bar's own 2px border instead of 16px below it. Content starts 145px from the top, name first, headline 28px below the name, actions 36px below with a 14px gap. Hero text blocks use `width: fit-content` so the swarm's boxes hug the text.

**Tablet range: 768 to 1023px.** Side padding drops to 40px; about, experience, cases and creds go single column; the experience index list is hidden; cases are never mirrored; the log is 320px; the hero is vertically centered with 96px padding; the status pill is hidden.

**Phone breakpoint: 767px.** Below it everything is one column, the bar shows the mark and the four nav links and hides "say hi" and the status (the status also hides under 1024px), card and cred padding is 24px / 20px, the experience index disappears and each job gains a visible title line, rows stack label over chips, cases are never mirrored, the hero content is vertically centered, the ghost is a plain caption line (14px, no border, no badge), and the swarm uses three agents instead of six. Chips, rows and chip lists wrap; nothing scrolls horizontally (`overflow-x: hidden` on body).

Drift from the spec: the spec says the 72px gutter applies at 1280 and above; the code applies it at every width above 767px.

### Named Rules
**The Reference Grid Rule.** Layout numbers (column ratios, paddings, type sizes) were measured from aahil-khan.xyz at Ethan's request. Do not "improve" them. Departures made on Ethan's 2026-11-08 request: section order (work before experience, toolbox after experience), headline 52 px, hero rule and grid fade, white about band, chip size.

## Elevation & Depth

Flat with hard offset shadows. There are no blurred shadows on content; depth is a solid ink rectangle offset down and right, plus one translucent sticky bar. The one blur is the bar's `backdrop-filter: blur(8px)` over a 88% paper fill; the swarm cursor has a tiny `drop-shadow(0 1px 1px rgba(22,22,22,.2))`.

### Shadow Vocabulary
- **Shadow 2** (`box-shadow: 2px 2px 0 0 #161616`, `--shadow-2`): small bar button (`btn-sm`) and the pressed state of `btn`.
- **Shadow 4** (`4px 4px 0 0 #161616`, `--shadow-4`): default for `btn`, `card`, `totop`.
- **Shadow 6** (`6px 6px 0 0 #161616`, `--shadow-6`): `card-6`, the framed work shots.
- **Bar rule:** the bar has a 1px bottom line at 10% ink, which becomes 2px solid ink once the page has scrolled more than 8px (`data-scrolled`).

### Named Rules
**The No Blur Rule.** Shadows have zero blur and are always solid ink. Never add soft or colored shadows.

**The Press-In Rule.** On hover a shadowed button moves 2px down and right and drops to shadow 2, so it looks pressed into the page.

## Shapes

Rounded rectangles with heavy outlines. Pills (999px) for every action, the status pill, the badge and the ghost; 14px for cards and the door; 8px for the `mark`, chips and index highlight; 10px for the work shot SVG; 4px for the swarm tags and labels; circles for the icon disc, to-top, and dots. Selection handles are sharp 7px squares. Square bullets (8px, yellow, ink outlined) mark job points. Borders are 2px ink for structure, 1.5px for badge, chip (24% ink), bullets and handle outlines. Dashed 2px borders (ghost 32% ink, door 38% ink) mean "not a real button / an invitation". The work shots are inline SVG schematics, not raster images.

## Components

### Buttons
- **Shape:** full pill (999px), 2px ink border, white fill, shadow 4.
- **Primary (`btn`):** 52px tall, 500 / 16px, padding 0 8px 0 24px, a 38px yellow circle at the right holding a 16px ink arrow.
- **Small (`btn-sm`):** 44px, 15px, padding 0 16px, shadow 2, no icon. Used for "say hi" in the bar (hidden on phone).
- **Accent (`btn-accent`):** yellow pill (white on the yellow closer band). Used for the email address in the closer (22px text, 18px on phone). The door's "rebuild the page" is the plain outlined `btn`.
- **Hover:** translate(2px, 2px) and shadow 2, over .2s with `cubic-bezier(.16, 1, .3, 1)`.
- **Disabled:** `.btn[disabled]` at 60% opacity, default cursor.
- **Ghost (`ghost`):** 52px pill, dashed 2px border at 32% ink, muted text, an 8px hollow yellow ring dot before the text, a yellow `badge` after it (11px, 700, 1.5px ink border). In the swarm-off state it is a plain caption (no border, no padding), and on phone in both states it is a 14px caption line with no border and no badge. The on-state ghost stays a link to `#about`.

### Chips
- **Style:** white fill, 1.5px border at 24% ink, 8px radius, 16px text, padding 9px 16px (about 44px tall). Flex wrap with 8px gaps. No hover, no selected state; they are labels, not controls.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** white on every band.
- **Shadow Strategy:** shadow 4 on `card`, shadow 6 and 14px padding on `card-6` (work shots).
- **Border:** 2px solid ink.
- **Internal Padding:** 32px (28px for the rest cards, 14px for shots); on phone 24px / 20px for cards and rest cards.
- **Door:** transparent, dashed 2px at 38% ink, 14px radius, 32px padding; no shadow.

### Navigation
- **Bar:** fixed, 64px, paper at 88% with blur. Left: the yellow `mark` ("ew", 46px square, 8px radius, 2px ink border, 700). Right: links (15px / 500, 10px 14px padding, muted, ink on hover), the status pill, then the small "say hi" pill. Phone shows the mark and the four nav links and hides "say hi".
- **Experience index:** sticky list; each row is a 10px dot plus name (17px / 500) and sub-line (13px subtle). The active row (nearest the viewport center) is an ink chip: ink background, cream name, sub-line at 70% cream, 8px radius and a filled yellow dot; others are muted with hollow dots.

### Status pill
- 32px tall pill, 2px ink border, white, no shadow, 12px mono, text like "6 agents · 12/43 built". Hidden under 1024px, on phone, and when the swarm is off.

### To top
- 48px (44px phone) white circle, 2px ink border, shadow 4, "↑" glyph, fixed 32px (20px phone) from the bottom-right, hidden (opacity 0) until scrollY passes 600, then fades in over .25s.

### Band borders
- Work (`band-3`) and toolbox (`band-2`) have 2px ink rules above and below; the hero has one below; the closer (`band-4`) has a 2px ink rule above only; the footer shares the closer band (yellow). About is white, experience and rest are paper, with no rules. No two rules touch.

### Swarm HUD (signature component)
- **Cursor:** an 18px arrow (path "M2 1.5 L2 14.5 L5.6 11.2 L8 16.5 L10.6 15.4 L8.2 10.2 L13 10.2 Z") filled with the agent color, 1.5px white stroke, round joins, a faint drop-shadow, transform origin at its tip.
- **Name tag:** mono 11px, white text on the agent color, 4px radius, padding 3px 6px, set 14px right and 16px below the tip; flips to the left of the tip near the right edge. Text is "agent 01" through "agent 06".
- **Selection box:** 1.5px border in the agent color, fill of the agent color at 8% (scaled by a `--fill` value), four 7px white square handles with 1.5px agent-colored borders at the corners (offset -4.5px).
- **Box label:** the element's name, mono 11px, white on the agent color, 4px radius, sitting 24px above the box's top-left (flips below the box near the viewport top).
- **Build log:** the one dark surface on the page: an ink card with cream text (title 70%, lines 62%, times 52%, agent names cream, swatches in agent colors), a 2px white gap under its ink shadow (`0 0 0 2px #fff, 6px 6px 0 0 #161616`) so the offset still reads, and a static shell prompt `$ █` (yellow block) after the last line. The about card holds a "build log" card title and a bottom-anchored list of 13px mono lines at 6px gaps in cream at 62%; each line starts with an 8px square swatch in the agent's color (top-aligned, so a wrapped line keeps it on the first line), then the agent name in cream, the prompt, and the seconds right-aligned. Before any line: "waiting for the agents".
- **Motion:** the swarm is the only motion system. Per job: travel to the element's corner (180 to 700ms at 1.8px/ms), press 70ms, drag the box open (280 to 950ms), release 120ms, linger 600ms with the last 250ms fading the box out. The element's clip grows with the drag from the top-left to the bottom-right. Idle agents drift a few pixels (5px / 4px, 2.4s / 3.1s periods) and sit inside the viewport. Outside the swarm, only the button press (.2s) and the to-top fade (.25s) animate. With reduced motion, without JavaScript, or if the bundle fails to load within 6s, `data-swarm` is never set (or removed), nothing is hidden and no cursors render; the ghost pill shows its resting line (a caption), the log card is hidden, the footer says "that's everything." only, and the status pill is hidden.
- **Overlay:** absolutely positioned over the body, clipped, `pointer-events: none`, z-index 60 (bar and to-top are 40). Unbuilt elements are opacity 0 until their box is dragged open.

## Do's and Don'ts

### Do:
- **Do** outline every card, button and pill in 2px #161616 and give it a flat offset shadow of 4px (2px when small, 6px for work shots).
- **Do** keep yellow (#facc00) to small fills, dots, bullets and one underline.
- **Do** set all copy lowercase with no dashes; use the middle dot (·) or a period instead. Only the name and card titles are uppercase, and only through CSS.
- **Do** keep type to Space Grotesk at weights 400, 500, 700, with tight negative tracking on large sizes and 0.14em on uppercase labels.
- **Do** use JetBrains Mono only for swarm HUD text, the status pill, case numbers and schematic text.
- **Do** give any new element a `Built` name so the swarm has a label and a box for it, and make hero and heading blocks `width: fit-content` so boxes hug text.
- **Do** keep the page fully readable with the swarm off or reduced motion on.

### Don't:
- **Don't** use blurred or colored shadows, gradients on content, rounded corners above 14px (except pills and circles), or dark mode.
- **Don't** introduce a second accent or use agent colors outside the swarm and build log.
- **Don't** add motion beyond the swarm, the 2px button press, and the .25s to-top fade: no scroll reveals, parallax or hover zooms. The four drawn schematics each carry one small loop that starts only once the swarm has built them and stops under reduced motion.
- **Don't** add photos, screenshots, logos, testimonials or icon sets; the work shots are drawn inline SVG schematics.
- **Don't** use em dashes, en dashes, resume-style bullets, hype words or title-cased copy.
- **Don't** change the reference layout numbers (1180 wrap, 72px gutter, 108px sections, 767px phone break) to taste.
- **Don't** use thin 1px outlines for structure, or grey solid borders.
