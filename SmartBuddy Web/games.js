// ═══════════════════════════════════════════════════════════
// SmartBuddy Games — Games knop in Smartschool topnav
// ═══════════════════════════════════════════════════════════
(function () {
  if (document.getElementById('SmartBuddy-games-btn')) return;

  
// Bridge utility to talk to the extension content script
function sendMessageToParent(data) {
  return new Promise((resolve) => {
    const id = Date.now() + Math.random().toString();
    const handler = (e) => {
      if (e.data && e.data.id === id) {
        window.removeEventListener('message', handler);
        resolve(e.data.response);
      }
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ ...data, id }, '*');
  });
}

// Mock chrome object using the bridge
const chrome = {
  storage: {
    local: {
      get: (keys, cb) => sendMessageToParent({ action: 'storageLocalGet', keys }).then(cb),
      set: (obj, cb) => sendMessageToParent({ action: 'storageLocalSet', obj }).then(cb),
      remove: (keys, cb) => sendMessageToParent({ action: 'storageLocalRemove', keys }).then(cb)
    },
    sync: {
      get: (keys, cb) => sendMessageToParent({ action: 'storageSyncGet', keys }).then(cb),
      set: (obj, cb) => sendMessageToParent({ action: 'storageSyncSet', obj }).then(cb)
    }
  },
  runtime: {
    sendMessage: (msg, cb) => sendMessageToParent({ action: 'runtimeSendMessage', message: msg }).then(cb),
    getURL: (path) => './' + path
  }
};

window.__cachedSmscName = 'Gast';



  function waitForTopnav(callback) {
    const nav = document.querySelector('.topnav');
    if (nav) return callback(nav);
    const observer = new MutationObserver(() => {
      const nav = document.querySelector('.topnav');
      if (nav) { observer.disconnect(); callback(nav); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  
  function injectStyles() {
    const style = document.createElement('style');
    style.id = 'SmartBuddy-games-styles';
    style.textContent = `
      

      /* Games knop in topnav */
      #SmartBuddy-games-btn {
        cursor: pointer;
        position: relative;
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
        transition: all 0.2s ease;
      }
      #SmartBuddy-games-btn:hover {
        color: #ffffff;
      }
      #SmartBuddy-games-btn svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }
      
      .sg-global-status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
        transition: background-color 0.3s;
        box-shadow: 0 0 4px rgba(0,0,0,0.2);
        border: 1px solid rgba(0, 0, 0, 0.4);
      }
      .sg-status-red { background-color: #ef4444; }
      .sg-status-green { background-color: #10b981; }

      /* ── Overlay Backdrop ── */
      #sg-games-overlay {
        position: fixed;
        inset: 0;
        z-index: 999999;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 24px;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.4s;
      }
      #sg-games-overlay.sg-visible {
        display: flex;
        opacity: 1;
        visibility: visible;
      }

      #sg-games-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        
        -webkit-
      }

      /* ── Premium Modal ── */
      #sg-games-content {
        position: relative;
        background: #ffffff;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 24px;
        max-width: 900px;
        width: 100%;
        max-height: 85vh;
        overflow-y: auto;
        padding: 48px;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.15);
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        transform: translateY(20px) scale(0.98);
        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }
      #sg-games-overlay.sg-visible #sg-games-content {
        transform: translateY(0) scale(1);
      }

      /* Scrollbar */
      #sg-games-content::-webkit-scrollbar {
        width: 8px;
      }
      #sg-games-content::-webkit-scrollbar-track {
        background: transparent;
      }
      #sg-games-content::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.12);
        border-radius: 10px;
      }
      #sg-games-content::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.25);
      }

      /* Close Button */
      #sg-games-close {
        position: absolute;
        top: 24px;
        right: 24px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 1px solid rgba(0, 0, 0, 0.08);
        background: rgba(0, 0, 0, 0.03);
        color: rgba(0, 0, 0, 0.5);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      #sg-games-close svg {
        width: 20px;
        height: 20px;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      #sg-games-close:hover {
        background: rgba(255, 82, 14, 0.1);
        border-color: rgba(255, 82, 14, 0.3);
        color: #FF520E;
        transform: rotate(90deg);
      }

      /* Settings Button */
      #sg-settings-btn {
        position: absolute;
        top: 24px;
        right: 80px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 1px solid rgba(0, 0, 0, 0.08);
        background: rgba(0, 0, 0, 0.03);
        color: rgba(0, 0, 0, 0.5);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      #sg-settings-btn svg { width: 20px; height: 20px; stroke: currentColor; stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; }
      #sg-settings-btn:hover { background: rgba(0, 0, 0, 0.1); color: #1a1a1a; transform: rotate(45deg); }

      /* Chat Button */
      #sg-chat-btn {
        position: absolute;
        top: 24px;
        right: 136px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 1px solid rgba(0, 0, 0, 0.08);
        background: rgba(0, 0, 0, 0.03);
        color: rgba(0, 0, 0, 0.5);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      #sg-chat-btn svg { width: 20px; height: 20px; stroke: currentColor; stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; }
      #sg-chat-btn:hover { background: rgba(0, 0, 0, 0.1); color: #1a1a1a; transform: scale(1.05); }

      /* Mod Button */
      #sg-mod-btn {
        position: absolute;
        top: 24px;
        right: 192px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 1px solid rgba(0, 0, 0, 0.08);
        background: rgba(0, 0, 0, 0.03);
        color: rgba(0, 0, 0, 0.5);
        cursor: pointer;
        display: none;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      #sg-mod-btn svg { width: 20px; height: 20px; stroke: currentColor; stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; }
      #sg-mod-btn:hover { background: rgba(0, 0, 0, 0.1); color: #1a1a1a; transform: scale(1.05); }

      .sg-chat-status-dot {
        position: absolute;
        top: 2px;
        right: 2px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: #ef4444; /* sg-status-red */
        border: 1px solid #000;
        transition: background-color 0.3s;
      }
      .sg-chat-status-dot.sg-status-green { background-color: #22c55e; }
      .sg-chat-status-dot.sg-status-red { background-color: #ef4444; }

      /* Name Modal */
      #sg-name-modal-overlay {
        position: absolute;
        inset: 0;
        background: rgba(255,255,255,0.9);
        backdrop-filter: blur(8px);
        z-index: 999999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-radius: 24px;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
      }
      #sg-name-modal-overlay.sg-visible { opacity: 1; visibility: visible; }
      #sg-name-modal {
        background: #ffffff;
        padding: 40px;
        border-radius: 24px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        text-align: center;
        max-width: 400px;
        width: 100%;
        border: 1px solid rgba(0,0,0,0.05);
      }
      #sg-name-modal h2 { margin-bottom: 8px; font-size: 24px; font-weight: 800; color: #1a1a1a; letter-spacing: -0.02em; }
      #sg-name-modal p { margin-bottom: 24px; color: rgba(0,0,0,0.5); font-size: 14px; line-height: 1.5; }
      #sg-name-input {
        width: 100%; box-sizing: border-box; padding: 16px 24px;
        border-radius: 12px; border: 1px solid rgba(0,0,0,0.1);
        font-size: 16px; font-weight: 600; text-align: center; margin-bottom: 16px;
        font-family: inherit; transition: all 0.2s; outline: none;
      }
      #sg-name-input:focus { border-color: #FF520E; box-shadow: 0 0 0 3px rgba(255,82,14,0.1); }
      #sg-name-btn-group { display: flex; gap: 12px; }
      #sg-name-save {
        width: 100%; padding: 16px; border-radius: 12px; background: #1a1a1a;
        color: #ffffff; font-weight: 700; font-size: 16px; cursor: pointer; border: none;
        transition: all 0.2s; font-family: inherit;
      }
      #sg-name-save:hover { background: #333; transform: translateY(-2px); }
      #sg-name-error { color: #ef4444; font-size: 13px; font-weight: 600; margin-bottom: 16px; display: none; }
      #sg-name-close {
        margin-top: 16px; background: transparent; border: none; color: rgba(0,0,0,0.4);
        font-weight: 600; cursor: pointer; font-family: inherit; text-decoration: underline; display: none;
      }
      #sg-name-close:hover { color: #1a1a1a; }

      #sg-apikey-modal-overlay {
        display: none;
        flex-direction: column;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
      }
      #sg-apikey-modal-overlay.sg-visible { display: flex; opacity: 1; visibility: visible; }
      #sg-apikey-modal {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .sg-apikey-header { text-align: center; margin-bottom: 40px; }
      .sg-apikey-icon { width: 64px; height: 64px; background: rgba(255, 82, 14, 0.1); color: #FF520E; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
      .sg-apikey-header h2 { font-size: 28px; font-weight: 800; color: #1a1a1a; letter-spacing: -0.02em; margin-bottom: 12px; }
      .sg-apikey-header p { color: rgba(0,0,0,0.5); font-size: 15px; line-height: 1.5; max-width: 500px; margin: 0 auto; }
      
      .sg-apikey-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: stretch; }
      @media (max-width: 768px) { .sg-apikey-layout { grid-template-columns: 1fr; } }
      
      .sg-apikey-guide { background: #fafafa; padding: 32px; border-radius: 20px; border: 1px solid rgba(0,0,0,0.06); }
      .sg-apikey-guide h3 { font-size: 18px; font-weight: 700; margin-bottom: 24px; color: #1a1a1a; }
      .sg-apikey-steps { list-style: none; padding: 0; margin: 0; counter-reset: step-counter; }
      .sg-apikey-steps li { position: relative; padding-left: 40px; margin-bottom: 20px; font-size: 14px; color: rgba(0,0,0,0.7); line-height: 1.5; }
      .sg-apikey-steps li::before { content: counter(step-counter); counter-increment: step-counter; position: absolute; left: 0; top: -2px; width: 28px; height: 28px; background: #1a1a1a; color: #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
      .sg-apikey-steps li a { color: #FF520E; font-weight: 700; text-decoration: none; }
      .sg-apikey-steps li a:hover { text-decoration: underline; }
      .sg-apikey-steps li code { background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #FF520E; font-weight: 600; }
      
      .sg-apikey-form { display: flex; flex-direction: column; justify-content: center; }
      .sg-apikey-form h3 { font-size: 18px; font-weight: 700; margin-bottom: 24px; color: #1a1a1a; text-align: center; }
      
      #sg-apikey-input {
        width: 100%; box-sizing: border-box; padding: 18px 24px;
        border-radius: 16px; border: 2px solid rgba(0,0,0,0.08);
        font-size: 16px; font-weight: 500; font-family: monospace; text-align: center; margin-bottom: 16px;
        transition: all 0.2s; outline: none; background: #ffffff;
        -webkit-text-security: disc;
      }
      #sg-apikey-input:focus { border-color: #FF520E; box-shadow: 0 0 0 4px rgba(255,82,14,0.1); }
      #sg-apikey-save {
        width: 100%; padding: 18px; border-radius: 16px; background: #FF520E;
        color: #ffffff; font-weight: 700; font-size: 16px; cursor: pointer; border: none;
        transition: all 0.2s; font-family: inherit; margin-bottom: 16px;
      }
      #sg-apikey-save:hover { background: #FF520E; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(255,82,14,0.25); }
      #sg-apikey-close {
        background: transparent; border: none; color: rgba(0,0,0,0.4);
        font-weight: 600; cursor: pointer; font-family: inherit; text-decoration: underline; padding: 8px;
        margin: 0 auto; display: block;
      }
      #sg-apikey-close:hover { color: #1a1a1a; }
      #sg-apikey-error { color: #ef4444; font-size: 14px; font-weight: 600; margin-bottom: 20px; display: none; background: #fef2f2; padding: 12px; border-radius: 12px; border: 1px solid #fecaca; text-align: center; }
      /* Header */
      .sg-games-header {
        text-align: center;
        margin-bottom: 48px;
      }
      .sg-games-title {
        font-size: 36px;
        font-weight: 800;
        color: #1a1a1a;
        margin-bottom: 12px;
        letter-spacing: -0.03em;
      }
      .sg-games-title span { color: #1a1a1a; }
      .sg-games-subtitle {
        font-size: 15px;
        color: rgba(0, 0, 0, 0.5);
        font-weight: 400;
      }

      /* Grid */
      .sg-games-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 24px;
      }

      /* Card */
      .sg-game-card {
        background: #f8fafc;
        border: 1px solid rgba(0, 0, 0, 0.06);
        border-radius: 20px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;
        display: flex;
        flex-direction: column;
      }
      .sg-game-card:hover {
        background: #e5e7eb;
        transform: translateY(-2px);
      }
      
      /* Specifieke hover kleuren per game */
      #sg-card-smartbloob-io:hover {
        border-color: rgba(255, 82, 14, 0.3);
      }
      #sg-card-smartwave-io:hover {
        border-color: rgba(45, 212, 191, 0.3);
      }
      #sg-card-smartpong-io:hover {
        border-color: rgba(236, 72, 153, 0.3);
      }

      /* Canvas Preview */
      .sg-game-preview-container {
        width: 100%;
        height: 180px;
        position: relative;
        background: #e5e7eb;
        overflow: hidden;
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      }
      .sg-game-preview {
        width: 100%;
        height: 100%;
        display: block;
      }
      .sg-game-preview-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(to top, rgba(248,248,248,1), transparent);
        pointer-events: none;
      }

      /* Info Area */
      .sg-game-info {
        padding: 24px;
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      
      .sg-badges-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .sg-game-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        padding: 4px 12px;
        border-radius: 20px;
      }
      .sg-badge-live {
        background: rgba(255, 82, 14, 0.1);
        color: #FF520E;
        border: 1px solid rgba(255, 82, 14, 0.2);
      }
      .sg-badge-soon {
        background: rgba(0, 0, 0, 0.04);
        color: rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(0, 0, 0, 0.08);
      }
      .sg-live-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #FF520E;
        animation: sgPulseOrange 2s infinite;
      }

      @keyframes sgPulseOrange {
        0% {  }
        70% {  }
        100% {  }
      }

      .sg-game-name {
        font-size: 22px;
        font-weight: 700;
        color: #1a1a1a;
        margin-bottom: 8px;
        letter-spacing: -0.01em;
      }
      .sg-game-desc {
        font-size: 14px;
        color: rgba(0, 0, 0, 0.5);
        line-height: 1.6;
        margin-bottom: 24px;
        flex: 1;
      }

      /* Play Button */
      .sg-game-play-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background: #FF520E;
        color: #ffffff;
        font-size: 14px;
        font-weight: 600;
        padding: 12px 24px;
        border-radius: 12px;
        border: none;
        cursor: pointer;
        transition: all 0.3s ease;
        text-decoration: none;
        width: 100%;
        
      }
      .sg-game-card:hover .sg-game-play-btn {
        
        transform: translateY(-2px);
      }
      .sg-game-play-btn svg {
        width: 16px;
        height: 16px;
        fill: currentColor;
      }

      /* Coming Soon Card */
      .sg-game-card.sg-coming-soon {
        cursor: default;
      }
      .sg-game-card.sg-coming-soon:hover {
        transform: none;
        border-color: rgba(0, 0, 0, 0.06);
        box-shadow: none;
        background: #f8fafc;
      }
      .sg-lock-icon {
        width: 32px;
        height: 32px;
        fill: rgba(0, 0, 0, 0.12);
      }

      /* Footer */
      .sg-games-footer {
        text-align: center;
        margin-top: 32px;
        font-size: 13px;
        color: rgba(0, 0, 0, 0.3);
        font-weight: 500;
      }
      .sg-games-footer span {
        color: #1a1a1a;
      }

      /* ── Fullscreen Game Iframe Overlay ── */
      #sg-game-iframe-overlay {
        position: fixed;
        inset: 0;
        z-index: 9999999;
        background: #000;
        display: flex;
        flex-direction: column;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s ease;
      }
      #sg-game-iframe-overlay.sg-active {
        opacity: 1;
        visibility: visible;
      }
      #sg-game-iframe-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 16px;
        background: #111;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        flex-shrink: 0;
      }
      #sg-game-iframe-title {
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        font-weight: 600;
        color: #ffffff;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      #sg-game-iframe-title .sg-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #22c55e;
        animation: sgPulseGreen 2s infinite;
      }
      @keyframes sgPulseGreen {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
      #sg-game-iframe-close {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.05);
        color: rgba(255,255,255,0.7);
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      #sg-game-iframe-close:hover {
        background: rgba(255, 82, 14, 0.15);
        border-color: rgba(255, 82, 14, 0.3);
        color: #ffffff;
      }
      #sg-game-iframe-close svg {
        width: 14px;
        height: 14px;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      #sg-game-iframe-frame {
        flex: 1;
        width: 100%;
        border: none;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Preview animatie ──
  function animatePreview(canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth * 2;
    const H = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    const w = W / 2, h = H / 2;

    const COLORS = ['#FF520E', '#3b82f6', '#2dd4bf', '#8b5cf6', '#ef4444', '#22c55e', '#f59e0b', '#ec4899'];
    const cells = [];
    for (let i = 0; i < 15; i++) {
      cells.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 6 + Math.random() * 18,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
      });
    }

    const food = [];
    for (let i = 0; i < 60; i++) {
      food.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 2 + Math.random() * 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }

    let animId;
    function draw() {
      ctx.clearRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Food
      food.forEach(f => {
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = f.color + '66';
        ctx.fill();
      });

      // Cells
      cells.forEach(c => {
        c.x += c.vx;
        c.y += c.vy;
        if (c.x < 0 || c.x > w) c.vx *= -1;
        if (c.y < 0 || c.y > h) c.vy *= -1;

        ctx.shadowColor = c.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(c.x - c.r * 0.3, c.y - c.r * 0.3, 0, c.x, c.y, c.r);
        grad.addColorStop(0, c.color + 'cc');
        grad.addColorStop(1, c.color + '88');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      animId = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animId);
  }

  // ── Wave Preview animatie ──
  function animateWavePreview(canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth * 2;
    const H = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    const w = W / 2, h = H / 2;

    let distance = 0;
    let playerY = h / 2;
    let playerVy = 2.5;
    let direction = 1;
    const speed = 3;
    const trail = [];

    let animId;
    let lastTime = performance.now();

    function draw(time) {
      const dt = Math.min(time - lastTime, 32);
      lastTime = time;
      
      const timeScale = dt / 16.66;
      distance += speed * timeScale;
      playerY += playerVy * direction * timeScale;
      
      if (playerY > h * 0.8) direction = -1;
      if (playerY < h * 0.2) direction = 1;

      trail.push({x: distance + w * 0.3, y: playerY});
      if (trail.length > 60) trail.shift();

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, w, h);

      // Draw grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const offset = (distance * 0.3) % 40;
      for(let x = -offset; x < w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for(let y = 0; y < h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      ctx.save();
      ctx.translate(-distance, 0);

      // Draw Trail
      if (trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i=1; i<trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y);
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.restore();

      // Draw Player (fixed X)
      ctx.save();
      ctx.translate(w * 0.3, playerY);
      const angle = Math.atan2(direction * playerVy, speed);
      ctx.rotate(angle);
      
      const size = 10;
      ctx.beginPath();
      ctx.moveTo(size, 0);
      ctx.lineTo(-size, size * 0.8);
      ctx.lineTo(-size, -size * 0.8);
      ctx.closePath();
      
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#000000';
      ctx.stroke();
      ctx.restore();

      animId = requestAnimationFrame(draw);
    }
    draw(performance.now());
    return () => cancelAnimationFrame(animId);
  }

  // ── Pong Preview animatie ──
  function animatePongPreview(canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth * 2;
    const H = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    const w = W / 2, h = H / 2;
    
    let animId;
    let ballX = w/2, ballY = h/2;
    let vx = (Math.random() > 0.5 ? 3 : -3);
    let vy = (Math.random() > 0.5 ? 2 : -2);
    let p1y = h/2 - 15, p2y = h/2 - 15;
    
    function draw() {
      ctx.fillStyle = '#080808';
      ctx.fillRect(0, 0, w, h);
      
      // Center line
      ctx.strokeStyle = 'rgba(236,72,153,0.2)';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(w/2, 0); ctx.lineTo(w/2, h); ctx.stroke();
      ctx.setLineDash([]);
      
      // Update ball
      ballX += vx; ballY += vy;
      if (ballY < 0 || ballY > h - 4) {
        vy *= -1;
        ballY = ballY < 0 ? 0 : h - 4;
      }
      
      // Verbeterde AI
      if (vx < 0 && ballX < w * 0.7) {
        p1y += (ballY - 15 - p1y) * 0.15;
      } else {
        p1y += (h/2 - 15 - p1y) * 0.05;
      }
      
      if (vx > 0 && ballX > w * 0.3) {
        p2y += (ballY - 15 - p2y) * 0.15;
      } else {
        p2y += (h/2 - 15 - p2y) * 0.05;
      }
      
      // Hou paddles binnen het scherm
      p1y = Math.max(0, Math.min(h - 30, p1y));
      p2y = Math.max(0, Math.min(h - 30, p2y));
      
      // Bounce logic
      if (ballX < 10 && ballY > p1y - 5 && ballY < p1y + 35) {
        ballX = 10;
        vx = Math.min(8, Math.abs(vx * 1.05)); // Sneller maken
        let impact = (ballY - (p1y + 15)) / 15;
        vy = impact * 4 + (Math.random() * 2 - 1);
      }
      if (ballX > w - 14 && ballY > p2y - 5 && ballY < p2y + 35) {
        ballX = w - 14;
        vx = -Math.min(8, Math.abs(vx * 1.05));
        let impact = (ballY - (p2y + 15)) / 15;
        vy = impact * 4 + (Math.random() * 2 - 1);
      }
      
      // Reset if out
      if (ballX < -20 || ballX > w + 20) { 
        ballX = w/2; 
        ballY = h/2; 
        vx = (Math.random() > 0.5 ? 3 : -3); 
        vy = (Math.random() > 0.5 ? 2 : -2); 
      }
      
      // Snelheidslimiet voor de bal Y-as
      vy = Math.max(-6, Math.min(6, vy));
      
      // Draw paddles & ball
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#ec4899'; ctx.shadowBlur = 10;
      ctx.fillRect(6, p1y, 4, 30);
      ctx.fillRect(w - 10, p2y, 4, 30);
      
      ctx.beginPath(); ctx.arc(ballX, ballY, 3, 0, Math.PI*2);
      ctx.fillStyle = '#ec4899';
      ctx.fill();
      ctx.shadowBlur = 0;
      
      animId = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animId);
  }

  // ── Drift Preview animatie ──
  function animateDriftPreview(canvas) {
    const ctx = canvas.getContext('2d');
    let W = canvas.width;
    let H = canvas.height;
    let w = W / 2;
    let h = H / 2;
    let initializedScale = false;
    
    let animId;
    
    // Mini Autopilot Game State for Selector Card
    let car = {
      x: 0,
      y: 0,
      angle: -Math.PI / 2,
      speed: 2.2,
      width: 8,
      height: 16,
      tethered: false,
      tetherAnchor: null,
      tetherRadius: 0,
      tetherAngle: 0,
      tetherDir: 1
    };
    
    let segments = [];
    let anchors = [];
    let lastTurnDir = 1;
    let totalTurns = 0;
    const ROAD_WIDTH = 50;
    
    // Initial straight segment
    segments.push({
      type: 'straight',
      startX: 0,
      startY: 100,
      endX: 0,
      endY: -100,
      angle: -Math.PI / 2,
      points: [
        { x: 0, y: 100, angle: -Math.PI/2 },
        { x: 0, y: 50, angle: -Math.PI/2 },
        { x: 0, y: 0, angle: -Math.PI/2 },
        { x: 0, y: -50, angle: -Math.PI/2 },
        { x: 0, y: -100, angle: -Math.PI/2 }
      ]
    });
    
    function generateNext() {
      let lastSeg = segments[segments.length - 1];
      let dir = -lastTurnDir;
      let radius = 50; 
      let turnAngle = Math.PI / 2;
      
      let cx = lastSeg.endX + Math.cos(lastSeg.angle + dir * Math.PI / 2) * radius;
      let cy = lastSeg.endY + Math.sin(lastSeg.angle + dir * Math.PI / 2) * radius;
      
      let startAngle = lastSeg.angle - dir * Math.PI / 2;
      let endAngle = startAngle + dir * turnAngle;
      
      let curveEndX = cx + Math.cos(endAngle) * radius;
      let curveEndY = cy + Math.sin(endAngle) * radius;
      let exitAngle = lastSeg.angle + dir * turnAngle;
      
      let straightLen = 100;
      let endX = curveEndX + Math.cos(exitAngle) * straightLen;
      let endY = curveEndY + Math.sin(exitAngle) * straightLen;
      
      let curveSeg = {
        type: 'curve',
        cx: cx,
        cy: cy,
        radius: radius,
        startAngle: startAngle,
        endAngle: endAngle,
        dir: dir,
        points: []
      };
      
      let cSteps = 10;
      for (let s = 0; s <= cSteps; s++) {
        let t = s / cSteps;
        let currA = startAngle + t * (dir * turnAngle);
        curveSeg.points.push({
          x: cx + Math.cos(currA) * radius,
          y: cy + Math.sin(currA) * radius,
          angle: currA + (dir > 0 ? Math.PI/2 : -Math.PI/2)
        });
      }
      
      let straightSeg = {
        type: 'straight',
        startX: curveEndX,
        startY: curveEndY,
        endX: endX,
        endY: endY,
        angle: exitAngle,
        points: []
      };
      
      let sSteps = 10;
      for (let s = 0; s <= sSteps; s++) {
        let t = s / sSteps;
        straightSeg.points.push({
          x: curveEndX + t * (endX - curveEndX),
          y: curveEndY + t * (endY - curveEndY),
          angle: exitAngle
        });
      }
      
      totalTurns++;
      let anchor = {
        x: cx,
        y: cy,
        radius: radius,
        dir: dir,
        passed: false,
        entryAngle: lastSeg.angle,
        exitAngle: exitAngle,
        index: totalTurns
      };
      
      segments.push(curveSeg);
      segments.push(straightSeg);
      anchors.push(anchor);
      
      lastTurnDir = dir;
    }
    
    for (let i = 0; i < 5; i++) generateNext();
    
    function normalizeAngle(a) {
      if (!isFinite(a)) return 0;
      a = a % (Math.PI * 2);
      if (a > Math.PI) a -= Math.PI * 2;
      if (a < -Math.PI) a += Math.PI * 2;
      return a;
    }
    
    function update() {
      let closest = anchors.find(a => !a.passed);
      if (closest) {
        let dx = closest.x - car.x;
        let dy = closest.y - car.y;
        let minDist = Math.sqrt(dx*dx + dy*dy);
        
        let entryX = closest.x + Math.cos(closest.entryAngle - closest.dir * Math.PI/2) * closest.radius;
        let entryY = closest.y + Math.sin(closest.entryAngle - closest.dir * Math.PI/2) * closest.radius;
        let ex = car.x - entryX;
        let ey = car.y - entryY;
        let hx = Math.cos(closest.entryAngle);
        let hy = Math.sin(closest.entryAngle);
        let progress = ex * hx + ey * hy;
        
        if (!car.tethered) {
          if (progress >= -15 && progress < 0 && minDist < closest.radius + 50) {
            car.tethered = true;
            car.tetherAnchor = closest;
            car.tetherActive = false;
            car.tetherRadius = minDist;
            car.tetherRestRadius = closest.radius;
            car.tetherAngle = Math.atan2(car.y - closest.y, car.x - closest.x);
            let vx = Math.cos(car.angle);
            let vy = Math.sin(car.angle);
            let cross = vx * dy - vy * dx;
            car.tetherDir = cross > 0 ? 1 : -1;
          }
        } else if (car.tetherActive) {
          let angleDiff = normalizeAngle(car.angle - closest.exitAngle);
          let isDone = false;
          if (closest.dir > 0) {
            isDone = angleDiff >= -0.1;
          } else {
            isDone = angleDiff <= 0.1;
          }
          
          if (isDone) {
            car.tethered = false;
            car.tetherActive = false;
            closest.passed = true;
            generateNext();
          }
        }
      }
      
      if (!car.tethered) {
        for (let a of anchors) {
          if (!a.passed) {
            let dx = a.x - car.x;
            let dy = a.y - car.y;
            let vx = Math.cos(car.angle);
            let vy = Math.sin(car.angle);
            let dot = vx * dx + vy * dy;
            if (dot < -100) {
              a.passed = true;
              generateNext();
            }
          }
        }
      }
      
      let dt = 1;
      if (car.tethered) {
        if (!car.tetherActive) {
          car.x += Math.cos(car.angle) * car.speed * dt;
          car.y += Math.sin(car.angle) * car.speed * dt;
          
          // Gently pull position towards the centerline of closest straight segment
          let closestSeg = null;
          let minDist = Infinity;
          let projX = car.x, projY = car.y;
          for (let seg of segments) {
            if (seg.type === 'straight') {
              let dx = seg.endX - seg.startX;
              let dy = seg.endY - seg.startY;
              let len2 = dx*dx + dy*dy;
              if (len2 === 0) continue;
              let t = ((car.x - seg.startX)*dx + (car.y - seg.startY)*dy) / len2;
              t = Math.max(0, Math.min(1, t));
              let pX = seg.startX + t * dx;
              let pY = seg.startY + t * dy;
              let dist = Math.sqrt((car.x - pX)**2 + (car.y - pY)**2);
              if (dist < minDist) {
                minDist = dist;
                closestSeg = seg;
                projX = pX;
                projY = pY;
              }
            }
          }
          if (closestSeg) {
            let pullFactor = 0.04;
            car.x += (projX - car.x) * pullFactor * dt;
            car.y += (projY - car.y) * pullFactor * dt;
            let diffAngle = normalizeAngle(closestSeg.angle - car.angle);
            car.angle += diffAngle * 0.05 * dt;
          }
          
          let anchor = car.tetherAnchor;
          let entryX = anchor.x + Math.cos(anchor.entryAngle - anchor.dir * Math.PI/2) * anchor.radius;
          let entryY = anchor.y + Math.sin(anchor.entryAngle - anchor.dir * Math.PI/2) * anchor.radius;
          let ex = car.x - entryX;
          let ey = car.y - entryY;
          let hx = Math.cos(anchor.entryAngle);
          let hy = Math.sin(anchor.entryAngle);
          let progress = ex * hx + ey * hy;
          
          if (progress >= 0) {
            car.tetherActive = true;
            let dx = car.x - anchor.x;
            let dy = car.y - anchor.y;
            let actualRadius = Math.sqrt(dx*dx + dy*dy);
            car.tetherRadius = actualRadius;
            car.tetherRestRadius = actualRadius;
            car.tetherAngle = Math.atan2(dy, dx);
            car.angle = car.tetherAngle + anchor.dir * Math.PI/2;
          }
        } else {
          car.tetherRadius = car.tetherRestRadius;
          let angularVel = car.speed / car.tetherRadius;
          car.tetherAngle += car.tetherDir * angularVel * dt;
          car.x = car.tetherAnchor.x + Math.cos(car.tetherAngle) * car.tetherRadius;
          car.y = car.tetherAnchor.y + Math.sin(car.tetherAngle) * car.tetherRadius;
          car.angle = car.tetherAngle + car.tetherDir * Math.PI/2;
        }
      } else {
        car.x += Math.cos(car.angle) * car.speed * dt;
        car.y += Math.sin(car.angle) * car.speed * dt;
      }
      // Hard safety caps to prevent unbounded growth without accidentally deleting the car's current road
      if (segments.length > 50) segments = segments.slice(-40);
      anchors = anchors.filter(a => !a.passed || Math.sqrt((a.x - car.x)**2 + (a.y - car.y)**2) < 600);
    }
    
    function draw() {
      // Dynamic Canvas Sizing & Scale setup
      if (canvas.offsetWidth > 0 && (!initializedScale || canvas.width !== canvas.offsetWidth * 2)) {
        W = canvas.width = canvas.offsetWidth * 2;
        H = canvas.height = canvas.offsetHeight * 2;
        ctx.scale(2, 2);
        w = W / 2;
        h = H / 2;
        initializedScale = true;
      }
      
      if (w === 0 || h === 0) {
        animId = requestAnimationFrame(draw);
        return;
      }
      
      update();
      
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(0, 0, w, h);
      
      ctx.save();
      ctx.translate(w/2, h/2 + 30);
      ctx.translate(-car.x, -car.y);
      
      let pts = [];
      for (let seg of segments) {
        if (seg.points) pts = pts.concat(seg.points);
      }
      
      if (pts.length >= 2) {
        let outerLeft = [];
        let innerLeft = [];
        let innerRight = [];
        let outerRight = [];
        
        const halfW = ROAD_WIDTH / 2;
        const centerHalfW = 10;
        
        for (let i = 0; i < pts.length; i++) {
          let p = pts[i];
          let tx = 0, ty = 0;
          if (i === 0) {
            tx = pts[1].x - p.x;
            ty = pts[1].y - p.y;
          } else if (i === pts.length - 1) {
            tx = p.x - pts[i-1].x;
            ty = p.y - pts[i-1].y;
          } else {
            tx = pts[i+1].x - pts[i-1].x;
            ty = pts[i+1].y - pts[i-1].y;
          }
          let len = Math.sqrt(tx*tx + ty*ty);
          if (len === 0) len = 1;
          tx /= len; ty /= len;
          let nx = -ty, ny = tx;
          
          outerLeft.push({ x: p.x + nx * halfW, y: p.y + ny * halfW });
          innerLeft.push({ x: p.x + nx * centerHalfW, y: p.y + ny * centerHalfW });
          innerRight.push({ x: p.x - nx * centerHalfW, y: p.y - ny * centerHalfW });
          outerRight.push({ x: p.x - nx * halfW, y: p.y - ny * halfW });
        }
        
        ctx.fillStyle = '#2d3035';
        ctx.beginPath();
        ctx.moveTo(outerLeft[0].x, outerLeft[0].y);
        for(let i=1; i<outerLeft.length; i++) ctx.lineTo(outerLeft[i].x, outerLeft[i].y);
        for(let i=innerLeft.length-1; i>=0; i--) ctx.lineTo(innerLeft[i].x, innerLeft[i].y);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#393c41';
        ctx.beginPath();
        ctx.moveTo(innerLeft[0].x, innerLeft[0].y);
        for(let i=1; i<innerLeft.length; i++) ctx.lineTo(innerLeft[i].x, innerLeft[i].y);
        for(let i=innerRight.length-1; i>=0; i--) ctx.lineTo(innerRight[i].x, innerRight[i].y);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#2d3035';
        ctx.beginPath();
        ctx.moveTo(innerRight[0].x, innerRight[0].y);
        for(let i=1; i<innerRight.length; i++) ctx.lineTo(innerRight[i].x, innerRight[i].y);
        for(let i=outerRight.length-1; i>=0; i--) ctx.lineTo(outerRight[i].x, outerRight[i].y);
        ctx.closePath();
        ctx.fill();
      }
      
      for (let a of anchors) {
        ctx.beginPath();
        ctx.arc(a.x, a.y, 4, 0, Math.PI*2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#fde047';
        ctx.stroke();
      }
      
      if (car.tethered && car.tetherAnchor) {
        ctx.beginPath();
        ctx.moveTo(car.x, car.y);
        ctx.lineTo(car.tetherAnchor.x, car.tetherAnchor.y);
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.angle);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-car.height/2, -car.width/2, car.height, car.width);
      
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(car.height/2 - 5, -car.width/2 + 1, 2, car.width - 2);
      ctx.fillRect(-car.height/2 + 2, -car.width/2 + 1, 1.5, car.width - 2);
      ctx.restore();
      
      ctx.restore();
      
      animId = requestAnimationFrame(draw);
    }
    
    draw();
    return () => cancelAnimationFrame(animId);
  }

  // ── Overlay bouwen ──
  function createOverlay() {
    const overlay = document.getElementById('sg-games-overlay');

    let stopBloobAnim = null;
    let stopWaveAnim = null;
    let stopPongAnim = null;


    const closeBtn = overlay.querySelector('#sg-games-close');
    const backdrop = overlay.querySelector('#sg-games-backdrop');
    
    const playBtnBloob = overlay.querySelector('#sg-play-smartbloob-io');
    const cardBloob = overlay.querySelector('#sg-card-smartbloob-io');
    
    const playBtnWave = overlay.querySelector('#sg-play-smartwave-io');
    const cardWave = overlay.querySelector('#sg-card-smartwave-io');
    
    const playBtnPong = overlay.querySelector('#sg-play-smartpong-io');
    const cardPong = overlay.querySelector('#sg-card-smartpong-io');
    

    

    let currentGlobalName = '';
    let isCheckingName = false;

    function getSmscName() { return window.__cachedSmscName; }

    function showError(msg) {
      const err = overlay.querySelector('#sg-name-error');
      err.textContent = msg;
      err.style.display = 'block';
    }

    function openNameModal(forceRequire = false) {
      overlay.querySelector('#sg-name-error').style.display = 'none';
      const smscName = getSmscName();
      const nameKey = 'sgGlobalName_' + smscName;
      const timeKey = 'sgNameSetTime_' + smscName;

      chrome.storage.local.get([nameKey, timeKey], (data) => {
        if (data[nameKey]) {
          overlay.querySelector('#sg-name-input').value = data[nameKey];
          currentGlobalName = data[nameKey];
        }
        overlay.querySelector('#sg-name-close').style.display = forceRequire ? 'none' : 'inline-block';
        overlay.querySelector('#sg-name-modal-overlay').classList.add('sg-visible');
      });
    }

    function openOverlay() {
      chrome.storage.sync.get({ geminiApiKey: '' }, (items) => {
        overlay.classList.add('sg-visible');
        document.body.style.overflow = 'hidden';

        // if (!items.geminiApiKey) {
        //   overlay.querySelector('#sg-games-list-view').style.display = 'none';
        //   overlay.querySelector('#sg-games-close').style.display = 'none';
        //   overlay.querySelector('#sg-settings-btn').style.display = 'none';
        //   overlay.querySelector('#sg-chat-btn').style.display = 'none';
        //   overlay.querySelector('#sg-apikey-modal-overlay').classList.add('sg-visible');
        //   overlay.querySelector('#sg-apikey-close').style.display = 'none'; // Force require initially
        //   return;
        // } else {
          overlay.querySelector('#sg-games-list-view').style.display = 'block';
          overlay.querySelector('#sg-games-close').style.display = 'flex';
          overlay.querySelector('#sg-settings-btn').style.display = 'flex';
          overlay.querySelector('#sg-chat-btn').style.display = 'flex';
          checkAdminRole(currentGlobalName);
        // }

        setTimeout(() => {
          // Bloob anim
          const canvasBloob = overlay.querySelector('#sg-preview-SmartBuddy-io');
          if (canvasBloob && !stopBloobAnim) stopBloobAnim = animatePreview(canvasBloob);
          
          // Wave anim
          const canvasWave = overlay.querySelector('#sg-preview-smartwave-io');
          if (canvasWave && !stopWaveAnim) stopWaveAnim = animateWavePreview(canvasWave);

          // Pong anim
          const canvasPong = overlay.querySelector('#sg-preview-smartpong-io');
          if (canvasPong && !stopPongAnim) stopPongAnim = animatePongPreview(canvasPong);


        }, 50);

        const smscName = getSmscName();
        const nameKey = 'sgGlobalName_' + smscName;

        chrome.storage.local.get([nameKey], (data) => {
          if (!data[nameKey]) {
            isCheckingName = true;
            chrome.runtime.sendMessage({ action: 'checkSmscName', smscName: smscName }, (response) => {
              isCheckingName = false;
              if (response && response.success && response.data && response.data.username) {
                const recoveredName = response.data.username;
                const recoveredTime = response.data.lastChanged || Date.now();
                const timeKey = 'sgNameSetTime_' + smscName;
                const toSave = {};
                toSave[nameKey] = recoveredName;
                toSave[timeKey] = recoveredTime;
                chrome.storage.local.set(toSave, () => {
                  currentGlobalName = recoveredName;
                  checkAdminRole(currentGlobalName);
                  fetchModerationUI(currentGlobalName);
                  fetchGlobalStatusUI();
                });
              } else {
                currentGlobalName = '';
                openNameModal(true);
              }
            });
          } else {
            isCheckingName = false;
            currentGlobalName = data[nameKey];
            checkAdminRole(currentGlobalName);
            fetchModerationUI(currentGlobalName);
            fetchGlobalStatusUI();
          }
        });
      });
    }

    function showGlobalModModal(title, text, isNameRemoved, iconType = 'block') {
        const existing = document.getElementById('sg-global-mod-modal');
        if (existing) existing.remove();
        
        let svgIcon = '';
        let iconColor = '#ef4444';
        
        if (iconType === 'warning') {
            iconColor = '#f97316';
            svgIcon = `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>`;
        } else {
            svgIcon = `<circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>`;
        }

        const modal = document.createElement('div');
        modal.id = 'sg-global-mod-modal';
        modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); backdrop-filter:blur(8px); z-index:999999; display:flex; align-items:center; justify-content:center;';
        modal.innerHTML = `
            <div style="background: #ffffff; padding:40px; border-radius:24px; max-width:400px; text-align:center; box-shadow:0 20px 40px rgba(0,0,0,0.2);">
                <div style="color:${iconColor}; margin-bottom:16px;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        ${svgIcon}
                    </svg>
                </div>
                <h2 style="margin:0 0 12px 0; font-size:24px; color: #1a1a1a; font-family:system-ui, -apple-system, sans-serif; font-weight:800; letter-spacing:-0.02em;">${title}</h2>
                <p style="margin:0 0 24px 0; color:#4b5563; line-height:1.5; font-family:system-ui, -apple-system, sans-serif; font-size:15px;">${text}</p>
                ${isNameRemoved 
                    ? '<button id="sg-mod-ok-btn" style="background:#FF520E; color: #ffffff; border:none; padding:12px 24px; border-radius:12px; font-weight:600; cursor:pointer; width:100%; font-size:15px;">Nieuwe Naam Kiezen</button>' 
                    : '<button id="sg-mod-ok-btn" style="background:#f3f4f6; color:#374151; border:none; padding:12px 24px; border-radius:12px; font-weight:600; cursor:pointer; width:100%; font-size:15px;">Sluiten</button>'}
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('#sg-mod-ok-btn').addEventListener('click', () => {
            modal.remove();
            if (isNameRemoved) {
                openNameModal(true);
            } else {
                closeOverlay();
            }
        });
    }

    function applyCardBlock(cardId, message) {
        const card = overlay.querySelector('#' + cardId);
        if (!card) return;
        let blockOverlay = card.querySelector('.sg-mod-block-overlay');
        if (!blockOverlay) {
            blockOverlay = document.createElement('div');
            blockOverlay.className = 'sg-mod-block-overlay';
            blockOverlay.style.cssText = 'position:absolute; inset:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(4px); z-index:10; display:flex; flex-direction:column; align-items:center; justify-content:center; color: #ffffff; text-align:center; padding:20px; border-radius:24px; cursor:not-allowed;';
            card.style.position = 'relative';
            card.appendChild(blockOverlay);
            blockOverlay.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        blockOverlay.innerHTML = `<svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:12px; color:#f97316;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg><strong style="font-size:18px; margin-bottom:4px; font-family:system-ui, -apple-system, sans-serif;">Beperkt Toegankelijk</strong><div style="font-size:13px; opacity:0.9; font-family:system-ui, -apple-system, sans-serif;">${message}</div>`;
    }

    function applyChatBlock(message) {
        const btn = overlay.querySelector('#sg-chat-btn');
        if (!btn) return;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
        btn.dataset.modBlocked = message;
    }

    async function fetchModerationUI(username) {
        if (!username) return;
        try {
            const res = await fetch(`https://smartgrid-510f5-default-rtdb.europe-west1.firebasedatabase.app/games/shared/moderation/${encodeURIComponent(username)}.json`);
            const modData = await res.json();
            if (!modData) return;

            if (modData.forceRename) {
                const smscName = getSmscName();
                chrome.storage.local.remove(['sgGlobalName_' + smscName, 'sgNameSetTime_' + smscName], () => {
                    fetch(`https://smartgrid-510f5-default-rtdb.europe-west1.firebasedatabase.app/games/shared/moderation/${encodeURIComponent(username)}/forceRename.json`, {method: 'DELETE'});
                    currentGlobalName = '';
                    showGlobalModModal(
                        "Naam Verwijderd", 
                        "Je gekozen naam is verwijderd door een moderator wegens een overtreding of ongepast taalgebruik.<br><br>Je moet een nieuwe, gepaste naam kiezen om weer te kunnen spelen.", 
                        true
                    );
                });
                return;
            }

            if (modData.banned) {
                const reason = typeof modData.banned === 'object' && modData.banned.reason ? modData.banned.reason : 'Geen reden opgegeven';
                showGlobalModModal(
                    "Verbannen", 
                    `Je bent permanent verbannen van SmartBuddy Games.<br><br><strong style="color:#ef4444;">Reden:</strong> ${reason}`, 
                    false
                );
                return;
            }

            if (modData.timeouts) {
                const now = Date.now();
                if (modData.timeouts.all && modData.timeouts.all > now) {
                    const timeStr = new Date(modData.timeouts.all).toLocaleString();
                    applyCardBlock('sg-card-smartbloob-io', `Geldig tot:<br>${timeStr}`);
                    applyCardBlock('sg-card-smartwave-io', `Geldig tot:<br>${timeStr}`);
                    applyCardBlock('sg-card-smartpong-io', `Geldig tot:<br>${timeStr}`);
                    applyChatBlock(`Timeout tot ${timeStr}`);
                } else {
                    if (modData.timeouts['SmartBloob-io'] && modData.timeouts['SmartBloob-io'] > now) {
                        applyCardBlock('sg-card-smartbloob-io', `Geldig tot:<br>${new Date(modData.timeouts['SmartBloob-io']).toLocaleString()}`);
                    }
                    if (modData.timeouts['smartwave-io'] && modData.timeouts['smartwave-io'] > now) {
                        applyCardBlock('sg-card-smartwave-io', `Geldig tot:<br>${new Date(modData.timeouts['smartwave-io']).toLocaleString()}`);
                    }
                    if (modData.timeouts['smartpong-io'] && modData.timeouts['smartpong-io'] > now) {
                        applyCardBlock('sg-card-smartpong-io', `Geldig tot:<br>${new Date(modData.timeouts['smartpong-io']).toLocaleString()}`);
                    }
                    if (modData.timeouts['chat'] && modData.timeouts['chat'] > now) {
                        applyChatBlock(`Timeout tot ${new Date(modData.timeouts['chat']).toLocaleString()}`);
                    }
                }
            }
        } catch(e) {
            console.error("Moderation UI fetch failed", e);
        }
    }

    let openModOverlayFn = null;
    function createModOverlay() {
        const modOverlay = document.createElement('div');
        modOverlay.id = 'sg-mod-menu-overlay';
        modOverlay.innerHTML = `
          <div id="sg-mod-backdrop" style="position: absolute; inset: 0; background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); transition: all 0.3s ease;"></div>
          <div id="sg-mod-content" style="position: relative; width: 100%; max-width: 1000px; height: 85vh; background: #ffffff; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); display: flex; flex-direction: column; overflow: hidden; transform: scale(0.95); transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
            
            <div style="padding: 32px 40px; border-bottom: 1px solid rgba(0,0,0,0.08); display: flex; justify-content: space-between; align-items: center; background: #fdfdfd;">
                <div>
                    <div style="font-size: 28px; font-weight: 800; letter-spacing: -0.02em; color: #1a1a1a;">Mod Menu</div>
                    <div style="color: rgba(0,0,0,0.5); font-size: 14px; margin-top: 4px;">Beheer Smartschool modules en spelers</div>
                </div>
                <div style="display: flex; gap: 16px; align-items: center;">
                    <div class="sg-mod-tabs" style="display: flex; background: rgba(0,0,0,0.04); padding: 4px; border-radius: 12px;">
                        <button class="sg-mod-tab active" data-tab="features" style="padding: 8px 16px; border: none; background: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-radius: 8px; font-weight: 600; font-size: 14px; color: #1a1a1a; cursor: pointer; transition: all 0.2s;">Functies</button>
                        <button class="sg-mod-tab" data-tab="players" style="padding: 8px 16px; border: none; background: transparent; border-radius: 8px; font-weight: 600; font-size: 14px; color: rgba(0,0,0,0.5); cursor: pointer; transition: all 0.2s;">Spelers & Rollen</button>
                    </div>
                    <button id="sg-mod-close" style="width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.1); background: #ffffff; color: #1a1a1a; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;"><path d="M18 6L6 18M6 6L18 18"></path></svg>
                    </button>
                </div>
            </div>

            <style>
                #sg-mod-menu-overlay .sg-mod-card {
                    background: #ffffff;
                    border-radius: 16px;
                    border: 1px solid rgba(0,0,0,0.08);
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    transition: all 0.2s;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.02);
                }
                #sg-mod-menu-overlay .sg-mod-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(0,0,0,0.06);
                    border-color: rgba(255, 82, 14, 0.2);
                }
                #sg-mod-menu-overlay .sg-mod-btn {
                    width: 100%;
                    padding: 12px;
                    border-radius: 10px;
                    border: none;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                #sg-mod-menu-overlay .sg-mod-btn.off {
                    background: rgba(0,0,0,0.04);
                    color: #1a1a1a;
                }
                #sg-mod-menu-overlay .sg-mod-btn.off:hover {
                    background: rgba(0,0,0,0.08);
                }
                #sg-mod-menu-overlay .sg-mod-btn.on {
                    background: #FF520E;
                    color: #ffffff;
                    box-shadow: 0 4px 12px rgba(255, 82, 14, 0.2);
                }
                #sg-mod-menu-overlay .sg-mod-btn.on:hover {
                    background: #e0480c;
                }
                #sg-mod-menu-overlay .sg-svg-orange {
                    color: #FF520E;
                }
            </style>
            
            <div id="sg-tab-features" style="padding: 40px; overflow-y: auto; flex: 1;">
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
                    <!-- Game Selector -->
                    <div class="sg-mod-card">
                        <div style="font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px;">Game Selector</div>
                        <div style="font-size: 13px; color: rgba(0,0,0,0.5); margin-bottom: 20px; flex-grow: 1;">Verberg de spellen in het SmartBuddy scherm.</div>
                        <button class="sg-mod-btn off" id="sg-mod-toggle-games">Laden...</button>
                    </div>
                    <!-- BetterResults Grid -->
                    <div class="sg-mod-card">
                        <div style="font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px;">BetterResults Grid</div>
                        <div style="font-size: 13px; color: rgba(0,0,0,0.5); margin-bottom: 20px; flex-grow: 1;">Schakelt de verbeterde puntenweergave uit.</div>
                        <button class="sg-mod-btn off" id="sg-mod-toggle-grid">Laden...</button>
                    </div>
                    <!-- SmartBloob.io -->
                    <div class="sg-mod-card">
                        <div style="font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px;">SmartBloob.io</div>
                        <div style="font-size: 13px; color: rgba(0,0,0,0.5); margin-bottom: 20px; flex-grow: 1;">Schakel de game SmartBloob in of uit.</div>
                        <button class="sg-mod-btn off" id="sg-mod-toggle-bloob">Laden...</button>
                    </div>
                    <!-- SmartWave.io -->
                    <div class="sg-mod-card">
                        <div style="font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px;">SmartWave.io</div>
                        <div style="font-size: 13px; color: rgba(0,0,0,0.5); margin-bottom: 20px; flex-grow: 1;">Schakel de game SmartWave in of uit.</div>
                        <button class="sg-mod-btn off" id="sg-mod-toggle-wave">Laden...</button>
                    </div>
                    <!-- SmartPong.io -->
                    <div class="sg-mod-card">
                        <div style="font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px;">SmartPong.io</div>
                        <div style="font-size: 13px; color: rgba(0,0,0,0.5); margin-bottom: 20px; flex-grow: 1;">Schakel de game SmartPong in of uit.</div>
                        <button class="sg-mod-btn off" id="sg-mod-toggle-pong">Laden...</button>
                    </div>

                    <!-- Chat -->
                    <div class="sg-mod-card">
                        <div style="font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px;">SmartBuddy Chat</div>
                        <div style="font-size: 13px; color: rgba(0,0,0,0.5); margin-bottom: 20px; flex-grow: 1;">Schakel de AI Chatbox in of uit.</div>
                        <button class="sg-mod-btn off" id="sg-mod-toggle-chat">Laden...</button>
                    </div>
                </div>
            </div>

            <div id="sg-tab-players" style="display: none; flex: 1; overflow: hidden; background: #f5f5f5;">
                <iframe id="sg-mod-iframe" src="" style="width: 100%; height: 100%; border: none; border-radius: 0 0 24px 24px;"></iframe>
            </div>

          </div>
        `;
        modOverlay.style.cssText = 'position: fixed; inset: 0; z-index: 9999999; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; font-family: system-ui, -apple-system, sans-serif;';
        document.body.appendChild(modOverlay);

        const contentBox = modOverlay.querySelector('#sg-mod-content');
        const tabFeatures = modOverlay.querySelector('#sg-tab-features');
        const tabPlayers = modOverlay.querySelector('#sg-tab-players');
        const iframe = modOverlay.querySelector('#sg-mod-iframe');
        
        const tabs = modOverlay.querySelectorAll('.sg-mod-tab');
        tabs.forEach(t => {
            t.onclick = () => {
                tabs.forEach(btn => {
                    btn.classList.remove('active');
                    btn.style.background = 'transparent';
                    btn.style.color = 'rgba(0,0,0,0.5)';
                    btn.style.boxShadow = 'none';
                });
                t.classList.add('active');
                t.style.background = '#ffffff';
                t.style.color = '#1a1a1a';
                t.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';

                if (t.dataset.tab === 'features') {
                    tabFeatures.style.display = 'block';
                    tabPlayers.style.display = 'none';
                } else {
                    tabFeatures.style.display = 'none';
                    tabPlayers.style.display = 'block';
                    if (!iframe.getAttribute('src')) {
                        iframe.src = chrome.runtime.getURL('pages/moderation.html?player_name=' + encodeURIComponent(currentGlobalName));
                    }
                }
            };
        });

        modOverlay.querySelector('#sg-mod-close').onclick = () => {
            modOverlay.style.opacity = '0';
            contentBox.style.transform = 'scale(0.95)';
            setTimeout(() => { modOverlay.style.pointerEvents = 'none'; }, 300);
        };

        const btnGrid = modOverlay.querySelector('#sg-mod-toggle-grid');
        const btnGames = modOverlay.querySelector('#sg-mod-toggle-games');
        const btnBloob = modOverlay.querySelector('#sg-mod-toggle-bloob');
        const btnWave = modOverlay.querySelector('#sg-mod-toggle-wave');
        const btnPong = modOverlay.querySelector('#sg-mod-toggle-pong');

        const btnChat = modOverlay.querySelector('#sg-mod-toggle-chat');

        const toggleFeature = async (key, btnEl) => {
            btnEl.style.opacity = '0.5';
            btnEl.style.pointerEvents = 'none';
            try {
                const res = await fetch('https://smartgrid-510f5-default-rtdb.europe-west1.firebasedatabase.app/games/shared/status.json');
                const data = await res.json();
                const current = data && data[key] ? true : false;
                await fetch('https://smartgrid-510f5-default-rtdb.europe-west1.firebasedatabase.app/games/shared/status.json', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ [key]: !current })
                });
                fetchModStatus();
                fetchGlobalStatusUI();
            } catch(e) { console.error(e); }
            btnEl.style.opacity = '1';
            btnEl.style.pointerEvents = 'auto';
        };

        btnGrid.onclick = () => toggleFeature('grid_disabled', btnGrid);
        btnGames.onclick = () => toggleFeature('gameselector_disabled', btnGames);
        btnBloob.onclick = () => toggleFeature('smartbloob-io_disabled', btnBloob);
        btnWave.onclick = () => toggleFeature('smartwave-io_disabled', btnWave);
        btnPong.onclick = () => toggleFeature('smartpong-io_disabled', btnPong);

        btnChat.onclick = () => toggleFeature('chat_disabled', btnChat);

        function updateBtnState(btn, isDisabled) {
            if (isDisabled) {
                btn.className = 'sg-mod-btn on';
                btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><path d="M20 6L9 17l-5-5"></path></svg> Ingeschakeld';
            } else {
                btn.className = 'sg-mod-btn off';
                btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" class="sg-svg-orange" style="width:16px;height:16px;"><path d="M8 5V19L19 12L8 5Z"></path></svg> Uitschakelen';
            }
        }

        function fetchModStatus() {
            fetch('https://smartgrid-510f5-default-rtdb.europe-west1.firebasedatabase.app/games/shared/status.json')
                .then(r => r.json())
                .then(data => {
                    updateBtnState(btnGrid, data && data.grid_disabled);
                    updateBtnState(btnGames, data && data.gameselector_disabled);
                    updateBtnState(btnBloob, data && data['smartbloob-io_disabled']);
                    updateBtnState(btnWave, data && data['smartwave-io_disabled']);
                    updateBtnState(btnPong, data && data['smartpong-io_disabled']);

                    updateBtnState(btnChat, data && data.chat_disabled);
                });
        }

        openModOverlayFn = () => {
            modOverlay.style.opacity = '1';
            contentBox.style.transform = 'scale(1)';
            modOverlay.style.pointerEvents = 'auto';
            fetchModStatus();
        };
    }

    async function fetchGlobalStatusUI() {
        try {
            const res = await fetch('https://smartgrid-510f5-default-rtdb.europe-west1.firebasedatabase.app/games/shared/status.json');
            let statusData = await res.json();
            if (!statusData) statusData = {};

            const TEST_HOLIDAY_MODE = false; // ZET OP FALSE NA HET TESTEN!

            const currentDate = new Date();
            const month = currentDate.getMonth();
            const isHoliday = month === 6 || month === 7 || TEST_HOLIDAY_MODE;

            // In de zomervakantie forceren we alles op disabled
            if (isHoliday) {
                statusData.gameselector_disabled = true;
                statusData.chat_disabled = true;
                statusData['smartbloob-io_disabled'] = true;
                statusData['smartwave-io_disabled'] = true;
                statusData['smartpong-io_disabled'] = true;
            }

            if (statusData['smartbloob-io_disabled']) applyCardBlock('sg-card-smartbloob-io', isHoliday ? 'Vakantie' : 'Tijdelijk offline<br>(Glitch/Onderhoud)');
            if (statusData['smartwave-io_disabled']) applyCardBlock('sg-card-smartwave-io', isHoliday ? 'Vakantie' : 'Tijdelijk offline<br>(Glitch/Onderhoud)');
            if (statusData['smartpong-io_disabled']) applyCardBlock('sg-card-smartpong-io', isHoliday ? 'Vakantie' : 'Tijdelijk offline<br>(Glitch/Onderhoud)');

            if (statusData.chat_disabled) applyChatBlock(isHoliday ? 'Vakantie' : 'Offline (Onderhoud)');
            
            if (statusData.gameselector_disabled) {
                const container = document.querySelector('#sg-games-content');
                if (container) {
                    let blockOverlay = container.querySelector('.sg-gameselector-block-overlay');
                    if (!blockOverlay) {
                        blockOverlay = document.createElement('div');
                        blockOverlay.className = 'sg-gameselector-block-overlay';
                        blockOverlay.style.cssText = 'position: absolute; inset: 0; background: rgba(0,0,0,0.8); z-index: 9999999; display: flex; align-items: center; justify-content: center; color: #ffffff; font-family: system-ui, -apple-system, sans-serif; font-size: 24px; font-weight: bold; border-radius: inherit; flex-direction: column; text-align: center; cursor: not-allowed; pointer-events: all; backdrop-filter: blur(8px);';
                        
                        if (isHoliday) {
                            blockOverlay.innerHTML = '<div style="font-size: 48px; margin-bottom: 20px; animation: bounce 2s infinite;">🏖️</div><div style="font-size: 32px;">Zomervakantie!</div>';
                        } else {
                            blockOverlay.innerHTML = '<svg style="width:48px;height:48px;margin-bottom:16px;color:#eab308" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4m0 4h.01"></path></svg><div>Game Selector is momenteel uitgeschakeld</div><div style="font-size: 14px; opacity: 0.7; font-weight: normal; margin-top: 8px;">Wegens onderhoud of een glitch</div>';
                        }
                        container.style.position = 'relative';
                        container.style.overflow = 'hidden';
                        container.appendChild(blockOverlay);
                    }
                }
            } else {
                const container = document.querySelector('#sg-games-content');
                if (container) {
                    const blockOverlay = container.querySelector('.sg-gameselector-block-overlay');
                    if (blockOverlay) {
                        blockOverlay.remove();
                        container.style.overflow = '';
                    }
                }
            }
        } catch(e) {
            console.error("Global status fetch failed", e);
        }
    }
    
    function checkAdminRole(username) {
        Promise.all([
            fetch('https://smartgrid-510f5-default-rtdb.europe-west1.firebasedatabase.app/games/shared/roles.json').then(r => r.json()),
            fetch('https://smartgrid-510f5-default-rtdb.europe-west1.firebasedatabase.app/games/shared/userRoles.json').then(r => r.json())
        ]).then(([roles, userRoles]) => {
            let canModGames = false;
            let canModChat = false;
            
            if (roles && userRoles && userRoles[username] && roles[userRoles[username]]) {
                canModGames = roles[userRoles[username]].canModGames;
                canModChat = roles[userRoles[username]].canModChat;
            } else if (roles) {
                if (roles.OWNER && Array.isArray(roles.OWNER) && roles.OWNER.includes(username)) { canModGames = true; canModChat = true; }
                if (roles.CO_OWNER && Array.isArray(roles.CO_OWNER) && roles.CO_OWNER.includes(username)) { canModGames = true; canModChat = true; }
                if (roles.ADMIN && Array.isArray(roles.ADMIN) && roles.ADMIN.includes(username)) { canModGames = true; canModChat = true; }
                if (roles.MOD && Array.isArray(roles.MOD) && roles.MOD.includes(username)) { canModGames = false; canModChat = true; }
            }
            
            const isAdmin = canModGames || canModChat;
            
            const modBtn = document.querySelector('#sg-mod-btn');
            if (isAdmin) {
                if (!openModOverlayFn) createModOverlay();
                if (modBtn) {
                    modBtn.dataset.isAdmin = 'true';
                    modBtn.style.display = 'flex';
                    modBtn.onclick = () => {
                        if (openModOverlayFn) openModOverlayFn();
                    };
                }
            }
        }).catch(console.error);
    }

    function closeOverlay() {
      overlay.classList.remove('sg-visible');
      document.body.style.overflow = '';
      if (stopBloobAnim) { stopBloobAnim(); stopBloobAnim = null; }
      if (stopWaveAnim) { stopWaveAnim(); stopWaveAnim = null; }
      if (stopPongAnim) { stopPongAnim(); stopPongAnim = null; }

      
      setTimeout(() => {
          const listView = overlay.querySelector('#sg-games-list-view');
          const chatView = overlay.querySelector('#sg-games-chat-view');
          if (chatView && chatView.style.display !== 'none') {
              chatView.style.display = 'none';
              chatView.style.opacity = '0';
              listView.style.display = 'block';
              listView.style.opacity = '1';
              
              const contentBox = overlay.querySelector('#sg-games-content');
              if (contentBox) contentBox.style.padding = '';
              const closeBtn = overlay.querySelector('#sg-games-close');
              if (closeBtn) closeBtn.style.display = '';
              const setBtn = overlay.querySelector('#sg-settings-btn');
              if (setBtn) setBtn.style.display = '';
              const chBtn = overlay.querySelector('#sg-chat-btn');
              if (chBtn) chBtn.style.display = '';
          }
      }, 400);
    }

    // ── Fullscreen Game Iframe ──
    let gameIframeOverlay = null;
    
    async function checkModerationStatus(gameId) {
        try {
            const statusRes = await fetch('https://smartgrid-510f5-default-rtdb.europe-west1.firebasedatabase.app/games/shared/status.json');
            const statusData = await statusRes.json();
            if (statusData) {
                if (gameId === 'chat' && statusData.chat_disabled) return false;
                const normalizedId = gameId.toLowerCase();
                if (statusData[normalizedId + '_disabled']) return false;
            }

            const res = await fetch(`https://smartgrid-510f5-default-rtdb.europe-west1.firebasedatabase.app/games/shared/moderation/${encodeURIComponent(currentGlobalName)}.json`);
            const modData = await res.json();
            if (!modData) return true; // Allowed
            
            if (modData.forceRename) {
                return false;
            }

            if (modData.banned) {
                return false;
            }
            
            if (modData.timeouts) {
                const now = Date.now();
                if (modData.timeouts.all && modData.timeouts.all > now) {
                    return false;
                }
                if (modData.timeouts[gameId] && modData.timeouts[gameId] > now) {
                    return false;
                }
            }
            return true;
        } catch(e) {
            console.error("Moderation check failed", e);
            return true;
        }
    }

    async function openGame(gameUrl, title, gameId) {
      if (isCheckingName) {
        showError('Profiel wordt gesynchroniseerd...');
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 100));
          if (!isCheckingName) break;
        }
      }
      
      if (!currentGlobalName) {
        openNameModal(true);
        showError('Je moet eerst een naam kiezen voordat je kan spelen!');
        return;
      }
      const allowed = await checkModerationStatus(gameId);
      if (!allowed) {
          showGlobalModModal('Game Uitgeschakeld', 'Deze game is momenteel niet speelbaar.', false, 'warning');
          return;
      }

      closeOverlay();

      const urlObj = new URL(gameUrl, window.location.href);
      urlObj.searchParams.set('player_name', currentGlobalName);
      
      const smscName = getSmscName();
      urlObj.searchParams.set('smsc_name', smscName);
      
      const finalUrl = urlObj.toString();

      if (gameIframeOverlay && gameIframeOverlay.dataset.gameUrl === finalUrl) {
        gameIframeOverlay.classList.add('sg-active');
        document.body.style.overflow = 'hidden';
        return;
      }
      
      if (gameIframeOverlay) {
        gameIframeOverlay.remove();
        gameIframeOverlay = null;
      }

      gameIframeOverlay = document.createElement('div');
      gameIframeOverlay.id = 'sg-game-iframe-overlay';
      gameIframeOverlay.dataset.gameUrl = gameUrl;
      
      const isChat = title === 'SmartBuddy Chat';
      const topbarStyle = isChat ? 'display: none;' : '';
      
      gameIframeOverlay.innerHTML = `
        <div id="sg-game-iframe-topbar" style="${topbarStyle}">
          <div id="sg-game-iframe-title">
            <span class="sg-dot"></span>
            ${title}
          </div>
          <button id="sg-game-iframe-close">
            <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12"></path></svg>
            Sluiten
          </button>
        </div>
        <iframe id="sg-game-iframe-frame" src="${finalUrl}" allow="autoplay; fullscreen"></iframe>
      `;
      document.body.appendChild(gameIframeOverlay);

      gameIframeOverlay.offsetHeight;
      gameIframeOverlay.classList.add('sg-active');
      document.body.style.overflow = 'hidden';

      gameIframeOverlay.querySelector('#sg-game-iframe-close').addEventListener('click', closeGame);
    }

    function closeGame() {
      if (!gameIframeOverlay) return;
      gameIframeOverlay.classList.remove('sg-active');
      document.body.style.overflow = '';
      setTimeout(() => {
        if (gameIframeOverlay && !gameIframeOverlay.classList.contains('sg-active')) {
          gameIframeOverlay.remove();
          gameIframeOverlay = null;
        }
      }, 300);
    }
    
    window.addEventListener('message', (event) => {
        if (event.data === 'openSmartBuddySettings') {
            openNameModal(false);
        } else if (event.data === 'closeSmartBuddyChat') {
            const chatView = document.querySelector('#sg-games-chat-view');
            const listView = document.querySelector('#sg-games-list-view');
            if (chatView && chatView.style.display !== 'none') {
                chatView.style.opacity = '0';
                setTimeout(() => {
                    chatView.style.display = 'none';
                    listView.style.display = 'block';
                    
                    const contentBox = document.querySelector('#sg-games-content');
                    if (contentBox) contentBox.style.padding = '';
                    const closeBtn = document.querySelector('#sg-games-close');
                    if (closeBtn) closeBtn.style.display = '';
                    const setBtn = document.querySelector('#sg-settings-btn');
                    if (setBtn) setBtn.style.display = '';
                    const chBtn = document.querySelector('#sg-chat-btn');
                    if (chBtn) chBtn.style.display = '';

                    setTimeout(() => {
                        listView.style.opacity = '1';
                    }, 50);
                }, 300);
            } else {
                closeGame();
            }
        }
    });

    overlay.querySelector('#sg-apikey-save').addEventListener('click', async () => {
      const val = overlay.querySelector('#sg-apikey-input').value.trim();
      const err = overlay.querySelector('#sg-apikey-error');
      
      if (!val) {
        err.textContent = 'Vul aub een API sleutel in.';
        err.style.display = 'block';
        return;
      }
      
      err.style.display = 'none';
      const saveBtn = overlay.querySelector('#sg-apikey-save');
      const oldText = saveBtn.textContent;
      saveBtn.textContent = 'Bezig met opslaan...';
      saveBtn.disabled = true;

      chrome.runtime.sendMessage({ action: 'testGeminiKey', key: val }, (res) => {
          if (res && res.success) {
              chrome.storage.sync.set({ geminiApiKey: val }, () => {
                saveBtn.textContent = oldText;
                saveBtn.disabled = false;
                overlay.querySelector('#sg-apikey-modal-overlay').classList.remove('sg-visible');
                overlay.classList.remove('sg-visible');
                document.body.style.overflow = '';
                
                const toast = document.getElementById('sg-apikey-reminder');
                if (toast) toast.remove();
                
                setTimeout(() => { openOverlay(); }, 100);
              });
          } else {
              saveBtn.textContent = oldText;
              saveBtn.disabled = false;
              err.textContent = 'Dit is geen geldige Gemini API sleutel.';
              err.style.display = 'block';
          }
      });
    });

    overlay.querySelector('#sg-name-close').addEventListener('click', () => {
      overlay.querySelector('#sg-name-modal-overlay').classList.remove('sg-visible');
    });

    overlay.querySelector('#sg-name-save').addEventListener('click', async () => {
      const val = overlay.querySelector('#sg-name-input').value.trim();
      if (!val) {
        showError('Vul een geldige naam in.');
        return;
      }
      if (val.length > 20) {
        showError('Naam mag maximaal 20 tekens zijn.');
        return;
      }

      const saveBtn = overlay.querySelector('#sg-name-save');
      const oldText = saveBtn.textContent;
      saveBtn.textContent = 'Bezig met checken...';
      saveBtn.disabled = true;

      const continueSave = async (isBad, reason) => {
          if (isBad) {
              saveBtn.textContent = oldText;
              saveBtn.disabled = false;
              if (reason) {
                  showError(`Je naam is geweigerd: ${reason}`);
              } else {
                  showError('Je naam is geweigerd wegens ongepast taalgebruik.');
              }
              return;
          }

          const smscName = getSmscName();
          const nameKey = 'sgGlobalName_' + smscName;
          const timeKey = 'sgNameSetTime_' + smscName;

          chrome.runtime.sendMessage({ action: 'checkSmscName', smscName: smscName }, (smscResponse) => {
            let lastChanged = 0;
            let oldUsername = null;
            
            if (smscResponse && smscResponse.success && smscResponse.data) {
              lastChanged = smscResponse.data.lastChanged || 0;
              oldUsername = smscResponse.data.username;
            }

            const now = Date.now();
            if (oldUsername && oldUsername !== val) {
              const daysPassed = (now - lastChanged) / (1000 * 60 * 60 * 24);
              if (daysPassed < 30) {
                saveBtn.textContent = oldText;
                saveBtn.disabled = false;
                const daysLeft = Math.ceil(30 - daysPassed);
                showError(`Je kunt je naam pas over ${daysLeft} dagen weer wijzigen!`);
                return;
              }
            }

            chrome.runtime.sendMessage({ action: 'checkUsername', username: val }, (response) => {
              saveBtn.textContent = oldText;
              saveBtn.disabled = false;
              
              if (response && response.success) {
                const fbData = response.data;
                if (fbData && fbData.error) {
                  console.warn("Firebase check error:", fbData.error);
                } else if (fbData && fbData.smscName && fbData.smscName !== smscName) {
                  showError('Deze naam is al in gebruik door iemand anders!');
                  return;
                }
              }

              chrome.runtime.sendMessage({ action: 'reserveUsername', username: val, smscName: smscName, oldUsername: oldUsername }, (resRes) => {
                const finalTime = (resRes && resRes.lastChanged) ? resRes.lastChanged : now;
                const toSave = {};
                toSave[nameKey] = val;
                if (!oldUsername || oldUsername !== val) {
                  toSave[timeKey] = finalTime;
                } else {
                  toSave[timeKey] = lastChanged || finalTime;
                }

                chrome.storage.local.set(toSave, () => {
                  currentGlobalName = val;
                  overlay.querySelector('#sg-name-modal-overlay').classList.remove('sg-visible');
                });
              });
            });
          });
      };

      let isBad = false;
      let blockReason = '';
      let apiError = '';
      try {
          const aiResponse = await new Promise(resolve => {
              chrome.runtime.sendMessage({ action: 'checkBadWords', text: '', name: val }, resolve);
          });
          if (aiResponse) {
              if (aiResponse.success) {
                  if (aiResponse.isBad) {
                      isBad = true;
                      if (aiResponse.reason) blockReason = aiResponse.reason;
                  }
              } else {
                  apiError = aiResponse.error || 'Er ging iets mis bij de AI controle.';
              }
          } else {
              apiError = 'Geen antwoord van de extensie.';
          }
      } catch (aiErr) {
          console.warn('AI check mislukt:', aiErr);
          apiError = 'De AI verbinding is mislukt. Probeer het opnieuw.';
      }
      
      if (apiError) {
          showError(`De veiligheidscontrole kon niet worden uitgevoerd: ${apiError}`);
          saveBtn.disabled = false;
          saveBtn.textContent = 'Opslaan';
          return;
      }
      
      continueSave(isBad, blockReason);
      
    });

    overlay.querySelector('#sg-settings-btn').addEventListener('click', () => {
      openNameModal(false);
    });

    overlay.querySelector('#sg-chat-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      
      const btn = overlay.querySelector('#sg-chat-btn');
      if (btn && btn.dataset.modBlocked) {
          alert(btn.dataset.modBlocked);
          return;
      }
      
      if (isCheckingName) {
        showError('Profiel wordt gesynchroniseerd...');
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 100));
          if (!isCheckingName) break;
        }
      }
      
      if (!currentGlobalName) {
        openNameModal(true);
        showError('Je moet eerst een naam kiezen voordat je kan chatten!');
        return;
      }
      
      const allowed = await checkModerationStatus('chat');
      if (!allowed) {
          showGlobalModModal('Chat Uitgeschakeld', 'De chat is momenteel uitgeschakeld.', false, 'warning');
          return;
      }
      
      const listView = overlay.querySelector('#sg-games-list-view');
      const chatView = overlay.querySelector('#sg-games-chat-view');
      const contentBox = overlay.querySelector('#sg-games-content');
      const closeBtn = overlay.querySelector('#sg-games-close');
      const setBtn = overlay.querySelector('#sg-settings-btn');
      const chBtn = overlay.querySelector('#sg-chat-btn');

      if (chatView && chatView.style.display === 'block') {
          chatView.style.opacity = '0';
          setTimeout(() => {
              chatView.style.display = 'none';
              listView.style.display = 'block';
              
              if (contentBox) contentBox.style.padding = '';
              if (closeBtn) closeBtn.style.display = '';
              if (setBtn) setBtn.style.display = '';
              if (chBtn) chBtn.style.display = '';

              setTimeout(() => {
                  listView.style.opacity = '1';
              }, 50);
          }, 300);
          return;
      }

      const iframe = overlay.querySelector('#sg-chat-inline-iframe');

      listView.style.opacity = '0';
      setTimeout(() => {
          listView.style.display = 'none';
          chatView.style.display = 'block';
          
          if (contentBox) contentBox.style.padding = '0';
          if (closeBtn) closeBtn.style.display = 'none';
          if (setBtn) setBtn.style.display = 'none';
          if (chBtn) chBtn.style.display = 'none';
          
          if (!iframe.src || iframe.src === window.location.href || iframe.src === 'about:blank') {
              const urlObj = new URL('pages/smartchat.html', window.location.href);
              urlObj.searchParams.set('player_name', currentGlobalName);
              urlObj.searchParams.set('smsc_name', getSmscName());
              iframe.src = urlObj.toString();
          }

          setTimeout(() => {
              chatView.style.opacity = '1';
          }, 50);
      }, 300);
    });

    closeBtn.addEventListener('click', closeOverlay);
    backdrop.addEventListener('click', closeOverlay);
    
    playBtnBloob.addEventListener('click', (e) => { e.stopPropagation(); openGame('games/smartbloob-io.html', 'SmartBloob.io', 'SmartBloob-io'); });
    cardBloob.addEventListener('click', () => openGame('games/smartbloob-io.html', 'SmartBloob.io', 'SmartBloob-io'));
    
    playBtnWave.addEventListener('click', (e) => { e.stopPropagation(); openGame('games/smartwave-io.html', 'SmartWave.io', 'smartwave-io'); });
    cardWave.addEventListener('click', () => openGame('games/smartwave-io.html', 'SmartWave.io', 'smartwave-io'));

    playBtnPong.addEventListener('click', (e) => { e.stopPropagation(); openGame('games/smartpong-io.html', 'SmartPong.io', 'smartpong-io'); });
    cardPong.addEventListener('click', () => openGame('games/smartpong-io.html', 'SmartPong.io', 'smartpong-io'));





    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (gameIframeOverlay && gameIframeOverlay.classList.contains('sg-active')) {
          closeGame();
        } else if (overlay.classList.contains('sg-visible')) {
          closeOverlay();
        }
      }
    });

    const smscNameInit = getSmscName();
    const nameKeyInit = 'sgGlobalName_' + smscNameInit;
    chrome.storage.local.get([nameKeyInit], (data) => {
      if (data[nameKeyInit]) {
        currentGlobalName = data[nameKeyInit];
        if (document.getElementById('sg-mod-btn')) {
          checkAdminRole(data[nameKeyInit]);
        } else {
          const observer = new MutationObserver(() => {
            if (document.getElementById('sg-mod-btn')) {
              checkAdminRole(data[nameKeyInit]);
              observer.disconnect();
            }
          });
          observer.observe(document.body, { childList: true, subtree: true });
        }
      }
    });
    fetchGlobalStatusUI();

    return openOverlay;
  }

  // ── Games knop toevoegen aan topnav ──
  function addGamesButton(nav) {
    injectStyles();
    const openOverlay = createOverlay();



    const linksWrapper = nav.querySelector('[data-links]');
    const favourites = nav.querySelector('.favourites-container');
    const profileWrapper = nav.querySelector('[data-profile]');

    const btn = document.createElement('button');
    btn.id = 'SmartBuddy-games-btn';
    btn.className = 'topnav__btn';
    btn.innerHTML = 'Games <span class="sg-global-status-dot sg-status-red"></span>';
    
    function checkActivePlayers() {
      fetch('https://smartgrid-510f5-default-rtdb.europe-west1.firebasedatabase.app/games.json')
        .then(r => r.json())
        .then(data => {
          let playing = false;
          let bloobPlayers = 0;
          let pongPlayers = 0;
          let chatOnline = 0;
          if (data) {
            if (data['SmartBuddy-io'] && data['SmartBuddy-io'].players) {
              bloobPlayers = Object.keys(data['SmartBuddy-io'].players).length;
              if (bloobPlayers > 0) playing = true;
            }
            if (data['smartpong-io'] && data['smartpong-io'].rooms) {
              pongPlayers = Object.keys(data['smartpong-io'].rooms).length * 2;
              if (pongPlayers > 0) playing = true;
            }
            if (data['SmartBuddy-io'] && data['SmartBuddy-io']['chat-presence']) {
              chatOnline = Object.keys(data['SmartBuddy-io']['chat-presence']).length;
              if (chatOnline > 0) playing = true;
            }
          }
          const dot = btn.querySelector('.sg-global-status-dot');
          if (dot) {
            dot.className = 'sg-global-status-dot ' + (playing ? 'sg-status-green' : 'sg-status-red');
          }
          
          const bloobText = document.querySelector('#sg-badge-smartbloob .sg-player-text');
          if (bloobText) bloobText.textContent = bloobPlayers === 1 ? '1 speler' : bloobPlayers + ' spelers';
          
          const pongText = document.querySelector('#sg-badge-smartpong .sg-player-text');
          if (pongText) pongText.textContent = pongPlayers === 1 ? '1 speler' : pongPlayers + ' spelers';

          const chatDot = document.querySelector('#sg-chat-btn .sg-chat-status-dot');
          if (chatDot) {
            chatDot.className = 'sg-chat-status-dot ' + (chatOnline > 0 ? 'sg-status-green' : 'sg-status-red');
            document.querySelector('#sg-chat-btn').title = chatOnline === 1 ? '1 persoon in chat' : (chatOnline > 0 ? chatOnline + ' personen in chat' : 'SmartBuddy Chat');
          }
        }).catch(() => {});
    }
    
    checkActivePlayers();
    setInterval(checkActivePlayers, 30000);

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openOverlay();
    });
    
    if (linksWrapper && linksWrapper.nextSibling) {
      nav.insertBefore(btn, linksWrapper.nextSibling);
    } else if (favourites) {
      nav.insertBefore(btn, favourites);
    } else {
      const spacer = nav.querySelector('.topnav__spacer');
      if (spacer && spacer.nextSibling) {
        nav.insertBefore(btn, spacer.nextSibling.nextSibling);
      } else {
        nav.appendChild(btn);
      }
    }
  }

  
  // Hosted Iframe Init
  async function initHosted() {
    // Haal de naam op van de parent (de extensie)
    window.__cachedSmscName = await sendMessageToParent({ action: 'getSmscName' });
    
    // Roep de overlay logic direct aan, want deze iFrame is de overlay
    const openOverlay = createOverlay();
    
    // Voorkom dat createOverlay opnieuw de body manipuleert, we hebben de HTML al in games.html
    // Echter, createOverlay() maakt een element aan en append it to document.body.
    // Omdat we in games.html al de HTML hebben staan, kunnen we dat element weggooien en direct de DOM bewerken.
    // Maar het makkelijkst is: we laten createOverlay doen wat het doet (een div toevoegen),
    // en we gooien onze statische HTML uit games.html weg of we laten createOverlay hem overschrijven.
    // Laten we gewoon openOverlay direct roepen nadat het is aangemaakt!
    
    openOverlay();
    
    // Zorg dat de close button een bericht stuurt om de iframe te sluiten
    const closeBtn = document.querySelector('#sg-games-close');
    if (closeBtn) {
       closeBtn.addEventListener('click', () => {
           sendMessageToParent({ action: 'closeIframe' });
       });
    }
  }

  // Vervang waitForTopnav door initHosted
  initHosted();

})();


  // Play animation when wrapper shows iframe
  window.addEventListener('message', (e) => {
    if (e.data && e.data.action === 'playAnimation') {
      const overlay = document.getElementById('sg-games-overlay');
      if (overlay) {
        overlay.classList.remove('sg-visible');
        void overlay.offsetWidth; // force reflow
        overlay.classList.add('sg-visible');
      }
    }
  });
