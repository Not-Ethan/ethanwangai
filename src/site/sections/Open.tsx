import { copy } from '@/site/copy';
import { SECTIONS } from '@/valley/sections';
import { Labels } from '@/site/Labels';

const HEIGHT_VH = SECTIONS.find((s) => s.id === 'open')?.heightVh ?? 100;

/** 01 · open (spec §3.1): the headline over the sky, the deck, the ignition labels as a static list, the scroll cue. */
export function Open() {
  const c = copy.open;
  return (
    <section id="open" className="section" style={{ minHeight: `${HEIGHT_VH}vh` }}>
      <div className="section-grid">
        <div className="open-col scrim">
          <h1 className="display">{c.headline}</h1>
          <p className="mono mt-6">{c.deck}</p>
          <Labels />
        </div>
      </div>
      <p className="mono ink-dim absolute bottom-6 left-4 md:left-12">{c.scrollCue}</p>
    </section>
  );
}
