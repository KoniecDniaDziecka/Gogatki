const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
    const createModel = new Function(fs.readFileSync(path.join(__dirname, '../sources/mapa-podreczna/model.js'), 'utf8') + '\nreturn createMapModel;')();
    const relations = [[1, 'other'], [2, 'friend'], [3, 'enemy'], [4, 'clan'], [5, 'ally'], [6, 'clanEnemy'], [7, 'ally'], [8, 'enemy'],
        ['friend', 'friend'], ['fr', 'friend'], ['cl-en', 'clanEnemy'], ['clanEnemy', 'clanEnemy'], ['cl-fr', 'ally']];
    const players = Object.fromEntries(relations.map(([relation], id) => [id, { d: { id, relation, nick: 'Test', x: 1, y: 1 } }]));
    const model = createModel({ Engine: { hero: { d: { id: 100, x: 0, y: 0 } }, map: { d: { id: 1, x: 32, y: 16 } }, others: { check: () => players } } }, { mmShowOthers: true }, { text: '' }, () => {});
    const snapshot = model.snapshot();
    for (const [id, [, kind]] of relations.entries()) {
        assert.equal(snapshot.objects.find(object => object.id === 'o' + id)?.kind, kind, 'Relations retain distinct player categories');
        assert.equal(snapshot.players.find(player => player.id === String(id))?.hostile, ['enemy', 'clanEnemy', 'other'].includes(kind), 'Separate clan enemy color retains hostile behavior');
    }
    const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
    try {
        const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
        page.setDefaultTimeout(6000);
        const errors = [], remote = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('request', request => remote.push(request.url()));
        await page.setContent(`<style>
            body{background:#292c31;margin:0}.handheld-window{position:absolute;left:30px;top:60px;width:380px;height:310px;background:#141414;color:white;border:2px solid #746c56}
            .header-label{position:relative;height:24px;background:#333;cursor:move}.header-label .text{display:block;text-align:center;font:12px/24px Arial,sans-serif}.header-label button{position:absolute;top:2px;width:20px;height:20px;padding:0}.close-button{right:2px}.native-settings{left:4px}
            .content{padding:10px}.viewport{width:320px;max-width:100%;height:160px;overflow:hidden}canvas{display:block;width:320px;height:160px}
        </style><div id="native" class="c-window handheld-window"><div class="header-label"><span class="text">Mapa podręczna</span><button class="native-settings" aria-label="Natywne ustawienia">*</button><button class="close-button" aria-label="Zamknij">×</button></div><div class="content"><div class="viewport"><canvas id="map" width="320" height="160"></canvas></div><button id="native-action">Natywna akcja</button></div></div><div id="corner-minimap">Minimapa w rogu</div>`);
        const standalone = process.env.NATIVE_MAP_STANDALONE === '1';
        const source = fs.readFileSync(path.join(__dirname, standalone ? '../gogatki/standalone/mapa-podreczna.user.js' : '../gogatki/modules/mapa-podreczna.js'), 'utf8');
        const dockSource = fs.readFileSync(path.join(__dirname, '../gogatki/dock.js'), 'utf8');
        await page.evaluate(({ source, standalone, dockSource }) => {
            window.unsafeWindow = window;
            window.saved = {};
            window.GM_getValue = (key, fallback) => saved[key] ?? fallback;
            window.GM_setValue = (key, value) => { saved[key] = value; };
            const setInterval = window.setInterval.bind(window);
            window.pauseMapTicks = false;
            window.setInterval = (callback, delay) => setInterval(() => { if (!(delay === 200 && pauseMapTicks)) callback(); }, delay);
            const requestFrame = window.requestAnimationFrame.bind(window), cancelFrame = window.cancelAnimationFrame.bind(window);
            window.pendingMapFrames = new Set();
            window.requestAnimationFrame = callback => {
                const id = requestFrame(time => { pendingMapFrames.delete(id); callback(time); });
                pendingMapFrames.add(id); return id;
            };
            window.cancelAnimationFrame = id => { pendingMapFrames.delete(id); cancelFrame(id); };
            window.walks = []; window.requests = []; window.nativeClicks = 0; window.nativeActions = 0;
            window.initialCanvas = document.getElementById('map');
            const ctx = initialCanvas.getContext('2d'); ctx.fillStyle = '#444'; ctx.fillRect(0, 0, 320, 160);
            // The real native canvas also contains markers: these must not bleed
            // through our renderer, including after using filters/search.
            ctx.fillStyle = '#ff00ff'; ctx.fillRect(120, 70, 5, 5);
            const terrainCanvas = document.createElement('canvas'); terrainCanvas.width = 1088; terrainCanvas.height = 576;
            const terrainCtx = terrainCanvas.getContext('2d'); terrainCtx.fillStyle = '#00ffff'; terrainCtx.fillRect(0, 0, 1088, 576);
            terrainCtx.fillStyle = '#444'; terrainCtx.fillRect(32, 32, 1024, 512);
            window.terrainImage = new Image(); terrainImage.src = terrainCanvas.toDataURL();
            initialCanvas.addEventListener('click', () => { nativeClicks++; });
            document.getElementById('native-action').addEventListener('click', () => { nativeActions++; });
            document.querySelector('.close-button').addEventListener('click', () => { document.getElementById('native').style.display = 'none'; });
            window.npcs = { 10: { d: { id: 10, x: 7, y: 4, nick: 'Heros testowy', type: 2, wt: 80, lvl: 100 } }, 11: { d: { id: 11, x: 8, y: 5, nick: '<img src=x onerror=alert(1)>', type: 2, wt: 0, lvl: 2 } }, 12: { d: { id: 12, x: 13, y: 9, nick: 'Elita II testowa', type: 2, wt: 20, lvl: 100 } } };
            window.players = { 20: { d: { id: 20, x: 2, y: 1, nick: 'Wróg testowy', relation: 3, lvl: 100, prof: 'w' } } };
            const original = function (data, extra) {
                window.parserThis = this; window.parserExtra = extra;
                if (data?.other) for (const [id, patch] of Object.entries(data.other)) if (players[id]) Object.assign(players[id].d, patch);
                return 123;
            };
            window.originalParser = original;
            window.mapWidgetCalls = 0;
            window.nativeParent = document.getElementById('native').parentElement;
            window.Engine = {
                widgetManager: { getDefaultWidgetSet: () => ({ handheldMap: { txt: 'Podręczna mapa', clb() { mapWidgetCalls++; document.getElementById('native').style.display = ''; } } }) },
                hero: { d: { id: 1, x: 1, y: 1, lvl: 100 }, autoGoTo: point => walks.push(point) },
                map: { d: { id: 1, name: 'Testowa mapa', file: 'test.png', x: 32, y: 16, visibility: 4, backgroundOffset: { x: 1, y: 1 } }, img: terrainImage, size: { x: 32, y: 16 }, col: { check: () => false }, gateways: { 1: { x: 15, y: 8, name: 'Przejście testowe' }, 2: { x: 16, y: 8, name: 'Przejście testowe' } } },
                npcs: { check: () => npcs }, others: { check: () => players, getById: id => players[id] },
                communication: { parseJSON: original }
            };
            window._g = query => requests.push(query);
            new Function('GogatkiDockRuntime', 'unsafeWindow', 'GM_getValue', 'GM_setValue', dockSource)({ register: value => { window.__gogatkiTileDock = value.create(); } }, window, GM_getValue, GM_setValue);
            if (standalone) window.definition = { start: () => window.eval(source) };
            else new Function('GogatkiRuntime', 'unsafeWindow', 'GM_getValue', 'GM_setValue', source)({ register: value => { window.definition = value; } }, window, GM_getValue, GM_setValue);
            definition.start();
        }, { source, standalone, dockSource });
        const native = page.locator('#native');
        const ui = native.locator('[data-gogatki-map-ui]');
        const layer = native.locator('[data-gogatki-map-layer]');
        const marks = native.locator('[data-gogatki-map-markers]');
        await marks.locator('[data-kind=heros]').waitFor({ state: 'attached' });
        const mapTile = page.locator('#gogatki-tile-dock > .gogatki-dock-toggle[aria-controls="gogatki-mapa-plus"]');
        await mapTile.waitFor();
        assert((await mapTile.getAttribute('aria-label')).startsWith('Mapa+'));
        assert.equal(await mapTile.locator('svg').count(), 1, 'Map+ has an SVG map icon');
        assert.deepEqual(await mapTile.evaluate(node => [node.offsetWidth, node.offsetHeight]), [28, 28]);
        assert.equal(await mapTile.getAttribute('aria-expanded'), 'true');
        await mapTile.click();
        await native.waitFor({ state: 'hidden' });
        await page.waitForFunction(() => document.querySelector('[aria-controls="gogatki-mapa-plus"]').getAttribute('aria-expanded') === 'false');
        assert.equal(await page.evaluate(() => document.getElementById('native').parentElement === nativeParent), true, 'Dock never reparents the native map');
        await mapTile.click();
        await marks.locator('[data-kind=heros]').waitFor({ state: 'attached' });
        assert.equal(await page.evaluate(() => mapWidgetCalls), 1, 'Dock opens the map using its native widget callback');
        await page.evaluate(() => {
            const button = document.createElement('button'); button.className = 'widget-button widget-handheldMap'; button.id = 'native-map-widget';
            window.mapNativeWidgetClicks = 0;
            button.onclick = () => { mapNativeWidgetClicks++; document.getElementById('native').style.display = ''; };
            document.body.append(button);
        });
        await mapTile.click(); await native.waitFor({ state: 'hidden' });
        await mapTile.click(); await native.waitFor({ state: 'visible' });
        assert.equal(await page.evaluate(() => mapNativeWidgetClicks), 1, 'Dock uses the native widget button when available');
        await page.evaluate(() => { document.getElementById('native-map-widget').remove(); });
        await marks.locator('[data-kind=heros]').waitFor({ state: 'attached' });
        const markerStyle = selector => marks.locator(selector).evaluate(node => {
            const css = getComputedStyle(node);
            return { tag: node.tagName, classes: node.className, width: parseFloat(css.width), radius: css.borderRadius, background: css.backgroundColor, border: css.borderTopWidth, borderColor: css.borderTopColor, shadow: css.boxShadow, ring: getComputedStyle(node, '::before').animationName };
        });
        const herosStyle = await markerStyle('[data-kind=heros]');
        assert.equal(herosStyle.width, 15, 'Important NPCs use the original 1.5x tile marker');
        assert(herosStyle.classes.includes('pa-mm-pulse'));
        assert.equal(herosStyle.ring, 'pa-mm-ring', 'Original expanding rings are retained');
        const heroStyle = await markerStyle('[data-kind=hero]');
        assert.equal(heroStyle.width, 7, 'Own position marker is smaller and remains visible');
        assert.equal(heroStyle.radius, '2px', 'Own character is a rounded square, not a circle');
        assert.equal(heroStyle.background, 'rgb(135, 253, 255)');
        assert(heroStyle.shadow.includes('255, 255, 255'));
        assert((await markerStyle('[data-kind=mob]')).shadow.includes('157, 161, 167'), 'Ordinary mobs have a gray outline');
        const mobStyle = await markerStyle('[data-kind=mob]');
        assert.equal(mobStyle.background, 'rgba(0, 0, 0, 0)', 'Ordinary mob markers have an empty center');
        const elite2Style = await markerStyle('[data-kind=elite2]');
        assert.equal(mobStyle.width, heroStyle.width, 'Ordinary mobs are the same size as the hero');
        assert.equal(elite2Style.width, 10, 'Elite II uses the previous ordinary mob size');
        assert(elite2Style.width > mobStyle.width, 'Elite II markers are larger than ordinary mobs');
        assert(!elite2Style.classes.includes('pa-mm-pulse'), 'Increasing Elite II size does not add pulsing');
        const gatewayStyle = await markerStyle('[data-kind=gw]');
        assert.equal(gatewayStyle.radius, '3px');
        assert.equal(gatewayStyle.width, 14, 'Wide gateways are smaller while retaining their proportions');
        assert.equal(await marks.locator('[data-kind=gw]').evaluate(node => parseFloat(getComputedStyle(node).height)), heroStyle.width, 'Gateway thickness matches the smaller hero marker');
        assert.equal(await page.locator('.handheld-window').count(), 1);
        assert.equal(await page.locator('.pa-mm').count(), 0);
        assert.equal(await page.evaluate(() => document.getElementById('map') === initialCanvas), true);
        assert.equal(await native.evaluate(node => getComputedStyle(node).visibility), 'visible');
        assert.equal(await layer.evaluate(node => getComputedStyle(node).pointerEvents), 'none');
        assert.deepEqual(await page.evaluate(() => Array.from(initialCanvas.getContext('2d').getImageData(1, 1, 1, 1).data)), [68, 68, 68, 255]);
        assert.equal(await layer.locator('[data-gogatki-map-terrain]').getAttribute('x'), '-1');
        assert.equal(await layer.locator('[data-gogatki-map-terrain]').getAttribute('width'), '34');
        const composite = await page.evaluate(async () => {
            const svg = document.querySelector('[data-gogatki-map-layer]').cloneNode(true);
            svg.style.cssText = 'width:320px;height:160px'; svg.setAttribute('width', '320'); svg.setAttribute('height', '160');
            const image = new Image();
            await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg)); });
            const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 160;
            const context = canvas.getContext('2d'); context.drawImage(initialCanvas, 0, 0); context.drawImage(image, 0, 0);
            return { visible: Array.from(context.getImageData(120, 70, 1, 1).data), native: Array.from(initialCanvas.getContext('2d').getImageData(120, 70, 1, 1).data), margin: Array.from(context.getImageData(1, 1, 1, 1).data) };
        });
        assert.deepEqual(composite.native, [255, 0, 255, 255]);
        assert.deepEqual(composite.visible, [68, 68, 68, 255], 'Native markers are covered by clean terrain');
        assert.deepEqual(composite.margin, [68, 68, 68, 255], 'Map background offset crops the image margin');
        // A tall map is drawn in the middle of a wider native canvas. Its
        // enclosing canvas does not have the same aspect ratio as the map.
        await page.evaluate(() => {
            initialCanvas.style.width = '224px'; initialCanvas.style.height = '240px';
            Object.assign(Engine.map.d, { id: 3, x: 128, y: 200 });
        });
        await page.waitForFunction(() => document.querySelector('[data-gogatki-map-layer]').getAttribute('viewBox') === '0 0 128 200');
        const largeMapGeometry = await page.evaluate(() => {
            const map = document.getElementById('map').getBoundingClientRect(), overlay = document.querySelector('[data-gogatki-map-layer]').getBoundingClientRect();
            return { width: overlay.width, height: overlay.height, x: overlay.left - map.left, y: overlay.top - map.top, visible: getComputedStyle(document.querySelector('[data-gogatki-map-layer]')).display !== 'none' };
        });
        assert(largeMapGeometry.visible, 'Large maps activate the renderer');
        assert(Math.abs(largeMapGeometry.width - 153.6) < 0.1);
        assert.equal(largeMapGeometry.height, 240);
        assert(Math.abs(largeMapGeometry.x - 35.2) < 0.1, 'Overlay is centered on terrain rather than stretched to the entire canvas');
        assert.equal(largeMapGeometry.y, 0);
        assert.equal((await markerStyle('[data-kind=mob]')).width, (await markerStyle('[data-kind=hero]')).width);
        assert.equal((await markerStyle('[data-kind=elite2]')).width, 7);
        // Map dimensions may appear after Engine.map.d while keeping the same ID.
        await page.evaluate(() => { Object.assign(Engine.map.d, { id: 4, x: 0, y: 0 }); Engine.map.size = { x: 0, y: 0 }; });
        await page.waitForFunction(() => document.querySelector('[data-gogatki-map-layer]').style.display === 'none');
        await page.evaluate(() => { Engine.map.size = { x: 128, y: 200 }; });
        await page.waitForFunction(() => document.querySelector('[data-gogatki-map-layer]').style.display !== 'none');
        await page.evaluate(() => {
            Object.assign(Engine.map.d, { id: 5, x: 8, y: 128 });
            initialCanvas.style.width = '15px'; initialCanvas.style.height = '240px';
        });
        await page.waitForFunction(() => document.querySelector('[data-gogatki-map-layer]').getAttribute('viewBox') === '0 0 8 128');
        assert.equal(await layer.evaluate(node => getComputedStyle(node).display !== 'none'), true, 'Narrow maps are not rejected by the old 64px minimum width');
        // CSS terrain can live under a container with any NI layout class.
        await page.evaluate(() => {
            Object.assign(Engine.map.d, { id: 6, x: 128, y: 200 });
            initialCanvas.style.display = 'none';
            const tile = document.createElement('div'); tile.id = 'css-terrain';
            tile.style.cssText = 'width:153.6px;height:240px;background-image:url("test.png")';
            document.getElementById('native').append(tile);
        });
        await page.waitForFunction(() => {
            const layer = document.querySelector('[data-gogatki-map-layer]').getBoundingClientRect(), terrain = document.getElementById('css-terrain').getBoundingClientRect();
            return Math.abs(layer.left - terrain.left) < 0.1 && Math.abs(layer.top - terrain.top) < 0.1;
        });
        assert.equal(await layer.evaluate(node => getComputedStyle(node).display !== 'none'), true, 'CSS terrain outside known content classes is recognized');
        await page.evaluate(() => {
            document.getElementById('css-terrain').remove();
            Object.assign(Engine.map.d, { id: 1, x: 32, y: 16 }); Engine.map.size = { x: 32, y: 16 };
            initialCanvas.style.cssText = 'display:block;width:320px;height:160px';
        });
        await page.waitForFunction(() => document.querySelector('[data-gogatki-map-layer]').getAttribute('viewBox') === '0 0 32 16');
        await page.waitForTimeout(500);
        await page.locator('#map').click({ position: { x: 15, y: 15 } });
        await page.locator('#native-action').click();
        assert.equal(await page.evaluate(() => nativeClicks), 1);
        assert.equal(await page.evaluate(() => nativeActions), 1);
        assert.equal(await page.evaluate(() => walks.length), 0, 'No automatic walk just by opening the map');
        const livePositions = await page.evaluate(async () => {
            pauseMapTicks = true;
            const samples = [];
            for (const [x, y] of [[1.125, 1.25], [1.375, 1.5]]) {
                Engine.hero.rx = x; Engine.hero.ry = y;
                await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                const root = document.querySelector('[data-gogatki-map-markers]').shadowRoot;
                const hero = new DOMMatrix(getComputedStyle(root.querySelector('[data-kind=hero]')).transform);
                const view = new DOMMatrix(getComputedStyle(root.querySelector('[data-kind=view]')).transform);
                samples.push({ hero: [hero.m41, hero.m42], view: [view.m41, view.m42], tile: [Engine.hero.d.x, Engine.hero.d.y] });
            }
            delete Engine.hero.rx; delete Engine.hero.ry;
            pauseMapTicks = false;
            return samples;
        });
        assert.deepEqual(livePositions, [
            { hero: [12.75, 14], view: [-28.75, -27.5], tile: [1, 1] },
            { hero: [15.25, 16.5], view: [-26.25, -25], tile: [1, 1] }
        ], 'Hero and visibility frame follow fractional live coordinates while the data timer is paused');

        async function assertAlignment() {
            const positions = await page.evaluate(() => {
                const r = initialCanvas.getBoundingClientRect(), marker = document.querySelector('[data-gogatki-map-markers]').shadowRoot.querySelector('[data-kind=heros]').getBoundingClientRect();
                return { actual: [marker.left + marker.width / 2, marker.top + marker.height / 2], expected: [r.left + 7.5 / 32 * r.width, r.top + 4.5 / 16 * r.height] };
            });
            assert(Math.abs(positions.actual[0] - positions.expected[0]) < 1, JSON.stringify(positions));
            assert(Math.abs(positions.actual[1] - positions.expected[1]) < 1, JSON.stringify(positions));
        }
        async function assertTitleControl() {
            const r = await page.evaluate(() => {
                const rect = node => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
                const range = document.createRange(); range.selectNodeContents(document.querySelector('.header-label .text'));
                const title = range.getBoundingClientRect();
                return { button: rect(document.querySelector('[data-gogatki-map-ui]').shadowRoot.querySelector('.toggle')), header: rect(document.querySelector('.header-label')), close: rect(document.querySelector('.close-button')), map: rect(initialCanvas), title: { left: title.left, right: title.right } };
            });
            assert(r.button.top >= r.header.top - 1 && r.button.bottom <= r.header.bottom + 1, 'Settings button stays in the title bar');
            assert(r.button.bottom <= r.map.top, 'Settings button does not cover the map');
            assert(r.button.right <= r.close.left, 'Native close button remains unobstructed');
            assert(r.button.left >= r.title.right || r.button.right <= r.title.left, 'Native title remains readable');
        }
        await assertAlignment();
        await assertTitleControl();

        await page.evaluate(() => { document.getElementById('native').style.transform = 'scale(0.8)'; });
        await page.waitForTimeout(250);
        await assertAlignment();
        await assertTitleControl();
        await page.evaluate(() => { document.getElementById('native').style.left = '180px'; document.getElementById('native').style.width = '240px'; initialCanvas.style.width = '256px'; initialCanvas.style.height = '128px'; });
        await page.waitForFunction(() => Math.abs(parseFloat(document.querySelector('[data-gogatki-map-layer]').style.width) - 256) < 1);
        await assertAlignment();
        await assertTitleControl();

        await ui.getByRole('button', { name: 'Ustawienia mapy+', exact: true }).click();
        const drawerBounds = await ui.locator('.drawer').boundingBox();
        const windowBounds = await native.boundingBox();
        assert(drawerBounds.x >= windowBounds.x && drawerBounds.x + drawerBounds.width <= windowBounds.x + windowBounds.width, 'Settings drawer fits the native window');
        const search = ui.getByRole('searchbox', { name: 'Szukaj na mapie' });
        await search.fill('heros');
        await page.waitForFunction(() => document.querySelector('[data-gogatki-map-ui]').shadowRoot.querySelectorAll('.entry').length === 1);
        assert.equal(await marks.locator('[data-kind=enemy]').count(), 0);
        assert.equal(await marks.locator('[data-kind=heros]').count(), 1);
        await ui.getByRole('button', { name: 'Podejdź', exact: true }).click();
        assert.deepEqual(await page.evaluate(() => walks[0]), { x: 7, y: 4 });
        await search.fill('0,0');
        await marks.locator('[data-kind=marker]').waitFor({ state: 'attached' });
        await search.fill('');
        await ui.getByLabel('Moby', { exact: true }).uncheck();
        await marks.locator('[data-kind=mob]').waitFor({ state: 'detached' });
        assert.equal(await page.evaluate(() => saved['mapa-podreczna:global:v1'].mmShowMobs), false);
        assert.equal(await page.locator('[data-gogatki-map-ui] img').count(), 0, 'Server names are rendered as text');

        const parser = await page.evaluate(() => {
            const comm = Engine.communication;
            const result = comm.parseJSON({ other: { 20: { x: 3, y: 1 } }, handheld_minimap: { hero_localizations: [{ name: 'Resp testowy', positions: [[12, 6]] }, { name: 'Resp eventowy', kind: 'event', positions: [[20, 10]] }] } }, 'preserved');
            return [result, parserThis === comm, parserExtra];
        });
        assert.deepEqual(parser, [123, true, 'preserved']);
        await marks.locator('[data-kind=resp]').waitFor({ state: 'attached' });
        assert.equal((await markerStyle('[data-kind=resp]')).border, '2px');
        assert.equal((await markerStyle('[data-kind=respEvent]')).borderColor, 'rgb(255, 186, 55)');
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
        await page.evaluate(() => { Engine.hero.d.x = 12; Engine.hero.d.y = 6; });
        await page.waitForFunction(() => document.querySelector('[data-gogatki-map-markers]').shadowRoot.querySelector('[data-kind=resp]').classList.contains('pa-mm-near'));
        assert.equal((await markerStyle('[data-kind=resp]')).borderColor, 'rgb(255, 186, 55)');
        assert.equal((await markerStyle('[data-kind=resp]')).border, '3px');
        await page.evaluate(() => {
            Engine.hero.d.x = 2; Engine.hero.d.y = 1;
            Engine.communication.parseJSON({ other: { 21: { nick: 'Obserwator', x: 22, y: 11, relation: 1 } } });
        });
        await page.waitForFunction(() => document.querySelector('[data-gogatki-map-markers]').shadowRoot.querySelector('[data-kind=respEvent]').classList.contains('pa-mm-suspect'));
        assert.equal((await markerStyle('[data-kind=respEvent]')).background, 'rgb(255, 0, 255)');
        assert.equal((await markerStyle('[data-kind=respEvent]')).border, '0px');
        await ui.getByRole('button', { name: 'Ustawienia mapy+', exact: true }).click();
        await page.screenshot({ path: '/tmp/mapa-podreczna-markers.png' });
        await ui.getByRole('button', { name: 'Ustawienia mapy+', exact: true }).click();

        await page.evaluate(() => { Engine.map.d.id = 2; Engine.map.d.name = 'Druga mapa'; npcs = {}; players = {}; });
        await marks.locator('[data-kind=heros]').waitFor({ state: 'detached' });
        await marks.locator('[data-kind=resp]').waitFor({ state: 'detached' });
        await page.evaluate(() => definition.start());
        assert.equal(await page.locator('[data-gogatki-map-ui]').count(), 1, 'Duplicate start is ignored');
        await page.screenshot({ path: '/tmp/mapa-podreczna-plus.png' });
        await native.locator('.close-button').click();
        await layer.waitFor({ state: 'detached' });
        assert.equal(await page.evaluate(() => pendingMapFrames.size), 0, 'No animation loop when the map is closed');
        await page.evaluate(() => { document.getElementById('native').style.display = ''; });
        await native.locator('[data-gogatki-map-ui]').waitFor();
        await page.evaluate(() => { initialCanvas.style.display = 'none'; });
        await page.waitForFunction(() => document.querySelector('[data-gogatki-map-layer]').style.display === 'none');
        assert.equal(await native.isVisible(), true, 'Unrecognized surface leaves the native window usable');
        if (!(await ui.locator('.drawer').isVisible())) await ui.getByRole('button', { name: 'Ustawienia mapy+', exact: true }).click();
        await ui.locator('summary').click();
        await ui.getByRole('button', { name: 'Kopiuj diagnostykę', exact: true }).click();
        const report = JSON.parse(await ui.getByLabel('Diagnostyka mapy', { exact: true }).inputValue());
        assert.equal(report.version, '1.0.10');
        assert.equal(report.active, false);
        assert(report.status.includes('Nie rozpoznano obszaru mapy'));
        assert(report.nodes.some(node => node.tag === 'CANVAS' && !node.visible));
        assert(!JSON.stringify(report).includes('base64,'), 'Diagnostics omit image payloads');
        await ui.getByRole('button', { name: 'Ustawienia mapy+', exact: true }).click();
        await page.evaluate(() => { initialCanvas.style.display = ''; });
        await page.waitForFunction(() => document.querySelector('[data-gogatki-map-layer]').style.display !== 'none');
        await page.evaluate(() => { const image = new Image(); image.src = 'data:image/png;base64,broken'; Engine.map.img = image; });
        await page.waitForFunction(() => document.querySelector('[data-gogatki-map-ui]').shadowRoot.querySelector('.status').textContent.includes('Nie udało się odczytać tła'));
        assert.equal(await layer.evaluate(element => element.style.display), 'none', 'Failed terrain load keeps the original map instead of doubling its markers');
        await page.evaluate(() => { Engine.map.img = terrainImage; });
        await page.waitForFunction(() => document.querySelector('[data-gogatki-map-layer]').style.display !== 'none');
        await page.evaluate(() => window.__gogatkiNativeMap.destroy());
        await page.waitForTimeout(50);
        await mapTile.waitFor({ state: 'detached' });
        assert.equal(await page.locator('#gogatki-mapa-plus').count(), 0, 'Destroy removes the dock bridge');
        assert.equal(await page.evaluate(() => pendingMapFrames.size), 0, 'Destroy cancels the animation frame');
        assert.equal(await page.locator('[data-gogatki-map-ui]').count(), 0);
        assert.equal(await page.evaluate(() => Engine.communication.parseJSON === originalParser), true);
        assert.equal(await page.evaluate(() => document.getElementById('map') === initialCanvas), true);
        assert.equal(await native.evaluate(element => element.style.isolation), '', 'Native stacking is restored on cleanup');
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
        assert.deepEqual(remote.filter(url => /^https?:/.test(url)), [], 'No HTTP calls in this fixture');
        await page.evaluate(() => window.__gogatkiTileDock.destroy());
        console.log(`PASS (${standalone ? 'standalone with NI readiness' : 'module'}): large letterboxed maps; narrow maps; CSS terrain; late dimensions; smaller mob/E2 markers; diagnostic report; clean terrain replaces native markers; background offset and failed-image fallback; existing native window/canvas/clicks retained; marker alignment after move/resize; search/coords/filters/storage; parser return/this/arguments; spawns; explicit chase/attack/stop; map change; duplicate start; close/reopen; cleanup`);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
