import './style.css';
import { PROFILE, PROJECTS, SKILLS } from './content.js';
import { currentTheme, wireThemeToggle } from './theme.js';

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
  // The education badge's requested <b> and &nbsp; formatting lives in
  // index.html. Do not replace its contents with plain profile text.
  $('#nav-name').textContent = P.shortName;
  $('#avatar').textContent = P.initials;
  $('#about-name').textContent = P.name.split(' ')[0];
  $('#about-p1').textContent = P.about[0] ?? '';
  $('#about-p2').textContent = P.about[1] ?? '';
  const facts = P.facts ?? (P.location ? [`📍 ${P.location}`] : []);
  $('#facts').innerHTML = facts.map((f) => `<li>${esc(f)}</li>`).join('');
  $('#interests').innerHTML = (P.interests ?? []).map((i) => `<span class="chip">${esc(i)}</span>`).join('');
  $('#mail-btn').href = `mailto:${P.email}`;
  $('#mail-btn').textContent = P.email;
  const firstSentence = P.about[0]?.split('.')[0];
  $('#hero-lede').textContent = firstSentence ? firstSentence + '.' : '';
  $('#hero-role').textContent = P.role;
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
  $('#project-grid').innerHTML = PROJECTS.map((p) => {
    // A custom label overrides the default "featured" text. The featured
    // flag still controls the card highlight, independently of its label.
    const badge = p.badge ?? (p.featured ? 'featured' : '');
    return `
    <article class="card ${p.featured ? 'featured' : ''}">
      <div class="card-top">
        ${badge ? `<span class="feat-tag">${esc(badge)}</span>` : ''}
        ${p.stars != null ? `<span class="stars">★ ${p.stars}</span>` : ''}
      </div>
      <h3>${p.link?.trim() ? `<a href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.title)}</a>` : esc(p.title)}</h3>
      <p>${esc(p.desc)}</p>
      <div class="card-bottom">
        <span class="chips">${p.tags.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</span>
        ${p.lang ? `<span class="lang"><i style="background:${p.langColor}"></i>${esc(p.lang)}</span>` : ''}
      </div>
    </article>`;
  }).join('');
}

// Decorative, locally drawn icons; no ratings or invented proficiency levels.
const SKILL_ART = [
  { tone: 'blue', drawing: '<rect x="4" y="4" width="24" height="18" rx="4"/><path d="M11 28h10M16 22v6M12 10l-3 3 3 3m8-6 3 3-3 3"/>' },
  { tone: 'violet', drawing: '<path d="M9 3c0 13 14 13 14 26M23 3c0 13-14 13-14 26M10 6h12M12 11h8M12 21h8M10 26h12"/>' },
  { tone: 'teal', drawing: '<path d="M27 16c0 7-4 12-11 12S4 23 4 16 9 4 16 4s11 5 11 12Z"/><circle cx="15" cy="15" r="5"/><path d="m23 9-2 2M8 22l2-2M23 21h-3"/><circle cx="10" cy="9" r="1"/>' },
  { tone: 'amber', drawing: '<path d="M4 5v23h24M7 23l5-7 4 4 5-13 5 6"/><circle cx="21" cy="7" r="2"/><path d="M27 4v3M25.5 5.5h3"/>' },
];

function applySkills() {
  $('#skill-groups').innerHTML = SKILLS.map((g, index) => {
    const art = SKILL_ART[index % SKILL_ART.length];
    return `
      <article class="skill-card" data-tone="${art.tone}" aria-labelledby="skill-group-${index}">
        <div class="skill-card-top">
          <span class="skill-icon" aria-hidden="true"><svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${art.drawing}</svg></span>
          <span class="skill-number" aria-hidden="true">${String(index + 1).padStart(2, '0')} / ${String(SKILLS.length).padStart(2, '0')}</span>
        </div>
        <h3 id="skill-group-${index}">${esc(g.group)}</h3>
        <ul class="skill-list">${g.items.map(item => `<li class="skill-pill">${esc(item)}</li>`).join('')}</ul>
        <div class="skill-card-foot"><span>${g.items.length} ${g.items.length === 1 ? 'skill' : 'skills'}</span><span class="skill-rule" aria-hidden="true"></span></div>
      </article>`;
  }).join('');
}

// --------------------------------------------------------------------------
// 3 · Theme toggle (light default, dark available — both themed live)
// --------------------------------------------------------------------------
let worldInstance = null;

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
  wireThemeToggle((theme) => worldInstance?.applyTheme(theme));

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
