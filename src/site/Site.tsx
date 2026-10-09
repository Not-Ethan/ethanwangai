'use client';
import dynamic from 'next/dynamic';
import { ScrollProvider } from '@/scroll/ScrollProvider';
import { ProjectedLabels } from './Labels';
import { HillsideLabel } from './HillsideLabel';
import { Nav } from './chrome/Nav';
import { Open } from './sections/Open';
import { Kalshi } from './sections/Kalshi';
import { Heron } from './sections/Heron';
import { Darch } from './sections/Darch';
import { Summers } from './sections/Summers';
import { Alive } from './sections/Alive';
import { Yours } from './sections/Yours';
import { Contact } from './sections/Contact';

// The canvas is client-only and loads after hydration. Until then (and forever on the no-WebGL tier) the still behind
// it is div.valley-canvas's own CSS background, server-rendered, so the first paint is the finished picture (spec §7).
const Scene = dynamic(() => import('@/gl/Scene').then((m) => m.Scene), { ssr: false, loading: () => null });

// The committed night still (spec §7, §10): the first paint and the no-WebGL picture.
const STILL = '/valley-still.jpg';

/**
 * The site (spec §6, §9): the fixed valley wrapper at z 0 with the still as its background (Stage 2 mounts the canvas
 * inside it), the fixed nav, and the eight sections in <main> at z 10. The DOM is complete on its own.
 */
export function Site() {
  return (
    <ScrollProvider>
      <div className="valley-canvas" data-valley aria-hidden="true" style={{ backgroundImage: `url(${STILL})` }}>
        <Scene />
      </div>
      <Nav />
      <main className="relative z-10">
        <Open />
        <Kalshi />
        <Heron />
        <Darch />
        <Summers />
        <Alive />
        <Yours />
        <Contact />
      </main>
      <ProjectedLabels />
      <HillsideLabel />
    </ScrollProvider>
  );
}
