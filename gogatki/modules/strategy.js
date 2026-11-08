// Strategy 1.2.1 — adapted from Spell Trigger (Maddonz, Barlag).
GogatkiRuntime.register({
 id:'strategy', name:'Strategy',
 description:'Kolejka umiejętności i warunkowe zestawy ruchów w walce.',
 start(){
  const window=unsafeWindow;
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
// Logic extracted from Maddonz (Barlag); original sources remain unchanged.
const tg=class{["name"];["value"];["turns"];["type"];constructor(K0='',K1=0x0,K4=0x0,K5){this["name"]=K0,this["value"]=K1,this["turns"]=K4,this["type"]=K5;}},ng={'auto':!0x1,'inBattle':!0x1,'myteam':0x0,'warriors':{},'skipTurn':!0x1},rg=jm("battle",{'state':()=>Fc(ng),'getters':{'allies'(){return Object["values"](this["warriors"])["filter"](K0=>K0["team"]===this["myteam"]);},'aliveAllies'(){return this["allies"]["filter"](K0=>K0['hp']["hpp"]>0x0);},'enemies'(){return Object['values'](this['warriors'])["filter"](K0=>K0['team']!==this["myteam"]);},'aliveEnemies'(){return this["enemies"]["filter"](K0=>K0['hp']["hpp"]>0x0);},'npcs'(){return Object["values"](this['warriors'])["filter"](K0=>!!K0['npc']);},'firstEnemy'(){return this['aliveEnemi'+'es'][0x0];},'hero'(){return this["warriors"][B['id']];}},'actions':{'initStore'(){this['watchBattl'+'e']();},'clear'(){Object['assign'](this,Fc(ng));},'watchBattle'(){V['after']("server_f",([K0])=>{K0["init"]!=null&&(this["clear"](),this["inBattle"]=!0x0),K0["auto"]!=null&&(this['auto']=K0["auto"]==='1'),K0['myteam']!=null&&(this["myteam"]=K0['myteam']),K0['w']!=null&&this["updateWarr"+'iors'](K0['w']),K0['m']!=null&&this["processMessages"](K0['m']);}),V["after"]("battle_clo"+'se',()=>{V["emit"]("battle_store_clear"),this['clear']();});},'updateWarriors'(K0={}){Object["entries"](K0)['forEach'](([K1,K4])=>{let K5=this["warriors"][+K1];K5?Object["assign"](K5,Fc(K4)):this['warriors'][+K1]={...this["warriors"][+K1],...Fc(K4),'id':+K1,'effects':[]};});},'processMessages'(K0){K0["forEach"](K1=>{this['processMes'+"sage"](K1);});},'processMessage'(K0){let K1=this["parseMessa"+'ge'](K0),K4=this["warriors"][K1["attacker"]],K5=this["warriors"][K1['defender']]||K4;K1["isTurn"]&&this["processTur"+'n'](K4),Object["entries"](K1)["forEach"](([K6,K7])=>{switch(K6){case "skillId":this["processCombination"](+K7,K4);break;case "-blok":(K5['prof']==='p'||K5['prof']==='w')&&this['addInfoEff'+"ect"](K5,new tg("combinatio"+'n',0x1,0x1/0x0,'info'));break;case'+crit':("+dmgc"in K1&&K4["prof"]==='m'||K4['prof']==='h'||K4["prof"]==='t')&&this["addInfoEffect"](K4,new tg("combinatio"+'n',0x1,0x1/0x0,"info"));break;case "+wound":K4["prof"]==='h'&&this["addInfoEff"+'ect'](K4,new tg("combinatio"+'n',0x1,0x1/0x0,"info"));break;case "prepare":this["addEffect"](K4,new tg(K6,K7,0x1));break;case'tspell':K7==="Podwójny strzał"||K7==="Podwójne trafienie"?this["skipTurn"]=!0x0:K7==="Tarcza odporności"&&this['addEffect'](K5,new tg("res_shield",0x0,0x7));break;case "shout":{let K8=K7["split"](',')['map'](KK=>KK["trim"]()),K9=Object['values'](this['warriors'])["filter"](KK=>K8['includes'](KK["name"]));this["addEffect"](K4,new tg("shout_sour"+'ce',0x0,0x2)),K9["forEach"](KK=>{this['addEffect'](KK,new tg("shout_targ"+'et',0x0,0x2));});break;}case'spell-take'+"n_dmg":this['addEffect'](K5,new tg("beast_mark",0x0,0x4));break;case "lowheal_per-enemies":this['addTeamEff'+"ect"](K5,new tg("heal_debuf"+'f',0x0,0x5));break;case "+dispel":case "+superspell-dispel":this["removeEffe"+'ct'](K5,"prepare");break;case'-legbon_gl'+"are":this["addUniqueE"+'ffect'](K4,new tg("glare",0x1,0x1/0x0,"stun"));break;case "+legbon_curse":case'+mcurse':this["addUniqueEffect"](K5,new tg("curse",0x1,0x1/0x0,"stun"));break;case "+distract":"-evade"in K1||this["addUniqueE"+'ffect'](K5,new tg("distract",0x1,0x1/0x0,"stun"));break;case "+stun":case "+freeze":"-evade"in K1||this["addUniqueEffect"](K5,new tg('stun',0x1,0x1/0x0,"stun"));break;case'-tenacity':this["removeEffe"+'ct'](K5,"stun");break;case "+stun2":case "+stun2-f":case'+stun2-l':case'+stun2-c':case'+stun2-d':"-evade"in K1||this["addUniqueEffect"](K5,new tg("stun",0x2,0x1/0x0,"stun"));break;case "txt":this["processStu"+'n'](K7);break;case'aura-sa_pe'+'r':K1["attacker"]>0x0&&["Aura szybkości","Podwójny dech"]['includes'](K1["tspell"])&&this["processAur"+'a'](K1,K4);break;case "allslow_pe"+'r':K1['attacker']>0x0&&K1["tspell"]==="Szadź"&&this['processSlo'+'w'](K1,K4);break;case "heal_targe"+'t':case "bandage":this['addInfoEff'+"ect"](K4,new tg("heal_targe"+'t',0x1,0x1/0x0,"info"));break;case "healall_pe"+'r':this["addInfoEffect"](K4,new tg("heal_all",0x1,0x1/0x0,'info'));break;case "legbon_lastheal":this["addInfoEffect"](K5,new tg('last_heal',0x1,0x1/0x0,'info'));break;case "removestun-allies":this["removeTeamEffect"](K4,"stun");break;case "removeslow-allies":this['removeTeam'+'Effect'](K4,'slow');break;case "-legbon_cleanse":this["removeEffe"+'ct'](K5,"stun"),this["removeEffe"+'ct'](K5,"slow");break;case "+legbon_holytouch":this["addUniqueEffect"](K4,new tg("holy_touch",0x3,0x1/0x0));break;case'legbon_hol'+"ytouch_hea"+'l':this["tickUniqueEffect"](K4,"holy_touch");}});},'parseMessage'(K0){let K1=K0["split"](';'),K4=K1["reduce"]((K5,K6)=>{let [K7,K8]=K6["split"]('=');return K5[K7]=K8,K5;},{});return K4["attacker"]=+K1[0x0]["split"]('=')[0x0],K4["defender"]=+K1[0x1]["split"]('=')[0x0],K4["isTurn"]=this['isTurn'](K4,K1),K4;},'isTurn'(K0,K1){if(this["skipTurn"])return this['skipTurn']=!0x1,!0x1;let K4=["heal","legbon_hol"+'ytouch_hea'+'l',"poison","wound","fire","critwound","injure","light","combo-max","surpass_bonus_total","winner","loser","txt"],K5=Object["keys"](K0)["some"](K7=>K4["includes"](K7)),K6='tspell'in K0&&K1["length"]===0x3;return K0["attacker"]!==0x0&&!K5&&!K6;},'processTurn'(K0){K0['effects']['forEach'](K1=>{--K1["turns"];}),K0["effects"]=K0['effects']['filter'](K1=>K1["turns"]>0x0);},'processStun'(K0){let K1=/(.*?) - utrata tury/['exec'](K0);if(!K1)return;let K4=K1[0x1],K5=Object["values"](this["warriors"])["find"](K6=>K6["name"]===K4);K5&&(K5['effects']['some'](K6=>K6["name"]==='stun')?this["tickUniqueEffect"](K5,"stun"):(this["tickUnique"+'Effect'](K5,"glare"),this["tickUniqueEffect"](K5,"curse"),this["tickUniqueEffect"](K5,"distract")),this['processTur'+'n'](K5));},'addEffect'(K0,K1){K0["effects"]["push"](K1);},'removeEffect'(K0,K1){K0["effects"]=K0["effects"]["filter"](K4=>K4["name"]!==K1);},'addTeamEffect'(K0,K1){(K0["team"]===this['myteam']?this["aliveAllie"+'s']:this["aliveEnemi"+'es'])["forEach"](K4=>{this["addEffect"](K4,{...K1});});},'removeTeamEffect'(K0,K1){(K0['team']===this['myteam']?this["aliveAllie"+'s']:this["aliveEnemi"+'es'])["forEach"](K4=>{this["removeEffe"+'ct'](K4,K1);});},'addUniqueEffect'(K0,K1){this['removeEffe'+'ct'](K0,K1["name"]),this['addEffect'](K0,K1);},'tickUniqueEffect'(K0,K1){K0["effects"]=K0["effects"]['filter'](K4=>K4["name"]!==K1||(--K4["value"],K4['value']>0x0));},'addInfoEffect'(K0,K1){let K4=K0["effects"]["find"](({name:K5})=>K5===K1["name"]);K4?K4['value']=+K4["value"]+0x1:this["addEffect"](K0,K1);},'processAura'(K0,K1){let K4=K1["team"]===this["myteam"]?this['aliveAllie'+'s']:this["aliveEnemi"+'es'],K5=K0['tspell'],K6=+K0["aura-sa_pe"+'r'],K7=K5==="Aura szybkości"?0x8:0x6;K4["forEach"](K8=>{this["addEffect"](K8,new tg("haste",K6,K7));});},'processSlow'(K0,K1){let K4=K1["team"]===this["myteam"]?this["aliveEnemi"+'es']:this["aliveAllie"+'s'],K5=+K0["allslow_pe"+'r'];K4["forEach"](K6=>{this["addEffect"](K6,new tg('slow',K5,0x6));});},'processCombination'(K0,K1){[0xe,0x15,0x17,0x1a,0x26,0x3a,0x44,0x46,0x52,0x56,0x61,0x63,0x70,0xb2,0xc5,0xcc,0xd1,0xd2,0xdf,0xe0,0xe8,0xef,0xf7,0x10f]["includes"](K0)?this["addInfoEffect"](K1,new tg("combinatio"+'n',0x1,0x1/0x0,'info')):[0x16,0x27,0x38,0x55,0x5f,0x60,0x6c,0x81,0xbf,0xce,0xde,0xe7,0xf6]['includes'](K0)&&this["removeEffe"+'ct'](K1,"combinatio"+'n');}}});const qc=class{get["inBattle"](){return U['lock']["check"]('battle');}["turnOnAskAboutBattleMode"](){U["getSetting"+'s'](0x4)||U['updateSett'+"ings"](0x4,!0x0);}["getHighest"+'Wt'](K0){return Object["values"](K0)["reduce"]((K1,{wt:K4})=>Math["max"](K1,K4),0x0);}['getHighest'+"WtWarrior"](K0){let K1=this["getHighest"+'Wt'](K0);return K0["find"](K4=>K4['wt']===K1);}['useSkill'](K0,K1){K0===-0x1a4&&U["sendReques"+'t']("fight&a=f"),K0===-0x1?U["sendReques"+'t']("fight&a=st"+'rike&id='+K1):K0===-0x2?U["sendReques"+'t']("fight&a=mo"+'ve'):U["sendReques"+'t']("fight&a=spell&s="+K0+"&id="+K1);}["canUseSkil"+'l'](K0,K1){if([-0x1a4]['includes'](K0))return!0x0;let K4=this["warriors"][B['id']],K5=this["warriors"][K1],K6=this["getSkill"](K0);if(!K6||K6["disabled"]||!K5||K5['hp']["hpp"]===0x0)return!0x1;let K7=0x1;K4===K5?K7=0x0:K4["team"]!==K5["team"]&&(K7=0x2);let K8=['w','p','b']["includes"](K4["prof"])&&!(K5['y']-K4['y']<0x2);if(K0===-0x1)return K7===0x2&&!K8;if(K0===-0x2){let KV=['w','p','b']["includes"](K4["prof"]),KG=K4['y']===0x4;return KV&&!KG;}let K9=this["getSkillCo"+'st'](K0),KK;if(!K9)KK=!0x0;else{let KI=parseInt(K9,0xa);KK=K9[K9["length"]-0x1]==='m'?K4["mana"]>=KI:K4["energy"]>=KI;}let Kj=!0x1;(K6["attr"]&0x8&&K7===0x0||K6["attr"]&0x10&&K7===0x1||!(K6['attr']&0x18)&&K7===0x2)&&(Kj=!0x0),K8&&=!!(K6['attr']&0x2);let KY=K4['cooldowns']?.["find"](Kq=>Kq[0x0]===K0),KJ=KY&&KY[0x1]>0x0;return KK&&Kj&&!K8&&!KJ;}},Jc=kc(class extends qc{get['battle'](){return window.Engine["battle"];}get['warriors'](){return window.Engine["battle"]["warriorsLi"+'st'];}["isHeroTurn"](){return window["Engine"]['battle']["warriorsLi"+'st'][window["Engine"]['hero']['d']['id']]['$']["find"](".current-arrow")["length"]>0x0;}["getSkill"](K0){return window.Engine["battle"]['getBattleS'+"kill"](K0);}["getSkillCo"+'st'](K0){return this["getSkill"](K0)?.["cost"];}},class extends qc{get["battle"](){return window['g']['battle'];}get['warriors'](){return Object["entries"](window['g']['battle']['f'])["reduce"]((K0,[K1,K4])=>(K0[+K1]=K4,K0),{});}["isHeroTurn"](){return window.$("#troop"+window["hero"]['id'])["find"](".current-player")['length']>0x0;}['getSkill'](K0){return window['g']["battle"]["skills"][K0];}["getSkillCo"+'st'](K0){let K1=this["getSkill"](K0)?.["cost"],K4=this["warriors"][B['id']]["doublecast"+'cost']||[];return K4[0x0]===K0?K4[0x1]:K1;}},!0x0);const Jw=class{['id'];["name"];['check'];["paramsSche"+'ma'];constructor(K0,K1,K4,K5=[]){this['id']=K0,this['name']=K1,this["check"]=K4,this["paramsSche"+'ma']=K5;}},Yw=new Jw("none","brak",()=>!0x0),Xw=new Jw("randomly","losowo",({params:K0})=>{let K1=K0["value"]??0x32;return Math["floor"](Math["random"]()*0x64)+0x1<=K1;},[{'key':"value",'type':"number",'label':"Procent",'default':0x32}]),Zw=new Jw('targetsHpp'+"Below","zdrowie poniżej",({targets:K0,params:K1})=>{let K4=K1['min']??0x1;return K0["filter"](K5=>K5['hp']["hpp"]<=K1["value"])["length"]>=K4;},[{'key':"value",'type':"number",'label':'Procent\x20zd'+'rowia'},{'key':'min','type':"number",'label':"Min. celów"}]),Qw=new Jw('targetsHpp'+"Above","zdrowie po"+'wyżej',({targets:K0,params:K1})=>{let K4=K1['min']??0x1;return K0["filter"](K5=>K5['hp']['hpp']>=K1["value"])['length']>=K4;},[{'key':"value",'type':"number",'label':"Procent zdrowia"},{'key':"min",'type':'number','label':"Min. celów"}]),$w=new Jw("effectExis"+'ts',"aktywny ef"+'ekt',({targets:K0,params:K1})=>{let K4=K1["min"]??0x1;return aT(K0,K1['value'])>=K4;},[{'key':'value','type':"text",'label':"Efekt"},{'key':"min",'type':"number",'label':'Min.\x20efekt'+'ów'}]),eT=new Jw("effectNotExists","brak efekt"+'u',({targets:K0,params:K1})=>{let K4=K1["min"]??0x1;return aT(K0,K1["value"])<K4;},[{'key':"value",'type':"text",'label':"Efekt"},{'key':"min",'type':"number",'label':"Min. efekt"+'ów'}]),tT=new Jw("armor","pancerz",({targets:K0,params:K1})=>K0['filter'](K4=>!!K4['ac']?.["destroyed"]===K1['value'])['length']>0x0,[{'key':"value",'type':'switch','label':"Pancerz zniszczony"}]),nT=new Jw("combinatio"+'n','punkty\x20kom'+"binacji",({targets:K0,params:K1})=>{let K4=K1["min"]??0x1,K5=0x0;return K0["forEach"](K6=>{let K7=K6["effects"]["find"](K8=>K8["name"]==="combinatio"+'n')?.['value']??0x0;K5=Math['max'](K5,K7);}),K5>=K4;},[{'key':"min",'type':'number','label':"Min. warto"+'ść'}]),rT=new Jw("neutralize"+'d',"unieszkodliwiony",({targets:K0})=>K0["filter"](K1=>K1["effects"]["some"](K4=>["glare","curse","distract"]["includes"](K4["name"])))["length"]>0x0),iT=new Jw('preparingS'+"kill",'przygotowu'+"je atak",({params:K0,targets:K1})=>{let K4=(K0["value"]??'')["toLowerCas"+'e']();return K1["filter"](K5=>K5['effects']["some"](K6=>{let K7=K6['name']==="prepare",K8=K6["value"]["toString"]()["toLowerCas"+'e']();return K7&&(!K4||K8["startsWith"](K4))&&(!K8['includes']("100%")||K4["includes"]("100%"));}))["length"]>0x0;},[{'key':"value",'type':'text','label':"Nazwa"}]);function aT(K0,K1){let K4=K1["toLowerCas"+'e'](),K5=0x0;return K0['forEach'](K6=>{let K7=K6["effects"]["filter"](K8=>K8['name']===K4);K5=Math['max'](K5,K7['length']);}),K5;}var oT=[Yw,Xw,Zw,Qw,$w,eT,tT,nT,rT,iT,new Jw("targetsProfExists","istnieje profesja",({targets:K0,params:K1})=>{let K4=K1["value"]||'',K5=K1['min']||0x1;return K0["filter"](K6=>K4["includes"](K6["prof"]))["length"]>=K5;},[{'key':'value','type':'text','label':"Profesja"},{'key':"min",'type':"number",'label':'Liczba\x20cel'+'ów'}]),new Jw("targetsPro"+'fNotExists','brak\x20profe'+"sji",({targets:K0,params:K1})=>{let K4=K1['value']||'',K5=K1["min"]||0x1;return K0["filter"](K6=>K4["includes"](K6['prof']))['length']<K5;},[{'key':"value",'type':"text",'label':"Profesja"},{'key':"min",'type':'number','label':'Liczba\x20cel'+'ów'}])],sT=[new Ow('targetPrio'+"rity","priorytet",({targets:K0,params:K1})=>{let K4=K1["value"];return K4?(K4=K4['split'](''),K0['sort']((K5,K6)=>(K4["indexOf"](K5["prof"])+0x1||K4["length"]+0x1)-(K4["indexOf"](K6["prof"])+0x1||K4["length"]+0x1))[0x0]?.['id']):K0[0x0]?.['id'];},[{'key':"value",'type':"text",'label':"Priorytet"}]),new Ow("targetHppBelow","zdrowie poniżej",({targets:K0,params:K1})=>[...K0]["filter"](K4=>K4['hp']["hpp"]<=K1['value'])["sort"]((K4,K5)=>K4['hp']["hpp"]-K5['hp']["hpp"])[0x0]?.['id'],[{'key':'value','type':"number",'label':"Procent zdrowia"}]),new Ow("targetHppAbove","zdrowie powyżej",({targets:K0,params:K1})=>[...K0]["filter"](K4=>K4['hp']["hpp"]>=K1["value"])['sort']((K4,K5)=>K5['hp']["hpp"]-K4['hp']["hpp"])[0x0]?.['id'],[{'key':"value",'type':'number','label':"Procent zdrowia"}]),new Ow("targetManaBelow",'mana\x20poniż'+'ej',({targets:K0,params:K1})=>[...K0]["filter"](K4=>Math["floor"](K4["mana"]/K4["mana0"]*0x64)<=K1['value'])[0x0]?.['id'],[{'key':"value",'type':"number",'label':"Procent ma"+'ny'}]),new Ow("targetManaAbove","mana powyż"+'ej',({targets:K0,params:K1})=>[...K0]["filter"](K4=>Math["floor"](K4["mana"]/K4["mana0"]*0x64)>=K1['value'])[0x0]?.['id'],[{'key':"value",'type':"number",'label':"Procent ma"+'ny'}]),new Ow('targetEner'+"gyBelow","energia po"+'niżej',({targets:K0,params:K1})=>[...K0]["filter"](K4=>Math["floor"](K4["energy"]/K4['energy0']*0x64)<=K1["value"])[0x0]?.['id'],[{'key':"value",'type':"number",'label':"Procent energii"}]),new Ow("targetEnergyAbove","energia po"+'wyżej',({targets:K0,params:K1})=>[...K0]["filter"](K4=>Math['floor'](K4["energy"]/K4["energy0"]*0x64)>=K1['value'])[0x0]?.['id'],[{'key':"value",'type':'number','label':'Procent\x20en'+'ergii'}]),new Ow("armor",'pancerz',({targets:K0,params:K1})=>[...K0]["filter"](K4=>!!K4['ac']?.["destroyed"]===K1["value"])[0x0]?.['id'],[{'key':"value",'type':"switch",'label':"Pancerz zniszczony"}]),new Ow('targetLowe'+"stLvl","najniższy poziom",({targets:K0})=>[...K0]["sort"]((K1,K4)=>K1["lvl"]-K4["lvl"])[0x0]?.['id']),new Ow("targetHigh"+'estLvl','najwyższy\x20'+"poziom",({targets:K0})=>[...K0]['sort']((K1,K4)=>K4["lvl"]-K1['lvl'])[0x0]?.['id']),new Ow('targetId','id',({targets:K0,params:K1})=>[...K0]['filter'](K4=>K4['id']===K1["value"])[0x0]?.['id'],[{'key':'value','type':"number",'label':'ID'}]),new Ow("name","nazwa",({targets:K0,params:K1})=>[...K0]["filter"](K4=>K4["name"]["toLowerCas"+'e']()===K1["value"]["toLowerCas"+'e']())[0x0]?.['id'],[{'key':"value",'type':'text','label':"Nazwa"}]),new Ow("stopAttack",'przerwij\x20a'+"tak",()=>0x0)];
const defaults={active:false,repeat:false,currentMoveSet:'',moveSets:[],beforePvpAction:0,beforePveAction:0,showBattleQueue:false,battleQueueRight:340,battleQueueTop:140,minimized:false,right:20,top:140};
let config, storageKey, root, host, battleHost, battleRoot, settings=false, queue=[], cooldowns={}, limits={}, blocked=false, pending=false;
const skills=new Map([[-1,'Zwykły atak'],[-2,'Krok']]);
function save(){try{GM_setValue(storageKey,JSON.parse(JSON.stringify(config)));}catch{status('Nie udało się zapisać ustawień.');}}
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
 root.replaceChildren();const style=node('style');style.textContent=`:host{all:initial;font:12px Arial,sans-serif;color:#c7d0d9}*{box-sizing:border-box}section{width:250px;max-width:100vw;background:#171b20;border:1px solid #668298;border-radius:4px;overflow:hidden}header{height:28px;background:#252b31;display:flex;align-items:center;gap:6px;cursor:move;padding:0 5px;color:#12c9bd;touch-action:none}header strong{flex:1}button,input,select{font:inherit;color:#c7d0d9;border:1px solid #6d879a;border-radius:3px;background:#252b31;min-height:24px}button{background:#38566c;cursor:pointer;padding:3px 6px}button:disabled{cursor:default;color:#b1c0cb}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #12c9bd}header button{display:grid;place-items:center;padding:0;width:24px;height:24px;color:#12c9bd}main{padding:8px;max-height:calc(100vh - 50px);overflow:auto}label{display:flex;align-items:center;justify-content:space-between;gap:6px;margin:6px 0}input,select{min-width:0;width:145px;padding:3px}input[type=checkbox]{appearance:auto;accent-color:#12c9bd;width:14px;height:14px;min-height:14px;margin:0}#queue{display:grid;gap:4px;margin:8px 0;color:#b1c0cb}#queue button{text-align:left}.row{display:flex;gap:3px;margin:5px 0}.row button:first-child{flex:1}#status,p{font-size:11px;color:#b1c0cb}#settings{border-top:1px solid #668298;margin-top:8px;padding-top:6px}`;root.append(style);
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
 try{config={...defaults,...(GM_getValue(storageKey,null) ?? JSON.parse(window.localStorage.getItem(storageKey)||'{}'))};}catch{config=Fc(defaults);}
 if(!Array.isArray(config.moveSets))config.moveSets=[];
 rg().initStore();
 const communication=window.Engine?.communication||window;
 if(!wrap(communication,'parseJSON',args=>receive(args[0]))){console.error('Strategy: brak parseJSON');return false;}
 wrap(window.Engine?.battle||window,'close',()=>{V.emit('battle_close',[]);reset();renderQueue();});
 if(!window.Engine)wrap(window,'battle_close',()=>{V.emit('battle_close',[]);reset();renderQueue();});
 host=node('div',null,{id:'spell-trigger-standalone'});Object.assign(host.style,{position:'fixed',zIndex:'2147483000'});root=host.attachShadow({mode:'open'});document.body.append(host);
 window.SpellTriggerStandalone={version:'1.2.1',conditions:oT,targetResolvers:sT};
 hookMenu();render();addEventListener('resize',()=>{clamp();clampBattleQueue();save();});
 if(Jc.inBattle)status('Uruchomiono podczas walki. Pełny stan będzie dostępny od następnej walki.');
 return true;
}
let attempts=0;const timer=setInterval(()=>{if(start()||++attempts>=120)clearInterval(timer);},500);
})();

 }
});

