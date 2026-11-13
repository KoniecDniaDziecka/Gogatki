const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const base = path.join(__dirname, '..');
    const css = fs.readFileSync(process.env.CYBERPUNK_HP_CSS || path.join(base, 'cyberpunk-ni/cyberpunk-ni.css'), 'utf8');
    const page = await browser.newPage({ viewport: { width: 640, height: 160 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent('<style>body{margin:20px;background:#171b20}.bottom-panel{display:flex;gap:20px}.hp-indicator{position:relative;width:98px;height:78px}.hpp{position:absolute;width:98px;height:78px}</style><div class="layer interface-layer"><div class="bottom-panel"><div class="hp-indicator"><div class="hpp">100%</div></div></div></div>');
    await page.addScriptTag({ path: path.join(base, 'cyberpunk-ni/hp-runtime.js') });
    await page.evaluate(css => {
      window.runtime = createCyberpunkNiRuntime(window, () => ({ css, version: 'test' }), () => true);
      runtime.apply();
    }, css);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise(requestAnimationFrame));
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    // Isolate the theme's fill from native text/HP updates. Reading its bounds
    // flushes any work caused by each level change, so deferred layouts count.
    await page.locator('.cp-hp-fill').evaluate(el => el.getBoundingClientRect());
    const before = await cdp.send('Performance.getMetrics');
    const sizes = await page.evaluate(() => {
      const indicator = document.querySelector('.hp-indicator');
      const fill = indicator.querySelector('.cp-hp-fill');
      const result = [];
      for (let i = 0; i < 80; i++) {
        const percent = i % 2 ? 37.5 : 75;
        indicator.style.setProperty('--cp-hp-level', `${percent}%`);
        indicator.setAttribute('data-cp-hp', String(percent));
        const bounds = fill.getBoundingClientRect();
        result.push({ percent, height: bounds.height, bottom: bounds.bottom, width: bounds.width });
      }
      return result;
    });
    const after = await cdp.send('Performance.getMetrics');
    const metric = (data, name) => data.metrics.find(item => item.name === name).value;
    const layouts = metric(after, 'LayoutCount') - metric(before, 'LayoutCount');
    console.log(`80 isolated HP fill updates: ${layouts} layouts`);
    assert.equal(layouts, 0, 'changing theme HP fill must not trigger layout');
    for (const size of sizes) {
      assert.ok(Math.abs(size.height - 84 * size.percent / 100) < .02, 'visible fill matches HP');
      assert.equal(size.width, 84, 'fill keeps its width');
      assert.equal(size.bottom, sizes[0].bottom, 'fill remains anchored at the bottom');
    }
    // Exercise actual native label changes, including comma decimals and clamp.
    for (const [text, expected] of [['0%', 0], ['25%', 25], ['37,5%', 37.5], ['75%', 75], ['120%', 100], ['-5%', 0], ['100%', 100]]) {
      await page.locator('.hpp').evaluate((el, text) => { el.textContent = text; }, text);
      await page.waitForFunction(expected => document.querySelector('.hp-indicator').getAttribute('data-cp-hp') === String(expected), expected);
      const bounds = await page.locator('.cp-hp-fill').boundingBox();
      assert.ok(Math.abs(bounds.height - 84 * expected / 100) < .02, `${text} has correct visible height`);
      assert.equal(await page.locator('.cp-hp-fill').evaluate(el => getComputedStyle(el).height), '84px', 'layout height stays constant');
      assert.equal(await page.locator('.cp-hp-disc').count(), 1);
    }
    assert.equal(await page.locator('.cp-hp-disc').evaluate(el => getComputedStyle(el).transform), 'none', 'ring stays still');
    assert.equal(await page.locator('.cp-hp-disc').evaluate(el => getComputedStyle(el, '::after').transform), 'none', 'glass stays still');
    assert.equal(await page.locator('.cp-hp-fill').evaluate(el => getComputedStyle(el).pointerEvents), 'none');
    assert.equal(await page.evaluate(() => document.getAnimations().filter(a => a.animationName?.startsWith('cp-ni-')).length), 0);
    if (process.env.CYBERPUNK_HP_SCREENSHOT) {
      await page.evaluate(() => {
        const original = document.querySelector('.hp-indicator');
        for (const percent of [75, 50, 25, 0]) {
          const copy = original.cloneNode(true);
          copy.style.setProperty('--cp-hp-level', `${percent}%`);
          copy.setAttribute('data-cp-hp', String(percent));
          copy.querySelector('.hpp').textContent = `${percent}%`;
          original.parentElement.append(copy);
        }
      });
      await page.screenshot({ path: process.env.CYBERPUNK_HP_SCREENSHOT });
    }
    await page.evaluate(() => runtime.destroy());
    assert.equal(await page.locator('.cp-hp-disc,#cyberpunk-ni-style').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: HP fill avoids layout; levels, ring, glass, hitboxes and cleanup preserved.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
