const section = document.querySelector('section');
const description = section.querySelector('h1');
const openButton = document.getElementById('open');
const saveButton = document.getElementById('save');
const clearButton = document.getElementById('clear');
const formatButton = document.getElementById('format');
const qualityButton = document.getElementById('quality');

const readFormats = ['image/avif', 'image/bmp', 'image/gif', 'image/x-icon', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
const writeFormats = ['jpeg', 'png', 'webp'];

const finalWidth = 1120;
const finalHeight = 1600;
const mmToPx = 320 / 25.4;
const minZoom = 1;
const maxZoom = 10;

function getFigurePreviewSize() {
    const figure = document.querySelector('figure') || document.createElement('figure');
    const style = getComputedStyle(figure);
    const width = parseFloat(style.width) || 360;
    const height = parseFloat(style.height) || 512;
    return { width, height };
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function mapP2GlobalToLocalState(state) {
    const globalX = state.translateX || 0;
    const globalY = state.translateY || 0;
    const scale = state.scale || 1;
    return { translateX: -globalY, translateY: globalX, scale };
}

function mapGlobalToLocalState(pack, state, img, size) {
    if (!state) return { translateX: 0, translateY: 0, scale: 1 };
    const baseSize = pack === 'p1' ? size : 'full pack';
    const normalized = normalizedStateFromPack('p1', state, img, baseSize);
    if (pack === 'p1') {
        return stateForPack('p1', normalized, img, baseSize);
    }
    if (pack === 'p2' || pack === 'p3' || pack === 'p7' || pack === 'p8' || pack === 'p9') {
        return stateForPack(pack, normalized, img, size);
    }
    return { translateX: state.translateX, translateY: state.translateY, scale: state.scale };
}

function mapLocalToGlobalState(pack, state) {
    const localX = state.translateX || 0;
    const localY = state.translateY || 0;
    const scale = state.scale || 1;
    if (pack === 'p2') {
        return { translateX: localY, translateY: -localX, scale };
    }
    return { translateX: localX, translateY: localY, scale };
}

const packConfig = {
    p1: { hPad: 2, vPad: 3, cols: 4, rows: 4, aspectRatio: (img) => img.width / img.height },
    p2: { hPad: 4, vPad: 3, cols: 2, rows: 4, aspectRatio: (img) => img.height / img.width },
    p3: { hPad: 4, vPad: 3, cols: 2, rows: 2, aspectRatio: (img) => img.width / img.height },
    p7: { hPad: 0, vPad: 0, cols: 2, rows: 2, aspectRatio: (img) => img.width / img.height },
    p8: { hPad: 0, vPad: 0, cols: 2, rows: 2, aspectRatio: (img) => img.width / img.height },
    p9: { hPad: 0, vPad: 0, cols: 1, rows: 2, aspectRatio: (img) => img.width / img.height },
};

const packCellSizeOverride = {
    p7: () => [35 * mmToPx, 45 * mmToPx],
    p8: () => [33 * mmToPx, 48 * mmToPx],
    p9: () => {
        const dpi = 320;
        return [2 * dpi, 2 * dpi];
    },
};

function getPackLimits(pack, img, scale, size) {
    const cfg = packConfig[pack];
    if (!cfg) return { maxPanX: 0, maxPanY: 0 };

    const horizontalPadding = cfg.hPad * mmToPx;
    const verticalPadding = cfg.vPad * mmToPx;
    const cols = (pack === 'p1' && size === 'regular') ? 3 : cfg.cols;
    const rows = (pack === 'p1' && size === 'regular') ? 4
        : (pack === 'p2' && size === 'regular') ? 3 : cfg.rows;
    const cellCols = (pack === 'p1' && size === 'regular') ? cfg.cols : cols;
    const cellRows = (pack === 'p1' && size === 'regular') ? cfg.rows
        : (pack === 'p2' && size === 'regular') ? cfg.rows : rows;
    const aspectRatio = cfg.aspectRatio(img);

    let cellWidth = (finalWidth - horizontalPadding * (cellCols + 1)) / cellCols;
    let cellHeight = (finalHeight - verticalPadding * (cellRows + 1)) / cellRows;

    if (packCellSizeOverride[pack]) {
        [cellWidth, cellHeight] = packCellSizeOverride[pack]();
    }

    const cellRatio = cellWidth / cellHeight;
    const baseDrawWidth = aspectRatio > cellRatio ? cellHeight * aspectRatio : cellWidth;
    const baseDrawHeight = aspectRatio > cellRatio ? cellHeight : cellWidth / aspectRatio;
    const drawWidth = baseDrawWidth * Math.max(1, scale);
    const drawHeight = baseDrawHeight * Math.max(1, scale);

    return {
        maxPanX: Math.max(0, Math.abs((drawWidth - cellWidth) / 2)),
        maxPanY: Math.max(0, Math.abs((drawHeight - cellHeight) / 2)),
    };
}

function normalizedStateFromPack(basePack, state, img, size) {
    const baseLimits = getPackLimits(basePack, img, state.scale, size);
    return {
        x: baseLimits.maxPanX ? clamp(state.translateX / baseLimits.maxPanX, -1, 1) : 0,
        y: baseLimits.maxPanY ? clamp(state.translateY / baseLimits.maxPanY, -1, 1) : 0,
        scale: state.scale,
    };
}

function stateForPack(pack, normalized, img, size) {
    const limits = getPackLimits(pack, img, normalized.scale, size);
    if (pack === 'p2') {
        const rotated = {
            translateX: normalized.x * limits.maxPanY,
            translateY: normalized.y * limits.maxPanX,
            scale: normalized.scale,
        };
        return mapP2GlobalToLocalState(rotated);
    }
    return {
        translateX: normalized.x * limits.maxPanX,
        translateY: normalized.y * limits.maxPanY,
        scale: normalized.scale,
    };
}

function clampFigureState(figure) {
    const pack = figure.dataset.pack;
    const size = figure.dataset.size || 'full pack';
    const img = figure._sourceImage;
    const state = figure._state;
    if (!pack || !movablePacks.has(pack) || !img || !state) return;

    const baseSize = pack === 'p1' ? size : 'full pack';
    const normalized = normalizedStateFromPack('p1', state, img, baseSize);
    const clamped = stateForPack('p1', normalized, img, baseSize);

    state.translateX = clamped.translateX;
    state.translateY = clamped.translateY;
    state.scale = Math.max(minZoom, Math.min(maxZoom, state.scale));
}

function createTempCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    return canvas;
}

function drawImageBlock(ctx, img, x, y, cellWidth, cellHeight, state) {
    const aspectRatio = img.width / img.height;
    const cellRatio = cellWidth / cellHeight;
    const baseDrawWidth = aspectRatio > cellRatio ? cellHeight * aspectRatio : cellWidth;
    const baseDrawHeight = aspectRatio > cellRatio ? cellHeight : cellWidth / aspectRatio;

    const scale = Math.max(1, state.scale);
    const drawWidth = baseDrawWidth * scale;
    const drawHeight = baseDrawHeight * scale;

    const maxPanX = Math.max(0, Math.abs((drawWidth - cellWidth) / 2));
    const maxPanY = Math.max(0, Math.abs((drawHeight - cellHeight) / 2));

    const offsetX = clamp(state.translateX, -maxPanX, maxPanX);
    const offsetY = clamp(state.translateY, -maxPanY, maxPanY);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cellWidth, cellHeight);
    ctx.clip();
    ctx.drawImage(img, x + (cellWidth - drawWidth) / 2 + offsetX, y + (cellHeight - drawHeight) / 2 + offsetY, drawWidth, drawHeight);
    ctx.restore();
}

