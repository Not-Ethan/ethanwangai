# Personal Website Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Ethan Wang's personal portfolio site — a dark, quant-inspired single-page website with interactive WebGL hero, scroll animations, and animated stat counters.

**Architecture:** Next.js 14 App Router, single page with section components. React Three Fiber for the hero particle network. Framer Motion for all scroll-triggered animations. Content hardcoded in a data file. Static export for Vercel.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS v4, Framer Motion, Three.js + React Three Fiber, @react-three/drei

---

### Task 1: Project Scaffolding

**Files:**
- Create: Next.js project in `/Users/Ethan_1/ethanwangai/` (in-place)

**Step 1: Initialize Next.js project**

Run:
```bash
cd /Users/Ethan_1/ethanwangai && npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

When prompted about existing files, accept. This creates the Next.js skeleton with App Router, TypeScript, and Tailwind.

Expected: Project created with `src/app/`, `package.json`, `tailwind.config.ts`, etc.

**Step 2: Install additional dependencies**

Run:
```bash
cd /Users/Ethan_1/ethanwangai && npm install three @react-three/fiber @react-three/drei framer-motion @fontsource/space-grotesk @fontsource/inter @fontsource/jetbrains-mono react-icons
```

Expected: All packages installed successfully.

**Step 3: Verify dev server starts**

Run:
```bash
cd /Users/Ethan_1/ethanwangai && npm run dev &
sleep 5 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

Expected: HTTP 200. Kill the dev server after verifying.

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: scaffold Next.js project with dependencies"
```

---

### Task 2: Global Theme, Fonts, and Layout Shell

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/page.tsx`
- Create: `src/lib/data.ts` (all resume content)
- Modify: `tailwind.config.ts`

**Step 1: Configure Tailwind theme**

