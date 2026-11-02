import { copy } from '../copy';
import { Built } from '../Built';

export function Footer() {
  const f = copy.footer;
  return (
    <Built name="footer" as="footer" className="foot band-4">
      <div className="wrap foot__inner">
        <span>{f.left}</span>
        <span>{f.right}</span>
        <p className="foot__credit">
          {f.credit} <a href={f.creditLink.href} target="_blank" rel="noopener noreferrer">{f.creditLink.label}</a>
        </p>
      </div>
    </Built>
  );
}
