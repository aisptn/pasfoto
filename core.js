// Core functionality for passport photo application
// Contains constants, utilities, image processing, pack renderers, and state management

// Constants
export const finalWidth = 1120;
export const finalHeight = 1600;
export const mmToPx = 320 / 25.4;
export const minZoom = 1;
export const maxZoom = 10;
export const defaultAutomapScale = 0.978;
export const previewSourceMaxDimension = 1600;

export const readFormats = ['image/*'];
export const writeFormats = ['jpeg', 'png', 'webp'];

export const packConfig = {
    p1: { hPad: 2, vPad: 2, cols: 4, rows: 4, aspectRatio: (img) => img.width / img.height },
    p2: { hPad: 3, vPad: 3, cols: 2, rows: 4, aspectRatio: (img) => img.height / img.width },
    p3: { hPad: 4, vPad: 4, cols: 2, rows: 2, aspectRatio: (img) => img.width / img.height },
    p7: { hPad: 0, vPad: 0, cols: 2, rows: 2, aspectRatio: (img) => img.width / img.height },
    p8: { hPad: 0, vPad: 0, cols: 2, rows: 2, aspectRatio: (img) => img.width / img.height },
    p9: { hPad: 0, vPad: 0, cols: 1, rows: 2, aspectRatio: (img) => img.width / img.height },
};

export const packCellSizeOverride = {
    p7: () => [35 * mmToPx, 45 * mmToPx],
    p8: () => [33 * mmToPx, 48 * mmToPx],
    p9: () => {
        const dpi = 320;
        return [2 * dpi, 2 * dpi];
    },
};

const packRenderers = { p1, p2, p3, p4, p5, p6, p7, p8, p9 };
const movablePacks = new Set(Object.keys(packRenderers));
export function getFigurePreviewSize() {
    const figure = document.querySelector('figure') || document.createElement('figure');
    const style = getComputedStyle(figure);
    const width = parseFloat(style.width) || 360;
    const height = parseFloat(style.height) || 512;
    return { width, height };
}

export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function createCanvas(width = finalWidth, height = finalHeight) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

