"""Buduje instalator i zdalną paczkę motywu. Bez zależności."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CSS = (ROOT / "cyberpunk-ni.css").read_text()
BUNDLE = {"id": "cyberpunk-ni", "schema": 1, "version": "0.2.4", "css": CSS}
HEADER = """// ==UserScript==
// @name         Cyberpunk NI
// @namespace    local.margonem.cyberpunk-ni
// @version      0.2.1
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
