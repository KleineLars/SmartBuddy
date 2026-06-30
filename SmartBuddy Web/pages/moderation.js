const firebaseConfig = {
    apiKey: "AIzaSyDK6YGStByB4-q8YkxGtrmrXwoa2QvwyIU",
    authDomain: "smartgrid-510f5.firebaseapp.com",
    databaseURL: "https://smartgrid-510f5-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "smartgrid-510f5",
    storageBucket: "smartgrid-510f5.firebasestorage.app",
    messagingSenderId: "576979628548",
    appId: "1:576979628548:web:50bf812c8b1cd548edfb51"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();
const urlParams = new URLSearchParams(window.location.search);
const myName = urlParams.get('player_name');

const unauthorizedDiv = document.getElementById('unauthorized');
const mainAppDiv = document.getElementById('main-app');
const loadingDiv = document.getElementById('loading');
const usersTable = document.getElementById('users-table');
const usersTbody = document.getElementById('users-tbody');
const searchInput = document.getElementById('search-input');

let allUsers = [];
let moderationData = {};
let ROLES_META = {};
let USER_ROLES = {};

// Fallback old roles just in case for migration
let OLD_ROLES = { OWNER: [], CO_OWNER: [], ADMIN: [], MOD: [] };

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

// 1. Haal data op
db.ref('games/shared/roles').on('value', snap => {
    if (snap.exists()) {
        const val = snap.val();
        // Detect if old format or new format
        if (val.OWNER && Array.isArray(val.OWNER)) {
            OLD_ROLES = val;
            
            // Run Migration
            const newRoles = {
                "OWNER": { color: "#ff520e", canModGames: true, canModChat: true },
                "CO_OWNER": { color: "#ff520e", canModGames: true, canModChat: true },
                "ADMIN": { color: "#3b82f6", canModGames: true, canModChat: true },
                "MOD": { color: "#10b981", canModGames: false, canModChat: true }
            };
            const newUserRoles = {};
            for (const [role, users] of Object.entries(val)) {
                if (Array.isArray(users)) {
                    users.forEach(u => newUserRoles[u] = role);
                }
            }
            // Save migrated data
            db.ref('games/shared/roles').set(newRoles);
            db.ref('games/shared/userRoles').update(newUserRoles);
            ROLES_META = newRoles;
            
        } else {
            ROLES_META = val;
        }
    } else {
        ROLES_META = {};
    }
    checkAuth();
});

db.ref('games/shared/userRoles').on('value', snap => {
    if (snap.exists()) {
        USER_ROLES = snap.val();
    } else {
        USER_ROLES = {};
    }
    checkAuth();
});

let authChecked = false;
function checkAuth() {
    const myRole = getUserRoleData(myName);
    if (!myRole || (!myRole.canModGames && !myRole.canModChat)) {
        unauthorizedDiv.style.display = 'block';
        mainAppDiv.style.display = 'none';
    } else {
        unauthorizedDiv.style.display = 'none';
        mainAppDiv.style.display = 'flex';
        
        // Verberg games opties als ze alleen chat mod zijn
        if (!myRole.canModGames) {
            document.querySelectorAll('.game-mod-only').forEach(el => el.style.display = 'none');
            // Zorg dat we in de timeout modal alleen chat kunnen kiezen
            const timeoutSelect = document.getElementById('timeout-game');
            if (timeoutSelect) {
                Array.from(timeoutSelect.options).forEach(opt => {
                    if (opt.value !== 'chat') opt.style.display = 'none';
                });
                timeoutSelect.value = 'chat';
            }
        }

        // Alleen owner of co-owner mogen rollen beheren
        if (myRole.name === 'OWNER' || myRole.name === 'CO_OWNER') {
            document.getElementById('manage-roles-btn').style.display = 'inline-block';
            document.getElementById('manage-status-btn').style.display = 'inline-block';
        } else {
            document.getElementById('manage-roles-btn').style.display = 'none';
            document.getElementById('manage-status-btn').style.display = 'none';
        }

        if (!authChecked) {
            authChecked = true;
            loadUsers();
        }
    }
    if (authChecked) renderUsers(); // Update roles in tabel
    renderRolesList(); // Update modal
}

// 2. Haal alle users en moderatie data op
function loadUsers() {
    db.ref('games/shared/users').on('value', snap => {
        allUsers = [];
        snap.forEach(child => {
            allUsers.push(child.key);
        });
        renderUsers();
    });

    db.ref('games/shared/moderation').on('value', snap => {
        if (snap.exists()) {
            moderationData = snap.val();
        } else {
            moderationData = {};
        }
        renderUsers();
    });
}

function renderUsers() {
    usersTbody.innerHTML = '';
    const query = searchInput.value.toLowerCase();

    const filtered = allUsers.filter(u => u.toLowerCase().includes(query));

    if (filtered.length === 0) {
        loadingDiv.textContent = 'Geen spelers gevonden.';
        loadingDiv.style.display = 'block';
        usersTable.style.display = 'none';
        return;
    }

    loadingDiv.style.display = 'none';
    usersTable.style.display = 'table';

    filtered.forEach(username => {
        const tr = document.createElement('tr');
        
        // Status bepalen
        const mod = moderationData[username] || {};
        let statusHtml = '<span class="status-badge status-active">Actief</span>';
        
        if (mod.banned) {
            const reason = typeof mod.banned === 'object' && mod.banned.reason ? ` (${mod.banned.reason})` : '';
            statusHtml = `<span class="status-badge status-banned" title="${typeof mod.banned === 'object' && mod.banned.reason ? mod.banned.reason : ''}">Verbannen${reason}</span>`;
        } else if (mod.timeouts) {
            const nu = Date.now();
            let actieveTimeouts = [];
            
            for (const [game, expire] of Object.entries(mod.timeouts)) {
                if (expire > nu) {
                    actieveTimeouts.push(game);
                }
            }
            
            if (actieveTimeouts.length > 0) {
                statusHtml = `<span class="status-badge status-timeout">Timeout (${actieveTimeouts.join(', ')})</span>`;
            }
        }

        const rolData = getUserRoleData(username);
        let rolSelectHtml = '';
        
        const myRole = getUserRoleData(myName);
        const isOwnerOrCo = myRole && (myRole.name === 'OWNER' || myRole.name === 'CO_OWNER');
        
        if (isOwnerOrCo) {
            rolSelectHtml = `<select class="role-select" data-username="${username}" style="padding: 4px; border-radius: 4px; border: 1px solid var(--border); font-size: 12px;">
                <option value="">Geen Rol</option>
                ${Object.keys(ROLES_META).map(r => `<option value="${r}" ${rolData && rolData.name === r ? 'selected' : ''}>${r}</option>`).join('')}
            </select>`;
        } else {
            rolSelectHtml = rolData ? `<span class="status-badge" style="background:${rolData.color || '#eee'}; color:#fff;">${rolData.name}</span>` : '<span style="color:var(--text-muted); font-size:12px;">Geen</span>';
        }

        const actionsHtml = [];
        if (myRole && myRole.canModGames) {
            actionsHtml.push(!mod.banned ? `<button class="btn btn-danger" data-action="ban" data-username="${username}">Ban</button>` : `<button class="btn" data-action="unban" data-username="${username}">Unban</button>`);
            actionsHtml.push(`<button class="btn btn-danger" data-action="removename" data-username="${username}">Naam Verwijderen</button>`);
        }
        if (myRole && (myRole.canModGames || myRole.canModChat)) {
            actionsHtml.push(`<button class="btn" data-action="timeout" data-username="${username}">Timeout</button>`);
        }

        tr.innerHTML = `
            <td>
                <div class="user-name">${username}</div>
            </td>
            <td>${rolSelectHtml}</td>
            <td>${statusHtml}</td>
            <td class="actions">
                ${actionsHtml.join('')}
            </td>
        `;
        usersTbody.appendChild(tr);
    });
    
    // Bind change events voor de dropdowns
    document.querySelectorAll('.role-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
            const user = e.target.dataset.username;
            const newRole = e.target.value;
            if (newRole) {
                db.ref(`games/shared/userRoles/${user}`).set(newRole);
            } else {
                db.ref(`games/shared/userRoles/${user}`).remove();
            }
        });
    });
}

