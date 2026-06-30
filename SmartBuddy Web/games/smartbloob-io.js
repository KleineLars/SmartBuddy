
// ═══════════════════════════════════════════════════════════
// SmartBuddy.IO — Agar.io in SmartBuddy stijl
// ═══════════════════════════════════════════════════════════

// ── Firebase ──
// db wordt nu geïnitialiseerd via static/js/firebase-config.js
const playersRef = db.ref('games/SmartBuddy-io/players');
const killsRef = db.ref('games/SmartBuddy-io/kills');
let myFirebaseId = 'p_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();


const urlParams = new URLSearchParams(window.location.search);
const themeParam = urlParams.get('theme');
let THEME = {
  accent: '#FF520E',
  base01: '#0a0a0a',
  base02: '#0f0f0f',
  border: 'rgba(255,255,255,0.06)',
  text: '#ffffff',
  muted: '#888888'
};
if (themeParam) {
  try {
    Object.assign(THEME, JSON.parse(themeParam));
    const r = document.documentElement;
    r.style.setProperty('--sg-accent', THEME.accent);
    r.style.setProperty('--sg-base01', THEME.base01);
    r.style.setProperty('--sg-base02', THEME.base02);
    r.style.setProperty('--sg-border', THEME.border);
    r.style.setProperty('--sg-text', THEME.text);
    r.style.setProperty('--sg-muted', THEME.muted);
  } catch(e) {}
}

// ── Canvas ──
const canvas = document.getElementById('gc');
const ctx = canvas.getContext('2d');
const mCanvas = document.getElementById('minimap-cv');
const mCtx = mCanvas.getContext('2d');

// ── Constants ──
const W = 6000, H = 6000;
const GRID = 100;
const START_MASS = 80;
const EAT_RATIO = 1.15;
const MAX_CELLS = 16;
const MERGE_TIME = 12000;
const EJECT_MASS = 14;
const FOOD_COUNT = 600;
const BOT_COUNT = 20;
const VIRUS_COUNT = 12;
const VIRUS_MASS = 120;
const FOOD_GRID_SIZE = 250;

const COLORS = ['#ff6600','#3b82f6','#2dd4bf','#8b5cf6','#ef4444','#22c55e','#f59e0b','#ec4899'];
let selectedColor = COLORS[0];

const BOT_NAMES = [
  'SmartLeerling','GridMeester','CijferKoning','HuiswerkHeld','PuntenJager',
  'SlimmeVos','ToetsKampioen','BoekenWorm','KlasKoning','RekenWonder',
  'TaalHeld','SmartStudent','GridGoeroe','CijferJager','StudieBeest',
  'WiskundeWolf','SchoolHaai','LeesLeeuw','PenPiraat','KennisKoning',
  'GridNinja','SmartHaai','DataDemon','ByteBaas','PixelPrins'
];

// ── Utility ──
function massToR(m) { return Math.sqrt(m) * 4.5; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
let availableBotNames = [...BOT_NAMES];
function rndName() {
  if (availableBotNames.length === 0) availableBotNames = [...BOT_NAMES];
  const idx = Math.floor(Math.random() * availableBotNames.length);
  const name = availableBotNames[idx];
  availableBotNames.splice(idx, 1);
  return name;
}
function rndColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }
const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// ── State ──
let foods = [], ejected = [], viruses = [], bots = [];
let player = { cells: [], name: '', color: '', dead: false, score: 0, maxScore: 0, kills: 0 };
let remotePlayers = {};
let mouseWorld = { x: W / 2, y: W / 2 };
let cam = { x: W / 2, y: H / 2, zoom: 1 };
let gameRunning = false, lastTime = 0;
let foodGrid = {}, foodGridDirty = true;
let isBoosting = false;

// ── Resize ──
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const bg = document.getElementById('start-bg');
  if (bg) { bg.width = window.innerWidth; bg.height = window.innerHeight; }
}
window.addEventListener('resize', resize);
resize();

// ── Color picker ──
(function buildColors() {
  const row = document.getElementById('color-row');
  COLORS.forEach((c, i) => {
    const btn = document.createElement('div');
    btn.className = 'color-btn' + (i === 0 ? ' active' : '');
    btn.style.background = c;
    btn.style.setProperty('--c', c);
    btn.onclick = () => {
      document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedColor = c;
    };
    row.appendChild(btn);
  });
})();

