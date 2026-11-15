const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
class Element{
 constructor(){this.hidden=false;this.style={setProperty(){}};this.offsetWidth=355;this.offsetHeight=350;this.children=[];this.map=new Map();this.value='';const classes=new Set();this.classList={toggle(k,v){v?classes.add(k):classes.delete(k)},contains:k=>classes.has(k)};this.events={};this.dataset={};}
 attachShadow(){this.shadowRoot=new Element();return this.shadowRoot;}
 querySelector(s){if(!this.map.has(s))this.map.set(s,new Element());return this.map.get(s);}
 append(...n){this.children.push(...n);}appendChild(n){this.append(n);}replaceChildren(...n){this.children=n;}add(n){this.append(n);}
 setAttribute(){}addEventListener(type,fn){this.events[type]=fn;} getBoundingClientRect(){return {left:20,top:30};} setPointerCapture(){} hasPointerCapture(){return false;}
}
let mod,clock=10000;const timers=[],requests=[],body=new Element();
const data={'gogatki:proximity:v1:1':{enabled:true,radius:6,builds:{w:'2',m:'3'}}};
const players={2:{d:{id:2,x:17,y:10,prof:'w',relation:3,nick:'Wróg'}}};
const w={innerWidth:1280,innerHeight:800,Engine:{hero:{d:{id:1,x:10,y:10,clan:{id:100}}},map:{d:{id:5,pvp:2}},others:{check:()=>players},lock:{check:()=>false},communication:{parseJSON:x=>x}},setInterval:f=>(timers.push(f),timers.length),clearInterval(){},addEventListener(){},_g:req=>requests.push(req)};
vm.runInNewContext(fs.readFileSync(__dirname+'/../gogatki/modules/proximity-build.js','utf8'),{GogatkiRuntime:{register:m=>mod=m},Math:Object.assign(Object.create(Math),{random:()=>0.5}),unsafeWindow:w,GM_getValue:(k,d)=>data[k]??d,GM_setValue:(k,v)=>data[k]=v,document:{body,querySelector:()=>null,createElement:()=>new Element()},Option:function(text,value){this.text=text;this.value=value;},Date:{now:()=>clock},console});
mod.start();const capture=w.__gogatkiBuildCapture;
capture.consume({builds:{action:'INIT',list:[{id:0,name:'Start'},{id:2,name:'Woj'},{id:3,name:'Mag'}],currentId:0}});
assert.equal(typeof w.__gogatkiProximity.open,'function');
const settingsRoot=w.__gogatkiProximity.host.shadowRoot;
const panel=settingsRoot.querySelector('section');assert.equal(panel.classList.contains('collapsed'),false);
settingsRoot.querySelector('.gear').events.contextmenu({preventDefault(){}});assert.equal(panel.classList.contains('collapsed'),true);
w.__gogatkiProximity.open();assert.equal(panel.hidden,false);
settingsRoot.querySelector('.gear').events.contextmenu({preventDefault(){}});assert.equal(panel.classList.contains('collapsed'),true);
const header=settingsRoot.querySelector('header');
header.events.pointerdown({button:0,pointerId:1,clientX:100,clientY:100,target:{closest:()=>null},preventDefault(){}});
header.events.pointermove({pointerId:1,clientX:150,clientY:130});
assert.equal(w.__gogatkiProximity.host.style.right,'855px');
header.events.pointerup({pointerId:1,type:'pointerup'});
assert.ok(data['gogatki:proximity:window-position:v2:margonem:1']);
const tick=timers.at(-1);clock+=1000;tick();assert.equal(requests.length,0);
players[2].d.x=15;tick();assert.equal(requests.length,1);assert.equal(requests[0],'builds&action=updateCurrent&id=2');
clock+=3000;tick();assert.equal(requests.length,1); // Await server confirmation, never spam.
capture.consume({builds:{action:'UPDATE_CURRENT_ID',currentId:2}});tick();clock+=3000;tick();assert.equal(requests.length,1);
players[2].d.prof='m';capture.inBattle=true;tick();assert.equal(requests.length,1);
capture.inBattle=false;players[2].d.relation=2;tick();assert.equal(requests.length,1);
players[2].d.relation=3;tick();assert.equal(requests.length,2);
clock+=6000;tick();assert.equal(data['gogatki:proximity:v2:margonem:1'].enabled,false);
clock+=6000;tick();assert.equal(requests.length,2);
console.log('PASS: settings access, right click, draggable window, saved position; runtime distance trigger, confirmation, deduplication, combat/friend exclusion and timeout stop');
// New controls persist actual booleans and immediately affect detection.
const enabledControl=settingsRoot.querySelector('#enabled'),strangersControl=settingsRoot.querySelector('#strangers');
assert.equal(enabledControl.value,'no');assert.equal(strangersControl.value,'no');
enabledControl.value='yes';enabledControl.onchange();
players[2].d.relation=1;tick();assert.equal(requests.length,2);
strangersControl.value='yes';strangersControl.onchange();tick();assert.equal(requests.length,3);
assert.equal(data['gogatki:proximity:v2:margonem:1'].strangersAreEnemies,true);
capture.consume({builds:{action:'UPDATE_CURRENT_ID',currentId:3}});tick();
const multiSelect=settingsRoot.querySelector('tbody').children[6].children[1].children[0];
multiSelect.value='0';multiSelect.onchange();
players[3]={d:{id:3,x:11,y:10,prof:'w',relation:3,nick:'Drugi wróg'}};
clock+=3000;tick();assert.equal(requests.at(-1),'builds&action=updateCurrent&id=0');
assert.equal(requests.length,4);
capture.consume({builds:{action:'UPDATE_CURRENT_ID',currentId:0}});tick();
strangersControl.value='no';strangersControl.onchange();clock+=3000;tick();
assert.equal(requests.at(-1),'builds&action=updateCurrent&id=2');
assert.equal(data['gogatki:proximity:v2:margonem:1'].strangersAreEnemies,false);
console.log('PASS: Yes/No controls persist; strangers affect multi-target counting; group set overrides profession and releases correctly');
// No new request on yellow/green maps, in a group or on boss maps.
capture.consume({builds:{action:'UPDATE_CURRENT_ID',currentId:2}});tick();
players[2].d.relation=3;delete players[3];clock+=3000;
capture.consume({town:{file:'x',id:5,name:'Zwykła mapa',pvp:1}});tick();assert.equal(requests.length,5);
capture.consume({town:{pvp:0}});tick();assert.equal(requests.length,5);
capture.consume({town:{pvp:2}});
const skipGroup=settingsRoot.querySelector('#skip-group');skipGroup.value='yes';skipGroup.onchange();
capture.consume({party:{members:{1:{},2:{}}}});tick();assert.equal(requests.length,5);
capture.consume({party:{}});
const skipBoss=settingsRoot.querySelector('#skip-boss');skipBoss.value='yes';skipBoss.onchange();
w.Engine.map.d.id=6477;capture.consume({town:{file:'vestibule',id:6477,name:'Jaskinia Ulotnych Wspomnień'}});tick();assert.equal(requests.length,5);
w.Engine.map.d.id=5;capture.consume({town:{file:'normal',id:5,name:'Zwykła mapa',pvp:2}});tick();clock+=1000;tick();assert.equal(requests.length,6);
assert.equal(requests.at(-1),'builds&action=updateCurrent&id=3');
console.log('PASS: runtime blocks all sends on green/yellow maps, in party and in vestibule; resumes on red map');


