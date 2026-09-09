import * as THREE from 'three';
import {
  terrainGrad, terrainH, sample, setAnnealTarget, updateAnneal, FIELD,
} from './lossField';

/**
 * optimizer.js - the ball: continuous gradient descent with momentum,
 * friction and a little thermal noise. It NEVER stops, never "finds" a
 * minimum in the UI sense, and never teleports or resets:
 *
 *  - rolling freely, it descends whatever basin it finds, swirls a bit;
 *  - if it lulls in one spot, it receives an energy jolt aimed uphill
 *    (scaled to the basin's depth) and rolls out to explore again;
 *  - if jolts aren't enough, the terrain gently RISES beneath it
 *    (simulated-annealing mound) until it spills over the rim.
 * The ball rolls on the exact terrain that is rendered (base landscape +
 * cursor hills + wake + anneal mound), so cursor motion steers it too.
 */

const SCRATCH = new Float32Array(2);

const CONFIG = {
  maxSpeed: 3.4,     // world units / s
  accel: 7.2,        // responsive "light ball": quick to accelerate...
  friction: 0.034,   // ...but also coasts to a stop softly
  up: 0.9,           // light ball rolls uphill more easily
  noise: 0.05,      // tiny thermal jitter (keeps it from being pixel-still)
  lullSpeed: 0.3,    // EMA speed below this counts as "lulling"
  lullTime: 2.2,     // seconds of lull before a gentle boost
  flatKick: 2.2,     // boost strength on completely flat ground
  boostDecay: 1.9,   // boost tapers slowly → smooth, flowing escape
  maxKicks: 3,       // failed boosts before the (gentle) anneal mound rises
};

