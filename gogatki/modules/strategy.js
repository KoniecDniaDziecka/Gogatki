// Strategy 2.0.0 — battle queue inspired by Spell Trigger (Maddonz, Barlag).
GogatkiRuntime.register({
 id:'strategy',name:'Strategy',description:'Kolejka ruchów z ikonami, wykonywana w Twojej turze.',
 start(){
  const window=unsafeWindow;
  (()=>{
   'use strict';
   if(window.top!==window.self||window.SpellTriggerStandalone)return;
   const KEY='strategy:global:v1';
   const defaults={paused:false,showBattleQueue:true,minimized:false,right:20,top:140,battleQueueRight:290,battleQueueTop:140};
   const state={inBattle:false,auto:false,current:null,currentKnown:false,warriors:{},turn:0,usedTurn:-1,domTurn:false};
   const skills=new Map([[-1,{name:'Zwykły atak'}],[-2,{name:'Krok'}]]);
   const cleanups=[];let config,host,root,battleHost,battleRoot,queue=[],pending=null,disposed=false,started=false,optionsOpen=false,scheduled=false,sequence=0,awaitingTurn=false,lastStatus='Dodaj ruchy PPM na umiejętnościach.';
   const engine=()=>window.Engine?.hero?.d?window.Engine:null;
   const hero=()=>engine()?.hero.d||window.hero;
   const clone=value=>JSON.parse(JSON.stringify(value));
   function record(value){if(typeof value==='string'){try{value=JSON.parse(value);}catch{return null;}}return value&&typeof value==='object'&&!Array.isArray(value)?value:null;}
   function save(){try{GM_setValue(KEY,clone(config));}catch{status('Nie udało się zapisać ustawień.');}}
   function status(text){lastStatus=text;for(const view of [root,battleRoot]){const line=view?.querySelector('[role=status]');if(line)line.textContent=text;}}
   function nativeWarrior(id){return engine()?.battle?.warriorsList?.[id]||window.g?.battle?.f?.[id];}
   function warrior(id){const native=nativeWarrior(id),stored=state.warriors[String(id)];return native||stored?{...stored,...(native?.d||native)}:null;}
   function skill(id){return engine()?.battle?.getBattleSkill?.(id)||window.g?.battle?.skills?.[id]||skills.get(id);}
   function alive(target){return !!target&&Number(target.hp?.hpp??target.hpp??1)>0;}
   function domHeroTurn(){
    const own=nativeWarrior(hero()?.id);
    try{if(own?.$?.find?.('.current-arrow')?.length)return true;}catch{}
    const node=document.getElementById('troop'+hero()?.id);
    return !!node?.querySelector('.current-arrow,.current-player');
   }
   function ownTurn(){
    if(state.currentKnown)return String(state.current)===String(hero()?.id);
    const current=domHeroTurn();if(current&&!state.domTurn){state.turn++;awaitingTurn=false;}state.domTurn=current;return current;
   }
   function resetBattle(){state.inBattle=false;state.current=null;state.currentKnown=false;state.auto=false;state.warriors={};state.turn++;state.usedTurn=-1;state.domTurn=false;queue=[];pending=null;awaitingTurn=false;renderQueue();}
   function errorText(data){const detail=data?.error||data?.alert||data?.warning||(data?.e==='error'?'Gra odrzuciła ruch.':null);return detail?typeof detail==='string'?detail:JSON.stringify(detail):'';}
   function rejectMove(entry,text){if(pending!==entry)return;pending=null;state.usedTurn=-1;config.paused=true;save();renderPause();status(text+' Ruch pozostaje w kolejce.');}
   function confirmMove(entry){
    if(pending!==entry)return;
    const index=queue.findIndex(move=>move.uid===entry.move.uid);if(index>=0)queue.splice(index,1);
    pending=null;awaitingTurn=true;renderQueue();
   }
   function receive(packet){
    if(!packet||disposed)return;
    const error=errorText(packet);if(error&&pending)rejectMove(pending,error);
    if(packet.skill_data)for(const [id,data] of Object.entries(packet.skill_data))skills.set(Number(id),{...skills.get(Number(id)),...data});
    if(packet.town){resetBattle();status('Zmiana mapy — kolejka wyczyszczona.');return;}
    const f=packet.f;if(!f)return;
    if(f.endBattle){resetBattle();status('Koniec walki — kolejka wyczyszczona.');return;}
    if(f.init!=null){resetBattle();state.inBattle=true;}
    if(!state.inBattle)return;
    if(f.auto!=null)state.auto=f.auto===true||String(f.auto)==='1';
    if(f.myteam!=null)state.myteam=f.myteam;
    for(const [id,data] of Object.entries(f.w||{}))state.warriors[id]={...state.warriors[id],...data};
    const before=state.current;
    const ownAction=Array.isArray(f.m)&&f.m.some(line=>typeof line==='string'&&Number(line.split(';')[0].split('=')[0])===Number(hero()?.id));
    const changed=f.current!=null&&String(f.current)!==String(before);
    if(pending&&(ownAction||changed))confirmMove(pending);
    if(f.current!=null){
     state.currentKnown=true;state.current=f.current;
     if(changed||(awaitingTurn&&String(f.current)===String(hero()?.id))){state.turn++;awaitingTurn=false;}
    }
    renderQueue();schedule();
   }
   function wrapParser(owner,key){
    const original=owner?.[key];if(typeof original!=='function')return false;
    function wrapped(...args){
     let packet=null;
     if(!disposed){try{const data=args[0];packet=data&&typeof data==='object'?{f:data.f?clone(data.f):null,skill_data:data.skill_data?clone(data.skill_data):null,town:data.town,error:data.error,alert:data.alert,warning:data.warning,e:data.e}:null;}catch(error){console.warn('[Strategy] Dane walki:',error);}}
     const result=original.apply(this,args);
     if(!disposed){try{receive(packet);}catch(error){console.error('[Strategy]',error);status('Nie udało się odczytać stanu walki.');}}
     return result;
    }
    owner[key]=wrapped;cleanups.push(()=>{if(owner[key]===wrapped)owner[key]=original;});return true;
   }
   function command(move){return move.skillId===-1?'fight&a=strike&id='+encodeURIComponent(move.targetId):move.skillId===-2?'fight&a=move':'fight&a=spell&s='+encodeURIComponent(move.skillId)+'&id='+encodeURIComponent(move.targetId);}
   function unavailable(move){
    const self=warrior(hero()?.id),target=warrior(move.targetId);
    if(!alive(self))return 'Brak gotowej postaci w walce.';
    if(move.skillId===-2){return ['w','p','b'].includes(self.prof)&&Number(self.y)!==4?'':'Nie można teraz wykonać kroku.';}
    if(!alive(target))return 'Cel ruchu nie jest już dostępny — usuń go PPM.';
    const mine=String(self.team)===String(target.team),isSelf=String(move.targetId)===String(hero()?.id);
    const distant=['w','p','b'].includes(self.prof)&&Number(target.y)-Number(self.y)>=2;
    if(move.skillId===-1)return !mine&&!distant?'':'Cel zwykłego ataku jest poza zasięgiem.';
    const info=skill(move.skillId);if(!info)return 'Oczekiwanie na dane umiejętności.';
    if(info.disabled===true||Number(info.disabled)===1)return 'Umiejętność jest chwilowo niedostępna.';
    if(info.attr!=null){const attr=Number(info.attr),valid=(attr&8)&&isSelf||(attr&16)&&mine&&!isSelf||!(attr&24)&&!mine;if(!valid)return 'Umiejętność nie pasuje do wybranego celu.';if(distant&&(attr&2))return 'Cel umiejętności jest poza zasięgiem.';}
    const cooldown=self.cooldowns?.find?.(row=>Number(row[0])===move.skillId);if(cooldown&&Number(cooldown[1])>0)return 'Umiejętność czeka na odnowienie.';
    const override=self.doublecastcost;const cost=Array.isArray(override)&&Number(override[0])===move.skillId?override[1]:info.cost;
    if(cost){const amount=parseInt(cost,10),pool=String(cost).endsWith('m')?self.mana:self.energy;if(Number.isFinite(amount)&&Number(pool)<amount)return 'Brakuje many lub energii.';}
    return '';
   }
   function act(){
    if(disposed||!started||config.paused||!queue.length||!state.inBattle||state.auto||pending||!ownTurn()||state.usedTurn===state.turn)return;
    const move=queue[0],reason=unavailable(move);if(reason){status(reason);return;}
    const entry={move,sent:Date.now()};pending=entry;state.usedTurn=state.turn;status('Wykonywanie: '+move.name);
    try{window._g(command(move),data=>{
     if(disposed||pending!==entry)return;const error=errorText(data);if(error){rejectMove(entry,error);return;}
     // Only the server's action log or turn change confirms a queued move.
    });}catch(error){rejectMove(entry,error.message||String(error));}
   }
   function schedule(){if(scheduled||disposed)return;scheduled=true;setTimeout(()=>{scheduled=false;try{act();}catch(error){console.error('[Strategy]',error);status('Nie udało się wykonać ruchu.');}},0);}
   function inspectIcon(element){
    if(!element)return null;
    const image=element.matches?.('img')?element:element.querySelector?.('img');if(image?.src)return {src:image.src};
    const candidates=[...element.querySelectorAll?.('.skill-icon,.skillbox_icon,[class*="icon-"]')||[],element];
    for(const candidate of candidates)for(const pseudo of [null,'::before']){const css=window.getComputedStyle(candidate,pseudo);if(css.backgroundImage&&css.backgroundImage!=='none')return {backgroundImage:css.backgroundImage,backgroundPosition:css.backgroundPosition,backgroundSize:css.backgroundSize,backgroundRepeat:css.backgroundRepeat};}
    return null;
   }
   function gameIcon(id,element){
    const existing=inspectIcon(element);if(existing)return existing;
    // Maddonz's MargoSkill uses these exact native sprite classes.
    const probe=document.createElement('div');probe.className=`pl icon-${id} skillbox_icon skill-icon-${id} skill-icon`;probe.style.cssText='position:fixed;left:-10000px;top:-10000px;visibility:hidden;pointer-events:none';document.body.append(probe);
    try{return inspectIcon(probe);}finally{probe.remove();}
   }
   function addMove(skillId,targetId,first=false,element=null){
    if(!state.inBattle)return;skillId=Number(skillId);targetId=Number(targetId);
    if(!Number.isInteger(skillId)||!Number.isFinite(targetId))return;
    if(skillId===-2)targetId=Number(hero()?.id);
    const target=warrior(targetId);if(!target){status('Wskaż cel umiejętności w oknie walki.');return;}
    const info=skill(skillId)||{},name=info.name||info.txt||element?.getAttribute('title')||skills.get(skillId)?.name||'Umiejętność '+skillId;
    const move={uid:++sequence,skillId,targetId,targetName:target.name||target.nick||String(targetId),name,icon:gameIcon(skillId,element)};
    first?queue.unshift(move):queue.push(move);renderQueue();status('Dodano: '+name);schedule();
   }
   function targetOf(element){
    const marked=engine()?.battle?.getMarkObject?.();if(marked!=null)return typeof marked==='object'?marked.id??marked.d?.id:marked;
    const command=element.closest?.('[onclick]')?.getAttribute('onclick');const match=command?.match(/(?:[?&]|\b)id=(-?\d+)/);if(match)return Number(match[1]);
    return hero()?.id;
   }
   function contextMenu(event){
    if(disposed||!state.inBattle)return;
    const element=event.target.closest?.('.battle-skill,[class*="menu-item-skill-id-"],#hmenu [class*="skill-icon-id-"]');if(!element)return;
    const id=element.getAttribute('battle-skill-id')??element.className.match(/(?:menu-item-skill-id|skill-icon-id)-(-?\d+)/)?.[1];if(id==null)return;
    event.preventDefault();event.stopPropagation();addMove(id,targetOf(element),event.altKey,element);
   }
   const bolt='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m13 2-8 11h6l-1 9 9-13h-6z"/></svg>';
   const css=`:host{all:initial;font:12px Arial,sans-serif;color:#c7d0d9}:host([hidden]){display:none!important}*{box-sizing:border-box}section{width:250px;max-width:100vw;background:#171b20;border:1px solid #668298;border-radius:4px;overflow:hidden}header{height:28px;background:#252b31;display:flex;align-items:center;gap:6px;padding:0 5px;color:#12c9bd;cursor:move;touch-action:none}header strong{flex:1}button,input{font:inherit;color:#c7d0d9}button{background:#38566c;border:1px solid #6d879a;border-radius:3px;padding:4px 7px;cursor:pointer}button:focus-visible,input:focus-visible{outline:2px solid #12c9bd}header button{display:grid;place-items:center;padding:0;width:24px;height:24px;color:#12c9bd;background:#252b31}main{padding:8px}.toolbar{display:flex;gap:5px;margin-bottom:8px}.toolbar button{flex:1}.queue{display:grid;gap:5px;max-height:240px;overflow:auto;scrollbar-width:thin;scrollbar-color:#668298 #171b20}.move{display:flex;align-items:center;gap:7px;text-align:left;padding:5px;background:#252b31;border-color:#668298;width:100%;min-width:0}.number{color:#12c9bd;flex:none;width:14px;text-align:center}.skill-icon{display:block;width:32px;height:32px;flex:none;background-repeat:no-repeat}.skill-icon img{width:100%;height:100%;object-fit:contain}.skill-icon svg{width:32px;height:32px;display:block}.names{min-width:0;overflow-wrap:anywhere}.names strong{display:block;font-size:11px;color:#12c9bd;margin-bottom:3px}.names small{font-size:11px;color:#c7d0d9}p,.empty{font-size:11px;line-height:1.4;color:#b1c0cb;margin:7px 0}label{display:flex;align-items:center;gap:6px;font-size:11px;margin:8px 0}input{appearance:none;display:grid;place-content:center;width:14px;height:14px;flex:none;margin:0;border:1px solid #668298;border-radius:3px;background:#252b31}input:checked:after{content:'✓';color:#12c9bd}[hidden]{display:none!important}.collapsed{width:28px;height:28px}.collapsed header{height:100%;padding:0;justify-content:center}.collapsed header strong,.collapsed main{display:none}.collapsed header button{width:100%;height:100%;border:0}`;
   function node(tag,text,attrs={}){const el=document.createElement(tag);if(text!=null)el.textContent=text;for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);return el;}
   function fillQueue(view){
    const list=view.querySelector('.queue');list.replaceChildren();
    if(!queue.length){list.append(node('div','Planowane ruchy: brak',{class:'empty'}));return;}
    queue.forEach((move,index)=>{
     const row=node('button',null,{type:'button',class:'move',title:move.name+' → '+move.targetName+'. PPM: usuń; Alt+PPM: na koniec.'});row.dataset.moveId=move.uid;
     const icon=node('span',null,{class:`skill-icon pl icon-${move.skillId} skillbox_icon skill-icon-${move.skillId}`});
     if(move.icon?.src)icon.append(node('img',null,{src:move.icon.src,alt:move.name}));
     else if(move.icon)Object.assign(icon.style,move.icon);
     else icon.innerHTML='<svg viewBox="0 0 32 32" fill="none" stroke="#12c9bd" stroke-width="2" aria-hidden="true">'+(move.skillId===-2?'<path d="m8 8 4-4 6 8-5 5-5-9ZM15 22l5-5 7 5-4 5-8-5Z"/>':'<path d="m8 26 17-20 2 2-17 20M5 19l9 8M7 25l-3 4"/>')+'</svg>';
     const names=node('span',null,{class:'names'});names.append(node('strong',move.name),node('small',move.targetName));row.append(node('span',String(index+1),{class:'number'}),icon,names);
     row.oncontextmenu=event=>{event.preventDefault();event.stopPropagation();if(pending?.move.uid===move.uid){status('Ten ruch jest właśnie wykonywany.');return;}const at=queue.findIndex(item=>item.uid===move.uid);if(at<0)return;const [removed]=queue.splice(at,1);if(event.altKey)queue.push(removed);renderQueue();schedule();};list.append(row);
    });
   }
   function renderPause(){for(const view of [root,battleRoot]){const button=view?.querySelector('[data-pause]');if(button){button.textContent=config.paused?'Wznów':'Pauza';button.setAttribute('aria-pressed',String(config.paused));}}}
   function renderQueue(){for(const view of [root,battleRoot])if(view){fillQueue(view);const line=view.querySelector('[role=status]');if(line)line.textContent=lastStatus;}renderBattleQueue();}
   function clearQueue(){queue=pending?queue.filter(move=>move.uid===pending.move.uid):[];renderQueue();status(pending?'Kończę wysłany ruch; reszta kolejki wyczyszczona.':'Kolejka wyczyszczona.');}
   function addContent(view){
    const main=node('main'),toolbar=node('div',null,{class:'toolbar'}),pause=node('button',null,{type:'button','data-pause':''}),clear=node('button','Wyczyść',{type:'button'});
    pause.onclick=()=>{config.paused=!config.paused;save();renderPause();status(config.paused?'Kolejka wstrzymana.':'Kolejka wznowiona.');schedule();};clear.onclick=clearQueue;toolbar.append(pause,clear);main.append(toolbar,node('div',null,{class:'queue','aria-label':'Kolejka ruchów'}),node('p','PPM na umiejętności: dodaj ruch. Alt+PPM: dodaj na początek.'),node('p',lastStatus,{role:'status'}));view.querySelector('section').append(main);return main;
   }
   function dragHandle(header,object,rightKey,topKey,place){header.onpointerdown=event=>{if(event.button!==0||event.target.closest('button'))return;const x=event.clientX,y=event.clientY,right=object[rightKey],top=object[topKey];header.setPointerCapture(event.pointerId);header.onpointermove=e=>{object[rightKey]=right+x-e.clientX;object[topKey]=top+e.clientY-y;place();};header.onpointerup=header.onpointercancel=()=>{header.onpointermove=null;save();};};}
   function placeHost(element,rightKey,topKey){if(!element||window.__gogatkiTileDock?.isDocked(element))return;const rect=element.getBoundingClientRect();config[rightKey]=Math.max(0,Math.min(Number(config[rightKey])||0,Math.max(0,innerWidth-rect.width)));config[topKey]=Math.max(0,Math.min(Number(config[topKey])||0,Math.max(0,innerHeight-rect.height)));element.style.right=config[rightKey]+'px';element.style.top=config[topKey]+'px';}
   function renderBattleQueue(){
    if(!root)return;
    if(!config.showBattleQueue||!state.inBattle){if(battleHost)battleHost.hidden=true;return;}
    if(!battleHost){battleHost=node('div',null,{id:'spell-trigger-battle-queue'});battleHost.style.cssText='position:fixed;z-index:2147483001';battleRoot=battleHost.attachShadow({mode:'open'});battleRoot.innerHTML='<style>'+css+'</style><section aria-label="Kolejka ruchów w walce"><header><strong>Kolejka ruchów</strong></header></section>';addContent(battleRoot);document.body.append(battleHost);dragHandle(battleRoot.querySelector('header'),config,'battleQueueRight','battleQueueTop',()=>placeHost(battleHost,'battleQueueRight','battleQueueTop'));}
    battleHost.hidden=false;fillQueue(battleRoot);renderPause();placeHost(battleHost,'battleQueueRight','battleQueueTop');
   }
   function render(){
    root.innerHTML='<style>'+css+'</style><section class="panel'+(config.minimized?' collapsed':'')+'"><header><strong>Strategy</strong></header></section>';
    host.dataset.compact=String(config.minimized);
    const header=root.querySelector('header'),control=node('button',null,{type:'button','aria-label':'Ustawienia Strategy',title:'LPM: opcje; PPM: zwiń'});control.innerHTML=bolt;
    control.onclick=()=>{if(config.minimized)config.minimized=false;else optionsOpen=!optionsOpen;save();render();};control.oncontextmenu=event=>{event.preventDefault();config.minimized=!config.minimized;save();render();};header.append(control);
    const main=addContent(root);const options=node('div',null,{id:'settings'});options.hidden=!optionsOpen;const label=node('label','Pokazuj kolejkę w oknie walki'),input=node('input',null,{type:'checkbox'});input.checked=config.showBattleQueue;input.onchange=()=>{config.showBattleQueue=input.checked;save();renderBattleQueue();};label.append(input);options.append(label);main.append(options);
    dragHandle(header,config,'right','top',()=>placeHost(host,'right','top'));renderPause();renderQueue();placeHost(host,'right','top');
   }
   function start(){
    const current=engine(),owner=current?.communication||window,parser=current?'parseJSON':typeof window.parseInput==='function'?'parseInput':'parseJSON';
    if(!document.body||!hero()?.id||typeof window._g!=='function'||typeof owner?.[parser]!=='function')return;
    const legacy=`spell-trigger:1:${location.hostname}:${hero().id}`;
    let stored={};try{stored=record(GM_getValue(KEY,null))??record(GM_getValue(legacy,null))??record(localStorage.getItem(legacy))??{};}catch{}
    config={...defaults};for(const key of Object.keys(defaults))if(typeof stored[key]===typeof defaults[key])config[key]=stored[key];
    host=node('div',null,{id:'spell-trigger-standalone'});host.style.cssText='position:fixed;z-index:2147483000';root=host.attachShadow({mode:'open'});document.body.append(host);
    if(!wrapParser(owner,parser))return;
    const battle=current?.battle;if(typeof battle?.close==='function'){const original=battle.close;function wrapped(...args){const result=original.apply(this,args);resetBattle();return result;}battle.close=wrapped;cleanups.push(()=>{if(battle.close===wrapped)battle.close=original;});}
    if(!current&&typeof window.battle_close==='function'){const original=window.battle_close;function wrapped(...args){const result=original.apply(this,args);resetBattle();return result;}window.battle_close=wrapped;cleanups.push(()=>{if(window.battle_close===wrapped)window.battle_close=original;});}
    document.addEventListener('contextmenu',contextMenu,true);cleanups.push(()=>document.removeEventListener('contextmenu',contextMenu,true));
    const resize=()=>{placeHost(host,'right','top');placeHost(battleHost,'battleQueueRight','battleQueueTop');save();};window.addEventListener('resize',resize);cleanups.push(()=>window.removeEventListener('resize',resize));
    started=true;save();render();
    const initial=current?.battle?.warriorsList||window.g?.battle?.f;if(initial&&Object.keys(initial).length&&((current?.lock||window.g?.lock)?.check?.('battle')))receive({f:{init:1,w:Object.fromEntries(Object.entries(initial).map(([id,value])=>[id,{...(value.d||value)}]))}});
    window.SpellTriggerStandalone={version:'2.0.0',enqueue:addMove,clear:clearQueue,get queue(){return queue.map(move=>({...move}));},destroy};
   }
   function pulse(){
    if(disposed)return;
    if(!started){start();return;}
    if(!state.inBattle)return;
    if(!state.currentKnown)ownTurn();
    if(pending&&Date.now()-pending.sent>15000){rejectMove(pending,'Brak potwierdzenia z gry.');}
    schedule();
   }
   function destroy(){if(disposed)return;disposed=true;clearInterval(timer);for(const remove of cleanups.reverse())remove();queue=[];pending=null;host?.remove();battleHost?.remove();delete window.SpellTriggerStandalone;}
   const timer=setInterval(pulse,100);const hide=()=>destroy();window.addEventListener('pagehide',hide,{once:true});cleanups.push(()=>window.removeEventListener('pagehide',hide));pulse();
  })();
 }
});
