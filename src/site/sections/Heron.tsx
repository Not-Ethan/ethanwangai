import { copy } from '@/site/copy';
import { SECTIONS } from '@/valley/sections';
import { Reveal } from '@/site/Reveal';

const HEIGHT_VH = SECTIONS.find((s) => s.id === 'heron')?.heightVh ?? 100;

/** 03 · heron (spec §3.1). */
export function Heron() {
  const c = copy.heron;
  return (
    <section id="heron" className="section" style={{ minHeight: `${HEIGHT_VH}vh` }}>
      <div className="section-grid">
        <Reveal className="copy-col scrim">
          <h2 className="h2" data-reveal>{c.heading}</h2>
          <p className="body mt-5" data-reveal>{c.body}</p>
          <p className="mono ink-dim mt-4" data-reveal>{c.mono}</p>
        </Reveal>
      </div>
    </section>
  );
}
