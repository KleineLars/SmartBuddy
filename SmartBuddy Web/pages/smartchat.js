const firebaseConfig = {
    apiKey: "AIzaSyDK6YGStByB4-q8YkxGtrmrXwoa2QvwyIU",
    authDomain: "smartgrid-510f5.firebaseapp.com",
    databaseURL: "https://smartgrid-510f5-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "smartgrid-510f5",
    storageBucket: "smartgrid-510f5.firebasestorage.app",
    messagingSenderId: "576979628548",
    appId: "1:576979628548:web:50bf812c8b1cd548edfb51",
    measurementId: "G-8QVXSM5W84"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Verwijder onthouden WebSocket fouten zodat Firebase altijd WebSockets probeert
// in plaats van de geblokkeerde Long Polling methode
try {
    window.localStorage.removeItem('firebase:previous_websocket_failure');
    window.sessionStorage.removeItem('firebase:previous_websocket_failure');
} catch (e) { }

const db = firebase.database();

const urlParams = new URLSearchParams(window.location.search);
let myName = urlParams.get('player_name') || 'Gast';

// Chat sluiten knop (stuurt een signaal naar de Smartschool pagina)
const closeBtn = document.getElementById('close-chat-btn');
if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        window.parent.postMessage('closeSmartBuddyChat', '*');
    });
}

// Settings knop
const settingsBtn = document.getElementById('settings-chat-btn');
if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
        window.parent.postMessage('openSmartBuddySettings', '*');
    });
}

const chatView = document.getElementById('chat-view');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('messages-container');

// Referentie naar een globale chat room (in een pad dat zeker open staat)
const chatRef = db.ref('games/SmartBuddy-io/chat');
const presenceRef = db.ref('games/SmartBuddy-io/chat-presence');
const moderationRef = db.ref('games/shared/moderation'); // Voor bans & timeouts

// =========================================================================
// JOUW EIGEN EXTRA BADWORDS
// Hier kan je heel makkelijk zelf woorden toevoegen die geblokkeerd moeten worden.
// Zet elk woord tussen aanhalingstekens, gescheiden door een komma.
// =========================================================================
const customBadWords = [
    "kkr",
    "fk"
];

// =========================================================================
// ROLLEN & RECHTEN
// Voeg de exacte namen toe (hoofdlettergevoelig) aan de lijsten hieronder.
// =========================================================================
let ROLES_META = {};
let USER_ROLES = {};
let OLD_ROLES = { OWNER: [], CO_OWNER: [], ADMIN: [], MOD: [] };

// Luister naar rollen in Firebase
const rolesRef = db.ref('games/shared/roles');
rolesRef.on('value', snap => {
    if (snap.exists()) {
        const val = snap.val();
        // Detect if old format or new format
        if (val.OWNER && Array.isArray(val.OWNER)) {
            OLD_ROLES = val;
            ROLES_META = {};
        } else {
            ROLES_META = val;
            OLD_ROLES = {};
        }
        updateModUI();
    }
});

db.ref('games/shared/userRoles').on('value', snap => {
    if (snap.exists()) {
        USER_ROLES = snap.val();
    } else {
        USER_ROLES = {};
    }
    updateModUI();
});
// =========================================================================

let badwordsList = []; 
// Laad standaard badwords lijst en combineer met jouw eigen lijst
const badwordsUrl = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL 
    ? chrome.runtime.getURL('static/badwords.json') 
    : '../static/badwords.json';

fetch(badwordsUrl)
    .then(res => res.json())
    .then(data => { 
        badwordsList = data.concat(customBadWords).filter(w => w && w.trim().length > 1); 
    })
    .catch(err => {
        console.error("Kon badwords niet laden:", err);
        badwordsList = customBadWords.filter(w => w && w.trim().length > 1);
    });

