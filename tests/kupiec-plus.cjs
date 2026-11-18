const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../gogatki/modules');
const source=fs.readFileSync(path.join(root,'kupiec-plus.js'),'utf8');
async function install(page) {
 await page.evaluate(source => {
  window.unsafeWindow=window;
  window.store=JSON.parse(localStorage.getItem('fixture:gm') || '{}');
  window.GM_getValue=(key,fallback)=>store[key] ?? fallback;
  window.GM_setValue=(key,value)=>{store[key]=value;localStorage.setItem('fixture:gm',JSON.stringify(store));};
  let definition;
  new Function('GogatkiRuntime','unsafeWindow','GM_getValue','GM_setValue',source)(
   {register(value){if(definition)throw Error('Duplicate registration');definition=value;}},window,GM_getValue,GM_setValue);
  if(definition?.id!=='kupiec-plus')throw Error('Wrong module ID');
  definition.start();
 },source);
}
let checks=0;
function eq(actual,expected,label){assert.deepEqual(actual,expected,label);checks++;}
async function fixture(browser,name,mode='NI',options={}) {
 const page=await browser.newPage({viewport:{width:1200,height:900}});
 page.setDefaultTimeout(5000);
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><head><style>button,input,label{font-size:40px!important} label:after{content:"BAD"}</style></head><body><div id="loots"></div><div class="loot-window"></div></body>'}));
 await page.goto('https://fixture.margonem.pl/');
 await page.evaluate(({mode,options})=>{
  for(const [key,value] of Object.entries(options.storage || {}))localStorage.setItem(key,JSON.stringify(value));
  window.test={requests:[],items:{},npcs:{},parsed:[],shopCalls:[],fillCalls:[],finalized:0,menus:[],media:0,battle:false};
  window.message=text=>{test.lastMessage=text;};
  window._t=(key,args)=>key==='item_split %max%'?'Podziel '+args['%max%']:key;
  window.ut_fulltime=()=> 'DATA';
  window.itemTip=()=>test.tip;
  window.MargoTipsParser={getTip:()=>test.tip};
  HTMLMediaElement.prototype.play=function(){test.media++;test.sound=this.src;return Promise.resolve();};
  HTMLMediaElement.prototype.pause=function(){};
  const hero={id:1,nick:'Hero',clan:1,vip:1,x:0,y:0,maxhp:1000};
  const map={id:1,pvp:2,visibility:4};
  function parser(packet){
   test.parsed.push(JSON.parse(JSON.stringify(packet)));
   if(packet.h)Object.assign(hero,packet.h);
   if(packet.item)Object.assign(test.items,packet.item);
   if(packet.npcs)for(const npc of packet.npcs)test.npcs[npc.id]=npc;
   if(packet.npcs_del)for(const npc of packet.npcs_del)delete test.npcs[npc.id];
   return 'original parser result';
  }
  const menu=function(menu,event){test.menus.push(menu);return 'original menu';};
  if(mode==='NI')window.Engine={hero:{d:hero},map:{d:map},communication:{parseJSON:parser},interface:{showPopupMenu:menu},
   lock:{check:()=>test.battle},items:{test:()=>({items:test.items}),getItemById:id=>test.items[id]},
   others:{check:()=>Object.fromEntries(Object.entries(test.others||{}).map(([id,d])=>[id,{d}]))},
   npcs:{getById:id=>test.npcs[id]?{d:test.npcs[id]}:null},ev:100,
   shop:{greatMerchant:function(category){test.shopCalls.push(category);test.shopContext=this===Engine.shop;return category;}},
   heroEquipment:{alertWindow(){},checkValue(){test.checked=true;}},
   crafting:{wndEl:document.body,enhancement:{enchant:{autofiller:{autofillFrom:category=>test.fillCalls.push(category)}}}}};
  else {window.hero=hero;window.map=map;window.g={item:test.items,npc:test.npcs,other:{},ev:100,lock:{check:()=>test.battle}};window.parseInput=parser;window.showMenu=(event,menu)=>menu && test.menus.push(menu);}
  window.mAlert=(...args)=>{test.alertArgs=args;return 77;};
  window.setOnlyPositiveNumberInInputWithLetter=()=>{test.positiveChecked=true;};
  test.packet=packet=>mode==='NI'?Engine.communication.parseJSON(packet):parseInput(packet);
  test.menu=(menu,event)=>mode==='NI'?Engine.interface.showPopupMenu(menu,event):showMenu(event,menu);
  window._g=(query,callback,data)=>{
   test.requests.push({query,data});let packet={};
   if(query==='clan&a=skills_show')packet={clan_skills:{quest_bonuses:{timeTickets:{lvl:1}},quest_bonuses_use:{}}};
   if(query.startsWith('clan&a=skills_use'))packet={clan_skills:{quest_bonuses_use:{timeTickets:1}}};
   if(query.includes('&split='))packet={item:{},ack:true};
   if(Object.keys(packet).length)test.packet(packet);
   if(typeof callback==='function')callback(packet);
  };
 },{mode,options});
 await install(page);
 const panel=page.locator('#gogatki-'+name);
 await panel.waitFor({state:'attached'});
 return {page,panel,errors,async close(){eq(errors,[],name+' '+mode+' browser errors');await page.close();}};
}
async function option(f,key,value){
 const input=f.panel.locator('input[data-key="'+key+'"]');
 await input.evaluate((input,value)=>{if(input.type==='checkbox')input.checked=value;else input.value=value;input.dispatchEvent(new Event('change'));},value);
}
async function tick(page){await page.waitForTimeout(800);}
async function testLoader(browser) {
 const sources = Object.fromEntries(['catalogue.json', 'dock.js', 'modules/kupiec-plus.js'].map(file =>
  [file, fs.readFileSync(path.join(__dirname, '../gogatki', file), 'utf8')]));
 for (const mode of ['NI', 'SI']) {
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fixture.margonem.pl/**', route => route.fulfill({body:'<!doctype html><body></body>', contentType:'text/html'}));
  await page.goto('https://fixture.margonem.pl/');
  const setup = async () => page.evaluate(({sources, mode}) => {
   window.unsafeWindow = window;
   window.store = JSON.parse(localStorage.getItem('fixture:gm') || '{}');
   window.GM_getValue = (key, fallback) => store[key] ?? fallback;
   window.GM_setValue = (key, value) => {store[key] = value;localStorage.setItem('fixture:gm', JSON.stringify(store));};
   window.GM_xmlhttpRequest = options => {
    const file = new URL(options.url).pathname.split('/gogatki/')[1];
    setTimeout(() => options.onload({status:sources[file] ? 200 : 404,responseText:sources[file] || ''}), 0);
   };
   window.messages = [];
   window.message = text => messages.push(text);
   HTMLMediaElement.prototype.play = () => Promise.resolve();
   HTMLMediaElement.prototype.pause = () => {};
   window.mAlert = () => 77;
   window._g = () => {};
   const h = {id:123,nick:'Hero',lvl:10,exp:0,ttl:1};
   if (mode === 'NI') window.Engine = {hero:{d:h},map:{d:{id:1}},communication:{parseJSON:() => 42}};
   else {window.hero=h;window.g={};window.parseInput=() => 42;}
  }, {sources, mode});
  await setup();
  const loader = path.join(__dirname, '../gogatki/gogatki.user.js');
  await page.addScriptTag({path:loader});
  const main = page.locator('#gogatek-panel');
  await page.waitForFunction(() => document.getElementById('gogatek-panel')?.dataset.launcherState === 'floating');
  await main.locator('.launcher').evaluate(el => el.click());
  const toggle = main.getByRole('checkbox', {name:'Kupiec+',exact:true});
  await toggle.waitFor();
  eq(await toggle.isChecked(), false, mode+' catalogue initially disabled');
  eq(await page.locator('#gogatki-kupiec-plus').count(), 0, mode+' disabled module not started');
  await toggle.check();
  const panel = page.locator('#gogatki-kupiec-plus');
  await panel.waitFor({state:'attached'});
  eq(await panel.locator('strong').textContent(), 'Kupiec+', mode+' loader starts named module');
  await main.locator('.launcher').evaluate(el => el.click());
  const tile = page.locator('[data-gogatki-dock-item="gogatki-kupiec-plus"]');
  await tile.waitFor();
  eq(await tile.getAttribute('aria-label'), 'Kupiec+ — zwiń', mode+' dock title');
  eq(await tile.locator('svg path').count(), 1, mode+' dock coin icon');
  await panel.locator('.gear').click({button:'right'});
  await page.waitForFunction(() => document.getElementById('gogatki-kupiec-plus').hasAttribute('data-gogatki-docked'));
  await tile.click();
  await page.waitForFunction(() => !document.getElementById('gogatki-kupiec-plus').hasAttribute('data-gogatki-docked'));
  eq(await panel.locator('main').isVisible(), true, mode+' dock restores panel');
  eq(await panel.locator('.options').isVisible(), true, mode+' dock opens all options');
  const headerBox=await panel.locator('header').boundingBox();
  await page.mouse.move(headerBox.x+35,headerBox.y+14);await page.mouse.down();
  await page.mouse.move(headerBox.x-35,headerBox.y+44,{steps:5});await page.mouse.up();
  await tile.click();
  eq(await panel.isVisible(),false,mode+' dock hides full window after dragging');
  await tile.click();
  eq(await panel.locator('.options').isVisible(),true,mode+' dock restores full window after dragging');
  await tile.click();
  await page.waitForFunction(() => document.getElementById('gogatki-kupiec-plus').hasAttribute('data-gogatki-docked'));
  const position = await page.evaluate(() => [store['kupiec-plus:global:v1'].right,store['kupiec-plus:global:v1'].top]);
  await page.setViewportSize({width:750,height:600});
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  eq(await page.evaluate(() => [store['kupiec-plus:global:v1'].right,store['kupiec-plus:global:v1'].top]), position, mode+' dock preserves floating coordinates');
  await page.reload();
  await setup();
  await page.addScriptTag({path:loader});
  await page.waitForFunction(id=>document.getElementById(id)?.hasAttribute('data-gogatki-docked'),'gogatki-kupiec-plus');
  eq(await panel.isVisible(),false,mode+' reload keeps panel hidden in dock');
  await tile.click();
  eq(await panel.locator('.options').isVisible(),true,mode+' full options restored after reload');
  await panel.locator('.gear').click();
  eq(await panel.isVisible(),false,mode+' gear click hides full window');
  await page.waitForFunction(id=>document.getElementById(id)?.hasAttribute('data-gogatki-docked'),'gogatki-kupiec-plus');
  await main.locator('.launcher').evaluate(el => el.click());
  await toggle.uncheck();
  await page.reload();
  await setup();
  await page.addScriptTag({path:loader});
  await main.locator('.launcher').evaluate(el => el.click());
  await toggle.waitFor();
  eq(await toggle.isChecked(), false, mode+' disabled state persists');
  eq(await panel.count(), 0, mode+' disabled after reload');
  eq(await page.evaluate(() => mAlert('Original')), 77, mode+' disabled module leaves game functions intact');
  eq(errors, [], mode+' full loader has no browser errors');
  console.log(mode+' loader and dock passed');
  await page.close();
 }
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const name='kupiec-plus';
 try {
 for(const mode of ['NI','SI']) {
  const f=await fixture(browser,name,mode),p=f.page;
  eq(await p.locator('[id="gogatki-kupiec-plus"]').count(),1,mode+' one combined panel');
  eq(await f.panel.locator('strong').textContent(),'Kupiec+',mode+' combined title');
  eq(await f.panel.getByRole('button',{name:'Uzupełnij',exact:true}).isDisabled(),mode==='SI',mode+' merchant interface guard');
  eq(await f.panel.getByRole('button',{name:'Podziel stos',exact:true}).isDisabled(),false,mode+' split available');
  if(mode==='NI') {
   eq(await p.evaluate(()=>Engine.shop.greatMerchant(9)),3,'shop original return');
   eq(await p.evaluate(()=>test.shopCalls),[1,2,3],'all merchant categories');
   eq(await p.evaluate(()=>test.shopContext),true,'shop original context');
   await p.evaluate(()=>{
    const filler=document.createElement('div');filler.className='autofiller';filler.innerHTML='<button class="button">Fill</button>';document.body.append(filler);filler.firstChild.click();
    const finalize=document.createElement('div');finalize.className='finalize-button';finalize.innerHTML='<button class="button">Sell</button>';finalize.firstChild.onclick=()=>test.finalized++;document.body.append(finalize);
   });
   eq(await p.evaluate(()=>test.fillCalls),[1,2,3],'crafting all categories');
   await f.panel.getByRole('button',{name:'Sprzedaj',exact:true}).click();
   eq(await p.evaluate(()=>test.finalized),1,'native sale button');
   await option(f,'fillKey','z');await option(f,'sellKey','s');
   await p.evaluate(()=>{const input=document.createElement('input');document.body.append(input);input.focus();input.dispatchEvent(new KeyboardEvent('keydown',{key:'s',bubbles:true,composed:true}));});
   eq(await p.evaluate(()=>test.finalized),1,'typing ignores sale shortcut');
   await p.evaluate(()=>document.activeElement.blur());await p.keyboard.press('s');
   eq(await p.evaluate(()=>test.finalized),2,'sale shortcut');
   await option(f,'merchantEnabled',false);
   eq(await f.panel.getByRole('button',{name:'Sprzedaj',exact:true}).isDisabled(),true,'merchant switch disables buttons');
   await p.evaluate(()=>Engine.shop.greatMerchant(9));
   eq(await p.evaluate(()=>test.shopCalls),[1,2,3,9],'disabled merchant preserves game method');
  }
  await p.evaluate(()=>test.items[5]={id:5,name:'Stack',loc:'g',st:0,x:2,y:3,stat:'amount=10'});
  await option(f,'itemId','5');await option(f,'expression','/2');
  await f.panel.getByRole('button',{name:'Podziel stos',exact:true}).click();
  eq(await p.evaluate(()=>test.requests.map(r=>r.query)),['moveitem&st=0&id=5&x=2&y=3&findslot=1&split=5'],mode+' split works independently from merchant');
  await p.evaluate(()=>test.requests=[]);await option(f,'expression','2*3+3');
  await f.panel.getByRole('button',{name:'Podziel stos',exact:true}).click();
  eq(await p.evaluate(()=>test.requests.map(r=>Number(new URLSearchParams(r.query).get('split')))),[2,2,2,3],mode+' split formula');
  await p.evaluate(()=>test.requests=[]);await option(f,'expression','/0');
  await f.panel.getByRole('button',{name:'Podziel stos',exact:true}).click();
  eq(await p.evaluate(()=>test.requests.length),0,mode+' invalid split rejected');
  await option(f,'expression','11');await f.panel.getByRole('button',{name:'Podziel stos',exact:true}).click();
  eq(await p.evaluate(()=>test.requests.length),0,mode+' oversized split rejected');
  await p.evaluate(()=>{
   const item=document.createElement('div');item.id='item5';item.className='item';document.body.append(item);
   item.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,shiftKey:true}));
  });
  eq(await p.evaluate(()=>test.requests.length),1,mode+' Shift shortcut');
  await option(f,'divideEnabled',false);await p.evaluate(()=>{
   test.requests=[];document.getElementById('item5').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,shiftKey:true}));
  });
  eq(await p.evaluate(()=>test.requests.length),0,mode+' split switch stops shortcuts');
  eq(await f.panel.getByRole('button',{name:'Podziel stos',exact:true}).isDisabled(),true,mode+' split button disabled');
  if(mode==='NI') {
   await option(f,'merchantEnabled',true);await p.evaluate(()=>Engine.shop.greatMerchant(9));
   eq(await p.evaluate(()=>test.shopCalls.slice(-3)),[1,2,3],'merchant works while splitting disabled');
  }
  await option(f,'divideEnabled',true);await option(f,'expression','/2');
  await f.panel.locator('.gear').click({button:'right'});
  eq(await f.panel.isVisible(),false,mode+' no floating miniature when collapsed');
  await p.evaluate(()=>document.getElementById('item5').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,shiftKey:true})));
  eq(await p.evaluate(()=>test.requests.length),1,mode+' collapsed still splits');
  await f.panel.locator('.gear').evaluate(el=>el.click());
  const beforeSettings=await f.panel.boundingBox();
  eq(await f.panel.locator('.options').isVisible(),true,mode+' full window includes options');
  await f.panel.locator('.gear').click();
  eq(await f.panel.isVisible(),false,mode+' gear has no intermediate compact window');
  await f.panel.locator('.gear').evaluate(el=>el.click());
  const afterSettings=await f.panel.boundingBox();
  eq([Math.round(afterSettings.x+afterSettings.width),afterSettings.y],
     [Math.round(beforeSettings.x+beforeSettings.width),beforeSettings.y],mode+' settings keep top right corner');
  const header=await f.panel.locator('header').boundingBox();
  await p.mouse.move(header.x+35,header.y+14);await p.mouse.down();
  await p.mouse.move(header.x-65,header.y+74,{steps:5});await p.mouse.up();
  const moved=await f.panel.boundingBox();
  eq([Math.round(moved.x-beforeSettings.x),Math.round(moved.y-beforeSettings.y)],[-100,60],mode+' draggable panel');
  await p.setViewportSize({width:400,height:450});
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const resized=await f.panel.boundingBox();
  eq(resized.x>=0 && resized.y>=0 && resized.x+resized.width<=400 && resized.y+resized.height<=450,true,mode+' panel clamped after resize '+JSON.stringify(resized));
  await p.setViewportSize({width:1200,height:900});
  await option(f,'active',false);
  eq(await f.panel.getByRole('button',{name:'Podziel stos',exact:true}).isDisabled(),true,mode+' global switch disables all actions');
  await option(f,'active',true);
  await install(p);
  eq(await p.locator('#gogatki-'+name).count(),1,mode+' duplicate installation ignored');
  await option(f,'divideEnabled',false);
  await p.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
  eq(await f.panel.count(),0,mode+' cleanup removes panel');
  await install(p);
  eq(await f.panel.locator('[data-key=divideEnabled]').isChecked(),false,mode+' split preference restored');
  eq(await f.panel.locator('[data-key=expression]').inputValue(),'/2',mode+' split expression restored');
  await f.close();
 }
 {
  const f=await fixture(browser,name,'NI',{storage:{
   'maddonz-extracted:greater-merchant:v1':{active:false,fillKey:'f',sellKey:'s'},
   'maddonz-extracted:divide-et-impera:v1':{active:true,itemId:'5',expression:'2*3'},
  }});
  eq(await f.panel.locator('[data-key=merchantEnabled]').isChecked(),false,'merchant opt-out migrated');
  eq(await f.panel.locator('[data-key=fillKey]').inputValue(),'f','merchant shortcut migrated');
  eq(await f.panel.locator('[data-key=expression]').inputValue(),'2*3','divide expression migrated');
  eq(await f.panel.getByRole('button',{name:'Podziel stos',exact:true}).isDisabled(),false,'divide still enabled after migration');
  await f.close();
 }
 {
  const f=await fixture(browser,name),p=f.page;
  await p.evaluate(()=>{test.items[5]={id:5,x:0,y:0,stat:'amount=10'};window._g=(query,callback)=>{test.requests.push({query});test.pending=callback;};});
  await option(f,'itemId','5');await option(f,'expression','/10');
  await f.panel.getByRole('button',{name:'Podziel stos',exact:true}).click();
  await option(f,'divideEnabled',false);
  await p.evaluate(()=>test.pending({item:{}}));
  eq(await p.evaluate(()=>test.requests.length),1,'disabling stops subsequent split requests');
  await f.close();
 }
 await testLoader(browser);
 {
  const f=await fixture(browser,name,'NI',{storage:{
   'maddonz-extracted:merchant-divide:v1':{merchantEnabled:false,divideEnabled:true,expression:'/3',right:70,top:120,collapsed:true},
  }});
  eq(await f.page.evaluate(()=>store['kupiec-plus:global:v1'].expression),'/3','combined standalone preferences migrated into GM storage');
  eq(await f.panel.locator('.panel').evaluate(el=>el.classList.contains('collapsed')),true,'combined collapsed preference migrated');
  eq(await f.page.evaluate(()=>[store['kupiec-plus:global:v1'].right,store['kupiec-plus:global:v1'].top]),[70,120],'combined position migrated');
  await f.panel.locator('.gear').evaluate(el=>el.click());
  await option(f,'expression','/5');
  await f.page.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));localStorage.setItem('maddonz-extracted:merchant-divide:v1',JSON.stringify({expression:'/9'}));});
  await install(f.page);
  eq(await f.panel.locator('[data-key=expression]').inputValue(),'/5','GM settings take priority over old standalone settings');
  await f.close();
 }
 console.log('PASS: '+checks+' combined merchant/divide assertions on NI/SI');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