export class Optimizer {
  constructor(scene) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffb020,
      emissive: 0xff9e2c,
      emissiveIntensity: 1.6,
      roughness: 0.3,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.17, 28, 28), mat);
    scene.add(mesh);
    this.mesh = mesh;

    const light = new THREE.PointLight(0xffa94d, 10, 4.2, 2);
    scene.add(light);
    this.light = light;

    this.pos = new THREE.Vector2();
    this.vel = new THREE.Vector2();
    this.boost = new THREE.Vector2(); // smooth escape acceleration
    this.speed = 0;
    this.ema = 0;        // smoothed speed
    this.lull = 0;       // seconds of lulling (charges boosts)
    this.t = 0;          // sim clock
    this.kicks = 0;      // consecutive failed escape boosts
    this.kx = 0; this.ky = 0; // origin of the last boost
    this.annealOn = false;
    this.annealT = 0;
    this.ax = 0; this.ay = 0; // anneal mound anchor

    // one random starting spot (no respawns after this)
    const S = FIELD.SIZE;
    let x = 0, y = 0, guard = 0;
    do {
      x = (Math.random() * 2 - 1) * S * 0.8;
      y = (Math.random() * 2 - 1) * S * 0.8;
      guard++;
    } while (terrainH(x, y) > 2.6 && guard < 40);
    this.pos.set(x, y);
  }

  /** One physics step at dt. The ball is never teleported or reset. */
  step(dt) {
    const { pos, vel } = this;
    terrainGrad(pos.x, pos.y, SCRATCH);
    const fx = SCRATCH[0], fy = SCRATCH[1];

    const mag = Math.hypot(fx, fy);
    let ax = 0, ay = 0;
    if (mag > 1e-8) { ax = -fx / mag; ay = -fy / mag; }

    // moving against the slope costs extra - gives inertia & overshoot
    const sp = Math.hypot(vel.x, vel.y);
    if (sp > 1e-8) {
      const align = (vel.x * ax + vel.y * ay) / sp;
      if (align < 0) { ax *= CONFIG.up; ay *= CONFIG.up; }
    }

    vel.x += ax * CONFIG.accel * dt;
    vel.y += ay * CONFIG.accel * dt;

    // smooth escape boost (if active) - applied as acceleration so the ball
    // accelerates & coasts gently instead of jerking
    if (this.boost.x !== 0 || this.boost.y !== 0) {
      vel.x += this.boost.x * dt;
      vel.y += this.boost.y * dt;
      const bd = Math.exp(-CONFIG.boostDecay * dt);
      this.boost.x *= bd;
      this.boost.y *= bd;
      if (Math.hypot(this.boost.x, this.boost.y) < 0.02) this.boost.set(0, 0);
    }

    // tiny thermal jitter - barely perceptible, keeps it from being still
    const jit = CONFIG.noise * Math.min(1, dt * 60);
    vel.x += (Math.random() * 2 - 1) * jit;
    vel.y += (Math.random() * 2 - 1) * jit;

    const s = Math.hypot(vel.x, vel.y);
    if (s > CONFIG.maxSpeed) { vel.x *= CONFIG.maxSpeed / s; vel.y *= CONFIG.maxSpeed / s; }
    const damp = Math.exp(-CONFIG.friction * 60 * dt); // dt-corrected friction
    vel.x *= damp; vel.y *= damp;

    pos.x += vel.x * dt;
    pos.y += vel.y * dt;
    this.speed = Math.hypot(vel.x, vel.y);

    // soft containment inside the field
    const m = FIELD.SIZE - 0.45;
    if (Math.abs(pos.x) > m) pos.x = Math.sign(pos.x) * m;
    if (Math.abs(pos.y) > m) pos.y = Math.sign(pos.y) * m;

    // ---------------- exploration engine (never stops, never resets) -------
    this.t += dt;
    this.ema += (this.speed - this.ema) * Math.min(1, dt * 3);
    const lulling = this.ema < CONFIG.lullSpeed;
    this.lull = lulling ? this.lull + dt : Math.max(0, this.lull - dt * 1.5);

    if (this.annealOn) {
      // the mound is up: keep lifting until the ball has actually reached the
      // mound's flank/rim (≈2.4 units out) or we've given it long enough -
      // only then melt it back down
      this.annealT += dt;
      const dist = Math.hypot(pos.x - this.ax, pos.y - this.ay);
      if (dist > 2.4 || this.annealT > 26) {
        setAnnealTarget(this.ax, this.ay, 0);
        this.annealOn = false;
        this.kicks = 0;
      }
    } else if (lulling && this.lull > CONFIG.lullTime) {
      // did the ball come back to where the last jolt started?
      if (Math.hypot(pos.x - this.kx, pos.y - this.ky) > 2.3) this.kicks = 0;
      this.kicks++;

      if (this.kicks >= CONFIG.maxKicks) {
        // several jolts weren't enough - lift the terrain under the basin so
        // the ball spills out over the rim (simulated-annealing heat-up)
        this.ax = pos.x; this.ay = pos.y;
        setAnnealTarget(this.ax, this.ay, 1);
        this.annealOn = true;
        this.annealT = 0;
        this.kicks = 0;
      } else {
        // smooth boost aimed uphill (landscape gradient) with some spread,
        // scaled by how deep the local basin is - the boost accelerates the
        // ball over ~0.5s, so the motion stays fluid
        sample(pos.x, pos.y, SCRATCH); // base landscape gradient only
        const gm = Math.hypot(SCRATCH[0], SCRATCH[1]);
        const ang = gm > 1e-6
          ? Math.atan2(SCRATCH[1], SCRATCH[0]) + (Math.random() * 2 - 1) * 2.0
          : Math.random() * Math.PI * 2;
        const depth = Math.max(0, 0.5 - terrainH(pos.x, pos.y)); // basin depth
        const kick = CONFIG.flatKick + Math.min(1.8, depth * 1);
        // mostly a smooth accelerating boost, plus a small instant impulse -
        // enough energy to crest mid-field ridges, but still fluid motion
        this.boost.x += Math.cos(ang) * kick * 0.55;
        this.boost.y += Math.sin(ang) * kick * 0.55;
        vel.x += Math.cos(ang) * kick * 0.45;
        vel.y += Math.sin(ang) * kick * 0.45;
        this.kx = pos.x; this.ky = pos.y;
        this.lull = 0; // re-charge before judging the next boost
      }
    }
    updateAnneal(dt);
  }

  /** Keep mesh & light glued to the visible terrain. */
  sync() {
    const h = terrainH(this.pos.x, this.pos.y);
    this.mesh.position.set(this.pos.x, h + 0.07, this.pos.y);
    this.light.position.set(this.pos.x, h + 0.5, this.pos.y);
  }

  /** Live gradient magnitude the ball is feeling right now (HUD). */
  gradientMag() {
    terrainGrad(this.pos.x, this.pos.y, SCRATCH);
    return Math.hypot(SCRATCH[0], SCRATCH[1]);
  }
}
