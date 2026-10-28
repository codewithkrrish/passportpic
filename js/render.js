// Drawing for PassportPic: the ONE shared draw function used by BOTH
// the preview and the export (drawPassport), plus the face-guide
// overlay (preview only, never exported), the before-view draw, the
// canvas-drawn sample portrait, and the print-sheet draw.
// drawPassport never reads the DOM; it draws onto the ctx given.
// `state` = { frameW, frameH, bg, zoom, rotation, panX, panY, cutout,
// tolerance }. Cutout sampling: the photo's own background colour is
// sampled from its corners on an offscreen canvas and keyed out, so
// the chosen background colour shows through behind the subject.
import { clampPan } from './crop.js';
import { keyOutPixels, sampleCornerColor } from './colorkey.js';
import { SHEET_W, SHEET_H } from './sheet.js';

function defaultCanvas() {
  return document.createElement('canvas');
}

// Draw the cropped photo (frameW x frameH) over the chosen background.
// Returns { width, height, keyed, keyColor, drawW, drawH }.
export function drawPassport(ctx, source, state, opts = {}) {
  const frameW = state.frameW;
  const frameH = state.frameH;
  const transform = clampPan(state.panX, state.panY, source.width, source.height, frameW, frameH, state.zoom);
  ctx.save();
  ctx.fillStyle = state.bg || '#FFFFFF';
  ctx.fillRect(0, 0, frameW, frameH);

  let drawable = source;
  let keyed = false;
  let keyColor = null;
  if (state.cutout) {
    try {
      const createCanvas = opts.createCanvas || defaultCanvas;
      const off = createCanvas();
      off.width = source.width;
      off.height = source.height;
      const octx = off.getContext('2d');
      if (octx && typeof octx.getImageData === 'function') {
        octx.drawImage(source, 0, 0, source.width, source.height);
        const img = octx.getImageData(0, 0, source.width, source.height);
        keyColor = sampleCornerColor(img.data, source.width, source.height);
        if (keyColor) {
          keyOutPixels(img.data, keyColor, state.tolerance);
          octx.putImageData(img, 0, 0);
          drawable = off;
          keyed = true;
        }
      }
    } catch (err) {
      // Cutout is a best-effort assist: fall back to the plain photo.
      drawable = source;
      keyed = false;
      keyColor = null;
    }
  }

  ctx.translate(frameW / 2 + transform.panX, frameH / 2 + transform.panY);
  ctx.rotate(((state.rotation || 0) * Math.PI) / 180);
  ctx.drawImage(drawable, -transform.drawW / 2, -transform.drawH / 2, transform.drawW, transform.drawH);
  ctx.restore();
  return { width: frameW, height: frameH, keyed, keyColor, drawW: transform.drawW, drawH: transform.drawH };
}

// Face-guide overlay for the crop preview (never exported): an oval
// for the head, a horizontal eye line, top/bottom head-height lines,
// and a vertical centre line. Returns the guide geometry so callers
// and tests can describe it.
export function drawFaceGuides(ctx, w, h) {
  const cx = w / 2;
  const cy = h * 0.44;
  const rx = w * 0.31;
  const ry = h * 0.33;
  const eyeY = cy - ry * 0.25;
  ctx.save();
  ctx.strokeStyle = '#E5484D';
  ctx.lineWidth = Math.max(1.5, w * 0.004);
  if (typeof ctx.setLineDash === 'function') ctx.setLineDash([6, 4]);
  ctx.beginPath();
  if (typeof ctx.ellipse === 'function') ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  else ctx.arc(cx, cy, Math.min(rx, ry), 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - rx, eyeY); ctx.lineTo(cx + rx, eyeY);
  ctx.moveTo(cx, cy - ry); ctx.lineTo(cx, cy + ry);
  ctx.moveTo(cx - rx, cy - ry); ctx.lineTo(cx + rx, cy - ry);
  ctx.moveTo(cx - rx, cy + ry); ctx.lineTo(cx + rx, cy + ry);
  ctx.stroke();
  ctx.restore();
  return { cx, cy, rx, ry, eyeY };
}

// Before view: the original photo fitted inside the frame, unmodified.
export function drawBefore(ctx, source, frameW, frameH) {
  ctx.save();
  ctx.fillStyle = '#121218';
  ctx.fillRect(0, 0, frameW, frameH);
  const scale = Math.min(frameW / source.width, frameH / source.height);
  const dw = source.width * scale;
  const dh = source.height * scale;
  ctx.drawImage(source, (frameW - dw) / 2, (frameH - dh) / 2, dw, dh);
  ctx.restore();
  return { width: frameW, height: frameH };
}

// The canvas-drawn sample portrait: a plain light-blue background (so
// the cutout assist has something even to work on) with a simple
// front-facing person, head centred for the face guides.
export function drawSamplePortrait(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#DCE9F5');
  g.addColorStop(1, '#B9D2E8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2;
  const skin = '#E9B98C';
  const hair = '#2B2B33';
  // Shoulders / shirt.
  ctx.fillStyle = '#37415C';
  ctx.beginPath();
  ctx.ellipse(cx, h * 1.08, w * 0.44, h * 0.30, 0, 0, Math.PI * 2);
  ctx.fill();
  // Shirt collar V.
  ctx.fillStyle = '#F5F5F7';
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.09, h * 0.78);
  ctx.lineTo(cx + w * 0.09, h * 0.78);
  ctx.lineTo(cx, h * 0.90);
  ctx.closePath();
  ctx.fill();
  // Neck.
  ctx.fillStyle = skin;
  ctx.fillRect(cx - w * 0.055, h * 0.52, w * 0.11, h * 0.14);
  // Head.
  ctx.beginPath();
  ctx.ellipse(cx, h * 0.36, w * 0.21, h * 0.20, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hair cap over the top of the head.
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(cx, h * 0.26, w * 0.215, h * 0.115, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - w * 0.215, h * 0.26, w * 0.43, h * 0.03);
  // Brows, eyes, nose, mouth.
  ctx.strokeStyle = hair;
  ctx.lineWidth = Math.max(2, w * 0.006);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.13, h * 0.335); ctx.lineTo(cx - w * 0.05, h * 0.325);
  ctx.moveTo(cx + w * 0.05, h * 0.325); ctx.lineTo(cx + w * 0.13, h * 0.335);
  ctx.stroke();
  ctx.fillStyle = '#1A1A20';
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.09, h * 0.365, w * 0.016, h * 0.012, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + w * 0.09, h * 0.365, w * 0.016, h * 0.012, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#B98A5E';
  ctx.beginPath();
  ctx.moveTo(cx, h * 0.38); ctx.lineTo(cx, h * 0.43);
  ctx.stroke();
  ctx.strokeStyle = '#8A4A3A';
  ctx.beginPath();
  ctx.arc(cx, h * 0.47, w * 0.05, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  return { width: w, height: h };
}

// Print sheet: white 4 x 6 inch sheet with the cropped photo repeated
// at the layout positions.
export function drawSheet(ctx, photoCanvas, layout) {
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, SHEET_W, SHEET_H);
  for (const pos of layout.positions) {
    ctx.drawImage(photoCanvas, pos.x, pos.y, pos.w, pos.h);
  }
  ctx.restore();
  return { width: SHEET_W, height: SHEET_H, count: layout.count };
}