function getUserRoleData(name) {
    const roleName = USER_ROLES[name];
    if (roleName && ROLES_META[roleName]) {
        return { name: roleName, ...ROLES_META[roleName] };
    }
    
    // Check old roles for migration
    if (OLD_ROLES.OWNER && Array.isArray(OLD_ROLES.OWNER) && OLD_ROLES.OWNER.includes(name)) return { name: 'OWNER', color: '#ff520e', canModGames: true, canModChat: true };
    if (OLD_ROLES.CO_OWNER && Array.isArray(OLD_ROLES.CO_OWNER) && OLD_ROLES.CO_OWNER.includes(name)) return { name: 'CO_OWNER', color: '#ff520e', canModGames: true, canModChat: true };
    if (OLD_ROLES.ADMIN && Array.isArray(OLD_ROLES.ADMIN) && OLD_ROLES.ADMIN.includes(name)) return { name: 'ADMIN', color: '#3b82f6', canModGames: true, canModChat: true };
    if (OLD_ROLES.MOD && Array.isArray(OLD_ROLES.MOD) && OLD_ROLES.MOD.includes(name)) return { name: 'MOD', color: '#10b981', canModGames: false, canModChat: true };
    
    return null;
}

let isMod = false;

function updateModUI() {
    const roleData = getUserRoleData(myName);
    isMod = roleData !== null && roleData.canModChat === true;

    const modPanelBtn = document.getElementById('mod-panel-btn');
    if (modPanelBtn) {
        if (roleData !== null && (roleData.canModChat || roleData.canModGames)) {
            modPanelBtn.style.display = 'flex';
        } else {
            modPanelBtn.style.display = 'none';
        }
    }
}
updateModUI(); // Initial call


let isBanned = false;
let isTimedOut = false;

// Luister naar bans
moderationRef.child(myName).child('banned').on('value', snap => {
    if (snap.exists()) {
        isBanned = true;
        const banData = snap.val();
        const reason = typeof banData === 'object' && banData.reason ? banData.reason : 'Geen reden opgegeven';
        const alertText = document.getElementById('ban-alert-text');
        if (alertText) {
            alertText.textContent = `Je bent definitief verbannen uit de chat. Reden: ${reason}`;
        }
        document.getElementById('ban-alert-overlay').classList.add('visible');
    } else {
        isBanned = false;
        document.getElementById('ban-alert-overlay').classList.remove('visible');
    }
});

let timeoutInterval;

// Luister naar timeouts
moderationRef.child(myName).child('timeouts').on('value', snap => {
    const timeouts = snap.val() || {};
    const chatTimeout = Math.max(timeouts.all || 0, timeouts.chat || 0);
    const timeLeftEl = document.getElementById('timeout-time-left');

    if (chatTimeout > Date.now()) {
        isTimedOut = true;
        document.getElementById('timeout-alert-overlay').classList.add('visible');

        if (timeoutInterval) clearInterval(timeoutInterval);

        timeoutInterval = setInterval(() => {
            const remaining = chatTimeout - Date.now();
            if (remaining <= 0) {
                clearInterval(timeoutInterval);
                document.getElementById('timeout-alert-overlay').classList.remove('visible');
                isTimedOut = false;
                if (timeLeftEl) timeLeftEl.textContent = "";
            } else {
                const minutes = Math.floor(remaining / 60000);
                const seconds = Math.floor((remaining % 60000) / 1000);
                if (timeLeftEl) {
                    timeLeftEl.textContent = `${minutes}m ${seconds}s`;
                }
            }
        }, 1000);

    } else {
        if (timeoutInterval) clearInterval(timeoutInterval);
        isTimedOut = false;
        document.getElementById('timeout-alert-overlay').classList.remove('visible');
        if (timeLeftEl) timeLeftEl.textContent = "";
    }
});

const onlineCountEl = document.getElementById('online-count');
const statusDot = document.querySelector('.status-dot');

// Houd online status bij
const myPresenceId = myName + '_' + Math.random().toString(36).substr(2, 9);

db.ref('.info/connected').on('value', snap => {
    if (snap.val() === true) {
        const myPresenceRef = presenceRef.child(myPresenceId);
        myPresenceRef.onDisconnect().remove();
        myPresenceRef.set({ name: myName });
    }
});

