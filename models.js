// models.js

// Math Utilities
const lerp = (start, end, amt) => (1 - amt) * start + amt * end;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 200;
        this.vy = (Math.random() - 0.5) * 200;
        this.life = 1.0;
        this.decay = Math.random() * 0.5 + 0.2;
        this.size = Math.random() * 4 + 2;
        this.color = color || `rgba(255, 100, 100, 0.8)`;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vx *= 0.95; // Friction
        this.vy *= 0.95;
        this.vy += 20 * dt; // Gentle gravity
        this.life -= this.decay * dt;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life;
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

class SharpShape {
    constructor(x, y) {
        this.pos = { x: x, y: y };
        this.targetPos = { x: x, y: y };
        this.rotation = 0;
        this.targetRotation = 0;
        this.size = 40;
        
        // Create a jagged, sharp polygon
        this.vertices = [
            { x: 0, y: -this.size },
            { x: this.size * 0.4, y: -this.size * 0.2 },
            { x: this.size * 0.8, y: this.size * 0.6 },
            { x: this.size * 0.2, y: this.size * 0.4 },
            { x: 0, y: this.size * 1.2 },
            { x: -this.size * 0.2, y: this.size * 0.4 },
            { x: -this.size * 0.8, y: this.size * 0.6 },
            { x: -this.size * 0.4, y: -this.size * 0.2 }
        ];
    }

    update(dt, camera) {
        // Smooth movement towards target
        this.pos.x = lerp(this.pos.x, this.targetPos.x, 5 * dt);
        this.pos.y = lerp(this.pos.y, this.targetPos.y, 5 * dt);
        
        // Subtle breathing rotation
        this.targetRotation = Math.sin(performance.now() / 2000) * 0.1;
        this.rotation = lerp(this.rotation, this.targetRotation, 2 * dt);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.rotation);

        // Draw shadow/glow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 10;

        // Draw the sharp shape
        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        ctx.closePath();

        // Dark, metallic gradient
        const grad = ctx.createLinearGradient(-this.size, -this.size, this.size, this.size);
        grad.addColorStop(0, '#2a2a2a');
        grad.addColorStop(0.5, '#111111');
        grad.addColorStop(1, '#050505');
        
        ctx.fillStyle = grad;
        ctx.fill();
        
        // Sharp edge highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }
}

class SoftShape {
    constructor(x, y, type) {
        this.pos = { x: x, y: y };
        this.type = type;
        this.size = type === 'circle' ? 50 : 40;
        this.time = 0;
        this.color = type === 'distant' ? 'rgba(255, 150, 150, 0.2)' : 'rgba(255, 200, 200, 0.6)';
    }

    update(dt) {
        this.time += dt;
        // Gentle floating
        this.pos.y += Math.sin(this.time * 2) * 0.5;
        this.pos.x += Math.cos(this.time * 1.5) * 0.5;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 30;

        if (this.type === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, this.size + Math.sin(this.time * 3) * 5, 0, Math.PI * 2);
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 1.5);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            grad.addColorStop(0.5, this.color);
            grad.addColorStop(1, 'rgba(255, 200, 200, 0)');
            ctx.fillStyle = grad;
            ctx.fill();
        } 
        else if (this.type === 'ribbon') {
            ctx.beginPath();
            ctx.moveTo(-this.size * 2, 0);
            ctx.bezierCurveTo(
                -this.size, -this.size * 2 + Math.sin(this.time * 2) * 20,
                this.size, this.size * 2 + Math.cos(this.time * 2) * 20,
                this.size * 2, 0
            );
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 10;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
        else if (this.type === 'distant') {
            ctx.beginPath();
            ctx.arc(0, 0, this.size + Math.sin(this.time) * 2, 0, Math.PI * 2);
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 3);
            grad.addColorStop(0, 'rgba(255, 200, 200, 0.8)');
            grad.addColorStop(1, 'rgba(255, 150, 150, 0)');
            ctx.fillStyle = grad;
            ctx.fill();
        }

        ctx.restore();
    }
}

class Environment {
    constructor(w, h, type) {
        this.width = w * 2;
        this.height = h * 2;
        this.type = type; // 0-4
        this.time = 0;
        
        // Pre-generate background elements based on type
        this.elements = [];
        this.generate();
    }

    generate() {
        this.elements = [];
        const numElements = this.type === 4 ? 20 : 8;
        
        for (let i = 0; i < numElements; i++) {
            this.elements.push({
                x: (Math.random() - 0.5) * this.width * 1.5,
                y: (Math.random() - 0.5) * this.height * 1.5,
                size: Math.random() * 300 + 100,
                rotation: Math.random() * Math.PI,
                speed: Math.random() * 0.1 + 0.05,
                type: Math.random() > 0.5 ? 'arch' : 'monolith'
            });
        }
    }

    update(dt) {
        this.time += dt;
        this.elements.forEach(el => {
            el.rotation += el.speed * dt * 0.1;
        });
    }

    draw(ctx) {
        // Background gradient based on chapter
        let topColor, bottomColor;
        
        switch(this.type) {
            case 0: // I. The Edge
                topColor = '#1a1515';
                bottomColor = '#0d0909';
                break;
            case 1: // II. The Warmth
                topColor = '#3d1a1a';
                bottomColor = '#1a0d0d';
                break;
            case 2: // III. The Distance
                topColor = '#1a1a2e';
                bottomColor = '#0d0d1a';
                break;
            case 3: // IV. The Cruel Gravity
                topColor = '#4a2a2a';
                bottomColor = '#1a0d0d';
                break;
            case 4: // V. The Vastness
                topColor = '#2a1a1a';
                bottomColor = '#0d0909';
                break;
            default:
                topColor = '#111';
                bottomColor = '#000';
        }

        const grad = ctx.createLinearGradient(0, -this.height/2, 0, this.height/2);
        grad.addColorStop(0, topColor);
        grad.addColorStop(1, bottomColor);
        
        ctx.fillStyle = grad;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);

        // Draw fog/atmosphere
        ctx.globalAlpha = 0.1;
        for (let i = 0; i < 3; i++) {
            const fogGrad = ctx.createRadialGradient(
                Math.sin(this.time * 0.5 + i) * 500, 
                Math.cos(this.time * 0.3 + i) * 500, 
                0,
                Math.sin(this.time * 0.5 + i) * 500, 
                Math.cos(this.time * 0.3 + i) * 500, 
                800
            );
            fogGrad.addColorStop(0, this.type === 1 || this.type === 3 ? 'rgba(255, 100, 100, 0.5)' : 'rgba(100, 100, 150, 0.5)');
            fogGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = fogGrad;
            ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        }
        ctx.globalAlpha = 1.0;

        // Draw geometric architecture (silhouettes)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 2;

        this.elements.forEach(el => {
            ctx.save();
            ctx.translate(el.x, el.y);
            ctx.rotate(el.rotation);

            ctx.beginPath();
            if (el.type === 'arch') {
                // Draw an arch
                ctx.arc(0, 0, el.size, Math.PI, 0);
                ctx.lineTo(el.size, el.size);
                ctx.lineTo(-el.size, el.size);
                ctx.closePath();
            } else {
                // Draw a monolith
                ctx.rect(-el.size * 0.3, -el.size, el.size * 0.6, el.size * 2);
            }
            ctx.fill();
            ctx.stroke();
            
            ctx.restore();
        });
    }
}
