// ===== Canvas Setup =====
const drawingCanvas = document.getElementById("drawingCanvas");
const dctx = drawingCanvas.getContext("2d");

function resizeCanvas() {
    const container = document.getElementById("canvasContainer");
    const rect = container.getBoundingClientRect();

    [drawingCanvas, overlayCanvas, effectsCanvas].forEach(canvas => {
        canvas.width = rect.width;
        canvas.height = rect.height;
    });

    dctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    console.log("Canvas:", rect.width, "x", rect.height);
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

// ===== History =====
function saveState() {
    try {
        history.push(dctx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height));
        redoStack = [];
        if (history.length > 30) history.shift();
    } catch (e) {
        console.error(e);
    }
}

function undoDrawing() {
    if (!history.length) return;

    redoStack.push(dctx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height));
    dctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    dctx.putImageData(history.pop(), 0, 0);
    playSound("undo");
}

function redoDrawing() {
    if (!redoStack.length) return;

    history.push(dctx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height));
    dctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    dctx.putImageData(redoStack.pop(), 0, 0);
}

// ===== Drawing =====
let rainbowHue = 0;

function getRainbowColor() {
    rainbowHue = (rainbowHue + 3) % 360;
    return `hsl(${rainbowHue}, 100%, 60%)`;
}

function drawLine(x1, y1, x2, y2) {
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
                dctx.arc(px + dx, py + dy, 1, 0, Math.PI * 2);
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
        btn.textContent = textMode ? "Text On" : "Grab Text";
    }

    stopStroke();
}

function placeText(x, y) {
    const text = getTextValue();
    if (!text) return;

    saveState();

    dctx.save();
    dctx.globalCompositeOperation = "source-over";
    dctx.font = `${textSize}px Segoe UI, Arial, sans-serif`;
    dctx.textBaseline = "middle";
    dctx.lineWidth = 3;
    dctx.strokeStyle = "rgba(0,0,0,0.7)";
    dctx.fillStyle = currentColor;

    dctx.strokeText(text, x, y);
    dctx.fillText(text, x, y);
    dctx.restore();

    playSound("save");
}

// ===== Clear =====
function clearCanvas() {
    saveState();
    dctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    playSound("clear");
}

// ===== Save =====
function saveDrawing() {
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

    playSound("save");
    showNotification("💾 Drawing saved!");
}

// ===== UI =====
function setColor(color) {
    currentColor = color;
    isErasing = false;

    document.querySelectorAll(".color").forEach(button => {
        button.classList.toggle("active", button.dataset.color === color);
    });

    playSound("color");
}

document.querySelectorAll(".color").forEach(btn => {
    btn.addEventListener("click", () => setColor(btn.dataset.color));
});

document.getElementById("brushMode").addEventListener("change", e => {
    brushMode = e.target.value;
});

document.getElementById("undoBtn").addEventListener("click", undoDrawing);
document.getElementById("redoBtn").addEventListener("click", redoDrawing);
document.getElementById("clearBtn").addEventListener("click", clearCanvas);
document.getElementById("saveBtn").addEventListener("click", saveDrawing);

document.getElementById("textModeBtn").addEventListener("click", () => {
    setTextMode(!textMode);
});

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
        top: 30px;
        right: 30px;
        background: linear-gradient(135deg, #00ff88, #00bfff);
        color: black;
        padding: 15px 25px;
        border-radius: 15px;
        font-weight: bold;
        z-index: 9999;
        box-shadow: 0 10px 30px rgba(0, 255, 136, 0.3);
    `;

    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

