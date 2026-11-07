GogatkiRuntime.register({
  id: 'qf', name: 'QF',
  description: 'Szybka walka według typu potworów, wielkości grupy i poziomów.',
  start() {
    const previous = unsafeWindow.__smartAutofightStandalone;
    if (previous?.settings && !previous.stopped) {
      const node = document.getElementById('smart-autofight-standalone');
      const rect = node?.getBoundingClientRect();
      const prior = GM_getValue('qf:global:v1', {}) || {};
      GM_setValue('qf:global:v1', { ...prior, ...previous.settings, ui: {
        collapsed: node?.shadowRoot?.querySelector('.panel')?.classList.contains('collapsed') || false,
        x: rect?.x ?? 100, y: rect?.y ?? 100
      }});
      previous.destroy();
    }
(() => {
  'use strict';
  const defaults = () => ({ active: false, common: false, elite: false, elite2: false,
    elite3: false, hero: false, titan: false, colossus: false, pvp: false,
    override: false, turnOnAskAboutBattleMode: true, maxGrp: '', lvlDiff: '', players: [] });

  // These rules follow SmartAutofight.vue in the archived Maddonz source.
  function createCore(settings, game) {
    let initiated = false, requestedFast = false;
    const group = npc => {
      const members = npc.grp ? game.npcs().filter(n => n.grp === npc.grp) : [npc];
      return members.length ? members : [npc];
    };
    function kind(npc) {
      const wt = Math.max(...group(npc).map(n => Number(n.wt) || 0));
      return wt > 99 ? 'titan' : wt > 89 ? 'colossus' : wt > 79 ? 'hero' :
        wt > 29 ? 'elite3' : wt > 19 ? 'elite2' : wt > 9 ? 'elite' : 'common';
    }
    function allowed(npc) {
      const members = group(npc);
      if (settings.maxGrp !== '' && members.length > Number(settings.maxGrp)) return false;
      if (settings.lvlDiff !== '') {
        const heroLevel = Number(game.hero().lvl);
        const levels = members.map(n => Number(n.lvl));
        if (!Number.isFinite(heroLevel) || levels.some(n => !Number.isFinite(n))) return false;
        if (heroLevel - Math.max(...levels) < Number(settings.lvlDiff)) return false;
      }
      return true;
    }
    function attack(query) {
      if (!settings.active || typeof query !== 'string' || !query.startsWith('fight&a=attack')) return query;
      initiated = requestedFast = false;
      const params = new URLSearchParams(query);
      const npc = game.npc(Math.abs(Number(params.get('id'))));
      if (!npc || !allowed(npc)) return query;
      initiated = true;
      if (settings.override) params.delete('ff');
      requestedFast = Boolean(settings[kind(npc)]);
      if (requestedFast) params.set('ff', '1');
      return params.toString().replace(/^fight=/, 'fight');
    }
    function battle(f) {
      if (!settings.active || !f?.init || f.endBattle) return false;
      const warriors = Object.entries(f.w || {});
      let fast = false;
      if (!initiated || (requestedFast && String(f.auto) === '0')) {
        const entry = warriors.find(([, n]) => n.npc);
        const npc = entry && game.npc(Math.abs(Number(entry[0])));
        fast = Boolean(npc && allowed(npc) && settings[kind(npc)]);
      }
      if (String(f.auto) === '0' && warriors.length <= 2) {
        const opponent = warriors.map(([, n]) => n).find(n => n.team !== f.myteam);
        fast ||= Boolean(opponent && !opponent.npc &&
          (settings.pvp || settings.players.includes(opponent.name)));
      }
      return fast;
    }
    return { attack, battle, kind, allowed, reset() { initiated = requestedFast = false; } };
  }
  if (typeof module === 'object' && module.exports) {
    module.exports = { defaults, createCore };
    return;
  }
  const window = typeof unsafeWindow !== 'undefined' ? unsafeWindow : globalThis.window;
  if (window.top !== window.self || window.__smartAutofightStandalone) return;
  const lifecycle = { stopped: false };
  window.__smartAutofightStandalone = lifecycle;
  const removers = [];
  let host, settings, save, refresh, core;
  let lastStatus = 'Gotowy';
  function status(message) {
    lastStatus = message;
    const line = host?.shadowRoot?.querySelector('.status');
    if (line) line.textContent = message;
  }
  function report(error) { console.error('[QF]', error); }
  function hook(object, key, before, after) {
    const original = object[key];
    if (typeof original !== 'function') throw new Error(`Brak funkcji gry: ${key}`);
    const wrapped = function (...args) {
      if (!lifecycle.stopped && before) { try { before(args); } catch (error) { report(error); } }
      const result = Reflect.apply(original, this, args);
      if (!lifecycle.stopped && after) { try { after(args, result); } catch (error) { report(error); } }
      return result;
    };
    object[key] = wrapped;
    removers.push(() => { if (object[key] === wrapped) object[key] = original; });
  }
  lifecycle.destroy = () => {
    lifecycle.stopped = true;
    removers.reverse().forEach(fn => fn());
    host?.remove();
    delete window.__smartAutofightStandalone;
  };
  const normalize = n => ({ ...n, wt: n.wt ?? n.warrior_type ?? 0,
    lvl: n.lvl ?? n.level, grp: n.grp ?? n.group ?? 0 });
  function boot() {
    if (lifecycle.stopped) return;
    const ni = Boolean(window.Engine?.communication && window.Engine?.hero?.d);
    const engine = ni ? window.Engine : window.g;
    const parserOwner = ni ? engine.communication : window;
    const parserKey = ni ? 'parseJSON' : 'parseInput';
    if (!document.body || !engine || typeof window._g !== 'function' ||
        typeof parserOwner?.[parserKey] !== 'function' || !(ni ? engine.allInit : window.hero?.id)) {
      timer = setTimeout(boot, 500);
      return;
    }
    const hero = () => ni ? engine.hero.d : window.hero;
    const npcs = () => Object.values(ni ? engine.npcs.check() : engine.npc || {})
      .map(n => normalize(ni ? n.d : n));
    const npc = id => {
      const data = ni ? engine.npcs.getById(id)?.d : engine.npc?.[id];
      return data ? normalize(data) : null;
    };
    // Userscript storage is shared across matching world domains and characters.
    const storageKey = 'qf:global:v1';
    const legacyKey = `smart-autofight:1:${location.hostname}:${hero().id}`;
    const globalStorage = typeof GM_getValue === 'function' && typeof GM_setValue === 'function';
    let stored = {};
    try {
      const global = globalStorage ? GM_getValue(storageKey, null) : localStorage.getItem(storageKey);
      stored = (typeof global === 'string' ? JSON.parse(global) : global) ??
        JSON.parse(localStorage.getItem(legacyKey)) ?? {};
    } catch (error) { report(error); }
    settings = defaults();
    for (const key of Object.keys(settings)) {
      if (typeof settings[key] === 'boolean' && typeof stored[key] === 'boolean') settings[key] = stored[key];
    }
    for (const key of ['maxGrp', 'lvlDiff']) {
      if (stored[key] !== '' && Number.isFinite(Number(stored[key])) && stored[key] != null)
        settings[key] = key === 'maxGrp' ? Math.max(1, Math.trunc(Number(stored[key]))) : Number(stored[key]);
    }
    settings.players = Array.isArray(stored.players) ? stored.players.filter(n => typeof n === 'string') : [];
    const ui = { collapsed: Boolean(stored.ui?.collapsed),
      x: Number.isFinite(stored.ui?.x) ? stored.ui.x : Math.max(0, innerWidth - 270),
      y: Number.isFinite(stored.ui?.y) ? stored.ui.y : 100 };
    save = () => {
      try {
        const value = { ...settings, ui };
        if (globalStorage) GM_setValue(storageKey, value);
        else localStorage.setItem(storageKey, JSON.stringify(value));
      } catch (error) { report(error); }
    };
    core = createCore(settings, { hero, npcs, npc });
    function askMode() {
      if (settings.active && settings.turnOnAskAboutBattleMode &&
          [false, 0].includes(engine.settingsStorage?.getValue(4)))
        window._g('settings&action=update&id=4&v=1');
    }
    hook(window, '_g', args => {
      const previous = args[0];
      args[0] = core.attack(previous);
      if (typeof previous === 'string' && previous.startsWith('fight&a=attack'))
        status(previous !== args[0] ? 'Zastosowano regułę ataku' : 'Odebrano atak');
    });
    // Read the packet before the game and other addons can consume/mutate it.
    // Keep the decision per invocation so nested parser calls cannot overwrite it.
    const decisions = new WeakMap();
    let generation = 0;
    const resetBattle = () => { generation++; core.reset(); };
    hook(parserOwner, parserKey, args => {
      const packet = args[0];
      if (packet?.f?.endBattle || packet?.town) resetBattle();
      decisions.set(args, { fast: core.battle(packet?.f), generation });
      if (packet?.f?.init) status(settings.active ? 'Odebrano początek walki' : 'QF jest wyłączony');
    }, args => {
      const decision = decisions.get(args);
      if (!decision?.fast) return;
      // Let all parser wrappers finish before sending a game request.
      setTimeout(() => {
        if (lifecycle.stopped || !settings.active || generation !== decision.generation) return;
        const members = ni ? Array.from(engine.party?.getMembers?.()?.values?.() || []) :
          Object.entries(engine.party || {}).map(([id, m]) => ({ ...m, id: Number(id), leader: m.r }));
        const leader = members.some(m => m.leader && Number(m.id) === Number(hero().id));
        window._g(leader ? 'fight&a=auto' : 'fight&a=f&enabled=1', () => {});
        status('Wysłano szybką walkę');
      }, 0);
    });
    if (ni && typeof engine.battle?.close === 'function') hook(engine.battle, 'close', resetBattle);
    if (!ni && typeof window.closeBattle === 'function') hook(window, 'closeBattle', resetBattle);
    buildPanel(ui, askMode);
    askMode();
    lifecycle.settings = settings;
  }
  let timer;
  removers.push(() => clearTimeout(timer));

  function buildPanel(ui, askMode) {
    host = document.createElement('div');
    host.id = 'smart-autofight-standalone';
    // Isolate the entire panel from game styles, including inherited text effects.
    host.style.cssText = 'all:initial;position:fixed;z-index:2147483000;display:block';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>
      :host{all:initial;font:12px Arial,sans-serif;color:#c7d0d9;text-shadow:none}
      *{box-sizing:border-box}button,input,textarea{font:inherit;color:inherit;text-shadow:none}
      .panel{font:12px Arial,sans-serif;color:#c7d0d9;text-shadow:none;background:#171b20;border:1px solid #668298;border-radius:4px;width:250px;overflow:hidden}
      header{height:26px;background:#252b31;display:flex;align-items:center;gap:6px;padding:0 5px;cursor:move;touch-action:none}
      .title{color:#12c9bd;font-weight:bold;flex:1;white-space:nowrap}button{cursor:pointer;border:1px solid #6d879a;border-radius:3px;background:#38566c;min-height:21px;padding:1px 6px}
      .q-control{width:22px;padding:0;display:grid;place-items:center;color:#74838d;flex-shrink:0;font-weight:bold;font-size:16px;background:#252b31}.q-control.active{color:#12c9bd}svg{width:16px;height:16px;display:block}
      button:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid #12c9bd;outline-offset:1px}
      main{padding:9px;max-height:calc(100vh - 50px);overflow:auto}p{margin:0 0 8px;color:#b1c0cb;font-size:11px;line-height:1.4}
      .types{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:11px}
      label{display:flex;align-items:center;gap:6px;line-height:1.3;margin:7px 0}.types label{margin:0}
      input[type=checkbox]{appearance:none;flex:0 0 14px;width:14px;height:14px;margin:0;border:1px solid #668298;background:#171b20;border-radius:2px;display:grid;place-content:center}
      input[type=checkbox]:checked:after{content:'';width:7px;height:4px;border-left:2px solid #12c9bd;border-bottom:2px solid #12c9bd;transform:translateY(-1px) rotate(-45deg)}
      input[type=number],textarea{background:#252b31;border:1px solid #668298;border-radius:3px;padding:4px;width:100%;min-width:0}
      .field{display:grid;grid-template-columns:1fr 65px;gap:8px}textarea{resize:vertical;min-height:62px}.section{border-top:1px solid #668298;margin-top:10px;padding-top:8px}
      [hidden]{display:none!important}.panel.collapsed{width:var(--tile);height:var(--tile)}.collapsed header{padding:0;width:100%;height:100%;justify-content:center}
      .collapsed .q-control{border:0;background:none;width:100%;height:100%}.collapsed .title{display:none}
    </style><div class="panel"><header><span class="title">QF</span><button class="q-control" type="button" aria-label="QF" title="LPM: rozwiń lub zwiń · PPM: włącz lub wyłącz">Q</button></header><main><p class="status" role="status">Gotowy</p><p>Szybka walka z:</p><div class="types"></div><div class="options"></div><label class="field">Max grupa potworów<input type="number" min="1" step="1" data-key="maxGrp"></label><label class="field">Przewaga poziomów<input type="number" step="1" data-key="lvlDiff"></label><p>Puste pole oznacza brak limitu. Przewaga: Twój poziom minus najwyższy poziom w grupie.</p><div class="section"><label for="players">Szybka walka z graczami:</label><textarea id="players" placeholder="Jeden nick w wierszu" spellcheck="false"></textarea><p>Dokładne nicki. Opcja PvP obejmuje wszystkie pojedynki 1 na 1.</p></div></main></div>`;
    document.body.appendChild(host);
    status(lastStatus);
    const panel = root.querySelector('.panel'), header = root.querySelector('header');
    const control = root.querySelector('.q-control');
    const addCheck = (key, name, container) => {
      const label = document.createElement('label'), input = document.createElement('input');
      input.type = 'checkbox'; input.checked = settings[key];
      label.append(input, document.createTextNode(name)); container.append(label);
      input.addEventListener('change', () => { settings[key] = input.checked; core.reset(); save(); askMode(); });
    };
    for (const [key, name] of Object.entries({ common: 'Zwykłe', elite: 'Elity', elite2: 'Elity II',
      elite3: 'Elity III', hero: 'Herosi', titan: 'Tytani', colossus: 'Kolosy' }))
      addCheck(key, name, root.querySelector('.types'));
    for (const [key, name] of Object.entries({ turnOnAskAboutBattleMode: 'Nadpisuj, kiedy potwór atakuje',
      override: 'Nadpisuj szybką walkę', pvp: 'PvP' })) addCheck(key, name, root.querySelector('.options'));
    root.querySelectorAll('input[type=number]').forEach(input => {
      input.value = settings[input.dataset.key];
      input.addEventListener('change', () => {
        if (!input.checkValidity()) { input.reportValidity(); return; }
        settings[input.dataset.key] = input.value === '' ? '' : Number(input.value);
        core.reset(); save();
      });
    });
    const players = root.querySelector('textarea'); players.value = settings.players.join('\n');
    players.addEventListener('change', () => {
      settings.players = [...new Set(players.value.split(/\r?\n/).map(n => n.trim()).filter(Boolean))]; save();
    });
    function place() {
      const box = host.getBoundingClientRect();
      ui.x = Math.min(Math.max(0, ui.x), Math.max(0, innerWidth - box.width));
      ui.y = Math.min(Math.max(0, ui.y), Math.max(0, innerHeight - box.height));
      host.style.left = `${ui.x}px`; host.style.top = `${ui.y}px`;
    }
    let firstRender = true;
    refresh = () => {
      const right = host.getBoundingClientRect().right;
      const launcher = document.querySelector('#gogatki .launcher, .gogatki .launcher, [data-gogatki] .launcher');
      const tile = launcher?.getBoundingClientRect().height || 28;
      panel.style.setProperty('--tile', `${tile}px`);
      panel.classList.toggle('collapsed', ui.collapsed);
      root.querySelector('main').hidden = ui.collapsed;
      control.setAttribute('aria-expanded', String(!ui.collapsed));
      control.classList.toggle('active', settings.active);
      control.setAttribute('aria-label', `QF ${settings.active ? 'włączony' : 'wyłączony'}. LPM: ${ui.collapsed ? 'rozwiń' : 'zwiń'}. PPM: ${settings.active ? 'wyłącz' : 'włącz'}.`);
      control.title = `QF: ${settings.active ? 'włączony' : 'wyłączony'} · LPM: rozwiń lub zwiń · PPM: włącz lub wyłącz`;
      if (!firstRender && right > 0) ui.x = right - host.getBoundingClientRect().width;
      firstRender = false;
      place(); save();
    };
    control.addEventListener('click', () => {
      ui.collapsed = !ui.collapsed;
      refresh();
    });
    control.addEventListener('contextmenu', event => {
      event.preventDefault();
      settings.active = !settings.active;
      core.reset(); askMode(); refresh();
    });
    let drag;
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: ui.x, top: ui.y };
      header.setPointerCapture(event.pointerId); event.preventDefault();
    });
    header.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      ui.x = drag.left + event.clientX - drag.x; ui.y = drag.top + event.clientY - drag.y; place();
    });
    const stopDrag = () => { if (drag) { drag = null; save(); } };
    header.addEventListener('pointerup', stopDrag); header.addEventListener('pointercancel', stopDrag);
    const resize = () => { place(); save(); };
    window.addEventListener('resize', resize); removers.push(() => window.removeEventListener('resize', resize));
    // Position before the first render so restoring a saved position preserves its coordinates.
    host.style.left = `${ui.x}px`; host.style.top = `${ui.y}px`;
    panel.classList.toggle('collapsed', ui.collapsed);
    refresh();
  }
  boot();
})();

  }
});
