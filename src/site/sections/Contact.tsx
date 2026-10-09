import { copy } from '@/site/copy';
import { SECTIONS } from '@/valley/sections';
import { Reveal } from '@/site/Reveal';

const HEIGHT_VH = SECTIONS.find((s) => s.id === 'contact')?.heightVh ?? 100;

/** 08 · contact (spec §3.1): the links in mono. Stage 3 flickers the hut on the email link's hover or focus. */
export function Contact() {
  const c = copy.contact;
  return (
    <section id="contact" className="section" style={{ minHeight: `${HEIGHT_VH}vh` }}>
      <div className="section-grid">
        <Reveal className="copy-col scrim">
          <h2 className="h2" data-reveal>{c.heading}</h2>
          <p className="body mt-5" data-reveal>{c.body}</p>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2" data-reveal>
            {c.links.map((l) => (
              <li key={l.label}>
                <a
                  className="mono link"
                  href={l.href}
                  data-contact={l.label}
                  {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mono ink-dim mt-4" data-reveal>{c.mono}</p>
        </Reveal>
      </div>
    </section>
  );
}
