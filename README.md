# pasfoto

A small browser-based passport photo layout tool that lets you import images, choose pack formats, crop/pan/zoom, and export arranged sheets as JPEG/PNG/WebP.

## Features

- Drag-and-drop image import.
- Multiple pack layouts (p1..p9) for passport or ID photo sheets.
- Interactive touch/mouse pan + pinch-style controls via buttons.
- Output format toggle: `jpeg`, `png`, `webp`.
- Quality slider with mouse wheel / clicks.
- Save individually generated sheets and clear session.

## How to use

1. Open `index.html` in a modern browser (Chrome/Edge/Firefox/Safari).
2. Drag images into the center area or click **open** to select files.
3. For each image card:
   - Use `p1..p9` to select the output pack layout.
   - Use arrow move buttons and zoom buttons to adjust framing.
   - Drag directly in the canvas to pan the crop area.
4. Choose output format by clicking **format** (cycles through JPG/PNG/WebP).
5. Adjust quality with **quality** (+/- or mouse wheel; disabled for PNG).
6. Click **save** to download images in selected format.
7. Click **clear** to reset.

## Supported input image formats

- AVIF, BMP, GIF, ICO, JPEG, PNG, SVG, WebP

## Notes

- The app is zero-dependency JavaScript embedded in a single `index.html`.
- Recommended for local use; use via HTTP server if browser blocks local file access.

## License

MIT
