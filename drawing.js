// ===== Canvas Setup =====
const drawingCanvas = document.getElementById("drawingCanvas");
const dctx = drawingCanvas ? drawingCanvas.getContext("2d") : null;

function resizeCanvas() {
    const container = document.getElementById("canvasContainer");
    if (!container) return;
    const rect = container.getBoundingClientRect();

    [drawingCanvas, overlayCanvas, effectsCanvas].forEach(canvas => {
        if (canvas) {
            canvas.width = rect.width;
            canvas.height = rect.height;
        }
    });

    if (dctx) dctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
}

window.addEventListener("load", () => setTimeout(resizeCanvas, 200));
window.addEventListener("resize", resizeCanvas);

// ===== State =====
let currentColor = "#ffffff";
let brushSize = 8;
let brushMode = "normal";
let isErasing = false;
let prevX = null;
let prevY = null;
let history = [];
let redoStack = [];

let textMode = false;
let textSize = 42;

// Link brush size slider
const brushSlider = document.getElementById("brushSizeSlider");
if (brushSlider) {
    brushSlider.addEventListener("input", (e) => {
        brushSize = parseInt(e.target.value);
        const brushSizeValue = document.getElementById("brushSizeValue");
        if (brushSizeValue) brushSizeValue.textContent = brushSize;
    });
}

// ===== History =====
function saveState() {
    try {
        if (!dctx || !drawingCanvas) return;
        history.push(dctx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height));
        redoStack = [];
        if (history.length > 30) history.shift();
    } catch (e) {
        console.error(e);
    }
}

function undoDrawing() {
    if (!history.length) return;
    if (!dctx || !drawingCanvas) return;

    redoStack.push(dctx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height));
    dctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    dctx.putImageData(history.pop(), 0, 0);
    if (window.playSound) window.playSound("undo");
}

function redoDrawing() {
    if (!redoStack.length) return;
    if (!dctx || !drawingCanvas) return;

    history.push(dctx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height));
    dctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    dctx.putImageData(redoStack.pop(), 0, 0);
}

// ===== Drawing Functions =====
let rainbowHue = 0;

function getRainbowColor() {
    rainbowHue = (rainbowHue + 3) % 360;
    return `hsl(${rainbowHue}, 100%, 60%)`;
}

function drawLine(x1, y1, x2, y2) {
    if (!dctx) return;
    
    if (isErasing) {
        dctx.globalCompositeOperation = "destination-out";
        dctx.strokeStyle = "rgba(0,0,0,1)";
    } else if (brushMode === "rainbow") {
        dctx.globalCompositeOperation = "source-over";
        dctx.strokeStyle = getRainbowColor();
    } else {
        dctx.globalCompositeOperation = "source-over";
        dctx.strokeStyle = currentColor;
    }

    dctx.lineWidth = brushSize;
    dctx.lineCap = "round";
    dctx.lineJoin = "round";

    if (brushMode === "spray" && !isErasing) {
        const distance = Math.hypot(x2 - x1, y2 - y1);
        const steps = Math.max(1, Math.floor(distance / 2));

        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            const px = x1 + (x2 - x1) * t;
            const py = y1 + (y2 - y1) * t;

            for (let j = 0; j < 8; j++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * brushSize;
                const dx = Math.cos(angle) * radius;
                const dy = Math.sin(angle) * radius;

                dctx.fillStyle = currentColor;
                dctx.beginPath();
                dctx.arc(px + dx, py + dy, 1.5, 0, Math.PI * 2);
                dctx.fill();
            }
        }
    } else {
        dctx.beginPath();
        dctx.moveTo(x1, y1);
        dctx.lineTo(x2, y2);
        dctx.stroke();
    }
}

function addGlow(x, y) {
    if (!dctx) return;
    if (brushMode !== "glow" || isErasing) return;

    dctx.shadowColor = currentColor;
    dctx.shadowBlur = brushSize * 2;
    dctx.beginPath();
    dctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    dctx.fillStyle = currentColor;
    dctx.fill();
    dctx.shadowBlur = 0;
}

function startStroke() {
    saveState();
}

function drawPoint(x, y) {
    if (!dctx) return;
    
    if (prevX === null) {
        prevX = x;
        prevY = y;
        if (brushMode === "glow") addGlow(x, y);
        return;
    }

    drawLine(prevX, prevY, x, y);

    if (brushMode === "glow") addGlow(x, y);

    prevX = x;
    prevY = y;
}

function stopStroke() {
    prevX = null;
    prevY = null;
}

// ===== Text Tool =====
function getTextValue() {
    const input = document.getElementById("textInput");
    return input ? input.value.trim() : "";
}

