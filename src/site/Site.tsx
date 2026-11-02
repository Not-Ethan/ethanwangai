import { Bar } from './sections/Bar';
import { Hero } from './sections/Hero';
import { ToTop } from './sections/ToTop';

/** How many elements the agents build (spec §7.7). */
export const BUILT_TOTAL = 43;

export function Site() {
  return (
    <>
      <Bar />
      <main>
        <Hero />
      </main>
      <ToTop />
    </>
  );
}
