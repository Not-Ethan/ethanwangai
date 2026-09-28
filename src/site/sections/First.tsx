'use client';
import { copy } from '@/site/copy';
import { SECTIONS } from '@/bench/sections';
import { MACHINE } from '@/bench/types';
import { useScroll } from '@/scroll/ScrollProvider';
import { Plate } from '@/site/Plate';

export function First() {
  const { tier } = useScroll();
  const c = copy.first;
  const [head, ...rest] = c.lines;
  return (
    <section id="first" style={{ minHeight: `${SECTIONS[2].vh[tier]}vh` }} className="relative">
      <div className="grid min-h-[inherit] grid-cols-12 gap-4 px-4 pt-24 md:px-12">
        <div className="col-span-12 md:col-span-5">
          <div className="copy-track">
            <div className="copy-col sticky top-24 md:top-28">
              {/* the trickle sources from this line once 03 is reached (spec §3.1 · 03) */}
              <h2 className="h2" data-ink-source="first" data-reveal>{head}</h2>
              {rest.map((line) => (
                <p key={line} className="body mt-5" data-reveal>{line}</p>
              ))}
              {/* 0 is a placeholder; Stage 3 writes the bot's live MachineSummary.count here */}
              <Plate machine={MACHINE.bot}>{c.plate(0)}</Plate>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
