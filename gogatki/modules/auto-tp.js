// Auto TP 1.0.1 — adaptacja EmergencyItem z Maddonz (Barlag).
GogatkiRuntime.register({
  id: 'auto-tp',
  name: 'Auto TP',
  description: 'Użycie przedmiotu po walce, przy wrogu lub z ucieczką.',
  start() {
    const window = unsafeWindow;
(function () {
  'use strict';
  const defaults = { active: false, skipEnemyCheck: false, otherEnemy: false,
    removeItemAfterUse: true, closeEnemyLevelDiff: 13, fleeLevelDiff: 13,
    range: 5, build: 0, enemyClans: [], items: { afterBattle: 0, closeEnemy: 0, afterFlee: 0 },
    collapsed: false, settings: true, x: null, y: 100 };
  const labels = { afterBattle: 'Użyj po walce', closeEnemy: 'Użyj przy wrogu', afterFlee: 'Użyj z ucieczką' };

  function createController(api, state, persist, report) {
    let used = false, busy = false, generation = 0;
    const enemy = p => [3, 6, 8].includes(+p.relation) ||
      state.enemyClans.includes(p.clan?.name) || (state.otherEnemy && [1, 7].includes(+p.relation));
    const available = kind => state.active && !used && !busy && api.item(state.items[kind]);
    function reset() { used = false; generation++; }
    async function use(kind, chained = false) {
      const id = state.items[kind];
      if (!state.active || (!chained && (used || busy)) || !api.item(id)) return false;
      busy = true;
      const epoch = generation;
      try {
        await api.use(id);
        if (epoch === generation) used = true;
        if (state.removeItemAfterUse && state.items[kind] === id) { state.items[kind] = 0; persist(); }
        report(labels[kind]);
        return true;
      } catch (e) { if (epoch === generation) used = true; report('Nie udało się użyć przedmiotu: ' + e.message + ' — uzbrój ponownie'); return false; }
      finally { busy = false; }
    }
    async function nearby() {
      if (!state.active || used || busy || api.inBattle() || !api.pvp()) return;
      const hero = api.hero();
      const danger = api.others().some(p => enemy(p) && +p.lvl >= +hero.lvl + state.closeEnemyLevelDiff &&
        Math.max(Math.abs(p.x - hero.x), Math.abs(p.y - hero.y)) <= state.range);
      if (!danger) return;
      if (available('closeEnemy')) await use('closeEnemy');
      else if (!state.items.closeEnemy && state.build && api.build() !== state.build) {
        busy = true;
        const epoch = generation;
        try { await api.changeBuild(state.build); if (epoch === generation) used = true; report('Zmieniono zestaw na ' + state.build); }
        catch (e) { if (epoch === generation) used = true; report(e.message + ' — uzbrój ponownie'); } finally { busy = false; }
      }
    }
    async function battleStart(f) {
      reset();
      if (!available('afterFlee') || f.endBattle || !api.pvp()) return;
      const warriors = Object.entries(f.w || {}).map(([id, w]) => ({ ...w, id: w.id ?? id }));
      if (warriors.some(w => !!+w.npc)) return;
      const opponents = warriors.filter(w => +w.team !== +f.myteam);
      // Preserve Maddonz: enemy relation and level advantage may belong to different opponents.
      if (!(state.skipEnemyCheck || opponents.some(w => api.others().some(p => +p.id === +w.id && enemy(p)))) ||
          !opponents.some(w => +w.lvl >= +api.hero().lvl + state.fleeLevelDiff)) return;
      const flee = api.items().find(i => {
        const stats = i._cachedStats || Object.fromEntries(String(i.stat || '').split(';').map(s => s.split('=')));
        const now = api.now();
        return String(i.stat || '').includes('action=flee') &&
          !(Number(String(stats.timelimit || '').split(',').pop()) > now) &&
          !(stats.expires && +stats.expires < now);
      });
      if (!flee) { report('Brak ucieczki!'); return; }
      busy = true;
      const epoch = generation;
      try {
        await api.use(flee.id);
        if (epoch === generation && state.active) await use('afterFlee', true);
      } catch (e) { report('Ucieczka: ' + e.message); }
      finally { busy = false; }
    }
    return { nearby, battleStart, reset, afterBattle: () => use('afterBattle'), enemy,
      assign(kind, id) { if (!Object.hasOwn(labels, kind)) return; state.items[kind] = id; reset(); persist(); } };
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = { createController, defaults }; return; }
  if (window.__emergencyItemStandalone) return;
  window.__emergencyItemStandalone = true;
  const storageKey = 'gogatki:auto-tp:global:v1';
  let controller, state, root, host, status, inBattle = false, lastMap, currentCharacter;
  const restorers = [];
  let panelObserver;
  const ni = () => !!window.Engine?.hero?.d;
  const hero = () => ni() ? window.Engine.hero.d : window.hero;
  const items = () => Object.values(ni() ? (window.Engine.items.test()?.items || {}) : (window.g?.item || {})).filter(i => i.loc === 'g');
  const others = () => ni() ? Object.entries(window.Engine.others.check()).map(([id, p]) => ({ ...p.d, id: p.d.id ?? id })) : Object.entries(window.g?.other || {}).map(([id, p]) => ({ ...p, id: p.id ?? id }));
  const map = () => ni() ? window.Engine.map.d : window.map;
  const api = { hero, items, others, item: id => items().find(i => String(i.id) === String(id)),
    inBattle: () => inBattle || !!(ni() ? window.Engine.lock?.check('battle') : window.g?.lock?.check('battle')), pvp: () => +map()?.pvp === 2,
    build: () => Number(document.querySelector('.builds-interface .build-index')?.textContent ?? -1),
    now: () => typeof window.unix_time === 'function' ? window.unix_time() : Date.now() / 1000,
    use: id => request('moveitem&st=1&id=' + encodeURIComponent(id)),
    changeBuild: id => request('builds&action=updateCurrent&id=' + id) };
  function request(command) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Brak odpowiedzi serwera')), 10000);
      try { window._g(command, response => {
        clearTimeout(timer);
        if (response?.e === 'error' || response?.error) reject(new Error(response.error || response.w || 'Błąd serwera'));
        else resolve(response);
      }); } catch (e) { clearTimeout(timer); reject(e); }
    });
  }
  function persist() { try { GM_setValue(storageKey, JSON.parse(JSON.stringify(state))); } catch { report('Nie można zapisać ustawień'); } }
  function report(text) { if (status) status.textContent = text; }
  function wrap(object, key, before, after) {
    if (typeof object?.[key] !== 'function') return false;
    const original = object[key];
    function wrapped(...args) {
      try { before?.(...args); } catch (e) { console.error('Auto TP', e); }
      const result = original.apply(this, args);
      try { after?.(...args); } catch (e) { console.error('Auto TP', e); }
      return result;
    }
    object[key] = wrapped;
    restorers.push(() => { if (object[key] === wrapped) object[key] = original; });
    return true;
  }
  function processPacket(packet) {
    if (!packet || typeof packet !== 'object') return;
    if (packet.town) controller.reset();
    if (packet.f?.init != null) { inBattle = true; void controller.battleStart(packet.f); }
    if (packet.other || packet.h) void controller.nearby();
  }
  function closeBattle() { void controller.afterBattle(); inBattle = false; }
  function popup(entries, event) {
    if (!Array.isArray(entries)) return;
    const target = event?.target || event?.originalEvent?.target;
    const element = target?.closest?.('[data-item], [iid], [id^="item"], [class*="item-id-"]');
    if (!element) return;
    const data = window.jQuery?.(element).data('item');
    const id = data?.id || element.getAttribute('iid') || element.id?.match(/^item(\d+)$/)?.[1] || element.className?.match?.(/item-id-(\d+)/)?.[1];
    const item = api.item(id);
    if (!item) return;
    for (const [kind, label] of Object.entries(labels)) {
      const selected = String(state.items[kind]) === String(item.id);
      entries.push([label + (selected ? ' — usuń' : ''), () => {
        controller.assign(kind, selected ? 0 : item.id); refreshItems(); report(selected ? 'Usunięto przypisanie' : label + ': ' + item.name);
      }]);
    }
  }
  const scrollIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g transform="rotate(-35 12 12)"><path d="M5 7h13a4 5 0 0 1 0 10H5a4 5 0 0 1 0-10Z"/><ellipse cx="5" cy="12" rx="4" ry="5"/><path d="M5 9.5c-2.5 0-2.5 5 0 5 1.8 0 1.8-3 0-3M12 7v10M14 7v10M14 14l3 4-3-1-2 2v-5"/></g></svg>';
  function node(tag, props = {}, parent = root) { const el = document.createElement(tag); Object.assign(el, props); parent.append(el); return el; }
  function anchored(change) {
    const rect = host.getBoundingClientRect(); change();
    state.x = rect.right - host.getBoundingClientRect().width; state.y = rect.top; clamp(); persist();
  }
  function tileSize() {
    const direct = document.querySelector('.launcher');
    if (direct?.getBoundingClientRect().height > 0) return direct.getBoundingClientRect().height;
    for (const el of document.querySelectorAll('*')) {
      if (!el.shadowRoot || el === host) continue;
      const launcher = el.shadowRoot.querySelector('.launcher');
      const height = launcher?.getBoundingClientRect().height;
      if (height > 0) return height;
    }
    return 28;
  }
  function clamp() {
    const rect = host.getBoundingClientRect();
    state.x = Math.max(0, Math.min(Number.isFinite(state.x) ? state.x : innerWidth - rect.width - 20, innerWidth - rect.width));
    state.y = Math.max(0, Math.min(Number.isFinite(state.y) ? state.y : 100, innerHeight - rect.height));
    host.style.left = state.x + 'px'; host.style.top = state.y + 'px';
  }
  function layout() {
    host.style.setProperty('--tile', tileSize() + 'px');
    root.querySelector('.panel').classList.toggle('collapsed', state.collapsed);
    root.querySelector('.content').hidden = !state.settings || state.collapsed;
    clamp();
  }
  function refreshItems() {
    for (const kind of Object.keys(labels)) {
      const select = root.querySelector('[data-kind="' + kind + '"]');
      const selected = String(state.items[kind]);
      select.replaceChildren(); node('option', { value: '0', textContent: 'Nie wybrano' }, select);
      for (const item of items()) node('option', { value: String(item.id), textContent: item.name }, select);
      if (selected !== '0' && !api.item(selected)) node('option', { value: selected, textContent: 'Brak przedmiotu #' + selected }, select);
      select.value = selected;
    }
  }
  function buildPanel() {
    host = document.createElement('div'); host.id = 'emergency-item-standalone';
    host.style.cssText = 'position:fixed;z-index:9999;'; document.body.append(host);
    root = host.attachShadow({ mode: 'open' });
    node('style', { textContent: `
      :host{all:initial;font:12px Arial,sans-serif;color:#c7d0d9;--tile:28px}
      *{box-sizing:border-box} [hidden]{display:none!important}
      .panel{width:min(268px,100vw);background:#171b20;border:1px solid #668298;border-radius:4px;overflow:hidden}
      header{height:calc(var(--tile) - 2px);display:flex;align-items:center;background:#252b31;cursor:move;touch-action:none;gap:6px;padding:0 5px}
      strong{color:#12c9bd;flex:1;font-size:12px;white-space:nowrap}
      button,select,input,textarea{font:12px Arial,sans-serif;color:#c7d0d9;border:1px solid #6d879a;border-radius:3px;background:#252b31;min-width:0}
      button{display:inline-flex;align-items:center;justify-content:center;background:#38566c;cursor:pointer;padding:3px 6px}
      .gear{border:0;background:none;color:#12c9bd;width:22px;height:22px;padding:0;flex-shrink:0}
      :focus-visible{outline:2px solid #12c9bd;outline-offset:1px}
      input[type=checkbox]{appearance:none;width:14px;height:14px;margin:0 6px 0 0;vertical-align:middle;flex-shrink:0}
      input[type=checkbox]:checked{background:#12c9bd;box-shadow:inset 0 0 0 3px #171b20}
      label{display:flex;align-items:center;margin:6px 0;gap:3px}
      .content{padding:6px 9px;max-height:calc(100vh - var(--tile) - 6px);overflow:auto}
      .field{display:block} select,textarea{width:100%;padding:4px;margin-top:3px}textarea{resize:vertical;min-height:44px}
      input[type=number]{width:49px;padding:3px;margin-left:auto}
      .hint{font-size:11px;color:#b1c0cb;line-height:1.4;margin:6px 0}
      .collapsed{width:var(--tile);height:var(--tile)}.collapsed header{padding:0;justify-content:center}
      .collapsed header>:not(.gear){display:none}.collapsed .gear{width:100%;height:100%}
      .status{font-size:11px;color:#b1c0cb;margin-top:7px;overflow-wrap:anywhere}
    ` });
    const panel = node('section', { className: 'panel' });
    const header = node('header', {}, panel);
    node('strong', { textContent: 'Auto TP' }, header);
    const active = node('input', { type: 'checkbox', checked: state.active, title: 'Włącz Auto TP' }, header);
    active.setAttribute('aria-label', 'Włącz Auto TP');
    active.onchange = () => { state.active = active.checked; controller.reset(); persist(); };
    const settings = node('button', { className: 'gear', innerHTML: scrollIcon, title: 'LPM: ustawienia · PPM: zwiń', type: 'button' }, header);
    settings.setAttribute('aria-label', 'Ustawienia Auto TP');
    settings.onclick = () => anchored(() => { if (state.collapsed) state.collapsed = false; else state.settings = !state.settings; layout(); });
    settings.oncontextmenu = e => { e.preventDefault(); anchored(() => { state.collapsed = !state.collapsed; layout(); }); };
    const content = node('div', { className: 'content' }, panel);
    for (const [kind, text] of Object.entries(labels)) {
      const label = node('label', { className: 'field', textContent: text }, content);
      const select = node('select', {}, label); select.dataset.kind = kind;
      select.onchange = () => { controller.assign(kind, Number(select.value)); report('Zapisano przypisanie'); };
    }
    node('p', { className: 'hint', textContent: 'Przedmiot wybierzesz również przez PPM w ekwipunku. „Usuń po użyciu” usuwa przypisanie.' }, content);
    for (const [key, text] of [['skipEnemyCheck','Wszyscy są wrogami (ucieczka)'], ['otherEnemy','Nieznajomi są wrogami'], ['removeItemAfterUse','Usuń przypisanie po użyciu']]) {
      const label = node('label', {}, content);
      const input = node('input', { type: 'checkbox', checked: state[key] }, label);
      node('span', { textContent: text }, label);
      input.onchange = () => { state[key] = input.checked; persist(); };
    }
    for (const [key, text, min, max] of [['closeEnemyLevelDiff','Przewaga poziomów — wróg',-500,500], ['fleeLevelDiff','Przewaga poziomów — ucieczka',-500,500], ['range','Zasięg w kratkach',0,100], ['build','Zestaw przy wrogu (0 = wył.)',0,9]]) {
      const label = node('label', {}, content); node('span', { textContent: text }, label);
      const input = node('input', { type: 'number', value: state[key], min, max, step: 1 }, label);
      input.onchange = () => { const value = Number(input.value); state[key] = Number.isFinite(value) ? Math.max(min, Math.min(max, Math.trunc(value))) : defaults[key]; input.value = state[key]; persist(); };
    }
    const clansLabel = node('label', { className: 'field', textContent: 'Wrogie klany (jeden na linię)' }, content);
    const clans = node('textarea', { value: state.enemyClans.join('\n') }, clansLabel);
    clans.onchange = () => { state.enemyClans = clans.value.split('\n').map(s => s.trim()).filter(Boolean); persist(); };
    const rearm = node('button', { textContent: 'Uzbrój ponownie', type: 'button' }, content);
    rearm.onclick = () => { controller.reset(); report('Ponownie uzbrojono'); };
    status = node('div', { className: 'status', textContent: 'Gotowy · włącz przełącznikiem w nagłówku' }, content);
    status.setAttribute('role', 'status');
    header.onpointerdown = e => {
      if (e.button || e.target.closest('button,input')) return;
      const x = e.clientX, y = e.clientY, rect = host.getBoundingClientRect();
      header.setPointerCapture(e.pointerId);
      header.onpointermove = move => { state.x = rect.left + move.clientX - x; state.y = rect.top + move.clientY - y; clamp(); };
      const end = () => { header.onpointermove = null; persist(); };
      header.onpointerup = end; header.onpointercancel = end; header.onlostpointercapture = end;
    };
    refreshItems(); layout(); persist();
    panelObserver = new ResizeObserver(() => { clamp(); persist(); });
    panelObserver.observe(panel);
  }
  function init() {
    if (!hero()?.id || typeof window._g !== 'function' || (ni() && !window.Engine.allInit)) return false;
    currentCharacter = String(hero().id);
    const legacyKey = 'gogatki:emergency-item:v1:' + location.hostname + ':' + currentCharacter;
    // Global userscript storage is shared by characters and world domains.
    let saved = GM_getValue(storageKey, null);
    if (saved === null) {
      // Migrate once from the first character opened after this update.
      try { saved = JSON.parse(window.localStorage.getItem(legacyKey) || '{}'); } catch { saved = {}; }
    }
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
    state = { ...structuredClone(defaults), ...saved, items: { ...defaults.items, ...saved?.items } };
    if (!Array.isArray(state.enemyClans)) state.enemyClans = [];
    controller = createController(api, state, () => { persist(); if (root) refreshItems(); }, report);
    lastMap = map()?.id;
    buildPanel();
    if (ni()) {
      wrap(window.Engine.communication, 'parseJSON', null, processPacket);
      wrap(window.Engine.battle, 'close', closeBattle);
      wrap(window.Engine.interface, 'showPopupMenu', popup);
    } else {
      wrap(window, 'parseInput', null, processPacket);
      wrap(window, 'closeBattle', closeBattle);
      wrap(window, 'showMenu', (event, entries) => popup(entries, event));
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('pagehide', persist);
    return true;
  }
  function onResize() { layout(); persist(); }
  let refreshTick = 0;
  const timer = setInterval(() => {
    try {
      if (!controller) { init(); return; }
      if (String(hero()?.id) !== currentCharacter) { cleanup(); window.__emergencyItemStandalone = false; return; }
      if (map()?.id !== lastMap) { lastMap = map()?.id; controller.reset(); }
      void controller.nearby();
      if (++refreshTick % 8 === 0 && !['SELECT', 'TEXTAREA', 'INPUT'].includes(root.activeElement?.tagName)) refreshItems();
    } catch (e) { report('Oczekiwanie na grę'); console.debug('Auto TP', e); }
  }, 250);
  function cleanup() { panelObserver?.disconnect(); window.removeEventListener('pagehide', persist); clearInterval(timer); restorers.reverse().forEach(fn => fn()); host?.remove(); window.removeEventListener('resize', onResize); }
  window.EmergencyItemStandalone = { destroy() { cleanup(); delete window.__emergencyItemStandalone; delete window.EmergencyItemStandalone; } };
})();

  }
});
