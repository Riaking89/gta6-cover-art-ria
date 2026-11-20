// Vice Cover Studio — cover renderer (original code, written for this entry).
// renderCover(ctx, W, H, state) paints a multi-panel GTA-style poster cover:
// photos cover-fit into layout panels, a warm Vice City grade, halftone +
// seeded grain, then a big Anton title with gradient fill and dark outline.

export const GRADES = {
  sunset: {
    filter: 'saturate(1.4) contrast(1.15) sepia(0.25) hue-rotate(-8deg)',
    overlay: ['rgba(255,0,128,0.16)', 'rgba(255,120,0,0.14)', 'rgba(255,200,60,0.12)'],
  },
  neon: {
    filter: 'saturate(1.7) contrast(1.2) hue-rotate(12deg)',
    overlay: ['rgba(255,0,180,0.20)', 'rgba(0,200,255,0.14)', 'rgba(120,0,255,0.12)'],
  },
  gold: {
    filter: 'saturate(1.3) contrast(1.1) sepia(0.45) hue-rotate(-12deg)',
    overlay: ['rgba(255,180,0,0.18)', 'rgba(255,140,0,0.12)', 'rgba(255,220,120,0.10)'],
  },
  noir: {
    filter: 'grayscale(1) contrast(1.28) brightness(1.06)',
    overlay: ['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.06)', 'rgba(255,255,255,0.04)'],
  },
};

export const TITLE_COLORS = {
  white: ['#ffffff', '#ffe9a8'],
  gold: ['#ffe27a', '#ff9d00'],
  pink: ['#ff7ad9', '#ff2e88'],
};

// Panel rectangles in unit coordinates (x, y, w, h), gutter applied by caller.
export function layoutRects(layout) {
  if (layout === 'grid') {
    return [
      [0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5],
      [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5],
    ];
  }
  if (layout === 'strip') {
    return [
      [0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1],
    ];
  }
  if (layout === 'hero') {
    return [[0, 0, 1, 1]];
  }
  // poster (default): big hero top-left, two small top-right, wide bottom strip
  return [
    [0, 0, 0.62, 0.60],
    [0.62, 0, 0.38, 0.295],
    [0.62, 0.295, 0.38, 0.305],
    [0, 0.60, 1, 0.40],
  ];
}

