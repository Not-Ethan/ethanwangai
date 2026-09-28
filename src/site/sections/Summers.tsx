'use client';
import { copy } from '@/site/copy';
import { SECTIONS } from '@/bench/sections';
import { MACHINE } from '@/bench/types';
import { useScroll } from '@/scroll/ScrollProvider';
import { Plate } from '@/site/Plate';

export function Summers() {
  const { tier } = useScroll();
  const c = copy.summers;
  return (
    <section id="summers" style={{ minHeight: `${SECTIONS[6].vh[tier]}vh` }} className="relative">
      <div className="grid min-h-[inherit] grid-cols-12 gap-4 px-4 pt-24 md:px-12">
        <div className="col-span-12 md:col-span-5">
          <div className="copy-col sticky top-24 md:top-28">
            <h2 className="h2" data-ink-source="summers" data-reveal>{c.heading}</h2>
            <p className="body mt-5" data-reveal>{c.wvu}</p>
            <p className="mt-4 max-w-[34ch] text-base leading-snug" data-reveal>{c.nist}</p>
            <p className="mono pencil mt-4">{c.orbit}</p>
            <Plate machine={MACHINE.watch}>{c.plate}</Plate>
          </div>
        </div>
      </div>
    </section>
  );
}
