# Product

<!-- impeccable:product-schema 1 -->

Written 2026-11-02 from Ethan's own statements (2026-09-27 thesis and voice rules, 2026-10-08 simplicity rules, 2026-11-02 layout and swarm request) and the repo. Lines marked *inferred* were not confirmed by Ethan.

## Platform

web

## Users

- Primary: people deciding whether to work with Ethan: recruiters and engineers at trading firms and startups, founders, and anyone he sends the link to. They skim on a laptop, sometimes a phone, and decide within a minute whether to keep reading or email. *inferred from the site's purpose*
- Secondary: friends and classmates. *inferred*

## Product Purpose

A one-page personal site, ethanwang.ai, that shows what Ethan built and that it ran: a trading algorithm on kalshi, a video factory (darch), a hedge for bar promos (heron), two internships (nist, wvu medicine), discord bots in middle school. Success is that the reader believes the work is real, hears his voice, and emails him.

## Positioning

The page is built in front of the reader by a swarm of named cursors drawing each element in. The argument of the site (a few sentences of plain language now turn into thousands of lines of code; he builds things and watches them run) is enacted on the page, not just stated. Ethan asked for this on 2026-11-02.

## Operating Context

Static export served from a CDN. No backend, no analytics, no keys, no cron, no storage; zero maintenance (Ethan, 2026-10-08: "dont hook into real world stuff im not gonna have time to maintain this stuff anyway. keep it simple"). Read mostly once, often from a link in a message.

## Capabilities and Constraints

- Every string lives in `src/site/copy.ts`; every number in `src/site/facts.ts`. Public numbers only.
- Never on the site: a dollar profit figure, an exact leaderboard rank, notional or volume figures, the word "contracts", the phone number, a resume link or file (the resume is private, Ethan 2026-10-09).
- Contact: ethan.wanq@gmail.com; github Not-Ethan; linkedin edw173.
- The swarm must degrade: the page is fully visible without JavaScript, under reduced motion, and if the bundle never loads.
- Layout follows https://www.aahil-khan.xyz/ at Ethan's request (2026-11-02): same section order, grid, type scale and card language.
- Three agents on phones, six on desktop; everything else is identical across sizes.

## Brand Commitments

- Name: ethan wang. The name is uppercase only as display type; all other copy is lowercase.
- Voice: lowercase, blunt, plain words, full sentences, no hype, no resume bullets. Ethan rejected earlier copy as "super AI generated" and said it "doesnt have my voice" (2026-09-27). The thesis paragraph he wrote is the source of every headline.
- He wants "a website with a lot of motion".

## Evidence on Hand

- Ethan's thesis paragraph (quoted into the copy in `docs/plans/2026-11-02-agents-build-the-site-design.md` §6).
- Facts from his private resume, used as facts and never as bullets: kalshi since jan 2026, about 30,000 live trades, top 100 all-time on the crypto profit leaderboard; heron co-founder since june 2026, bars in four cities; darch co-founder june 2025 to may 2026, about 3,000 videos a month and 20 million views a month; nist software intern summer 2025; wvu medicine ml intern summer 2026 over about $100M a year of pharmacy claims; cwru computer science with a secondary major in mathematics, class of 2028; tartanhacks 2025 innovation award for orbit; speaks mandarin.
- No photos, no screenshots of the projects, no testimonials, no logos. Future work must not fabricate any of these.

## Product Principles

1. Only things that ran get space on the page.
2. His words, never a template's.
3. The effect is the argument, and it never blocks reading.
4. Zero maintenance: files on a CDN that still work in three years.
5. Nothing private leaks.

## Accessibility & Inclusion

Reduced motion shows the page at once with no cursors. Keyboard focus stays visible. Text contrast meets WCAG AA. *inferred requirements; no product-specific user need was established*
