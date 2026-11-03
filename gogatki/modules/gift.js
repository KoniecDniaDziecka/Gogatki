GogatkiRuntime.register({id:"gift",name:"Gift",description:"Odbieranie darmowych nagr\u00f3d z aktualno\u015bci i kalendarza.",start() {
    const window = unsafeWindow;
    const tile = document.querySelector('#gogatek-panel')?.shadowRoot?.querySelector('.launcher');
    const tileHeight = tile?.getBoundingClientRect().height || 28;
    const tileStyle = document.createElement('style');
    tileStyle.textContent = ":root #standalone-free-gift{box-sizing:border-box;height:__TILE_HEIGHT__;width:__TILE_HEIGHT__}:root #standalone-free-gift header{box-sizing:border-box;display:flex;align-items:center;justify-content:center;height:calc(__TILE_HEIGHT__ - 2px);padding:0}:root #standalone-free-gift button{box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:100%;height:100%;min-height:0;padding:0;border:0;background:transparent;color:#12c9bd;line-height:1}:root #standalone-free-gift button svg{width:18px;height:18px;flex-shrink:0}:root #standalone-free-gift{color:#dbe5ec}\n:root #standalone-free-gift label,:root #standalone-free-gift .slot-label{color:#b8c7d1}\n:root #standalone-free-gift legend,:root #standalone-free-gift strong,:root #standalone-free-gift header b{color:#e4edf3}\n:root #standalone-free-gift small{color:#9aadb9}\n:root #standalone-free-gift input:not([type=\"checkbox\"]),:root #standalone-free-gift select,:root #standalone-free-gift textarea{color:#dbe5ec}\n:root #standalone-free-gift input::placeholder,:root #standalone-free-gift textarea::placeholder{color:#8fa2b0;opacity:1}\n:root #standalone-free-gift button{color:#dbe5ec}\n:root #standalone-free-gift header button:has(svg),:root #standalone-free-gift button:has(svg){display:inline-flex;align-items:center;justify-content:center;color:#12c9bd}\n:root #standalone-free-gift [aria-label^=\"Uchwyt\"]{color:#9aadb9!important}\n:root #standalone-free-gift button svg{display:block;max-width:100%;max-height:100%;flex-shrink:0}\n:root #standalone-fullmetal [data-status]{color:#9aadb9}\n:root #standalone-fullmetal [data-usage]{color:#b8c7d1}\n:root #e2-caller-panel .e2-ide{color:#12c9bd}\n".replaceAll('__TILE_HEIGHT__', tileHeight + 'px');
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
    // Compare Warsaw calendar dates rather than elapsed hours (daylight saving time).
    function calendarDay(start, now) {
        function day(seconds) {
            if (!Number.isFinite(+seconds) || +seconds <= 0) throw Error('Brak daty kalendarza lub czasu serwera.');
            const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Warsaw',
                year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(+seconds * 1000));
            const p = Object.fromEntries(parts.map(part => [part.type, part.value]));
            return Date.UTC(+p.year, +p.month - 1, +p.day) / 86400000;
        }
        const result = day(now) - day(start) + 1;
        if (result < 1) throw Error('Kalendarz jeszcze się nie rozpoczął.');
        return result;
    }
    const freePromotions = data => {
        if (!Array.isArray(data?.promotions?.active)) throw Error('Nieprawidłowa odpowiedź Aktualności.');
        return data.promotions.active.filter(p => p && p.price != null && Number(p.price) === 0 && !p.is_used && p.id != null);
    };
    function availableCalendarDay(calendar, now) {
        if (!calendar || !calendar.days || typeof calendar.days !== 'object') return null;
        if (!Number.isFinite(+now) || !Number.isFinite(+calendar.start_ts) ||
            !Number.isFinite(+calendar.end_ts) || +now < +calendar.start_ts || +now >= +calendar.end_ts) return null;
        const day = calendarDay(calendar.start_ts, now);
        const entry = calendar.days[String(day - 1)]; // days is indexed from zero; open uses day numbers from one.
        if (!entry || typeof entry !== 'object' || (entry.isOpened != null && Number(entry.isOpened) !== 0)) return null;
        return day;
    }
    function controller(game, view) {
        let busy = false, calendarState = null;
        const available = new Set();
        async function run(job) {
            if (busy) return;
            busy = true; view.busy(true);
            try { await job(); }
            catch (error) { view.status(error.message || String(error)); }
            finally { busy = false; view.busy(false); }
        }
        function offer(kind, enabled) {
            if (enabled) { available.add(kind); view.offer(kind); }
            else { available.delete(kind); view.remove(kind); }
        }
        function updateCalendarAvailability() {
            offer('calendar', availableCalendarDay(calendarState, game.worldTime()) !== null);
        }
        function observeCalendar(calendar) {
            // Ignore partial acknowledgments; full responses also cover manual collection in the game's UI.
            if (calendar?.days && calendar.start_ts != null && calendar.end_ts != null) {
                calendarState = structuredClone(calendar);
                updateCalendarAvailability();
            }
        }
        async function refreshCalendar() {
            const data = await game.request('rewards_calendar&action=show', 'rewards_calendar');
            calendarState = data.rewards_calendar || null;
            updateCalendarAvailability();
            return availableCalendarDay(calendarState, game.worldTime());
        }
        async function check() {
            return run(async () => {
                // Check the two independent sources even if one fails.
                try {
                    const data = await game.request('promotions&a=show', 'promotions');
                    offer('news', freePromotions(data).length > 0);
                } catch (error) { offer('news', false); view.status(error.message || String(error)); }
                await refreshCalendar();
            });
        }
        async function claim(kind) {
            if (kind === 'news') {
                const data = await game.request('promotions&a=show', 'promotions');
                for (const p of freePromotions(data)) {
                    await game.request('promotions&a=use&id=' + encodeURIComponent(p.id), 'promotion_changed');
                }
                game.clearNotice('news-icon');
                offer('news', false);
            } else {
                // Recheck today's isOpened immediately before claiming, never request earlier or future days.
                const day = await refreshCalendar();
                if (day === null) return;
                const eventStart = calendarState.start_ts;
                const data = await game.request('rewards_calendar&action=open&day_no=' + day, 'rewards_calendar');
                if (data.rewards_calendar?.days) observeCalendar(data.rewards_calendar);
                else if (calendarState?.start_ts === eventStart) {
                    calendarState.days[String(day - 1)] = { ...calendarState.days[String(day - 1)], isOpened: 1 };
                }
                updateCalendarAvailability();
                game.clearNotice('rewards-calendar-icon');
            }
        }
        const accept = kind => run(() => claim(kind));
        const acceptAll = () => run(async () => {
            for (const kind of ['news', 'calendar']) if (available.has(kind)) await claim(kind);
        });
        return { check, accept, acceptAll, observeCalendar, updateCalendarAvailability };
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { calendarDay, freePromotions, availableCalendarDay, controller }; return;
    }
    if (window.top !== window.self || window.__standaloneFreeGift) return;
    window.__standaloneFreeGift = true;
    let pending = null, panel, checked = false, readySince = null, api;

    const heroId = () => String(window.Engine?.hero?.d?.id || window.hero?.id || '');
    let character;
    const game = {
        worldTime: () => window.Engine?.getWorldTime?.() ?? window.getWorldTime?.(),
        clearNotice: key => window.Engine?.widgetManager?.updateOneWidgetServerNoticeProcedure?.(key, false),
        request(query, key) {
            return new Promise((resolve, reject) => {
                if (heroId() !== character) return reject(Error('Zmieniono postać. Odśwież grę.'));
                if (pending) return reject(Error('Poprzednie żądanie jeszcze trwa.'));
                const lock = window.Engine?.lock || window.g?.lock;
                if (lock?.check?.('battle') || lock?.check?.('logoff')) return reject(Error('Poczekaj na koniec walki lub wylogowania.'));
                const entry = { key, resolve, reject, timer: setTimeout(() => {
                    if (pending === entry) pending = null;
                    reject(Error('Brak odpowiedzi gry. Sprawdź nagrody przed ponowną próbą.'));
                }, 15000) };
                pending = entry;
                try { window._g(query, data => {
                    // Some engine builds bypass the public parser. Their _g callback still returns the response.
                    if (pending !== entry || !data || typeof data !== 'object') return;
                    const detail = data.error || data.alert || data.warning || (data.e === 'error' ? 'Gra odrzuciła operację.' : null);
                    if (!detail && !Object.hasOwn(data, key)) return;
                    pending = null; clearTimeout(entry.timer);
                    if (detail) return reject(Error(typeof detail === 'string' ? detail : JSON.stringify(detail)));
                    const response = { ...data };
                    delete data[key];
                    resolve(response);
                }); }
                catch (error) { pending = null; clearTimeout(entry.timer); reject(error); }
            });
        }
    };
    function installHook(owner, name) {
        if (typeof owner?.[name] !== 'function' || owner[name].freeGiftHook) return;
        const original = owner[name];
        function wrapped(...args) {
            const data = args[0]; let entry, response, error;
            const calendar = data?.rewards_calendar?.days ? structuredClone(data.rewards_calendar) : null;
            if (data && typeof data === 'object') {
                if (pending && (Object.hasOwn(data, pending.key) || data.e === 'error' || data.error)) {
                    entry = pending; pending = null; clearTimeout(entry.timer);
                    const detail = data.error || data.alert || data.warning || (data.e === 'error' ? 'Gra odrzuciła operację.' : null);
                    if (detail) error = Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
                    response = { ...data };
                    // Only suppress the dialog belonging to this add-on's request.
                    if (!error) delete data[entry.key];
                }
            }
            let result;
            try { result = original.apply(this, args); }
            catch (err) { entry?.reject(err); throw err; }
            if (calendar && heroId() === character) api?.observeCalendar(calendar);
            if (entry) error ? entry.reject(error) : entry.resolve(response);
            return result;
        }
        wrapped.freeGiftHook = true; owner[name] = wrapped;
    }
    function mount() {
        const style = document.createElement('style');
        style.textContent = '#standalone-free-gift{position:fixed;right:24px;top:240px;z-index:99999;background:#171719ed;border:1px solid #668298;border-radius:4px;box-shadow:0 6px 22px #0009}#standalone-free-gift header{padding:3px;background:#25272a;cursor:move;touch-action:none;user-select:none}#standalone-free-gift button{display:block;background:#38566c;color:#eee;border:1px solid #6d879a;border-radius:3px;cursor:pointer;padding:3px 7px;margin:0;font:18px/1.4 Arial}#standalone-free-gift button:disabled{opacity:.55;filter:none;pointer-events:none}';
        panel = document.createElement('section'); panel.id = 'standalone-free-gift';
        panel.innerHTML = '<header><button type="button" data-check disabled title="Gift" aria-label="Gift"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" style="display:block;pointer-events:none;flex-shrink:0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M12 8v13M12 8H7.5A2.5 2.5 0 1 1 10 5.5L12 8Zm0 0h4.5A2.5 2.5 0 1 0 14 5.5L12 8Z"/></svg></button></header>';
        document.head.append(style); document.body.append(panel);
        const positionKey = 'gift-panel-position-v1';
        let position = { right: 24, top: 240 };
        try {
            const saved = JSON.parse(localStorage.getItem(positionKey));
            if (saved && Number.isFinite(saved.right) && Number.isFinite(saved.top)) position = saved;
        } catch { /* Use the default position when storage is unavailable. */ }
        function place() {
            const bounds = panel.getBoundingClientRect();
            panel.style.right = `${Math.max(0, Math.min(position.right, innerWidth - bounds.width))}px`;
            panel.style.top = `${Math.max(0, Math.min(position.top, innerHeight - bounds.height))}px`;
        }
        const header = panel.querySelector('header');
        let drag, suppressClick = false;
        header.onpointerdown = event => {
            if (event.button !== 0) return;
            suppressClick = false;
            drag = { id: event.pointerId, x: event.clientX, y: event.clientY,
                right: parseFloat(panel.style.right), top: parseFloat(panel.style.top), moved: false, capture: event.target };
            drag.capture.setPointerCapture(event.pointerId);
        };
        header.onpointermove = event => {
            if (!drag || drag.id !== event.pointerId) return;
            const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
            if (Math.hypot(dx, dy) > 4) drag.moved = true;
            if (!drag.moved) return;
            event.preventDefault();
            position = { right: drag.right - dx, top: drag.top + dy };
            place();
        };
        function endDrag(event) {
            if (!drag || drag.id !== event.pointerId) return;
            suppressClick = drag.moved;
            if (drag.moved) {
                position = { right: parseFloat(panel.style.right), top: parseFloat(panel.style.top) };
                try { localStorage.setItem(positionKey, JSON.stringify(position)); } catch { /* Keep the position for this session. */ }
            }
            const capture = drag.capture;
            drag = null;
            if (capture.hasPointerCapture(event.pointerId)) capture.releasePointerCapture(event.pointerId);
        }
        header.onpointerup = header.onpointercancel = endDrag;
        header.addEventListener('click', event => {
            if (suppressClick && event.detail !== 0) {
                suppressClick = false; event.preventDefault(); event.stopPropagation();
            }
        }, true);
        window.addEventListener('resize', place);
        new ResizeObserver(place).observe(panel);
        place();
        const button = panel.querySelector('[data-check]');
        const rewards = new Set();
        let busy = false;
        function updateButton() {
            button.disabled = busy || rewards.size === 0;
            button.setAttribute('aria-busy', String(busy));
        }
        const view = {
            status: text => console.warn('[Gift]', text),
            busy(value) { busy = value; updateButton(); },
            remove(kind) { rewards.delete(kind); updateButton(); },
            offer(kind) { rewards.add(kind); updateButton(); }
        };
        api = controller(game, view);
        button.onclick = () => { if (!button.disabled) void api.acceptAll(); };
    }
    // Install before the initial notices response, then wait for the game and DOM.
    const timer = setInterval(() => {
        installHook(window.Engine?.communication, 'parseJSON');
        installHook(window, 'parseInput');
        if (!document.body || !heroId() || typeof window._g !== 'function') return;
        if (!panel) { character = heroId(); mount(); }
        // allInit and g.init distinguish a loaded character from the game still starting.
        const ready = window.Engine ? window.Engine.allInit !== false :
            (window.g?.init == null || window.g.init > 4);
        const lock = window.Engine?.lock || window.g?.lock;
        if (!ready || lock?.check?.('battle') || lock?.check?.('logoff')) { readySince = null; return; }
        if (!checked) {
            readySince ??= Date.now();
            if (Date.now() - readySince < 300) return;
            checked = true;
            void api.check();
        } else if (heroId() === character) {
            api.updateCalendarAvailability();
        }
    }, 100);
    window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
})();

}});
