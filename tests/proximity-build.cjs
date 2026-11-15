const {chromium}=require('playwright');
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../gogatki/modules/proximity-build.js','utf8');
let moduleDef;vm.runInNewContext(source,{GogatkiRuntime:{register:m=>moduleDef=m}});
const t=moduleDef.testing,hero={id:1,x:20,y:20,clan:{id:9}},enemy={id:2,x:25,y:20,relation:3,prof:'w'};
for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
 const range=dx&&dy?4:5,scan=t.createApproachScanner();
 assert.equal(scan([{...enemy,x:20+dx*range,y:20+dy*range}],hero,false).length,1);
 assert.equal(scan([{...enemy,x:20+dx*(range+1),y:20+dy*(range+1)}],hero,false).length,0);
}
for(const relation of [2,4,5,7])assert.equal(t.nearby([{...enemy,relation}],hero,5,true).length,0);
assert.equal(t.nearby([{...enemy,relation:1}],hero,5,false).length,0);
assert.equal(t.selectBuild([enemy,{...enemy,id:3}],{w:'1',multiple:'0'}),'0');
for(const pvp of [0,1,3,null])assert.ok(t.pauseReason({}, {pvp}));
for(const b of t.BOSS_LOCATIONS)for(const id of [b.mapId,b.vestibuleId])assert.ok(t.pauseReason({skipBossMaps:true},{id,pvp:2}));
console.log('PASS: range boundaries, protected relations, multiple opponents, red maps and all boss exclusions');
if(process.env.TEST_BROWSER) (async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1000,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://test.margonem.pl/**',r=>r.fulfill({body:'<html><body></body></html>',contentType:'text/html'}));
 await page.goto('https://test.margonem.pl/');
 await page.addInitScript(()=>{});
 async function boot(){
 await page.evaluate(()=>{
  window.unsafeWindow=window;window.GM_getValue=(k,d)=>JSON.parse(localStorage.getItem(k)??JSON.stringify(d));window.GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  window.requests=[];window.players={2:{id:2,x:25,y:20,relation:3,prof:'w',nick:'Wróg'}};
  window.Engine={hero:{d:{id:1,x:20,y:20}},map:{d:{id:10,pvp:2}},communication:{parseJSON(p){return p;}},others:{check:()=>window.players},lock:{check:()=>false}};
  window._g=(request,cb)=>{requests.push(request);Engine.communication.parseJSON({builds:{currentId:Number(new URLSearchParams(request).get('id'))}});cb?.({});};
  window.GogatkiRuntime={register:m=>window.mod=m};
 });
 await page.addScriptTag({content:source});await page.evaluate(()=>mod.start());
 await page.evaluate(()=>Engine.communication.parseJSON({builds:{action:'INIT',list:[{id:0,name:'Podstawowy'},{id:1,name:'PvP'}],currentId:0}}));
 await page.waitForTimeout(350);
 }
 await boot();
 const host=page.locator('#gogatki-proximity-build');
 await host.locator('select[aria-label="Zestaw przeciw: Wojownik"]').selectOption('1');
 await host.locator('#enabled').selectOption('yes');
 await page.waitForTimeout(1100);assert.equal(await page.evaluate(()=>requests.length),1);
 await host.locator('.gear').click({button:'right'});assert.ok(await host.locator('.panel').evaluate(e=>e.classList.contains('collapsed')));
 await host.locator('.gear').click();assert.ok(!await host.locator('.panel').evaluate(e=>e.classList.contains('collapsed')));
 await host.locator('.gear').click();assert.ok(await host.locator('.body').isHidden());await host.locator('.gear').click();
 await page.evaluate(()=>{Engine.communication.parseJSON({builds:{currentId:0},town:{pvp:1}});requests.length=0;});
 await page.waitForTimeout(2800);assert.equal(await page.evaluate(()=>requests.length),0);
 await page.evaluate(()=>Engine.communication.parseJSON({town:{pvp:2},f:{init:1}}));
 await page.waitForTimeout(700);assert.equal(await page.evaluate(()=>requests.length),0);
 await host.locator('.gear').click({button:'right'});
 await page.reload();await boot();assert.ok(await host.locator('.panel').evaluate(e=>e.classList.contains('collapsed')));
 await host.locator('.gear').click();assert.equal(await host.locator('select[aria-label="Zestaw przeciw: Wojownik"]').inputValue(),'1');
 await page.setViewportSize({width:400,height:400});
 const box=await host.boundingBox();assert.ok(box.x>=0 && box.y>=0 && box.x+box.width<=401);
 assert.deepEqual(errors,[]);
 console.log('PASS: ranges, relations, boss exclusions, real panel controls, full build request and confirmation, map/battle guards, persistence and resize');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
