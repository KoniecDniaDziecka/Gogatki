// ==UserScript==
// @name         Gogatki — panel dodatków
// @namespace    gogatek.local
// @version      0.7.4
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
    function createTileDock() {
        const specs = [
            {id:'standalone-fullmetal', name:'Ulepa', control:'[data-min]'},
            {id:'standalone-loot-filter', name:'Lootfilter', control:'[data-settings]', click:true, icon:'bag'},
            {id:'wolacz-global-panel', name:'Wołacz Kolosy', control:'[aria-label="Uchwyt do przesuwania przycisku"]', icon:'megaphone'},
            {id:'standalone-free-gift', name:'Gift', gift:true},
            {id:'pvp-clan-notificator', name:'PVP Info', control:'[data-settings]'},
            {id:'anty-x', name:'Anty X', control:'.gear', shadow:true, clickToOpen:true},
            {id:'emergency-item-standalone', name:'Auto TP', control:'.gear', shadow:true}
        ];
        const selector = specs.map(s => '#' + s.id).join(',');
        const entries = new Map();
        const key = 'gogatki:tile-dock:position:v1';
        const layoutKey = 'gogatki:tile-dock:layout:v1';
        const collapsedKey = 'gogatki:tile-dock:collapsed:v1';
        let collapsed = false;
        try { collapsed = GM_getValue(collapsedKey, false) === true; } catch {}
        let vertical = false;
        try { vertical = GM_getValue(layoutKey, 'horizontal') === 'vertical'; } catch {}
        let preferred = {right:18, top:80};
        try {
            const saved = GM_getValue(key, null);
            if (Number.isFinite(saved?.right) && Number.isFinite(saved?.top)) preferred = saved;
        } catch {}
        const host = document.createElement('div');
        host.id = 'gogatki-tile-dock'; host.hidden = true;
        host.setAttribute('role', 'group');
        host.setAttribute('aria-label', 'Pasek dodatków');
        const root = host.attachShadow({mode:'open'});
        root.innerHTML = `<style>
            :host{all:initial;display:block;position:fixed;z-index:2147483647;width:max-content;max-width:calc(100vw - 16px);font:12px Arial,sans-serif;color:#c7d0d9}
            :host([hidden]){display:none!important}
            *{box-sizing:border-box}
            .bar{display:flex;align-items:flex-start;gap:4px;padding:4px;background:#171b20;border:1px solid #668298;border-radius:4px;box-shadow:0 4px 16px #0006}
            .grip{display:flex;align-items:center;justify-content:center;flex:none;width:18px;height:28px;padding:0;border:0;border-radius:3px;background:#252b31;color:#b1c0cb;cursor:move;touch-action:none}
            .grip:focus-visible{outline:2px solid #12c9bd;outline-offset:1px}
            .tiles{display:flex;flex-wrap:wrap;align-items:center;gap:4px;max-width:calc(100vw - 54px)}
            :host([data-orientation="vertical"]) .bar{flex-direction:column;align-items:center}
            :host([data-orientation="vertical"]) .grip{width:28px;height:18px}
            :host([data-orientation="vertical"]) .grip svg{transform:rotate(90deg)}
            :host([data-orientation="vertical"]) .tiles{flex-direction:column;flex-wrap:nowrap;max-width:calc(100vw - 26px);max-height:calc(100vh - 56px);overflow-y:auto;overflow-x:hidden}
            :host([data-collapsed="true"]) .tiles{display:none!important}
            :host([data-collapsed="true"]) .grip{width:var(--tile,28px);height:var(--tile,28px);color:#12c9bd;cursor:pointer}
            :host([data-collapsed="true"]) .grip svg{transform:none}
            slot{display:contents}
        </style><div class="bar"><button class="grip" type="button" aria-label="Przesuń pasek zwiniętych dodatków" title="Przeciągnij pasek. Strzałki przesuwają go o 10 px."><svg viewBox="0 0 12 18" width="10" height="16" fill="currentColor" aria-hidden="true"><circle cx="4" cy="4" r="1"/><circle cx="8" cy="4" r="1"/><circle cx="4" cy="9" r="1"/><circle cx="8" cy="9" r="1"/><circle cx="4" cy="14" r="1"/><circle cx="8" cy="14" r="1"/></svg></button><div class="tiles" id="gogatki-dock-tiles"><slot></slot></div></div>`;
        // Slotted light-DOM panels retain their existing scoped game styles.
        const style = document.createElement('style');
        style.textContent = `
            :root #gogatki-tile-dock > [data-gogatki-docked]{position:static!important;inset:auto!important;transform:none!important;float:none!important;margin:0!important;flex:0 0 auto!important;align-self:center;max-width:100%}
            :root #gogatki-tile-dock > [data-gogatki-docked]:not(#standalone-free-gift){display:none!important}
            :root #gogatki-tile-dock > .gogatki-dock-toggle{all:initial;box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:center!important;flex:0 0 auto!important;align-self:center!important;width:var(--tile,28px)!important;height:var(--tile,28px)!important;padding:0!important;margin:0!important;border:1px solid #668298!important;border-radius:4px!important;background:#252b31!important;color:#12c9bd!important;opacity:1!important;filter:none!important;box-shadow:none!important;font:12px/1 Arial,sans-serif!important;text-shadow:none!important;-webkit-text-stroke:0!important;cursor:pointer;touch-action:manipulation}
            :root #gogatki-tile-dock > .gogatki-dock-toggle[aria-expanded="true"]{border-color:#12c9bd!important;background:#173838!important}
            :root #gogatki-tile-dock > .gogatki-dock-toggle:focus-visible{outline:2px solid #12c9bd!important;outline-offset:2px}
            :root #gogatki-tile-dock > .gogatki-dock-toggle::before,:root #gogatki-tile-dock > .gogatki-dock-toggle::after{content:none!important;display:none!important}
            :root #gogatki-tile-dock > .gogatki-dock-toggle svg{display:block!important;width:18px!important;height:18px!important;color:#12c9bd!important;pointer-events:none!important}
        `;
        document.head.append(style); document.body.append(host);
        let frame = 0, disposed = false;
        function place() {
            if (host.hidden) return;
            const box = host.getBoundingClientRect();
            host.style.right = Math.max(0, Math.min(preferred.right, window.innerWidth - box.width)) + 'px';
            host.style.top = Math.max(0, Math.min(preferred.top, window.innerHeight - box.height)) + 'px';
        }
        function save() { try { GM_setValue(key, {...preferred}); } catch {} }
        function compact(entry) {
            if (entry.spec.gift) return true;
            return entry.spec.shadow ? entry.node.shadowRoot?.querySelector('.panel')?.classList.contains('collapsed') : entry.node.dataset.compact === 'true';
        }
        function dock(entry) {
            if (entry.docked) return;
            entry.parent = entry.node.parentNode; entry.next = entry.node.nextSibling;
            entry.docked = true; entry.node.setAttribute('data-gogatki-docked', '');
            host.append(entry.node);
        }
        function release(entry) {
            if (!entry.docked) return;
            entry.docked = false; entry.node.removeAttribute('data-gogatki-docked');
            const parent = entry.parent?.isConnected ? entry.parent : document.body;
            parent.insertBefore(entry.node, entry.next?.parentNode === parent ? entry.next : null);
        }
        function control(entry) { return (entry.node.shadowRoot || entry.node).querySelector(entry.spec.control); }
        function makeToggle(entry) {
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'gogatki-dock-toggle';
            button.dataset.gogatkiDockItem = entry.spec.id;
            button.setAttribute('aria-controls', entry.spec.id);
            const icons = {
                bag:'<path d="m8 3 2 4h4l2-4H8ZM8 8h8M9 8c-2 3-5 5-5 9a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4c0-4-3-6-5-9"/><circle cx="12" cy="15.5" r="2.5"/>',
                megaphone:'<path d="M3 10v4h4l12 5V5L7 10H3Z"/><path d="m7 14 2 7h4l-2-5M7 10v4M22 9v6"/>'
            };
            if (entry.spec.icon) button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icons[entry.spec.icon] + '</svg>';
            else {
                const svg = control(entry)?.querySelector('svg');
                if (svg) button.append(svg.cloneNode(true));
            }
            function toggle(event) {
                event.preventDefault(); event.stopPropagation();
                if (!entry.node.isConnected) return;
                // Measure and save the module's floating coordinates, never its dock coordinates.
                release(entry);
                const target = control(entry);
                if (target) {
                    if (entry.spec.click || (entry.spec.clickToOpen && compact(entry))) target.click();
                    else target.dispatchEvent(new MouseEvent('contextmenu', {bubbles:true, cancelable:true}));
                }
                sync();
            }
            button.addEventListener('click', toggle);
            button.addEventListener('contextmenu', toggle);
            return button;
        }
        function sync() {
            frame = 0; if (disposed) return;
            const launcher = document.querySelector('#gogatek-panel')?.shadowRoot?.querySelector('.launcher');
            host.style.setProperty('--tile', (launcher?.getBoundingClientRect().height || 28) + 'px');
            for (const spec of specs) {
                let entry = entries.get(spec.id);
                if (entry && !entry.node.isConnected) { entry.observer.disconnect(); entry.button?.remove(); entries.delete(spec.id); entry = null; }
                if (!entry) {
                    const node = document.getElementById(spec.id);
                    if (!node) continue;
                    entry = {node, spec, docked:false, observer:new MutationObserver(schedule)};
                    entries.set(spec.id, entry);
                    if (!spec.gift) entry.button = makeToggle(entry);
                    entry.observer.observe(node, {attributes:true, attributeFilter:['data-compact']});
                    if (node.shadowRoot) entry.observer.observe(node.shadowRoot, {subtree:true, attributes:true, attributeFilter:['class']});
                }
                if (compact(entry)) dock(entry); else release(entry);
                if (entry.button) {
                    const expanded = !compact(entry);
                    const title = spec.name + (expanded ? ' — zwiń' : ' — rozwiń');
                    entry.button.title = title; entry.button.setAttribute('aria-label', title);
                    entry.button.setAttribute('aria-expanded', String(expanded));
                } else entry.node.dataset.gogatkiDockItem = spec.id;
            }
            // Keep a permanent button for each module; its compact UI is parked out of sight.
            const ordered = [];
            for (const spec of specs) {
                const entry = entries.get(spec.id); if (!entry) continue;
                if (entry.button) ordered.push(entry.button);
                if (entry.docked) ordered.push(entry.node);
            }
            let cursor = host.firstElementChild;
            for (const node of ordered) {
                if (cursor === node) cursor = cursor.nextElementSibling;
                else host.insertBefore(node, cursor);
            }
            host.hidden = entries.size === 0;
            place();
        }
        function schedule() { if (!frame && !disposed) frame = window.requestAnimationFrame(sync); }
        const observer = new MutationObserver(records => {
            if (records.some(r => [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && (n.matches(selector) || n.querySelector(selector))))) schedule();
        });
        observer.observe(document.body, {childList:true, subtree:true});
        const resize = new ResizeObserver(place); resize.observe(host);
        function findEntry(event) {
            return event.composedPath().map(n => n?.id && entries.get(n.id)).find(e => e?.docked);
        }
        function preventTileDrag(event) {
            if (findEntry(event)) event.stopPropagation();
        }
        for (const type of ['pointerdown','mousedown']) document.addEventListener(type, preventTileDrag, true);
        const grip = root.querySelector('.grip'); let drag, dragged = false, expandedByFirstClick = false, arrowActivation = null;
        const gripIcon = grip.innerHTML;
        function updateView() {
            host.dataset.orientation = vertical ? 'vertical' : 'horizontal';
            host.dataset.collapsed = String(collapsed);
            grip.setAttribute('aria-expanded', String(!collapsed));
            grip.setAttribute('aria-controls', 'gogatki-dock-tiles');
            grip.setAttribute('aria-label', collapsed ? 'Rozwiń pasek dodatków' : 'Przesuń pasek dodatków');
            const arrow = vertical ? 'M12 5v14m-6-6 6 6 6-6' : 'M5 12h14m-6-6 6 6-6 6';
            grip.innerHTML = collapsed ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + arrow + '"/></svg>' : gripIcon;
            grip.title = (collapsed ? 'Kliknij, aby rozwinąć pasek. ' : 'Dwuklik: zwiń pasek. ') +
                'Przeciągnij, aby przesunąć. PPM: układ ' + (vertical ? 'poziomy' : 'pionowy') + '. Strzałki przesuwają o 10 px.';
            place();
        }
        function anchoredView(change) {
            const before = grip.getBoundingClientRect();
            const anchorX = before.left + before.width / 2;
            const anchorY = before.top + before.height / 2;
            change(); updateView();
            const after = grip.getBoundingClientRect();
            const box = host.getBoundingClientRect();
            preferred = {
                right: window.innerWidth - box.right + after.left + after.width / 2 - anchorX,
                top: box.top + anchorY - after.top - after.height / 2
            };
            place(); save();
        }
        function setCollapsed(value) {
            anchoredView(() => { collapsed = value; });
            try { GM_setValue(collapsedKey, collapsed); } catch {}
        }
        updateView();
        grip.addEventListener('click', event => {
            if (event.detail <= 1) expandedByFirstClick = false;
            if (dragged && event.detail !== 0) { event.preventDefault(); return; }
            if (event.detail === 0) { arrowActivation = null; setCollapsed(!collapsed); return; }
            if (collapsed) {
                expandedByFirstClick = true;
                arrowActivation = event.detail === 0 ? null : {x:event.clientX, y:event.clientY, time:event.timeStamp};
                setCollapsed(false);
            }
        });
        host.addEventListener('click', event => {
            // The second click of an arrow double click must never activate an addon icon,
            // including when keeping the dock on-screen limits the anchor adjustment.
            if (event.detail > 0 && arrowActivation && !event.composedPath().includes(grip) &&
                event.timeStamp - arrowActivation.time < 600 && Math.hypot(event.clientX - arrowActivation.x, event.clientY - arrowActivation.y) <= 4) {
                event.preventDefault(); event.stopImmediatePropagation(); arrowActivation = null;
            }
        }, true);
        grip.addEventListener('dblclick', event => {
            event.preventDefault(); event.stopPropagation();
            // A double click on the arrow should expand once, not immediately collapse again.
            if (expandedByFirstClick) { expandedByFirstClick = false; arrowActivation = null; return; }
            if (!dragged) setCollapsed(!collapsed);
        });
        grip.addEventListener('contextmenu', event => {
            event.preventDefault(); event.stopPropagation();
            anchoredView(() => { vertical = !vertical; });
            try { GM_setValue(layoutKey, vertical ? 'vertical' : 'horizontal'); } catch {}
        });
        grip.addEventListener('pointerdown', event => {
            if (event.button !== 0) return;
            dragged = false;
            const rect = host.getBoundingClientRect();
            drag = {id:event.pointerId, x:event.clientX, y:event.clientY, right:window.innerWidth - rect.right, top:rect.top, preferred:{...preferred}, moved:false};
            grip.setPointerCapture(event.pointerId); event.preventDefault();
        });
        grip.addEventListener('pointermove', event => {
            if (!drag || event.pointerId !== drag.id) return;
            if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) <= 4) return;
            drag.moved = true; dragged = true;
            preferred = {right:drag.right + drag.x - event.clientX, top:drag.top + event.clientY - drag.y}; place();
        });
        function finish(event) {
            if (!drag || event.pointerId !== drag.id) return;
            if (event.type === 'pointercancel') { preferred = drag.preferred; place(); }
            else if (drag.moved) {
                const rect = host.getBoundingClientRect();
                preferred = {right:window.innerWidth - rect.right, top:rect.top}; save();
            }
            drag = null;
            if (grip.hasPointerCapture(event.pointerId)) grip.releasePointerCapture(event.pointerId);
        }
        for (const type of ['pointerup','pointercancel','lostpointercapture']) grip.addEventListener(type, finish);
        grip.addEventListener('keydown', event => {
            const offsets = {ArrowLeft:[10,0],ArrowRight:[-10,0],ArrowUp:[0,-10],ArrowDown:[0,10]};
            const offset = offsets[event.key]; if (!offset) return;
            event.preventDefault(); preferred = {right:preferred.right + offset[0], top:preferred.top + offset[1]}; place();
            const rect = host.getBoundingClientRect(); preferred = {right:window.innerWidth - rect.right, top:rect.top}; save();
        });
        window.addEventListener('resize', place);
        window.addEventListener('pagehide', () => {
            disposed = true; if (frame) window.cancelAnimationFrame(frame);
            observer.disconnect(); resize.disconnect(); entries.forEach(e => e.observer.disconnect());
            for (const type of ['pointerdown','mousedown']) document.removeEventListener(type, preventTileDrag, true);
            window.removeEventListener('resize', place);
        }, {once:true});
        schedule();
        return Object.freeze({isDocked(node) { return !!node && entries.get(node.id)?.node === node && entries.get(node.id).docked; }});
    }

    function mount() {
    window.__gogatkiTileDock ||= createTileDock();
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
        :host{all:initial;display:flex;align-items:flex-start;width:max-content;position:fixed;right:18px;top:40px;z-index:2147483647;font:12px/1.3 Arial;color:#dce6ee;opacity:1!important;filter:none!important;mix-blend-mode:normal!important;isolation:isolate;font-family:Arial,sans-serif!important;font-size:12px!important;font-weight:400!important;font-style:normal!important;line-height:1.3!important;background:transparent!important;border:0!important;padding:0!important;margin:0!important;text-shadow:none!important;-webkit-text-stroke:0!important;-webkit-text-fill-color:currentColor!important}
        *{box-sizing:border-box;font-family:Arial,sans-serif!important;text-shadow:none!important;-webkit-text-stroke:0!important;-webkit-text-fill-color:currentColor!important;letter-spacing:normal!important}button,input{font:inherit}button{cursor:pointer;color:inherit}
        header{cursor:move;touch-action:none;user-select:none}.launcher{color:#12c9bd;background:#252b31;border:1px solid #668298;border-radius:4px;padding:5px 9px;font-weight:bold;box-shadow:0 6px 22px #0009;cursor:grab;touch-action:none;user-select:none}.launcher[data-dragging="true"]{cursor:grabbing}
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


    </style><button class="launcher" aria-expanded="false" aria-controls="panel" title="Kliknij, aby rozwinąć. Przeciągnij, aby przesunąć. Strzałki przesuwają o 10 px.">Gogatki</button>
    <section id="panel" hidden aria-label="Panel dodatków"><header><div><h2>Gogatki</h2><small>Twoje dodatki w jednym miejscu</small></div><button aria-label="Zamknij"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" style="display:block;pointer-events:none;flex-shrink:0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header><div class="list"></div><footer><span role="status"></span><p class="catalogue-message"></p><button class="refresh-list">Odśwież listę</button><button class="apply" hidden>Zastosuj i odśwież grę</button></footer></section>`;
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
const fallbackCatalogue = {"schemaVersion": 1, "modules": [{"id": "ulepa", "name": "Ulepa", "description": "Ulepszanie i rozbijanie przedmiotów", "url": "https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/modules/ulepa.js?v=1.2.12"}, {"id": "lootfilter", "name": "Lootfilter", "description": "Filtry łupu po walce", "url": "https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/modules/lootfilter.js?v=1.0.18"}, {"id": "wolacz", "name": "Wołacz Kolosy", "description": "Wołanie na globalny według mapy i grupy", "url": "https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/modules/wolacz.js?v=1.4.12"}, {"id": "gift", "name": "Gift", "description": "Odbieranie darmowych nagród z aktualności i kalendarza.", "url": "https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/modules/gift.js?v=1.0.14"}, {"id": "wolacz-ide", "name": "Wołacz + idę", "description": "Wołanie na E2 i wiadomość „Ide” przez Lootlog klanowy Death Sentence.", "url": "https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/modules/wolacz-ide.js?v=2026.11.03.10"}, {"id": "pvp-info", "name": "PVP Info", "description": "Powiadomienia o walkach PvP i ich wynikach na czacie klanowym.", "url": "https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/modules/pvp-info.js?v=1.0.8"}, {"id": "anty-x", "name": "Anty X", "description": "Filtr ataków PvP według relacji, poziomów i listy chronionych graczy.", "url": "https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/modules/anty-x.js?v=1.0.6"}, {"id": "auto-tp", "name": "Auto TP", "description": "Użycie przedmiotu po walce, przy wrogu lub z ucieczką.", "url": "https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/modules/auto-tp.js?v=1.0.3"}]};
    updateCatalogue();
    }
    if (!mountWhenReady()) {
        let attempts = 0;
        const wait = setInterval(() => {
            if (mountWhenReady() || ++attempts >= 600) clearInterval(wait);
        }, 100);
        window.addEventListener('pagehide', () => clearInterval(wait), {once:true});
    }
})();




