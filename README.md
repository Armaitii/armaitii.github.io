# Loss Landscape Portfolio

A personal portfolio site with an interactive **gradient-descent / loss-landscape**
background: a glowing ball performs gradient descent on a bumpy **wireframe
grid surface** that slowly drifts and breathes — and **your cursor reshapes the
terrain in real time**, leaving a smooth wake of hills behind it.

Every so often the ball is "led out" over the rim of the surface, plummets to
the bottom of the page… and a cute cartoon **kinesin** (the walking motor
protein) trots in along the page edge, scoops the fallen ball up as cargo and
carries it away — after which the ball pops right back onto the landscape.

Light theme by default, dark theme available (toggle in the nav — it rethemes
both the page and the live WebGL scene). Vanilla JS + [three.js](https://threejs.org)
+ [Vite](https://vitejs.dev) · deployed to GitHub Pages via Actions.

## What you're watching

- **The terrain is one analytic function** `f(x, y)` (see `lossField.js`): a
  wandering bowl, drifting/breathing Gaussian wells, a soft valley and etched
  dips. Heights *and* exact gradients are computed every frame — no meshes.
- **The whole field is alive**: wells wander and trade depth back and forth on
  ~1-minute cycles, so the title of "deepest basin" migrates across the map —
  there is no fixed place to rest.
- **The ball never stops and never "finds" a minimum**: it's continuous
  gradient descent with momentum, friction and thermal noise. When it lulls in
  a basin it gets an uphill energy jolt; if jolts fail, the terrain gently
  **rises beneath it** (simulated-annealing style) until it spills over the rim
  and rolls off to the next basin. No teleports, no resets, no messages.
- **Your cursor adds hills**: a main hill that follows the pointer smoothly,
  plus a fading **wake** of small hills deposited along its path. All of it is
  part of the terrain the ball rolls on, so your motion steers the optimizer.
- **The surface never sleeps**: broad swell-like **waves** roll across the map
  even when the cursor is idle, so the landscape is always undulating.
- The surface is drawn as a **grid**: a semi-transparent mesh colored by
  height (soft pastel palette in light mode, vivid plasma in dark) under a
  wireframe of grid lines sharing the same vertices.
- Behind the ball streams **magical dust** — tiny GPU specks that drift,
  twinkle and fade — instead of a solid ribbon.
- HUD shows live `loss · ‖∇L‖ · speed` — purely numeric, no "minima found".

## Files

```
index.html                      page: 3D background + content + theme toggle
src/content.js   ← EDIT         all your personal info & projects
src/style.css                   light/dark themes via html[data-theme], layout
src/main.js                     content injection, theme controller, boot
src/world/lossField.js          f(x,y) + ∇f + cursor hills/wake + waves + anneal
src/world/surface.js            grid mesh + wireframe: heights/normals/colors
src/world/optimizer.js          the ball: light momentum GD + boosts + anneal
src/world/dust.js               magical dust particle trail behind the ball
src/world/pointer.js            mouse/touch → terrain intersection
src/world/world.js              renderer, lights, camera drift, animation loop
src/world/constants.js          sizes, camera, light/dark 3D palettes
.github/workflows/deploy.yml    auto build & publish to Pages
```

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site → dist/
```

## Make it yours

1. Edit **`src/content.js`** — name, about, links, projects, skills (every
   `yourusername` / `Your Name` placeholder flows from this one file).
2. Optional: drop `resume.pdf` in `public/` and set `resume: 'resume.pdf'`.
3. Push to your `username.github.io` repository → the Actions workflow deploys
   automatically. (Relative asset URLs mean it also works on a subpath.)

## Tuning knobs (one-liners)

| What | Where |
| --- | --- |
| Ball speed / friction / boost strength | `CONFIG` in `src/world/optimizer.js` |
| Terrain shape (wells, hills, valley) | `WELLS`, `HILLS` in `src/world/lossField.js` |
| Idle "waves" across the surface | `WAVES` in `src/world/lossField.js` |
| Cursor hill + wake size/feel | `CURSOR`, `WAKE` in `src/world/lossField.js` |
| Anneal lift (gentle) | `ANNEAL` in `src/world/lossField.js` |
| Camera angle, drift, parallax | `CAM` in `src/world/constants.js` |
| Grid fineness / mesh transparency | `RES`, `opacity` in `src/world/surface.js` |
| How often the ball is "led out" | `nextFall` schedule in `src/world/world.js` |
| Kinesin rescue timing | `after(...)` in `src/carrier.js` |
| Surface palettes (light/dark) | `PAL_LIGHT`, `PAL_DARK` in `src/world/surface.js` |
| Dust colours / density | `PALETTES`, `rate` in `src/world/dust.js` |
| Light/dark 3D scene colors | `THEMES` in `src/world/constants.js` |
| Page colors | CSS variables in `src/style.css` |
