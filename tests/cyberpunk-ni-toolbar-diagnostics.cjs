const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ acceptDownloads: true });
    await page.setContent(`<style>.interface-layer{position:relative;width:500px;height:240px}.positioner.bottom{position:absolute;bottom:0;width:500px;height:61px}.bg{position:absolute;inset:0}.bg::before{content:'';position:absolute;width:11px;height:1px}.bg-additional-widget-left{position:absolute;top:-52px;left:0;width:137px;height:77px;z-index:2;transform:scaleX(-1)}.main-buttons-container{position:absolute;width:251px;height:44px;bottom:60px}.widget-button{width:42px;height:42px}.hidden-row{display:none}</style><div id="gogatek-panel"></div><div class="layer interface-layer"><div class="positioner bottom"><div class="bg-additional-widget-left"></div><div class="bg"></div></div><div class="bottom-left-additional main-buttons-container"><div class="widget-button"></div></div><div class="bottom-right-additional main-buttons-container hidden-row"></div></div>`);
    await page.evaluate(() => {
      document.getElementById('gogatek-panel').attachShadow({ mode: 'open' }).innerHTML = '<footer><button class="apply">Zastosuj</button></footer>';
      window.toolbarReads = 0;
      const nativeRect = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = function () { if (this.matches('.interface-layer,.positioner,.bg,.bg-additional-widget-left,.main-buttons-container,.widget-button')) toolbarReads++; return nativeRect.call(this); };
      window.fetch = window._g = () => { throw new Error('Diagnostics must not send data or game commands'); };
    });
    const initialMarkup = await page.locator('.interface-layer').evaluate(e => e.outerHTML);
    await page.addScriptTag({ path: path.join(__dirname, '../cyberpunk-ni/diagnostics.js') });
    await page.evaluate(() => { window.stopDiagnostics = installCyberpunkNiDiagnostics(window, { version: 'test' }, (_key, fallback) => fallback, {}); });
    assert.equal(await page.evaluate(() => toolbarReads), 0, 'no toolbar reads before manual capture');
    const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
    await page.locator('#gogatek-panel [data-cyberpunk-diagnostics]').click();
    const report = JSON.parse(fs.readFileSync(await (await downloadPromise).path(), 'utf8'));
    for (const snapshot of [report.toolbarAtStart, report.toolbarAtEnd]) {
      assert.equal(snapshot.schema, 1);
      const find = name => snapshot.nodes.find(n => n.classes.split(' ').includes(name));
      const container = find('bottom-left-additional'), tile = find('widget-button'), extra = find('bg-additional-widget-left'), bg = find('bg');
      assert.equal(container.bounds.width, 251, 'capture full native container width');
      assert.equal(tile.bounds.width, 42, 'capture tile separately from container');
      assert.equal(tile.parentIndex, container.index);
      assert.equal(extra.bounds.width, 137);
      assert.equal(extra.bounds.height, 77);
      assert.equal(extra.layout.top, '-52px');
      assert.equal(extra.layout['z-index'], '2');
      assert.equal(extra.computed.transform, 'matrix(-1, 0, 0, 1, 0, 0)');
      assert(extra.siblingIndex < bg.siblingIndex, 'record native paint order');
      assert.equal(bg.before.width, '11px');
      assert.equal(bg.before.height, '1px');
      assert.equal(find('hidden-row').computed.display, 'none', 'retain hidden rows for diagnosis');
      assert(snapshot.nodes.length <= 80);
    }
    assert.equal(await page.locator('.interface-layer').evaluate(e => e.outerHTML), initialMarkup, 'capture does not mutate toolbar');
    await page.evaluate(() => stopDiagnostics());
    assert.equal(await page.locator('#gogatek-panel [data-cyberpunk-diagnostics]').count(), 0);
    console.log('PASS: manual-only toolbar geometry, separate container/tile sizes, mirroring, z-order, pseudo-elements, hidden rows and no toolbar mutations.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
