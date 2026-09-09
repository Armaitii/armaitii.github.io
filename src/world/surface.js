import * as THREE from 'three';
import { terrainH, terrainGrad } from './lossField';
import { WORLD, THEMES } from './constants';

/**
 * surface.js — dense parametric grid morphed every frame.
 * Heights & normals come straight from the analytic terrain (single pass),
 * colors are remapped each frame by normalized height.
 * A LineSegments wireframe shares the same position buffer, so the grid
 * automatically follows the surface — that's the "grid surface" look.
 */

const RES = 0.3; // world units per grid segment (12-unit field → 40×40 grid)
const G = new Float32Array(2); // scratch for gradients

export class Surface {
  constructor(scene, themeName) {
    const { SIZE } = WORLD;
    const N = Math.floor((SIZE * 2) / RES);
    const geo = new THREE.PlaneGeometry(SIZE * 2, SIZE * 2, N, N);
    geo.rotateX(-Math.PI / 2);
    // PlaneGeometry ships without a color attribute — add one (vertexColors)
    const count = geo.attributes.position.count;
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    this.N = N;
    this.N1 = N + 1;

    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.72, // see-through: the page shows softly through the surface
    });
    this.mat = mat;
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    // --- wireframe overlay sharing the SAME position attribute ---
    const idx = [];
    const W = this.N1;
    for (let iy = 0; iy < W; iy++) {           // horizontal lines
      for (let ix = 0; ix < N; ix++) {
        idx.push(iy * W + ix, iy * W + ix + 1);
      }
    }
    for (let ix = 0; ix < W; ix++) {           // vertical lines
      for (let iy = 0; iy < N; iy++) {
        idx.push(iy * W + ix, (iy + 1) * W + ix);
      }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', geo.getAttribute('position')); // shared!
    lineGeo.setIndex(idx);
    this.lineMat = new THREE.LineBasicMaterial({
      color: THEMES.light.grid.color,
      transparent: true,
      opacity: THEMES.light.grid.opacity,
      depthWrite: false,
    });
    this.grid = new THREE.LineSegments(lineGeo, this.lineMat);
    this.grid.frustumCulled = false;
    scene.add(this.grid);

    const V = W * W;
    this.pos = geo.attributes.position.array;
    this.col = geo.attributes.color.array;
    this.nrm = geo.attributes.normal.array;
    this.h = new Float32Array(V);     // per-vertex heights of this frame
    this.gg = new Float32Array(V * 2); // per-vertex gradient of this frame

    this.setTheme(themeName);
  }

  setTheme(name) {
    const g = THEMES[name].grid;
    this.lineMat.color.setHex(g.color);
    this.lineMat.opacity = g.opacity;
    this.pal = name === 'dark' ? PAL_DARK : PAL_LIGHT;
  }

  /** One full update pass: heights, then colors & normals once range is known. */
  update() {
    const { pos, h, gg } = this;
    let min = Infinity, max = -Infinity;

    // The geometry was pre-rotated into the XZ plane (y === 0 for every
    // vertex), so the surface lives at coordinates (x, z) = (pos[i], pos[i+2])
    // and heights must be displaced along WORLD UP = pos[i + 1] — NOT pos[i+2].
    // (Writing heights into z was the bug that collapsed the whole grid into
    // a single curve — "just a line".)
    for (let i = 0, v = 0; i < pos.length; i += 3, v++) {
      const x = pos[i], z = pos[i + 2];
      const hh = terrainH(x, z);
      h[v] = hh;
      terrainGrad(x, z, G);
      gg[v * 2] = G[0];       // ∂h/∂x
      gg[v * 2 + 1] = G[1];   // ∂h/∂z
      if (hh < min) min = hh;
      if (hh > max) max = hh;
    }
    // write heights into the y component (world up)
    for (let v = 0, i = 0; v < h.length; v++, i += 3) pos[i + 1] = h[v];

    // pass 2 — colors & analytic normals (normal ∝ (−∂h/∂x, 1, −∂h/∂z))
    // colors: map [min, min+R] across the palette, clip anything higher to
    // the top color — keeps contrast where the action happens
    const R = Math.min(max - min, 3.2);
    for (let v = 0, i = 0; v < h.length; v++, i += 3) {
      const t = (h[v] - min) / R;
      map(t, this.pal, this.col, i);
      const gx = gg[v * 2], gz = gg[v * 2 + 1];
      const len = Math.sqrt(gx * gx + gz * gz + 1);
      this.nrm[i] = -gx / len;
      this.nrm[i + 1] = 1 / len;
      this.nrm[i + 2] = -gz / len;
    }

    const geo = this.mesh.geometry;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.attributes.normal.needsUpdate = true;
    geo.computeBoundingSphere();
  }
}

// ---------------------------------------------------------------------------
// Height colormaps. PAL_DARK = vivid plasma (pops on the dark theme).
// PAL_LIGHT = soft, airy "pastel aurora" — reads gently on the light theme.
// ---------------------------------------------------------------------------
const PAL_DARK = [
  [0.0, 0.05, 0.13, 0.50],
  [0.25, 0.23, 0.05, 0.66],
  [0.5, 0.55, 0.07, 0.60],
  [0.72, 0.83, 0.26, 0.42],
  [1.0, 0.99, 0.97, 0.20],
];
const PAL_LIGHT = [
  [0.0, 0.40, 0.36, 0.88],  // dusky violet (deep valleys)
  [0.28, 0.45, 0.58, 0.96], // blue-lavender
  [0.52, 0.58, 0.74, 0.97], // periwinkle
  [0.74, 0.72, 0.78, 0.88], // soft lilac-grey
  [1.0, 0.88, 0.72, 0.58],  // warm sand (peaks)
];

function map(t, pal, arr, i) {
  const tt = t < 0 ? 0 : t > 1 ? 1 : t;
  for (let s = 1; s < pal.length; s++) {
    const [t0, r0, g0, b0] = pal[s - 1];
    const [t1, r1, g1, b1] = pal[s];
    if (tt <= t1 || s === pal.length - 1) {
      const k = (tt - t0) / (t1 - t0);
      // 0..1 floats — this attribute is NOT normalized, so >1 clamps to white
      arr[i] = r0 + (r1 - r0) * k;
      arr[i + 1] = g0 + (g1 - g0) * k;
      arr[i + 2] = b0 + (b1 - b0) * k;
      return;
    }
  }
}
