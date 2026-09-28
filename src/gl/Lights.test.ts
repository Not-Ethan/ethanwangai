import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { PALETTES } from '@/theme/palettes';
import { createUniforms, applyPalette } from './material/uniforms';
import { lightRef, setLightRef } from './registry';
import { configureKeyLight, bindHemisphere, KEY_LIGHT, SHADOW_CAMERA_START, HEMISPHERE_INTENSITY } from './Lights';

function hexOf(c: THREE.Color): string { return `#${c.getHexString().toUpperCase()}`; }

describe('configureKeyLight', () => {
  it('places the key light upper-left-front at intensity 2.4', () => {
    const light = new THREE.DirectionalLight();
    configureKeyLight(light, 'desktop');
    expect(light.position.toArray()).toEqual([-8, 14, 10]);
    expect(light.intensity).toBe(2.4);
    expect(KEY_LIGHT.position).toEqual([-8, 14, 10]);
  });

  it('casts a 2048 shadow map with the tuned biases on desktop', () => {
    const light = new THREE.DirectionalLight();
    configureKeyLight(light, 'desktop');
    expect(light.castShadow).toBe(true);
    expect(light.shadow.mapSize.toArray()).toEqual([2048, 2048]);
    expect(light.shadow.normalBias).toBe(0.02);
    expect(light.shadow.bias).toBe(-0.0002);
  });

  it('casts no shadow on phone, where contact darkening carries the grounding', () => {
    const light = new THREE.DirectionalLight();
    configureKeyLight(light, 'phone');
    expect(light.castShadow).toBe(false);
  });

  it('starts the orthographic shadow camera as a box over the whole bench for the warm-up frame', () => {
    const light = new THREE.DirectionalLight();
    configureKeyLight(light, 'desktop');
    const cam = light.shadow.camera;
    expect(cam).toBeInstanceOf(THREE.OrthographicCamera);
    const e = SHADOW_CAMERA_START.extent;
    expect([cam.left, cam.right, cam.top, cam.bottom]).toEqual([-e, e, e, -e]);
    expect([cam.near, cam.far]).toEqual([SHADOW_CAMERA_START.near, SHADOW_CAMERA_START.far]);
    // the bench spans roughly x −9.5..8.5, z −6..7.5 (PLACEMENT ± footprints); the box must not clip it
    expect(e).toBeGreaterThanOrEqual(10);
    // updateProjectionMatrix ran: the matrix is no longer three's default ±5 box
    const fresh = new THREE.OrthographicCamera(-e, e, e, -e, SHADOW_CAMERA_START.near, SHADOW_CAMERA_START.far);
    expect(cam.projectionMatrix.toArray()).toEqual(fresh.projectionMatrix.toArray());
  });

  it('demoting desktop to phone on the same light turns its shadow off', () => {
    const light = new THREE.DirectionalLight();
    configureKeyLight(light, 'desktop');
    configureKeyLight(light, 'phone');
    expect(light.castShadow).toBe(false);
    expect(light.intensity).toBe(2.4);
  });
});

describe('bindHemisphere', () => {
  it('sets sky = paper and ground = shadow at intensity 0.6, on the light palette', () => {
    const u = createUniforms();
    const hemi = new THREE.HemisphereLight();
    bindHemisphere(hemi, u);
    expect(hemi.intensity).toBe(HEMISPHERE_INTENSITY);
    expect(hemi.intensity).toBe(0.6);
    expect(hexOf(hemi.color)).toBe(PALETTES.light.paper);
    expect(hexOf(hemi.groundColor)).toBe(PALETTES.light.shadow);
  });

  it('follows the palette lerp without a copy: the light holds the registry\'s own Color objects', () => {
    const u = createUniforms();
    const hemi = new THREE.HemisphereLight();
    bindHemisphere(hemi, u);
    expect(hemi.color).toBe(u.uPaper.value);
    expect(hemi.groundColor).toBe(u.uShadow.value);
    applyPalette(u, PALETTES.light, PALETTES.dark, 1);
    expect(hexOf(hemi.color)).toBe(PALETTES.dark.paper);
    expect(hexOf(hemi.groundColor)).toBe(PALETTES.dark.shadow);
  });
});

describe('registry.setLightRef', () => {
  it('hands the key light to lightRef and clears it again', () => {
    const light = new THREE.DirectionalLight();
    setLightRef(light);
    expect(lightRef.current).toBe(light);
    setLightRef(null);
    expect(lightRef.current).toBeNull();
  });
});