// Deterministic PRNG so exports are byte-stable for the same inputs.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Draw one photo cover-fit into a rect, honouring per-panel zoom and pan.
// ox/oy are fractions of the panel size; zoom 1 = fit exactly.
export function drawPanelPhoto(ctx, img, rect, panel) {
  const [x, y, w, h] = rect;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(w / iw, h / ih) * (panel.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = x + (w - dw) / 2 + (panel.ox || 0) * w;
  const dy = y + (h - dh) / 2 + (panel.oy || 0) * h;
  ctx.drawImage(img, dx, dy, dw, dh);
}

// Warm grade: canvas filter while drawing, then a vertical colour wash.
export function applyViceGrade(ctx, rect, gradeName) {
  const grade = GRADES[gradeName] || GRADES.sunset;
  const [x, y, w, h] = rect;
  const wash = ctx.createLinearGradient(x, y, x, y + h);
  grade.overlay.forEach((c, i) => wash.addColorStop(i / (grade.overlay.length - 1), c));
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);
  // Vignette: darken the panel edges.
  const vg = ctx.createRadialGradient(
    x + w / 2, y + h / 2, Math.min(w, h) * 0.35,
    x + w / 2, y + h / 2, Math.max(w, h) * 0.75,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(20,0,20,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(x, y, w, h);
}

// Halftone dots clipped to the panel, low alpha, for a printed-poster feel.
export function drawHalftone(ctx, rect, W) {
  const [x, y, w, h] = rect;
  const step = Math.max(10, W * 0.014);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  for (let gy = y + step / 2; gy < y + h; gy += step) {
    for (let gx = x + step / 2; gx < x + w; gx += step) {
      ctx.beginPath();
      ctx.arc(gx, gy, step * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Fine film grain from the seeded PRNG — same input, same output.
export function drawGrain(ctx, W, H, seed) {
  const rand = mulberry32(seed);
  const n = Math.floor((W * H) / 900);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const v = rand() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},0.05)`;
    ctx.fillRect(rand() * W, rand() * H, 1.6, 1.6);
  }
  ctx.restore();
}

// Big display title: gradient fill, thick dark outline, drop shadow.
export function drawTitle(ctx, W, H, state) {
  const title = (state.title || 'VICE CITY').toUpperCase();
  const subtitle = state.subtitle || '';
  const base = W * 0.105 * (state.titleSize || 1);
  const bandH = H * 0.16;
  const bandY = H - bandH;
  // Caption band: dark translucent strip so the title stays legible on any photo.
  const band = ctx.createLinearGradient(0, bandY, 0, H);
  band.addColorStop(0, 'rgba(10,0,16,0)');
  band.addColorStop(0.35, 'rgba(10,0,16,0.72)');
  band.addColorStop(1, 'rgba(10,0,16,0.88)');
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, W, bandH);

  const [c1, c2] = TITLE_COLORS[state.titleColor] || TITLE_COLORS.white;
  const grad = ctx.createLinearGradient(0, H - bandH * 0.82, 0, H - bandH * 0.12);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${Math.round(base)}px Anton, 'Arial Black', sans-serif`;
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = base * 0.12;
  ctx.shadowOffsetY = base * 0.05;
  // Thick dark outline via several stroke passes, then the gradient fill.
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, base * 0.09);
  ctx.strokeStyle = '#14001a';
  const tx = W * 0.045;
  const ty = H - bandH * 0.30;
  ctx.strokeText(title, tx, ty);
  ctx.strokeText(title, tx, ty);
  ctx.fillStyle = grad;
  ctx.fillText(title, tx, ty);
  ctx.restore();

  if (subtitle) {
    ctx.save();
    ctx.font = `bold ${Math.round(W * 0.028)}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd76a';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.fillText(subtitle.toUpperCase(), W * 0.048, H - bandH * 0.08);
    ctx.restore();
  }
  // Small original corner badges.
  ctx.save();
  ctx.font = `bold ${Math.round(W * 0.02)}px Arial, Helvetica, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.textAlign = 'left';
  ctx.fillText('EST. 2026', W * 0.03, H * 0.045);
  ctx.textAlign = 'right';
  ctx.fillText('LEONIDA', W * 0.97, H * 0.045);
  ctx.restore();
}

// The single cover painter: state -> a finished poster on ctx at W x H.
export function renderCover(ctx, W, H, state) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  const rects = layoutRects(state.layout || 'poster');
  const gutter = Math.max(4, W * 0.008);
  // Deep plum backdrop shows through as the white gutters.
  ctx.save();
  ctx.fillStyle = '#f5efe6';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  const panels = state.panels || [];
  rects.forEach((unit, i) => {
    const panel = panels[i];
    if (!panel || !panel.img) return;
    const px = unit[0] * W + (unit[0] === 0 ? 0 : gutter / 2);
    const py = unit[1] * H + (unit[1] === 0 ? 0 : gutter / 2);
    const pw = unit[2] * W - (unit[0] === 0 || unit[0] + unit[2] >= 1 ? gutter / 2 : gutter);
    const ph = unit[3] * H - (unit[1] === 0 || unit[1] + unit[3] >= 1 ? gutter / 2 : gutter);
    const rect = [px, py, pw, ph];
    ctx.save();
    // Tiny alternating tilt for dynamism; kept small so text stays legible.
    const rot = ((i % 2 === 0 ? -1 : 1) * 0.6 * Math.PI) / 180;
    ctx.translate(px + pw / 2, py + ph / 2);
    ctx.rotate(rot);
    ctx.translate(-(px + pw / 2), -(py + ph / 2));
    ctx.beginPath();
    ctx.rect(px, py, pw, ph);
    ctx.clip();
    ctx.filter = grade.filter;
    drawPanelPhoto(ctx, panel.img, rect, panel);
    ctx.filter = 'none';
    // Subtle panel shadow (drawn inside the clip, along the edges).
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = Math.max(2, W * 0.003);
    ctx.strokeRect(px, py, pw, ph);
    applyViceGrade(ctx, rect, state.grade || 'sunset');
    if (state.halftone !== false) drawHalftone(ctx, rect, W);
    ctx.restore();
  });

  if (state.grain !== false) drawGrain(ctx, W, H, 20261120);
  drawTitle(ctx, W, H, state);
}
