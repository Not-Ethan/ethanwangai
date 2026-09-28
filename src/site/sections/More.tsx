'use client';
import { copy } from '@/site/copy';
import { SECTIONS } from '@/bench/sections';
import { useScroll } from '@/scroll/ScrollProvider';

/**
 * Four lines, each shown as hud.click reaches its data-click, and a six-rung ladder lit up to hud.rung: sceneState
 * keys both to the merge clicks and the burst, and hudSync toggles .is-revealed / .is-lit / .is-current (task 4.1).
 */
export function More() {
  const { tier } = useScroll();
  const c = copy.more;
  const [head, ...rest] = c.lines;
  return (
    <section id="more" style={{ minHeight: `${SECTIONS[1].vh[tier]}vh` }} className="relative">
      <div className="grid min-h-[inherit] grid-cols-12 gap-4 px-4 pt-24 md:px-12">
        <div className="col-span-12 md:col-span-5">
          <div className="copy-track">
            <div className="copy-col sticky top-24 md:top-28">
              <h2 className="h2" data-reveal data-click={0}>{head}</h2>
              {rest.map((line, i) => (
                // the third line is the one the 02 ink burst lifts from (spec §3.1 · 02)
                <p key={line} className="body mt-5" data-reveal data-click={i + 1} data-ink-source={i + 1 === 2 ? 'more' : undefined}>{line}</p>
              ))}
            </div>
          </div>
        </div>
        <div className="col-span-12 mt-8 md:col-span-3 md:col-start-10 md:mt-0">
          {/* desktop: pinned top-right, clear of the bed's frame, in a track that runs past the section by the
              ladder's own pinned bottom (globals.css .rungs-track), so the rungs stay on screen through the clicks,
              the hold and the burst and leave with #more's end */}
          <div className="rungs-track">
            <ol id="rungs" className="mono pencil flex flex-col gap-1 md:sticky md:top-20 md:text-right" aria-label="levels">
              {c.rungs.map((rung, i) => (
                <li key={rung} data-rung={i}>{rung}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
