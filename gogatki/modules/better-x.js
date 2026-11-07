// Better X 1.0.1 — samodzielna adaptacja Wild Hunt (Maddonz, Barlag) dla Gogatków.
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
    const fw = Number(master.fw) || 32, fh = Number(master.fh) || 48;
    const x = rx * 32 + 16 - fw / 2 - (Number(map.offset?.[0]) || 0) - 4;
    let y = ry * 32 - fh + 32 - (Number(map.offset?.[1]) || 0) - 4;
    if (map.water?.[Math.round(rx) + Math.round(ry) * 256] != null) y += Number(master.waterTopModify) || 0;
    if (![x,y,fw,fh].every(Number.isFinite)) return;
    const width = fw + 8, height = fh + 8, center = x + width / 2;
    ctx.save();
    try {
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.setLineDash([]); ctx.shadowBlur = 0;
      ctx.strokeStyle = '#171b20'; ctx.lineWidth = 5; ctx.strokeRect(x,y,width,height);
      ctx.strokeStyle = '#12c9bd'; ctx.lineWidth = 2; ctx.strokeRect(x,y,width,height);
      ctx.fillStyle = '#12c9bd'; ctx.strokeStyle = '#171b20'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(center - 6,y - 10); ctx.lineTo(center + 6,y - 10); ctx.lineTo(center,y - 3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#171b20'; ctx.fillRect(center - 19,y - 29,38,16);
      ctx.strokeStyle = '#12c9bd'; ctx.lineWidth = 1; ctx.strokeRect(center - 19,y - 29,38,16);
      ctx.font = 'bold 11px Arial,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#12c9bd'; ctx.fillText('CEL',center,y - 21);
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
          targetMarker.style.cssText = 'position:absolute!important;inset:-4px!important;pointer-events:none!important;z-index:1!important';
          targetMarker.attachShadow({mode:'open'}).innerHTML = `<style>:host{display:block!important;pointer-events:none!important}.frame{position:absolute;inset:0;border:2px solid #12c9bd;box-shadow:0 0 0 2px #171b20;box-sizing:border-box;pointer-events:none}.label{position:absolute;left:50%;top:-29px;transform:translateX(-50%);box-sizing:border-box;min-width:38px;height:18px;border:1px solid #12c9bd;background:#171b20;color:#12c9bd;font:bold 11px/16px Arial,sans-serif;text-align:center;white-space:nowrap}.arrow{position:absolute;left:50%;top:-10px;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid #12c9bd}</style><span class="frame"></span><span class="label">CEL</span><span class="arrow"></span>`;
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

