const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const base = path.join(__dirname, '..');
    const page = await browser.newPage({ acceptDownloads: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent('<div id="gogatek-panel"></div><div class="layer interface-layer"><div class="bottom-panel"><div class="hp-indicator"><div class="hpp">100%</div></div></div><div class="c-window"><div class="button" style="background-image:url(data:image/svg+xml,%3Csvg%20xmlns=\'http://www.w3.org/2000/svg\'/%3E)">Ikona</div></div><div class="battle-controller" style="width:200px;height:60px"></div></div>');
    await page.evaluate(() => {
      window.unsafeWindow = window;
      window.Engine = { hero: {}, map: {} };
      window.GogatkiRuntime = { register(definition) { definition.start(); } };
      window.settingsWrites = 0;
      window.GM_getValue = (_key, fallback) => fallback;
      window.GM_setValue = () => { settingsWrites++; throw new Error('Comparison must not change saved settings'); };
      window.GM_xmlhttpRequest = () => { throw new Error('Comparison must not send data'); };
      window.fetch = () => { throw new Error('Comparison must not send data'); };
      window._g = () => { throw new Error('Comparison must not control the game'); };
      window.alerts = [];
      window.alert = text => alerts.push(text);
      const panel = document.getElementById('gogatek-panel').attachShadow({mode:'open'});
      panel.innerHTML = '<section><header><button aria-label="Zamknij">X</button></header><footer><button class="refresh-list">Odśwież listę</button><button class="apply">Zastosuj</button></footer></section>';
      window.activeObservers = new Set();
      const NativeMutationObserver = window.MutationObserver;
      window.MutationObserver = class extends NativeMutationObserver {
        observe(...args) { super.observe(...args); if (!new Error().stack.includes('_setupGlobalListenersRemovalDetection')) activeObservers.add(this); }
        disconnect() { super.disconnect(); activeObservers.delete(this); }
      };
      window.activePerformanceObservers = new Set();
      const NativePerformanceObserver = window.PerformanceObserver;
      window.PerformanceObserver = class extends NativePerformanceObserver {
        observe(...args) { super.observe(...args); activePerformanceObservers.add(this); }
        disconnect() { super.disconnect(); activePerformanceObservers.delete(this); }
      };
    });
    await page.locator('.hp-indicator').count();
    const emptyObservers = await page.evaluate(() => activeObservers.size);
    await page.addScriptTag({path:path.join(base,'gogatki/modules/cyberpunk-ni.js')});
    const comparison = page.locator('#gogatek-panel [data-cyberpunk-comparison]');
    const regular = page.locator('#gogatek-panel [data-cyberpunk-diagnostics]');
    const baselineObservers = await page.evaluate(() => activeObservers.size);
    const capturePromise = page.waitForEvent('download', {timeout:30000});
    await comparison.click();
    assert.equal(await regular.isDisabled(), true, 'captures cannot overlap');
    const download = await capturePromise;
    assert.equal(download.suggestedFilename(), 'cyberpunk-ni-porownanie.json');
    const report = JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    assert.equal(report.kind,'cyberpunk-ni-theme-comparison');
    assert.deepEqual(report.phaseOrder,['on','off','off','on']);
    assert.deepEqual(report.phases.map(p=>p.themeEnabled),[true,false,false,true]);
    for(const phase of report.phases) {
      assert(phase.duration >= 4950 && phase.frames.samples > 0);
      assert.equal(phase.start.themeFlag,phase.themeEnabled?'on':null);
      assert.equal(phase.end.themeFlag,phase.themeEnabled?'on':null);
      assert.equal(phase.start.styleCount,phase.themeEnabled?1:0);
      assert.equal(phase.end.styleCount,phase.themeEnabled?1:0);
      assert.deepEqual(phase.themeWrites,{rootAttributes:0,stylesheetChanges:0,stylesheetReplacements:0},'theme transitions are outside measurement windows');
    }
    assert.equal(report.end.themeFlag,report.start.themeFlag);
    assert.deepEqual(report.end.styleVersions,report.start.styleVersions);
    assert.equal(await page.locator('.cp-hp-disc').count(),1);
    assert.equal(await page.evaluate(()=>activeObservers.size),baselineObservers);
    assert.equal(await page.evaluate(()=>activePerformanceObservers.size),0);
    assert.equal(await comparison.isDisabled(),false);
    // Abort while the whole theme runtime is stopped; restore current HP.
    await comparison.click();
    await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-cyberpunk-ni'),null,{timeout:10000});
    assert.equal(await page.locator('.cp-hp-disc').count(),0);
    await page.locator('.hpp').evaluate(el=>el.textContent='45%');
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>document.documentElement.dataset.cyberpunkNi==='on');
    await page.waitForFunction(()=>!document.getElementById('gogatek-panel').shadowRoot.querySelector('[data-cyberpunk-comparison]').disabled);
    assert.equal(await page.locator('.hp-indicator').getAttribute('data-cp-hp'),'45');
    assert.equal(await page.locator('.cp-hp-disc').count(),1);
    assert.equal(await page.locator('#cyberpunk-ni-style').count(),1);
    assert.equal(await page.evaluate(()=>activeObservers.size),baselineObservers);
    assert.equal(await page.evaluate(()=>activePerformanceObservers.size),0);
    // Navigating away during an off phase must not restart a destroyed runtime.
    await comparison.click();
    await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-cyberpunk-ni'),null,{timeout:10000});
    await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
    await page.waitForFunction(()=>activeObservers.size===0);
    assert.equal(await page.locator('.cp-hp-disc,#cyberpunk-ni-style,[data-cp-inline-style]').count(),0);
    assert.equal(await comparison.count(),0);
    assert.equal(await regular.count(),0);
    assert.equal(await page.evaluate(()=>activeObservers.size),emptyObservers);
    assert.equal(await page.evaluate(()=>activePerformanceObservers.size),0);
    assert.equal(await page.evaluate(()=>settingsWrites),0);
    assert.deepEqual(await page.evaluate(()=>alerts),[]);
    assert.deepEqual(errors,[]);
    console.log('PASS: paired on/off windows, full runtime suspension, unchanged settings, restoration after completion/Esc, and cleanup on pagehide.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
