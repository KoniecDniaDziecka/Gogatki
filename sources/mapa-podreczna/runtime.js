// Mapa podręczna+ 1.1.3 — enhancement of the native NI window with Fog Light.
GogatkiRuntime.register({
    id: 'mapa-podreczna',
    name: 'Mapa+',
    description: 'NI: oznaczenia, filtry, wyszukiwarka i Fog Light w mapie podręcznej gry.',
    start() {
        'use strict';
        const window = unsafeWindow, document = window.document;
        const INSTANCE = '__gogatkiNativeMap', KEY = 'mapa-podreczna:global:v1';
        if (window.top !== window.self || window[INSTANCE]) return;
        if (!window.Engine) {
            if (typeof window.message === 'function') window.message('Mapa podręczna+ wymaga nowego interfejsu (NI).');
            return;
        }
        // __MODEL__
        // __MARKER_STYLE__
        // __FOG_LIGHT__
        const MARKER_LAYERS = { gw: 70, item: 80, grave: 85, resp: 90, respEvent: 90, npc: 110, mob: 110,
            elite: 120, elite2: 130, elite3: 130, other: 140, friend: 140, clan: 140, ally: 140,
            party: 142, enemy: 145, clanEnemy: 145, titan: 150, collosus: 150, heros: 160, herosEvent: 160, marker: 200 };
        const PULSE = new Set(['titan', 'collosus', 'heros', 'herosEvent', 'elite3']);

        const defaults = { mmShowMobs: true, mmShowNpcs: true, mmShowOthers: true, mmShowSpawns: true,
            mmSpawnRange: 10, mmGwAvail: false, fog: true, fogLight: true, attack: false, drawer: false, windowRight: 24, windowTop: 160 };
        let saved;
        try { saved = GM_getValue(KEY, {}); } catch { saved = {}; }
        const state = { ...defaults };
        for (const key of Object.keys(defaults)) if (typeof defaults[key] === 'boolean' && typeof saved?.[key] === 'boolean') state[key] = saved[key];
        for (const key of ['windowRight','windowTop']) if (Number.isFinite(saved?.[key])) state[key] = saved[key];
        const search = { text: '', coords: null };
        let settingsUi = null, binding = null, disposed = false, command = null, timer = null, hooked = null, snapshot = null;
        let heroFrame = null;
        let hint = '', warned = false;
        const setText = (node, value) => { if (node && node.textContent !== value) node.textContent = value; };
        const model = createMapModel(window, state, search, () => {});
        const fogLight = createFogLight(window, () => state.fogLight && !disposed, ids => {
            const packet = { npcs_del: ids.map(id => ({ id })) };
            const comm = window.Engine?.communication;
            if (typeof comm?.parseJSON === 'function') comm.parseJSON(packet);
            // Also update the cache if the game's communication object was replaced.
            model.feed(packet);
        });
        const heroTransforms = new WeakMap();
        const surfaceRegions = new WeakMap();
        // The dock controls this bridge; standalone installs keep a small launcher.
        const launcher = document.createElement('div');
        launcher.id = 'gogatki-mapa-plus'; launcher.hidden = !!document.getElementById('gogatek-panel');
        launcher.style.cssText = 'position:fixed;right:24px;top:100px;width:28px;height:28px;z-index:2147483000;';
        launcher.dataset.compact = 'true';
        const launcherButton = document.createElement('button');
        launcherButton.type = 'button'; launcherButton.className = 'open-map';
        launcherButton.title = 'Ustawienia Mapa+'; launcherButton.setAttribute('aria-label','Ustawienia Mapa+');
        launcherButton.style.cssText = 'display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:28px;height:28px;padding:4px;border:1px solid #668298;border-radius:4px;background:#252b31;color:#12c9bd;cursor:pointer';
        launcherButton.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/></svg>';
        launcherButton.addEventListener('click', toggleSettings);
        launcher.append(launcherButton); document.body.append(launcher);
        function save() { try { GM_setValue(KEY, { ...state }); } catch { showStatus('Nie udało się zapisać ustawień.'); } }
        function showStatus(text) { hint = text; if (settingsUi) setText(settingsUi.status, text); }
        function isVisible(node) {
            if (!node?.isConnected || !node.getClientRects().length) return false;
            for (let el = node; el && el !== document.body; el = el.parentElement) {
                const css = window.getComputedStyle(el);
                if (css.display === 'none' || css.visibility === 'hidden' || css.visibility === 'collapse') return false;
            }
            return true;
        }
        function findWindow() {
            const windows = [...document.querySelectorAll('.c-window.handheld-window, .border-window.handheld-window')];
            if (!windows.length) for (const node of document.querySelectorAll('.c-window, .border-window')) {
                const title = node.querySelector('.header-label .text')?.textContent || '';
                if (/mapa podr[eę]czna|podr[eę]czna mapa/i.test(title)) windows.push(node);
            }
            return windows.find(isVisible) || null;
        }
        function syncLauncher() {
            launcher.hidden = !!document.getElementById('gogatek-panel') || !!window.__gogatkiTileDock;
            launcher.dataset.compact = String(!state.drawer);
        }
        function setDrawer(open) {
            state.drawer = open;
            if (settingsUi) {
                settingsUi.host.hidden = !open;
                settingsUi.toggle.setAttribute('aria-expanded', String(open));
                placeSettings();
            }
            syncLauncher(); save();
        }
        function toggleSettings() { setDrawer(!state.drawer); }
        function placeSettings() {
            if (!settingsUi || settingsUi.host.hidden) return;
            const host = settingsUi.host;
            host.style.right = Math.max(0,Math.min(state.windowRight,window.innerWidth-host.offsetWidth)) + 'px';
            host.style.top = Math.max(0,Math.min(state.windowTop,window.innerHeight-host.offsetHeight)) + 'px';
        }
        function contentRect(surface) {
            const r = surface.getBoundingClientRect(), css = window.getComputedStyle(surface);
            const sx = surface.offsetWidth ? r.width / surface.offsetWidth : 1, sy = surface.offsetHeight ? r.height / surface.offsetHeight : 1;
            const left = (parseFloat(css.borderLeftWidth) + parseFloat(css.paddingLeft) || 0) * sx;
            const right = (parseFloat(css.borderRightWidth) + parseFloat(css.paddingRight) || 0) * sx;
            const top = (parseFloat(css.borderTopWidth) + parseFloat(css.paddingTop) || 0) * sy;
            const bottom = (parseFloat(css.borderBottomWidth) + parseFloat(css.paddingBottom) || 0) * sy;
            return { left: r.left + left, top: r.top + top, width: r.width - left - right, height: r.height - top - bottom };
        }
        function findSurface(native, town) {
            if (!(town?.w > 0 && town?.h > 0)) return null;
            const ratio = town.w / town.h;
            const candidates = [];
            // The native map can be a canvas with side margins, or a CSS image
            // on an element whose class is not stable between NI layouts.
            for (const node of native.querySelectorAll('*')) {
                if (node.closest('[data-gogatki-map-ui], [data-gogatki-map-layer], [data-gogatki-map-markers]') || !isVisible(node)) continue;
                const css = window.getComputedStyle(node);
                const source = node.currentSrc || node.src || css.backgroundImage;
                const terrain = !!town.file && source.includes(town.file);
                if (!/^(CANVAS|IMG)$/.test(node.tagName) && !terrain) continue;
                const r = contentRect(node);
                if (Math.min(r.width, r.height) < 8 || Math.max(r.width, r.height) < 64) continue;
                const matches = Math.abs(r.width / r.height / ratio - 1) < 0.04;
                if (!matches && node.tagName !== 'CANVAS' && !terrain) continue;
                // NI fits rectangular maps into the available drawing area.
                // Match that inner rectangle instead of rejecting a wider canvas.
                const scale = Math.min(r.width / town.w, r.height / town.h);
                const width = town.w * scale, height = town.h * scale;
                surfaceRegions.set(node, matches ? r : { left: r.left + (r.width - width) / 2, top: r.top + (r.height - height) / 2, width, height });
                candidates.push({ node, score: (terrain ? 1e9 : 0) + (matches ? 1e6 : 0) + width * height });
            }
            return candidates.sort((a, b) => b.score - a.score)[0]?.node || null;
        }
        function diagnosticReport() {
            const shortURL = value => {
                if (typeof value !== 'string') return typeof value;
                if (value.startsWith('data:')) return '[obraz data URL]';
                return value.replace(/[?#].*$/, '').slice(0, 180);
            };
            const map = window.Engine?.map, d = map?.d || {};
            const nodes = binding ? [...binding.native.querySelectorAll('*')].filter(node => !node.closest('[data-gogatki-map-ui], [data-gogatki-map-layer], [data-gogatki-map-markers]')).map(node => {
                const r = contentRect(node), css = window.getComputedStyle(node);
                if (!/^(CANVAS|IMG)$/.test(node.tagName) && (r.width < 24 || r.height < 24)) return null;
                return { tag: node.tagName, class: String(node.className || '').slice(0, 120), visible: isVisible(node), width: Math.round(r.width * 100) / 100, height: Math.round(r.height * 100) / 100,
                    image: shortURL(node.currentSrc || node.src || css.backgroundImage), selected: node === binding.surface };
            }).filter(Boolean).slice(0, 40) : [];
            return JSON.stringify({ version: '1.1.3', status: settingsUi?.status.textContent, active: !!binding && binding.overlay.style.display !== 'none', fogLight: state.fogLight,
                dimensions: { model: { w: snapshot?.town?.w, h: snapshot?.town?.h }, engine: { x: d.x, y: d.y }, size: { x: map?.size?.x, y: map?.size?.y } },
                file: shortURL(snapshot?.town?.file), image: shortURL(map?.img?.currentSrc || map?.img?.src), background: binding?.background ? { ready: !!binding.background.ready, failed: binding.background.failed, source: shortURL(binding.background.source) } : null, nodes }, null, 2);
        }
        function backgroundSource(town) {
            const image = window.Engine?.map?.img;
            const source = image?.currentSrc || image?.src;
            if (source && (!town.file || source.startsWith('data:image/') || source.includes(town.file))) return { source, image };
            if (!town.file) return null;
            try {
                const cfg = window.CFG || {};
                const base = new URL(cfg.a_mpath || cfg.mpath || '/obrazki/miasta/', document.baseURI);
                return { source: new URL(town.file, base).href, image: null };
            } catch { return null; }
        }
        function releaseBackground() {
            const background = binding?.background;
            if (background?.owned) { background.image.onload = null; background.image.onerror = null; }
            if (binding) binding.background = null;
        }
        function prepareBackground() {
            const source = backgroundSource(snapshot.town);
            if (!source) { releaseBackground(); return false; }
            const key = `${snapshot.town.id}|${source.source}`;
            const ready = source.image?.complete && source.image.naturalWidth > 0;
            if (binding.background?.key !== key || (ready && !binding.background.ready)) {
                releaseBackground();
                const image = ready ? source.image : new window.Image();
                const background = { key, source: source.source, image, owned: !ready, ready, failed: false };
                binding.background = background;
                if (!ready) {
                    image.onload = () => { background.ready = image.naturalWidth > 0; };
                    image.onerror = () => { background.failed = true; };
                    image.src = source.source;
                }
            }
            const background = binding.background;
            if (!background.ready) return false;
            const town = snapshot.town, image = background.image;
            const tilesW = image.naturalWidth / 32, tilesH = image.naturalHeight / 32;
            let offset = town.offset || window.Engine?.map?.d?.backgroundOffset || window.Engine?.map?.backgroundOffset;
            if (!offset && (tilesW > town.w + 0.5 || tilesH > town.h + 0.5)) {
                offset = { x: Math.max(0, (tilesW - town.w) / 2), y: Math.max(0, (tilesH - town.h) / 2) };
            }
            setAttribute(binding.terrain, 'href', background.source);
            setAttribute(binding.terrain, 'x', offset ? -Number(offset.x || 0) : 0);
            setAttribute(binding.terrain, 'y', offset ? -Number(offset.y || 0) : 0);
            setAttribute(binding.terrain, 'width', offset ? tilesW : town.w);
            setAttribute(binding.terrain, 'height', offset ? tilesH : town.h);
            return true;
        }
        function hook() {
            const comm = window.Engine?.communication;
            if (typeof comm?.parseJSON !== 'function') return;
            if (hooked?.comm === comm) return;
            unhook();
            const original = comm.parseJSON;
            function wrapper(data) {
                const args = [...arguments];
                let packet;
                if (!disposed) try {
                    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
                    packet = fogLight.before(parsed);
                    if (packet !== parsed) args[0] = typeof data === 'string' ? JSON.stringify(packet) : packet;
                } catch (error) { if (!warned) { warned = true; console.warn('[Mapa podręczna+] Fog Light:', error); } }
                let parsedSuccessfully = false;
                try {
                    const result = original.apply(this, args);
                    parsedSuccessfully = true;
                    return result;
                }
                finally {
                    if (!disposed) try {
                        packet ??= typeof data === 'string' ? JSON.parse(data) : data;
                        model.feed(packet);
                        if (parsedSuccessfully) fogLight.after(packet);
                    }
                    catch (error) { if (!warned) { warned = true; console.warn('[Mapa podręczna+] Dane mapy:', error); } }
                }
            }
            comm.parseJSON = wrapper;
            hooked = { comm, original, wrapper };
        }
        function unhook() {
            if (hooked && hooked.comm.parseJSON === hooked.wrapper) hooked.comm.parseJSON = hooked.original;
            hooked = null;
        }
        function goTo(x, y) {
            if (!snapshot?.town || !Number.isFinite(x) || !Number.isFinite(y)) return;
            x = Math.max(0, Math.min(snapshot.town.w - 1, Math.round(x)));
            y = Math.max(0, Math.min(snapshot.town.h - 1, Math.round(y)));
            if (typeof window.Engine?.hero?.autoGoTo === 'function') window.Engine.hero.autoGoTo({ x, y });
            else showStatus('Gra nie udostępnia teraz wyznaczania drogi.');
        }
        function stopCommand(text = '') { command = null; showStatus(text); }
        function commandStep() {
            if (!command || !snapshot?.hero || !binding?.surface || !isVisible(binding.native)) return;
            if (String(snapshot.town?.id) !== command.map) { stopCommand('Zmieniono mapę — zakończono podążanie.'); return; }
            const now = Date.now();
            if (command.kind === 'gate' && now - command.start > 90000) { stopCommand('Nie udało się dojść do przejścia.'); return; }
            let target = command;
            if (command.kind === 'player') {
                target = snapshot.players.find(player => player.id === command.id);
                if (!target) { stopCommand('Gracz zniknął z mapy.'); return; }
                const near = Math.max(Math.abs(snapshot.hero.x - target.x), Math.abs(snapshot.hero.y - target.y)) <= 1;
                if (near) {
                    if (state.attack && now - command.lastAttack >= 1200 && typeof window._g === 'function') {
                        command.lastAttack = now;
                        window._g(`fight&a=attack&id=${encodeURIComponent(command.id)}`);
                    }
                    return;
                }
            } else if (snapshot.hero.x === target.x && snapshot.hero.y === target.y) {
                if (!command.arrived) command.arrived = now;
                if (now - command.arrived > 3000 && now - command.sent > 3000 && command.tries < 3 && typeof window._g === 'function') {
                    command.sent = now; command.tries++; window._g('walk');
                }
                if (now - command.start > 90000) stopCommand('Zakończono oczekiwanie na przejście.');
                return;
            }
            if (now - command.sent < 1500) return;
            command.sent = now;
            const dx = command.kind === 'player' ? Math.sign(snapshot.hero.x - target.x) || 1 : 0;
            goTo(target.x + dx, target.y);
        }
        function act(kind, object) {
            if (kind === 'go') { stopCommand(); goTo(object.tx ?? object.x, object.ty ?? object.y); }
            if (kind === 'chase') {
                const id = String(object.id).replace(/^o/, '');
                if (command?.id === id) { stopCommand('Zatrzymano pościg.'); return; }
                command = { kind: 'player', id, map: String(snapshot.town.id), sent: 0, lastAttack: 0 };
                showStatus(`Podążanie za: ${object.nick}`); commandStep();
            }
            if (kind === 'gate') {
                command = { kind: 'gate', x: object.tx ?? object.x, y: object.ty ?? object.y, map: String(snapshot.town.id), start: Date.now(), sent: 0, arrived: 0, tries: 0 };
                showStatus(`Przejście: ${object.nick}`); commandStep();
            }
            if (kind === 'eq') {
                const id = String(object.id).replace(/^o/, '');
                const player = window.Engine?.others?.getById?.(id);
                if (typeof window.Engine?.showEqManager?.getEqData === 'function') window.Engine.showEqManager.getEqData({ ...object, ...(player?.d || player || {}), id: Number(id) || id });
                else showStatus('Gra nie udostępnia teraz podglądu ekwipunku.');
            }
            if (kind === 'copy') {
                const text = `${object.nick} na mapie ${snapshot.town.name} (${object.x},${object.y})`;
                Promise.resolve().then(() => window.navigator.clipboard.writeText(text)).then(() => showStatus('Skopiowano opis celu.'), () => showStatus('Nie udało się zapisać do schowka.'));
            }
        }
        function mountSettings() {
            const host = document.createElement('div');
            host.id = 'gogatki-mapa-plus-settings'; host.dataset.gogatkiMapUi = ''; host.hidden = !state.drawer;
            host.style.cssText = 'position:fixed;right:24px;top:160px;width:262px;max-width:calc(100vw - 16px);z-index:2147483000;';
            const root = host.attachShadow({ mode: 'open' });
            root.innerHTML = `<style>
                :host{all:initial;font:12px Arial,sans-serif;color:#c7d0d9}:host([hidden]){display:none!important}*{box-sizing:border-box;font:inherit;text-shadow:none}
                [hidden]{display:none!important}button,input{color:#c7d0d9;background:#252b31;border:1px solid #668298;border-radius:3px}
                button{cursor:pointer;padding:3px 5px}button:focus-visible,input:focus-visible{outline:2px solid #12c9bd;outline-offset:1px}
                .panel{width:100%;background:#171b20;border:1px solid #668298;border-radius:4px;overflow:hidden}.settings-header{height:28px;display:flex;align-items:center;padding:0 5px 0 8px;gap:6px;background:#252b31;cursor:move;touch-action:none;user-select:none}.settings-header strong{flex:1;color:#12c9bd;font-weight:600}.toggle{display:flex;align-items:center;justify-content:center;width:22px;height:22px;padding:2px;border:0;background:transparent;color:#12c9bd}.toggle:hover{background:#38566c}
                svg{width:16px;height:16px;pointer-events:none}.drawer{max-height:calc(100vh - 44px);overflow:auto;scrollbar-width:thin;scrollbar-color:#668298 #171b20;padding:8px}
                input[type=search]{width:100%;padding:4px;margin-bottom:5px}.options{display:grid;grid-template-columns:1fr 1fr;gap:5px}
                label{display:flex;gap:5px;align-items:center;font-size:11px}input[type=checkbox]{appearance:none;display:grid;place-content:center;width:14px;height:14px;min-width:14px;margin:0}
                input[type=checkbox]::before,input[type=checkbox]::after{content:none}input:checked::after{content:'✓';color:#12c9bd;font:12px/12px Arial}
                .status{font-size:11px;color:#b1c0cb;margin:6px 0;overflow-wrap:anywhere}.entry{border-top:1px solid #384651;padding:5px 0}.name{font-size:11px;overflow-wrap:anywhere}.actions{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}.actions button{font-size:11px;background:#38566c}.coords{color:#b1c0cb;font-size:11px;margin-top:2px}
            </style><div class="panel"><header class="settings-header"><strong>Mapa+</strong><button type="button" class="toggle" aria-label="Zwiń Mapa+ do docku" aria-expanded="true" title="Zwiń Mapa+ do docku"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/></svg></button></header>
            <section class="drawer" aria-label="Ustawienia Mapa+"><input type="search" placeholder="Nazwa lub x,y" aria-label="Szukaj na mapie"><div class="options"></div><p class="status" role="status"></p><button type="button" class="stop" hidden>Zatrzymaj podążanie</button><details><summary>Pomoc · 1.1.3</summary><button type="button" class="diagnose">Kopiuj diagnostykę</button><textarea aria-label="Diagnostyka mapy" readonly hidden style="width:100%;height:100px;color:#c7d0d9;background:#252b31"></textarea></details><div class="list"></div></section></div>`;
            const drawer = root.querySelector('.drawer'), toggle = root.querySelector('.toggle');
            toggle.setAttribute('aria-expanded', String(state.drawer));
            const options = [['mmShowMobs', 'Moby'], ['mmShowNpcs', 'NPC'], ['mmShowOthers', 'Gracze'], ['mmShowSpawns', 'Respy'], ['fog', 'Zasięg widzenia'], ['fogLight', 'Fog Light'], ['mmGwAvail', 'Dostępne przejścia'], ['attack', 'Atakuj w pościgu']];
            for (const [key, title] of options) {
                const label = document.createElement('label'), input = document.createElement('input');
                input.type = 'checkbox'; input.checked = state[key]; input.dataset.option = key;
                if (key === 'fogLight') label.title = 'Zapamiętuj tylko moby poza zasięgiem widzenia na mapach PvP. Gracze znikają zgodnie z danymi gry.';
                input.addEventListener('change', () => { state[key] = input.checked; if (key === 'fogLight' && !state.fogLight) fogLight.clear(); save(); });
                label.append(input, document.createTextNode(title)); root.querySelector('.options').append(label);
            }
            toggle.addEventListener('click', event => { event.stopPropagation(); setDrawer(false); });
            toggle.addEventListener('contextmenu', event => { event.preventDefault(); setDrawer(false); });
            root.querySelector('.diagnose').addEventListener('click', () => {
                const report = diagnosticReport(), output = root.querySelector('textarea');
                output.value = report; output.hidden = false; output.focus(); output.select();
                Promise.resolve().then(() => window.navigator.clipboard.writeText(report)).catch(() => {});
            });
            // Keep settings interactions inside this independent window.
            for (const type of ['pointerdown', 'mousedown', 'click', 'contextmenu', 'dblclick']) host.addEventListener(type, event => event.stopPropagation());
            const input = root.querySelector('input[type=search]');
            input.value = search.coords ? search.coords.join(',') : search.text;
            input.addEventListener('input', () => {
                const value = input.value.trim(), coords = value.match(/^(\d+)\s*[,; ]\s*(\d+)$/);
                search.text = coords ? '' : value.toLowerCase(); search.coords = coords ? [Number(coords[1]), Number(coords[2])] : null;
                if (search.coords && snapshot?.town && (search.coords[0] >= snapshot.town.w || search.coords[1] >= snapshot.town.h)) { search.coords = null; showStatus('Współrzędne poza tą mapą.'); }
                else showStatus('');
            });
            for (const type of ['keydown', 'keyup', 'keypress']) host.addEventListener(type, event => {
                if (event.composedPath().some(node => /^(INPUT|BUTTON|TEXTAREA|SUMMARY)$/.test(node?.tagName))) event.stopPropagation();
            });
            root.querySelector('.stop').addEventListener('click', () => stopCommand('Zatrzymano podążanie.'));
            const header = root.querySelector('.settings-header');
            let drag = null;
            header.addEventListener('pointerdown', event => {
                if (event.button !== 0 || event.target.closest('button')) return;
                const rect = host.getBoundingClientRect();
                drag = {id:event.pointerId,x:event.clientX,y:event.clientY,right:window.innerWidth-rect.right,top:rect.top};
                header.setPointerCapture(event.pointerId); event.preventDefault();
            });
            header.addEventListener('pointermove', event => {
                if (!drag || event.pointerId !== drag.id) return;
                state.windowRight = drag.right + drag.x - event.clientX;
                state.windowTop = drag.top + event.clientY - drag.y;
                placeSettings();
            });
            const finishDrag = event => {
                if (!drag || event.pointerId !== drag.id) return;
                drag = null;
                if (!host.isConnected) return;
                const rect = host.getBoundingClientRect();
                state.windowRight = window.innerWidth-rect.right; state.windowTop = rect.top; save();
                if (header.hasPointerCapture(event.pointerId)) header.releasePointerCapture(event.pointerId);
            };
            for (const type of ['pointerup','pointercancel','lostpointercapture']) header.addEventListener(type,finishDrag);
            document.body.append(host);
            return {host,root,drawer,toggle,input,status:root.querySelector('.status'),list:root.querySelector('.list'),rows:new Map(),map:String(snapshot?.town?.id)};
        }
        function mount(native) {
            const isolation = { value: native.style.getPropertyValue('isolation'), priority: native.style.getPropertyPriority('isolation') };
            native.style.setProperty('isolation', 'isolate');
            const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            overlay.dataset.gogatkiMapLayer = ''; overlay.setAttribute('aria-hidden', 'true');
            overlay.setAttribute('preserveAspectRatio', 'none');
            overlay.style.cssText = 'position:absolute;pointer-events:none;overflow:hidden;z-index:100000;display:none;';
            // Native markers can be painted into the same canvas as the terrain.
            // Cover that composite with clean terrain before drawing our markers;
            // the native canvas and its event handlers remain underneath.
            const backdrop = document.createElementNS(overlay.namespaceURI, 'rect');
            backdrop.setAttribute('width', '100%'); backdrop.setAttribute('height', '100%'); backdrop.setAttribute('fill', '#000');
            backdrop.dataset.gogatkiMapBackdrop = '';
            const terrain = document.createElementNS(overlay.namespaceURI, 'image');
            terrain.dataset.gogatkiMapTerrain = ''; terrain.setAttribute('preserveAspectRatio', 'none');
            overlay.append(backdrop, terrain);
            native.append(overlay);
            const markerHost = document.createElement('div');
            markerHost.dataset.gogatkiMapMarkers = '';
            markerHost.setAttribute('aria-hidden', 'true');
            markerHost.style.cssText = 'position:absolute;pointer-events:none;overflow:hidden;z-index:100001;display:none;';
            for (const [kind, color] of Object.entries(snapshot.colors)) markerHost.style.setProperty('--map-color-' + kind, color);
            const markerRoot = markerHost.attachShadow({ mode: 'open' });
            const markerStyle = document.createElement('style'); markerStyle.textContent = MAP_MARKER_CSS;
            const markerLayer = document.createElement('div'); markerLayer.className = 'pa-mm-objects';
            markerRoot.append(markerStyle, markerLayer); native.append(markerHost);
            return { native, overlay, terrain, markerHost, markerLayer, markerGeometry: '', background: null, isolation, surface: null, marks: new Map(), rect: null };
        }
        function unmount() {
            stopHeroAnimation();
            if (!binding) return;
            binding.surface?.removeEventListener('pointermove', hover);
            binding.surface?.removeEventListener('pointerleave', leave);
            releaseBackground();
            if (binding.native.style.getPropertyValue('isolation') === 'isolate') {
                if (binding.isolation.value) binding.native.style.setProperty('isolation', binding.isolation.value, binding.isolation.priority);
                else binding.native.style.removeProperty('isolation');
            }
            binding.overlay.remove(); binding.markerHost.remove(); binding = null;
            stopCommand();
        }
        function hover(event) {
            const r = binding?.rect, town = snapshot?.town;
            if (!r || !town) return;
            const x = Math.floor((event.clientX - r.left) / r.width * town.w), y = Math.floor((event.clientY - r.top) / r.height * town.h);
            if (x < 0 || y < 0 || x >= town.w || y >= town.h) return;
            const near = snapshot.objects.filter(o => Math.hypot(o.x - x, o.y - y) <= 1.5).slice(0, 3).map(o => o.nick).join(' · ');
            showStatus(`(${x},${y})${near ? ' — ' + near : ''}`);
        }
        function leave() { showStatus(''); }
        function setAttribute(node, key, value) { value = String(value); if (node.getAttribute(key) !== value) node.setAttribute(key, value); }
        function stopHeroAnimation() {
            if (heroFrame !== null) window.cancelAnimationFrame(heroFrame);
            heroFrame = null;
        }
        function renderHeroPosition() {
            const geometry = binding?.heroGeometry;
            if (!geometry || !binding.native.isConnected || !binding.surface?.isConnected || binding.native.style.display === 'none' || binding.markerHost.style.display === 'none') return false;
            const marker = binding.marks.get('self'), view = binding.marks.get('view');
            // Read live draw coordinates each frame; a snapshot taken by the
            // 200 ms data/UI timer would still make the marker jump between tiles.
            const hero = model.heroPosition(), x = Number(hero?.rx), y = Number(hero?.ry);
            if (!hero || !Number.isFinite(x) || !Number.isFinite(y) || String(window.Engine?.map?.d?.id) !== geometry.map) {
                if (marker) marker.style.display = 'none';
                if (view) view.style.display = 'none';
                return false;
            }
            const position = (node, left, top) => {
                if (!node) return;
                if (node.style.display) node.style.display = '';
                const transform = `translate(${left.toFixed(2)}px,${top.toFixed(2)}px)`;
                if (heroTransforms.get(node) !== transform) { node.style.transform = transform; heroTransforms.set(node, transform); }
            };
            position(marker, (x + 0.5) * geometry.scaleX - geometry.heroSize / 2, (y + 0.5) * geometry.scaleY - geometry.heroSize / 2);
            if (state.fog) position(view, (x - geometry.visibility) * geometry.scaleX, (y - geometry.visibility) * geometry.scaleY);
            else if (view) view.style.display = 'none';
            return Boolean(marker);
        }
        function animateHero() {
            heroFrame = null;
            if (disposed) return;
            try { if (renderHeroPosition()) heroFrame = window.requestAnimationFrame(animateHero); }
            catch (error) { if (!warned) { warned = true; console.warn('[Mapa podręczna+] Pozycja postaci:', error); } }
        }
        function startHeroAnimation() {
            if (heroFrame === null && renderHeroPosition()) heroFrame = window.requestAnimationFrame(animateHero);
        }
        function renderLayer(objects) {
            const { overlay, markerHost, markerLayer, marks, rect, native } = binding, town = snapshot.town;
            const nr = native.getBoundingClientRect(), sx = nr.width / (native.offsetWidth || nr.width), sy = nr.height / (native.offsetHeight || nr.height);
            const ncss = window.getComputedStyle(native);
            const geometry = { left: ((rect.left - nr.left) / sx - (parseFloat(ncss.borderLeftWidth) || 0)) + 'px', top: ((rect.top - nr.top) / sy - (parseFloat(ncss.borderTopWidth) || 0)) + 'px', width: rect.width / sx + 'px', height: rect.height / sy + 'px' };
            Object.assign(overlay.style, geometry); Object.assign(markerHost.style, geometry);
            setAttribute(overlay, 'viewBox', `0 0 ${town.w} ${town.h}`);
            let clip = { left: rect.left, top: rect.top, right: rect.left + rect.width, bottom: rect.top + rect.height };
            for (let parent = binding.surface.parentElement; parent; parent = parent.parentElement) {
                const css = window.getComputedStyle(parent), r = parent.getBoundingClientRect();
                if (/(hidden|clip|auto|scroll)/.test(css.overflowX)) { clip.left = Math.max(clip.left, r.left); clip.right = Math.min(clip.right, r.right); }
                if (/(hidden|clip|auto|scroll)/.test(css.overflowY)) { clip.top = Math.max(clip.top, r.top); clip.bottom = Math.min(clip.bottom, r.bottom); }
                if (parent === native) break;
            }
            overlay.style.clipPath = `inset(${Math.max(0, clip.top - rect.top) / sy}px ${Math.max(0, rect.left + rect.width - clip.right) / sx}px ${Math.max(0, rect.top + rect.height - clip.bottom) / sy}px ${Math.max(0, clip.left - rect.left) / sx}px)`;
            markerHost.style.clipPath = overlay.style.clipPath;
            const scaleX = rect.width / sx / town.w, scaleY = rect.height / sy / town.h;
            const dotSize = Math.max(7, Math.round(scaleX));
            const heroSize = Math.max(5, Math.round(dotSize * 0.7));
            binding.heroGeometry = { scaleX, scaleY, heroSize, visibility: town.visibility, map: String(town.id) };
            const geometryKey = `${town.id}:${geometry.width}:${geometry.height}`;
            const resized = geometryKey !== binding.markerGeometry;
            binding.markerGeometry = geometryKey;
            const desired = new Set();
            const hero = snapshot.hero;
            const shapes = objects.map(o => ({ ...o, key: o.id || `${o.kind}:${o.x},${o.y}` }));
            if (hero && Number.isFinite(Number(hero.rx)) && Number.isFinite(Number(hero.ry))) shapes.push({ key: 'self', kind: 'hero', x: Number(hero.rx), y: Number(hero.ry) });
            if (state.fog && hero && town.visibility > 0) shapes.push({ key: 'view', kind: 'view', x: Number(hero.rx) - town.visibility, y: Number(hero.ry) - town.visibility, size: 2 * town.visibility + 1 });
            for (const o of shapes) {
                if (!Number.isFinite(Number(o.x)) || !Number.isFinite(Number(o.y))) continue;
                desired.add(o.key);
                let mark = marks.get(o.key);
                const fresh = !mark;
                if (fresh) { mark = document.createElement('div'); mark.dataset.kind = o.kind; markerLayer.append(mark); marks.set(o.key, mark); }
                const special = o.kind === 'hero' || o.kind === 'view';
                const pulse = PULSE.has(o.kind) || Boolean(o.suspect);
                const animate = !special && !fresh && !resized;
                const classes = special ? `pa-mm-${o.kind}` : `pa-mm-obj pa-mm-${o.kind}${o.player ? ' pa-mm-player' : ''}${pulse ? ' pa-mm-pulse' : ''}${o.suspect ? ' pa-mm-suspect' : ''}${o.kind === 'resp' && o.checked ? ' pa-mm-near' : ''}${animate ? ' pa-mm-anim' : ''}`;
                if (mark.className !== classes) mark.className = classes;
                let width, height, left, top;
                if (o.kind === 'view') {
                    width = o.size * scaleX; height = o.size * scaleY; left = o.x * scaleX; top = o.y * scaleY;
                } else {
                    const size = o.kind === 'hero' || o.kind === 'mob' || o.kind === 'gw' ? heroSize : (pulse ? Math.round(dotSize * 1.5) : dotSize);
                    const spanScale = o.kind === 'gw' ? heroSize / dotSize : 1;
                    width = o.spanX ? Math.max(dotSize, o.spanX * scaleX) * spanScale : size;
                    height = o.spanY ? Math.max(dotSize, o.spanY * scaleY) * spanScale : size;
                    left = (Number(o.x) + 0.5) * scaleX - width / 2;
                    top = (Number(o.y) + 0.5) * scaleY - height / 2;
                }
                mark.style.width = width + 'px'; mark.style.height = height + 'px';
                mark.style.transform = `translate(${left.toFixed(2)}px,${top.toFixed(2)}px)`;
                if (!special) { mark.style.background = snapshot.colors[o.kind] || '#fff'; mark.style.color = snapshot.colors[o.kind] || '#fff'; mark.style.zIndex = String(MARKER_LAYERS[o.kind] || 100); }
                if (!special && (fresh || resized)) window.requestAnimationFrame(() => { if (mark.isConnected) mark.classList.add('pa-mm-anim'); });
            }
            for (const [key, mark] of marks) if (!desired.has(key)) { mark.remove(); marks.delete(key); }
            startHeroAnimation();
        }
        function renderRows(objects) {
            const rank = o => ({ titan: 1, collosus: 2, herosEvent: 3, heros: 4, elite3: 5, elite2: 6, enemy: 7, clanEnemy: 7, gw: 8, marker: 0 }[o.kind] ?? 20);
            const list = [...objects].sort((a, b) => rank(a) - rank(b) || String(a.nick).localeCompare(String(b.nick), 'pl')).slice(0, 80), wanted = new Set();
            for (const [index, o] of list.entries()) {
                const key = o.id || `${o.kind}:${o.x},${o.y}`; wanted.add(key);
                let row = settingsUi.rows.get(key);
                if (!row) {
                    const element = document.createElement('div'); element.className = 'entry';
                    const name = document.createElement('div'); name.className = 'name';
                    const coords = document.createElement('div'); coords.className = 'coords';
                    const actions = document.createElement('div'); actions.className = 'actions';
                    row = { element, name, coords, object: o }; element.append(name, coords, actions);
                    const add = (kind, title) => { const button = document.createElement('button'); button.type = 'button'; button.dataset.action = kind; button.textContent = title; button.addEventListener('click', () => act(kind, row.object)); actions.append(button); };
                    add(o.kind === 'gw' ? 'gate' : 'go', o.kind === 'gw' ? 'Przejdź' : 'Podejdź');
                    if (o.player) { add('chase', 'Goń'); add('eq', 'Ekwipunek'); }
                    if (/heros|titan|collosus/.test(o.kind)) add('copy', 'Kopiuj');
                    settingsUi.rows.set(key, row);
                }
                row.object = o;
                setText(row.name, `${o.nick || snapshot.names[o.kind] || 'Cel'}${o.lvl ? ' · ' + o.lvl + (o.prof || '') : ''}`);
                row.name.style.color = snapshot.colors[o.kind] || '#c7d0d9';
                setText(row.coords, `(${Math.round(o.x)},${Math.round(o.y)}) · ${snapshot.names[o.kind] || (o.player ? 'gracz' : '')}${o.suspect ? ' · ktoś stoi przy respie' : ''}`);
                if (settingsUi.list.children[index] !== row.element) settingsUi.list.insertBefore(row.element, settingsUi.list.children[index] || null);
            }
            for (const [key, row] of settingsUi.rows) if (!wanted.has(key)) { row.element.remove(); settingsUi.rows.delete(key); }
            settingsUi.root.querySelector('.stop').hidden = !command;
        }
        function tick() {
            if (disposed) return;
            hook(); fogLight.syncMap(); snapshot = model.snapshot();
            syncLauncher(); placeSettings();
            if (settingsUi.map !== String(snapshot.town?.id)) { settingsUi.map = String(snapshot.town?.id); settingsUi.input.value = search.text; }
            if (search.coords && (!snapshot.town || search.coords[0] >= snapshot.town.w || search.coords[1] >= snapshot.town.h)) { search.coords = null; showStatus('Współrzędne poza tą mapą.'); }
            const allowedGates = new Set(snapshot.gateways.map(g => g.id));
            const objects = snapshot.objects.filter(o => !state.mmGwAvail || o.kind !== 'gw' || !String(o.id || '').startsWith('gw-') || allowedGates.has(o.id));
            renderRows(objects);
            const native = findWindow();
            if (native !== binding?.native) { unmount(); if (native) binding = mount(native); }
            if (!binding) {
                if (!hint) setText(settingsUi.status, snapshot.town?.name || 'Mapa+');
                return;
            }
            const surface = findSurface(native, snapshot.town);
            if (surface !== binding.surface) {
                binding.surface?.removeEventListener('pointermove', hover); binding.surface?.removeEventListener('pointerleave', leave);
                binding.surface = surface;
                surface?.addEventListener('pointermove', hover, { passive: true }); surface?.addEventListener('pointerleave', leave, { passive: true });
            }
            const backgroundReady = surface && prepareBackground();
            binding.overlay.style.display = backgroundReady ? '' : 'none';
            binding.markerHost.style.display = backgroundReady ? '' : 'none';
            if (!surface) { stopHeroAnimation(); stopCommand(); showStatus('Nie rozpoznano obszaru mapy. Natywna mapa działa bez zmian.'); return; }
            if (!backgroundReady) {
                stopHeroAnimation();
                stopCommand();
                showStatus(!binding.background || binding.background.failed ? 'Nie udało się odczytać tła — pokazuję mapę gry bez dodatku.' : 'Wczytywanie czystego tła mapy…');
                return;
            }
            if (['Wczytywanie czystego tła mapy…', 'Nie udało się odczytać tła — pokazuję mapę gry bez dodatku.', 'Nie rozpoznano obszaru mapy. Natywna mapa działa bez zmian.'].includes(hint)) hint = '';
            binding.rect = surfaceRegions.get(surface) || contentRect(surface);
            renderLayer(objects); commandStep();
            if (!hint) setText(settingsUi.status, state.mmGwAvail && !snapshot.collisionKnown ? 'Brak danych kolizji — pokazuję wszystkie przejścia.' : `${snapshot.town.name || 'Mapa'} · oznaczenia: ${objects.length}`);
        }
        function destroy(event) {
            if (event?.persisted) return;
            if (disposed) return; disposed = true;
            window.clearInterval(timer);
            try { fogLight.clear(); } catch (error) { console.warn('[Mapa podręczna+] Czyszczenie Fog Light:', error); }
            unmount(); unhook();
            launcher.remove(); settingsUi?.host.remove();
            window.removeEventListener('resize', placeSettings);
            window.removeEventListener('pagehide', destroy);
            if (window[INSTANCE]?.destroy === destroy) delete window[INSTANCE];
        }
        window[INSTANCE] = { destroy };
        window.addEventListener('pagehide', destroy);
        settingsUi = mountSettings(); placeSettings();
        window.addEventListener('resize', placeSettings);
        try { tick(); } catch (error) { destroy(); throw error; }
        timer = window.setInterval(() => {
            try { tick(); } catch (error) { if (!warned) { warned = true; console.warn('[Mapa podręczna+]', error); } }
        }, 200);
    }
});
