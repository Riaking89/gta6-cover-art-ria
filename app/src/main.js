// Vice Cover Studio — editor UI wiring (original code, written for this entry).
// Photo tray, panel assignment, drag-to-pan / wheel-to-zoom, layout + grade
// controls, caption editing and PNG export at three exact sizes.

import { renderCover, layoutRects } from './cover.js';

const SAMPLES = [
  { name: 'Boulevard', src: 'samples/boulevard.jpg' },
  { name: 'Pier', src: 'samples/pier.jpg' },
  { name: 'Beach', src: 'samples/beach.jpg' },
  { name: 'Skyline', src: 'samples/skyline.jpg' },
];

const state = {
  layout: 'poster',
  title: 'VICE CITY',
  subtitle: 'Welcome to Leonida',
  titleSize: 1,
  titleColor: 'white',
  grade: 'sunset',
  halftone: true,
  grain: true,
  photos: [],          // { name, img, src }
  panels: [],          // { photo: index, img, zoom, ox, oy }
  selectedPanel: 0,
  selectedPhoto: 0,
};

const preview = document.getElementById('preview');
const pctx = preview.getContext('2d');
const tray = document.getElementById('tray');
const statusEl = document.getElementById('status');
const panelLabel = document.getElementById('panel-label');

function setStatus(msg) {
  statusEl.textContent = msg;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load ' + src));
    img.src = src;
  });
}

function render() {
  renderCover(pctx, preview.width, preview.height, state);
  syncPanelControls();
}

function syncPanelControls() {
  const p = state.panels[state.selectedPanel];
  if (!p) return;
  panelLabel.textContent = 'Panel ' + (state.selectedPanel + 1) + ' — ' +
    (state.photos[p.photo] ? state.photos[p.photo].name : 'empty');
  document.getElementById('zoom').value = p.zoom;
  document.getElementById('zoom-val').textContent = p.zoom.toFixed(2) + '×';
  document.getElementById('panx').value = Math.round(p.ox * 100);
  document.getElementById('pany').value = Math.round(p.oy * 100);
}

function renderTray() {
  tray.innerHTML = '';
  state.photos.forEach((ph, i) => {
    const btn = document.createElement('button');
    btn.className = 'thumb' + (i === state.selectedPhoto ? ' selected' : '');
    btn.type = 'button';
    const img = document.createElement('img');
    img.src = ph.src;
    img.alt = ph.name;
    btn.appendChild(img);
    const cap = document.createElement('span');
    cap.textContent = ph.name;
    btn.appendChild(cap);
    btn.addEventListener('click', () => {
      state.selectedPhoto = i;
      assignSelectedPhoto();
      renderTray();
    });
    tray.appendChild(btn);
  });
}

// Click a tray photo, then it is assigned to the currently selected panel.
function assignSelectedPhoto() {
  const p = state.panels[state.selectedPanel];
  const ph = state.photos[state.selectedPhoto];
  if (!p || !ph) return;
  p.photo = state.selectedPhoto;
  p.img = ph.img;
  p.zoom = 1; p.ox = 0; p.oy = 0;
  setStatus('Photo "' + ph.name + '" assigned to panel ' + (state.selectedPanel + 1) + '.');
  render();
}

async function loadSamples() {
  state.photos = [];
  for (const s of SAMPLES) {
    try {
      const img = await loadImage(s.src);
      state.photos.push({ name: s.name, img, src: s.src });
    } catch (e) {
      setStatus('Sample failed to load: ' + s.name);
    }
  }
  const n = layoutRects(state.layout).length;
  state.panels = [];
  for (let i = 0; i < 4; i++) {
    const ph = state.photos[i % state.photos.length];
    state.panels.push({ photo: i % state.photos.length, img: ph ? ph.img : null, zoom: 1, ox: 0, oy: 0 });
  }
  state.selectedPhoto = 0;
  state.selectedPanel = 0;
  renderTray();
  render();
  setStatus('4 sample photos loaded — Poster layout. Click a photo, then a panel, to swap it.');
}

// Panel hit-testing on the preview canvas (same unit rects as the renderer).
function panelAt(clientX, clientY) {
  const r = preview.getBoundingClientRect();
  const x = (clientX - r.left) / r.width;
  const y = (clientY - r.top) / r.height;
  const rects = layoutRects(state.layout);
  for (let i = rects.length - 1; i >= 0; i--) {
    const [rx, ry, rw, rh] = rects[i];
    if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) return i;
  }
  return -1;
}

let dragging = false;
let dragPanel = -1;
let lastX = 0;
let lastY = 0;

preview.addEventListener('pointerdown', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  if (i < 0) return;
  state.selectedPanel = i;
  // Clicking a panel assigns the selected tray photo to it.
  assignSelectedPhoto();
  dragging = true;
  dragPanel = i;
  lastX = e.clientX; lastY = e.clientY;
  preview.setPointerCapture(e.pointerId);
});