Update `tailwind.config.ts` to extend the theme with our custom colors, fonts, and animations:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0f",
        "bg-card": "#12121a",
        "bg-card-hover": "#1a1a2e",
        accent: "#3b82f6",
        "accent-glow": "#3b82f680",
        gold: "#f59e0b",
        muted: "#71717a",
        light: "#e4e4e7",
      },
      fontFamily: {
        heading: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite alternate",
        "blink": "blink 1s step-end infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "glow-pulse": {
          "0%": { boxShadow: "0 0 5px #3b82f640" },
          "100%": { boxShadow: "0 0 20px #3b82f680" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
```

**Step 2: Set up global CSS**

Replace `src/app/globals.css`:

```css
@import "tailwindcss";
@import "@fontsource/space-grotesk/400.css";
@import "@fontsource/space-grotesk/700.css";
@import "@fontsource/inter/400.css";
@import "@fontsource/inter/500.css";
@import "@fontsource/jetbrains-mono/400.css";

@theme {
  --color-bg: #0a0a0f;
  --color-bg-card: #12121a;
  --color-bg-card-hover: #1a1a2e;
  --color-accent: #3b82f6;
  --color-accent-glow: #3b82f680;
  --color-gold: #f59e0b;
  --color-muted: #71717a;
  --color-light: #e4e4e7;

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
    0% { box-shadow: 0 0 5px #3b82f640; }
    100% { box-shadow: 0 0 20px #3b82f680; }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
}

html {
  scroll-behavior: smooth;
}

body {
  background-color: var(--color-bg);
  color: var(--color-light);
  font-family: var(--font-body);
}

::selection {
  background-color: var(--color-accent);
  color: white;
}
```

**Step 3: Set up layout with font imports and metadata**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ethan Wang",
  description: "Software engineer, quantitative trader, and startup founder. Building systems that trade, scale, and think.",
  openGraph: {
    title: "Ethan Wang",
    description: "Software engineer, quantitative trader, and startup founder.",
    url: "https://ethanwang.ai",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-bg text-light font-body antialiased">
        {children}
      </body>
    </html>
  );
}
```

**Step 4: Create the data file with all resume content**

Create `src/lib/data.ts`:

```ts
export const siteConfig = {
  name: "Ethan Wang",
  tagline: "Building systems that trade, scale, and think.",
  email: "ethan.wanq@gmail.com",
  github: "https://github.com/Not-Ethan",
  linkedin: "https://linkedin.com/in/edw173",
};

export const stats = [
  { value: "20M+", label: "Monthly Impressions" },
  { value: "500K", label: "Contracts Traded" },
  { value: "3,500+", label: "Trades / Month" },
  { value: "Top 100", label: "Kalshi Leaderboard" },
];

export const experience = [
  {
    company: "Darch AI",
    role: "Co-Founder & Engineering Lead",
    location: "Remote",
    dates: "June 2025 – Present",
    bullets: [
      "Architected a hybrid microservices system (Python/FastAPI, Node.js) and high-throughput FFmpeg media pipeline to automate cross-platform content distribution, supporting 20M+ monthly impressions.",
      "Optimized serverless resource allocation for 3,000+ monthly video jobs, maintaining 85%+ profit margins through aggressive caching and stateless execution.",
      "Maintaining custom self-hosted infrastructure with modified authentication flows for multi-tenant B2B scheduling, while leading solution architecture for enterprise accounts.",
    ],
    tags: ["Python", "FastAPI", "Node.js", "FFmpeg", "Docker"],
  },
  {
    company: "National Institute of Standards and Technology (NIST)",
    role: "Software Development Intern",
    location: "Gaithersburg, MD",
    dates: "June 2025 – August 2025",
    bullets: [
      "Built AI-driven internal tools including a help desk chatbot powered by a RAG pipeline, engineering document ingestion and optimizing retrieval strategies.",
      "Developed and integrated a custom logging feature into an Open WebUI fork to enhance monitoring and debugging capabilities.",
      "Collaborated with Boulder campus staff to deliver a wildfire evacuation dashboard based on stakeholder requirements.",
    ],
    tags: ["Python", "RAG", "Open WebUI", "React"],
  },
];

export const projects = [
  {
    title: "Quantitative Trading on Kalshi",
    description: "Automated trading system executing across prediction markets with market making, momentum, arbitrage, and latency-sensitive strategies.",
    metric: "Top 100 all-time on Kalshi crypto leaderboard",
    tags: ["Python", "WebSockets", "MongoDB"],
    featured: true,
    bullets: [
      "3,500+ monthly trades totaling 500k contracts",
      "Low-latency infrastructure processing hundreds of GBs of market data",
      "Predictive models using Ornstein-Uhlenbeck SDEs, Hawkes processes, and modified Black-Scholes",
    ],
    dates: "May 2024 – Present",
  },
  {
    title: "Orbit Chrome Extension",
    description: "Multimodal semantic search engine for saved text, audio, and video using CLIP/CLAP embeddings.",
    metric: "Sub-second vector retrieval",
    tags: ["Flask", "PyTorch", "ChromaDB", "CLIP/CLAP"],
    featured: false,
    bullets: [
      "Natural language queries over captured browser content",
      "ChromaDB integration for real-time vector similarity search",
    ],
    dates: "February 2025",
  },
];

export const skills = {
  Languages: ["Python", "Java", "JavaScript/TypeScript", "C", "SQL"],
  Frameworks: ["React", "FastAPI", "Node.js", "PyTorch", "Next.js"],
  Infrastructure: ["Docker", "MongoDB", "PostgreSQL", "WebSockets", "FFmpeg", "Git"],
};

export const education = {
  school: "Case Western Reserve University",
  location: "Cleveland, OH",
  degree: "B.S. in Computer Science and Mathematics",
  graduation: "Expected May 2028",
};

export const awards = [
  { title: "Most Innovative Use of Groundbreaking Technology", org: "CMU TartanHacks 2025", date: "Feb 2025" },
  { title: "Generative AI Fundamentals", org: "Databricks Academy", date: "Jan 2026" },
  { title: "Maryland Seal of Biliteracy – Mandarin Chinese", org: "Maryland State Department of Education", date: "May 2024" },
];
```

**Step 5: Stub out the main page**

Replace `src/app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main>
      <section id="hero" className="h-screen flex items-center justify-center">
        <h1 className="text-5xl font-heading font-bold">Ethan Wang</h1>
      </section>
    </main>
  );
}
```

**Step 6: Verify it renders**

Run dev server, open browser, confirm dark background with "Ethan Wang" centered.

**Step 7: Commit**

```bash
git add -A && git commit -m "feat: set up theme, fonts, layout, and data"
```

---

### Task 3: Navigation Bar

**Files:**
- Create: `src/components/Navbar.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Build the Navbar component**

Create `src/components/Navbar.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiGithub } from "react-icons/fi";
import { siteConfig } from "@/lib/data";

const navLinks = [
  { label: "About", href: "#about" },
  { label: "Experience", href: "#experience" },
  { label: "Projects", href: "#projects" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-bg/80 backdrop-blur-md border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="#hero" className="font-heading font-bold text-lg text-light hover:text-accent transition-colors">
          EW
        </a>
        <div className="flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-mono text-sm text-muted hover:text-accent transition-colors"
            >
              {link.label}
            </a>
          ))}
          <a
            href={siteConfig.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-accent transition-colors"
          >
            <FiGithub size={18} />
          </a>
        </div>
      </div>
    </motion.nav>
  );
}
```

**Step 2: Add Navbar to page.tsx**

Add `<Navbar />` import and place it before `<main>` in `page.tsx`.

**Step 3: Verify** — nav is fixed at top, transparent initially, blurs on scroll, links scroll to section IDs.

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add navigation bar with scroll blur effect"
```

---

### Task 4: Hero Section with Interactive Particle Network

**Files:**
- Create: `src/components/Hero.tsx`
- Create: `src/components/ParticleNetwork.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Build the ParticleNetwork component**

Create `src/components/ParticleNetwork.tsx` — a React Three Fiber canvas with floating particles that form connections and react to cursor:

```tsx
"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const PARTICLE_COUNT = 120;
const CONNECTION_DISTANCE = 2.5;
const MOUSE_INFLUENCE_RADIUS = 3;

function Particles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const mousePos = useRef(new THREE.Vector2(0, 0));
  const mouse3D = useRef(new THREE.Vector3(0, 0, 0));
  const { viewport } = useThree();

  const particles = useMemo(() => {
    const positions: THREE.Vector3[] = [];
    const velocities: THREE.Vector3[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 4
        )
      );
      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.005,
          (Math.random() - 0.5) * 0.005,
          (Math.random() - 0.5) * 0.002
        )
      );
    }
    return { positions, velocities };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lineGeometry = useMemo(() => new THREE.BufferGeometry(), []);
  const maxLines = PARTICLE_COUNT * PARTICLE_COUNT;
  const linePositions = useMemo(() => new Float32Array(maxLines * 6), [maxLines]);
  const lineColors = useMemo(() => new Float32Array(maxLines * 6), [maxLines]);

  useFrame(({ pointer }) => {
    if (!meshRef.current) return;

    mousePos.current.set(pointer.x, pointer.y);
    mouse3D.current.set(
      (pointer.x * viewport.width) / 2,
      (pointer.y * viewport.height) / 2,
      0
    );

    // Update particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const pos = particles.positions[i];
      const vel = particles.velocities[i];

      // Mouse attraction
      const toMouse = mouse3D.current.clone().sub(pos);
      const dist = toMouse.length();
      if (dist < MOUSE_INFLUENCE_RADIUS) {
        const force = (1 - dist / MOUSE_INFLUENCE_RADIUS) * 0.0008;
        vel.add(toMouse.normalize().multiplyScalar(force));
      }

      // Damping
      vel.multiplyScalar(0.998);

      // Move
      pos.add(vel);

      // Bounds
      if (Math.abs(pos.x) > 6) vel.x *= -1;
      if (Math.abs(pos.y) > 5) vel.y *= -1;
      if (Math.abs(pos.z) > 3) vel.z *= -1;

      dummy.position.copy(pos);
      const scale = 0.03 + (dist < MOUSE_INFLUENCE_RADIUS ? (1 - dist / MOUSE_INFLUENCE_RADIUS) * 0.03 : 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;

    // Draw connections
    let lineIndex = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        const dist = particles.positions[i].distanceTo(particles.positions[j]);
        if (dist < CONNECTION_DISTANCE) {
          const alpha = 1 - dist / CONNECTION_DISTANCE;
          const idx = lineIndex * 6;
          linePositions[idx] = particles.positions[i].x;
          linePositions[idx + 1] = particles.positions[i].y;
          linePositions[idx + 2] = particles.positions[i].z;
          linePositions[idx + 3] = particles.positions[j].x;
          linePositions[idx + 4] = particles.positions[j].y;
          linePositions[idx + 5] = particles.positions[j].z;

          const color = [0.231, 0.51, 0.965]; // accent blue
          lineColors[idx] = color[0];
          lineColors[idx + 1] = color[1];
          lineColors[idx + 2] = color[2];
          lineColors[idx + 3] = color[0] * alpha;
          lineColors[idx + 4] = color[1] * alpha;
          lineColors[idx + 5] = color[2] * alpha;

          lineIndex++;
        }
      }
    }

    if (linesRef.current) {
      lineGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(linePositions.slice(0, lineIndex * 6), 3)
      );
      lineGeometry.setAttribute(
        "color",
        new THREE.BufferAttribute(lineColors.slice(0, lineIndex * 6), 3)
      );
      lineGeometry.attributes.position.needsUpdate = true;
      lineGeometry.attributes.color.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.8} />
      </instancedMesh>
      <lineSegments ref={linesRef} geometry={lineGeometry}>
        <lineBasicMaterial vertexColors transparent opacity={0.15} />
      </lineSegments>
    </>
  );
}

