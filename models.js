/* =========================================================
   models.js
   The Shape of Two — shapes, moods, particles, animation
   ========================================================= */
(function (global) {
'use strict';

/* =========================================================
   MATH & UTILITIES
   ========================================================= */
const TAU = Math.PI * 2;

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(a, b) { return a + Math.random() * (b - a); }
function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }

const Ease = {
  linear: t => t,
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inCubic: t => t * t * t,
  outQuad: t => 1 - (1 - t) * (1 - t),
  inQuad: t => t * t,
  outSine: t => Math.sin((t * Math.PI) / 2)
};

/* =========================================================
   COLOR
   ========================================================= */
function hex2rgb(h) {
  if (!h || typeof h !== 'string') return [0, 0, 0];
  h = h.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const v = parseInt(h, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function arr(c, alpha) {
  if (typeof c !== 'string') return 'rgba(0,0,0,0)';
  if (c.indexOf('rgba') === 0 || c.indexOf('rgb') === 0) return c;
  const p = hex2rgb(c);
  return 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',' + alpha + ')';
}

function shade(hex, amount) {
  const p = hex2rgb(hex);
  const f = amount < 0 ? 0 : 255;
  const t = Math.abs(amount);
  return '#' + p.map(function (c) {
    const nc = clamp(Math.round(lerp(c, f, t)), 0, 255);
    return nc.toString(16).padStart(2, '0');
  }).join('');
}

function mixColor(c1, c2, t) {
  const a = hex2rgb(c1), b = hex2rgb(c2);
  return '#' + [0, 1, 2].map(function (i) {
    const v = clamp(Math.round(lerp(a[i], b[i], t)), 0, 255);
    return v.toString(16).padStart(2, '0');
  }).join('');
}

/* deterministic PRNG for stable crack shapes */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* =========================================================
   MOODS
   ========================================================= */
const Moods = {
  birth: {
    sky: ['#0d1024', '#03040a'],
    glow: '#5468a8',
    accent: '#ffd9a0',
    stars: 0.42,
    root: 110
  },
  break: {
    sky: ['#1c0a10', '#050205'],
    glow: '#7a1a28',
    accent: '#ff9aad',
    stars: 0.14,
    root: 88
  },
  dull: {
    sky: ['#0e1014', '#040506'],
    glow: '#3a4048',
    accent: '#a0a8b4',
    stars: 0.26,
    root: 98
  },
  love: {
    sky: ['#1c0c1c', '#060308'],
    glow: '#8a3a60',
    accent: '#ffc7d1',
    stars: 0.36,
    root: 130
  },
  exile: {
    sky: ['#060c1c', '#010205'],
    glow: '#284a78',
    accent: '#a0c4ff',
    stars: 0.74,
    root: 82
  },
  two: {
    sky: ['#0c0a20', '#030209'],
    glow: '#5040a0',
    accent: '#c0b0ff',
    stars: 0.55,
    root: 118
  },
  dawn: {
    sky: ['#1c1208', '#050204'],
    glow: '#c07040',
    accent: '#ffd9a0',
    stars: 0.32,
    root: 145
  }
};

const CHORD = {
  birth: 110,
  break: 88,
  dull: 98,
  love: 130,
  exile: 82,
  two: 118,
  dawn: 145
};

function mixMood(a, b, t) {
  if (!a) a = Moods.birth;
  if (!b) b = Moods.birth;
  return {
    sky: [mixColor(a.sky[0], b.sky[0], t), mixColor(a.sky[1], b.sky[1], t)],
    glow: mixColor(a.glow, b.glow, t),
    accent: mixColor(a.accent, b.accent, t),
    stars: lerp(a.stars, b.stars, t),
    root: lerp(a.root, b.root, t)
  };
}

/* =========================================================
   STARS
   ========================================================= */
class Stars {
  constructor(W, H, n) {
    this.W = W; this.H = H;
    this.list = [];
    for (let i = 0; i < n; i++) {
      this.list.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.85,
        r: rand(0.4, 1.7),
        baseA: rand(0.15, 0.8),
        twk: rand(0.4, 2.4),
        ph: rand(0, TAU)
      });
    }
  }
  draw(ctx, t, alpha, accent) {
    if (alpha <= 0.01) return;
    ctx.save();
    for (let i = 0; i < this.list.length; i++) {
      const s = this.list[i];
      const a = s.baseA * alpha * (0.55 + 0.45 * Math.sin(t * s.twk + s.ph));
      if (a <= 0.005) continue;
      ctx.fillStyle = arr(accent, a);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

/* =========================================================
   SPARK — particle
   ========================================================= */
class Spark {
  constructor(x, y, color, opts) {
    opts = opts || {};
    this.x = x; this.y = y;
    const a = opts.angle !== undefined ? opts.angle : rand(0, TAU);
    const sp = opts.speed !== undefined ? opts.speed : 140;
    this.vx = Math.cos(a) * sp * rand(0.6, 1.0);
    this.vy = Math.sin(a) * sp * rand(0.6, 1.0);
    this.maxLife = opts.life !== undefined ? opts.life : rand(0.4, 1.1);
    this.life = this.maxLife;
    this.r = opts.r !== undefined ? opts.r : rand(0.9, 2.4);
    this.color = color || '#ffffff';
    this.dead = false;
    this.drag = 1.9;
    this.gravity = 32;
    this.spin = rand(-4, 4);
    this.rot = rand(0, TAU);
  }
  update(dt) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    const d = Math.exp(-this.drag * dt);
    this.vx *= d;
    this.vy = this.vy * d + this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += this.spin * dt;
  }
  draw(ctx) {
    const a = clamp(this.life / this.maxLife, 0, 1);
    const r = this.r * (0.35 + a * 0.65);
    // soft halo
    ctx.fillStyle = arr(this.color, a * 0.14);
    ctx.beginPath();
    ctx.arc(this.x, this.y, r * 2.8, 0, TAU);
    ctx.fill();
    // core
    ctx.fillStyle = arr(this.color, a * 0.95);
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, TAU);
    ctx.fill();
  }
}

/* =========================================================
   MOTE — floating dust / pollen
   ========================================================= */
class Mote {
  constructor(W, H, init) {
    this.W = W; this.H = H;
    this.t = Math.random() * 100;
    this.reset(init);
  }
  reset(init) {
    this.x = Math.random() * this.W;
    this.y = init ? Math.random() * this.H : this.H + 12;
    this.r = rand(0.5, 1.9);
    this.vx = rand(-5, 5);
    this.vy = rand(-16, -4);
    this.a = rand(0.14, 0.5);
    this.ph = rand(0, TAU);
    this.twk = rand(0.4, 1.2);
    this.life = rand(6, 16);
    this.age = 0;
  }
  update(dt) {
    this.t += dt;
    this.age += dt;
    this.x += this.vx * dt + Math.sin(this.t * 0.55 + this.ph) * 6 * dt;
    this.y += this.vy * dt;
    if (this.y < -14 || this.x < -14 || this.x > this.W + 14 || this.age > this.life) {
      this.reset(false);
    }
  }
  draw(ctx, color) {
    const a = this.a * (0.55 + 0.45 * Math.sin(this.t * this.twk + this.ph));
    if (a <= 0.004) return;
    ctx.save();
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

/* =========================================================
   CRACK DRAWING (used by Soft)
   ========================================================= */
function drawCrack(ctx, cx, cy, r, angle, prog, seed) {
  const rnd = mulberry32(seed >>> 0);
  const steps = 9;
  const startR = r * 0.98;
  const endR = r * 0.12;
  const reach = Math.max(1, Math.floor(steps * prog));

  const pts = [];
  for (let i = 0; i <= reach; i++) {
    const t = i / steps;
    const rr = lerp(startR, endR, t);
    const jitter = (rnd() - 0.5) * 0.55;
    const a = angle + jitter;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // dark line
  ctx.strokeStyle = 'rgba(15, 5, 10, 0.82)';
  ctx.lineWidth = Math.max(1.2, r * 0.05);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();

  // inner pink glow (the crack "hurts")
  ctx.strokeStyle = 'rgba(255, 200, 210, 0.34)';
  ctx.lineWidth = Math.max(0.5, r * 0.02);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();

  // small branches
  if (prog > 0.45 && pts.length > 3) {
    for (let b = 0; b < 2; b++) {
      const bi = 1 + Math.floor(rnd() * (pts.length - 2));
      const bx = pts[bi][0], by = pts[bi][1];
      const br = r * (0.12 + rnd() * 0.18);
      const ba = angle + (rnd() - 0.5) * 2.4;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(ba) * br, by + Math.sin(ba) * br);
      ctx.strokeStyle = 'rgba(20, 8, 12, 0.7)';
      ctx.lineWidth = Math.max(0.8, r * 0.03);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* =========================================================
   SOFT — a round creature
   ========================================================= */
class Soft {
  constructor(opts) {
    opts = opts || {};
    this.x = opts.x || 0;
    this.y = opts.y || 0;
    this.homeX = this.x;
    this.homeY = this.y;
    this.r = opts.r || 30;
    this.color = opts.color || '#ffffff';
    this.px = this.x;
    this.py = this.y;
    this.driftAmp = 4;
    this.phase = Math.random() * TAU;
    this.t = Math.random() * 100;
    this.flinch = 0;
    this.hitGlow = 0;
    this.hurtYet = false;
    this.cracks = [];
    this.alpha = 1;
    this._prevX = this.x;
    this._prevY = this.y;
  }
  addCrack(angle) {
    this.cracks.push({
      angle: angle,
      prog: 0,
      seed: Math.floor(Math.random() * 1e9)
    });
    this.hitGlow = 1;
  }
  update(dt) {
    this.t += dt;
    if (this.flinch > 0) this.flinch = Math.max(0, this.flinch - dt * 1.35);
    if (this.hitGlow > 0) this.hitGlow = Math.max(0, this.hitGlow - dt * 1.6);

    // only ease toward home if external code didn't move us this frame
    const unchanged = (this.x === this._prevX && this.y === this._prevY);
    if (unchanged) {
      const dx = Math.sin(this.t * 0.55 + this.phase) * this.driftAmp;
      const dy = Math.cos(this.t * 0.42 + this.phase * 1.3) * this.driftAmp;
      const tx = this.homeX + dx;
      const ty = this.homeY + dy;
      const k = Math.min(1, dt * 2.2);
      this.x += (tx - this.x) * k;
      this.y += (ty - this.y) * k;
    }
    this._prevX = this.x;
    this._prevY = this.y;
    this.px = this.x;
    this.py = this.y;

    for (let i = 0; i < this.cracks.length; i++) {
      const c = this.cracks[i];
      if (c.prog < 1) c.prog = Math.min(1, c.prog + dt * 1.1);
    }
  }
  draw(ctx) {
    const jx = Math.sin(this.t * 22) * this.flinch * 2.6;
    const jy = Math.cos(this.t * 19) * this.flinch * 2.6;
    const x = this.x + jx;
    const y = this.y + jy;
    const r = this.r * (1 + this.flinch * 0.05);

    ctx.save();
    ctx.globalAlpha = clamp(this.alpha, 0, 1);

    // ambient glow
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    g.addColorStop(0, arr(this.color, 0.26 + this.hitGlow * 0.34));
    g.addColorStop(0.45, arr(this.color, 0.08));
    g.addColorStop(1, arr(this.color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 3, 0, TAU);
    ctx.fill();

    // body — radial gradient gives a soft sphere feel
    const bg = ctx.createRadialGradient(
      x - r * 0.32, y - r * 0.38, r * 0.05,
      x, y, r
    );
    bg.addColorStop(0, shade(this.color, 0.32));
    bg.addColorStop(0.4, this.color);
    bg.addColorStop(1, shade(this.color, -0.42));
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();

    // rim light
    ctx.strokeStyle = arr('#ffffff', 0.18);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, r - 0.5, 0, TAU);
    ctx.stroke();

    // soft top highlight
    const hl = ctx.createRadialGradient(
      x - r * 0.3, y - r * 0.42, 0,
      x - r * 0.3, y - r * 0.42, r * 0.5
    );
    hl.addColorStop(0, 'rgba(255,255,255,0.5)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.42, r * 0.5, 0, TAU);
    ctx.fill();

    // cracks
    for (let i = 0; i < this.cracks.length; i++) {
      const c = this.cracks[i];
      if (c.prog <= 0) continue;
      drawCrack(ctx, x, y, r, c.angle, c.prog, c.seed);
    }

    ctx.restore();
  }
}

/* =========================================================
   ROUNDED TRIANGLE PATH
   ========================================================= */
function pathRoundedTri(ctx, pts, r) {
  const n = pts.length;
  if (r < 0.6) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    return;
  }
  const mid = function (a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
  const s = mid(pts[n - 1], pts[0]);
  ctx.beginPath();
  ctx.moveTo(s[0], s[1]);
  for (let i = 0; i < n; i++) {
    const cur = pts[i];
    const nxt = pts[(i + 1) % n];
    const m = mid(cur, nxt);
    ctx.arcTo(cur[0], cur[1], m[0], m[1], r);
  }
  ctx.closePath();
}

/* =========================================================
   SPIKE — a sharp triangle
   ========================================================= */
class Spike {
  constructor(opts) {
    opts = opts || {};
    this.x = opts.x || 0;
    this.y = opts.y || 0;
    this.homeX = this.x;
    this.homeY = this.y;
    this.size = opts.size || 40;
    this.color = opts.color || '#ffd9a0';
    this.edge = opts.edge || '#fff6e2';
    this.alpha = 1;
    this.rot = 0;
    this.sharp = 1;
    this.t = 0;
    this.trail = [];
    this._prevX = this.x;
    this._prevY = this.y;
  }
  update(dt) {
    this.t += dt;

    // Ease toward home only when external code didn't move us this frame.
    // This lets the index drag the spike directly while still supporting
    // smooth home-position changes (e.g. the "one arm's length" step).
    const unchanged = (this.x === this._prevX && this.y === this._prevY);
    if (unchanged) {
      const k = Math.min(1, dt * 1.2);
      this.x += (this.homeX - this.x) * k;
      this.y += (this.homeY - this.y) * k;
    }
    this._prevX = this.x;
    this._prevY = this.y;

    // keep a short trail for optional soft motion
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 8) this.trail.shift();
  }
  draw(ctx) {
    const sz = this.size;
    const x = this.x;
    const y = this.y;
    const rot = this.rot;
    const sharp = clamp(this.sharp, 0, 1);
    const alpha = clamp(this.alpha, 0, 1);
    if (alpha < 0.005 || sz < 1) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rot);

    // outer glow
    const gsz = sz * 2.8;
    const gg = ctx.createRadialGradient(0, 0, sz * 0.35, 0, 0, gsz);
    gg.addColorStop(0, arr(this.color, 0.30));
    gg.addColorStop(0.4, arr(this.color, 0.09));
    gg.addColorStop(1, arr(this.color, 0));
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(0, 0, gsz, 0, TAU);
    ctx.fill();

    // triangle vertices (pointing up)
    const pts = [];
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i / 3) * TAU;
      pts.push([Math.cos(a) * sz, Math.sin(a) * sz]);
    }
    const cornerR = sz * (1 - sharp) * 0.45;

    // body
    pathRoundedTri(ctx, pts, cornerR);
    const bg = ctx.createRadialGradient(
      -sz * 0.28, -sz * 0.38, sz * 0.05,
      0, sz * 0.15, sz * 1.15
    );
    bg.addColorStop(0, this.edge);
    bg.addColorStop(0.35, this.color);
    bg.addColorStop(1, shade(this.color, -0.44));
    ctx.fillStyle = bg;
    ctx.fill();

    // rim
    ctx.strokeStyle = arr(this.edge, 0.55);
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // glint
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(-sz * 0.18, -sz * 0.42, sz * 0.08, 0, TAU);
    ctx.fill();

    ctx.restore();
  }
}

/* =========================================================
   EXPORT
   ========================================================= */
global.Models = {
  TAU: TAU,
  clamp: clamp,
  lerp: lerp,
  rand: rand,
  dist: dist,
  Ease: Ease,
  arr: arr,
  rs: arr,              // alias used by index.js
  shade: shade,
  hex2rgb: hex2rgb,
  mixColor: mixColor,
  mulberry32: mulberry32,
  Moods: Moods,
  CHORD: CHORD,
  mixMood: mixMood,
  Stars: Stars,
  Spark: Spark,
  Mote: Mote,
  Soft: Soft,
  Spike: Spike
};

})(typeof window !== 'undefined' ? window : this);