preview.addEventListener('pointermove', (e) => {
  if (!dragging || dragPanel < 0) return;
  const r = preview.getBoundingClientRect();
  const p = state.panels[dragPanel];
  if (!p) return;
  p.ox += (e.clientX - lastX) / r.width;
  p.oy += (e.clientY - lastY) / r.height;
  p.ox = Math.max(-0.6, Math.min(0.6, p.ox));
  p.oy = Math.max(-0.6, Math.min(0.6, p.oy));
  lastX = e.clientX; lastY = e.clientY;
  render();
});

preview.addEventListener('pointerup', () => { dragging = false; dragPanel = -1; });

preview.addEventListener('wheel', (e) => {
  e.preventDefault();
  const i = panelAt(e.clientX, e.clientY);
  const p = state.panels[i < 0 ? state.selectedPanel : i];
  if (!p) return;
  p.zoom = Math.max(0.6, Math.min(3, p.zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
  render();
}, { passive: false });

function bind(id, fn) {
  document.getElementById(id).addEventListener('input', fn);
  document.getElementById(id).addEventListener('change', fn);
}

bind('title', (e) => { state.title = e.target.value; render(); });
bind('subtitle', (e) => { state.subtitle = e.target.value; render(); });
bind('title-size', (e) => {
  state.titleSize = Number(e.target.value);
  document.getElementById('title-size-val').textContent = state.titleSize.toFixed(2) + '×';
  render();
});
bind('zoom', (e) => {
  const p = state.panels[state.selectedPanel];
  if (p) { p.zoom = Number(e.target.value); render(); }
});
bind('panx', (e) => {
  const p = state.panels[state.selectedPanel];
  if (p) { p.ox = Number(e.target.value) / 100; render(); }
});
bind('pany', (e) => {
  const p = state.panels[state.selectedPanel];
  if (p) { p.oy = Number(e.target.value) / 100; render(); }
});

document.querySelectorAll('[data-layout]').forEach((b) => {
  b.addEventListener('click', () => {
    state.layout = b.dataset.layout;
    document.querySelectorAll('[data-layout]').forEach((x) => x.classList.toggle('active', x === b));
    render();
    setStatus('Layout: ' + b.textContent + '.');
  });
});

document.querySelectorAll('[data-grade]').forEach((b) => {
  b.addEventListener('click', () => {
    state.grade = b.dataset.grade;
    document.querySelectorAll('[data-grade]').forEach((x) => x.classList.toggle('active', x === b));
    render();
    setStatus('Grade: ' + b.textContent + '.');
  });
});

document.querySelectorAll('[data-color]').forEach((b) => {
  b.addEventListener('click', () => {
    state.titleColor = b.dataset.color;
    document.querySelectorAll('[data-color]').forEach((x) => x.classList.toggle('active', x === b));
    render();
  });
});

document.getElementById('halftone').addEventListener('change', (e) => { state.halftone = e.target.checked; render(); });
document.getElementById('grain').addEventListener('change', (e) => { state.grain = e.target.checked; render(); });

document.getElementById('use-samples').addEventListener('click', loadSamples);
document.getElementById('clear-photos').addEventListener('click', () => {
  state.photos = [];
  state.panels.forEach((p) => { p.img = null; p.photo = -1; });
  renderTray();
  render();
  setStatus('Photos cleared — upload your own or use the samples.');
});

document.getElementById('upload').addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []).slice(0, 6 - state.photos.length);
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    const src = await new Promise((res) => {
      const rd = new FileReader();
      rd.onload = () => res(rd.result);
      rd.readAsDataURL(f);
    });
    try {
      const img = await loadImage(src);
      state.photos.push({ name: f.name.replace(/\.[^.]+$/, '').slice(0, 18), img, src });
    } catch (err) { setStatus('Could not read ' + f.name); }
  }
  if (state.photos.length) {
    state.selectedPhoto = state.photos.length - 1;
    renderTray();
    render();
    setStatus(state.photos.length + ' photo(s) in the tray. Click one, then click a panel.');
  }
  e.target.value = '';
});

// Export: render offscreen at the exact size, download a PNG.
export function exportPNG(w, h) {
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  renderCover(off.getContext('2d'), w, h, state);
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'vice-cover-' + w + 'x' + h + '.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      setStatus('Exported ✓ ' + w + '×' + h + ' PNG.');
      resolve(blob);
    }, 'image/png');
  });
}

document.getElementById('exp-square').addEventListener('click', () => exportPNG(1080, 1080));
document.getElementById('exp-portrait').addEventListener('click', () => exportPNG(1080, 1350));
document.getElementById('exp-wide').addEventListener('click', () => exportPNG(1920, 1080));

// Expose state for automated checks.
window.__viceState = state;
window.__viceExport = exportPNG;

loadSamples();
