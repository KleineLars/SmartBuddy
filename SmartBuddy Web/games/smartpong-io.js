const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let W, H;
function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;
}
window.addEventListener('resize', resize);
resize();

// ── Variables ──
let state = 'START'; // START, MATCHMAKING, PLAYING, GAMEOVER
let mode = 'BOT'; // BOT, ONLINE
let role = 'p1'; // 'p1' or 'p2' (online)
let roomId = null;
let roomRef = null;

const PADDLE_WIDTH = 12;
const PADDLE_HEIGHT = 100;
const BALL_SIZE = 12;
const MAX_SCORE = 5;

let p1 = { x: 40, y: H/2, score: 0, name: 'Player 1' };
let p2 = { x: W - 40 - PADDLE_WIDTH, y: H/2, score: 0, name: 'Player 2' };
let ball = { x: W/2, y: H/2, vx: 0, vy: 0, speed: 8 };
let trail = [];
let targetOpponentY = 0;

const ACCENT = '#ec4899';
const ACCENT_GLOW = 'rgba(236,72,153,0.5)';

// ── DOM ──
const ui = {
  startScreen: document.getElementById('start-screen'),
  matchmakingScreen: document.getElementById('matchmaking-screen'),
  deathScreen: document.getElementById('death-screen'),
  scoreP1: document.getElementById('score-p1'),
  scoreP2: document.getElementById('score-p2'),
  labelP1: document.getElementById('label-p1'),
  labelP2: document.getElementById('label-p2'),
  statusMsg: document.getElementById('status-msg'),
  gameOverTitle: document.getElementById('game-over-title'),
  gameOverStats: document.getElementById('game-over-stats'),
};

const urlParams = new URLSearchParams(window.location.search);
const globalName = urlParams.get('player_name');

// ── Input ──
let myTargetY = H/2;
document.addEventListener('mousemove', e => { myTargetY = e.clientY; });
document.addEventListener('touchmove', e => { myTargetY = e.touches[0].clientY; }, {passive: false});

let gameLoopId = null;

// ── Start Game ──
function initGame() {
  p1.score = 0;
  p2.score = 0;
  targetOpponentY = H / 2;
  resetBall();
  updateScores();
  ui.startScreen.classList.add('hidden');
  ui.matchmakingScreen.classList.add('hidden');
  ui.deathScreen.classList.add('hidden');
  state = 'PLAYING';
  ui.statusMsg.textContent = '';
  lastTime = performance.now();
  if (gameLoopId) cancelAnimationFrame(gameLoopId);
  gameLoopId = requestAnimationFrame(gameLoop);
}

document.getElementById('btn-play-bot').addEventListener('click', () => {
  mode = 'BOT';
  role = 'p1';
  p1.name = globalName || 'Speler';
  p2.name = 'Computer';
  ui.labelP1.textContent = p1.name;
  ui.labelP2.textContent = p2.name;
  initGame();
  serveBall();
});

// ── Firebase Matchmaking ──
const mmRef = db.ref('games/smartpong-io/matchmaking');
const roomsRef = db.ref('games/smartpong-io/rooms');

document.getElementById('btn-play-online').addEventListener('click', () => {
  mode = 'ONLINE';
  const name = globalName || 'Speler';
  ui.startScreen.classList.add('hidden');
  ui.matchmakingScreen.classList.remove('hidden');
  
  // Try to find an open room
  mmRef.once('value').then(snap => {
    const val = snap.val();
    if (val && Object.keys(val).length > 0) {
      // Join first available room
      roomId = Object.keys(val)[0];
      mmRef.child(roomId).remove(); // Remove from matchmaking
      role = 'p2';
      p2.name = name;
      setupRoom();
    } else {
      // Create room
      roomId = 'r_' + Date.now() + '_' + Math.floor(Math.random()*1000);
      role = 'p1';
      p1.name = name;
      mmRef.child(roomId).set(true);
      roomsRef.child(roomId).set({
        p1: { y: H/2, score: 0, name: p1.name },
        p2: { y: H/2, score: 0, name: 'Waiting...' },
        ball: { x: 0.5, y: 0.5, vx: 0, vy: 0 },
        state: 'waiting'
      });
      setupRoom();
      
      // Cancel match handling
      mmRef.child(roomId).onDisconnect().remove();
      roomsRef.child(roomId).onDisconnect().remove();
    }
  }).catch(err => {
    console.error("Firebase matchmaking error:", err);
    alert("Kan niet verbinden met de server: " + err.message + "\n\nControleer of de Firebase Realtime Database Rules op 'true' (test mode) staan.");
    document.getElementById('btn-cancel-match').click();
  });
});

