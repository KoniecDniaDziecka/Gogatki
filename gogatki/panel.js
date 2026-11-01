'use strict';
const GogatkiRuntime = (() => {
    const definitions = [];
    return {
        register(definition) {
            if (!definition || typeof definition.id !== 'string' || typeof definition.start !== 'function') {
                throw new Error('Nieprawidłowy moduł Gogatków.');
            }
            if (definitions.some(item => item.id === definition.id)) throw new Error('Powtórzony moduł Gogatków.');
            definitions.push(definition);
        },
        mount() {

    'use strict';
    const window = unsafeWindow;
    if (window.__gogatekLoaded) return;
    window.__gogatekLoaded = true;
    const key = 'gogatek:modules:v1';
    let preferences;
    try { preferences = GM_getValue(key, {}); } catch { preferences = {}; }
    if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) preferences = {};
    const modules = [];
    const active = new Map();
    const errors = new Map();

    const host = document.createElement('div');
    host.id = 'gogatek-panel';
    const root = host.attachShadow({mode: 'open'});
    root.innerHTML = `<style>
        :host{all:initial;position:fixed;right:18px;top:40px;z-index:2147483647;font:12px/1.3 Arial;color:#eee}
        *{box-sizing:border-box}button,input{font:inherit}button{cursor:pointer;color:inherit}
        .move{background:#25272a;color:#aaa;border:1px solid #668298;border-radius:4px;padding:5px;cursor:move;touch-action:none;user-select:none;margin-right:3px}header{cursor:move;touch-action:none;user-select:none}.launcher{background:#25272a;border:1px solid #668298;border-radius:4px;padding:5px 9px;font-weight:bold;box-shadow:0 6px 22px #0009}
        section{margin-top:5px;width:280px;max-width:calc(100vw - 36px);background:#171719ed;border:1px solid #668298;border-radius:4px;box-shadow:0 6px 22px #0009;overflow:hidden}
        [hidden]{display:none!important}header{padding:5px 8px;background:#25272a;display:flex;align-items:center;justify-content:space-between}
        h2{margin:0;font-size:13px}small{font-size:10px;color:#aaa}header button{border:0;background:none;font-size:18px}
        .list{padding:0 8px}.row{display:flex;gap:10px;padding:11px 0;align-items:center;border-bottom:1px solid #ffffff12}.row:last-child{border:0}.info{flex:1}strong{display:block;margin-bottom:3px}p{font-size:11px;line-height:1.4;color:#aaa;margin:0}
        input{width:14px;height:14px;accent-color:#21bd69;cursor:pointer}.error{color:#ffbd89}
        footer{padding:7px 8px;border-top:1px solid #66829855;font-size:11px;color:#12c9bd}.apply{display:block;width:100%;margin-top:7px;padding:5px;background:#38566c;border:1px solid #6d879a;border-radius:3px}
        :focus-visible{outline:2px solid #12c9bd;outline-offset:2px}
    </style><button class="move" aria-label="Przesuń Gogatki" title="Przeciągnij, aby zmienić pozycję. Strzałki przesuwają o 10 px.">⠿</button><button class="launcher" aria-expanded="false" aria-controls="panel">Gogatki</button>
    <section id="panel" hidden aria-label="Panel dodatków"><header><div><h2>Gogatki</h2><small>Twoje dodatki w jednym miejscu</small></div><button aria-label="Zamknij">×</button></header><div class="list"></div><footer><span role="status"></span><button class="apply" hidden>Zastosuj i odśwież grę</button></footer></section>`;
    document.body.appendChild(host);
    const panel = root.querySelector('section');
    const launcher = root.querySelector('.launcher');
    function open(value) { panel.hidden = !value; launcher.setAttribute('aria-expanded', String(value)); position(positionState); }
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
    }
    function savePosition() {
        try { GM_setValue(positionKey, positionState); }
        catch { root.querySelector('[role=status]').textContent = 'Nie udało się zapisać pozycji.'; }
    }
    position(positionState);
    let drag = null;
    for (const handle of [root.querySelector('.move'), root.querySelector('header')]) {
        handle.addEventListener('pointerdown', event => {
            if (event.button !== 0 || drag || (handle.tagName !== 'BUTTON' && event.target.closest('button'))) return;
            event.preventDefault();
            drag = {id:event.pointerId, x:event.clientX, y:event.clientY, ...positionState};
            handle.setPointerCapture(event.pointerId);
        });
        handle.addEventListener('pointermove', event => {
            if (!drag || drag.id !== event.pointerId) return;
            position({right:drag.right - (event.clientX - drag.x), top:drag.top + event.clientY - drag.y});
        });
        function finish(event) {
            if (!drag || drag.id !== event.pointerId) return;
            if (event.type === 'pointercancel') position(drag);
            drag = null;
            if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
            savePosition();
        }
        handle.addEventListener('pointerup', finish);
        handle.addEventListener('pointercancel', finish);
        handle.addEventListener('lostpointercapture', finish);
    }
    root.querySelector('.move').addEventListener('keydown', event => {
        const offsets = {ArrowLeft:[10,0], ArrowRight:[-10,0], ArrowUp:[0,-10], ArrowDown:[0,10]};
        const offset = offsets[event.key];
        if (!offset) return;
        event.preventDefault();
        position({right:positionState.right + offset[0], top:positionState.top + offset[1]});
        savePosition();
    });
    window.addEventListener('resize', () => { position(positionState); savePosition(); });
    launcher.addEventListener('click', () => open(panel.hidden));
    root.querySelector('header button').addEventListener('click', () => { open(false); launcher.focus(); });
    root.addEventListener('keydown', event => { if (event.key === 'Escape') { open(false); launcher.focus(); } });
    root.querySelector('.apply').addEventListener('click', () => window.location.reload());
    function render() {
        const list = root.querySelector('.list');
        list.replaceChildren();
        for (const mod of modules) {
            const row = document.createElement('label'); row.className = 'row';
            const info = document.createElement('div'); info.className = 'info';
            const title = document.createElement('strong'); title.textContent = mod.name;
            const description = document.createElement('p'); description.textContent = errors.get(mod.id) || mod.description;
            if (errors.has(mod.id)) description.className = 'error';
            info.append(title, description);
            const toggle = document.createElement('input'); toggle.type = 'checkbox';
            toggle.checked = preferences[mod.id] === true; toggle.setAttribute('aria-label', mod.name);
            toggle.addEventListener('change', () => {
                const old = preferences[mod.id];
                preferences[mod.id] = toggle.checked;
                try { GM_setValue(key, preferences); errors.delete(mod.id); }
                catch { preferences[mod.id] = old; errors.set(mod.id, 'Nie udało się zapisać ustawień.'); }
                render();
            });
            row.append(info, toggle); list.appendChild(row);
        }
        const pending = modules.some(mod => (preferences[mod.id] === true) !== active.has(mod.id));
        root.querySelector('[role=status]').textContent = pending ? 'Zmiany czekają na odświeżenie gry.' : `Włączone: ${active.size}/${modules.length}`;
        root.querySelector('.apply').hidden = !pending;
    }
    function start(mod) {
        if (active.has(mod.id)) return;
        try { mod.start(); active.set(mod.id, true); errors.delete(mod.id); }
        catch (error) { errors.set(mod.id, 'Nie udało się uruchomić dodatku.'); console.error('[Gogatki]', mod.id, error); }
    }
    function register(mod) {
        if (modules.some(item => item.id === mod.id)) throw new Error('Powtórzony identyfikator modułu');
        modules.push(mod);
        if (preferences[mod.id] === true) start(mod);
        render();
    }

    for (const definition of definitions) register(definition);

        }
    };
})();
