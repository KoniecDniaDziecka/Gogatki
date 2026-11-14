"""Buduje instalator i zdalną paczkę motywu. Bez zależności."""
import base64
import json
import re
from urllib.parse import quote
from pathlib import Path
from window_assets import inline_graphics

ROOT = Path(__file__).resolve().parent
CSS = (ROOT / "cyberpunk-ni.css").read_text()
CSS = inline_graphics(CSS, ROOT)
for asset in ("hud-frame", "game-frame", "game-rail-top", "game-rail-bottom", "game-rail-left", "game-rail-right"):
    uri = "data:image/svg+xml," + quote((ROOT / f"assets/{asset}.svg").read_text(), safe="='/:,.-")
    CSS, count = re.subn(rf"(?m)^  --cp-{asset}: .*;$", lambda _m: f'  --cp-{asset}: url("{uri}");', CSS)
    if count != 1:
        raise ValueError(f"Brak jednoznacznego miejsca na grafikę {asset}")
FONT = base64.b64encode((ROOT / "assets/fonts/cyberpunk-ni-digits.ttf").read_bytes()).decode("ascii")
CSS, count = re.subn(r'(?m)^  src: url\("data:font/ttf;base64,[A-Za-z0-9+/=]*"\) format\("truetype"\);$',
                     lambda _m: f'  src: url("data:font/ttf;base64,{FONT}") format("truetype");', CSS)
if count != 1:
    raise ValueError("Brak jednoznacznego miejsca na krój cyfr HP")
(ROOT / "cyberpunk-ni.css").write_text(CSS)
BUNDLE = {"id": "cyberpunk-ni", "schema": 1, "version": "0.2.61", "css": CSS}
HEADER = """// ==UserScript==
// @name         Cyberpunk NI
// @namespace    local.margonem.cyberpunk-ni
// @version      0.2.6
// @description  Cyberpunk NI — najnowszy motyw pobierany przy każdym odświeżeniu gry.
// @match        https://*.margonem.pl/*
// @match        https://*.margonem.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @connect      api.github.com
// @updateURL    https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/cyberpunk-ni/cyberpunk-ni.user.js
// @downloadURL  https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/cyberpunk-ni/cyberpunk-ni.user.js
// @run-at       document-idle
// @noframes
// ==/UserScript==

"""
SCRIPT = (ROOT / "loader.template.js").read_text()
RUNTIME = (ROOT / "hp-runtime.js").read_text()
SCRIPT = SCRIPT.replace("__RUNTIME__", RUNTIME)
(ROOT / "theme.json").write_text(json.dumps(BUNDLE, ensure_ascii=False, indent=2) + "\n")
(ROOT / "cyberpunk-ni.user.js").write_text(HEADER + SCRIPT.replace("__BUNDLE__", json.dumps(BUNDLE, ensure_ascii=False)))
MODULE = (ROOT / "module.template.js").read_text()
MODULE = MODULE.replace("__RUNTIME__", RUNTIME)
MODULE = MODULE.replace("__DIAGNOSTICS__", (ROOT / "diagnostics.js").read_text())
MODULE_PATH = ROOT.parent / "gogatki/modules/cyberpunk-ni.js"
MODULE_PATH.parent.mkdir(parents=True, exist_ok=True)
MODULE_SOURCE = MODULE.replace("__BUNDLE__", json.dumps(BUNDLE, ensure_ascii=False))
MODULE_PATH.write_text(MODULE_SOURCE)
MODULE_PATH.with_name(f"cyberpunk-ni-{BUNDLE['version']}.js").write_text(MODULE_SOURCE)
CATALOGUE_PATH = ROOT.parent / "gogatki/catalogue.json"
if CATALOGUE_PATH.exists():
    catalogue = json.loads(CATALOGUE_PATH.read_text())
    entries = [entry for entry in catalogue["modules"] if entry["id"] == BUNDLE["id"]]
    if len(entries) != 1:
        raise ValueError("Brak jednoznacznego wpisu Cyberpunk NI w katalogu Gogatków")
    entries[0]["url"] = (
        "https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/"
        f"gogatki/modules/cyberpunk-ni-{BUNDLE['version']}.js"
    )
    CATALOGUE_PATH.write_text(json.dumps(catalogue, ensure_ascii=False, indent=2) + "\n")
