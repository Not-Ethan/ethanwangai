'use client';
import { copy } from '../copy';
import { useMounted, useSwarmStats } from '@/swarm/useSwarmStats';
import { Built } from '../Built';

export function Bar() {
  const s = useSwarmStats();
  const mounted = useMounted();
  return (
    <header className="bar">
      <Built name="mark" as="a" className="mark" href="#top">{copy.bar.mark}</Built>
      <div className="bar__right">
        <Built name="nav" as="nav" className="bar__nav">
          {copy.bar.links.map((l) => <a key={l.label} href={l.href}>{l.label}</a>)}
        </Built>
        <span className="status mono" data-status data-off={mounted && !s.on ? '' : undefined}>{copy.bar.status(s.agents, s.built, s.total)}</span>
        <Built name="cta" as="a" className="btn btn-sm" href={copy.bar.ctaHref}>{copy.bar.cta}</Built>
      </div>
    </header>
  );
}
