GogatkiRuntime.register({id:"lootfilter",name:"Lootfilter",description:"Filtry \u0142upu po walce",start() {
    const window = unsafeWindow;
    const tile = document.querySelector('#gogatek-panel')?.shadowRoot?.querySelector('.launcher');
    const tileHeight = tile?.getBoundingClientRect().height || 28;
    const tileStyle = document.createElement('style');
    tileStyle.textContent = ":root #standalone-loot-filter[data-compact=\"true\"]{box-sizing:border-box;height:__TILE_HEIGHT__;min-height:0}:root #standalone-loot-filter[data-compact=\"true\"] header{box-sizing:border-box;height:calc(__TILE_HEIGHT__ - 2px);min-height:0;align-items:center}:root #standalone-loot-filter[data-compact=\"true\"] header button{min-height:0}:root #standalone-loot-filter{color:#dbe5ec}\n:root #standalone-loot-filter label,:root #standalone-loot-filter .slot-label{color:#b8c7d1}\n:root #standalone-loot-filter legend,:root #standalone-loot-filter strong,:root #standalone-loot-filter header b{color:#e4edf3}\n:root #standalone-loot-filter small{color:#9aadb9}\n:root #standalone-loot-filter input:not([type=\"checkbox\"]),:root #standalone-loot-filter select,:root #standalone-loot-filter textarea{color:#dbe5ec}\n:root #standalone-loot-filter input::placeholder,:root #standalone-loot-filter textarea::placeholder{color:#8fa2b0;opacity:1}\n:root #standalone-loot-filter button{color:#dbe5ec}\n:root #standalone-loot-filter header button:has(svg),:root #standalone-loot-filter button:has(svg){display:inline-flex;align-items:center;justify-content:center;color:#12c9bd}\n:root #standalone-loot-filter [aria-label^=\"Uchwyt\"]{color:#9aadb9!important}\n:root #standalone-loot-filter button svg{display:block;max-width:100%;max-height:100%;flex-shrink:0}\n:root #standalone-fullmetal [data-status]{color:#9aadb9}\n:root #standalone-fullmetal [data-usage]{color:#b8c7d1}\n:root #e2-caller-panel .e2-ide{color:#12c9bd}\n:root #standalone-loot-filter input[type=\"checkbox\"]{-webkit-appearance:none!important;appearance:none!important;box-sizing:border-box!important;display:inline-block!important;position:relative;transform:none!important;filter:none!important;width:14px!important;height:14px!important;min-width:14px;min-height:14px;flex-shrink:0;padding:0!important;margin:0!important;vertical-align:middle;border:1px solid #668298!important;border-radius:3px!important;background:#171719!important;background-image:none!important;cursor:pointer;box-shadow:none!important}\n:root #standalone-loot-filter input[type=\"checkbox\"]:checked{border-color:#12c9bd!important;background-color:#173838!important;background-image:url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22none%22%20stroke%3D%22%2312c9bd%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m3.5%208%203%203%206-6%22%2F%3E%3C%2Fsvg%3E\")!important;background-position:center!important;background-repeat:no-repeat!important;background-size:12px 12px!important}\n:root #standalone-loot-filter input[type=\"checkbox\"]:hover:not(:disabled){border-color:#12c9bd!important}\n:root #standalone-loot-filter input[type=\"checkbox\"]:focus-visible{outline:2px solid #12c9bd;outline-offset:2px}\n:root #standalone-loot-filter input[type=\"checkbox\"]:disabled{opacity:.45;cursor:not-allowed}\n@media(forced-colors:active){:root #standalone-loot-filter input[type=\"checkbox\"]{appearance:auto!important;background:none!important}}\n\n:root #standalone-loot-filter input[type=\"checkbox\"]::before,:root #standalone-loot-filter input[type=\"checkbox\"]::after{content:none!important;display:none!important}\n:root #standalone-loot-filter label:has(>input[type=\"checkbox\"]){display:flex!important;align-items:center;gap:6px;line-height:1.4}\n:root #standalone-loot-filter[data-compact=\"true\"] header label:has(>input[type=\"checkbox\"]){display:contents!important}".replaceAll('__TILE_HEIGHT__', tileHeight + 'px');
    document.head.appendChild(tileStyle);
    // Centre the existing panel grip without replacing its button or event handlers.
    const panelGrip = document.querySelector('#gogatek-panel')?.shadowRoot?.querySelector('.move');
    if (panelGrip && !panelGrip.dataset.gogatkiCentered) {
        const width = panelGrip.getBoundingClientRect().width;
        panelGrip.innerHTML = "<svg viewBox=\"0 0 12 18\" width=\"10\" height=\"16\" aria-hidden=\"true\" focusable=\"false\" style=\"display:block;pointer-events:none;flex-shrink:0;fill:currentColor\"><circle cx=\"4\" cy=\"4\" r=\"1\"/><circle cx=\"8\" cy=\"4\" r=\"1\"/><circle cx=\"4\" cy=\"9\" r=\"1\"/><circle cx=\"8\" cy=\"9\" r=\"1\"/><circle cx=\"4\" cy=\"14\" r=\"1\"/><circle cx=\"8\" cy=\"14\" r=\"1\"/></svg>";
        Object.assign(panelGrip.style, {display:'flex', alignItems:'center', justifyContent:'center',
            width:width + 'px', height:tileHeight + 'px', padding:'0', boxSizing:'border-box'});
        panelGrip.dataset.gogatkiCentered = 'true';
    }
(function () {
    'use strict';
    const defaults = () => ({ enabled: true, autoAccept: 'off', common: true, unique: true,
        heroic: 'all', legendary: 'all', ammo: 'all', neutral: true, rune: true, gold: true,
        teleport: true, talisman: true, key: true, bag: true, minPrice: '', minHealing: '',
        groupLegendary: false, negation: false, whiteList: [], blackList: [], customLogic: '',
        left: 24, right: null, top: 200, settingsOpen: false });
    function normalize(item, id) {
        const stats = Object.fromEntries(String(item.stat || '').split(';').filter(Boolean).map(part => {
            const index = part.indexOf('=');
            return index < 0 ? [part, true] : [part.slice(0, index), part.slice(index + 1)];
        }));
        return { ...item, id: String(item.id ?? id), cl: +item.cl,
            _cachedStats: { rarity: 'common', ...stats, ...item._cachedStats } };
    }
    const listed = (list, name) => list.some(value => value.trim() && String(name || '').toLowerCase().includes(value.trim().toLowerCase()));
    function decision(item, config, context, items) {
        const stats = item._cachedStats;
        const take = value => value ? (context.party ? 'must' : 'want') : 'not';
        const invert = value => config.negation ? !value : value;
        const prof = !('reqp' in stats) || String(stats.reqp).includes(context.prof);
        const mode = key => config[key] === 'all' || (config[key] === 'prof' && invert(prof));
        if (listed(config.whiteList, item.name)) return take(true);
        if (listed(config.blackList, item.name)) return take(false);
        if (config.customLogic.trim()) {
            // Code entered explicitly by the user in the advanced settings.
            const result = Function('item', 'stats', 'items', config.customLogic)(item, stats, items);
            if (result === 'want' || result === 'not') return take(result === 'want');
        }
        if (context.party && config.groupLegendary && items.some(value => value._cachedStats.rarity === 'legendary')) {
            return take(stats.rarity === 'legendary');
        }
        if (config.minPrice !== '' && 'pr' in item && invert(+item.pr >= +config.minPrice)) return take(!config.negation);
        const healing = item.leczy ?? item.fullheal;
        if (config.minHealing !== '' && healing != null && invert(+healing >= +config.minHealing)) return take(!config.negation);
        const selected = (config.neutral && item.cl === 15) || (config.rune && 'runes' in stats) ||
            (config.gold && 'gold' in stats) || (config.teleport && item.cl === 32) ||
            (config.talisman && item.cl === 22) || (config.key && item.cl === 18) ||
            (config.bag && item.cl === 24) || (config.common && stats.rarity === 'common') ||
            (config.unique && stats.rarity === 'unique') || (stats.rarity === 'heroic' && mode('heroic')) ||
            (stats.rarity === 'legendary' && mode('legendary')) || (item.cl === 29 && mode('ammo'));
        return take(selected ? !config.negation : config.negation);
    }
    function plan(items, config, context) {
        const decisions = Object.fromEntries(items.map(item => [item.id, decision(item, config, context, items)]));
        const count = Object.values(decisions).filter(value => value !== 'not').length;
        const auto = config.autoAccept === 'always' || config.autoAccept === (context.party ? 'grp' : 'solo');
        return { decisions, finalize: auto && Number.isFinite(context.free) && count <= context.free &&
            !items.some(item => item._cachedStats.rarity === 'legendary') };
    }
    function freeSlots(bags) {
        if (!Array.isArray(bags) || bags.length < 3) return null;
        const first = bags.slice(0, 3);
        if (first.some(bag => !Array.isArray(bag) || bag[0] == null || bag[1] == null || !Number.isFinite(+bag[0]) || !Number.isFinite(+bag[1]))) return null;
        return first.reduce((sum, bag) => sum + Math.max(0, +bag[0] - +bag[1]), 0);
    }
    function applyPlan(win, result) {
        if (win.Engine) {
            const loots = win.Engine.loots;
            if (result.finalize) {
                if (typeof loots?.finalize !== 'function') throw Error('Gra nie udostępnia zatwierdzania łupu.');
                loots.finalize(result.decisions);
            } else {
                if (typeof loots?.lootUrl !== 'function' || typeof win._g !== 'function') throw Error('Gra nie udostępnia wyboru łupu.');
                win._g('loot' + loots.lootUrl(result.decisions) + '&final=0');
            }
        } else {
            const groups = { want: [], not: [], must: [] };
            for (const [id, value] of Object.entries(result.decisions)) groups[value].push(+id);
            if (result.finalize) {
                if (typeof win.sendLoots !== 'function') throw Error('Gra nie udostępnia zatwierdzania łupu.');
                win.g.loots = { ...win.g.loots, ...groups };
                win.sendLoots(1, false);
            } else {
                if (typeof win._g !== 'function') throw Error('Gra nie udostępnia wyboru łupu.');
                win._g('loot' + Object.entries(groups).map(([key, ids]) => '&' + key + '=' + ids.join(',')).join('') + '&final=0');
            }
        }
    }
    function hookParser(owner, name, onLoot) {
        const original = owner[name];
        if (typeof original !== 'function') return false;
        owner[name] = function (...args) {
            const data = args[0];
            // Copy before the game's parser can consume or modify the response.
            const loot = data?.loot;
            const snapshot = loot?.init && loot.source === 'fight' && data.item ?
                Object.entries(data.item).filter(([, item]) => item && !item.del && item.loc === 'l')
                    .map(([id, item]) => normalize(item, id)) : null;
            const result = original.apply(this, args);
            if (snapshot?.length) onLoot(snapshot);
            return result;
        };
        return true;
    }
    const core = { defaults, normalize, decision, plan, freeSlots, applyPlan, hookParser };
    if (typeof module === 'object' && module.exports) { module.exports = core; return; }
    const game = typeof unsafeWindow === 'undefined' ? window : unsafeWindow;
    if (window.top !== window.self || game.__lootFilterStandalone) return;
    game.__lootFilterStandalone = true;
    const hero = () => game.Engine?.hero?.d || game.hero;
    const storageKey = 'loot-filter-settings-v1';
    let config, panel, status, stopped = false, latest = [], generation = 0;
    let lastIds = new Set();
    const context = () => ({ prof: hero()?.prof || '',
        party: game.Engine ? !!game.Engine.party?.getMembers?.()?.size : !!Object.keys(game.g?.party || {}).length,
        free: freeSlots(game.Engine?.bags || game.g?.bags) });
    const say = text => { status.textContent = text; };
    function save() { GM_setValue(storageKey, config); }
    function processLoot(items) {
        if (stopped || !config.enabled) return;
        const ids = new Set(items.map(item => item.id));
        if ([...ids].some(id => lastIds.has(id))) return;
        lastIds = ids;
        latest = items;
        const version = generation;
        queueMicrotask(() => {
            if (stopped || version !== generation || !config.enabled) return;
            try {
                const result = plan(items, config, context());
                applyPlan(game, result);
                const count = Object.values(result.decisions).filter(value => value !== 'not').length;
                say(`${result.finalize ? 'Zatwierdzono' : 'Wybrano'}: ${count} / ${items.length} przedmiotów.`);
            } catch (error) {
                config.enabled = false; generation++;
                panel.querySelector('[data-enabled]').checked = false;
                save(); say(error.message); console.error('[LootFilter]', error);
            }
        });
    }
    function boot() {
        const owner = game.Engine?.communication || game;
        const parser = game.Engine ? 'parseJSON' : 'parseInput';
        if (!document.body || !hero()?.id || typeof owner[parser] !== 'function') return false;
        let saved = GM_getValue(storageKey, null);
        if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
            // Migrate the current character once; all characters then share GM storage.
            try { saved = JSON.parse(localStorage.getItem(`loot-filter-v1:${location.hostname}:${hero()?.id}`) || '{}'); }
            catch { saved = {}; }
        }
        config = { ...defaults(), ...saved };
        for (const list of ['whiteList', 'blackList']) if (!Array.isArray(config[list])) config[list] = [];
        save();
        panel = document.createElement('section'); panel.id = 'standalone-loot-filter';
        panel.innerHTML = `<header><label><input type="checkbox" data-enabled> <span data-name title="Lootfilter">LootFilter</span></label><button type="button" data-settings title="Ustawienia" aria-label="Ustawienia Lootfiltera"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" style="display:block;pointer-events:none;flex-shrink:0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12.00,4.20 13.95,2.19 15.83,2.76 16.33,5.51 17.52,6.48 20.31,6.44 21.24,8.17 19.65,10.48 19.80,12.00 21.81,13.95 21.24,15.83 18.49,16.33 17.52,17.52 17.56,20.31 15.83,21.24 13.52,19.65 12.00,19.80 10.05,21.81 8.17,21.24 7.67,18.49 6.48,17.52 3.69,17.56 2.76,15.83 4.35,13.52 4.20,12.00 2.19,10.05 2.76,8.17 5.51,7.67 6.48,6.48 6.44,3.69 8.17,2.76 10.48,4.35"/><circle cx="12" cy="12" r="3"/></svg></button></header>
            <main hidden><div data-filters></div><div data-modes></div>
            <label>Minimalna cena <input type="number" min="0" data-minPrice placeholder="Bez progu"></label>
            <label>Minimalne leczenie <input type="number" min="0" data-minHealing placeholder="Bez progu"></label>
            <label>Autozatwierdzanie <select data-autoAccept><option value="off">Wyłączone</option><option value="solo">Tylko solo</option><option value="grp">Tylko grupa</option><option value="always">Zawsze</option></select></label>
            <small>Przy legendzie lub braku miejsca łup czeka na ręczne zatwierdzenie.</small>
            <label>Zawsze zbieraj (fragment nazwy, jeden na wiersz)<textarea data-whiteList rows="3"></textarea></label>
            <label>Nigdy nie zbieraj (fragment nazwy, jeden na wiersz)<textarea data-blackList rows="3"></textarea></label>
            <details><summary>Zaawansowane</summary><label>Kod reguły JavaScript<textarea data-customLogic rows="4" placeholder="return stats.rarity === 'unique' ? 'want' : null;"></textarea></label><small>Dostępne: item, stats, items. Zwróć 'want', 'not' albo null.</small></details>
            <button type="button" data-test>Podgląd ostatniego łupu</button><pre data-preview></pre></main><footer data-status>Gotowy — oczekiwanie na łup po walce.</footer>`;
        const style = document.createElement('style');
        style.textContent = `#standalone-loot-filter{position:fixed;width:260px;max-width:95vw;z-index:99999;background:#171719ed;color:#eee;border:1px solid #668298;border-radius:4px;font:12px/1.3 Arial;box-shadow:0 6px 22px #0009}#standalone-loot-filter *{box-sizing:border-box}#standalone-loot-filter header{display:flex;justify-content:space-between;align-items:center;padding:4px 8px;background:#25272a;cursor:move;touch-action:none}#standalone-loot-filter label{display:block;margin:5px 0}#standalone-loot-filter main{padding:8px;max-height:70vh;overflow:auto}#standalone-loot-filter [hidden]{display:none!important}#standalone-loot-filter input[type=number],#standalone-loot-filter select,#standalone-loot-filter textarea{width:100%;background:#0e1821;color:#eee;border:1px solid #60788b;padding:4px}#standalone-loot-filter button{background:#38566c;color:white;border:1px solid #6d879a;border-radius:3px;cursor:pointer}#standalone-loot-filter [data-filters]{display:grid;grid-template-columns:1fr 1fr}#standalone-loot-filter small{display:block;color:#aaa}#standalone-loot-filter footer{padding:5px 8px;color:#12c9bd}#standalone-loot-filter pre{white-space:pre-wrap;overflow-wrap:anywhere}`;
        style.textContent += `#standalone-loot-filter[data-compact="true"]{width:70px;box-sizing:border-box}#standalone-loot-filter[data-compact="true"] header{display:grid;grid-template-columns:17px 1fr 17px;height:22px;padding:1px 3px;gap:2px;border-radius:4px}#standalone-loot-filter[data-compact="true"] header label{display:contents}#standalone-loot-filter[data-compact="true"] header input{margin:0;width:12px;height:12px;justify-self:center}#standalone-loot-filter[data-compact="true"] header button{width:17px;height:18px;padding:0;font-size:12px}#standalone-loot-filter[data-compact="true"] footer{display:none}`;
        style.textContent += `#standalone-loot-filter input[type=checkbox]{accent-color:#21bd69}#standalone-loot-filter header button{background:none;border:0;color:#eee}`;
        style.textContent += `#standalone-loot-filter[data-compact="true"] [data-name]{display:flex;align-items:center;justify-content:center;text-align:center;line-height:18px;font-size:16px;color:#12c9bd;white-space:nowrap}`;
        document.head.append(style); document.body.append(panel);
        status = panel.querySelector('[data-status]');
        const filters = [['common','Zwykłe'],['unique','Unikatowe'],['neutral','Neutralne'],['rune','Runy'],['gold','Złoto'],['teleport','Teleporty'],['talisman','Talizmany'],['key','Klucze'],['bag','Torby'],['groupLegendary','Tylko legenda w grupie'],['negation','Odwróć filtry']];
        for (const [field, title] of filters) {
            const label = document.createElement('label');
            const input = document.createElement('input'); input.type = 'checkbox'; input.dataset.field = field;
            label.append(input, ' ' + title); panel.querySelector('[data-filters]').append(label);
        }
        for (const [field, title] of [['heroic','Heroiczne'],['legendary','Legendarne'],['ammo','Strzały']]) {
            const label = document.createElement('label'); label.append(title + ' ');
            const select = document.createElement('select'); select.dataset.field = field;
            for (const [value, text] of [['all','Wszystkie'],['prof','Na profesję'],['off','Nie zbieraj']]) {
                const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option);
            }
            label.append(select); panel.querySelector('[data-modes]').append(label);
        }
        for (const field of ['enabled','minPrice','minHealing','autoAccept','whiteList','blackList','customLogic']) {
            panel.querySelector(`[data-${field}]`).dataset.field = field;
        }
        for (const input of panel.querySelectorAll('[data-field]')) {
            const field = input.dataset.field;
            if (input.type === 'checkbox') input.checked = !!config[field];
            else input.value = Array.isArray(config[field]) ? config[field].join('\n') : config[field];
            input.onchange = () => {
                generation++;
                config[field] = input.type === 'checkbox' ? input.checked :
                    ['whiteList','blackList'].includes(field) ? input.value.split('\n').map(value => value.trim()).filter(Boolean) : input.value;
                if (input.type === 'number' && input.value !== '') config[field] = Math.max(0, +input.value || 0);
                save(); say(config.enabled ? 'Filtry zapisane — dotyczą kolejnego łupu.' : 'LootFilter wyłączony.');
            };
        }
        const main = panel.querySelector('main');
        const settingsButton = panel.querySelector('[data-settings]');
        function settingsVisibility() {
            main.hidden = !config.settingsOpen;
            const name = panel.querySelector('[data-name]');
            if (config.settingsOpen) {
                name.textContent = 'LootFilter';
                name.removeAttribute('role'); name.removeAttribute('aria-label');
            } else {
                name.innerHTML = "<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" aria-hidden=\"true\" focusable=\"false\" style=\"display:block;pointer-events:none;flex-shrink:0\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m8 3 2 4h4l2-4H8ZM8 8h8M9 8c-2 3-5 5-5 9a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4c0-4-3-6-5-9\"/><circle cx=\"12\" cy=\"15.5\" r=\"2.5\"/></svg>";
                name.setAttribute('role', 'img'); name.setAttribute('aria-label', 'Lootfilter');
            }
            panel.dataset.compact = String(!config.settingsOpen);
            settingsButton.title = config.settingsOpen ? 'Schowaj ustawienia' : 'Pokaż ustawienia';
            settingsButton.setAttribute('aria-expanded', String(config.settingsOpen));
        }
        settingsVisibility();
        settingsButton.onclick = () => {
            config.settingsOpen = !config.settingsOpen;
            settingsVisibility(); save(); position();
        };
        panel.querySelector('[data-test]').onclick = () => {
            const out = panel.querySelector('[data-preview]');
            try {
                const result = plan(latest, config, context());
                out.textContent = latest.length ? latest.map(item => `${result.decisions[item.id]}: ${item.name}`).join('\n') : 'Brak łupu w tej sesji.';
            } catch (error) { out.textContent = error.message; }
        };
        function position() {
            if (!Number.isFinite(config.right)) {
                // Keep the previous left-based placement on the first run after updating.
                config.right = Math.max(0, innerWidth - (+config.left || 0) - panel.offsetWidth);
                save();
            }
            panel.style.left = 'auto';
            panel.style.right = `${Math.max(0, Math.min(config.right, innerWidth - panel.offsetWidth))}px`;
            panel.style.top = `${Math.max(0, Math.min(+config.top || 0, innerHeight - 35))}px`;
        }
        const header = panel.querySelector('header'); let drag;
        header.onpointerdown = event => {
            if (event.button !== 0 || event.target.closest('button,input,label')) return;
            drag = { x: event.clientX, y: event.clientY,
                right: innerWidth - panel.offsetLeft - panel.offsetWidth, top: panel.offsetTop };
            header.setPointerCapture(event.pointerId); event.preventDefault();
        };
        header.onpointermove = event => {
            if (drag) {
                config.right = drag.right - (event.clientX - drag.x);
                config.top = drag.top + event.clientY - drag.y;
                position();
            }
        };
        header.onpointerup = header.onpointercancel = () => { if (drag) { drag = null; save(); } };
        window.addEventListener('resize', position); position();
        hookParser(owner, parser, processLoot);
        window.addEventListener('pagehide', () => { stopped = true; generation++; });
        return true;
    }
    let attempts = 0;
    const startup = setInterval(() => {
        try { if (boot() || ++attempts >= 240) clearInterval(startup); }
        catch (error) { clearInterval(startup); console.error('[LootFilter]', error); }
    }, 500);
})();

}});
