// Main application script for passport photo application
// Imports core functionality and handles UI interactions

import {
    finalWidth, finalHeight, mmToPx, minZoom, maxZoom, defaultAutomapScale, previewSourceMaxDimension,
    readFormats, writeFormats, packConfig, packCellSizeOverride,
    packRenderers, movablePacks,
    getFigurePreviewSize, clamp, createCanvas, normalizeRotation, getRotationCache,
    getRotatedImage, createPreviewImage, getFigureRenderImage, getWorkingCanvas, disposeFigureResources,
    mapP2GlobalToLocalState, mapGlobalToLocalState, mapLocalToGlobalState,
    getPackLimits, normalizedStateFromPack, stateForPack, clampFigureState,
    createTempCanvas, drawImageBlock, renderGrid,
    p1, p2, p3, p4, p5, p6, p7, p8, p9,
    renderFigureNow, updateFigure
} from './core.js';

const section = document.querySelector('section');
const description = section.querySelector('h1');
const openButton = document.getElementById('open');
const saveButton = document.getElementById('save');
const clearButton = document.getElementById('clear');
const formatButton = document.getElementById('format');
const qualityButton = document.getElementById('quality');



let figureCount = 0;

function createRemoveButton() {
    const fieldset = document.createElement('fieldset');
    const fileMenu = document.createElement('menu');
    const removeButton = document.createElement('input');
    removeButton.type = 'button';
    removeButton.value = 'remove';
    fileMenu.appendChild(removeButton);
    fieldset.append(fileMenu)
    return fieldset;
}

function createSizeOptions(currentIndex) {
    const fieldset = document.createElement('fieldset');
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
    fieldset.append(sizeMenu);
    return fieldset;
}

function createMoveButtons() {
    const fieldset = document.createElement('fieldset');
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
    fieldset.append(moveMenu)
    return fieldset;
}

function createZoomButtons() {
    const fieldset = document.createElement('fieldset');
    const zoomMenu = document.createElement('menu');
    ['zoom-out', 'zoom-in'].forEach(zoom => {
        const button = document.createElement('input');
        button.type = 'button';
        button.value = zoom === 'zoom-in' ? '+' : '-';
        button.className = zoom;
        button.name = 'zoom';
        zoomMenu.appendChild(button);
    });
    fieldset.append(zoomMenu)
    return fieldset;
}

function createRotateButtons() {
    const fieldset = document.createElement('fieldset');
    const rotateMenu = document.createElement('menu');
    ['rotate-left', 'rotate-right'].forEach(rotate => {
        const button = document.createElement('input');
        button.type = 'button';
        button.value = rotate === 'rotate-left' ? '↺' : '↻';
        button.className = rotate;
        button.name = 'rotate';
        rotateMenu.appendChild(button);
    });
    fieldset.append(rotateMenu);
    return fieldset;
}

function createPackOptions(currentIndex) { 
    const fieldset = document.createElement('fieldset');
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
    fieldset.append(packMenu)
    return fieldset;
}

function createTooltip() {
    const tooltip = document.createElement('p');
    const code = document.createElement('code');
    tooltip.style.margin = '1rem 0 0 0';
    tooltip.style.fontSize = '0.75rem';
    tooltip.style.fontStyle = 'italic';
    code.textContent = 'shift';
    code.style.background = 'canvas';
    code.style.color = 'canvasText';
    code.style.filter = 'invert(1)'
    code.style.padding = '0.1rem 0.2rem';
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
    sectionC.appendChild(createRotateButtons());
    sectionD.appendChild(createTooltip());
    fieldset.appendChild(sectionA);
    fieldset.appendChild(sectionB);
    fieldset.appendChild(sectionC);
    fieldset.appendChild(sectionD);
    figure.appendChild(fieldset);
}

function handleFiles(files) {
    const currentFigureCount = section.querySelectorAll('figure').length;
    


    for (const file of files) {
        const currentCount = section.querySelectorAll('figure').length;


        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.decoding = 'async';
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
            const canvas = createCanvas(targetWidth, targetHeight);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            figure._sourceImage = img;
            figure._previewImage = createPreviewImage(img);
            figure._previewSize = { width: targetWidth, height: targetHeight };
            figure._state = { translateX: 0, translateY: 0, scale: 1, rotation: 0 };
            figure._canvas = canvas;
            figure._context = ctx;
            figure.dataset.pack = '';
            figure.dataset.size = 'regular';
            figure.appendChild(canvas);
            section.appendChild(figure);

            addControls(figure, currentIndex);
            figure._updateFigure = updateFigure;
            renderFigureNow(figure, 'preview');
            URL.revokeObjectURL(objectUrl);
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
        };
        img.src = objectUrl;
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
    const baseSize = pack === 'p1' ? size : 'full pack';
    const limits = getPackLimits('p1', img, state.scale, baseSize);
    const range = (direction === 'left' || direction === 'right')
        ? limits.maxPanX
        : limits.maxPanY;
    const step = stepPct * range;
    return step;
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
            disposeFigureResources(figure);
            figure.remove();
        }
        return;
    }
    if (!(event.target.name === 'move' || event.target.name === 'zoom' || event.target.name === 'rotate')) return;
    const figure = event.target.closest('figure');
    if (!figure) return;
    const pack = figure.dataset.pack;
    if (event.target.name !== 'rotate' && (!pack || !movablePacks.has(pack))) return;
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
    } else if (event.target.name === 'rotate') {
        const rotationStep = Math.PI / 2; 
        if (event.target.className === 'rotate-left') {
            state.rotation = (state.rotation || 0) - rotationStep;
        } else if (event.target.className === 'rotate-right') {
            state.rotation = (state.rotation || 0) + rotationStep;
        }
        
        state.rotation = ((state.rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        if (state.rotation > Math.PI) state.rotation -= 2 * Math.PI;
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
    const dx = (event.clientX - dragContext.lastX) * dragScale;
    const dy = (event.clientY - dragContext.lastY) * dragScale;

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
let quality = 1;

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

function createExportJob(figure, packCounts, packIndices) {
    return async () => {
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
            packRenderers[pack](exportCanvasTemp, figure._sourceImage, renderState, 1, figure.dataset.size, undefined, undefined, {});
        } else {
            packRenderers[pack](exportCanvasTemp, figure._sourceImage, renderState, 1, {});
        }

        const blob = await canvasToBlob(exportCanvasTemp, `image/${writeFormats[currentFormatIndex]}`, quality);
        return { blob, filename };
    };
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
    const jobs = figures.map((figure) => createExportJob(figure, packCounts, packIndices));

    try {
        for (const job of jobs) {
            const { blob, filename } = await job();
            downloadBlob(blob, filename);
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    } catch (error) {
        console.error('Error exporting images:', error);
        alert('Error while exporting images. Please try again.');
    }
});

clearButton.addEventListener('click', () => {
    const figures = section.querySelectorAll('figure');
    if (figures.length > 0 && confirm('Clear all images?')) {
        figures.forEach((figure) => {
            disposeFigureResources(figure);
            figure.remove();
        });
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