function renderGrid(canvas, img, state, cols, rows, hPad, vPad, automapScale = 0.978, rotate90 = false, options = {}) {
    const useImg = rotate90 ? (() => {
        const rotated = document.createElement('canvas');
        rotated.width = img.height;
        rotated.height = img.width;
        const rotatedCtx = rotated.getContext('2d');
        rotatedCtx.translate(rotated.width / 2, rotated.height / 2);
        rotatedCtx.rotate(Math.PI / 2);
        rotatedCtx.drawImage(img, -img.width / 2, -img.height / 2);
        return rotated;
    })() : img;

    const cellWidth = options.fixedCellWidth ?? ((finalWidth - hPad * (cols + 1)) / cols);
    const cellHeight = options.fixedCellHeight ?? ((finalHeight - vPad * (rows + 1)) / rows);
    const baseOffsetX = options.offsetX ?? 0;
    const baseOffsetY = options.offsetY ?? 0;

    const tempCanvas = createTempCanvas();
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';
    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, finalWidth, finalHeight);

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = baseOffsetX + hPad + col * (cellWidth + hPad);
            const y = baseOffsetY + vPad + row * (cellHeight + vPad);
            const xInt = Math.round(x);
            const yInt = Math.round(y);
            const wInt = Math.round(cellWidth);
            const hInt = Math.round(cellHeight);
            drawImageBlock(tempCtx, useImg, xInt, yInt, wInt, hInt, state);
        }
    }

    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, finalWidth, finalHeight);

    const xOffset = (finalWidth * (1 - automapScale)) / 2;
    const yOffset = (finalHeight * (1 - automapScale)) / 2;
    const scaledCellWidth = Math.round(cellWidth * automapScale);
    const scaledCellHeight = Math.round(cellHeight * automapScale);

    ctx.drawImage(tempCanvas, xOffset, yOffset, finalWidth * automapScale, finalHeight * automapScale);

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = baseOffsetX + hPad + col * (cellWidth + hPad);
            const y = baseOffsetY + vPad + row * (cellHeight + vPad);
            const x2 = Math.round(xOffset + x * automapScale) + 0.5;
            const y2 = Math.round(yOffset + y * automapScale) + 0.5;
            ctx.strokeRect(x2, y2, scaledCellWidth, scaledCellHeight);
        }
    }
}

