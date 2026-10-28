// Colour-key math for PassportPic's background cutout assist. Pure
// functions over RGB values and pixel arrays — no DOM, no canvas.
// The assist keys out pixels near a sampled background colour; it is a
// simple distance cut, so it works best on plain, even backgrounds and
// will eat hair edges and patterned shirts. That limit is stated in the
// UI and the README, not hidden.

export const MAX_RGB_DISTANCE = Math.sqrt(3 * 255 * 255); // 441.67…

export function hexToRgb(hex) {
  if (typeof hex !== 'string') return null;
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const h = m[1];
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function colorDistance(c1, c2) {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// Tolerance is 0-100 (slider units). 0 keys out only the exact colour,
// 100 keys out everything.
export function keyThreshold(tolerance) {
  const t = Number.isFinite(tolerance) ? Math.min(100, Math.max(0, tolerance)) : 0;
  return (t / 100) * MAX_RGB_DISTANCE;
}

export function shouldKeyOut(pixel, key, tolerance) {
  if (!key) return false;
  return colorDistance(pixel, key) <= keyThreshold(tolerance);
}

// Mutates the RGBA array in place: keyed pixels become transparent.
// Returns the number of pixels keyed out.
export function keyOutPixels(data, key, tolerance) {
  if (!key || !data || data.length % 4 !== 0) return 0;
  const threshold = keyThreshold(tolerance);
  let keyed = 0;
  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - key.r;
    const dg = data[i + 1] - key.g;
    const db = data[i + 2] - key.b;
    if (Math.sqrt(dr * dr + dg * dg + db * db) <= threshold) {
      data[i + 3] = 0;
      keyed += 1;
    }
  }
  return keyed;
}

// Average the four corners of an RGBA buffer (used to sample the
// photo's own background colour). cornerPx is how many pixels in from
// each corner are averaged; the buffer is w x h pixels.
export function sampleCornerColor(data, w, h, cornerPx = 8) {
  if (!data || w <= 0 || h <= 0) return null;
  const n = Math.min(cornerPx, Math.floor(w / 2), Math.floor(h / 2));
  if (n <= 0) return null;
  let r = 0, g = 0, b = 0, count = 0;
  const at = (x, y) => {
    const i = (y * w + x) * 4;
    r += data[i]; g += data[i + 1]; b += data[i + 2]; count += 1;
  };
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      at(x, y);
      at(w - 1 - x, y);
      at(x, h - 1 - y);
      at(w - 1 - x, h - 1 - y);
    }
  }
  if (count === 0) return null;
  return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) };
}
