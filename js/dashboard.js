// Dashboard UI Controller
document.addEventListener('DOMContentLoaded', () => {
    // Tab Switching
    const navItems = document.querySelectorAll('.nav-item');
    const tabs = {
        draw: document.getElementById('drawTab'),
        ai: document.getElementById('aiTab'),
        gestures: document.getElementById('gesturesTab'),
        settings: document.getElementById('settingsTab')
    };
    const pageTitle = document.getElementById('pageTitle');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.dataset.tab;
            
            // Update active state
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Show correct tab
            Object.values(tabs).forEach(tabEl => {
                if (tabEl) tabEl.style.display = 'none';
            });
            
            if (tabs[tab]) {
                tabs[tab].style.display = 'block';
            }
            
            // Update page title
            const titles = {
                draw: 'Drawing Board',
                ai: 'AI Detection',
                gestures: 'Gesture Guide',
                settings: 'Settings'
            };
            pageTitle.textContent = titles[tab] || 'Drawing Board';
        });
    });

    // Brush Size Display
    const brushSlider = document.getElementById('brushSizeSlider');
    const brushSizeValue = document.getElementById('brushSizeValue');
    
    if (brushSlider && brushSizeValue) {
        brushSlider.addEventListener('input', (e) => {
            brushSizeValue.textContent = e.target.value;
            if (window.brushSize) window.brushSize = parseInt(e.target.value);
        });
    }

    // Draw/Erase Mode Buttons
    const drawModeBtn = document.getElementById('drawModeBtn');
    const eraseModeBtn = document.getElementById('eraseModeBtn');
    
    if (drawModeBtn) {
        drawModeBtn.addEventListener('click', () => {
            if (window.enableBrush) window.enableBrush();
            updateModeDisplay('Draw');
        });
    }
    
    if (eraseModeBtn) {
        eraseModeBtn.addEventListener('click', () => {
            if (window.enableEraser) window.enableEraser();
            updateModeDisplay('Erase');
        });
    }

    function updateModeDisplay(mode) {
        const modeDisplay = document.getElementById('currentModeDisplay');
        if (modeDisplay) modeDisplay.textContent = mode;
    }

    // Fullscreen Button
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            const container = document.getElementById('canvasContainer');
            if (container.requestFullscreen) {
                container.requestFullscreen();
            }
        });
    }

    // FPS Counter and Stats Update
    let frameCount = 0;
    let lastTime = performance.now();
    let fps = 28;
    
    function updateFPS() {
        frameCount++;
        const now = performance.now();
        if (now - lastTime >= 1000) {
            fps = frameCount;
            const fpsElement = document.getElementById('fpsValue');
            const aiFpsElement = document.getElementById('aiFPS');
            if (fpsElement) fpsElement.textContent = fps;
            if (aiFpsElement) aiFpsElement.textContent = fps;
            frameCount = 0;
            lastTime = now;
        }
        requestAnimationFrame(updateFPS);
    }
    updateFPS();

    // Update confidence display
    window.updateConfidence = (confidence) => {
        const confValue = document.getElementById('confidenceValue');
        const confFill = document.getElementById('confidenceFill');
        const accuracyValue = document.getElementById('accuracyValue');
        const aiConfidence = document.getElementById('aiConfidence');
        
        if (confValue) confValue.textContent = Math.round(confidence * 100);
        if (confFill) confFill.style.width = (confidence * 100) + '%';
        if (accuracyValue) accuracyValue.textContent = (confidence * 100).toFixed(1);
        if (aiConfidence) aiConfidence.textContent = (confidence * 100).toFixed(1) + '%';
    };

    // Update hands detected
    window.updateHandsDetected = (count, handType = 'Right Hand') => {
        const handsDetected = document.getElementById('handsDetected');
        const detectionHand = document.getElementById('detectionHand');
        
        if (handsDetected) handsDetected.textContent = count;
        if (detectionHand && count > 0) {
            detectionHand.textContent = handType;
        } else if (detectionHand) {
            detectionHand.textContent = 'None';
        }
    };

    // Update hand status
    window.updateHandStatus = (confidence) => {
        const handStatus = document.getElementById('handStatus');
        if (handStatus) {
            handStatus.textContent = `Hand Confidence: ${Math.round(confidence * 100)}%`;
        }
    };
});

// FPS Chart for AI Tab
let fpsChart = null;

function initFPSChart() {
    const ctx = document.getElementById('fpsChart')?.getContext('2d');
    if (!ctx) return;
    
    fpsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(20).fill(''),
            datasets: [{
                label: 'FPS',
                data: Array(20).fill(30),
                borderColor: '#00ff88',
                backgroundColor: 'rgba(0, 255, 136, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { labels: { color: '#aaa' } }
            },
            scales: {
                y: { 
                    min: 0, 
                    max: 60,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#aaa' }
                },
                x: { ticks: { display: false } }
            }
        }
    });
}

// Call this when AI tab is first shown
function updateFPSChart(fps) {
    if (fpsChart) {
        const newData = [...fpsChart.data.datasets[0].data.slice(1), fps];
        fpsChart.data.datasets[0].data = newData;
        fpsChart.update();
    }
}

window.initFPSChart = initFPSChart;