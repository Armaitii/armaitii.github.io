import * as THREE from 'three';
import { terrainH, terrainGrad, updateCursorAndWake, setTime } from './lossField';
import { CAM, THEMES, WORLD } from './constants';
import { Surface } from './surface';
import { Optimizer } from './optimizer';
import { Dust } from './dust';
import { createPointer } from './pointer';

/**
 * world.js — owns the renderer/scene and runs the whole show each frame.
 *
 * Ball state machine:
 *   'roll'     — gradient descent on the terrain as usual
 *   'fall'     — only after rolling over an actual grid edge: gravity takes
 *                over with the ball's existing momentum (no timer/ejection)
 *   'grounded' — fell out of the scene (hidden); the kinesin "rescue" runs
 *                in the DOM overlay (carrier.js)…
 *   'return'   — …and the ball pops back onto the surface (scale-pop + ring)
 */
export class World {
  /**
   * @param canvas  <canvas> element
   * @param cb      { onFrame(...), onLanded() }
   * @param theme   'light' | 'dark'
   */
  constructor(canvas, cb = {}, theme = 'light') {
    this.cb = cb;
    const renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, powerPreference: 'high-performance',
    });
    renderer.toneMapping = THREE.NoToneMapping;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;

    this.hemi = new THREE.HemisphereLight();
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight();
    this.sun.position.set(6, 15, 9);
    scene.add(this.sun);
    this.fill = new THREE.DirectionalLight();
    this.fill.position.set(-8, 5, -10);
    scene.add(this.fill);

    const camera = new THREE.PerspectiveCamera(CAM.fov, 1, 0.1, 150);
    camera.position.set(CAM.base.x, CAM.base.y, CAM.base.z);
    camera.lookAt(0, 0, 0);
    this.camera = camera;

    // actors
    this.surface = new Surface(scene, theme);
    this.optimizer = new Optimizer(scene);
    this.dust = new Dust(scene, theme);
    this.pointer = createPointer(() => this.camera, () => ({ w: innerWidth, h: innerHeight }));

    // respawn ring (one reusable mesh)
    const ringGeo = new THREE.RingGeometry(0.72, 1.0, 48);
    this.ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      color: 0xffc46a,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    scene.add(this.ring);
    this.ringT = 1;

    // ball phase state
    this.phase = 'roll';
    this.groundedCleaned = true;
    this.fallV = new THREE.Vector3();
    this._projV = new THREE.Vector3();
    this._edgeGrad = new Float32Array(2);
    this.fallNdcX = 0.5;   // screen axis of the fall (for the landing spot)
    this.returnT = 0;
    this.lastFrame = { loss: 0, speed: 0, grad: 0 };

    this.clock = new THREE.Clock();
    this.time = 0;
    this.theme = theme;
    this.applyTheme(theme);

    this._onResize();
    window.addEventListener('resize', (this._onResize = this._onResize.bind(this)));
    this._raf = requestAnimationFrame(() => this._tick());
  }

  applyTheme(name) {
    const T = THEMES[name];
    if (!T) return;
    this.theme = name;
    this.renderer.setClearColor(T.clear, 1);
    this.scene.fog = new THREE.FogExp2(T.clear, T.fogDensity);
    this.surface.setTheme(name);
    this.dust.setTheme(name);
    this.hemi.color.setHex(T.hemi.sky);
    this.hemi.groundColor.setHex(T.hemi.ground);
    this.hemi.intensity = T.hemi.intensity;
    this.sun.color.setHex(T.sun.color);
    this.sun.intensity = T.sun.intensity;
    this.fill.color.setHex(T.fill.color);
    this.fill.intensity = T.fill.intensity;
  }

  _onResize() {
    const w = innerWidth, h = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.dust?.resize(h, dpr);
  }

  // -------------------------------------------------------------------------
  // Ball lifecycle
  // -------------------------------------------------------------------------

  /** Lose support only when the ball actually crosses the visible grid rim. */
  _maybeTriggerFall() {
    if (this.phase !== 'roll') return false;
    const o = this.optimizer;
    const { x, y: z } = o.pos;
    const S = WORLD.SIZE;
    if (Math.abs(x) <= S && Math.abs(z) <= S) return false;

    // Sample the last supported edge, not an invisible extension of the
    // terrain. Preserve the rolling velocity instead of adding a launch kick.
    const edgeX = THREE.MathUtils.clamp(x, -S, S);
    const edgeZ = THREE.MathUtils.clamp(z, -S, S);
    terrainGrad(edgeX, edgeZ, this._edgeGrad);
    const verticalV = this._edgeGrad[0] * o.vel.x + this._edgeGrad[1] * o.vel.y;
    this.fallX = x;
    this.fallZ = z;
    this.fallY = terrainH(edgeX, edgeZ) + 0.07;
    this.fallV.set(o.vel.x, THREE.MathUtils.clamp(verticalV, -4, 4), o.vel.y);
    o.mesh.position.set(this.fallX, this.fallY, this.fallZ);
    o.light.position.set(this.fallX, this.fallY + 0.5, this.fallZ);
    this.groundedCleaned = false;
    this.phase = 'fall';
    return true;
  }

  _stepFall(dt) {
    this.fallV.x *= Math.exp(-0.35 * dt);
    this.fallV.z *= Math.exp(-0.35 * dt);
    this.fallX += this.fallV.x * dt;
    this.fallZ += this.fallV.z * dt;
    this.fallV.y -= 13 * dt; // gravity
    this.fallY += this.fallV.y * dt;
    const m = this.optimizer.mesh;
    m.position.set(this.fallX, this.fallY, this.fallZ);
    m.rotation.x += 7 * dt; // tumbles as it falls
    m.rotation.z += 4.5 * dt;
    this.optimizer.light.position.set(this.fallX, this.fallY + 0.5, this.fallZ);

    // track the screen axis the ball is falling along (camera projection),
    // so the "end of the page" landing matches where it left the surface
    this._projV.set(this.fallX, this.fallY, this.fallZ).project(this.camera);
    this.fallNdcX = this._projV.x;

    if (this.fallY < -2.6) {
      this.phase = 'grounded';
      m.visible = false;
      this.optimizer.light.visible = false;
      this.cb.onLanded?.(this.fallNdcX);
    }
  }

  /** Called by the kinesin choreography once the ball has been carried off. */
  returnBall() {
    if (this.phase !== 'grounded') return;
    const o = this.optimizer;
    // fresh interior spot with reasonably low terrain
    let x = 0, y = 0, tries = 0;
    do {
      const a = Math.random() * Math.PI * 2;
      const r = 0.6 + Math.random() * 2.6;
      x = Math.cos(a) * r;
      y = Math.sin(a) * r;
      tries++;
    } while ((terrainH(x, y) > 1.7 || Math.hypot(x, y) < 0.4) && tries < 40);

    o.pos.set(x, y);
    o.vel.set(0, 0);
    o.boost.set(0, 0);
    o.speed = 0;
    o.ema = 0;

    const h = terrainH(x, y);
    const m = o.mesh;
    m.visible = true;
    m.rotation.set(0, 0, 0);
    m.position.set(x, h + 0.07, y);
    o.light.visible = true;
    o.light.position.set(x, h + 0.5, y);

    this.phase = 'return';
    this.returnT = 0;
    this._spawnRing(x, h + 0.05, y);
  }

  _spawnRing(x, y, z) {
    this.ring.position.set(x, y, z);
    this.ring.visible = true;
    this.ringT = 0;
    this.ring.material.opacity = 0.6;
  }

  _stepReturn(dt) {
    this.returnT += dt;
    const k = Math.min(1, this.returnT / 0.5);
    // overshoot pop (easeOutBack-ish)
    const s = 1 + 1.35 * Math.pow(k - 1, 3) + 0.35 * Math.pow(k - 1, 2);
    this.optimizer.mesh.scale.setScalar(Math.max(0.001, s));
    if (k >= 1) {
      this.optimizer.mesh.scale.setScalar(1);
      this.phase = 'roll';
    }
  }

  // -------------------------------------------------------------------------
  // Frame
  // -------------------------------------------------------------------------
  _tick() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt;
    const S = WORLD.SIZE;

    setTime(this.time);

    const ptr = this.pointer;
    const hit = ptr.solve();
    const half = S - 0.35;
    const wx = Math.max(-half, Math.min(half, ptr.wx));
    const wz = Math.max(-half, Math.min(half, ptr.wz));
    updateCursorAndWake(wx, wz, ptr.on && hit, dt);

    // camera: parallax + gentle idle sway (keeps drifting during events)
    const pdx = ptr.ndcX, pdy = ptr.ndcY;
    const k = 0.045;
    const sway = CAM.sway;
    const tx = CAM.base.x + pdx * CAM.parallax.x + Math.sin(this.time * 0.052) * sway.x;
    const ty = CAM.base.y + Math.sin(this.time * 0.041 + 1.3) * sway.y;
    const tz = CAM.base.z + pdy * CAM.parallax.x * 0.6 + Math.cos(this.time * 0.037) * sway.z;
    this.camera.position.x += (tx - this.camera.position.x) * k;
    this.camera.position.y += (ty - this.camera.position.y) * k;
    this.camera.position.z += (tz - this.camera.position.z) * k;
    this.camera.lookAt(0, -0.1, 0);

    // terrain always morphs (waves + cursor), whatever the ball is doing
    this.surface.update();

    const o = this.optimizer;
    switch (this.phase) {
      case 'roll': {
        o.step(dt);
        if (!this._maybeTriggerFall()) o.sync();
        const bp = o.mesh.position;
        this.dust.update(dt, bp.x, bp.y, bp.z, o.vel.x, o.vel.y, o.speed);
        this.lastFrame = {
          loss: terrainH(o.pos.x, o.pos.y),
          speed: o.speed,
          grad: o.gradientMag(),
        };
        break;
      }
      case 'fall': {
        this._stepFall(dt);
        // a sparkling trail follows the ball as it plummets
        const sp = Math.min(4, Math.hypot(this.fallV.x, this.fallV.z) + Math.abs(this.fallV.y) * 0.4);
        this.dust.update(dt, this.fallX, this.fallY, this.fallZ, this.fallV.x, this.fallV.z, sp);
        this.groundedCleaned = false;
        this.lastFrame = { loss: 0, speed: 0, grad: 0 };
        break;
      }
      case 'grounded': {
        // waiting for the kinesin rescue (DOM overlay) — terrain keeps moving
        if (!this.groundedCleaned) {
          this.dust.killAll();
          this.groundedCleaned = true;
        }
        this.lastFrame = { loss: 0, speed: 0, grad: 0 };
        break;
      }
      case 'return': {
        this._stepReturn(dt);
        this.lastFrame = { loss: terrainH(o.pos.x, o.pos.y), speed: 0, grad: 0 };
        break;
      }
    }

    // respawn ring fade
    if (this.ringT < 1) {
      this.ringT += dt / 0.9;
      const t = Math.min(1, this.ringT);
      this.ring.material.opacity = 0.6 * (1 - t);
      this.ring.scale.setScalar(0.5 + t * 3.2);
      if (t >= 1) this.ring.visible = false;
    }

    // ball glow breathes when rolling
    if (this.phase === 'roll') {
      o.mesh.material.emissiveIntensity = 1.5 + Math.sin(this.time * 1.7) * 0.2;
    }

    this.renderer.render(this.scene, this.camera);
    this.cb.onFrame?.(this.lastFrame);
    this._raf = requestAnimationFrame(() => this._tick());
  }

  stop() { cancelAnimationFrame(this._raf); }
}
