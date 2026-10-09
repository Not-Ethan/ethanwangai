import type { Tier } from '@/valley/types';

export function detectTier(): Tier {
  if (typeof window === 'undefined') return 'desktop';
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.innerWidth < 820;
  const weak = (navigator.hardwareConcurrency ?? 8) <= 4;
  return coarse || narrow || weak ? 'phone' : 'desktop';
}
