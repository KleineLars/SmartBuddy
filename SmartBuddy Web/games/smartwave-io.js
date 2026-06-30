// ─── SmartWave.io — Improved Engine ───────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const LOGICAL_HEIGHT = 600;
let W, H, scale;

function resize() {
  scale = window.innerHeight / LOGICAL_HEIGHT;
  W = window.innerWidth / scale;
  H = LOGICAL_HEIGHT;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ─── State ────────────────────────────────────────────────────────────────────

let state = 'START'; // START | PLAYING | GAMEOVER
let score = 0;
let distance = 0;
let speed = 6.5;
let maxSpeed = 6.5;
let timeScale = 1;
let particles = [];
let shakeAmt = 0;
let flashAlpha = 0;

// ─── Player ───────────────────────────────────────────────────────────────────

const player = {
  screenX: 0,
  y: H / 2,
  size: 14,
  vy: 6.5,
  direction: 1,
  engineFlicker: 0,
  alive: true,
};

// ─── World ────────────────────────────────────────────────────────────────────

let segments = [];
let spikes = [];
let saws = [];
let coins = [];
let trail = [];
let lastX = 0;
let lastTopY = 100;
let lastBottomY = H - 100;

// ─── Parallax stars ───────────────────────────────────────────────────────────

const STARS = Array.from({length: 90}, () => ({
  x: Math.random() * 2000,
  y: Math.random() * LOGICAL_HEIGHT,
  r: Math.random() * 1.4 + 0.3,
  speed: Math.random() * 0.4 + 0.1,
  alpha: Math.random() * 0.5 + 0.1,
}));

// ─── Accent colour palette ────────────────────────────────────────────────────

const ACCENT   = '#2dd4bf';
const ACCENT2  = '#22d3ee';  // cyan variant for glow mix
const WALL_COL = '#000000';
const EDGE_COL = '#2dd4bf';
const SPIKE_COL= '#ef4444';
const SAW_COL  = '#f59e0b';
const COIN_COL = '#fbbf24';

// ─── Reset ────────────────────────────────────────────────────────────────────

function resetGame() {
  resize();
  player.y = H / 2;
  player.direction = 1;
  player.screenX = W * 0.20;
  player.alive = true;
  speed = 6.5;
  maxSpeed = 6.5;
  player.vy = 6.5;
  score = 0;
  distance = 0;
  particles = [];
  trail = [];
  shakeAmt = 0;
  flashAlpha = 0;

  segments = [];
  spikes = [];
  saws = [];
  coins = [];

  lastX = 0;
  lastTopY = 100;
  lastBottomY = H - 100;

  // Safe starting stretch
  addSegment(1100, 0, 0);

  // Pre-generate terrain
  for (let i = 0; i < 12; i++) generateNextObstacle();

  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('death-screen').classList.add('hidden');
  updateScoreDisplay(0);
  updateSpeedBadge();
  renderHudLeaderboard();

  state = 'PLAYING';
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

// ─── Terrain generation ───────────────────────────────────────────────────────

function addSegment(dx, dTop, dBottom) {
  let nx = lastX + dx;
  let nTop = lastTopY + dTop;
  let nBot = lastBottomY + dBottom;
  const minGap = 155;

  if (nTop < 8)  nTop = 8;
  if (nBot > H - 8) nBot = H - 8;
  if (nBot - nTop < minGap) {
    const diff = (minGap - (nBot - nTop)) / 2;
    nTop -= diff; nBot += diff;
  }
  if (nBot > H - 8) { nBot = H - 8; nTop = nBot - minGap; }
  if (nTop < 8)     { nTop = 8;     nBot = nTop + minGap; }

  segments.push({ x1: lastX, y1Top: lastTopY, y1Bottom: lastBottomY,
                  x2: nx,   y2Top: nTop,     y2Bottom: nBot });
  lastX = nx; lastTopY = nTop; lastBottomY = nBot;
}

function spawnCoin(x, y) {
  // Coins removed
}

function generateNextObstacle() {
  const r = Math.random();

  if (r < 0.12) {
    // Straight + coin trail
    addSegment(320 + Math.random() * 160, 0, 0);
    for (let i = 0; i < 4; i++) spawnCoin(lastX - 300 + i * 70, (lastTopY + lastBottomY) / 2);

  } else if (r < 0.30) {
    // ZigZag (Slope 1.0)
    const dir = Math.random() > 0.5 ? 1 : -1;
    addSegment(140, 140 * dir, 140 * dir);
    addSegment(100, 0, 0);
    addSegment(140, -140 * dir, -140 * dir);
    addSegment(100, 0, 0);

  } else if (r < 0.48) {
    // Spike Gauntlet
    addSegment(640, 0, 0);
    spikes.push({ x: lastX - 480, y: lastBottomY, type: 'up' });
    spikes.push({ x: lastX - 320, y: lastTopY,    type: 'down' });
    spikes.push({ x: lastX - 160, y: lastBottomY, type: 'up' });
    spawnCoin(lastX - 400, (lastTopY + lastBottomY) / 2);

  } else if (r < 0.63) {
    // Saw Pit
    addSegment(100, 0, 0);
    addSegment(70,  0, 70);
    addSegment(320, 0, 0);
    saws.push({ x: lastX - 220, y: lastBottomY - 14, r: 36, angle: 0 });
    saws.push({ x: lastX - 100, y: lastBottomY - 14, r: 36, angle: Math.PI * 0.5 });
    addSegment(70, 0, -70);
    addSegment(100, 0, 0);

  } else if (r < 0.78) {
    // Ceiling Saws
    addSegment(540, 0, 0);
    saws.push({ x: lastX - 380, y: lastTopY + 14, r: 36, angle: 0 });
    saws.push({ x: lastX - 160, y: lastTopY + 14, r: 36, angle: Math.PI * 0.7 });

  } else if (r < 0.91) {
    // Staircase with spikes
    const dir = Math.random() > 0.5 ? 1 : -1;
    addSegment(100, 100 * dir, 100 * dir);
    addSegment(200, 0, 0);
    spikes.push({ x: lastX - 100, y: dir === 1 ? lastTopY : lastBottomY,
                  type: dir === 1 ? 'down' : 'up' });
    addSegment(100, 100 * dir, 100 * dir);
    addSegment(200, 0, 0);

  } else {
    // Wide open coin fest
    addSegment(500, 0, 0);
    for (let i = 0; i < 6; i++) {
      const yOff = Math.sin(i * 0.8) * 60;
      spawnCoin(lastX - 440 + i * 70, (lastTopY + lastBottomY) / 2 + yOff);
    }
  }
}

// ─── Collision helpers ────────────────────────────────────────────────────────

function linesIntersect(a, b, c, d) {
  const det = (a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x);
  if (det === 0) return false;
  const t = ((a.x - c.x) * (c.y - d.y) - (a.y - c.y) * (c.x - d.x)) / det;
  const u = -((a.x - b.x) * (a.y - c.y) - (a.y - b.y) * (a.x - c.x)) / det;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function getPlayerTri(px, py, angle, size) {
  const pts = [{x: size, y: 0}, {x: -size, y: size * 0.8}, {x: -size, y: -size * 0.8}];
  const ca = Math.cos(angle), sa = Math.sin(angle);
  return pts.map(p => ({ x: px + p.x * ca - p.y * sa, y: py + p.x * sa + p.y * ca }));
}

function checkCollision() {
  const pAngle = Math.atan2(player.direction * player.vy, speed);
  const pWorldX = distance + player.screenX;
  const pTri = getPlayerTri(pWorldX, player.y, pAngle, player.size);
  const pEdges = [[pTri[0], pTri[1]], [pTri[1], pTri[2]], [pTri[2], pTri[0]]];
  const pTop = player.y - player.size * 0.85;
  const pBot = player.y + player.size * 0.85;

  // Wall collision
  for (const s of segments) {
    if (s.x2 < pWorldX - player.size) continue;
    if (s.x1 > pWorldX + player.size) break;
    if (pWorldX >= s.x1 && pWorldX <= s.x2) {
      const t = (pWorldX - s.x1) / (s.x2 - s.x1);
      const yTop = s.y1Top + t * (s.y2Top - s.y1Top);
      const yBot = s.y1Bottom + t * (s.y2Bottom - s.y1Bottom);
      if (pTop <= yTop) {
        if (Math.abs(s.y2Top - s.y1Top) > 2) return true; // Slanted roof is lethal
        player.y = yTop + player.size * 0.85; player.vy = Math.max(0, player.vy); 
      }
      if (pBot >= yBot) {
        if (Math.abs(s.y2Bottom - s.y1Bottom) > 2) return true; // Slanted floor is lethal
        player.y = yBot - player.size * 0.85; player.vy = Math.max(0, player.vy); 
      }
    }
  }

  // Spikes — lethal
  for (const sp of spikes) {
    if (Math.abs(sp.x - pWorldX) > 120) continue;
    const sTri = sp.type === 'up'
      ? [{x: sp.x, y: sp.y - 44}, {x: sp.x - 22, y: sp.y}, {x: sp.x + 22, y: sp.y}]
      : [{x: sp.x, y: sp.y + 44}, {x: sp.x - 22, y: sp.y}, {x: sp.x + 22, y: sp.y}];
    const sEdges = [[sTri[0], sTri[1]], [sTri[1], sTri[2]], [sTri[2], sTri[0]]];
    for (const pe of pEdges) for (const se of sEdges)
      if (linesIntersect(pe[0], pe[1], se[0], se[1])) return true;
  }

  // Saws — lethal
  for (const saw of saws) {
    if (Math.abs(saw.x - pWorldX) > 120) continue;
    const dx = pWorldX - saw.x, dy = player.y - saw.y;
    if (dx*dx + dy*dy < (saw.r + player.size * 0.6) ** 2) return true;
  }

  return false;
}

function collectCoins() {
  const pWorldX = distance + player.screenX;
  for (const c of coins) {
    if (c.collected) continue;
    const dx = c.x - pWorldX, dy = c.y - player.y;
    if (dx*dx + dy*dy < (c.r + player.size) ** 2) {
      c.collected = true;
      score += 10;
      spawnParticles(c.x - distance, c.y, COIN_COL, 8);
    }
  }
}

// ─── Particles ────────────────────────────────────────────────────────────────

function spawnParticles(sx, sy, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = Math.random() * 4 + 1;
    particles.push({
      x: sx, y: sy,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: 1, decay: Math.random() * 0.03 + 0.02,
      r: Math.random() * 4 + 1,
      color,
    });
  }
}

function updateParticles(ts) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * ts;
    p.y += p.vy * ts;
    p.vy += 0.08 * ts;
    p.life -= p.decay * ts;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

function update(dt) {
  if (state !== 'PLAYING') return;

  timeScale = dt / 16.66;
  const ts = Math.min(timeScale, 2);

  player.y += player.vy * player.direction * ts;
  player.engineFlicker = (player.engineFlicker + ts * 0.3) % (Math.PI * 2);

  const moveX = speed * ts;
  distance += moveX;
  score = Math.max(score, Math.floor(distance / 10));

  // Saw rotation
  for (const saw of saws) saw.angle += 0.03 * ts;

  // Speed progression
  speed += 0.0008 * ts;
  player.vy += 0.0008 * ts;
  if (speed > maxSpeed) maxSpeed = speed;

  // Trail
  trail.push({ x: distance + player.screenX, y: player.y, t: Date.now() });
  if (trail.length > 80) trail.shift();

  updateParticles(ts);

  // Screen shake decay
  shakeAmt *= 0.82;
  flashAlpha = Math.max(0, flashAlpha - 0.05 * ts);

  // Spawn coins engine trail particles (subtle)
  if (Math.random() < 0.3) {
    particles.push({
      x: player.screenX - player.size - Math.random() * 8,
      y: player.y + (Math.random() - 0.5) * 8,
      vx: -(Math.random() * 2 + 1),
      vy: (Math.random() - 0.5) * 1.5,
      life: 0.7, decay: 0.045,
      r: Math.random() * 3 + 1,
      color: ACCENT,
    });
  }

  // Cleanup old objects
  while (segments.length && segments[0].x2 < distance - 400) segments.shift();
  while (spikes.length  && spikes[0].x   < distance - 400) spikes.shift();
  while (saws.length    && saws[0].x     < distance - 400) saws.shift();
  while (coins.length   && coins[0].x    < distance - 400) coins.shift();

  if (lastX < distance + W + 800) generateNextObstacle();

  collectCoins();
  updateScoreDisplay(score);
  updateSpeedBadge();

  if (checkCollision()) triggerDeath();
}

function triggerDeath() {
  state = 'GAMEOVER';
  shakeAmt = 14;
  flashAlpha = 0.6;
  spawnParticles(player.screenX, player.y, ACCENT, 30);

  document.getElementById('final-score').textContent = score + 'm';
  document.getElementById('final-speed').textContent = '×' + (maxSpeed / 6.5).toFixed(1);

  if (score > 0) {
    const name = globalName || 'Speler';
    if (!isNameBanned(name)) {
      saveScore(name, score);
    }
  }
  setTimeout(() => document.getElementById('death-screen').classList.remove('hidden'), 300);
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function updateScoreDisplay(s) {
  document.getElementById('score-val').textContent = s + 'm';
}

function updateSpeedBadge() {
  const mult = (speed / 6.5).toFixed(1);
  document.getElementById('speed-badge').textContent = 'Speed ×' + mult;
}

// ─── Drawing ──────────────────────────────────────────────────────────────────

function drawBackground() {
  ctx.fillStyle = '#080808';
  ctx.fillRect(0, 0, W, H);

  // Scrolling grid
  const gridAlpha = 0.04;
  ctx.strokeStyle = `rgba(45,212,191,${gridAlpha})`;
  ctx.lineWidth = 0.5;
  const gOff = (distance * 0.25) % 50;
  for (let x = -gOff; x < W; x += 50) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 50) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Stars / debris
  for (const s of STARS) {
    const sx = ((s.x - distance * s.speed) % W + W * 2) % W;
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTerrain() {
  const visSegs = segments.filter(s => s.x2 > distance && s.x1 < distance + W);
  if (!visSegs.length) return;

  const last = visSegs[visSegs.length - 1];

  // Top wall fill
  ctx.save();
  ctx.translate(-distance, 0);

  ctx.beginPath();
  ctx.moveTo(visSegs[0].x1, 0);
  for (const s of visSegs) { ctx.lineTo(s.x1, s.y1Top); ctx.lineTo(s.x2, s.y2Top); }
  ctx.lineTo(last.x2, 0);
  ctx.closePath();
  ctx.fillStyle = WALL_COL;
  ctx.fill();

  // Bottom wall fill
  ctx.beginPath();
  ctx.moveTo(visSegs[0].x1, H);
  for (const s of visSegs) { ctx.lineTo(s.x1, s.y1Bottom); ctx.lineTo(s.x2, s.y2Bottom); }
  ctx.lineTo(last.x2, H);
  ctx.closePath();
  ctx.fill();

  // Glow edges — draw twice (outer glow + sharp line)
  function drawEdgePath(top) {
    ctx.beginPath();
    ctx.moveTo(visSegs[0].x1, top ? visSegs[0].y1Top : visSegs[0].y1Bottom);
    for (const s of visSegs) ctx.lineTo(s.x2, top ? s.y2Top : s.y2Bottom);
  }



  // Sharp edge
  ctx.strokeStyle = EDGE_COL;
  ctx.lineWidth = 2.5;
  drawEdgePath(true);  ctx.stroke();
  drawEdgePath(false); ctx.stroke();

  ctx.restore();

  // Distance segmentation tick marks (decorative)
  const tickInterval = 200;
  for (const s of visSegs) {
    let tickX = Math.ceil(s.x1 / tickInterval) * tickInterval;
    while (tickX < s.x2) {
      const t = (tickX - s.x1) / (s.x2 - s.x1);
      const yT = s.y1Top + t * (s.y2Top - s.y1Top);
      const yB = s.y1Bottom + t * (s.y2Bottom - s.y1Bottom);
      const sx = tickX - distance;
      ctx.strokeStyle = 'rgba(45,212,191,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, yT); ctx.lineTo(sx, yT + 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx, yB); ctx.lineTo(sx, yB - 12); ctx.stroke();
      tickX += tickInterval;
    }
  }

  drawObstacles();
}

function drawObstacles() {
  // Spikes
  for (const sp of spikes) {
    const sx = sp.x - distance;
    if (sx < -80 || sx > W + 80) continue;

    ctx.save();
    ctx.beginPath();
    if (sp.type === 'up') {
      ctx.moveTo(sx, sp.y - 44);
      ctx.lineTo(sx + 22, sp.y);
      ctx.lineTo(sx - 22, sp.y);
    } else {
      ctx.moveTo(sx, sp.y + 44);
      ctx.lineTo(sx + 22, sp.y);
      ctx.lineTo(sx - 22, sp.y);
    }
    ctx.closePath();
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();
    ctx.strokeStyle = SPIKE_COL;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // Saws
  for (const saw of saws) {
    const sx = saw.x - distance;
    if (sx < -100 || sx > W + 100) continue;

    ctx.save();
    ctx.translate(sx, saw.y);
    ctx.rotate(saw.angle);



    // Body
    ctx.beginPath();
    ctx.arc(0, 0, saw.r, 0, Math.PI * 2);
    ctx.fillStyle = '#1c1203';
    ctx.fill();
    ctx.strokeStyle = SAW_COL;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Teeth
    const teeth = 10;
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      const x1 = Math.cos(a) * saw.r;
      const y1 = Math.sin(a) * saw.r;
      const x2 = Math.cos(a) * (saw.r + 11);
      const y2 = Math.sin(a) * (saw.r + 11);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = SAW_COL;
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    // Inner hub
    ctx.beginPath();
    ctx.arc(0, 0, saw.r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = SAW_COL;
    ctx.fill();

    ctx.restore();
  }

  // Coins
  for (const c of coins) {
    if (c.collected) continue;
    const sx = c.x - distance;
    if (sx < -80 || sx > W + 80) continue;

    c.anim += 0.05;
    const pulse = 1 + Math.sin(c.anim) * 0.12;

    ctx.save();
    ctx.translate(sx, c.y);
    ctx.scale(pulse, pulse);
    ctx.beginPath();
    ctx.arc(0, 0, c.r, 0, Math.PI * 2);
    ctx.fillStyle = COIN_COL;
    ctx.fill();
    ctx.strokeStyle = '#fffbeb';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Star marker
    ctx.fillStyle = '#92400e';
    ctx.font = `bold ${c.r * 1.1}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦', 0, 0.5);
    ctx.restore();
  }
}

function drawTrail() {
  if (trail.length < 2) return;
  const now = Date.now();
  for (let i = 1; i < trail.length; i++) {
    const age = (i / trail.length);
    const a = age * 0.8;
    ctx.beginPath();
    ctx.moveTo(trail[i-1].x - distance, trail[i-1].y);
    ctx.lineTo(trail[i].x   - distance, trail[i].y);
    ctx.strokeStyle = `rgba(45,212,191,${a})`;
    ctx.lineWidth = 2.5 * age;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.screenX, player.y);

  const angle = Math.atan2(player.direction * player.vy, speed);
  ctx.rotate(angle);

  // Engine flame
  const flameLen = 14 + Math.sin(player.engineFlicker * 8) * 5;
  const flameGrad = ctx.createLinearGradient(-player.size, 0, -player.size - flameLen, 0);
  flameGrad.addColorStop(0, 'rgba(45,212,191,0.9)');
  flameGrad.addColorStop(0.5, 'rgba(34,211,238,0.4)');
  flameGrad.addColorStop(1, 'rgba(45,212,191,0)');

  ctx.beginPath();
  ctx.moveTo(-player.size, -player.size * 0.35);
  ctx.lineTo(-player.size - flameLen, 0);
  ctx.lineTo(-player.size, player.size * 0.35);
  ctx.fillStyle = flameGrad;
  ctx.fill();

  // Body glow

  // Ship body
  ctx.beginPath();
  ctx.moveTo(player.size, 0);
  ctx.lineTo(-player.size, player.size * 0.8);
  ctx.lineTo(-player.size * 0.3, 0);
  ctx.lineTo(-player.size, -player.size * 0.8);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Accent stripe
  ctx.beginPath();
  ctx.moveTo(player.size * 0.6, 0);
  ctx.lineTo(-player.size * 0.3, player.size * 0.4);
  ctx.lineTo(-player.size * 0.3, -player.size * 0.4);
  ctx.closePath();
  ctx.fillStyle = ACCENT;
  ctx.fill();

  ctx.restore();
}

// ─── Animated start screen background ────────────────────────────────────────

const startCanvas = document.getElementById('start-bg');
const startCtx = startCanvas.getContext('2d');
let startAnimFrame;

function animateStartBg() {
  const w = window.innerWidth, h = window.innerHeight;
  startCanvas.width = w; startCanvas.height = h;
  let t = 0;

  const previewSegs = [];
  let px = 0, pTop = h * 0.25, pBot = h * 0.75;

  function addPSeg(dx, dT, dB) {
    const nTop = Math.max(20, Math.min(h - 160, pTop + dT));
    const nBot = Math.max(nTop + 140, Math.min(h - 20, pBot + dB));
    previewSegs.push({x1: px, y1T: pTop, y1B: pBot, x2: px+dx, y2T: nTop, y2B: nBot});
    px += dx; pTop = nTop; pBot = nBot;
  }

  for (let i = 0; i < 30; i++) {
    const r = Math.random();
    if (r < 0.3) addPSeg(300, 0, 0);
    else if (r < 0.6) { const d = Math.random() > 0.5 ? 1 : -1; addPSeg(250, 80*d, 80*d); addPSeg(200, 0, 0); addPSeg(250, -80*d, -80*d); }
    else addPSeg(200, 60*(Math.random()>0.5?1:-1), 60*(Math.random()>0.5?1:-1));
  }

  function drawFrame() {
    t += 0.4;
    startCtx.clearRect(0, 0, w, h);
    startCtx.fillStyle = '#080808';
    startCtx.fillRect(0, 0, w, h);

    // Grid
    startCtx.strokeStyle = 'rgba(59, 130, 246, 0.04)';
    startCtx.lineWidth = 0.5;
    const off = t % 50;
    for (let x = -off; x < w; x += 50) { startCtx.beginPath(); startCtx.moveTo(x,0); startCtx.lineTo(x,h); startCtx.stroke(); }
    for (let y = 0; y < h; y += 50)    { startCtx.beginPath(); startCtx.moveTo(0,y); startCtx.lineTo(w,y); startCtx.stroke(); }

    const visS = previewSegs.filter(s => s.x2 > t && s.x1 < t + w);
    if (visS.length) {
      const last = visS[visS.length - 1];
      // Top
      startCtx.beginPath();
      startCtx.moveTo(visS[0].x1 - t, 0);
      for (const s of visS) { startCtx.lineTo(s.x1 - t, s.y1T); startCtx.lineTo(s.x2 - t, s.y2T); }
      startCtx.lineTo(last.x2 - t, 0);
      startCtx.closePath();
      startCtx.fillStyle = '#000';
      startCtx.fill();
      // Bottom
      startCtx.beginPath();
      startCtx.moveTo(visS[0].x1 - t, h);
      for (const s of visS) { startCtx.lineTo(s.x1 - t, s.y1B); startCtx.lineTo(s.x2 - t, s.y2B); }
      startCtx.lineTo(last.x2 - t, h);
      startCtx.closePath();
      startCtx.fill();
      // Edges
      startCtx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
      startCtx.lineWidth = 2;
      startCtx.beginPath();
      startCtx.moveTo(visS[0].x1 - t, visS[0].y1T);
      for (const s of visS) startCtx.lineTo(s.x2 - t, s.y2T);
      startCtx.stroke();
      startCtx.beginPath();
      startCtx.moveTo(visS[0].x1 - t, visS[0].y1B);
      for (const s of visS) startCtx.lineTo(s.x2 - t, s.y2B);
      startCtx.stroke();
    }

    startAnimFrame = requestAnimationFrame(drawFrame);
  }

  startAnimFrame = requestAnimationFrame(drawFrame);
}

// ─── Game Loop ────────────────────────────────────────────────────────────────

let lastTime = 0;

function gameLoop(time) {
  if (state !== 'PLAYING') return;

  const dt = time - lastTime;
  lastTime = time;

  update(Math.min(dt, 32));

  // Screen shake
  const ox = shakeAmt > 0.5 ? (Math.random() - 0.5) * shakeAmt * 2 : 0;
  const oy = shakeAmt > 0.5 ? (Math.random() - 0.5) * shakeAmt * 2 : 0;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);

  drawBackground();
  drawTrail();
  drawTerrain();
  drawParticles();
  drawPlayer();

  // Death flash
  if (flashAlpha > 0) {
    ctx.fillStyle = `rgba(239,68,68,${flashAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.restore();
  requestAnimationFrame(gameLoop);
}

// ─── Controls ─────────────────────────────────────────────────────────────────

let holding = false;

function pressStart() {
  holding = true;
  if (state === 'PLAYING') player.direction = -1;
}

function pressEnd() {
  holding = false;
  if (state === 'PLAYING') player.direction = 1;
}

document.addEventListener('mousedown', e => { if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') pressStart(); });
document.addEventListener('mouseup', pressEnd);
document.addEventListener('touchstart', e => { if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') { e.preventDefault(); pressStart(); } }, {passive: false});
document.addEventListener('touchend', e => { e.preventDefault(); pressEnd(); }, {passive: false});

document.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (!e.repeat) pressStart();
  }
});

document.addEventListener('keyup', e => {
  if (e.code === 'Space') { e.preventDefault(); pressEnd(); }
});

document.getElementById('start-btn').addEventListener('click', e => {
  e.stopPropagation();
  if (startAnimFrame) cancelAnimationFrame(startAnimFrame);
  resetGame();
});

document.getElementById('restart-btn').addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('death-screen').classList.add('hidden');
  resetGame();
});

// ─── Leaderboard ──────────────────────────────────────────────────────────────

let bannedNames = [];
fetch('Banned Names.txt')
  .then(r => r.text())
  .then(t => { bannedNames = t.split('\n').map(w => w.trim().toLowerCase()).filter(Boolean); })
  .catch(() => {});

function isNameBanned(name) {
  const l = name.toLowerCase();
  return bannedNames.some(w => l.includes(w));
}

const urlParams = new URLSearchParams(window.location.search);
const globalName = urlParams.get('player_name') || 'Gast';
const smscName = urlParams.get('smsc_name') || 'Gast';

let fbScores = [];
const waveDb = typeof db !== 'undefined' ? db : (typeof firebase !== 'undefined' ? firebase.database() : null);

if (waveDb) {
  waveDb.ref('games/smartwave-io/leaderboard').orderByChild('score').limitToLast(5).on('value', snap => {
    let arr = [];
    snap.forEach(child => {
      arr.unshift(child.val());
    });
    fbScores = arr;
    renderHudLeaderboard();
    renderStartLeaderboard();
  });
}

function getScores() {
  return fbScores;
}

function saveScore(name, sc) {
  if (name === 'Gast' || name === '***' || !waveDb) return;

  waveDb.ref('games/shared/users/' + name).once('value', snapshot => {
    const data = snapshot.val();
    if (!data || data.smscName === smscName) {
      const currentHigh = (data && data.score) || 0;
      if (sc > currentHigh) {
        waveDb.ref('games/shared/users/' + name).update({
          score: sc
        });
        waveDb.ref('games/smartwave-io/leaderboard/' + name).set({
          name: name,
          score: sc
        });
      }
    }
  });
}

const DOT_CLASSES = ['gold', 'silver', 'bronze', '', ''];

function renderHudLeaderboard() {
  const scores = getScores();
  const list = document.getElementById('lb-list');
  if (!list) return;
  if (!scores.length) {
    list.innerHTML = '<div class="lb-row" style="color:#444;font-size:12px">Nog geen scores</div>';
    return;
  }
  list.innerHTML = scores.map((s, i) => `
    <div class="lb-row">
      <span class="lb-rank">#${i+1}</span>
      <span class="lb-dot ${DOT_CLASSES[i] || ''}"></span>
      <span class="lb-name">${s.name}</span>
      <span class="lb-score">${s.score}m</span>
    </div>
  `).join('');
}

function renderStartLeaderboard() {
  const scores = getScores();
  const el = document.getElementById('start-lb-list');
  if (!scores.length) {
    el.innerHTML = '<span style="color:#444;font-size:13px">Nog geen scores</span>';
    return;
  }
  el.innerHTML = scores.map((s, i) => `
    <div class="start-lb-row">
      <span>#${i+1} ${s.name}</span>
      <span>${s.score}m</span>
    </div>
  `).join('');
}

// Params are already extracted above

// ─── Init ─────────────────────────────────────────────────────────────────────

resize();
renderHudLeaderboard();
renderStartLeaderboard();
animateStartBg();

// Initial canvas fill
ctx.save();
ctx.scale(scale, scale);
ctx.fillStyle = '#080808';
ctx.fillRect(0, 0, W, H);
ctx.restore();
