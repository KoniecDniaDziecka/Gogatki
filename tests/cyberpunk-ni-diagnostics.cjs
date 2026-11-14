const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ acceptDownloads: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const base = path.join(__dirname, '..');
    const catalogue = JSON.parse(fs.readFileSync(path.join(base, 'gogatki/catalogue.json'), 'utf8'));
    const theme = JSON.parse(fs.readFileSync(path.join(base, 'cyberpunk-ni/theme.json'), 'utf8'));
    await page.route('https://assets.fixture.invalid/hero-test.png*', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="48"><rect width="32" height="48" fill="#668298"/></svg>' }));
    await page.route('https://assets.fixture.invalid/combat-probe.js*', route => route.fulfill({ contentType: 'text/javascript', body: 'window.runDiagnosticProbe = () => requestAnimationFrame(function battleProbe() { const until = performance.now() + 100; while (performance.now() < until) {} });' }));
    await page.setContent('<canvas style="display:none"></canvas>'.repeat(20) + '<div id="gogatek-panel"></div><div class="layer interface-layer"><div class="bottom-panel"><div class="hp-indicator"><div class="hpp">100%</div></div></div><div class="battle-controller" style="position:fixed;left:500px;top:300px;width:300px;height:90px"><div class="graphics" style="width:300px;height:30px"></div></div></div><div id="item123" style="width:32px;height:32px">Przedmiot</div><img id="hero" src="https://assets.fixture.invalid/hero-test.png?warmup=1"><canvas id="battle-surface" width="400" height="240" style="position:fixed;left:400px;top:20px"></canvas>');
    await page.addScriptTag({ url: 'https://assets.fixture.invalid/combat-probe.js?private-query=1' });
    await page.evaluate(catalogue => {
      window.unsafeWindow = window;
      window.Engine = { hero: {}, map: {} };
      window.GogatkiRuntime = { register(definition) { definition.start(); } };
      window.GM_getValue = (key, fallback) => key === 'gogatki:catalogue:v1' ? catalogue : fallback;
      window.GM_setValue = () => {};
      window.fetch = () => { throw new Error('Diagnostic must not send data'); };
      window.GM_xmlhttpRequest = () => { throw new Error('Diagnostic must not send data'); };
      window._g = () => { throw new Error('Diagnostic must not control the game'); };
      const root = document.getElementById('gogatek-panel').attachShadow({ mode: 'open' });
      root.innerHTML = '<section><header><button aria-label="Zamknij">X</button></header><footer><button class="refresh-list">Odśwież listę</button><button class="apply">Zastosuj</button></footer></section>';
      root.querySelector('header button').onclick = () => { window.panelClosed = true; };
      window.activeObservers = new Set();
      window.activePerformanceObservers = new Set();
      const NativePerformanceObserver = window.PerformanceObserver;
      window.PerformanceObserver = class extends NativePerformanceObserver {
        observe(...args) { super.observe(...args); activePerformanceObservers.add(this); }
        disconnect() { super.disconnect(); activePerformanceObservers.delete(this); }
      };
      window.treeWalks = 0;
      const createTreeWalker = document.createTreeWalker.bind(document);
      document.createTreeWalker = (...args) => { treeWalks++; return createTreeWalker(...args); };
      const NativeObserver = window.MutationObserver;
      window.MutationObserver = class extends NativeObserver {
        observe(...args) {
          super.observe(...args);
          // Playwright installs a persistent observer of its own when clicking.
          if (!new Error().stack.includes('_setupGlobalListenersRemovalDetection')) activeObservers.add(this);
        }
        disconnect() { super.disconnect(); activeObservers.delete(this); }
      };
      document.getElementById('item123').addEventListener('contextmenu', event => {
        event.preventDefault();
        const menu = document.createElement('div');
        menu.id = 'actual-item-menu'; menu.className = 'unexpected-popup';
        menu.style.cssText = 'position:fixed;left:200px;top:150px;width:150px;background:#3f3b3d';
        for (const label of ['Ekwipuj', 'Ulepsz', 'Zniszcz', 'Item Marker']) {
          const action = document.createElement('div');
          action.className = label === 'Zniszcz' ? 'actual-action destructive' : 'actual-action';
          action.textContent = label;
          action.style.cssText = `height:25px;background:${label === 'Zniszcz' ? '#4a0e0e' : '#244518'};color:white`;
          menu.append(action);
        }
        document.body.append(menu);
      });
    }, catalogue);
    await page.locator('#item123').count();
    const baselineObservers = await page.evaluate(() => activeObservers.size);
    await page.addScriptTag({ path: path.join(base, 'gogatki/modules/cyberpunk-ni.js') });
    await page.evaluate(() => document.fonts.ready);
    const button = page.locator('#gogatek-panel [data-cyberpunk-diagnostics]');
    assert.equal(await button.textContent(), `Sprawdź motyw · ${theme.version}`);
    const observerCount = await page.evaluate(() => activeObservers.size);
    assert.equal(await page.evaluate(() => activePerformanceObservers.size), 0, 'profiling is inactive before clicking');
    const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
    await button.click();
    assert.equal(await button.isDisabled(), true);
    assert.equal(await page.evaluate(() => panelClosed), true);
    await page.locator('#item123').dispatchEvent('pointerup', { bubbles: true });
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => treeWalks), 0, 'ordinary item clicks do not scan the DOM for unknown menus');
    await page.locator('#item123').dispatchEvent('contextmenu', { bubbles: true, clientX: 200, clientY: 150 });
    await page.evaluate(() => runDiagnosticProbe());
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-cyberpunk-ni', 'on');
      document.getElementById('cyberpunk-ni-style').textContent += '\n/* record a stylesheet write */';
      const image = document.getElementById('hero');
      image.src = 'https://assets.fixture.invalid/hero-test.png?walking=1';
      setTimeout(() => { image.style.transform = 'translateX(10px)'; image.src = 'https://assets.fixture.invalid/hero-test.png?walking=2'; }, 300);
    });
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'cyberpunk-ni-ruch-menu.json');
    const report = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    assert.equal(report.schema, 3);
    assert.equal(report.start.moduleVersion, theme.version);
    assert.deepEqual(report.start.styleVersions, [theme.version]);
    assert.equal(report.start.catalogueUrl, catalogue.modules.find(item => item.id === 'cyberpunk-ni').url);
    assert(report.themeWrites.rootAttributes >= 1);
    assert(report.themeWrites.stylesheetChanges >= 1);
    const menus = report.menus.flatMap(snapshot => snapshot.menus);
    assert(menus.some(menu => menu.root.id === 'actual-item-menu'), 'unknown menu markup is discovered by its actual actions');
    assert(menus.some(menu => menu.nodes.some(node => node.classes === 'actual-action' && node.computed['background-color'] === 'rgb(36, 69, 24)')));
    assert(report.images.filter(image => image.url === 'https://assets.fixture.invalid/hero-test.png').length >= 2, 'repeated sprite fetches recorded without query strings');
    assert(report.images.every(image => !image.url.includes('?')));
    assert(report.surfaceChanges.attributes.src >= 2);
    assert(report.surfaceChanges.attributes.style >= 1);
    assert.equal(report.mapSurfacesAtStart[0].id, 'battle-surface', 'largest visible game surface is selected after hidden canvases');
    assert(report.mapSurfacesAtStart.some(surface => surface.id === 'hero'));
    assert(report.mapSurfacesAtStart.every(surface => surface.bounds.width > 0 && surface.bounds.height > 0));
    assert(report.battleAtStart.some(node => node.classes === 'battle-controller'));
    assert(report.diagnosticWork.setupDuration >= 0);
    assert(report.diagnosticWork.menuSnapshots.some(snapshot => snapshot.found > 0));
    assert.equal(report.longAnimationFrames.supported, true);
    assert(report.longAnimationFrames.entries.every(entry => entry.start >= 0), 'frames from before capture are excluded');
    const scripts = report.longAnimationFrames.entries.flatMap(entry => entry.scripts);
    assert(scripts.some(script => script.sourceURL === 'https://assets.fixture.invalid/combat-probe.js' && script.duration >= 50), 'slow callback is attributed to its source script');
    assert(scripts.every(script => !script.sourceURL?.includes('?')), 'script queries are removed');
    assert(report.frames.samples > 0);
    assert(report.duration >= 9900);
    assert.equal(await button.isDisabled(), false);
    assert.equal(await page.evaluate(() => activeObservers.size), observerCount, 'capture observers removed after saving');
    assert.equal(await page.evaluate(() => activePerformanceObservers.size), 0, 'performance observers removed after saving');
    // Older browsers still save useful reports without LoAF attribution.
    await page.evaluate(() => Object.defineProperty(PerformanceObserver, 'supportedEntryTypes', { value: ['longtask'] }));
    const fallbackPromise = page.waitForEvent('download', { timeout: 20000 });
    await button.click();
    const fallbackDownload = await fallbackPromise;
    const fallbackReport = JSON.parse(fs.readFileSync(await fallbackDownload.path(), 'utf8'));
    assert.deepEqual(fallbackReport.longAnimationFrames, { supported: false, entries: [] });
    assert.equal(await page.evaluate(() => activePerformanceObservers.size), 0);
    // Cancelling an active capture also releases every observer.
    await button.click();
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    assert.equal(await button.count(), 0);
    assert.equal(await page.evaluate(() => activeObservers.size), baselineObservers);
    assert.equal(await page.evaluate(() => activePerformanceObservers.size), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: on-demand diagnostic attributes slow callbacks, selects visible game surfaces, bounds menu discovery, supports browsers without LoAF and cleans up after saving/cancelling.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
