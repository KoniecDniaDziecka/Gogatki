const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const base = path.join(__dirname, '..');
    const css = fs.readFileSync(path.join(base, 'cyberpunk-ni/cyberpunk-ni.css'), 'utf8');
    const fixture = `<style>.fixture{position:relative;width:300px}.button,.widget-button{display:inline-block;width:90px;height:24px}.unit{position:absolute;width:32px;height:48px}.arena{position:relative;width:841px;height:634px}</style>
      <div class="layer interface-layer"><div class="c-window fixture">
        <div id="plain" class="button">Przycisk</div>
        <div id="image" class="button" style="background-image:url(data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'/%3E);background-position:3px 7px">Ikona</div>
        <div id="text" class="right-column"><b style="color:red">Ostrzeżenie</b></div>
        <div id="paper" style="background-image:url(quest_bar.png)">Nagłówek</div>
        <div class="loot-window"><div class="button-holder"><div class="button not"><span class="label not">Odrzuć</span></div></div></div>
      </div><div class="main-buttons-container"><div id="widget" class="widget-button" style="background-image:url(icon.png)"></div></div>
      <div class="battle-controller"><div class="battle-content"><div class="time-wrapper"><div id="time" class="time-progress-bar" style="width:75%;background:red"></div></div></div><div id="skill" class="skill-usable-slot" style="background-image:url(skill.png)"></div></div><div class="arena"></div></div>
      <div class="layer alerts-layer"></div><div id="backdrop" style="background-image:url(screen-background.png)"></div>`;
    const pages = [];
    const properties = ['backgroundImage','backgroundColor','backgroundPosition','backgroundSize','borderTopColor','boxShadow','color','fontFamily','fontSize','width','height','pointerEvents'];
    const snapshot = page => page.evaluate(properties => [...document.querySelectorAll('.fixture *,.widget-button,.time-progress-bar,.skill-usable-slot,#backdrop,.added-window *')].map(el => ({
      id: el.id, classes: el.className, style: Object.fromEntries(properties.map(p => [p, getComputedStyle(el)[p]]))
    })), properties);
    for (const optimized of [false, true]) {
      const page = await browser.newPage();
      pages.push(page);
      await page.route('**/*', route => route.abort());
      await page.setContent(fixture);
      await page.addScriptTag({ path: path.join(base, 'cyberpunk-ni/hp-runtime.js') });
      await page.evaluate(({css,optimized}) => {
        document.documentElement.dataset.cyberpunkNi = 'on';
        window.inlineStyles = createCyberpunkNiInlineStyles(window);
        if (optimized) inlineStyles.start();
        const style = document.createElement('style'); style.id='test-theme';
        style.textContent = optimized ? inlineStyles.css(css) : css; document.head.append(style);
        const arena = document.querySelector('.arena');
        for(let i=0;i<300;i++) {const unit=document.createElement('div');unit.className='unit';unit.style.cssText=`left:${i%26*32}px;top:${i%13*48}px`;arena.append(unit);}
        window.settle = async () => { await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); };
      }, {css,optimized});
      await page.evaluate(() => settle());
    }
    assert.deepEqual(await snapshot(pages[1]), await snapshot(pages[0]), 'initial image guards, warning colors and decoration styles match');
    for (const page of pages) {
      await page.evaluate(async () => {
        document.getElementById('image').style.removeProperty('background-image');
        document.getElementById('time').style.background = 'orange';
        const positioner = document.createElement('div'); positioner.className='game-window-positioner';
        positioner.innerHTML='<div class="settings-window added-window"><div id="dynamic" class="button" style="background-image:url(dynamic.png)">Nowy</div></div>';
        document.querySelector('.alerts-layer').append(positioner);
        await settle();
        document.getElementById('dynamic').style.backgroundPosition='-20px -10px';
        document.getElementById('image').style.backgroundImage='url(changed.png)';
        await settle();
      });
    }
    assert.deepEqual(await snapshot(pages[1]), await snapshot(pages[0]), 'new windows and changed inline images/warnings retain identical styles');
    assert.equal(await pages[1].locator('.unit[data-cp-inline-style]').count(), 0, 'moving actors are not mirrored');
    assert.equal(await pages[1].evaluate(() => /\[style(?=[\s*^$|~=\]])/i.test(document.getElementById('test-theme').textContent)), false, 'active CSS never inspects native inline style attributes');
    const timings=[];
    for(const page of pages) timings.push(await page.evaluate(async()=>{
      const units=[...document.querySelectorAll('.unit')],samples=[];
      for(let i=0;i<40;i++) {
        const at=performance.now();
        for(const unit of units) unit.style.transform=`translateX(${i%10}px)`;
        units[0].getBoundingClientRect();
        await Promise.resolve(); // include mirror observer work in the measurement
        samples.push(performance.now()-at);
      }
      samples.splice(0,5);samples.sort((a,b)=>a-b);return samples[Math.floor(samples.length/2)];
    }));
    console.log(`300 actor updates, median ms (synthetic): native style selectors=${timings[0].toFixed(2)}, UI mirrors=${timings[1].toFixed(2)}`);
    assert.equal(await pages[1].locator('.unit[data-cp-inline-style]').count(), 0);
    await pages[1].evaluate(async () => {
      document.querySelector('.game-window-positioner').remove();
      await settle();
      inlineStyles.stop();
    });
    assert.equal(await pages[1].locator('[data-cp-inline-style]').count(), 0, 'mirrors removed on cleanup');
    for (const page of pages) await page.close();
    console.log('PASS: identical UI appearance across inline changes/new windows; actors excluded, CSS inline-style selectors removed and cleanup complete.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
