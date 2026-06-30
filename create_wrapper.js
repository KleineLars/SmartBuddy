const fs = require('fs');
const path = require('path');

const targetScript = 'c:/Users/Lars De Backker/Downloads/SmartBuddy/content-scripts/SmartBuddyGames.js';

const wrapperContent = `
// ========================================================================================
// SmartBuddy Games - Games knop in Smartschool topnav (Hosted iFrame Wrapper)
// ========================================================================================
(function () {
  if (document.getElementById('SmartBuddy-games-btn')) return;

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
    if (document.getElementById('SmartBuddy-games-styles')) return;
    const style = document.createElement('style');
    style.id = 'SmartBuddy-games-styles';
    style.textContent = \`
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

      /* iFrame Overlay */
      #sg-hosted-overlay {
        position: fixed;
        inset: 0;
        z-index: 999999;
        display: none;
        background: transparent;
        border: none;
      }
      #sg-hosted-overlay.sg-visible {
        display: block;
      }
      #sg-hosted-iframe {
        width: 100%;
        height: 100%;
        border: none;
        background: transparent;
      }
    \`;
    document.head.appendChild(style);
  }

  function getSmscName() {
    const titleEl = document.querySelector('.js-btn-profile .topnav__btn__title');
    if (titleEl && titleEl.textContent.trim() !== '') return titleEl.textContent.trim();
    
    const profileBtn = document.querySelector('.js-btn-profile');
    if (profileBtn && profileBtn.getAttribute('title')) {
       return profileBtn.getAttribute('title').trim();
    }
    
    const dataEl = document.querySelector('[data-user-name]');
    if (dataEl && dataEl.getAttribute('data-user-name')) {
       return dataEl.getAttribute('data-user-name').trim();
    }
    
    if (profileBtn) {
        return profileBtn.textContent.replace(/\\s+/g, ' ').trim();
    }
    
    return 'Gast';
  }

  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'sg-hosted-overlay';
    
    const iframe = document.createElement('iframe');
    iframe.id = 'sg-hosted-iframe';
    // HOSTED GITHUB PAGES URL
    iframe.src = 'https://kleinelars.github.io/SmartBuddy/games.html';
    iframe.allow = "clipboard-write; clipboard-read";
    
    overlay.appendChild(iframe);
    document.body.appendChild(overlay);

    return () => {
      overlay.classList.add('sg-visible');
      document.body.style.overflow = 'hidden';
    };
  }

  function closeOverlay() {
    const overlay = document.getElementById('sg-hosted-overlay');
    if (overlay) {
      overlay.classList.remove('sg-visible');
      document.body.style.overflow = '';
    }
  }

  // Setup Bridge
  window.addEventListener('message', (e) => {
    // Only allow from our hosted iframe URL (security)
    if (e.origin !== 'https://kleinelars.github.io') return;
    
    const data = e.data;
    if (!data || !data.action) return;

    if (data.action === 'closeIframe') {
      closeOverlay();
      return;
    }

    if (data.action === 'getSmscName') {
      e.source.postMessage({ id: data.id, response: getSmscName() }, '*');
    } else if (data.action === 'storageLocalGet') {
      chrome.storage.local.get(data.keys, (result) => {
        e.source.postMessage({ id: data.id, response: result }, '*');
      });
    } else if (data.action === 'storageLocalSet') {
      chrome.storage.local.set(data.obj, () => {
        e.source.postMessage({ id: data.id, response: true }, '*');
      });
    } else if (data.action === 'storageLocalRemove') {
      chrome.storage.local.remove(data.keys, () => {
        e.source.postMessage({ id: data.id, response: true }, '*');
      });
    } else if (data.action === 'storageSyncGet') {
      chrome.storage.sync.get(data.keys, (result) => {
        e.source.postMessage({ id: data.id, response: result }, '*');
      });
    } else if (data.action === 'storageSyncSet') {
      chrome.storage.sync.set(data.obj, () => {
        e.source.postMessage({ id: data.id, response: true }, '*');
      });
    } else if (data.action === 'runtimeSendMessage') {
      chrome.runtime.sendMessage(data.message, (result) => {
        e.source.postMessage({ id: data.id, response: result }, '*');
      });
    }
  });

  function addGamesButton(nav) {
    injectStyles();
    const openOverlay = createOverlay();

    const linksWrapper = nav.querySelector('[data-links]');
    const favourites = nav.querySelector('.favourites-container');

    const btn = document.createElement('button');
    btn.id = 'SmartBuddy-games-btn';
    btn.className = 'topnav__btn';
    btn.innerHTML = 'Games <span class="sg-global-status-dot sg-status-red"></span>';

    // Simplified dot check (can also be requested inside iframe if needed)
    function checkActivePlayers() {
      fetch('https://smartgrid-510f5-default-rtdb.europe-west1.firebasedatabase.app/games.json')
        .then(r => r.json())
        .then(data => {
          let playing = false;
          if (data) {
            if (data['SmartBuddy-io'] && data['SmartBuddy-io'].players && Object.keys(data['SmartBuddy-io'].players).length > 0) playing = true;
            if (data['smartpong-io'] && data['smartpong-io'].rooms && Object.keys(data['smartpong-io'].rooms).length > 0) playing = true;
            if (data['SmartBuddy-io'] && data['SmartBuddy-io']['chat-presence'] && Object.keys(data['SmartBuddy-io']['chat-presence']).length > 0) playing = true;
          }
          const dot = btn.querySelector('.sg-global-status-dot');
          if (dot) {
            dot.className = 'sg-global-status-dot ' + (playing ? 'sg-status-green' : 'sg-status-red');
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
      nav.appendChild(btn);
    }
  }

  waitForTopnav(addGamesButton);
})();
`;

fs.writeFileSync(targetScript, wrapperContent);
console.log('Wrapper written');
