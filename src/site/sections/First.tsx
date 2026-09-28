'use client';
import { useMemo } from 'react';
import { copy } from '@/site/copy';
import { SECTIONS } from '@/bench/sections';
import { MACHINE } from '@/bench/types';
import { layout } from '@/bench/layout';
import { BOT } from '@/bench/configs/bot';
import { hashString } from '@/bench/hash';
import { BENCH_SEED_TEXT } from '@/bench/bench';
import { useScroll } from '@/scroll/ScrollProvider';
import { Plate } from '@/site/Plate';

export function First() {
  const { tier } = useScroll();
  const c = copy.first;
  const [head, ...rest] = c.lines;
  // The bot's own MachineSummary.count (copy.ts's plate comment): six parts, fixed by its build
  // spec, from a bot-only layout() call so this never re-lays out the whole bench for one figure.
  const botParts = useMemo(() => layout({ tier, seed: hashString(BENCH_SEED_TEXT), configs: [BOT] }).machines[MACHINE.bot].count, [tier]);
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
              <Plate machine={MACHINE.bot}>{c.plate(botParts)}</Plate>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
