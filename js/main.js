// DOM wiring for PassportPic only. All size math lives in sizes.js,
// all crop geometry in crop.js, all colour-key math in colorkey.js,
// all sheet layout in sheet.js, and all drawing in render.js
// (drawPassport, the ONE shared draw function used by BOTH preview
// and export). This module never computes a size, position or pixel
// itself — it only wires controls to those modules.
import { PRESETS, presetById, dimensionText } from './sizes.js';
import { normalizeCropState, clampPan } from './crop.js';
import { layoutSheet, sheetSummary, exportFileName, SHEET_W, SHEET_H } from './sheet.js';
import { drawPassport, drawFaceGuides, drawBefore, drawSamplePortrait, drawSheet } from './render.js';

const $ = (id) => document.getElementById(id);
const PREVIEW_MAX = 520;

let photo = null; // { name, source (canvas|img), width, height }
let view = 'after'; // 'before' | 'after'
let crop = normalizeCropState({ zoom: 1, rotation: 0, panX: 0, panY: 0 });
let dragging = false;
let dragX = 0;
let dragY = 0;

function preset() {
  return presetById($('presetSelect').value);
}

function cropStateFor(frameW, frameH) {
  return {
    frameW,
    frameH,
    bg: $('bgSelect').value,
    zoom: crop.zoom,
    rotation: crop.rotation,
    panX: crop.panX,
    panY: crop.panY,
    cutout: $('cutoutCheck').checked,
    tolerance: Number($('toleranceRange').value),
  };
}

function syncLabels() {
  $('zoomValue').textContent = `${(Number($('zoomRange').value) / 100).toFixed(1)}x`;
  $('rotationValue').textContent = `${$('rotationRange').value}°`;
  $('toleranceValue').textContent = `${$('toleranceRange').value}%`;
  $('toleranceRow').hidden = !$('cutoutCheck').checked;
}

function syncSheet(presetValue) {
  const full = layoutSheet(presetValue.widthPx, presetValue.heightPx, 999);
  $('copyRange').max = String(Math.max(1, full.maxCopies));
  if (Number($('copyRange').value) > full.maxCopies) $('copyRange').value = String(full.maxCopies);
  const layout = layoutSheet(presetValue.widthPx, presetValue.heightPx, Number($('copyRange').value));
  $('copyValue').textContent = `${layout.count} ${layout.count === 1 ? 'copy' : 'copies'}`;
  $('sheetInfoText').textContent = sheetSummary(layout);
  return layout;
}

function renderPreview() {
  const p = preset();
  $('dimensionText').textContent = dimensionText(p);
  $('presetNoteText').textContent = p.note;
  syncSheet(p);
  const canvas = $('previewCanvas');
  const ctx = canvas.getContext('2d');
  if (!photo) {
    canvas.width = 640;
    canvas.height = 480;
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    $('emptyNote').hidden = false;
    $('photoNameText').textContent = 'No photo loaded';
    $('exportBtn').disabled = true;
    $('exportSheetBtn').disabled = true;
    $('statusText').textContent = 'Load a photo or the sample portrait to start.';
    return;
  }
  $('emptyNote').hidden = true;
  const scale = Math.min(1, PREVIEW_MAX / Math.max(p.widthPx, p.heightPx));
  canvas.width = Math.max(1, Math.round(p.widthPx * scale));
  canvas.height = Math.max(1, Math.round(p.heightPx * scale));
  if (!ctx) return;
  // Clamp pan to the preview frame so dragging can never expose the
  // background inside the crop frame.
  const clamped = clampPan(crop.panX, crop.panY, photo.width, photo.height, canvas.width, canvas.height, crop.zoom);
  crop.panX = clamped.panX;
  crop.panY = clamped.panY;
  if (view === 'before') {
    drawBefore(ctx, photo.source, canvas.width, canvas.height);
  } else {
    drawPassport(ctx, photo.source, cropStateFor(canvas.width, canvas.height));
    if ($('guideCheck').checked) drawFaceGuides(ctx, canvas.width, canvas.height);
  }
  $('photoNameText').textContent = `${photo.name} (${photo.width} x ${photo.height} px)`;
  $('exportBtn').disabled = false;
  $('exportSheetBtn').disabled = false;
  $('statusText').textContent = `Ready — ${p.label} · ${view === 'before' ? 'showing original' : 'showing cropped photo'}${$('cutoutCheck').checked && view === 'after' ? ' · background cutout on' : ''}`;
}

function renderAll() {
  syncLabels();
  renderPreview();
}

function resetCrop() {
  crop = normalizeCropState({ zoom: 1, rotation: 0, panX: 0, panY: 0 });
  $('zoomRange').value = '100';
  $('rotationRange').value = '0';
}

function loadSample() {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1000;
  const ctx = canvas.getContext('2d');
  if (ctx) drawSamplePortrait(ctx, canvas.width, canvas.height);
  photo = { name: 'Sample portrait', source: canvas, width: 800, height: 1000 };
  resetCrop();
  renderAll();
}

