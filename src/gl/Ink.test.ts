import { describe, it, expect, afterEach } from 'vitest';
import { SECTION_INDEX } from '@/bench/sections';
import { createUniforms } from './material/uniforms';
import { RectTracker } from './rects';
import { hud } from './hud';
import { writeInkFrame } from './Ink';

// One frame's ink registry writes (Ink.tsx, priority 0 after Clocks). Reduced motion (design §11) has no ink transit:
// the trickle is off and uInkEnabled hides every point.
describe('writeInkFrame', () => {
  const section = hud.section;
  afterEach(() => { hud.section = section; });

  it('shows the ink and runs the trickle at full motion', () => {
    hud.section = SECTION_INDEX.kalshi;
    const u = createUniforms();
    writeInkFrame(u, new RectTracker(), 0, 1440, 900, 1, false);
    expect(u.uInkEnabled.value).toBe(1);
    expect(u.uTrickle.value).toBe(1);
  });

  it('under reduced motion hides the ink and stops the trickle', () => {
    hud.section = SECTION_INDEX.kalshi;
    const u = createUniforms();
    writeInkFrame(u, new RectTracker(), 0, 1440, 900, 1, true);
    expect(u.uInkEnabled.value).toBe(0);
    expect(u.uTrickle.value).toBe(0);
  });
});
