'use client';
// Hover (mouse, pen) or tap (touch) a hillside house to read the sentence it was built from (spec §3.1 · 07, §11).
// Window listeners only; the canvas never receives pointer events. Writes the DOM directly, only on pointer and scroll
// events. In the no-GL tier the projected array stays all-invisible, so nothing ever shows.
import { useEffect, useRef } from 'react';
import { copy } from '@/site/copy';
import { PROJECTED } from '@/gl/projection';
import { HILL_INDICES, hillsideHit, labelPosition, projectedToPixels } from '@/site/hillsideHit';

const INTERACTIVE = 'a, button, input, textarea, select, label';

function overUi(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(INTERACTIVE) !== null;
}

// CSS-px copy of PROJECTED, refreshed on each pointer or scroll event (PROJECTED itself is NDC).
const PX = new Float32Array(PROJECTED.length);
const pixels = () => projectedToPixels(PROJECTED, window.innerWidth, window.innerHeight, PX);

function listen(hover: HTMLSpanElement, tap: HTMLParagraphElement): () => void {
  let px = -1;
  let py = -1;
  let shown = -1;
  const show = (k: number) => {
    if (k < 0) {
      hover.style.opacity = '0';
      shown = -1;
      return;
    }
    if (k !== shown) {
      hover.textContent = copy.yours.hillside[k];
      shown = k;
    }
    const i = HILL_INDICES[k] * 3;
    const [x, y] = labelPosition(PX[i], PX[i + 1], window.innerWidth, hover.offsetWidth);
    hover.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    hover.style.opacity = '1';
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    px = e.clientX;
    py = e.clientY;
    show(overUi(e.target) ? -1 : hillsideHit(px, py, pixels()));
  };
  const onScroll = () => {
    if (px >= 0) show(hillsideHit(px, py, pixels()));
  };
  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    const k = overUi(e.target) ? -1 : hillsideHit(e.clientX, e.clientY, pixels());
    tap.textContent = k < 0 ? '' : copy.yours.hillside[k];
    tap.style.opacity = k < 0 ? '0' : '1';
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerdown', onDown);
    window.removeEventListener('scroll', onScroll);
  };
}

export function HillsideLabel() {
  const hover = useRef<HTMLSpanElement>(null);
  const tap = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!hover.current || !tap.current) return;
    return listen(hover.current, tap.current);
  }, []);
  return (
    <>
      <span
        data-still-hide=""
        ref={hover}
        className="mono pointer-events-none fixed left-0 top-0 z-20 whitespace-nowrap opacity-0"
        aria-hidden="true"
      />
      <p ref={tap} data-still-hide="" className="mono pointer-events-none fixed inset-x-4 bottom-4 z-20 opacity-0" aria-live="polite" />
    </>
  );
}
