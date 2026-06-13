// ===== DOM Elements =====
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

// Timer (HH:MM:SS format)
setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const h = String(Math.floor(elapsed / 3600)).padStart(2, "0");
    const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
    const s = String(elapsed % 60).padStart(2, "0");
    const timerDisplay = document.getElementById("timerDisplay");
    if (timerDisplay) timerDisplay.textContent = `${h}:${m}:${s}`;
}, 1000);

// Update stroke count display
function updateStrokeCount() {
    strokeCount++;
    const strokeElement = document.getElementById("strokeCount");
    if (strokeElement) strokeElement.textContent = strokeCount;
}

// ===== Smooth Coordinates =====
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

// Update current mode display
function updateModeDisplay(mode) {
    const modeDisplay = document.getElementById("currentModeDisplay");
    if (modeDisplay) {
        let displayMode = mode;
        if (mode === "draw") displayMode = "Draw";
        else if (mode === "erase") displayMode = "Erase";
        else if (mode === "pause") displayMode = "Pause";
        else if (mode === "text") displayMode = "Text Mode";
        else displayMode = "Idle";
        modeDisplay.textContent = displayMode;
    }
}

// ===== MediaPipe Results Handler =====
function onResults(results) {
    clearOverlay();

    if (!results.multiHandLandmarks || !results.multiHandLandmarks.length) {
        stopStroke();
        if (statusText) statusText.textContent = "❌ No hand detected";
        currentMode = "idle";
        smoothedX = null;
        smoothedY = null;
        lastTextPoint = null;
        
        // Update dashboard - no hands
        if (window.updateHandsDetected) window.updateHandsDetected(0);
        if (window.updateConfidence) window.updateConfidence(0);
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

    // Update dashboard with confidence and hand detection
    const confidence = results.multiHandLandmarks[0].confidence || 0.97;
    if (window.updateConfidence) window.updateConfidence(confidence);
    if (window.updateHandStatus) window.updateHandStatus(confidence);
    if (window.updateHandsDetected) window.updateHandsDetected(1, "Right Hand");

    if (textMode) {
        handleTextMode(x, y, gesture);
        return;
    }

    handleDrawMode(x, y, gesture);
}

function handleTextMode(x, y, gesture) {
    stopStroke();
    updateModeDisplay("text");

    if (gesture === "draw" || gesture === "erase") {
        lastTextPoint = { x, y };
        drawCursor(x, y, "text");
        drawTextPreview(x, y);
        if (statusText) statusText.textContent = "✍ Move text - make fist to place";
        currentMode = "textMove";
        return;
    }

    if (gesture === "pause") {
        if (lastTextPoint && currentMode !== "textPlace") {
            placeText(lastTextPoint.x, lastTextPoint.y);
            burstEffect(lastTextPoint.x, lastTextPoint.y, "#00bfff");
            if (statusText) statusText.textContent = "✅ Text placed";
        }
        currentMode = "textPlace";
        return;
    }

    if (statusText) statusText.textContent = "✍ Text mode active";
    currentMode = "textIdle";
}

function handleDrawMode(x, y, gesture) {
    drawCursor(x, y, gesture);

    if (gesture === "draw") {
        enableBrush();
        if (statusText) statusText.textContent = "✏️ Drawing";
        updateModeDisplay("draw");

        if (currentMode !== "draw") {
            startStroke();
            updateStrokeCount();
        }

        drawPoint(x, y);
        createParticles(x, y, currentColor, 1);
        currentMode = "draw";
        return;
    }

    if (gesture === "erase") {
        enableEraser();
        if (statusText) statusText.textContent = "🧽 Erasing";
        updateModeDisplay("erase");

        if (currentMode !== "erase") {
            startStroke();
        }

        drawPoint(x, y);
        currentMode = "erase";
        return;
    }

    if (gesture === "pause") {
        stopStroke();
        if (statusText) statusText.textContent = "✊ Stopped";
        updateModeDisplay("pause");
        currentMode = "pause";
        return;
    }

    stopStroke();
    if (statusText) statusText.textContent = "☝️ One finger draw | ✌️ Two fingers erase | ✊ Fist stop";
    updateModeDisplay("idle");
    currentMode = "idle";
}

// ===== Camera Initialization =====
async function initializeCamera() {
    try {
        if (statusText) statusText.textContent = "🔄 Starting camera...";

        // Get resolution from settings
        let width = 1280, height = 720;
        const resolutionSelect = document.getElementById("resolution");
        if (resolutionSelect) {
            const [w, h] = resolutionSelect.value.split("x");
            width = parseInt(w);
            height = parseInt(h);
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: width },
                height: { ideal: height },
                facingMode: "user"
            }
        });

        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;

        await video.play();

        setTimeout(() => {
            const rect = document.getElementById("canvasContainer").getBoundingClientRect();
            [drawingCanvas, overlayCanvas, effectsCanvas].forEach(canvas => {
                if (canvas) {
                    canvas.width = rect.width;
                    canvas.height = rect.height;
                }
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

        let lastFrameTime = 0;
        let frameCount = 0;
        
        async function processFrame() {
            if (video.readyState >= 2) {
                const start = performance.now();
                await hands.send({ image: video });
                const end = performance.now();
                
                // Update latency display
                const latency = Math.round(end - start);
                const latencyElement = document.getElementById("aiLatency");
                if (latencyElement) latencyElement.textContent = latency + "ms";
                
                // Update FPS chart if available
                frameCount++;
                const now = performance.now();
                if (now - lastFrameTime >= 1000) {
                    if (window.updateFPSChart) window.updateFPSChart(frameCount);
                    frameCount = 0;
                    lastFrameTime = now;
                }
            }
            requestAnimationFrame(processFrame);
        }

        processFrame();

        if (statusText) statusText.textContent = "✅ Camera Ready - Show your hand!";
        
        // Initialize FPS chart
        if (window.initFPSChart) window.initFPSChart();
        
    } catch (error) {
        console.error("Error:", error);
        if (statusText) statusText.textContent = "❌ Error: " + error.message;
    }
}

// ===== Settings Listeners =====
const smoothingSlider = document.getElementById("smoothingLevel");
if (smoothingSlider) {
    smoothingSlider.oninput = e => {
        smoothingLevel = parseInt(e.target.value);
    };
}

const particlesToggle = document.getElementById("particlesToggle");
if (particlesToggle) {
    particlesToggle.onchange = e => {
        if (window.particlesEnabled !== undefined) window.particlesEnabled = e.target.checked;
    };
}

const soundToggle = document.getElementById("soundToggle");
if (soundToggle) {
    soundToggle.onchange = e => {
        if (window.toggleSound) window.toggleSound(e.target.checked);
    };
}

const resolutionSelect = document.getElementById("resolution");
if (resolutionSelect) {
    resolutionSelect.onchange = () => {
        // Restart camera with new resolution
        if (video.srcObject) {
            const tracks = video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        }
        initializeCamera();
    };
}

// ===== Keyboard Shortcuts =====
document.addEventListener("keydown", e => {
    if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") {
            e.preventDefault();
            if (window.undoDrawing) window.undoDrawing();
        }
        if (e.key === "y") {
            e.preventDefault();
            if (window.redoDrawing) window.redoDrawing();
        }
        if (e.key === "s") {
            e.preventDefault();
            if (window.saveDrawing) window.saveDrawing();
        }
    } else if (e.key === "c") {
        if (window.clearCanvas) window.clearCanvas();
    } else if (e.key === "Escape") {
        if (window.setTextMode) window.setTextMode(false);
    }
});

// ===== Start App =====
window.addEventListener("load", initializeCamera);

// Export for dashboard
window.updateModeDisplay = updateModeDisplay;
window.updateStrokeCount = updateStrokeCount;