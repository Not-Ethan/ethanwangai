import { copy } from '@/site/copy';
import { SECTIONS } from '@/valley/sections';
import { Reveal } from '@/site/Reveal';
import { Figure } from '@/site/Figure';
import { Counter } from '@/site/Counter';

const HEIGHT_VH = SECTIONS.find((s) => s.id === 'kalshi')?.heightVh ?? 100;

/** 02 · kalshi (spec §3.1): heading, body, the two figures with the counter under the ridge figure, the mono line. */
export function Kalshi() {
  const c = copy.kalshi;
  return (
    <section id="kalshi" className="section" style={{ minHeight: `${HEIGHT_VH}vh` }}>
      <div className="section-grid">
        <Reveal className="copy-col scrim">
          <h2 className="h2" data-reveal>{c.heading}</h2>
          <p className="body mt-5" data-reveal>{c.body}</p>
          <div className="mt-6">
            <Figure>{c.figures[0]}</Figure>
            <Counter />
          </div>
          <div className="mt-4">
            <Figure>{c.figures[1]}</Figure>
          </div>
          <p className="mono ink-dim mt-4" data-reveal>{c.mono}</p>
        </Reveal>
      </div>
    </section>
  );
}
