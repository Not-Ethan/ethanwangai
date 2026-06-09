# ethanwang.ai

Personal site for Ethan Wang — designed as a night hike: the page opens 44m
up, above a moonlit canopy, and scrolling descends through the forest
(About → Experience → Projects → Skills) until you reach a campfire on the
forest floor.

Built with Next.js (App Router), Tailwind CSS v4, and Framer Motion.
Ambient details — drifting fireflies, parallax treelines, a scroll-drawn
trail, and an altimeter that ticks down as you descend — are lightweight
canvas/SVG, respect `prefers-reduced-motion`, and work on mobile.

## Development

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # production build
npm run lint
```

Content (experience, projects, stats) lives in `src/lib/data.ts`.
Scenery generators (treelines, stars, terrain) live in `src/lib/forest.ts`.
