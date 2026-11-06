// Gogatki dock, API v2. This file is fetched on every game reload.
// The main userscript owns its launcher; this file manages only the addon dock.
(() => {
    'use strict';
    const window = unsafeWindow;
    function createTileDock({onCleanup = () => {}} = {}) {
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
        const anchorKey = 'gogatki:tile-dock:anchor:v1';
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
        let anchor = null, migrationTimer = null, legacySize = '';
        try {
            const saved = GM_getValue(anchorKey, null);
            if (Number.isFinite(saved?.right) && Number.isFinite(saved?.top)) anchor = {right:saved.right, top:saved.top};
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
            .tiles{display:flex;flex-wrap:wrap;align-items:center;gap:4px;min-width:0;min-height:0;max-width:var(--tiles-max-width,calc(100vw - 54px));max-height:var(--tiles-max-height,calc(100vh - 20px));overflow:auto}
            :host([data-direction="left"]) .bar{flex-direction:row-reverse}
            :host([data-orientation="vertical"]) .bar{flex-direction:column;align-items:center}
            :host([data-orientation="vertical"]) .grip{width:28px;height:18px}
            :host([data-orientation="vertical"]) .grip svg{transform:rotate(90deg)}
            :host([data-orientation="vertical"][data-direction="up"]) .bar{flex-direction:column-reverse}
            :host([data-orientation="vertical"]) .tiles{flex-direction:column;flex-wrap:nowrap;max-width:var(--tiles-max-width,calc(100vw - 26px));max-height:var(--tiles-max-height,calc(100vh - 56px))}
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
        let frame = 0, disposed = false, observer = null, resize = null;
        function destroy() {
            if (disposed) return;
            disposed = true;
            if (migrationTimer) clearTimeout(migrationTimer);
            if (frame) window.cancelAnimationFrame(frame);
            observer?.disconnect(); resize?.disconnect();
            entries.forEach(entry => { entry.observer.disconnect(); release(entry); });
            entries.clear();
            for (const type of ['pointerdown','mousedown']) document.removeEventListener(type, preventTileDrag, true);
            window.removeEventListener('resize', place);
            window.removeEventListener('pagehide', destroy);
            host.remove(); style.remove();
            if (window.__gogatkiTileDock?.destroy === destroy) delete window.__gogatkiTileDock;
        }
        // The loader can roll back a failed update before starting the cached version.
        onCleanup(destroy);
        document.head.append(style); document.body.append(host);
        function place() {
            if (host.hidden) return;
            if (!anchor) {
                // Convert the old outer-box position once initial modules have settled.
                const box = host.getBoundingClientRect();
                host.style.right = Math.max(0, Math.min(preferred.right, window.innerWidth - box.width)) + 'px';
                host.style.top = Math.max(0, Math.min(preferred.top, window.innerHeight - box.height)) + 'px';
                const size = box.width + ':' + box.height;
                if (size !== legacySize) {
                    legacySize = size;
                    if (migrationTimer) clearTimeout(migrationTimer);
                    migrationTimer = setTimeout(() => {
                        migrationTimer = null;
                        if (disposed || host.hidden || anchor) return;
                        anchor = gripPosition(); place(); save();
                    }, 300);
                }
                return;
            }
            const initial = grip.getBoundingClientRect();
            const x = Math.max(initial.width / 2 + 5, Math.min(window.innerWidth - initial.width / 2 - 5, window.innerWidth - anchor.right));
            const y = Math.max(initial.height / 2 + 5, Math.min(window.innerHeight - initial.height / 2 - 5, anchor.top));
            const tile = parseFloat(host.style.getPropertyValue('--tile')) || 28;
            // Wrap/scroll away from the grip instead of moving it as the contents grow.
            const backwards = vertical ? window.innerHeight - y < tile + 32 && y > window.innerHeight / 2 : window.innerWidth - x < tile + 32 && x > window.innerWidth / 2;
            const direction = vertical ? (backwards ? 'up' : 'down') : (backwards ? 'left' : 'right');
            host.dataset.direction = direction;
            const maxWidth = vertical ? 2 * Math.min(x, window.innerWidth - x) : (backwards ? x : window.innerWidth - x) + initial.width / 2 + 5;
            const maxHeight = vertical ? (backwards ? y : window.innerHeight - y) + initial.height / 2 + 5 : window.innerHeight - y + initial.height / 2 + 5;
            host.style.maxWidth = maxWidth + 'px';
            host.style.setProperty('--tiles-max-width', Math.max(0, maxWidth - (vertical ? 10 : initial.width + 14)) + 'px');
            host.style.setProperty('--tiles-max-height', Math.max(0, maxHeight - (vertical ? initial.height + 14 : 10)) + 'px');
            const box = host.getBoundingClientRect();
            const handle = grip.getBoundingClientRect();
            host.style.right = (window.innerWidth - x - box.width + handle.left - box.left + handle.width / 2) + 'px';
            host.style.top = (y - handle.top + box.top - handle.height / 2) + 'px';
            if (collapsed) grip.querySelector('path')?.setAttribute('d', arrowPath());
        }
        function gripPosition() {
            const rect = grip.getBoundingClientRect();
            return {right:window.innerWidth - rect.left - rect.width / 2, top:rect.top + rect.height / 2};
        }
        function save() {
            try {
                if (anchor) GM_setValue(anchorKey, {...anchor});
                const rect = host.getBoundingClientRect();
                GM_setValue(key, {right:window.innerWidth - rect.right, top:rect.top});
            } catch {}
        }
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
            if (entry.spec.gift) entry.node.removeAttribute('data-gogatki-dock-item');
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
            // The dock icon size is independent of the larger main launcher.
            host.style.setProperty('--tile', '28px');
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
        observer = new MutationObserver(records => {
            if (records.some(r => [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && (n.matches(selector) || n.querySelector(selector))))) schedule();
        });
        observer.observe(document.body, {childList:true, subtree:true});
        resize = new ResizeObserver(place); resize.observe(host);
        function findEntry(event) {
            return event.composedPath().map(n => n?.id && entries.get(n.id)).find(e => e?.docked);
        }
        function preventTileDrag(event) {
            if (findEntry(event)) event.stopPropagation();
        }
        for (const type of ['pointerdown','mousedown']) document.addEventListener(type, preventTileDrag, true);
        const grip = root.querySelector('.grip'); let drag, dragged = false, expandedByFirstClick = false, arrowActivation = null;
        const gripIcon = grip.innerHTML;
        function arrowPath() {
            return {right:'M5 12h14m-6-6 6 6-6 6',left:'M19 12H5m6-6-6 6 6 6',down:'M12 5v14m-6-6 6 6 6-6',up:'M12 19V5m-6 6 6-6 6 6'}[host.dataset.direction] || (vertical ? 'M12 5v14m-6-6 6 6 6-6' : 'M5 12h14m-6-6 6 6-6 6');
        }
        function updateView() {
            host.dataset.orientation = vertical ? 'vertical' : 'horizontal';
            host.dataset.collapsed = String(collapsed);
            grip.setAttribute('aria-expanded', String(!collapsed));
            grip.setAttribute('aria-controls', 'gogatki-dock-tiles');
            grip.setAttribute('aria-label', collapsed ? 'Rozwiń pasek dodatków' : 'Przesuń pasek dodatków');
            const arrow = arrowPath();
            grip.innerHTML = collapsed ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + arrow + '"/></svg>' : gripIcon;
            grip.title = (collapsed ? 'Kliknij, aby rozwinąć pasek. ' : 'Dwuklik: zwiń pasek. ') +
                'Przeciągnij, aby przesunąć. PPM: układ ' + (vertical ? 'poziomy' : 'pionowy') + '. Strzałki przesuwają o 10 px.';
            place();
        }
        function anchoredView(change) {
            anchor = gripPosition();
            change(); updateView();
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
            anchor = gripPosition();
            drag = {id:event.pointerId, x:event.clientX, y:event.clientY, right:anchor.right, top:anchor.top, preferred:{...anchor}, moved:false};
            grip.setPointerCapture(event.pointerId); event.preventDefault();
        });
        grip.addEventListener('pointermove', event => {
            if (!drag || event.pointerId !== drag.id) return;
            if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) <= 4) return;
            drag.moved = true; dragged = true;
            anchor = {right:drag.right + drag.x - event.clientX, top:drag.top + event.clientY - drag.y}; place();
        });
        function finish(event) {
            if (!drag || event.pointerId !== drag.id) return;
            if (event.type === 'pointercancel') { anchor = drag.preferred; place(); }
            else if (drag.moved) {
                anchor = gripPosition(); save();
            }
            drag = null;
            if (grip.hasPointerCapture(event.pointerId)) grip.releasePointerCapture(event.pointerId);
        }
        for (const type of ['pointerup','pointercancel','lostpointercapture']) grip.addEventListener(type, finish);
        grip.addEventListener('keydown', event => {
            const offsets = {ArrowLeft:[10,0],ArrowRight:[-10,0],ArrowUp:[0,-10],ArrowDown:[0,10]};
            const offset = offsets[event.key]; if (!offset) return;
            event.preventDefault(); anchor = gripPosition(); anchor = {right:anchor.right + offset[0], top:anchor.top + offset[1]}; place();
            anchor = gripPosition(); save();
        });
        window.addEventListener('resize', place);
        window.addEventListener('pagehide', destroy, {once:true});
        schedule();
        return Object.freeze({destroy, isDocked(node) { return !!node && entries.get(node.id)?.node === node && entries.get(node.id).docked; }});
    }
    GogatkiDockRuntime.register({apiVersion:2, create:createTileDock});
})();



