const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
    try {
        const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
        page.setDefaultTimeout(6000);
        const errors = [], remote = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('request', request => remote.push(request.url()));
        await page.setContent(`<style>
            body{background:#292c31;margin:0}.handheld-window{position:absolute;left:30px;top:60px;width:380px;height:310px;background:#141414;color:white;border:2px solid #746c56}
            .header-label{height:24px;background:#333;cursor:move}.content{padding:10px}.viewport{width:320px;height:160px;overflow:hidden}canvas{display:block;width:320px;height:160px}
        </style><div id="native" class="c-window handheld-window"><div class="header-label"><span class="text">Mapa podręczna</span><button class="close-button">Zamknij</button></div><div class="content"><div class="viewport"><canvas id="map" width="320" height="160"></canvas></div><button id="native-action">Natywna akcja</button></div></div><div id="corner-minimap">Minimapa w rogu</div>`);
        const standalone = process.env.NATIVE_MAP_STANDALONE === '1';
        const source = fs.readFileSync(path.join(__dirname, standalone ? '../gogatki/standalone/mapa-podreczna.user.js' : '../gogatki/modules/mapa-podreczna.js'), 'utf8');
        await page.evaluate(({ source, standalone }) => {
            window.unsafeWindow = window;
            window.saved = {};
            window.GM_getValue = (key, fallback) => saved[key] ?? fallback;
            window.GM_setValue = (key, value) => { saved[key] = value; };
            window.walks = []; window.requests = []; window.nativeClicks = 0; window.nativeActions = 0;
            window.initialCanvas = document.getElementById('map');
            const ctx = initialCanvas.getContext('2d'); ctx.fillStyle = '#444'; ctx.fillRect(0, 0, 320, 160);
            initialCanvas.addEventListener('click', () => { nativeClicks++; });
            document.getElementById('native-action').addEventListener('click', () => { nativeActions++; });
            document.querySelector('.close-button').addEventListener('click', () => { document.getElementById('native').style.display = 'none'; });
            window.npcs = { 10: { d: { id: 10, x: 7, y: 4, nick: 'Heros testowy', type: 2, wt: 80, lvl: 100 } }, 11: { d: { id: 11, x: 8, y: 5, nick: '<img src=x onerror=alert(1)>', type: 2, wt: 0, lvl: 2 } } };
            window.players = { 20: { d: { id: 20, x: 2, y: 1, nick: 'Wróg testowy', relation: 3, lvl: 100, prof: 'w' } } };
            const original = function (data, extra) {
                window.parserThis = this; window.parserExtra = extra;
                if (data?.other) for (const [id, patch] of Object.entries(data.other)) if (players[id]) Object.assign(players[id].d, patch);
                return 123;
            };
            window.originalParser = original;
            window.Engine = {
                hero: { d: { id: 1, x: 1, y: 1, lvl: 100 }, autoGoTo: point => walks.push(point) },
                map: { d: { id: 1, name: 'Testowa mapa', file: 'test.png', x: 32, y: 16, visibility: 4 }, size: { x: 32, y: 16 }, col: { check: () => false } },
                npcs: { check: () => npcs }, others: { check: () => players, getById: id => players[id] },
                communication: { parseJSON: original }
            };
            window._g = query => requests.push(query);
            if (standalone) window.definition = { start: () => window.eval(source) };
            else new Function('GogatkiRuntime', 'unsafeWindow', 'GM_getValue', 'GM_setValue', source)({ register: value => { window.definition = value; } }, window, GM_getValue, GM_setValue);
            definition.start();
        }, { source, standalone });
        const native = page.locator('#native');
        const ui = native.locator('[data-gogatki-map-ui]');
        const layer = native.locator('[data-gogatki-map-layer]');
        await layer.locator('[data-kind=heros]').waitFor({ state: 'attached' });
        assert.equal(await page.locator('.handheld-window').count(), 1);
        assert.equal(await page.locator('.pa-mm').count(), 0);
        assert.equal(await page.evaluate(() => document.getElementById('map') === initialCanvas), true);
        assert.equal(await native.evaluate(node => getComputedStyle(node).visibility), 'visible');
        assert.equal(await layer.evaluate(node => getComputedStyle(node).pointerEvents), 'none');
        assert.deepEqual(await page.evaluate(() => Array.from(initialCanvas.getContext('2d').getImageData(1, 1, 1, 1).data)), [68, 68, 68, 255]);
        await page.locator('#map').click({ position: { x: 15, y: 15 } });
        await page.locator('#native-action').click();
        assert.equal(await page.evaluate(() => nativeClicks), 1);
        assert.equal(await page.evaluate(() => nativeActions), 1);
        assert.equal(await page.evaluate(() => walks.length), 0, 'No automatic walk just by opening the map');

        async function assertAlignment() {
            const positions = await page.evaluate(() => {
                const r = initialCanvas.getBoundingClientRect(), marker = document.querySelector('[data-kind=heros]').getBoundingClientRect();
                return { actual: [marker.left + marker.width / 2, marker.top + marker.height / 2], expected: [r.left + 7.5 / 32 * r.width, r.top + 4.5 / 16 * r.height] };
            });
            assert(Math.abs(positions.actual[0] - positions.expected[0]) < 1);
            assert(Math.abs(positions.actual[1] - positions.expected[1]) < 1);
        }
        await assertAlignment();

        await page.evaluate(() => { document.getElementById('native').style.transform = 'scale(0.8)'; });
        await page.waitForTimeout(250);
        await assertAlignment();
        await page.evaluate(() => { document.getElementById('native').style.left = '180px'; initialCanvas.style.width = '256px'; initialCanvas.style.height = '128px'; });
        await page.waitForFunction(() => Math.abs(parseFloat(document.querySelector('[data-gogatki-map-layer]').style.width) - 256) < 1);
        await assertAlignment();

        await ui.getByRole('button', { name: 'Mapa+', exact: true }).click();
        const search = ui.getByRole('searchbox', { name: 'Szukaj na mapie' });
        await search.fill('heros');
        await page.waitForFunction(() => document.querySelector('[data-gogatki-map-ui]').shadowRoot.querySelectorAll('.entry').length === 1);
        assert.equal(await layer.locator('[data-kind=enemy]').count(), 0);
        assert.equal(await layer.locator('[data-kind=heros]').count(), 1);
        await ui.getByRole('button', { name: 'Podejdź', exact: true }).click();
        assert.deepEqual(await page.evaluate(() => walks[0]), { x: 7, y: 4 });
        await search.fill('0,0');
        await layer.locator('[data-kind=marker]').waitFor({ state: 'attached' });
        await search.fill('');
        await ui.getByLabel('Moby', { exact: true }).uncheck();
        await layer.locator('[data-kind=mob]').waitFor({ state: 'detached' });
        assert.equal(await page.evaluate(() => saved['mapa-podreczna:global:v1'].mmShowMobs), false);
        assert.equal(await page.locator('[data-gogatki-map-ui] img').count(), 0, 'Server names are rendered as text');

        const parser = await page.evaluate(() => {
            const comm = Engine.communication;
            const result = comm.parseJSON({ other: { 20: { x: 3, y: 1 } }, handheld_minimap: { hero_localizations: [{ name: 'Resp testowy', positions: [[12, 6]] }] } }, 'preserved');
            return [result, parserThis === comm, parserExtra];
        });
        assert.deepEqual(parser, [123, true, 'preserved']);
        await layer.locator('[data-kind=resp]').waitFor({ state: 'attached' });
        await ui.getByRole('button', { name: 'Goń', exact: true }).click();
        await page.waitForFunction(() => walks.length > 1);
        assert.equal(await page.evaluate(() => requests.length), 0, 'Chase starts without enabling attacks');
        await ui.getByLabel('Atakuj w pościgu', { exact: true }).check();
        await page.evaluate(() => { Engine.hero.d.x = 2; });
        await page.waitForFunction(() => requests.some(query => query === 'fight&a=attack&id=20'));
        await ui.getByRole('button', { name: 'Zatrzymaj podążanie', exact: true }).click();
        await page.evaluate(() => { window.attackCount = requests.length; });
        await page.waitForTimeout(1300);
        assert.equal(await page.evaluate(() => requests.length), await page.evaluate(() => attackCount));

        await page.evaluate(() => { Engine.map.d.id = 2; Engine.map.d.name = 'Druga mapa'; npcs = {}; players = {}; });
        await layer.locator('[data-kind=heros]').waitFor({ state: 'detached' });
        await layer.locator('[data-kind=resp]').waitFor({ state: 'detached' });
        await page.evaluate(() => definition.start());
        assert.equal(await page.locator('[data-gogatki-map-ui]').count(), 1, 'Duplicate start is ignored');
        await page.screenshot({ path: '/tmp/mapa-podreczna-plus.png' });
        await native.locator('.close-button').click();
        await layer.waitFor({ state: 'detached' });
        await page.evaluate(() => { document.getElementById('native').style.display = ''; });
        await native.locator('[data-gogatki-map-ui]').waitFor();
        await page.evaluate(() => { initialCanvas.style.display = 'none'; });
        await page.waitForFunction(() => document.querySelector('[data-gogatki-map-layer]').style.display === 'none');
        assert.equal(await native.isVisible(), true, 'Unrecognized surface leaves the native window usable');
        await page.evaluate(() => { initialCanvas.style.display = ''; });
        await page.waitForFunction(() => document.querySelector('[data-gogatki-map-layer]').style.display !== 'none');
        await page.evaluate(() => window.__gogatkiNativeMap.destroy());
        assert.equal(await page.locator('[data-gogatki-map-ui]').count(), 0);
        assert.equal(await page.evaluate(() => Engine.communication.parseJSON === originalParser), true);
        assert.equal(await page.evaluate(() => document.getElementById('map') === initialCanvas), true);
        assert.equal(await page.locator('#corner-minimap').textContent(), 'Minimapa w rogu');
        if (standalone) {
            await page.evaluate(() => {
                window.engineToRestore = Engine;
                delete window.Engine;
                definition.start();
            });
            assert.equal(await page.evaluate(() => Boolean(window.__gogatkiNativeMap)), false, 'Standalone waits until NI is ready');
            await page.evaluate(() => { window.Engine = engineToRestore; });
            await native.locator('[data-gogatki-map-ui]').waitFor();
            await page.evaluate(() => window.__gogatkiNativeMap.destroy());
            assert.equal(await page.locator('[data-gogatki-map-ui]').count(), 0);
            assert.equal(await page.evaluate(() => typeof window.GogatkiRuntime), 'undefined', 'Standalone does not require or expose a panel registry');
        }
        assert.deepEqual(errors, []);
        assert.deepEqual(remote, [], 'No HTTP calls or external map image requests');
        console.log(`PASS (${standalone ? 'standalone with NI readiness' : 'module'}): existing native window/canvas/clicks retained; marker alignment after move/resize; search/coords/filters/storage; parser return/this/arguments; spawns; explicit chase/attack/stop; map change; duplicate start; close/reopen; cleanup; zero HTTP requests`);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