usersTbody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    
    const action = btn.dataset.action;
    const username = btn.dataset.username;
    
    if (action === 'ban') {
        window.banUser(username);
    } else if (action === 'unban') {
        window.unbanUser(username);
    } else if (action === 'timeout') {
        window.openTimeoutModal(username);
    } else if (action === 'removename') {
        window.removeUsername(username);
    }
});

searchInput.addEventListener('input', renderUsers);

// Moderatie Acties
let currentUserForBan = null;
const banModal = document.getElementById('ban-modal-overlay');

window.banUser = function(username) {
    currentUserForBan = username;
    document.getElementById('ban-modal-desc').textContent = `Geef een reden voor de permanente ban van ${username}.`;
    banModal.style.display = 'flex';
};

document.getElementById('ban-modal-cancel').addEventListener('click', () => {
    banModal.style.display = 'none';
    currentUserForBan = null;
});

document.getElementById('ban-modal-confirm').addEventListener('click', () => {
    if (!currentUserForBan) return;
    const reason = document.getElementById('ban-reason').value.trim() || 'Geen reden opgegeven';
    
    db.ref(`games/shared/moderation/${currentUserForBan}/banned`).set({
        active: true,
        reason: reason,
        timestamp: Date.now()
    });
    
    banModal.style.display = 'none';
    document.getElementById('ban-reason').value = '';
    currentUserForBan = null;
});

