GogatkiRuntime.register({id:"gift",name:"Gift",description:"Odbieranie darmowych nagr\u00f3d z aktualno\u015bci i kalendarza.",start() {
    // Keep checkbox styling consistent in already installed Gogatki panels.
    const gogatkiRoot = document.querySelector('#gogatek-panel')?.shadowRoot;
    if (gogatkiRoot && !gogatkiRoot.getElementById('gogatki-anty-x-checkboxes')) {
        const checkboxStyle = document.createElement('style');
        checkboxStyle.id = 'gogatki-anty-x-checkboxes';
        checkboxStyle.textContent = "input[type=\"checkbox\"]{-webkit-appearance:none!important;appearance:none!important;box-sizing:border-box!important;position:relative!important;transform:none!important;filter:none!important;display:grid!important;place-content:center!important;width:14px!important;height:14px!important;min-width:14px!important;min-height:14px!important;flex:none!important;padding:0!important;margin:0!important;border:1px solid #668298!important;border-radius:3px!important;background:#252b31!important;background-image:none!important;box-shadow:none!important;cursor:pointer;font:12px Arial,sans-serif!important;text-shadow:none!important;-webkit-text-stroke:0!important}\ninput[type=\"checkbox\"]:checked{border-color:#668298!important;background:#252b31!important;background-image:none!important}\ninput[type=\"checkbox\"]::before{content:none!important;display:none!important}\ninput[type=\"checkbox\"]::after{content:none!important;display:none!important}\ninput[type=\"checkbox\"]:checked::after{content:'✓'!important;display:block!important;position:static!important;width:auto!important;height:auto!important;margin:0!important;padding:0!important;border:0!important;transform:none!important;background:none!important;box-shadow:none!important;color:#12c9bd!important;-webkit-text-fill-color:#12c9bd!important;-webkit-text-stroke:0!important;text-shadow:none!important;font:12px/12px Arial,sans-serif!important}\ninput[type=\"checkbox\"]:focus-visible{outline:2px solid #12c9bd;outline-offset:1px}\ninput[type=\"checkbox\"]:disabled{opacity:.45;cursor:not-allowed}\n";
        gogatkiRoot.appendChild(checkboxStyle);
    }

    const window = unsafeWindow;
    // Compact addons keep their own size, independently of the main launcher.
    const tileHeight = 28;
    const tileStyle = document.createElement('style');
    tileStyle.textContent = ":root #standalone-free-gift{box-sizing:border-box;height:__TILE_HEIGHT__;width:__TILE_HEIGHT__}:root #standalone-free-gift header{box-sizing:border-box;display:flex;align-items:center;justify-content:center;height:calc(__TILE_HEIGHT__ - 2px);padding:0}:root #standalone-free-gift button{box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:100%;height:100%;min-height:0;padding:0;border:0;background:transparent;color:#12c9bd;line-height:1}:root #standalone-free-gift button svg{width:18px;height:18px;flex-shrink:0}:root #standalone-free-gift{background:#171b20!important;color:#dce6ee!important;opacity:1!important;filter:none!important;mix-blend-mode:normal!important;isolation:isolate;font-family:Arial,sans-serif!important;font-weight:400!important;font-style:normal!important}\n:root #standalone-free-gift,:root #standalone-free-gift *{font-family:Arial,sans-serif!important;text-shadow:none!important;-webkit-text-stroke:0!important;-webkit-text-fill-color:currentColor!important;letter-spacing:normal!important}\n:root #standalone-free-gift header{background:#252b31!important}\n:root #standalone-free-gift{color:#dce6ee!important}\n:root #standalone-free-gift label,:root #standalone-free-gift .slot-label{color:#c0ced8!important}\n:root #standalone-free-gift legend,:root #standalone-free-gift strong,:root #standalone-free-gift header b{color:#edf3f7!important}\n:root #standalone-free-gift small{color:#b1c0cb!important}\n:root #standalone-free-gift input:not([type=\"checkbox\"]),:root #standalone-free-gift select,:root #standalone-free-gift textarea{color:#dce6ee!important}\n:root #standalone-free-gift input::placeholder,:root #standalone-free-gift textarea::placeholder{color:#8fa2b0!important;opacity:1}\n:root #standalone-free-gift button{color:#dce6ee!important}\n:root #standalone-free-gift header button:has(svg),:root #standalone-free-gift button:has(svg){display:inline-flex;align-items:center;justify-content:center;color:#12c9bd!important}\n:root #standalone-free-gift [aria-label^=\"Uchwyt\"]{color:#b1c0cb!important}\n:root #standalone-free-gift button svg{display:block;max-width:100%;max-height:100%;flex-shrink:0}\n:root #standalone-fullmetal [data-status]{color:#b1c0cb!important}\n:root #standalone-fullmetal [data-usage]{color:#c0ced8!important}\n:root #e2-caller-panel .e2-ide{color:#12c9bd!important}\n\n:root #standalone-free-gift label{font-size:12px!important;font-weight:400!important}\n:root #standalone-free-gift legend,:root #standalone-free-gift strong,:root #standalone-free-gift header b{font-weight:600!important}\n:root #standalone-free-gift input:not([type=\"checkbox\"]),:root #standalone-free-gift select,:root #standalone-free-gift textarea{font-size:12px!important;background:#1b242c}\n:root #e2-caller-panel,:root #wolacz-global-panel > div:first-child{background:#252b31!important}\n:root #e2-caller-panel .e2-auto{font-size:11px!important}\n\n:root #standalone-free-gift input[type=\"checkbox\"]{-webkit-appearance:none!important;appearance:none!important;box-sizing:border-box!important;position:relative!important;transform:none!important;filter:none!important;display:grid!important;place-content:center!important;width:14px!important;height:14px!important;min-width:14px!important;min-height:14px!important;flex:none!important;padding:0!important;margin:0!important;border:1px solid #668298!important;border-radius:3px!important;background:#252b31!important;background-image:none!important;box-shadow:none!important;cursor:pointer;font:12px Arial,sans-serif!important;text-shadow:none!important;-webkit-text-stroke:0!important}\n:root #standalone-free-gift input[type=\"checkbox\"]:checked{border-color:#668298!important;background:#252b31!important;background-image:none!important}\n:root #standalone-free-gift input[type=\"checkbox\"]::before{content:none!important;display:none!important}\n:root #standalone-free-gift input[type=\"checkbox\"]::after{content:none!important;display:none!important}\n:root #standalone-free-gift input[type=\"checkbox\"]:checked::after{content:'✓'!important;display:block!important;position:static!important;width:auto!important;height:auto!important;margin:0!important;padding:0!important;border:0!important;transform:none!important;background:none!important;box-shadow:none!important;color:#12c9bd!important;-webkit-text-fill-color:#12c9bd!important;-webkit-text-stroke:0!important;text-shadow:none!important;font:12px/12px Arial,sans-serif!important}\n:root #standalone-free-gift input[type=\"checkbox\"]:focus-visible{outline:2px solid #12c9bd;outline-offset:1px}\n:root #standalone-free-gift input[type=\"checkbox\"]:disabled{opacity:.45;cursor:not-allowed}\n".replaceAll('__TILE_HEIGHT__', tileHeight + 'px');
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
        // The native promotions payload can omit price for a free reward (as in Maddonz).
        // Explicit non-zero or invalid prices must never be collected.
        return data.promotions.active.filter(p => p && (p.price == null || Number(p.price) === 0) &&
            (p.is_used == null || p.is_used === false || p.is_used === 0 || p.is_used === '0') && p.id != null);
    };
    function calendarWindowOpen(calendar, now) {
        return calendar?.start_ts != null && calendar?.end_ts != null && Number.isFinite(+now) && +now > 0 &&
            Number.isFinite(+calendar.start_ts) && +calendar.start_ts > 0 &&
            Number.isFinite(+calendar.end_ts) && +calendar.end_ts > +calendar.start_ts &&
            +now >= +calendar.start_ts && +now < +calendar.end_ts;
    }
    function availableCalendarDay(calendar, now) {
        if (!calendar || !calendar.days || typeof calendar.days !== 'object') return null;
        if (!calendarWindowOpen(calendar, now)) return null;
        const day = calendarDay(calendar.start_ts, now);
        const entry = calendar.days[String(day - 1)]; // days is indexed from zero; open uses day numbers from one.
        if (!entry || typeof entry !== 'object' || (entry.isOpened != null && Number(entry.isOpened) !== 0)) return null;
        return day;
    }
    function controller(game, view) {
        let busy = false, calendarState = null, calendarChecked = false;
        let newsDirty = false, newsRetryAt = 0, newsFailures = 0, newsNoticeActive = false;
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
            if (game.calendarActive?.() !== true) {
                calendarState = null; calendarChecked = false; offer('calendar', false); return;
            }
            offer('calendar', availableCalendarDay(calendarState, game.worldTime()) !== null);
        }
        function observeCalendar(calendar) {
            // Ignore partial acknowledgments; full responses also cover manual collection in the game's UI.
            if (calendar?.days && calendar.start_ts != null && calendar.end_ts != null) {
                calendarState = structuredClone(calendar);
                calendarChecked = true;
                updateCalendarAvailability();
            }
        }
        async function refreshCalendar() {
            // An inactive event must never trigger a show/open request (the game displays an alert).
            if (game.calendarActive?.() !== true) { updateCalendarAvailability(); return null; }
            calendarChecked = true;
            if (calendarState && !calendarWindowOpen(calendarState, game.worldTime())) {
                updateCalendarAvailability(); return null;
            }
            const data = await game.request('rewards_calendar&action=show', 'rewards_calendar');
            if (game.calendarActive?.() !== true) { updateCalendarAvailability(); return null; }
            calendarState = data.rewards_calendar || null;
            updateCalendarAvailability();
            return availableCalendarDay(calendarState, game.worldTime());
        }
        function observePromotions(promotions) {
            if (!Array.isArray(promotions?.active)) return;
            offer('news', freePromotions({ promotions }).length > 0);
            newsDirty = false; newsFailures = 0; newsRetryAt = 0;
        }
        function observeNotices(notices) {
            if (!Array.isArray(notices)) return;
            const active = notices.some(id => Number(id) === 1);
            if (active && !newsNoticeActive) invalidateNews();
            newsNoticeActive = active;
        }
        function invalidateNews() {
            newsDirty = true; newsFailures = 0; newsRetryAt = 0;
        }
        async function refreshNews() {
            newsDirty = false;
            try {
                const data = await game.request('promotions&a=show', 'promotions');
                offer('news', freePromotions(data).length > 0);
                newsFailures = 0; newsRetryAt = 0;
            } catch (error) {
                // Recover from a startup/network failure, with at most two delayed retries.
                newsDirty = ++newsFailures < 3;
                newsRetryAt = Date.now() + 15000;
                throw error;
            }
        }
        async function check() {
            return run(async () => {
                // Check the two independent sources even if one fails.
                try {
                    await refreshNews();
                } catch (error) { view.status(error.message || String(error)); }
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
                if (game.calendarActive?.() !== true || availableCalendarDay(calendarState, game.worldTime()) !== day) {
                    updateCalendarAvailability(); return;
                }
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
        function pollRewards() {
            updateCalendarAvailability();
            if (newsDirty && !busy && Date.now() >= newsRetryAt) { void run(refreshNews); return; }
            // Discover a newly started event once; never poll the server while it is inactive.
            if (!calendarChecked && !busy && game.calendarActive?.() === true) void run(refreshCalendar);
        }
        return { check, accept, acceptAll, observeCalendar, observePromotions, observeNotices,
            invalidateNews, updateCalendarAvailability, pollRewards };
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { calendarDay, freePromotions, calendarWindowOpen, availableCalendarDay, controller }; return;
    }
    if (window.top !== window.self || window.__standaloneFreeGift) return;
    window.__standaloneFreeGift = true;
    let pending = null, panel, checked = false, readySince = null, api;

    const heroId = () => String(window.Engine?.hero?.d?.id || window.hero?.id || '');
    let character;
    const game = {
        worldTime: () => window.Engine?.getWorldTime?.() ?? window.getWorldTime?.(),
        calendarActive: () => {
            if (window.Engine) {
                const active = window.Engine.rewardsCalendarActive;
                return active === true || active === 1 || active === '1';
            }
            const icon = document.getElementById('new_event_calendar');
            return !!icon && !icon.hidden && window.getComputedStyle(icon).display !== 'none';
        },
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
            const promotions = Array.isArray(data?.promotions?.active) ? structuredClone(data.promotions) : null;
            const notices = Array.isArray(data?.notices) ? [...data.notices] : null;
            const promotionChanged = data && Object.hasOwn(data, 'promotion_changed');
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
            if (heroId() === character) {
                if (calendar) api?.observeCalendar(calendar);
                if (notices) api?.observeNotices(notices);
                // Native UI responses update Gift without hiding or altering their dialogs.
                if (promotions && !entry) api?.observePromotions(promotions);
                if (promotionChanged && !entry) api?.invalidateNews();
            }
            if (entry) error ? entry.reject(error) : entry.resolve(response);
            return result;
        }
        wrapped.freeGiftHook = true; owner[name] = wrapped;
    }
    function mount() {
        const style = document.createElement('style');
        style.textContent = '#standalone-free-gift{position:fixed;right:24px;top:240px;z-index:99999;background:#171719ed;border:1px solid #668298;border-radius:4px;overflow:hidden;box-shadow:0 6px 22px #0009}#standalone-free-gift header{padding:3px;background:#25272a;user-select:none}#standalone-free-gift button{display:block;background:#38566c;color:#eee;border:1px solid #6d879a;border-radius:3px;cursor:pointer;padding:3px 7px;margin:0;font:18px/1.4 Arial}#standalone-free-gift button:disabled{opacity:.55;filter:none;pointer-events:none}';
        panel = document.createElement('section'); panel.id = 'standalone-free-gift';
        panel.innerHTML = '<header><button type="button" data-check disabled title="Gift" aria-label="Gift"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" style="display:block;pointer-events:none;flex-shrink:0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M12 8v13M12 8H7.5A2.5 2.5 0 1 1 10 5.5L12 8Zm0 0h4.5A2.5 2.5 0 1 0 14 5.5L12 8Z"/></svg></button></header>';
        style.textContent += `
            :root #standalone-free-gift[data-reward="true"]{width:${Math.round(tileHeight * 1.5)}px;height:${Math.round(tileHeight * 1.5)}px}
            :root #standalone-free-gift[data-reward="true"] header{height:100%}
            :root #standalone-free-gift[data-reward="true"] button svg{width:24px;height:24px;transform-origin:center;animation:gogatki-gift-pulse 1.4s ease-in-out infinite}
            @keyframes gogatki-gift-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.14)}}
            @media(prefers-reduced-motion:reduce){:root #standalone-free-gift[data-reward="true"] button svg{animation:none}}
        `;
        document.head.append(style); document.body.append(panel);
        const button = panel.querySelector('[data-check]');
        const rewards = new Set();
        let busy = false;
        const pendingNotices = new Set();
        let noticeTimer = null;
        function notifyAvailable() {
            if (busy || !pendingNotices.size) return;
            const kinds = [...pendingNotices].filter(kind => rewards.has(kind));
            pendingNotices.clear();
            if (!kinds.length) return;
            const source = kinds.length > 1 ? 'Aktualności i kalendarza' : kinds[0] === 'news' ? 'Aktualności' : 'kalendarza';
            const text = 'Gift: Odbierz darmowe nagrody z ' + source + '. Kliknij prezent.';
            // Margonem's message() displays the game's yellow notification.
            if (typeof window.message === 'function') {
                try { window.message(text); return; }
                catch (error) { console.warn('[Gift] Powiadomienie gry:', error); }
            }
            // Older clients without message() still get a local yellow notification.
            let notice = document.getElementById('gogatki-gift-notice');
            if (!notice) {
                notice = document.createElement('div'); notice.id = 'gogatki-gift-notice';
                notice.setAttribute('role', 'status'); notice.setAttribute('aria-live', 'polite');
                notice.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:2147483646;max-width:calc(100vw - 24px);box-sizing:border-box;padding:9px 13px;border:1px solid #b69a43;border-radius:4px;background:#29251a;color:#ffdc75;font:12px/1.4 Arial;text-align:center;text-shadow:none;-webkit-text-stroke:0;-webkit-text-fill-color:#ffdc75;pointer-events:none;box-shadow:0 4px 18px #0007';
                for (const [property, value] of Object.entries({color:'#ffdc75',background:'#29251a',opacity:'1',filter:'none','text-shadow':'none','font-family':'Arial,sans-serif','-webkit-text-stroke':'0','-webkit-text-fill-color':'#ffdc75'})) {
                    notice.style.setProperty(property, value, 'important');
                }
                document.body.append(notice);
            }
            notice.textContent = text;
            clearTimeout(noticeTimer);
            noticeTimer = setTimeout(() => { notice.remove(); noticeTimer = null; }, 6000);
        }
        window.addEventListener('pagehide', () => { clearTimeout(noticeTimer); document.getElementById('gogatki-gift-notice')?.remove(); }, {once:true});
        function updateButton() {
            panel.dataset.reward = String(rewards.size > 0);
            button.title = rewards.size > 0 ? 'Gift — odbierz nagrody' : 'Gift';
            button.setAttribute('aria-label', button.title);
            button.disabled = busy || rewards.size === 0;
            button.setAttribute('aria-busy', String(busy));
        }
        const view = {
            status: text => console.warn('[Gift]', text),
            busy(value) { busy = value; updateButton(); notifyAvailable(); },
            remove(kind) { rewards.delete(kind); pendingNotices.delete(kind); updateButton(); },
            offer(kind) {
                if (!rewards.has(kind)) pendingNotices.add(kind);
                rewards.add(kind); updateButton(); notifyAvailable();
            }
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
            api.pollRewards();
        }
    }, 100);
    window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
})();

}});






