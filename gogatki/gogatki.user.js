// ==UserScript==
// @name         Gogatki — panel dodatków
// @namespace    gogatek.local
// @version      0.9.3
// @description  Wspólny panel i przełączniki dodatków do Margonem.
// @match        https://*.margonem.pl/*
// @match        https://*.margonem.com/*
// @match        http://*.margonem.pl/*
// @match        http://*.margonem.com/*
// @exclude      *://www.margonem.pl/*
// @exclude      *://margonem.pl/*
// @exclude      *://www.margonem.com/*
// @exclude      *://margonem.com/*
// @exclude      *://forum.margonem.pl/*
// @exclude      *://forum.margonem.com/*
// @exclude      *://commons.margonem.pl/*
// @exclude      *://commons.margonem.com/*
// @exclude      *://new.margonem.pl/*
// @exclude      *://new.margonem.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @run-at       document-idle
// @noframes
// @downloadURL  https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/gogatki.user.js
// @updateURL    https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/gogatki.user.js
// ==/UserScript==


(() => {
    'use strict';
    const window = unsafeWindow;
    const domain = window.location.hostname.toLowerCase();
    const world = /^([a-z0-9-]+)\.margonem\.(pl|com)$/.exec(domain)?.[1];
    if (window.top !== window.self || !world || ['www', 'forum', 'commons', 'new'].includes(world)) return;
    // Main launcher artwork and layout are available before any remote addon loads.
    const launcherTileStyle = 'appearance:none!important;-webkit-appearance:none!important;box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:center!important;width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;padding:0!important;border:0!important;border-radius:5px!important;background:#171b20 url("data:image/png;base64,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") center/44px 44px no-repeat!important;box-shadow:none!important;color:#12c9bd!important;font-size:0!important;text-shadow:none!important';
    function isGameReady() {
        return typeof window._g === 'function' && !!(
            window.Engine?.hero && window.Engine?.map || window.hero?.id && window.g
        );
    }
    function mountWhenReady() {
        if (!isGameReady()) return false;
        if (window.__gogatekLoaded) return true;
        window.__gogatekLoaded = true;
        mount();
        return true;
    }
    function mount() {
    const key = 'gogatek:modules:v1';
    let preferences;
    try { preferences = GM_getValue(key, {}); } catch { preferences = {}; }
    if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) preferences = {};
    const modules = [];
    const active = new Map();
    const errors = new Map();
    const loading = new Set();
    const loaded = new Map();
    let catalogueLoading = false;
    let catalogueMessage = '';
    const catalogueCacheKey = 'gogatki:catalogue:v1';
    const dockUrl = 'https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/dock.js';
    const dockCacheKey = 'gogatki:tile-dock:source:v2';
    let dockMessage = 'Ładowanie paska dodatków…';

    const host = document.createElement('div');
    host.id = 'gogatek-panel';
    host.dataset.launcherState = 'pending';
    const root = host.attachShadow({mode: 'open'});
    root.innerHTML = `<style>
        :host{all:initial;display:flex;align-items:flex-start;width:max-content;position:fixed;right:18px;top:40px;z-index:2147483647;font:12px/1.3 Arial;color:#dce6ee;opacity:1!important;filter:none!important;mix-blend-mode:normal!important;isolation:isolate;font-family:Arial,sans-serif!important;font-size:12px!important;font-weight:400!important;font-style:normal!important;line-height:1.3!important;background:transparent!important;border:0!important;padding:0!important;margin:0!important;text-shadow:none!important;-webkit-text-stroke:0!important;-webkit-text-fill-color:currentColor!important}
        *{box-sizing:border-box;font-family:Arial,sans-serif!important;text-shadow:none!important;-webkit-text-stroke:0!important;-webkit-text-fill-color:currentColor!important;letter-spacing:normal!important}button,input{font:inherit}button{cursor:pointer;color:inherit}
        header{cursor:move;touch-action:none;user-select:none}.launcher{${launcherTileStyle};cursor:grab;touch-action:none;user-select:none}.launcher[data-dragging="true"]{cursor:grabbing}
        .launcher::before,.launcher::after{content:none!important;display:none!important}
        :host([data-launcher-state="pending"]){visibility:hidden!important;pointer-events:none!important}
        :host([data-native-widget="true"]){left:var(--native-left)!important;right:auto!important;top:var(--native-top)!important;width:var(--native-width)!important;height:var(--native-height)!important;pointer-events:none!important}
        :host([data-native-widget="true"]) .launcher{visibility:hidden!important;pointer-events:none!important}
        :host([data-native-widget="true"]) section{pointer-events:auto!important}
        :host([data-native-widget="true"]) header{cursor:default}
        .native-status{display:block;margin:4px 0;color:#b1c0cb;font:11px/1.4 Arial,sans-serif}
        section{position:absolute;top:calc(100% + 5px);right:0;width:280px;max-width:calc(100vw - 16px);overflow-y:auto;background:#171b20!important;border:1px solid #668298;border-radius:4px;box-shadow:0 6px 22px #0009;overflow-x:hidden}
        [hidden]{display:none!important}header{padding:5px 8px;background:#252b31;display:flex;align-items:center;justify-content:space-between}
        h2{margin:0;font-size:14px;font-weight:600;color:#edf3f7}small{font-size:11px;color:#b1c0cb;line-height:1.4}header button{display:flex;align-items:center;justify-content:center;border:0;background:none;color:#12c9bd;padding:3px}
        .list{padding:0 8px}.row{display:flex;gap:10px;padding:11px 0;align-items:center;border-bottom:1px solid #ffffff12}.row:last-child{border:0}.info{flex:1}strong{display:block;margin-bottom:4px;font-size:13px;font-weight:600;color:#12c9bd}p{font-size:12px;line-height:1.45;font-weight:400;color:#c7d0d9;margin:0}
        input{width:14px;height:14px;accent-color:#21bd69;cursor:pointer}.error{color:#ffbd89}
        footer{font-weight:400;padding:7px 8px;border-top:1px solid #66829855;font-size:11px;color:#12c9bd}.refresh-list{background:#252b31;color:#dce6ee;border:1px solid #668298;border-radius:3px;padding:4px 7px;font-size:12px}.apply{display:block;width:100%;margin-top:7px;padding:5px;background:#38566c;border:1px solid #6d879a;border-radius:3px}
        :focus-visible{outline:2px solid #12c9bd;outline-offset:2px}
        input[type="checkbox"]{-webkit-appearance:none!important;appearance:none!important;box-sizing:border-box!important;position:relative!important;transform:none!important;filter:none!important;display:grid!important;place-content:center!important;width:14px!important;height:14px!important;min-width:14px!important;min-height:14px!important;flex:none!important;padding:0!important;margin:0!important;border:1px solid #668298!important;border-radius:3px!important;background:#252b31!important;background-image:none!important;box-shadow:none!important;cursor:pointer;font:12px Arial,sans-serif!important;text-shadow:none!important;-webkit-text-stroke:0!important}
input[type="checkbox"]:checked{border-color:#668298!important;background:#252b31!important;background-image:none!important}
input[type="checkbox"]::before{content:none!important;display:none!important}
input[type="checkbox"]::after{content:none!important;display:none!important}
input[type="checkbox"]:checked::after{content:'✓'!important;display:block!important;position:static!important;width:auto!important;height:auto!important;margin:0!important;padding:0!important;border:0!important;transform:none!important;background:none!important;box-shadow:none!important;color:#12c9bd!important;-webkit-text-fill-color:#12c9bd!important;-webkit-text-stroke:0!important;text-shadow:none!important;font:12px/12px Arial,sans-serif!important}
input[type="checkbox"]:focus-visible{outline:2px solid #12c9bd;outline-offset:1px}
input[type="checkbox"]:disabled{opacity:.45;cursor:not-allowed}


    </style><button class="launcher" aria-label="Gogatki" aria-expanded="false" aria-controls="panel" title="Kliknij, aby rozwinąć. Przeciągnij, aby przesunąć. Strzałki przesuwają o 10 px.">Gogatki</button>
    <section id="panel" hidden aria-label="Panel dodatków"><header><div><h2>Gogatki</h2><small>Twoje dodatki w jednym miejscu</small></div><button aria-label="Zamknij"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" style="display:block;pointer-events:none;flex-shrink:0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header><div class="list"></div><footer><span role="status"></span><p class="catalogue-message"></p><p class="dock-message"></p><small class="native-status" role="status" hidden></small><button class="refresh-list">Odśwież listę</button><button class="apply" hidden>Zastosuj i odśwież grę</button></footer></section>`;
    document.body.appendChild(host);
    const panel = root.querySelector('section');
    const launcher = root.querySelector('.launcher');
    function open(value) {
        panel.hidden = !value;
        launcher.setAttribute('aria-expanded', String(value));
        placeList();
    }
    function placeList() {
        if (panel.hidden) return;
        const anchor = host.getBoundingClientRect();
        const margin = 8, gap = 5;
        const left = Math.max(margin, Math.min(anchor.right - panel.offsetWidth, window.innerWidth - panel.offsetWidth - margin));
        panel.style.left = (left - anchor.left) + 'px';
        panel.style.right = 'auto';
        const below = Math.max(0, window.innerHeight - anchor.bottom - gap - margin);
        const above = Math.max(0, anchor.top - gap - margin);
        const upwards = above > below && panel.scrollHeight > below;
        panel.style.maxHeight = (upwards ? above : below) + 'px';
        panel.style.top = upwards ? 'auto' : (anchor.height + gap) + 'px';
        panel.style.bottom = upwards ? (anchor.height + gap) + 'px' : 'auto';
    }
    const positionKey = 'gogatki:position:v1';
    let positionState = {right:18, top:40};
    try {
        const saved = GM_getValue(positionKey, null);
        if (Number.isFinite(saved?.right) && Number.isFinite(saved?.top)) positionState = saved;
    } catch {}
    function position(value) {
        positionState = {
            right: Math.max(0, Math.min(value.right, Math.max(0, window.innerWidth - host.offsetWidth))),
            top: Math.max(0, Math.min(value.top, Math.max(0, window.innerHeight - host.offsetHeight)))
        };
        host.style.right = positionState.right + 'px';
        host.style.top = positionState.top + 'px';
        placeList();
    }
    function savePosition() {
        try { GM_setValue(positionKey, positionState); }
        catch { root.querySelector('[role=status]').textContent = 'Nie udało się zapisać pozycji.'; }
    }
    position(positionState);
    let drag = null, suppressLauncherClick = false;
    for (const handle of [launcher, root.querySelector('header')]) {
        handle.addEventListener('pointerdown', event => {
            if (event.button !== 0 || drag || (handle.tagName !== 'BUTTON' && event.target.closest('button'))) return;
            event.preventDefault();
            if (handle === launcher) { suppressLauncherClick = false; launcher.focus({preventScroll:true}); }
            drag = {id:event.pointerId, x:event.clientX, y:event.clientY, moved:false, ...positionState};
            handle.setPointerCapture(event.pointerId);
        });
        handle.addEventListener('pointermove', event => {
            if (!drag || drag.id !== event.pointerId) return;
            if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) <= 4) return;
            drag.moved = true;
            if (handle === launcher) { suppressLauncherClick = true; launcher.dataset.dragging = 'true'; }
            position({right:drag.right - (event.clientX - drag.x), top:drag.top + event.clientY - drag.y});
        });
        function finish(event) {
            if (!drag || drag.id !== event.pointerId) return;
            if (event.type === 'pointercancel') position(drag);
            launcher.removeAttribute('data-dragging');
            drag = null;
            if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
            savePosition();
        }
        handle.addEventListener('pointerup', finish);
        handle.addEventListener('pointercancel', finish);
        handle.addEventListener('lostpointercapture', finish);
    }
    launcher.addEventListener('keydown', event => {
        const offsets = {ArrowLeft:[10,0], ArrowRight:[-10,0], ArrowUp:[0,-10], ArrowDown:[0,10]};
        const offset = offsets[event.key];
        if (!offset) return;
        event.preventDefault();
        position({right:positionState.right + offset[0], top:positionState.top + offset[1]});
        savePosition();
    });
    window.addEventListener('resize', () => { position(positionState); savePosition(); });
    launcher.addEventListener('click', event => {
        // Pointer drags emit a click on release; keyboard activation must still work.
        if (suppressLauncherClick && event.detail !== 0) {
            suppressLauncherClick = false; event.preventDefault(); return;
        }
        suppressLauncherClick = false;
        open(panel.hidden);
    });
    root.querySelector('header button').addEventListener('click', () => { open(false); launcher.focus(); });
    root.addEventListener('keydown', event => { if (event.key === 'Escape') { open(false); launcher.focus(); } });
    root.querySelector('.refresh-list').addEventListener('click', () => updateCatalogue());
    root.querySelector('.apply').addEventListener('click', () => window.location.reload());
    function render() {
        const list = root.querySelector('.list');
        list.replaceChildren();
        for (const mod of modules) {
            const row = document.createElement('label'); row.className = 'row';
            const info = document.createElement('div'); info.className = 'info';
            const title = document.createElement('strong'); title.textContent = mod.name;
            const description = document.createElement('p'); description.textContent = errors.get(mod.id) || (loading.has(mod.id) ? 'Pobieranie dodatku…' : active.has(mod.id) && !preferences[mod.id] ? 'Wyłączenie czeka na odświeżenie gry.' : mod.description);
            if (errors.has(mod.id)) description.className = 'error';
            info.append(title, description);
            const toggle = document.createElement('input'); toggle.type = 'checkbox';
            toggle.checked = preferences[mod.id] === true; toggle.setAttribute('aria-label', mod.name);
            toggle.addEventListener('change', () => {
                const old = preferences[mod.id];
                preferences[mod.id] = toggle.checked;
                try { GM_setValue(key, preferences); errors.delete(mod.id); }
                catch { preferences[mod.id] = old; errors.set(mod.id, 'Nie udało się zapisać ustawień.'); }
                if (preferences[mod.id] === true) start(mod);
                render();
            });
            row.append(info, toggle); list.appendChild(row);
            if (errors.has(mod.id) && preferences[mod.id]) {
                const retry = document.createElement('button');
                retry.textContent = 'Ponów pobieranie';
                retry.addEventListener('click', () => start(mod));
                list.appendChild(retry);
            }
        }
        const pending = modules.some(mod => active.has(mod.id) && preferences[mod.id] !== true);
        root.querySelector('[role=status]').textContent = pending ? 'Wyłączenie dodatków wymaga odświeżenia gry.' : loading.size ? 'Pobieranie włączonych dodatków…' : `Włączone: ${active.size}/${modules.length}`;
        root.querySelector('.apply').hidden = !pending;
        root.querySelector('.catalogue-message').textContent = catalogueLoading ? 'Pobieranie listy dodatków…' : catalogueMessage;
        root.querySelector('.refresh-list').disabled = catalogueLoading;
        root.querySelector('.dock-message').textContent = dockMessage;
        placeList();
    }
    function fetchSource(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET', url, timeout: 20000,
                onload(response) {
                    if (response.status !== 200 || !response.responseText?.trim()) {
                        reject(new Error('Nie udało się pobrać dodatku (HTTP ' + response.status + ').'));
                    } else resolve(response.responseText);
                },
                onerror: () => reject(new Error('Brak połączenia ze źródłem dodatku.')),
                ontimeout: () => reject(new Error('Przekroczono czas pobierania dodatku.')),
                onabort: () => reject(new Error('Pobieranie anulowano.'))
            });
        });
    }
    function installDock(source) {
        let definition;
        const cleanup = [];
        const registry = Object.freeze({register(value) {
            if (definition || value?.apiVersion !== 2 || typeof value.create !== 'function') {
                throw new Error('Nieprawidłowy plik paska dodatków.');
            }
            definition = value;
        }});
        try {
            new Function('GogatkiDockRuntime', 'unsafeWindow', 'GM_getValue', 'GM_setValue', source)(registry, window, GM_getValue, GM_setValue);
            if (!definition) throw new Error('Brak definicji paska dodatków.');
            const api = definition.create({onCleanup(fn) {
                if (typeof fn !== 'function') throw new Error('Nieprawidłowe sprzątanie paska.');
                cleanup.push(fn);
            }});
            if (typeof api?.isDocked !== 'function') throw new Error('Nieprawidłowy interfejs paska dodatków.');
            window.__gogatkiTileDock = api;
        } catch (error) {
            for (const fn of cleanup.reverse()) { try { fn(); } catch {} }
            throw error;
        }
    }
    async function loadDock() {
        if (typeof window.__gogatkiTileDock?.isDocked === 'function') { dockMessage = ''; render(); return; }
        try {
            const url = new URL(dockUrl);
            url.searchParams.set('t', String(Date.now()));
            const source = await fetchSource(url.href);
            installDock(source);
            // Cache only a version that registered and started successfully.
            try { GM_setValue(dockCacheKey, {apiVersion:2, source}); } catch {}
            dockMessage = '';
        } catch (error) {
            console.warn('[Gogatki] Nie udało się odświeżyć paska:', error);
            try {
                const cached = GM_getValue(dockCacheKey, null);
                if (cached?.apiVersion !== 2 || typeof cached.source !== 'string' || !cached.source.trim()) throw new Error('Brak zapisanej wersji.');
                installDock(cached.source);
                dockMessage = 'Pasek działa z zapisanej wersji. Odśwież grę, aby pobrać najnowszą.';
            } catch (cachedError) {
                dockMessage = 'Nie udało się wczytać paska. Dodatki działają w swoich oknach. Odśwież grę, aby spróbować ponownie.';
                console.warn('[Gogatki] Pasek niedostępny:', cachedError);
            }
        }
        render();
    }
    async function start(mod) {
        if (active.has(mod.id) || loading.has(mod.id)) return;
        loading.add(mod.id); errors.delete(mod.id); render();
        try {
            if (!loaded.has(mod.id)) {
                const source = await fetchSource(mod.url);
                // A switch may be turned off while a request is in flight.
                if (preferences[mod.id] !== true) return;
                let definition;
                const registry = Object.freeze({register(value) {
                    if (definition || value?.id !== mod.id || typeof value.start !== 'function') {
                        throw new Error('Źródło zwróciło nieprawidłowy dodatek.');
                    }
                    definition = value;
                }});
                // Evaluate in the userscript context, passing its GM bindings explicitly.
                const evaluate = new Function('GogatkiRuntime', 'unsafeWindow', 'GM_getValue', 'GM_setValue', source);
                evaluate(registry, window, GM_getValue, GM_setValue);
                if (!definition) throw new Error('Źródło nie zawiera dodatku.');
                loaded.set(mod.id, definition);
            }
            if (preferences[mod.id] !== true) return;
            loaded.get(mod.id).start();
            active.set(mod.id, true);
        } catch (error) {
            if (preferences[mod.id]) errors.set(mod.id, error.message || 'Nie udało się uruchomić dodatku.');
            console.error('[Gogatki]', mod.id, error);
        } finally {
            loading.delete(mod.id); render();
        }
    }
    function validateCatalogue(data) {
        if (data?.schemaVersion !== 1 || !Array.isArray(data.modules)) throw new Error('Nieprawidłowy format listy.');
        const ids = new Set();
        const base = new URL('./modules/', catalogueUrl);
        return data.modules.map(item => {
            if (!item || typeof item.id !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(item.id) || ids.has(item.id) ||
                typeof item.name !== 'string' || !item.name.trim() || typeof item.url !== 'string' ||
                (item.description !== undefined && typeof item.description !== 'string')) throw new Error('Nieprawidłowy wpis listy.');
            const url = new URL(item.url, catalogueUrl);
            if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || url.username || url.password) {
                throw new Error('Nieprawidłowy adres modułu.');
            }
            ids.add(item.id);
            return {id:item.id, name:item.name, description:item.description || '', url:url.href};
        });
    }
    async function updateCatalogue() {
        if (catalogueLoading) return;
        catalogueLoading = true; catalogueMessage = ''; render();
        let catalogue;
        try {
            const url = new URL(catalogueUrl);
            url.searchParams.set('t', String(Date.now()));
            catalogue = validateCatalogue(JSON.parse(await fetchSource(url.href)));
            try { GM_setValue(catalogueCacheKey, {schemaVersion:1, modules:catalogue}); } catch {}
        } catch (error) {
            catalogueMessage = 'Nie udało się odświeżyć listy. Używam ostatniej dostępnej listy.';
            try { catalogue = validateCatalogue(GM_getValue(catalogueCacheKey, null)); }
            catch { catalogue = validateCatalogue(fallbackCatalogue); }
        }
        // Keep already running modules visible until the user disables them/reloads.
        const removed = modules.filter(mod => active.has(mod.id) && !catalogue.some(item => item.id === mod.id));
        modules.splice(0, modules.length, ...catalogue, ...removed);
        catalogueLoading = false;
        host.dataset.catalogueReady = 'true';
        render();
        for (const mod of catalogue) if (preferences[mod.id] === true) start(mod);
    }

    const catalogueUrl = "https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/catalogue.json";
