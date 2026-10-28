# PassportPic

I built PassportPic because getting a passport photo always meant a trip to a
studio, even when I already had a perfectly good photo on my phone. It crops
your photo to official passport and visa sizes right in the browser — no
upload, no account, no waiting.

## What it does

- Official size presets at 300 DPI: India Passport (2 x 2 inch), US Visa
  (2 x 2 inch), UK Visa (35 x 45 mm), Schengen Visa (35 x 45 mm), PAN Card
  (25 x 35 mm), and a 35 x 45 mm Aadhaar-style crop.
- Drag to position, scroll to zoom, rotate up to 45 degrees. Panning is
  clamped so the crop frame is always fully covered by your photo.
- A face guide overlay (head oval, eye line, head-height lines) you can
  toggle while framing.
- Background colour: white, light blue, or light grey. An optional cutout
  assist keys out the photo's own background colour so the new colour shows
  through behind you.
- Before/after comparison, single photo export as PNG or JPEG at the exact
  preset size, and a 4 x 6 inch print sheet (1200 x 1800 px) with your
  chosen number of copies.
- A canvas-drawn sample portrait, so you can try everything without
  uploading a real photo.

## Honest limitations

- The cutout assist is a simple colour-distance cut, not real subject
  segmentation. It works well on plain, even backgrounds and will soften
  hair edges, eat patterned shirts, and struggle with busy backgrounds.
  If your photo has a busy background, take a new one against a plain wall
  instead of fighting the slider.
- Size presets follow the commonly published specifications, but official
  requirements change and some forms add their own rules (head size,
  background shade, recency). Check the form you are submitting to before
  you print — the Aadhaar-style crop in particular is a commonly requested
  size, not a published UIDAI specification.
- JPEG export uses quality 0.92, which is close to but not bit-identical
  to a studio print file. For printing, PNG or the print sheet is the
  safer choice.
- Everything runs locally in your browser, so a very large photo (say,
  over 20 megapixels) can feel slow on a weak phone. Smaller source files
  work better.

## How it is put together

Vanilla JavaScript ES modules, no build step, no dependencies, no tracking.
`js/sizes.js` holds the presets and DPI math, `js/crop.js` the crop
geometry, `js/colorkey.js` the colour-key math, `js/sheet.js` the print
sheet layout, `js/render.js` the single draw function shared by preview
and export, and `js/main.js` only wires the DOM. Open `index.html` in any
modern browser and it just works.

## Privacy

Your photos are processed locally in your browser and never uploaded. There
is no server, no storage, and nothing to sign up for.

## License

MIT. See `LICENSE`.
