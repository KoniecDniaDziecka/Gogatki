// Better X 1.0.2 — samodzielna adaptacja Wild Hunt (Maddonz, Barlag) dla Gogatków.
GogatkiRuntime.register({
  id: 'better-x', name: 'Better X',
  description: 'Atakowanie i dobijanie graczy; domyślny skrót X, próby co 200–350 ms.',
  start() {
    const window = unsafeWindow;
(() => {
  'use strict';
  if (window.WildHuntStandalone) return;
  const defaults = { minLevel: '', maxLevel: '', enemy: true, clanEnemy: true, otherEnemy: false, collapsed: false, right: 20, top: 160, nearestKey: 'x', stopKey: 'j' };
  const key = 'better-x:global:v1';
  let saved = GM_getValue(key, null);
  if (saved === null) {
    try { saved = JSON.parse(window.localStorage.getItem('wild-hunt:standalone:v1') || '{}'); } catch { saved = {}; }
  }
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
  let settings = { ...defaults, ...saved };
  for (const name of ['nearestKey', 'stopKey']) {
    settings[name] = String(settings[name] ?? '').replace(/^Key([A-Z])$/, '$1').toLocaleLowerCase();
  }
  const save = () => GM_setValue(key, JSON.parse(JSON.stringify(settings)));
  save();
  let target = null, mapId, ready = false, timer;
  let markedElement = null, targetMarker = null;
  const engine = () => window.Engine?.hero?.d ? window.Engine : null;
  const hero = () => engine()?.hero.d || window.hero;
  const others = () => engine() ? Object.values(engine().others.check()).map(o => o.d) : Object.entries(window.g?.other || {}).map(([id, o]) => ({ ...o, id: o.id ?? id }));
  const find = id => others().find(o => String(o.id) === String(id));
  const lock = () => engine()?.lock || window.g?.lock || window.g?.lockController;
  const inBattle = () => !!lock()?.check?.('battle');
  function eligible(o) {
    const relation = Number(o.relation);
    return String(o.id) !== String(hero()?.id) &&
      (settings.minLevel === '' || o.lvl >= Number(settings.minLevel)) &&
      (settings.maxLevel === '' || o.lvl <= Number(settings.maxLevel)) &&
      ((settings.enemy && [3, 8].includes(relation)) || (settings.clanEnemy && relation === 6) || (settings.otherEnemy && [1, 7].includes(relation)));
  }
  function searchPath(o) {
    if (engine()) engine().hero.searchPath({ x: o.x, y: o.y });
    else window.hero.searchPath(o.x, o.y);
  }
  function roadLength(o) {
    const movementLock = lock();
    if (!movementLock?.add || !movementLock?.remove) throw new Error('Brak blokady wyznaczania ścieżki.');
    movementLock.add('searchPath');
    try {
      searchPath(o);
      const length = (engine()?.hero.autoPath.road || window.road).length;
      return length || (o.x === hero().x && o.y === hero().y ? 0 : Infinity);
    } finally {
      if (engine()) { engine().stepsToSend.reset(); engine().hero.clearAutoPathOfHero(); }
      else if (window.road) window.road.length = 0;
      movementLock.remove('searchPath');
    }
  }
  function clearMarker() { targetMarker?.remove(); targetMarker = null; markedElement = null; }
  function stop() { target = null; clearMarker(); renderStatus(); }
  function hunt(o) { if (!o || !eligible(o)) return stop(); target = String(o.id); renderStatus(); clearTimeout(timer); poll(); }
  function nearest() {
    try {
      const candidates = others().filter(eligible).map(o => ({ o, road: roadLength(o) })).filter(o => Number.isFinite(o.road)).sort((a, b) => a.road - b.road);
      if (candidates.length) hunt(candidates[0].o);
      else { stop(); status.textContent = 'Brak pasującego celu'; }
    } catch (error) { stop(); status.textContent = error.message; console.error('[Better X]', error); }
  }
  function tick() {
    if (!ready) return;
    const currentMap = engine()?.map?.d?.id ?? window.map?.id;
    if (mapId !== undefined && currentMap !== mapId) stop();
    mapId = currentMap;
    if (engine()?.dead || window.g?.dead) return stop();
    installMenus();
    installMarker();
    if (!target) return;
    const o = find(target);
    if (!o) return stop();
    renderStatus();
    if (!eligible(o) || inBattle()) return;
    if (Math.max(Math.abs(hero().x - o.x), Math.abs(hero().y - o.y)) <= 2) {
      if (typeof window._g === 'function') window._g('fight&a=attack&id=' + encodeURIComponent(target));
    }
  }
  // Wrap each player's existing menu while preserving its arguments and return value.
  const hooked = new WeakSet();
  function installMenus() {
    if (!engine()) return;
    for (const other of Object.values(engine().others.check())) {
      if (hooked.has(other) || typeof other.addShowEqAndMessageToMenu !== 'function') continue;
      hooked.add(other);
      const original = other.addShowEqAndMessageToMenu;
      other.addShowEqAndMessageToMenu = function (menu, ...args) {
        const result = original.call(this, menu, ...args);
        if (eligible(this.d)) menu.unshift(['Dobij', () => hunt(this.d)]);
        return result;
      };
    }
  }
  const drawableHooks = new WeakSet();
  function markerVisible(o) {
    return ready && !!target && !!o && String(o.id) === target && eligible(o) && !inBattle() &&
      !(engine()?.dead || window.g?.dead) && (engine()?.map?.d?.id ?? window.map?.id) === mapId;
  }
  function drawMarker(ctx, master, map) {
    const rx = Number(master.rx ?? master.d.x), ry = Number(master.ry ?? master.d.y);
    const fh = Number(master.fh) || 48;
    const x = rx * 32 + 16 - (Number(map.offset?.[0]) || 0);
    let y = ry * 32 - fh / 2 + 32 - (Number(map.offset?.[1]) || 0);
    if (map.water?.[Math.round(rx) + Math.round(ry) * 256] != null) y += Number(master.waterTopModify) || 0;
    if (![x,y,fh].every(Number.isFinite)) return;
    ctx.save();
    try {
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.setLineDash([]); ctx.shadowBlur = 0;
      ctx.translate(x,y); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // Dark and light outlines keep the red reticle visible over outfits and map textures.
      for (const [color,width] of [['#11151a',6],['#f4f7fa',4],['#ff3b45',2.5]]) {
        ctx.strokeStyle = color; ctx.lineWidth = width;
        ctx.beginPath(); ctx.arc(0,0,13,0,Math.PI * 2);
        ctx.moveTo(0,-20); ctx.lineTo(0,-10); ctx.moveTo(0,10); ctx.lineTo(0,20);
        ctx.moveTo(-20,0); ctx.lineTo(-10,0); ctx.moveTo(10,0); ctx.lineTo(20,0); ctx.stroke();
      }
      ctx.fillStyle = '#ff3b45'; ctx.beginPath(); ctx.arc(0,0,2,0,Math.PI * 2); ctx.fill();
    } finally { ctx.restore(); }
  }
  function installMarker() {
    if (!engine()) {
      const el = markerVisible(target && find(target)) && document.getElementById('other' + target);
      if (markedElement !== el || !targetMarker?.isConnected) {
        clearMarker();
        if (el) {
          markedElement = el; targetMarker = document.createElement('span');
          targetMarker.id = 'gogatki-better-x-target'; targetMarker.setAttribute('aria-hidden','true');
          targetMarker.style.cssText = 'position:absolute!important;inset:0!important;pointer-events:none!important;z-index:1!important';
          const shape = '<circle cx="22" cy="22" r="13"/><path d="M22 2v10m0 20v10M2 22h10m20 0h10"/>';
          targetMarker.attachShadow({mode:'open'}).innerHTML = `<style>:host{display:block!important;pointer-events:none!important}svg{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:44px;height:44px;overflow:visible;pointer-events:none}</style><svg viewBox="0 0 44 44" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="#11151a" stroke-width="6">${shape}</g><g stroke="#f4f7fa" stroke-width="4">${shape}</g><g stroke="#ff3b45" stroke-width="2.5">${shape}</g><circle cx="22" cy="22" r="2" fill="#ff3b45"/></svg>`;
          el.append(targetMarker);
        }
      }
      return;
    }
    clearMarker();
    const manager = engine().others;
    if (drawableHooks.has(manager) || typeof manager.getDrawableList !== 'function') return;
    drawableHooks.add(manager);
    const original = manager.getDrawableList;
    manager.getDrawableList = function (...args) {
      const list = original.apply(this, args);
      const master = target && manager.getById(target);
      if (master && markerVisible(master.d) && Array.isArray(list)) return list.concat({
        d: master.d,
        getOrder: () => Number(master.ry ?? master.d.y) + 0.1,
        draw(ctx) {
          const current = engine();
          // A cached frame must not draw an old target after Stop, a map change, or a switch.
          if (current?.others !== manager || !markerVisible(master.d)) return;
          drawMarker(ctx,master,current.map);
        }
      });
      return list;
    };
  }
  const host = document.createElement('div');
  host.id = 'wild-hunt-standalone';
  host.style.cssText = 'position:fixed;z-index:2147483000;';
  const root = host.attachShadow({ mode: 'open' });
  const gear = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><path d="M12 2v6m0 8v6M2 12h6m8 0h6"/></svg>';
  root.innerHTML = `<style>
    :host{font:12px Arial,sans-serif;color:#c7d0d9}*{box-sizing:border-box}section{width:242px;background:#171b20;border:1px solid #668298;border-radius:4px;overflow:hidden}header{height:28px;display:flex;align-items:center;background:#252b31;cursor:move;touch-action:none}strong{color:#12c9bd;flex:1;padding:0 8px}button{font:inherit;color:#c7d0d9;background:#38566c;border:1px solid #6d879a;border-radius:3px;padding:5px;cursor:pointer}button:focus-visible,input:focus-visible{outline:2px solid #12c9bd}#gear{width:26px;height:26px;padding:3px;display:flex;align-items:center;justify-content:center;color:#12c9bd;background:#252b31;border:0}main{padding:7px}.actions{display:flex;gap:4px}.actions button{flex:1}#status{margin-top:7px;overflow-wrap:anywhere;color:#b1c0cb}#settings{border-top:1px solid #668298;margin-top:7px;padding-top:5px}label{display:flex;align-items:center;gap:6px;margin:5px 0}input{font:inherit;background:#252b31;border:1px solid #668298;color:#c7d0d9;border-radius:3px;min-width:0}input[type=number]{width:70px;margin-left:auto}input[type=checkbox]{appearance:none;width:14px;height:14px;margin:0;display:grid;place-content:center}input:checked:after{content:'✓';color:#12c9bd;font-weight:bold}select{margin-left:auto;max-width:100px;background:#252b31;color:#c7d0d9}small{font-size:11px;color:#b1c0cb}[hidden]{display:none!important}section.collapsed{width:var(--tile);height:var(--tile)}.collapsed header,.collapsed #gear{width:100%;height:100%}.collapsed strong,.collapsed main{display:none}
  </style><section class="panel"><header><strong>Better X</strong><button id="gear" title="LPM: opcje · PPM: zwiń" aria-label="Opcje Better X">${gear}</button></header><main><div class="actions"><button id="nearest">Dobij</button><button id="stop">Stop</button></div><div id="status" role="status">Oczekiwanie na grę…</div><div id="settings" hidden></div></main></section>`;
  document.body.append(host);
  const panel = root.querySelector('section'), status = root.querySelector('#status'), options = root.querySelector('#settings');
  for (const [name, text, type] of [['minLevel','Minimalny poziom','number'], ['maxLevel','Maksymalny poziom','number'], ['enemy','Atakuj wrogów','checkbox'], ['clanEnemy','Atakuj wrogów klanu','checkbox'], ['otherEnemy','Atakuj nieznajomych','checkbox']]) {
    const label = document.createElement('label'), input = document.createElement('input');
    input.type = type; if (type === 'number') { input.min = '1'; input.value = settings[name]; } else input.checked = settings[name];
    label.append(document.createTextNode(text), input); options.append(label);
    input.onchange = () => { settings[name] = type === 'checkbox' ? input.checked : input.value; save(); };
  }
  for (const [name, text] of [['nearestKey','Dobij'], ['stopKey','Stop']]) {
    const label = document.createElement('label'), input = document.createElement('input');
    label.append(document.createTextNode(text + ' — klawisz'));
    input.type = 'text'; input.maxLength = 1; input.value = settings[name];
    input.autocomplete = 'off'; input.spellcheck = false;
    input.style.cssText = 'width:40px;margin-left:auto;text-align:center';
    input.title = 'Wpisz jeden znak; puste pole wyłącza skrót';
    input.addEventListener('input', () => {
      settings[name] = Array.from(input.value.trim().toLocaleLowerCase())[0] || '';
      input.value = settings[name]; save();
    });
    label.append(input); options.append(label);
  }
  function renderStatus() { status.textContent = target ? 'Polowanie: ' + (find(target)?.nick || target) : 'Zatrzymano'; }
  function place() {
    if (window.__gogatkiTileDock?.isDocked(host)) return;
    const launcher = document.querySelector('#gogatek-panel')?.shadowRoot?.querySelector('.launcher');
    panel.style.setProperty('--tile', (launcher?.getBoundingClientRect().height || 28) + 'px');
    panel.classList.toggle('collapsed', !!settings.collapsed);
    settings.right = Math.max(0, Math.min(Number(settings.right) || 0, Math.max(0, innerWidth - host.offsetWidth)));
    settings.top = Math.max(0, Math.min(Number(settings.top) || 0, Math.max(0, innerHeight - host.offsetHeight)));
    host.style.right = settings.right + 'px'; host.style.top = settings.top + 'px';
  }
  root.querySelector('#gear').onclick = () => { if (settings.collapsed) settings.collapsed = false; else options.hidden = !options.hidden; place(); save(); };
  root.querySelector('#gear').oncontextmenu = event => { event.preventDefault(); settings.collapsed = !settings.collapsed; place(); save(); };
  root.querySelector('#nearest').onclick = nearest; root.querySelector('#stop').onclick = stop;
  const header = root.querySelector('header');
  header.onpointerdown = event => {
    if (event.button !== 0 || event.target.closest('button')) return;
    const x = event.clientX, y = event.clientY, right = settings.right, top = settings.top;
    header.setPointerCapture(event.pointerId);
    header.onpointermove = e => { settings.right = right + x - e.clientX; settings.top = top + e.clientY - y; place(); };
    header.onpointerup = header.onpointercancel = () => { header.onpointermove = null; save(); };
  };
  window.addEventListener('resize', place);
  document.addEventListener('keydown', event => {
    if (!ready || event.altKey || event.ctrlKey || event.metaKey || event.isComposing || event.repeat || event.composedPath().some(el => (el?.isContentEditable || el?.matches?.('input,textarea,select,[role=textbox]')))) return;
    const action = [[settings.nearestKey, nearest], [settings.stopKey, stop]].find(([code]) => code && code === event.key.toLocaleLowerCase());
    if (action) { event.preventDefault(); action[1](); }
  });
  // SI popup menu uses showMenu(event, entries); NI player menus are installed above.
  if (typeof window.showMenu === 'function' && !engine()) {
    const original = window.showMenu;
    window.showMenu = function (event, menu, ...args) {
      const el = event?.currentTarget?.closest?.('.other');
      const o = el && find(el.id.replace(/^other/, ''));
      if (o && eligible(o)) menu.unshift(['Dobij', () => { hunt(o); window.hideMenu?.(); }]);
      return original.call(this, event, menu, ...args);
    };
  }
  window.WildHuntStandalone = { nearest, stop, hunt, get target() { return target; } };
  place();
  function poll() {
    const wasReady = ready;
    ready = !!(hero() && (engine()?.others || window.g?.other));
    if (!ready) { if (target) stop(); timer = setTimeout(poll, 200 + Math.floor(Math.random() * 151)); return; }
    if (!wasReady) renderStatus();
    try { tick(); } catch (error) { stop(); status.textContent = 'Błąd interfejsu gry'; console.error('[Better X]', error); }
    timer = setTimeout(poll, 200 + Math.floor(Math.random() * 151));
  }
  poll();
  window.addEventListener('pagehide', () => { clearTimeout(timer); ready = false; stop(); }, {once:true});
})();

  }
});


