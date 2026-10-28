// Crop geometry for PassportPic. Pure math, no DOM.
// Model: the photo is drawn to COVER the crop frame (never letterboxed)
// at a base scale, then multiplied by the zoom. Panning is clamped so
// the frame always stays fully covered. Pan is in frame pixels, relative
// to the frame centre. Rotation is clamped but deliberately ignored by
// the coverage clamp: rotating a covered photo can only expose corners,
// so the unrotated bound is the safe, conservative limit.

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
export const MIN_ROTATION = -45;
export const MAX_ROTATION = 45;

function finiteOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

export function clampZoom(zoom) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, finiteOr(zoom, MIN_ZOOM)));
}

export function clampRotation(rotation) {
  return Math.min(MAX_ROTATION, Math.max(MIN_ROTATION, finiteOr(rotation, 0)));
}

export function clampPanValue(v) {
  return finiteOr(v, 0);
}

// Normalise a crop state without knowing the photo/frame: zoom and
// rotation are clamped, pan is kept finite (coverage clamping happens
// in clampPan once dimensions are known).
export function normalizeCropState(input = {}) {
  return {
    zoom: clampZoom(input.zoom),
    rotation: clampRotation(input.rotation),
    panX: clampPanValue(input.panX),
    panY: clampPanValue(input.panY),
  };
}

// Base cover scale: the photo must at least fill the frame.
export function coverScale(sourceW, sourceH, frameW, frameH) {
  if (sourceW <= 0 || sourceH <= 0 || frameW <= 0 || frameH <= 0) return 1;
  return Math.max(frameW / sourceW, frameH / sourceH);
}

// Clamp pan so the drawn photo still covers the frame, and report the
// drawn size. Returns { panX, panY, drawW, drawH, scale, maxPanX, maxPanY }.
export function clampPan(panX, panY, sourceW, sourceH, frameW, frameH, zoom) {
  const z = clampZoom(zoom);
  const scale = coverScale(sourceW, sourceH, frameW, frameH) * z;
  const drawW = sourceW * scale;
  const drawH = sourceH * scale;
  const maxPanX = Math.max(0, (drawW - frameW) / 2);
  const maxPanY = Math.max(0, (drawH - frameH) / 2);
  return {
    panX: Math.min(maxPanX, Math.max(-maxPanX, finiteOr(panX, 0))),
    panY: Math.min(maxPanY, Math.max(-maxPanY, finiteOr(panY, 0))),
    drawW,
    drawH,
    scale,
    maxPanX,
    maxPanY,
  };
}
