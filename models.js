/* =========================================================
   models.js — The Shape of Two
   Watercolor / fractured-glass aesthetic
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
   PAPER GRAIN  — cached noise texture
   ========================================================= */
let _noise = null;
let _noisePattern = null;

function getNoise() {
  if (_noise) return _noise;
  const size = 96;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const nc = c.getContext('2d');
  const img = nc.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = Math.random();
    if (n < 0.05) {
      // dark paper fiber
      const v = 120 + Math.random() * 70;
      img.data[i] = v;
      img.data[i + 1] = v * 0.93;
      img.data[i + 2] = v * 0.86;
      img.data[i + 3] = 45 + Math.random() * 45;
    } else if (n < 0.11) {
      // warm highlight speck
      img.data[i] = 255;
      img.data[i + 1] = 250;
      img.data[i + 2] = 238;
      img.data[i + 3] = 22 + Math.random() * 28;
    } else {
      img.data[i + 3] = 0;
    }
  }
  nc.putImageData(img, 0, 0);
  _noise = c;
  return _noise;
}

function getNoisePattern(ctx) {
  if (_noisePattern) return _noisePattern;
  _noisePattern = ctx.createPattern(getNoise(), 'repeat');
  return _noisePattern;
}

/* =========================================================
   MOODS — pastel watercolor palettes
   Each sky is (topColor, bottomColor). The bottom is always
   dark so that the light story text stays readable over it.
   ========================================================= */