document.getElementById('btn-cancel-match').addEventListener('click', () => {
  if (roomId && role === 'p1') {
    mmRef.child(roomId).remove();
    roomsRef.child(roomId).remove();
  }
  roomId = null;
  ui.matchmakingScreen.classList.add('hidden');
  ui.startScreen.classList.remove('hidden');
});

document.getElementById('restart-btn').addEventListener('click', () => {
  ui.deathScreen.classList.add('hidden');
  ui.startScreen.classList.remove('hidden');
});

function setupRoom() {
  roomRef = roomsRef.child(roomId);
  if (role === 'p2') {
    roomRef.update({
      'p2/name': p2.name,
      'state': 'playing'
    });
    roomRef.onDisconnect().remove();
  }
  
  roomRef.on('value', snap => {
    const data = snap.val();
    if (!data) {
      // Opponent left
      if (state === 'PLAYING') triggerGameOver(true, 'Tegenstander heeft het spel verlaten.');
      return;
    }
    
    if (data.state === 'playing' && state !== 'PLAYING') {
      p1.name = data.p1.name;
      p2.name = data.p2.name;
      ui.labelP1.textContent = p1.name;
      ui.labelP2.textContent = p2.name;
      initGame();
      if (role === 'p1') serveBall();
    }
    
    if (state === 'PLAYING') {
      // Sync paddles
      if (role === 'p1') targetOpponentY = data.p2.y * H;
      if (role === 'p2') targetOpponentY = data.p1.y * H;
      
      // Distributed ball sync (Both clients sync if authority changes velocity)
      if (data.ball) {
        const targetX = data.ball.x * W;
        const targetY = data.ball.y * H;
        
        if (Math.abs(data.ball.vx - ball.vx) > 0.1 || Math.abs(data.ball.vy - ball.vy) > 0.1) {
          ball.vx = data.ball.vx;
          ball.vy = data.ball.vy;
          ball.x = targetX;
          ball.y = targetY;
        } else {
          // Soft sync to keep deterministic physics perfectly aligned without lag/snapping
          ball.x += (targetX - ball.x) * 0.05;
          ball.y += (targetY - ball.y) * 0.05;
        }
      }
      
      // Score sync (Host P1 is authority over score)
      if (role === 'p2') {
        if (p1.score !== data.p1.score || p2.score !== data.p2.score) {
          p1.score = data.p1.score;
          p2.score = data.p2.score;
          updateScores();
        }
      }
    }
  });
}

// ── Game Logic ──
function resetBall() {
  ball.x = W/2;
  ball.y = H/2;
  ball.vx = 0;
  ball.vy = 0;
  trail = [];
}

function serveBall() {
  resetBall();
  setTimeout(() => {
    const dir = Math.random() > 0.5 ? 1 : -1;
    const angle = (Math.random() - 0.5) * Math.PI / 4;
    ball.vx = Math.cos(angle) * ball.speed * dir;
    ball.vy = Math.sin(angle) * ball.speed;
    if (mode === 'ONLINE' && role === 'p1' && roomRef) {
      roomRef.update({ 'ball/vx': ball.vx, 'ball/vy': ball.vy, 'ball/x': ball.x/W, 'ball/y': ball.y/H });
    }
  }, 1000);
}

