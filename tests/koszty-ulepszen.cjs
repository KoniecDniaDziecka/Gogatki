const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
    try {
        const page = await browser.newPage();
        page.setDefaultTimeout(10000);
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const fixture = `<html><head><style>.content div{font-size:35px;text-shadow:1px 1px red}</style></head><body>
            <div id="legend" class="tip-wrapper" data-type="t_item" data-item-type="t-leg"><div class="content">
                <div class="item-tip-section"><span class="tip-item-stat-rarity item-rarity legendary">legendarny</span></div>
                <div id="requirements" class="item-tip-section"><div class="tip-item-stat-lvl level-required"><span>Wymagany poziom: 100</span></div></div>
            </div></div></body></html>`;
        await page.route('https://fixture.margonem.pl/**', route => route.fulfill({ body: fixture, contentType: 'text/html' }));
        await page.goto('https://fixture.margonem.pl');
        const sources = Object.fromEntries(['catalogue.json', 'dock.js', 'modules/koszty-ulepszen.js'].map(file => [file, fs.readFileSync(path.join(__dirname, '../gogatki', file), 'utf8')]));
        await page.evaluate(sources => {
            window.unsafeWindow = window;
            window.store = { 'gogatek:modules:v1': {} };
            window.GM_getValue = (key, fallback) => store[key] ?? fallback;
            window.GM_setValue = (key, value) => { store[key] = value; };
            window.sourceRequests = [];
            window.GM_xmlhttpRequest = options => {
                const file = new URL(options.url).pathname.split('/gogatki/')[1];
                sourceRequests.push(file);
                setTimeout(() => options.onload({ status: sources[file] ? 200 : 404, responseText: sources[file] || '' }), 0);
            };
            window.Engine = { hero: { d: { id: 1 } }, map: { d: { id: 1 } } };
            window._g = () => { throw new Error('Koszty nie mogą wysyłać poleceń do gry'); };
            window.moduleCode = sources['modules/koszty-ulepszen.js'];
        }, sources);
        await page.addScriptTag({ path: path.join(__dirname, '../gogatki/gogatki.user.js') });
        // This fixture has no native widget manager; the loader allows NI to
        // initialize for five seconds before exposing its floating launcher.
        await page.waitForFunction(() => document.getElementById('gogatek-panel')?.dataset.launcherState === 'floating', null, { timeout: 15000 });
        const main = page.locator('#gogatek-panel');
        await main.locator('.launcher').evaluate(element => element.click());
        const checkbox = main.getByRole('checkbox', { name: 'Koszty ulepszeń', exact: true });
        await checkbox.waitFor();
        assert.equal(await checkbox.isChecked(), false);
        assert.equal(await page.locator('.gogatki-upgrade-costs').count(), 0);
        assert.equal(await page.evaluate(() => sourceRequests.includes('modules/koszty-ulepszen.js')), false);
        await checkbox.check();
        const section = page.locator('#legend .gogatki-upgrade-costs');
        await section.waitFor();
        assert.deepEqual(await section.locator('.guc-value').allTextContents(), ['280 000', '308 000', '364 000', '448 000', '560 000', '1 960 000', '13 800 000', '60']);
        assert.equal(await section.evaluate(element => element.nextElementSibling.id), 'requirements');
        assert.equal(await section.locator('.guc-row').first().evaluate(element => getComputedStyle(element).fontSize), '12px');
        assert.equal(await section.locator('.guc-heading').evaluate(element => getComputedStyle(element).color), 'rgb(18, 201, 189)');
        assert.equal(await section.locator('.guc-heading').evaluate(element => getComputedStyle(element).textShadow), 'none');
        assert.equal(await page.evaluate(() => store['gogatek:modules:v1']['koszty-ulepszen']), true);

        // Changing a text node in place must refresh an existing section, not leave stale costs.
        await page.evaluate(() => { document.querySelector('#legend .level-required span').firstChild.data = 'Wymagany poziom: 200'; });
        await page.waitForFunction(() => document.querySelector('#legend .gogatki-upgrade-costs')?.dataset.level === '200');
        assert.deepEqual(await section.locator('.guc-value').allTextContents(), ['380 000', '418 000', '494 000', '608 000', '760 000', '2 660 000', '39 600 000', '90']);
        assert.equal(await page.locator('#legend .gogatki-upgrade-costs').count(), 1);

        await page.evaluate(() => {
            document.getElementById('legend').dataset.itemType = 't-uni';
            const rarity = document.querySelector('#legend .item-rarity');
            rarity.classList.remove('legendary');
            rarity.textContent = 'unikatowy';
        });
        await section.waitFor({ state: 'detached' });
        // Attribute-only rarity changes and wrapper reuse must also work.
        await page.evaluate(() => { document.getElementById('legend').dataset.itemType = 't-leg'; });
        await section.waitFor();
        await page.evaluate(() => { document.getElementById('legend').dataset.type = 't_npc'; });
        await section.waitFor({ state: 'detached' });
        await page.evaluate(() => {
            document.getElementById('legend').dataset.type = 't_item';
            document.querySelector('#legend .level-required span').textContent = 'Brak wymaganego poziomu';
        });
        assert.equal(await section.count(), 0);

        // A new tooltip subtree and replacement .content are discovered without polling.
        await page.evaluate(() => {
            const holder = document.createElement('div');
            holder.innerHTML = '<div id="dynamic" class="tip-wrapper" data-type="t_item" data-item-type="t-leg"><div class="content"><div class="item-tip-section"><div class="tip-item-stat-lvl level-required">Wymagany poziom: 50</div></div></div></div>';
            document.body.append(holder);
        });
        await page.locator('#dynamic .gogatki-upgrade-costs').waitFor();
        await page.evaluate(() => {
            document.getElementById('dynamic').innerHTML = '<div class="content"><div class="tip-item-stat-rarity item-rarity legendary">legendarny</div><div class="tip-item-stat-lvl level-required">Wymagany poziom: 75</div></div>';
        });
        await page.waitForFunction(() => document.querySelector('#dynamic .gogatki-upgrade-costs')?.dataset.level === '75');
        await page.evaluate(() => {
            let definition;
            new Function('GogatkiRuntime', 'unsafeWindow', moduleCode)({ register: value => { definition = value; } }, window);
            definition.start();
        });
        assert.equal(await page.locator('#gogatki-upgrade-costs-style').count(), 1);
        assert.equal(await page.locator('#dynamic .gogatki-upgrade-costs').count(), 1);
        // Capture a reviewable tooltip without the main menu over it.
        await main.locator('.launcher').evaluate(element => element.click());
        await page.screenshot({ path: '/tmp/koszty-ulepszen.png' });
        await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
        assert.equal(await page.locator('.gogatki-upgrade-costs').count(), 0);
        assert.equal(await page.locator('#gogatki-upgrade-costs-style').count(), 0);
        assert.equal(await page.evaluate(() => window.__gogatkiUpgradeCosts), undefined);
        assert.deepEqual(errors, []);

        // SI is deliberately unsupported and gets a user-visible message.
        await page.evaluate(() => {
            delete window.Engine;
            window.g = {};
            window.notice = '';
            window.message = text => { notice = text; };
            let definition;
            new Function('GogatkiRuntime', 'unsafeWindow', moduleCode)({ register: value => { definition = value; } }, window);
            definition.start();
        });
        assert.match(await page.evaluate(() => notice), /nowym interfejsie/);
        assert.equal(await page.locator('#gogatki-upgrade-costs-style').count(), 0);
        assert.deepEqual(errors, []);
        console.log('PASS: loader catalogue/default-off/enable/storage, original formulas, scoped styles, reused and dynamic tooltips, rarity/type/level changes, duplicate start, cleanup, SI notice');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
