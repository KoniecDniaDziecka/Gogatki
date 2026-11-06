// PVP Info 1.0.6 — samodzielna adaptacja modułu Maddonz (Barlag).
GogatkiRuntime.register({id:"pvp-info",name:"PVP Info",description:"Powiadomienia o walkach PvP i ich wynikach na czacie klanowym.",start() {
    // Keep checkbox styling consistent in already installed Gogatki panels.
    const gogatkiRoot = document.querySelector('#gogatek-panel')?.shadowRoot;
    if (gogatkiRoot && !gogatkiRoot.getElementById('gogatki-anty-x-checkboxes')) {
        const checkboxStyle = document.createElement('style');
        checkboxStyle.id = 'gogatki-anty-x-checkboxes';
        checkboxStyle.textContent = "input[type=\"checkbox\"]{-webkit-appearance:none!important;appearance:none!important;box-sizing:border-box!important;position:relative!important;transform:none!important;filter:none!important;display:grid!important;place-content:center!important;width:14px!important;height:14px!important;min-width:14px!important;min-height:14px!important;flex:none!important;padding:0!important;margin:0!important;border:1px solid #668298!important;border-radius:3px!important;background:#252b31!important;background-image:none!important;box-shadow:none!important;cursor:pointer;font:12px Arial,sans-serif!important;text-shadow:none!important;-webkit-text-stroke:0!important}\ninput[type=\"checkbox\"]:checked{border-color:#668298!important;background:#252b31!important;background-image:none!important}\ninput[type=\"checkbox\"]::before{content:none!important;display:none!important}\ninput[type=\"checkbox\"]::after{content:none!important;display:none!important}\ninput[type=\"checkbox\"]:checked::after{content:'✓'!important;display:block!important;position:static!important;width:auto!important;height:auto!important;margin:0!important;padding:0!important;border:0!important;transform:none!important;background:none!important;box-shadow:none!important;color:#12c9bd!important;-webkit-text-fill-color:#12c9bd!important;-webkit-text-stroke:0!important;text-shadow:none!important;font:12px/12px Arial,sans-serif!important}\ninput[type=\"checkbox\"]:focus-visible{outline:2px solid #12c9bd;outline-offset:1px}\ninput[type=\"checkbox\"]:disabled{opacity:.45;cursor:not-allowed}\n";
        gogatkiRoot.appendChild(checkboxStyle);
    }

(function () {
    'use strict';
    const defaults = { attacker: true, attacked: true, group: true,
        extendedTeamInfo: true, extendedEnemyInfo: true, fightResult: true,
        compact: false, right: 24, top: 150 };

    // Independent state machine, also exercised by the local tests.
    function createNotifier(context, settings, send) {
        let battle = null;
        function handleFight(f) {
            if (!f || typeof f !== 'object') return;
            const c = context(), cfg = settings();
            if (f.init && !f.endBattle && !battle) {
                const warriors = Object.entries(f.w || {}).map(([id, w]) => ({ ...w, id: w.id ?? id }));
                const team = Number(f.myteam);
                const eligible = c.hero?.clan && Number(c.map?.pvp) === 2 &&
                    warriors.length >= 2 && !warriors.some(w => Number(w.npc)) &&
                    (warriors.length <= 2 || cfg.group) &&
                    (team === 1 && cfg.attacker || team === 2 && cfg.attacked);
                battle = { character: c.character, reported: false, result: null, nick: c.hero?.nick };
                if (eligible) {
                    let message = 'Walka ';
                    const describe = w => `${w.name ?? w.nick ?? '?'} (${w.lvl ?? '?'}${w.prof ?? ''})`;
                    if (warriors.length > 2) {
                        const own = warriors.filter(w => Number(w.team) === team).length;
                        message += `grupowa (${own} vs ${warriors.length - own})`;
                    } else {
                        const enemy = warriors.find(w => String(w.id) !== String(c.hero.id));
                        if (!enemy) return;
                        const hero = describe({ ...c.hero, name: c.hero.nick });
                        message += team === 1 ? `pomiędzy ${hero} a ${describe(enemy)}` : `pomiędzy ${describe(enemy)} a ${hero}`;
                    }
                    send(`${message} na mapie ${c.map.name ?? '?'} (${c.hero.x},${c.hero.y})`);
                    if (warriors.length > 2) {
                        for (const [option, own, label] of [['extendedTeamInfo', true, 'Moja drużyna: '], ['extendedEnemyInfo', false, 'Przeciwnicy: ']]) {
                            if (cfg[option]) send((label + warriors.filter(w => (Number(w.team) === team) === own).map(describe).join(', ')).slice(0, 300));
                        }
                    }
                    battle.reported = !!cfg.fightResult;
                }
            }
            if (battle?.reported && c.character === battle.character && Array.isArray(f.m)) {
                const winner = f.m.find(line => typeof line === 'string' && /winner=/.test(line));
                // Ordinary combat rounds must not overwrite an already known winner.
                if (winner) {
                    const value = winner.slice(winner.indexOf('winner=') + 7).split(/[;\n]/)[0];
                    battle.result = value.startsWith('?') ? 'Walka przerwana!' :
                        value.split(',').some(name => name.trim() === battle.nick) ? 'Walka wygrana!' : 'Walka przegrana!';
                }
                if (f.endBattle && !battle.result) battle.result = 'Walka przerwana!';
            }
        }
        function close() {
            const previous = battle;
            battle = null;
            const c = context();
            if (previous?.reported && previous.result && settings().fightResult &&
                c.character === previous.character && c.hero?.clan) send(previous.result);
        }
        return { handleFight, close, reset() { battle = null; } };
    }
    if (typeof module === 'object' && module.exports) { module.exports = { createNotifier, defaults }; return; }
    const win = unsafeWindow;
    const world = /^([a-z0-9-]+)\.margonem\.(pl|com)$/.exec(win.location.hostname)?.[1];
    if (win.top !== win.self || !world || ['www', 'forum', 'commons', 'new'].includes(world)) return;
    if (win.__pvpClanNotificator) return;
    win.__pvpClanNotificator = true;
    const context = () => {
        const hero = win.Engine?.hero?.d ?? win.hero;
        return { hero, map: win.Engine?.map?.d ?? win.map,
            character: `${win.location.hostname}:${hero?.id ?? ''}` };
    };
    let character, config, panel, status, queue = [], lastSent = 0;
    const key = () => 'pvp-clan-notificator:global:v1';
    const save = () => GM_setValue(key(), { ...config });
    function say(text) { if (status) status.textContent = text; }
    function syncCharacter() {
        const c = context();
        if (!c.hero?.id) return false;
        if (character !== c.character) {
            character = c.character;
            let stored;
            try {
                stored = GM_getValue(key(), null);
                // Migrate once from the first character opened after updating.
                if (stored === null) stored = GM_getValue(`pvp-clan-notificator:v1:${character}`, {});
            } catch { stored = {}; }
            config = { ...defaults };
            if (stored && typeof stored === 'object') {
                for (const field of Object.keys(defaults)) {
                    if (typeof defaults[field] === 'boolean' && typeof stored[field] === 'boolean') config[field] = stored[field];
                    if (typeof defaults[field] === 'number' && Number.isFinite(stored[field])) config[field] = stored[field];
                }
            }
            save();
            queue = []; notifier.reset();
            if (panel) render();
        }
        return true;
    }
    const notifier = createNotifier(context, () => config, text => queue.push({ text, character, time: Date.now() }));
    function receive(data) {
        try {
            if (!syncCharacter() || !data || typeof data !== 'object') return;
            if (data.f) notifier.handleFight(data.f);
        } catch (error) { console.error('[PVP Info]', error); say('Błąd odczytu walki.'); }
    }
    const wrapped = new WeakSet();
    function hook(object, method, after) {
        const original = object?.[method];
        if (typeof original !== 'function' || wrapped.has(original)) return false;
        function wrapper(...args) {
            const result = Reflect.apply(original, this, args);
            try { after(args); } catch (error) { console.error('[PVP Info]', error); }
            return result;
        }
        wrapped.add(wrapper);
        object[method] = wrapper;
        return true;
    }
    function installHooks() {
        if (win.Engine?.communication) {
            hook(win.Engine.communication, 'parseJSON', args => receive(args[0]));
            hook(win.Engine.battle, 'close', () => { syncCharacter(); notifier.close(); });
        } else {
            hook(win, 'parseInput', args => receive(args[0]));
            hook(win, 'closeBattle', () => { syncCharacter(); notifier.close(); });
        }
    }
    function flush() {
        if (!queue.length || Date.now() - lastSent < 1500) return;
        const entry = queue[0], c = context();
        if (entry.character !== c.character || !c.hero?.clan || Date.now() - entry.time > 30000) { queue.shift(); return; }
        if (typeof win._g !== 'function' || win.g?.logoff?.start || win.Engine?.lock?.check?.('logoff')) return;
        queue.shift(); lastSent = Date.now();
        try { win._g('chat&channel=clan', false, { c: entry.text }); say('Przekazano wiadomość na czat klanowy.'); }
        catch (error) { console.error('[PVP Info]', error); say('Nie udało się wysłać wiadomości.'); }
    }
    function tileHeight() {
        return 28; // Independent of the main Gogatki launcher size.
    }
    function position() {
        if (window.__gogatkiTileDock?.isDocked(panel)) return;
        // Reserve expanded width so toggling never shifts the right-hand anchor.
        const width = Math.min(280, win.innerWidth - 8);
        config.right = Math.max(0, Math.min(config.right, Math.max(0, win.innerWidth - width)));
        config.top = Math.max(0, Math.min(config.top, Math.max(0, win.innerHeight - (panel.getBoundingClientRect().height || tileHeight()))));
        panel.style.right = `${config.right}px`; panel.style.top = `${config.top}px`;
    }
    function render() {
        const root = panel.shadowRoot;
        root.querySelector('main').hidden = config.compact;
        panel.dataset.compact = String(config.compact);
        panel.style.setProperty('--tile-height', `${tileHeight()}px`);
        root.querySelector('b').hidden = config.compact;
        panel.style.width = config.compact ? `${tileHeight()}px` : '280px';
        for (const input of root.querySelectorAll('input')) input.checked = config[input.dataset.key];
        root.querySelector('[data-settings]').setAttribute('aria-expanded', String(!config.compact));
        root.querySelector('[data-settings]').title = config.compact ? 'Rozwiń PVP Info' : 'Zminimalizuj PVP Info';
        say('Aktywny — oczekiwanie na PvP.');
        position();
    }
    function mount() {
        panel = document.createElement('div'); panel.id = 'pvp-clan-notificator';
        panel.style.cssText = 'position:fixed;z-index:2147483646;width:280px;max-width:calc(100vw - 8px)';
        const root = panel.attachShadow({ mode: 'open' });
        root.innerHTML = `<style>
            :host{all:initial;color:#dce6ee;font:12px/1.4 Arial,sans-serif}*{box-sizing:border-box;font:inherit}
            section{background:#171b20;border:1px solid #668298;border-radius:4px;overflow:hidden;box-shadow:0 6px 22px #0009}
            header{display:flex;align-items:center;gap:6px;min-height:30px;padding:3px 5px;background:#252b31;cursor:move;touch-action:none}
            b{flex:1;font-weight:600;color:#12c9bd}button{color:#12c9bd;background:none;border:0;cursor:pointer;padding:2px;display:flex;align-items:center;justify-content:center;width:24px;height:24px;flex-shrink:0}button svg{display:block;width:18px;height:18px;pointer-events:none}
            :host([data-compact="true"]) section{height:var(--tile-height)}
            :host([data-compact="true"]) header{height:100%;min-height:0;padding:0;gap:0;justify-content:center}
            :host([data-compact="true"]) button{width:100%;height:100%;padding:0}
            main{padding:8px;max-height:70vh;overflow:auto}label{display:flex;align-items:center;gap:6px;margin:6px 0}
            input{accent-color:#12c9bd;width:14px;height:14px;margin:0;cursor:pointer}p{margin:8px 0 4px;color:#b1c0cb}
            [hidden]{display:none!important}small{display:block;color:#b1c0cb;font-size:11px;margin-top:8px}
            :focus-visible{outline:2px solid #12c9bd;outline-offset:2px}
        input[type="checkbox"]{-webkit-appearance:none!important;appearance:none!important;box-sizing:border-box!important;position:relative!important;transform:none!important;filter:none!important;display:grid!important;place-content:center!important;width:14px!important;height:14px!important;min-width:14px!important;min-height:14px!important;flex:none!important;padding:0!important;margin:0!important;border:1px solid #668298!important;border-radius:3px!important;background:#252b31!important;background-image:none!important;box-shadow:none!important;cursor:pointer;font:12px Arial,sans-serif!important;text-shadow:none!important;-webkit-text-stroke:0!important}
input[type="checkbox"]:checked{border-color:#668298!important;background:#252b31!important;background-image:none!important}
input[type="checkbox"]::before{content:none!important;display:none!important}
input[type="checkbox"]::after{content:none!important;display:none!important}
input[type="checkbox"]:checked::after{content:'✓'!important;display:block!important;position:static!important;width:auto!important;height:auto!important;margin:0!important;padding:0!important;border:0!important;transform:none!important;background:none!important;box-shadow:none!important;color:#12c9bd!important;-webkit-text-fill-color:#12c9bd!important;-webkit-text-stroke:0!important;text-shadow:none!important;font:12px/12px Arial,sans-serif!important}
input[type="checkbox"]:focus-visible{outline:2px solid #12c9bd;outline-offset:1px}
input[type="checkbox"]:disabled{opacity:.45;cursor:not-allowed}
</style><section><header><b>PVP Info</b><button data-settings title="Zminimalizuj PVP Info" aria-label="Zwiń lub rozwiń PVP Info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 3 4 1 11 12-3 3L4 7Z M14 17l6-6 M17 17l4 4 M19 22l3-3"/><path d="m20 3-4 1L5 16l3 3L20 7Z M10 17l-6-6 M7 17l-4 4 M5 22l-3-3"/></svg></button></header>
        <main><p>Wysyłaj powiadomienia gdy:</p>
        ${[['attacker','Atakujesz przeciwnika'],['attacked','Jesteś atakowany'],['group','Walki grupowe']].map(([id,label]) => `<label><input type="checkbox" data-key="${id}">${label}</label>`).join('')}
        <p>Dodatkowe informacje:</p>
        ${[['extendedTeamInfo','Skład swojej drużyny'],['extendedEnemyInfo','Skład przeciwników'],['fightResult','Wynik po zamknięciu walki']].map(([id,label]) => `<label><input type="checkbox" data-key="${id}">${label}</label>`).join('')}
        <small>Składy drużyn dotyczą walk grupowych. Powiadomienia trafiają na czat klanowy na czerwonych mapach PvP.</small><small role="status"></small></main></section>`;
        status = root.querySelector('[role=status]');
        root.addEventListener('change', event => {
            const field = event.target.dataset.key;
            if (!Object.hasOwn(defaults, field)) return;
            config[field] = event.target.checked;
            save(); render();
        });
        const button = root.querySelector('[data-settings]');
        button.onclick = () => { config.compact = !config.compact; save(); render(); };
        button.oncontextmenu = event => { event.preventDefault(); config.compact = !config.compact; save(); render(); };
        const header = root.querySelector('header'); let drag;
        header.onpointerdown = event => {
            if (event.button !== 0 || event.target.closest('button,input,label')) return;
            drag = { x: event.clientX, y: event.clientY, right: config.right, top: config.top };
            header.setPointerCapture(event.pointerId); event.preventDefault();
        };
        header.onpointermove = event => { if (drag) { config.right = drag.right + drag.x - event.clientX; config.top = drag.top + event.clientY - drag.y; position(); } };
        header.onpointerup = header.onpointercancel = () => { if (drag) { drag = null; save(); } };
        win.addEventListener('resize', position);
        document.body.appendChild(panel); render();
    }
    function tick() {
        if (!syncCharacter()) return;
        installHooks();
        if (!panel && document.body) mount();
        flush();
    }
    setInterval(tick, 250); tick();
})();
}});