// ── Start screen animated background ──
(function animStartBg() {
  const bg = document.getElementById('start-bg');
  if (!bg) return;
  const bCtx = bg.getContext('2d');
  const dots = [];
  for (let i = 0; i < 40; i++) dots.push({
    x: Math.random() * 2000, y: Math.random() * 2000,
    r: 3 + Math.random() * 12, color: '#FF520E',
    vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5
  });
  function draw() {
    const w = bg.width, h = bg.height;
    bCtx.fillStyle = THEME.base01;
    bCtx.fillRect(0, 0, w, h);
    bCtx.strokeStyle = 'rgba(255,102,0,0.04)';
    bCtx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 60) { bCtx.beginPath(); bCtx.moveTo(x, 0); bCtx.lineTo(x, h); bCtx.stroke(); }
    for (let y = 0; y < h; y += 60) { bCtx.beginPath(); bCtx.moveTo(0, y); bCtx.lineTo(w, y); bCtx.stroke(); }
    dots.forEach(d => {
      d.x += d.vx; d.y += d.vy;
      if (d.x < 0 || d.x > w) d.vx *= -1;
      if (d.y < 0 || d.y > h) d.vy *= -1;
      bCtx.globalAlpha = 0.3;
      bCtx.beginPath();
      bCtx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      const g = bCtx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
      g.addColorStop(0, d.color + 'cc'); g.addColorStop(1, d.color + '33');
      bCtx.fillStyle = g;
      bCtx.fill();
      bCtx.globalAlpha = 1;
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ══════════════════════════════════════════
// CELL CLASS
// ══════════════════════════════════════════
class Cell {
  constructor(x, y, mass, color, name, isPlayer = false) {
    this.x = x; this.y = y; this.mass = mass;
    this.color = color; this.name = name; this.isPlayer = isPlayer;
    this.vx = 0; this.vy = 0;
    this.splitVx = 0; this.splitVy = 0; this.splitSpd = 0;
    this.mergeTimer = 0;
    this.id = Math.random();
  }
  get r() { return massToR(this.mass); }
}

// ══════════════════════════════════════════
// FOOD
// ══════════════════════════════════════════
function spawnFood(n) {
  for (let i = 0; i < n; i++) {
    if (foods.length >= FOOD_COUNT) break;
    foods.push({
      x: Math.random() * W, y: Math.random() * H,
      mass: 5 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    });
    foodGridDirty = true;
  }
}

function rebuildFoodGrid() {
  foodGrid = {};
  for (let i = 0; i < foods.length; i++) {
    const f = foods[i];
    const k = (Math.floor(f.x / FOOD_GRID_SIZE) << 12) | Math.floor(f.y / FOOD_GRID_SIZE);
    if (!foodGrid[k]) foodGrid[k] = [];
    foodGrid[k].push(i);
  }
  foodGridDirty = false;
}

// ══════════════════════════════════════════
// VIRUSES
// ══════════════════════════════════════════
function spawnVirus() {
  viruses.push({ x: Math.random() * W, y: Math.random() * H, mass: VIRUS_MASS, pulse: Math.random() * Math.PI * 2 });
}

// ══════════════════════════════════════════
// PHYSICS
// ══════════════════════════════════════════
function getSpeed(mass) {
  const s = Math.max(60, 5500 / Math.sqrt(mass));
  return isMobile ? s * 0.75 : s;
}

function moveCell(c, dt) {
  if (c.splitSpd > 0) {
    c.x += c.splitVx * c.splitSpd * dt;
    c.y += c.splitVy * c.splitSpd * dt;
    c.splitSpd *= Math.max(0, 1 - 7 * dt);
    if (c.splitSpd < 1) c.splitSpd = 0;
  }
  c.x += c.vx * dt;
  c.y += c.vy * dt;
  const r = c.r;
  c.x = clamp(c.x, r, W - r);
  c.y = clamp(c.y, r, H - r);
  if (c.mass > START_MASS) c.mass = Math.max(START_MASS, c.mass * (1 - 0.0001 * dt * 60));
  if (c.mergeTimer > 0) c.mergeTimer -= dt * 1000;
}

function selfCollide(cells) {
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const a = cells[i], b = cells[j];
      if (a.mergeTimer > 0 || b.mergeTimer > 0) {
        const d = dist(a, b), minD = a.r + b.r;
        if (d < minD) {
          const ol = minD - d, ang = Math.atan2(b.y - a.y, b.x - a.x);
          a.x -= Math.cos(ang) * ol * 0.3; a.y -= Math.sin(ang) * ol * 0.3;
          b.x += Math.cos(ang) * ol * 0.3; b.y += Math.sin(ang) * ol * 0.3;
        }
      }
    }
  }
}

function tryMerge(cells) {
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const a = cells[i], b = cells[j];
      if (a.mergeTimer <= 0 && b.mergeTimer <= 0 && dist(a, b) < Math.max(a.r, b.r)) {
        a.mass += b.mass;
        cells.splice(j, 1);
        j--;
      }
    }
  }
}

function splitCells(cells, tx, ty, isPlayer) {
  if (cells.length >= MAX_CELLS) return;
  const canSplit = [...cells].filter(c => c.mass >= 36).slice(0, MAX_CELLS - cells.length);
  canSplit.forEach(c => {
    if (cells.length >= MAX_CELLS) return;
    const half = c.mass / 2;
    c.mass = half;
    const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy) + 0.01;
    const nc = new Cell(c.x, c.y, half, c.color, c.name, isPlayer);
    nc.splitVx = dx / d; nc.splitVy = dy / d;
    nc.splitSpd = 800; nc.mergeTimer = MERGE_TIME;
    c.mergeTimer = MERGE_TIME;
    cells.push(nc);
  });
}

function ejectMass(cells, tx, ty) {
  cells.forEach(c => {
    if (c.mass < EJECT_MASS * 1.5) return;
    c.mass -= EJECT_MASS;
    const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy) + 0.01;
    if (ejected.length < 80) ejected.push({
      x: c.x + (dx / d) * c.r, y: c.y + (dy / d) * c.r,
      mass: EJECT_MASS, color: c.color,
      vx: (dx / d) * 500, vy: (dy / d) * 500, spd: 500, owner: c.id
    });
  });
}