const fallbackCatalogue = {"schemaVersion":1,"modules":[{"id":"ulepa","name":"Ulepa","description":"Ulepszanie i rozbijanie przedmiotów","url":"https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/modules/ulepa.js?v=1.2.13"},{"id":"lootfilter","name":"Lootfilter","description":"Filtry łupu po walce","url":"https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/modules/lootfilter.js?v=1.0.19"},{"id":"wolacz","name":"Wołacz Kolosy","description":"Wołanie na globalny według mapy i grupy","url":"https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/modules/wolacz.js?v=1.4.13"},{"id":"gift","name":"Gift","description":"Odbieranie darmowych nagród z aktualności i kalendarza.","url":"https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/modules/gift.js?v=1.0.15"},{"id":"wolacz-ide","name":"Wołacz + idę","description":"Wołanie na E2 i wiadomość „Ide” przez Lootlog klanowy Death Sentence.","url":"https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/modules/wolacz-ide.js?v=2026.11.06.1"},{"id":"pvp-info","name":"PVP Info","description":"Powiadomienia o walkach PvP i ich wynikach na czacie klanowym.","url":"https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/modules/pvp-info.js?v=1.0.9"},{"id":"anty-x","name":"Anty X","description":"Filtr ataków PvP według relacji, poziomów i listy chronionych graczy.","url":"https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/modules/anty-x.js?v=1.0.7"},{"id":"auto-tp","name":"Auto TP","description":"Użycie przedmiotu po walce, przy wrogu lub z ucieczką.","url":"https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/modules/auto-tp.js?v=1.0.4"},{"id":"qf","name":"QF","description":"Szybka walka według typu potworów, wielkości grupy i poziomów.","url":"https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/modules/qf.js?v=1.0.4"},{"id":"better-x","name":"Better X","description":"Atakowanie i dobijanie graczy; domyślny skrót X, próby co 200–350 ms.","url":"https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/modules/better-x.js?v=1.0.0"}]};
    installMainLauncher(cleanup => window.addEventListener('pagehide', cleanup, {once:true}));
    void loadDock();
    updateCatalogue();
    }
    function installMainLauncher(onCleanup) {
        const widgetKey = 'gogatki_addonsManager';
        const selector = '.widget-' + widgetKey;
        let stopped = false, timer = null, frame = 0, registration = null, boundTile = null;
        let main = null, mainRoot = null, launcher = null, popup = null, nativeStatus = null;
        let gameStyle = null, popupObserver = null, widgetObserver = null, lastRect = null, active = false;
        let lastWarning = '', restoringFloat = false, rejectedSavedPosition = null;
        let nativeReadySince = null, missingTileSince = null;
        let nativeSession = false;
        function nativeLoading() {
            const engine = window.Engine;
            return (nativeSession && !engine) || !!engine && !!(nativeSession || engine.hero || engine.map) &&
                (!engine.hero?.d || engine.allInit === false || engine.interfaceStart === false);
        }
        function holdNative() {
            if (!main) return;
            if (main.dataset.launcherState !== 'pending') nativeReadySince = null;
            // Keep the native coordinates and floating-position preference while NI rebuilds.
            main.dataset.launcherState = 'pending';
        }
        function api() {
            const engine = window.Engine, manager = engine?.widgetManager;
            return engine?.hero?.d && engine.allInit !== false && engine.interfaceStart !== false && ['getDefaultWidgetSet','getFirstEmptyWidgetSlot','createOneWidget'].every(method => typeof manager?.[method] === 'function') ? manager : null;
        }
        function awaitingNativeStartup() {
            const engine = window.Engine;
            if (!(engine?.hero && engine?.map) || main?.dataset.launcherState !== 'pending') return false;
            // Do not show a temporary floating tile while the game itself is still loading.
            if (!engine.hero.d || engine.allInit === false || engine.interfaceStart === false) { nativeReadySince = null; return true; }
            if (nativeReadySince === null) nativeReadySince = Date.now();
            return Date.now() - nativeReadySince < 5000;
        }
        function tiles() {
            const result = new Set(document.querySelectorAll(selector));
            for (const icon of document.querySelectorAll('.icon.' + widgetKey)) {
                const tile = icon.closest('.widget-button');
                if (tile) result.add(tile);
            }
            return [...result];
        }
        function status(text = '') {
            if (!nativeStatus) return;
            nativeStatus.hidden = !text;
            if (nativeStatus.textContent !== text) nativeStatus.textContent = text;
        }
        function validPosition(position) {
            return Array.isArray(position) && Number.isInteger(position[0]) && position[0] >= 0 && typeof position[1] === 'string' && !!position[1].trim();
        }
        function savedLayout(manager) {
            const storage = window.Engine?.serverStorage;
            if (typeof storage?.get !== 'function' || typeof manager.getPathToHotWidgetVersion !== 'function') return {};
            const layout = storage.get(manager.getPathToHotWidgetVersion());
            return layout && typeof layout === 'object' && !Array.isArray(layout) ? layout : {};
        }
        function occupied(position, layout, set) {
            const matches = value => validPosition(value) && value[0] === position[0] && value[1] === position[1];
            // Saved moves override native defaults; disabled widgets do not occupy a slot.
            for (const id of new Set([...Object.keys(set), ...Object.keys(layout)])) {
                if (id === widgetKey || layout[id] === false) continue;
                const definition = set[id];
                const other = validPosition(layout[id]) ? layout[id] : definition?.default ? [definition.index,definition.pos] : null;
                if (matches(other)) return true;
            }
            return false;
        }
        function createWidget(manager, set, position, savedSignature = null) {
            const definition = {keyName:widgetKey,txt:'Gogatki',default:true,index:position[0],pos:position[1],alwaysExist:true,type:'blue',clb:toggle};
            set[widgetKey] = definition; registration = {manager,set,definition,missingSince:Date.now(),savedSignature};
            const withoutSlot = [];
            manager.createOneWidget(widgetKey, {[widgetKey]:[...position]}, true, withoutSlot);
            if (withoutSlot.includes(widgetKey)) { unregister(); return false; }
            manager.setEnableDraggingButtonsWidget?.(false);
            return true;
        }
        function placePopup() {
            if (!popup || popup.hidden) return;
            const anchor = main.getBoundingClientRect(), margin = 8, gap = 5;
            const left = Math.max(margin, Math.min(anchor.right - popup.offsetWidth, window.innerWidth - popup.offsetWidth - margin));
            popup.style.left = (left - anchor.left) + 'px'; popup.style.right = 'auto';
            const below = Math.max(0, window.innerHeight - anchor.bottom - gap - margin);
            const above = Math.max(0, anchor.top - gap - margin);
            const upwards = above > below && popup.scrollHeight > below;
            popup.style.maxHeight = (upwards ? above : below) + 'px';
            popup.style.top = upwards ? 'auto' : (anchor.height + gap) + 'px';
            popup.style.bottom = upwards ? (anchor.height + gap) + 'px' : 'auto';
        }
        function float() {
            if (!main) return;
            main.dataset.launcherState = 'floating';
            if (!active) return;
            active = false; main.removeAttribute('data-native-widget'); lastRect = null;
            // Let the existing launcher restore its saved floating coordinates once.
            restoringFloat = true;
            try { window.dispatchEvent(new Event('resize')); } finally { restoringFloat = false; }
            placePopup();
        }
        function bindTile(tile) {
            if (tile === boundTile) return;
            if (boundTile) { boundTile.removeEventListener('keydown', tileKey, true); boundTile.removeAttribute('data-gogatki-native-launcher'); }
            boundTile = tile;
            if (tile) {
                tile.setAttribute('aria-label', 'Gogatki'); tile.setAttribute('role', 'button');
                tile.setAttribute('data-gogatki-native-launcher', 'true');
                tile.tabIndex = 0; tile.addEventListener('keydown', tileKey, true);
            }
        }
        function tileKey(event) {
            if (!['Enter',' '].includes(event.key)) return;
            event.preventDefault(); event.stopImmediatePropagation(); toggle();
        }
        function usableTile() {
            for (const tile of tiles()) {
                const rect = tile.getBoundingClientRect();
                const left = Math.max(0, rect.left), right = Math.min(window.innerWidth, rect.right);
                const top = Math.max(0, rect.top), bottom = Math.min(window.innerHeight, rect.bottom);
                if (right - left < 8 || bottom - top < 8) continue;
                let visible = true;
                for (let node = tile; node; node = node.parentElement) {
                    const css = window.getComputedStyle(node);
                    if (css.display === 'none' || css.visibility !== 'visible' || css.contentVisibility === 'hidden' || Number(css.opacity) <= .01) { visible = false; break; }
                }
                if (!visible) continue;
                // Menus and dialogs can cover a valid tile; occlusion never changes its layout.
                return {tile, rect};
            }
            return null;
        }
        function anchor() {
            if (stopped || restoringFloat || !main || !registration) return false;
            if (nativeLoading()) { holdNative(); return false; }
            const usable = usableTile();
            bindTile(usable?.tile || null);
            if (!usable) {
                // A hidden native bar belongs to the game's current UI state, not a new slot.
                if (active && tiles().length) { holdNative(); return false; }
                if (active) holdNative();
                const waiting = awaitingNativeStartup();
                if (!tiles().length) {
                    if (missingTileSince === null) missingTileSince = Date.now();
                    if (registration.missingSince === null) registration.missingSince = Date.now();
                    if (Date.now() - missingTileSince < 1500 && (main.dataset.launcherState !== 'pending' || waiting)) return false;
                }
                if (!waiting) float();
                return false;
            }
            missingTileSince = null;
            registration.missingSince = null;
            const {rect} = usable;
            if (!lastRect || ['left','top','width','height'].some(k => Math.abs(lastRect[k] - rect[k]) > .1)) {
                for (const k of ['left','top','width','height']) main.style.setProperty('--native-' + k, rect[k] + 'px');
                lastRect = {left:rect.left,top:rect.top,width:rect.width,height:rect.height};
            }
            active = true; main.setAttribute('data-native-widget', 'true');
            main.dataset.launcherState = 'native';
            placePopup(); return true;
        }
        function follow() {
            if (frame) window.cancelAnimationFrame(frame);
            frame = 0;
            if (stopped || !active || popup?.hidden || main?.dataset.launcherState === 'pending') return;
            frame = window.requestAnimationFrame(() => { frame = 0; anchor(); follow(); });
        }
        function toggle() {
            if (stopped || !launcher || nativeLoading()) return;
            anchor(); launcher.click(); placePopup(); follow();
        }
        function unregister() {
            if (!registration) return;
            const old = registration; registration = null;
            if (old.set[widgetKey] === old.definition) delete old.set[widgetKey];
            bindTile(null);
            for (const tile of tiles()) tile.remove();
        }
        function blockHeaderDrag(event) {
            if (active && event.target.closest?.('header') && !event.target.closest('button,input')) {
                event.preventDefault(); event.stopImmediatePropagation();
            }
        }
        function closeFocus(event) {
            if (active && event.target.closest?.('header button')) boundTile?.focus({preventScroll:true});
        }
        function escapeFocus(event) {
            if (active && event.key === 'Escape') boundTile?.focus({preventScroll:true});
        }
        function destroy() {
            if (stopped) return;
            stopped = true; if (timer) clearInterval(timer); if (frame) window.cancelAnimationFrame(frame);
            popupObserver?.disconnect(); widgetObserver?.disconnect(); window.removeEventListener('resize', anchor);
            mainRoot?.removeEventListener('pointerdown', blockHeaderDrag, true);
            mainRoot?.removeEventListener('click', closeFocus);
            mainRoot?.removeEventListener('keydown', escapeFocus);
            unregister(); float(); gameStyle?.remove();
        }
        onCleanup(destroy);
        function bindMain() {
            main = document.getElementById('gogatek-panel'); mainRoot = main?.shadowRoot;
            launcher = mainRoot?.querySelector('.launcher'); popup = mainRoot?.querySelector('section');
            if (!launcher || !popup) return false;
            nativeStatus = mainRoot.querySelector('.native-status');
            main.dataset.launcherOwner = 'main';
            mainRoot.addEventListener('pointerdown', blockHeaderDrag, true);
            mainRoot.addEventListener('click', closeFocus);
            mainRoot.addEventListener('keydown', escapeFocus);
            popupObserver = new MutationObserver(follow); popupObserver.observe(popup, {attributes:true,attributeFilter:['hidden']});
            gameStyle = document.createElement('style');
            const tileTargets = [':root .main-buttons-container .widget-button[data-gogatki-native-launcher]', ':root [data-gogatki-native-launcher]'];
            gameStyle.textContent = tileTargets.join(',') + '{' + launcherTileStyle + ';cursor:pointer}' + tileTargets.flatMap(target => [target + '::before', target + '::after']).join(',') + '{content:none!important;display:none!important}' + tileTargets.map(target => target + ' .icon').join(',') + '{display:none!important}' + tileTargets.map(target => target + ':focus-visible').join(',') + '{outline:2px solid #12c9bd!important;outline-offset:2px!important}';
            document.head.append(gameStyle); window.addEventListener('resize', anchor);
            // Apply our artwork before the next paint when the game creates/rebuilds its tile.
            const own = selector + ',.icon.' + widgetKey;
            widgetObserver = new MutationObserver(records => {
                if (records.some(record => [...record.addedNodes,...record.removedNodes].some(node => node.nodeType === 1 && (node.matches(own) || node.querySelector(own))))) { anchor(); follow(); }
            });
            widgetObserver.observe(document.body, {childList:true,subtree:true});
            return true;
        }
        function poll() {
            if (stopped) return;
            try {
                if ((!launcher || !popup) && !bindMain()) return;
                if (nativeLoading()) {
                    holdNative(); nativeReadySince = null;
                    status('Oczekiwanie na załadowanie interfejsu postaci…'); return;
                }
                const manager = api();
                if (!manager) {
                    if (active) {
                        holdNative();
                        if (awaitingNativeStartup()) return;
                    }
                    unregister();
                    if (!awaitingNativeStartup()) float();
                    status(); return;
                }
                nativeSession = true;
                const set = manager.getDefaultWidgetSet();
                if (!set || typeof set !== 'object' || Array.isArray(set)) {
                    if (active) { holdNative(); if (awaitingNativeStartup()) return; }
                    unregister(); if (!awaitingNativeStartup()) float(); return;
                }
                if (!registration || registration.manager !== manager || registration.set !== set || set[widgetKey] !== registration.definition) {
                    unregister();
                }
                if (registration) {
                    if (tiles().length) registration.missingSince = null;
                    else if (registration.missingSince === null) registration.missingSince = Date.now();
                }
                if (!registration || (registration.missingSince !== null && Date.now() - registration.missingSince >= 1500)) {
                    // A stale saved slot can also fail without the native rejection list.
                    if (registration?.savedSignature && !tiles().length) rejectedSavedPosition = registration.savedSignature;
                    unregister();
                    const layout = savedLayout(manager), saved = layout[widgetKey];
                    const signature = validPosition(saved) ? JSON.stringify([saved[0],saved[1]]) : null;
                    if (signature && signature !== rejectedSavedPosition && !occupied(saved, layout, set)) {
                        if (!createWidget(manager, set, [saved[0],saved[1]], signature)) rejectedSavedPosition = signature;
                    }
                    // The game checks its current bars, including widgets moved by the player
                    // and other addons, when there is no usable saved position.
                    if (!registration) {
                        const empty = manager.getFirstEmptyWidgetSlot(), position = [empty?.slot,empty?.container];
                        if (!validPosition(position)) {
                            float(); status('Brak wolnego miejsca na paskach gry. Gogatki pozostają jako pływający kafelek.'); return;
                        }
                        if (!createWidget(manager, set, position)) {
                            if (!awaitingNativeStartup()) float(); status('Wybrane miejsce jest już zajęte. Szukam wolnego miejsca na paskach gry…'); return;
                        }
                    }
                }
                const pinned = anchor(); follow();
                status(pinned ? '' : 'Oczekiwanie na kafelek na pasku gry…');
            } catch (error) {
                if (active) {
                    holdNative();
                    if (awaitingNativeStartup()) {
                        status('Oczekiwanie na odbudowanie kafelka na pasku gry…'); return;
                    }
                }
                unregister(); if (!awaitingNativeStartup()) float();
                status('Nie udało się przypiąć kafelka. Dostępny jest pływający przycisk Gogatki.');
                const message = String(error?.message || error);
                if (message !== lastWarning) { console.warn('[Gogatki] Kafelek gry:', error); lastWarning = message; }
            }
        }
        poll(); timer = setInterval(poll, 500);
    }

    if (!mountWhenReady()) {
        let attempts = 0;
        const wait = setInterval(() => {
            if (mountWhenReady() || ++attempts >= 600) clearInterval(wait);
        }, 100);
        window.addEventListener('pagehide', () => clearInterval(wait), {once:true});
    }
})();








