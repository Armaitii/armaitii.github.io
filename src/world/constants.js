import { FIELD } from './lossField';

/** Shared world constants (world units) for modules that need them. */
export const WORLD = {
  SIZE: FIELD.SIZE, // field covers [-SIZE, SIZE]²
};

export const CAM = {
  // Stage-style 3D view: from the side AND slightly above the field, so the
  // height of the terrain is clearly visible ("2.5D" tilted perspective).
  base: { x: 7.2, y: 5.6, z: 9.4 },
  parallax: { x: 0.6, y: 0.4 }, // world units of drift per unit NDC
  sway: { x: 0.5, y: 0.2, z: 0.42 }, // slow ambient camera drift amplitude
  fov: 48,
};

/**
 * Light & dark palettes for the live 3D scene. The page theme (CSS) and the
 * WebGL theme are switched together from main.js via World#setTheme().
 */
export const THEMES = {
  light: {
    clear: 0xf2f5fc,          // renderer clear color + fog
    fogDensity: 0.021,
    grid: { color: 0x141f45, opacity: 0.5 }, // bold, clearly visible wireframe
    trailTail: 0xf2f5fc,      // ribbon fades into the page background
    hemi: { sky: 0xffffff, ground: 0xc9d4ec, intensity: 0.85 },
    sun: { color: 0xffffff, intensity: 1.7 },
    fill: { color: 0x9fb0ff, intensity: 0.5 },
  },
  dark: {
    clear: 0x05070d,
    fogDensity: 0.028,
    grid: { color: 0xaacbff, opacity: 0.45 },
    trailTail: 0x05070d,
    hemi: { sky: 0x9db8ff, ground: 0x241033, intensity: 0.9 },
    sun: { color: 0xfff1df, intensity: 1.4 },
    fill: { color: 0x7f8dff, intensity: 0.45 },
  },
};