// ── Eating ──
function eatFood(cells) {
  if (foodGridDirty) rebuildFoodGrid();
  const toRemove = new Set();
  for (const c of cells) {
    const r = c.r;
    const gx0 = Math.floor((c.x - r) / FOOD_GRID_SIZE), gx1 = Math.floor((c.x + r) / FOOD_GRID_SIZE);
    const gy0 = Math.floor((c.y - r) / FOOD_GRID_SIZE), gy1 = Math.floor((c.y + r) / FOOD_GRID_SIZE);
    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gy = gy0; gy <= gy1; gy++) {
        const bucket = foodGrid[(gx << 12) | gy];
        if (!bucket) continue;
        for (const idx of bucket) {
          if (toRemove.has(idx)) continue;
          const f = foods[idx];
          if (f && dist(c, f) < r) { c.mass += f.mass; toRemove.add(idx); }
        }
      }
    }
  }
  if (toRemove.size) {
    [...toRemove].sort((a, b) => b - a).forEach(i => foods.splice(i, 1));
    foodGridDirty = true;
  }
}

function eatEjected(cells) {
  for (let i = ejected.length - 1; i >= 0; i--) {
    const e = ejected[i];
    for (const c of cells) {
      if (dist(c, e) < c.r && c.mass > e.mass) {
        c.mass += e.mass * 0.8;
        ejected.splice(i, 1);
        break;
      }
    }
  }
}

function eatVirus(cells, isPlayer) {
  for (let v = viruses.length - 1; v >= 0; v--) {
    const vir = viruses[v];
    for (const c of cells) {
      if (c.mass > vir.mass * 1.15 && dist(c, vir) < c.r) {
        viruses.splice(v, 1);
        const pops = Math.min(MAX_CELLS - cells.length, 10);
        for (let p = 0; p < pops; p++) {
          const ang = (Math.PI * 2 * p) / pops;
          const sm = c.mass / (pops + 1);
          const nc = new Cell(c.x, c.y, sm, c.color, c.name, isPlayer);
          nc.splitVx = Math.cos(ang); nc.splitVy = Math.sin(ang);
          nc.splitSpd = 250; nc.mergeTimer = MERGE_TIME;
          cells.push(nc);
        }
        c.mass /= (pops + 1);
        c.mergeTimer = MERGE_TIME;
        spawnVirus();
        if (isPlayer) showToast('Virus geraakt!');
        break;
      }
    }
  }
}

function eatSmaller(eaterCells, victimCells, victimEntity, eaterIsPlayer) {
  for (const a of eaterCells) {
    for (let j = victimCells.length - 1; j >= 0; j--) {
      const b = victimCells[j];
      if (a.mass > b.mass * EAT_RATIO && dist(a, b) < a.r - b.r * 0.3) {
        a.mass += b.mass;
        victimCells.splice(j, 1);
        if (eaterIsPlayer) {
          player.kills++;
          showToast(' ' + (victimEntity.name || '').toUpperCase() + ' opgegeten!');
        }
      }
    }
  }
  if (victimCells.length === 0) victimEntity.dead = true;
}

// ══════════════════════════════════════════
// BOTS
// ══════════════════════════════════════════
class Bot {
  constructor() {
    this.color = rndColor();
    this.name = rndName();
    this.cells = [new Cell(Math.random() * W, Math.random() * H, START_MASS * (0.4 + Math.random() * 1.4), this.color, this.name)];
    this.tx = Math.random() * W; this.ty = Math.random() * H;
    this.think = 0; this.dead = false;
  }
  get totalMass() { return this.cells.reduce((s, c) => s + c.mass, 0); }

  ai(allEntities) {
    this.think--;
    if (this.think > 0) return;
    this.think = 20 + Math.floor(Math.random() * 30);
    const me = this.totalMass;
    let best = -Infinity, bx = this.tx, by = this.ty;
    // Seek food
    foods.slice(0, 100).forEach(f => {
      const d = dist(this.cells[0], f);
      const s = f.mass / (d + 1) * 80;
      if (s > best) { best = s; bx = f.x; by = f.y; }
    });
    // Chase smaller entities
    allEntities.forEach(e => {
      if (e === this || e.dead || !e.cells || !e.cells.length) return;
      const em = e.cells.reduce((s, c) => s + c.mass, 0);
      if (me > em * EAT_RATIO * 1.5) {
        const d = dist(this.cells[0], e.cells[0]);
        const s = em / (d + 1) * 400;
        if (s > best) { best = s; bx = e.cells[0].x; by = e.cells[0].y; }
      }
    });
    // Flee from bigger
    allEntities.forEach(e => {
      if (e === this || e.dead || !e.cells || !e.cells.length) return;
      const em = e.cells.reduce((s, c) => s + c.mass, 0);
      if (em > me * EAT_RATIO) {
        const d = dist(this.cells[0], e.cells[0]);
        if (d < 500) {
          bx = this.cells[0].x + (this.cells[0].x - e.cells[0].x) * 3;
          by = this.cells[0].y + (this.cells[0].y - e.cells[0].y) * 3;
          best = 99999;
        }
      }
    });
    if (best < 0.1) { bx = Math.random() * W; by = Math.random() * H; }
    this.tx = clamp(bx, 0, W); this.ty = clamp(by, 0, H);
  }