window.unbanUser = function(username) {
    db.ref(`games/shared/moderation/${username}/banned`).remove();
    // Verwijder evt timeouts ook
    db.ref(`games/shared/moderation/${username}/timeouts`).remove();
};

window.removeUsername = function(username) {
    if(!confirm(`Weet je zeker dat je de naam '${username}' wilt verwijderen? De speler moet dan een nieuwe kiezen.`)) return;

    db.ref(`games/shared/users/${username}`).once('value').then(snap => {
        const data = snap.val();
        if (data && data.smscName) {
            // Delete from smscNames
            db.ref(`games/shared/smscNames/${data.smscName}`).remove();
        }
        // Delete from users
        db.ref(`games/shared/users/${username}`).remove();
        // Set forceRename flag
        db.ref(`games/shared/moderation/${username}/forceRename`).set(true);
        alert(`De naam '${username}' is verwijderd.`);
    }).catch(err => {
        alert("Fout bij verwijderen naam: " + err);
    });
};

let currentUserForTimeout = null;
const modal = document.getElementById('modal-overlay');

window.openTimeoutModal = function(username) {
    currentUserForTimeout = username;
    document.getElementById('modal-desc').textContent = `Kies hoelang en voor welke game de timeout geldt voor ${username}.`;
    modal.classList.add('visible');
};

document.getElementById('modal-cancel').addEventListener('click', () => {
    modal.classList.remove('visible');
    currentUserForTimeout = null;
});

document.getElementById('modal-confirm').addEventListener('click', () => {
    if (!currentUserForTimeout) return;
    
    const game = document.getElementById('timeout-game').value;
    const uren = parseInt(document.getElementById('timeout-duration').value, 10);
    
    if (isNaN(uren) || uren <= 0) {
        alert('Vul een geldig aantal uren in.');
        return;
    }
    
    const expireTime = Date.now() + (uren * 60 * 60 * 1000);
    db.ref(`games/shared/moderation/${currentUserForTimeout}/timeouts/${game}`).set(expireTime);
    
    modal.classList.remove('visible');
    currentUserForTimeout = null;
});

// -- ROLES MANAGEMENT LOGIC --
const rolesModalOverlay = document.getElementById('roles-modal-overlay');

document.getElementById('manage-roles-btn').addEventListener('click', () => {
    rolesModalOverlay.style.display = 'flex';
    renderRolesList();
});

document.getElementById('roles-modal-close').addEventListener('click', () => {
    rolesModalOverlay.style.display = 'none';
});

document.getElementById('role-create-btn').addEventListener('click', () => {
    const name = document.getElementById('role-name').value.trim();
    const color = document.getElementById('role-color').value;
    const canModGames = document.getElementById('role-mod-games').checked;
    const canModChat = document.getElementById('role-mod-chat').checked;
    
    if (!name) return alert('Vul een rolnaam in.');
    
    db.ref(`games/shared/roles/${name}`).set({
        color, canModGames, canModChat
    }).then(() => {
        document.getElementById('role-name').value = '';
    });
});

