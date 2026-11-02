'use client';
import { useEffect } from 'react';

/** Marks the index item of the last card whose top is at or above 40% of the viewport height (else the first) with data-active. Renders nothing. */
export function IndexHighlight() {
  useEffect(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>('[data-xp-item]'));
    if (!items.length) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = window.innerHeight * 0.4;
      let best: HTMLElement | null = items[0];
      for (const li of items) {
        const card = document.getElementById(li.dataset.xpItem ?? '');
        if (!card) continue;
        if (card.getBoundingClientRect().top <= line) best = li;
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
