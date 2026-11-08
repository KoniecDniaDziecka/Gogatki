// ==UserScript==
// @name         Strategy — niezależny
// @namespace    KoniecDniaDziecka
// @version      1.2.0
// @description  Kolejka umiejętności i warunkowe zestawy ruchów z Maddonz (Barlag).
// @match        https://*.margonem.pl/*
// @match        https://*.margonem.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==
(() => {
'use strict';
if (window.SpellTriggerStandalone || window.top !== window.self) return;
const Fc = value => JSON.parse(JSON.stringify(value));
const B = { get id() { return window.Engine?.hero?.d?.id ?? window.hero?.id; } };
const kc = (ni, si) => {
 let instance, mode;
 return new Proxy({}, { get(_, key) {
  const next=!!window.Engine?.battle;
  if(!instance||next!==mode){mode=next;instance=new (mode?ni:si)();}
  const value=instance[key];return typeof value==='function'?value.bind(instance):value;
 } });
};
const ww = { SELF: 0, ALLY: 1, ENEMY: 2 };
class Ow { constructor(id, name, resolve, paramsSchema=[]) { Object.assign(this,{id,name,resolve,paramsSchema}); } }
const callbacks = new Map();
const V = {
 after(name, fn) { const list=callbacks.get(name)||[]; list.push(fn); callbacks.set(name,list); },
 emit(name, args) { for(const fn of callbacks.get(name)||[]) fn(args); }
};
function jm(name, definition) {
 const state=definition.state();
 for(const [key,fn] of Object.entries(definition.getters)) Object.defineProperty(state,key,{get:()=>fn.call(state)});
 for(const [key,fn] of Object.entries(definition.actions)) state[key]=fn.bind(state);
 return ()=>state;
}
const U={ lock:{check:()=>rg().inBattle},sendRequest:request=>window._g(request) };
// __CORE__
const defaults={active:false,repeat:false,currentMoveSet:'',moveSets:[],beforePvpAction:0,beforePveAction:0,showBattleQueue:false,battleQueueRight:340,battleQueueTop:140,minimized:false,right:20,top:140};
let config, storageKey, root, host, battleHost, battleRoot, settings=false, queue=[], cooldowns={}, limits={}, blocked=false, pending=false;
const skills=new Map([[-1,'Zwykły atak'],[-2,'Krok']]);
function save(){try{localStorage.setItem(storageKey,JSON.stringify(config));}catch{status('Nie udało się zapisać ustawień.');}}
function status(message){const target=root?.querySelector('#status');if(target)target.textContent=message;}
function reset(){queue=[];cooldowns={};limits={};blocked=false;}
function candidates(type){const state=rg();return type===1?state.aliveAllies:type===2?state.aliveEnemies:[state.hero].filter(Boolean);}
function selectMove(set){
 for(let index=0;index<set.moves.length;index++){
  const move=set.moves[index], key=`${set.id}-${index}`;
  if(cooldowns[key] || (move.limit && (limits[key]||0)>=move.limit))continue;
  const condition=oT.find(c=>c.id===move.conditionId),resolver=sT.find(r=>r.id===move.targetResolverId);
  if(!condition||!resolver)continue;
  const context={targets:candidates(move.conditionTargetType),params:move.conditionParams,state:rg()};
  if(!condition.check(context))continue;
  context.targets=candidates(move.skillTargetType).filter(w=>Jc.canUseSkill(move.skillId,w.id));
  context.params=move.targetResolverParams;
  const target=resolver.resolve(context);
  if(target!=null)return {move,key,target};
 }
}
function act(){
 if(!config.active||blocked||!rg().inBattle||rg().auto||!Jc.isHeroTurn())return;
 const queued=queue[0];
 const selection=queued?{move:queued,target:queued.targetResolverParams.value}:selectMove(config.moveSets.find(s=>s.id===config.currentMoveSet)||{moves:[]});
 if(!selection)return;
 const {move,key,target}=selection;
 if(target===0){status('Reguła przerwała atak.');return;}
 if(!Jc.canUseSkill(move.skillId,target))return;
 blocked=true;
 try{Jc.useSkill(move.skillId,target);}catch(error){blocked=false;throw error;}
 if(queued){queue.shift();if(config.repeat)queue.push(queued);}
 else{
  for(const key of Object.keys(cooldowns))cooldowns[key]=Math.max(0,cooldowns[key]-1);
  if(move.cooldown)cooldowns[key]=move.cooldown;
  if(move.limit)limits[key]=(limits[key]||0)+1;
 }
 renderQueue();
}
function schedule(){if(pending)return;pending=true;setTimeout(()=>{pending=false;try{act();}catch(error){status('Błąd obsługi walki — szczegóły w konsoli.');console.error('Strategy',error);}},0);}
function receive(packet){
 if(!packet||typeof packet!=='object')return;
 const data=packet.f;
 if(data){
  if(data.init!=null){reset();const mode=Object.values(data.w||{}).some(w=>w.npc)?config.beforePveAction:config.beforePvpAction;if(mode)config.active=mode===1;}
  V.emit('server_f',[data]);
  if(data.m)blocked=false;
  if(data.endBattle){rg().clear();reset();}
  renderQueue();updateActive();schedule();
 }
 if(packet.skill_data)for(const [id,skill] of Object.entries(packet.skill_data))if(skill.attr&1)skills.set(+id,skill.name);
}
function wrap(object,key,after){
 const original=object?.[key];if(typeof original!=='function')return false;
 object[key]=function(...args){const result=original.apply(this,args);try{after(args,result);}catch(error){console.error('Strategy',error);}return result;};return true;
}
function enqueue(skillId,targetId,first){
 const target=rg().warriors[targetId];if(!target)return;
 const type=+targetId===+B.id?0:target.team===rg().hero?.team?1:2;
 const move={skillId,targetName:target.name,skillTargetType:type,targetResolverParams:{value:+targetId}};
 first?queue.unshift(move):queue.push(move);renderQueue();schedule();
}
function hookMenu(){document.addEventListener('contextmenu',event=>{
 const element=event.target.closest?.('.battle-skill,[class*="menu-item-skill-id-"],#hmenu [class*="skill-icon-id-"]');if(!element||!rg().inBattle)return;
 const id=element.getAttribute('battle-skill-id')??element.className.match(/(?:menu-item-skill-id|skill-icon-id)-(-?\d+)/)?.[1];
 let target=window.Engine?.battle?.getMarkObject?.();
 if(target==null){const match=element.parentElement?.getAttribute('onclick')?.match(/id=(-?\d+)/);target=match?+match[1]:B.id;}
 if(id==null)return;event.preventDefault();enqueue(+id,+target,event.altKey);
 },true);}
const icons={gear:'<path d="M9 3h6l1 3 3 1v6l-3 1-1 3H9l-1-3-3-1V7l3-1z"/><circle cx="12" cy="10" r="3"/>',bolt:'<path d="m13 2-8 11h6l-1 9 9-13h-6z"/>'};
const svg=key=>`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${icons[key]}</svg>`;
function node(tag,text,attrs={}){const el=document.createElement(tag);if(text!=null)el.textContent=text;for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);return el;}
function button(text,fn){const el=node('button',text,{type:'button'});el.onclick=fn;return el;}
function field(parent,label,value,change,type='text'){
 const wrap=node('label',label);const input=node('input',null,{type});if(type==='checkbox')input.checked=!!value;else input.value=value??'';
 if(type==='number'){input.min='0';input.step='1';}
 input.onchange=()=>{change(type==='checkbox'?input.checked:type==='number'?Math.max(0,Number(input.value)||0):input.value);save();};wrap.append(input);parent.append(wrap);return input;
}
function choice(parent,label,value,options,change){const wrap=node('label',label),select=node('select',null,{'aria-label':label});for(const option of options)select.append(node('option',option.name,{value:option.id}));select.value=value;select.onchange=()=>{change(select.value);save();};wrap.append(select);parent.append(wrap);return select;}
function updateActive(){if(!root)return;const el=root.querySelector('#active');if(el)el.checked=config.active;}
function fillQueue(list){
 list.replaceChildren();
 queue.forEach((move,index)=>{
  const b=button(`${index+1}. ${skills.get(move.skillId)||'Umiejętność '+move.skillId} → ${move.targetName}`,()=>{});
  b.title='PPM: usuń; Alt+PPM: przesuń na koniec';
  b.oncontextmenu=event=>{event.preventDefault();const [entry]=queue.splice(index,1);if(event.altKey)queue.push(entry);renderQueue();};
  list.append(b);
 });
 if(!queue.length)list.textContent='Planowane ruchy: brak';
}
function clampBattleQueue(){
 if(!battleHost||battleHost.hidden)return;
 const rect=battleHost.getBoundingClientRect();
 config.battleQueueRight=Math.max(0,Math.min(Number(config.battleQueueRight)||0,Math.max(0,innerWidth-rect.width)));
 config.battleQueueTop=Math.max(0,Math.min(Number(config.battleQueueTop)||0,Math.max(0,innerHeight-rect.height)));
 battleHost.style.right=config.battleQueueRight+'px';battleHost.style.top=config.battleQueueTop+'px';
}
function renderBattleQueue(){
 if(!root)return;
 const visible=!!config.showBattleQueue&&rg().inBattle;
 if(!visible){if(battleHost){battleHost.hidden=true;battleHost.style.display='none';}return;}
 if(!battleHost){
  battleHost=node('div',null,{id:'spell-trigger-battle-queue'});
  Object.assign(battleHost.style,{position:'fixed',zIndex:'2147483001'});
  battleRoot=battleHost.attachShadow({mode:'open'});
  const style=root.querySelector('style').cloneNode(true);battleRoot.append(style);
  const panel=node('section',null,{'aria-label':'Kolejka ruchów w walce'}),header=node('header');
  panel.style.width='250px';
  header.append(node('strong','Kolejka ruchów'));
  const main=node('main'),list=node('div',null,{id:'queue','aria-live':'polite'});
  main.append(list);panel.append(header,main);battleRoot.append(panel);document.body.append(battleHost);
  header.onpointerdown=event=>{
   if(event.button!==0)return;
   const x=event.clientX,y=event.clientY,right=config.battleQueueRight,top=config.battleQueueTop;
   header.setPointerCapture(event.pointerId);
   header.onpointermove=e=>{config.battleQueueRight=right+x-e.clientX;config.battleQueueTop=top+e.clientY-y;clampBattleQueue();};
   header.onpointerup=()=>{header.onpointermove=null;save();};
  };
 }
 battleHost.hidden=false;battleHost.style.display='block';fillQueue(battleRoot.querySelector('#queue'));clampBattleQueue();
}
function renderQueue(){
 const list=root?.querySelector('#queue');if(list)fillQueue(list);
 renderBattleQueue();
}
function params(parent,schema,values){for(const param of schema)field(parent,param.label,values[param.key]??param.default,v=>values[param.key]=v,param.type==='switch'?'checkbox':param.type);}
function editMove(set,move){
 const area=root.querySelector('#editor');area.replaceChildren();
 const options=[...skills].map(([id,name])=>({id,name}));if(!skills.has(move.skillId))options.push({id:move.skillId,name:`Umiejętność ${move.skillId}`});
 choice(area,'Umiejętność',move.skillId,options,v=>{move.skillId=+v;editMove(set,move);});
 field(area,'ID umiejętności',move.skillId,v=>move.skillId=v,'text').onchange=event=>{const id=Number(event.target.value);if(Number.isInteger(id)){move.skillId=id;save();}};
 field(area,'Przerwa (własne ruchy)',move.cooldown,v=>move.cooldown=v,'number');field(area,'Limit użyć (0 = bez limitu)',move.limit,v=>move.limit=v,'number');
 const types=[{id:0,name:'Gracz'},{id:1,name:'Sojusznicy'},{id:2,name:'Wrogowie'}];
 choice(area,'Warunek sprawdzaj dla',move.conditionTargetType,types,v=>move.conditionTargetType=+v);
 choice(area,'Warunek',move.conditionId,oT,v=>{move.conditionId=v;move.conditionParams={};editMove(set,move);});
 params(area,oT.find(c=>c.id===move.conditionId)?.paramsSchema||[],move.conditionParams);
 choice(area,'Cel umiejętności',move.skillTargetType,types,v=>move.skillTargetType=+v);
 choice(area,'Wybór celu',move.targetResolverId,sT,v=>{move.targetResolverId=v;move.targetResolverParams={};editMove(set,move);});
 params(area,sT.find(c=>c.id===move.targetResolverId)?.paramsSchema||[],move.targetResolverParams);
 area.append(button('Gotowe',()=>{save();render();}));clamp();
}
function renderSets(parent){
 const set=config.moveSets.find(s=>s.id===config.currentMoveSet);
 parent.append(button('Dodaj zestaw',()=>{const entry={id:crypto.randomUUID(),name:'Nowy zestaw',moves:[]};config.moveSets.push(entry);config.currentMoveSet=entry.id;save();render();}));
 if(!set)return;
 field(parent,'Nazwa zestawu',set.name,v=>{set.name=v;render();});
 parent.append(button('Usuń zestaw',()=>{config.moveSets=config.moveSets.filter(s=>s!==set);config.currentMoveSet='';save();render();}));
 set.moves.forEach((move,index)=>{const row=node('div',null,{class:'row'});row.append(button(`${index+1}. ${skills.get(move.skillId)||move.skillId}`,()=>editMove(set,move)));
 for(const [label,delta] of [['↑',-1],['↓',1]]){const b=button(label,()=>{const next=index+delta;[set.moves[index],set.moves[next]]=[set.moves[next],set.moves[index]];save();render();});b.disabled=index+delta<0||index+delta>=set.moves.length;row.append(b);}
 row.append(button('Usuń',()=>{set.moves.splice(index,1);save();render();}));parent.append(row);});
 parent.append(button('Dodaj ruch',()=>{const move={skillId:-2,cooldown:0,limit:0,conditionId:'none',conditionParams:{},conditionTargetType:0,skillTargetType:0,targetResolverId:'targetPriority',targetResolverParams:{}};set.moves.push(move);save();render();editMove(set,move);}));
 parent.append(node('div',null,{id:'editor'}));
}
function clamp(){if(!host||window.__gogatkiTileDock?.isDocked(host))return;const rect=host.getBoundingClientRect();config.right=Math.max(0,Math.min(Number(config.right)||0,Math.max(0,innerWidth-rect.width)));config.top=Math.max(0,Math.min(Number(config.top)||0,Math.max(0,innerHeight-rect.height)));host.style.right=config.right+'px';host.style.top=config.top+'px';}
function render(){
 host.dataset.compact=String(!!config.minimized);
 root.replaceChildren();const style=node('style');style.textContent=`:host{all:initial;font:12px Arial,sans-serif;color:#c7d0d9}*{box-sizing:border-box}section{width:300px;max-width:100vw;background:#171b20;border:1px solid #668298;border-radius:4px;overflow:hidden}header{height:28px;background:#252b31;display:flex;align-items:center;gap:6px;cursor:move;padding:0 5px;color:#12c9bd;touch-action:none}header strong{flex:1}button,input,select{font:inherit;color:#c7d0d9;border:1px solid #6d879a;border-radius:3px;background:#252b31;min-height:24px}button{background:#38566c;cursor:pointer;padding:3px 6px}button:disabled{cursor:default;color:#b1c0cb}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #12c9bd}header button{display:grid;place-items:center;padding:0;width:24px;height:24px;color:#12c9bd}main{padding:8px;max-height:calc(100vh - 50px);overflow:auto}label{display:flex;align-items:center;justify-content:space-between;gap:6px;margin:6px 0}input,select{min-width:0;width:145px;padding:3px}input[type=checkbox]{appearance:auto;accent-color:#12c9bd;width:14px;height:14px;min-height:14px;margin:0}#queue{display:grid;gap:4px;margin:8px 0;color:#b1c0cb}#queue button{text-align:left}.row{display:flex;gap:3px;margin:5px 0}.row button:first-child{flex:1}#status,p{font-size:11px;color:#b1c0cb}#settings{border-top:1px solid #668298;margin-top:8px;padding-top:6px}`;root.append(style);
 const panel=node('section',null,{class:config.minimized?'panel collapsed':'panel'}),header=node('header');const gear=button('',()=>{if(config.minimized){config.minimized=false;}else settings=!settings;save();render();});gear.innerHTML=svg('bolt');gear.title='LPM: ustawienia; PPM: zwiń';gear.setAttribute('aria-label','Ustawienia Strategy');gear.oncontextmenu=e=>{e.preventDefault();config.minimized=!config.minimized;save();render();};
 if(config.minimized){const size=document.querySelector('#gogatek-panel')?.shadowRoot?.querySelector('.launcher')?.getBoundingClientRect().height||28;panel.style.width=size+'px';header.style.height=(size-2)+'px';header.style.padding='0';header.style.justifyContent='center';header.append(gear);}else{header.append(node('strong','Strategy'),gear);}
 panel.append(header);root.append(panel);
 header.onpointerdown=event=>{if(event.button!==0||event.target.closest('button'))return;const x=event.clientX,y=event.clientY,right=config.right,top=config.top;header.setPointerCapture(event.pointerId);header.onpointermove=e=>{config.right=right+x-e.clientX;config.top=top+e.clientY-y;clamp();};header.onpointerup=()=>{header.onpointermove=null;save();};};
 if(config.minimized){renderQueue();clamp();return;}
 const main=node('main');panel.append(main);
 field(main,'Aktywny',config.active,v=>{config.active=v;schedule();},'checkbox').id='active';
 choice(main,'Zestaw',config.currentMoveSet,[{id:'',name:'Brak'},...config.moveSets],v=>{config.currentMoveSet=v;render();});
 field(main,'Powtarzaj kolejkę',config.repeat,v=>config.repeat=v,'checkbox');
 main.append(button('Wyczyść kolejkę',()=>{queue=[];renderQueue();}),node('div',null,{id:'queue'}),node('p','PPM na umiejętności: dodaj do kolejki. Alt+PPM: dodaj na początek.'),node('p','', {id:'status'}));
 if(settings){const area=node('div',null,{id:'settings'});main.append(area);field(area,'Pokazuj kolejkę w oknie walki',config.showBattleQueue,v=>{config.showBattleQueue=v;renderBattleQueue();},'checkbox');const modes=[{id:0,name:'Nie zmieniaj'},{id:1,name:'Włącz'},{id:2,name:'Wyłącz'}];for(const [key,label] of [['beforePvpAction','Przed PvP'],['beforePveAction','Przed PvE']])choice(area,label,config[key],modes,v=>config[key]=+v);renderSets(area);}
 renderQueue();clamp();
}
function start(){
 if(!B.id||typeof window._g!=='function'||(!window.Engine?.battle&&!window.g?.battle)||typeof (window.Engine?.communication||window).parseJSON!=='function')return false;
 storageKey=`spell-trigger:1:${location.hostname}:${B.id}`;
 try{config={...defaults,...JSON.parse(localStorage.getItem(storageKey)||'{}')};}catch{config=Fc(defaults);}
 if(!Array.isArray(config.moveSets))config.moveSets=[];
 rg().initStore();
 const communication=window.Engine?.communication||window;
 if(!wrap(communication,'parseJSON',args=>receive(args[0]))){console.error('Strategy: brak parseJSON');return false;}
 wrap(window.Engine?.battle||window,'close',()=>{V.emit('battle_close',[]);reset();renderQueue();});
 if(!window.Engine)wrap(window,'battle_close',()=>{V.emit('battle_close',[]);reset();renderQueue();});
 host=node('div',null,{id:'spell-trigger-standalone'});Object.assign(host.style,{position:'fixed',zIndex:'2147483000'});root=host.attachShadow({mode:'open'});document.body.append(host);
 window.SpellTriggerStandalone={version:'1.2.0',conditions:oT,targetResolvers:sT};
 hookMenu();render();addEventListener('resize',()=>{clamp();clampBattleQueue();save();});
 if(Jc.inBattle)status('Uruchomiono podczas walki. Pełny stan będzie dostępny od następnej walki.');
 return true;
}
let attempts=0;const timer=setInterval(()=>{if(start()||++attempts>=120)clearInterval(timer);},500);
})();
