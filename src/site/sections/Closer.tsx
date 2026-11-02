import { copy } from '../copy';
import { Built } from '../Built';

export function Closer() {
  const c = copy.closer;
  return (
    <section id="contact" className="sec closer band-4">
      <div className="closer__field" aria-hidden="true" />
      <div className="wrap closer__inner">
        <Built name="h2 contact" as="h2" className="closer__h2">
          <span>{c.h2[0]}</span>
          <span>{c.h2[1]}</span>
        </Built>
        <Built name="p contact" as="p" className="closer__p muted">{c.p}</Built>
        <Built name="mail" as="a" className="closer__mail" href={`mailto:${c.mail}`}>{c.mail}</Built>
        <Built name="links" className="closer__links">
          {c.links.map((l) => (
            <a key={l.label} className="btn btn-sm" href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>
          ))}
        </Built>
        <Built name="door" className="door">
          <div className="door__copy">
            <p className="door__title">{c.door.title}</p>
            {c.door.paragraphs.map((p) => <p key={p}>{p}</p>)}
          </div>
          <div className="door__go">
            <button type="button" className="btn btn-accent" data-rebuild>{c.door.button}</button>
            <p className="door__note">{c.door.note}</p>
          </div>
        </Built>
      </div>
    </section>
  );
}
