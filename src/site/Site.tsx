import { Swarm } from '@/swarm/Swarm';
import { BUILT_TOTAL } from '@/swarm/inventory';
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

export { BUILT_TOTAL };

export function Site() {
  return (
    <Swarm>
      <Bar />
      <main>
        <Hero />
        <About />
        <Work />
        <Experience />
        <Toolbox />
        <Rest />
        <Closer />
      </main>
      <Footer />
      <ToTop />
    </Swarm>
  );
}
