import { copy } from '../copy';
import { Built } from '../Built';

export function Footer() {
  const f = copy.footer;
  return (
    <Built name="footer" as="footer" className="foot band-4" prompt={copy.prompts.footer}>
      <div className="wrap foot__inner">
        <span>{f.left}</span>
        <span className="when-on">{f.right}</span>
        <span className="when-off">{f.rightOff}</span>
        <p className="foot__credit">
          {f.credit} <a href={f.creditLink.href} target="_blank" rel="noopener noreferrer">{f.creditLink.label}</a>
        </p>
      </div>
    </Built>
  );
}
