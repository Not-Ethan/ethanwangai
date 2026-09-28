'use client';
import { copy } from '@/site/copy';
import { SECTIONS } from '@/bench/sections';
import { MACHINE } from '@/bench/types';
import { useScroll } from '@/scroll/ScrollProvider';
import { Plate } from '@/site/Plate';

export function Kalshi() {
  const { tier } = useScroll();
  const c = copy.kalshi;
  return (
    <section id="kalshi" style={{ minHeight: `${SECTIONS[3].vh[tier]}vh` }} className="relative">
      <div className="grid min-h-[inherit] grid-cols-12 gap-4 px-4 pt-24 md:px-12">
        <div className="col-span-12 md:col-span-5">
          <div className="copy-col sticky top-24 md:top-28">
            <h2 className="h2" data-ink-source="kalshi" data-reveal>{c.heading}</h2>
            <p className="body mt-5" data-reveal>{c.body}</p>
            <dl className="mt-8 space-y-4">
              {c.figures.map((fig) => (
                <div key={fig.label}>
                  <dd className="mono-figure">{fig.value}</dd>
                  <dt className="mono pencil">{fig.label}</dt>
                </div>
              ))}
            </dl>
            <p className="mono pencil mt-2">{c.asOf} · {c.status}</p>
            <Plate machine={MACHINE.quoter}>{c.plate}</Plate>
            <Plate machine={MACHINE.intake}>{c.plateIntake}</Plate>
            <p className="mono pencil mt-1">{c.honesty}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