function p1(canvas, img, state, automapScale = 0.978, size = 'full pack', align = 'center', alignPadPx) {
    const cfg = packConfig.p1;
    const hPad = cfg.hPad * mmToPx;
    const vPad = cfg.vPad * mmToPx;
    const cols = size === 'regular' ? 3 : 4;
    const rows = 4;
    if (size === 'regular') {
        const fullCols = 4;
        const fullCellWidth = (finalWidth - hPad * (fullCols + 1)) / fullCols;
        const fullCellHeight = (finalHeight - vPad * (rows + 1)) / rows;
        const totalWidth = cols * fullCellWidth + (cols + 1) * hPad;
        let offsetX = (finalWidth - totalWidth) / 2;
        if (align === 'left') {
            offsetX = 0;
        }
        if (typeof alignPadPx === 'number') {
            offsetX = alignPadPx - hPad;
        }
        renderGrid(canvas, img, state, cols, rows, hPad, vPad, automapScale, false, {
            fixedCellWidth: fullCellWidth,
            fixedCellHeight: fullCellHeight,
            offsetX,
        });
        return;
    }
    renderGrid(canvas, img, state, cols, rows, hPad, vPad, automapScale, false);
}

function p2(canvas, img, state, automapScale = 0.978, size = 'full pack') {
    const cfg = packConfig.p2;
    const hPad = cfg.hPad * mmToPx;
    const vPad = cfg.vPad * mmToPx;
    const cols = 2;
    const rows = size === 'regular' ? 3 : 4;
    if (size === 'regular') {
        const fullRows = 4;
        const fullCellWidth = (finalWidth - hPad * (cols + 1)) / cols;
        const fullCellHeight = (finalHeight - vPad * (fullRows + 1)) / fullRows;
        const totalHeight = rows * fullCellHeight + (rows + 1) * vPad;
        const offsetY = (finalHeight - totalHeight) / 2;
        renderGrid(canvas, img, state, cols, rows, hPad, vPad, automapScale, true, {
            fixedCellWidth: fullCellWidth,
            fixedCellHeight: fullCellHeight,
            offsetY,
        });
        return;
    }
    renderGrid(canvas, img, state, cols, rows, hPad, vPad, automapScale, true);
}

function p3(canvas, img, state, automapScale = 0.978) {
    const cfg = packConfig.p1;
    const hPad = cfg.hPad * mmToPx;
    const vPad = cfg.vPad * mmToPx;
    renderGrid(canvas, img, state, 2, 2, hPad, vPad, automapScale, false);
}

function p4(canvas, img, state, automapScale = 0.978, size = 'full pack') {
    const normalized = normalizedStateFromPack('p1', state, img, size);
    const p1State = stateForPack('p1', normalized, img, size);
    const p2State = stateForPack('p2', normalized, img, 'full pack');

    const p1Canvas = createTempCanvas();
    const p2Canvas = createTempCanvas();
    p1(p1Canvas, img, p1State, automapScale, size, 'left', 4 * mmToPx);
    p2(p2Canvas, img, p2State, automapScale);

    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, finalWidth, finalHeight);
    const halfHeight = finalHeight / 2;
    ctx.drawImage(p1Canvas, 0, 0, finalWidth, halfHeight, 0, 0, finalWidth, halfHeight);
    ctx.drawImage(p2Canvas, 0, halfHeight, finalWidth, halfHeight, 0, halfHeight, finalWidth, halfHeight);
}

function compositeTopBottom(canvas, topCanvas, bottomCanvas) {
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, finalWidth, finalHeight);

    const halfHeight = finalHeight / 2;
    ctx.drawImage(topCanvas, 0, 0, finalWidth, halfHeight, 0, 0, finalWidth, halfHeight);
    ctx.drawImage(bottomCanvas, 0, halfHeight, finalWidth, halfHeight, 0, halfHeight, finalWidth, halfHeight);
}

function p5(canvas, img, state, automapScale = 0.978, size = 'full pack') {
    const normalized = normalizedStateFromPack('p1', state, img, size);
    const p1State = stateForPack('p1', normalized, img, size);
    const p3State = stateForPack('p3', normalized, img, 'full pack');

    const p1Canvas = createTempCanvas();
    const p3Canvas = createTempCanvas();
    p1(p1Canvas, img, p1State, automapScale, size, 'left', 4 * mmToPx);
    p3(p3Canvas, img, p3State, automapScale);

    compositeTopBottom(canvas, p1Canvas, p3Canvas);
}

