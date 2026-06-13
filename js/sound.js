let audioCtx = null;
let soundEnabled = true;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playTone(freq, duration = 0.1, type = "sine", volume = 0.1) {
    if (!soundEnabled) return;
    initAudio();
    
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
}

const sounds = {
    draw: () => playTone(800, 0.05, "sine", 0.05),
    erase: () => playTone(400, 0.05, "sawtooth", 0.05),
    color: () => playTone(600, 0.1, "sine", 0.08),
    save: () => {
        playTone(523, 0.1);
        setTimeout(() => playTone(659, 0.1), 100);
        setTimeout(() => playTone(784, 0.15), 200);
    },
    clear: () => playTone(200, 0.2, "sawtooth", 0.1),
    undo: () => playTone(300, 0.1, "triangle", 0.08),
    click: () => playTone(1000, 0.05, "sine", 0.05)
};

function playSound(name) {
    if (sounds[name]) sounds[name]();
}

function toggleSound(enabled) {
    soundEnabled = enabled;
}

