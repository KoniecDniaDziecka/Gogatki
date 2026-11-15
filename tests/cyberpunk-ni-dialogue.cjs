const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try {
  const page=await browser.newPage({viewport:{width:1100,height:260},deviceScaleFactor:2});
  const body=(id,left,decoration,classes='dialogue-window',level='3')=>`<div id="${id}" class="${classes}" ${level===null?'':`data-opacity-lvl="${level}"`} style="left:${left}px"><div class="background">${decoration==='nested'?'<div class="border-image"></div>':''}<div class="left"></div></div>${decoration==='direct'?'<div class="border-image"></div>':''}<div class="content"><div class="npc-message">Rozmowa z postacią</div><div class="answers"><span>Wybierz odpowiedź</span></div></div><div class="increase-opacity" title="Przezroczystość"></div></div>`;
  await page.setContent(`<style>body{margin:0;background:repeating-linear-gradient(45deg,#38566c 0 16px,#182c36 16px 32px);font:12px Arial}.dialogue-window{position:absolute;top:20px;width:240px;height:180px;z-index:1}.background{position:absolute;inset:0;z-index:1}.border-image{position:absolute;inset:2px;z-index:-1;background:rgba(0,0,0,.7)}.content{position:relative;z-index:2;padding:42px 12px 12px;pointer-events:none}.npc-message{margin-bottom:12px}.dialogue-window .increase-opacity{position:absolute;top:8px;left:8px;width:13px;height:13px;cursor:pointer}.increase-opacity.disabled{opacity:.4}</style>${body('nested',20,'nested')}${body('absent',290,'none')}${body('direct',560,'direct','dialogue-window border-window transparent')}${body('default',830,'none','dialogue-window',null)}`);
  await page.evaluate(()=>{
   document.documentElement.dataset.cyberpunkNi='on';window.clicks=0;
   for(const root of document.querySelectorAll('.dialogue-window'))root.querySelector('.increase-opacity').onclick=()=>{clicks++;root.dataset.opacityLvl=String((Number(root.dataset.opacityLvl||0)+1)%6);};
  });
  const geometry=()=>page.locator('.dialogue-window,.increase-opacity,.content').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return[r.x,r.y,r.width,r.height]}));
  const before=await geometry();
  const css=fs.readFileSync(process.env.CYBERPUNK_DIALOGUE_CSS||path.join(__dirname,'../cyberpunk-ni/cyberpunk-ni.css'),'utf8');
  await page.addStyleTag({content:css});
  assert.deepEqual(await geometry(),before,'native dialog/button positions and sizes unchanged');
  const alpha=root=>root.evaluate(e=>{const color=getComputedStyle(e).backgroundColor;return color.startsWith('rgba')?Number(color.split(',').at(-1).replace(')','')):1;});
  const levels=[0,.215,.43,.645,.86,1];
  for(const id of ['nested','absent','direct']) {
   const root=page.locator('#'+id),button=root.locator('.increase-opacity');
   const initialAlpha=await alpha(root);
   assert(Math.abs(initialAlpha-.645)<1/255,'dialog backdrop must be visible without a direct border-image child (alpha='+initialAlpha+')');
   assert.equal(await button.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(23, 31, 39)','opacity icon has its own contrasting backdrop');
   assert.equal(await button.evaluate(e=>getComputedStyle(e).opacity),'1');
   assert.equal(await button.evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e;}),true,'decorative background cannot intercept icon clicks');
   for(const level of [4,5,0,1,2,3]) {
    await button.click();
    assert.equal(await root.getAttribute('data-opacity-lvl'),String(level));
    assert(Math.abs(await alpha(root)-levels[level])<1/255,'native level changes the real dialog backdrop');
    assert.equal(await root.evaluate(e=>getComputedStyle(e).opacity),'1');
    assert.equal(await root.locator('.npc-message').evaluate(e=>getComputedStyle(e).opacity),'1');
    assert.equal(await button.evaluate(e=>getComputedStyle(e).opacity),'1');
   }
   await page.mouse.move(1090,250);
  }
  assert.equal(await page.evaluate(()=>clicks),18);
  assert(Math.abs(await alpha(page.locator('#default'))-.86)<1/255,'dialog with no saved level starts readable');
  await page.locator('#nested .increase-opacity').evaluate(e=>e.classList.add('disabled'));
  assert.equal(await page.locator('#nested .increase-opacity').evaluate(e=>getComputedStyle(e).opacity),'0.4','native disabled state retained');
  await page.locator('#nested .increase-opacity').evaluate(e=>e.classList.remove('disabled'));
  if(process.env.CYBERPUNK_DIALOGUE_SCREENSHOT)await page.screenshot({path:process.env.CYBERPUNK_DIALOGUE_SCREENSHOT});
  console.log('PASS: direct/nested/missing decoration, readable default, six native levels, visible clickable icon, unchanged geometry and disabled state.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
