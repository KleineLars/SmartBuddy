const fs = require('fs');
const path = require('path');

const srcGamesJs = 'c:/Users/Lars De Backker/Downloads/SmartBuddy Web/games.js';
let content = fs.readFileSync(srcGamesJs, 'utf8');

// Bridge utility
const bridgeStr = `
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
`;

// Remove the old chrome mock proxy
content = content.replace(/const chrome = \(function \(\) \{[\s\S]*?\}\)\(\);/, bridgeStr);

// Replace getSmscName() with cached version
const oldSmscFunc = /function getSmscName\(\) \{[\s\S]*?return 'Gast';\s*\}/;
content = content.replace(oldSmscFunc, 'function getSmscName() { return window.__cachedSmscName; }');

// We need to initialize the iframe when it loads. 
// Previously, createOverlay() was called by addGamesButton(), and then openOverlay() was called on click.
// Now, games.html IS the overlay, so it should be visible automatically.
// We should replace addGamesButton logic to just init.
// Actually, games.js has:
// function createOverlay() { ... return openOverlay; }
// ...
// function addGamesButton(nav) { ... const openOverlay = createOverlay(); ... btn.addEventListener('click', ... openOverlay()) }
// waitForTopnav(addGamesButton);

const initReplacement = `
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
`;

// We replace waitForTopnav(addGamesButton); with our initReplacement
content = content.replace(/waitForTopnav\(addGamesButton\);/g, initReplacement);

// Inside createOverlay(), it does `document.body.appendChild(overlay);`
// This is fine, it will append the overlay to our empty games.html body.
// But we must remove the original static HTML we generated in games.html if we rely on this!
// Ah! In games.html we generated the HTML manually. If `createOverlay` runs, it will duplicate it.
// We can just comment out `overlay.innerHTML = \`...\`;` and `document.body.appendChild(overlay);`
// AND change `const overlay = document.createElement('div');` to `const overlay = document.getElementById('sg-games-overlay');`
// BUT wait, games.html has `#sg-games-overlay`.
// Let's replace the whole createOverlay overlay creation part:
const overlayCreationPattern = /const overlay = document\.createElement\('div'\);[\s\S]*?document\.body\.appendChild\(overlay\);/;
content = content.replace(overlayCreationPattern, "const overlay = document.getElementById('sg-games-overlay');");

fs.writeFileSync(srcGamesJs, content);
console.log('Update games.js complete.');
