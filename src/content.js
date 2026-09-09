/**
 * content.js — ✏️ EDIT THIS FILE with your real info.
 * Every placeholder on the site ("Your Name", "yourusername", …) comes from
 * here. All fields marked ⚠️ should be replaced before you push to GitHub.
 */

export const PROFILE = {
  name: 'Armita Hoda',
  shortName: 'Can you make the ball fall? :]',
  initials: 'AR',
  role: 'Biotechnology | Computational Biology | Epigenetics & Neurobiology',

  about: [
    "I'm not exactly a machine learning engineer, but sb who likes playing around with ideas creative machine learning engineers develop.",
    "This site's background is exactly that: a ball performing gradient descent on a loss landscape, and your cursor reshapes the terrain in real time. Everything you see is computed live, including the normals.",
  ],

  location: 'Tehrann, IR',
  email: 'armita.hoda@gmail.com',
  github: 'https://github.com/armaitii',

  interests: ['chromatin regulation', 'neuroepigenetics', 'RNA biology', 'mechanistic biology'],

  // resume: set to 'resume.pdf' once you drop a PDF into public/
  resume: 'Armita_Hoda_CV.pdf',
};


export const PROJECTS = [
  {
    title: 'grad-descent-playground',
    desc: 'Interactive WebGL loss-landscape toy — the exact visual that runs behind this page. A ball does gradient descent while your cursor deforms the surface.',
    tags: ['three.js', 'WebGL'],
    lang: 'JavaScript',
    langColor: '#f1e05a',
    stars: 128,
    link: 'https://github.com/armaitii/grad-descent-playground',
    featured: true,
  },
  {
    title: 'shader-doodle',
    desc: 'Daily GLSL sketches — raymarched shapes, fbm terrain and flow fields — with a tiny live editor so each one runs in the browser.',
    tags: ['glsl', 'shadertoy', 'gpu'],
    lang: 'GLSL',
    langColor: '#5686a5',
    stars: 54,
    link: '',
  },
  {
    title: 'cfdna-notes',
    desc: 'My public study notes on optimization, generalization and architectures — written to be understood by future me (and you).',
    tags: ['writing', 'research'],
    lang: 'Markdown',
    langColor: '#083fa1',
    stars: 41,
    link: '',
  },
];

/** SKILLS — grouped chips; ⚠️ edit freely. */
export const SKILLS = [
  { group: 'Genetic engineering', items: ['Pymol', 'Allelid', 'Snapgene'] },
  { group: 'Engineering', items: ['Python', 'R', 'Stochastic simulation', 'MD simulation', 'Snakemake'] },
  { group: 'Biology', items: ['Genetic', 'Neuroscience'] },
  { group: 'Also into', items: [''] },
];
