// ==UserScript==
// @name         Gogatki — panel dodatków
// @namespace    gogatek.local
// @version      0.3.3
// @description  Wspólny panel i przełączniki dodatków do Margonem.
// @match        https://*.margonem.pl/*
// @match        https://*.margonem.com/*
// @match        http://*.margonem.pl/*
// @match        http://*.margonem.com/*
// @exclude      *://www.margonem.pl/*
// @exclude      *://margonem.pl/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @run-at       document-idle
// @noframes
// @downloadURL  https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/gogatki.user.js
// @updateURL    https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/gogatki.user.js
// @require      https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/panel.js?v=0.3.3
// @require      https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/modules/ulepa.js
// @require      https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/modules/lootfilter.js
// @require      https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/modules/wolacz.js
// ==/UserScript==

GogatkiRuntime.mount();