export function normalizeRotation(rotation = 0) {
    const normalized = ((rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    return normalized > Math.PI ? normalized - 2 * Math.PI : normalized;
}

export function getRotationCache(figure) {
    if (!figure._rotationCache) {
        figure._rotationCache = new Map();
    }
    return figure._rotationCache;
}

export function getRotatedImage(source, rotation, figure = null) {
    const normalizedRotation = normalizeRotation(rotation);
    if (!normalizedRotation) return source;

    const cache = figure ? getRotationCache(figure) : null;
    const cacheKey = `${source.width}x${source.height}:${normalizedRotation}`;
    const cached = cache?.get(cacheKey);
    if (cached) return cached;

    const isQuarterTurn = Math.abs(Math.abs(normalizedRotation) - (Math.PI / 2)) < 0.0001;
    const rotated = createCanvas(
        isQuarterTurn ? source.height : source.width,
        isQuarterTurn ? source.width : source.height,
    );
    const rotatedCtx = rotated.getContext('2d');
    rotatedCtx.translate(rotated.width / 2, rotated.height / 2);
    rotatedCtx.rotate(normalizedRotation);
    rotatedCtx.drawImage(source, -source.width / 2, -source.height / 2);

    cache?.set(cacheKey, rotated);
    return rotated;
}

export function createPreviewImage(source) {
    const longestEdge = Math.max(source.width, source.height);
    if (longestEdge <= previewSourceMaxDimension) {
        return source;
    }

    const scale = previewSourceMaxDimension / longestEdge;
    const previewCanvas = createCanvas(
        Math.max(1, Math.round(source.width * scale)),
        Math.max(1, Math.round(source.height * scale)),
    );
    const previewCtx = previewCanvas.getContext('2d');
    previewCtx.imageSmoothingEnabled = true;
    previewCtx.imageSmoothingQuality = 'high';
    previewCtx.drawImage(source, 0, 0, previewCanvas.width, previewCanvas.height);
    return previewCanvas;
}

export function getFigureRenderImage(figure, mode = 'preview') {
    return mode === 'export' ? figure._sourceImage : (figure._previewImage || figure._sourceImage);
}

export function getWorkingCanvas(figure, key, width = finalWidth, height = finalHeight) {
    if (!figure._workCanvases) {
        figure._workCanvases = new Map();
    }

    let canvas = figure._workCanvases.get(key);
    if (!canvas) {
        canvas = createCanvas(width, height);
        figure._workCanvases.set(key, canvas);
        return canvas;
    }

    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    return canvas;
}

export function disposeFigureResources(figure) {
    if (!figure) return;
    if (figure._objectUrl) {
        URL.revokeObjectURL(figure._objectUrl);
        figure._objectUrl = null;
    }
    figure._rotationCache?.clear();
    figure._workCanvases?.clear();
}

// State management functions
export function mapP2GlobalToLocalState(state) {
    const globalX = state.translateX || 0;
    const globalY = state.translateY || 0;
    const scale = state.scale || 1;
    return { translateX: -globalY, translateY: globalX, scale, rotation: state.rotation || 0 };
}

export function mapGlobalToLocalState(pack, state, img, size) {
    if (!state) return { translateX: 0, translateY: 0, scale: 1, rotation: 0 };
    const baseSize = pack === 'p1' ? size : 'full pack';
    const normalized = normalizedStateFromPack('p1', state, img, baseSize);
    if (pack === 'p1') {
        const mapped = stateForPack('p1', normalized, img, baseSize);
        return { ...mapped, rotation: state.rotation || 0 };
    }
    if (pack === 'p2' || pack === 'p3' || pack === 'p7' || pack === 'p8' || pack === 'p9') {
        const mapped = stateForPack(pack, normalized, img, size);
        return { ...mapped, rotation: state.rotation || 0 };
    }
    return { translateX: state.translateX, translateY: state.translateY, scale: state.scale, rotation: state.rotation || 0 };
}

export function mapLocalToGlobalState(pack, state) {
    const localX = state.translateX || 0;
    const localY = state.translateY || 0;
    const scale = state.scale || 1;
    if (pack === 'p2') {
        return { translateX: localY, translateY: -localX, scale, rotation: state.rotation || 0 };
    }
    return { translateX: localX, translateY: localY, scale, rotation: state.rotation || 0 };
}

export function getPackLimits(pack, img, scale, size) {
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

export function normalizedStateFromPack(basePack, state, img, size) {
    const baseLimits = getPackLimits(basePack, img, state.scale, size);
    return {
        x: baseLimits.maxPanX ? clamp(state.translateX / baseLimits.maxPanX, -1, 1) : 0,
        y: baseLimits.maxPanY ? clamp(state.translateY / baseLimits.maxPanY, -1, 1) : 0,
        scale: state.scale,
        rotation: state.rotation || 0,
    };
}

export function stateForPack(pack, normalized, img, size) {
    const limits = getPackLimits(pack, img, normalized.scale, size);
    if (pack === 'p2') {
        const rotated = {
            translateX: normalized.x * limits.maxPanY,
            translateY: normalized.y * limits.maxPanX,
            scale: normalized.scale,
            rotation: normalized.rotation,
        };
        return mapP2GlobalToLocalState(rotated);
    }
    return {
        translateX: normalized.x * limits.maxPanX,
        translateY: normalized.y * limits.maxPanY,
        scale: normalized.scale,
        rotation: normalized.rotation,
    };
}

export function clampFigureState(figure) {
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

// Rendering functions
export function createTempCanvas() {
    return createCanvas(finalWidth, finalHeight);
}

export function drawImageBlock(ctx, img, x, y, cellWidth, cellHeight, state) {
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

export function renderGrid(canvas, img, state, cols, rows, hPad, vPad, automapScale = defaultAutomapScale, rotation = 0, options = {}) {
    const useImg = getRotatedImage(img, rotation, options.figure);

    const cellWidth = options.fixedCellWidth ?? ((finalWidth - hPad * (cols + 1)) / cols);
    const cellHeight = options.fixedCellHeight ?? ((finalHeight - vPad * (rows + 1)) / rows);
    const baseOffsetX = options.offsetX ?? 0;
    const baseOffsetY = options.offsetY ?? 0;

    const tempCanvas = options.tempCanvas || createTempCanvas();
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

export function p1(canvas, img, state, automapScale = defaultAutomapScale, size = 'full pack', align = 'center', alignPadPx, options = {}) {
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
        renderGrid(canvas, img, state, cols, rows, hPad, vPad, automapScale, state.rotation || 0, {
            fixedCellWidth: fullCellWidth,
            fixedCellHeight: fullCellHeight,
            offsetX,
            ...options,
        });
        return;
    }
    renderGrid(canvas, img, state, cols, rows, hPad, vPad, automapScale, state.rotation || 0, options);
}

export function p2(canvas, img, state, automapScale = defaultAutomapScale, size = 'full pack', options = {}) {
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
        renderGrid(canvas, img, state, cols, rows, hPad, vPad, automapScale, (state.rotation || 0) + Math.PI / 2, {
            fixedCellWidth: fullCellWidth,
            fixedCellHeight: fullCellHeight,
            offsetY,
            ...options,
        });
        return;
    }
    renderGrid(canvas, img, state, cols, rows, hPad, vPad, automapScale, (state.rotation || 0) + Math.PI / 2, options);
}

export function p3(canvas, img, state, automapScale = defaultAutomapScale, options = {}) {
    const cfg = packConfig.p3;
    const hPad = cfg.hPad * mmToPx;
    const vPad = cfg.vPad * mmToPx;
    renderGrid(canvas, img, state, 2, 2, hPad, vPad, automapScale, state.rotation || 0, options);
}

export function p4(canvas, img, state, automapScale = defaultAutomapScale, size = 'full pack', options = {}) {
    const normalized = normalizedStateFromPack('p1', state, img, size);
    const p1State = stateForPack('p1', normalized, img, size);
    const p2State = stateForPack('p2', normalized, img, 'full pack');

    const p1Canvas = options.figure ? getWorkingCanvas(options.figure, 'p4-p1') : createTempCanvas();
    const p2Canvas = options.figure ? getWorkingCanvas(options.figure, 'p4-p2') : createTempCanvas();
    p1(p1Canvas, img, p1State, automapScale, size, 'left', 4 * mmToPx, options);
    p2(p2Canvas, img, p2State, automapScale, 'full pack', options);

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

export function compositeTopBottom(canvas, topCanvas, bottomCanvas) {
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

export function p5(canvas, img, state, automapScale = defaultAutomapScale, size = 'full pack', options = {}) {
    const normalized = normalizedStateFromPack('p1', state, img, size);
    const p1State = stateForPack('p1', normalized, img, size);
    const p3State = stateForPack('p3', normalized, img, 'full pack');

    const p1Canvas = options.figure ? getWorkingCanvas(options.figure, 'p5-p1') : createTempCanvas();
    const p3Canvas = options.figure ? getWorkingCanvas(options.figure, 'p5-p3') : createTempCanvas();
    p1(p1Canvas, img, p1State, automapScale, size, 'left', 4 * mmToPx, options);
    p3(p3Canvas, img, p3State, automapScale, options);

    compositeTopBottom(canvas, p1Canvas, p3Canvas);
}

export function p6(canvas, img, state, automapScale = defaultAutomapScale, options = {}) {
    const normalized = normalizedStateFromPack('p1', state, img);
    const p2State = stateForPack('p2', normalized, img);
    const p3State = stateForPack('p3', normalized, img);

    const p2Canvas = options.figure ? getWorkingCanvas(options.figure, 'p6-p2') : createTempCanvas();
    const p3Canvas = options.figure ? getWorkingCanvas(options.figure, 'p6-p3') : createTempCanvas();
    p2(p2Canvas, img, p2State, automapScale, 'full pack', options);
    p3(p3Canvas, img, p3State, automapScale, options);

    compositeTopBottom(canvas, p2Canvas, p3Canvas);
}

export function drawSmallPack(canvas, img, state, subWidth, subHeight) {
    const cols = 2;
    const rows = 2;
    const cellWidth = finalWidth / cols;
    const cellHeight = finalHeight / rows;

    const useImg = getRotatedImage(img, state.rotation || 0, canvas.closest('figure'));

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
            drawImageBlock(ctx, useImg, xInt, yInt, subWidthInt, subHeightInt, state);

            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.strokeRect(xInt + 0.5, yInt + 0.5, subWidthInt, subHeightInt);
        }
    }
}

export function p7(canvas, img, state) {
    drawSmallPack(canvas, img, state, 35 * mmToPx, 45 * mmToPx);
}

export function p8(canvas, img, state) {
    drawSmallPack(canvas, img, state, 33 * mmToPx, 48 * mmToPx);
}

export function p9(canvas, img, state) {
    const dpi = 320;
    const subWidth = 2 * dpi;
    const subHeight = 2 * dpi;
    const cols = 1;
    const rows = 2;
    const cellWidth = finalWidth / cols;
    const cellHeight = finalHeight / rows;

    const useImg = getRotatedImage(img, state.rotation || 0, canvas.closest('figure'));

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

        drawImageBlock(ctx, useImg, xInt, yInt, wInt, hInt, state);
        ctx.strokeRect(xInt + 0.5, yInt + 0.5, wInt, hInt);
    }
}

// Export pack renderers and movable packs
export { packRenderers, movablePacks };

export function renderFigureNow(figure, mode = 'preview') {
    const c = figure._canvas || figure.querySelector('canvas');
    if (!c) return;
    const pack = figure.dataset.pack;
    const size = figure.dataset.size || 'full pack';
    const renderer = packRenderers[pack];
    const renderImage = getFigureRenderImage(figure, mode);
    if (typeof renderer === 'function') {
        const renderState = (pack === 'p4' || pack === 'p5' || pack === 'p6')
            ? figure._state
            : mapGlobalToLocalState(pack, figure._state, renderImage, size);
        if (pack === 'p1' || pack === 'p2' || pack === 'p4' || pack === 'p5') {
            renderer(c, renderImage, renderState, defaultAutomapScale, size, undefined, undefined, { figure });
        } else {
            renderer(c, renderImage, renderState, defaultAutomapScale, { figure });
        }
        c.dataset.processed = pack;
        return;
    }

    const previewWidth = figure._previewSize?.width ?? c.width;
    const previewHeight = figure._previewSize?.height ?? c.height;
    const useImg = getRotatedImage(renderImage, figure._state.rotation || 0, figure);

    c.width = previewWidth;
    c.height = previewHeight;
    const cctx = figure._context || c.getContext('2d');
    figure._context = cctx;
    cctx.fillStyle = 'white';
    cctx.fillRect(0, 0, previewWidth, previewHeight);


    const imgAspect = useImg.width / useImg.height;
    const canvasAspect = previewWidth / previewHeight;
    let drawWidth, drawHeight, offsetX, offsetY;
    if (imgAspect > canvasAspect) {
        drawWidth = previewWidth;
        drawHeight = previewWidth / imgAspect;
        offsetX = 0;
        offsetY = (previewHeight - drawHeight) / 2;
    } else {
        drawHeight = previewHeight;
        drawWidth = previewHeight * imgAspect;
        offsetX = (previewWidth - drawWidth) / 2;
        offsetY = 0;
    }
    cctx.drawImage(useImg, offsetX, offsetY, drawWidth, drawHeight);
    c.dataset.processed = '';
}

export function updateFigure(figure) {
    if (!figure || figure._renderScheduled) return;
    figure._renderScheduled = true;
    requestAnimationFrame(() => {
        figure._renderScheduled = false;
        if (!figure.isConnected) return;
        renderFigureNow(figure, 'preview');
    });
}