function setTextMode(enabled) {
    textMode = enabled;

    const btn = document.getElementById("textModeBtn");
    if (btn) {
        btn.classList.toggle("active", textMode);
        btn.textContent = textMode ? "✍ Text On" : "Grab Text";
    }

    stopStroke();
    
    if (statusText) {
        statusText.textContent = textMode ? "Text Mode Active - Point to position, fist to place" : "Drawing Mode Active";
    }
}

function placeText(x, y) {
    const text = getTextValue();
    if (!text) return;
    if (!dctx) return;

    saveState();

    dctx.save();
    dctx.globalCompositeOperation = "source-over";
    dctx.font = `${textSize}px 'Segoe UI', Arial, sans-serif`;
    dctx.textBaseline = "middle";
    dctx.textAlign = "center";
    dctx.lineWidth = 3;
    dctx.strokeStyle = "rgba(0,0,0,0.7)";
    dctx.fillStyle = currentColor;

    dctx.strokeText(text, x, y);
    dctx.fillText(text, x, y);
    dctx.restore();

    if (window.playSound) window.playSound("save");
}

// ===== Clear Canvas =====
function clearCanvas() {
    if (!dctx || !drawingCanvas) return;
    saveState();
    dctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    if (window.playSound) window.playSound("clear");
}

// ===== Save Drawing =====
function saveDrawing() {
    if (!drawingCanvas) return;
    
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = drawingCanvas.width;
    tempCanvas.height = drawingCanvas.height;

    const tctx = tempCanvas.getContext("2d");
    tctx.fillStyle = "#000";
    tctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tctx.drawImage(drawingCanvas, 0, 0);

    const link = document.createElement("a");
    link.download = `air-drawing-${Date.now()}.png`;
    link.href = tempCanvas.toDataURL("image/png");
    link.click();

    if (window.playSound) window.playSound("save");
    if (window.showNotification) window.showNotification("💾 Drawing saved!");
}

// ===== UI Functions =====
function setColor(color) {
    currentColor = color;
    isErasing = false;

    document.querySelectorAll(".color-btn").forEach(button => {
        button.classList.toggle("active", button.dataset.color === color);
    });

    if (window.playSound) window.playSound("color");
}

function enableEraser() {
    isErasing = true;
}

function enableBrush() {
    isErasing = false;
}

function showNotification(msg) {
    const notif = document.createElement("div");
    notif.textContent = msg;
    notif.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 30px;
        background: linear-gradient(135deg, #00ff88, #00bfff);
        color: black;
        padding: 12px 24px;
        border-radius: 12px;
        font-weight: bold;
        z-index: 9999;
        box-shadow: 0 10px 30px rgba(0, 255, 136, 0.3);
        animation: fadeIn 0.3s ease;
    `;

    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 2000);
}

// ===== Event Listeners =====
// Color buttons
document.querySelectorAll(".color-btn").forEach(btn => {
    btn.addEventListener("click", () => setColor(btn.dataset.color));
});

// Brush mode
const brushModeSelect = document.getElementById("brushMode");
if (brushModeSelect) {
    brushModeSelect.addEventListener("change", e => {
        brushMode = e.target.value;
    });
}

// Action buttons
const undoBtn = document.getElementById("undoBtn");
if (undoBtn) undoBtn.addEventListener("click", undoDrawing);

const redoBtn = document.getElementById("redoBtn");
if (redoBtn) redoBtn.addEventListener("click", redoDrawing);

const clearBtn = document.getElementById("clearBtn");
if (clearBtn) clearBtn.addEventListener("click", clearCanvas);

const saveBtn = document.getElementById("saveBtn");
if (saveBtn) saveBtn.addEventListener("click", saveDrawing);

const textModeBtn = document.getElementById("textModeBtn");
if (textModeBtn) {
    textModeBtn.addEventListener("click", () => {
        setTextMode(!textMode);
    });
}

// Draw/Erase mode buttons from dashboard
const drawModeBtn = document.getElementById("drawModeBtn");
if (drawModeBtn) {
    drawModeBtn.addEventListener("click", () => {
        enableBrush();
        if (window.updateModeDisplay) window.updateModeDisplay("draw");
    });
}

const eraseModeBtn = document.getElementById("eraseModeBtn");
if (eraseModeBtn) {
    eraseModeBtn.addEventListener("click", () => {
        enableEraser();
        if (window.updateModeDisplay) window.updateModeDisplay("erase");
    });
}

// Export for other modules
window.setTextMode = setTextMode;
window.undoDrawing = undoDrawing;
window.redoDrawing = redoDrawing;
window.clearCanvas = clearCanvas;
window.saveDrawing = saveDrawing;
window.setColor = setColor;
window.enableEraser = enableEraser;
window.enableBrush = enableBrush;
window.drawPoint = drawPoint;
window.startStroke = startStroke;
window.stopStroke = stopStroke;
window.placeText = placeText;
window.getTextValue = getTextValue;
window.currentColor = () => currentColor;
window.brushMode = () => brushMode;
window.isErasing = () => isErasing;