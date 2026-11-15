const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless:true, executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox'] });
  try {
    const base = path.join(__dirname,'..');
    const page = await browser.newPage({viewport:{width:900,height:300},deviceScaleFactor:2});
    const levels = [0,.25,.5,.75,1,1];
    const rules = levels.map((opacity,level)=>`:is(.border-window.transparent,.dialogue-window)[data-opacity-lvl="${level}"] :is(.border-image,.scrollbar-wrapper){opacity:${opacity}}`).join('');
    const windowHTML = (id,classes,left) => `<div id="${id}" class="${classes}" data-opacity-lvl="0" style="left:${left}px"><div class="header-label-positioner"><div class="draggable-window-element"></div><div class="header-label"><div class="text">${id}</div></div></div><div class="content"><div class="inner-content"><span class="label">Czytelny tekst</span><div class="scroll-wrapper"><div class="scroll-pane"><span>Treść okna</span></div></div><div class="scrollbar-wrapper"><div class="handle"></div></div></div></div><div class="border-image"></div><div class="transparent-window-buttons-menu"><div class="increase-opacity" title="Przezroczystość"></div><div class="manage-configuration-button settings-button"></div></div></div>`;
    await page.setContent(`<style>body{margin:0;background:repeating-linear-gradient(45deg,#38566c 0 16px,#182c36 16px 32px);font:12px Arial}.alerts-layer{position:relative;z-index:1}.border-window,.dialogue-window{position:absolute;top:20px;width:260px;height:180px}.header-label-positioner{height:28px}.header-label{position:relative;text-align:center;line-height:28px}.content{padding:12px}.label{display:block;margin-bottom:10px}.border-image{position:absolute;inset:2px;background:rgba(0,0,0,.7);z-index:-1}.dialogue-window>.border-image{inset:0}.transparent-window-buttons-menu{position:absolute;left:7px;top:7px;display:flex;gap:6px}.increase-opacity,.manage-configuration-button{width:13px;height:13px;cursor:pointer}.scrollbar-wrapper{position:absolute;right:4px;top:40px;width:4px;height:80px}.handle{width:4px;height:30px;background:#38566c}${rules}</style><div class="alerts-layer">${windowHTML('Lista graczy','c-window border-window transparent whoishere-window',20)}${windowHTML('Rozmowa','dialogue-window',320)}${windowHTML('Zwykłe okno','c-window border-window',620)}</div>`);
    await page.evaluate(()=>{
      document.documentElement.dataset.cyberpunkNi='on';window.clicks=0;
      for(const root of document.querySelectorAll('.border-window,.dialogue-window'))root.querySelector('.increase-opacity').onclick=()=>{clicks++;root.dataset.opacityLvl=String((Number(root.dataset.opacityLvl)+1)%6);};
    });
    const geometry = () => page.locator('.border-window,.dialogue-window,.increase-opacity,.header-label,.label').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return[r.x,r.y,r.width,r.height]}));
    const before = await geometry();
    const css = fs.readFileSync(process.env.CYBERPUNK_OPACITY_CSS || path.join(base,'cyberpunk-ni/cyberpunk-ni.css'),'utf8');
    await page.addStyleTag({content:css});
    assert.deepEqual(await geometry(),before,'native window/header/button geometry remains unchanged');
    for(const id of ['Lista graczy','Rozmowa']) {
      const root=page.locator(`[id="${id}"]`);
      assert.equal(await root.evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)','root cannot cover the native opacity layer');
      assert.equal(await root.evaluate(e=>getComputedStyle(e).backgroundImage),'none');
      assert.equal(await root.locator('.header-label-positioner').evaluate(e=>getComputedStyle(e).backgroundImage),'none','title backdrop uses the same native layer');
      for(const level of [1,2,3,4,5,0]) {
        await root.locator('.increase-opacity').click();
        assert.equal(await root.getAttribute('data-opacity-lvl'),String(level));
        assert.equal(await root.locator('.border-image').evaluate(e=>Number(getComputedStyle(e).opacity)),levels[level]);
        assert.equal(await root.locator('.scrollbar-wrapper').evaluate(e=>Number(getComputedStyle(e).opacity)),levels[level]);
        const background = await root.locator('.border-image').evaluate(e=>({color:getComputedStyle(e,'::before').backgroundColor,image:getComputedStyle(e,'::before').backgroundImage,pointer:getComputedStyle(e,'::before').pointerEvents}));
        assert.equal(background.color,level===5?'rgb(12, 17, 24)':'rgba(23, 27, 32, 0.86)');
        assert(background.image.includes('data:image/svg+xml,'),'theme decoration remains in the faded layer');
        assert.equal(background.pointer,'none');
        for(const selector of ['.label','.header-label','.increase-opacity','.manage-configuration-button'])assert.equal(await root.locator(selector).evaluate(e=>getComputedStyle(e).opacity),'1','text and controls stay fully opaque');
      }
    }
    assert.equal(await page.evaluate(()=>clicks),12,'all six native levels cycle in both window types');
    assert.equal(await page.locator('[id="Zwykłe okno"]').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(23, 27, 32)','ordinary windows retain their opaque skin');
    if(process.env.CYBERPUNK_OPACITY_SCREENSHOT) {
      await page.locator('[id="Lista graczy"]').evaluate(e=>e.dataset.opacityLvl='1');
      await page.locator('[id="Rozmowa"]').evaluate(e=>e.dataset.opacityLvl='4');
      await page.screenshot({path:process.env.CYBERPUNK_OPACITY_SCREENSHOT});
    }
    console.log('PASS: six native opacity levels, background/frame fade together, opaque text/icons, unchanged clicks/geometry and ordinary windows.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
