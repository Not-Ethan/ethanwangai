'use client';
// Stars (spec §4.1, §11): one points draw, 1,200 on desktop and 400 on phone, alpha from tod via uStarAlpha.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Tier } from '@/valley/types';
import type { ValleyUniforms } from './driverCore';
import { createStarsMaterial } from './shaders/sky';
import { starField, STARS_DESKTOP, STARS_PHONE } from './starField';

export function Stars({ uniforms, tier }: { uniforms: ValleyUniforms; tier: Tier }) {
  const geometry = useMemo(() => {
    const f = starField(tier === 'phone' ? STARS_PHONE : STARS_DESKTOP);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(f.positions, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(f.sizes, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(f.phases, 1));
    return g;
  }, [tier]);
  const material = useMemo(() => createStarsMaterial(uniforms), [uniforms]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  return <points geometry={geometry} material={material} renderOrder={-1} frustumCulled={false} />;
}
