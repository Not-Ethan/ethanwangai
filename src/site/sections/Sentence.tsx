'use client';
import { copy } from '@/site/copy';
import { SECTIONS } from '@/bench/sections';
import { MACHINE } from '@/bench/types';
import { useScroll } from '@/scroll/ScrollProvider';
import { Ladder } from '@/site/chrome/Ladder';
import { Plate } from '@/site/Plate';

/** The rebuild control (design §3.1, §8): the h1 and #rebuild both ask the scene to run the hero compile again; Clocks listens. */
function rebuild(): void {
  window.dispatchEvent(new CustomEvent('dbso:rebuild'));
}

export function Sentence() {
  const { tier } = useScroll();
  const c = copy.sentence;
  const [before, after] = c.headline.split(c.inkFrom);
  return (
    <section id="sentence" style={{ minHeight: `${SECTIONS[0].vh[tier]}vh` }} className="relative">
      <div className="sticky top-0 grid min-h-[40vh] grid-cols-12 gap-4 px-4 pt-24 md:px-12">
        <div className="col-span-12 md:col-span-7" data-ink-source="sentence">
          <h1 className="display" onClick={rebuild}>
            {before}<span data-ink-words>{c.inkFrom}</span>{after}
          </h1>
          <p className="body mt-5" id="deck">{c.deck}</p>
          <Ladder words={c.headline.split(' ').length} />
          <Plate machine={MACHINE.quoter} control={<button type="button" id="rebuild" className="mono link underline" onClick={rebuild}>{c.rebuild}</button>}>
            {c.plate}
          </Plate>
          <p className="mono pencil mt-1">{c.honesty}</p>
        </div>
      </div>
    </section>
  );
}
