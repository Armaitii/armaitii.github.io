# Armita Hoda — Personal Portfolio

Personal research and technical portfolio of **Armita Hoda**, a biotechnology researcher interested in **chromatin regulation, epigenetics, neurobiology, and mechanistic biology**.

🌐 **Website:** [armaitii.github.io](https://armaitii.github.io)

The portfolio brings together my research projects, computational work, scientific interests, technical skills, and CV.

---

## About

My research interests lie at the intersection of **biotechnology, genomics, epigenetics, and neurobiology**.

I am particularly interested in understanding how molecular and epigenetic mechanisms regulate cellular identity and development, with a growing focus on:

- Chromatin regulation
- Neuroepigenetics
- Neurodevelopment
- Neurodevelopmental and psychiatric disorders
- RNA biology
- Epigenome editing
- Mechanistic biology
- Therapeutic approaches to molecular regulation

My work combines experimental biology with computational analysis and mechanistic modeling where appropriate.

---

## Research Projects

### 🧬 Mechanistic cfDNA Fragmentation

An epigenome-aware mechanistic model of cell-free DNA fragmentation.

The project investigates how **chromatin organization, nucleosome positioning, genomic context, and nuclease-specific cleavage preferences** contribute to observed cfDNA fragment patterns.

The computational framework uses stochastic simulation to model fragmentation dynamics and is evaluated using a range of fragmentomics features.

**Focus:**  
`cfDNA` · `Epigenetics` · `Nucleosome positioning` · `Stochastic simulation` · `Fragmentomics`

---

### 🧠 Neuropsychiatric Chromatin Regulation

An analysis connecting **neuropsychiatric disease-associated genetic variation** with cell-type-specific chromatin accessibility in the human brain.

The project uses GWAS summary statistics together with chromatin accessibility annotations to investigate enrichment of genetic risk across neuronal and other brain cell populations.

**Focus:**  
`GWAS` · `S-LDSC` · `snATAC-seq` · `Chromatin accessibility` · `Neuropsychiatric disorders`

---

### 📊 cfDNA Fragmentomics Metrics

Implementation and visualization of fragmentomics metrics for evaluating simulated cfDNA fragmentation against experimental data.

The analysis examines fragment length, nucleosome positioning, fragment-end patterns, periodicity, WPS trajectories, and other sequence- and structure-associated features.

**Focus:**  
`Fragmentomics` · `WPS` · `Nucleosome footprints` · `Signal analysis` · `Python`

---

### 💸 Splitwise Settler

A small web application for simplifying shared expenses.

Given a collection of balances, the application calculates a minimal set of payments that settles the group while reducing unnecessary transactions.

**Focus:**  
`JavaScript` · `Algorithms` · `Data structures` · `Web development`

---

## Interactive Background

The portfolio is built around an interactive **loss-landscape / gradient-descent visualization**.

A glowing particle continuously moves across a dynamically changing mathematical landscape. The terrain responds to the user's cursor, allowing the visitor to influence the optimization process.

The visualization includes:

- An analytically defined loss field
- Exact gradient computation
- Continuous gradient descent with momentum
- Friction and stochastic perturbations
- Dynamic Gaussian wells and valleys
- Cursor-generated terrain and wake effects
- Animated surface waves
- GPU particle effects
- Live loss, gradient-norm, and velocity readouts
- Light and dark visual themes

There is also a small biological easter egg: when the particle eventually leaves the landscape, a cartoon **kinesin motor protein** appears and carries it away as cargo before the simulation resumes.

The background is deliberately playful, but the underlying system is an actual real-time numerical and graphical simulation.

---

## Technology

The portfolio is intentionally lightweight and uses browser-native technologies rather than a large application framework.

- **JavaScript**
- **Three.js**
- **WebGL**
- **Vite**
- **HTML / CSS**
- **GitHub Actions**
- **GitHub Pages**

---

## Project Structure

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
│   ├── content.js
│   ├── main.js
│   ├── style.css
│   ├── resume.js
│   ├── resume.css
│   │
│   └── world/
│       ├── constants.js
│       ├── lossField.js
│       ├── optimizer.js
│       ├── pointer.js
│       ├── surface.js
│       ├── world.js
│       └── dust.js
│
└── .github/
    └── workflows/
        └── deploy.yml
```

### Key files

| File | Purpose |
|---|---|
| `src/content.js` | Personal information, research interests, projects, skills and links |
| `src/main.js` | Application entry point and content/theme handling |
| `src/style.css` | Portfolio layout and light/dark themes |
| `src/world/lossField.js` | Mathematical loss landscape and gradients |
| `src/world/optimizer.js` | Gradient-descent particle dynamics |
| `src/world/surface.js` | 3D landscape rendering |
| `src/world/pointer.js` | Mouse/touch interaction with the landscape |
| `src/world/world.js` | Three.js scene, camera and animation loop |
| `src/world/dust.js` | GPU particle effects |
| `resume.html` | CV/resume page |
| `.github/workflows/deploy.yml` | Automatic GitHub Pages deployment |

---

## Run Locally

Clone the repository:

```bash
git clone https://github.com/Armaitii/armaitii.github.io.git
cd armaitii.github.io
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The site will normally be available at:

```text
http://localhost:5173
```

Build the production version:

```bash
npm run build
```

The production output is generated in `dist/`.

---

## Customization

Most personal content is centralized in:

```text
src/content.js
```

This includes:

- Name and profile
- About section
- Research interests
- Contact information
- CV link
- Projects
- Skills

The interactive visualization can be customized independently through the files in:

```text
src/world/
```

Some of the main parameters include:

- Particle speed and friction
- Gradient-descent behavior
- Terrain wells and hills
- Cursor interaction
- Surface waves
- Simulated annealing
- Camera movement
- Grid resolution
- Particle effects
- Light/dark visualization palettes

---

## Deployment

The repository is configured for deployment through **GitHub Pages**.

Changes pushed to the `main` branch are built and published automatically through the GitHub Actions workflow.

Because this repository follows the `username.github.io` naming convention, the deployed site is available at:

**https://armaitii.github.io**

---

## Design Philosophy

The portfolio intentionally combines two things that are usually presented separately:

**scientific work** and **technical experimentation**.

The research content is the primary purpose of the site. The interactive visualization provides a more personal way of presenting the computational side of my work and reflects my interest in exploring ideas through simulation and visualization.

The result is meant to be a research portfolio rather than a conventional software-development portfolio: a place to document scientific questions, projects, methods, and the direction I want to take my research.

---

## License

This repository contains personal portfolio content and original research-related material. Please contact me before reusing substantial portions of the site's content, design, or assets.