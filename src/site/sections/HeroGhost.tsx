import { copy } from '../copy';

/** The ghost pill. Both variants are in the server HTML; CSS keyed on html[data-swarm="on"] shows one (see .when-on / .when-off). */
export function HeroGhost() {
  const h = copy.hero;
  return (
    <a className="ghost" href={h.ghostHref}>
      <span className="ghost__dot" aria-hidden="true" />
      <span className="when-on only-desktop">{h.ghost}</span>
      <span className="when-on only-phone">{h.ghostPhone}</span>
      <span className="when-on badge">{h.ghostBadge}</span>
      <span className="when-off">{h.ghostOff}</span>
    </a>
  );
}