// Luister naar hoeveel mensen er online zijn
presenceRef.on('value', snap => {
    const val = snap.val();
    const count = val ? Object.keys(val).length : 0;
    onlineCountEl.textContent = count + (count === 1 ? ' online' : ' online');
    if (count > 0) {
        statusDot.style.backgroundColor = '#22c55e'; // Groen
    } else {
        statusDot.style.backgroundColor = '#ef4444'; // Rood
    }
});

// Format tijd
function formatTime(timestamp) {
    if (!timestamp) return "";
    const d = new Date(timestamp);
    const hrs = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return hrs + ':' + mins;
}

// Start direct met luisteren
loadMessages();

const customAlertOverlay = document.getElementById('custom-alert-overlay');
const customAlertBtn = document.getElementById('custom-alert-btn');
const customAlertAppealBtn = document.getElementById('custom-alert-appeal-btn');

// Context Menu State
let selectedMsgKey = null;
let selectedMsgAuthor = null;
let selectedMsgText = null;

const contextMenu = document.getElementById('context-menu');
const contextDeleteBtn = document.getElementById('context-delete');
const contextReplyBtn = document.getElementById('context-reply');

// Sluit menu als je ergens anders klikt
document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target) && !e.target.closest('.message')) {
        contextMenu.style.display = 'none';
    }
});

document.querySelectorAll('.context-emoji').forEach(el => {
    el.addEventListener('click', () => {
        if (!selectedMsgKey) return;
        const emoji = el.getAttribute('data-emoji');
        const reactionRef = chatRef.child(selectedMsgKey).child('reactions').child(emoji).child(myName);
        
        reactionRef.once('value').then(snap => {
            if (snap.exists()) {
                reactionRef.remove(); // Toggle off
            } else {
                reactionRef.set(true); // Toggle on
            }
        });
        contextMenu.style.display = 'none';
    });
});

contextDeleteBtn.addEventListener('click', () => {
    if (selectedMsgKey) {
        console.log(`Bericht verwijderd door ${myName}:`, selectedMsgText);

        chatRef.child(selectedMsgKey).remove();
        contextMenu.style.display = 'none';
    }
});

let replyingTo = null;
const replyPreview = document.getElementById('reply-preview');
const replyPreviewName = document.getElementById('reply-preview-name');
const replyPreviewText = document.getElementById('reply-preview-text');
const replyPreviewClose = document.getElementById('reply-preview-close');

contextReplyBtn.addEventListener('click', () => {
    if (selectedMsgKey && selectedMsgAuthor) {
        replyingTo = {
            author: selectedMsgAuthor,
            text: selectedMsgText
        };
        replyPreviewName.textContent = `Antwoorden op ${selectedMsgAuthor}`;
        replyPreviewText.textContent = selectedMsgText;
        replyPreview.style.display = 'block';
        chatInput.focus();
        contextMenu.style.display = 'none';
    }
});

replyPreviewClose.addEventListener('click', () => {
    replyingTo = null;
    replyPreview.style.display = 'none';
});

// Mod Panel Setup is nu in updateModUI()
const modPanelBtn = document.getElementById('mod-panel-btn');
const modPanelOverlay = document.getElementById('mod-panel-overlay');
if (modPanelBtn) {
    modPanelBtn.addEventListener('click', () => {
        modPanelOverlay.classList.add('visible');
    });
}

const modCloseBtn = document.getElementById('mod-close');
if (modCloseBtn) {
    modCloseBtn.addEventListener('click', () => {
        modPanelOverlay.classList.remove('visible');
    });
}

