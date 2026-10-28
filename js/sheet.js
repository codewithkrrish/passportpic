// Print-sheet layout for PassportPic. Pure math, no DOM.
// A sheet is 4 x 6 inches at 300 DPI = 1200 x 1800 px. Copies are laid
// out in a centred grid; both orientations are tried and the one that
// fits more copies wins (ties keep portrait orientation, matching the
// sheet). A copy that fits nowhere yields count 0, never a partial draw.

export const SHEET_W = 1200; // 4 inch at 300 DPI
export const SHEET_H = 1800; // 6 inch at 300 DPI

function gridFor(copyW, copyH) {
  const cols = Math.floor(SHEET_W / copyW);
  const rows = Math.floor(SHEET_H / copyH);
  return { cols, rows, count: cols * rows };
}

export function layoutSheet(copyW, copyH, requested) {
  const want = Number.isFinite(requested) ? Math.max(0, Math.floor(requested)) : 0;
  if (copyW <= 0 || copyH <= 0) {
    return { cols: 0, rows: 0, count: 0, positions: [], orientation: 'portrait', sheetW: SHEET_W, sheetH: SHEET_H, maxCopies: 0 };
  }
  const portrait = gridFor(copyW, copyH);
  const landscape = gridFor(copyH, copyW);
  // Landscape is only possible when the swapped size fits the sheet.
  const landscapeFits = copyH <= SHEET_W && copyW <= SHEET_H;
  const useLandscape = landscapeFits && landscape.count > portrait.count;
  const chosen = useLandscape ? landscape : portrait;
  const w = useLandscape ? copyH : copyW;
  const h = useLandscape ? copyW : copyH;
  const count = Math.min(want, chosen.count);
  const positions = [];
  if (count > 0 && chosen.cols > 0) {
    const gridW = chosen.cols * w;
    const gridH = chosen.rows * h;
    const offsetX = (SHEET_W - gridW) / 2;
    const offsetY = (SHEET_H - gridH) / 2;
    let placed = 0;
    for (let row = 0; row < chosen.rows && placed < count; row += 1) {
      for (let col = 0; col < chosen.cols && placed < count; col += 1) {
        positions.push({ x: offsetX + col * w, y: offsetY + row * h, w, h });
        placed += 1;
      }
    }
  }
  return {
    cols: chosen.cols,
    rows: chosen.rows,
    count,
    positions,
    orientation: useLandscape ? 'landscape' : 'portrait',
    sheetW: SHEET_W,
    sheetH: SHEET_H,
    maxCopies: chosen.count,
  };
}

export function sheetSummary(layout) {
  if (layout.count === 0) return 'This size does not fit a 4 x 6 inch sheet.';
  return `4 x 6 inch sheet: ${layout.count} of ${layout.maxCopies} copies fit (${layout.cols} x ${layout.rows} grid, ${layout.orientation}).`;
}

export function exportFileName(presetId, format, kind) {
  const safe = String(presetId || 'photo').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  if (kind === 'sheet') return `passportpic-${safe}-4x6-sheet.png`;
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  return `passportpic-${safe}.${ext}`;
}
