/**
 * lossField.js — the analytic "loss landscape" f(x, y) + ∇f(x, y).
 *
 * Surface height = f(x, y) (plus an optional cursor hill), so the ball's
 * height is f(ball), its descent direction is -∇f(ball), and every quantity
 * is exact — no meshes needed.
 *
 * The field is ALIVE: call setTime(t) once per frame and the landscape
 * slowly drifts, breathes and sways — wells wander, depths pulse and the
 * whole pattern rotates back and forth — so the ball is never truly at rest.
 */

export const FIELD = {
  SIZE: 6, // field covers [-SIZE, SIZE]²
};

// --------------------------------------------------------------------------
// Landscape building blocks
// --------------------------------------------------------------------------
const WELLS = [
  [1.45, 0.65, 0.62, -1.15],  // deep basin centre-right (the "global min")
  [-1.7, 1.5, 0.80, -0.95],   // deep basin left-back
  [1.55, -1.55, 0.72, -0.85], // basin right-front
  [-2.2, -0.2, 1.00, -1.05],  // wide basin left-centre
  [3.2, -2.6, 0.85, -0.80],   // basin far right
];

// raised hills — add positive bumps so the terrain is visibly 3D/bumpy
// [cx, cy, σ, height]
const HILLS = [
  [2.6, 1.7, 0.75, 1.1],
  [-0.4, -2.5, 0.9, 1.0],
  [-3.3, 0.3, 0.7, 0.95],
  [0.3, 2.9, 0.75, 0.9],
  [-1.6, -3.6, 0.9, 0.85],
  [4.6, 0.9, 0.7, 0.9],
];

// Rolling "waves" — broad hills & dips that travel on Lissajous paths across
// the whole map, so the surface is always swelling & shifting, even when the
// cursor is paused. [x-radius, y-radius, speed1, speed2, phase1, phase2, σ, amp]
const WAVES = [
  [4.2, 3.2, 0.30, 0.24, 0.0, 1.6, 1.35, 0.55],
  [3.2, 4.8, 0.26, 0.34, 2.1, 0.4, 0.95, -0.42],
  [5.4, 2.6, 0.22, 0.28, 4.4, 3.2, 1.55, 0.6],
  [3.6, 5.2, 0.36, 0.20, 1.2, 5.0, 0.9, -0.38],
  [2.6, 4.0, 0.30, 0.31, 3.3, 2.6, 1.15, 0.48],
];

// per-wave live state (centres recomputed once per frame in setTime)
const WV = {
  x: new Float64Array(WAVES.length),
  y: new Float64Array(WAVES.length),
};

// per-well animation: wander amplitude, wander speed, phase, depth-pulse amp
// Wells wander fairly strongly and trade depth back & forth on ~1 min cycles,
// so the title of "deepest basin" migrates around the field — the optimizer
// chases it, and the ball keeps travelling instead of parking anywhere.
const WELL_ANIM = [
  [0.70, 0.085, 0.9, 0.38],
  [0.75, 0.075, 2.3, 0.42],
  [0.80, 0.090, 4.1, 0.40],
  [0.70, 0.070, 5.7, 0.44],
  [0.90, 0.095, 1.4, 0.50],
];

// --------------------------------------------------------------------------
// Time-varying state — recomputed once per frame in setTime()
// --------------------------------------------------------------------------
const ANIM = {
  on: false,
  bx: 0, by: 0,      // bowl centre drift
  ca: 1, sa: 0,      // cos/sin of the slow rotation angle
  ox: new Float64Array(WELLS.length),
  oy: new Float64Array(WELLS.length),
  am: new Float64Array(WELLS.length).fill(1),
};

let TIME = 0;

/** Advance the animation clock; cheap — called once per frame. */
export function setTime(t) {
  TIME = t;
  ANIM.on = true;
  const rot = 0.10 * Math.sin(0.038 * t);          // field sways ±5.7° slowly
  ANIM.ca = Math.cos(rot);
  ANIM.sa = Math.sin(rot);
  ANIM.bx = 0.7 * Math.sin(0.06 * t + 0.7);       // central bowl wanders
  ANIM.by = 0.7 * Math.cos(0.07 * t + 1.1);
  for (let i = 0; i < WELLS.length; i++) {
    const [aw, sp, ph, dp] = WELL_ANIM[i];
    ANIM.ox[i] = aw * Math.sin(t * sp + ph);
    ANIM.oy[i] = aw * Math.cos(t * sp * 1.31 + ph * 1.7);
    ANIM.am[i] = 1 + dp * Math.sin(t * sp * 0.9 + ph * 2.3);
  }
  // rolling waves — travel across the whole field so it never goes still
  for (let i = 0; i < WAVES.length; i++) {
    const w = WAVES[i];
    WV.x[i] = w[0] * Math.sin(t * w[2] + w[4]);
    WV.y[i] = w[1] * Math.cos(t * w[3] + w[5]);
  }
}

