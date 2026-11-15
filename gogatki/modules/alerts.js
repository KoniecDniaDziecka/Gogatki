// Alerts 1.0.0 — Level Up Alert, Status Alert i No More Alerts (Maddonz, Barlag).
GogatkiRuntime.register({
  id: 'alerts',
  name: 'Alerts',
  description: 'Ostrzeżenie przed poziomem, statusy w walce i zwykłe alerty bez potwierdzania.',
  start() {
    const window = unsafeWindow;
    const document = window.document;
// Źródło logiki: margonem-sources/maddonz.original.js, moduły
// LevelUpAlert, StatusAlert i NoMoreAlerts. Autorstwo oryginału: Barlag.
// Samodzielna adaptacja: bez Vue, menedżera i pozostałych modułów Maddonza.
(() => {
  'use strict';

  const INSTANCE = Symbol.for('gogatki.alerts.instance');
  if (window[INSTANCE]) return;
  window[INSTANCE] = true;

  const STORAGE = 'alerts:global:v1';
  const LEGACY_STORAGE = 'gogatki.alerts.v1';
  const defaults = {
    level: true, status: true, noMore: true, mute: false, audio: '',
    statuses: { lastHeal: true, curse: true, blind: true, distract: true },
    collapsed: false, settings: false, right: 16, top: 160,
  };
  const names = {
    lastHeal: 'Ostatni ratunek', curse: 'Klątwa',
    blind: 'Oślepienie', distract: 'Wytrącenie z równowagi',
  };
  let settings = readSettings();
  let lastLevelWarning = null;
  let lastHero = null;
  let lastLevel = null;
  let panel;
  let root;
  let audio;
  const hooks = new WeakMap();
  const hookRemovers = [];
  let disposed = false;

  function readSettings() {
    let saved;
    try { saved = GM_getValue(STORAGE, null); } catch { /* Spróbuj zapisu samodzielnego skryptu. */ }
    if (saved == null) {
      try { saved = JSON.parse(window.localStorage.getItem(LEGACY_STORAGE)); } catch { /* Pusty/uszkodzony zapis. */ }
    }
    const result = { ...defaults, statuses: { ...defaults.statuses } };
    if (!saved || typeof saved !== 'object') return result;
    for (const key of ['level', 'status', 'noMore', 'mute', 'collapsed', 'settings']) {
      if (typeof saved[key] === 'boolean') result[key] = saved[key];
    }
    for (const key of Object.keys(names)) {
      if (typeof saved.statuses?.[key] === 'boolean') result.statuses[key] = saved.statuses[key];
    }
    if (typeof saved.audio === 'string' && validAudio(saved.audio)) result.audio = saved.audio;
    for (const key of ['right', 'top']) {
      if (Number.isFinite(saved[key])) result[key] = saved[key];
    }
    return result;
  }

  function save() {
    try { GM_setValue(STORAGE, JSON.parse(JSON.stringify(settings))); } catch { /* Brak dostępu do pamięci. */ }
  }

  function validAudio(value) {
    if (!value) return true;
    try { return new URL(value).protocol === 'https:'; } catch { return false; }
  }

  function hero() {
    return window.Engine?.hero?.d || window.hero;
  }

  function message(text) {
    if (typeof window.message !== 'function') return false;
    window.message(text);
    return true;
  }

  // Oryginał: próg 5%, wzór lvl^4 + 10, tylko dla ttl >= 1.
  function checkLevel() {
    const h = hero();
    if (!h) return;
    const level = Number(h.lvl);
    const exp = Number(h.exp);
    if (h.id !== lastHero || level !== lastLevel) {
      lastLevelWarning = null;
      lastHero = h.id;
      lastLevel = level;
    }
    if (!settings.level || !Number.isFinite(exp) || exp <= 0 ||
        !Number.isFinite(level) || level < 1 || !(Number(h.ttl) >= 1)) return;
    const next = Math.round(level ** 4 + 10);
    const previous = Math.round((level - 1) ** 4 + 10);
    const remaining = Number((100 - (exp - previous) / (next - previous) * 100).toFixed(2));
    if (remaining >= 0 && remaining <= 5 && remaining !== lastLevelWarning &&
        message(`[color=red]Pozostało ${remaining}% do następnego levela[/color]`)) {
      lastLevelWarning = remaining;
    }
  }

  function playSound() {
    if (settings.mute) return;
    const url = settings.audio || 'https://cronus.margonem.com/sounds/your_turn.mp3';
    if (!audio || audio.getAttribute('src') !== url) {
      audio?.pause();
      audio = document.createElement('audio');
      audio.src = url;
    }
    const gameVolume = window.Engine?.soundManager?.getDataSettingMainVolume?.() ??
      window.sound?.manager?.data?.volume ?? 50;
    audio.volume = Math.max(0, Math.min(100, Number(gameVolume) || 0)) / 100;
    audio.currentTime = 0;
    // Przeglądarka może wymagać wcześniejszego kliknięcia na stronie.
    try { audio.play()?.catch(() => {}); } catch { /* Nie blokuj obsługi walki. */ }
  }

  function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function checkBattle(battle) {
    if (!settings.status || !battle || battle.init || battle.endBattle || !Array.isArray(battle.m)) return;
    const h = hero();
    if (h?.id == null || !h.nick) return;
    const id = escapeRegex(h.id);
    const patterns = {
      lastHeal: new RegExp('legbon_lastheal=\\d*,' + escapeRegex(h.nick) + '(?=$|[;,:])'),
      curse: new RegExp('^\\d*=\\d*;' + id + '=.*?\\+legbon_curse'),
      blind: new RegExp('^' + id + '=.*?-legbon_glare'),
      distract: new RegExp('^\\d*=\\d*;' + id + '=.*?\\+distract'),
    };
    for (const line of battle.m) {
      if (typeof line !== 'string') continue;
      for (const key of Object.keys(names)) {
        if (settings.statuses[key] && patterns[key].test(line) &&
            !(key === 'distract' && line.includes('-evade'))) {
          message(`[color=red]Status: ${names[key]}[/color]`);
          playSound();
        }
      }
    }
  }

  function processPacket(packet) {
    if (!packet || typeof packet !== 'object') return;
    if (packet.h) checkLevel();
    if (packet.f) checkBattle(packet.f);
  }

  // Zachowaj kontekst, wynik i wyjątki funkcji gry. Błędy dodatku nie przerywają gry.
  function hook(owner, key, factory) {
    const current = owner?.[key];
    if (typeof current !== 'function') return;
    let installed = hooks.get(owner);
    if (!installed) { installed = new Map(); hooks.set(owner, installed); }
    // Nie owijaj ponownie, również gdy inny dodatek opakował już naszą funkcję.
    if (installed.has(key)) return;
    const wrapped = factory(current);
    try {
      owner[key] = wrapped;
      if (owner[key] === wrapped) {
        installed.set(key, wrapped);
        hookRemovers.push(() => { if (owner[key] === wrapped) owner[key] = current; });
      }
    } catch { /* Funkcja chwilowo niedostępna do podmiany. */ }
  }

  function packetHook(original) {
    return function (...args) {
      const result = Reflect.apply(original, this, args);
      try { if (!disposed) processPacket(args[0]); } catch (error) { console.error('[Alerty]', error); }
      return result;
    };
  }

  function alertHook(original) {
    return function (...args) {
      const supplied = args.filter(value => value !== undefined);
      const informational = supplied.length === 1 || (supplied.length === 2 && supplied[1] === false);
      if (!disposed && settings.noMore && informational && typeof args[0] === 'string') {
        const text = args[0].replace(/<br\s*\/?\s*>/gi, '\n')
          .replace(/<strong>/gi, '[b]').replace(/<\/strong>/gi, '[/b]');
        try { if (message(text)) return; } catch (error) { console.error('[Alerty]', error); }
      }
      return Reflect.apply(original, this, args);
    };
  }

  function connect() {
    if (disposed || !document.body || !hero()?.id) return;
    hook(window.Engine?.communication, 'parseJSON', packetHook);
    if (!window.Engine?.communication) hook(window, 'parseInput', packetHook);
    hook(window, 'mAlert', alertHook);
    if (!panel) {
      createPanel();
      try { checkLevel(); } catch (error) { console.error('[Alerty]', error); }
    }
  }

  function icon(kind) {
    const paths = kind === 'gear'
      ? '<path d="m9 3 .6-1h4.8l.6 1 .5 2 1.7 1 2-.6 1.2 2.1-1.4 1.5v2l1.4 1.5-1.2 2.1-2-.6-1.7 1-.5 2-.6 1H9l-.6-1-.5-2-1.7-1-2 .6L3 12.5 4.4 11V9L3 7.5l1.2-2.1 2 .6 1.7-1Z"/><circle cx="12" cy="10" r="3"/>'
      : '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Zm4 12h4"/>';
    return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  }

  function createPanel() {
    panel = document.createElement('div');
    panel.id = 'gogatki-alerts';
    panel.style.cssText = 'all:initial;position:fixed;z-index:2147483000;display:block;';
    root = panel.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        :host{all:initial;color-scheme:dark;font:12px Arial,sans-serif;color:#c7d0d9}
        *{box-sizing:border-box} [hidden]{display:none!important}
        .panel{font:12px Arial,sans-serif;color:#c7d0d9;width:272px;max-width:100vw;background:#171b20;border:1px solid #668298;border-radius:4px;overflow:hidden}
        header{display:flex;align-items:center;justify-content:space-between;height:28px;background:#252b31;cursor:move;touch-action:none;user-select:none}
        .name{padding-left:9px;font-weight:bold;color:#12c9bd}
        button{display:inline-flex;align-items:center;justify-content:center;background:#38566c;border:1px solid #6d879a;border-radius:3px;color:#c7d0d9;font:12px Arial,sans-serif;cursor:pointer;min-height:26px}
        .gear{width:26px;height:26px;min-height:0;padding:4px;border:0;background:transparent;color:#12c9bd}
        svg{display:block;width:18px;height:18px;flex-shrink:0}
        button:focus-visible,input:focus-visible{outline:2px solid #12c9bd;outline-offset:1px}
        main{padding:8px;display:grid;gap:7px;max-height:calc(100vh - 34px);overflow:auto}
        .tile{background:#252b31;padding:7px;border-radius:3px}
        label{display:flex;align-items:center;gap:7px;cursor:pointer}
        .module{font-weight:bold;color:#12c9bd}
        small{display:block;font-size:11px;line-height:1.4;color:#b1c0cb;margin:4px 0 0 21px}
        input[type=checkbox]{appearance:none;display:grid;place-content:center;flex:0 0 14px;width:14px;height:14px;margin:0;border:1px solid #668298;border-radius:2px;background:#171b20}
        input[type=checkbox]:checked:after{content:'';width:7px;height:4px;border:solid #12c9bd;border-width:0 0 2px 2px;transform:rotate(-45deg)}
        .options{display:grid;gap:8px;padding:8px 0 0;border-top:1px solid #668298}
        .audio-label{display:grid;gap:5px}
        input[type=url]{width:100%;min-width:0;background:#252b31;border:1px solid #668298;border-radius:3px;padding:6px;color:#c7d0d9;font:12px Arial,sans-serif}
        .hint{margin:0;color:#b1c0cb;font-size:11px;line-height:1.4}
        .collapsed{width:var(--launcher-size);height:var(--launcher-size)}
        .collapsed header{height:100%;justify-content:center;cursor:move}
        .collapsed .gear{width:100%;height:100%}
        .collapsed .name,.collapsed main{display:none}
      </style>
      <section class="panel" aria-label="Alerts">
        <header><span class="name">Alerts</span><button class="gear" type="button" aria-label="Pokaż opcje alertów" title="LPM: opcje · PPM: zwiń">${icon('gear')}</button></header>
        <main>
          <div class="tile"><label class="module"><input type="checkbox" data-key="level">Level Up Alert</label><small>Ostrzega, gdy zostaje 5% lub mniej do poziomu.</small></div>
          <div class="tile"><label class="module"><input type="checkbox" data-key="status">Status Alert</label><small>Wiadomość i dźwięk o efektach w walce.</small></div>
          <div class="tile"><label class="module"><input type="checkbox" data-key="noMore">No More Alerts</label><small>Zwykłe alerty jako wiadomości. Pytania pozostają.</small></div>
          <div class="options" hidden>
            ${Object.entries(names).map(([key, name]) => `<label><input type="checkbox" data-status="${key}">${name}</label>`).join('')}
            <label><input type="checkbox" data-key="mute">Wycisz dźwięk statusów</label>
            <label class="audio-label">Własny dźwięk (link HTTPS)<input type="url" placeholder="Puste = domyślny dźwięk" aria-label="Adres własnego dźwięku" value=""></label>
            <button class="test-audio" type="button">Odtwórz dźwięk</button>
            <p class="hint">Przeciągnij nagłówek, aby przenieść panel. PPM na zębatce zwija go do ikony.</p>
          </div>
        </main>
      </section>`;
    document.body.appendChild(panel);
    for (const input of root.querySelectorAll('input[type=checkbox]')) {
      const key = input.dataset.key;
      const status = input.dataset.status;
      input.checked = status ? settings.statuses[status] : settings[key];
      input.addEventListener('change', () => {
        if (status) settings.statuses[status] = input.checked;
        else settings[key] = input.checked;
        save();
      });
    }
    const urlInput = root.querySelector('input[type=url]');
    urlInput.value = settings.audio;
    urlInput.addEventListener('input', () => {
      const value = urlInput.value.trim();
      urlInput.setCustomValidity(validAudio(value) ? '' : 'Podaj pełny adres HTTPS.');
      if (validAudio(value)) { settings.audio = value; save(); }
    });
    root.querySelector('.test-audio').addEventListener('click', () => {
      if (urlInput.reportValidity()) playSound();
    });
    const gear = root.querySelector('.gear');
    let dragged = false;
    gear.addEventListener('click', () => {
      if (dragged) return;
      if (settings.collapsed) settings.collapsed = false;
      else settings.settings = !settings.settings;
      render();
      save();
    });
    gear.addEventListener('contextmenu', event => {
      event.preventDefault();
      settings.collapsed = !settings.collapsed;
      render();
      save();
    });
    const header = root.querySelector('header');
    let drag;
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      dragged = false;
      drag = { x: event.clientX, y: event.clientY, right: settings.right, top: settings.top };
      if (!gear.contains(event.target)) header.setPointerCapture(event.pointerId);
    });
    header.addEventListener('pointermove', event => {
      if (!drag) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!dragged && Math.hypot(dx, dy) < 4) return;
      dragged = true;
      if (!header.hasPointerCapture(event.pointerId)) header.setPointerCapture(event.pointerId);
      settings.right = drag.right - dx;
      settings.top = drag.top + dy;
      clampPosition();
    });
    const endDrag = () => { if (drag) { drag = null; save(); } };
    header.addEventListener('pointerup', endDrag);
    header.addEventListener('pointercancel', endDrag);
    header.addEventListener('lostpointercapture', endDrag);
    window.addEventListener('resize', onResize);
    render();
  }

  function launcherSize() {
    // Gogatki mogą przechowywać kafelek we własnym Shadow DOM.
    const search = tree => {
      for (const launcher of tree.querySelectorAll('.launcher')) {
        const height = launcher.getBoundingClientRect().height;
        if (height > 0 && height <= 100) return height;
      }
      for (const element of tree.querySelectorAll('*')) {
        if (element !== panel && element.shadowRoot) {
          const height = search(element.shadowRoot);
          if (height) return height;
        }
      }
      return 0;
    };
    return search(document) || 28;
  }

  function render() {
    const section = root.querySelector('.panel');
    panel.style.setProperty('--launcher-size', `${launcherSize()}px`);
    section.classList.toggle('collapsed', settings.collapsed);
    root.querySelector('.options').hidden = !settings.settings;
    const gear = root.querySelector('.gear');
    gear.innerHTML = icon(settings.collapsed ? 'bell' : 'gear');
    gear.setAttribute('aria-label', settings.collapsed ? 'Rozwiń Alerts' : 'Pokaż lub schowaj opcje alertów');
    gear.setAttribute('aria-expanded', String(!settings.collapsed && settings.settings));
    clampPosition();
  }

  function clampPosition() {
    if (window.__gogatkiTileDock?.isDocked(panel)) return;
    const rect = panel.getBoundingClientRect();
    settings.right = Math.max(0, Math.min(settings.right, window.innerWidth - rect.width));
    settings.top = Math.max(0, Math.min(settings.top, window.innerHeight - rect.height));
    panel.style.right = `${settings.right}px`;
    panel.style.top = `${settings.top}px`;
  }

  function onResize() { render(); save(); }

  function cleanup() {
    if (disposed) return;
    disposed = true;
    window.clearInterval(timer);
    window.removeEventListener('resize', onResize);
    for (const remove of hookRemovers.reverse()) {
      try { remove(); } catch { /* Inny dodatek może blokować podmianę. */ }
    }
    audio?.pause();
    panel?.remove();
    delete window[INSTANCE];
  }

  connect();
  save(); // Przenieś ewentualny zapis samodzielnego skryptu do pamięci Gogatków.
  // Funkcje gry bywają dostępne dopiero po uruchomieniu dodatków.
  const timer = window.setInterval(connect, 1000);
  window.addEventListener('pagehide', cleanup, { once: true });
})();

  }
});