  update(dt) {
    this.cells.forEach(c => {
      const dx = this.tx - c.x, dy = this.ty - c.y, d = Math.hypot(dx, dy) + 0.01;
      const spd = getSpeed(c.mass);
      c.vx += ((dx / d) * spd - c.vx) * 0.2;
      c.vy += ((dy / d) * spd - c.vy) * 0.2;
      moveCell(c, dt);
    });
    selfCollide(this.cells);
    tryMerge(this.cells);
  }
}

function spawnBots() {
  bots = [];
  for (let i = 0; i < BOT_COUNT; i++) bots.push(new Bot());
}

// ══════════════════════════════════════════
// FIREBASE MULTIPLAYER
// ══════════════════════════════════════════
let fbThrottle = 0;

function fbSendState() {
  if (!gameRunning || player.dead) return;
  const now = Date.now();
  if (now - fbThrottle < 100) return; // 10fps
  fbThrottle = now;
  const cells = player.cells.slice(0, 8).map(c => ({
    x: Math.round(c.x), y: Math.round(c.y), mass: Math.round(c.mass)
  }));
  playersRef.child(myFirebaseId).set({
    name: player.name,
    color: player.color,
    cells: cells,
    score: Math.round(player.cells.reduce((s, c) => s + c.mass, 0)),
    t: firebase.database.ServerValue.TIMESTAMP
  });
}

function fbJoin() {
  const myRef = playersRef.child(myFirebaseId);
  myRef.onDisconnect().remove();

  // Luister naar kills
  killsRef.child(myFirebaseId).on('value', snap => {
    const val = snap.val();
    if (val && gameRunning && !player.dead) {
      showToast(' Opgegeten door ' + (val.by || '???').toUpperCase() + '!');
      killsRef.child(myFirebaseId).remove();
      setTimeout(() => endGame(), 300);
    }
  });

  // Luister naar andere spelers
  playersRef.on('child_added', snap => {
    if (snap.key === myFirebaseId) return;
    remotePlayers[snap.key] = snap.val();
    remotePlayers[snap.key]._target = snap.val().cells;
  });
  playersRef.on('child_changed', snap => {
    if (snap.key === myFirebaseId) return;
    const val = snap.val();
    if (!remotePlayers[snap.key]) remotePlayers[snap.key] = val;
    remotePlayers[snap.key]._target = val.cells;
    remotePlayers[snap.key].name = val.name;
    remotePlayers[snap.key].color = val.color;
    remotePlayers[snap.key].score = val.score;
  });
  playersRef.on('child_removed', snap => {
    delete remotePlayers[snap.key];
  });
}

function fbLeave() {
  playersRef.child(myFirebaseId).remove();
  killsRef.child(myFirebaseId).remove();
}

function fbKillPlayer(remoteId, myName) {
  killsRef.child(remoteId).set({ by: myName, t: firebase.database.ServerValue.TIMESTAMP });
  // Verwijder remote player lokaal
  delete remotePlayers[remoteId];
}

// Interpoleer remote spelers
function interpolateRemote(dt) {
  Object.values(remotePlayers).forEach(rp => {
    if (!rp.cells || !rp._target) return;
    // Zorg dat cells array matched
    while (rp.cells.length < rp._target.length) rp.cells.push({ ...rp._target[rp.cells.length] });
    while (rp.cells.length > rp._target.length) rp.cells.pop();
    for (let i = 0; i < rp.cells.length; i++) {
      rp.cells[i].x += (rp._target[i].x - rp.cells[i].x) * 0.15;
      rp.cells[i].y += (rp._target[i].y - rp.cells[i].y) * 0.15;
      rp.cells[i].mass += (rp._target[i].mass - rp.cells[i].mass) * 0.15;
    }
  });
}

// Eet remote spelers
function eatRemotePlayers() {
  if (player.dead) return;
  Object.keys(remotePlayers).forEach(rid => {
    const rp = remotePlayers[rid];
    if (!rp || !rp.cells) return;
    for (const myCell of player.cells) {
      for (let j = rp.cells.length - 1; j >= 0; j--) {
        const rc = rp.cells[j];
        const rMass = rc.mass || 10;
        if (myCell.mass > rMass * EAT_RATIO && dist(myCell, rc) < massToR(myCell.mass) - massToR(rMass) * 0.3) {
          myCell.mass += rMass;
          player.kills++;
          showToast(' ' + (rp.name || '???').toUpperCase() + ' opgegeten!');
          fbKillPlayer(rid, player.name);
          return;
        }
      }
    }
  });
}

// Update online teller
function updateOnlineCount() {
  const count = Object.keys(remotePlayers).length + (gameRunning && !player.dead ? 1 : 0);
  const el = document.getElementById('online-num');
  if (el) el.textContent = count;
}

// ══════════════════════════════════════════
// CAMERA
// ══════════════════════════════════════════
function updateCamera() {
  if (!player.cells.length) return;
  let cx = 0, cy = 0, tm = 0;
  player.cells.forEach(c => { cx += c.x * c.mass; cy += c.y * c.mass; tm += c.mass; });
  cx /= tm; cy /= tm;
  cam.x += (cx - cam.x) * 0.08;
  cam.y += (cy - cam.y) * 0.08;
  const zs = isMobile ? 0.5 : 0.85;
  const tz = Math.min(1.4, 180 / Math.cbrt(tm / player.cells.length * 80)) * zs;
  cam.zoom += (tz - cam.zoom) * 0.05;
  cam.zoom = clamp(cam.zoom, isMobile ? 0.06 : 0.1, isMobile ? 1.1 : 2.0);
}

