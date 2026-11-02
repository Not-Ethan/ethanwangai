import { Bar } from './sections/Bar';
import { Hero } from './sections/Hero';
import { About } from './sections/About';
import { Toolbox } from './sections/Toolbox';
import { Experience } from './sections/Experience';
import { Work } from './sections/Work';
import { Rest } from './sections/Rest';
import { Closer } from './sections/Closer';
import { Footer } from './sections/Footer';
import { ToTop } from './sections/ToTop';

/** How many elements the agents build (spec §7.7). */
export const BUILT_TOTAL = 43;

export function Site() {
  return (
    <>
      <Bar />
      <main>
        <Hero />
        <About />
        <Toolbox />
        <Experience />
        <Work />
        <Rest />
        <Closer />
      </main>
      <Footer />
      <ToTop />
    </>
  );
}