export default function ParticleNetwork() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 60 }}
      className="absolute inset-0"
      style={{ background: "transparent" }}
      gl={{ alpha: true, antialias: true }}
    >
      <Particles />
    </Canvas>
  );
}
```

**Step 2: Build the Hero component**

Create `src/components/Hero.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { siteConfig } from "@/lib/data";

const ParticleNetwork = dynamic(() => import("./ParticleNetwork"), {
  ssr: false,
});

export default function Hero() {
  return (
    <section id="hero" className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Particle background */}
      <div className="absolute inset-0 z-0">
        <ParticleNetwork />
      </div>

      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-bg/30 via-transparent to-bg" />

      {/* Content */}
      <div className="relative z-10 text-center px-6">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-6xl md:text-8xl font-heading font-bold text-light"
          style={{ textShadow: "0 0 40px rgba(59, 130, 246, 0.3)" }}
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

      {/* Scroll indicator */}
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

**Step 3: Add Hero to page.tsx**

Replace the stub in `page.tsx` with Hero import and component.

**Step 4: Verify** — particles float, react to cursor, name and tagline visible with glow, scroll indicator bounces.

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add hero section with interactive particle network"
```

---

### Task 5: About Section with Animated Counters

**Files:**
- Create: `src/components/About.tsx`
- Create: `src/components/AnimatedCounter.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Build the AnimatedCounter component**

Create `src/components/AnimatedCounter.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

interface AnimatedCounterProps {
  value: string;
  label: string;
}

export default function AnimatedCounter({ value, label }: AnimatedCounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    if (!isInView) return;

    // Extract numeric part
    const numericMatch = value.replace(/,/g, "").match(/[\d.]+/);
    if (!numericMatch) {
      setDisplayValue(value);
      return;
    }

    const target = parseFloat(numericMatch[0]);
    const prefix = value.substring(0, value.indexOf(numericMatch[0]));
    const suffix = value.substring(value.indexOf(numericMatch[0]) + numericMatch[0].length);
    const isFloat = numericMatch[0].includes(".");
    const duration = 2000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;

      let formatted: string;
      if (target >= 1000) {
        formatted = Math.round(current).toLocaleString();
      } else if (isFloat) {
        formatted = current.toFixed(1);
      } else {
        formatted = Math.round(current).toString();
      }

      setDisplayValue(`${prefix}${formatted}${suffix}`);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5 }}
      className="text-center"
    >
      <div className="text-3xl md:text-4xl font-mono font-bold text-accent">
        {displayValue}
      </div>
      <div className="mt-1 text-sm text-muted font-mono">{label}</div>
    </motion.div>
  );
}
```

**Step 2: Build the About section**

Create `src/components/About.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import AnimatedCounter from "./AnimatedCounter";
import { stats, education } from "@/lib/data";

export default function About() {
  return (
    <section id="about" className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-sm font-mono text-accent mb-4"
        >
          01 / About
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-16 items-start">
          {/* Text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xl md:text-2xl font-heading text-light leading-relaxed">
              I'm a computer science and mathematics student at{" "}
              <span className="text-accent">Case Western Reserve University</span>{" "}
              who builds things at the intersection of quantitative systems, AI infrastructure, and startups.
            </p>
            <p className="mt-6 text-muted leading-relaxed">
              Currently co-founding Darch AI, where I architect high-throughput media pipelines
              serving 20M+ monthly impressions. Previously built AI tools at NIST. On the side,
              I run automated trading systems on prediction markets — reaching the top 100 on
              Kalshi's all-time crypto leaderboard.
            </p>
          </motion.div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-8">
            {stats.map((stat, i) => (
              <AnimatedCounter key={i} value={stat.value} label={stat.label} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

**Step 3: Add About to page.tsx**

**Step 4: Verify** — counters tick up on scroll into view, text fades in from left.

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add about section with animated stat counters"
```

---

### Task 6: Experience Timeline Section

**Files:**
- Create: `src/components/Experience.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Build the Experience section**

Create `src/components/Experience.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { experience } from "@/lib/data";

export default function Experience() {
  return (
    <section id="experience" className="py-32 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-sm font-mono text-accent mb-16"
        >
          02 / Experience
        </motion.h2>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-accent/50 via-accent/20 to-transparent" />

          {experience.map((exp, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="relative pl-12 pb-16 last:pb-0 group"
            >
              {/* Timeline dot */}
              <div className="absolute left-[9px] top-1.5 w-3 h-3 rounded-full border-2 border-accent bg-bg group-hover:bg-accent transition-colors duration-300" />

              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                <div>
                  <h3 className="text-xl font-heading font-bold text-light">
                    {exp.company}
                  </h3>
                  <p className="text-muted text-sm italic">{exp.role}</p>
                </div>
                <div className="text-sm font-mono text-muted whitespace-nowrap">
                  {exp.dates}
                </div>
              </div>

              {/* Location */}
              <p className="text-xs font-mono text-muted/60 mt-1">{exp.location}</p>

              {/* Bullets */}
              <ul className="mt-4 space-y-2">
                {exp.bullets.map((bullet, j) => (
                  <li key={j} className="text-sm text-muted leading-relaxed flex gap-2">
                    <span className="text-accent mt-1 shrink-0">▹</span>
                    {bullet}
                  </li>
                ))}
              </ul>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-4">
                {exp.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs font-mono text-accent/80 bg-accent/10 rounded border border-accent/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Add to page.tsx**

**Step 3: Verify** — timeline appears on scroll, dots light up on hover, entries stagger in.

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add experience timeline section"
```

---

### Task 7: Projects Card Grid Section

**Files:**
- Create: `src/components/Projects.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Build the Projects section**

Create `src/components/Projects.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { projects } from "@/lib/data";

function ProjectCard({ project, index }: { project: typeof projects[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      className={`group relative rounded-xl border border-white/5 bg-bg-card p-6 transition-all duration-500 hover:border-accent/30 hover:bg-bg-card-hover hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] ${
        project.featured ? "md:col-span-2" : ""
      }`}
    >
      {/* Featured badge */}
      {project.featured && (
        <div className="absolute top-4 right-4 px-2 py-0.5 text-xs font-mono text-gold bg-gold/10 rounded border border-gold/30">
          Featured
        </div>
      )}

      {/* Date */}
      <p className="text-xs font-mono text-muted">{project.dates}</p>

      {/* Title */}
      <h3 className="text-xl font-heading font-bold text-light mt-2 group-hover:text-accent transition-colors">
        {project.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-muted mt-2 leading-relaxed">
        {project.description}
      </p>

      {/* Key metric */}
      <div className="mt-4 inline-block px-3 py-1 rounded bg-accent/10 border border-accent/20">
        <span className="text-sm font-mono text-accent">{project.metric}</span>
      </div>

      {/* Bullets */}
      <ul className="mt-4 space-y-1.5">
        {project.bullets.map((bullet, j) => (
          <li key={j} className="text-xs text-muted/80 flex gap-2">
            <span className="text-accent/60 mt-0.5 shrink-0">▹</span>
            {bullet}
          </li>
        ))}
      </ul>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mt-4">
        {project.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 text-xs font-mono text-accent/80 bg-accent/10 rounded border border-accent/20"
          >
            {tag}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

export default function Projects() {
  return (
    <section id="projects" className="py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-sm font-mono text-accent mb-16"
        >
          03 / Projects
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-6">
          {projects.map((project, i) => (
            <ProjectCard key={i} project={project} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Add to page.tsx**

**Step 3: Verify** — featured card spans full width, cards glow on hover, stagger animation on scroll.

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add projects card grid section"
```

---

### Task 8: Skills Section

**Files:**
- Create: `src/components/Skills.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Build the Skills section**

Create `src/components/Skills.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { skills } from "@/lib/data";

export default function Skills() {
  const categories = Object.entries(skills);

  return (
    <section id="skills" className="py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-sm font-mono text-accent mb-16"
        >
          04 / Skills
        </motion.h2>

        <div className="space-y-10">
          {categories.map(([category, items], catIndex) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: catIndex * 0.1 }}
            >
              <h3 className="text-xs font-mono text-muted uppercase tracking-wider mb-4">
                {category}
              </h3>
              <div className="flex flex-wrap gap-3">
                {items.map((skill, i) => (
                  <motion.span
                    key={skill}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: catIndex * 0.1 + i * 0.05 }}
                    whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(59,130,246,0.3)" }}
                    className="px-4 py-2 text-sm font-mono text-light/80 bg-bg-card rounded-lg border border-white/5 hover:border-accent/40 hover:text-accent transition-all cursor-default"
                  >
                    {skill}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Add to page.tsx**

**Step 3: Verify** — pills animate in, glow on hover.

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add skills section"
```

---

### Task 9: Contact / Footer Section

**Files:**
- Create: `src/components/Contact.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Build the Contact section**

Create `src/components/Contact.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { FiGithub, FiLinkedin, FiMail } from "react-icons/fi";
import { siteConfig } from "@/lib/data";

const links = [
  { icon: FiMail, href: `mailto:${siteConfig.email}`, label: "Email" },
  { icon: FiLinkedin, href: siteConfig.linkedin, label: "LinkedIn" },
  { icon: FiGithub, href: siteConfig.github, label: "GitHub" },
];

export default function Contact() {
  return (
    <section id="contact" className="py-32 px-6">
      <div className="max-w-2xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-sm font-mono text-accent mb-6"
        >
          05 / Contact
        </motion.h2>

        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-heading font-bold text-light"
        >
          Let&apos;s build something.
        </motion.h3>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-4 text-muted"
        >
          Always interested in new opportunities, collaborations, and interesting problems.
        </motion.p>

        <motion.a
          href={`mailto:${siteConfig.email}`}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.05 }}
          className="inline-block mt-8 px-8 py-3 font-mono text-sm text-accent border border-accent rounded-lg hover:bg-accent/10 transition-colors"
        >
          {siteConfig.email}<span className="animate-blink ml-0.5">▌</span>
        </a>

        {/* Social links */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="flex justify-center gap-6 mt-10"
        >
          {links.map(({ icon: Icon, href, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-accent transition-colors hover:scale-110 transform"
              aria-label={label}
            >
              <Icon size={22} />
            </a>
          ))}
        </motion.div>
      </div>

      {/* Footer */}
      <div className="mt-32 text-center">
        <p className="text-xs font-mono text-muted/40">
          Designed & built by Ethan Wang
        </p>
      </div>
    </section>
  );
}
```

**Step 2: Add to page.tsx**

**Step 3: Verify** — CTA visible, email has blinking cursor, social icons have hover effect.

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add contact section and footer"
```

---

### Task 10: Final Assembly & Polish

**Files:**
- Modify: `src/app/page.tsx` (final assembly)
- Verify all sections render together

**Step 1: Finalize page.tsx**

Ensure all sections are imported and ordered:

```tsx
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Experience from "@/components/Experience";
import Projects from "@/components/Projects";
import Skills from "@/components/Skills";
import Contact from "@/components/Contact";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Experience />
        <Projects />
        <Skills />
        <Contact />
      </main>
    </>
  );
}
```

**Step 2: Add section dividers (subtle gradient lines between sections)**

Between each section, add a visual separator:

```tsx
<div className="max-w-6xl mx-auto px-6">
  <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
</div>
```

**Step 3: Run full visual check**

Start dev server, scroll through entire page, verify:
- [ ] Particles respond to cursor
- [ ] Nav blurs on scroll
- [ ] Counters animate
- [ ] Timeline dots highlight
- [ ] Cards glow on hover
- [ ] Skills pills glow
- [ ] Email cursor blinks
- [ ] Smooth scroll between sections
- [ ] Mobile responsiveness (resize browser)

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: final assembly and polish"
```

---

### Task 11: Vercel Deployment Setup

**Files:**
- Verify `next.config.ts` is correct
- Create `.gitignore` updates if needed

**Step 1: Verify build succeeds locally**

Run:
```bash
cd /Users/Ethan_1/ethanwangai && npm run build
```

Expected: Build succeeds with no errors.

**Step 2: Fix any build warnings/errors**

Address any issues from the build output.

**Step 3: Commit any fixes**

```bash
git add -A && git commit -m "fix: address build issues"
```

**Step 4: Guide Vercel deployment**

User pushes to GitHub, connects to Vercel. No special config needed — Next.js is auto-detected.
