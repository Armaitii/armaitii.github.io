import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// base: './' -> relative asset URLs, so the same build works at
// https://username.github.io/  (root site) AND on a subpath.
export default defineConfig({
  base: './',
  build: {
    rolldownOptions: {
      input: {
        portfolio: fileURLToPath(new URL('./index.html', import.meta.url)),
        resume: fileURLToPath(new URL('./resume.html', import.meta.url)),
      },
    },
  },
  server: {
    host: true,
    // dev-only: allow the sandbox preview hostname to reach the dev server
    allowedHosts: true,
  },
});
