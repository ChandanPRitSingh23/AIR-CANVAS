// ===== DOM =====
const video = document.getElementById("video");
const statusText = document.getElementById("status");

// ===== State =====
let currentMode = "idle";
let smoothingLevel = 5;
let smoothedX = null;
let smoothedY = null;
let strokeCount = 0;
let startTime = Date.now();
let lastTextPoint = null;

// Timer
setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const m = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const s = String(elapsed % 60).padStart(2, "0");
    document.getElementById("timerDisplay").textContent = `⏱️ ${m}:${s}`;
}, 1000);

// ===== Smooth =====
function smoothCoordinates(x, y) {
    if (smoothedX === null) {
        smoothedX = x;
        smoothedY = y;
        return { x, y };
    }

    const jump = Math.hypot(x - smoothedX, y - smoothedY);

    if (jump > 140) {
        smoothedX = x;
        smoothedY = y;
        return { x, y };
    }

    const f = Math.max(0.08, Math.min(0.45, 1 / smoothingLevel));
    smoothedX += (x - smoothedX) * f;
    smoothedY += (y - smoothedY) * f;

    return { x: smoothedX, y: smoothedY };
}

function updateStats() {
    strokeCount++;
    document.getElementById("strokeCount").textContent = `🎨 Strokes: ${strokeCount}`;
}

// ===== On Results =====
function onResults(results) {
    clearOverlay();

    if (!results.multiHandLandmarks || !results.multiHandLandmarks.length) {
        stopStroke();
        statusText.textContent = "❌ No hand detected";
        currentMode = "idle";
        smoothedX = null;
        smoothedY = null;
        lastTextPoint = null;
        return;
    }

    const landmarks = results.multiHandLandmarks[0];
    drawHandSkeleton(landmarks);

    const tip = landmarkToCanvasPoint(landmarks[8]);
    const dip = landmarkToCanvasPoint(landmarks[7]);

    const rawX = tip.x * 0.75 + dip.x * 0.25;
    const rawY = tip.y * 0.75 + dip.y * 0.25;

    const { x, y } = smoothCoordinates(rawX, rawY);
    const gesture = getGesture(landmarks);

    if (textMode) {
        handleTextMode(x, y, gesture);
        return;
    }

    handleDrawMode(x, y, gesture);
}

function handleTextMode(x, y, gesture) {
    stopStroke();

    if (gesture === "draw" || gesture === "erase") {
        lastTextPoint = { x, y };
        drawCursor(x, y, "text");
        drawTextPreview(x, y);
        statusText.textContent = "✍ Move text - make fist to place";
        currentMode = "textMove";
        return;
    }

    if (gesture === "pause") {
        if (lastTextPoint && currentMode !== "textPlace") {
            placeText(lastTextPoint.x, lastTextPoint.y);
            burstEffect(lastTextPoint.x, lastTextPoint.y, "#00bfff");
            statusText.textContent = "✅ Text placed";
        }

        currentMode = "textPlace";
        return;
    }

    statusText.textContent = "✍ Text mode active";
    currentMode = "textIdle";
}

function handleDrawMode(x, y, gesture) {
    drawCursor(x, y, gesture);

    if (gesture === "draw") {
        enableBrush();
        statusText.textContent = "✏️ Drawing";

        if (currentMode !== "draw") {
            startStroke();
            updateStats();
        }

        drawPoint(x, y);
        createParticles(x, y, currentColor, 1);
        currentMode = "draw";
        return;
    }

    if (gesture === "erase") {
        enableEraser();
        statusText.textContent = "🧽 Erasing";

        if (currentMode !== "erase") {
            startStroke();
        }

        drawPoint(x, y);
        currentMode = "erase";
        return;
    }

    if (gesture === "pause") {
        stopStroke();
        statusText.textContent = "✊ Stopped";
        currentMode = "pause";
        return;
    }

    stopStroke();
    statusText.textContent = "☝️ One finger draw | ✌️ Two fingers erase | ✊ Fist stop";
    currentMode = "idle";
}

// ===== Initialize =====
async function initializeCamera() {
    try {
        statusText.textContent = "🔄 Starting camera...";

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: 1280,
                height: 720,
                facingMode: "user"
            }
        });

        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;

        await video.play();

        console.log("Video:", video.videoWidth, "x", video.videoHeight);

        setTimeout(() => {
            const rect = document.getElementById("canvasContainer").getBoundingClientRect();

            [drawingCanvas, overlayCanvas, effectsCanvas].forEach(canvas => {
                canvas.width = rect.width;
                canvas.height = rect.height;
            });
        }, 500);

        const hands = new Hands({
            locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.75,
            minTrackingConfidence: 0.7
        });

        hands.onResults(onResults);

        async function processFrame() {
            if (video.readyState >= 2) {
                await hands.send({ image: video });
            }

            requestAnimationFrame(processFrame);
        }

        processFrame();

        statusText.textContent = "✅ Camera Ready - Show your hand!";
    } catch (error) {
        console.error("Error:", error);
        statusText.textContent = "❌ Error: " + error.message;
    }
}

// ===== Settings =====
document.getElementById("settingsBtn").onclick = () => {
    document.getElementById("settingsModal").classList.add("show");
};

document.getElementById("closeSettings").onclick = () => {
    document.getElementById("settingsModal").classList.remove("show");
};

document.getElementById("smoothingLevel").oninput = e => {
    smoothingLevel = parseInt(e.target.value);
};

document.getElementById("particlesToggle").onchange = e => {
    particlesEnabled = e.target.checked;
};

document.getElementById("soundToggle").onchange = e => {
    toggleSound(e.target.checked);
};

document.getElementById("settingsModal").onclick = e => {
    if (e.target.id === "settingsModal") {
        e.target.classList.remove("show");
    }
};

// ===== Keyboard =====
document.addEventListener("keydown", e => {
    if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") {
            e.preventDefault();
            undoDrawing();
        }

        if (e.key === "y") {
            e.preventDefault();
            redoDrawing();
        }

        if (e.key === "s") {
            e.preventDefault();
            saveDrawing();
        }
    } else if (e.key === "c") {
        clearCanvas();
    } else if (e.key === "Escape") {
        setTextMode(false);
    }
});

window.addEventListener("load", initializeCamera);