function filesToPhoto(files) {
  const list = [...files].filter((f) => f.type && f.type.startsWith('image/'));
  if (list.length === 0) return;
  const file = list[0];
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    photo = { name: file.name, source: img, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
    resetCrop();
    renderAll();
  };
  img.onerror = () => { URL.revokeObjectURL(url); };
  img.src = url;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob === 'function') canvas.toBlob((blob) => resolve(blob), type, quality);
    else resolve(null);
  });
}

function triggerDownload(blob, filename) {
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

// Render the cropped photo at full preset resolution. Used by BOTH
// single export and sheet export, so the sheet copies are exactly the
// exported photo, not a second rendering.
function renderFullPhoto() {
  const p = preset();
  const canvas = document.createElement('canvas');
  canvas.width = p.widthPx;
  canvas.height = p.heightPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const k = p.widthPx / Math.max(1, $('previewCanvas').width);
  const state = cropStateFor(p.widthPx, p.heightPx);
  state.panX = crop.panX * k;
  state.panY = crop.panY * k;
  drawPassport(ctx, photo.source, state);
  return canvas;
}

async function exportSingle() {
  if (!photo) return;
  const p = preset();
  const format = $('formatSelect').value;
  const canvas = renderFullPhoto();
  const type = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const blob = await canvasToBlob(canvas, type, 0.92);
  const filename = exportFileName(p.id, format, 'single');
  const ok = triggerDownload(blob, filename);
  $('statusText').textContent = ok
    ? `Exported ${filename} (${p.widthPx} x ${p.heightPx} px) — download started.`
    : `Exported ${filename} (${p.widthPx} x ${p.heightPx} px) — download could not start here (canvas export unavailable).`;
}

async function exportSheet() {
  if (!photo) return;
  const p = preset();
  const cropped = renderFullPhoto();
  const layout = layoutSheet(p.widthPx, p.heightPx, Number($('copyRange').value));
  const canvas = document.createElement('canvas');
  canvas.width = SHEET_W;
  canvas.height = SHEET_H;
  const ctx = canvas.getContext('2d');
  if (ctx) drawSheet(ctx, cropped, layout);
  const blob = await canvasToBlob(canvas, 'image/png');
  const filename = exportFileName(p.id, 'png', 'sheet');
  const ok = triggerDownload(blob, filename);
  $('statusText').textContent = ok
    ? `Exported ${filename} — ${layout.count} copies on a 4 x 6 inch sheet, download started.`
    : `Exported ${filename} — ${layout.count} copies on a 4 x 6 inch sheet, download could not start here (canvas export unavailable).`;
}

function init() {
  $('fileInput').addEventListener('change', (e) => { filesToPhoto(e.target.files); e.target.value = ''; });
  const zone = $('dropZone');
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('drag'); filesToPhoto(e.dataTransfer.files); });
  document.addEventListener('paste', (e) => {
    const items = [...(e.clipboardData?.items || [])].filter((it) => it.type.startsWith('image/'));
    if (items.length === 0) return;
    items.forEach((it) => {
      const file = it.getAsFile();
      if (file) filesToPhoto([file]);
    });
  });
  $('sampleBtn').addEventListener('click', loadSample);
  $('clearBtn').addEventListener('click', () => { photo = null; renderAll(); });
  $('presetSelect').addEventListener('change', () => { crop.panX = 0; crop.panY = 0; renderAll(); });
  $('guideCheck').addEventListener('change', renderAll);
  $('bgSelect').addEventListener('change', renderAll);
  $('cutoutCheck').addEventListener('change', renderAll);
  $('toleranceRange').addEventListener('input', renderAll);
  $('zoomRange').addEventListener('input', () => { crop.zoom = Number($('zoomRange').value) / 100; renderAll(); });
  $('rotationRange').addEventListener('input', () => { crop.rotation = Number($('rotationRange').value); renderAll(); });
  $('resetPosBtn').addEventListener('click', () => { resetCrop(); renderAll(); });
  $('beforeBtn').addEventListener('click', () => { view = 'before'; renderAll(); });
  $('afterBtn').addEventListener('click', () => { view = 'after'; renderAll(); });
  $('copyRange').addEventListener('input', renderAll);
  $('formatSelect').addEventListener('change', renderAll);
  $('exportBtn').addEventListener('click', exportSingle);
  $('exportSheetBtn').addEventListener('click', exportSheet);

  const canvas = $('previewCanvas');
  canvas.addEventListener('pointerdown', (e) => {
    if (!photo) return;
    dragging = true;
    dragX = e.clientX;
    dragY = e.clientY;
    if (typeof canvas.setPointerCapture === 'function' && e.pointerId !== undefined) {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* optional */ }
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || !photo) return;
    crop.panX += e.clientX - dragX;
    crop.panY += e.clientY - dragY;
    dragX = e.clientX;
    dragY = e.clientY;
    renderPreview();
  });
  const endDrag = () => { dragging = false; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (e) => {
    if (!photo) return;
    e.preventDefault();
    const next = crop.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1);
    crop.zoom = normalizeCropState({ zoom: next }).zoom;
    $('zoomRange').value = String(Math.round(crop.zoom * 100));
    renderAll();
  }, { passive: false });

  // Keep the preset list in the HTML and the logic module in sync.
  if ($('presetSelect').options.length !== PRESETS.length) {
    $('statusText').textContent = 'Preset list mismatch — the size list needs attention.';
  }
  renderAll();
}

init();
