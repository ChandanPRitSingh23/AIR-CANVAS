// ===== Air Palette (Floating) =====
const airPalette = document.getElementById("airPalette");
let paletteActive = false;
let hoveredColor = null;
let lastPaletteTrigger = 0;
let paletteHideTimeout = null;

// Show/Hide air palette
function toggleAirPalette(show) {
    paletteActive = show;
    if (show) {
        airPalette.classList.add("show");
        // Auto-hide after 5 seconds if no selection
        clearTimeout(paletteHideTimeout);
        paletteHideTimeout = setTimeout(() => {
            if (paletteActive) toggleAirPalette(false);
        }, 5000);
    } else {
        airPalette.classList.remove("show");
        document.querySelectorAll(".air-color").forEach(c => {
            c.classList.remove("hover");
            c.classList.remove("active");
        });
    }
}

// Check if finger is over a color in air palette
function checkAirPaletteHover(x, y) {
    if (!paletteActive) return false;
    
    const colors = document.querySelectorAll(".air-color");
    let found = false;
    let firstHover = null;
    
    colors.forEach(colorEl => {
        const rect = colorEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const radius = rect.width / 2;
        
        const dist = Math.hypot(x - centerX, y - centerY);
        
        if (dist < radius * 1.8) {
            colorEl.classList.add("hover");
            colorEl.classList.add("active");
            hoveredColor = colorEl.dataset.color;
            found = true;
            if (!firstHover) firstHover = colorEl;
        } else {
            colorEl.classList.remove("hover");
        }
    });
    
    // Auto-pick color after hovering (with debounce)
    if (found && hoveredColor) {
        setColor(hoveredColor);
        burstEffect(x, y, hoveredColor);
    }
    
    return found;
}

// Air palette button
document.getElementById("airPaletteBtn").addEventListener("click", () => {
    toggleAirPalette(!paletteActive);
});

// Close button
const closeBtn = document.createElement("span");
closeBtn.innerHTML = "&times;";
closeBtn.className = "air-palette-close";
closeBtn.onclick = () => toggleAirPalette(false);
airPalette.appendChild(closeBtn);

// Close palette when clicking outside
document.addEventListener("click", (e) => {
    if (paletteActive && !airPalette.contains(e.target) && e.target.id !== "airPaletteBtn") {
        // Don't close on canvas click
    }
});