function updateScores() {
  ui.scoreP1.textContent = p1.score;
  ui.scoreP2.textContent = p2.score;
  if (p1.score >= MAX_SCORE || p2.score >= MAX_SCORE) {
    if (mode === 'ONLINE' && role === 'p1') {
      roomRef.remove();
    }
    triggerGameOver(false);
  }
}

function triggerGameOver(forceWin = false, reason = '') {
  state = 'GAMEOVER';
  ui.deathScreen.classList.remove('hidden');
  if (forceWin) {
    ui.gameOverTitle.textContent = 'GEWONNEN!';
    ui.gameOverStats.textContent = reason;
  } else {
    const me = role === 'p1' ? p1.score : p2.score;
    const opp = role === 'p1' ? p2.score : p1.score;
    ui.gameOverTitle.textContent = me >= MAX_SCORE ? 'GEWONNEN!' : 'VERLOREN!';
    ui.gameOverTitle.style.color = me >= MAX_SCORE ? ACCENT : '#ef4444';
    ui.gameOverStats.textContent = `${p1.score} - ${p2.score}`;
  }
}

let lastTime = 0;
let syncTimer = 0;

function gameLoop(time) {
  if (state !== 'PLAYING') return;
  const rawDt = (time - lastTime) / 16.66;
  const dt = Math.min(2, Math.max(0.1, rawDt));
  lastTime = time;

  // Move my paddle
  const oldP1Y = p1.y;
  const oldP2Y = p2.y;

  const myPaddle = role === 'p1' ? p1 : p2;
  myPaddle.y += (myTargetY - PADDLE_HEIGHT/2 - myPaddle.y) * 0.2 * dt;
  myPaddle.y = Math.max(10, Math.min(H - PADDLE_HEIGHT - 10, myPaddle.y));
  
  if (mode === 'ONLINE') {
    const oppPaddle = role === 'p1' ? p2 : p1;
    oppPaddle.y += (targetOpponentY - oppPaddle.y) * 0.2 * dt;
    oppPaddle.y = Math.max(10, Math.min(H - PADDLE_HEIGHT - 10, oppPaddle.y));

    // Send paddle pos to firebase 10x per sec
    syncTimer += dt;
    if (syncTimer > 6 && roomRef) {
      syncTimer = 0;
      if (role === 'p1') {
        roomRef.update({
          'p1/y': p1.y / H,
          'ball/x': ball.x / W,
          'ball/y': ball.y / H,
          'p1/score': p1.score,
          'p2/score': p2.score
        });
      } else {
        roomRef.update({ 'p2/y': p2.y / H });
      }
    }
  } else {
    // BOT mode
    const center = p2.y + PADDLE_HEIGHT/2;
    if (center < ball.y - 10) p2.y += 4 * dt;
    if (center > ball.y + 10) p2.y -= 4 * dt;
    p2.y = Math.max(10, Math.min(H - PADDLE_HEIGHT - 10, p2.y));
  }
  
  const p1Vy = (p1.y - oldP1Y) / (dt || 1);
  const p2Vy = (p2.y - oldP2Y) / (dt || 1);

  // Physics (Calculated by both for smooth prediction)
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  
  if (ball.y <= 0 || ball.y >= H - BALL_SIZE) {
    ball.vy *= -1;
    ball.y = Math.max(0, Math.min(H - BALL_SIZE, ball.y));
  }
  
  // Collision P1 (P1 calculates its own hits)
  if ((mode === 'BOT' || role === 'p1') && ball.vx < 0 && ball.x <= p1.x + PADDLE_WIDTH && ball.x >= p1.x - 20 && ball.y + BALL_SIZE >= p1.y && ball.y <= p1.y + PADDLE_HEIGHT) {
    ball.vx *= -1.05;
    let hitFactor = (ball.y + BALL_SIZE/2 - (p1.y + PADDLE_HEIGHT/2)) / (PADDLE_HEIGHT / 2);
    ball.vy += hitFactor * 2.5 + (p1Vy * 0.3);
    let maxVy = Math.abs(ball.vx) * 0.75;
    ball.vy = Math.max(-maxVy, Math.min(maxVy, ball.vy));
    ball.x = p1.x + PADDLE_WIDTH;
    if (mode === 'ONLINE' && roomRef) roomRef.update({ 'ball/vx': ball.vx, 'ball/vy': ball.vy, 'ball/x': ball.x/W, 'ball/y': ball.y/H });
  }
  
  // Collision P2 (P2 calculates its own hits)
  if ((mode === 'BOT' || role === 'p2') && ball.vx > 0 && ball.x + BALL_SIZE >= p2.x && ball.x <= p2.x + PADDLE_WIDTH + 20 && ball.y + BALL_SIZE >= p2.y && ball.y <= p2.y + PADDLE_HEIGHT) {
    ball.vx *= -1.05;
    let hitFactor = (ball.y + BALL_SIZE/2 - (p2.y + PADDLE_HEIGHT/2)) / (PADDLE_HEIGHT / 2);
    ball.vy += hitFactor * 2.5 + (p2Vy * 0.3);
    let maxVy = Math.abs(ball.vx) * 0.75;
    ball.vy = Math.max(-maxVy, Math.min(maxVy, ball.vy));
    ball.x = p2.x - BALL_SIZE;
    if (mode === 'ONLINE' && roomRef) roomRef.update({ 'ball/vx': ball.vx, 'ball/vy': ball.vy, 'ball/x': ball.x/W, 'ball/y': ball.y/H });
  }
  
  // Score (Only Host/Bot controls scoring logic)
  // Wait slightly longer in online mode before giving a point, to account for network delay of P2's hit
  if (mode === 'BOT' || role === 'p1') {
    if (ball.x < (mode === 'ONLINE' ? -300 : -50)) {
      p2.score++;
      updateScores();
      if (state === 'PLAYING') serveBall();
    }
    if (ball.x > W + (mode === 'ONLINE' ? 300 : 50)) {
      p1.score++;
      updateScores();
      if (state === 'PLAYING') serveBall();
    }
  }

  // Trail
  if (Math.abs(ball.vx) > 0) {
    trail.push({x: ball.x + BALL_SIZE/2, y: ball.y + BALL_SIZE/2, life: 1});
    if (trail.length > 20) trail.shift();
  }

  draw();
  gameLoopId = requestAnimationFrame(gameLoop);
}

