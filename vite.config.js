import { defineConfig } from 'vite';

// base: './' -> relative asset URLs, so the same build works at
// https://username.github.io/  (root site) AND on a subpath.
export default defineConfig({
  base: './',
  server: {
    host: true,
    // dev-only: allow the sandbox preview hostname to reach the dev server
    allowedHosts: true,
  },
});
