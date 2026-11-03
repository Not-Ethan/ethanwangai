'use client';
import { useEffect, useState } from 'react';
import { copy } from '../copy';
import { useSwarmStats } from '@/swarm/useSwarmStats';
import { Built } from '../Built';
import { NavHighlight } from './NavHighlight';

export function Bar() {
  const s = useSwarmStats();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let raf = 0;
    const read = (): void => { raf = 0; setScrolled(window.scrollY > 8); };
    const onScroll = (): void => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return (
    <header className="bar" data-scrolled={scrolled ? '' : undefined}>
      <Built name="mark" as="a" className="mark" href="#top" prompt={copy.prompts.mark} label="ethan wang, top of page">{copy.bar.mark}</Built>
      <div className="bar__right">
        <Built name="nav" as="nav" className="bar__nav" prompt={copy.prompts.nav}>
          {copy.bar.links.map((l) => <a key={l.label} href={l.href}>{l.label}</a>)}
        </Built>
        <span className="status mono when-on" data-status>{copy.bar.status(s.agents, s.built, s.total)}</span>
        <Built name="cta" as="a" className="btn btn-sm" href={copy.bar.ctaHref} prompt={copy.prompts.cta}>{copy.bar.cta}</Built>
      </div>
      <NavHighlight />
    </header>
  );
}