function renderRolesList() {
    const container = document.getElementById('roles-list-container');
    if (!container) return;
    container.innerHTML = '';
    
    if (Object.keys(ROLES_META).length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted); font-size:14px;">Geen rollen gevonden.</div>';
        return;
    }
    
    Object.keys(ROLES_META).forEach(rName => {
        const rData = ROLES_META[rName];
        
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.style.padding = '12px';
        div.style.border = '1px solid var(--border)';
        div.style.borderRadius = '8px';
        
        const colorBlock = `<span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${rData.color}; margin-right:8px;"></span>`;
        
        const infoDiv = document.createElement('div');
        infoDiv.style.fontSize = '14px';
        infoDiv.style.fontWeight = '600';
        infoDiv.style.display = 'flex';
        infoDiv.style.alignItems = 'center';
        infoDiv.innerHTML = `${colorBlock}${rName} <span style="font-weight:400; font-size:12px; margin-left:10px; color:var(--text-muted);">${rData.canModGames ? '[Games] ' : ''}${rData.canModChat ? '[Chat]' : ''}</span>`;
        
        const btn = document.createElement('button');
        btn.className = 'btn btn-danger';
        btn.style.padding = '4px 8px';
        btn.style.fontSize = '12px';
        btn.textContent = 'Verwijderen';
        btn.dataset.role = rName;
        
        div.appendChild(infoDiv);
        div.appendChild(btn);
        container.appendChild(div);
    });
}

// Event delegation voor verwijder knoppen
document.getElementById('roles-list-container').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' && e.target.dataset.role) {
        deleteRole(e.target.dataset.role);
    }
});

window.deleteRole = function(roleName) {
    if (!confirm(`Weet je zeker dat je de rol '${roleName}' wilt verwijderen? Iedereen met deze rol raakt hem kwijt.`)) return;
    
    // Remove from userRoles
    Object.keys(USER_ROLES).forEach(user => {
        if (USER_ROLES[user] === roleName) {
            db.ref(`games/shared/userRoles/${user}`).remove();
        }
    });
    
    // Remove from roles
    db.ref(`games/shared/roles/${roleName}`).remove();
};

// -- STATUS (KILLSWITCH) LOGIC --
const statusModalOverlay = document.getElementById('status-modal-overlay');

document.getElementById('manage-status-btn').addEventListener('click', () => {
    const myRole = getUserRoleData(myName);
    if (!myRole || (myRole.name !== 'OWNER' && myRole.name !== 'CO_OWNER')) {
        alert('Alleen de OWNER of CO_OWNER kan de noodstop gebruiken.');
        return;
    }
    db.ref('games/shared/status').once('value').then(snap => {
        const val = snap.val() || {};
        document.getElementById('status-toggle-chat').checked = val.chat_disabled || false;
        document.getElementById('status-toggle-smartbloob').checked = val['smartbloob-io_disabled'] || false;
        document.getElementById('status-toggle-smartwave').checked = val['smartwave-io_disabled'] || false;
        document.getElementById('status-toggle-smartpong').checked = val['smartpong-io_disabled'] || false;
        statusModalOverlay.style.display = 'flex';
    });
});

document.getElementById('status-modal-close').addEventListener('click', () => {
    statusModalOverlay.style.display = 'none';
});

document.getElementById('status-modal-save').addEventListener('click', () => {
    const data = {
        chat_disabled: document.getElementById('status-toggle-chat').checked,
        'smartbloob-io_disabled': document.getElementById('status-toggle-smartbloob').checked,
        'smartwave-io_disabled': document.getElementById('status-toggle-smartwave').checked,
        'smartpong-io_disabled': document.getElementById('status-toggle-smartpong').checked,
        updatedAt: Date.now()
    };
    db.ref('games/shared/status').set(data).then(() => {
        statusModalOverlay.style.display = 'none';
        alert('Noodstop (Killswitches) zijn succesvol bijgewerkt en direct actief voor alle spelers.');
    }).catch(err => alert('Fout bij opslaan: ' + err));
});
