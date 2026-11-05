// Anty X 1.0.1 — adaptacja Peacekeeper (Maddonz, Barlag), moduł Gogatki.
GogatkiRuntime.register({id:"anty-x",name:"Anty X",description:"Filtr ataków PvP według relacji, poziomów i listy chronionych graczy.",start() {
    // Keep checkbox styling consistent in already installed Gogatki panels.
    const gogatkiRoot = document.querySelector('#gogatek-panel')?.shadowRoot;
    if (gogatkiRoot && !gogatkiRoot.getElementById('gogatki-anty-x-checkboxes')) {
        const checkboxStyle = document.createElement('style');
        checkboxStyle.id = 'gogatki-anty-x-checkboxes';
        checkboxStyle.textContent = "input[type=\"checkbox\"]{-webkit-appearance:none!important;appearance:none!important;box-sizing:border-box!important;position:relative!important;transform:none!important;filter:none!important;display:grid!important;place-content:center!important;width:14px!important;height:14px!important;min-width:14px!important;min-height:14px!important;flex:none!important;padding:0!important;margin:0!important;border:1px solid #668298!important;border-radius:3px!important;background:#252b31!important;background-image:none!important;box-shadow:none!important;cursor:pointer;font:12px Arial,sans-serif!important;text-shadow:none!important;-webkit-text-stroke:0!important}\ninput[type=\"checkbox\"]:checked{border-color:#668298!important;background:#252b31!important;background-image:none!important}\ninput[type=\"checkbox\"]::before{content:none!important;display:none!important}\ninput[type=\"checkbox\"]::after{content:none!important;display:none!important}\ninput[type=\"checkbox\"]:checked::after{content:'✓'!important;display:block!important;position:static!important;width:auto!important;height:auto!important;margin:0!important;padding:0!important;border:0!important;transform:none!important;background:none!important;box-shadow:none!important;color:#12c9bd!important;-webkit-text-fill-color:#12c9bd!important;-webkit-text-stroke:0!important;text-shadow:none!important;font:12px/12px Arial,sans-serif!important}\ninput[type=\"checkbox\"]:focus-visible{outline:2px solid #12c9bd;outline-offset:1px}\ninput[type=\"checkbox\"]:disabled{opacity:.45;cursor:not-allowed}\n";
        gogatkiRoot.appendChild(checkboxStyle);
    }

    const window = unsafeWindow;
(() => {
    'use strict';
    if (window.top !== window.self || window.__antyX) return;
    window.__antyX = true;
    const KEY = 'anty-x:global:v1';
    const LEGACY_KEY = 'anty-x:v1';
    const defaults = { enabled: true, showMessages: true, minLevel: '', maxLevel: '',
        attack: { clan: false, friend: false, clanFriend: false, other: true, enemy: true, clanEnemy: true },
        players: [], maps: [], hotkey: '', collapsed: false, settings: false, x: 20, y: 100 };
    // Userscript storage is shared across characters and world domains.
    let saved = GM_getValue(KEY, null);
    if (saved === null) {
        // Migrate once from the first world opened after this update.
        try { saved = JSON.parse(window.localStorage.getItem(LEGACY_KEY)) || {}; } catch { saved = {}; }
    }
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
    const config = { ...defaults, ...saved, attack: { ...defaults.attack, ...saved.attack } };
    const save = () => GM_setValue(KEY, JSON.parse(JSON.stringify(config)));
    save();
    const engine = () => window.Engine;
    const hero = () => engine()?.hero?.d || window.hero || {};
    const mapName = () => engine()?.map?.d?.name ?? window.map?.name ?? window.g?.town?.name;
    function players() {
        const list = engine()?.others?.check?.() ?? engine()?.others?.getAll?.() ?? window.g?.other ?? {};
        return Object.values(list).map(player => player?.d ?? player).filter(Boolean);
    }
    function allowed(player) {
        if (config.players.includes(player.nick)) return false;
        if (config.minLevel !== '' && !(player.lvl >= Number(config.minLevel))) return false;
        if (config.maxLevel !== '' && !(player.lvl <= Number(config.maxLevel))) return false;
        // Te same kody relacji i nakładające się warunki co w oryginale Maddonz.
        const relation = player.relation;
        const clan = hero().clan;
        const checks = { clan: relation === 4 || !!(clan && player.clan && clan.id === player.clan.id),
            friend: relation === 2, clanFriend: relation === 5, other: relation === 1 || relation === 7,
            enemy: relation === 3 || relation === 8, clanEnemy: relation === 6 };
        return Object.keys(checks).some(key => checks[key] && config.attack[key]);
    }
    function blockedTarget(request) {
        if (!config.enabled || typeof request !== 'string' || config.maps.includes(mapName())) return null;
        const params = new URLSearchParams(request.replace(/^\?/, ''));
        if (params.get('t') !== 'fight' || params.get('a') !== 'attack') {
            // _g otrzymuje zwykle „fight&a=attack”, bez parametru t.
            if (request.split('&')[0] !== 'fight' || params.get('a') !== 'attack') return null;
        }
        const id = Number(params.get('id'));
        if (!Number.isFinite(id) || id <= 0) return null;
        const entry = engine()?.others?.getById?.(id);
        const player = (entry?.d ?? entry) || window.g?.other?.[id] || players().find(other => Number(other.id) === id);
        return player && !allowed(player) ? player : null;
    }
    let lastNotice = 0;
    function notify(text) {
        status.textContent = text;
        if (config.showMessages && Date.now() - lastNotice > 1000) {
            lastNotice = Date.now();
            // Nick pozostaje tekstem także w komunikacie gry interpretującym HTML.
            const escaped = text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
            if (typeof window.message === 'function') window.message(escaped);
        }
    }
    function installHook() {
        const original = window._g;
        if (typeof original !== 'function' || original.__antyXHook) return;
        function filteredRequest(...args) {
            const target = blockedTarget(args[0]);
            if (target) { args[0] = 'fight'; notify(`Zablokowano atak na ${target.nick}`); }
            return Reflect.apply(original, this, args);
        }
        Object.defineProperty(filteredRequest, '__antyXHook', { value: true });
        window._g = filteredRequest;
    }
    function attack() {
        if (typeof window._g !== 'function') return;
        if (engine()?.battle?.isBattle?.() || window.g?.battle) return;
        const target = players().find(allowed);
        if (target) window._g(`fight&a=attack&id=${encodeURIComponent(target.id)}`);
        else status.textContent = 'Brak dozwolonego gracza.';
    }

    const host = document.createElement('div');
    host.id = 'anty-x';
    host.style.cssText = 'position:fixed;z-index:2147483646;';
    document.body.append(host);
    const root = host.attachShadow({ mode: 'open' });
    const gear = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/></svg>';
    root.innerHTML = `<style>
        :host{all:initial;color:#c7d0d9;font:12px Arial,sans-serif;--tile:28px}
        *{box-sizing:border-box} .panel{width:280px;max-width:100vw;background:#171b20;border:1px solid #668298;border-radius:4px;overflow:hidden}
        header{height:var(--tile);display:flex;align-items:center;gap:8px;padding:0 5px;background:#252b31;cursor:move;touch-action:none;user-select:none}
        strong{color:#12c9bd;flex:1}button{font:12px Arial;color:#c7d0d9;background:#38566c;border:1px solid #6d879a;border-radius:3px;cursor:pointer;min-height:23px}
        button:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid #12c9bd;outline-offset:1px}
        .gear{display:flex;align-items:center;justify-content:center;width:24px;padding:0;color:#12c9bd}
        .body,.settings{padding:8px;display:grid;gap:8px}.body{grid-template-columns:1fr auto;align-items:center}
        .settings{border-top:1px solid #668298;max-height:65vh;overflow:auto}label{display:flex;align-items:center;gap:6px}
        input,textarea{font:12px Arial;color:#c7d0d9;background:#252b31;border:1px solid #668298;border-radius:3px;padding:4px;min-width:0}
        input[type=checkbox]{appearance:none;width:14px;height:14px;padding:0;flex:none;display:grid;place-content:center}
        input[type=checkbox]:checked::after{content:'✓';color:#12c9bd;font-size:12px;line-height:12px}input[type=checkbox]::before{content:none}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.field{display:grid;gap:4px}textarea{resize:vertical;width:100%;min-height:55px}
        p{margin:0;color:#b1c0cb;font-size:11px;grid-column:1/-1} .collapsed{width:var(--tile);height:var(--tile)}
        .collapsed header{padding:0;justify-content:center}.collapsed .gear{width:100%;height:100%;border:0;background:transparent}
        [hidden]{display:none!important}
    </style><section class="panel"><header><strong>Anty X</strong><button class="gear" aria-label="Pokaż lub ukryj ustawienia" title="LPM: ustawienia · PPM: zwiń">${gear}</button></header>
    <div class="body"><label><input type="checkbox" data-key="enabled">Ochrona aktywna</label><button id="attack">Atakuj</button><p id="status" role="status">Filtr ataków PvP</p></div>
    <div class="settings" hidden><label><input type="checkbox" data-key="showMessages">Wyświetlaj wiadomości</label><div>Zezwalaj na atakowanie:</div><div class="grid" id="relations"></div>
    <div class="grid"><label class="field">Minimalny poziom<input type="number" min="1" data-key="minLevel"></label><label class="field">Maksymalny poziom<input type="number" min="1" data-key="maxLevel"></label></div>
    <label class="field">Nie atakuj graczy — nick w osobnym wierszu<textarea data-key="players"></textarea></label>
    <label class="field">Wyłącz filtr na mapach — nazwa w osobnym wierszu<textarea data-key="maps"></textarea></label>
    <label class="field">Skrót ataku — kod klawisza, np. KeyX<input data-key="hotkey" placeholder="Brak"></label><p>Skrót działa poza polami tekstowymi, bez Ctrl, Alt i Meta. PPM na znaku zakazu zwija panel.</p></div></section>`;
    const panel = root.querySelector('.panel'), header = root.querySelector('header');
    const settings = root.querySelector('.settings'), gearButton = root.querySelector('.gear');
    const status = root.querySelector('#status');
    const labels = { clan: 'Członków klanu', friend: 'Przyjaciół', clanFriend: 'Sojuszników klanu', other: 'Pozostałych', enemy: 'Wrogów', clanEnemy: 'Wrogów klanu' };
    for (const [key, text] of Object.entries(labels)) {
        const label = document.createElement('label'), input = document.createElement('input');
        input.type = 'checkbox'; input.checked = !!config.attack[key];
        input.addEventListener('change', () => { config.attack[key] = input.checked; save(); });
        label.append(input, document.createTextNode(text)); root.querySelector('#relations').append(label);
    }
    for (const input of root.querySelectorAll('[data-key]')) {
        const key = input.dataset.key;
        if (input.type === 'checkbox') input.checked = !!config[key];
        else input.value = Array.isArray(config[key]) ? config[key].join('\n') : config[key];
        input.addEventListener('change', () => {
            config[key] = input.type === 'checkbox' ? input.checked : input.tagName === 'TEXTAREA'
                ? input.value.split('\n').map(s => s.trim()).filter(Boolean) : input.value;
            save();
        });
    }
    function place() {
        const box = host.getBoundingClientRect();
        config.x = Math.max(0, Math.min(Number(config.x) || 0, innerWidth - box.width));
        config.y = Math.max(0, Math.min(Number(config.y) || 0, innerHeight - box.height));
        host.style.left = `${config.x}px`; host.style.top = `${config.y}px`;
    }
    function render(preserveRight = true) {
        // Preserve the right edge only for a user-initiated size change.
        // At startup, x/y already describe the saved collapsed/expanded state.
        const right = preserveRight ? host.getBoundingClientRect().right : null;
        const launcher = document.querySelector('#gogatek-panel')?.shadowRoot?.querySelector('.launcher');
        const height = launcher?.getBoundingClientRect().height || 28;
        host.style.setProperty('--tile', `${height}px`);
        panel.classList.toggle('collapsed', config.collapsed);
        root.querySelector('strong').hidden = config.collapsed;
        root.querySelector('.body').hidden = config.collapsed;
        settings.hidden = config.collapsed || !config.settings;
        gearButton.setAttribute('aria-expanded', String(!settings.hidden));
        if (right !== null) config.x = right - host.getBoundingClientRect().width;
        place(); save();
    }
    gearButton.addEventListener('click', () => {
        if (config.collapsed) config.collapsed = false;
        else config.settings = !config.settings;
        render();
    });
    gearButton.addEventListener('contextmenu', event => { event.preventDefault(); config.collapsed = true; render(); });
    root.querySelector('#attack').addEventListener('click', attack);
    let drag;
    header.addEventListener('pointerdown', event => {
        if (event.button !== 0 || event.target.closest('button')) return;
        drag = { x: event.clientX - config.x, y: event.clientY - config.y };
        header.setPointerCapture(event.pointerId);
    });
    header.addEventListener('pointermove', event => {
        if (!drag) return;
        config.x = event.clientX - drag.x; config.y = event.clientY - drag.y; place();
    });
    const endDrag = () => { drag = null; save(); };
    header.addEventListener('pointerup', endDrag); header.addEventListener('pointercancel', endDrag);
    window.addEventListener('resize', () => { place(); save(); });
    document.addEventListener('keydown', event => {
        if (!config.hotkey || event.code !== config.hotkey || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
        if (event.composedPath().some(el => el instanceof HTMLElement && (el.matches('input,textarea,select') || el.isContentEditable))) return;
        event.preventDefault(); attack();
    });
    render(false); installHook();
    // Ponowne podpięcie, jeżeli gra lub inny dodatek zastąpi _g po uruchomieniu.
    setInterval(installHook, 1000);
})();
}});

