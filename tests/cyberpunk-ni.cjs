const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const base = path.join(__dirname, '..');
    const catalogue = JSON.parse(fs.readFileSync(path.join(base, 'gogatki/catalogue.json'), 'utf8'));
    const modulePath = new URL(catalogue.modules.find(item => item.id === 'cyberpunk-ni').url).pathname.split('/gogatki/')[1];
    const sources = Object.fromEntries(['catalogue.json', 'dock.js', modulePath].map(file => [file, fs.readFileSync(path.join(base, 'gogatki', file), 'utf8')]));
    const theme = JSON.parse(fs.readFileSync(path.join(base, 'cyberpunk-ni/theme.json'), 'utf8'));
    const fixture = '<!doctype html><html><head></head><body><div class="layer interface-layer"><div class="bottom-panel"><div class="hp-indicator"><div class="hpp">100%</div></div></div></div></body></html>';
    await page.route('https://fixture.margonem.pl/**', route => route.fulfill({ body: fixture, contentType: 'text/html' }));
    async function boot(si = false, holdModule = false) {
      await page.evaluate(({ sources, si, holdModule, modulePath }) => {
        window.unsafeWindow = window;
        window.store = JSON.parse(localStorage.getItem('test-store') || '{}');
        window.GM_getValue = (key, fallback) => store[key] ?? fallback;
        window.GM_setValue = (key, value) => {
          store[key] = value;
          localStorage.setItem('test-store', JSON.stringify(store));
        };
        window.sourceRequests = [];
        window.GM_xmlhttpRequest = options => {
          const file = new URL(options.url).pathname.split('/gogatki/')[1];
          sourceRequests.push(file);
          const reply = () => options.onload({ status: sources[file] ? 200 : 404, responseText: sources[file] || '' });
          if (holdModule && file === modulePath) window.releaseModule = reply;
          else setTimeout(reply, 0);
        };
        if (si) {
          window.hero = { id: 1 }; window.g = {};
          document.querySelector('.interface-layer').remove();
        } else window.Engine = { hero: { d: { id: 1 } }, map: { d: { id: 1 } } };
        window._g = () => { throw new Error('Motyw nie może wysyłać poleceń do gry'); };
      }, { sources, si, holdModule, modulePath });
      await page.addScriptTag({ path: path.join(base, 'gogatki/gogatki.user.js') });
      await page.waitForFunction(() => document.getElementById('gogatek-panel')?.dataset.catalogueReady === 'true');
      const main = page.locator('#gogatek-panel');
      await main.locator('.launcher').evaluate(element => element.click());
      return main.getByRole('checkbox', { name: 'Cyberpunk NI', exact: true });
    }
    await page.goto('https://fixture.margonem.pl');
    let toggle = await boot();
    assert.equal(await toggle.isChecked(), false, 'new theme is opt-in');
    assert.equal(await page.locator('#gogatek-panel [data-cyberpunk-diagnostics]').count(), 0);
    assert.equal(await page.locator('#cyberpunk-ni-style').count(), 0);
    assert.equal(await page.evaluate(file => sourceRequests.includes(file), modulePath), false);
    await toggle.check();
    await page.waitForFunction(() => document.documentElement.dataset.cyberpunkNi === 'on');
    assert.equal(await page.locator('#cyberpunk-ni-style').textContent(), theme.css.replace(/\[style(?=[\s*^$|~=\]])/gi, '[data-cp-inline-style'), 'panel ships the approved theme with UI-only inline guards');
    assert.equal(await page.locator('#cyberpunk-ni-style').getAttribute('data-version'), theme.version);
    assert.equal(await page.locator('#gogatek-panel [data-cyberpunk-diagnostics]').textContent(), `Sprawdź motyw · ${theme.version}`);
    assert.equal(await page.locator('.hp-indicator').getAttribute('data-cp-hp'), '100');
    assert.equal(await page.locator('.cp-hp-disc').count(), 1);
    assert.equal(await page.locator('#gogatek-panel [data-cyberpunk-diagnostics]').count(), 1);
    assert.equal(await page.locator('.cp-hp-fill').evaluate(el => el.getBoundingClientRect().height), 84, '100% fills the entire inner disc');
    await page.locator('.hpp').evaluate(el => { el.firstChild.data = '37,5%'; });
    await page.waitForFunction(() => document.querySelector('.hp-indicator').getAttribute('data-cp-hp') === '37.5');
    assert.equal(await page.locator('.hp-indicator').evaluate(el => el.style.getPropertyValue('--cp-hp-level')), '37.5%');
    await page.locator('#gogatek-panel').getByRole('button', { name: 'Odśwież listę', exact: true }).click();
    await page.waitForFunction(() => !document.getElementById('gogatek-panel').shadowRoot.querySelector('.refresh-list').disabled);
    assert.equal(await page.evaluate(file => sourceRequests.filter(p => p === file).length, modulePath), 1, 'refresh does not start a second instance');
    assert.equal(await page.locator('.cp-hp-disc').count(), 1);
    // Replacing the NI layer (map/interface rebuild) must recreate HP exactly once.
    await page.locator('.interface-layer').evaluate(el => el.remove());
    await page.waitForFunction(() => !document.documentElement.hasAttribute('data-cyberpunk-ni'));
    await page.evaluate(() => {
      const layer = document.createElement('div'); layer.className = 'layer interface-layer';
      layer.innerHTML = '<div class="bottom-panel"><div class="hp-indicator"><div class="hpp">100%</div></div></div>';
      document.body.append(layer);
    });
    await page.waitForFunction(() => document.querySelector('.cp-hp-disc'));
    assert.equal(await page.locator('#cyberpunk-ni-style').count(), 1);
    assert.equal(await page.locator('.cp-hp-disc').count(), 1);
    // The existing panel owns persistence and the apply/reload flow.
    await page.reload();
    toggle = await boot();
    assert.equal(await toggle.isChecked(), true);
    await page.waitForFunction(() => document.querySelector('.cp-hp-disc'));
    await toggle.uncheck();
    const apply = page.locator('#gogatek-panel').getByRole('button', { name: 'Zastosuj i odśwież grę', exact: true });
    await Promise.all([page.waitForEvent('load'), apply.click()]);
    toggle = await boot();
    assert.equal(await toggle.isChecked(), false);
    assert.equal(await page.locator('#cyberpunk-ni-style,.cp-hp-disc').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-cyberpunk-ni')), false);
    // Turning off while a module downloads must leave the original interface.
    await page.reload(); toggle = await boot(false, true);
    await toggle.check();
    await page.waitForFunction(() => !!window.releaseModule);
    await toggle.uncheck(); await page.evaluate(() => releaseModule());
    await page.waitForFunction(() => !document.getElementById('gogatek-panel').shadowRoot.querySelector('[role=status]').textContent.includes('Pobieranie'));
    assert.equal(await page.locator('#cyberpunk-ni-style,.cp-hp-disc').count(), 0);
    // SI gets a visible panel error rather than styled game elements.
    await page.reload(); toggle = await boot(true);
    await toggle.check();
    await page.locator('#gogatek-panel').getByText('Cyberpunk NI działa tylko na Nowym Interfejsie.', { exact: true }).waitFor();
    assert.equal(await page.locator('#cyberpunk-ni-style,.cp-hp-disc').count(), 0);
    // Check cleanup on pagehide using a fresh NI instance.
    await page.reload(); await boot();
    await page.waitForFunction(() => document.querySelector('.cp-hp-disc'));
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    assert.equal(await page.locator('#cyberpunk-ni-style,.cp-hp-disc').count(), 0);
    assert.equal(await page.locator('.hp-indicator').getAttribute('data-cp-hp'), null);
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-cyberpunk-ni-gogatki')), false);
    assert.deepEqual(errors, []);
    console.log('PASS: catalogue opt-in, exact CSS, full HP, live updates, one instance, NI rebuild, saved state, disable/reload, download race, SI message and cleanup.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
