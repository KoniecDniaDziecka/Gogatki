// Gogatki dock, API v1. This file is fetched on every game reload.
// Keep apiVersion:1 for compatible dock/UI changes; register create() without mounting at module scope.
(() => {
    'use strict';
    const window = unsafeWindow;
    function installNativeLauncher(onCleanup) {
        const key = 'gogatki:native-launcher:v1';
        const widgetKey = 'gogatki_addonsManager';
        const selector = '.widget-' + widgetKey;
        let enabled = false;
        try { enabled = GM_getValue(key, false) === true; } catch {}
        let stopped = false, timer = null, frame = 0, registration = null, boundTile = null;
        let main = null, mainRoot = null, launcher = null, popup = null, choice = null, checkbox = null, nativeStatus = null;
        let rootStyle = null, gameStyle = null, popupObserver = null, lastRect = null, active = false;
        let lastWarning = '', restoringFloat = false, rejectedSavedPosition = null;
        const icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><rect x="1" y="1" width="34" height="34" rx="5" fill="#171b20" stroke="#668298" stroke-width="2"/><path d="M25 11a10 10 0 1 0 0 14v-7h-8" fill="none" stroke="#12c9bd" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        function api() {
            const engine = window.Engine, manager = engine?.widgetManager;
            return engine?.hero?.d && engine.allInit !== false && ['getDefaultWidgetSet','getFirstEmptyWidgetSlot','createOneWidget'].every(method => typeof manager?.[method] === 'function') ? manager : null;
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
            set[widgetKey] = definition; registration = {manager,set,definition,createdAt:Date.now(),savedSignature};
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
            if (!main || !active) return;
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
                // A sized element can still be clipped, offscreen, or covered by game UI.
                const hit = document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
                if (hit && tile.contains(hit)) return {tile, rect};
            }
            return null;
        }
        function anchor() {
            if (stopped || restoringFloat || !main || !enabled || !registration) return false;
            const usable = usableTile();
            bindTile(usable?.tile || null);
            if (!usable) { float(); return false; }
            const {rect} = usable;
            if (!lastRect || ['left','top','width','height'].some(k => Math.abs(lastRect[k] - rect[k]) > .1)) {
                for (const k of ['left','top','width','height']) main.style.setProperty('--native-' + k, rect[k] + 'px');
                lastRect = {left:rect.left,top:rect.top,width:rect.width,height:rect.height};
            }
            active = true; main.setAttribute('data-native-widget', 'true');
            placePopup(); return true;
        }
        function follow() {
            if (frame) window.cancelAnimationFrame(frame);
            frame = 0;
            if (stopped || !active || popup?.hidden) return;
            frame = window.requestAnimationFrame(() => { frame = 0; anchor(); follow(); });
        }
        function toggle() {
            if (stopped || !enabled || !launcher) return;
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
            popupObserver?.disconnect(); window.removeEventListener('resize', anchor);
            mainRoot?.removeEventListener('pointerdown', blockHeaderDrag, true);
            mainRoot?.removeEventListener('click', closeFocus);
            mainRoot?.removeEventListener('keydown', escapeFocus);
            unregister(); float(); choice?.remove(); nativeStatus?.remove(); rootStyle?.remove(); gameStyle?.remove();
        }
        onCleanup(destroy);
        function bindMain() {
            main = document.getElementById('gogatek-panel'); mainRoot = main?.shadowRoot;
            launcher = mainRoot?.querySelector('.launcher'); popup = mainRoot?.querySelector('section');
            if (!launcher || !popup) return false;
            rootStyle = document.createElement('style');
            rootStyle.textContent = `
                :host([data-native-widget="true"]){left:var(--native-left)!important;right:auto!important;top:var(--native-top)!important;width:var(--native-width)!important;height:var(--native-height)!important;pointer-events:none!important}
                :host([data-native-widget="true"]) .launcher{visibility:hidden!important;pointer-events:none!important}
                :host([data-native-widget="true"]) section{pointer-events:auto!important}
                :host([data-native-widget="true"]) header{cursor:default}
                .native-choice{display:flex;align-items:center;gap:6px;margin:7px 0;color:#c7d0d9;font:12px/1.4 Arial,sans-serif}
                .native-status{display:block;margin:4px 0;color:#b1c0cb;font:11px/1.4 Arial,sans-serif}
            `;
            mainRoot.append(rootStyle);
            choice = document.createElement('label'); choice.className = 'native-choice'; choice.hidden = true;
            checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = enabled;
            choice.append(checkbox, document.createTextNode('Przypnij Gogatki do paska gry'));
            nativeStatus = document.createElement('small'); nativeStatus.className = 'native-status';
            nativeStatus.setAttribute('role', 'status'); nativeStatus.hidden = true;
            mainRoot.querySelector('footer').append(choice, nativeStatus);
            checkbox.addEventListener('change', () => {
                enabled = checkbox.checked;
                try { GM_setValue(key, enabled); } catch {}
                if (!enabled) { unregister(); float(); status(); } else poll();
            });
            mainRoot.addEventListener('pointerdown', blockHeaderDrag, true);
            mainRoot.addEventListener('click', closeFocus);
            mainRoot.addEventListener('keydown', escapeFocus);
            popupObserver = new MutationObserver(follow); popupObserver.observe(popup, {attributes:true,attributeFilter:['hidden']});
            gameStyle = document.createElement('style');
            const iconTarget = '.main-buttons-container .widget-button .icon.' + widgetKey;
            gameStyle.textContent = selector + ',' + iconTarget + '{background-position:center!important;background-repeat:no-repeat!important;background-size:contain!important;background-image:url("data:image/svg+xml,' + encodeURIComponent(icon) + '")!important}' + selector + ' .icon{display:none!important}[data-gogatki-native-launcher]:focus-visible{outline:2px solid #12c9bd;outline-offset:1px}';
            document.head.append(gameStyle); window.addEventListener('resize', anchor);
            return true;
        }
        function poll() {
            if (stopped) return;
            try {
                if ((!launcher || !popup) && !bindMain()) return;
                const manager = api(); choice.hidden = !manager;
                if (!manager || !enabled) { unregister(); float(); status(); return; }
                const set = manager.getDefaultWidgetSet();
                if (!set || typeof set !== 'object' || Array.isArray(set)) { unregister(); float(); return; }
                if (!registration || registration.manager !== manager || registration.set !== set || set[widgetKey] !== registration.definition) {
                    unregister();
                }
                if (!registration || (!tiles().length && Date.now() - registration.createdAt >= 1500)) {
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
                            float(); status('Wybrane miejsce jest już zajęte. Szukam wolnego miejsca na paskach gry…'); return;
                        }
                    }
                }
                const pinned = anchor(); follow();
                status(pinned ? '' : tiles().length ? 'Kafelek na pasku gry jest ukryty. Dostępny jest pływający przycisk Gogatki.' : 'Oczekiwanie na kafelek na pasku gry…');
            } catch (error) {
                unregister(); float();
                status('Nie udało się przypiąć kafelka. Dostępny jest pływający przycisk Gogatki.');
                const message = String(error?.message || error);
                if (message !== lastWarning) { console.warn('[Gogatki] Kafelek gry:', error); lastWarning = message; }
            }
        }
        poll(); timer = setInterval(poll, 500);
    }

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
        const extraCleanup = [];
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
            for (const fn of extraCleanup.splice(0).reverse()) { try { fn(); } catch {} }
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
        installNativeLauncher(fn => extraCleanup.push(fn));
        schedule();
        return Object.freeze({destroy, isDocked(node) { return !!node && entries.get(node.id)?.node === node && entries.get(node.id).docked; }});
    }
    GogatkiDockRuntime.register({apiVersion:1, create:createTileDock});
})();

