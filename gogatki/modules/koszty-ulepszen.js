// Koszty ulepszeń 1.0.0
// Wzory i rozpoznawanie dymków: Dark-Sad, Panel dodatków 6.1.5,
// Sebastian00P/PanelDodatkow/script.js (blob e589b5b7ccb42279d2e9ff386777d6bb2631b86c).
GogatkiRuntime.register({
    id: 'koszty-ulepszen',
    name: 'Koszty ulepszeń',
    description: 'NI: koszty ulepszenia legendy do +5 w dymku przedmiotu — punkty, złoto i esencja.',
    start() {
        'use strict';
        const window = unsafeWindow;
        const document = window.document;
        const INSTANCE = '__gogatkiUpgradeCosts';
        const STYLE_ID = 'gogatki-upgrade-costs-style';
        const SECTION_CLASS = 'gogatki-upgrade-costs';
        const TIP_SELECTOR = '.tip-wrapper';
        if (window.top !== window.self || window[INSTANCE]) return;
        if (!window.Engine && window.g) {
            const text = 'Koszty ulepszeń działają w nowym interfejsie (NI).';
            if (typeof window.message === 'function') window.message(text);
            else console.warn('[Gogatki] ' + text);
            return;
        }

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .item-tip-section.${SECTION_CLASS}{box-sizing:border-box;margin:5px 0;padding:6px;
                border:1px solid #668298;border-radius:4px;background:#171b20;color:#c7d0d9;
                font:12px/1.4 Arial,sans-serif;text-align:left;text-shadow:none}
            .item-tip-section.${SECTION_CLASS} *{box-sizing:border-box;font:12px/1.4 Arial,sans-serif;
                text-shadow:none;-webkit-text-stroke:0;letter-spacing:normal}
            .${SECTION_CLASS} .guc-heading{margin:0 0 4px;color:#12c9bd;font-weight:bold}
            .${SECTION_CLASS} .guc-row{display:flex;justify-content:space-between;gap:12px;
                color:#c7d0d9;font:12px/1.4 Arial,sans-serif;text-shadow:none}
            .${SECTION_CLASS} .guc-row span{color:#c7d0d9;font:inherit;text-shadow:none}
            .${SECTION_CLASS} .guc-row .guc-value{color:#12c9bd;white-space:nowrap}
            .${SECTION_CLASS} .guc-total{margin-top:4px;padding-top:3px;border-top:1px solid #668298}
        `;
        (document.head || document.documentElement).appendChild(style);

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
            if (wrapper.getAttribute('data-type') !== 't_item' || !legendary || !costs) {
                existing?.remove();
                return;
            }
            // Native tooltips can reuse the same wrapper/content for another item.
            if (existing?.dataset.level === String(level)) return;
            const section = makeSection(level, costs);
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
            observer.disconnect();
            document.querySelectorAll('.' + SECTION_CLASS).forEach(section => section.remove());
            style.remove();
            window.removeEventListener('pagehide', destroy);
            if (window[INSTANCE]?.destroy === destroy) delete window[INSTANCE];
        }
        window[INSTANCE] = { destroy };
        document.querySelectorAll(TIP_SELECTOR).forEach(updateTip);
        observer.observe(document.body, {
            childList: true, subtree: true, characterData: true, attributes: true,
            attributeFilter: ['data-type', 'data-item-type', 'class']
        });
        window.addEventListener('pagehide', destroy);
    }
});