function w2s(wx, wy) {
  return { x: (wx - cam.x) * cam.zoom + canvas.width / 2, y: (wy - cam.y) * cam.zoom + canvas.height / 2 };
}
function s2w(sx, sy) {
  return { x: (sx - canvas.width / 2) / cam.zoom + cam.x, y: (sy - canvas.height / 2) / cam.zoom + cam.y };
}

// ══════════════════════════════════════════
// RENDERING
// ══════════════════════════════════════════
function drawGrid() {
  ctx.strokeStyle = 'rgba(255,102,0,0.04)';
  ctx.lineWidth = 1;
  const sx = Math.floor((cam.x - canvas.width / 2 / cam.zoom) / GRID) * GRID;
  const sy = Math.floor((cam.y - canvas.height / 2 / cam.zoom) / GRID) * GRID;
  const ex = cam.x + canvas.width / 2 / cam.zoom + GRID;
  const ey = cam.y + canvas.height / 2 / cam.zoom + GRID;
  ctx.beginPath();
  for (let x = sx; x < ex; x += GRID) { const p = w2s(x, 0); ctx.moveTo(p.x, 0); ctx.lineTo(p.x, canvas.height); }
  for (let y = sy; y < ey; y += GRID) { const p = w2s(0, y); ctx.moveTo(0, p.y); ctx.lineTo(canvas.width, p.y); }
  ctx.stroke();
  // Border
  const tl = w2s(0, 0), br = w2s(W, H);
  ctx.strokeStyle = 'rgba(239,68,68,0.3)';
  ctx.lineWidth = 3;
  ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
}