function p6(canvas, img, state, automapScale = 0.978) {
    const normalized = normalizedStateFromPack('p1', state, img);
    const p2State = stateForPack('p2', normalized, img);
    const p3State = stateForPack('p3', normalized, img);

    const p2Canvas = createTempCanvas();
    const p3Canvas = createTempCanvas();
    p2(p2Canvas, img, p2State, automapScale);
    p3(p3Canvas, img, p3State, automapScale);

    compositeTopBottom(canvas, p2Canvas, p3Canvas);
}

function drawSmallPack(canvas, img, state, subWidth, subHeight) {
    const cols = 2;
    const rows = 2;
    const cellWidth = finalWidth / cols;
    const cellHeight = finalHeight / rows;

    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, finalWidth, finalHeight);

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = col * cellWidth + (cellWidth - subWidth) / 2;
            const y = row * cellHeight + (cellHeight - subHeight) / 2;
            const xInt = Math.round(x);
            const yInt = Math.round(y);
            const subWidthInt = Math.round(subWidth);
            const subHeightInt = Math.round(subHeight);
            drawImageBlock(ctx, img, xInt, yInt, subWidthInt, subHeightInt, state);

            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.strokeRect(xInt + 0.5, yInt + 0.5, subWidthInt, subHeightInt);
        }
    }
}

function p7(canvas, img, state) {
    drawSmallPack(canvas, img, state, 35 * mmToPx, 45 * mmToPx);
}

function p8(canvas, img, state) {
    drawSmallPack(canvas, img, state, 33 * mmToPx, 48 * mmToPx);
}

function p9(canvas, img, state) {
    const dpi = 320;
    const subWidth = 2 * dpi;
    const subHeight = 2 * dpi;
    const cols = 1;
    const rows = 2;
    const cellWidth = finalWidth / cols;
    const cellHeight = finalHeight / rows;

    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, finalWidth, finalHeight);

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;

    for (let row = 0; row < rows; row++) {
        const x = (cellWidth - subWidth) / 2;
        const y = row * cellHeight + (cellHeight - subHeight) / 2;
        const xInt = Math.round(x);
        const yInt = Math.round(y);
        const wInt = Math.round(subWidth);
        const hInt = Math.round(subHeight);

        drawImageBlock(ctx, img, xInt, yInt, wInt, hInt, state);
        ctx.strokeRect(xInt + 0.5, yInt + 0.5, wInt, hInt);
    }
}

const packRenderers = { p1, p2, p3, p4, p5, p6, p7, p8, p9 };
const movablePacks = new Set(Object.keys(packRenderers));

function updateFigure(figure) {
    const c = figure.querySelector('canvas');
    if (!c) return;
    const pack = figure.dataset.pack;
    const size = figure.dataset.size || 'full pack';
    const renderer = packRenderers[pack];
    if (typeof renderer === 'function') {
        const renderState = (pack === 'p4' || pack === 'p5' || pack === 'p6')
            ? figure._state
            : mapGlobalToLocalState(pack, figure._state, figure._sourceImage, size);
        if (pack === 'p1' || pack === 'p2' || pack === 'p4' || pack === 'p5') {
            renderer(c, figure._sourceImage, renderState, 0.978, size);
        } else {
            renderer(c, figure._sourceImage, renderState);
        }
        c.dataset.processed = pack;
        return;
    }

    const previewWidth = figure._previewSize?.width ?? c.width;
    const previewHeight = figure._previewSize?.height ?? c.height;
    c.width = previewWidth;
    c.height = previewHeight;
    const cctx = c.getContext('2d');
    cctx.fillStyle = 'white';
    cctx.fillRect(0, 0, previewWidth, previewHeight);
    cctx.drawImage(figure._sourceImage, 0, 0, previewWidth, previewHeight);
    c.dataset.processed = '';
}

function createRemoveButton() {
    const fileMenu = document.createElement('menu');
    const removeButton = document.createElement('input');
    removeButton.type = 'button';
    removeButton.value = 'remove';
    fileMenu.appendChild(removeButton);
    return fileMenu;
}

function createSizeOptions(currentIndex) {
    const sizeMenu = document.createElement('menu');
    ['regular', 'full pack'].forEach(size => {
        const label = document.createElement('label');
        const sizeSlug = size.replace(/\s+/g, '-');
        const uniqueId = `size-${currentIndex}-${sizeSlug}`;
        label.setAttribute('for', uniqueId);
        label.textContent = size;
        const input = document.createElement('input');
        input.type = 'radio';
        input.id = uniqueId;
        input.name = `size-${currentIndex}`;
        input.value = size;
        if (size === 'regular') {
            input.checked = true;
        }
        label.appendChild(input);
        sizeMenu.appendChild(label);
    });
    return sizeMenu;
}

function createMoveButtons() {
    const moveMenu = document.createElement('menu');
    ['left', 'right', 'up', 'down'].forEach(direction => {
        const button = document.createElement('input');
        button.type = 'button';
        button.value = direction === 'left' ? '←' :
            direction === 'right' ? '→' :
                direction === 'up' ? '↑' : '↓';
        button.className = direction;
        button.name = 'move';
        moveMenu.appendChild(button);
    });
    return moveMenu;
}

