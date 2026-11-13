const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 560, height: 720 }, deviceScaleFactor: 2 });
    const css = fs.readFileSync(process.env.CYBERPUNK_MENU_CSS || path.join(__dirname, '../cyberpunk-ni/cyberpunk-ni.css'), 'utf8');
    // The current NI menu lives in popup-menu-layer, a sibling of interface-layer.
    // Its class names and hierarchy are deliberately different from legacy menus.
    await page.setContent(`<style>
      body{margin:0;background:#171320;font:12px/17px Arial;color:#fff}
      .popup-menu{display:flex;flex-direction:column;position:absolute;left:25px;top:25px;width:180px;box-sizing:border-box;padding:2px;background:#3f3b3d;border-radius:4px;box-shadow:inset 0 0 0 1px #150f0d,0 0 0 1px #b6bbc1,0 0 0 2px #150f0d;transform:scale(0);pointer-events:auto}
      .popup-menu.show{transform:scale(1)}.popup-menu__header{padding:5px 0;text-align:center}
      .popup-menu>.scroll-wrapper{display:flex;overflow:hidden;border-top:1px solid #ffffff4d;padding-top:1px}
      .popup-menu__list{flex:1}.menu-item,.option{display:block;position:relative;box-sizing:border-box;padding:3px 5px;margin:1px 0;background:#244518;border:1px solid #396420;border-radius:3px;color:#fff;font-size:12px;cursor:pointer}
      .menu-item:hover:not(.label):not(.disabled):not(.cooldown-disabled):not(.one-step-skill-menu){background:#2e4f18;border-color:#4f7b21}
      .menu-item--red,.option--red{background:#4a0e0e;border-color:#831f1f}
      .menu-item--debug{background:#4a0e0e;border-color:orange}.disabled{opacity:.5}
      .menu-item.disabled,.menu-item.cooldown-disabled{background:#081d03}
      .menu-item.label{border-width:0;background:transparent}.icon{display:inline-block;width:12px;height:12px;background-image:linear-gradient(#aaa,#45a);background-position:3px 4px}
      .scrollbar-wrapper{width:6px}.track{height:100%;background:transparent}.handle{height:60px;background:#d1d2d384}
      .menu-wrapper{position:absolute;left:275px;top:25px;width:180px;padding:2px;background:#3f3b3d}.option{padding:2px 5px}
      .outside{position:absolute;left:470px;top:25px;background:#244518;color:white}
    </style><div class="game-window-positioner"><div class="layer interface-layer"></div><div class="popup-menu-layer layer"><div id="modern" class="popup-menu show"><div class="popup-menu__header">Przedmiot testowy</div><div class="scroll-wrapper"><div class="scroll-pane popup-menu__list">
      <div class="menu-item" tabindex="0" data-action="equip">Ekwipuj</div>
      <div class="menu-item" tabindex="0" data-action="upgrade">Ulepsz</div>
      <div class="menu-item menu-item--red" tabindex="0" data-action="destroy">Zniszcz</div>
      <div class="menu-item disabled" tabindex="0" data-action="disabled">Niedostępne</div>
      <div class="menu-item cooldown-disabled" tabindex="0" data-action="cooldown">Odnowienie</div>
      <div class="menu-item" blockclick="true" tabindex="0" data-action="blocked">Zablokowane</div>
      <div class="menu-item one-step-skill-menu" tabindex="0">Opcja umiejętności</div>
      <div class="menu-item menu-item--debug" tabindex="0">Opcja techniczna</div>
      <div class="menu-item menu-item--debug disabled">Opcja zablokowana</div>
      <div class="menu-item label">Nagłówek grupy</div>
      <div class="menu-item" tabindex="0"><span class="icon"></span> Z ikoną</div>
    </div><div class="scrollbar-wrapper"><div class="track"><div class="handle pointer-draggable-handle"></div></div></div></div></div></div></div>
    <div class="alerts-layer layer"><div id="legacy" class="scroll-wrapper menu-wrapper"><div class="wrapper"><div class="bck-wrapper"><div class="option">Ekwipuj</div><div class="option option--red">Zniszcz</div><div class="option disabled">Niedostępne</div></div></div></div></div><div class="outside">Inny dodatek</div>`);
    assert.equal(await page.locator('#modern .menu-item').first().evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(36, 69, 24)', 'fixture reproduces the recorded native green');
    const geometry = () => page.locator('#modern,#modern .menu-item,#modern .popup-menu__header,#modern .handle,#legacy,#legacy .option').evaluateAll(elements => elements.map(el => {
      const r = el.getBoundingClientRect(), s = getComputedStyle(el);
      return [r.x, r.y, r.width, r.height, s.display, s.pointerEvents, s.opacity];
    }));
    const before = await geometry();
    const icon = await page.locator('.icon').evaluate(el => [getComputedStyle(el).backgroundImage, getComputedStyle(el).backgroundPosition]);
    await page.evaluate(() => {
      window.actions = [];
      document.querySelectorAll('#modern [data-action]').forEach(el => el.onclick = () => {
        if (!el.classList.contains('disabled') && !el.classList.contains('cooldown-disabled') && el.getAttribute('blockclick') !== 'true') actions.push(el.dataset.action);
      });
      document.documentElement.dataset.cyberpunkNi = 'on';
    });
    await page.addStyleTag({ content: css });
    assert.deepEqual(await geometry(), before, 'native menu and hitbox geometry retained');
    const modern = page.locator('#modern'), normal = modern.locator('[data-action="equip"]'), red = modern.locator('[data-action="destroy"]');
    const color = locator => locator.evaluate(el => getComputedStyle(el).backgroundColor);
    assert.equal(await color(normal), 'rgb(37, 43, 49)', 'current popup-menu-layer actions are themed');
    assert.equal(await color(red), 'rgb(79, 32, 39)');
    assert.equal(await modern.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(23, 27, 32)');
    assert.equal(await modern.locator('.popup-menu__header').evaluate(el => getComputedStyle(el).color), 'rgb(18, 201, 189)');
    assert.equal(await page.locator('#legacy .option').first().evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(37, 43, 49)');
    assert.equal(await color(page.locator('#legacy .option--red')), 'rgb(79, 32, 39)');
    await normal.hover(); assert.equal(await color(normal), 'rgb(32, 59, 66)'); await normal.click();
    await red.hover(); assert.equal(await color(red), 'rgb(103, 43, 52)'); await red.click();
    for (const action of ['disabled', 'cooldown', 'blocked']) {
      const option = modern.locator(`[data-action="${action}"]`); await option.hover();
      assert.equal(await color(option), 'rgb(32, 38, 45)'); await option.click();
    }
    assert.deepEqual(await page.evaluate(() => actions), ['equip', 'destroy']);
    await modern.locator('.one-step-skill-menu').hover(); assert.equal(await color(modern.locator('.one-step-skill-menu')), 'rgb(37, 43, 49)');
    assert.equal(await color(modern.locator('.menu-item--debug.disabled')), 'rgb(32, 38, 45)');
    assert.deepEqual(await page.locator('.icon').evaluate(el => [getComputedStyle(el).backgroundImage, getComputedStyle(el).backgroundPosition]), icon);
    await modern.locator('[data-action="upgrade"]').focus(); await page.keyboard.press('Shift+Tab');
    assert.equal(await normal.evaluate(el => getComputedStyle(el).outlineColor), 'rgb(18, 201, 189)');
    assert.equal(await modern.locator('.handle').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(102, 130, 152)');
    assert.equal(await page.locator('.outside').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(36, 69, 24)');
    await modern.evaluate(el => el.classList.remove('show'));
    assert.equal(await modern.evaluate(el => getComputedStyle(el).transform), 'matrix(0, 0, 0, 0, 0, 0)', 'native opening/closing transform retained');
    await modern.evaluate(el => el.classList.add('show'));
    if (process.env.CYBERPUNK_MENU_SCREENSHOT) await page.screenshot({ path: process.env.CYBERPUNK_MENU_SCREENSHOT });
    console.log('PASS: recorded popup-menu-layer hierarchy and legacy menu; red/blocked states, native callbacks, layout, icons, scrollbar, focus and opening transform.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