// ── Drawing ──
function draw() {
  ctx.fillStyle = '#080808';
  ctx.fillRect(0, 0, W, H);
  
  // Center line
  ctx.strokeStyle = 'rgba(236,72,153,0.1)';
  ctx.setLineDash([15, 15]);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(W/2, 0);
  ctx.lineTo(W/2, H);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Trail
  if (trail.length > 1) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < trail.length; i++) {
      let tPrev = trail[i - 1];
      let tCurr = trail[i];
      // Index 0 is oldest, trail.length - 1 is newest
      let age = i / trail.length;
      
      ctx.beginPath();
      ctx.moveTo(tPrev.x, tPrev.y);
      ctx.lineTo(tCurr.x, tCurr.y);
      
      // Connect smoothly to the actual ball on the last segment
      if (i === trail.length - 1) {
        ctx.lineTo(ball.x + BALL_SIZE/2, ball.y + BALL_SIZE/2);
      }
      
      // Smooth gradient of color and width
      ctx.strokeStyle = `rgba(236,72,153,${age * 0.5})`;
      ctx.lineWidth = BALL_SIZE * age;
      ctx.stroke();
    }
    ctx.restore();
  }
  
  // Paddles
  ctx.fillStyle = '#fff';
  ctx.fillRect(p1.x, p1.y, PADDLE_WIDTH, PADDLE_HEIGHT);
  ctx.fillRect(p2.x, p2.y, PADDLE_WIDTH, PADDLE_HEIGHT);
  
  // Ball
  ctx.beginPath();
  ctx.arc(ball.x + BALL_SIZE/2, ball.y + BALL_SIZE/2, BALL_SIZE/2, 0, Math.PI*2);
  ctx.fillStyle = ACCENT;
  ctx.fill();
}

