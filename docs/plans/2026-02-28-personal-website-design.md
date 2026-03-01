# Personal Website Design — ethanwangai

## Goal
A personal portfolio site for Ethan Wang targeting recruiters, startup/founder audiences, and technical peers. Single-page for now, expandable to multi-page (blog) later. Hosted on Vercel.

## Design Direction: "Data Visualization" — Quant-Inspired
Dark, sophisticated aesthetic inspired by Bloomberg terminals and data dashboards. Interactive WebGL hero, scroll-triggered animations, animated metric counters. Designed to reflect Ethan's quant/systems/AI background.

## Tech Stack
- **Next.js 14** (App Router) — Vercel-native, static export
- **Tailwind CSS** — utility-first styling
- **Framer Motion** — scroll animations, staggered reveals
- **Three.js / React Three Fiber** — interactive WebGL particle hero
- **TypeScript**
- No CMS/database. Content in code. Pure static site.

## Color Palette
| Role | Color | Hex |
|------|-------|-----|
| Background | Near-black with blue tint | `#0a0a0f` |
| Primary accent | Electric blue | `#3b82f6` |
| Secondary accent | Warm amber/gold | `#f59e0b` |
| Body text | Off-white | `#e4e4e7` |
| Muted text | Gray | `#71717a` |
| Depth gradients | Blue to purple | — |

## Typography
- **Headings:** Space Grotesk (geometric, modern)
- **Body:** Inter (legible, clean)
- **Monospace accent:** JetBrains Mono (tech tags, labels, stats)

## Page Sections

### 1. Hero (full viewport)
- Interactive particle network (React Three Fiber) — nodes/edges drift and respond to cursor
- Name in large bold type, centered, subtle glow
- One-liner tagline beneath (e.g. "Building systems that trade, scale, and think")
- Minimal top-right nav: About, Experience, Projects, Contact + GitHub icon
- Animated scroll indicator at bottom

### 2. About
- 2-3 sentence intro
- Side-by-side layout: text + animated stat counters (monospace, blue accent)
  - 20M+ monthly impressions
  - 500k contracts traded
  - 3,500+ trades/month
  - Top 100 Kalshi leaderboard

### 3. Experience — Interactive Timeline
- Vertical timeline, nodes light up on scroll
- Entries expand on hover/click to show bullets
- Role + company bold, dates in muted monospace
- Tech tags as small pills

### 4. Projects — Card Grid
- 2-column layout
- Each card: name, one-liner, key metric (accent color), tech tags
- Hover: lift + glow border + gradient shift
- Stagger-animate on scroll
- Kalshi project gets featured treatment (larger, animated chart line in card background)

### 5. Skills
- Wrapped grid of tech tags grouped by category (Languages, Frameworks, Infrastructure)
- Monospace pill styling, hover glow

### 6. Contact / Footer
- CTA: "Let's build something" or "Get in touch"
- Email, LinkedIn, GitHub icon links with hover animations
- Easter egg: blinking terminal cursor next to email

## Content Source
All content derived from resume (resume2.pdf in project root).

## Deployment
- Vercel (automatic via Next.js)
- Static export, zero runtime cost
