// ===== Effects Canvas =====
const effectsCanvas = document.getElementById("effectsCanvas");
const ectx = effectsCanvas.getContext("2d");

let particles = [];
let particlesEnabled = true;

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 4 + 2;
        this.speedX = (Math.random() - 0.5) * 4;
        this.speedY = (Math.random() - 0.5) * 4;
        this.life = 1;
        this.decay = Math.random() * 0.03 + 0.02;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
        this.size *= 0.98;
    }

    draw() {
        ectx.save();
        ectx.globalAlpha = this.life;
        ectx.fillStyle = this.color;
        ectx.shadowColor = this.color;
        ectx.shadowBlur = 10;
        ectx.beginPath();
        ectx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ectx.fill();
        ectx.restore();
    }
}

function createParticles(x, y, color, count = 5) {
    if (!particlesEnabled) return;
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function updateParticles() {
    ectx.clearRect(0, 0, effectsCanvas.width, effectsCanvas.height);
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    requestAnimationFrame(updateParticles);
}

updateParticles();

function burstEffect(x, y, color) {
    for (let i = 0; i < 30; i++) {
        particles.push(new Particle(x, y, color));
    }
}

