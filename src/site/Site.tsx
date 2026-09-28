'use client';
import dynamic from 'next/dynamic';
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

// The GL scene is client-only: it needs a WebGL2 context and reads the DOM's theme; the server renders the complete DOM site without it.
const Scene = dynamic(() => import('@/gl/Scene').then((m) => m.Scene), { ssr: false });

export function Site() {
  return (
    <ScrollProvider>
      <Scene />
      <Nav />
      <SectionStrip />
      <main className="relative z-10">
        <Sentence /><More /><First /><Kalshi /><Heron /><Darch /><Summers /><Alive /><Yours />
      </main>
    </ScrollProvider>
  );
}
