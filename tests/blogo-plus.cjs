const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../gogatki/modules');
const source=fs.readFileSync(path.join(root,'blogo-plus.js'),'utf8');
async function install(page) {
 await page.evaluate(source => {
  window.unsafeWindow=window;
  window.store=JSON.parse(localStorage.getItem('fixture:gm') || '{}');
  window.GM_getValue=(key,fallback)=>store[key] ?? fallback;
  window.GM_setValue=(key,value)=>{store[key]=value;localStorage.setItem('fixture:gm',JSON.stringify(store));};
  let definition;
  new Function('GogatkiRuntime','unsafeWindow','GM_getValue','GM_setValue',source)(
   {register(value){if(definition)throw Error('Duplicate registration');definition=value;}},window,GM_getValue,GM_setValue);
  if(definition?.id!=='blogo-plus')throw Error('Wrong module ID');
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
 const sources = Object.fromEntries(['catalogue.json', 'dock.js', 'modules/blogo-plus.js'].map(file =>
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
  const toggle = main.getByRole('checkbox', {name:'Błogo+',exact:true});
  await toggle.waitFor();
  eq(await toggle.isChecked(), false, mode+' catalogue initially disabled');
  eq(await page.locator('#gogatki-blogo-plus').count(), 0, mode+' disabled module not started');
  await toggle.check();
  const panel = page.locator('#gogatki-blogo-plus');
  await panel.waitFor({state:'attached'});
  eq(await panel.locator('strong').textContent(), 'Błogo+', mode+' loader starts named module');
  await main.locator('.launcher').evaluate(el => el.click());
  const tile = page.locator('[data-gogatki-dock-item="gogatki-blogo-plus"]');
  await tile.waitFor();
  eq(await tile.getAttribute('aria-label'), 'Błogo+ — zwiń', mode+' dock title');
  eq(await tile.locator('svg ellipse').count(), 1, mode+' dock blessing icon');
  await panel.locator('.gear').click({button:'right'});
  await page.waitForFunction(() => document.getElementById('gogatki-blogo-plus').hasAttribute('data-gogatki-docked'));
  await tile.click();
  await page.waitForFunction(() => !document.getElementById('gogatki-blogo-plus').hasAttribute('data-gogatki-docked'));
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
  await page.waitForFunction(() => document.getElementById('gogatki-blogo-plus').hasAttribute('data-gogatki-docked'));
  await page.evaluate(mode => {
   const packet={item:{10:{id:10,name:'Buff',loc:'g',st:10,stat:'ttl=1'}}};
   if(mode==='NI')Engine.communication.parseJSON(packet);else parseInput(packet);
  },mode);
  await panel.getByRole('button',{name:'Pomiń',exact:true}).waitFor();
  await page.waitForFunction(()=>!document.getElementById('gogatki-blogo-plus').hasAttribute('data-gogatki-docked'));
  eq(await panel.locator('.question').isVisible(),true,mode+' reminder opens from dock');
  await panel.getByRole('button',{name:'Pomiń',exact:true}).click();
  await tile.click();
  await page.waitForFunction(()=>document.getElementById('gogatki-blogo-plus').hasAttribute('data-gogatki-docked'));
  const position = await page.evaluate(() => [store['blogo-plus:global:v1'].right,store['blogo-plus:global:v1'].top]);
  await page.setViewportSize({width:750,height:600});
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  eq(await page.evaluate(() => [store['blogo-plus:global:v1'].right,store['blogo-plus:global:v1'].top]), position, mode+' dock preserves floating coordinates');
  await page.reload();
  await setup();
  await page.addScriptTag({path:loader});
  await page.waitForFunction(id=>document.getElementById(id)?.hasAttribute('data-gogatki-docked'),'gogatki-blogo-plus');
  eq(await panel.isVisible(),false,mode+' reload keeps panel hidden in dock');
  await tile.click();
  eq(await panel.locator('.options').isVisible(),true,mode+' full options restored after reload');
  await panel.locator('.gear').click();
  eq(await panel.isVisible(),false,mode+' gear click hides full window');
  await page.waitForFunction(id=>document.getElementById(id)?.hasAttribute('data-gogatki-docked'),'gogatki-blogo-plus');
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
 const name='blogo-plus';
 try {
 for(const mode of ['NI','SI']) {
  const f=await fixture(browser,name,mode),p=f.page;
  eq(await f.panel.locator('strong').textContent(),'Błogo+',mode+' module title');
  eq(await p.evaluate(()=>test.packet({})), 'original parser result',mode+' parser return preserved');
  await p.evaluate(()=>{
   test.items[20]={id:20,name:'Buff',loc:'g',st:0,stat:'ttl=1'};
   test.packet({item:{10:{id:10,name:'Buff',loc:'g',st:10,stat:'ttl=1'}}});
  });
  await f.panel.getByRole('button',{name:'Odnów',exact:true}).click();
  eq(await p.evaluate(()=>test.requests.map(r=>r.query)),['moveitem&st=1&id=20'],mode+' renewal uses spare blessing');
  await p.evaluate(()=>test.packet({item:{10:{id:10,name:'Buff',loc:'g',st:10,stat:'ttl=1'}}}));
  eq(await f.panel.locator('.question').isVisible(),false,mode+' duplicate reminder prevented');
  await p.evaluate(()=>{test.battle=true;test.packet({item:{11:{id:11,name:'Other',loc:'g',st:10,stat:'ttl=1'}}});});
  eq(await f.panel.locator('.question').isVisible(),false,mode+' reminder waits for battle');
  await p.evaluate(()=>test.battle=false);await tick(p);
  await f.panel.getByRole('button',{name:'Odnów',exact:true}).click();
  eq(await p.evaluate(()=>test.lastMessage),'Nie masz więcej użyć danego błogosławieństwa',mode+' missing spare blessing message');
  await option(f,'renewCrimsonBuff',false);
  await p.evaluate(()=>test.packet({item:{12:{id:12,name:'Karmazynowe błogosławieństwo',loc:'g',st:10,stat:'ttl=1'}}}));
  eq(await f.panel.locator('.question').isVisible(),false,mode+' crimson reminder setting');
  await p.evaluate(mode=>{
   test.requests=[];
   const others={2:{id:2,x:1,y:1,relation:1},3:{id:3,x:1,y:0,relation:3},4:{id:4,x:3,y:0,relation:1},5:{id:5,x:0,y:1,relation:6},6:{id:6,x:0,y:1,relation:8}};
   if(mode==='NI')test.others=others;else g.other=others;
  },mode);
  await f.panel.getByRole('button',{name:'Pobłogosław',exact:true}).click();
  eq(await p.evaluate(()=>test.requests.map(r=>r.query)),['emo&a=bless&id=2'],mode+' bless only friendly adjacent players');
  await p.evaluate(()=>test.requests=[]);
  await option(f,'blessKey','b');
  await p.evaluate(()=>{const input=document.createElement('input');document.body.append(input);input.focus();});
  await p.keyboard.press('b');
  eq(await p.evaluate(()=>test.requests.length),0,mode+' shortcut ignores typing');
  await p.evaluate(()=>document.activeElement.blur());await p.keyboard.press('b');
  eq(await p.evaluate(()=>test.requests.map(r=>r.query)),['emo&a=bless&id=2'],mode+' blessing shortcut');
  await p.evaluate(mode=>{test.requests=[];if(mode==='NI')Engine.hero.d.vip=0;else hero.vip=0;},mode);
  await f.panel.getByRole('button',{name:'Pobłogosław',exact:true}).click();
  eq(await p.evaluate(()=>test.requests.length),0,mode+' premium requirement');
  eq(await f.panel.locator('.status').textContent(),'Błogosławienie graczy wymaga statusu premium.',mode+' premium requirement message');
  await p.evaluate(mode=>{
   if(mode==='NI')Engine.hero.d.vip=1;else hero.vip=1;
   for(const id of Object.keys(test.items))delete test.items[id];
   test.packet({ask:{q:'Karmazynowe błogosławieństwo',re:'dialog&answer='}});
  },mode);
  eq(await p.evaluate(()=>test.requests.map(r=>r.query)),['dialog&answer=1'],mode+' crimson confirmation');
  eq(await p.evaluate(()=>Object.hasOwn(test.parsed.at(-1),'ask')),false,mode+' consumed confirmation hidden from native parser');
  await p.evaluate(()=>{
   test.requests=[];test.items[50]={id:50,name:'Buff',loc:'g',st:10,stat:'ttl=5'};
   test.packet({ask:{q:'Karmazynowe błogosławieństwo',re:'dialog&answer='}});
  });
  eq(await p.evaluate(()=>test.requests.length),0,mode+' existing blessing preserves confirmation');
  eq(await p.evaluate(()=>Object.hasOwn(test.parsed.at(-1),'ask')),true,mode+' existing blessing leaves packet intact');
  await install(p);
  eq(await p.locator('#gogatki-blogo-plus').count(),1,mode+' duplicate installation ignored');
  await option(f,'active',false);
  await p.evaluate(()=>{test.packet({item:{51:{id:51,name:'Buff',loc:'g',st:10,stat:'ttl=1'}}});test.packet({ask:{q:'Karmazynowe błogosławieństwo',re:'dialog&answer='}});});
  eq(await p.evaluate(()=>test.requests.length),0,mode+' disabled module sends no requests');
  eq(await f.panel.locator('.question').isVisible(),false,mode+' disabled module ignores reminder');
  await f.close();
 }
 {
  const f=await fixture(browser,'blogo-plus'),p=f.page;
  eq(await f.panel.locator('strong').textContent(),'Błogo+','panel title');
  eq(await p.evaluate(()=>getComputedStyle(document.querySelector('#gogatki-blogo-plus').shadowRoot.querySelector('label')).fontSize),'12px','game styles isolated');
  const before=await f.panel.boundingBox();
  eq(await f.panel.locator('.options').isVisible(),true,'all options visible in full window');
  await f.panel.locator('.gear').click();
  eq(await f.panel.isVisible(),false,'gear hides panel without miniature');
  await f.panel.locator('.gear').evaluate(el=>el.click());
  const after=await f.panel.boundingBox();
  eq([before.x+before.width,before.y],[after.x+after.width,after.y],'fixed top right');
  await p.mouse.move(after.x+30,after.y+14);await p.mouse.down();await p.mouse.move(100,80);await p.mouse.up();
  const moved=await f.panel.boundingBox();
  assert(moved.x<after.x && moved.y<after.y);checks++;
  await option(f,'renewCrimsonBuff',false);
  await f.panel.locator('.gear').click({button:'right'});
  eq(await f.panel.isVisible(),false,'no floating miniature when collapsed');
  await p.evaluate(()=>test.packet({item:{9:{id:9,name:'Buff',st:10,stat:'ttl=1'}}}));
  eq(await f.panel.locator('.question').evaluate(el=>el.hidden),false,'collapsed module keeps working');
  eq(await f.panel.locator('.options').isVisible(),true,'reminder opens the full window');
  await option(f,'active',false);
  eq(await f.panel.locator('.question').isVisible(),false,'disable cancels pending confirmation');
  const settings=await p.evaluate(()=>store['blogo-plus:global:v1']);
  await p.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
  eq(await f.panel.count(),0,'pagehide removes panel');
  eq(await p.evaluate(()=>test.packet({})), 'original parser result','cleanup preserves game parser');
  await install(p);
  eq(await f.panel.locator('input[data-key=active]').isChecked(),false,'stored enable state restored');
  eq(await f.panel.locator('input[data-key=renewCrimsonBuff]').isChecked(),false,'stored option restored');
  const restored=await p.evaluate(()=>store['blogo-plus:global:v1']);
  eq([restored.right,restored.top],[settings.right,settings.top],'position retained');
  await p.setViewportSize({width:300,height:250});
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const resized=await f.panel.boundingBox();
  assert(resized.x>=0 && resized.y>=0 && resized.x+resized.width<=300 && resized.y+resized.height<=250);checks++;
  await f.close();
 }
 {
  const f=await fixture(browser,name,'NI',{storage:{'maddonz-extracted:buff-yourself:v1':{active:false,renewCrimsonBuff:false,blessKey:'z',right:70,top:100,collapsed:true}}});
  eq(await f.page.evaluate(()=>store['blogo-plus:global:v1'].blessKey),'z','standalone shortcut migrated to GM storage');
  eq(await f.panel.locator('[data-key=active]').isChecked(),false,'standalone active preference migrated');
  eq(await f.panel.locator('.panel').evaluate(el=>el.classList.contains('collapsed')),true,'standalone collapsed state migrated');
  await f.page.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));localStorage.setItem('maddonz-extracted:buff-yourself:v1',JSON.stringify({active:true,blessKey:'x'}));});
  await install(f.page);
  eq(await f.panel.locator('[data-key=active]').isChecked(),false,'GM active state takes priority');
  eq(await f.panel.locator('[data-key=blessKey]').inputValue(),'z','GM shortcut takes priority');
  await f.close();
 }
 await testLoader(browser);
 console.log('PASS: '+checks+' Błogo+ assertions on simulated NI/SI');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
