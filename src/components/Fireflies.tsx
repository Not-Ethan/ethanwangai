"use client";

import { useEffect, useRef } from "react";

type Fly = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  pulse: number;
  drift: number;
  size: number;
  sprite: HTMLCanvasElement;
  front: boolean;
};

function makeSprite(color: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,240,0.95)");
  grad.addColorStop(0.2, color);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}

/**
 * Two fixed full-viewport canvases: most fireflies drift behind the content,
 * a few large blurred ones float in front for depth. Pointer-aware on
 * desktop, density-scaled by viewport, paused when the tab is hidden, and
 * static under prefers-reduced-motion.
 */
export default function Fireflies() {
  const backRef = useRef<HTMLCanvasElement>(null);
  const frontRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const back = backRef.current;
    const front = frontRef.current;
    if (!back || !front) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const backCtx = back.getContext("2d")!;
    const frontCtx = front.getContext("2d")!;

    const amber = makeSprite("rgba(251,191,36,0.55)");
    const green = makeSprite("rgba(190,242,100,0.45)");

    let w = 0;
    let h = 0;
    let flies: Fly[] = [];
    let raf = 0;
    let last = 0;
    let running = true;
    const pointer = { x: -9999, y: -9999 };

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const [canvas, ctx] of [
        [back, backCtx],
        [front, frontCtx],
      ] as const) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      const count = Math.round(Math.min(52, Math.max(16, (w * h) / 32000)));
      flies = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.5) * 12,
        phase: Math.random() * Math.PI * 2,
        pulse: 0.6 + Math.random() * 1.6,
        drift: 0.5 + Math.random() * 1.5,
        size: 5 + Math.random() * 8,
        sprite: Math.random() < 0.78 ? amber : green,
        front: i % 7 === 0,
      }));
    };

    const drawStatic = () => {
      backCtx.clearRect(0, 0, w, h);
      frontCtx.clearRect(0, 0, w, h);
      for (const f of flies) {
        const ctx = f.front ? frontCtx : backCtx;
        const s = f.front ? f.size * 2.2 : f.size;
        ctx.globalAlpha = 0.45;
        ctx.drawImage(f.sprite, f.x - s, f.y - s, s * 2, s * 2);
      }
    };

    const tick = (now: number) => {
      if (!running) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const t = now / 1000;

      backCtx.clearRect(0, 0, w, h);
      frontCtx.clearRect(0, 0, w, h);

      for (const f of flies) {
        f.vx += Math.sin(t * 0.4 * f.drift + f.phase) * 5 * dt;
        f.vy += Math.cos(t * 0.33 * f.drift + f.phase * 1.7) * 4 * dt;

        if (finePointer) {
          const dx = pointer.x - f.x;
          const dy = pointer.y - f.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 150 * 150 && d2 > 1) {
            const d = Math.sqrt(d2);
            f.vx += (dx / d) * 9 * dt;
            f.vy += (dy / d) * 9 * dt;
          }
        }

        const speed = Math.hypot(f.vx, f.vy);
        const maxSpeed = 26;
        if (speed > maxSpeed) {
          f.vx = (f.vx / speed) * maxSpeed;
          f.vy = (f.vy / speed) * maxSpeed;
        }

        f.x += f.vx * dt;
        f.y += f.vy * dt;

        const m = 50;
        if (f.x < -m) f.x = w + m;
        if (f.x > w + m) f.x = -m;
        if (f.y < -m) f.y = h + m;
        if (f.y > h + m) f.y = -m;

        const glow = Math.sin(t * f.pulse + f.phase) ** 2;
        const ctx = f.front ? frontCtx : backCtx;
        const s = f.front ? f.size * 2.2 : f.size;
        ctx.globalAlpha = (0.18 + 0.82 * glow) * (f.front ? 0.5 : 0.9);
        ctx.drawImage(f.sprite, f.x - s, f.y - s, s * 2, s * 2);
      }

      raf = requestAnimationFrame(tick);
    };

    const onPointerMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    };

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!reduceMotion) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    resize();
    window.addEventListener("resize", resize);

    if (reduceMotion) {
      drawStatic();
    } else {
      if (finePointer) window.addEventListener("pointermove", onPointerMove);
      document.addEventListener("visibilitychange", onVisibility);
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <>
      <canvas
        ref={backRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1]"
      />
      <canvas
        ref={frontRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[15] opacity-70 blur-[2px]"
      />
    </>
  );
}