const Moods = {
  birth: {
    sky: ['#f0d0b0', '#1a1028'],   // warm sand fading into dusky plum
    glow: '#f0a880',
    accent: '#f8d8b0',
    stars: 0.25,
    root: 110
  },
  break: {
    sky: ['#b04858', '#180810'],   // dusty rose into near-black
    glow: '#d06878',
    accent: '#f8b8c0',
    stars: 0.10,
    root: 88
  },
  dull: {
    sky: ['#908880', '#141418'],   // muted sage-grey
    glow: '#a89890',
    accent: '#c8c0b8',
    stars: 0.30,
    root: 98
  },
  love: {
    sky: ['#e098a8', '#200a12'],   // blush pink
    glow: '#f0b0c0',
    accent: '#fcd0d8',
    stars: 0.30,
    root: 130
  },
  exile: {
    sky: ['#7898a8', '#0a1018'],   // cool teal-blue
    glow: '#88a8c0',
    accent: '#b8d0e8',
    stars: 0.65,
    root: 82
  },
  two: {
    sky: ['#9888a8', '#100820'],   // twilight violet-teal
    glow: '#a898c0',
    accent: '#d0c8e8',
    stars: 0.50,
    root: 118
  },
  dawn: {
    sky: ['#e8b888', '#1a0c08'],   // warm gold cream
    glow: '#f8c898',
    accent: '#fce0b0',
    stars: 0.30,
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
   CRACK — the wound a sharp thing makes on a soft thing
   ========================================================= */
function drawCrack(ctx, cx, cy, r, angle, prog, seed) {
  const rnd = mulberry32(seed >>> 0);
  const steps = 10;
  const startR = r * 0.98;
  const endR = r * 0.08;
  const reach = Math.max(1, Math.floor(steps * prog));

  const pts = [];
  for (let i = 0; i <= reach; i++) {
    const t = i / steps;
    const rr = lerp(startR, endR, t);
    const jitter = (rnd() - 0.5) * 0.6;
    const a = angle + jitter;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. warm pink bruise halo (spreads outward from the wound)
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = 'rgba(255,150,170,0.22)';
  ctx.lineWidth = Math.max(3, r * 0.15);
  ctx.stroke();

  // 2. dark core of the wound
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = 'rgba(38,12,20,0.72)';
  ctx.lineWidth = Math.max(1, r * 0.045);
  ctx.stroke();

  // 3. bright inner highlight — the crack catches light
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = 'rgba(255,220,225,0.55)';
  ctx.lineWidth = Math.max(0.5, r * 0.018);
  ctx.stroke();

  // 4. small branching fractures
  if (prog > 0.4 && pts.length > 3) {
    for (let b = 0; b < 2; b++) {
      const bi = 2 + Math.floor(rnd() * (pts.length - 3));
      const bx = pts[bi][0], by = pts[bi][1];
      const br = r * (0.14 + rnd() * 0.22);
      const ba = angle + (rnd() - 0.5) * 2.6;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(ba) * br, by + Math.sin(ba) * br);
      ctx.strokeStyle = 'rgba(38,12,20,0.55)';
      ctx.lineWidth = Math.max(0.6, r * 0.022);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* =========================================================
   STARS — soft warm glints
   ========================================================= */
class Stars {
  constructor(W, H, n) {
    this.W = W; this.H = H;
    this.list = [];
    for (let i = 0; i < n; i++) {
      this.list.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.82,
        r: rand(0.5, 1.8),
        baseA: rand(0.20, 0.75),
        twk: rand(0.4, 2.2),
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
      // soft halo
      ctx.fillStyle = arr(accent, a * 0.16);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 3.6, 0, TAU);
      ctx.fill();
      // core
      ctx.fillStyle = arr(accent, a * 0.92);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

/* =========================================================
   SPARK — soft watercolor fleck
   ========================================================= */
class Spark {
  constructor(x, y, color, opts) {
    opts = opts || {};
    this.x = x; this.y = y;
    const a = opts.angle !== undefined ? opts.angle : rand(0, TAU);
    const sp = opts.speed !== undefined ? opts.speed : 140;
    this.vx = Math.cos(a) * sp * rand(0.6, 1.0);
    this.vy = Math.sin(a) * sp * rand(0.6, 1.0);
    this.maxLife = opts.life !== undefined ? opts.life : rand(0.5, 1.3);
    this.life = this.maxLife;
    this.r = opts.r !== undefined ? opts.r : rand(1.2, 2.8);
    this.color = color || '#ffffff';
    this.dead = false;
    this.drag = 2.2;
    this.gravity = 40;
    this.spin = rand(-3, 3);
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
    const r = this.r * (0.4 + a * 0.6);

    // soft halo
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r * 3);
    g.addColorStop(0, arr(this.color, a * 0.42));
    g.addColorStop(1, arr(this.color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r * 3, 0, TAU);
    ctx.fill();

    // paint-fleck core (slightly irregular)
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.fillStyle = arr(this.color, a * 0.95);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.25, r * 0.85, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

/* =========================================================
   MOTE — tiny drifting petal or dot of pollen
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
    this.r = rand(1.2, 2.8);
    this.vx = rand(-8, 8);
    this.vy = rand(-22, -6);
    this.a = rand(0.18, 0.5);
    this.ph = rand(0, TAU);
    this.twk = rand(0.4, 1.2);
    this.rot = rand(0, TAU);
    this.vrot = rand(-0.5, 0.5);
    this.life = rand(10, 22);
    this.age = 0;
    this.kind = Math.random() < 0.55 ? 'leaf' : 'dot';
  }
  update(dt) {
    this.t += dt;
    this.age += dt;
    this.x += this.vx * dt + Math.sin(this.t * 0.55 + this.ph) * 6 * dt;
    this.y += this.vy * dt;
    this.rot += this.vrot * dt;
    if (this.y < -14 || this.x < -14 || this.x > this.W + 14 || this.age > this.life) {
      this.reset(false);
    }
  }
  draw(ctx, color) {
    const a = this.a * (0.55 + 0.45 * Math.sin(this.t * this.twk + this.ph));
    if (a <= 0.004) return;
    ctx.save();
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.fillStyle = color;
    if (this.kind === 'leaf') {
      // tiny leaf
      ctx.beginPath();
      ctx.ellipse(0, 0, this.r * 1.9, this.r * 0.55, 0, 0, TAU);
      ctx.fill();
    } else {
      // pollen dot
      ctx.beginPath();
      ctx.arc(0, 0, this.r * 0.6, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

/* =========================================================
   SOFT — a round creature, watercolor blot
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
    const alpha = clamp(this.alpha, 0, 1);
    if (alpha < 0.005) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    /* 1. outer aura — soft warm bloom */
    const aura = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 3.2);
    aura.addColorStop(0, arr(this.color, 0.28 + this.hitGlow * 0.24));
    aura.addColorStop(0.45, arr(this.color, 0.07));
    aura.addColorStop(1, arr(this.color, 0));
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(x, y, r * 3.2, 0, TAU);
    ctx.fill();

    /* 2. body — layered watercolor blot */
    const bg = ctx.createRadialGradient(
      x - r * 0.30, y - r * 0.42, r * 0.08,
      x + r * 0.05, y + r * 0.12, r * 1.08
    );
    bg.addColorStop(0, shade(this.color, 0.46));
    bg.addColorStop(0.32, shade(this.color, 0.12));
    bg.addColorStop(0.72, this.color);
    bg.addColorStop(1, shade(this.color, -0.46));
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();

    /* 3. paper grain overlay */
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.clip();
    const pat = getNoisePattern(ctx);
    if (pat) {
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = pat;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();

    /* 4. warm top-left highlight */
    const hl = ctx.createRadialGradient(
      x - r * 0.35, y - r * 0.45, 0,
      x - r * 0.35, y - r * 0.45, r * 0.78
    );
    hl.addColorStop(0, 'rgba(255,250,240,0.55)');
    hl.addColorStop(0.5, 'rgba(255,245,230,0.14)');
    hl.addColorStop(1, 'rgba(255,245,230,0)');
    ctx.fillStyle = hl;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();

    /* 5. bottom soft shadow — reads as weight */
    const sh = ctx.createRadialGradient(
      x + r * 0.15, y + r * 0.58, 0,
      x + r * 0.15, y + r * 0.58, r * 0.92
    );
    sh.addColorStop(0, 'rgba(60,30,40,0.30)');
    sh.addColorStop(1, 'rgba(60,30,40,0)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();

    /* 6. subtle rim light */
    ctx.strokeStyle = arr('#ffffff', 0.14);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, r - 0.5, 0, TAU);
    ctx.stroke();

    /* 7. faint inner shell arcs — the creature has layers */
    ctx.strokeStyle = arr('#000000', 0.055);
    ctx.lineWidth = Math.max(0.7, r * 0.016);
    for (let i = 0; i < 3; i++) {
      const a0 = this.phase + i * 1.15;
      const rr = r * (0.38 + i * 0.18);
      ctx.beginPath();
      ctx.arc(x, y, rr, a0, a0 + 1.7);
      ctx.stroke();
    }

    /* 8. cracks — the wounds left by the sharp one */
    for (let i = 0; i < this.cracks.length; i++) {
      const c = this.cracks[i];
      if (c.prog <= 0) continue;
      drawCrack(ctx, x, y, r, c.angle, c.prog, c.seed);
    }

    ctx.restore();
  }
}

/* =========================================================
   SPIKE — a sharp triangle, a shard of warm glass
   ========================================================= */
class Spike {
  constructor(opts) {
    opts = opts || {};
    this.x = opts.x || 0;
    this.y = opts.y || 0;
    this.homeX = this.x;
    this.homeY = this.y;
    this.size = opts.size || 40;
    this.color = opts.color || '#f8d8b0';
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

    const unchanged = (this.x === this._prevX && this.y === this._prevY);
    if (unchanged) {
      const k = Math.min(1, dt * 1.2);
      this.x += (this.homeX - this.x) * k;
      this.y += (this.homeY - this.y) * k;
    }
    this._prevX = this.x;
    this._prevY = this.y;

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

    /* 1. outer warm glow */
    const gg = ctx.createRadialGradient(x, y, sz * 0.35, x, y, sz * 3.1);
    gg.addColorStop(0, arr(this.color, 0.32));
    gg.addColorStop(0.42, arr(this.color, 0.10));
    gg.addColorStop(1, arr(this.color, 0));
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(x, y, sz * 3.1, 0, TAU);
    ctx.fill();

    ctx.translate(x, y);
    ctx.rotate(rot);

    /* 2. triangle vertices (pointing up) */
    const pts = [];
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i / 3) * TAU;
      pts.push([Math.cos(a) * sz, Math.sin(a) * sz]);
    }
    const cornerR = sz * (1 - sharp) * 0.42;

    /* 3. body fill */
    pathRoundedTri(ctx, pts, cornerR);
    const bg = ctx.createRadialGradient(
      -sz * 0.28, -sz * 0.42, sz * 0.05,
      0, sz * 0.20, sz * 1.15
    );
    bg.addColorStop(0, this.edge);
    bg.addColorStop(0.30, this.color);
    bg.addColorStop(0.75, shade(this.color, -0.20));
    bg.addColorStop(1, shade(this.color, -0.50));
    ctx.fillStyle = bg;
    ctx.fill();

    /* 4. internal facets & paper grain (clipped to the body) */
    ctx.save();
    pathRoundedTri(ctx, pts, cornerR);
    ctx.clip();

    // fracture lines from centroid toward two vertices
    const cx = 0, cy = sz * 0.10;
    ctx.strokeStyle = 'rgba(255,240,220,0.28)';
    ctx.lineWidth = Math.max(0.8, sz * 0.016);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(pts[1][0] * 0.96, pts[1][1] * 0.96);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(pts[2][0] * 0.90, pts[2][1] * 0.90);
    ctx.stroke();

    // a hairline hairline crack
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = Math.max(0.5, sz * 0.010);
    ctx.beginPath();
    ctx.moveTo(pts[0][0] * 0.55, pts[0][1] * 0.55);
    ctx.lineTo(pts[2][0] * 0.60, pts[2][1] * 0.60);
    ctx.stroke();

    // paper grain
    const pat = getNoisePattern(ctx);
    if (pat) {
      ctx.globalAlpha = alpha * 0.30;
      ctx.fillStyle = pat;
      ctx.fillRect(-sz * 1.5, -sz * 1.5, sz * 3, sz * 3);
    }
    ctx.restore();

    /* 5. rim stroke */
    pathRoundedTri(ctx, pts, cornerR);
    ctx.strokeStyle = arr(this.edge, 0.55);
    ctx.lineWidth = 1.1;
    ctx.stroke();

    /* 6. corner highlights — the sharpest points catch the light */
    if (sharp > 0.4) {
      ctx.fillStyle = 'rgba(255,248,232,' + (0.55 * sharp) + ')';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(pts[i][0] * 0.93, pts[i][1] * 0.93, sz * 0.040 * sharp, 0, TAU);
        ctx.fill();
      }
    }

    /* 7. small warm glint on the upper-left shoulder */
    ctx.fillStyle = 'rgba(255,250,235,0.75)';
    ctx.beginPath();
    ctx.arc(pts[1][0] * 0.52, pts[1][1] * 0.52, sz * 0.055, 0, TAU);
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
