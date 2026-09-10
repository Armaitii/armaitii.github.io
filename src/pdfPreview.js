import { getDocument, GlobalWorkerOptions, TextLayer } from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerURL from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

// Render on our own canvases, never in <object>/<embed>/<iframe>. Native PDF
// viewers may launch a download when disabled in the visitor's browser.
// The worker, fonts and decoders are bundled locally: no PDF/CDN service.
GlobalWorkerOptions.workerSrc = workerURL;

const resourceURLs = import.meta.glob([
  '/node_modules/pdfjs-dist/standard_fonts/*.{pfb,ttf}',
  '/node_modules/pdfjs-dist/cmaps/*.bcmap',
  '/node_modules/pdfjs-dist/wasm/*.{wasm,js}',
], { eager: true, query: '?url', import: 'default' });
// PDF.js 5.4 uses separate CMap, font and WebAssembly factories. Keep the
// worker and factories on the same pinned version; do not mix in the v6 API.
async function fetchBundledResource(folder, filename) {
  const url = resourceURLs[`/node_modules/pdfjs-dist/${folder}/${filename}`];
  if (!url) throw new Error(`PDF resource not bundled: ${filename}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Cannot load PDF resource: ${filename}`);
  return new Uint8Array(await response.arrayBuffer());
}

class BundledCMapReaderFactory {
  async fetch({ name }) {
    return {
      cMapData: await fetchBundledResource('cmaps', `${name}.bcmap`),
      isCompressed: true,
    };
  }
}

class BundledStandardFontDataFactory {
  fetch({ filename }) {
    return fetchBundledResource('standard_fonts', filename);
  }
}

class BundledWasmFactory {
  fetch({ filename }) {
    return fetchBundledResource('wasm', filename);
  }
}

/** A responsive, selectable-text PDF reader. It never initiates downloads. */
export async function createPdfPreview(container, bytes, { onProgress, onError, label = 'CV' } = {}) {
  const loading = getDocument({
    data: new Uint8Array(bytes),
    CMapReaderFactory: BundledCMapReaderFactory,
    StandardFontDataFactory: BundledStandardFontDataFactory,
    WasmFactory: BundledWasmFactory,
    cMapPacked: true,
    isEvalSupported: false,
    useWorkerFetch: false,
    useSystemFonts: false,
  });
  let pdf;
  try {
    pdf = await loading.promise;
  } catch (error) {
    await loading.destroy();
    throw error;
  }

  let zoom = 1;
  let generation = 0;
  let destroyed = false;
  let resizeTimer = 0;
  let lastWidth = 0;
  const activeTasks = new Set();
  const pages = [];
  const stack = document.createElement('div');
  stack.className = 'pdf-page-stack';
  container.replaceChildren(stack);

  function cancelRenders() {
    for (const task of activeTasks) task.cancel();
    activeTasks.clear();
  }

  async function render() {
    if (destroyed) return;
    const version = ++generation;
    cancelRenders();
    const style = getComputedStyle(container);
    lastWidth = container.clientWidth;
    const width = Math.max(160, lastWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
    const fittedWidth = Math.min(960, width) * zoom;
    stack.replaceChildren();
    container.setAttribute('aria-busy', 'true');

    const sheets = pages.map((page, i) => {
      const natural = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: fittedWidth / natural.width });
      const article = document.createElement('article');
      article.className = 'pdf-page';
      article.setAttribute('aria-label', `${label} page ${i + 1} of ${pdf.numPages}`);
      article.style.width = `${viewport.width}px`;
      const sheet = document.createElement('div');
      sheet.className = 'pdf-sheet';
      sheet.style.width = `${viewport.width}px`;
      sheet.style.height = `${viewport.height}px`;
      sheet.style.setProperty('--total-scale-factor', viewport.scale * (viewport.userUnit || 1));
      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      const layer = document.createElement('div');
      layer.className = 'pdf-text-layer';
      const caption = document.createElement('p');
      caption.className = 'pdf-page-caption';
      caption.textContent = `Page ${i + 1} of ${pdf.numPages}`;
      sheet.append(canvas, layer);
      article.append(sheet, caption);
      stack.append(article);
      return { page, viewport, canvas, layer, article };
    });

    try {
      for (let i = 0; i < sheets.length; i++) {
        if (destroyed || version !== generation) return;
        const { page, viewport, canvas, layer, article } = sheets[i];
        // Keep zoom crisp, but cap bitmap memory on high-DPI phones.
        const ratio = Math.min(window.devicePixelRatio || 1, 2,
          Math.sqrt(10_000_000 / (viewport.width * viewport.height)));
        canvas.width = Math.ceil(viewport.width * ratio);
        canvas.height = Math.ceil(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const paint = page.render({
          canvasContext: canvas.getContext('2d', { alpha: false }),
          viewport,
          transform: [ratio, 0, 0, ratio, 0, 0],
          background: '#ffffff',
        });
        activeTasks.add(paint);
        try { await paint.promise; } finally { activeTasks.delete(paint); }
        if (destroyed || version !== generation) return;

        // Native text positions keep the CV selectable and accessible rather
        // than reducing it to an image. Text stays transparent over the canvas.
        const text = new TextLayer({
          textContentSource: await page.getTextContent(),
          container: layer,
          viewport,
        });
        if (destroyed || version !== generation) return;
        // Explicit sizes also cover browsers without CSS round() support.
        layer.style.width = `${viewport.rotation % 180 ? viewport.height : viewport.width}px`;
        layer.style.height = `${viewport.rotation % 180 ? viewport.width : viewport.height}px`;
        activeTasks.add(text);
        try { await text.render(); } finally { activeTasks.delete(text); }
        article.dataset.rendered = 'true';
        onProgress?.(i + 1, pdf.numPages);
      }
    } catch (error) {
      if (destroyed || version !== generation || error.name === 'RenderingCancelledException') return;
      throw error;
    } finally {
      if (version === generation) container.setAttribute('aria-busy', 'false');
    }
  }

  const observer = new ResizeObserver(() => {
    if (Math.abs(container.clientWidth - lastWidth) < 2) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => render().catch(error => onError?.(error)), 160);
  });

  async function destroy() {
    destroyed = true;
    generation++;
    observer.disconnect();
    clearTimeout(resizeTimer);
    cancelRenders();
    await loading.destroy();
  }

  try {
    for (let i = 1; i <= pdf.numPages; i++) pages.push(await pdf.getPage(i));
    await render();
    observer.observe(container);
  } catch (error) {
    await destroy();
    throw error;
  }

  return {
    pageCount: pdf.numPages,
    get zoom() { return zoom; },
    setZoom(value) {
      zoom = Math.max(0.75, Math.min(2, value));
      render().catch(error => onError?.(error));
      return zoom;
    },
    destroy,
  };
}
