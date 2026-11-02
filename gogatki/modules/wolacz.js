GogatkiRuntime.register({id:"wolacz",name:"Wo\u0142acz Kolosy",description:"Wo\u0142anie na globalny wed\u0142ug mapy i grupy \u00b7 1.4.2",start() {
    const window = unsafeWindow;
(() => {
    'use strict';

    const MAPY = {
        3361: '36',
        3883: '63',
        4046: '83',
        7353: '114',
        4161: '144',
        4066: '167',
        4196: '190',
        4206: '213',
        4266: '244',
        4268: '279',
    };
    const LIMIT_GRUPY = 10;
    const PRZERWA_MS = 3000;
    const KANAL = 'global';
    const POSITION_KEY = 'wolaczGlobalPosition';

    if (document.getElementById('wolacz-global-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'wolacz-global-panel';
    Object.assign(panel.style, {
        position: 'fixed', top: '20px', left: '20px', zIndex: '10000',
        display: 'flex', flexDirection: 'column', alignItems: 'stretch',
        gap: '0', maxWidth: '260px', font: '12px/1.3 Arial',
        background: '#171719ed', color: '#eee', border: '1px solid #668298',
        borderRadius: '4px', boxShadow: '0 6px 22px #0009', overflow: 'hidden',
    });

    const button = document.createElement('button');
    button.type = 'button';
    Object.assign(button.style, {
        padding: '3px 8px', border: '1px solid #6d879a', borderRadius: '3px',
        background: '#38566c', color: '#12c9bd', font: '12px/18px Arial',
        minHeight: '24px', flex: '1', whiteSpace: 'normal',
    });
    const status = document.createElement('div');
    status.setAttribute('role', 'status');
    Object.assign(status.style, {
        color: '#12c9bd', padding: '5px 8px', fontSize: '11px',
        borderTop: '1px solid #66829855', overflowWrap: 'anywhere', display: 'none',
    });
    const controls = document.createElement('div');
    Object.assign(controls.style, {
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '3px 5px', background: '#25272a',
    });
    const handle = document.createElement('div');
    handle.textContent = '⠿';
    handle.title = 'Przeciągnij, aby zmienić pozycję. Pozycja zapisuje się automatycznie.';
    handle.setAttribute('aria-label', 'Uchwyt do przesuwania przycisku');
    Object.assign(handle.style, {
        padding: '0 3px', color: '#aaa', flexShrink: '0',
        cursor: 'grab', userSelect: 'none', touchAction: 'none',
        font: '18px/24px Arial',
    });
    controls.append(handle, button);
    panel.append(controls, status);
    document.body.appendChild(panel);

    let lastAttempt = -Infinity;
    let notificationTimer = null;
    let drag = null;
    const COMPACT_KEY = 'wolaczGlobalCompact';
    let compact = false;
    try { compact = localStorage.getItem(COMPACT_KEY) === 'true'; } catch {}

    function applyCompact() {
        button.style.display = compact ? 'none' : '';
        status.style.display = !compact && status.textContent ? 'block' : 'none';
        controls.style.gap = compact ? '0' : '4px';
        handle.title = 'Przeciągnij, aby zmienić pozycję. PPM: ' + (compact ? 'rozwiń Wołacza.' : 'zwiń Wołacza.');
        handle.setAttribute('aria-expanded', String(!compact));
        setPosition(parseFloat(panel.style.left), parseFloat(panel.style.top));
    }
    handle.addEventListener('contextmenu', event => {
        event.preventDefault();
        event.stopPropagation();
        compact = !compact;
        applyCompact();
        try { localStorage.setItem(COMPACT_KEY, String(compact)); }
        catch { notify('Przeglądarka nie pozwala zapisać zwinięcia.'); }
    });

    function setPosition(left, top) {
        const maxLeft = Math.max(0, window.innerWidth - panel.offsetWidth);
        const maxTop = Math.max(0, window.innerHeight - panel.offsetHeight);
        panel.style.left = `${Math.min(maxLeft, Math.max(0, left))}px`;
        panel.style.top = `${Math.min(maxTop, Math.max(0, top))}px`;
    }

    function savePosition() {
        try {
            localStorage.setItem(POSITION_KEY, JSON.stringify({
                left: parseFloat(panel.style.left), top: parseFloat(panel.style.top),
            }));
        } catch (error) {
            notify('Przeglądarka nie pozwala zapisać pozycji.');
            console.warn('[Wołacz GLOBAL] Zapis pozycji:', error);
        }
    }

    function restorePosition() {
        let left = 20;
        let top = 20;
        try {
            const saved = JSON.parse(localStorage.getItem(POSITION_KEY));
            if (Number.isFinite(saved?.left) && Number.isFinite(saved?.top)) {
                ({ left, top } = saved);
            }
        } catch (error) {
            console.warn('[Wołacz GLOBAL] Odczyt pozycji:', error);
        }
        setPosition(left, top);
    }

    handle.addEventListener('pointerdown', event => {
        if (event.button !== 0 || drag) return;
        event.preventDefault();
        event.stopPropagation();
        const rect = panel.getBoundingClientRect();
        drag = {
            id: event.pointerId, offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top, left: rect.left, top: rect.top,
        };
        handle.setPointerCapture(event.pointerId);
        handle.style.cursor = 'grabbing';
    });
    handle.addEventListener('pointermove', event => {
        if (!drag || drag.id !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        setPosition(event.clientX - drag.offsetX, event.clientY - drag.offsetY);
    });
    function finishDrag(event) {
        if (!drag || drag.id !== event.pointerId) return;
        event.stopPropagation();
        if (event.type === 'pointercancel') setPosition(drag.left, drag.top);
        else savePosition();
        drag = null;
        handle.style.cursor = 'grab';
        if (handle.hasPointerCapture(event.pointerId)) {
            handle.releasePointerCapture(event.pointerId);
        }
    }
    handle.addEventListener('pointerup', finishDrag);
    handle.addEventListener('pointercancel', finishDrag);
    handle.addEventListener('lostpointercapture', () => {
        drag = null;
        handle.style.cursor = 'grab';
    });
    handle.addEventListener('click', event => event.stopPropagation());
    window.addEventListener('resize', () => {
        setPosition(parseFloat(panel.style.left), parseFloat(panel.style.top));
        savePosition();
    });

    function prepare() {
        const engine = window.Engine || null;
        const mapId = engine?.map?.d?.id ?? engine?.map?.id ?? window.map?.id;
        if (mapId == null) throw new Error('Oczekiwanie na dane mapy.');
        if (!Object.hasOwn(MAPY, String(mapId))) {
            throw new Error(`Brak wołania dla mapy ${mapId}.`);
        }

        const members = engine?.party?.getMembers?.();
        const count = members == null ? 0 : members.size;
        if (!Number.isInteger(count) || count < 0 || count > LIMIT_GRUPY) {
            throw new Error('Brak poprawnych danych grupy.');
        }
        if (typeof window._g !== 'function') {
            throw new Error('Oczekiwanie na czat gry.');
        }
        const displayedCount = count >= 2 && count <= 5 ? count + 2 : count;
        const groupText = count <= 1 ? 'Zapraszam!' : `${displayedCount}/${LIMIT_GRUPY}`;
        return { message: `${MAPY[mapId]} ${groupText}` };
    }

    function update() {
        try {
            const { message } = prepare();
            button.textContent = `Wołaj: ${message}`;
            button.title = `Wyślij tę wiadomość na kanał ${KANAL.toUpperCase()}`;
            button.disabled = Date.now() - lastAttempt < PRZERWA_MS;
        } catch (error) {
            button.textContent = 'Wołacz niedostępny';
            button.title = error.message;
            button.disabled = true;
        }
        button.style.opacity = button.disabled ? '0.55' : '1';
        button.style.cursor = button.disabled ? 'default' : 'pointer';
    }

    function notify(text, duration = 0) {
        clearTimeout(notificationTimer);
        notificationTimer = null;
        status.textContent = text;
        status.style.display = text && !compact ? 'block' : 'none';
        if (text && duration > 0) {
            notificationTimer = setTimeout(() => {
                status.textContent = '';
                status.style.display = 'none';
                notificationTimer = null;
            }, duration);
        }
    }

    button.addEventListener('click', () => {
        if (Date.now() - lastAttempt < PRZERWA_MS) return;
        try {
            const { message } = prepare();
            lastAttempt = Date.now();
            window._g(`chat&channel=${KANAL}`, null, { c: message });
            notify('Wysłano.', 5000);
        } catch (error) {
            notify(error.message);
            console.warn('[Wołacz GLOBAL]', error);
        }
        update();
    });

    update();
    applyCompact();
    restorePosition();
    setInterval(update, 500);
})();

}});
