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
        const fixture = `<html><head><style>.content div{font-size:35px;text-shadow:1px 1px red}.item-rarity.legendary{color:rgb(255,140,0)}</style></head><body>
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
            window.Engine = { hero: { d: { id: 1, maxhp:1000 } }, map: { d: { id: 1 } } };
            window.tipTemplate = '';
            window.ut_fulltime = () => 'DATA';
            window.nativeTip = function(item, token) { window.parserContext = this; window.parserToken = token; return tipTemplate; };
            window.MargoTipsParser = { getTip:nativeTip };
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
        assert.equal(await section.evaluate(element => getComputedStyle(element).backgroundColor), 'rgba(0, 0, 0, 0)');
        assert.equal(await section.evaluate(element => getComputedStyle(element).borderTopWidth), '0px');
        assert.equal(await section.locator('.guc-row').first().evaluate(element => getComputedStyle(element).fontSize), '12px');
        assert.equal(await section.locator('.guc-heading').evaluate(element => getComputedStyle(element).color), 'rgb(255, 140, 0)');
        assert.deepEqual(await section.locator('.guc-value').evaluateAll(elements => elements.map(element => getComputedStyle(element).color)), Array(8).fill('rgb(255, 140, 0)'));
        assert.equal(await section.locator('.guc-row > span').first().evaluate(element => getComputedStyle(element).color), 'rgb(199, 208, 217)');
        assert.equal(await section.locator('.guc-heading').evaluate(element => getComputedStyle(element).textShadow), 'none');
        assert.equal(await page.evaluate(() => store['gogatek:modules:v1']['koszty-ulepszen']), true);

        // Both features share one catalogue entry and one dock tile.
        await main.locator('.launcher').evaluate(element => element.click());
        const tile = page.locator('button[data-gogatki-dock-item="gogatki-item-tips"]');
        await tile.waitFor();
        await tile.click();
        const options = page.locator('#gogatki-item-tips');
        await options.locator('.options').waitFor();
        assert.equal(await options.locator('input[type=checkbox]').count(), 7);
        const setOption = async (name, enabled) => {
            await options.locator(`input[data-key="${name}"]`).setChecked(enabled);
        };
        const rawTip = '<div class="item-name">Sword</div><div class="head-icons"></div>' +
            '<div class="item-tip-section"><span class="tip-item-stat-rarity item-rarity legendary">legendarny</span></div>' +
            '<div class="item-tip-section s-6"><i class="looter">OLD</i></div>' +
            '<div class="item-tip-section">Leczy <span class="damage">20%</span> życia. Leczy <span class="damage">350</span> punktów życia</div>' +
            '<div class="item-tip-section"><div class="tip-item-stat-lvl level-required">Wymagany poziom: 100</div></div>';
        await page.evaluate(rawTip => {
            window.tipTemplate = rawTip;
            window.tipItem = {cl:1,salvageItems:12,stat:'rarity=legendary;lvl=100;loot=<img src=x>,x,3,100,Boss;perheal=20;leczy=350;permbound'};
            const wrapper = document.createElement('div');wrapper.id='combined';wrapper.className='tip-wrapper';
            wrapper.dataset.type='t_item';wrapper.dataset.itemType='t-leg';
            wrapper.innerHTML='<div class="content">'+MargoTipsParser.getTip(tipItem, 'token')+'</div>';
            document.body.append(wrapper);
        }, rawTip);
        const combined = page.locator('#combined');
        await combined.locator('.gogatki-upgrade-costs').waitFor();
        assert.match(await combined.locator('.item-name').textContent(), /Sword \[12\]/);
        assert.match(await combined.locator('.looter').textContent(), /DATA.*Boss.*<img src=x>.*3-osobowej/);
        assert.equal(await combined.locator('img').count(), 0);
        assert.match(await combined.textContent(), /20% \(200\)/);
        assert.match(await combined.textContent(), /350 \(35%\)/);
        assert.equal(await page.evaluate(() => parserContext === MargoTipsParser && parserToken === 'token'), true);
        assert.equal(await combined.locator('.guc-value').first().textContent(), '280 000');
        await setOption('costs',false);
        await combined.locator('.gogatki-upgrade-costs').waitFor({state:'detached'});
        assert.match(await combined.textContent(), /20% \(200\)/);
        await setOption('costs',true);
        await combined.locator('.gogatki-upgrade-costs').waitFor();
        await setOption('hiddenSignature',true);
        assert.equal(await combined.locator('.looter').isVisible(), false);
        await setOption('hiddenSignature',false);
        await setOption('itemIcons',true);
        assert.match(await page.evaluate(() => MargoTipsParser.getTip(tipItem)), /icon-1.*icon-permbound/);
        await setOption('itemIcons',false);
        for (const name of ['legendaryInfo','essenceValue','percentToHeal','healToPercent']) await setOption(name,false);
        assert.equal(await page.evaluate(() => MargoTipsParser.getTip(tipItem)),rawTip);
        for (const name of ['legendaryInfo','essenceValue','percentToHeal','healToPercent']) await setOption(name,true);
        // Health calculations use current hero data, including changes after startup.
        assert.match(await page.evaluate(() => {Engine.hero.d.maxhp=2000;return MargoTipsParser.getTip(tipItem);}), /20% \(400\)/);
        // Each new parse starts from the native result, so values do not accumulate.
        assert.equal(await page.evaluate(() => (MargoTipsParser.getTip(tipItem).match(/\[12\]/g)||[]).length),1);
        const originalBox=await options.boundingBox();
        await options.locator('.gear').click();
        const closedOptions=await options.boundingBox();
        assert.deepEqual([originalBox.x+originalBox.width,originalBox.y],[closedOptions.x+closedOptions.width,closedOptions.y]);
        await options.locator('.gear').click({button:'right'});
        await page.waitForFunction(() => document.getElementById('gogatki-item-tips').hasAttribute('data-gogatki-docked'));
        assert.match(await page.evaluate(() => MargoTipsParser.getTip(tipItem)), /20% \(400\)/);
        const floating = await page.evaluate(() => [store['koszty-ulepszen:global:v1'].right,store['koszty-ulepszen:global:v1'].top]);
        await page.setViewportSize({width:900,height:700});
        await page.evaluate(() => new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        assert.deepEqual(await page.evaluate(() => [store['koszty-ulepszen:global:v1'].right,store['koszty-ulepszen:global:v1'].top]),floating);
        assert.equal(await page.locator('#combined .gogatki-upgrade-costs').count(),1);

        // Refresh the accent when a reused item's quality label changes color.
        await page.evaluate(() => { document.querySelector('#legend .item-rarity').style.color = 'rgb(238,170,34)'; });
        await page.waitForFunction(() => getComputedStyle(document.querySelector('#legend .guc-heading')).color === 'rgb(238, 170, 34)');
        assert.deepEqual(await section.locator('.guc-value').evaluateAll(elements => elements.map(element => getComputedStyle(element).color)), Array(8).fill('rgb(238, 170, 34)'));

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
        assert.equal(await page.evaluate(() => MargoTipsParser.getTip === nativeTip), true);
        assert.equal(await page.locator('#gogatki-item-tips').count(),0);
        assert.deepEqual(errors, []);

        // SI keeps Extended Item Tip; upgrade costs remain specific to NI.
        await page.evaluate(() => {
            delete window.Engine;
            window.g = {};
            window.hero = {id:1,maxhp:2000};
            window.itemTip = nativeTip;
            let definition;
            new Function('GogatkiRuntime', 'unsafeWindow', moduleCode)({ register: value => { definition = value; } }, window);
            definition.start();
        });
        assert.equal(await page.locator('#gogatki-upgrade-costs-style').count(), 1);
        assert.equal(await page.locator('.gogatki-upgrade-costs').count(), 0);
        assert.equal(await page.locator('#gogatki-item-tips input[data-key=costs]').isDisabled(), true);
        assert.match(await page.evaluate(() => {
            tipTemplate = 'Leczy <span class="damage">10%</span> życia';
            return itemTip({stat:'perheal=10'});
        }), /10% \(200\)/);
        await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
        assert.equal(await page.evaluate(() => itemTip === nativeTip), true);
        assert.deepEqual(errors, []);

        // Preserve standalone choices and install the parser when the game supplies it later.
        await page.evaluate(() => {
            delete window.g; delete window.itemTip;
            window.Engine = {hero:{d:{id:1,maxhp:1000}},map:{d:{id:1}}};
            delete window.MargoTipsParser;
            delete store['koszty-ulepszen:global:v1'];
            localStorage.setItem('maddonz-extracted:extended-item-tip:v1',JSON.stringify({percentToHeal:false,itemIcons:true}));
            let definition;
            new Function('GogatkiRuntime','unsafeWindow',moduleCode)({register:value=>{definition=value;}},window);
            definition.start();
        });
        assert.equal(await page.evaluate(() => store['koszty-ulepszen:global:v1'].percentToHeal),false);
        assert.equal(await page.evaluate(() => store['koszty-ulepszen:global:v1'].itemIcons),true);
        await page.evaluate(() => {window.MargoTipsParser={getTip:nativeTip};tipTemplate='<div class="head-icons"></div>';});
        await page.waitForFunction(() => MargoTipsParser.getTip !== nativeTip);
        assert.match(await page.evaluate(() => MargoTipsParser.getTip({cl:29,stat:'permbound'})),/icon-29.*icon-permbound/);
        await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
        assert.equal(await page.locator('#gogatki-item-tips').count(),1);
        await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
        assert.equal(await page.evaluate(() => MargoTipsParser.getTip === nativeTip),true);
        assert.deepEqual(errors, []);
        console.log('PASS: loader catalogue/default-off/enable/storage, original formulas, scoped styles, reused and dynamic tooltips, rarity/type/level changes, duplicate start, cleanup, merged item tips/settings/dock, SI extended tips');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
