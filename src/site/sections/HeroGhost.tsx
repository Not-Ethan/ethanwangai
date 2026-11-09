import { copy } from '../copy';

/** The ghost pill. Both variants are in the server HTML; CSS keyed on html[data-swarm="on"] shows one (see .when-on / .when-off). */
export function HeroGhost() {
  const h = copy.hero;
  return (
    <>
      <a className="ghost when-on" href={h.ghostHref}>
        <span className="ghost__dot" aria-hidden="true" />
        <span className="only-desktop">{h.ghost}</span>
        <span className="only-phone">{h.ghostPhone}</span>
        <span className="badge">{h.ghostBadge}</span>
      </a>
      <span className="ghost when-off">
        <span className="ghost__dot" aria-hidden="true" />
        <span className="rm-no">{h.ghostOff}</span>
        <span className="rm-yes">{h.ghostOffReduced}</span>
      </span>
    </>
  );
}
