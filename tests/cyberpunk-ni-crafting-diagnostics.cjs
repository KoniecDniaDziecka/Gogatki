const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ acceptDownloads: true });
    await page.route('**/*', route => route.abort());
    await page.setContent(`<style id="native-fixture">
      .mystery-window,.crafting{display:inline-block;vertical-align:top;width:280px;height:250px}
      .instruction{padding:10px;background:#333}
      .unknown-frame{position:relative;box-sizing:border-box;width:54px;height:54px;padding:11px}
      .unknown-frame::before{content:'';position:absolute;inset:0;background-image:url('https://example.invalid/frame.gif?private=value')}
      .item{width:32px;height:32px}
      .ie-item-slot-anim-frame{width:54px;height:54px;padding:11px;box-sizing:border-box}
    </style><div id="gogatek-panel"></div>
    <div class="mystery-window"><div class="unknown-content"><div class="instruction">Wycofuje ulepszenie oraz odzyskuje<br>esencje użyte na ulepszenie.</div><div class="unknown-frame"><div class="item" style="background-image:url('https://example.invalid/item.png?token=secret')"></div></div></div></div>
    <div class="crafting"><div class="crafting__contents"><div class="ie-item-slot-anim-frame"><div class="item"></div></div></div></div>`);
    await page.evaluate(() => {
      document.getElementById('gogatek-panel').attachShadow({ mode: 'open' }).innerHTML = '<footer><button class="apply">Zastosuj</button></footer>';
      window.craftReads = 0;
      const nativeRect = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = function () { if (this.closest('.mystery-window,.crafting')) craftReads++; return nativeRect.call(this); };
      window.fetch = window._g = () => { throw new Error('Diagnostics must not send data or game commands'); };
    });
    const initialMarkup = await page.locator('.mystery-window').evaluate(e => e.outerHTML);
    await page.addScriptTag({ path: path.join(__dirname, '../cyberpunk-ni/diagnostics.js') });
    await page.evaluate(() => { window.stopDiagnostics = installCyberpunkNiDiagnostics(window, { version: 'test' }, (_key, fallback) => fallback, {}); });
    assert.equal(await page.evaluate(() => craftReads), 0, 'no craft layout reads before manual capture');
    const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
    await page.locator('#gogatek-panel [data-cyberpunk-diagnostics]').click();
    const report = JSON.parse(fs.readFileSync(await (await downloadPromise).path(), 'utf8'));
    for (const snapshot of [report.craftingAtStart, report.craftingAtEnd]) {
      assert.equal(snapshot.length, 2, 'capture known craft window and discover unknown classes from instruction');
      const unknown = snapshot.find(s => s.nodes.some(n => n.classes === 'unknown-frame'));
      const frame = unknown.nodes.find(n => n.classes === 'unknown-frame');
      const item = unknown.nodes.find(n => n.classes === 'item');
      assert.equal(frame.bounds.width, 54);
      assert.equal(frame.computed.padding, '11px');
      assert.equal(frame.before['background-image'], 'url("https://example.invalid/frame.gif")');
      assert.equal(item.parentIndex, frame.index);
      assert.equal(item.bounds.width, 32);
      assert.equal(item.inline['background-image'].value, 'url("https://example.invalid/item.png")');
      assert(unknown.matchedRules.some(r => r.selector === '.unknown-frame::before' && r.matches.includes(frame.index)), 'capture decoration pseudo-element rules');
      assert(unknown.ancestors.some(a => a.tag === 'BODY'));
      assert(snapshot.every(s => s.nodes.length <= 180));
      const serialized = JSON.stringify(snapshot);
      assert(!serialized.includes('token=secret') && !serialized.includes('private=value'), 'strip URL queries');
      assert(!serialized.includes('Wycofuje ulepszenie'), 'do not collect window text');
    }
    assert.equal(await page.locator('.mystery-window').evaluate(e => e.outerHTML), initialMarkup, 'capture leaves craft DOM unchanged');
    await page.evaluate(() => stopDiagnostics());
    assert.equal(await page.locator('#gogatek-panel [data-cyberpunk-diagnostics]').count(), 0);
    console.log('PASS: manual-only craft snapshots, unknown class discovery, native geometry, pseudo-elements, matching rules, sanitized URLs and unchanged craft DOM.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
