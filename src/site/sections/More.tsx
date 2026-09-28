'use client';
import { copy } from '@/site/copy';
import { SECTIONS } from '@/bench/sections';
import { useScroll } from '@/scroll/ScrollProvider';

/** Four lines revealed per merge click (Stage 4); the six-rung ladder lights per click. */
export function More() {
  const { tier } = useScroll();
  const c = copy.more;
  const [head, ...rest] = c.lines;
  return (
    <section id="more" style={{ minHeight: `${SECTIONS[1].vh[tier]}vh` }} className="relative">
      <div className="grid grid-cols-12 gap-4 px-4 pt-24 md:px-8">
        <div className="col-span-12 md:col-span-5">
          <h2 className="h2" data-reveal data-click={0}>{head}</h2>
          {rest.map((line, i) => (
            // the third line is the one the 02 ink burst lifts from (spec §3.1 · 02)
            <p key={line} className="body mt-5" data-reveal data-click={i + 1} data-ink-source={i + 1 === 2 ? 'more' : undefined}>{line}</p>
          ))}
        </div>
        <ol id="rungs" className="mono pencil col-span-12 mt-8 flex flex-col gap-1 md:col-span-3 md:col-start-10 md:mt-0" aria-label="levels">
          {c.rungs.map((rung, i) => (
            <li key={rung} data-rung={i}>{rung}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}