function modAction(actionType, durationMs) {
    const targetUser = document.getElementById('mod-target-user').value.trim();
    if (!targetUser) return alert('Vul een geldige naam in.');
    if (getUserRole(targetUser) === 'OWNER') return alert('Je kan de Owner niet modereren!');

    if (actionType === 'timeout') {
        moderationRef.child(targetUser).child('timeouts').child('chat').set(Date.now() + durationMs);
        alert(`${targetUser} heeft een timeout gekregen in de chat.`);
    } else if (actionType === 'ban') {
        const reason = prompt("Geef een reden op voor de permanente ban (bijv. Valsspelen, Schelden):", "Ongepast gedrag");
        if (reason !== null) {
            moderationRef.child(targetUser).child('banned').set({
                active: true,
                reason: reason,
                timestamp: Date.now()
            });
            alert(`${targetUser} is verbannen.`);
        }
    } else if (actionType === 'unban') {
        moderationRef.child(targetUser).child('timeouts').remove();
        moderationRef.child(targetUser).child('banned').remove();
        alert(`Restricties voor ${targetUser} zijn opgeheven.`);
    }
    document.getElementById('mod-target-user').value = '';
    modPanelOverlay.classList.remove('visible');
}

const btnTimeout10 = document.getElementById('mod-timeout-10');
if (btnTimeout10) btnTimeout10.onclick = () => modAction('timeout', 10 * 60 * 1000);

const btnTimeout60 = document.getElementById('mod-timeout-60');
if (btnTimeout60) btnTimeout60.onclick = () => modAction('timeout', 60 * 60 * 1000);

const btnTimeoutCustom = document.getElementById('mod-timeout-custom');
if (btnTimeoutCustom) {
    btnTimeoutCustom.onclick = () => {
        const val = parseInt(document.getElementById('mod-timeout-custom-val').value, 10);
        if (isNaN(val) || val <= 0) return alert('Vul een geldig aantal minuten in.');
        modAction('timeout', val * 60 * 1000);
        document.getElementById('mod-timeout-custom-val').value = '';
    };
}

const btnBan = document.getElementById('mod-ban');
if (btnBan) btnBan.onclick = () => modAction('ban');

const btnUnban = document.getElementById('mod-unban');
if (btnUnban) btnUnban.onclick = () => modAction('unban');

let lastBlockedMessage = '';
let lastBadWord = '';

function showCustomAlert(message, blockedText, badWord) {
    document.getElementById('custom-alert-text').innerHTML = message;
    const errorEl = document.getElementById('custom-alert-error');
    if (errorEl) errorEl.style.display = 'none';
    lastBlockedMessage = blockedText;
    lastBadWord = badWord || 'onbekend';
    customAlertAppealBtn.textContent = 'Ten onrechte geblokkeerd? Meld het!';
    customAlertAppealBtn.disabled = false;
    customAlertOverlay.classList.add('visible');
}

customAlertBtn.addEventListener('click', () => {
    customAlertOverlay.classList.remove('visible');
    chatInput.focus();
});

customAlertAppealBtn.addEventListener('click', () => {
    if (!lastBlockedMessage) return;

    const errorEl = document.getElementById('custom-alert-error');
    
    // Check of de gebruiker al een ping heeft gestuurd in de afgelopen 24 uur (86400000 ms)
    const lastPing = localStorage.getItem('smartbuddy_last_ping_' + myName);
    if (lastPing && Date.now() - parseInt(lastPing, 10) < 86400000) {
        if (errorEl) {
            errorEl.textContent = "Je hebt vandaag al gemeld. Wacht 24 uur.";
            errorEl.style.display = 'block';
        }
        return;
    }
    if (errorEl) errorEl.style.display = 'none';

    customAlertAppealBtn.disabled = true;
    customAlertAppealBtn.textContent = 'Bezig met verzenden...';

    // Gesimuleerd verzenden (Discord webhook is verwijderd voor publicatie)
    setTimeout(() => {
        console.log(`Valse positief gemeld door ${myName}: ${lastBlockedMessage}`);
        customAlertAppealBtn.textContent = 'Melding verzonden!';
        localStorage.setItem('smartbuddy_last_ping_' + myName, Date.now());
    }, 800);
});

