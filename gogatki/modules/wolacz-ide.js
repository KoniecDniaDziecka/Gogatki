GogatkiRuntime.register({id:"wolacz-ide",name:"Wo\u0142acz + id\u0119",description:"Wo\u0142anie na E2 i wiadomo\u015b\u0107 \u201eIde\u201d przez Lootlog klanowy Death Sentence.",start() {
    const window = unsafeWindow;
(function() {
    'use strict';
    if (window.__gogatkiWolaczIde) return;
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
            quickBtn.style.backgroundColor = '#333';
            quickBtn.style.color = '#fff';
            quickBtn.style.cursor = 'pointer';
        } else {
            quickBtn.dataset.enabled = 'false';
            textSpan.textContent = 'Brak Elity II';
            quickBtn.style.backgroundColor = '#777';
            quickBtn.style.color = '#ccc';
            quickBtn.style.cursor = 'default';
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
        container = document.createElement('div');
        container.id = 'gogatki-wolacz-ide';
        container.style.position = 'fixed';
        container.style.zIndex = '10000';
        container.style.display = 'flex';
        container.style.alignItems = 'center';

        // Pozycja z localStorage
        const savedPosition = localStorage.getItem('e2ButtonPos');
        if (savedPosition) {
            try {
                const pos = JSON.parse(savedPosition);
                container.style.top = pos.top + 'px';
                container.style.left = pos.left + 'px';
            } catch {
                container.style.top = '20px';
                container.style.left = '20px';
            }
        } else {
            container.style.top = '20px';
            container.style.left = '20px';
        }

        // Uchwyt "kółeczko"
        const handle = document.createElement('div');
        Object.assign(handle.style, {
            position: 'absolute',
            top: '0px',
            left: '0px',
            transform: 'translate(-50%, -50%)',
            width: '12px',
            height: '12px',
            backgroundColor: '#444',
            borderRadius: '50%',
            cursor: 'move',
            zIndex: '10001',
            userSelect: 'none'
        });
        container.appendChild(handle);

        // Przycisk główny
        quickBtn = document.createElement('button');
        quickBtn.style.padding = '8px 12px';
        quickBtn.style.backgroundColor = '#777';
        quickBtn.style.color = '#ccc';
        quickBtn.style.border = 'none';
        quickBtn.style.borderRadius = '4px';
        quickBtn.style.fontSize = '12px';
        quickBtn.style.opacity = '0.8';
        quickBtn.style.display = 'flex';
        quickBtn.style.alignItems = 'center';
        quickBtn.style.position = 'relative';
        quickBtn.dataset.enabled = 'false';
        quickBtn.style.height = '34px';
        quickBtn.style.lineHeight = 'normal';

        const textSpan = document.createElement('span');
        textSpan.textContent = 'Brak Elity II';
        textSpan.style.marginRight = '8px';
        quickBtn.appendChild(textSpan);

        autoCheckbox = document.createElement('input');
        autoCheckbox.type = 'checkbox';
        autoCheckbox.id = 'e2-auto-send';
        autoCheckbox.setAttribute('aria-label', 'Automatyczne wołanie E2');
        Object.assign(autoCheckbox.style, {
            width: '14px',
            height: '14px',
            backgroundColor: '#777',
            border: 'none',
            borderRadius: '2px',
            cursor: 'pointer',
            outline: 'none',
            margin: '0 0 0 4px',
            verticalAlign: 'middle'
        });

        autoCheckbox.addEventListener('click', e => e.stopPropagation());

        const savedState = localStorage.getItem('e2AutoSend');
        const isChecked = savedState === 'true';
        autoCheckbox.checked = isChecked;
        autoCheckbox.style.backgroundColor = isChecked ? 'green' : '#777';

        autoCheckbox.addEventListener('change', () => {
            const checked = autoCheckbox.checked;
            localStorage.setItem('e2AutoSend', checked ? 'true' : 'false');
            autoCheckbox.style.backgroundColor = checked ? 'green' : '#777';
            lastHasElite = false;
        });

        quickBtn.appendChild(autoCheckbox);

        // Przycisk "Ide" jako emotka 🚶‍♂️
        btnIde = document.createElement('button');
        btnIde.innerHTML = '🚶‍♂️';
        btnIde.setAttribute('aria-label', 'Idę');
        btnIde.title = 'Wyślij „Ide” przez Lootlog';
        btnIde.style.padding = '8px 12px';
        btnIde.style.backgroundColor = '#298d3a';
        btnIde.style.color = '#fff';
        btnIde.style.border = 'none';
        btnIde.style.borderRadius = '4px';
        btnIde.style.fontSize = '16px';
        btnIde.style.marginLeft = '6px';
        btnIde.style.opacity = '0.8';
        btnIde.style.cursor = 'pointer';
        btnIde.style.display = 'flex';
        btnIde.style.alignItems = 'center';
        btnIde.style.justifyContent = 'center';
        btnIde.style.height = '34px';
        btnIde.style.width = '34px';
        btnIde.style.lineHeight = 'normal';

        btnIde.addEventListener('mouseenter', () => btnIde.style.opacity = '1');
        btnIde.addEventListener('mouseleave', () => btnIde.style.opacity = '0.8');

        btnIde.addEventListener('click', () => {
            ensureMessageModal(() => {
                insertIntoTextarea('Ide');
                setTimeout(() => clickSendButton(), 100);
            });
        });

        container.appendChild(quickBtn);
        container.appendChild(btnIde);
        document.body.appendChild(container);

        // Drag’n’drop obsługiwane przez handle
        handle.addEventListener('mousedown', e => {
            isDragging = true;
            const rect = container.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', e => {
            if (!isDragging) return;
            container.style.left = (e.clientX - dragOffsetX) + 'px';
            container.style.top = (e.clientY - dragOffsetY) + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.userSelect = '';
                dropTimestamp = Date.now();
                const top = parseInt(container.style.top, 10);
                const left = parseInt(container.style.left, 10);
                localStorage.setItem('e2ButtonPos', JSON.stringify({ top, left }));
            }
        });

        quickBtn.addEventListener('mouseenter', () => quickBtn.style.opacity = '1');
        quickBtn.addEventListener('mouseleave', () => quickBtn.style.opacity = '0.8');

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
