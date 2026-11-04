GogatkiRuntime.register({id:"wolacz-ide",name:"Wo\u0142acz + id\u0119",description:"Wo\u0142anie na E2 i wiadomo\u015b\u0107 \u201eIde\u201d przez Lootlog klanowy Death Sentence.",start() {
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
    tileStyle.textContent = ":root #e2-caller-panel[data-compact=\"true\"]{box-sizing:border-box;height:__TILE_HEIGHT__;min-height:0}:root #e2-caller-panel[data-compact=\"true\"] .e2-handle{box-sizing:border-box;height:100%;min-height:0;font-size:16px;line-height:calc(__TILE_HEIGHT__ - 8px)}:root #e2-caller-panel[data-compact=\"true\"] .e2-ide{box-sizing:border-box;height:100%;min-height:0;padding:0 8px;line-height:1}:root #e2-caller-panel{background:#171b20!important;color:#dce6ee!important;opacity:1!important;filter:none!important;mix-blend-mode:normal!important;isolation:isolate;font-family:Arial,sans-serif!important;font-weight:400!important;font-style:normal!important}\n:root #e2-caller-panel,:root #e2-caller-panel *{font-family:Arial,sans-serif!important;text-shadow:none!important;-webkit-text-stroke:0!important;-webkit-text-fill-color:currentColor!important;letter-spacing:normal!important}\n:root #e2-caller-panel header{background:#252b31!important}\n:root #e2-caller-panel{color:#dce6ee!important}\n:root #e2-caller-panel label,:root #e2-caller-panel .slot-label{color:#c0ced8!important}\n:root #e2-caller-panel legend,:root #e2-caller-panel strong,:root #e2-caller-panel header b{color:#edf3f7!important}\n:root #e2-caller-panel small{color:#b1c0cb!important}\n:root #e2-caller-panel input:not([type=\"checkbox\"]),:root #e2-caller-panel select,:root #e2-caller-panel textarea{color:#dce6ee!important}\n:root #e2-caller-panel input::placeholder,:root #e2-caller-panel textarea::placeholder{color:#8fa2b0!important;opacity:1}\n:root #e2-caller-panel button{color:#dce6ee!important}\n:root #e2-caller-panel header button:has(svg),:root #e2-caller-panel button:has(svg){display:inline-flex;align-items:center;justify-content:center;color:#12c9bd!important}\n:root #e2-caller-panel [aria-label^=\"Uchwyt\"]{color:#b1c0cb!important}\n:root #e2-caller-panel button svg{display:block;max-width:100%;max-height:100%;flex-shrink:0}\n:root #standalone-fullmetal [data-status]{color:#b1c0cb!important}\n:root #standalone-fullmetal [data-usage]{color:#c0ced8!important}\n:root #e2-caller-panel .e2-ide{color:#12c9bd!important}\n\n:root #e2-caller-panel label{font-size:12px!important;font-weight:400!important}\n:root #e2-caller-panel legend,:root #e2-caller-panel strong,:root #e2-caller-panel header b{font-weight:600!important}\n:root #e2-caller-panel input:not([type=\"checkbox\"]),:root #e2-caller-panel select,:root #e2-caller-panel textarea{font-size:12px!important;background:#1b242c}\n:root #e2-caller-panel,:root #wolacz-global-panel > div:first-child{background:#252b31!important}\n:root #e2-caller-panel .e2-auto{font-size:11px!important}\n\n:root #e2-caller-panel label:has(>input[type=\"checkbox\"]){display:flex!important;align-items:center;gap:6px;line-height:1.4}\n:root #e2-caller-panel[data-compact=\"true\"] > .e2-auto{display:none!important}\n:root #e2-caller-panel input[type=\"checkbox\"]{-webkit-appearance:none!important;appearance:none!important;box-sizing:border-box!important;position:relative!important;transform:none!important;filter:none!important;display:grid!important;place-content:center!important;width:14px!important;height:14px!important;min-width:14px!important;min-height:14px!important;flex:none!important;padding:0!important;margin:0!important;border:1px solid #668298!important;border-radius:3px!important;background:#252b31!important;background-image:none!important;box-shadow:none!important;cursor:pointer;font:12px Arial,sans-serif!important;text-shadow:none!important;-webkit-text-stroke:0!important}\n:root #e2-caller-panel input[type=\"checkbox\"]:checked{border-color:#668298!important;background:#252b31!important;background-image:none!important}\n:root #e2-caller-panel input[type=\"checkbox\"]::before{content:none!important;display:none!important}\n:root #e2-caller-panel input[type=\"checkbox\"]::after{content:none!important;display:none!important}\n:root #e2-caller-panel input[type=\"checkbox\"]:checked::after{content:'✓'!important;display:block!important;position:static!important;width:auto!important;height:auto!important;margin:0!important;padding:0!important;border:0!important;transform:none!important;background:none!important;box-shadow:none!important;color:#12c9bd!important;-webkit-text-fill-color:#12c9bd!important;-webkit-text-stroke:0!important;text-shadow:none!important;font:12px/12px Arial,sans-serif!important}\n:root #e2-caller-panel input[type=\"checkbox\"]:focus-visible{outline:2px solid #12c9bd;outline-offset:1px}\n:root #e2-caller-panel input[type=\"checkbox\"]:disabled{opacity:.45;cursor:not-allowed}\n".replaceAll('__TILE_HEIGHT__', tileHeight + 'px');
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
(function() {
    'use strict';
    if (window.__gogatkiWolaczIde || document.getElementById('e2-caller-panel')) return;
    window.__gogatkiWolaczIde = true;

    // ================================
    //   FUNKCJE POMOCNICZE: MODAL Lootlog
    // ================================
    function getClanLauncher() {
        return document.querySelector('.cll-launcher[data-tip*="Death Sentence"]');
    }
    function getClanSendMsgButton() {
        return document.querySelector('.cll-modal .cll-modal-content #cll-send-msg');
    }
    function getClanCancelButton() {
        return document.querySelector('.cll-modal .cll-modal-buttons #cll-message-cancel');
    }

    function hideModalsTemporarily() {
        const style = document.createElement('style');
        style.id = 'temp-hide-modals';
        style.textContent = `
    .cll-modal { opacity:0 !important; pointer-events:none !important; }
    .cll-modal * { visibility:hidden !important; }
  `;
        document.head.appendChild(style);
        return style;
    }
    function restoreModals(styleElement) {
        if (styleElement && styleElement.parentNode) styleElement.remove();
    }

    function silentlyInitMessageModal() {
        const hideStyle = hideModalsTemporarily();
        let step = 0;
        let tries = 0;
        const maxTries = 120;

        const iv = setInterval(() => {
            tries++;
            if (tries > maxTries) { restoreModals(hideStyle); clearInterval(iv); return; }

            if (step === 0) {
                const launcher = getClanLauncher();
                if (launcher) { launcher.click(); step = 1; }
                return;
            }
            if (step === 1) {
                const sendBtn = getClanSendMsgButton();
                if (sendBtn) { sendBtn.click(); step = 2; }
                return;
            }
            if (step === 2) {
                const cancelBtn = getClanCancelButton();
                if (cancelBtn) {
                    cancelBtn.click();
                    restoreModals(hideStyle);
                    clearInterval(iv);
                }
            }
        }, 100);
    }

    function ensureMessageModal(callback) {
        let attempts = 0;
        let clickedLauncher = false;
        let clickedSend = false;
        const interval = setInterval(() => {
            if (++attempts > 120) { clearInterval(interval); return; }
            const textarea = document.querySelector('#cll-message-textarea');
            if (textarea) {
                clearInterval(interval);
                callback();
                return;
            }
            const sendMsgBtn = getClanSendMsgButton();
            if (sendMsgBtn && !clickedSend) {
                clickedSend = true;
                sendMsgBtn.click();
                return;
            }
            const launcher = getClanLauncher();
            if (launcher && !clickedLauncher) {
                clickedLauncher = true;
                launcher.click();
                return;
            }
        }, 100);
    }

    function insertIntoTextarea(text) {
        const textarea = document.querySelector('#cll-message-textarea');
        if (textarea) {
            textarea.value = text;
            textarea.focus();
        }
    }

    function clickSendButton() {
        const sendBtn = document.querySelector('#cll-message-send');
        if (sendBtn) sendBtn.click();
    }

    // ================================================
    //   KOPIOWANIE NAZWY Moba (PRAWY KLIK NA TIMERZE)
    // ================================================
    document.addEventListener('contextmenu', event => {
        const timerEl = event.target.closest('.cll-timer');
        if (!timerEl) return;
        event.preventDefault();
        const nameDiv = timerEl.querySelector('.cll-timer-monster');
        const mobName = nameDiv ? nameDiv.textContent.trim() : '';
        if (!mobName) return;
        ensureMessageModal(() => {
            insertIntoTextarea(mobName);
        });
    });

    // ================================================
    //   CZYSZCZENIE TEXTAREA PO "WYŚLIJ"/"ODPOWIEDZ"
    // ================================================
    document.addEventListener('click', event => {
        const target = event.target;
        if (!target) return;
        if (target.id === 'cll-message-send' || target.id === 'cll-reply') {
            const textarea = document.querySelector('#cll-message-textarea');
            if (textarea) textarea.value = '';
        }
    });

    // =====================================================
    //   DETEKCJA "Elita II" NA PODSTAWIE pola `tip` NPC-ów
    // =====================================================
  function isElite2(npc) {
      const icon = npc?.d?.icon;
      return typeof icon === 'string' && icon.toLowerCase().startsWith('e2/');
  }

    function findVisibleEliteIINames() {
        const out = [];
        try {
            const list = window.Engine?.npcs?.getDrawableList?.() || [];
            for (const n of list) {
                if (!Array.isArray(n?.tip) || n.tip[1] !== 't_npc') continue;
                if (!isElite2(n)) continue;
                const name = n?.d?.nick?.trim();
                if (name) out.push(name);
            }
        } catch (e) { console.warn('Błąd NPC:', e); }
        return out;
    }

    // =======================================================
    //   PRZYCISK Wołania + przycisk "Ide"
    // =======================================================
    let container = null;
    let quickBtn = null;
    let btnIde = null;
    let autoCheckbox = null;
    let lastHasElite = false;
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let dropTimestamp = 0;

    function getFilteredNames() {
        return findVisibleEliteIINames().filter(
            name => {
                const n = name.toLowerCase();
                return n !== 'shakkru' && n !== 'rycerz z za małym mieczem';
            }
        );
    }

    function updateQuickButtonState() {
        if (!quickBtn) return;
        const filteredNames = getFilteredNames();
        const textSpan = quickBtn.querySelector('span');
        if (filteredNames.length > 0) {
            quickBtn.dataset.enabled = 'true';
            textSpan.textContent = 'Zawołaj na E2';
            quickBtn.title = 'Znaleziono ' + filteredNames.length + ' Elita II';
        } else {
            quickBtn.dataset.enabled = 'false';
            textSpan.textContent = 'Brak Elity II';
            quickBtn.title = 'Brak widocznej Elity II';
        }
    }

    function autoSendIfNeeded() {
        if (Date.now() - dropTimestamp < 1000) return;

        if (!autoCheckbox || autoCheckbox.checked === false) {
            lastHasElite = false;
            return;
        }
        const filteredNames = getFilteredNames();
        const hasElite = filteredNames.length > 0;
        if (hasElite && !lastHasElite) {
            const combined = Array.from(new Set(filteredNames)).join(', ');
            ensureMessageModal(() => {
                insertIntoTextarea(combined);
                setTimeout(() => clickSendButton(), 100);
            });
            lastHasElite = true;
        }
        if (!hasElite) {
            lastHasElite = false;
        }
    }

    function createQuickEliteIISendButton() {
        if (document.getElementById('e2-caller-panel')) return;
        const style = document.createElement('style');
        style.textContent = `
            #e2-caller-panel { position:fixed; z-index:10000; display:flex; align-items:center;
                gap:4px; padding:3px 5px; background:#25272a; color:#eee;
                border:1px solid #668298; border-radius:4px; box-shadow:0 6px 22px #0009;
                font:12px/1.3 Arial; box-sizing:border-box; max-width:100vw;
                max-height:100vh; overflow:auto; }
            #e2-caller-panel[data-compact="true"] > :not(.e2-handle):not(.e2-ide) { display:none; }
            #e2-caller-panel[data-compact="true"] { gap:0; }
            #e2-caller-panel * { box-sizing:border-box; }
            #e2-caller-panel button { appearance:none; margin:0; padding:3px 8px;
                border:1px solid #6d879a; border-radius:3px; background:#38566c;
                color:#12c9bd; font:12px/18px Arial; min-height:24px;
                display:flex; align-items:center; justify-content:center; cursor:pointer;
                text-shadow:none; box-shadow:none; transition:background .15s; }
            #e2-caller-panel button:hover { background:#43677f; }
            #e2-caller-panel button:focus-visible, #e2-caller-panel input:focus-visible {
                outline:2px solid #12c9bd; outline-offset:2px; }
            #e2-caller-panel button[data-enabled="false"] { opacity:.55; cursor:default; }
            #e2-caller-panel .e2-handle { padding:0 3px; color:#aaa; flex-shrink:0;
                cursor:grab; user-select:none; font:18px/24px Arial;
                display:flex; align-items:center; justify-content:center; min-height:24px; }
            #e2-caller-panel .e2-auto { display:flex; align-items:center; gap:4px;
                padding:0 6px; color:#aaa; cursor:pointer; font:10px/18px Arial; }
            #e2-caller-panel .e2-auto:has(input:checked) { color:#12c9bd; }
            #e2-caller-panel input { appearance:auto; accent-color:#12c9bd;
                width:13px; height:13px; margin:0; cursor:pointer; }
        `;
        document.head.appendChild(style);
        container = document.createElement('div');
        container.id = 'e2-caller-panel';

        function setPosition(left, top) {
            const maxLeft = Math.max(0, window.innerWidth - container.offsetWidth);
            const maxTop = Math.max(0, window.innerHeight - container.offsetHeight);
            container.style.left = Math.min(maxLeft, Math.max(0, Number.isFinite(left) ? left : 20)) + 'px';
            container.style.top = Math.min(maxTop, Math.max(0, Number.isFinite(top) ? top : 20)) + 'px';
        }
        function keepOnScreen() {
            setPosition(parseFloat(container.style.left), parseFloat(container.style.top));
        }
        function savePosition() {
            try {
                localStorage.setItem('e2ButtonPos', JSON.stringify({
                    left: parseFloat(container.style.left), top: parseFloat(container.style.top)
                }));
            } catch (error) { console.warn('[Wołacz E2] Zapis pozycji:', error); }
        }
        let savedPosition = null;
        let compact = false;
        try {
            savedPosition = JSON.parse(localStorage.getItem('e2ButtonPos'));
            compact = localStorage.getItem('e2ButtonCompact') === 'true';
        } catch (error) { console.warn('[Wołacz E2] Odczyt ustawień:', error); }

        const handle = document.createElement('div');
        handle.className = 'e2-handle';
        handle.innerHTML = "<svg viewBox=\"0 0 12 18\" width=\"10\" height=\"16\" aria-hidden=\"true\" focusable=\"false\" style=\"display:block;pointer-events:none;flex-shrink:0;fill:currentColor\"><circle cx=\"4\" cy=\"4\" r=\"1\"/><circle cx=\"8\" cy=\"4\" r=\"1\"/><circle cx=\"4\" cy=\"9\" r=\"1\"/><circle cx=\"8\" cy=\"9\" r=\"1\"/><circle cx=\"4\" cy=\"14\" r=\"1\"/><circle cx=\"8\" cy=\"14\" r=\"1\"/></svg>";
        handle.title = 'Przeciągnij, aby zmienić pozycję';
        handle.setAttribute('aria-label', 'Uchwyt do przesuwania panelu');
        container.appendChild(handle);

        quickBtn = document.createElement('button');
        quickBtn.type = 'button';
        quickBtn.dataset.enabled = 'false';
        const textSpan = document.createElement('span');
        textSpan.textContent = 'Brak Elity II';
        quickBtn.appendChild(textSpan);

        const autoLabel = document.createElement('label');
        autoLabel.className = 'e2-auto';
        autoLabel.title = 'Automatycznie wołaj po pojawieniu się Elity II';
        autoCheckbox = document.createElement('input');
        autoCheckbox.type = 'checkbox';
        autoCheckbox.id = 'e2-auto-send';
        autoCheckbox.setAttribute('aria-label', 'Automatyczne wołanie na E2');
        autoLabel.append(autoCheckbox, document.createTextNode('AUTO'));

        autoCheckbox.addEventListener('click', e => e.stopPropagation());

        const savedState = localStorage.getItem('e2AutoSend');
        const isChecked = savedState === 'true';
        autoCheckbox.checked = isChecked;

        autoCheckbox.addEventListener('change', () => {
            const checked = autoCheckbox.checked;
            localStorage.setItem('e2AutoSend', checked ? 'true' : 'false');
            lastHasElite = false;
        });

        btnIde = document.createElement('button');
        btnIde.type = 'button';
        btnIde.className = 'e2-ide';
        btnIde.textContent = 'Idę';
        btnIde.title = 'Wyślij wiadomość „Ide”';

        btnIde.addEventListener('click', () => {
            ensureMessageModal(() => {
                insertIntoTextarea('Ide');
                setTimeout(() => clickSendButton(), 100);
            });
        });

        container.appendChild(quickBtn);
        container.appendChild(autoLabel);
        container.appendChild(btnIde);
        document.body.appendChild(container);

        function applyCompact() {
            container.dataset.compact = String(compact);
            handle.title = 'Przeciągnij, aby zmienić pozycję. PPM: ' +
                (compact ? 'rozwiń Wołacza.' : 'zwiń Wołacza.');
            handle.setAttribute('aria-expanded', String(!compact));
            keepOnScreen();
        }
        handle.addEventListener('contextmenu', event => {
            event.preventDefault();
            event.stopPropagation();
            compact = !compact;
            applyCompact();
            savePosition();
            try { localStorage.setItem('e2ButtonCompact', String(compact)); }
            catch (error) { console.warn('[Wołacz E2] Zapis zwinięcia:', error); }
        });
        applyCompact();
        setPosition(savedPosition?.left, savedPosition?.top);
        savePosition();
        window.addEventListener('resize', () => {
            keepOnScreen();
            savePosition();
        });
        new ResizeObserver(keepOnScreen).observe(container);

        // Drag’n’drop obsługiwane przez handle
        handle.addEventListener('mousedown', e => {
            if (e.button !== 0) return;
            e.preventDefault();
            isDragging = true;
            const rect = container.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', e => {
            if (!isDragging) return;
            setPosition(e.clientX - dragOffsetX, e.clientY - dragOffsetY);
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.userSelect = '';
                dropTimestamp = Date.now();
                keepOnScreen();
                savePosition();
            }
        });


        quickBtn.addEventListener('click', () => {
            if (quickBtn.dataset.enabled !== 'true') return;
            const filteredNames = getFilteredNames();
            const combined = Array.from(new Set(filteredNames)).join(', ');
            ensureMessageModal(() => {
                insertIntoTextarea(combined);
                setTimeout(() => clickSendButton(), 100);
            });
        });

        setInterval(() => {
            updateQuickButtonState();
            autoSendIfNeeded();
        }, 500);
        updateQuickButtonState();
    }

    const _prewarmLS = localStorage.getItem('e2Prewarm');
    const PREWARM_ENABLED = _prewarmLS == null
    ? (navigator.hardwareConcurrency || 2) >= 4
    : _prewarmLS === 'true';

    const launcherObserver = new MutationObserver((mutations, observer) => {
        if (getClanLauncher()) {
            observer.disconnect();
            if (PREWARM_ENABLED) silentlyInitMessageModal();
            createQuickEliteIISendButton();
        }
    });
    if (getClanLauncher()) {
        if (PREWARM_ENABLED) silentlyInitMessageModal();
        createQuickEliteIISendButton();
    } else {
        launcherObserver.observe(document.body, { childList: true, subtree: true });
    }
})();
}});

