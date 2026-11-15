// Zestaw pod przeciwnika 1.0.5 — integracja z Gogatkami.
(() => {
'use strict';
const PROFESSIONS = {w:'Wojownik',p:'Paladyn',b:'Tancerz ostrzy',m:'Mag',t:'Tropiciel',h:'Łowca'};
const BOSS_LOCATIONS = [{"kind": "tytan", "name": "Dziewicza Orlica", "level": 51, "map": "Migotliwa Pieczara", "vestibule": "Mroczna Pieczara p.0", "source": "https://margohelp.pl/mob/29", "mapId": 1800, "mapSource": "https://www.margoworld.pl/world/view/1800/migotliwa-pieczara", "vestibuleId": 189, "vestibuleSource": "https://www.margoworld.pl/world/view/189/mroczna-pieczara-p0"}, {"kind": "tytan", "name": "Zabójczy Królik", "level": 70, "map": "Grota Caerbannoga - leże bestii", "vestibule": "Grota Caerbannoga", "source": "https://margohelp.pl/mob/38", "mapId": 1745, "mapSource": "https://www.margoworld.pl/world/view/1745/grota-caerbannoga-leze-bestii", "vestibuleId": 1746, "vestibuleSource": "https://www.margoworld.pl/world/view/1746/grota-caerbannoga"}, {"kind": "tytan", "name": "Renegat Baulus", "level": 101, "map": "Bandyckie Chowisko - skarbiec", "vestibule": "Bandyckie Chowisko", "source": "https://margohelp.pl/mob/39", "mapId": 6950, "mapSource": "https://www.margoworld.pl/world/view/6950/bandyckie-chowisko-skarbiec", "vestibuleId": 6949, "vestibuleSource": "https://www.margoworld.pl/world/view/6949/bandyckie-chowisko"}, {"kind": "tytan", "name": "Piekielny Arcymag", "level": 131, "map": "Wulkan Politraki - Piekielne Czeluście", "vestibule": "Wulkan Politraki - przedsionek", "source": "https://margohelp.pl/mob/40", "mapId": 7061, "mapSource": "https://www.margoworld.pl/world/view/7061/wulkan-politraki-piekielne-czeluscie", "vestibuleId": 7060, "vestibuleSource": "https://www.margoworld.pl/world/view/7060/wulkan-politraki-przedsionek"}, {"kind": "tytan", "name": "Versus Zoons", "level": 154, "map": "Lokum Złych Goblinów - pracownia", "vestibule": "Lokum Złych Goblinów p.4", "source": "https://margohelp.pl/mob/41", "mapId": 7478, "mapSource": "https://www.margoworld.pl/world/view/7478/lokum-zlych-goblinow-pracownia", "vestibuleId": 7477, "vestibuleSource": "https://www.margoworld.pl/world/view/7477/lokum-zlych-goblinow-p4"}, {"kind": "tytan", "name": "Łowczyni Wspomnień", "level": 177, "map": "Źródło Wspomnień", "vestibule": "Jaskinia Ulotnych Wspomnień", "source": "https://margohelp.pl/mob/42", "mapId": 6058, "mapSource": "https://www.margoworld.pl/world/view/6058/zrodlo-wspomnien", "vestibuleId": 6477, "vestibuleSource": "https://www.margoworld.pl/world/view/6477/jaskinia-ulotnych-wspomnien"}, {"kind": "tytan", "name": "Przyzywacz Demonów", "level": 204, "map": "Komnata Krwawych Obrzędów", "vestibule": "Korytarz Ostatnich Nadziei", "source": "https://margohelp.pl/mob/43", "mapId": 5947, "mapSource": "https://www.margoworld.pl/world/view/5947/komnata-krwawych-obrzedow", "vestibuleId": 5946, "vestibuleSource": "https://www.margoworld.pl/world/view/5946/korytarz-ostatnich-nadziei"}, {"kind": "tytan", "name": "Maddok Magua", "level": 231, "map": "Nora Jaszczurzych Koszmarów - źródło", "vestibule": "Nora Jaszczurzych Koszmarów p.1 - sala 2", "source": "https://margohelp.pl/mob/44", "mapId": 7849, "mapSource": "https://www.margoworld.pl/world/view/7849/nora-jaszczurzych-koszmarow-zrodlo", "vestibuleId": 7848, "vestibuleSource": "https://www.margoworld.pl/world/view/7848/nora-jaszczurzych-koszmarow-p1-sala-2"}, {"kind": "tytan", "name": "Tezcatlipoca", "level": 258, "map": "Teotihuacan", "vestibule": "Teotihuacan - przedsionek", "source": "https://margohelp.pl/mob/45", "mapId": 5710, "mapSource": "https://www.margoworld.pl/world/view/5710/teotihuacan", "vestibuleId": 5709, "vestibuleSource": "https://www.margoworld.pl/world/view/5709/teotihuacan-przedsionek"}, {"kind": "tytan", "name": "Barbatos Smoczy Strażnik", "level": 285, "map": "Sala Zrujnowanej Świątyni", "vestibule": "Sekretne Przejście Kapłanów", "source": "https://margohelp.pl/mob/276", "mapId": 3313, "mapSource": "https://www.margoworld.pl/world/view/3313/sala-zrujnowanej-swiatyni", "vestibuleId": 3312, "vestibuleSource": "https://www.margoworld.pl/world/view/3312/sekretne-przejscie-kaplanow"}, {"kind": "tytan", "name": "Tanroth", "level": 300, "map": "Sala Tronowa", "vestibule": "Przejście Władców Mrozu", "source": "https://margohelp.pl/mob/46", "mapId": 2758, "mapSource": "https://www.margoworld.pl/world/view/2758/sala-tronowa", "vestibuleId": 2355, "vestibuleSource": "https://www.margoworld.pl/world/view/2355/przejscie-wladcow-mrozu"}, {"kind": "kolos", "name": "Mamlambo", "level": 36, "map": "Świątynia Mzintlavy", "vestibule": "Pradawne Wzgórze Przodków", "source": "https://margoworld.pl/npc/view/322898/swiatynia-mzintlavy-0lvl", "mapId": 3370, "mapSource": "https://www.margoworld.pl/world/view/3370/swiatynia-mzintlavy", "vestibuleId": 3361, "vestibuleSource": "https://www.margoworld.pl/world/view/3361/pradawne-wzgorze-przodkow"}, {"kind": "kolos", "name": "Regulus Mętnooki", "level": 63, "map": "Pieczara Szaleńców - sala Regulusa Mętnookiego", "vestibule": "Pieczara Szaleńców - przedsionek", "source": "https://margohelp.pl/mob/32", "mapId": 3884, "mapSource": "https://www.margoworld.pl/world/view/3884/pieczara-szalencow-sala-regulusa-metnookiego", "vestibuleId": 3883, "vestibuleSource": "https://www.margoworld.pl/world/view/3883/pieczara-szalencow-przedsionek"}, {"kind": "kolos", "name": "Amaimon Soploręki", "level": 83, "map": "Zmarzlina Amaimona Soplorękiego - sala", "vestibule": "Zmarzlina Amaimona Soplorękiego - przedsionek", "source": "https://margohelp.pl/mob/34", "mapId": 4047, "mapSource": "https://www.margoworld.pl/world/view/4047/zmarzlina-amaimona-soplorekiego-sala", "vestibuleId": 4046, "vestibuleSource": "https://www.margoworld.pl/world/view/4046/zmarzlina-amaimona-soplorekiego-przedsionek"}, {"kind": "kolos", "name": "Umibozu", "level": 114, "map": "Głębia Przeklętych Fal - sala", "vestibule": "Głębia Przeklętych Fal - przedsionek", "source": "https://margohelp.pl/mob/33", "mapId": 7354, "mapSource": "https://www.margoworld.pl/world/view/7354/glebia-przekletych-fal-sala", "vestibuleId": 7353, "vestibuleSource": "https://www.margoworld.pl/world/view/7353/glebia-przekletych-fal-przedsionek"}, {"kind": "kolos", "name": "Vashkar", "level": 144, "map": "Przepaść Zadumy - sala", "vestibule": "Przepaść Zadumy - przedsionek", "source": "https://margohelp.pl/mob/36", "mapId": 4162, "mapSource": "https://www.margoworld.pl/world/view/4162/przepasc-zadumy-sala", "vestibuleId": 4161, "vestibuleSource": "https://www.margoworld.pl/world/view/4161/przepasc-zadumy-przedsionek"}, {"kind": "kolos", "name": "Hydrokora Chimeryczna", "level": 167, "map": "Czeluść Chimerycznej Natury - sala", "vestibule": "Czeluść Chimerycznej Natury - przedsionek", "source": "https://margohelp.pl/mob/35", "mapId": 4067, "mapSource": "https://www.margoworld.pl/world/view/4067/czelusc-chimerycznej-natury-sala", "vestibuleId": 4066, "vestibuleSource": "https://www.margoworld.pl/world/view/4066/czelusc-chimerycznej-natury-przedsionek"}, {"kind": "kolos", "name": "Lulukav", "level": 190, "map": "Grobowiec Przeklętego Krakania - sala", "vestibule": "Grobowiec Przeklętego Krakania - przedsionek", "source": "https://margohelp.pl/mob/37", "mapId": 4197, "mapSource": "https://www.margoworld.pl/world/view/4197/grobowiec-przekletego-krakania-sala", "vestibuleId": 4196, "vestibuleSource": "https://www.margoworld.pl/world/view/4196/grobowiec-przekletego-krakania-przedsionek"}, {"kind": "kolos", "name": "Arachin Podstępny", "level": 213, "map": "Grota Przebiegłego Tkacza - sala", "vestibule": "Grota Przebiegłego Tkacza - przedsionek", "source": "https://margohelp.pl/mob/125", "mapId": 4207, "mapSource": "https://www.margoworld.pl/world/view/4207/grota-przebieglego-tkacza-sala", "vestibuleId": 4206, "vestibuleSource": "https://www.margoworld.pl/world/view/4206/grota-przebieglego-tkacza-przedsionek"}, {"kind": "kolos", "name": "Reuzen", "level": 244, "map": "Grota Martwodrzewów - sala", "vestibule": "Grota Martwodrzewów - przedsionek", "source": "https://margohelp.pl/mob/132", "mapId": 4267, "mapSource": "https://www.margoworld.pl/world/view/4267/grota-martwodrzewow-sala", "vestibuleId": 4266, "vestibuleSource": "https://www.margoworld.pl/world/view/4266/grota-martwodrzewow-przedsionek"}, {"kind": "kolos", "name": "Wernoradzki Drakolisz", "level": 279, "map": "Katakumby Antycznego Gniewu - sala", "vestibule": "Katakumby Antycznego Gniewu - przedsionek", "source": "https://margohelp.pl/mob/134", "mapId": 4269, "mapSource": "https://www.margoworld.pl/world/view/4269/katakumby-antycznego-gniewu-sala", "vestibuleId": 4268, "vestibuleSource": "https://www.margoworld.pl/world/view/4268/katakumby-antycznego-gniewu-przedsionek"}];
const bossMapIds=new Set(BOSS_LOCATIONS.flatMap(b=>[b.mapId,b.vestibuleId]));
function blockedBossMap(mapId){
  return mapId!=null && /^\d+$/.test(String(mapId)) && bossMapIds.has(Number(mapId));
}

function environment(w,capture){
  const current=w.Engine?.map?.d || {};
  const town=capture.town;
  const mismatched=town?.id!=null && current.id!=null && String(town.id)!==String(current.id);
  const map=mismatched ? {} : {...current,...town};
  const party=capture.partyKnown ? capture.party : w.Engine?.party;
  return {id:map.id??null,pvp:map.pvp==null?null:Number(map.pvp),name:map.name || '',inGroup:!!party};
}
function pauseReason(config,env){
  if(env.pvp!==2)return 'Zmiana wstrzymana — mapa nie jest aktualnie czerwona.';
  if(config.skipInGroup && env.inGroup)return 'Zmiana wstrzymana — jesteś w grupie.';
  if(config.skipBossMaps && env.id==null)return 'Zmiana wstrzymana — oczekiwanie na ID mapy.';
  if(config.skipBossMaps && blockedBossMap(env.id))return 'Zmiana wstrzymana — mapa bossa lub jego przedsionek.';
  return '';
}
function protectedPlayer(p, hero) {
  const clanId = c => typeof c === 'object' ? c?.id : c;
  const own = clanId(hero.clan), other = clanId(p.clan);
  return [2,4,5,7].includes(Number(p.relation)) || !!(own && other && String(own) === String(other));
}
function nearby(players, hero, radius, strangersAreEnemies = true) {
  if (![hero.x,hero.y].every(v => v != null && Number.isFinite(Number(v)))) return [];
  return players.filter(p => p && String(p.id) !== String(hero.id) && !protectedPlayer(p,hero) &&
    ([3,6,8].includes(Number(p.relation)) || (strangersAreEnemies && Number(p.relation) === 1)) && PROFESSIONS[p.prof] &&
    [p.x,p.y].every(v => v != null && Number.isFinite(Number(v))))
    .map(p => ({...p,distance:Math.max(Math.abs(Number(p.x)-Number(hero.x)),Math.abs(Number(p.y)-Number(hero.y)))}))
    .filter(p => p.distance <= (typeof radius === 'function' ? radius(p,hero) : radius)).sort((a,b) => a.distance-b.distance || String(a.id).localeCompare(String(b.id)));
}
// Fixed symmetric grid range: 5 on an axis, 4 when both axes differ.
function directionalRange(player, hero) {
  return Number(player.x)!==Number(hero.x) && Number(player.y)!==Number(hero.y) ? 4 : 5;
}
function createApproachScanner() {
  return (players, hero, strangersAreEnemies) => nearby(players,hero,directionalRange,strangersAreEnemies);
}
function nearest(players, hero, radius, strangersAreEnemies = true) {
  return nearby(players,hero,radius,strangersAreEnemies)[0] || null;
}
function selectBuild(targets, builds) {
  if (!targets.length) return '';
  return String((targets.length >= 2 && builds.multiple !== undefined && builds.multiple !== '' ? builds.multiple : builds[targets[0].prof]) ?? '');
}

GogatkiRuntime.register({id:'proximity-build',name:'Zestaw pod przeciwnika',description:'NI: dobór zestawu do profesji przeciwnika lub grupy w pobliżu.',
  // Pure functions retained for integration tests; ignored by the Gogatki launcher.
  testing:{directionalRange,createApproachScanner,nearest,nearby,selectBuild,protectedPlayer,environment,pauseReason,blockedBossMap,BOSS_LOCATIONS},
  start: function start() {
    const w = unsafeWindow;
    if(w.top !== w.self)return;
    if(!w.Engine){
      if(document.getElementById('gogatki-proximity-unsupported'))return;
      const notice=document.createElement('div');notice.id='gogatki-proximity-unsupported';
      notice.textContent='Zestaw pod przeciwnika działa tylko na NI.';
      notice.style.cssText='position:fixed;right:18px;top:135px;z-index:2147483000;padding:10px;background:#171b20;color:#c7d0d9;border:1px solid #668298;font:12px Arial';
      document.body.append(notice);return;
    }
// Observe packets without changing game processing.
function installGogatkiBuildCapture(w) {
  if(w.__gogatkiBuildCapture)return w.__gogatkiBuildCapture;
  const state={builds:{},current:null,version:0,inBattle:false,town:null,party:null,partyKnown:false};
  state.consume=function(packet){
    if(!packet||typeof packet!=='object')return;
    if(packet.town && typeof packet.town==='object'){
      const changed=packet.town.file || (packet.town.id!=null && state.town?.id!=null && String(packet.town.id)!==String(state.town.id));
      state.town=changed ? {...packet.town} : {...state.town,...packet.town};
    }
    if(Object.prototype.hasOwnProperty.call(packet,'party')){
      state.partyKnown=true;
      state.party=packet.party && typeof packet.party==='object' && Object.keys(packet.party).length ? packet.party : null;
    }
    const b=packet.builds;
    if(b){
      if(b.action==='INIT')state.builds={};
      if(Array.isArray(b.list))for(const entry of b.list)if(entry&&Number.isInteger(Number(entry.id)))state.builds[entry.id]={...state.builds[entry.id],...entry};
      if(b.currentId!=null)state.current=b.currentId;
      state.version++;
    }
    if(packet.f?.init!=null)state.inBattle=true;
    if(packet.f?.endBattle)state.inBattle=false;
    if(packet.town?.file)state.inBattle=false;
  };
  w.__gogatkiBuildCapture=state;
  let timer;
  function hook(){
    const owner=w.Engine?.communication;
    if(typeof owner?.parseJSON!=='function')return false;
    const original=owner.parseJSON;
    const wrapped=function(packet){
      // Observation errors must never prevent game processing.
      try{state.consume(packet);}catch(error){console.warn('[Gogatki: zestawy] Dane zestawów:',error);}
      return original.apply(this,arguments);
    };
    owner.parseJSON=wrapped;
    state.cleanup=()=>{if(owner.parseJSON===wrapped)owner.parseJSON=original;};
    return true;
  }
  if(!hook()){
    timer=w.setInterval(()=>{if(hook())w.clearInterval(timer);},10);
    w.addEventListener('pagehide',()=>w.clearInterval(timer),{once:true});
  }
  return state;
}

installGogatkiBuildCapture(w);
    if (w.__gogatkiProximity) return;
    const hero = () => w.Engine?.hero?.d || {};
    // Engine.hero can exist before the character's ID arrives during startup.
    // Never read/write an "unknown" profile or change the destination after load.
    const characterId=String(hero().id ?? '');
    if(!/^[1-9]\d*$/.test(characterId)){
      if(!w.__gogatkiProximityWait){
        w.__gogatkiProximityWait=w.setTimeout(()=>{delete w.__gogatkiProximityWait;start();},100);
      }
      return;
    }
    const world=String(w.location?.hostname || 'margonem').toLowerCase();
    const profile=world+':'+characterId;
    const storageKey='gogatki:proximity:v2:'+profile;
    const legacyKey='gogatki:proximity:v1:'+characterId;
    let saved=GM_getValue(storageKey,null);
    if(saved===null){
      const legacy=GM_getValue(legacyKey,null);
      if(legacy && typeof legacy==='object' && !Array.isArray(legacy)){
        saved=JSON.parse(JSON.stringify(legacy));
        GM_setValue(storageKey,saved);
      }
    }
    if(!saved || typeof saved!=='object' || Array.isArray(saved))saved={};
    const config={enabled:false,strangersAreEnemies:false,skipInGroup:false,skipBossMaps:false,builds:{},...saved};
    config.builds={...(saved.builds || {})};
    delete config.radius; // Retired manual range; ignore legacy profiles.
    const save=()=>GM_setValue(storageKey,JSON.parse(JSON.stringify(config)));
    const capture=w.__gogatkiBuildCapture || {builds:{},current:null};
    const host=document.createElement('div'); host.id='gogatki-proximity-build';
    const root=host.attachShadow({mode:'open'});
    root.innerHTML=`<style>
    :host{all:initial;position:fixed;right:18px;top:135px;z-index:2147483646;font:12px/1.45 Arial;color:#c7d0d9}*{box-sizing:border-box;font-family:Arial}button,input,select{font:inherit;color:inherit}button,select{cursor:pointer}button,select,input{background:#252b31;border:1px solid #668298;border-radius:3px;padding:5px}button:hover{border-color:#12c9bd}.gear{display:flex;align-items:center;justify-content:center;width:26px;height:26px;padding:3px;color:#74838d;background:#252b31}.gear.active{color:#12c9bd}svg{display:block;pointer-events:none}button{background:#38566c;border-color:#6d879a}.collapsed{width:var(--tile,28px);height:var(--tile,28px);overflow:hidden}.collapsed header{padding:0;height:100%}.collapsed strong,.collapsed .body,.collapsed .status{display:none}.collapsed .gear{width:100%;height:100%}header{height:28px}strong{flex:1}section{margin-top:0;max-height:calc(100vh - 30px);overflow:auto;width:262px;max-width:calc(100vw - 30px);background:#171b20;border:1px solid #668298;border-radius:4px;box-shadow:0 6px 22px #0009}header{padding:7px 9px;background:#252b31;display:flex;justify-content:space-between;align-items:center;cursor:move;touch-action:none}strong,th{color:#12c9bd}header button{border:0;padding:0 5px}.body{padding:10px}label{display:flex;align-items:center;justify-content:space-between;gap:7px;margin-bottom:9px}input[type=checkbox]{appearance:none;display:grid;place-content:center;width:14px;min-width:14px;height:14px;flex:none;margin:0;padding:0;border:1px solid #668298;border-radius:3px;background:#252b31;cursor:pointer}input[type=checkbox]::before,input[type=checkbox]::after{content:none}input[type=checkbox]:checked::after{content:'✓';font:12px/12px Arial;color:#12c9bd}table{width:100%;border-collapse:collapse;table-layout:fixed;font:inherit;color:inherit}th:first-child,td:first-child{width:44%}th,td{text-align:left;padding:5px 2px}select{max-width:205px;width:100%;min-width:0}label select{width:100px;flex-shrink:0}tr:last-child td{border-top:1px solid #66829855}p{margin:9px 0;color:#b1c0cb}.status{border-top:1px solid #66829855;padding:9px;overflow-wrap:anywhere}[hidden]{display:none!important}:focus-visible{outline:2px solid #12c9bd}
    </style><section class="panel"><header><strong>Zestaw pod przeciwnika</strong><button class="gear" type="button" aria-label="Ustawienia zestawu pod przeciwnika" title="LPM: ustawienia · PPM: zwiń"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3 21 7v6c0 4-9 8-9 8s-9-4-9-8V7z"/><path d="m8 12 3 3 5-6"/></svg></button></header><div class="body"><label>Nieznajomi są wrogami <input type="checkbox" id="strangers"></label><label>Zmieniaj w grupie <input type="checkbox" id="skip-group"></label><label>Zmieniaj na mapach tytanowych <input type="checkbox" id="skip-boss"></label><table><thead><tr><th>Przeciwnik / sytuacja</th><th>Twój zestaw</th></tr></thead><tbody></tbody></table><button id="refresh">Odśwież listę zestawów</button><p>Automatycznie zmienia zestaw pod pobliskiego przeciwnika lub grupę na czerwonych mapach.</p></div><div class="status" role="status"></div></section>`;
    document.body.appendChild(host);
    const status=root.querySelector('.status'), panel=root.querySelector('section'), tile=root.querySelector('.gear');
    const say=text=>{status.textContent=text;};
    const windowStateKey='gogatki:proximity:window-open:v1:'+profile;
    let settingsOpen=GM_getValue('gogatki:proximity:settings:v1:'+profile,true)===true;
    function setOpen(value,persist=true){
      panel.classList.toggle('collapsed',!value);
      root.querySelector('.body').hidden=!value || !settingsOpen;
      tile.setAttribute('aria-expanded',String(value && settingsOpen));
      host.dataset.compact=String(!value);
      const launcher=document.querySelector('#gogatek-panel')?.shadowRoot?.querySelector('.launcher');
      panel.style.setProperty('--tile',(launcher?.getBoundingClientRect().height || 28)+'px');
      if(persist)GM_setValue(windowStateKey,value);
      if(value)renderBuilds();
      clampPosition();
    }
    tile.onclick=()=>{
      if(panel.classList.contains('collapsed'))setOpen(true);
      else {settingsOpen=!settingsOpen;GM_setValue('gogatki:proximity:settings:v1:'+profile,settingsOpen);setOpen(true);}
    };
    tile.addEventListener('contextmenu',event=>{event.preventDefault();setOpen(false);});
    root.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false);});
    function refreshEnabled(){
      const active=config.enabled===true;
      tile.classList.toggle('active',active);host.dataset.active=String(active);
    }
    host.addEventListener('gogatki:toggle-active',()=>{
      config.enabled=!config.enabled;refreshEnabled();save();
      say(config.enabled?'Automatyczna zmiana włączona.':'Automatyczna zmiana wyłączona.');
    });
    refreshEnabled();
    const strangers=root.querySelector('#strangers');strangers.checked=config.strangersAreEnemies===true;
    strangers.onchange=()=>{config.strangersAreEnemies=strangers.checked;save();};
    for(const [selector,field] of [['#skip-group','skipInGroup'],['#skip-boss','skipBossMaps']]){
      // Keep legacy skip flags: a checked permission means the block is disabled.
      const input=root.querySelector(selector);input.checked=config[field]!==true;
      input.onchange=()=>{config[field]=!input.checked;save();};
    }
    const selects={};
    for(const [prof,name] of Object.entries({...PROFESSIONS,multiple:'2 lub więcej przeciwników'})){
      const row=document.createElement('tr'),label=document.createElement('td'),cell=document.createElement('td'),select=document.createElement('select');
      label.textContent=name;select.setAttribute('aria-label','Zestaw przeciw: '+name);selects[prof]=select;
      select.onchange=()=>{config.builds[prof]=select.value;save();};cell.append(select);row.append(label,cell);root.querySelector('tbody').append(row);
    }
    function renderBuilds(){
      for(const [prof,select] of Object.entries(selects)){
        select.replaceChildren(new Option(prof==='multiple'?'Według najbliższej profesji':'Bez zmiany',''));
        for(const build of Object.values(capture.builds)) select.add(new Option(build.name || 'Zestaw '+build.id,String(build.id)));
        const selected=String(config.builds[prof]??'');
        if(selected&&!capture.builds[selected]) select.add(new Option('Niedostępny zestaw '+selected,selected));
        select.value=selected;
      }
    }
    root.querySelector('#refresh').onclick=()=>{renderBuilds();say(Object.keys(capture.builds).length?'Lista zestawów odświeżona.':'Brak danych zestawów. Odśwież grę z włączonym skryptem, następnie otwórz zestawy postaci.');};
    renderBuilds();
    let version=-1,pending=null,lastAttempt=0,blockedUntil=0,inBattle=false;
    let lastMap=null;
    const scanApproach=createApproachScanner();
    function tick(){
      try{
        if(String(hero().id ?? '')!==characterId){
          // An in-page character change must not keep the previous profile alive.
          w.clearInterval(timer);host.remove();delete w.__gogatkiProximity;
          start();return;
        }
        if(version!==capture.version){version=capture.version;renderBuilds();}
        inBattle=!!capture.inBattle || !!w.Engine?.lock?.check?.('battle');
        if(typeof w._g!=='function'){say('Oczekiwanie na komunikację gry.');return;}
        if(!config.enabled){say('Wyłączony — PPM na kafelku włącza automat.');return;}
        if(inBattle){say('Walka — zmiana zestawu wstrzymana.');return;}
        // Pending requests were already sent: never cancel confirmation bookkeeping.
        // Resume normal scanning only after every live environment guard has passed.
        const paused=pauseReason(config,environment(w,capture));
        if(paused && !pending){say(paused);return;}
        const map=w.Engine?.map?.d?.id;
        if(map!==lastMap){lastMap=map;pending=null;blockedUntil=Date.now()+600;}
        if(pending){
          if(String(capture.current)===pending.build){say('Zmieniono zestaw na '+(capture.builds[pending.build]?.name || pending.build)+'.');pending=null;}
          else if(Date.now()-pending.time>5000){config.enabled=false;refreshEnabled();save();say('Brak potwierdzenia zmiany. Automat zatrzymany; sprawdź komunikat gry i zestawy.');pending=null;}
          return;
        }
        if(paused){say(paused);return;}
        const list=w.Engine?.others?.check?.() ?? w.Engine?.others?.getAll?.() ?? {};
        const players=Object.entries(list).map(([id,p])=>({...p?.d??p,id:p?.d?.id??p?.id??id}));
        const targets=scanApproach(players,hero(),config.strangersAreEnemies===true,map);
        const target=targets[0];
        if(!target){say('Brak obcych graczy w zasięgu.');return;}
        const build=selectBuild(targets,config.builds);
        const situation=targets.length>=2 && config.builds.multiple!==undefined && config.builds.multiple!=='' ? targets.length+' przeciwników w zasięgu' : (target.nick||target.id)+' · '+PROFESSIONS[target.prof]+' · '+target.distance+' kr.';
        if(!build){say((target.nick||target.id)+' · '+PROFESSIONS[target.prof]+' · '+target.distance+' kr. — nie przypisano zestawu.');return;}
        if(!capture.builds[build]){say('Wybrany zestaw jest niedostępny. Odśwież listę zestawów.');return;}
        if(capture.current==null){say('Brak informacji o aktywnym zestawie. Odśwież grę.');return;}
        if(String(capture.current)===build){say(situation+' — właściwy zestaw aktywny.');return;}
        if(Date.now()<blockedUntil||Date.now()-lastAttempt<2500)return;
        lastAttempt=Date.now();pending={build,time:lastAttempt};
        const request='builds&action=updateCurrent&id='+encodeURIComponent(build)+(w.Engine?.skills?'&skillshop=1':'');
        say('Zmiana zestawu: '+situation);
        w._g(request,packet=>{capture.consume?.(packet);});
      }catch(error){config.enabled=false;refreshEnabled();save();say('Automat zatrzymany: '+error.message);console.error('[Gogatki: zestawy]',error);}
    }
    const timer=w.setInterval(tick,250);
    const positionKey='gogatki:proximity:window-position:v2:'+profile;
    function place(left,top){
      if(w.__gogatkiTileDock?.isDocked(host))return;
      host.style.right=Math.max(0,Math.min(w.innerWidth-host.offsetWidth,w.innerWidth-left-host.offsetWidth))+'px';
      host.style.top=Math.max(0,Math.min(w.innerHeight-host.offsetHeight,top))+'px';host.style.left='auto';
    }
    function clampPosition(){
      if(w.__gogatkiTileDock?.isDocked(host))return;
      const box=host.getBoundingClientRect();place(box.left,box.top);
    }
    w.addEventListener('resize',clampPosition);
    try{const pos=GM_getValue(positionKey,null);if(Number.isFinite(pos?.left)&&Number.isFinite(pos?.top))place(pos.left,pos.top);}catch{}
    let drag=null;
    const header=root.querySelector('header');
    header.addEventListener('pointerdown',e=>{
      if(e.button!==0||e.target.closest('button'))return;
      const box=host.getBoundingClientRect();
      drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:box.left,top:box.top};
      e.preventDefault();header.setPointerCapture(e.pointerId);
    });
    header.addEventListener('pointermove',e=>{if(drag&&drag.id===e.pointerId)place(drag.left+e.clientX-drag.x,drag.top+e.clientY-drag.y);});
    function finishDrag(e){
      if(!drag||drag.id!==e.pointerId)return;
      if(e.type==='pointercancel')place(drag.left,drag.top);
      drag=null;
      if(header.hasPointerCapture(e.pointerId))header.releasePointerCapture(e.pointerId);
      const box=host.getBoundingClientRect();GM_setValue(positionKey,{left:box.left,top:box.top});
    }
    for(const type of ['pointerup','pointercancel','lostpointercapture'])header.addEventListener(type,finishDrag);
    w.addEventListener('pagehide',()=>{w.clearInterval(timer);w.removeEventListener('resize',clampPosition);capture.cleanup?.();},{once:true});
    w.__gogatkiProximity={host,profile,open:()=>setOpen(true)};
    setOpen(GM_getValue(windowStateKey,true)===true,false);tick();
  }
});
})();




