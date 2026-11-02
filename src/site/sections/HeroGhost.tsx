'use client';
import { copy } from '../copy';
import { useMounted, useSwarmStats } from '@/swarm/useSwarmStats';

/** The ghost pill. The server output and the first client render show the normal line and badge; once mounted with the swarm off, it shows the resting line and no badge. */
export function HeroGhost() {
  const h = copy.hero;
  const s = useSwarmStats();
  const mounted = useMounted();
  const off = mounted && !s.on;
  return (
    <a className="ghost" href={h.ghostHref}>
      <span className="ghost__dot" aria-hidden="true" />
      {off ? (
        <span>{h.ghostOff}</span>
      ) : (
        <>
          <span className="only-desktop">{h.ghost}</span>
          <span className="only-phone">{h.ghostPhone}</span>
          <span className="badge">{h.ghostBadge}</span>
        </>
      )}
    </a>
  );
}
