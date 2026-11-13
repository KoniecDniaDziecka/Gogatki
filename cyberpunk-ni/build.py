"""Buduje instalator i zdalną paczkę motywu. Bez zależności."""
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
(ROOT / "cyberpunk-ni.css").write_text(CSS)
BUNDLE = {"id": "cyberpunk-ni", "schema": 1, "version": "0.2.50", "css": CSS}
HEADER = """// ==UserScript==
// @name         Cyberpunk NI
// @namespace    local.margonem.cyberpunk-ni
// @version      0.2.3
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
(ROOT / "theme.json").write_text(json.dumps(BUNDLE, ensure_ascii=False, indent=2) + "\n")
(ROOT / "cyberpunk-ni.user.js").write_text(HEADER + SCRIPT.replace("__BUNDLE__", json.dumps(BUNDLE, ensure_ascii=False)))
