// Mapa podręczna+ 1.0.1 — enhancement of the native NI window.
GogatkiRuntime.register({
    id: 'mapa-podreczna',
    name: 'Mapa podręczna+',
    description: 'NI: oznaczenia, filtry i wyszukiwarka w istniejącej mapie podręcznej gry.',
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

        const defaults = { mmShowMobs: true, mmShowNpcs: true, mmShowOthers: true, mmShowSpawns: true,
            mmSpawnRange: 10, mmGwAvail: false, fog: true, attack: false, drawer: false };
        let saved;
        try { saved = GM_getValue(KEY, {}); } catch { saved = {}; }
        const state = { ...defaults };
        for (const key of Object.keys(defaults)) if (typeof defaults[key] === 'boolean' && typeof saved?.[key] === 'boolean') state[key] = saved[key];
        const search = { text: '', coords: null };
        let binding = null, disposed = false, command = null, timer = null, hooked = null, snapshot = null;
        let hint = '', warned = false;
        const setText = (node, value) => { if (node && node.textContent !== value) node.textContent = value; };
        const model = createMapModel(window, state, search, () => {});
        function save() { try { GM_setValue(KEY, { ...state }); } catch { showStatus('Nie udało się zapisać ustawień.'); } }
        function showStatus(text) { hint = text; if (binding) setText(binding.status, text); }
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
        function contentRect(surface) {
            const r = surface.getBoundingClientRect(), css = window.getComputedStyle(surface);
            const sx = r.width / (surface.offsetWidth || r.width), sy = r.height / (surface.offsetHeight || r.height);
            const left = (parseFloat(css.borderLeftWidth) + parseFloat(css.paddingLeft) || 0) * sx;
            const right = (parseFloat(css.borderRightWidth) + parseFloat(css.paddingRight) || 0) * sx;
            const top = (parseFloat(css.borderTopWidth) + parseFloat(css.paddingTop) || 0) * sy;
            const bottom = (parseFloat(css.borderBottomWidth) + parseFloat(css.paddingBottom) || 0) * sy;
            return { left: r.left + left, top: r.top + top, width: r.width - left - right, height: r.height - top - bottom };
        }
        function findSurface(native, town) {
            if (!(town?.w > 0 && town?.h > 0)) return null;
            const ratio = town.w / town.h;
            const nodes = [...native.querySelectorAll('canvas, img, .handheld-map, .handheld-minimap')];
            // NI can expose the map as a CSS image rather than an <img>/canvas.
            if (town.file) for (const node of native.querySelectorAll('.content *, .inner-content *, .window-content *')) {
                if (!nodes.includes(node) && window.getComputedStyle(node).backgroundImage.includes(town.file)) nodes.push(node);
            }
            const candidates = nodes.filter(node => {
                if (node.closest('[data-gogatki-map-ui]') || !isVisible(node)) return false;
                if (!/^(CANVAS|IMG)$/.test(node.tagName) && window.getComputedStyle(node).backgroundImage === 'none') return false;
                const r = contentRect(node);
                return r.width >= 64 && r.height >= 64 && Math.abs(r.width / r.height / ratio - 1) < 0.04;
            });
            return candidates.sort((a, b) => {
                const score = node => {
                    const r = contentRect(node);
                    const source = node.currentSrc || node.src || '';
                    return r.width * r.height + (town.file && source.includes(town.file) ? 1e9 : 0);
                };
                return score(b) - score(a);
            })[0] || null;
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
                try { return original.apply(this, arguments); }
                finally {
                    if (!disposed) try { model.feed(typeof data === 'string' ? JSON.parse(data) : data); }
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
        function mount(native) {
            const host = document.createElement('div');
            host.dataset.gogatkiMapUi = '';
            host.style.cssText = 'position:absolute;right:8px;top:28px;z-index:100001;max-width:calc(100% - 16px);';
            const root = host.attachShadow({ mode: 'open' });
            root.innerHTML = `<style>
                :host{all:initial;font:12px Arial,sans-serif;color:#c7d0d9}*{box-sizing:border-box;font:inherit;text-shadow:none}
                [hidden]{display:none!important}button,input{color:#c7d0d9;background:#252b31;border:1px solid #668298;border-radius:3px}
                button{cursor:pointer;padding:3px 5px}button:focus-visible,input:focus-visible{outline:2px solid #12c9bd;outline-offset:1px}
                .toggle{display:flex;align-items:center;gap:5px;margin-left:auto;background:#38566c;color:#12c9bd;height:28px}
                svg{width:15px;height:15px;pointer-events:none}.drawer{width:230px;max-width:100%;max-height:var(--gmp-height,300px);overflow:auto;background:#171b20;border:1px solid #668298;border-radius:4px;padding:7px;margin-top:3px}
                input[type=search]{width:100%;padding:4px;margin-bottom:5px}.options{display:grid;grid-template-columns:1fr 1fr;gap:5px}
                label{display:flex;gap:5px;align-items:center;font-size:11px}input[type=checkbox]{appearance:none;display:grid;place-content:center;width:14px;height:14px;min-width:14px;margin:0}
                input[type=checkbox]::before,input[type=checkbox]::after{content:none}input:checked::after{content:'✓';color:#12c9bd;font:12px/12px Arial}
                .status{font-size:11px;color:#b1c0cb;margin:6px 0;overflow-wrap:anywhere}.entry{border-top:1px solid #384651;padding:5px 0}.name{font-size:11px;overflow-wrap:anywhere}.actions{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}.actions button{font-size:11px;background:#38566c}.coords{color:#b1c0cb;font-size:11px;margin-top:2px}
            </style><button type="button" class="toggle" aria-expanded="false" title="Rozszerzenia mapy podręcznej"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg>Mapa+</button>
            <section class="drawer" aria-label="Rozszerzenia mapy podręcznej" hidden><input type="search" placeholder="Nazwa lub x,y" aria-label="Szukaj na mapie"><div class="options"></div><p class="status" role="status"></p><button type="button" class="stop" hidden>Zatrzymaj podążanie</button><div class="list"></div></section>`;
            const drawer = root.querySelector('.drawer'), toggle = root.querySelector('.toggle');
            drawer.hidden = !state.drawer; toggle.setAttribute('aria-expanded', String(state.drawer));
            const options = [['mmShowMobs', 'Moby'], ['mmShowNpcs', 'NPC'], ['mmShowOthers', 'Gracze'], ['mmShowSpawns', 'Respy'], ['fog', 'Zasięg widzenia'], ['mmGwAvail', 'Dostępne przejścia'], ['attack', 'Atakuj w pościgu']];
            for (const [key, title] of options) {
                const label = document.createElement('label'), input = document.createElement('input');
                input.type = 'checkbox'; input.checked = state[key]; input.dataset.option = key;
                input.addEventListener('change', () => { state[key] = input.checked; save(); });
                label.append(input, document.createTextNode(title)); root.querySelector('.options').append(label);
            }
            toggle.addEventListener('click', event => { event.stopPropagation(); state.drawer = !state.drawer; drawer.hidden = !state.drawer; toggle.setAttribute('aria-expanded', String(state.drawer)); save(); });
            const input = root.querySelector('input[type=search]');
            input.value = search.coords ? search.coords.join(',') : search.text;
            input.addEventListener('input', () => {
                const value = input.value.trim(), coords = value.match(/^(\d+)\s*[,; ]\s*(\d+)$/);
                search.text = coords ? '' : value.toLowerCase(); search.coords = coords ? [Number(coords[1]), Number(coords[2])] : null;
                if (search.coords && snapshot?.town && (search.coords[0] >= snapshot.town.w || search.coords[1] >= snapshot.town.h)) { search.coords = null; showStatus('Współrzędne poza tą mapą.'); }
                else showStatus('');
            });
            for (const type of ['keydown', 'keyup', 'keypress']) host.addEventListener(type, event => {
                if (event.composedPath().some(node => /^(INPUT|BUTTON)$/.test(node?.tagName))) event.stopPropagation();
            });
            root.querySelector('.stop').addEventListener('click', () => stopCommand('Zatrzymano podążanie.'));
            const isolation = { value: native.style.getPropertyValue('isolation'), priority: native.style.getPropertyPriority('isolation') };
            native.style.setProperty('isolation', 'isolate');
            native.append(host);
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
            return { native, host, root, drawer, input, status: root.querySelector('.status'), list: root.querySelector('.list'), overlay, terrain, background: null, isolation, surface: null, marks: new Map(), rows: new Map(), rect: null, map: String(snapshot?.town?.id) };
        }
        function unmount() {
            if (!binding) return;
            binding.surface?.removeEventListener('pointermove', hover);
            binding.surface?.removeEventListener('pointerleave', leave);
            releaseBackground();
            if (binding.native.style.getPropertyValue('isolation') === 'isolate') {
                if (binding.isolation.value) binding.native.style.setProperty('isolation', binding.isolation.value, binding.isolation.priority);
                else binding.native.style.removeProperty('isolation');
            }
            binding.host.remove(); binding.overlay.remove(); binding = null;
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
        function renderLayer(objects) {
            const { overlay, marks, rect, native } = binding, town = snapshot.town;
            const nr = native.getBoundingClientRect(), sx = nr.width / (native.offsetWidth || nr.width), sy = nr.height / (native.offsetHeight || nr.height);
            const ncss = window.getComputedStyle(native);
            Object.assign(overlay.style, { left: ((rect.left - nr.left) / sx - (parseFloat(ncss.borderLeftWidth) || 0)) + 'px', top: ((rect.top - nr.top) / sy - (parseFloat(ncss.borderTopWidth) || 0)) + 'px', width: rect.width / sx + 'px', height: rect.height / sy + 'px' });
            setAttribute(overlay, 'viewBox', `0 0 ${town.w} ${town.h}`);
            let clip = { left: rect.left, top: rect.top, right: rect.left + rect.width, bottom: rect.top + rect.height };
            for (let parent = binding.surface.parentElement; parent; parent = parent.parentElement) {
                const css = window.getComputedStyle(parent), r = parent.getBoundingClientRect();
                if (/(hidden|clip|auto|scroll)/.test(css.overflowX)) { clip.left = Math.max(clip.left, r.left); clip.right = Math.min(clip.right, r.right); }
                if (/(hidden|clip|auto|scroll)/.test(css.overflowY)) { clip.top = Math.max(clip.top, r.top); clip.bottom = Math.min(clip.bottom, r.bottom); }
                if (parent === native) break;
            }
            overlay.style.clipPath = `inset(${Math.max(0, clip.top - rect.top) / sy}px ${Math.max(0, rect.left + rect.width - clip.right) / sx}px ${Math.max(0, rect.top + rect.height - clip.bottom) / sy}px ${Math.max(0, clip.left - rect.left) / sx}px)`;
            const desired = new Set();
            const hero = snapshot.hero;
            const shapes = objects.map(o => ({ ...o, key: o.id || `${o.kind}:${o.x},${o.y}`, shape: 'ellipse' }));
            if (hero && Number.isFinite(Number(hero.rx)) && Number.isFinite(Number(hero.ry))) shapes.push({ key: 'self', kind: 'hero', x: Number(hero.rx), y: Number(hero.ry), shape: 'ellipse' });
            if (state.fog && hero && town.visibility > 0) shapes.push({ key: 'view', kind: 'view', x: hero.x - town.visibility, y: hero.y - town.visibility, size: 2 * town.visibility + 1, shape: 'rect' });
            for (const o of shapes) {
                if (!Number.isFinite(Number(o.x)) || !Number.isFinite(Number(o.y))) continue;
                desired.add(o.key);
                let mark = marks.get(o.key);
                if (!mark) { mark = document.createElementNS(overlay.namespaceURI, o.shape); setAttribute(mark, 'data-kind', o.kind); setAttribute(mark, 'vector-effect', 'non-scaling-stroke'); overlay.append(mark); marks.set(o.key, mark); }
                const color = o.kind === 'view' ? '#c7d0d9' : (snapshot.colors[o.kind] || '#fff');
                if (o.shape === 'rect') { setAttribute(mark, 'x', o.x); setAttribute(mark, 'y', o.y); setAttribute(mark, 'width', o.size); setAttribute(mark, 'height', o.size); }
                else {
                    setAttribute(mark, 'cx', Number(o.x) + 0.5); setAttribute(mark, 'cy', Number(o.y) + 0.5);
                    const size = /heros|titan|collosus|elite[23]/.test(o.kind) ? 4.5 : 3;
                    setAttribute(mark, 'rx', size / rect.width * town.w); setAttribute(mark, 'ry', size / rect.height * town.h);
                }
                const ring = o.kind === 'view' || /^resp/.test(o.kind) || o.kind === 'marker';
                setAttribute(mark, 'fill', ring ? 'none' : color); setAttribute(mark, 'stroke', o.suspect ? '#ffd23f' : (o.checked ? '#fff' : color)); setAttribute(mark, 'stroke-width', ring ? 1.5 : 1);
            }
            for (const [key, mark] of marks) if (!desired.has(key)) { mark.remove(); marks.delete(key); }
        }
        function renderRows(objects) {
            const rank = o => ({ titan: 1, collosus: 2, herosEvent: 3, heros: 4, elite3: 5, elite2: 6, enemy: 7, gw: 8, marker: 0 }[o.kind] ?? 20);
            const list = [...objects].sort((a, b) => rank(a) - rank(b) || String(a.nick).localeCompare(String(b.nick), 'pl')).slice(0, 80), wanted = new Set();
            for (const [index, o] of list.entries()) {
                const key = o.id || `${o.kind}:${o.x},${o.y}`; wanted.add(key);
                let row = binding.rows.get(key);
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
                    binding.rows.set(key, row);
                }
                row.object = o;
                setText(row.name, `${o.nick || snapshot.names[o.kind] || 'Cel'}${o.lvl ? ' · ' + o.lvl + (o.prof || '') : ''}`);
                row.name.style.color = snapshot.colors[o.kind] || '#c7d0d9';
                setText(row.coords, `(${Math.round(o.x)},${Math.round(o.y)}) · ${snapshot.names[o.kind] || (o.player ? 'gracz' : '')}${o.suspect ? ' · ktoś stoi przy respie' : ''}`);
                if (binding.list.children[index] !== row.element) binding.list.insertBefore(row.element, binding.list.children[index] || null);
            }
            for (const [key, row] of binding.rows) if (!wanted.has(key)) { row.element.remove(); binding.rows.delete(key); }
            binding.root.querySelector('.stop').hidden = !command;
        }
        function tick() {
            if (disposed) return;
            hook(); snapshot = model.snapshot();
            const native = findWindow();
            if (native !== binding?.native) { unmount(); if (native) binding = mount(native); }
            if (!binding) return;
            if (binding.map !== String(snapshot.town?.id)) { binding.map = String(snapshot.town?.id); binding.input.value = search.text; }
            binding.host.style.setProperty('--gmp-height', Math.max(90, native.offsetHeight - 90) + 'px');
            const surface = findSurface(native, snapshot.town);
            if (surface !== binding.surface) {
                binding.surface?.removeEventListener('pointermove', hover); binding.surface?.removeEventListener('pointerleave', leave);
                binding.surface = surface;
                surface?.addEventListener('pointermove', hover, { passive: true }); surface?.addEventListener('pointerleave', leave, { passive: true });
            }
            const backgroundReady = surface && prepareBackground();
            binding.overlay.style.display = backgroundReady ? '' : 'none';
            if (!surface) { stopCommand(); showStatus('Nie rozpoznano obszaru mapy. Natywna mapa działa bez zmian.'); return; }
            if (!backgroundReady) {
                stopCommand();
                showStatus(!binding.background || binding.background.failed ? 'Nie udało się odczytać tła — pokazuję mapę gry bez dodatku.' : 'Wczytywanie czystego tła mapy…');
                return;
            }
            if (['Wczytywanie czystego tła mapy…', 'Nie udało się odczytać tła — pokazuję mapę gry bez dodatku.', 'Nie rozpoznano obszaru mapy. Natywna mapa działa bez zmian.'].includes(hint)) hint = '';
            binding.rect = contentRect(surface);
            if (search.coords && (!snapshot.town || search.coords[0] >= snapshot.town.w || search.coords[1] >= snapshot.town.h)) { search.coords = null; showStatus('Współrzędne poza tą mapą.'); }
            const allowedGates = new Set(snapshot.gateways.map(g => g.id));
            const objects = snapshot.objects.filter(o => !state.mmGwAvail || o.kind !== 'gw' || !String(o.id || '').startsWith('gw-') || allowedGates.has(o.id));
            renderLayer(objects); renderRows(objects); commandStep();
            if (!hint) setText(binding.status, state.mmGwAvail && !snapshot.collisionKnown ? 'Brak danych kolizji — pokazuję wszystkie przejścia.' : `${snapshot.town.name || 'Mapa'} · oznaczenia: ${objects.length}`);
        }
        function destroy(event) {
            if (event?.persisted) return;
            if (disposed) return; disposed = true;
            window.clearInterval(timer); unmount(); unhook();
            window.removeEventListener('pagehide', destroy);
            if (window[INSTANCE]?.destroy === destroy) delete window[INSTANCE];
        }
        window[INSTANCE] = { destroy };
        window.addEventListener('pagehide', destroy);
        try { tick(); } catch (error) { destroy(); throw error; }
        timer = window.setInterval(() => {
            try { tick(); } catch (error) { if (!warned) { warned = true; console.warn('[Mapa podręczna+]', error); } }
        }, 200);
    }
});
