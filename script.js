const openButton = document.getElementById('open');
const saveButton = document.getElementById('save');
const clearButton = document.getElementById('clear');
const formatButton = document.getElementById('format');
const qualityButton = document.getElementById('quality');
const section = document.querySelector('section');
const description = section.querySelector('h1');
const readFormats = ['image/avif', 'image/bmp', 'image/gif', 'image/x-icon', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
const writeFormats = ['jpeg', 'png', 'webp'];
const packButtons = document.querySelectorAll('input[name="pack"]');
const zoomButtons = document.querySelectorAll('input[name="zoom"]');
function p1(canvas, img, state) {
    const finalWidth = 1120;
    const finalHeight = 1600;
    const horizontalPadding = 2 * 320 / 25.4;
    const verticalPadding = 3 * 320 / 25.4;
    const cols = 4;
    const rows = 4;
    const automapScale = 0.978;
    const cellWidth = (finalWidth - horizontalPadding * (cols + 1)) / cols;
    const cellHeight = (finalHeight - verticalPadding * (rows + 1)) / rows;
    const aspectRatio = img.width / img.height;
    const cellRatio = cellWidth / cellHeight;
    const baseDrawWidth = aspectRatio > cellRatio ? cellHeight * aspectRatio : cellWidth;
    const baseDrawHeight = aspectRatio > cellRatio ? cellHeight : cellWidth / aspectRatio;
    state.scale = Math.max(1, state.scale);
    const drawWidth = baseDrawWidth * state.scale;
    const drawHeight = baseDrawHeight * state.scale;
    const maxPanX = Math.max(0, Math.abs((drawWidth - cellWidth) / 2));
    const maxPanY = Math.max(0, Math.abs((drawHeight - cellHeight) / 2));
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const offsetX = clamp(state.translateX, -maxPanX, maxPanX);
    const offsetY = clamp(state.translateY, -maxPanY, maxPanY);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = finalWidth;
    tempCanvas.height = finalHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, finalWidth, finalHeight);
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = horizontalPadding + col * (cellWidth + horizontalPadding);
            const y = verticalPadding + row * (cellHeight + verticalPadding);
            tempCtx.save();
            tempCtx.beginPath();
            tempCtx.rect(x, y, cellWidth, cellHeight);
            tempCtx.clip();
            tempCtx.drawImage(img, x + (cellWidth - drawWidth) / 2 + offsetX, y + (cellHeight - drawHeight) / 2 + offsetY, drawWidth, drawHeight);
            tempCtx.restore();
        }
    }
    const finalOffsetX = (finalWidth * (1 - automapScale)) / 2;
    const finalOffsetY = (finalHeight * (1 - automapScale)) / 2;
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, finalWidth, finalHeight);
    ctx.drawImage(tempCanvas, finalOffsetX, finalOffsetY, finalWidth * automapScale, finalHeight * automapScale);
}
function p2(canvas, img, state) {
    const finalWidth = 1120;
    const finalHeight = 1600;
    const horizontalPadding = 4 * 320 / 25.4;
    const verticalPadding = 3 * 320 / 25.4;
    const cols = 2;
    const rows = 4;
    const automapScale = 0.978;
    const rotated = document.createElement('canvas');
    rotated.width = img.height;
    rotated.height = img.width;
    const rotatedCtx = rotated.getContext('2d');
    rotatedCtx.translate(rotated.width / 2, rotated.height / 2);
    rotatedCtx.rotate(Math.PI / 2);
    rotatedCtx.drawImage(img, -img.width / 2, -img.height / 2);
    const cellWidth = (finalWidth - horizontalPadding * (cols + 1)) / cols;
    const cellHeight = (finalHeight - verticalPadding * (rows + 1)) / rows;
    const aspectRatio = rotated.width / rotated.height;
    const cellRatio = cellWidth / cellHeight;
    const baseDrawWidth = aspectRatio > cellRatio ? cellHeight * aspectRatio : cellWidth;
    const baseDrawHeight = aspectRatio > cellRatio ? cellHeight : cellWidth / aspectRatio;
    state.scale = Math.max(1, state.scale);
    const drawWidth = baseDrawWidth * state.scale;
    const drawHeight = baseDrawHeight * state.scale;
    const maxPanX = Math.max(0, Math.abs((drawWidth - cellWidth) / 2));
    const maxPanY = Math.max(0, Math.abs((drawHeight - cellHeight) / 2));
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const offsetX = clamp(state.translateX, -maxPanX, maxPanX);
    const offsetY = clamp(state.translateY, -maxPanY, maxPanY);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = finalWidth;
    tempCanvas.height = finalHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, finalWidth, finalHeight);
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = horizontalPadding + col * (cellWidth + horizontalPadding);
            const y = verticalPadding + row * (cellHeight + verticalPadding);
            tempCtx.save();
            tempCtx.beginPath();
            tempCtx.rect(x, y, cellWidth, cellHeight);
            tempCtx.clip();
            tempCtx.drawImage(rotated, x + (cellWidth - drawWidth) / 2 + offsetX, y + (cellHeight - drawHeight) / 2 + offsetY, drawWidth, drawHeight);
            tempCtx.restore();
        }
    }
    const finalOffsetX = (finalWidth * (1 - automapScale)) / 2;
    const finalOffsetY = (finalHeight * (1 - automapScale)) / 2;
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, finalWidth, finalHeight);
    ctx.drawImage(tempCanvas, finalOffsetX, finalOffsetY, finalWidth * automapScale, finalHeight * automapScale);
}
function mapP2GlobalToLocalState(state) {
    const globalX = state.translateX || 0;
    const globalY = state.translateY || 0;
    const scale = state.scale || 1;
    return { translateX: -globalY, translateY: globalX, scale };
}
function mapGlobalToLocalState(pack, state, img) {
    const normalized = normalizedStateFromPack('p1', state, img);
    const scale = normalized.scale;
    if (pack === 'p1') {
        const limits = getPackLimits('p1', img, scale);
        return stateForPack('p1', normalized, img);
    }
    if (pack === 'p2' || pack === 'p3' || pack === 'p7' || pack === 'p8' || pack === 'p9') {
        return stateForPack(pack, normalized, img);
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
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function getPackLimits(pack, img, scale) {
    const finalWidth = 1120;
    const finalHeight = 1600;
    let horizontalPadding;
    let verticalPadding;
    let cols;
    let rows;
    let aspectRatio;
    if (pack === 'p1') {
        horizontalPadding = 2 * 320 / 25.4;
        verticalPadding = 3 * 320 / 25.4;
        cols = 4;
        rows = 4;
        aspectRatio = img.width / img.height;
    } else if (pack === 'p2') {
        horizontalPadding = 4 * 320 / 25.4;
        verticalPadding = 3 * 320 / 25.4;
        cols = 2;
        rows = 4;
        aspectRatio = img.height / img.width;
    } else if (pack === 'p3') {
        horizontalPadding = 4 * 320 / 25.4;
        verticalPadding = 6 * 320 / 25.4;
        cols = 2;
        rows = 2;
        aspectRatio = img.width / img.height;
    } else if (pack === 'p7') {
        horizontalPadding = 0;
        verticalPadding = 0;
        cols = 2;
        rows = 2;
        aspectRatio = img.width / img.height;
    } else if (pack === 'p8') {
        horizontalPadding = 0;
        verticalPadding = 0;
        cols = 2;
        rows = 2;
        aspectRatio = img.width / img.height;
    } else if (pack === 'p9') {
        horizontalPadding = 0;
        verticalPadding = 0;
        cols = 1;
        rows = 2;
        aspectRatio = img.width / img.height;
    } else {
        return { maxPanX: 0, maxPanY: 0 };
    }
    let cellWidth = (finalWidth - horizontalPadding * (cols + 1)) / cols;
    let cellHeight = (finalHeight - verticalPadding * (rows + 1)) / rows;
    if (pack === 'p7') {
        const mmToPx = 320 / 25.4;
        cellWidth = 35 * mmToPx;
        cellHeight = 45 * mmToPx;
    } else if (pack === 'p8') {
        const mmToPx = 320 / 25.4;
        cellWidth = 33 * mmToPx;
        cellHeight = 48 * mmToPx;
    } else if (pack === 'p9') {
        const dpi = 320;
        cellWidth = 2 * dpi;
        cellHeight = 2 * dpi;
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
function normalizedStateFromPack(basePack, state, img) {
    const baseLimits = getPackLimits(basePack, img, state.scale);
    return {
        x: baseLimits.maxPanX ? clamp(state.translateX / baseLimits.maxPanX, -1, 1) : 0,
        y: baseLimits.maxPanY ? clamp(state.translateY / baseLimits.maxPanY, -1, 1) : 0,
        scale: state.scale,
    };
}
function stateForPack(pack, normalized, img) {
    const limits = getPackLimits(pack, img, normalized.scale);
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
function p3(canvas, img, state) {
    const finalWidth = 1120;
    const finalHeight = 1600;
    const horizontalPadding = 4 * 320 / 25.4;
    const verticalPadding = 6 * 320 / 25.4;
    const cols = 2;
    const rows = 2;
    const automapScale = 0.978;
    const cellWidth = (finalWidth - horizontalPadding * (cols + 1)) / cols;
    const cellHeight = (finalHeight - verticalPadding * (rows + 1)) / rows;
    const aspectRatio = img.width / img.height;
    const cellRatio = cellWidth / cellHeight;
    const baseDrawWidth = aspectRatio > cellRatio ? cellHeight * aspectRatio : cellWidth;
    const baseDrawHeight = aspectRatio > cellRatio ? cellHeight : cellWidth / aspectRatio;
    state.scale = Math.max(1, state.scale);
    const drawWidth = baseDrawWidth * state.scale;
    const drawHeight = baseDrawHeight * state.scale;
    const maxPanX = Math.max(0, Math.abs((drawWidth - cellWidth) / 2));
    const maxPanY = Math.max(0, Math.abs((drawHeight - cellHeight) / 2));
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const offsetX = clamp(state.translateX, -maxPanX, maxPanX);
    const offsetY = clamp(state.translateY, -maxPanY, maxPanY);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = finalWidth;
    tempCanvas.height = finalHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, finalWidth, finalHeight);
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = horizontalPadding + col * (cellWidth + horizontalPadding);
            const y = verticalPadding + row * (cellHeight + verticalPadding);
            tempCtx.save();
            tempCtx.beginPath();
            tempCtx.rect(x, y, cellWidth, cellHeight);
            tempCtx.clip();
            tempCtx.drawImage(img, x + (cellWidth - drawWidth) / 2 + offsetX, y + (cellHeight - drawHeight) / 2 + offsetY, drawWidth, drawHeight);
            tempCtx.restore();
        }
    }
    const finalOffsetX = (finalWidth * (1 - automapScale)) / 2;
    const finalOffsetY = (finalHeight * (1 - automapScale)) / 2;
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, finalWidth, finalHeight);
    ctx.drawImage(tempCanvas, finalOffsetX, finalOffsetY, finalWidth * automapScale, finalHeight * automapScale);
}
function p4(canvas, img, state) {
    const finalWidth = 1120;
    const finalHeight = 1600;
    const normalized = normalizedStateFromPack('p1', state, img);
    const p1State = stateForPack('p1', normalized, img);
    const p2State = stateForPack('p2', normalized, img);
    const p1Canvas = document.createElement('canvas');
    p1Canvas.width = finalWidth;
    p1Canvas.height = finalHeight;
    p1(p1Canvas, img, p1State);
    const p2Canvas = document.createElement('canvas');
    p2Canvas.width = finalWidth;
    p2Canvas.height = finalHeight;
    p2(p2Canvas, img, p2State);
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, finalWidth, finalHeight);
    const halfHeight = finalHeight / 2;
    ctx.drawImage(p1Canvas, 0, 0, finalWidth, halfHeight, 0, 0, finalWidth, halfHeight);
    ctx.drawImage(p2Canvas, 0, halfHeight, finalWidth, halfHeight, 0, halfHeight, finalWidth, halfHeight);
}
function p5(canvas, img, state) {
    const finalWidth = 1120;
    const finalHeight = 1600;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = finalWidth;
    tempCanvas.height = finalHeight;
    const tempCtx = tempCanvas.getContext('2d');
    const normalized = normalizedStateFromPack('p1', state, img);
    const p1State = stateForPack('p1', normalized, img);
    const p3State = stateForPack('p3', normalized, img);
    p3(tempCanvas, img, p3State);
    const p3Data = tempCtx.getImageData(0, 0, finalWidth, finalHeight);
    p1(tempCanvas, img, p1State);
    const p1Data = tempCtx.getImageData(0, 0, finalWidth, finalHeight);
    for (let i = 0; i < p1Data.data.length; i += 4) {
        const y = Math.floor((i / 4) / finalWidth);
        if (y < finalHeight / 2) {
            p3Data.data[i] = p1Data.data[i];
            p3Data.data[i + 1] = p1Data.data[i + 1];
            p3Data.data[i + 2] = p1Data.data[i + 2];
            p3Data.data[i + 3] = p1Data.data[i + 3];
        }
    }
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(p3Data, 0, 0);
}
function p6(canvas, img, state) {
    const finalWidth = 1120;
    const finalHeight = 1600;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = finalWidth;
    tempCanvas.height = finalHeight;
    const tempCtx = tempCanvas.getContext('2d');
    const normalized = normalizedStateFromPack('p1', state, img);
    const p3State = stateForPack('p3', normalized, img);
    const p2State = stateForPack('p2', normalized, img);
    p3(tempCanvas, img, p3State);
    const p3Data = tempCtx.getImageData(0, 0, finalWidth, finalHeight);
    p2(tempCanvas, img, p2State);
    const p2Data = tempCtx.getImageData(0, 0, finalWidth, finalHeight);
    for (let i = 0; i < p2Data.data.length; i += 4) {
        const y = Math.floor((i / 4) / finalWidth);
        if (y < finalHeight / 2) {
            p3Data.data[i] = p2Data.data[i];
            p3Data.data[i + 1] = p2Data.data[i + 1];
            p3Data.data[i + 2] = p2Data.data[i + 2];
            p3Data.data[i + 3] = p2Data.data[i + 3];
        }
    }
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(p3Data, 0, 0);
}
function p7(canvas, img, state) {
    const finalWidth = 1120;
    const finalHeight = 1600;
    const cols = 2;
    const rows = 2;
    const cellWidth = finalWidth / cols;
    const cellHeight = finalHeight / rows;
    const mmToPx = 320 / 25.4;
    const subWidth = 35 * mmToPx;
    const subHeight = 45 * mmToPx;
    const drawImageCell = (ctx, x, y, width, height) => {
        const aspectRatio = img.width / img.height;
        const cellRatio = width / height;
        const baseDrawWidth = aspectRatio > cellRatio ? height * aspectRatio : width;
        const baseDrawHeight = aspectRatio > cellRatio ? height : width / aspectRatio;
        const normalizedScale = Math.max(1, state.scale);
        const drawWidth = baseDrawWidth * normalizedScale;
        const drawHeight = baseDrawHeight * normalizedScale;
        const maxPanX = Math.max(0, Math.abs((drawWidth - width) / 2));
        const maxPanY = Math.max(0, Math.abs((drawHeight - height) / 2));
        const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
        const offsetX = clamp(state.translateX, -maxPanX, maxPanX);
        const offsetY = clamp(state.translateY, -maxPanY, maxPanY);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.clip();
        ctx.drawImage(img, x + (width - drawWidth) / 2 + offsetX, y + (height - drawHeight) / 2 + offsetY, drawWidth, drawHeight);
        ctx.restore();
    };
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, finalWidth, finalHeight);
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = col * cellWidth + (cellWidth - subWidth) / 2;
            const y = row * cellHeight + (cellHeight - subHeight) / 2;
            drawImageCell(ctx, x, y, subWidth, subHeight);
        }
    }
}
function p8(canvas, img, state) {
    const finalWidth = 1120;
    const finalHeight = 1600;
    const cols = 2;
    const rows = 2;
    const cellWidth = finalWidth / cols;
    const cellHeight = finalHeight / rows;
    const mmToPx = 320 / 25.4;
    const subWidth = 33 * mmToPx;
    const subHeight = 48 * mmToPx;
    const drawImageCell = (ctx, x, y, width, height) => {
        const aspectRatio = img.width / img.height;
        const cellRatio = width / height;
        const baseDrawWidth = aspectRatio > cellRatio ? height * aspectRatio : width;
        const baseDrawHeight = aspectRatio > cellRatio ? height : width / aspectRatio;
        const normalizedScale = Math.max(1, state.scale);
        const drawWidth = baseDrawWidth * normalizedScale;
        const drawHeight = baseDrawHeight * normalizedScale;
        const maxPanX = Math.max(0, Math.abs((drawWidth - width) / 2));
        const maxPanY = Math.max(0, Math.abs((drawHeight - height) / 2));
        const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
        const offsetX = clamp(state.translateX, -maxPanX, maxPanX);
        const offsetY = clamp(state.translateY, -maxPanY, maxPanY);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.clip();
        ctx.drawImage(img, x + (width - drawWidth) / 2 + offsetX, y + (height - drawHeight) / 2 + offsetY, drawWidth, drawHeight);
        ctx.restore();
    };
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, finalWidth, finalHeight);
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = col * cellWidth + (cellWidth - subWidth) / 2;
            const y = row * cellHeight + (cellHeight - subHeight) / 2;
            drawImageCell(ctx, x, y, subWidth, subHeight);
        }
    }
}
function p9(canvas, img, state) {
    const finalWidth = 1120;
    const finalHeight = 1600;
    const cols = 1;
    const rows = 2;
    const cellWidth = finalWidth / cols;
    const cellHeight = finalHeight / rows;
    const dpi = 320;
    const subWidth = 2 * dpi;
    const subHeight = 2 * dpi;
    const drawImageCell = (ctx, x, y, width, height) => {
        const aspectRatio = img.width / img.height;
        const cellRatio = width / height;
        const baseDrawWidth = aspectRatio > cellRatio ? height * aspectRatio : width;
        const baseDrawHeight = aspectRatio > cellRatio ? height : width / aspectRatio;
        const normalizedScale = Math.max(1, state.scale);
        const drawWidth = baseDrawWidth * normalizedScale;
        const drawHeight = baseDrawHeight * normalizedScale;
        const maxPanX = Math.max(0, Math.abs((drawWidth - width) / 2));
        const maxPanY = Math.max(0, Math.abs((drawHeight - height) / 2));
        const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
        const offsetX = clamp(state.translateX, -maxPanX, maxPanX);
        const offsetY = clamp(state.translateY, -maxPanY, maxPanY);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.clip();
        ctx.drawImage(img, x + (width - drawWidth) / 2 + offsetX, y + (height - drawHeight) / 2 + offsetY, drawWidth, drawHeight);
        ctx.restore();
    };
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, finalWidth, finalHeight);
    for (let row = 0; row < rows; row++) {
        const y = row * cellHeight + (cellHeight - subHeight) / 2;
        const x = (cellWidth - subWidth) / 2;
        drawImageCell(ctx, x, y, subWidth, subHeight);
    }
}
const packRenderers = {
    p1,
    p2,
    p3,
    p4,
    p5,
    p6,
    p7,
    p8,
    p9,
};
const movablePacks = new Set(Object.keys(packRenderers));
function updateFigure(figure) {
    const c = figure.querySelector('canvas');
    if (!c) return;
    const pack = figure.dataset.pack;
    const renderer = packRenderers[pack];
    if (typeof renderer === 'function') {
        const renderState = (pack === 'p4' || pack === 'p5' || pack === 'p6')
            ? figure._state
            : mapGlobalToLocalState(pack, figure._state, figure._sourceImage);
        renderer(c, figure._sourceImage, renderState);
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
function addControls(figure, currentIndex) {
    const sectionA = document.createElement('section');
    const sectionB = document.createElement('section');
    const fieldset = document.createElement('fieldset');
    const moveMenu = document.createElement('menu');
    ['left', 'right', 'up', 'down'].forEach(direction => {
        const button = document.createElement('input');
        button.type = 'button';
        button.value = direction === 'left' ? ' ← ' :
            direction === 'right' ? ' → ' :
                direction === 'up' ? ' ↑ ' : ' ↓ ';
        button.className = direction;
        button.name = 'move';
        moveMenu.appendChild(button);
    });
    sectionA.appendChild(moveMenu);
    fieldset.appendChild(sectionA);
    const zoomMenu = document.createElement('menu');
    ['zoom-out', 'zoom-in'].forEach(zoom => {
        const button = document.createElement('input');
        button.type = 'button';
        button.value = zoom === 'zoom-in' ? ' + ' : ' - ';
        button.className = zoom;
        button.name = 'zoom';
        zoomMenu.appendChild(button);
    });
    sectionA.appendChild(zoomMenu);
    fieldset.appendChild(sectionB);
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
    sectionB.appendChild(packMenu);
    fieldset.appendChild(sectionB);
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
                let targetWidth = 360;
                let targetHeight = targetWidth / aspectRatio;
                if (targetHeight > 512) {
                    targetHeight = 512;
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
                figure.appendChild(canvas);
                section.appendChild(figure);
                addControls(figure, currentIndex);
                figure._updateFigure = updateFigure;
                updateFigure(figure);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
        description.style.display = 'none';
        saveButton.disabled = false;
        clearButton.disabled = false;
    }
}
section.addEventListener('dragover', (event) => {
    event.preventDefault();
    section.classList.add('drop-hover');
});
section.addEventListener('dragleave', (event) => {
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
    if (event.target.name.startsWith('pack-')) {
        const figure = event.target.closest('figure');
        if (!figure) return;
        figure.dataset.pack = event.target.value;
        if (figure._updateFigure) {
            figure._updateFigure(figure);
        }
    }
});
function getMoveStep(figure, direction) {
    const img = figure._sourceImage;
    if (!img || !img.width || !img.height) return 15;
    const step = direction === 'left' || direction === 'right'
        ? img.width * 0.01
        : img.height * 0.01;
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
    if (!(event.target.name === 'move' || event.target.name === 'zoom')) return;
    const figure = event.target.closest('figure');
    if (!figure) return;
    const pack = figure.dataset.pack;
    if (!pack || !movablePacks.has(pack)) return;
    const state = figure._state;
    if (!state) return;
    if (event.target.name === 'move') {
        if (state.scale <= 1) {
            return;
        }
        const direction = event.target.className;
        const moveStep = getMoveStep(figure, direction);
        if (pack === 'p2') {
            const local = mapGlobalToLocalState('p2', state, figure._sourceImage);
            switch (direction) {
                case 'left': local.translateX -= moveStep; break;
                case 'right': local.translateX += moveStep; break;
                case 'up': local.translateY -= moveStep; break;
                case 'down': local.translateY += moveStep; break;
            }
            const global = mapLocalToGlobalState('p2', local);
            state.translateX = global.translateX;
            state.translateY = global.translateY;
        } else {
            switch (event.target.className) {
                case 'left': state.translateX -= moveStep; break;
                case 'right': state.translateX += moveStep; break;
                case 'up': state.translateY -= moveStep; break;
                case 'down': state.translateY += moveStep; break;
            }
        }
    } else if (event.target.name === 'zoom') {
        const oldScale = state.scale;
        if (event.target.className === 'zoom-in') {
            state.scale = Math.min(3, state.scale * 1.1);
        } else if (event.target.className === 'zoom-out') {
            state.scale = Math.max(1, state.scale / 1.1);
        }
        const scaleRatio = state.scale / oldScale;
        if (pack === 'p2') {
            const local = mapGlobalToLocalState('p2', state, figure._sourceImage);
            local.translateX *= scaleRatio;
            local.translateY *= scaleRatio;
            const global = mapLocalToGlobalState('p2', local);
            state.translateX = global.translateX;
            state.translateY = global.translateY;
            state.scale = local.scale;
        } else {
            state.translateX *= scaleRatio;
            state.translateY *= scaleRatio;
        }
    }
    if (figure._updateFigure) {
        figure._updateFigure(figure);
    }
});
let dragContext = null;
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
    dragContext = {
        figure,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: state.translateX,
        originY: state.translateY,
        subpack,
    };
    event.target.setPointerCapture(event.pointerId);
});
section.addEventListener('pointermove', (event) => {
    if (!dragContext || event.pointerId !== dragContext.pointerId) return;
    const figure = dragContext.figure;
    const pack = figure.dataset.pack;
    if (!pack || !movablePacks.has(pack)) return;
    const state = figure._state;
    if (!state) return;
    const dx = event.clientX - dragContext.startX;
    const dy = event.clientY - dragContext.startY;
    if ((figure.dataset.pack === 'p4' || figure.dataset.pack === 'p6') && dragContext.subpack) {
        if (dragContext.subpack === 'p1' || dragContext.subpack === 'p3') {
            state.translateX = dragContext.originX + dx;
            state.translateY = dragContext.originY + dy;
        } else if (dragContext.subpack === 'p2') {
            const originLocal = mapP2GlobalToLocalState({ translateX: dragContext.originX, translateY: dragContext.originY, scale: state.scale });
            const movedLocal = { translateX: originLocal.translateX + dx, translateY: originLocal.translateY + dy, scale: state.scale };
            const newGlobal = mapLocalToGlobalState('p2', movedLocal);
            state.translateX = newGlobal.translateX;
            state.translateY = newGlobal.translateY;
        } else {
            state.translateX = dragContext.originX + dx;
            state.translateY = dragContext.originY + dy;
        }
    } else if (pack === 'p2') {
        const originLocal = mapGlobalToLocalState('p2', { translateX: dragContext.originX, translateY: dragContext.originY, scale: state.scale }, figure._sourceImage);
        const movedLocal = { translateX: originLocal.translateX + dx, translateY: originLocal.translateY + dy, scale: state.scale };
        const newGlobal = mapLocalToGlobalState('p2', movedLocal);
        state.translateX = newGlobal.translateX;
        state.translateY = newGlobal.translateY;
    } else {
        state.translateX = dragContext.originX + dx;
        state.translateY = dragContext.originY + dy;
    }
    if (figure._updateFigure) {
        figure._updateFigure(figure);
    }
});
const endDrag = (event) => {
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
const updateQualityButtonState = () => {
    qualityButton.disabled = writeFormats[currentFormatIndex] === 'png';
    qualityButton.textContent = `quality: ${writeFormats[currentFormatIndex] === 'png' ? 1.0 : quality.toFixed(1)}`;
};
formatButton.textContent = `format: ${writeFormats[currentFormatIndex]}`;
formatButton.addEventListener('click', () => {
    currentFormatIndex = (currentFormatIndex + 1) % writeFormats.length;
    formatButton.textContent = `format: ${writeFormats[currentFormatIndex]}`;
    updateQualityButtonState();
});
formatButton.addEventListener('auxclick', (e) => {
    currentFormatIndex = (currentFormatIndex - 1 + writeFormats.length) % writeFormats.length;
    formatButton.textContent = `format: ${writeFormats[currentFormatIndex]}`;
    updateQualityButtonState();
});
let quality = 0.9;
qualityButton.textContent = `quality: ${quality.toFixed(1)}`;
qualityButton.addEventListener('click', () => {
    quality = Math.min(1, quality + 0.1);
    qualityButton.textContent = `quality: ${quality.toFixed(1)}`;
});
qualityButton.addEventListener('auxclick', (e) => {
    quality = Math.max(0, quality - 0.1);
    qualityButton.textContent = `quality: ${quality.toFixed(1)}`;
});
qualityButton.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
        quality = Math.min(1, quality + 0.1);
    } else {
        quality = Math.max(0, quality - 0.1);
    }
    qualityButton.textContent = `quality: ${quality.toFixed(1)}`;
});
formatButton.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
        currentFormatIndex = (currentFormatIndex + 1) % writeFormats.length;
    } else {
        currentFormatIndex = (currentFormatIndex - 1 + writeFormats.length) % writeFormats.length;
    }
    formatButton.textContent = `format: ${writeFormats[currentFormatIndex]}`;
    updateQualityButtonState();
});
saveButton.addEventListener('click', () => {
    const section = document.querySelector('section');
    const figures = section.querySelectorAll('figure');
    if (figures.length === 0) {
        alert('No images to save!');
        return;
    }

    const packCounts = {};
    figures.forEach((figure) => {
        const pack = figure.dataset.pack || 'image';
        packCounts[pack] = (packCounts[pack] || 0) + 1;
    });

    const packIndices = {};
    figures.forEach((figure) => {
        const canvas = figure.querySelector('canvas');
        if (!canvas) return;
        const pack = figure.dataset.pack || 'image';
        const count = packCounts[pack] || 0;
        let filenameBase = pack || 'image';
        if (count > 1) {
            const occ = (packIndices[pack] || 0) + 1;
            packIndices[pack] = occ;
            filenameBase = `${filenameBase}_${indexToAlphaSuffix(occ)}`;
        }
        const filename = `${filenameBase}.${writeFormats[currentFormatIndex]}`;

        canvas.toBlob((blob) => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            a.click();
            URL.revokeObjectURL(a.href);
        }, `image/${writeFormats[currentFormatIndex]}`, quality);
    });
});
clearButton.addEventListener('click', () => {
    const section = document.querySelector('section');
    if (section.children.length > 0) {
        if (confirm('Clear all images?')) {
            while (section.firstChild) {
                section.removeChild(section.firstChild);
            }
            description.style.display = 'block';
            saveButton.disabled = true;
            clearButton.disabled = true;
        }
    }
});
