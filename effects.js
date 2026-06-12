// ===== Effects Canvas =====
const effectsCanvas = document.getElementById("effectsCanvas");
const ectx = effectsCanvas ? effectsCanvas.getContext("2d") : null;

let particles = [];
let particlesEnabled = true;

// Link particles toggle from settings
const particlesToggleSetting = document.getElementById("particlesToggle");
if (particlesToggleSetting) {
    particlesToggleSetting.addEventListener("change", (e) => {
        particlesEnabled = e.target.checked;
    });
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 5 + 2;
        this.speedX = (Math.random() - 0.5) * 5;
        this.speedY = (Math.random() - 0.5) * 5;
        this.life = 1;
        this.decay = Math.random() * 0.03 + 0.02;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
        this.size *= 0.97;
        this.speedX *= 0.98;
        this.speedY *= 0.98;
    }

    draw() {
        if (!ectx) return;
        
        ectx.save();
        ectx.globalAlpha = this.life;
        ectx.fillStyle = this.color;
        ectx.shadowColor = this.color;
        ectx.shadowBlur = 8;
        ectx.beginPath();
        ectx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ectx.fill();
        ectx.restore();
    }
}

function createParticles(x, y, color, count = 5) {
    if (!particlesEnabled || !ectx) return;
    
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function updateParticles() {
    if (!ectx || !effectsCanvas) return;
    
    ectx.clearRect(0, 0, effectsCanvas.width, effectsCanvas.height);
    
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    
    requestAnimationFrame(updateParticles);
}

// Start particle animation
updateParticles();

function burstEffect(x, y, color) {
    if (!particlesEnabled) return;
    
    for (let i = 0; i < 35; i++) {
        const particle = new Particle(x, y, color);
        particle.speedX = (Math.random() - 0.5) * 8;
        particle.speedY = (Math.random() - 0.5) * 8;
        particle.size = Math.random() * 6 + 3;
        particles.push(particle);
    }
}

// Export for other modules
window.createParticles = createParticles;
window.burstEffect = burstEffect;
window.particlesEnabled = particlesEnabled;