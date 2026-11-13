const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const base = path.join(__dirname, '..');
    const theme = JSON.parse(fs.readFileSync(path.join(base, 'cyberpunk-ni/theme.json'), 'utf8'));
    for (const mode of ['module', 'standalone']) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setContent('<div id="game"><div class="layer interface-layer"><div class="bottom-panel"><div id="hp" class="hp-indicator"><div id="hp-label" class="hpp">100%</div></div><div id="timer">12:00</div></div><div id="chat"><span id="message">Wiadomość</span></div><div id="other-window"><div id="window-content"></div></div></div></div>');
      await page.evaluate(theme => {
        window.unsafeWindow = window;
        window.Engine = { hero: {}, map: {} };
        window.GogatkiRuntime = { register(definition) { definition.start(); } };
        window.GM_getValue = (_key, fallback) => fallback;
        window.GM_setValue = () => {};
        window.GM_registerMenuCommand = (_label, callback) => { window.toggleTheme = callback; };
        window.GM_xmlhttpRequest = options => {
          setTimeout(() => options.onload({ status: 200, responseText: JSON.stringify(theme) }), 0);
          return { abort() {} };
        };
        window.metrics = { documentScans: 0, cssReads: 0, cssWrites: 0, rootWrites: 0, observerCalls: 0 };
        const counted = new Set(['.layer.interface-layer', '.bottom-panel .hp-indicator']);
        for (const name of ['querySelector', 'querySelectorAll']) {
          const original = Document.prototype[name];
          Document.prototype[name] = function (selector) {
            if (counted.has(selector)) metrics.documentScans++;
            return original.call(this, selector);
          };
        }
        const originalText = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
        Object.defineProperty(Node.prototype, 'textContent', {
          ...originalText,
          get() {
            if (this.id === 'cyberpunk-ni-style') metrics.cssReads++;
            return originalText.get.call(this);
          },
          set(value) {
            if (this.id === 'cyberpunk-ni-style') metrics.cssWrites++;
            originalText.set.call(this, value);
          }
        });
        const originalAttribute = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function (name, value) {
          if (this === document.documentElement && name === 'data-cyberpunk-ni') metrics.rootWrites++;
          return originalAttribute.call(this, name, value);
        };
        const NativeObserver = window.MutationObserver;
        window.MutationObserver = class extends NativeObserver {
          constructor(callback) {
            super((records, observer) => { metrics.observerCalls++; callback(records, observer); });
          }
        };
        window.settle = async () => {
          await new Promise(requestAnimationFrame);
          await new Promise(requestAnimationFrame);
        };
        window.resetMetrics = () => { for (const key of Object.keys(metrics)) metrics[key] = 0; };
      }, theme);
      const sourcePath = process.env.CYBERPUNK_REFERENCE_DIR
        ? path.join(process.env.CYBERPUNK_REFERENCE_DIR, `before-${mode}.js`)
        : path.join(base, mode === 'module' ? 'gogatki/modules/cyberpunk-ni.js' : 'cyberpunk-ni/cyberpunk-ni.user.js');
      await page.addScriptTag({ path: sourcePath });
      await page.waitForFunction(() => document.getElementById('hp')?.getAttribute('data-cp-hp') === '100');
      await page.evaluate(() => settle());
      const unrelated = await page.evaluate(async () => {
        resetMetrics();
        const message = document.getElementById('message');
        const timer = document.getElementById('timer');
        const content = document.getElementById('window-content');
        for (let i = 0; i < 60; i++) {
          message.firstChild.data = `Wiadomość ${i}`;
          timer.textContent = `12:${i}`;
          content.replaceChildren(document.createElement('span'));
          await new Promise(requestAnimationFrame);
        }
        await settle();
        return { ...metrics };
      });
      console.log(`${mode} unrelated UI: ${JSON.stringify(unrelated)}`);
      if (!process.env.CYBERPUNK_REFERENCE_DIR) {
        assert.deepEqual(unrelated, { documentScans: 0, cssReads: 0, cssWrites: 0, rootWrites: 0, observerCalls: 0 }, 'chat, timers and other windows must not wake the HP runtime');
      }
      const health = await page.evaluate(async () => {
        resetMetrics();
        for (const value of ['90%', '65%', '37,5%', '0%', '100%']) {
          document.getElementById('hp-label').firstChild.data = value;
          await settle();
        }
        return { ...metrics };
      });
      console.log(`${mode} HP changes: ${JSON.stringify(health)}`);
      assert.equal(await page.locator('#hp').getAttribute('data-cp-hp'), '100');
      assert.equal(await page.locator('.cp-hp-disc').count(), 1);
      if (!process.env.CYBERPUNK_REFERENCE_DIR) {
        assert.equal(health.documentScans, 0);
        assert.equal(health.cssReads + health.cssWrites + health.rootWrites, 0, 'HP updates must not read or reapply the stylesheet');
        await page.locator('#hp-label').evaluate(el => {
          const replacement = document.createElement('div'); replacement.id = 'hp-label'; replacement.className = 'hpp';
          replacement.innerHTML = '<span class="value">77%</span>'; el.replaceWith(replacement);
        });
        await page.waitForFunction(() => document.getElementById('hp').getAttribute('data-cp-hp') === '77');
        await page.locator('#hp-label .value').evaluate(el => { el.firstChild.data = 'invalid'; });
        await page.waitForFunction(() => !document.getElementById('hp').hasAttribute('data-cp-hp'));
        assert.equal(await page.locator('.cp-hp-disc').count(), 0);
        await page.locator('#hp-label .value').evaluate(el => { el.firstChild.data = '120%'; });
        await page.waitForFunction(() => document.getElementById('hp').getAttribute('data-cp-hp') === '100');
        await page.locator('#hp .cp-hp-disc').evaluate(el => el.remove());
        await page.waitForFunction(() => document.getElementById('hp').querySelector('.cp-hp-disc'));
        await page.locator('#game').evaluate(el => {
          const replacement = document.createElement('div'); replacement.id = 'game';
          replacement.innerHTML = '<div class="layer interface-layer"><div class="bottom-panel"><div id="hp" class="hp-indicator"><div id="hp-label" class="hpp">42%</div></div></div></div>';
          el.replaceWith(replacement);
        });
        await page.waitForFunction(() => document.getElementById('hp').getAttribute('data-cp-hp') === '42');
        assert.equal(await page.locator('.cp-hp-disc').count(), 1);
        // HUD children can arrive in separate render passes.
        await page.locator('#hp').evaluate(el => el.remove());
        await page.evaluate(() => settle());
        await page.evaluate(async () => {
          const holder = document.createElement('div');
          document.querySelector('.bottom-panel').append(holder);
          await settle();
          holder.innerHTML = '<div id="hp" class="hp-indicator"><div id="hp-label" class="hpp">42%</div></div>';
        });
        await page.waitForFunction(() => document.getElementById('hp').getAttribute('data-cp-hp') === '42');
        assert.equal(await page.locator('.cp-hp-disc').count(), 1);
        if (mode === 'standalone') {
          await page.evaluate(() => toggleTheme());
          assert.equal(await page.locator('#cyberpunk-ni-style,.cp-hp-disc').count(), 0);
          await page.evaluate(() => toggleTheme());
          await page.waitForFunction(() => document.getElementById('hp').getAttribute('data-cp-hp') === '42');
        }
        await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
        assert.equal(await page.locator('#cyberpunk-ni-style,.cp-hp-disc').count(), 0);
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log(process.env.CYBERPUNK_REFERENCE_DIR ? 'Reference measurements complete.' : 'PASS: scoped HP work in module and standalone; zero unrelated UI work; label/HUD replacement, delayed HUD, invalid values, full HP, cleanup and standalone toggle.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
