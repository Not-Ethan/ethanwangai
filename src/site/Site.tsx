'use client';
import { ScrollProvider } from '@/scroll/ScrollProvider';
import { Nav } from './chrome/Nav';
import { Open } from './sections/Open';
import { Kalshi } from './sections/Kalshi';
import { Heron } from './sections/Heron';
import { Darch } from './sections/Darch';
import { Summers } from './sections/Summers';
import { Alive } from './sections/Alive';
import { Yours } from './sections/Yours';
import { Contact } from './sections/Contact';

// The committed night still (spec §7, §10): the first paint and the no-WebGL picture.
const STILL = '/valley-still.jpg';

/**
 * The site (spec §6, §9): the fixed valley wrapper at z 0 with the still as its background (Stage 2 mounts the canvas
 * inside it), the fixed nav, and the eight sections in <main> at z 10. The DOM is complete on its own.
 */
export function Site() {
  return (
    <ScrollProvider>
      <div className="valley-canvas" data-valley aria-hidden="true" style={{ backgroundImage: `url(${STILL})` }} />
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
    </ScrollProvider>
  );
}
