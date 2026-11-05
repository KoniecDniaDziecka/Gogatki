GogatkiRuntime.register({id:"wolacz",name:"Wo\u0142acz Kolosy",description:"Wo\u0142anie na globalny wed\u0142ug mapy i grupy",start() {
    // Keep checkbox styling consistent in already installed Gogatki panels.
    const gogatkiRoot = document.querySelector('#gogatek-panel')?.shadowRoot;
    if (gogatkiRoot && !gogatkiRoot.getElementById('gogatki-anty-x-checkboxes')) {
        const checkboxStyle = document.createElement('style');
        checkboxStyle.id = 'gogatki-anty-x-checkboxes';
        checkboxStyle.textContent = "input[type=\"checkbox\"]{-webkit-appearance:none!important;appearance:none!important;box-sizing:border-box!important;position:relative!important;transform:none!important;filter:none!important;display:grid!important;place-content:center!important;width:14px!important;height:14px!important;min-width:14px!important;min-height:14px!important;flex:none!important;padding:0!important;margin:0!important;border:1px solid #668298!important;border-radius:3px!important;background:#252b31!important;background-image:none!important;box-shadow:none!important;cursor:pointer;font:12px Arial,sans-serif!important;text-shadow:none!important;-webkit-text-stroke:0!important}\ninput[type=\"checkbox\"]:checked{border-color:#668298!important;background:#252b31!important;background-image:none!important}\ninput[type=\"checkbox\"]::before{content:none!important;display:none!important}\ninput[type=\"checkbox\"]::after{content:none!important;display:none!important}\ninput[type=\"checkbox\"]:checked::after{content:'✓'!important;display:block!important;position:static!important;width:auto!important;height:auto!important;margin:0!important;padding:0!important;border:0!important;transform:none!important;background:none!important;box-shadow:none!important;color:#12c9bd!important;-webkit-text-fill-color:#12c9bd!important;-webkit-text-stroke:0!important;text-shadow:none!important;font:12px/12px Arial,sans-serif!important}\ninput[type=\"checkbox\"]:focus-visible{outline:2px solid #12c9bd;outline-offset:1px}\ninput[type=\"checkbox\"]:disabled{opacity:.45;cursor:not-allowed}\n";
        gogatkiRoot.appendChild(checkboxStyle);
    }

    const window = unsafeWindow;
    const tile = document.querySelector('#gogatek-panel')?.shadowRoot?.querySelector('.launcher');
    const tileHeight = tile?.getBoundingClientRect().height || 28;
    const tileStyle = document.createElement('style');
    tileStyle.textContent = ":root #wolacz-global-panel[data-compact=\"true\"]{box-sizing:border-box;height:__TILE_HEIGHT__;min-height:0}:root #wolacz-global-panel[data-compact=\"true\"] > div:first-child{box-sizing:border-box;height:100%;min-height:0;padding:0 5px!important}:root #wolacz-global-panel[data-compact=\"true\"] > div:first-child > div{box-sizing:border-box;height:100%;line-height:calc(__TILE_HEIGHT__ - 2px)!important;font-size:16px!important}:root #wolacz-global-panel{background:#171b20!important;color:#dce6ee!important;opacity:1!important;filter:none!important;mix-blend-mode:normal!important;isolation:isolate;font-family:Arial,sans-serif!important;font-weight:400!important;font-style:normal!important}\n:root #wolacz-global-panel,:root #wolacz-global-panel *{font-family:Arial,sans-serif!important;text-shadow:none!important;-webkit-text-stroke:0!important;-webkit-text-fill-color:currentColor!important;letter-spacing:normal!important}\n:root #wolacz-global-panel header{background:#252b31!important}\n:root #wolacz-global-panel{color:#dce6ee!important}\n:root #wolacz-global-panel label,:root #wolacz-global-panel .slot-label{color:#c0ced8!important}\n:root #wolacz-global-panel legend,:root #wolacz-global-panel strong,:root #wolacz-global-panel header b{color:#edf3f7!important}\n:root #wolacz-global-panel small{color:#b1c0cb!important}\n:root #wolacz-global-panel input:not([type=\"checkbox\"]),:root #wolacz-global-panel select,:root #wolacz-global-panel textarea{color:#dce6ee!important}\n:root #wolacz-global-panel input::placeholder,:root #wolacz-global-panel textarea::placeholder{color:#8fa2b0!important;opacity:1}\n:root #wolacz-global-panel button{color:#dce6ee!important}\n:root #wolacz-global-panel header button:has(svg),:root #wolacz-global-panel button:has(svg){display:inline-flex;align-items:center;justify-content:center;color:#12c9bd!important}\n:root #wolacz-global-panel [aria-label^=\"Uchwyt\"]{color:#b1c0cb!important}\n:root #wolacz-global-panel button svg{display:block;max-width:100%;max-height:100%;flex-shrink:0}\n:root #standalone-fullmetal [data-status]{color:#b1c0cb!important}\n:root #standalone-fullmetal [data-usage]{color:#c0ced8!important}\n:root #e2-caller-panel .e2-ide{color:#12c9bd!important}\n\n:root #wolacz-global-panel label{font-size:12px!important;font-weight:400!important}\n:root #wolacz-global-panel legend,:root #wolacz-global-panel strong,:root #wolacz-global-panel header b{font-weight:600!important}\n:root #wolacz-global-panel input:not([type=\"checkbox\"]),:root #wolacz-global-panel select,:root #wolacz-global-panel textarea{font-size:12px!important;background:#1b242c}\n:root #e2-caller-panel,:root #wolacz-global-panel > div:first-child{background:#252b31!important}\n:root #e2-caller-panel .e2-auto{font-size:11px!important}\n\n:root #wolacz-global-panel input[type=\"checkbox\"]{-webkit-appearance:none!important;appearance:none!important;box-sizing:border-box!important;position:relative!important;transform:none!important;filter:none!important;display:grid!important;place-content:center!important;width:14px!important;height:14px!important;min-width:14px!important;min-height:14px!important;flex:none!important;padding:0!important;margin:0!important;border:1px solid #668298!important;border-radius:3px!important;background:#252b31!important;background-image:none!important;box-shadow:none!important;cursor:pointer;font:12px Arial,sans-serif!important;text-shadow:none!important;-webkit-text-stroke:0!important}\n:root #wolacz-global-panel input[type=\"checkbox\"]:checked{border-color:#668298!important;background:#252b31!important;background-image:none!important}\n:root #wolacz-global-panel input[type=\"checkbox\"]::before{content:none!important;display:none!important}\n:root #wolacz-global-panel input[type=\"checkbox\"]::after{content:none!important;display:none!important}\n:root #wolacz-global-panel input[type=\"checkbox\"]:checked::after{content:'✓'!important;display:block!important;position:static!important;width:auto!important;height:auto!important;margin:0!important;padding:0!important;border:0!important;transform:none!important;background:none!important;box-shadow:none!important;color:#12c9bd!important;-webkit-text-fill-color:#12c9bd!important;-webkit-text-stroke:0!important;text-shadow:none!important;font:12px/12px Arial,sans-serif!important}\n:root #wolacz-global-panel input[type=\"checkbox\"]:focus-visible{outline:2px solid #12c9bd;outline-offset:1px}\n:root #wolacz-global-panel input[type=\"checkbox\"]:disabled{opacity:.45;cursor:not-allowed}\n\n:root #wolacz-global-panel[data-compact=\"true\"]{width:__TILE_HEIGHT__;overflow:hidden}\n:root #wolacz-global-panel[data-compact=\"true\"] > div:first-child{padding:0!important}\n:root #wolacz-global-panel[data-compact=\"true\"] [aria-label=\"Uchwyt do przesuwania przycisku\"]{width:100%;height:100%;padding:0;cursor:pointer}\n:root #wolacz-global-panel[data-compact=\"true\"] [aria-label=\"Uchwyt do przesuwania przycisku\"]:focus-visible{outline:2px solid #12c9bd;outline-offset:-3px}\n".replaceAll('__TILE_HEIGHT__', tileHeight + 'px');
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
        if (window.__gogatkiWolaczKolosyLoaded) return true;
        window.__gogatkiWolaczKolosyLoaded = true;
        mount();
        return true;
    }
    function mount() {


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
    handle.innerHTML = "<svg viewBox=\"0 0 12 18\" width=\"10\" height=\"16\" aria-hidden=\"true\" focusable=\"false\" style=\"display:block;pointer-events:none;flex-shrink:0;fill:currentColor\"><circle cx=\"4\" cy=\"4\" r=\"1\"/><circle cx=\"8\" cy=\"4\" r=\"1\"/><circle cx=\"4\" cy=\"9\" r=\"1\"/><circle cx=\"8\" cy=\"9\" r=\"1\"/><circle cx=\"4\" cy=\"14\" r=\"1\"/><circle cx=\"8\" cy=\"14\" r=\"1\"/></svg>";
    handle.title = 'Przeciągnij, aby zmienić pozycję. Pozycja zapisuje się automatycznie.';
    handle.setAttribute('aria-label', 'Uchwyt do przesuwania przycisku');
    Object.assign(handle.style, {
        padding: '0 3px', color: '#aaa', flexShrink: '0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'grab', userSelect: 'none', touchAction: 'none',
        font: '18px/24px Arial',
    });
    controls.append(handle, button);
    panel.append(controls, status);
    document.body.appendChild(panel);

    let lastAttempt = -Infinity;
    let notificationTimer = null;
    let drag = null, dragged = false;
    const COMPACT_KEY = 'wolaczGlobalCompact';
    const gripIcon = handle.innerHTML;
    const megaphoneIcon = "<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"display:block;pointer-events:none\"><path d=\"M3 10v4h4l12 5V5L7 10H3Z\"/><path d=\"m7 14 2 7h4l-2-5M7 10v4M22 9v6\"/></svg>";
    let compact = false;
    try { compact = localStorage.getItem(COMPACT_KEY) === 'true'; } catch {}

    function applyCompact() {
        dragged = false;
        panel.dataset.compact = String(compact);
        handle.innerHTML = compact ? megaphoneIcon : gripIcon;
        if (compact) { handle.setAttribute('role', 'button'); handle.tabIndex = 0; }
        else { handle.removeAttribute('role'); handle.removeAttribute('tabindex'); }
        button.style.display = compact ? 'none' : '';
        status.style.display = !compact && status.textContent ? 'block' : 'none';
        controls.style.gap = compact ? '0' : '4px';
        handle.title = compact ? 'Wołacz Kolosy — kliknij, aby rozwinąć. PPM również rozwija.' : 'Przeciągnij, aby zmienić pozycję. PPM: zwiń Wołacza.';
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
        if (window.__gogatkiTileDock?.isDocked(panel)) return;
        const maxLeft = Math.max(0, window.innerWidth - panel.offsetWidth);
        const maxTop = Math.max(0, window.innerHeight - panel.offsetHeight);
        panel.style.left = `${Math.min(maxLeft, Math.max(0, left))}px`;
        panel.style.top = `${Math.min(maxTop, Math.max(0, top))}px`;
    }

    function savePosition() {
        if (window.__gogatkiTileDock?.isDocked(panel)) return;
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
        dragged = false;
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
        if (Math.hypot(event.clientX - drag.left - drag.offsetX, event.clientY - drag.top - drag.offsetY) > 4) dragged = true;
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
    function expandFromIcon() {
        handle.dispatchEvent(new MouseEvent('contextmenu', {bubbles:true, cancelable:true}));
    }
    handle.addEventListener('click', event => {
        event.stopPropagation();
        if (compact && !dragged) expandFromIcon();
    });
    handle.addEventListener('keydown', event => {
        if (!compact || !['Enter', ' '].includes(event.key)) return;
        event.preventDefault(); expandFromIcon();
    });
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
        const displayedCount = (count >= 2 && count <= 5 || count === 7) ? count + 2 : count;
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
    }
    if (!mountWhenReady()) {
        let attempts = 0;
        const wait = setInterval(() => {
            if (mountWhenReady() || ++attempts >= 600) clearInterval(wait);
        }, 100);
        window.addEventListener('pagehide', () => clearInterval(wait), {once:true});
    }
})();

}});


