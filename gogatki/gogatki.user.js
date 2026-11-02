// ==UserScript==
// @name         Gogatki — panel dodatków
// @namespace    gogatek.local
// @version      0.5.0
// @description  Wspólny panel i przełączniki dodatków do Margonem.
// @match        https://*.margonem.pl/*
// @match        https://*.margonem.com/*
// @match        http://*.margonem.pl/*
// @match        http://*.margonem.com/*
// @exclude      *://www.margonem.pl/*
// @exclude      *://margonem.pl/*
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
    if (['www.margonem.pl', 'margonem.pl'].includes(window.location.hostname)) return;
    if (window.__gogatekLoaded) return;
    window.__gogatekLoaded = true;
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

    const host = document.createElement('div');
    host.id = 'gogatek-panel';
    const root = host.attachShadow({mode: 'open'});
    root.innerHTML = `<style>
        :host{all:initial;display:flex;align-items:flex-start;width:max-content;position:fixed;right:18px;top:40px;z-index:2147483647;font:12px/1.3 Arial;color:#eee}
        *{box-sizing:border-box}button,input{font:inherit}button{cursor:pointer;color:inherit}
        .move{background:#25272a;color:#aaa;border:1px solid #668298;border-radius:4px;padding:5px;cursor:move;touch-action:none;user-select:none;margin-right:3px}header{cursor:move;touch-action:none;user-select:none}.launcher{background:#25272a;border:1px solid #668298;border-radius:4px;padding:5px 9px;font-weight:bold;box-shadow:0 6px 22px #0009}
        section{position:absolute;top:calc(100% + 5px);right:0;width:280px;max-width:calc(100vw - 16px);overflow-y:auto;background:#171719ed;border:1px solid #668298;border-radius:4px;box-shadow:0 6px 22px #0009;overflow-x:hidden}
        [hidden]{display:none!important}header{padding:5px 8px;background:#25272a;display:flex;align-items:center;justify-content:space-between}
        h2{margin:0;font-size:13px}small{font-size:10px;color:#aaa}header button{border:0;background:none;font-size:18px}
        .list{padding:0 8px}.row{display:flex;gap:10px;padding:11px 0;align-items:center;border-bottom:1px solid #ffffff12}.row:last-child{border:0}.info{flex:1}strong{display:block;margin-bottom:3px}p{font-size:11px;line-height:1.4;color:#aaa;margin:0}
        input{width:14px;height:14px;accent-color:#21bd69;cursor:pointer}.error{color:#ffbd89}
        footer{padding:7px 8px;border-top:1px solid #66829855;font-size:11px;color:#12c9bd}.apply{display:block;width:100%;margin-top:7px;padding:5px;background:#38566c;border:1px solid #6d879a;border-radius:3px}
        :focus-visible{outline:2px solid #12c9bd;outline-offset:2px}
    </style><button class="move" aria-label="Przesuń Gogatki" title="Przeciągnij, aby zmienić pozycję. Strzałki przesuwają o 10 px.">⠿</button><button class="launcher" aria-expanded="false" aria-controls="panel">Gogatki</button>
    <section id="panel" hidden aria-label="Panel dodatków"><header><div><h2>Gogatki</h2><small>Twoje dodatki w jednym miejscu</small></div><button aria-label="Zamknij">×</button></header><div class="list"></div><footer><span role="status"></span><p class="catalogue-message"></p><button class="refresh-list">Odśwież listę</button><button class="apply" hidden>Zastosuj i odśwież grę</button></footer></section>`;
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
    let drag = null;
    for (const handle of [root.querySelector('.move'), root.querySelector('header')]) {
        handle.addEventListener('pointerdown', event => {
            if (event.button !== 0 || drag || (handle.tagName !== 'BUTTON' && event.target.closest('button'))) return;
            event.preventDefault();
            drag = {id:event.pointerId, x:event.clientX, y:event.clientY, ...positionState};
            handle.setPointerCapture(event.pointerId);
        });
        handle.addEventListener('pointermove', event => {
            if (!drag || drag.id !== event.pointerId) return;
            position({right:drag.right - (event.clientX - drag.x), top:drag.top + event.clientY - drag.y});
        });
        function finish(event) {
            if (!drag || drag.id !== event.pointerId) return;
            if (event.type === 'pointercancel') position(drag);
            drag = null;
            if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
            savePosition();
        }
        handle.addEventListener('pointerup', finish);
        handle.addEventListener('pointercancel', finish);
        handle.addEventListener('lostpointercapture', finish);
    }
    root.querySelector('.move').addEventListener('keydown', event => {
        const offsets = {ArrowLeft:[10,0], ArrowRight:[-10,0], ArrowUp:[0,-10], ArrowDown:[0,10]};
        const offset = offsets[event.key];
        if (!offset) return;
        event.preventDefault();
        position({right:positionState.right + offset[0], top:positionState.top + offset[1]});
        savePosition();
    });
    window.addEventListener('resize', () => { position(positionState); savePosition(); });
    launcher.addEventListener('click', () => open(panel.hidden));
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
const fallbackCatalogue = {"schemaVersion": 1, "modules": [{"id": "ulepa", "name": "Ulepa", "description": "Ulepszanie i rozbijanie przedmiotów · 1.2.3", "url": "https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/modules/ulepa.js?v=0.4.0"}, {"id": "lootfilter", "name": "Lootfilter", "description": "Filtry łupu po walce · 1.0.6", "url": "https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/modules/lootfilter.js?v=0.4.0"}, {"id": "wolacz", "name": "Wołacz", "description": "Wołanie na globalny według mapy i grupy · 1.4.0", "url": "https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/modules/wolacz.js?v=1.4.0"}]};
    updateCatalogue();
})();
