/**
 * carrier.js — the "end of the page" rescue vignette.
 *
 * When the ball falls off the terrain it lands at the bottom of the page,
 * ON THE SAME SCREEN AXIS it fell from (the world fall position is projected
 * through the camera). Then a kinesin — drawn as a realistic little motor
 * protein, the way the classic animations show it — walks in along the page
 * edge: two big globular heads alternate hand-over-hand on a tubulin track,
 * a neck-linker/stalk trails behind, and it carries the fallen ball away.
 *
 * The kinesin is drawn procedurally on a canvas with a true hand-over-hand
 * gait (each head plants on the track, holds perfectly still in world space
 * while the other swings over it, then the body advances by one step), so
 * the feet never slide — it actually walks.
 */

const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// gait geometry (canvas px)
const D = {
  step: 38,       // distance the body advances per half-cycle
  halfT: 0.26,    // seconds per half-cycle (one head step) — brisk walk
  headY: 96,      // docked head centre y
  R: 16.5,        // head radius
  lift: 24,       // how high a swinging head arcs
  trackY: 120,    // microtubule centre y
};

export function createCarrier() {
  const stage = $('#stage');
  const fball = $('#fball');
  const canvas = $('#kinCanvas');
  const ctx = canvas.getContext('2d');

  const reduced =
    window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  let playing = false;
  let raf = 0;
  let timers = [];
  let doneCb = null;

  // creature state
  let mode = 'idle';   // idle | approach | hold | exit
  let carry = false;   // holding the golden ball
  let m = 0;           // gait cycles elapsed (float)
  let X0 = -160;       // gait origin (rear-slot x at cycle 0)
  let ballX = 0;       // where the ball landed (page px)
  let cargoX = 0;      // smoothed cargo position
  let cargoPop = 0;    // 0→1 pop-in of the carried ball
  let holdT = 0;
  let last = 0;
  let now = 0;

  // ---------------------------------------------------------------- helpers
  function clearTimers() {
    timers.forEach((t) => clearTimeout(t));
    timers = [];
  }
  function after(ms, fn) {
    timers.push(setTimeout(fn, ms));
  }
  function reset() {
    stage.classList.remove('on');
    fball.classList.remove('scoop');
    mode = 'idle';
    carry = false;
    cargoPop = 0;
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    void stage.offsetWidth;
  }
  function stopLoop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  /** Renderer sizing (full width, 130 css px tall). */
  function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(130 * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ------------------------------------------------------------ the drawing
  function themeColors() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return dark
      ? {
          bead1: '#4a68b8', bead2: '#5d7ccb', beadLine: '#334e93',
          headHi: '#ffb1d4', headLo: '#c2185b', headLine: 'rgba(255,190,220,0.55)',
          headGlow: 'rgba(255,120,175,0.55)',
          stalk: '#ff8fbe', linker: '#ffa8cd',
          claw: '#ff7fb2',
        }
      : {
          bead1: '#8ea6de', bead2: '#a7bceb', beadLine: '#647fc0',
          headHi: '#ffb3d2', headLo: '#d6336c', headLine: 'rgba(170,45,95,0.4)',
          headGlow: 'rgba(214,51,108,0.35)',
          stalk: '#e2749f', linker: '#f08bb3',
          claw: '#e76a9e',
        };
  }

  function sphere(x, y, r, hi, lo, glowColor, glow) {
    ctx.save();
    if (glowColor && glow > 0) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = glow;
    }
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.42, r * 0.12, x, y, r);
    g.addColorStop(0, hi);
    g.addColorStop(1, lo);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawTrack(dark) {
    const c = themeColors();
    ctx.save();
    for (let x = -12; x < innerWidth + 20; x += 19) {
      sphere(x, D.trackY - 6, 8, c.bead2, c.bead1, null, 0);
      sphere(x + 9.5, D.trackY + 5, 8, c.bead2, c.bead1, null, 0);
    }
    ctx.restore();
  }

  function drawCreature() {
    const c = themeColors();
    const t = now;

    // ---- gait: which head swings depends on the parity of the half-cycle
    const k = Math.floor(m);
    const u = m - k;
    const base = X0 + D.step * k;           // rear slot position this half
    const sw = smooth(0.04, 0.58, u);       // swing progress 0..1
    const jump = smooth(0.5, 0.64, u);      // body lurch at landing
    const bodyX = X0 + D.step * (k + jump);

    let hA, hB;
    if (k % 2 === 0) {
      // head A (rear) swings forward over head B
      hA = { x: base + 2 * D.step * sw, y: D.headY - D.lift * Math.sin(Math.PI * sw), swing: sw < 1 };
      hB = { x: base + D.step, y: D.headY, swing: false };
    } else {
      hB = { x: base + 2 * D.step * sw, y: D.headY - D.lift * Math.sin(Math.PI * sw), swing: sw < 1 };
      hA = { x: base + D.step, y: D.headY, swing: false };
    }
    const front = Math.max(hA.x, hB.x);
    const midX = (hA.x + hB.x) / 2;

    // ---- cargo position (trails behind, springy so the stalk feels alive)
    const cargoTarget = bodyX - 52;
    if (mode !== 'hold') cargoX += (cargoTarget - cargoX) * Math.min(1, 0.22);
    else cargoX += (ballX - cargoX) * Math.min(1, 0.5); // seat onto the ball
    const bob = Math.sin(t * 5.2) * 1.4;
    const cargoY = D.headY + bob; // same height as the fallen DOM ball

    // ---- stalk & neck linkers
    ctx.save();
    ctx.lineCap = 'round';
    // neck linkers from the top of each head
    ctx.strokeStyle = c.linker;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hA.x, hA.y - D.R * 0.7);
    ctx.quadraticCurveTo(hA.x + 8, hA.y - D.R - 12, midX + 14, D.headY - D.R - 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hB.x, hB.y - D.R * 0.7);
    ctx.quadraticCurveTo(hB.x + 8, hB.y - D.R - 12, midX + 14, D.headY - D.R - 6);
    ctx.stroke();
    // coiled-coil stalk from the join back to the cargo
    ctx.strokeStyle = c.stalk;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(midX + 16, D.headY - D.R - 4);
    ctx.quadraticCurveTo((midX + cargoX) / 2, D.headY - D.R - 26, cargoX + 6, cargoY - 6);
    ctx.stroke();
    // faint second strand (the coiled-coil look)
    ctx.strokeStyle = c.linker;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(midX + 14, D.headY - D.R);
    ctx.quadraticCurveTo((midX + cargoX) / 2, D.headY - D.R - 19, cargoX + 4, cargoY - 8);
    ctx.stroke();
    ctx.restore();

    // ---- heads (molecular motor domains)
    const glow = themeColors().headGlow;
    const glowA = document.documentElement.getAttribute('data-theme') === 'dark' ? 16 : 9;
    sphere(hB.x, hB.y, D.R, c.headHi, c.headLo, glow, hB.swing ? 0 : glowA);
    sphere(hA.x, hA.y, D.R, c.headHi, c.headLo, glow, hA.swing ? 0 : glowA);
    // docking "feet": little contact nubs where planted heads touch the track
    ctx.fillStyle = c.headLine;
    for (const h of [hA, hB]) {
      if (!h.swing) {
        ctx.beginPath();
        ctx.ellipse(h.x, h.y + D.R - 3.5, 7, 3.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ---- cargo
    if (carry) {
      // ease-out-back pop-in of the carried golden ball
      const p = cargoPop;
      const c1 = 1.70158, c3 = c1 + 1;
      const s = Math.max(0.01, 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2));
      sphere(cargoX, cargoY, 12.5 * s, '#fff3c4', '#f0a01c', 'rgba(255,200,90,0.9)', 18);
    } else {
      // empty stalk end: two small "fingers"
      ctx.fillStyle = c.claw;
      ctx.beginPath();
      ctx.arc(cargoX - 4, cargoY + 2, 4.2, 0, Math.PI * 2);
      ctx.arc(cargoX + 5, cargoY + 1, 4.2, 0, Math.PI * 2);
      ctx.fill();
    }
    void front;
  }

  // ------------------------------------------------------------------ loop
  function frame(ts) {
    if (!playing) return;
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    now = ts / 1000;
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';

    // walk only while the creature is on the move
    if (mode === 'approach' || mode === 'exit') m += dt / D.halfT;

    if (mode === 'approach') {
      // reached the ball? begin the pickup hold
      if (cargoX >= ballX - 3) {
        // if a head is mid-swing, finish the step first so the kinesin
        // holds a nice planted pose while it picks the ball up
        const u = m - Math.floor(m);
        if (u > 0.04 && u < 0.58) m = Math.floor(m) + 0.99;
        mode = 'hold';
        holdT = 0;
        carry = true;                 // golden ball now rides the stalk
        fball.classList.add('scoop'); // …as the fallen DOM ball hops away
      }
    } else if (mode === 'hold') {
      holdT += dt;
      cargoPop = Math.min(1, cargoPop + dt / 0.35);
      if (holdT > 1.05) mode = 'exit';
    } else if (mode === 'exit') {
      // head region fully off the right edge → done
      const frontX = X0 + D.step * (m + 1) + D.step;
      if (frontX > innerWidth + 110) {
        finish();
        // Do not redraw the cleared canvas or queue another frame after reset.
        return;
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTrack(dark);
    drawCreature();

    raf = requestAnimationFrame(frame);
  }

  function finish() {
    playing = false;
    stopLoop();
    clearTimers();
    reset();
    const cb = doneCb;
    doneCb = null;
    if (cb) cb();
  }

  // ------------------------------------------------------------------ play
  /**
   * @param done  called once the kinesin has carried the ball off the page
   * @param ndcX  NDC x (-1..1) of the world position where the ball fell —
   *              used to land the ball on the same screen axis it fell from
   */
  function play(done, ndcX) {
    if (playing) return;
    doneCb = done || null;

    if (reduced) {
      after(140, () => finish());
      return;
    }

    playing = true;
    clearTimers();
    reset();
    sizeCanvas();

    ballX = clamp((((ndcX ?? 0) * 0.5 + 0.5) * innerWidth) || innerWidth * 0.5,
      150, innerWidth - 150);
    // cargo slot rides at bodyX - 52; nothing else to precompute

    // place the falling ball on that axis & drop it in
    fball.style.left = `${ballX}px`;
    stage.classList.add('on'); // rail + drop & bounce

    // gait state for the approach walk
    X0 = -180 - D.step;
    m = 0;
    cargoX = X0 - 30;
    cargoPop = 0;
    carry = false;

    last = performance.now();
    raf = requestAnimationFrame(frame);

    // a short beat for the ball's bounce before the kinesin starts in
    after(1000, () => { mode = 'approach'; });
  }

  return { play };
}
