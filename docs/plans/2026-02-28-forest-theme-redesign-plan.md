# Forest Theme Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the blue-tech portfolio aesthetic with a serene forest theme — SVG parallax hero, green/earth color palette across all components.

**Architecture:** Drop three.js particle background entirely. Replace with a pure SVG + Framer Motion `useScroll`/`useTransform` parallax forest scene. Recolor all components via CSS custom property changes and targeted Tailwind class updates in each component file.

**Tech Stack:** Next.js 16, React 19, Framer Motion 12, Tailwind CSS 4, inline SVG

---

### Task 1: Update Color Palette in globals.css

**Files:**
- Modify: `src/app/globals.css:8-37`

**Step 1: Replace color tokens and keyframes**

Replace the entire `@theme { ... }` block with the forest palette:

```css
@theme {
  --color-bg: #0b1a0f;
  --color-bg-card: #111f14;
  --color-bg-card-hover: #1a2e1d;
  --color-accent: #4ade80;
  --color-accent-glow: #4ade8060;
  --color-gold: #d4a574;
  --color-trunk: #8b6f47;
  --color-muted: #6b7f6b;
  --color-light: #e2e8df;

  --font-heading: "Space Grotesk", sans-serif;
  --font-body: "Inter", sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  --animate-float: float 6s ease-in-out infinite;
  --animate-glow-pulse: glow-pulse 2s ease-in-out infinite alternate;
  --animate-blink: blink 1s step-end infinite;

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  @keyframes glow-pulse {
    0% { box-shadow: 0 0 5px #4ade8030; }
    100% { box-shadow: 0 0 20px #4ade8060; }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Compiles successfully. All existing components automatically pick up the new color values through the CSS custom properties. No component changes needed for this step.

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style: switch color palette to forest theme"
```

---

### Task 2: Create ForestScene Component

**Files:**
- Create: `src/components/ForestScene.tsx`

**Step 1: Create the SVG parallax forest component**

This component renders 5 SVG layers with scroll-driven parallax using Framer Motion's `useScroll` and `useTransform`. Each layer moves at a different rate. Trees grow upward on initial load via `scaleY` animation.

