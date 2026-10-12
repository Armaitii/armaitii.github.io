# Armita Hoda — Personal Portfolio

You can read more about me here: 

🌐 **[armaitii.github.io](https://armaitii.github.io)**

Bonus: There is a cute surprise waiting for you if you manage to throw the ball out of the surface! :)

The site's background is not a video, a GIF, or a pre-baked animation. It is a live
**loss-landscape simulation**: an analytic loss field `f(x, y)` rendered as a morphing
3D grid, with a glowing **ball rolling gradient descent** on top of it. The cursor
deforms the terrain, so the visitor can steer the optimizer in real time.

---

## How it works

### The surface — an analytic loss landscape

The terrain is a mathematical function, not a mesh someone modelled.

- `src/world/lossField.js` defines `f(x, y)` as a sum of building blocks:
  a wandering central bowl, a soft valley, a raised ridge, a set of **Gaussian wells**
  (local minima) and **raised hills**, plus several broad **travelling waves** that
  sweep across the map on Lissajous paths.
- `sample(x, y, out)` returns the height **and** the exact gradient `∇f` in a single
  pass — no numerical differentiation, no finite differences. Everything downstream
  (the ball's descent direction, the surface normals, the HUD readouts) uses that one
  exact gradient.
- `setTime(t)` is called once per frame and animates the whole field: the pattern
  slowly rotates and sways, wells wander, their depths pulse, and the travelling waves
  keep moving. The landscape is never static, so the ball can never truly park.
- `src/world/surface.js` samples that field on a parametric grid (one vertex per
  0.3 world units), writes heights into the vertical component, recomputes analytic
  normals `∝ (−∂h/∂x, 1, −∂h/∂z)`, and recolours every vertex by its normalized height.
  A `LineSegments` wireframe shares the *same* position buffer, so the grid always
  follows the terrain exactly.
- A vertex-colour palette maps low → high: dusky violet valleys up to warm sand peaks on
  the light theme, and a vivid plasma ramp on the dark theme.

### The ball — continuous gradient descent

`src/world/optimizer.js` is the optimizer. Each frame it:

1. samples `∇f` at its position and accelerates **downhill** (`−∇f`, normalised),
   with **extra cost when moving against the slope** (`up`), which produces inertia
   and overshoot;
2. integrates velocity, applies a **speed cap** and **dt-corrected friction**;
3. adds a trace of **thermal noise**, so it is never pixel-still.

It never stops, never resets, and never teleports. When it settles into a basin and its
smoothed speed drops below the lull threshold for long enough, an **escape engine** kicks
in: first a smooth uphill **boost** (scaled to how deep the local basin is), and if a few
boosts fail, the terrain **rises underneath it** — a simulated-annealing mound — until the
ball spills over the rim and rolls away. Everything it rolls on is the same terrain that is
rendered: base landscape + cursor hill + cursor wake + anneal mound.

### The cursor

`src/world/pointer.js` raycasts the pointer onto the terrain plane each frame.
`lossField.js` then turns that into a smoothed Gaussian **hill** that follows the cursor
(and melts away when it leaves), plus a **wake**: a string of smaller hills deposited
along the pointer's path, which swell in and fade back out over a few seconds. Both bend
the visible mesh *and* the gradient the ball feels, so dragging the cursor is the same as
reshaping the loss function.

### When the ball falls off — the kinesin rescue

There is no invisible wall. Momentum or a cursor-made slope can push the ball past the
grid rim, and then `world.js` hands it over to gravity: it keeps its exact rolling
velocity, tumbles, and plummets while a trail of sparkles follows it. When it lands at the
bottom of the page, `src/carrier.js` draws a **kinesin motor protein** on a canvas overlay
that walks in hand-over-hand on a microtubule track, picks the ball up as cargo, and
carries it off. The ball then pops back onto the surface with an ease-out-back scale pop
and an expanding ring.

### Atmosphere

- `src/world/dust.js` — a pooled GPU point system with a soft radial sprite shader:
  the ball sheds glowing specks that drift, twinkle and fade; the emission rate scales
  with its speed. Each theme has its own particle palette.
- `src/world/world.js` — owns the renderer, scene, fog, lights and the frame loop, plus
  the ball's small state machine (`roll` → `fall` → `grounded` → `return`) and the camera's
  parallax + idle sway.
- `src/main.js` injects the page content and drives the on-screen HUD
  (`loss`, `‖∇L‖`, `speed`) and the light/dark theme switch, which retints both the CSS
  theme and the WebGL scene together.
- Visitors with `prefers-reduced-motion: reduce` (or no WebGL) get a static, animation-free
  fallback instead of the simulation.

---

## Tweaking the simulation

Everything is parameterised by plain objects and constants near the top of each module —
no build step or external config file is involved. Edit, save, and the dev server hot-reloads.

### The ball's motion — `src/world/optimizer.js` → `CONFIG`

| Parameter | Default | What it does |
|---|---|---|
| `maxSpeed` | `3.4` | Speed ceiling in world units/second. **This is the main "make the ball faster" dial.** |
| `accel` | `7.2` | How hard it accelerates downhill; higher = snappier, more responsive. |
| `friction` | `0.034` | Exponential damping. Lower = longer, floatier coasts; higher = heavy ball that stops quickly. |
| `up` | `0.9` | Extra resistance when moving uphill (`< 1` because the direction is scaled by it). Raise toward `1.2` for a heavier ball that struggles out of basins. |
| `noise` | `0.015` | Random thermal jitter. `0` makes it perfectly deterministic-looking. |

A "faster but still fluid" starting point: `maxSpeed: 5.5`, `accel: 10`, `friction: 0.028`.

### The escape engine — same file, same `CONFIG`

| Parameter | Default | What it does |
|---|---|---|
| `lullSpeed` | `0.3` | Speed below which the ball counts as lulling. |
| `lullTime` | `2.2` | Seconds of lulling before it gets a boost. |
| `flatKick` | `2.2` | Base strength of the uphill boost. |
| `boostDecay` | `1.9` | How fast an active boost tapers off. |
| `maxKicks` | `3` | Failed boosts before the annealing mound rises. Set very high to disable the mound entirely. |

### Terrain shape — `src/world/lossField.js`

| Constant | What it is |
|---|---|
| `FIELD.SIZE` (`6`) | Half-width of the field: the world is `[-SIZE, SIZE]²`. Bigger field = more room to roam, and the rim the ball can fall off is further away. |
| `WELLS` | `[cx, cy, σ, depth]` per basin. Add rows for more local minima, make depths more negative for deeper traps. |
| `HILLS` | `[cx, cy, σ, height]` raised bumps — the "bumpy 3D" texture. |
| `WAVES` | `[xRadius, yRadius, speed1, speed2, phase1, phase2, σ, amp]` travelling swells. Raise `amp` for a more dramatic breathing field. |
| `WELL_ANIM` | `[wanderAmp, wanderSpeed, phase, depthPulseAmp]` per well — how much each basin drifts and breathes. |
| `setTime()` | Contains the field's global rotation (`0.10 * Math.sin(0.038 * t)`) and the central bowl's wander amplitudes. |

### Cursor influence — same file

| Constant | Default | What it does |
|---|---|---|
| `CURSOR.band` | `0.85` | Full height of the hill under the cursor. |
| `CURSOR.width2` | `0.55` | Squared radius — larger = broader, gentler slope. |
| `FOLLOW` / `SWELL` | `0.17` / `0.05` | How fast the hill chases the pointer / fades in. |
| `WAKE.spacing`, `.band`, `.width2`, `.max`, `.cut2` | `0.55`, `0.5`, `0.45`, `7`, `3.2` | Deposit spacing, height, radius, count and pruning radius of the fading wake trail. |
| `wakeAmp()` | — | The wake envelope: rise over 0.7 s, hold, melt away by ~6 s. |
| `ANNEAL.band`, `.width2` | `1.05`, `7.5` | Height and radius of the annealing mound. `updateAnneal()` sets its rise/fall rates. |

### Surface, camera, particles, themes

| File | Parameter | Effect |
|---|---|---|
| `surface.js` | `RES` (`0.3`) | World units per grid segment — smaller = denser grid, prettier and costlier. |
| `surface.js` | `opacity` (`0.72`) | How much the page shows through the surface. |
| `surface.js` | `PAL_DARK` / `PAL_LIGHT` | Height → colour ramps (`[t, r, g, b]` control points). |
| `constants.js` | `CAM.base`, `.parallax`, `.sway`, `.fov` | Camera distance, cursor parallax, idle drift and field of view. |
| `constants.js` | `THEMES.light` / `.dark` | Clear colour, fog density, grid colour/opacity, light rigs. Both themes are switched live from the theme toggle. |
| `dust.js` | `POOL` (`260`) | Particle pool size. |
| `dust.js` | `rate` in `update()` | Emission rate — `22 + 70 * min(1, speed/2.4)` when moving, `7` when idling. |
| `dust.js` | `life`, `size`, `drag` | Sparkle lifetime, sprite size and drift damping. |
| `dust.js` | `PALETTES` | Per-theme particle colours. |
| `optimizer.js` | `SphereGeometry(0.17, 28, 28)`, material | Ball radius, tessellation, colour, emissive glow. |
| `world.js` | `-13 * dt` in `_stepFall`, `fallY < -2.6` | Fall gravity and the depth at which the ball counts as grounded. |
| `world.js` | `7` / `4.5` rad/s tumbling, `0.35` air drag | How the ball tumbles and slows during the fall. |
| `carrier.js` | `D.step`, `D.halfT`, `D.headY`, `D.trackY`, `D.lift` | The kinesin's stride length, gait speed and geometry. |

---

## Project structure

```text
.
├── index.html
├── resume.html
├── package.json
├── vite.config.js
│
├── public/
│   └── static assets
│
├── src/
│   ├── content.js        # page text, projects, skills (all in one place)
│   ├── main.js           # bootstrap: content injection, HUD, world startup
│   ├── style.css
│   ├── theme.js          # shared light/dark toggle
│   ├── resume.js
│   ├── resume.css
│   ├── pdfPreview.js     # in-page CV/transcript viewer
│   ├── carrier.js        # the kinesin canvas vignette
│   ├── assets/           # CV & transcript PDFs
│   │
│   └── world/
│       ├── constants.js  # world size, camera, theme palettes
│       ├── lossField.js  # analytic f(x, y), gradient, cursor, wake, annealing
│       ├── optimizer.js  # the ball: descent + momentum + escape engine
│       ├── surface.js    # morphing grid, normals, height colormaps
│       ├── pointer.js    # cursor → terrain-plane raycast
│       ├── world.js      # renderer, scene, camera, frame loop, ball lifecycle
│       ├── dust.js       # GPU sparkle trail
│       └── trail.js      # optional fading ribbon variant (not mounted by default)
│
└── .github/workflows/deploy.yml
```

Page copy lives in `src/content.js`; visual behaviour lives in `src/world/`.

---

## Run locally

```bash
git clone https://github.com/Armaitii/armaitii.github.io.git
cd armaitii.github.io
npm install
npm run dev     # http://localhost:5173
npm run build   # production output in dist/
```

## Deployment

Pushing to `main` builds and publishes the site via the GitHub Actions workflow in
`.github/workflows/deploy.yml` using **GitHub Pages**:

**https://armaitii.github.io**
