/** Shared light-by-default theme controls for the portfolio and résumé page. */
const META_COLORS = { light: '#f2f5fc', dark: '#05070d' };

export function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function wireThemeToggle(onChange = () => {}) {
  const btn = document.querySelector('#theme-toggle');
  if (!btn) return;

  function sync() {
    const theme = currentTheme();
    const dark = theme === 'dark';
    btn.classList.toggle('dark', dark);
    btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', META_COLORS[theme]);
  }

  sync();
  btn.addEventListener('click', () => {
    const theme = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('portfolio-theme-v2', theme); } catch { /* storage may be disabled */ }
    sync();
    onChange(theme);
  });
}
