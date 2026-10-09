import { copy } from '@/site/copy';
import { SECTIONS } from '@/valley/sections';
import { Reveal } from '@/site/Reveal';
import { Figure } from '@/site/Figure';

const HEIGHT_VH = SECTIONS.find((s) => s.id === 'darch')?.heightVh ?? 100;

/** 04 · darch (spec §3.1): past tense; the two figures. */
export function Darch() {
  const c = copy.darch;
  return (
    <section id="darch" className="section" style={{ minHeight: `${HEIGHT_VH}vh` }}>
      <div className="section-grid">
        <Reveal className="copy-col scrim">
          <h2 className="h2" data-reveal>{c.heading}</h2>
          <p className="body mt-5" data-reveal>{c.body}</p>
          <div className="mt-6 flex flex-col gap-4">
            {c.figures.map((f) => <Figure key={f}>{f}</Figure>)}
          </div>
          <p className="mono ink-dim mt-4" data-reveal>{c.mono}</p>
        </Reveal>
      </div>
    </section>
  );
}
