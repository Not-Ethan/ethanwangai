import { copy } from '../copy';
import { Built } from '../Built';

export function Footer() {
  const f = copy.footer;
  return (
    <Built name="footer" as="footer" className="foot band-4" prompt={copy.prompts.footer}>
      <div className="wrap foot__inner">
        <span>{f.left}</span>
        <span>{f.right}</span>
      </div>
    </Built>
  );
}
