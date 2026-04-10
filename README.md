# pasfoto

A lightweight browser-based passport photo pack generator.

## Features

- Drag and drop images or open them using the `open` button.
- Build printable passport photo packs in multiple layouts: `p1` through `p9`.
- Choose between regular and full pack sizes.
- Pan, zoom, rotate, and fine-tune the photo position in the preview canvas.
- Export final images as `jpeg`, `png`, or `webp` with adjustable quality.
- Save directly using the browser download flow or the directory picker when supported.

## Files

- `index.html` — app shell and layout.
- `style.css` — minimal responsive styling.
- `core.js` — pack rendering, image processing, and state management.
- `script.js` — UI controls, drag/drop, export, and interaction logic.
- `LICENSE` — MIT license.

## Usage

1. Open `index.html` in a modern browser.
2. Drag and drop a photo onto the page, or click `open`.
3. Use the controls to change the pack type, size, movement, zoom, and rotation.
4. Adjust `format` and `quality` before saving.
5. Click `save` to export the passport photo pack.

## Notes

- The app expects sRGB images. Convert non-sRGB images first for best results.
- For best compatibility, use a modern Chromium-based browser.

## License

This project is licensed under the MIT License. See `LICENSE`.