/**
 * Landscape value f(x, y). If `out` is provided it also receives the
 * (world-frame) gradient [gx, gy]. One pass, all exact.
 */
export function sample(x, y, out) {
  let v = 0, gx = 0, gy = 0;
  const needG = !!out;
  const M = 0.62; // mid-range squeeze, cheap anisotropy

  // rotate the whole pattern by the cached angle (no trig per vertex)
  const { ca, sa } = ANIM;
  const xr = x * ca + y * sa;
  const yr = -x * sa + y * ca;

  // central bowl — a wandering soft funnel so there's no fixed global min
  {
    const dx = xr - ANIM.bx, dy = yr - ANIM.by;
    const s2 = 7.5;
    const e = Math.exp(-(dx * dx + dy * dy) / s2);
    v += 0.36 * e;
    if (needG) { const k = (-2 * 0.36 * e) / s2; gx += k * dx; gy += k * dy; }
  }

  // gentle valley (soft parabolas) + Gaussian etchings for texture
  {
    const s2 = 0.70, s2s = 0.30;
    const xm = xr - M, ym = yr - M;
    const e1 = Math.exp(-((xr - 1.5) ** 2 + (yr + 1.2) ** 2) / s2s);
    const e2 = Math.exp(-((xr + 1.6) ** 2 + (yr - 1.5) ** 2) / s2s);
    const e3 = Math.exp(-((xr - 1.5) ** 2 + (yr - 0.7) ** 2) / s2);
    v += 0.25 * (xm * xm * (0.16 + xm * xm * 0.0006) + ym * ym * (0.22 + ym * ym * 0.0005))
       - 0.45 * e1 - 0.50 * e2 - 0.18 * e3;
    if (needG) {
      gx += 0.25 * xm * (2 * 0.16 + 4 * xm * xm * 0.0006)
          + 0.45 * (2 * (xr - 1.5) / s2s) * e1
          + 0.50 * (2 * (xr + 1.6) / s2s) * e2
          + 0.18 * (2 * (xr - 1.5) / s2) * e3;
      gy += 0.25 * ym * (2 * 0.22 + 4 * ym * ym * 0.0005)
          + 0.45 * (2 * (yr + 1.2) / s2s) * e1
          + 0.50 * (2 * (yr - 1.5) / s2s) * e2
          + 0.18 * (2 * (yr - 0.7) / s2) * e3;
    }
  }

  // ridge: raised plateau separating the deep basins near the right side
  {
    const s2 = 0.22, b = 0.030, c = -0.88;
    const sx = Math.exp(-((xr - 3.2) ** 2) / s2);
    const sy1 = Math.exp(-((yr + 1.1) ** 2) / s2);
    const sy2 = Math.exp(-((yr - 1.6) ** 2) / s2);
    const k = 4.5 * b * (1 - Math.exp(c * (sx + sy1 + sy2)));
    v += k;
    if (needG) {
      const j = 4.5 * b * Math.exp(c * (sx + sy1 + sy2)) * (-c);
      gx += j * (-2 * (xr - 3.2) / s2) * sx;
      gy += j * (-2 * (yr + 1.1) / s2 * sy1 - 2 * (yr - 1.6) / s2 * sy2);
    }
  }

  // local minima — drifting + breathing, so resting spots never stay put
  for (let i = 0; i < WELLS.length; i++) {
    const cx = WELLS[i][0] + ANIM.ox[i];
    const cy = WELLS[i][1] + ANIM.oy[i];
    const s2 = WELLS[i][2] * WELLS[i][2];
    const amp = WELLS[i][3] * ANIM.am[i];
    const e = Math.exp(-((xr - cx) ** 2 + (yr - cy) ** 2) / s2);
    v += amp * e;
    if (needG) { const k = (-2 * amp * e) / s2; gx += k * (xr - cx); gy += k * (yr - cy); }
  }

  // raised hills (positive, stationary-ish texture for the "bumpy" look)
  for (let i = 0; i < HILLS.length; i++) {
    const [cx, cy, s, amp] = HILLS[i];
    const s2 = s * s;
    const e = Math.exp(-((xr - cx) ** 2 + (yr - cy) ** 2) / s2);
    v += amp * e;
    if (needG) { const k = (-2 * amp * e) / s2; gx += k * (xr - cx); gy += k * (yr - cy); }
  }

  // rolling waves — travelling swell & troughs that keep the whole surface
  // in motion even while the cursor is paused
  for (let i = 0; i < WAVES.length; i++) {
    const w = WAVES[i];
    const dx = xr - WV.x[i], dy = yr - WV.y[i];
    const s2 = w[6] * w[6];
    const e = Math.exp(-(dx * dx + dy * dy) / s2);
    const amp = w[7];
    v += amp * e;
    if (needG) { const k = (-2 * amp * e) / s2; gx += k * dx; gy += k * dy; }
  }

  if (needG) {
    // chain rule back into world frame (we sampled in rotated coordinates)
    const Fx = gx, Fy = gy;
    out[0] = Fx * ca - Fy * sa;
    out[1] = Fx * sa + Fy * ca;
  }
  return v;
}

