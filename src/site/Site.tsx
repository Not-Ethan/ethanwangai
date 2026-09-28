'use client';
import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { ScrollProvider } from '@/scroll/ScrollProvider';
import { useTier } from '@/gl/useTier';
import { benchLockEnds } from './chrome/inkedCount';
import { startHudSync } from './chrome/hudSync';
import { copy } from './copy';
import { Nav } from './chrome/Nav';
import { SectionStrip } from './chrome/SectionStrip';
import { Sentence } from './sections/Sentence';
import { More } from './sections/More';
import { First } from './sections/First';
import { Kalshi } from './sections/Kalshi';
import { Heron } from './sections/Heron';
import { Darch } from './sections/Darch';
import { Summers } from './sections/Summers';
import { Alive } from './sections/Alive';
import { Yours } from './sections/Yours';

// The GL scene is client-only: it needs a WebGL2 context and reads the DOM's theme; the server renders the complete DOM site without it.
const Scene = dynamic(() => import('@/gl/Scene').then((m) => m.Scene), { ssr: false });

const WORD_COUNT = copy.sentence.headline.split(' ').length;

/**
 * Runs hudSync's DOM loop (task 3.6) on the tier Scene builds for, `?tier=` included, so the ladder counts the same
 * layout the scene draws. The layout is built in the effect, after hydration, and its module loads on demand into
 * the chunk it shares with Scene; a tier change stops the loop and starts it on the new layout.
 */
function HudSync() {
  const { tier } = useTier();
  useEffect(() => {
    let stop: (() => void) | undefined;
    let live = true;
    void import('@/bench/counts').then(({ buildBench }) => {
      if (live) stop = startHudSync({ lockEnds: benchLockEnds(buildBench(tier)), wordCount: WORD_COUNT });
    });
    return () => { live = false; stop?.(); };
  }, [tier]);
  return null;
}

export function Site() {
  return (
    <ScrollProvider>
      <Scene />
      <HudSync />
      <Nav />
      <SectionStrip />
      <main className="relative z-10">
        <Sentence /><More /><First /><Kalshi /><Heron /><Darch /><Summers /><Alive /><Yours />
      </main>
    </ScrollProvider>
  );
}
