import * as THREE from 'three';
import { THEMES } from './constants';

/**
 * trail.js — a fading "ribbon" behind the ball, built as a triangle strip:
 * every history point is widened along the local path perpendicular, colored
 * teal near the ball and blended toward the page background at the tail
 * (the tail color follows the current light/dark theme).
 */

const MAX_PTS = 220;
const WIDTH = 0.09;

const HEAD = new THREE.Color(0x0e9487); // teal-600 — reads on both themes
const _tail = new THREE.Color();
const _c = new THREE.Color();

export class Trail {
  constructor(scene, themeName) {
    const vertCount = MAX_PTS * 2;
    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(new Float32Array(vertCount * 3), 3);
    this.colAttr = new THREE.BufferAttribute(new Float32Array(vertCount * 3), 3);
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('color', this.colAttr);

    // triangle strip indices, reused every frame via drawRange
    const idx = new Uint32Array((MAX_PTS - 1) * 6);
    for (let k = 0, j = 0; k < MAX_PTS - 1; k++) {
      const a = k * 2, b = a + 1, c = a + 2, d = a + 3;
      idx[j++] = a; idx[j++] = b; idx[j++] = c;
      idx[j++] = c; idx[j++] = b; idx[j++] = d;
    }
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.setDrawRange(0, 0);

    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.NormalBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    this.pts = []; // newest first
    this.geo = geo;
    this.setTheme(themeName);
  }

  setTheme(name) {
    _tail.setHex(THEMES[name].trailTail);
  }

  /** Record the ball's position (skips when barely moving). */
  push(x, y, z, moving) {
    if (!moving) return;
    if (this._last && Math.hypot(x - this._last[0], z - this._last[2]) < 0.03) return;
    this.pts.unshift([x, y, z]);
    this._last = this.pts[0];
    if (this.pts.length > MAX_PTS) this.pts.pop();
  }

  /** While the ball dawdles, let the ribbon shrink back toward it. */
  idleShrink() {
    if (this.pts.length > 1 && this.pts.length % 3 === 0) this.pts.pop();
  }

  rebuild() {
    const n = this.pts.length;
    if (n < 2) { this.geo.setDrawRange(0, 0); return; }

    const P = this.posAttr.array;
    const C = this.colAttr.array;

    for (let i = 0; i < n; i++) {
      const [x, y, z] = this.pts[i];
      let px = 1, py = 0, pz = 0; // fallback perpendicular

      const nx = this.pts[Math.min(i + 1, n - 1)];
      let tx = nx[0] - x, ty = nx[1] - y, tz = nx[2] - z;
      const tl = Math.hypot(tx, ty, tz) || 1e-6;
      tx /= tl; ty /= tl; tz /= tl;

      // perpendicular = tangent × world-up (fallback to world-x)
      const cx = ty * 0 - tz * 1, cy = tz * 0 - tx * 0, cz = tx * 1 - ty * 0;
      const cl = Math.hypot(cx, cy, cz);
      if (cl > 1e-4) { px = cx / cl; py = cy / cl; pz = cz / cl; }

      const t = i / (n - 1);
      const fade = Math.pow(1 - t, 1.7);
      _c.copy(HEAD).lerp(_tail, 1 - fade);

      const i6 = i * 6;
      P[i6] = x + px * WIDTH;     P[i6 + 1] = y + py * WIDTH;     P[i6 + 2] = z + pz * WIDTH;
      P[i6 + 3] = x - px * WIDTH; P[i6 + 4] = y - py * WIDTH;     P[i6 + 5] = z - pz * WIDTH;
      C[i6] = _c.r; C[i6 + 1] = _c.g; C[i6 + 2] = _c.b;
      C[i6 + 3] = _c.r; C[i6 + 4] = _c.g; C[i6 + 5] = _c.b;
    }

    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
    this.geo.setDrawRange(0, (n - 1) * 6);
  }
}
