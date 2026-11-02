import { copy } from '../copy';
import { Built } from '../Built';
import { BUILT_TOTAL } from '../Site';

export function Bar() {
  return (
    <header className="bar">
      <Built name="mark" as="a" className="mark" href="#top">{copy.bar.mark}</Built>
      <div className="bar__right">
        <Built name="nav" as="nav" className="bar__nav">
          {copy.bar.links.map((l) => <a key={l.label} href={l.href}>{l.label}</a>)}
        </Built>
        <span className="status mono" data-status>{copy.bar.status(6, 0, BUILT_TOTAL)}</span>
        <Built name="cta" as="a" className="btn btn-sm" href={copy.bar.ctaHref}>{copy.bar.cta}</Built>
      </div>
    </header>
  );
}