function drawCell(cell, isMe = false) {
  const s = w2s(cell.x, cell.y);
  const sr = (cell.r || massToR(cell.mass || 10)) * cam.zoom;
  if (sr < 0.5) return;
  ctx.save();
  // Fill
  ctx.beginPath();
  ctx.arc(s.x, s.y, sr, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(s.x - sr * 0.25, s.y - sr * 0.25, 0, s.x, s.y, sr);
  g.addColorStop(0, cell.color + 'dd');
  g.addColorStop(0.7, cell.color);
  g.addColorStop(1, cell.color + '88');
  ctx.fillStyle = g;
  ctx.fill();
  // Border
  ctx.strokeStyle = cell.color;
  ctx.lineWidth = Math.max(1.5, sr * 0.06);
  ctx.beginPath();
  ctx.arc(s.x, s.y, sr, 0, Math.PI * 2);
  ctx.stroke();
  // Inner ring
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = Math.max(0.5, sr * 0.02);
  ctx.beginPath();
  ctx.arc(s.x, s.y, sr * 0.92, 0, Math.PI * 2);
  ctx.stroke();
  // Name
  if (sr > 14 && cell.name) {
    const fs = clamp(sr * 0.28, 8, 22);
    ctx.font = `700 ${fs}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000'; ctx.lineWidth = Math.max(1.5, sr * 0.025);
    ctx.lineJoin = 'round';
    ctx.strokeText(cell.name, s.x, s.y - sr * 0.12);
    ctx.fillStyle = THEME.text;
    ctx.fillText(cell.name, s.x, s.y - sr * 0.12);
    if (sr > 22) {
      ctx.font = `600 ${fs * 0.65}px system-ui, sans-serif`;
      ctx.strokeText(Math.floor(cell.mass), s.x, s.y + sr * 0.2);
      ctx.fillStyle = '#ff6600';
      ctx.fillText(Math.floor(cell.mass), s.x, s.y + sr * 0.2);
    }
  }
  ctx.restore();
}

function drawVirus(v) {
  const s = w2s(v.x, v.y);
  const sr = massToR(v.mass) * cam.zoom;
  if (sr < 1) return;
  v.pulse = (v.pulse || 0) + 0.03;
  const p = 1 + Math.sin(v.pulse) * 0.05;
  ctx.save();
  // Spiky circle
  const spikes = 14;
  ctx.beginPath();
  for (let i = 0; i <= spikes * 2; i++) {
    const ang = (i * Math.PI) / spikes;
    const rad = i % 2 === 0 ? sr * p : sr * p * 0.82;
    const px = s.x + Math.cos(ang) * rad;
    const py = s.y + Math.sin(ang) * rad;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(34,197,94,0.25)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(34,197,94,0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (sr > 8) {
    ctx.font = `${sr * 1.2}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('', s.x, s.y);
  }
  ctx.restore();
}

function drawFood(f) {
  const s = w2s(f.x, f.y);
  const sr = massToR(f.mass) * cam.zoom;
  if (sr < 1.5) return;
  ctx.beginPath();
  // Hexagon shape
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const px = s.x + Math.cos(a) * sr * 1.3;
    const py = s.y + Math.sin(a) * sr * 1.3;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = f.color + 'aa';
  ctx.fill();
}

function drawEjected(e) {
  const s = w2s(e.x, e.y);
  const sr = massToR(e.mass) * cam.zoom;
  if (sr < 1) return;
  ctx.beginPath();
  ctx.arc(s.x, s.y, Math.max(2, sr), 0, Math.PI * 2);
  ctx.fillStyle = e.color + '99';
  ctx.fill();
}

function drawRemotePlayer(rp) {
  if (!rp.cells) return;
  rp.cells.forEach(c => {
    drawCell({
      x: c.x, y: c.y, mass: c.mass,
      r: massToR(c.mass),
      color: rp.color || '#3b82f6',
      name: rp.name || '???'
    }, false);
  });
}

// ── Minimap ──
function drawMinimap() {
  const mW = mCanvas.width, mH = mCanvas.height;
  mCtx.clearRect(0, 0, mW, mH);
  mCtx.fillStyle = 'rgba(10,10,10,0.9)';
  mCtx.fillRect(0, 0, mW, mH);
  // Grid
  mCtx.strokeStyle = 'rgba(255,102,0,0.06)';
  mCtx.lineWidth = 0.3;
  for (let x = 0; x < mW; x += mW / 6) { mCtx.beginPath(); mCtx.moveTo(x, 0); mCtx.lineTo(x, mH); mCtx.stroke(); }
  for (let y = 0; y < mH; y += mH / 6) { mCtx.beginPath(); mCtx.moveTo(0, y); mCtx.lineTo(mW, y); mCtx.stroke(); }

  const sx = mW / W, sy = mH / H;
  // Bots
  bots.forEach(b => {
    if (b.dead) return;
    b.cells.forEach(c => {
      mCtx.fillStyle = b.color;
      mCtx.beginPath();
      mCtx.arc(c.x * sx, c.y * sy, Math.max(1.5, c.r * sx * 1.5), 0, Math.PI * 2);
      mCtx.fill();
    });
  });
  // Remote
  Object.values(remotePlayers).forEach(rp => {
    if (!rp.cells) return;
    rp.cells.forEach(c => {
      mCtx.fillStyle = rp.color || '#3b82f6';
      mCtx.beginPath();
      mCtx.arc(c.x * sx, c.y * sy, Math.max(2, massToR(c.mass) * sx * 1.5), 0, Math.PI * 2);
      mCtx.fill();
    });
  });
  // Player
  if (!player.dead) {
    player.cells.forEach(c => {
      mCtx.fillStyle = player.color;
      mCtx.beginPath();
      mCtx.arc(c.x * sx, c.y * sy, Math.max(2.5, c.r * sx * 2), 0, Math.PI * 2);
      mCtx.fill();
    });
  }
  // Viewport
  const vx = (cam.x - canvas.width / 2 / cam.zoom) * sx;
  const vy = (cam.y - canvas.height / 2 / cam.zoom) * sy;
  const vw = (canvas.width / cam.zoom) * sx;
  const vh = (canvas.height / cam.zoom) * sy;
  mCtx.strokeStyle = 'rgba(255,102,0,0.3)';
  mCtx.lineWidth = 1;
  mCtx.strokeRect(vx, vy, vw, vh);
}

// ── Leaderboard ──
function updateLeaderboard() {
  const entities = [];
  if (!player.dead) {
    entities.push({ name: player.name, mass: player.cells.reduce((s, c) => s + c.mass, 0), color: player.color, isMe: true });
  }
  bots.forEach(b => {
    if (!b.dead) entities.push({ name: b.name, mass: b.totalMass, color: b.color, isMe: false });
  });
  Object.values(remotePlayers).forEach(rp => {
    if (rp.cells && rp.cells.length) {
      entities.push({ name: rp.name, mass: rp.cells.reduce((s, c) => s + (c.mass || 0), 0), color: rp.color || '#3b82f6', isMe: false });
    }
  });
  entities.sort((a, b) => b.mass - a.mass);
  const top10 = entities.slice(0, 10);
  const rank = entities.findIndex(e => e.isMe) + 1;

  document.getElementById('lb-list').innerHTML = top10.map((e, i) =>
    `<div class="lb-row ${e.isMe ? 'is-me' : ''}">
      <span class="lb-rank">${i + 1}.</span>
      <span class="lb-dot" style="background:${e.color}"></span>
      <span class="lb-name">${e.name}</span>
      <span class="lb-mass">${Math.floor(e.mass)}</span>
    </div>`
  ).join('');

  const pm = player.dead ? 0 : player.cells.reduce((s, c) => s + c.mass, 0);
  document.getElementById('score-val').textContent = Math.floor(pm);
  document.getElementById('rank-val').textContent = `Rang #${rank || '?'}`;
}

// ── Toast ──
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

// ══════════════════════════════════════════
// PLAYER SETUP
// ══════════════════════════════════════════
function spawnPlayer(name, color) {
  player.name = name || 'Speler';
  player.color = color;
  player.dead = false;
  player.score = 0; player.maxScore = 0; player.kills = 0;
  player.cells = [new Cell(
    W / 2 + (Math.random() - 0.5) * 600,
    H / 2 + (Math.random() - 0.5) * 600,
    START_MASS, color, player.name, true
  )];
  mouseWorld = { x: player.cells[0].x + 200, y: player.cells[0].y };
}

// ══════════════════════════════════════════
// GAME LOOP
// ══════════════════════════════════════════
function gameLoop(ts) {
  if (!gameRunning) return;
  const dt = Math.min(0.05, (ts - lastTime) / 1000);
  lastTime = ts;

  // ── Update player ──
  player.cells.forEach(c => {
    const dx = mouseWorld.x - c.x, dy = mouseWorld.y - c.y;
    const d = Math.hypot(dx, dy) + 0.01;
    let spd = getSpeed(c.mass);

    if (isBoosting && c.mass > 25) {
      spd *= 1.8;
      c.mass -= 18 * dt;
      if (Math.random() < 10 * dt && foods.length < FOOD_COUNT + 100) {
        foods.push({
          x: c.x - (dx / d) * c.r, y: c.y - (dy / d) * c.r,
          mass: 1.5, color: c.color
        });
        foodGridDirty = true;
      }
    }

    c.vx += ((dx / d) * spd - c.vx) * 0.15;
    c.vy += ((dy / d) * spd - c.vy) * 0.15;
    moveCell(c, dt);
  });
  selfCollide(player.cells);
  tryMerge(player.cells);

  // ── Update bots ──
  const allEntities = [player, ...bots.filter(b => !b.dead)];
  bots.forEach(b => {
    if (b.dead) return;
    b.ai(allEntities);
    b.update(dt);
    eatFood(b.cells);
    eatEjected(b.cells);
    eatVirus(b.cells, false);
  });

  // ── Eating logic ──
  eatFood(player.cells);
  eatEjected(player.cells);
  eatVirus(player.cells, true);

  // Player vs bots
  bots.forEach(b => {
    if (b.dead) return;
    eatSmaller(player.cells, b.cells, b, true);
    eatSmaller(b.cells, player.cells, player, false);
  });
  // Bots vs bots
  for (let i = 0; i < bots.length; i++) {
    for (let j = i + 1; j < bots.length; j++) {
      if (bots[i].dead || bots[j].dead) continue;
      eatSmaller(bots[i].cells, bots[j].cells, bots[j], false);
      eatSmaller(bots[j].cells, bots[i].cells, bots[i], false);
    }
  }

  // Eat remote players
  eatRemotePlayers();

  // Respawn dead bots
  bots.forEach((b, i) => {
    if (b.dead) { bots[i] = new Bot(); }
  });

  // Ejected update
  ejected.forEach(e => {
    e.x += e.vx * dt; e.y += e.vy * dt;
    e.vx *= 0.96; e.vy *= 0.96;
    e.spd *= 0.96;
    e.x = clamp(e.x, 0, W); e.y = clamp(e.y, 0, H);
  });

  // Replenish food
  if (foods.length < FOOD_COUNT) spawnFood(3);

  // Interpolate remote players
  interpolateRemote(dt);

  // Score tracking
  const pm = player.cells.reduce((s, c) => s + c.mass, 0);
  player.score = pm;
  if (pm > player.maxScore) player.maxScore = pm;

  // Check death
  if (player.cells.length === 0) {
    player.dead = true;
    endGame();
    return;
  }

  // ── Camera ──
  updateCamera();

  // ── Render ──
  ctx.fillStyle = THEME.base01;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // Food
  foods.forEach(f => drawFood(f));

  // Ejected
  ejected.forEach(e => drawEjected(e));

  // Viruses
  viruses.forEach(v => drawVirus(v));

  // Collect all cells for z-sorting
  const allCells = [];
  bots.forEach(b => {
    if (!b.dead) b.cells.forEach(c => allCells.push({ cell: c, isMe: false }));
  });
  player.cells.forEach(c => allCells.push({ cell: c, isMe: true }));
  // Sort small first (so big render on top)
  allCells.sort((a, b) => a.cell.mass - b.cell.mass);
  allCells.forEach(({ cell, isMe }) => drawCell(cell, isMe));

  // Remote players
  Object.values(remotePlayers).forEach(rp => drawRemotePlayer(rp));

  // Minimap + Leaderboard (throttled)
  if (Math.floor(ts / 500) !== Math.floor((ts - dt * 1000) / 500)) {
    drawMinimap();
    updateLeaderboard();
    updateOnlineCount();
  }

  // Firebase sync
  fbSendState();

  requestAnimationFrame(gameLoop);
}

// ══════════════════════════════════════════
// GAME START / END
// ══════════════════════════════════════════
function startGame(name) {
  foods = []; ejected = []; viruses = [];
  spawnFood(FOOD_COUNT);
  for (let i = 0; i < VIRUS_COUNT; i++) spawnVirus();
  spawnBots();
  spawnPlayer(name, selectedColor);
  gameRunning = true;
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('death-screen').classList.add('hidden');
  myFirebaseId = 'p_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  fbJoin();
  showToast('Veel succes op het grid!');
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function endGame() {
  player.dead = true;
  gameRunning = false;
  fbLeave();
  document.getElementById('death-stats').innerHTML =
    `Piek Massa: <strong>${Math.floor(player.maxScore)}</strong><br>` +
    `Kills: <strong>${player.kills}</strong>`;
  document.getElementById('death-screen').classList.remove('hidden');
}

// ══════════════════════════════════════════
// INPUT
// ══════════════════════════════════════════
canvas.addEventListener('mousemove', e => { mouseWorld = s2w(e.clientX, e.clientY); });
canvas.addEventListener('mousedown', e => { mouseWorld = s2w(e.clientX, e.clientY); });

document.addEventListener('keydown', e => {
  if (!gameRunning || player.dead) return;
  if (e.code === 'Space') { e.preventDefault(); splitCells(player.cells, mouseWorld.x, mouseWorld.y, true); }
  const k = e.key.toLowerCase();
  if (e.code === 'KeyW' || e.code === 'KeyZ' || k === 'w' || k === 'z') { isBoosting = true; }
});
document.addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  if (e.code === 'KeyW' || e.code === 'KeyZ' || k === 'w' || k === 'z') { isBoosting = false; }
});

