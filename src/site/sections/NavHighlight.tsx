'use client';
import { useEffect } from 'react';

/** Marks the bar link of the section nearest the viewport centre with aria-current (the section containing the centre line, else the closest by edge). Sections without a bar link clear it. Renders nothing. */
export function NavHighlight() {
  useEffect(() => {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.bar__nav a[href^="#"]'));
    const sections = Array.from(document.querySelectorAll<HTMLElement>('main > section[id]'));
    if (!links.length || !sections.length) return;
    let raf = 0;
    const update = (): void => {
      raf = 0;
      const mid = window.innerHeight / 2;
      let best: HTMLElement | null = null;
      let bestD = Infinity;
      for (const sec of sections) {
        const r = sec.getBoundingClientRect();
        const d = mid < r.top ? r.top - mid : mid > r.bottom ? mid - r.bottom : 0;
        if (d < bestD) { bestD = d; best = sec; }
      }
      for (const a of links) {
        if (best && a.getAttribute('href') === `#${best.id}`) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      }
    };
    const onScroll = (): void => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
