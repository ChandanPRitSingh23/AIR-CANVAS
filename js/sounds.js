let audioCtx = null;
let soundEnabled = true;

// Link sound toggle from settings
const soundToggleSetting = document.getElementById("soundToggle");
if (soundToggleSetting) {
    soundToggleSetting.addEventListener("change", (e) => {
        soundEnabled = e.target.checked;
    });
}

function initAudio() {
    if (!audioCtx && soundEnabled) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            // Resume on first user interaction if needed
            if (audioCtx.state === "suspended") {
                document.addEventListener("click", () => {
                    audioCtx.resume();
                }, { once: true });
            }
        } catch (e) {
            console.warn("Web Audio API not supported");
        }
    }
}

function playTone(freq, duration = 0.1, type = "sine", volume = 0.12) {
    if (!soundEnabled) return;
    
    initAudio();
    if (!audioCtx) return;
    
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = type;
        osc.frequency.value = freq;
        
        gain.gain.setValueAtTime(volume, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
        console.warn("Error playing sound:", e);
    }
}

const sounds = {
    draw: () => playTone(880, 0.04, "sine", 0.04),
    erase: () => playTone(440, 0.06, "sawtooth", 0.05),
    color: () => playTone(660, 0.08, "sine", 0.06),
    save: () => {
        playTone(523.25, 0.1);
        setTimeout(() => playTone(659.25, 0.1), 100);
        setTimeout(() => playTone(783.99, 0.15), 200);
    },
    clear: () => playTone(220, 0.25, "sawtooth", 0.1),
    undo: () => playTone(349.23, 0.1, "triangle", 0.07),
    click: () => playTone(1000, 0.04, "sine", 0.04)
};

function playSound(name) {
    if (sounds[name] && soundEnabled) {
        sounds[name]();
    }
}

function toggleSound(enabled) {
    soundEnabled = enabled;
    if (enabled && !audioCtx) {
        initAudio();
    }
}

// Export for other modules
window.playSound = playSound;
window.toggleSound = toggleSound;