// --------------------------------------------------------------------------
// Cursor deformation: a Gaussian hill dragged across the terrain.
// It bends the visible mesh AND (via cursorGrad) the terrain the ball rolls
// on — while the cursor moves, the landscape is always changing, and the
// ball is steered by it.
// --------------------------------------------------------------------------
export const CURSOR = {
  targetX: 0, targetY: 0,   // raw pointer in world space
  x: 0, y: 0,               // smoothed hill position (follows target)
  amp: 0,                   // smoothed amplitude 0..1
  band: 0.85,               // vertical extent of the full hill
  width2: 0.55,             // squared hill radius
  active: false,
};

const FOLLOW = 0.17;
const SWELL = 0.05;

export function updateCursor(tx, ty, on) {
  if (!on) {
    // pointer gone → let the hill melt away instead of vanishing
    CURSOR.amp *= 0.8;
    CURSOR.active = CURSOR.amp > 0.02;
    return;
  }
  CURSOR.targetX = tx; CURSOR.targetY = ty;
  CURSOR.x += (tx - CURSOR.x) * FOLLOW;
  CURSOR.y += (ty - CURSOR.y) * FOLLOW;
  CURSOR.amp += (1 - CURSOR.amp) * SWELL;
  CURSOR.active = true;
}

/** Height added by the cursor hill (world frame). */
export function cursorH(x, y) {
  if (!CURSOR.active || CURSOR.amp < 0.02) return 0;
  const dx = x - CURSOR.x, dy = y - CURSOR.y;
  return CURSOR.amp * CURSOR.band * Math.exp(-(dx * dx + dy * dy) / CURSOR.width2);
}

/** Gradient of the cursor hill (world frame) — added to the ball's descent. */
export function cursorGrad(x, y, out) {
  out[0] = 0; out[1] = 0;
  if (!CURSOR.active || CURSOR.amp < 0.02) return out;
  const dx = x - CURSOR.x, dy = y - CURSOR.y;
  const k = (-2 * CURSOR.amp * CURSOR.band) / CURSOR.width2
            * Math.exp(-(dx * dx + dy * dy) / CURSOR.width2);
  out[0] = k * dx; out[1] = k * dy;
  return out;
}

// --------------------------------------------------------------------------
// Cursor WAKE — while the pointer moves it doesn't just drag one hill, it
// deposits a fading string of small hills along its path, so the terrain
// visibly "fills in" under motion and slowly settles back when you pause.
// --------------------------------------------------------------------------
const WAKE = {
  spacing: 0.55,      // min world distance between deposits
  count: 0,
  list: [],           // {x, y, t} — t is age in seconds
  band: 0.5,          // full height of a fresh deposit
  width2: 0.45,       // squared radius
  max: 7,
  cut2: 3.2,          // r² beyond which a deposit's influence is negligible
};

/** Age deposits & drop the fully-faded ones; call every frame. */
export function updateWake(dt) {
  const list = WAKE.list;
  for (let i = list.length - 1; i >= 0; i--) {
    list[i].t += dt;
    if (list[i].t > 6.5) { list.splice(i, 1); WAKE.count--; }
  }
}

/** Deposit envelope: 0 → 1 over ~0.7 s, hold, then melt back by t ≈ 6 s. */
function wakeAmp(d) {
  if (d.t < 0.7) return d.t / 0.7;                       // rise smoothly
  if (d.t < 3.6) return 1;                               // hold
  return Math.max(0, 1 - (d.t - 3.6) / 2.6);             // melt away
}

/** Called from updateCursor: drop a deposit whenever the hill has travelled. */
function tryDeposit() {
  const list = WAKE.list;
  if (!CURSOR.active || CURSOR.amp < 0.3) return;
  const last = list.length ? list[list.length - 1] : null;
  if (last) {
    const dx = CURSOR.x - last.x, dy = CURSOR.y - last.y;
    if (dx * dx + dy * dy < WAKE.spacing * WAKE.spacing) return;
  }
  list.push({ x: CURSOR.x, y: CURSOR.y, t: 0 });
  WAKE.count++;
  if (list.length > WAKE.max) { list.shift(); WAKE.count--; }
}