function createZoomButtons() {
    const zoomMenu = document.createElement('menu');
    ['zoom-out', 'zoom-in'].forEach(zoom => {
        const button = document.createElement('input');
        button.type = 'button';
        button.value = zoom === 'zoom-in' ? '+' : '-';
        button.className = zoom;
        button.name = 'zoom';
        zoomMenu.appendChild(button);
    });
    return zoomMenu;
}

function createPackOptions(currentIndex) { 
    const packMenu = document.createElement('menu');
    for (let i = 1; i <= 9; i++) {
        const label = document.createElement('label');
        const uniqueId = `figure${currentIndex}-p${i}`;
        label.setAttribute('for', uniqueId);
        label.textContent = `p${i}`;
        const input = document.createElement('input');
        input.type = 'radio';
        input.id = uniqueId;
        input.name = `pack-${currentIndex}`;
        input.value = `p${i}`;
        label.appendChild(input);
        packMenu.appendChild(label);
    }
    return packMenu;
}

function createTooltip() {
    const tooltip = document.createElement('p');
    const code = document.createElement('code');
    tooltip.style.margin = '1rem 0 0 0';
    tooltip.style.fontSize = '0.75rem';
    tooltip.style.fontStyle = 'italic';
    code.textContent = 'shift';
    code.style.background = 'white';
    code.style.color = 'black';
    code.style.padding = '0.1rem 0.2rem';
    code.style.border = '1px solid white';
    tooltip.appendChild(document.createTextNode('tip: hold '));
    tooltip.appendChild(code);
    tooltip.appendChild(document.createTextNode(' for finer control'));
    return tooltip;
}

function addControls(figure, currentIndex) {
    const sectionA = document.createElement('section');
    const sectionB = document.createElement('section');
    const sectionC = document.createElement('section');
    const sectionD = document.createElement('section');
    const fieldset = document.createElement('fieldset');

    fieldset.style.border = '0';

    sectionA.appendChild(createRemoveButton());
    sectionA.appendChild(createSizeOptions(currentIndex))
    sectionB.appendChild(createPackOptions(currentIndex));
    sectionC.appendChild(createMoveButtons());
    sectionC.appendChild(createZoomButtons());
    sectionD.appendChild(createTooltip());
    fieldset.appendChild(sectionA);
    fieldset.appendChild(sectionB);
    fieldset.appendChild(sectionC);
    fieldset.appendChild(sectionD);
    figure.appendChild(fieldset);
}

let figureCount = 0;

function handleFiles(files) {
    for (const file of files) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const currentIndex = figureCount++;
                const aspectRatio = img.width / img.height;
                const { width: defaultWidth, height: maxHeight } = getFigurePreviewSize();
                let targetWidth = defaultWidth;
                let targetHeight = targetWidth / aspectRatio;
                if (targetHeight > maxHeight) {
                    targetHeight = maxHeight;
                    targetWidth = targetHeight * aspectRatio;
                }

                const figure = document.createElement('figure');
                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                figure._sourceImage = img;
                figure._previewSize = { width: targetWidth, height: targetHeight };
                figure._state = { translateX: 0, translateY: 0, scale: 1 };
                figure.dataset.pack = '';
                figure.dataset.size = 'regular';
                figure.appendChild(canvas);
                section.appendChild(figure);

                addControls(figure, currentIndex);
                figure._updateFigure = updateFigure;
                updateFigure(figure);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
}

section.addEventListener('dragover', (event) => {
    event.preventDefault();
    section.classList.add('drop-hover');
});

section.addEventListener('dragleave', () => {
    section.classList.remove('drop-hover');
});

section.addEventListener('drop', (event) => {
    event.preventDefault();
    section.classList.remove('drop-hover');
    handleFiles(event.dataTransfer.files);
});

openButton.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = readFormats.join(',');
    input.multiple = true;
    input.onchange = (event) => {
        handleFiles(event.target.files);
    };
    input.click();
});

section.addEventListener('change', (event) => {
    if (event.target.name.startsWith('size-')) {
        const figure = event.target.closest('figure');
        if (!figure) return;
        figure.dataset.size = event.target.value;
        if ((figure.dataset.pack === 'p1' || figure.dataset.pack === 'p2' || figure.dataset.pack === 'p4' || figure.dataset.pack === 'p5') && figure._updateFigure) {
            figure._updateFigure(figure);
        }
        return;
    }
    if (event.target.name.startsWith('pack-')) {
        const figure = event.target.closest('figure');
        if (!figure) return;
        figure.dataset.pack = event.target.value;
        if (figure._updateFigure) {
            figure._updateFigure(figure);
        }
    }
});

