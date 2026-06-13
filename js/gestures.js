// ===== Overlay Canvas =====
const overlayCanvas = document.getElementById("overlayCanvas");
const octx = overlayCanvas.getContext("2d");

// Converts MediaPipe landmarks to the same cropped/scaled space as the video.
function landmarkToCanvasPoint(point) {
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
// Only 3 gestures now:
// ☝️ Draw
// ✌️ Erase
// ✊ Stop / Place text
function getGesture(landmarks) {
    const fingers = fingersUp(landmarks);
    const [indexUp, middleUp, ringUp, pinkyUp] = fingers;

    if (!indexUp && !middleUp && !ringUp && !pinkyUp) {
        return "pause";
    }

    if (indexUp && !middleUp && !ringUp && !pinkyUp) {
        return "draw";
    }

    if (indexUp && middleUp && !ringUp && !pinkyUp) {
        return "erase";
    }

    return "idle";
}

// ===== Hand Skeleton =====
const connections = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],
    [9,13],[13,14],[14,15],[15,16],
    [13,17],[17,18],[18,19],[19,20],
    [0,17]
];

function drawHandSkeleton(landmarks) {
    octx.lineWidth = 2;
    octx.strokeStyle = "rgba(0, 255, 136, 0.8)";

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

        octx.beginPath();
        octx.arc(p.x, p.y, index === 8 ? 6 : 3, 0, Math.PI * 2);
        octx.fillStyle = index === 8 ? "#ff00ff" : "rgba(0, 255, 136, 0.8)";
        octx.fill();
    });
}

// ===== Cursor =====
let cursorTrail = [];

function drawCursor(x, y, mode) {
    cursorTrail.push({ x, y, time: Date.now() });
    cursorTrail = cursorTrail.filter(p => Date.now() - p.time < 300);

    cursorTrail.forEach(point => {
        const age = (Date.now() - point.time) / 300;
        const alpha = (1 - age) * 0.5;
        const size = 8 * (1 - age);

        octx.beginPath();
        octx.arc(point.x, point.y, size, 0, Math.PI * 2);
        octx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
        octx.fill();
    });

    let color = "rgba(255, 255, 255, 0.8)";
    if (mode === "draw") color = currentColor || "#ffffff";
    if (mode === "erase") color = "#ff4444";
    if (mode === "pause") color = "#888888";
    if (mode === "text") color = "#00bfff";

    octx.beginPath();
    octx.arc(x, y, 12, 0, Math.PI * 2);
    octx.strokeStyle = color;
    octx.lineWidth = 2;
    octx.stroke();

    octx.beginPath();
    octx.arc(x, y, 5, 0, Math.PI * 2);
    octx.fillStyle = color;
    octx.fill();
}

function drawTextPreview(x, y) {
    const text = getTextValue();
    if (!text) return;

    octx.save();
    octx.font = `${textSize}px Segoe UI, Arial, sans-serif`;
    octx.textBaseline = "middle";
    octx.fillStyle = "rgba(0, 191, 255, 0.25)";
    octx.strokeStyle = "#00bfff";
    octx.lineWidth = 1;
    octx.fillText(text, x, y);
    octx.strokeText(text, x, y);
    octx.restore();
}

function clearOverlay() {
    octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
}