// Start bot mode immediately if requested (testing mostly, wait we have Start screen)
// The loop begins when initGame is called.

// ── Start screen animated background ──
(function animStartBg() {
  const bg = document.getElementById('start-bg');
  if (!bg) return;
  const bCtx = bg.getContext('2d');
  
  let ballX = window.innerWidth/2, ballY = window.innerHeight/2;
  let vx = (Math.random() > 0.5 ? 4 : -4);
  let vy = (Math.random() > 0.5 ? 3 : -3);
  let p1y = window.innerHeight/2 - 30, p2y = window.innerHeight/2 - 30;

  function resizeBg() {
    bg.width = window.innerWidth;
    bg.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeBg);
  resizeBg();

  function draw() {
    if (bg.offsetParent === null) {
      requestAnimationFrame(draw);
      return;
    }

    const w = bg.width, h = bg.height;
    bCtx.fillStyle = '#080808';
    bCtx.fillRect(0, 0, w, h);
    
    // Center line
    bCtx.strokeStyle = 'rgba(236,72,153,0.1)';
    bCtx.setLineDash([10, 10]);
    bCtx.lineWidth = 4;
    bCtx.beginPath(); bCtx.moveTo(w/2, 0); bCtx.lineTo(w/2, h); bCtx.stroke();
    bCtx.setLineDash([]);
    
    // Update ball
    ballX += vx; ballY += vy;
    if (ballY < 0 || ballY > h - 8) {
      vy *= -1;
      ballY = ballY < 0 ? 0 : h - 8;
    }
    
    // Verbeterde AI
    if (vx < 0 && ballX < w * 0.7) p1y += (ballY - 30 - p1y) * 0.15;
    else p1y += (h/2 - 30 - p1y) * 0.05;
    
    if (vx > 0 && ballX > w * 0.3) p2y += (ballY - 30 - p2y) * 0.15;
    else p2y += (h/2 - 30 - p2y) * 0.05;
    
    p1y = Math.max(0, Math.min(h - 60, p1y));
    p2y = Math.max(0, Math.min(h - 60, p2y));
    
    // Bounce logic
    if (ballX < 20 && ballY > p1y - 10 && ballY < p1y + 70) {
      ballX = 20;
      vx = Math.min(12, Math.abs(vx * 1.05));
      let impact = (ballY - (p1y + 30)) / 30;
      vy = impact * 6 + (Math.random() * 2 - 1);
    }
    if (ballX > w - 28 && ballY > p2y - 10 && ballY < p2y + 70) {
      ballX = w - 28;
      vx = -Math.min(12, Math.abs(vx * 1.05));
      let impact = (ballY - (p2y + 30)) / 30;
      vy = impact * 6 + (Math.random() * 2 - 1);
    }
    
    // Reset if out
    if (ballX < -40 || ballX > w + 40) { 
      ballX = w/2; ballY = h/2; 
      vx = (Math.random() > 0.5 ? 4 : -4); 
      vy = (Math.random() > 0.5 ? 3 : -3); 
    }
    
    vy = Math.max(-8, Math.min(8, vy));
    
    // Draw paddles & ball
    bCtx.fillStyle = '#fff';
    bCtx.fillRect(12, p1y, 8, 60);
    bCtx.fillRect(w - 20, p2y, 8, 60);
    
    bCtx.beginPath(); bCtx.arc(ballX, ballY, 6, 0, Math.PI*2);
    bCtx.fillStyle = '#ec4899';
    bCtx.fill();
    
    requestAnimationFrame(draw);
  }
  draw();
})();