window.addEventListener('blur', () => {
  isBoosting = false;
});

// ── Joystick (mobile) ──
const jBase = document.getElementById('joystick-base');
const jKnob = document.getElementById('joystick-knob');
const jZone = document.getElementById('joystick-zone');
let joy = { active: false, id: null, bx: 0, by: 0, dx: 0, dy: 0 };

jZone.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.changedTouches[0];
  joy.active = true; joy.id = t.identifier;
  joy.bx = t.clientX; joy.by = t.clientY;
  jBase.style.display = 'block';
  jBase.style.left = t.clientX + 'px';
  jBase.style.top = t.clientY + 'px';
}, { passive: false });

jZone.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier !== joy.id) continue;
    const dx = t.clientX - joy.bx, dy = t.clientY - joy.by;
    const maxR = 45, d = Math.hypot(dx, dy);
    if (d < 6) { joy.dx = 0; joy.dy = 0; }
    else {
      const pct = Math.min(1, (d - 6) / (maxR - 6));
      joy.dx = (dx / d) * pct; joy.dy = (dy / d) * pct;
    }
    const cx = d > maxR ? (dx / d) * maxR : dx;
    const cy = d > maxR ? (dy / d) * maxR : dy;
    jKnob.style.transform = `translate(calc(-50% + ${cx}px), calc(-50% + ${cy}px))`;
  }
}, { passive: false });

