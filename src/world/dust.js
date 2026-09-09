import * as THREE from 'three';

/**
 * dust.js — "magical dust" trail behind the ball.
 *
 * Instead of a solid ribbon, the ball sheds a stream of tiny glowing specks
 * that drift, twinkle and fade — like fairy dust. Implemented as a pool of
 * GPU points with a soft radial sprite shader (per-particle size, colour,
 * phase for the twinkle). Palette follows the theme so the specks read well
 * on both light and dark backgrounds.
 */

const POOL = 260;

// [r, g, b] options per theme
const PALETTES = {
  light: [
    [0.85, 0.45, 0.08], // warm gold
    [0.93, 0.28, 0.46], // fairy pink
    [0.09, 0.50, 0.48], // teal
    [0.46, 0.26, 0.82], // violet
  ],
  dark: [
    [1.00, 0.87, 0.55], // champagne gold
    [0.55, 0.95, 1.00], // ice cyan
    [0.87, 0.72, 1.00], // lilac
    [1.00, 0.72, 0.62], // peach
  ],
};

const VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aPhase;
  uniform float uScale;
  uniform float uTime;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vColor = aColor;
    vTwinkle = 0.62 + 0.38 * sin(uTime * 6.0 + aPhase * 6.2831853);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale / max(0.1, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p);
    float a = smoothstep(0.5, 0.06, d);
    a *= a; // soft, powdery falloff
    gl_FragColor = vec4(vColor * vTwinkle, a);
  }
`;

export class Dust {
  constructor(scene, themeName) {
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(POOL * 3);
    this.col = new Float32Array(POOL * 3);
    this.size = new Float32Array(POOL);
    this.phase = new Float32Array(POOL);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(this.phase, 1));
    geo.setDrawRange(0, POOL);

    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    mat.uniforms.uScale = { value: 700 };
    mat.uniforms.uTime = { value: 0 };
    this.mat = mat;
    this.mesh = new THREE.Points(geo, mat);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    // particle state (ring buffer)
    this.px = new Float32Array(POOL);
    this.py = new Float32Array(POOL);
    this.pz = new Float32Array(POOL);
    this.vx = new Float32Array(POOL);
    this.vy = new Float32Array(POOL);
    this.vz = new Float32Array(POOL);
    this.br = new Float32Array(POOL); // base colour (fade is applied per frame)
    this.bg = new Float32Array(POOL);
    this.bb = new Float32Array(POOL);
    this.age = new Float32Array(POOL);
    this.life = new Float32Array(POOL);
    this.alive = new Uint8Array(POOL);
    this.next = 0;

    this.palette = PALETTES.light;
    this.acc = 0;
    this.time = 0;
    this.setTheme(themeName);
  }

  setTheme(name) {
    this.palette = PALETTES[name] || PALETTES.light;
  }

  /** Call on renderer resize to keep sparkle sizes right. */
  resize(hPx, dpr) {
    this.mat.uniforms.uScale.value = hPx * dpr * 0.55;
  }

  /** Hide every particle immediately (e.g. when the ball leaves the scene). */
  killAll() {
    for (let i = 0; i < POOL; i++) {
      this.alive[i] = 0;
      const i3 = i * 3;
      this.col[i3] = 0; this.col[i3 + 1] = 0; this.col[i3 + 2] = 0;
      this.size[i] = 0;
    }
    this.acc = 0;
    const g = this.mesh.geometry;
    g.attributes.aColor.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
  }

  /**
   * Advance particles & queue the buffers for drawing.
   * @param dt        seconds
   * @param bx,by,bz  ball world position
   * @param vx,vz     ball horizontal velocity (sheds dust "behind" the ball)
   * @param speed     ball speed
   */
  update(dt, bx, by, bz, vx, vz, speed) {
    this.time += dt;
    this.mat.uniforms.uTime.value = this.time;

    // emit — more specks the faster the ball rolls, a trickle when it idles
    const moving = speed > 0.12;
    const rate = moving ? 22 + 70 * Math.min(1, speed / 2.4) : 7;
    this.acc += rate * dt;
    const rnd = Math.random;

    while (this.acc >= 1) {
      this.acc -= 1;
      const i = this.next;
      this.next = (this.next + 1) % POOL;

      // spawn position: slightly behind the ball, with a little scatter
      let dx = 0, dz = 0;
      const sp = Math.hypot(vx, vz);
      if (sp > 0.01) { dx = -vx / sp; dz = -vz / sp; }
      const back = 0.1 + rnd() * 0.4;
      const lat = (rnd() * 2 - 1) * 0.5;
      const ddx = -dz * lat, ddz = dx * lat; // lateral scatter ⊥ direction

      this.px[i] = bx + dx * back + ddx;
      this.py[i] = by + rnd() * 0.3;
      this.pz[i] = bz + dz * back + ddz;

      // drift: slight backward tumble + upward float + random swirl
      const scatter = 0.25 + rnd() * 0.5;
      this.vx[i] = dx * scatter * (0.4 + rnd() * 0.8) + (rnd() * 2 - 1) * 0.25;
      this.vz[i] = dz * scatter * (0.4 + rnd() * 0.8) + (rnd() * 2 - 1) * 0.25;
      this.vy[i] = 0.04 + rnd() * 0.34; // dust floats upward a touch

      this.age[i] = 0;
      this.life[i] = 0.7 + rnd() * 1.7;
      this.size[i] = 0.035 + rnd() * 0.085;
      this.phase[i] = rnd();
      this.alive[i] = 1;

      const c = this.palette[(rnd() * this.palette.length) | 0];
      this.br[i] = c[0]; this.bg[i] = c[1]; this.bb[i] = c[2];
    }

    // integrate + fade (colour = base colour × life envelope)
    const drag = Math.exp(-1.5 * dt);
    for (let i = 0; i < POOL; i++) {
      const i3 = i * 3;
      if (!this.alive[i]) {
        this.col[i3] = 0; this.col[i3 + 1] = 0; this.col[i3 + 2] = 0;
        this.size[i] = 0;
        continue;
      }
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) {
        this.alive[i] = 0;
        this.col[i3] = 0; this.col[i3 + 1] = 0; this.col[i3 + 2] = 0;
        this.size[i] = 0;
        continue;
      }
      this.vx[i] *= drag;
      this.vy[i] = this.vy[i] * drag + 0.02 * dt; // gentle buoyancy
      this.vz[i] *= drag;
      this.px[i] += this.vx[i] * dt;
      this.py[i] += this.vy[i] * dt;
      this.pz[i] += this.vz[i] * dt;

      const k = this.age[i] / this.life[i];
      const env = Math.pow(Math.sin(Math.PI * Math.min(1, k)), 0.85); // in → out
      this.col[i3] = this.br[i] * env;
      this.col[i3 + 1] = this.bg[i] * env;
      this.col[i3 + 2] = this.bb[i] * env;
    }

    // write live positions back to the GPU buffer
    for (let i = 0; i < POOL; i++) {
      const i3 = i * 3;
      if (this.alive[i]) {
        this.pos[i3] = this.px[i];
        this.pos[i3 + 1] = this.py[i];
        this.pos[i3 + 2] = this.pz[i];
      }
    }
    const g = this.mesh.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aColor.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
  }
}
