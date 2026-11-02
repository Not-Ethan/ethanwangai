import { copy } from '../copy';
import { Built } from '../Built';
import { HeroGhost } from './HeroGhost';

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="#161616" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Hero() {
  const h = copy.hero;
  return (
    <section id="top" className="hero">
      <div className="hero__grid" aria-hidden="true" />
      <div className="hero__glow" aria-hidden="true" />
      <div className="wrap hero__inner">
        <Built name="eyebrow" as="p" className="eyebrow">{h.eyebrow}</Built>
        <Built name="h1 name" as="h1" className="name">
          <span>{h.name[0]}</span>
          <span>{h.name[1]}</span>
        </Built>
        <Built name="headline" as="p" className="headline">
          {h.headline.plain} <b>{h.headline.bold}</b>
        </Built>
        <Built name="actions" className="hero__actions">
          <a className="btn" href={h.ctaHref}>
            <span>{h.cta}</span>
            <span className="btn__icon"><Arrow /></span>
          </a>
          <HeroGhost />
        </Built>
      </div>
    </section>
  );
}
