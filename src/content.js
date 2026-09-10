
export const PROFILE = {
  name: 'Armita Hoda',
  shortName: 'Can you make the ball fall? :]',
  initials: 'AR',
  role: 'Biotechnology | Computational Biology | Epigenetics & Neurobiology',
  education: "Master's degree Department of Biotechnology · University of Tehran",

  about: [
    "I'm not exactly a machine learning engineer, but sb who likes playing around with ideas creative machine learning engineers develop.",
    "This site's background is exactly that: a ball performing gradient descent on a loss landscape, and your cursor reshapes the terrain in real time. Everything you see is computed live, including the normals.",
  ],

  location: 'Tehran, IR',
  email: 'armita.hoda@gmail.com',
  github: 'https://github.com/armaitii',

  interests: ['chromatin regulation', 'neurodevelopmental disorders', 'epigenetics', 'RNA biology', 'therapeutics'],

  // Download filename. The reader imports the PDF from src/assets/Armita_Hoda_CV.pdf.
  resume: 'Armita_Hoda_CV.pdf',
};


// Optional badge: any label, e.g. "Thesis" or "Research". Omit to keep the featured default.
export const PROJECTS = [
  {
    title: 'Mechanistic cell-free DNA fragmentation simulation',

    desc:
      'Thesis: Epigenome-aware modeling of cfDNA fragmentation using stochastic simulation, nucleosome organization, nuclease-specific cleavage preferences, and fragmentomics analysis.',

    tags: [
      'cfDNA',
      'ATAC-seq',
      'MNase-seq',
      'Stochastic simulation',
      'Optuna',
      'ABC-SMC'
    ],

    lang: 'Python',
    langColor: '#e15cff',
    link: '',

    badge: 'Thesis',
    featured: true,
  },
  {
    title: 'neuropsychiatric regulation analysis',

    desc:
      'Analysis of genetic associations between neuropsychiatric traits and cell-type-specific chromatin accessibility using GWAS summary statistics and stratified LD score regression.',

    tags: [
      'GWAS',
      'S-LDSC',
      'snATAC-seq',
      'Snakemake'
    ],

    lang: 'Python',
    langColor: '#e15cff',
    link: '',
    featured: true,
  },  
  {
    title: 'Settle-Up',
    desc:
      'A lightweight expense-settlement tool that simplifies shared expenses by calculating the minimum set of payments needed to settle balances.',

    tags: [
      'TypeScript',
      'algorithms',
      'React',
      'PostgreSQL'
    ],
    lang: 'TypeScript',
    langColor: '#37eeff',
    link: '',
    featured: false,
  },  
  {
    title: 'grad-descent-playground',
    desc: 'Interactive WebGL loss-landscape toy — the exact visual that runs behind this page. A ball does gradient descent while your cursor deforms the surface.',
    tags: ['three.js', 'WebGL'],
    lang: 'JavaScript',
    langColor: '#f1e05a',
    link: 'https://github.com/armaitii/grad-descent-playground',
    featured: false,
  },
];


export const SKILLS = [
  {
    group: 'Computational biology',
    items: [
      'Advanced Programming',
      'Bioinformatics',
      'Systems Biology',
      'Biostatistics',
      'Machine Learning'
    ]
  },

  {
    group: 'Genomics & molecular biology',
    items: [
      'Genetic Engineering',
      'Omics',
      'Nucleic Acid Technology',
      'Synthetic Biology',
      'Protein Engineering'
    ]
  },

  {
    group: 'Cellular & biomedical sciences',
    items: [
      'Cell & Tissue Culture',
      'Stem Cells',
      'Cellular & Molecular Immunology',
      'Personalized Medicine'
    ]
  },

  {
    group: 'Experimental methods',
    items: [
      'Synchrotron Micro-CT',
      'Infrared Microspectroscopy',
      'X-ray Absorption Spectroscopy',
      'X-ray Fluorescence'
    ]
  },

];