function endJoy() {
  joy.active = false; joy.dx = 0; joy.dy = 0;
  jBase.style.display = 'none';
  jKnob.style.transform = 'translate(-50%,-50%)';
}
jZone.addEventListener('touchend', e => { e.preventDefault(); endJoy(); }, { passive: false });
jZone.addEventListener('touchcancel', e => { e.preventDefault(); endJoy(); }, { passive: false });

// Update joystick target each frame
(function joyLoop() {
  if (joy.active && player.cells.length && gameRunning) {
    const c = player.cells[0];
    const ahead = isMobile ? 600 / cam.zoom : 300;
    mouseWorld = { x: c.x + joy.dx * ahead, y: c.y + joy.dy * ahead };
  }
  requestAnimationFrame(joyLoop);
})();

// Mobile buttons
document.getElementById('btn-split').addEventListener('touchstart', e => {
  e.preventDefault();
  if (gameRunning && !player.dead) splitCells(player.cells, mouseWorld.x, mouseWorld.y, true);
}, { passive: false });
const btnSprint = document.getElementById('btn-eject');
btnSprint.addEventListener('touchstart', e => { e.preventDefault(); isBoosting = true; }, { passive: false });
btnSprint.addEventListener('touchend', e => { e.preventDefault(); isBoosting = false; }, { passive: false });
btnSprint.addEventListener('touchcancel', e => { e.preventDefault(); isBoosting = false; }, { passive: false });

// ── Banned Words Filter ──
let bannedNames = [];
fetch('Banned Names.txt')
  .then(res => res.text())
  .then(text => {
    bannedNames = text.split('\n').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
  })
  .catch(e => console.error("Could not load banned names:", e));

function isNameBanned(name) {
  const lowerName = name.toLowerCase();
  for (let word of bannedNames) {
    if (lowerName.includes(word)) return true;
  }
  return false;
}

function isNameTaken(name) {
  if (!name || name === "") return false;
  const lowerName = name.toLowerCase();
  for (let b of bots) {
    if (b.name && b.name.toLowerCase() === lowerName) return true;
  }
  for (let rp of Object.values(remotePlayers)) {
    if (rp.name && rp.name.toLowerCase() === lowerName) return true;
  }
  return false;
}

function handlePlay() {
  let name = globalName || 'Speler';
  if (isNameBanned(name)) {
    alert("Kies een nieuwe naam. Dit woord is niet toegestaan.");
    return;
  }
  if (isNameTaken(name)) {
    alert("Deze naam is al in gebruik. Kies een andere!");
    return;
  }
  // Ensure the bot names pool doesn't contain our chosen name
  const idx = availableBotNames.findIndex(n => n.toLowerCase() === name.toLowerCase());
  if (idx !== -1) availableBotNames.splice(idx, 1);
  
  startGame(name);
}

// ── UI Events ──
const globalName = urlParams.get('player_name');
if (globalName && document.getElementById('name-input')) document.getElementById('name-input').value = globalName;

document.getElementById('play-btn').addEventListener('click', handlePlay);
document.getElementById('respawn-btn').addEventListener('click', () => {
  handlePlay();
});

// ── Online count updater (start screen) ──
playersRef.on('value', snap => {
  const val = snap.val();
  const count = val ? Object.keys(val).length : 0;
  document.getElementById('online-num').textContent = count;
});
