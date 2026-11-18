// Adaptery Błogo+ dla Gogatków, na podstawie samodzielnych adaptacji Maddonza (Barlag).
function createAddon(config, feature) {
  'use strict';
  const marker = Symbol.for('gogatki.' + config.id + '.instance');
  if (window[marker]) return;
  window[marker] = true;
  const key = 'blogo-plus:global:v1';
  let saved = {};
  try { saved = GM_getValue(key, null); } catch {}
  if (saved == null) {
    try { saved = JSON.parse(window.localStorage.getItem('maddonz-extracted:buff-yourself:v1')) || {}; } catch { saved = {}; }
  }
  const defaults = {active:true, collapsed:false, settings:false, right:18, top:160, ...config.defaults};
  const state = {...defaults};
  for (const name of Object.keys(defaults)) {
    if (typeof saved?.[name] === typeof defaults[name] &&
        (typeof saved?.[name] !== 'number' || Number.isFinite(saved[name]))) state[name] = saved[name];
  }
  let stopped = false, host, root, implementation = {}, started = false, cancelQuestion;
  const removers = [], timers = new Set(), hooked = new WeakMap(), packetWaiters = new Set();
  const before = [], after = [], menuHandlers = [];
  const save = () => {try {GM_setValue(key, { ...state });} catch {}};
  const safe = fn => {try {return fn();} catch (error) {report(error.message);console.error('['+config.name+']',error);}};
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function listen(owner, event, fn, options) {
    owner?.addEventListener(event, fn, options);
    removers.push(() => owner?.removeEventListener(event, fn, options));
  }
  function delay(fn, ms) {
    const timer = setTimeout(() => {timers.delete(timer);if (!stopped) safe(fn);}, ms);
    timers.add(timer); return timer;
  }
  function hook(owner, name, callbacks) {
    if (!owner || typeof owner[name] !== 'function') return false;
    let keys = hooked.get(owner);
    if (!keys) {keys = new Set();hooked.set(owner, keys);}
    if (keys.has(name)) return true;
    const original = owner[name];
    function wrapped(...args) {
      if (stopped) return Reflect.apply(original, this, args);
      const call = {args, result:undefined, prevent:false, owner:this, original};
      safe(() => callbacks.before?.(call));
      if (!call.prevent) call.result = Reflect.apply(original, this, call.args);
      safe(() => callbacks.after?.(call));
      return call.result;
    }
    try {owner[name] = wrapped;} catch {return false;}
    if (owner[name] !== wrapped) return false;
    keys.add(name);
    removers.push(() => {if (owner[name] === wrapped) owner[name] = original;});
    return true;
  }
  const engine = () => window.Engine?.hero?.d ? window.Engine : null;
  const hero = () => engine()?.hero.d || window.hero;
  const map = () => engine()?.map?.d || window.map || {};
  const stats = item => item?._cachedStats || Object.fromEntries(String(item?.stat || '').split(';').filter(Boolean).map(pair => {
    const at = pair.indexOf('=');return at < 0 ? [pair,''] : [pair.slice(0,at),pair.slice(at+1)];
  }));
  const items = () => engine()?.items?.test?.()?.items || window.g?.item || {};
  const playerItems = () => Object.entries(items()).map(([id,item]) => ({...item,id:item.id ?? id})).filter(item => item.loc === 'g');
  const inBattle = () => !!(engine()?.lock || window.g?.lock)?.check?.('battle');
  function report(text) {if (root) root.querySelector('.status').textContent = text || '';}
  function request(query, options = {}) {
    return new Promise((resolve, reject) => {
      if (stopped || !state.active || typeof window._g !== 'function') return reject(Error('Dodatek jest wyłączony lub gra nie jest gotowa.'));
      let done = false;
      const finish = (error, packet) => {
        if (done) return;done = true;clearTimeout(timer);timers.delete(timer);
        packetWaiters.delete(waiter);error ? reject(error) : resolve(packet);
      };
      const waiter = {consume:options.consume, finish};
      const timer = delay(() => finish(Error('Brak odpowiedzi gry.')), 15000);
      packetWaiters.add(waiter);
      try {window._g(query, packet => {
        if (!options.consume || Object.hasOwn(packet || {},options.consume)) finish(null,packet || {});
      },options.data);} catch (error) {finish(error);}
    });
  }
  function packets(stage, packet) {
    if (!packet || typeof packet !== 'object') return;
    if (stage === 'before') for (const waiter of packetWaiters) {
      if (waiter.consume && Object.hasOwn(packet,waiter.consume)) {
        const copy = {...packet};delete packet[waiter.consume];waiter.finish(null,copy);
      }
    }
    for (const fn of stage === 'before' ? before : after) safe(() => fn(packet));
  }
  function message(text) {report(text);window.message?.(text);}
  function ask(text, choices) {
    if (!root || stopped || !state.active) return Promise.resolve(null);
    cancelQuestion?.();
    // Przypomnienie musi być widoczne również po zwinięciu do docka.
    if (state.collapsed) { state.collapsed = false; render(); save(); }
    return new Promise(resolve => {
      const area = root.querySelector('.question');area.replaceChildren();area.hidden = false;
      let settled=false;
      const finish=value=>{if(settled)return;settled=true;area.hidden=true;cancelQuestion=null;resolve(value);};
      cancelQuestion=()=>finish(null);
      const label = document.createElement('p');label.textContent = text;area.append(label);
      for (const [caption,value] of choices) {
        const button = document.createElement('button');button.textContent = caption;
        button.addEventListener('click', () => finish(state.active ? value : null), {once:true});area.append(button);
      }
    });
  }
  function shortcut(event, value) {
    return state.active && value && !event.repeat && !event.ctrlKey && !event.altKey && !event.metaKey &&
      !event.composedPath().some(node => node?.matches?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])')) &&
      event.key.toLowerCase() === value.toLowerCase();
  }
  function itemAt(event) {
    let node = (event.target === document ? event.currentTarget : event.target)?.closest?.('.item,[iid],[data-item-id]');
    node ||= event.currentTarget?.querySelector?.('.item');
    const direct = window.$?.(node)?.data?.('item');
    if (direct?.id != null) return direct;
    const id = node?.dataset?.itemId || node?.getAttribute?.('iid') || node?.id?.replace(/^item/,'') ||
      [...(node?.classList || [])].find(c => /^item-id-/.test(c))?.slice(8);
    return items()[id] || engine()?.items?.getItemById?.(id);
  }
  function place() {
    if (!host || window.__gogatkiTileDock?.isDocked(host)) return;
    const box = host.getBoundingClientRect();
    state.right = Math.max(0,Math.min(state.right,innerWidth-box.width));
    state.top = Math.max(0,Math.min(state.top,innerHeight-box.height));
    host.style.right = state.right+'px';host.style.top = state.top+'px';
  }
  const svg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg>';
  function render() {
    const size = document.querySelector('#gogatek-panel')?.shadowRoot?.querySelector('.launcher')?.getBoundingClientRect().height || 28;
    host.style.setProperty('--tile',size+'px');root.querySelector('.panel').classList.toggle('collapsed',state.collapsed);
    root.querySelector('.options').hidden = !state.settings;
    root.querySelector('.gear').setAttribute('aria-expanded',String(!state.collapsed && state.settings));place();
  }
  function createPanel() {
    host = document.createElement('div');host.id = 'gogatki-'+config.id;
    host.style.cssText = 'all:initial;display:block;position:fixed;z-index:2147483000;';
    root = host.attachShadow({mode:'open'});
    const fields = (config.fields || []).map(([name,label,type='checkbox',extra='']) =>
      `<label class="${type==='checkbox'?'check':'field'}">${type==='checkbox'?'':escape(label)}<input data-key="${name}" type="${type}" ${extra}>${type==='checkbox'?escape(label):''}</label>`).join('');
    root.innerHTML = `<style>
      :host{all:initial;color-scheme:dark}*{box-sizing:border-box;text-shadow:none} [hidden]{display:none!important}
      .panel{width:270px;max-width:100vw;font:12px/1.4 Arial,sans-serif;color:#c7d0d9;background:#171b20;border:1px solid #668298;border-radius:4px;overflow:hidden}
      header{display:flex;align-items:center;justify-content:space-between;height:28px;background:#252b31;cursor:move;touch-action:none;user-select:none}
      strong{padding-left:8px;color:#12c9bd}button{font:12px Arial,sans-serif;color:#c7d0d9;background:#38566c;border:1px solid #6d879a;border-radius:3px;padding:5px;cursor:pointer}
      .gear{display:flex;align-items:center;justify-content:center;width:26px;height:26px;padding:3px;border:0;color:#12c9bd;background:#252b31}.gear svg{pointer-events:none;display:block}
      main{display:grid;gap:8px;padding:8px;max-height:calc(100vh - 32px);overflow:auto}p{margin:0}.description,.status{font-size:11px;color:#b1c0cb;overflow-wrap:anywhere}
      .options{display:grid;gap:8px;border-top:1px solid #668298;padding-top:8px}label{display:flex;gap:7px;align-items:center}.field{display:grid;gap:3px}
      input{font:12px Arial,sans-serif;color:#c7d0d9;background:#252b31;border:1px solid #668298;border-radius:3px;padding:5px;min-width:0;width:100%}
      input[type=checkbox]{appearance:none;display:grid;place-content:center;flex:none;width:14px;height:14px;margin:0;padding:0;background:#171b20}
      input[type=checkbox]:checked:after{content:'';width:7px;height:4px;border:solid #12c9bd;border-width:0 0 2px 2px;transform:rotate(-45deg)}
      :focus-visible{outline:2px solid #12c9bd;outline-offset:1px}.actions{display:flex;gap:5px;flex-wrap:wrap}.question{display:grid;gap:6px;border-top:1px solid #668298;padding-top:8px}
      .collapsed{width:var(--tile);height:var(--tile)}.collapsed header,.collapsed .gear{width:100%;height:100%}.collapsed strong,.collapsed main{display:none}
    </style><section class="panel" aria-label="${escape(config.name)}"><header><strong>${escape(config.name)}</strong><button class="gear" aria-label="Opcje ${escape(config.name)}" title="LPM: opcje · PPM: zwiń">${svg}</button></header><main>
      <label><input type="checkbox" data-key="active">Włączony</label><p class="description">${escape(config.description)}</p><div class="actions"></div><div class="question" hidden></div><div class="options" hidden>${fields}</div><p class="status" role="status"></p></main></section>`;
    document.body.append(host);
    for (const input of root.querySelectorAll('input[data-key]')) {
      const name = input.dataset.key;input.type === 'checkbox' ? input.checked=state[name] : input.value=state[name];
      listen(input,'change',() => {
        if (!input.reportValidity()) return;
        state[name] = input.type === 'checkbox' ? input.checked : input.type === 'number' ? Number(input.value) : input.value.trim();
        if(name==='active' && !state.active)cancelQuestion?.();
        save();safe(() => implementation.change?.(name));
      });
    }
    const gear = root.querySelector('.gear'), header = root.querySelector('header');
    let drag, moved = false;
    listen(gear,'click',() => {if (moved) return;state.collapsed ? state.collapsed=false : state.settings=!state.settings;render();save();});
    listen(gear,'contextmenu',event => {event.preventDefault();state.collapsed=!state.collapsed;render();save();});
    listen(header,'pointerdown',event => {if(event.button!==0)return;moved=false;drag={x:event.clientX,y:event.clientY,right:state.right,top:state.top};if(!gear.contains(event.target))header.setPointerCapture(event.pointerId);});
    listen(header,'pointermove',event => {if(!drag)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(!moved&&Math.hypot(dx,dy)<4)return;moved=true;header.setPointerCapture(event.pointerId);state.right=drag.right-dx;state.top=drag.top+dy;place();});
    for (const name of ['pointerup','pointercancel','lostpointercapture']) listen(header,name,() => {if(drag){drag=null;save();}});
    listen(window,'resize',() => {render();save();});render();
  }
  const R = {state,config,engine,hero,map,stats,items,playerItems,inBattle,request,report,message,ask,hook,listen,delay,shortcut,itemAt,escape,
    get root(){return root;},get stopped(){return stopped;},get active(){return state.active && !stopped;},
    packets(phase,fn){(phase==='before'?before:after).push(fn);},
    menu(fn){menuHandlers.push(fn);},
    action(name,fn){const button=document.createElement('button');button.textContent=name;listen(button,'click',() => {if(R.active)Promise.resolve(safe(fn)).catch(error=>report(error.message));});root.querySelector('.actions').append(button);},
    cleanup(fn){removers.push(fn);}, save,
  };
  function connect() {
    if (stopped || !document.body || !hero()?.id) return;
    if (!started) {
      createPanel();started=true;
      if(config.niOnly && !engine()){report('Ten dodatek obsługuje tylko nowy interfejs.');return;}
      implementation = feature(R) || {};
    }
    if(config.niOnly && !engine())return;
    const owner = engine()?.communication || window, name = engine()?'parseJSON':'parseInput';
    hook(owner,name,{before:call=>packets('before',call.args[0]),after:call=>packets('after',call.args[0])});
    const callbacks = {before:call=>{if(!R.active)return;const menu=engine()?call.args[0]:call.args[1],event=engine()?call.args[1]:call.args[0];for(const fn of menuHandlers)fn(menu,event,call);}};
    if(menuHandlers.length)hook(engine()?.interface || window,engine()?'showPopupMenu':'showMenu',callbacks);
    safe(() => implementation.tick?.());
  }
  function cleanup() {
    stopped=true;cancelQuestion?.();clearInterval(interval);for(const timer of timers)clearTimeout(timer);timers.clear();
    for(const waiter of packetWaiters)waiter.finish(Error('Strona została zamknięta.'));
    for(const remove of removers.reverse())safe(remove);host?.remove();delete window[marker];
  }
  const interval = setInterval(connect,750);
  listen(window,'pagehide',cleanup,{once:true});connect();save();
}
