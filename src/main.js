import './style.css';
import { PROFILE, PROJECTS, SKILLS } from './content.js';

/**
 * main.js — bootstraps the page: injects your content into the DOM and
 * starts the 3D world (or the reduced-motion static fallback).
 */

const $ = (sel) => document.querySelector(sel);

// --------------------------------------------------------------------------
// 1 · inject profile content
// --------------------------------------------------------------------------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function applyProfile() {
  const P = PROFILE;
  document.title = `${P.name} — ${P.role}`;
  $('#hero-name').textContent = P.name;
  $('#nav-name').textContent = P.shortName;
  $('#avatar').textContent = P.initials;
  $('#about-name').textContent = P.name.split(' ')[0];
  $('#about-p1').textContent = P.about[0] ?? '';
  $('#about-p2').textContent = P.about[1] ?? '';
  $('#facts').innerHTML = (P.facts ?? []).map((f) => `<li>${esc(f)}</li>`).join('');
  $('#interests').innerHTML = (P.interests ?? []).map((i) => `<span class="chip">${esc(i)}</span>`).join('');
  $('#mail-btn').href = `mailto:${P.email}`;
  $('#mail-btn').textContent = P.email;
  const firstSentence = P.about[0]?.split('.')[0];
  $('#hero-lede').textContent = firstSentence ? firstSentence + '.' : '';
  $('#hero-role').innerHTML = esc(P.role).replace(' & ', '<br/>& ');
  $('#year').textContent = new Date().getFullYear();

  const gh = P.github.replace(/\/$/, '');
  const ghName = gh.split('/').pop();
  if (ghName && !/yourusername/i.test(ghName)) {
    $('#nav-gh').href = gh;
    $('#btn-github').href = gh;
    $('#contact-gh').href = gh;
    $('#foot-source').href = gh;
    document.querySelectorAll('.socials').forEach((el) => {
      el.innerHTML = socialHTML(P);
    });
  }
  if (P.resume) { $('#btn-resume').href = P.resume; $('#btn-resume').hidden = false; }
}

function socialHTML(P) {
  const items = [
    P.github && { label: 'GitHub', href: P.github, d: 'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z' },
    P.linkedin && { label: 'LinkedIn', href: P.linkedin, d: 'M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216-.016-.432-.08-.586-.173-.431-.566-.878-1.232-.878-.694 0-1.195.458-1.39 1.12-.07.174-.086.41-.086.633v5.746H7.615V6.169h2.28v1.024h.031c.321-.497.89-1.224 2.187-1.224 1.596 0 2.792 1.043 2.792 3.283v5.142h-2.4V9.75c0-.608-.217-1.022-.757-1.022-.412 0-.655.28-.761.55-.04.096-.05.23-.05.368z' },
    P.twitter && { label: 'X', href: P.twitter, d: 'M9.5 6.9 15.4.9h-1.4L8.9 6.1 4.8.9H.4l6.2 8.9L.3 16h1.4l5.4-6.1 4.3 6.1h4.4L9.5 6.9zm-1.9 2.1-.6-.9L2.2 1.9h2.1l3.9 5.6.6.9 5.1 7.2h-2.1l-4.2-5.9z' },
    { label: 'Email', href: `mailto:${P.email}`, d: 'M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2.2 0 5.8 4.2L13.8 4H2.2zm-.2 1.4v6.6h12V5.4L8 9.2 2 5.4z' },
  ].filter(Boolean);
  return items.map((s) => `<a class="soc" href="${esc(s.href)}" target="_blank" rel="noopener" aria-label="${esc(s.label)}"><svg viewBox="0 0 16 16" width="17" height="17" fill="currentColor"><path d="${s.d}"/></svg></a>`).join('');
}

// --------------------------------------------------------------------------
// 2 · projects & skills
// --------------------------------------------------------------------------
function applyProjects() {
  $('#project-grid').innerHTML = PROJECTS.map((p) => `
    <article class="card ${p.featured ? 'featured' : ''}">
      <div class="card-top">
        ${p.featured ? '<span class="feat-tag">featured</span>' : ''}
        ${p.stars != null ? `<span class="stars">★ ${p.stars}</span>` : ''}
      </div>
      <h3><a href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.title)}</a></h3>
      <p>${esc(p.desc)}</p>
      <div class="card-bottom">
        <span class="chips">${p.tags.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</span>
        ${p.lang ? `<span class="lang"><i style="background:${p.langColor}"></i>${esc(p.lang)}</span>` : ''}
      </div>
    </article>`).join('');
}

function applySkills() {
  $('#skill-groups').innerHTML = SKILLS.map((g) => `
    <div class="skill-group">
      <h3>${esc(g.group)}</h3>
      <div class="chips">${g.items.map((i) => `<span class="chip">${esc(i)}</span>`).join('')}</div>
    </div>`).join('');
}

// --------------------------------------------------------------------------
// 3 · Theme toggle (light default, dark available — both themed live)
// --------------------------------------------------------------------------
const META_COLORS = { light: '#f2f5fc', dark: '#05070d' };
let worldInstance = null;

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function setTheme(theme, persist = true) {
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', META_COLORS[theme]);
  if (persist) {
    try { localStorage.setItem('portfolio-theme-v2', theme); } catch (e) { /* ignore */ }
  }
  worldInstance?.applyTheme(theme); // retheme the live 3D scene too
}

function wireThemeToggle() {
  const btn = $('#theme-toggle');
  const syncIcon = () => {
    const dark = currentTheme() === 'dark';
    btn.classList.toggle('dark', dark);
    btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  };
  syncIcon();
  btn.addEventListener('click', () => {
    setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    syncIcon();
  });
}

// --------------------------------------------------------------------------
// 4 · HUD + the 3D world
// --------------------------------------------------------------------------
function wireHud(world) {
  const stats = $('#stats');
  const hint = $('#hint');

  world.cb.onFrame = ({ loss, speed, grad }) => {
    stats.innerHTML =
      `loss — <b class="num">${loss.toFixed(2)}</b> · ` +
      `‖∇L‖ — <b class="num">${grad.toFixed(2)}</b> · ` +
      `speed — <b class="num">${speed.toFixed(2)}</b>`;
  };

  // hint disappears once the visitor has played with the terrain
  hint.classList.add('show');
  window.addEventListener('pointermove', () => {
    hint.classList.remove('show');
  }, { once: true, passive: true });
  setTimeout(() => hint.classList.remove('show'), 15000);
}

function boot() {
  applyProfile();
  applyProjects();
  applySkills();
  wireThemeToggle();

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = $('#scene');

  if (reduced || !window.WebGLRenderingContext) {
    document.body.classList.add('static');
    return;
  }

  try {
    import('./world/world.js').then(({ World }) => {
      const world = new World(canvas, {}, currentTheme());
      worldInstance = world;
      wireHud(world);
      // kinesin rescue: whenever the ball falls off the terrain, run the
      // "end of the page" vignette, then pop the ball back onto the surface.
      // The ball lands at the bottom on the same screen axis it fell from.
      import('./carrier.js').then(({ createCarrier }) => {
        const carrier = createCarrier();
        world.cb.onLanded = (ndcX) => carrier.play(() => world.returnBall(), ndcX);
      });
      window.__world = world;
    });
  } catch (err) {
    console.error('3D failed to start — using static fallback', err);
    document.body.classList.add('static');
  }
}

boot();
