// The bed's hover readout (design §3.1/04, §8 Pointer, task 4.3): one fixed mono line beside the cursor with the
// hovered market's own numbers. Hover.tsx writes hud.hover from the scene; hudSync's rAF calls the sync below, which
// places #readout 14 px below and right of the pointer and fills it, writing only what changed. Hidden while no
// machine is hovered. Solid paper behind the type, no shadow and no backdrop filter over the canvas.
import type { HudHover } from '@/gl/hud';
import { copy } from '@/site/copy';

/** CSS px from the pointer to the readout's top-left corner, both axes. */
export const READOUT_OFFSET = 14;

/** `market 23 · bid 21 · ask 26 · fills 3`, labels from copy.kalshi.readout. */
export function readoutText(h: HudHover): string {
  const r = copy.kalshi.readout;
  return `${r.market} ${h.col} · ${r.bid} ${h.bid} · ${r.ask} ${h.ask} · ${r.fills} ${h.fills}`;
}

/** The per-frame writer for `el` (#readout, looked up once by the caller); a missing element makes it a no-op. */
export function createReadoutSync(el: HTMLElement | null): (h: HudHover) => void {
  let shown: boolean | null = null, text = '', x = NaN, y = NaN;
  return (h) => {
    if (!el) return;
    const show = h.machine !== -1;
    if (show !== shown) { shown = show; el.hidden = !show; }
    if (!show) return;
    const t = readoutText(h);
    if (t !== text) { text = t; el.textContent = t; }
    if (h.x !== x || h.y !== y) {
      x = h.x;
      y = h.y;
      el.style.transform = `translate3d(${x + READOUT_OFFSET}px, ${y + READOUT_OFFSET}px, 0)`;
    }
  };
}

export function Readout() {
  return (
    <div
      id="readout"
      className="mono pointer-events-none fixed left-0 top-0 z-30 whitespace-nowrap bg-paper px-1.5 py-0.5 text-ink"
      hidden
      aria-hidden="true"
    />
  );
}