function getRelativeMoveStep(figure, direction, isFine) {
    const pack = figure.dataset.pack;
    const size = figure.dataset.size || 'full pack';
    const img = figure._sourceImage;
    const state = figure._state;
    if (!img || !img.width || !img.height || !state) return 1;

    const stepPct = isFine ? 0.01 : 0.10;
    const effectivePack = packConfig[pack] ? pack : 'p1';
    const limits = getPackLimits(effectivePack, img, state.scale, size);
    const range = (direction === 'left' || direction === 'right')
        ? limits.maxPanX
        : limits.maxPanY;
    const step = stepPct * range;
    return Math.max(1, Math.round(step));
}

function indexToAlphaSuffix(index) {
    let suffix = '';
    while (index > 0) {
        index -= 1;
        suffix = String.fromCharCode(97 + (index % 26)) + suffix;
        index = Math.floor(index / 26);
    }
    return suffix;
}

section.addEventListener('click', (event) => {
    if (event.target.type === 'button' && event.target.value === 'remove') {
        const figure = event.target.closest('figure');
        if (figure) {
            figure.remove();
        }
        return;
    }
    if (!(event.target.name === 'move' || event.target.name === 'zoom')) return;
    const figure = event.target.closest('figure');
    if (!figure) return;
    const pack = figure.dataset.pack;
    if (!pack || !movablePacks.has(pack)) return;
    const state = figure._state;
    if (!state) return;

    if (event.target.name === 'move') {
        if (state.scale <= minZoom) return;
        const direction = event.target.className;
        const moveStep = getRelativeMoveStep(figure, direction, event.shiftKey);

        if (pack === 'p2') {
            switch (direction) {
                case 'left': state.translateY += moveStep; break;
                case 'right': state.translateY -= moveStep; break;
                case 'up': state.translateX -= moveStep; break;
                case 'down': state.translateX += moveStep; break;
            }
        } else {
            switch (direction) {
                case 'left': state.translateX -= moveStep; break;
                case 'right': state.translateX += moveStep; break;
                case 'up': state.translateY -= moveStep; break;
                case 'down': state.translateY += moveStep; break;
            }
        }
    } else if (event.target.name === 'zoom') {
        const oldScale = state.scale;
        const zoomRate = 1.1;
        const zoomFactor = event.shiftKey ? Math.pow(zoomRate, 0.1) : zoomRate;
        if (event.target.className === 'zoom-in') {
            state.scale = Math.min(maxZoom, state.scale * zoomFactor);
        } else if (event.target.className === 'zoom-out') {
            state.scale = Math.max(minZoom, state.scale / zoomFactor);
        }
        const scaleRatio = state.scale / oldScale;
        state.translateX *= scaleRatio;
        state.translateY *= scaleRatio;
    }

    clampFigureState(figure);

    if (figure._updateFigure) {
        figure._updateFigure(figure);
    }
});

let dragContext = null;
let pinchContext = null;

function getCanvasPoint(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width ? (canvas.width / rect.width) : 1;
    const scaleY = rect.height ? (canvas.height / rect.height) : 1;
    return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
    };
}

function getTouchDistance(a, b) {
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
}

function getTouchMidpoint(a, b, canvas) {
    const pointA = getCanvasPoint(a, canvas);
    const pointB = getCanvasPoint(b, canvas);
    return {
        x: (pointA.x + pointB.x) / 2,
        y: (pointA.y + pointB.y) / 2,
    };
}

function applyPanDelta(figure, pack, dx, dy, subpack = null) {
    const state = figure._state;
    if (!state) return;

    if ((figure.dataset.pack === 'p4' || figure.dataset.pack === 'p6') && subpack) {
        if (subpack === 'p1' || subpack === 'p3') {
            state.translateX += dx;
            state.translateY += dy;
        } else if (subpack === 'p2') {
            state.translateX += dy;
            state.translateY -= dx;
        } else {
            state.translateX += dx;
            state.translateY += dy;
        }
    } else if (pack === 'p2') {
        state.translateX += dy;
        state.translateY -= dx;
    } else {
        state.translateX += dx;
        state.translateY += dy;
    }
}

function zoomFigureAtPoint(figure, scaleFactor, originX, originY) {
    const state = figure._state;
    if (!state) return;

    const oldScale = state.scale;
    const nextScale = clamp(oldScale * scaleFactor, minZoom, maxZoom);
    const appliedFactor = nextScale / oldScale;
    if (appliedFactor === 1) return;

    state.translateX = (state.translateX - originX) * appliedFactor + originX;
    state.translateY = (state.translateY - originY) * appliedFactor + originY;
    state.scale = nextScale;
}

function panFigureToPoint(figure, fromPoint, toPoint) {
    if (!fromPoint || !toPoint) return;
    const dx = toPoint.x - fromPoint.x;
    const dy = toPoint.y - fromPoint.y;
    applyPanDelta(figure, figure.dataset.pack, dx, dy);
}