```tsx
"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function ForestScene() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, 250]);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      {/* Sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b1a0f] via-[#0f2614] to-[#132e18]" />

      {/* Layer 1: Distant mountains — slowest parallax */}
      <motion.div style={{ y: y1 }} className="absolute inset-0">
        <svg
          viewBox="0 0 1440 400"
          className="absolute bottom-0 w-full h-[50%] min-h-[200px]"
          preserveAspectRatio="xMidYMax slice"
          fill="none"
        >
          <motion.path
            d="M0 400 L0 280 Q120 200 240 260 Q360 180 480 240 Q600 160 720 220 Q840 140 960 200 Q1080 160 1200 230 Q1320 190 1440 250 L1440 400 Z"
            fill="#0f2a12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
          />
        </svg>
      </motion.div>

      {/* Layer 2: Mid-ground tree line — medium parallax */}
      <motion.div style={{ y: y2 }} className="absolute inset-0">
        <svg
          viewBox="0 0 1440 500"
          className="absolute bottom-0 w-full h-[55%] min-h-[220px]"
          preserveAspectRatio="xMidYMax slice"
          fill="none"
        >
          <motion.g
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
            style={{ transformOrigin: "bottom" }}
          >
            {/* Tree cluster left */}
            <path d="M80 500 L80 320 L60 320 L100 240 L80 240 L110 180 L90 180 L120 120 L150 180 L130 180 L160 240 L140 240 L180 320 L160 320 L160 500 Z" fill="#143d1a" />
            <path d="M200 500 L200 350 L180 350 L220 280 L200 280 L230 220 L210 220 L240 160 L270 220 L250 220 L280 280 L260 280 L300 350 L280 350 L280 500 Z" fill="#1a4a20" />
            {/* Tree cluster center-left */}
            <path d="M400 500 L400 300 L375 300 L420 220 L395 220 L440 150 L415 150 L450 90 L485 150 L460 150 L505 220 L480 220 L525 300 L500 300 L500 500 Z" fill="#143d1a" />
            <path d="M520 500 L520 340 L500 340 L540 270 L520 270 L555 210 L535 210 L565 150 L595 210 L575 210 L610 270 L590 270 L630 340 L610 340 L610 500 Z" fill="#1a4a20" />
            {/* Tree cluster center */}
            <path d="M680 500 L680 310 L660 310 L700 240 L680 240 L720 170 L700 170 L730 100 L760 170 L740 170 L780 240 L760 240 L800 310 L780 310 L780 500 Z" fill="#164218" />
            {/* Tree cluster center-right */}
            <path d="M880 500 L880 330 L860 330 L900 260 L880 260 L920 190 L900 190 L935 120 L970 190 L950 190 L990 260 L970 260 L1010 330 L990 330 L990 500 Z" fill="#143d1a" />
            <path d="M1020 500 L1020 350 L1000 350 L1040 280 L1020 280 L1060 210 L1040 210 L1075 140 L1110 210 L1090 210 L1130 280 L1110 280 L1150 350 L1130 350 L1130 500 Z" fill="#1a4a20" />
            {/* Tree cluster right */}
            <path d="M1250 500 L1250 310 L1230 310 L1270 230 L1250 230 L1290 160 L1270 160 L1305 100 L1340 160 L1320 160 L1360 230 L1340 230 L1380 310 L1360 310 L1360 500 Z" fill="#164218" />
          </motion.g>
          {/* Ground fill */}
          <rect x="0" y="420" width="1440" height="80" fill="#112e14" />
        </svg>
      </motion.div>

      {/* Layer 3: Foreground trees — fastest parallax */}
      <motion.div style={{ y: y3 }} className="absolute inset-0">
        <svg
          viewBox="0 0 1440 600"
          className="absolute bottom-0 w-full h-[50%] min-h-[200px]"
          preserveAspectRatio="xMidYMax slice"
          fill="none"
        >
          <motion.g
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 1.5, delay: 0.6, ease: "easeOut" }}
            style={{ transformOrigin: "bottom" }}
          >
            {/* Large tree left edge */}
            <path d="M-20 600 L-20 350 L-50 350 L10 260 L-20 260 L30 180 L0 180 L50 100 L100 180 L70 180 L120 260 L90 260 L150 350 L120 350 L120 600 Z" fill="#0d2e10" />
            {/* Large tree right edge */}
            <path d="M1320 600 L1320 340 L1290 340 L1340 250 L1310 250 L1360 170 L1330 170 L1380 90 L1430 170 L1400 170 L1450 250 L1420 250 L1470 340 L1440 340 L1440 600 Z" fill="#0d2e10" />
          </motion.g>
          {/* Ground */}
          <rect x="0" y="520" width="1440" height="80" fill="#0b1a0f" />
        </svg>
      </motion.div>

      {/* Layer 4: Ground fog */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0b1a0f] via-[#0b1a0f]/80 to-transparent" />
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Compiles with no errors (component is not yet imported anywhere).

**Step 3: Commit**

```bash
git add src/components/ForestScene.tsx
git commit -m "feat: add ForestScene SVG parallax hero background"
```

---

### Task 3: Replace ParticleNetwork with ForestScene in Hero

**Files:**
- Modify: `src/components/Hero.tsx` (full file)
- Delete: `src/components/ParticleNetwork.tsx`

**Step 1: Rewrite Hero.tsx**

Replace the entire file:

```tsx
"use client";

import { motion } from "framer-motion";
import { siteConfig } from "@/lib/data";
import ForestScene from "./ForestScene";

