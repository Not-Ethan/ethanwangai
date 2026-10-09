import { copy } from '@/site/copy';
import { SECTIONS } from '@/valley/sections';
import { Reveal } from '@/site/Reveal';

const HEIGHT_VH = SECTIONS.find((s) => s.id === 'alive')?.heightVh ?? 100;

/** 06 · alive (spec §3.1): the thesis. */
export function Alive() {
  const c = copy.alive;
  return (
    <section id="alive" className="section" style={{ minHeight: `${HEIGHT_VH}vh` }}>
      <div className="section-grid">
        <Reveal className="copy-col scrim">
          <h2 className="h2" data-reveal>{c.heading}</h2>
          <p className="body mt-5" data-reveal>{c.body}</p>
        </Reveal>
      </div>
    </section>
  );
}
