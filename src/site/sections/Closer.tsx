'use client';
import { copy } from '../copy';
import { useSwarmStats } from '@/swarm/useSwarmStats';
import { Built } from '../Built';

export function Closer() {
  const c = copy.closer;
  const s = useSwarmStats();
  return (
    <section id="contact" className="sec closer band-4">
      <div className="closer__field" aria-hidden="true" />
      <div className="wrap closer__inner">
        <Built name="h2 contact" as="h2" className="closer__h2" prompt={copy.prompts['h2 contact']}>
          <span>{c.h2[0]}</span>
          <span>{c.h2[1]}</span>
        </Built>
        <Built name="p contact" as="p" className="closer__p muted" prompt={copy.prompts['p contact']}>{c.p}</Built>
        <Built name="mail" as="a" className="closer__mail btn btn-accent" prompt={copy.prompts.mail} href={`mailto:${c.mail}`}>{c.mail}</Built>
        <Built name="links" className="closer__links" prompt={copy.prompts.links}>
          {c.links.map((l) => (
            <a key={l.label} className="btn btn-sm" href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>
          ))}
        </Built>
        <Built name="door" className="door" prompt={copy.prompts.door}>
          <div className="door__copy">
            <p className="door__title">{c.door.title}</p>
            {c.door.paragraphs.map((p, i) => (
              <p key={p} className="when-on">
                {i === 0 ? (<><span className="only-desktop">{p}</span><span className="only-phone">{c.door.paragraphPhone}</span></>) : p}
              </p>
            ))}
            <p className="when-off">
              <span className="only-desktop">{c.door.offParagraph}</span>
              <span className="only-phone">{c.door.offParagraphPhone}</span>
            </p>
          </div>
          <div className="door__go when-on">
            <button type="button" className="btn" data-rebuild aria-disabled={s.busy ? 'true' : undefined} onClick={() => { if (!s.busy) s.rebuild(); }}>{c.door.button}</button>
            <p className="door__note">{c.door.note}</p>
          </div>
        </Built>
      </div>
    </section>
  );
}
