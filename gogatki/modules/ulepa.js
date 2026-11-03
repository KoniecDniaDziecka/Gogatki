GogatkiRuntime.register({id:"ulepa",name:"Ulepa",description:"Ulepszanie i rozbijanie przedmiot\u00f3w",start() {
    const window = unsafeWindow;
    const tile = document.querySelector('#gogatek-panel')?.shadowRoot?.querySelector('.launcher');
    const tileHeight = tile?.getBoundingClientRect().height || 28;
    const tileStyle = document.createElement('style');
    tileStyle.textContent = ":root #standalone-fullmetal[data-compact=\"true\"]{box-sizing:border-box;width:__TILE_HEIGHT__!important;height:__TILE_HEIGHT__!important;min-height:0}:root #standalone-fullmetal[data-compact=\"true\"] header{box-sizing:border-box;height:calc(__TILE_HEIGHT__ - 2px);padding:0;min-height:0}:root #standalone-fullmetal[data-compact=\"true\"] header button{box-sizing:border-box;width:calc(__TILE_HEIGHT__ - 2px);height:calc(__TILE_HEIGHT__ - 2px);min-height:0;padding:0;line-height:1;font-size:16px}:root #standalone-fullmetal input[type=\"checkbox\"]{appearance:none!important;box-sizing:border-box;width:14px!important;height:14px!important;min-width:14px;min-height:14px;flex-shrink:0;padding:0!important;margin:0;vertical-align:middle;border:1px solid #668298!important;border-radius:3px;background:#171719!important;background-image:none!important;cursor:pointer;box-shadow:none}\n:root #standalone-fullmetal input[type=\"checkbox\"]:checked{border-color:#12c9bd!important;background-color:#173838!important;background-image:url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22none%22%20stroke%3D%22%2312c9bd%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m3.5%208%203%203%206-6%22%2F%3E%3C%2Fsvg%3E\")!important;background-position:center!important;background-repeat:no-repeat!important;background-size:12px 12px!important}\n:root #standalone-fullmetal input[type=\"checkbox\"]:hover:not(:disabled){border-color:#12c9bd!important}\n:root #standalone-fullmetal input[type=\"checkbox\"]:focus-visible{outline:2px solid #12c9bd;outline-offset:2px}\n:root #standalone-fullmetal input[type=\"checkbox\"]:disabled{opacity:.45;cursor:not-allowed}\n@media(forced-colors:active){:root #standalone-fullmetal input[type=\"checkbox\"]{appearance:auto!important;background:none!important}}\n".replaceAll('__TILE_HEIGHT__', tileHeight + 'px');
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
(() => {
    'use strict';

    const CLASSES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 29];
    const defaults = () => ({ mode: 'enhancement', common: true, unique: true, heroic: false,
        classes: [...CLASSES], blackList: '', target: '',
        bufferSize: 1, bagSlots: '', forceBufferSize: '', colossus: false, left: 24, right: null, top: 100, settingsOpen: false, compact: false });
    function stats(item) {
        if (!item) return {};
        const parsed = {};
        for (const part of String(item.stat || '').split(';')) {
            if (!part) continue;
            const cut = part.indexOf('=');
            parsed[cut < 0 ? part : part.slice(0, cut)] = cut < 0 ? true : part.slice(cut + 1);
        }
        return { ...parsed, ...(item._cachedStats || {}) };
    }
    function canEnhance(item) {
        const s = stats(item);
        return !!item && !item.del && CLASSES.includes(+item.cl) && +s.lvl >= 20 && !('cursed' in s);
    }
    const targetOK = item => canEnhance(item) && (+stats(item).enhancement_upgrade_lvl || 0) < 5;
    function eligible(item, config) {
        if (!canEnhance(item) || item.loc !== 'g' || +item.st !== 0) return false;
        const s = stats(item);
        const protectedIds = ['target'].map(key => String(config[key]));
        const excluded = config.blackList.split('\n').map(name => name.trim().toLocaleLowerCase()).filter(Boolean);
        return !protectedIds.includes(String(item.id)) && !('soulbound' in s) && !('permbound' in s)
            && !('artisan_worthless' in s) && config.classes.includes(+item.cl)
            && ['common', 'unique', 'heroic'].includes(s.rarity)
            && config[s.rarity] === true
            && !excluded.includes(String(item.name).toLocaleLowerCase());
    }
    function droppedId(draggable) {
        if (!draggable) return '';
        const data = draggable.data?.('item');
        if (data?.id != null) return String(data.id);
        const node = draggable[0] || draggable;
        const id = draggable.attr?.('id') || node.id || '';
        const match = /(?:^item|item-id-)(\d+)/.exec(id + ' ' + (node.className || ''));
        return String(draggable.attr?.('iid') || node.getAttribute?.('iid') || match?.[1] || '');
    }
    function attachDropZone($, slot, game, onDrop) {
        const method = game ? 'pointerDroppable' : 'droppable';
        if (typeof $?.fn?.[method] !== 'function') return false;
        const restoreMap = () => game?.map?.$worldPane?.pointerDroppable?.({ accept: '.item' });
        $(slot)[method]({
            accept: '.item', hoverClass: 'drop-hover',
            over() { game?.map?.$worldPane?.pointerDroppable?.({ accept: null }); },
            out: restoreMap,
            drop(event, dragged) {
                event?.stopPropagation?.();
                try { onDrop(droppedId(dragged?.draggable)); }
                finally {
                    restoreMap();
                    if (!game) setTimeout(() => $('#dropmenu').hide?.(), 0);
                }
            }
        });
        return true;
    }
    function plan(ids, config, getItem) {
        const buckets = new Map();
        for (const id of new Set(ids.map(String))) {
            const item = getItem(id);
            if (!eligible(item, config)) continue;
            let target = null;
            if (config.mode === 'enhancement') {
                const fallback = getItem(config.target);
                target = targetOK(fallback) ? fallback : null;
                if (!target || target.loc !== 'g') continue;
            }
            const key = target ? String(target.id) : 'salvage';
            if (!buckets.has(key)) buckets.set(key, { target: target?.id, ids: [] });
            buckets.get(key).ids.push(id);
        }
        return [...buckets.values()].flatMap(bucket => {
            const result = [];
            for (let i = 0; i < bucket.ids.length; i += 25) result.push({ target: bucket.target, ids: bucket.ids.slice(i, i + 25) });
            return result;
        });
    }
    // Core can be tested in Node without booting the game or changing the inventory.
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { defaults, stats, canEnhance, targetOK, eligible, plan, droppedId, attachDropZone };
        return;
    }
    if (window.__standaloneFullmetal) return;
    window.__standaloneFullmetal = true;

    let config, storageKey, panel, ui, status, preview, timer;
    let active = false, busy = false, stopped = false, pending = null, hookInstalled = false;
    let buffer = new Set(), loot = new Set(), manualIds = [], manualSignature = '';
    const engine = () => window.Engine;
    const hero = () => engine()?.hero?.d || window.hero;
    const lock = () => engine()?.lock || window.g?.lock;
    const inBattle = () => !!lock()?.check?.('battle');
    function items() {
        const source = engine()?.items?.test?.()?.items || window.g?.item;
        if (!source) throw Error('Gra nie udostępnia jeszcze ekwipunku.');
        return Object.entries(source).filter(([, item]) => item && typeof item === 'object').map(([id, item]) => ({ ...item, id: String(item.id ?? id) }));
    }
    const getItem = id => id ? items().find(item => String(item.id) === String(id)) : undefined;
    function emptySlots() {
        const bags = engine()?.bags || window.g?.bags;
        if (!Array.isArray(bags) || bags.length < 3) return null;
        const first = bags.slice(0, 3);
        if (first.some(bag => !Array.isArray(bag) || !Number.isFinite(+bag[0]) || !Number.isFinite(+bag[1]))) return null;
        return first.reduce((sum, bag) => sum + (+bag[0] - +bag[1]), 0);
    }
    function say(message) { status.textContent = message; }
    const characterKey = () => `standalone-fullmetal-v1:${location.hostname}:${hero()?.id}`;
    function assertCharacter() {
        if (storageKey !== characterKey()) throw Error('Zmieniono postać. Odśwież grę, aby wczytać jej ustawienia.');
    }
    function save() {
        if (storageKey !== characterKey()) return;
        try { localStorage.setItem(storageKey, JSON.stringify(config)); }
        catch { say('Nie udało się zapisać ustawień w przeglądarce.'); }
    }
    function invalidate() {
        manualIds = [];
        preview.replaceChildren();
        ui.run.disabled = true;
        ui.run.title = 'Najpierw sprawdź podgląd ekwipunku';
        ui.run.setAttribute('aria-label', 'Uruchom ręczne przetwarzanie');
    }
    function cleanCrafting(data) {
        delete data.enhancement;
        delete data.artisanship;
        delete data.recipes;
        if (data.item) for (const id of Object.keys(data.item)) if (+id < 0) delete data.item[id];
    }
    function observe(data) {
        if (!data || typeof data !== 'object') return;
        if (data.loot?.source === 'fight') {
            for (const [id, item] of Object.entries(data.item || {})) {
                if (item && !item.del && (item.loc === 'l' || config.colossus && item.loc === 'k')) loot.add(String(id));
            }
        }
        for (const [id, item] of Object.entries(data.item || {})) {
            if (item?.del) { loot.delete(String(id)); buffer.delete(String(id)); }
            else if (item?.loc === 'g' && loot.has(String(id))) {
                loot.delete(String(id));
                if (active) buffer.add(String(id));
            }
        }
    }
    function hook() {
        if (hookInstalled) return;
        const owner = engine()?.communication || window;
        const name = engine()?.communication ? 'parseJSON' : 'parseInput';
        const original = owner[name];
        if (typeof original !== 'function') throw Error('Brak parsera odpowiedzi gry.');
        owner[name] = function (...args) {
            const data = args[0];
            let matched = null, response;
            try {
                observe(data);
                if (pending && data && typeof data === 'object' &&
                    (pending.keys.some(key => Object.hasOwn(data, key)) || data.e === 'error' || data.error)) {
                    matched = pending;
                    pending = null;
                    response = { ...data };
                    cleanCrafting(data);
                }
            } catch (error) { console.error('[Ulepa]', error); }
            try {
                const updatesItems = !!data?.item || !!data?.item_tpl;
                const result = original.apply(this, args);
                if (updatesItems) Promise.resolve().then(syncTargetView).catch(error => console.error('[Ulepa]', error));
                if (matched) matched.resolve(response);
                return result;
            } catch (error) {
                if (matched) matched.reject(error);
                throw error;
            }
        };
        hookInstalled = true;
    }
    function request(query, keys) {
        return new Promise((resolve, reject) => {
            if (pending) return reject(Error('Poprzednie żądanie jeszcze trwa.'));
            if (stopped) return reject(Error('Zatrzymano.'));
            if (inBattle()) return reject(Error('Poczekaj na zakończenie walki.'));
            const timeout = setTimeout(() => {
                if (pending === entry) pending = null;
                reject(Error('Brak odpowiedzi gry. Zatrzymano bez ponawiania żądania.'));
            }, 15000);
            const entry = { keys,
                resolve(data) { clearTimeout(timeout); resolve(data); },
                reject(error) { clearTimeout(timeout); reject(error); } };
            pending = entry;
            try {
                window._g(query);
            } catch (error) { pending = null; entry.reject(error); }
        });
    }
    function checkResponse(data) {
        if (data.error || data.e === 'error' || data.w === 'error' || data.alert || data.warning || data.ask) {
            const detail = data.error || data.alert || data.warning || 'Gra odrzuciła operację lub wymaga dodatkowej odpowiedzi.';
            throw Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
        }
    }
    function showProgress(data, name = '') {
        const enhancement = data.enhancement;
        if (!enhancement) return;
        const usage = enhancement.usages_preview;
        if (usage) ui.usage.textContent = `Dzisiaj ulepszono: ${usage.count} / ${usage.limit}`;
        const p = enhancement.progressing;
        if (p) {
            const percent = p.max > 0 ? Math.floor(p.current * 100 / p.max) : 0;
            ui.progress.textContent = `${name ? name + (p.upgradeLevel ? ' +' + p.upgradeLevel : '') + ': ' : ''}${p.current} / ${p.max} (${percent}%)`;
        }
        else if (name) ui.progress.textContent = `${name} (MAX)`;
    }
    async function processIds(ids, snapshot) {
        assertCharacter();
        if (busy) throw Error('Przetwarzanie już trwa.');
        if (lock()?.check?.('crafting')) throw Error('Zamknij okno rzemiosła przed uruchomieniem.');
        if (+hero()?.lvl < 20) throw Error('Wymagany poziom postaci: 20.');
        busy = true;
        stopped = false;
        let completed = 0;
        try {
            // Rebuild before every batch, since inventory, binding and enhancement level can change.
            let remaining = [...new Set(ids.map(String))];
            while (remaining.length && !stopped) {
                assertCharacter();
                if (inBattle()) throw Error('Rozpoczęła się walka. Kolejka została zatrzymana.');
                let batch = plan(remaining, snapshot, getItem)[0];
                if (!batch) break;
                const opened = await request('artisanship&action=open', ['artisanship', 'enhancement', 'message']);
                checkResponse(opened);
                showProgress(opened);
                if (stopped) break;
                assertCharacter();
                const usage = opened.enhancement?.usages_preview;
                if (snapshot.mode === 'enhancement' && usage?.limit > 0 && usage.count >= usage.limit) throw Error('Osiągnięto dzienny limit ulepszania.');
                batch = plan(batch.ids, snapshot, getItem)[0];
                if (!batch) { remaining = remaining.filter(id => eligible(getItem(id), snapshot)); break; }
                const query = snapshot.mode === 'salvage'
                    ? `salvager&action=salvage&selectedItems=${batch.ids.join(',')}`
                    : `enhancement&action=progress&item=${encodeURIComponent(batch.target)}&ingredients=${batch.ids.join(',')}&answer1001012=1&answer1001015=1`;
                let data;
                const craftingLock = lock();
                try {
                    craftingLock?.add?.('crafting');
                    data = await request(query, snapshot.mode === 'salvage' ? ['message'] : ['enhancement', 'message']);
                } finally { craftingLock?.remove?.('crafting'); }
                checkResponse(data);
                if (snapshot.mode === 'enhancement' && !data.enhancement) throw Error('Gra nie potwierdziła ulepszenia. Przerwano kolejkę.');
                showProgress(data, batch.target ? getItem(batch.target)?.name : '');
                renderSlots();
                completed += batch.ids.length;
                remaining = remaining.filter(id => !batch.ids.includes(id));
                batch.ids.forEach(id => buffer.delete(id));
                if (data.message) console.info('[Ulepa]', data.message);
            }
            if (!stopped) say(`Zakończono. Przetworzono składników: ${completed}.`);
        } finally { busy = false; }
    }
    function fail(error) {
        active = false;
        stopped = true;
        ui.stop.textContent = 'Wznów';
        ui.notice.hidden = false; ui.notice.textContent = error.message || String(error);
        say(error.message || String(error));
        console.error('[Ulepa]', error);
    }
    const signature = () => JSON.stringify(config);
    function makePreview() {
        if (busy) return say('Poczekaj na zakończenie kolejki.');
        try {
            invalidate();
            const jobs = plan(items().map(item => item.id), config, getItem);
            manualIds = jobs.flatMap(job => job.ids);
            manualSignature = signature();
            for (const job of jobs) {
                const heading = document.createElement('strong');
                heading.textContent = job.target ? `Cel: ${getItem(job.target)?.name} (${job.ids.length})` : `Do rozbicia: ${job.ids.length}`;
                preview.append(heading);
                for (const id of job.ids) {
                    const line = document.createElement('div');
                    line.textContent = `${getItem(id)?.name} [${id}]`;
                    preview.append(line);
                }
            }
            ui.run.disabled = !manualIds.length;
            ui.run.title = config.mode === 'salvage' ? `Rozbij ${manualIds.length} przedmiotów` : `Użyj ${manualIds.length} składników`;
            ui.run.setAttribute('aria-label', ui.run.title);
            say(manualIds.length ? 'Sprawdź listę poniżej, następnie uruchom operację.' : 'Brak pasujących składników lub celu ulepszania.');
        } catch (error) { fail(error); }
    }
    function refreshTargets() {
        const available = items().filter(item => item.loc === 'g' && targetOK(item));
        for (const key of ['target']) {
            const select = ui[key];
            const old = String(config[key] || '');
            select.replaceChildren(new Option('Brak wybranego przedmiotu', ''));
            for (const item of available) {
                const level = +stats(item).enhancement_upgrade_lvl || 0;
                select.add(new Option(`${item.name} +${level} [${item.id}]`, item.id));
            }
            if (old && !available.some(item => item.id === old)) {
                select.add(new Option(`Niedostępny przedmiot [${old}]`, old));
            }
            select.value = old;
        }
    }
    function renderSlots() {
        for (const key of ['target']) {
            const slot = ui['slot-' + key];
            const current = getItem(config[key]);
            if (current) {
                const display = { id: String(current.id), name: current.name, icon: current.icon || '' };
                if (JSON.stringify(display) !== JSON.stringify(config.targetDisplay)) {
                    config.targetDisplay = display; save();
                }
            }
            const cached = String(config.targetDisplay?.id) === String(config[key]) ? config.targetDisplay : null;
            const item = current || cached;
            slot.replaceChildren();
            slot.title = item ? `${item.name} [${item.id}] — PPM usuwa` : (config[key] ? `Zapisany przedmiot [${config[key]}] — oczekiwanie na ekwipunek` : `${slot.getAttribute('aria-label')} — przeciągnij przedmiot`);
            if (item?.icon) {
                const image = document.createElement('img');
                image.src = new URL(item.icon, window.CFG?.a_ipath || window.CFG?.ipath || location.origin + '/').href;
                image.alt = item.name; image.draggable = false;
                slot.append(image);
            } else slot.textContent = item ? String(item.name).slice(0, 2) : config[key] ? '…' : '';
            if (!current && config[key]) slot.title += ' — oczekiwanie na ekwipunek';
        }
    }
    let inspectedTarget = '';
    async function inspectTarget(id) {
        if (busy || !hookInstalled || !id || inBattle()) return;
        assertCharacter();
        inspectedTarget = String(id);
        busy = true; stopped = false;
        try {
            const data = await request(`enhancement&action=open&item=${encodeURIComponent(id)}`, ['enhancement', 'message']);
            checkResponse(data); showProgress(data, getItem(id)?.name);
        } catch (error) { fail(error); }
        finally { busy = false; }
    }
    let targetViewSignature = '';
    function syncTargetView() {
        if (!ui || storageKey !== characterKey()) return;
        const item = getItem(config.target);
        const signature = JSON.stringify([config.target, item?.name, item?.icon, item?.stat, item?._cachedStats]);
        if (signature === targetViewSignature) return;
        targetViewSignature = signature;
        refreshTargets(); renderSlots();
        if (config.target && (!ui.progress.textContent || ui.progress.textContent === 'Oczekiwanie na załadowanie przedmiotu…' || ui.progress.textContent === 'Przeciągnij przedmiot na pole.')) ui.progress.textContent = item?.name || 'Oczekiwanie na załadowanie przedmiotu…';
    }
    async function tick() {
        try {
            syncTargetView();
            if (!busy && hookInstalled && config.target && inspectedTarget !== String(config.target) && getItem(config.target)) {
                await inspectTarget(config.target);
            }
        } catch (error) { console.error('[Ulepa]', error); }
        if (!active || busy || inBattle()) return;
        try {
            assertCharacter();
            for (const id of buffer) if (!eligible(getItem(id), config)) buffer.delete(id);
            ui.buffer.textContent = `Bufor łupu: ${buffer.size}`;
            const free = emptySlots();
            if (config.bagSlots !== '' && (free === null || free > +config.bagSlots)) return;
            const force = config.forceBufferSize !== '' && free !== null && free <= +config.forceBufferSize;
            if (buffer.size && (buffer.size >= +config.bufferSize || force)) {
                const ids = [...buffer];
                if (!plan(ids, config, getItem).length) return;
                await processIds(ids, structuredClone(config));
            }
        } catch (error) { fail(error); }
    }
    function boot() {
        const id = hero()?.id;
        if (!id || typeof window._g !== 'function' || !document.body) return false;
        try { items(); } catch { return false; }
        storageKey = characterKey();
        let saved;
        try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { saved = {}; }
        config = { ...defaults(), ...saved };
        config.target = String(config.target || '');
        if (!Array.isArray(config.classes)) config.classes = [...CLASSES];
        delete config.weapons; delete config.armors; delete config.jewelry;
        if (typeof config.blackList !== 'string') config.blackList = '';
        panel = document.createElement('section');
        panel.id = 'standalone-fullmetal';
        panel.innerHTML = `<header><b>Ulepa</b><button data-scan type="button" title="Podgląd ekwipunku" aria-label="Podgląd ekwipunku">🔍</button><button data-run type="button" title="Najpierw sprawdź podgląd ekwipunku" aria-label="Uruchom ręczne przetwarzanie" disabled>▶</button><button data-min type="button" title="Pokaż ustawienia">⚙</button></header>
        <main><div data-usage>Dzisiaj ulepszono: —</div>
        <div class="slot-label">Przedmiot do ulepszania:</div><div class="slots"><button class="item-slot" data-slot-target type="button" aria-label="Cel ogólny"></button></div>
        <div data-progress>Przeciągnij przedmiot na pole.</div><div data-notice hidden></div>
        <details data-settings><summary hidden aria-hidden="true"></summary><p data-status>Gotowy. Automatyka jest włączona.</p>
        <label>Tryb <select data-mode><option value="enhancement">Ulepszanie</option><option value="salvage">Rozbijanie</option></select></label>
        <fieldset><legend>Przedmiot do ulepszania</legend>
        <select data-target aria-label="Przedmiot do ulepszania"></select>
        <button type="button" data-refresh>Odśwież przedmioty</button></fieldset>
        <fieldset><legend>Składniki</legend><div data-rarities></div><details><summary>Klasy przedmiotów</summary><div data-classes></div></details>
        <label>Nie używaj (jedna pełna nazwa w wierszu)<textarea data-blackList rows="3"></textarea></label></fieldset>
        <fieldset><legend>Łup po walce</legend><label><input type="checkbox" data-colossus> Uwzględnij kolosy</label>
        <label>Rozmiar bufora (1–25)<input data-bufferSize type="number" min="1" max="25"></label>
        <label>Działaj gdy ≤ wolnych miejsc (puste = zawsze)<input data-bagSlots type="number" min="0"></label>
        <label>Opróżnij bufor gdy ≤ wolnych miejsc<input data-forceBufferSize type="number" min="0"></label>
        <small data-buffer>Bufor łupu: 0</small></fieldset>
        <div class="actions"><button type="button" data-stop>STOP</button></div>
        </details><div data-preview></div></main>`;
        const style = document.createElement('style');
        style.textContent = `#standalone-fullmetal{position:fixed;width:200px;max-width:95vw;background:#171719ed;color:#eee;border:1px solid #668298;border-radius:4px;z-index:99999;font:12px/1.3 Arial;box-shadow:0 6px 22px #0009}#standalone-fullmetal *{box-sizing:border-box}#standalone-fullmetal header{display:flex;justify-content:space-between;align-items:center;cursor:move;padding:3px 5px;background:#25272a;gap:4px;touch-action:none;border-radius:8px}#standalone-fullmetal main{padding:4px;max-height:75vh;overflow:auto}#standalone-fullmetal label{display:block;margin:5px 0}#standalone-fullmetal select,#standalone-fullmetal textarea,#standalone-fullmetal input[type=number]{width:100%;background:#0e1821;color:#eee;border:1px solid #60788b;border-radius:3px;padding:4px}#standalone-fullmetal button{background:#38566c;color:#fff;border:1px solid #6d879a;border-radius:4px;padding:5px;cursor:pointer}#standalone-fullmetal button:disabled{opacity:.4;cursor:default}#standalone-fullmetal fieldset{border:1px solid #496174;margin:8px 0}#standalone-fullmetal [data-rarities],#standalone-fullmetal [data-classes]{display:flex;flex-wrap:wrap;gap:6px}#standalone-fullmetal .actions{display:flex;gap:5px;flex-wrap:wrap}#standalone-fullmetal [data-status]{color:#ffdc9c;margin:0 0 5px;white-space:pre-wrap}#standalone-fullmetal [data-preview]{max-height:200px;overflow:auto;margin-top:8px;word-break:break-word}#standalone-fullmetal [data-preview] strong{display:block;margin-top:8px}#standalone-fullmetal [data-stop]{background:#803c38}`;
        style.textContent += `#standalone-fullmetal header b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:12px}#standalone-fullmetal header button{padding:0 4px;background:none;border:0}#standalone-fullmetal .slot-label{text-align:center;margin:5px 0}#standalone-fullmetal .slots{display:flex;justify-content:center;gap:4px}#standalone-fullmetal .item-slot{width:34px;height:34px;padding:0;border:2px ridge #605b53;border-radius:0;background:#292727;display:flex;align-items:center;justify-content:center}#standalone-fullmetal .item-slot img{width:32px;height:32px;object-fit:contain;pointer-events:none}#standalone-fullmetal .item-slot.drop-hover{border-color:#33d5b0;background:#294a3f}#standalone-fullmetal [data-usage]{text-align:center;font-size:12px}#standalone-fullmetal [data-progress]{color:#12c9bd;text-align:center;margin:6px 0;overflow-wrap:anywhere}#standalone-fullmetal [data-notice]{color:#ffbd89;font-size:11px;margin:5px 0;overflow-wrap:anywhere}#standalone-fullmetal [data-settings]>summary{display:none}#standalone-fullmetal:has([data-settings][open]){width:300px}#standalone-fullmetal header{border-radius:4px}#standalone-fullmetal [data-settings]{margin-top:4px}`;
        style.textContent += `#standalone-fullmetal[data-compact="true"]{width:32px!important;height:32px}#standalone-fullmetal[data-compact="true"] header{height:30px;padding:0;justify-content:center}#standalone-fullmetal[data-compact="true"] header b,#standalone-fullmetal[data-compact="true"] [data-scan],#standalone-fullmetal[data-compact="true"] [data-run]{display:none}#standalone-fullmetal[data-compact="true"] header button{width:30px;height:30px;font-size:18px;padding:0}`;
        style.textContent += `#standalone-fullmetal header [data-scan],#standalone-fullmetal header [data-run]{flex:0 0 22px;width:22px;height:22px;padding:0;font-size:14px;line-height:22px}#standalone-fullmetal header [data-run]{color:#6ed2a5}`;
        style.textContent += '#standalone-fullmetal [data-preview]:empty{display:none}';
        document.head.append(style);
        document.body.append(panel);
        ui = Object.fromEntries([...panel.querySelectorAll('*')].flatMap(node => [...node.attributes].filter(attr => attr.name.startsWith('data-')).map(attr => [attr.name.slice(5), node])));
        // HTML normalizes attribute names to lowercase.
        ui.blackList = ui.blacklist; ui.bufferSize = ui.buffersize; ui.bagSlots = ui.bagslots; ui.forceBufferSize = ui.forcebuffersize;
        status = ui.status; preview = ui.preview;
        for (const [key, label] of [['common', 'Zwykłe'], ['unique', 'Unikatowe'], ['heroic', 'Heroiczne']]) {
            const node = document.createElement('label');
            const input = document.createElement('input'); input.type = 'checkbox'; input.checked = !!config[key];
            node.append(input, label); ui.rarities.append(node);
            input.onchange = () => { config[key] = input.checked; settingsChanged(); };
        }
        const names = ['Jednoręczne', 'Dwuręczne', 'Półtoraręczne', 'Dystansowe', 'Pomocnicze', 'Różdżki', 'Laski', 'Zbroje', 'Hełmy', 'Buty', 'Rękawice', 'Pierścienie', 'Naszyjniki', 'Tarcze'];
        for (const cl of CLASSES) {
            const node = document.createElement('label');
            const input = document.createElement('input'); input.type = 'checkbox'; input.checked = config.classes.includes(cl);
            node.append(input, `${cl}: ${names[cl - 1] || 'Strzały'}`); ui.classes.append(node);
            input.onchange = () => { config.classes = input.checked ? [...new Set([...config.classes, cl])] : config.classes.filter(value => value !== cl); settingsChanged(); };
        }
        function settingsChanged() {
            // Stop an old batch when options change, preserving the automation state.
            stopped = busy || !active; buffer.clear();
            invalidate(); save(); renderSlots(); ui.notice.hidden = true;
            say(active ? 'Ustawienia zapisane. Automatyka włączona.' : 'Ustawienia zapisane. Automatyka wyłączona.');
        }
        for (const key of ['mode', 'target', 'blackList', 'bufferSize', 'bagSlots', 'forceBufferSize', 'colossus']) {
            const input = ui[key];
            if (input.type === 'checkbox') input.checked = !!config[key]; else input.value = config[key];
            input.onchange = () => {
                config[key] = input.type === 'checkbox' ? input.checked : input.value;
                if (key === 'bufferSize') { config[key] = Math.min(25, Math.max(1, Math.floor(+input.value || 1))); input.value = config[key]; }
                if (['bagSlots', 'forceBufferSize'].includes(key) && input.value !== '') { config[key] = Math.max(0, Math.floor(+input.value || 0)); input.value = config[key]; }
                settingsChanged();
                if (['target'].includes(key)) inspectTarget(config[key]);
            };
        }
        ui.refresh.onclick = () => { try { inspectedTarget = ''; refreshTargets(); renderSlots(); } catch (error) { fail(error); } };
        ui.scan.onclick = makePreview;
        ui.run.onclick = async () => {
            if (manualSignature !== signature()) return invalidate();
            const ids = [...manualIds]; invalidate();
            try { await processIds(ids, structuredClone(config)); } catch (error) { fail(error); }
        };
        ui.stop.onclick = () => {
            if (!active && !busy) {
                active = true; stopped = false; buffer.clear(); loot.clear();
                ui.stop.textContent = 'STOP'; say('Automatyka włączona — obejmuje łup z kolejnych walk.');
                return;
            }
            active = false; stopped = true; buffer.clear(); invalidate();
            ui.stop.textContent = 'Wznów';
            say('Zatrzymano. Wysłana operacja może jeszcze zostać wykonana przez grę.');
        };
        function position() {
            // Keep the top-right corner fixed when the settings change the width.
            if (config.right === null || !Number.isFinite(+config.right)) {
                config.right = window.innerWidth - (+config.left || 0) - panel.offsetWidth;
            }
            const expandedWidth = Math.min(300, window.innerWidth * 0.95);
            config.right = Math.max(0, Math.min(+config.right, Math.max(0, window.innerWidth - expandedWidth)));
            const y = Math.max(0, Math.min(+config.top || 0, Math.max(0, window.innerHeight - 40)));
            panel.style.left = 'auto'; panel.style.right = `${config.right}px`; panel.style.top = `${y}px`;
        }
        const header = panel.querySelector('header'); let drag;
        header.onpointerdown = event => {
            if (event.button !== 0 || event.target.closest('button, input')) return;
            drag = { x: event.clientX, y: event.clientY, right: config.right, top: parseFloat(panel.style.top) };
            header.setPointerCapture(event.pointerId); event.preventDefault();
        };
        header.onpointermove = event => { if (drag) { config.right = drag.right + drag.x - event.clientX; config.top = drag.top + event.clientY - drag.y; position(); } };
        header.onpointerup = header.onpointercancel = () => { if (drag) { drag = null; save(); } };
        window.addEventListener('resize', position);
        ui.settings.open = !!config.settingsOpen;
        function settingsVisibility() {
            config.settingsOpen = ui.settings.open;
            panel.setAttribute('data-compact', String(!!config.compact));
            panel.querySelector('main').hidden = !!config.compact;
            ui.min.title = config.compact ? 'Pokaż dodatek' : (ui.settings.open ? 'Schowaj ustawienia' : 'Pokaż ustawienia') + ' · PPM: zwiń do ikony';
            ui.min.setAttribute?.('aria-expanded', String(ui.settings.open));
            position(); save();
        }
        ui.settings.ontoggle = settingsVisibility;
        ui.min.onclick = () => {
            if (config.compact) config.compact = false;
            else ui.settings.open = !ui.settings.open;
            settingsVisibility();
        };
        ui.min.oncontextmenu = event => {
            event.preventDefault(); event.stopPropagation();
            config.compact = !config.compact;
            settingsVisibility();
        };
        settingsVisibility();
        position(); refreshTargets(); renderSlots();
        if (config.target) ui.progress.textContent = getItem(config.target)?.name || config.targetDisplay?.name || 'Oczekiwanie na załadowanie przedmiotu…';
        function setDroppedTarget(key, id) {
            try {
                assertCharacter();
                if (busy) throw Error('Poczekaj na zakończenie kolejki.');
                const item = getItem(id);
                if (!targetOK(item) || item.loc !== 'g') throw Error('Ten przedmiot nie może być celem ulepszania.');
                config[key] = String(item.id);
                ui[key].value = config[key];
                settingsChanged(); refreshTargets();
                inspectTarget(item.id);
            } catch (error) { fail(error); }
        }
        for (const key of ['target']) {
            const slot = ui['slot-' + key];
            slot.oncontextmenu = event => {
                event.preventDefault();
                if (busy) return say('Poczekaj na zakończenie kolejki.');
                config[key] = ''; ui[key].value = ''; settingsChanged();
                if (key === 'target') ui.progress.textContent = 'Przeciągnij przedmiot na pole.';
            };
            slot.ondragover = event => { event.preventDefault(); };
            slot.ondrop = event => {
                event.preventDefault(); event.stopPropagation();
                const raw = event.dataTransfer?.getData('text/plain') || '';
                const id = /^\d+$/.test(raw) ? raw : /^item(?:-id-)?(\d+)$/.exec(raw)?.[1];
                if (id) setDroppedTarget(key, id);
            };
            // NI uses the game's pointer plugin; SI uses jQuery UI.
            const install = () => attachDropZone(window.jQuery || window.$, slot, engine(), id => setDroppedTarget(key, id));
            if (!install()) {
                let attempts = 0;
                const retry = setInterval(() => {
                    if (install() || ++attempts >= 120) clearInterval(retry);
                }, 500);
                window.addEventListener('pagehide', () => clearInterval(retry));
            }
        }
        try {
            hook(); active = true; stopped = false; ui.stop.textContent = 'STOP';
        } catch (error) { fail(error); ui.stop.disabled = true; ui.scan.disabled = true; }
        timer = setInterval(tick, 1000);
        window.addEventListener('pagehide', () => { clearInterval(timer); active = false; stopped = true; });
        return true;
    }
    let attempts = 0;
    const startup = setInterval(() => {
        try { if (boot() || ++attempts > 120) clearInterval(startup); }
        catch (error) { clearInterval(startup); console.error('[Ulepa] Nie udało się uruchomić:', error); }
    }, 1000);
})();

}});