export default function Hero() {
  return (
    <section id="hero" className="relative h-screen flex items-center justify-center overflow-hidden">
      <ForestScene />

      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-bg/30 via-transparent to-bg" />

      <div className="relative z-10 text-center px-6">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-6xl md:text-8xl font-heading font-bold text-light"
          style={{ textShadow: "0 0 40px rgba(74, 222, 128, 0.3)" }}
        >
          {siteConfig.name}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-6 text-lg md:text-xl text-muted font-mono"
        >
          {siteConfig.tagline}
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 z-10 flex flex-col items-center gap-2"
      >
        <span className="text-xs font-mono text-muted">scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-4 h-7 border-2 border-muted/40 rounded-full flex justify-center pt-1"
        >
          <div className="w-1 h-1.5 bg-accent rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
}
```

**Step 2: Delete ParticleNetwork.tsx**

```bash
rm src/components/ParticleNetwork.tsx
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Compiles successfully. ParticleNetwork is no longer imported.

**Step 4: Commit**

```bash
git add src/components/Hero.tsx
git rm src/components/ParticleNetwork.tsx
git commit -m "feat: replace particle network with SVG forest parallax hero"
```

---

### Task 4: Remove three.js Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Uninstall three.js packages**

```bash
npm uninstall three @react-three/fiber @react-three/drei @types/three
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Compiles successfully. No remaining imports of three.js packages.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove three.js dependencies (replaced with SVG)"
```

---

### Task 5: Update Section Dividers with Vine SVG

**Files:**
- Modify: `src/app/page.tsx:9-15`

**Step 1: Replace the SectionDivider component**

Replace the `SectionDivider` function with a vine/branch SVG motif:

```tsx
function SectionDivider() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-2">
      <svg viewBox="0 0 800 20" className="w-full h-5 text-accent/20" fill="none" preserveAspectRatio="xMidYMid meet">
        <path d="M0 10 Q200 10 400 10 Q600 10 800 10" stroke="currentColor" strokeWidth="0.5" />
        {/* Leaves along the vine */}
        <path d="M150 10 Q155 4 165 6 Q158 8 150 10 Z" fill="currentColor" />
        <path d="M300 10 Q295 16 285 14 Q292 12 300 10 Z" fill="currentColor" />
        <path d="M500 10 Q505 4 515 6 Q508 8 500 10 Z" fill="currentColor" />
        <path d="M650 10 Q645 16 635 14 Q642 12 650 10 Z" fill="currentColor" />
      </svg>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Compiles successfully.

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "style: replace gradient dividers with vine SVG motif"
```

---

### Task 6: Update Experience Timeline to Tree Trunk

**Files:**
- Modify: `src/components/Experience.tsx:20,31`

**Step 1: Change timeline line to trunk color**

On line 20, replace:
```tsx
<div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-accent/50 via-accent/20 to-transparent" />
```
with:
```tsx
<div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-trunk/60 via-trunk/30 to-transparent" />
```

**Step 2: Change timeline nodes to leaf style**

On line 31, replace:
```tsx
<div className="absolute left-[9px] top-1.5 w-3 h-3 rounded-full border-2 border-accent bg-bg group-hover:bg-accent transition-colors duration-300" />
```
with:
```tsx
<div className="absolute left-[9px] top-1.5 w-3 h-3 rounded-full border-2 border-trunk bg-bg group-hover:bg-accent transition-colors duration-300" />
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Compiles successfully.

**Step 4: Commit**

```bash
git add src/components/Experience.tsx
git commit -m "style: restyle experience timeline as tree trunk with leaf nodes"
```

---

### Task 7: Update Projects Card Hover Effects

**Files:**
- Modify: `src/components/Projects.tsx:13`

**Step 1: Update hover shadow color**

On line 13, replace:
```tsx
      className={`group relative rounded-xl border border-white/5 bg-bg-card p-6 transition-all duration-500 hover:border-accent/30 hover:bg-bg-card-hover hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] ${
```
with:
```tsx
      className={`group relative rounded-xl border border-white/5 bg-bg-card p-6 transition-all duration-500 hover:border-accent/30 hover:bg-bg-card-hover hover:shadow-[0_0_30px_rgba(74,222,128,0.1)] ${
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Compiles successfully.

**Step 3: Commit**

```bash
git add src/components/Projects.tsx
git commit -m "style: update project card hover glow to green"
```

---

### Task 8: Update Skills Hover Effects

**Files:**
- Modify: `src/components/Skills.tsx:41`

**Step 1: Update hover glow color**

On line 41, replace:
```tsx
                    whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(59,130,246,0.3)" }}
```
with:
```tsx
                    whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(74,222,128,0.3)" }}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Compiles successfully.

**Step 3: Commit**

```bash
git add src/components/Skills.tsx
git commit -m "style: update skill badges hover glow to green"
```

---

### Task 9: Verify Full Build and Visual Check

**Step 1: Full build**

Run: `npm run build`
Expected: Compiles with zero errors and zero warnings.

**Step 2: Dev server check**

Run: `npm run dev`

Verify:
- Hero shows SVG forest with parallax scroll depth
- Trees grow upward on page load
- All text/accents are green (not blue)
- Section dividers show vine pattern
- Experience timeline is brown trunk, green nodes on hover
- Project cards glow green on hover
- Skill badges glow green on hover
- Contact CTA is green
- Navbar hover colors are green
- Carousel accent colors still work (green for Darch, bark for Kalshi)
- Mobile responsive layout intact
