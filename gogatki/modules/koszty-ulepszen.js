// Koszty ulepszeń + Extended Item Tip 1.1.1
// Rozszerzenia dymków: Maddonz (Barlag), margonem-sources/maddonz.original.js.
// Wzory i rozpoznawanie dymków: Dark-Sad, Panel dodatków 6.1.5,
// Sebastian00P/PanelDodatkow/script.js (blob e589b5b7ccb42279d2e9ff386777d6bb2631b86c).
GogatkiRuntime.register({
    id: 'koszty-ulepszen',
    name: 'Koszty ulepszeń',
    description: 'Koszty ulepszeń i rozszerzone dymki przedmiotów (Extended Item Tip).',
    start() {
        'use strict';
        const window = unsafeWindow;
        const document = window.document;
        const INSTANCE = '__gogatkiUpgradeCosts';
        const STYLE_ID = 'gogatki-upgrade-costs-style';
        const SECTION_CLASS = 'gogatki-upgrade-costs';
        const TIP_SELECTOR = '.tip-wrapper';
        if (window.top !== window.self || window[INSTANCE]) return;
        const isNI = Boolean(window.Engine);
        const KEY = 'koszty-ulepszen:global:v1';
        const defaults = { costs:true, hiddenSignature:false, legendaryInfo:true, essenceValue:true,
            percentToHeal:true, healToPercent:true, itemIcons:false, collapsed:true, settings:true, right:18, top:160 };
        let saved;
        try { saved = GM_getValue(KEY, null); } catch {}
        if (saved == null) {
            try { saved = JSON.parse(window.localStorage.getItem('maddonz-extracted:extended-item-tip:v1')); } catch {}
        }
        const settings = { ...defaults };
        for (const name of Object.keys(defaults)) {
            if (typeof saved?.[name] === typeof defaults[name] &&
                (typeof saved[name] !== 'number' || Number.isFinite(saved[name]))) settings[name] = saved[name];
        }
        const save = () => { try { GM_setValue(KEY, { ...settings }); } catch {} };
        let disposed = false;
        const hooks = [];


        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .item-tip-section.${SECTION_CLASS}{box-sizing:border-box;margin:5px 0;padding:0;
                border:0;border-radius:0;background:none;color:inherit;
                font:12px/1.4 Arial,sans-serif;text-align:left;text-shadow:none}
            .item-tip-section.${SECTION_CLASS} *{box-sizing:border-box;font:12px/1.4 Arial,sans-serif;
                text-shadow:none;-webkit-text-stroke:0;letter-spacing:normal}
            .${SECTION_CLASS} .guc-heading{margin:0 0 4px;color:var(--guc-quality-color,inherit);font-weight:bold}
            .${SECTION_CLASS} .guc-row{display:flex;justify-content:space-between;gap:12px;
                color:#c7d0d9;font:12px/1.4 Arial,sans-serif;text-shadow:none}
            .${SECTION_CLASS} .guc-row span{color:#c7d0d9;font:inherit;text-shadow:none}
            .${SECTION_CLASS} .guc-row .guc-value{color:var(--guc-quality-color,inherit);white-space:nowrap}
            .${SECTION_CLASS} .guc-total{margin-top:4px;padding-top:3px}
        `;
        (document.head || document.documentElement).appendChild(style);

        const costCSS = style.textContent;
        function updateExtendedStyle() {
            style.textContent = costCSS + (settings.hiddenSignature ?
                '.item-tip-section.s-6 .looter,#tip i.looter,#tip i.looter+br{display:none!important}' : '') +
                (settings.itemIcons ? '.tip-wrapper .item-type{opacity:0}#tip .item-head .head-icons{bottom:0!important}#tip .item-name{min-height:2.5lh}' +
                '.cl-icon.icon-21{background-image:url(https://cronus.margonem.com/img/gui/notyfikacje-sprite.png);background-position:-19px -38px}' +
                '.cl-icon.icon-28{background-image:url(https://cronus.margonem.com/img/gui/notyfikacje-sprite.png);background-position:-335px -119px}' +
                '.cl-icon.icon-29{background-image:url(https://cronus.margonem.com/img/gui/notyfikacje-sprite.png);background-position:-401px -100px}' +
                '.cl-icon.icon-32{background-image:url(https://cronus.margonem.com/img/gui/notyfikacje-sprite.png);background-position:-355px -119px}' : '');
        }
        const escape = value => String(value ?? '').replace(/[&<>"']/g,
            char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
        function readStats(item) {
            if (item._cachedStats) return item._cachedStats;
            return Object.fromEntries(String(item.stat || '').split(';').filter(Boolean).map(pair => {
                const separator = pair.indexOf('=');
                return separator < 0 ? [pair, ''] : [pair.slice(0, separator), pair.slice(separator + 1)];
            }));
        }
        function transformTip(item, html) {
            if (!item || typeof html !== 'string') return html;
            const stats = readStats(item);
            if (settings.legendaryInfo && stats.rarity === 'legendary' && stats.loot) {
                const [nick, , count, timestamp, monster] = String(stats.loot).split(',');
                const group = Number(count) === 2 ? ' wraz z ziomeczkiem' :
                    Number(count) > 2 ? ' w ' + Number(count) + '-osobowej drużynie' : '';
                const time = window.ut_fulltime?.(Number(timestamp)) || new Date(Number(timestamp) * 1000).toLocaleString('pl-PL');
                const text = 'W dniu ' + time + ' został(a) pokonany(a) ' + monster + ' przez ' + nick + group;
                html = html.replace(/(<i[^>]*\blooter[^>]*>)([\s\S]*?)(<\/i>)/,
                    (_, open, old, close) => open + escape(text) + close);
            }
            const cl = Number(item.cl);
            if (settings.essenceValue && ((cl > 0 && cl < 15) || cl === 29) && Number(stats.lvl) >= 20 &&
                !('cursed' in stats) && !('artisan_worthless' in stats) && item.salvageItems != null) {
                html = html.replace(/(<div[^>]*class="[^"]*\bitem-name\b[^"]*"[^>]*>.*?)(<\/div>)/,
                    (_, name, end) => name + ' [' + escape(item.salvageItems) + '] ' + end);
            }
            const hero = isNI ? window.Engine?.hero?.d : window.hero;
            const hp = Number(hero?.maxhp ?? hero?.warrior_stats?.maxhp);
            if (hp > 0 && settings.percentToHeal && Number(stats.perheal) > 0) {
                html = html.replace(/Leczy <span class="damage">(\d+%)<\/span> życia/g,
                    `Leczy <span class="damage">$1 (${Math.floor(Number(stats.perheal) / 100 * hp)})</span> życia`);
            }
            if (hp > 0 && settings.healToPercent && Number(stats.leczy) > 0) {
                html = html.replace(/Leczy <span class="damage">(.+?)<\/span> punktów życia/g,
                    `Leczy <span class="damage">$1 (${(Number(stats.leczy) / hp * 100).toFixed(0)}%)</span> życia`);
            }
            if (settings.itemIcons) {
                const flags = ['artisan_worthless','permbound','soulbound','binds','noauction','nodepo','nodepoclan'].filter(key => key in stats);
                const icons = (Number.isInteger(cl) ? [String(cl)] : []).concat(flags)
                    .map(key => '<div class="cl-icon icon-' + key + '"></div>').join('');
                html = html.replace('<div class="head-icons">', '$&' + icons);
            }
            return html;
        }
        function installParser() {
            if (disposed) return;
            const owner = isNI ? window.MargoTipsParser : window;
            const name = isNI ? 'getTip' : 'itemTip';
            if (!owner || typeof owner[name] !== 'function' || hooks.some(hook => hook.owner === owner && hook.name === name)) return;
            const original = owner[name];
            function wrapped(...args) {
                const result = Reflect.apply(original, this, args);
                if (disposed) return result;
                try { return transformTip(args[0], result); }
                catch (error) { console.error('[Koszty ulepszeń]', error); return result; }
            }
            try { owner[name] = wrapped; } catch { return; }
            if (owner[name] === wrapped) hooks.push({owner, name, original, wrapped});
        }

        const host = document.createElement('div');
        host.id = 'gogatki-item-tips';
        host.style.cssText = 'all:initial;display:block;position:fixed;z-index:2147483000;';
        const root = host.attachShadow({mode:'open'});
        const fields = [
            ['costs', 'Koszty ulepszeń legendy (NI)'],
            ['hiddenSignature', 'Usuń podpis z legendy'],
            ['legendaryInfo', 'Godzina i grupa zdobycia legendy'],
            ['essenceValue', 'Wartość esencji z rozbicia'],
            ['percentToHeal', 'Leczenie procentowe jako punkty życia'],
            ['healToPercent', 'Punkty leczenia jako procent życia'],
            ['itemIcons', 'Ikony przedmiotów']
        ];
        root.innerHTML = `<style>
            :host{all:initial;color-scheme:dark}*{box-sizing:border-box;text-shadow:none}[hidden]{display:none!important}
            .panel{width:290px;max-width:100vw;font:12px/1.4 Arial,sans-serif;color:#c7d0d9;background:#171b20;border:1px solid #668298;border-radius:4px;overflow:hidden}
            header{height:28px;display:flex;align-items:center;justify-content:space-between;background:#252b31;cursor:move;touch-action:none;user-select:none}
            strong{padding-left:8px;color:#12c9bd}.gear{display:flex;align-items:center;justify-content:center;width:26px;height:26px;padding:3px;border:0;background:#252b31;color:#12c9bd;cursor:pointer}.gear svg{display:block;pointer-events:none}
            main{padding:8px;max-height:calc(100vh - 32px);overflow:auto}.options{display:grid;gap:8px;margin-top:8px}label{display:flex;align-items:center;gap:7px;cursor:pointer}
            input[type=checkbox]{appearance:none;display:grid;place-content:center;flex:none;width:14px;height:14px;margin:0;padding:0;background:#171b20;border:1px solid #668298;border-radius:2px}
            input[type=checkbox]:checked:after{content:'';width:7px;height:4px;border:solid #12c9bd;border-width:0 0 2px 2px;transform:rotate(-45deg)}
            :focus-visible{outline:2px solid #12c9bd;outline-offset:1px}small{font-size:11px;line-height:1.4;color:#b1c0cb}
            .collapsed{width:var(--tile);height:var(--tile)}.collapsed header,.collapsed .gear{width:100%;height:100%}.collapsed strong,.collapsed main{display:none}
        </style><section class="panel" aria-label="Koszty ulepszeń i Extended Item Tip"><header><strong>Koszty ulepszeń</strong><button type="button" class="gear" aria-label="Opcje dymków przedmiotów" title="LPM: opcje · PPM: zwiń"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 11h12v2h7l-4 3h-5v3h3v2H5v-2h3v-3H6l-4-3v-2Z"/><circle cx="18" cy="5.5" r="4"/><path d="m17 4.5 1-1v4m-1 0h2"/></svg></button></header><main><small>Extended Item Tip + koszty ulepszeń${isNI ? '' : ' (koszty dostępne na NI)'}</small><div class="options">${fields.map(([key,label]) => `<label><input type="checkbox" data-key="${key}">${label}</label>`).join('')}</div></main></section>`;
        document.body.append(host);
        function placePanel() {
            if (window.__gogatkiTileDock?.isDocked(host)) return;
            const box = host.getBoundingClientRect();
            settings.right = Math.max(0, Math.min(settings.right, window.innerWidth - box.width));
            settings.top = Math.max(0, Math.min(settings.top, window.innerHeight - box.height));
            host.style.right = settings.right + 'px'; host.style.top = settings.top + 'px';
        }
        function renderPanel() {
            const size = document.querySelector('#gogatek-panel')?.shadowRoot?.querySelector('.launcher')?.getBoundingClientRect().height || 28;
            host.style.setProperty('--tile', size + 'px');
            root.querySelector('.panel').classList.toggle('collapsed', settings.collapsed);
            root.querySelector('.options').hidden = !settings.settings;
            root.querySelector('.gear').setAttribute('aria-expanded', String(!settings.collapsed && settings.settings));
            placePanel();
        }
        for (const input of root.querySelectorAll('input')) {
            const name = input.dataset.key; input.checked = settings[name];
            if (name === 'costs' && !isNI) input.disabled = true;
            input.addEventListener('change', () => {
                settings[name] = input.checked; save(); updateExtendedStyle();
                document.querySelectorAll(TIP_SELECTOR).forEach(updateTip);
            });
        }
        const gear = root.querySelector('.gear'), header = root.querySelector('header');
        let drag, moved = false;
        gear.addEventListener('click', () => {
            if (moved) return;
            if (settings.collapsed) settings.collapsed = false; else settings.settings = !settings.settings;
            renderPanel(); save();
        });
        gear.addEventListener('contextmenu', event => {event.preventDefault();settings.collapsed = !settings.collapsed;renderPanel();save();});
        header.addEventListener('pointerdown', event => {
            if (event.button !== 0) return;
            moved = false; drag = {x:event.clientX,y:event.clientY,right:settings.right,top:settings.top};
            if (!gear.contains(event.target)) header.setPointerCapture(event.pointerId);
        });
        header.addEventListener('pointermove', event => {
            if (!drag) return;
            const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
            if (!moved && Math.hypot(dx,dy) < 4) return;
            moved = true; header.setPointerCapture(event.pointerId);
            settings.right = drag.right - dx; settings.top = drag.top + dy; placePanel();
        });
        function endDrag() {if (drag) {drag = null;save();}}
        for (const event of ['pointerup','pointercancel','lostpointercapture']) header.addEventListener(event, endDrag);
        function resizePanel() {renderPanel();save();}
        window.addEventListener('resize', resizePanel);
        renderPanel(); updateExtendedStyle(); save();

        function calcCosts(level) {
            if (!Number.isFinite(level) || level <= 0) return null;
            const base = (level + 180) * 1000;
            const points = [1, 1.1, 1.3, 1.6, 2].map(multiplier => Math.round(base * multiplier));
            return {
                points,
                total: points.reduce((sum, value) => sum + value, 0),
                gold: Math.round((10 * level + 1300) * level * 60),
                essence: Math.round((level / 10 + 10) * 3)
            };
        }
        const format = value => value.toLocaleString('pl-PL', { useGrouping: true }).replace(/\s/g, ' ');

        function makeSection(level, costs) {
            const section = document.createElement('div');
            section.className = 'item-tip-section ' + SECTION_CLASS;
            section.dataset.level = String(level);
            const heading = document.createElement('div');
            heading.className = 'guc-heading';
            heading.textContent = 'Koszty ulepszeń';
            section.appendChild(heading);
            function row(label, value, total = false) {
                const element = document.createElement('div');
                element.className = 'guc-row' + (total ? ' guc-total' : '');
                const name = document.createElement('span');
                name.textContent = label;
                const number = document.createElement('span');
                number.className = 'guc-value';
                number.textContent = format(value);
                element.append(name, number);
                section.appendChild(element);
            }
            costs.points.forEach((points, index) => row(`+${index + 1} — pkt. ulepszenia`, points));
            row('Suma pkt. od +0 do +5', costs.total, true);
            row('Złoto na +5', costs.gold);
            row('Esencja', costs.essence);
            return section;
        }

        function updateTip(wrapper) {
            const content = wrapper.querySelector('.content');
            if (!content) return;
            const existing = content.querySelector(':scope > .' + SECTION_CLASS);
            const rarity = content.querySelector('.tip-item-stat-rarity.item-rarity');
            const legendary = wrapper.getAttribute('data-item-type') === 't-leg' ||
                Boolean(rarity && (rarity.classList.contains('legendary') || /legendarny/i.test(rarity.textContent)));
            const levelText = content.querySelector('.tip-item-stat-lvl.level-required')?.textContent || '';
            const levelMatch = levelText.match(/poziom:\s*(\d+)/i);
            const level = levelMatch ? Number(levelMatch[1]) : 0;
            const costs = calcCosts(level);
            if (!isNI || !settings.costs || wrapper.getAttribute('data-type') !== 't_item' || !legendary || !costs) {
                existing?.remove();
                return;
            }
            // Read the actual quality label, including the player's game theme.
            const color = window.getComputedStyle(rarity || content).color;
            // Native tooltips can reuse the same wrapper/content for another item.
            const section = existing?.dataset.level === String(level) ? existing : makeSection(level, costs);
            if (section.style.getPropertyValue('--guc-quality-color') !== color) {
                section.style.setProperty('--guc-quality-color', color);
            }
            if (section === existing) return;
            if (existing) existing.replaceWith(section);
            else {
                const before = [...content.querySelectorAll(':scope > .item-tip-section')].find(part =>
                    part.querySelector('.tip-item-stat-permbound, .tip-item-stat-soulbound, .tip-item-stat-lvl.level-required') ||
                    /Wymagana profesja|Wymagany poziom|Związany z właścicielem/i.test(part.textContent));
                content.insertBefore(section, before || null);
            }
        }

        const observer = new window.MutationObserver(mutations => {
            const wrappers = new Set();
            for (const mutation of mutations) {
                const target = mutation.target.nodeType === 1 ? mutation.target : mutation.target.parentElement;
                if (target?.closest('.' + SECTION_CLASS)) continue;
                const wrapper = target?.closest(TIP_SELECTOR);
                if (wrapper) wrappers.add(wrapper);
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    if (node.matches(TIP_SELECTOR)) wrappers.add(node);
                    node.querySelectorAll(TIP_SELECTOR).forEach(tip => wrappers.add(tip));
                }
            }
            wrappers.forEach(wrapper => { if (wrapper.isConnected) updateTip(wrapper); });
        });
        function destroy(event) {
            if (event?.persisted) return;
            disposed = true;
            observer.disconnect();
            window.clearInterval(parserTimer);
            for (const { owner, name, original, wrapped } of hooks) {
                if (owner[name] === wrapped) owner[name] = original;
            }
            window.removeEventListener('resize', resizePanel);
            host.remove();
            document.querySelectorAll('.' + SECTION_CLASS).forEach(section => section.remove());
            style.remove();
            window.removeEventListener('pagehide', destroy);
            if (window[INSTANCE]?.destroy === destroy) delete window[INSTANCE];
        }
        window[INSTANCE] = { destroy };
        installParser();
        const parserTimer = window.setInterval(installParser, 500);
        document.querySelectorAll(TIP_SELECTOR).forEach(updateTip);
        observer.observe(document.body, {
            childList: true, subtree: true, characterData: true, attributes: true,
            attributeFilter: ['data-type', 'data-item-type', 'class', 'style']
        });
        window.addEventListener('pagehide', destroy);
    }
});