async function sendMessage() {
    try {
        if (isBanned || isTimedOut) {
            alert("Je kunt geen berichten versturen tijdens een ban of time-out.");
            return;
        }
        const text = chatInput.value.trim();
        if (text && myName) {
            function continueSendingMessage(verifiedText) {
                const msgData = {
                    author: myName,
                    text: verifiedText,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                };

                if (replyingTo) {
                    msgData.replyTo = replyingTo;
                    replyingTo = null;
                    replyPreview.style.display = 'none';
                }

                chatRef.push(msgData).then(() => {
                    // Beperk tot max 20 berichten in de database
                    chatRef.orderByChild('timestamp').once('value').then(snap => {
                        if (snap.numChildren() > 20) {
                            let count = 0;
                            const total = snap.numChildren();
                            snap.forEach(child => {
                                count++;
                                if (count <= total - 20) {
                                    chatRef.child(child.key).remove();
                                }
                            });
                        }
                    });
                }).catch(err => {
                    alert("Er ging iets mis bij het versturen: " + err.message);
                    console.error("Kon bericht niet sturen naar Firebase:", err);
                });
                chatInput.value = '';
                chatInput.focus();
            }

            // --- OPTIMISTIC UI: Toon bericht alvast lokaal als 'loading' ---
            const tempId = 'temp_' + Date.now();
            const tempDiv = document.createElement('div');
            tempDiv.className = 'message own loading';
            tempDiv.dataset.msgKey = tempId;
            tempDiv.innerHTML = `
                <div class="msg-bubble">
                    <div class="msg-content-wrapper">
                        ${replyingTo ? `<div class="msg-reply-box"><span class="reply-author">${replyingTo.author}</span>${replyingTo.text}</div>` : ''}
                        <div class="msg-text">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</div>
                    </div>
                </div>
            `;
            messagesContainer.appendChild(tempDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            chatInput.value = ''; // Input meteen leegmaken

            // AI bad words check only
            sendBtn.disabled = true;
            chatInput.disabled = true;
            try {
                let isBad = false;
                let blockReason = '';
                let apiError = '';
                
                try {
                    const aiResponse = await new Promise(resolve => {
                        chrome.runtime.sendMessage({ action: 'checkBadWords', text: text, name: myName }, resolve);
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
                
                sendBtn.disabled = false;
                chatInput.disabled = false;
                chatInput.focus();
                const tempEl = document.querySelector(`.message[data-msg-key="${tempId}"]`);
                if (tempEl) tempEl.remove();

                if (apiError) {
                    showCustomAlert(`De veiligheidscontrole kon niet worden uitgevoerd:\n\n${apiError}`, text, 'Fout');
                    return;
                }

                if (isBad) {
                    let alertMsg = `Je bericht is geblokkeerd.`;
                    if (blockReason) alertMsg += ` Reden: ${blockReason}`;
                    showCustomAlert(alertMsg, text, 'Gefilterd');
                    return;
                } else {
                    continueSendingMessage(text);
                }
            } catch (err) {
                console.warn('Onverwachte fout in berichtafhandeling:', err);
                sendBtn.disabled = false;
                chatInput.disabled = false;
                chatInput.focus();
                const tempEl = document.querySelector(`.message[data-msg-key="${tempId}"]`);
                if (tempEl) tempEl.remove();
                showCustomAlert('Er ging iets onverwachts mis. Probeer het opnieuw.', text, 'Fout');
            }
        }
    } catch (err) {
        alert("CRITICAL ERROR IN SENDMESSAGE: " + err.message);
        console.error(err);
    }
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Genereer een consistente kleur op basis van de naam
function getColorFromName(name) {
    if (!name) return 'hsl(0, 0%, 50%)';
    name = String(name);
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 80%, 45%)`; // Zorgt voor goed leesbare, kleurrijke namen
}

function renderReactions(msgEl, msgKey, reactions) {
    const container = msgEl.querySelector('.msg-reactions');
    container.innerHTML = '';
    Object.keys(reactions).forEach(emoji => {
        const users = Object.keys(reactions[emoji]);
        if (users.length === 0) return;
        const span = document.createElement('span');
        span.className = 'reaction';
        span.innerHTML = `${emoji} ${users.length}`;
        span.title = users.join(', ');
        container.appendChild(span);
    });
}

function loadMessages() {
    // Luister naar verwijderde berichten
    chatRef.on('child_removed', (snapshot) => {
        const el = document.querySelector(`.message[data-msg-key="${snapshot.key}"]`);
        if (el) el.remove();
    });

    // Luister naar bericht updates (bijv. reacties)
    chatRef.on('child_changed', (snapshot) => {
        const el = document.querySelector(`.message[data-msg-key="${snapshot.key}"]`);
        if (el) {
            const msg = snapshot.val();
            renderReactions(el, snapshot.key, msg.reactions || {});
        }
    });

    // Luister naar de laatste 20 berichten
    chatRef.orderByChild('timestamp').limitToLast(20).on('child_added', (snapshot) => {
        try {
            const msg = snapshot.val();
            if (!msg) return;

            const div = document.createElement('div');
            div.className = 'message';
            if (msg.author === myName) {
                div.classList.add('own');
            }

            div.dataset.msgKey = snapshot.key;

            // Klik voor context menu
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedMsgKey = snapshot.key;
                selectedMsgAuthor = msg.author;
                selectedMsgText = msg.text;

                const rect = div.getBoundingClientRect();
                contextMenu.style.display = 'flex';
                contextMenu.style.top = `${rect.top - 10}px`;
                
                if (msg.author === myName) {
                    contextMenu.style.left = `${rect.left - 170}px`; // Own messages on right
                } else {
                    contextMenu.style.left = `${rect.right + 10}px`;
                }

                // Check boundaries
                const menuRect = contextMenu.getBoundingClientRect();
                if (menuRect.right > window.innerWidth) {
                    contextMenu.style.left = `${window.innerWidth - menuRect.width - 10}px`;
                }

                if (msg.author === myName || isMod) {
                    contextDeleteBtn.style.display = 'flex';
                } else {
                    contextDeleteBtn.style.display = 'none';
                }
            });

            const authorDiv = document.createElement('div');
            authorDiv.className = 'msg-author';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'msg-author-name';
            nameSpan.textContent = msg.author || 'Onbekend';
            nameSpan.style.color = getColorFromName(msg.author);
            authorDiv.appendChild(nameSpan);

            const roleData = getUserRoleData(msg.author);
            if (roleData) {
                const badge = document.createElement('span');
                badge.className = `role-badge`;
                badge.textContent = roleData.name;
                badge.style.background = roleData.color || '#333';
                badge.style.color = '#fff';
                badge.style.padding = '2px 6px';
                badge.style.borderRadius = '4px';
                badge.style.fontSize = '10px';
                badge.style.marginLeft = '6px';
                badge.style.fontWeight = '600';
                authorDiv.appendChild(badge);
            }

            const timeSpan = document.createElement('span');
            timeSpan.className = 'msg-time';
            timeSpan.textContent = formatTime(msg.timestamp);

            const bubbleDiv = document.createElement('div');
            bubbleDiv.className = 'msg-bubble';

            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'msg-content-wrapper';

            if (msg.replyTo) {
                const replyBox = document.createElement('div');
                replyBox.className = 'msg-reply-box';
                replyBox.innerHTML = `<span class="reply-author">${msg.replyTo.author}</span>${msg.replyTo.text}`;
                contentWrapper.appendChild(replyBox);
            }

            const textDiv = document.createElement('div');
            textDiv.className = 'msg-text';
            textDiv.textContent = msg.text || '';

            contentWrapper.appendChild(textDiv);
            contentWrapper.appendChild(timeSpan);
            
            if (msg.author !== myName || isMod) {
                bubbleDiv.appendChild(authorDiv);
            }
            bubbleDiv.appendChild(contentWrapper);

            // Container voor reacties
            const reactionsDiv = document.createElement('div');
            reactionsDiv.className = 'msg-reactions';
            
            div.appendChild(bubbleDiv);
            div.appendChild(reactionsDiv);
            messagesContainer.appendChild(div);
            
            // Eerste render van reacties
            renderReactions(div, snapshot.key, msg.reactions || {});

            // Scroll automatisch naar beneden
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 10);
        } catch (e) {
            console.error("Fout bij laden bericht:", e);
        }
    });
}
