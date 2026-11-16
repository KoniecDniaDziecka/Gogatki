"""Bundle the native NI map adapter and the extracted Dark-Sad data model."""
from pathlib import Path
import re
import json

root = Path(__file__).resolve().parents[1]
runtime = (root / 'sources/mapa-podreczna/runtime.js').read_text()
model = (root / 'sources/mapa-podreczna/model.js').read_text()
markers = (root / 'sources/mapa-podreczna/markers.css').read_text()
fog_light = (root / 'sources/mapa-podreczna/fog-light.js').read_text()
assert runtime.count('// __MODEL__') == 1
assert runtime.count('// __MARKER_STYLE__') == 1
assert runtime.count('// __FOG_LIGHT__') == 1
module = runtime.replace('// __MODEL__', model).replace('// __MARKER_STYLE__', 'const MAP_MARKER_CSS = ' + json.dumps(markers, ensure_ascii=False) + ';').replace('// __FOG_LIGHT__', fog_light)
(root / 'gogatki/modules/mapa-podreczna.js').write_text(module)

version = re.search(r'^// Mapa podręczna\+ ([\d.]+)', runtime).group(1)
url = 'https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/standalone/mapa-podreczna.user.js'
header = f'''// ==UserScript==
// @name         Mapa podręczna+ — samodzielna (NI)
// @namespace    gogatki.local.mapa-podreczna.standalone
// @version      {version}
// @description  Oznaczenia, filtry, wyszukiwarka i Fog Light w mapie podręcznej NI, bez panelu Gogatków.
// @author       Gogatki; model danych: Dark-Sad 6.1.5; Fog Light: Maddonz (Barlag)
// @match        https://*.margonem.pl/*
// @match        https://*.margonem.com/*
// @match        http://*.margonem.pl/*
// @match        http://*.margonem.com/*
// @exclude      *://margonem.pl/*
// @exclude      *://margonem.com/*
// @exclude      *://www.margonem.pl/*
// @exclude      *://www.margonem.com/*
// @exclude      *://forum.margonem.pl/*
// @exclude      *://forum.margonem.com/*
// @exclude      *://new.margonem.pl/*
// @exclude      *://new.margonem.com/*
// @exclude      *://commons.margonem.pl/*
// @exclude      *://commons.margonem.com/*
// @exclude      *://dev-commons.margonem.pl/*
// @exclude      *://dev-commons.margonem.com/*
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// @noframes
// @downloadURL  {url}
// @updateURL    {url}
// ==/UserScript==
'''
startup = r'''
    let timer = null;
    const deadline = Date.now() + 180000;
    function finish() {
        if (timer !== null) page.clearInterval(timer);
        timer = null;
        page.removeEventListener('pagehide', cancel);
    }
    function cancel(event) { if (!event.persisted) finish(); }
    function launch() {
        if (page.__gogatkiNativeMap) { finish(); return true; }
        const ready = page.document.body && page.Engine?.hero?.d && page.Engine?.map?.d;
        const oldInterface = !page.Engine && page.g && page.hero?.id;
        if (!ready && !oldInterface) return false;
        finish();
        try { definition.start(); }
        catch (error) { console.error('[Mapa podręczna+] Nie udało się uruchomić dodatku:', error); }
        return true;
    }
    if (!launch()) {
        timer = page.setInterval(() => {
            if (launch()) return;
            if (Date.now() >= deadline) {
                finish();
                console.warn('[Mapa podręczna+] Nie wykryto gotowej gry. Odśwież stronę po wejściu na postać w NI.');
            }
        }, 250);
        page.addEventListener('pagehide', cancel);
    }
})();
'''
wrapper = r'''
(() => {
    'use strict';
    const page = unsafeWindow;
    if (page.top !== page.self || page.__gogatkiNativeMap) return;
    let definition;
    // A private registry keeps the identical module independent of Gogatki's loader.
    const GogatkiRuntime = Object.freeze({ register(value) { definition = value; } });
'''
standalone = root / 'gogatki/standalone/mapa-podreczna.user.js'
standalone.parent.mkdir(parents=True, exist_ok=True)
standalone.write_text(header + wrapper + module + startup)
