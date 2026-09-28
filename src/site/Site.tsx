'use client';
import { ScrollProvider } from '@/scroll/ScrollProvider';
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

export function Site() {
  return (
    <ScrollProvider>
      {/* Stage 2 mounts <Scene /> here, fixed behind the DOM. */}
      <Nav />
      <SectionStrip />
      <main className="relative z-10">
        <Sentence /><More /><First /><Kalshi /><Heron /><Darch /><Summers /><Alive /><Yours />
      </main>
    </ScrollProvider>
  );
}