/** Height added by all wake deposits (spatially pruned — cheap far away). */
export function wakeH(x, y) {
  const list = WAKE.list;
  let h = 0;
  for (let i = 0; i < list.length; i++) {
    const d = list[i];
    const a = wakeAmp(d);
    if (a <= 0.01) continue;
    const dx = x - d.x, dy = y - d.y;
    const r2 = dx * dx + dy * dy;
    if (r2 > WAKE.cut2) continue;
    h += a * WAKE.band * Math.exp(-r2 / WAKE.width2);
  }
  return h;
}

/** Gradient of the wake (scaled by each deposit's envelope). */
export function wakeGrad(x, y, out) {
  out[0] = 0; out[1] = 0;
  const list = WAKE.list;
  for (let i = 0; i < list.length; i++) {
    const d = list[i];
    const a = wakeAmp(d);
    if (a <= 0.01) continue;
    const dx = x - d.x, dy = y - d.y;
    const r2 = dx * dx + dy * dy;
    if (r2 > WAKE.cut2) continue;
    const k = (-2 * a * WAKE.band) / WAKE.width2 * Math.exp(-r2 / WAKE.width2);
    out[0] += k * dx; out[1] += k * dy;
  }
  return out;
}

// --------------------------------------------------------------------------
// Annealing mound — when the ball has been lulling in a basin too long, the
// terrain gently RISES beneath it (like simulated annealing "heating up" the
// landscape) until the ball spills out over the rim and rolls away. No
// teleports, no resets — just terrain that reacts to the optimizer.
// --------------------------------------------------------------------------
export const ANNEAL = {
  x: 0, y: 0,
  amp: 0,        // current lift height
  target: 0,     // where amp is heading
  band: 1.05,    // full lift height — kept gentle so the ball never looks
                 // "heavy" or carves dramatic bumps out of the terrain
  width2: 7.5,   // squared radius (σ² of the mound)
};

/** Ask the mound to grow (target=1) or melt away (target=0) at (x, y). */
export function setAnnealTarget(x, y, target) {
  ANNEAL.x = x; ANNEAL.y = y;
  ANNEAL.target = target > 1 ? 1 : target < 0 ? 0 : target;
}

/** Smoothly move amp toward its target; call every frame. */
export function updateAnneal(dt) {
  const a = ANNEAL;
  const full = a.band * a.target;
  if (a.amp < full) a.amp = Math.min(full, a.amp + dt * 0.5);  // rise gently
  else a.amp = Math.max(full, a.amp - dt * 2.2);                // fall faster
}

/** Height added by the annealing mound. */
export function annealH(x, y) {
  if (ANNEAL.amp < 0.02) return 0;
  const dx = x - ANNEAL.x, dy = y - ANNEAL.y;
  return ANNEAL.amp * Math.exp(-(dx * dx + dy * dy) / ANNEAL.width2);
}

/** Gradient of the annealing mound. */
export function annealGrad(x, y, out) {
  out[0] = 0; out[1] = 0;
  if (ANNEAL.amp < 0.02) return out;
  const dx = x - ANNEAL.x, dy = y - ANNEAL.y;
  const k = (-2 * ANNEAL.amp) / ANNEAL.width2
            * Math.exp(-(dx * dx + dy * dy) / ANNEAL.width2);
  out[0] = k * dx; out[1] = k * dy;
  return out;
}

// --------------------------------------------------------------------------
// THE TERRAIN THE BALL SEES = base landscape + cursor hill + anneal mound.
// Everything visible (mesh heights, normals, ball position, HUD numbers)
// agrees with these two functions — one source of truth.
// --------------------------------------------------------------------------
const _hG = new Float32Array(2);
const _cG = new Float32Array(2);
const _aG = new Float32Array(2);
const _wG = new Float32Array(2);

/** Total terrain height at (x, y) — landscape + cursor hill + wake + anneal. */
export function terrainH(x, y) {
  return sample(x, y, null) + cursorH(x, y) + wakeH(x, y) + annealH(x, y);
}

/** Total terrain gradient — everything the ball rolls on. */
export function terrainGrad(x, y, out) {
  sample(x, y, out);
  cursorGrad(x, y, _cG);
  wakeGrad(x, y, _wG);
  annealGrad(x, y, _aG);
  out[0] += _cG[0] + _wG[0] + _aG[0];
  out[1] += _cG[1] + _wG[1] + _aG[1];
  return out;
}

/** Called with the pointer state every frame (drives wake deposition). */
export function updateCursorAndWake(tx, ty, on, dt) {
  updateCursor(tx, ty, on);
  if (on) {
    tryDeposit();
    updateWake(dt);
  } else {
    updateWake(dt);
  }
}

