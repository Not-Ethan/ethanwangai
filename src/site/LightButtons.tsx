'use client';
// Keyboard: one button per light, in build order, named by its label; focus moves the (invisible) button onto its
// light so the focus ring circles it, and puts the label in the bottom mono line. Touch: a tap near a light shows its
// label in the same line (spec §11 phone). Reads the projected positions only on focus or tap, never per frame.
import { useEffect, useRef, useState } from 'react';
import type { EmitterId } from '@/valley/types';
import { EMITTERS } from '@/valley/lights';
import { PROJECTED } from '@/gl/projection';
import { useGlFailed } from '@/fallback/Still';
import { copy } from './copy';
import { projectedToPixels } from './hillsideHit';
import { getVisitorSnapshot } from './visitorSentence';
import { LIGHT_ORDER, isTap, lightLabel, nearestEmitter } from './lightControls';

const INDEX = new Map<EmitterId, number>(EMITTERS.map((e, i) => [e.id, i]));
const INTERACTIVE = 'a, button, input, textarea, select, label';
// CSS-px copy of PROJECTED (which is NDC), refreshed on each tap or focus, never per frame.
const PX = new Float32Array(PROJECTED.length);
const pixels = () => projectedToPixels(PROJECTED, window.innerWidth, window.innerHeight, PX);

export function LightControls() {
  const failed = useGlFailed();
  const [line, setLine] = useState('');
  const [sentence, setSentence] = useState<string | null>(null);
  const down = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    if (failed) return;
    const onDown = (e: PointerEvent) => {
      down.current = e.pointerType === 'touch' ? { x: e.clientX, y: e.clientY, t: e.timeStamp } : null;
    };
    const onUp = (e: PointerEvent) => {
      const d = down.current;
      down.current = null;
      if (!d || e.pointerType !== 'touch') return;
      if (!isTap(d, { x: e.clientX, y: e.clientY, t: e.timeStamp })) return;
      if ((e.target as Element | null)?.closest?.(INTERACTIVE)) return;
      const i = nearestEmitter(pixels(), e.clientX, e.clientY);
      setLine(i < 0 ? '' : lightLabel(EMITTERS[i].id, getVisitorSnapshot()) ?? '');
    };
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
    };
  }, [failed]);

  if (failed) return null;

  const show = (id: EmitterId, el: HTMLElement) => {
    const s = getVisitorSnapshot();
    setSentence(s);
    const i = INDEX.get(id) ?? 0;
    const px = pixels();
    el.style.transform = `translate(${px[i * 3]}px, ${px[i * 3 + 1]}px)`;
    setLine(lightLabel(id, s) ?? '');
  };

  return (
    <>
      <div role="group" aria-label={copy.open.deck}>
        {LIGHT_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            className="light-control"
            aria-label={lightLabel(id, sentence) ?? copy.yours.placeholder}
            onFocus={(e) => show(id, e.currentTarget)}
            onClick={(e) => show(id, e.currentTarget)}
            onBlur={() => setLine('')}
          />
        ))}
      </div>
      <p className="tap-line mono" aria-live="polite" data-still-hide hidden={line === ''}>{line}</p>
    </>
  );
}
