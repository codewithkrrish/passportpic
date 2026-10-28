// Official photo sizes for PassportPic. Pure math, no DOM.
// Pixel dimensions are computed at 300 DPI, the print standard most
// photo studios and online visa forms ask for. Millimetres convert
// as px = round(mm / 25.4 * 300); inches as px = round(in * 300).

export const DPI = 300;

export function mmToPx(mm) {
  if (!Number.isFinite(mm) || mm <= 0) return 0;
  return Math.round((mm / 25.4) * DPI);
}

export function inchToPx(inches) {
  if (!Number.isFinite(inches) || inches <= 0) return 0;
  return Math.round(inches * DPI);
}

export const PRESETS = [
  {
    id: 'india-passport',
    label: 'India Passport',
    sizeLabel: '2 x 2 inch (51 x 51 mm)',
    widthPx: inchToPx(2),
    heightPx: inchToPx(2),
    note: 'The standard 2 x 2 inch passport specification used across India.',
  },
  {
    id: 'us-visa',
    label: 'US Visa',
    sizeLabel: '2 x 2 inch (51 x 51 mm)',
    widthPx: inchToPx(2),
    heightPx: inchToPx(2),
    note: 'US visa photographs are 2 x 2 inches, head centred, plain background.',
  },
  {
    id: 'uk-visa',
    label: 'UK Visa',
    sizeLabel: '35 x 45 mm',
    widthPx: mmToPx(35),
    heightPx: mmToPx(45),
    note: 'UK visa and passport photographs are 35 x 45 mm.',
  },
  {
    id: 'schengen-visa',
    label: 'Schengen Visa',
    sizeLabel: '35 x 45 mm',
    widthPx: mmToPx(35),
    heightPx: mmToPx(45),
    note: 'Schengen visa photographs are 35 x 45 mm.',
  },
  {
    id: 'pan-card',
    label: 'PAN Card',
    sizeLabel: '25 x 35 mm',
    widthPx: mmToPx(25),
    heightPx: mmToPx(35),
    note: 'PAN application photographs are commonly submitted at 25 x 35 mm.',
  },
  {
    id: 'aadhaar-style',
    label: 'Aadhaar-style crop',
    sizeLabel: '35 x 45 mm',
    widthPx: mmToPx(35),
    heightPx: mmToPx(45),
    note: 'A commonly requested 35 x 45 mm crop. UIDAI does not publish an official photo size, so check current enrolment guidance before submitting.',
  },
];

export function presetById(id) {
  return PRESETS.find((p) => p.id === id) || PRESETS[0];
}

export function aspect(preset) {
  return preset.widthPx / preset.heightPx;
}

// "600 x 600 px at 300 DPI (2 x 2 inch (51 x 51 mm))"
export function dimensionText(preset) {
  return `${preset.widthPx} x ${preset.heightPx} px at ${DPI} DPI (${preset.sizeLabel})`;
}
