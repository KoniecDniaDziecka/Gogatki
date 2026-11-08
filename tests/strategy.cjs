const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1000,height:750}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://test.margonem.pl/**',r=>r.fulfill({contentType:'text/html',body:'<body></body>'}));
  await page.goto('https://test.margonem.pl/');
  const module=fs.readFileSync(path.join(__dirname,'../gogatki/modules/strategy.js'),'utf8');
  const dock=fs.readFileSync(path.join(__dirname,'../gogatki/dock.js'),'utf8');
  await page.evaluate(({module,dock})=>{
   window.saved={};window._g=()=>{};
   window.Engine={hero:{d:{id:1}},communication:{parseJSON:x=>x},battle:{warriorsList:{},getBattleSkill:()=>({}),getMarkObject:()=>2,close(){}}};
   localStorage.setItem('spell-trigger:1:test.margonem.pl:1',JSON.stringify({active:false,showBattleQueue:true,moveSets:[{id:'old',name:'Zachowany zestaw',moves:[]}],currentMoveSet:'old'}));
   const get=(k,f)=>window.saved[k]??f,set=(k,v)=>window.saved[k]=v;
   let definition;
   new Function('GogatkiRuntime','unsafeWindow','GM_getValue','GM_setValue',module)({register:d=>definition=d},window,get,set);
   if(definition.id!=='strategy'||definition.name!=='Strategy')throw Error('Nieprawidłowa rejestracja');
   definition.start();
   new Function('GogatkiDockRuntime','unsafeWindow','GM_getValue','GM_setValue',dock)({register:d=>window.__gogatkiTileDock=d.create()},window,get,set);
  },{module,dock});
  const host=page.locator('#spell-trigger-standalone');await host.waitFor();
  await host.getByRole('combobox',{name:'Zestaw'}).selectOption('old');
  assert.equal(await host.getByRole('combobox',{name:'Zestaw'}).inputValue(),'old');
  await host.getByRole('button',{name:'Ustawienia Strategy'}).click({button:'right'});
  await page.waitForFunction(()=>window.__gogatkiTileDock.isDocked(document.getElementById('spell-trigger-standalone')));
  const toggle=page.locator('button.gogatki-dock-toggle[data-gogatki-dock-item="spell-trigger-standalone"]');
  await toggle.waitFor({state:'visible'});
  assert.ok(await toggle.locator('svg').count());
  await page.evaluate(()=>{
   Engine.communication.parseJSON({f:{init:1,myteam:1,w:{1:{name:'Hero',team:1,hp:{hpp:100}},2:{name:'Enemy',team:2,hp:{hpp:100}}}}});
   const skill=document.createElement('div');skill.className='battle-skill';skill.setAttribute('battle-skill-id','-1');document.body.append(skill);skill.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true}));
  });
  const queue=page.locator('#spell-trigger-battle-queue');
  await queue.getByRole('button',{name:'1. Zwykły atak → Enemy'}).waitFor();
  assert.equal(await page.evaluate(()=>window.__gogatkiTileDock.isDocked(document.getElementById('spell-trigger-standalone'))),true);
  await toggle.click();
  await host.getByLabel('Aktywny',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.__gogatkiTileDock.isDocked(document.getElementById('spell-trigger-standalone'))),false);
  await host.getByRole('button',{name:'Ustawienia Strategy'}).click();
  await host.getByLabel('Pokazuj kolejkę w oknie walki').uncheck();
  assert.equal(await queue.isVisible(),false);
  assert.equal(await page.evaluate(()=>window.saved['spell-trigger:1:test.margonem.pl:1'].showBattleQueue),false);
  assert.equal(await page.evaluate(()=>window.saved['spell-trigger:1:test.margonem.pl:1'].moveSets[0].name),'Zachowany zestaw');
  assert.deepEqual(errors,[]);
  console.log('OK: rejestracja Strategy, migracja ustawień, dock z błyskawicą, przywracanie panelu, kolejka podczas walki, zapis GM');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
