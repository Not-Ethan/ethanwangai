'use client';
import { copy } from '@/site/copy';
import { SECTIONS } from '@/bench/sections';
import { useScroll } from '@/scroll/ScrollProvider';

export function Alive() {
  const { tier } = useScroll();
  const c = copy.alive;
  const [head, ...rest] = c.lines;
  return (
    <section id="alive" style={{ minHeight: `${SECTIONS[7].vh[tier]}vh` }} className="relative">
      <div className="grid min-h-[inherit] grid-cols-12 gap-4 px-4 pt-24 md:px-12">
        <div className="col-span-12 md:col-span-5">
          <div className="copy-track">
            <div className="copy-col sticky top-24 md:top-28">
              <h2 className="h2" data-reveal>{head}</h2>
              {rest.map((line) => (
                <p key={line} className="body mt-5" data-reveal>{line}</p>
              ))}
              {/* Stage 3 ticks the uptime; nothing else in this section's DOM moves */}
              <p className="mono-figure uptime-figure mt-10">{c.running} <span id="uptime">00:00:00</span></p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
