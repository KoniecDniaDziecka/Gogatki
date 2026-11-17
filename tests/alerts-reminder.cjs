const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'../gogatki/modules/alerts.js'),'utf8');
const dock = fs.readFileSync(path.join(__dirname,'../gogatki/dock.js'),'utf8');
let checks=0;
const eq=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
async function fixture(browser,mode,options={}) {
 const page=await browser.newPage();page.setDefaultTimeout(5000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><body><button id="game-focus">Game</button></body>'}));
 await page.goto('https://fixture.margonem.pl/');
 const setup=async()=>page.evaluate(({mode,options})=>{
  window.unsafeWindow=window;
  window.store=JSON.parse(localStorage.getItem('fixture:gm')||'{}');
  if(options.collapsed && !store['alerts:global:v1'])store['alerts:global:v1']={collapsed:true};
  window.GM_getValue=(key,fallback)=>store[key]??fallback;
  window.GM_setValue=(key,value)=>{store[key]=value;localStorage.setItem('fixture:gm',JSON.stringify(store));};
  window.test={requests:[],parsed:[],battle:!!options.battle,response:options.response||'available',hold:!!options.hold,callbacks:[],timers:new Map(),now:Date.now()};
  Date.now=()=>test.now;
  const set=window.setTimeout.bind(window),clear=window.clearTimeout.bind(window);
  window.setTimeout=(fn,delay,...args)=>{const id=set(fn,delay,...args);if(delay===15000)test.timers.set(id,fn);return id;};
  window.clearTimeout=id=>{test.timers.delete(id);clear(id);};
  test.hero={id:1,nick:'Hero',clan:options.noClan?0:7,lvl:10,exp:0,ttl:1};
  window.message=text=>{test.message=text;};window.mAlert=()=>77;
  const parse=function(packet,extra){test.thisValue=this;test.extra=extra;if(typeof packet==='string')packet=JSON.parse(packet);test.parsed.push(packet);if(packet.h)Object.assign(test.hero,packet.h);return 42;};
  if(mode==='NI')window.Engine={hero:{d:test.hero},communication:{parseJSON:parse},lock:{check:()=>test.battle}};
  else{window.hero=test.hero;window.g={lock:{check:()=>test.battle}};window.parseInput=parse;}
  test.packet=(packet,extra)=>mode==='NI'?Engine.communication.parseJSON(packet,extra):parseInput(packet,extra);
  window._g=(query,callback)=>{
   test.requests.push(query);
   const respond=()=>{
    const skills=query.startsWith('clan&a=skills_use')?{quest_bonuses_use:{timeTickets:1}}:
     {quest_bonuses:{timeTickets:{lvl:test.response==='unavailable'?0:1}},quest_bonuses_use:test.response==='used'?{timeTickets:1}:{}};
    const packet={clan_skills:skills,otherData:'keep'};
    if(!options.callbackOnly)test.packet(options.stringResponse?JSON.stringify(packet):packet,'request-context');
    if(typeof callback==='function')callback(packet);
   };
   if(test.hold)test.callbacks.push(respond);else respond();
  };
  if(options.legacy)localStorage.setItem('maddonz-extracted:forget-me-not:last:'+location.host+':1',String(test.now-3600000));
 },{mode,options});
 const install=async()=>page.evaluate(source=>{
  let definition;new Function('GogatkiRuntime','unsafeWindow','GM_getValue','GM_setValue',source)({register:value=>definition=value},window,GM_getValue,GM_setValue);definition.start();
 },source);
 await setup();await install();
 const panel=page.locator('#gogatki-alerts'),dialog=page.locator('#gogatki-alerts-reminder');
 const toggle=async value=>panel.locator('[data-key=forgetMeNot]').evaluate((input,value)=>{input.checked=value;input.dispatchEvent(new Event('change'));},value);
 return {page,panel,dialog,toggle,setup,install,async close(){eq(errors,[],mode+' no browser errors');await page.close();}};
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 for(const mode of ['NI','SI']){
  for(const [label,opt] of [['Zwiększ',1],['Zmniejsz',2]]){
   const f=await fixture(browser,mode,{stringResponse:opt===2});const p=f.page;
   await f.dialog.waitFor();
   eq(await p.evaluate(()=>test.requests),['clan&a=skills_show'],mode+' initial read only');
   eq(await p.evaluate(()=>test.parsed[0]),{otherData:'keep'},mode+' consume only requested clan data');
   eq(await p.evaluate(mode=>test.thisValue===(mode==='NI'?Engine.communication:window)&&test.extra==='request-context',mode),true,mode+' native parser calling convention');
   await f.dialog.getByRole('button',{name:label,exact:true}).click();
   eq(await p.evaluate(()=>test.requests),['clan&a=skills_show','clan&a=skills_use&name=timeTickets&opt='+opt],mode+' selected option');
   eq(await p.evaluate(()=>store['alerts:forget-me-not:last:fixture.margonem.pl:1']===test.now),true,mode+' reminder timestamp');
   eq(await f.dialog.count(),0,mode+' dialog closed');
   await p.waitForTimeout(1050);
   eq(await p.evaluate(()=>test.requests.length),2,mode+' cooldown suppresses automatic repeat');
   await p.evaluate(()=>{test.now+=28800001;});
   await f.dialog.waitFor();
   eq(await p.evaluate(()=>test.requests.at(-1)),'clan&a=skills_show',mode+' repeat after 8 hours');
   await f.dialog.getByRole('button',{name:'Przypomnij później'}).click();
   eq(await p.evaluate(()=>test.requests.length),3,mode+' postpone sends no mutation');
   await f.close();
  }
  for(const response of ['used','unavailable']){
   const f=await fixture(browser,mode,{response});
   eq(await f.dialog.count(),0,mode+' no prompt when '+response);
   eq(await f.page.evaluate(()=>test.requests.length),1,mode+' no mutation when '+response);
   await f.close();
  }
  {
   const f=await fixture(browser,mode,{noClan:true});
   eq(await f.page.evaluate(()=>test.requests.length),0,mode+' no clan skip');
   await f.panel.locator('.check-reminder').click();
   eq(await f.page.evaluate(()=>test.requests.length),0,mode+' no clan manual skip');
   await f.close();
  }
  {
   const f=await fixture(browser,mode,{battle:true});
   eq(await f.page.evaluate(()=>test.requests.length),0,mode+' initial battle skip');
   await f.page.evaluate(()=>test.battle=false);await f.dialog.waitFor();
   await f.page.evaluate(()=>test.battle=true);
   await f.dialog.getByRole('button',{name:'Zwiększ',exact:true}).click();
   eq(await f.page.evaluate(()=>test.requests.length),1,mode+' selection in battle blocked');
   await f.page.evaluate(()=>test.battle=false);
   await f.dialog.getByRole('button',{name:'Zwiększ',exact:true}).click();
   eq(await f.page.evaluate(()=>test.requests.length),2,mode+' selection after battle');
   await f.close();
  }
  {
   const f=await fixture(browser,mode,{collapsed:true});
   await f.page.evaluate(source=>new Function('GogatkiDockRuntime','unsafeWindow','GM_getValue','GM_setValue',source)({register:definition=>{window.__gogatkiTileDock=definition.create();}},window,GM_getValue,GM_setValue),dock);
   await f.page.waitForFunction(()=>document.getElementById('gogatki-alerts').hasAttribute('data-gogatki-docked'));
   eq(await f.dialog.isVisible(),true,mode+' prompt remains visible with docked panel');
   await f.toggle(false);
   eq(await f.dialog.count(),0,mode+' off closes prompt');
   eq(await f.page.evaluate(()=>store['alerts:global:v1'].forgetMeNot),false,mode+' switch saved');
   eq(await f.page.evaluate(()=>test.requests.length),1,mode+' off sends no mutation');
   await f.page.reload();await f.setup();await f.install();
   eq(await f.panel.locator('[data-key=forgetMeNot]').isChecked(),false,mode+' off setting survives reload');
   eq(await f.page.evaluate(()=>test.requests.length),0,mode+' disabled reminder does not query on reload');
   await f.close();
  }
  {
   const f=await fixture(browser,mode,{hold:true});
   eq(await f.page.evaluate(()=>test.timers.size),1,mode+' request timeout is armed');
   await f.toggle(false);
   eq(await f.page.evaluate(()=>test.timers.size),0,mode+' off cancels pending request');
   await f.page.evaluate(()=>{test.callbacks.forEach(fn=>fn());});
   eq(await f.dialog.count(),0,mode+' late response cannot reopen prompt');
   await f.close();
  }
  {
   const f=await fixture(browser,mode,{hold:true});
   await f.page.evaluate(()=>{for(const expire of [...test.timers.values()])expire();});
   eq(await f.panel.locator('.check-reminder').isDisabled(),false,mode+' timeout allows retry');
   assert.match(await f.panel.locator('.reminder-status').textContent(),/Brak odpowiedzi/);checks++;
   eq(await f.page.evaluate(()=>Object.keys(store).some(key=>key.startsWith('alerts:forget-me-not:last:'))),false,mode+' timeout does not start 8 hour cooldown');
   await f.close();
  }
  {
   const f=await fixture(browser,mode);
   await f.dialog.waitFor();await f.page.evaluate(()=>test.hero.id=2);
   await f.dialog.getByRole('button',{name:'Zwiększ',exact:true}).click();
   eq(await f.page.evaluate(()=>test.requests.length),1,mode+' stale character choice blocked');
   await f.dialog.waitFor();await f.dialog.getByRole('button',{name:'Zmniejsz',exact:true}).click();
   eq(await f.page.evaluate(()=>store['alerts:forget-me-not:last:fixture.margonem.pl:1']),undefined,mode+' old character history untouched');
   eq(await f.page.evaluate(()=>store['alerts:forget-me-not:last:fixture.margonem.pl:2']===test.now),true,mode+' character history isolated');
   await f.close();
  }
  {
   const f=await fixture(browser,mode,{legacy:true});
   eq(await f.page.evaluate(()=>test.requests.length),0,mode+' standalone reminder history respected');
   await f.panel.locator('.check-reminder').click();await f.dialog.waitFor();
   eq(await f.page.evaluate(()=>test.requests.length),1,mode+' manual check bypasses cooldown');
   await f.page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
   eq(await f.dialog.count(),0,mode+' pagehide removes prompt');
   eq(await f.page.evaluate(()=>test.timers.size),0,mode+' pagehide clears request timers');
   await f.close();
  }
  {
   const f=await fixture(browser,mode,{callbackOnly:true});
   await f.dialog.waitFor();await f.dialog.getByRole('button',{name:'Przypomnij później'}).click();
   eq(await f.page.evaluate(()=>test.requests.length),1,mode+' direct callback response supported');
   await f.close();
  }
 }
 console.log('PASS: '+checks+' Forget Me Not integration assertions on NI/SI');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
