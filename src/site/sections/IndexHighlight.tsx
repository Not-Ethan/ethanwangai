'use client';
import { useEffect } from 'react';

/** Marks the index item whose card centre is nearest the viewport centre with data-active. Renders nothing. */
export function IndexHighlight() {
  useEffect(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>('[data-xp-item]'));
    if (!items.length) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const mid = window.innerHeight / 2;
      let best: HTMLElement | null = null;
      let bestDist = Infinity;
      for (const li of items) {
        const card = document.getElementById(li.dataset.xpItem ?? '');
        if (!card) continue;
        const r = card.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestDist) { bestDist = d; best = li; }
      }
      for (const li of items) {
        if (li === best) li.setAttribute('data-active', '1');
        else li.removeAttribute('data-active');
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
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
