'use client';
import { copy } from '@/site/copy';
import { SECTIONS } from '@/bench/sections';
import { MACHINE } from '@/bench/types';
import { useScroll } from '@/scroll/ScrollProvider';
import { Plate } from '@/site/Plate';

export function Darch() {
  const { tier } = useScroll();
  const c = copy.darch;
  return (
    <section id="darch" style={{ minHeight: `${SECTIONS[5].vh[tier]}vh` }} className="relative">
      <div className="grid min-h-[inherit] grid-cols-12 gap-4 px-4 pt-24 md:px-12">
        <div className="col-span-12 md:col-span-5">
          <div className="copy-track">
            <div className="copy-col sticky top-24 md:top-28">
              <h2 className="h2" data-ink-source="darch" data-reveal>{c.heading}</h2>
              <p className="body mt-5" data-reveal>{c.body}</p>
              <p className="mono pencil mt-4">{c.mono}</p>
              <Plate machine={MACHINE.splitter}>{c.plate}</Plate>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
