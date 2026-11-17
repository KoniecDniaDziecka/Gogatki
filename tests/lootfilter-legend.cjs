const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../gogatki/modules/lootfilter.js'),'utf8');
const dock=fs.readFileSync(path.join(__dirname,'../gogatki/dock.js'),'utf8');
let checks=0;
const eq=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
async function fixture(browser,mode,options={}){
 const page=await browser.newPage({viewport:{width:1200,height:850}});page.setDefaultTimeout(6000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><body><div class="game-layer"></div><div class="loot-window"><div class="loot-item-wrapper"><div data-item-type="t-leg"></div></div><button class="accept-button">OK</button></div><div id="loots"><div class="loot-wrapper"><div class="itemHighlighter t_leg"></div></div><button id="loots_button">OK</button></div></body>'}));
 await page.goto('https://fixture.margonem.pl/');
 const setup=async()=>page.evaluate(({mode,options})=>{
  window.unsafeWindow=window;
  window.store=JSON.parse(localStorage.getItem('fixture:gm')||'{}');
  store['loot-filter-settings-v1']??={settingsOpen:true,...options.config};
  window.GM_getValue=(key,fallback)=>store[key]??fallback;
  window.GM_setValue=(key,value)=>{store[key]=value;localStorage.setItem('fixture:gm',JSON.stringify(store));};
  if(options.legacy)localStorage.setItem('maddonz-extracted:i-am-legend:v1',JSON.stringify(options.legacy));
  window.test={requests:[],finalized:[],sounds:[],paused:0,nativeCalls:0,mutate:!!options.mutate};
  const hero={id:1,clan:options.noClan?0:7,prof:'w',x:0,y:0};test.hero=hero;
  const parser=function(data,extra){
   test.nativeCalls++;test.thisValue=this;test.extra=extra;test.inputType=typeof data;
   if(typeof data==='string')data=JSON.parse(data);
   if(extra==='throw')throw Error('Native failure');
   if(test.mutate){for(const item of Object.values(data.item||{})){item.name='consumed';item.stat='';delete item.loc;}delete data.item;if(data.loot)data.loot.init=0;}
   return 42;
  };
  test.nativeParser=parser;
  if(mode==='NI')window.Engine={hero:{d:hero},communication:{parseJSON:parser},bags:[[20,0],[20,0],[20,0]],party:{getMembers:()=>new Map()},ev:100,
   soundManager:{getDataSettingMainVolume:()=>65},loots:{lootUrl:decisions=>'&decisions='+JSON.stringify(decisions),finalize:decisions=>test.finalized.push(decisions)}};
  else{window.hero=hero;window.g={bags:[[20,0],[20,0],[20,0]],party:{},loots:{},ev:100};window.parseInput=parser;window.sendLoots=()=>test.finalized.push({...g.loots});window.sound={manager:{data:{volume:45}}};}
  test.parse=(packet,extra)=>mode==='NI'?Engine.communication.parseJSON(packet,extra):parseInput(packet,extra);
  window._g=(query,callback,data)=>test.requests.push({query,data});
  HTMLMediaElement.prototype.play=function(){test.sounds.push({url:this.src,volume:this.volume});return Promise.resolve();};
  HTMLMediaElement.prototype.pause=function(){test.paused++;};
  test.loot=(id=1,rarity='legendary',loc='l',source='fight')=>({loot:{init:1,source,endTs:150},item:{[id]:{id,hid:'hash'+id,name:'Item '+id,cl:1,loc,stat:'rarity='+rarity+';reqp=w',_cachedStats:{rarity}}}});
 },{mode,options});
 const install=async()=>page.evaluate(source=>{
  let definition;new Function('GogatkiRuntime','unsafeWindow','GM_getValue','GM_setValue',source)({register:value=>{definition=value;}},window,GM_getValue,GM_setValue);definition.start();
 },source);
 await setup();await install();
 const panel=page.locator('#standalone-loot-filter');await panel.waitFor();
 const legend=panel.locator('[data-legend-settings]');await legend.locator('summary').click();
 const set=async(key,value)=>legend.locator('[data-legend="'+key+'"]').evaluate((input,value)=>{if(input.type==='checkbox')input.checked=value;else input.value=value;input.dispatchEvent(new Event('change'));},value);
 return {page,panel,legend,set,setup,install,async close(){eq(errors,[],mode+' no browser errors');await page.close();}};
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 for(const mode of ['NI','SI']){
  {
   const f=await fixture(browser,mode,{mutate:true,config:{autoAccept:'always'}}),p=f.page;
   const result=await p.evaluate(()=>{const owner=window.Engine?.communication||window;const result=test.parse(test.loot(),'preserved');return [result,test.thisValue===owner,test.extra];});
   eq(result,[42,true,'preserved'],mode+' native parser calling convention');
   eq(await p.evaluate(()=>test.finalized.length),0,mode+' legendary loot never auto-finalizes');
   eq(await p.evaluate(()=>test.requests.filter(r=>r.query.startsWith('chat'))),[{query:'chat&channel=clan',data:{c:'ITEM#hash1'}}],mode+' legend chat uses pre-parser snapshot');
   eq(await p.evaluate(()=>test.requests.filter(r=>r.query.startsWith('loot')).length),1,mode+' filters still select the loot');
   eq(await p.evaluate(()=>test.sounds),[{url:'https://cronus.margonem.com/sounds/heroes_here.mp3',volume:mode==='NI'?.65:.45}],mode+' sound and volume');
   eq(await p.evaluate(()=>document.body.style.getPropertyValue('--gogatki-loot-legend-size')),'30px',mode+' native glow');
   eq(await p.locator('.gogatki-loot-legend-window').count(),1,mode+' native loot window is highlighted');
   await p.evaluate(()=>test.parse(test.loot()));
   eq(await p.evaluate(()=>test.requests.filter(r=>r.query.startsWith('chat')).length),1,mode+' repeated init does not duplicate clan message');
   eq(await p.evaluate(()=>test.sounds.length),1,mode+' repeated init does not replay sound');
   await p.evaluate(()=>test.parse(test.loot(2,'common')));
   eq(await p.evaluate(()=>test.finalized.length),1,mode+' ordinary loot can still auto-finalize');
   eq(await p.evaluate(()=>document.body.style.getPropertyValue('--gogatki-loot-legend-size')),'',mode+' ordinary loot clears effects');
   await p.evaluate(()=>{
    const packet=test.loot(3,'common');packet.item[4]={id:4,hid:'mixed',name:'Mixed legend',cl:1,loc:'k',stat:'rarity=legendary'};
    test.parse(packet);
   });
   eq(await p.evaluate(()=>test.finalized.length),1,mode+' a colossus legend in mixed loot also blocks auto-finalization');
   await f.close();
  }
  {
   const f=await fixture(browser,mode,{config:{enabled:false}}),p=f.page;
   await p.evaluate(()=>test.parse(test.loot(5)));
   eq(await p.evaluate(()=>test.requests.filter(r=>r.query.startsWith('loot')).length),0,mode+' disabled filters send no selection');
   eq(await p.evaluate(()=>test.sounds.length),1,mode+' notification independent from filter switch');
   await f.set('enabled',false);
   eq(await p.evaluate(()=>document.body.style.getPropertyValue('--gogatki-loot-legend-size')),'',mode+' notification switch clears glow');
   await p.evaluate(()=>test.parse(test.loot(6)));
   eq(await p.evaluate(()=>test.sounds.length),1,mode+' disabled notification remains silent');
   await f.close();
  }
  {
   const f=await fixture(browser,mode),p=f.page;
   await f.set('mute',true);await f.set('clanMessageTemplate','');
   await p.evaluate(()=>test.parse(test.loot(7)));
   eq(await p.evaluate(()=>test.sounds.length),0,mode+' mute');
   eq(await p.evaluate(()=>test.requests.filter(r=>r.query.startsWith('chat')).length),0,mode+' empty template suppresses chat');
   await f.set('enabled',false);await f.set('mute',false);await f.set('customAudio','https://example.com/custom.mp3');
   await f.set('clanMessageTemplate','${name}: ${id}');await f.set('shadowColor','#12c9bd');await f.set('shadowSize',45);await f.set('confetti',true);await f.set('enabled',true);
   await f.legend.getByRole('button',{name:'Podgląd powiadomienia'}).click();
   eq(await p.evaluate(()=>test.requests.filter(r=>r.query.startsWith('chat')).length),0,mode+' preview never sends chat');
   eq(await p.evaluate(()=>test.sounds.at(-1).url),'https://example.com/custom.mp3',mode+' custom sound');
   const pausedBefore=await p.evaluate(()=>test.paused);
   await f.set('mute',true);
   eq((await p.evaluate(()=>test.paused))>pausedBefore,true,mode+' muting stops currently playing audio');
   await f.set('mute',false);
   eq(await p.evaluate(()=>document.body.style.getPropertyValue('--gogatki-loot-legend-window')),'#12c9bd',mode+' custom color');
   eq(await p.locator('[data-gogatki-loot-confetti]').count(),1,mode+' local confetti');
   await p.evaluate(()=>test.parse(test.loot(8,'legendary','k','colossus')));
   eq(await p.evaluate(()=>test.requests.filter(r=>r.query.startsWith('chat'))),[{query:'chat&channel=clan',data:{c:'Item 8: ITEM#hash8'}}],mode+' colossus legend notification and template');
   eq(await p.evaluate(()=>test.requests.filter(r=>r.query.startsWith('loot')).length),1,mode+' colossus notification does not invoke fight filters');
   await f.set('randomAudio','https://example.com/random.mp3');
   await f.legend.getByRole('button',{name:'Podgląd powiadomienia'}).click();
   eq(await p.evaluate(()=>test.sounds.at(-1).url),'https://example.com/random.mp3',mode+' random sound list');
   await f.set('enabled',false);
   eq(await p.locator('[data-gogatki-loot-confetti]').count(),0,mode+' disable removes confetti');
   await f.close();
  }
  {
   const f=await fixture(browser,mode,{config:{enabled:false}}),p=f.page;
   await p.evaluate(()=>test.parse(test.loot(50,'legendary','g')));
   eq(await p.evaluate(()=>test.sounds.length),0,mode+' inventory legend is not a dropped legend');
   await p.evaluate(()=>{
    const packet=test.loot(51);packet.item[52]={...packet.item[51],id:52,hid:'hash52',name:'Second legend'};
    packet.loot.endTs=100.1;test.parse(packet);
   });
   eq(await p.evaluate(()=>test.requests.filter(r=>r.query.startsWith('chat'))),[{query:'chat&channel=clan',data:{c:'ITEM#hash51 ITEM#hash52'}}],mode+' multiple legends share one message');
   await p.waitForTimeout(150);
   eq(await p.evaluate(()=>document.body.style.getPropertyValue('--gogatki-loot-legend-size')),'',mode+' loot deadline removes glow');
   await f.close();
  }
  {
   const f=await fixture(browser,mode,{noClan:true}),p=f.page;
   await p.evaluate(()=>test.parse(test.loot(9)));
   eq(await p.evaluate(()=>test.requests.filter(r=>r.query.startsWith('chat')).length),0,mode+' no clan skip');
   eq(await p.evaluate(()=>test.sounds.length),1,mode+' no clan still notifies');
   await f.close();
  }
  {
   const f=await fixture(browser,mode),p=f.page;
   await p.evaluate(()=>{test.parse(test.loot(10));test.parse(test.loot(11));test.hero.id=2;});
   await p.waitForTimeout(1600);
   eq(await p.evaluate(()=>test.requests.filter(r=>r.query.startsWith('chat')).length),1,mode+' queued messages do not follow character changes');
   await f.close();
  }
  {
   const f=await fixture(browser,mode,{config:{minPrice:'5000',whiteList:['keep']},legacy:{active:false,mute:true,shadowColor:'#112233',shadowSize:50}}),p=f.page;
   eq(await p.evaluate(()=>store['loot-filter-settings-v1'].minPrice),'5000',mode+' existing filter settings preserved');
   eq(await p.evaluate(()=>store['loot-filter-settings-v1'].legendNotification.enabled),false,mode+' standalone opt-out migrated');
   eq(await p.evaluate(()=>store['loot-filter-settings-v1'].legendNotification.shadowColor),'#112233',mode+' standalone color migrated');
   await f.set('enabled',true);await f.set('customAudio','https://example.com/persist.mp3');
   await p.reload();await f.setup();await f.install();await f.panel.waitFor();
   eq(await p.evaluate(()=>store['loot-filter-settings-v1'].legendNotification.customAudio),'https://example.com/persist.mp3',mode+' settings persist');
   eq(await p.evaluate(()=>store['loot-filter-settings-v1'].legendNotification.enabled),true,mode+' persisted settings win over legacy');
   await f.close();
  }
  {
   const f=await fixture(browser,mode),p=f.page;
   await p.evaluate(source=>new Function('GogatkiDockRuntime','unsafeWindow','GM_getValue','GM_setValue',source)({register:value=>{window.__gogatkiTileDock=value.create();}},window,GM_getValue,GM_setValue),dock);
   await f.panel.locator('[data-settings]').click();
   await p.waitForFunction(()=>document.getElementById('standalone-loot-filter').hasAttribute('data-gogatki-docked'));
   await p.evaluate(()=>test.parse(test.loot(12)));
   eq(await p.evaluate(()=>test.sounds.length),1,mode+' notifications remain active in dock');
   const tile=p.locator('[data-gogatki-dock-item="standalone-loot-filter"]');await tile.click();
   await p.waitForFunction(()=>!document.getElementById('standalone-loot-filter').hasAttribute('data-gogatki-docked'));
   eq(await f.panel.locator('main').isVisible(),true,mode+' dock restores settings');
   await f.install();await p.evaluate(()=>test.parse(test.loot(12)));
   eq(await p.evaluate(()=>test.sounds.length),1,mode+' duplicate module start ignored');
   await p.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));
   eq(await p.evaluate(mode=>(mode==='NI'?Engine.communication.parseJSON:parseInput)===test.nativeParser,mode),true,mode+' parser restored on cleanup');
   eq(await p.locator('#gogatki-loot-legend-style').count(),0,mode+' style cleaned');
   eq(await p.evaluate(()=>document.body.style.getPropertyValue('--gogatki-loot-legend-size')),'',mode+' body glow cleaned');
   eq(await f.panel.count(),0,mode+' panel removed on cleanup');
   await f.close();
  }
  {
   const f=await fixture(browser,mode),p=f.page;
   eq(await p.evaluate(()=>{try{test.parse(test.loot(13),'throw');return false;}catch(e){return e.message==='Native failure';}}),true,mode+' native errors propagate');
   eq(await p.evaluate(()=>test.requests.length),0,mode+' failed native parsing triggers no actions');
   await p.evaluate(()=>test.parse(JSON.stringify(test.loot(14)),'string'));
   eq(await p.evaluate(()=>test.inputType),'string',mode+' native string packet preserved');
   eq(await p.evaluate(()=>test.sounds.length),1,mode+' string packet notification');
   await f.close();
  }
 }
 console.log('PASS: '+checks+' Lootfilter/I Am Legend assertions on NI/SI');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