section.addEventListener('pointerdown', (event) => {
    if (!(event.target instanceof HTMLCanvasElement)) return;
    const figure = event.target.closest('figure');
    if (!figure) return;
    const pack = figure.dataset.pack;
    if (!pack || !movablePacks.has(pack)) return;
    const state = figure._state;
    if (!state) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    event.preventDefault();

    if (event.pointerType === 'touch') {
        event.target.setPointerCapture(event.pointerId);
        const existingTouches = pinchContext?.pointers ?? new Map();
        const pointers = new Map(existingTouches);
        pointers.set(event.pointerId, event);

        if (pointers.size === 2) {
            const [first, second] = Array.from(pointers.values());
            pinchContext = {
                figure,
                canvas: event.target,
                pointers,
                startDistance: getTouchDistance(first, second),
                midpoint: getTouchMidpoint(first, second, event.target),
            };
            dragContext = null;
            return;
        }

        if (pointers.size > 2) {
            pinchContext = {
                ...(pinchContext ?? {}),
                figure,
                canvas: event.target,
                pointers,
            };
            dragContext = null;
            return;
        }
    }

    let subpack = null;
    if (figure.dataset.pack === 'p4' || figure.dataset.pack === 'p6') {
        const rect = event.target.getBoundingClientRect();
        const y = event.clientY - rect.top;
        const half = rect.height / 2;
        if (figure.dataset.pack === 'p4') {
            subpack = y < half ? 'p1' : 'p2';
        } else {
            subpack = y < half ? 'p2' : 'p3';
        }
    }

    const rect = event.target.getBoundingClientRect();
    const scaleX = rect.width ? (event.target.width / rect.width) : 1;
    const scaleY = rect.height ? (event.target.height / rect.height) : 1;

    dragContext = {
        figure,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        originX: state.translateX,
        originY: state.translateY,
        subpack,
        scaleX,
        scaleY,
    };

    event.target.setPointerCapture(event.pointerId);
});

section.addEventListener('pointermove', (event) => {
    if (pinchContext && pinchContext.pointers.has(event.pointerId)) {
        pinchContext.pointers.set(event.pointerId, event);
        if (pinchContext.pointers.size >= 2) {
            const [first, second] = Array.from(pinchContext.pointers.values());
            const distance = getTouchDistance(first, second);
            const midpoint = getTouchMidpoint(first, second, pinchContext.canvas);
            if (pinchContext.startDistance) {
                const figure = pinchContext.figure;
                panFigureToPoint(figure, pinchContext.midpoint, midpoint);
                zoomFigureAtPoint(
                    figure,
                    distance / pinchContext.startDistance,
                    midpoint.x,
                    midpoint.y,
                );
                pinchContext.startDistance = distance;
                pinchContext.midpoint = midpoint;
                clampFigureState(figure);
                if (figure._updateFigure) {
                    figure._updateFigure(figure);
                }
            }
        }
        return;
    }

    if (!dragContext || event.pointerId !== dragContext.pointerId) return;
    const figure = dragContext.figure;
    const pack = figure.dataset.pack;
    if (!pack || !movablePacks.has(pack)) return;
    const state = figure._state;
    if (!state) return;

    const dragScale = event.shiftKey ? 0.1 : 1;
    const dx = (event.clientX - dragContext.lastX) * (dragContext.scaleX ?? 1) * dragScale;
    const dy = (event.clientY - dragContext.lastY) * (dragContext.scaleY ?? 1) * dragScale;

    applyPanDelta(figure, pack, dx, dy, dragContext.subpack);

    dragContext.lastX = event.clientX;
    dragContext.lastY = event.clientY;

    clampFigureState(figure);

    if (figure._updateFigure) {
        figure._updateFigure(figure);
    }
});

const endDrag = (event) => {
    if (pinchContext?.pointers.has(event.pointerId)) {
        pinchContext.pointers.delete(event.pointerId);
        if (pinchContext.pointers.size < 2) {
            pinchContext = null;
        }
    }
    if (!dragContext || event.pointerId !== dragContext.pointerId) return;
    const canvas = dragContext.figure.querySelector('canvas');
    if (canvas && canvas.releasePointerCapture) {
        try { canvas.releasePointerCapture(event.pointerId); } catch (e) { }
    }
    dragContext = null;
};

section.addEventListener('pointerup', endDrag);
section.addEventListener('pointercancel', endDrag);

[formatButton, qualityButton].forEach(button => {
    button.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
});

let currentFormatIndex = 0;
let quality = 0.9;

const updateQualityButtonState = () => {
    qualityButton.disabled = writeFormats[currentFormatIndex] === 'png';
    qualityButton.textContent = `quality: ${writeFormats[currentFormatIndex] === 'png' ? 1.0 : quality.toFixed(1)}`;
};

formatButton.textContent = `format: ${writeFormats[currentFormatIndex]}`;
qualityButton.textContent = `quality: ${quality.toFixed(1)}`;

