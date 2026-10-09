'use client';
import { useEffect, useRef } from 'react';
import { EMITTERS } from '@/valley/lights';
import { LABEL_LIFT_PX } from './labelItems';
import { stillParams } from '@/gl/introGate';
import { EMITTER_INDEX, LABEL_ALPHA, PROJECTED, placeLabel, type AvoidRect, type LabelPlacement } from '@/gl/projection';
import { copy } from '@/site/copy';
import { ignitionLabelItems, type LabelItem } from './labelItems';

/**
 * The ignition labels (spec §3.1 · 01) as the static list the no-WebGL tier shows under the deck (spec §11), in chain
 * order. Stage 2 adds the projected label spans positioned from the driver; this list stays as the fallback.
 */
export function Labels() {
  return (
    <ul className="mono ink-dim mt-6 flex flex-col gap-1" data-labels>
      {Object.entries(copy.open.labels).map(([key, text]) => (
        <li key={key} data-label={key}>{text}</li>
      ))}
    </ul>
  );
}

// Projected labels over the canvas (spec §6 Labels): spans positioned every animation frame from PROJECTED, the
// driver's targets.projected. No per-frame layout reads; the viewport size is cached on resize. placeLabel clamps to
// the viewport and hides anything off-screen or invalid (spec §12). Opacity comes from LABEL_ALPHA (0 until Stage 3).
export const LABEL_MARGIN = 16;
export const IGNITION_LABELS: LabelItem[] = ignitionLabelItems(copy.open.labels);

export function ProjectedLabels({ items = IGNITION_LABELS }: { items?: readonly LabelItem[] }) {
  const spans = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const indices = items.map((it) => EMITTER_INDEX[it.anchor]);
    const lastX = new Float32Array(items.length).fill(Number.NaN);
    const lastY = new Float32Array(items.length).fill(Number.NaN);
    const lastA = new Float32Array(items.length).fill(Number.NaN);
    const w = new Float32Array(items.length);
    const h = new Float32Array(items.length);
    // a label sits higher over a bigger light (the mill's panes, a house's windows): 12 px per unit of glow size
    const lift = Float32Array.from(items, (it) => 12 * EMITTERS[EMITTER_INDEX[it.anchor]].size + LABEL_LIFT_PX[it.key]);
    // the hero's headline and deck lines, read once per resize (never per frame): labels keep clear of them while
    // the chain plays at the top of the page. Still mode (the gates) hides the DOM, so it skips this.
    const still = stillParams(typeof window === 'undefined' ? '' : window.location.search).still;
    const avoids: AvoidRect[] = [];
    const measureAvoid = () => {
      avoids.length = 0;
      if (still) return;
      const open = document.getElementById('open');
      if (!open) return;
      const lines = open.querySelectorAll('h1, p.mono');
      lines.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) avoids.push({ left: r.left, top: r.top + window.scrollY, right: r.right, bottom: r.bottom + window.scrollY });
      });
    };
    measureAvoid();
    // boxes placed this frame, for the overlap pass (chain order: the later label moves up)
    const px = new Float32Array(items.length);
    const py = new Float32Array(items.length);
    const on = new Uint8Array(items.length);
    const measure = () => {
      for (let k = 0; k < items.length; k++) {
        const el = spans.current[k];
        if (el) { w[k] = el.offsetWidth; h[k] = el.offsetHeight; }
      }
    };
    measure();
    const place: LabelPlacement = { x: 0, y: 0, visible: false };
    let vw = window.innerWidth;
    let vh = window.innerHeight;
    const onResize = () => { vw = window.innerWidth; vh = window.innerHeight; measure(); measureAvoid(); lastX.fill(Number.NaN); };
    window.addEventListener('resize', onResize);

    let raf = 0;
    const loop = () => {
      for (let k = 0; k < items.length; k++) {
        const el = spans.current[k];
        if (!el) continue;
        const i = indices[k];
        // the avoid rects are document px; they only matter at the top of the page
        placeLabel(PROJECTED, i, vw, vh, LABEL_MARGIN, place, w[k], h[k] + lift[k], avoids.length > 0 && window.scrollY < 2 ? avoids : null);
        const alpha = place.visible ? LABEL_ALPHA[i] : 0;
        // a label never prints over one that is already showing: move up by its height plus a gap, up to three times
        if (place.visible && alpha > 0.02) {
          for (let tries = 0; tries < 3; tries++) {
            let moved = false;
            for (let j = 0; j < k; j++) {
              if (!on[j]) continue;
              const ox = px[j], oy = py[j];
              if (place.x < ox + w[j] && place.x + w[k] > ox && place.y < oy + h[j] && place.y + h[k] > oy) {
                place.y = oy - h[k] - 4;
                moved = true;
              }
            }
            if (!moved) break;
          }
          px[k] = place.x; py[k] = place.y; on[k] = 1;
        } else {
          on[k] = 0;
        }
        if (place.visible && (Number.isNaN(lastX[k]) || Math.abs(place.x - lastX[k]) > 0.5 || Math.abs(place.y - lastY[k]) > 0.5)) {
          el.style.transform = `translate3d(${place.x.toFixed(1)}px, ${place.y.toFixed(1)}px, 0)`;
          lastX[k] = place.x;
          lastY[k] = place.y;
        }
        if (alpha !== lastA[k]) {
          el.style.opacity = String(alpha);
          lastA[k] = alpha;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [items]);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden" aria-hidden>
      {items.map((it, k) => (
        <span
          key={it.key}
          data-projected-label={it.key}
          ref={(el) => { spans.current[k] = el; }}
          className="mono absolute left-0 top-0 whitespace-nowrap text-[12px] leading-none"
          style={{ opacity: 0, color: 'var(--ink)' }}
        >
          {it.text}
        </span>
      ))}
    </div>
  );
}
