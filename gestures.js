// ===== Overlay Canvas =====
const overlayCanvas = document.getElementById("overlayCanvas");
const octx = overlayCanvas ? overlayCanvas.getContext("2d") : null;

// Converts MediaPipe landmarks to canvas space
function landmarkToCanvasPoint(point) {
    if (!overlayCanvas) return { x: 0, y: 0 };
    
    const canvasW = overlayCanvas.width;
    const canvasH = overlayCanvas.height;
    const videoW = video.videoWidth || canvasW;
    const videoH = video.videoHeight || canvasH;

    const scale = Math.max(canvasW / videoW, canvasH / videoH);
    const drawnW = videoW * scale;
    const drawnH = videoH * scale;
    const offsetX = (canvasW - drawnW) / 2;
    const offsetY = (canvasH - drawnH) / 2;

    return {
        x: offsetX + (1 - point.x) * drawnW,
        y: offsetY + point.y * drawnH
    };
}

// ===== Finger Detection =====
function fingersUp(landmarks) {
    const tips = [8, 12, 16, 20];
    const pips = [6, 10, 14, 18];

    return tips.map((tip, index) => {
        return landmarks[tip].y < landmarks[pips[index]].y;
    });
}

// ===== Gesture Recognition =====
function getGesture(landmarks) {
    const fingers = fingersUp(landmarks);
    const [indexUp, middleUp, ringUp, pinkyUp] = fingers;

    // Fist = Pause
    if (!indexUp && !middleUp && !ringUp && !pinkyUp) {
        return "pause";
    }

    // Index finger only = Draw
    if (indexUp && !middleUp && !ringUp && !pinkyUp) {
        return "draw";
    }

    // Index + Middle = Erase
    if (indexUp && middleUp && !ringUp && !pinkyUp) {
        return "erase";
    }

    return "idle";
}

// ===== Hand Skeleton Connections =====
const connections = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],
    [9,13],[13,14],[14,15],[15,16],
    [13,17],[17,18],[18,19],[19,20],
    [0,17]
];

function drawHandSkeleton(landmarks) {
    if (!octx) return;
    
    octx.lineWidth = 2.5;
    octx.strokeStyle = "rgba(0, 255, 136, 0.9)";

    connections.forEach(connection => {
        const start = landmarkToCanvasPoint(landmarks[connection[0]]);
        const end = landmarkToCanvasPoint(landmarks[connection[1]]);

        octx.beginPath();
        octx.moveTo(start.x, start.y);
        octx.lineTo(end.x, end.y);
        octx.stroke();
    });

    landmarks.forEach((point, index) => {
        const p = landmarkToCanvasPoint(point);
        
        // Highlight index finger tip
        const isIndexTip = index === 8;
        const size = isIndexTip ? 7 : 4;
        const color = isIndexTip ? "#ff00ff" : "rgba(0, 255, 136, 0.9)";

        octx.beginPath();
        octx.arc(p.x, p.y, size, 0, Math.PI * 2);
        octx.fillStyle = color;
        octx.fill();
        
        // Add glow to index tip
        if (isIndexTip) {
            octx.beginPath();
            octx.arc(p.x, p.y, 12, 0, Math.PI * 2);
            octx.fillStyle = "rgba(255, 0, 255, 0.2)";
            octx.fill();
        }
    });
}

// ===== Cursor with Trail =====
let cursorTrail = [];

function drawCursor(x, y, mode) {
    if (!octx) return;
    
    cursorTrail.push({ x, y, time: Date.now() });
    cursorTrail = cursorTrail.filter(p => Date.now() - p.time < 300);

    cursorTrail.forEach(point => {
        const age = (Date.now() - point.time) / 300;
        const alpha = (1 - age) * 0.4;
        const size = 10 * (1 - age);

        octx.beginPath();
        octx.arc(point.x, point.y, size, 0, Math.PI * 2);
        octx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
        octx.fill();
    });

    let color = "rgba(255, 255, 255, 0.9)";
    let innerColor = "rgba(255, 255, 255, 0.5)";
    
    if (mode === "draw") {
        color = window.currentColor ? window.currentColor() : "#ffffff";
        innerColor = color;
    }
    if (mode === "erase") {
        color = "#ff4444";
        innerColor = "#ff8888";
    }
    if (mode === "pause") {
        color = "#888888";
        innerColor = "#aaaaaa";
    }
    if (mode === "text") {
        color = "#00bfff";
        innerColor = "#88ddff";
    }

    // Outer ring
    octx.beginPath();
    octx.arc(x, y, 14, 0, Math.PI * 2);
    octx.strokeStyle = color;
    octx.lineWidth = 2.5;
    octx.stroke();

    // Inner dot
    octx.beginPath();
    octx.arc(x, y, 6, 0, Math.PI * 2);
    octx.fillStyle = innerColor;
    octx.fill();
    
    // Center dot
    octx.beginPath();
    octx.arc(x, y, 2, 0, Math.PI * 2);
    octx.fillStyle = "#ffffff";
    octx.fill();
}

function drawTextPreview(x, y) {
    if (!octx) return;
    
    const text = window.getTextValue ? window.getTextValue() : "";
    if (!text) return;

    octx.save();
    octx.font = `42px 'Segoe UI', Arial, sans-serif`;
    octx.textBaseline = "middle";
    octx.textAlign = "center";
    octx.fillStyle = "rgba(0, 191, 255, 0.25)";
    octx.strokeStyle = "#00bfff";
    octx.lineWidth = 1.5;
    octx.fillText(text, x, y);
    octx.strokeText(text, x, y);
    octx.restore();
}

function clearOverlay() {
    if (octx && overlayCanvas) {
        octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }
}

// Export for other modules
window.landmarkToCanvasPoint = landmarkToCanvasPoint;
window.getGesture = getGesture;
window.drawHandSkeleton = drawHandSkeleton;
window.drawCursor = drawCursor;
window.drawTextPreview = drawTextPreview;
window.clearOverlay = clearOverlay;