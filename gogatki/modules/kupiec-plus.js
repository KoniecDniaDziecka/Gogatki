// Kupiec+ 1.0.1 — Greater Merchant + Divide Et Impera (Maddonz, Barlag).
GogatkiRuntime.register({
  id: 'kupiec-plus',
  name: 'Kupiec+',
  description: 'Sprzedaż i uzupełnianie (NI) oraz dzielenie stosów (NI/SI).',
  start() {
    'use strict';
    const window = unsafeWindow;
    const document = window.document;
// Adaptery Kupca+ dla Gogatków, na podstawie samodzielnych adaptacji Maddonza (Barlag).
function createAddon(config, feature) {
  'use strict';
  const marker = Symbol.for('gogatki.' + config.id + '.instance');
  if (window[marker]) return;
  window[marker] = true;
  const key = 'kupiec-plus:global:v1';
  let saved = {};
  try { saved = GM_getValue(key, null); } catch {}
  if (saved == null) {
    try { saved = JSON.parse(window.localStorage.getItem('maddonz-extracted:merchant-divide:v1')) || {}; } catch { saved = {}; }
  }
  const defaults = {active:true, collapsed:false, right:18, top:160, ...config.defaults};
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
    if (!host || state.collapsed || window.__gogatkiTileDock?.isDocked(host)) return;
    const box = host.getBoundingClientRect();
    state.right = Math.max(0,Math.min(state.right,innerWidth-box.width));
    state.top = Math.max(0,Math.min(state.top,innerHeight-box.height));
    host.style.right = state.right+'px';host.style.top = state.top+'px';
  }
  const svg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg>';
  function render() {
    host.dataset.compact = String(state.collapsed);
    root.querySelector('.panel').classList.toggle('collapsed',state.collapsed);
    root.querySelector('.gear').setAttribute('aria-expanded',String(!state.collapsed));
    place();
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
      :host([data-compact="true"]){display:none!important}
    </style><section class="panel" aria-label="${escape(config.name)}"><header><strong>${escape(config.name)}</strong><button class="gear" aria-label="Zwiń ${escape(config.name)} do docka" title="LPM / PPM: zwiń do docka">${svg}</button></header><main>
      <label><input type="checkbox" data-key="active">Włączony</label><p class="description">${escape(config.description)}</p><div class="actions"></div><div class="question" hidden></div><div class="options">${fields}</div><p class="status" role="status"></p></main></section>`;
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
    listen(gear,'click',event => {if (moved && event.detail !== 0) return;state.collapsed=!state.collapsed;render();save();});
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

const merchantModule = (() => {
const config = {
  id:'greater-merchant',name:'Greater Merchant',niOnly:true,
  description:'Uzupełnia trzy kategorie w sklepie i ulepszaniu. Działa na NI.',
  defaults:{fillKey:'',sellKey:''},
  fields:[['fillKey','Skrót uzupełniania','text','maxlength="1"'],['sellKey','Skrót finalizacji sprzedaży','text','maxlength="1"']],
};
function run(R) {
  function fill() {
    if(!R.active)return;
    if(R.engine()?.shop)for(const button of [...document.querySelectorAll('.great-merchamp .button')].slice(0,3))button.click();
    if(R.engine()?.crafting?.enhancement)for(const button of [...document.querySelectorAll('.autofiller .button:not(.autofiller-config-btn)')].slice(0,3))button.click();
  }
  function sell(){if(R.active && R.engine()?.shop)document.querySelector('.finalize-button .button')?.click();}
  R.action('Uzupełnij',fill);R.action('Sprzedaj',sell);
  R.listen(document,'keydown',event=>{
    if(R.shortcut(event,R.state.fillKey)){event.preventDefault();fill();}
    else if(R.shortcut(event,R.state.sellKey)){event.preventDefault();sell();}
  });
  const craftingWindows=new WeakSet();
  return {tick(){
    R.hook(R.engine()?.shop,'greatMerchant',{before:call=>{
      if(!R.active)return;
      call.prevent=true;
      for(const category of [1,2,3])call.result=Reflect.apply(call.original,call.owner,[category]);
    }});
    const wnd=R.engine()?.crafting?.wndEl;
    if(wnd && !craftingWindows.has(wnd)) {
      craftingWindows.add(wnd);R.listen(wnd,'click',event=>{
        if(!R.active || !event.target.closest?.('.autofiller .button:not(.autofiller-config-btn)'))return;
        const filler=R.engine()?.crafting?.enhancement?.enchant?.autofiller;
        if(typeof filler?.autofillFrom==='function')for(const category of [1,2,3])filler.autofillFrom(category);
      });
    }
  }};
}

return { config, run };
})();

const divideModule = (() => {
const config = {
  id:'divide-et-impera',name:'Divide Et Impera',description:'Dzieli stosy: /2 na pół, /N na N części, 10*3+5 na podane porcje. Shift: pół, Ctrl: pojedynczo.',
  defaults:{itemId:'',expression:'/2'},fields:[['itemId','ID przedmiotu','text'],['expression','Podział stosu','text']],
};
function run(R) {
  let busy=false, splitContext=null;
  function plan(value,total) {
    const text=String(value).replace(/\s+/g,'').toLowerCase().replace(/(\d+)([kmg])/g,(_,n,s)=>String(Number(n)*({k:1e3,m:1e6,g:1e9}[s])));
    if(!Number.isSafeInteger(total)||total<2)throw Error('Stos musi zawierać co najmniej 2 przedmioty.');
    let parts;
    if(/^\/\d+$/.test(text)) {
      const times=Number(text.slice(1));parts=[{amount:Math.floor(total/times),times}];
    } else if(/^\d+(?:[+*]\d+)*$/.test(text)) {
      parts=text.split('+').map(term=>{const [amount,...factors]=term.split('*').map(Number);return {amount,times:factors.reduce((a,b)=>a*b,1)};});
    } else throw Error('Nieprawidłowy podział. Przykłady: /2, /10, 10*3+5.');
    if(parts.some(p=>!Number.isSafeInteger(p.amount)||!Number.isSafeInteger(p.times)||p.amount<1||p.times<1))throw Error('Wszystkie porcje muszą być dodatnimi liczbami całkowitymi.');
    if(parts.reduce((sum,p)=>sum+p.amount*p.times,0)>total)throw Error('Nie posiadasz takiej ilości przedmiotów.');
    return parts;
  }
  async function split(item,value,total) {
    if(busy || !R.active)return;
    busy=true;
    try {
      total=Number(total ?? R.stats(item).amount ?? R.stats(item).ammo);
      const parts=plan(value,total);
      let remaining=total;
      for(const part of parts)for(let n=0;n<part.times;n++) {
        if(!R.active)return;
        if(part.amount>=remaining)continue; // Ostatnia pozostała porcja już istnieje w stosie.
        const packet=await R.request('moveitem&st=0&id='+encodeURIComponent(item.id)+'&x='+Number(item.x)+'&y='+Number(item.y)+'&findslot=1&split='+part.amount);
        if(!packet.item)throw Error('Gra nie potwierdziła podziału. Sprawdź wolne miejsce w torbie.');
        remaining-=part.amount;
      }
      R.report('Podział stosu zakończony.');
    } catch(error){R.report(error.message);} finally {busy=false;}
  }
  const byId=id=>R.items()[id] || R.engine()?.items?.getItemById?.(id);
  function fromQuery(query){try{return new URLSearchParams(String(query)).get('id');}catch{return null;}}
  function quick(event) {
    if(!R.active || (!event.shiftKey&&!event.ctrlKey))return false;
    const item=R.itemAt(event);if(!item)return false;
    const total=Number(R.stats(item).amount || R.stats(item).ammo);if(!(total>1))return false;
    event.preventDefault?.();event.stopImmediatePropagation?.();void split(item,event.ctrlKey?'/'+total:'/2',total);return true;
  }
  R.listen(document,'contextmenu',quick,true);
  R.menu((menu,event,call)=>{if(event && quick(event)){menu.splice(0);call.prevent=true;}});
  R.action('Podziel stos',()=>{
    const item=byId(R.state.itemId);if(!item)return R.report('Nie znaleziono przedmiotu o tym ID.');
    return split(item,R.state.expression);
  });
  return {tick(){
    const equipment=R.engine()?.heroEquipment;
    R.hook(equipment,'alertWindow',{before:call=>{splitContext={total:Number(call.args[0]),query:call.args[1]};}});
    R.hook(equipment,'checkValue',{before:call=>{
      if(!R.active)return;const item=byId(fromQuery(call.args[2]));if(!item)return;
      call.prevent=true;void split(item,call.args[0],call.args[1]);
    }});
    R.hook(window,'setOnlyPositiveNumberInInputWithLetter',{before:call=>{
      if(R.active && (call.args[0]?.is?.('#divide-items') || call.args[0]?.id==='divide-items'))call.prevent=true;
    }});
    R.hook(window,'mAlert',{before:call=>{
      if(!R.active)return;
      if(!R.engine() && window.g?.split) {
        const splitData=window.g.split;
        const text=window._t?.('item_split %max%',{'%max%':splitData[3]-1},'item');
        if(text && String(call.args[0]).startsWith(text)) {
          const item=byId(splitData[0]);if(!item)return;delete window.g.split;
          call.args=[call.args[0],3,[()=>void split(item,document.querySelector('input[name="mAlertInput"]')?.value,splitData[3]),()=>{}]];
        }
      } else if(splitContext && Array.isArray(call.args[1])) {
        const text=window._t?.('item_split %max%',{'%max%':splitContext.total-1},'item');
        if(text && String(call.args[0]).startsWith(text)) {
          const {total,query}=splitContext,item=byId(fromQuery(query));if(!item)return;
          call.args[1]=call.args[1].map((option,index)=>index?option:{...option,callback:()=>{
            const value=document.querySelector('#divide-items')?.value;
            if(value){void split(item,value,total);return true;}
          }});
        }
      }
    }});
  }};
}

return { config, run };
})();

// Wspólny panel Gogatków dla adaptacji Greater Merchant i Divide Et Impera.
const config = {
  id: 'kupiec-plus',
  name: 'Kupiec+',
  description: 'Sprzedaż i uzupełnianie (NI), dzielenie stosów (NI/SI). Shift + PPM: pół stosu, Ctrl + PPM: pojedynczo.',
  defaults: {
    ...merchantModule.config.defaults,
    ...divideModule.config.defaults,
    merchantEnabled: true, divideEnabled: true,
  },
  fields: [
    ['merchantEnabled', 'Handel (NI)'],
    ['divideEnabled', 'Dzielenie stosów'],
    ...merchantModule.config.fields,
    ...divideModule.config.fields,
  ],
};

// Zachowaj indywidualne preferencje przy pierwszym uruchomieniu wspólnej wersji.
function readPrevious(id) {
  try {
    const value = JSON.parse(localStorage.getItem('maddonz-extracted:' + id + ':v1'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch { return null; }
}
let savedCombined;
try { savedCombined = GM_getValue('kupiec-plus:global:v1', null); } catch {}
if (!savedCombined && !readPrevious('merchant-divide')) {
  for (const [module, enabled] of [[merchantModule, 'merchantEnabled'], [divideModule, 'divideEnabled']]) {
    const saved = readPrevious(module.config.id);
    if (!saved) continue;
    if (typeof saved.active === 'boolean') config.defaults[enabled] = saved.active;
    for (const key of Object.keys(module.config.defaults)) {
      if (typeof saved[key] === typeof module.config.defaults[key]) config.defaults[key] = saved[key];
    }
  }
}

function run(R) {
  function component(key, title, niOnly = false) {
    const part = Object.create(R);
    Object.defineProperty(part, 'active', {
      get: () => R.active && R.state[key] && (!niOnly || Boolean(R.engine())),
    });
    part.shortcut = (event, value) => part.active && R.shortcut(event, value);
    part.request = (query, options) => part.active
      ? R.request(query, options)
      : Promise.reject(Error(title + ' jest wyłączony.'));
    part.action = (name, action) => {
      R.action(name, () => { if (part.active) return action(); });
      R.root.querySelector('.actions').lastElementChild.dataset.component = key;
    };
    return part;
  }
  const merchant = component('merchantEnabled', 'Greater Merchant', true);
  const divide = component('divideEnabled', 'Divide Et Impera');
  const merchantRuntime = merchantModule.run(merchant) || {};
  const divideRuntime = divideModule.run(divide) || {};

  function refreshControls() {
    const ni = Boolean(R.engine());
    const input = R.root.querySelector('[data-key="merchantEnabled"]');
    input.disabled = !ni;
    input.checked = ni && R.state.merchantEnabled;
    for (const button of R.root.querySelectorAll('[data-component]')) {
      button.disabled = button.dataset.component === 'merchantEnabled' ? !merchant.active : !divide.active;
    }
  }
  refreshControls();
  if (!R.engine()) R.report('SI: działa dzielenie stosów. Greater Merchant wymaga NI.');
  return {
    tick() {
      merchantRuntime.tick?.();
      divideRuntime.tick?.();
    },
    change(key) {
      merchantRuntime.change?.(key);
      divideRuntime.change?.(key);
      refreshControls();
    },
  };
}

createAddon(config, run);

  }
});