formatButton.addEventListener('click', () => {
    currentFormatIndex = (currentFormatIndex + 1) % writeFormats.length;
    formatButton.textContent = `format: ${writeFormats[currentFormatIndex]}`;
    updateQualityButtonState();
});

formatButton.addEventListener('auxclick', () => {
    currentFormatIndex = (currentFormatIndex - 1 + writeFormats.length) % writeFormats.length;
    formatButton.textContent = `format: ${writeFormats[currentFormatIndex]}`;
    updateQualityButtonState();
});

qualityButton.addEventListener('click', () => {
    quality = Math.min(1, quality + 0.1);
    qualityButton.textContent = `quality: ${quality.toFixed(1)}`;
});

qualityButton.addEventListener('auxclick', () => {
    quality = Math.max(0, quality - 0.1);
    qualityButton.textContent = `quality: ${quality.toFixed(1)}`;
});

qualityButton.addEventListener('wheel', (e) => {
    e.preventDefault();
    quality = e.deltaY < 0 ? Math.min(1, quality + 0.1) : Math.max(0, quality - 0.1);
    qualityButton.textContent = `quality: ${quality.toFixed(1)}`;
});

formatButton.addEventListener('wheel', (e) => {
    e.preventDefault();
    currentFormatIndex = e.deltaY < 0
        ? (currentFormatIndex + 1) % writeFormats.length
        : (currentFormatIndex - 1 + writeFormats.length) % writeFormats.length;
    formatButton.textContent = `format: ${writeFormats[currentFormatIndex]}`;
    updateQualityButtonState();
});

async function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Failed to convert canvas to blob'));
                return;
            }
            resolve(blob);
        }, type, quality);
    });
}

function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

saveButton.addEventListener('click', async () => {
    const figures = Array.from(section.querySelectorAll('figure'))
        .filter((figure) => packRenderers[figure.dataset.pack]);
    if (figures.length === 0) {
        alert('No packed images to save!');
        return;
    }

    const packCounts = {};
    figures.forEach((figure) => {
        const pack = figure.dataset.pack;
        packCounts[pack] = (packCounts[pack] || 0) + 1;
    });

    const packIndices = {};
    const jobs = Array.from(figures).map((figure) => {
        const pack = figure.dataset.pack;
        const count = packCounts[pack] || 0;

        let filenameBase = pack;
        if (count > 1) {
            const occ = (packIndices[pack] || 0) + 1;
            packIndices[pack] = occ;
            filenameBase = `${filenameBase}_${indexToAlphaSuffix(occ)}`;
        }

        const filename = `${filenameBase}.${writeFormats[currentFormatIndex]}`;

        const exportCanvasTemp = createTempCanvas();
        const renderState = (pack === 'p4' || pack === 'p5' || pack === 'p6')
            ? figure._state
            : mapGlobalToLocalState(pack, figure._state, figure._sourceImage, figure.dataset.size);
        if (pack === 'p1' || pack === 'p2' || pack === 'p4' || pack === 'p5') {
            packRenderers[pack](exportCanvasTemp, figure._sourceImage, renderState, 1, figure.dataset.size);
        } else {
            packRenderers[pack](exportCanvasTemp, figure._sourceImage, renderState, 1);
        }

        return canvasToBlob(exportCanvasTemp, `image/${writeFormats[currentFormatIndex]}`, quality)
            .then((blob) => ({ blob, filename }));
    });

    try {
        const results = await Promise.all(jobs);
        results.forEach(({ blob, filename }) => {
            downloadBlob(blob, filename);
        });
    } catch (error) {
        console.error('Error exporting images:', error);
        alert('Error while exporting images. Please try again.');
    }
});

clearButton.addEventListener('click', () => {
    const figures = section.querySelectorAll('figure');
    if (figures.length > 0 && confirm('Clear all images?')) {
        figures.forEach(f => f.remove());
    }
});

let uiStateScheduled = false;
const updateUiState = () => {
    uiStateScheduled = false;
    const hasFigures = section.querySelector('figure') !== null;
    description.style.display = hasFigures ? 'none' : 'block';
    saveButton.disabled = !hasFigures;
    clearButton.disabled = !hasFigures;
};

const scheduleUiStateUpdate = () => {
    if (uiStateScheduled) return;
    uiStateScheduled = true;
    requestAnimationFrame(updateUiState);
};

const sectionObserver = new MutationObserver(scheduleUiStateUpdate);
sectionObserver.observe(section, { childList: true });
scheduleUiStateUpdate();

//append img.jpg for quick testing
// fetch('img.jpg')
//     .then(response => response.blob())
//     .then(blob => { 
//         const file = new File([blob], 'img.jpg', { type: blob.type });
//         handleFiles([file]);
//     })
//     .catch(error => {
//         console.error('Error loading test image:', error);
//     });
