import './style.css';
import './resume.css';
import { PROFILE } from './content.js';
import { wireThemeToggle } from './theme.js';
import cvDataURL from './assets/Armita_Hoda_CV.pdf?inline';

// An exact, optional match: building still succeeds before the transcript is
// uploaded, and no unrelated PDF in assets is accidentally included.
const transcriptAssets = import.meta.glob('./assets/Armita_Hoda_Transcript.pdf', {
  eager: true, query: '?inline', import: 'default',
});
const transcriptDataURL = transcriptAssets['./assets/Armita_Hoda_Transcript.pdf'] ?? null;
const $ = selector => document.querySelector(selector);
function setText(selector, value) {
  const node = $(selector);
  if (node) node.textContent = value;
}

document.title = `Resume — ${PROFILE.name}`;
document.body.dataset.resumeReader = 'bundled-documents-2';
// This page uses the person's name. The homepage still uses PROFILE.shortName.
setText('#nav-name', PROFILE.name);
setText('#resume-owner', PROFILE.name);
setText('#year', new Date().getFullYear());
if (PROFILE.github && $('#nav-gh')) $('#nav-gh').href = PROFILE.github;
wireThemeToggle();

// Decode document bytes directly. Never fetch or embed a PDF URL on page load.
function getBundledPdfBytes(dataURL) {
  const marker = ';base64,';
  const start = dataURL.indexOf(marker);
  if (!dataURL.startsWith('data:') || start < 0) {
    throw new Error('Expected a PDF bundled with the Vite ?inline asset import.');
  }
  const binary = atob(dataURL.slice(start + marker.length));
  if (!binary.slice(0, 1024).includes('%PDF-')) {
    throw new Error('The bundled document is not a valid PDF file.');
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

let previewModule;
function getPreviewModule() {
  return previewModule ??= import('./pdfPreview.js');
}

// Each document has its own bytes, zoom, status and click handler. A missing
// or invalid transcript cannot stop the CV reader (or vice versa).
function mountDocumentReader(prefix, { label, dataURL, fileName, emptyTitle, emptyCopy }) {
  const el = suffix => document.getElementById(`${prefix}-${suffix}`);
  const button = el('download');
  const preview = el('preview');
  if (!button || !preview) return null;
  const text = (suffix, value) => { const node = el(suffix); if (node) node.textContent = value; };
  const hide = (suffix, value) => { const node = el(suffix); if (node) node.hidden = value; };
  let pdfBlob = null;
  let viewer = null;
  let disposed = false;

  button.disabled = true;
  if (!dataURL) {
    text('status', 'Not uploaded yet');
    text('empty-title', emptyTitle);
    text('empty-copy', emptyCopy);
    hide('empty', false);
    hide('preview', true);
    hide('reader-controls', true);
    hide('preview-note', true);
    return null;
  }

  function showError(error) {
    if (disposed) return;
    hide('preview', true);
    hide('empty', false);
    hide('reader-controls', true);
    text('status', 'Preview unavailable');
    text('empty-title', error.name === 'PasswordException'
      ? 'This PDF is password-protected' : 'The preview could not be loaded');
    text('empty-copy', pdfBlob
      ? 'You can still use Download PDF to save and read the original file.'
      : `Rebuild the site with a valid ${label.toLowerCase()} PDF in src/assets/.`);
    console.error(`[${label} reader]`, error);
  }

  // The only place a downloadable PDF blob URL is created: a button click.
  button.addEventListener('click', () => {
    if (!pdfBlob || disposed) return;
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  });

  function setZoom(value) {
    if (!viewer || disposed) return;
    const zoom = viewer.setZoom(value);
    text('zoom-level', `${Math.round(zoom * 100)}%`);
    if (el('zoom-out')) el('zoom-out').disabled = zoom <= 0.75;
    if (el('zoom-in')) el('zoom-in').disabled = zoom >= 2;
  }
  el('zoom-out')?.addEventListener('click', () => setZoom((viewer?.zoom ?? 1) - 0.25));
  el('zoom-in')?.addEventListener('click', () => setZoom((viewer?.zoom ?? 1) + 0.25));
  el('fit')?.addEventListener('click', () => setZoom(1));

  async function load() {
    try {
      const bytes = getBundledPdfBytes(dataURL);
      // Keep an unchanged copy before PDF.js transfers its buffer to a worker.
      pdfBlob = new Blob([bytes], { type: 'application/pdf' });
      button.disabled = false;
      text('status', `Preparing ${label.toLowerCase()} preview…`);
      hide('empty', true);
      hide('preview', false);
      preview.dataset.pdfBytes = String(pdfBlob.size);
      hide('preview-note', false);

      const { createPdfPreview } = await getPreviewModule();
      if (disposed) return;
      viewer = await createPdfPreview(preview, bytes.buffer, {
        label,
        onProgress: (page, total) => {
          if (disposed) return;
          text('status', page < total
            ? `Rendering page ${page} of ${total}…`
            : `${total} ${total === 1 ? 'page' : 'pages'} · ${Math.max(1, Math.round(pdfBlob.size / 1024))} KB`);
        },
        onError: showError,
      });
      if (disposed) { await viewer.destroy(); return; }
      hide('reader-controls', false);
    } catch (error) {
      showError(error);
    }
  }
  load();

  return {
    destroy() {
      disposed = true;
      if (viewer) return viewer.destroy().catch(() => {});
    },
  };
}

const readers = [
  mountDocumentReader('resume', {
    label: 'CV',
    dataURL: cvDataURL,
    fileName: (typeof PROFILE.resume === 'string' && PROFILE.resume.split(/[\\/]/).pop()) || 'Armita_Hoda_CV.pdf',
  }),
  mountDocumentReader('transcript', {
    label: 'Transcript',
    dataURL: transcriptDataURL,
    fileName: 'Armita_Hoda_Transcript.pdf',
    emptyTitle: 'Transcript coming soon',
    emptyCopy: 'An academic transcript will appear here once it has been uploaded.',
  }),
];

window.addEventListener('pagehide', event => {
  if (!event.persisted) readers.forEach(reader => reader?.destroy());
});
