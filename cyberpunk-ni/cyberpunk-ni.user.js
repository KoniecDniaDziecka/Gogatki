// ==UserScript==
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

(() => {
  'use strict';
  const EMBEDDED_THEME = {"id": "cyberpunk-ni", "schema": 1, "version": "0.2.1", "css": "/* Cyberpunk NI 0.2.1 — motyw dla nowego interfejsu Margonem.\n * Skrypt .user.js włącza go atrybutem data-cyberpunk-ni=\"on\" na <html>.\n * Zmienne poniżej sterują paletą. Nie wymaga zewnętrznych grafik ani fontów.\n * Najlepiej używać z wyłączonym DarknessNI i innymi motywami całego NI.\n */\nhtml[data-cyberpunk-ni=\"on\"] {\n  --cp-bg: #0c1118;\n  --cp-panel: #171b20;\n  --cp-raised: #252b31;\n  --cp-line: #668298;\n  --cp-cyan: #12c9bd;\n  --cp-violet: #b08aff;\n  --cp-text: #c7d0d9;\n  --cp-muted: #b1c0cb;\n  --cp-button: #38566c;\n  --cp-button-border: #6d879a;\n}\n\n/* Wyłącznie powierzchnie NI: bez selektora *, zmian wymiarów i filtrów mapy. */\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer :is(\n  .positioner.top .hud-container,\n  .positioner.top .bg,\n  .positioner.bottom .bg,\n  .bottom-panel,\n  .bottom-panel.end-game,\n  .bottom-panel .glass,\n  .main-column.left-column .border,\n  .main-column.right-column .border,\n  .main-column.right-column,\n  .main-column .extended-stats\n) {\n  background:\n    linear-gradient(90deg, var(--cp-cyan), var(--cp-violet)) top / 100% 1px no-repeat,\n    linear-gradient(120deg, #1c262e, var(--cp-panel) 65%),\n    var(--cp-panel) !important;\n  box-shadow: inset 0 0 0 1px #354956 !important;\n}\n\n/* Ramy: zachowane szerokości obramowań, rozmiary i uchwyty gry. */\nhtml[data-cyberpunk-ni=\"on\"] :is(\n  .layer.interface-layer, .alerts-layer, .mAlert-layer,\n  .mAlert-mobile-layer, .console-layer\n) .border-window {\n  border-image-source: linear-gradient(135deg, var(--cp-cyan), #354956 30%, #354956 75%, var(--cp-violet)) !important;\n  border-image-slice: 1 fill !important;\n  border-image-repeat: stretch !important;\n  color: var(--cp-text);\n}\n\nhtml[data-cyberpunk-ni=\"on\"] :is(\n  .layer.interface-layer, .alerts-layer, .mAlert-layer,\n  .mAlert-mobile-layer, .console-layer\n) .border-window :is(.content, .border-image) {\n  background: var(--cp-panel) !important;\n  color: var(--cp-text);\n  text-shadow: none !important;\n}\n\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer :is(\n  .border-window .header-label-positioner .header-label,\n  .dialogue-window header .h_content,\n  .trade-window header .h_background .middle,\n  .settings-window h2,\n  .clan .header-bar,\n  .mail-box .content-header,\n  .addons-panel .main-header,\n  .left-grouped-list-and-right-description-window .main-header\n) {\n  background: linear-gradient(105deg, #163739, var(--cp-raised) 60%, #352c47) !important;\n  border-image-source: linear-gradient(var(--cp-raised), var(--cp-raised)) !important;\n  border-image-slice: 1 fill !important;\n  color: var(--cp-cyan) !important;\n  font-family: Arial, sans-serif !important;\n  text-shadow: none !important;\n  box-shadow: inset 0 -1px var(--cp-line) !important;\n}\n\n/* Pozostawiamy dekoracje zamknięcia, strzałki oraz sprite'y ikon gry. */\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer :is(\n  .border-window .header-label-positioner .header-label .left-decor,\n  .border-window .header-label-positioner .header-label .right-decor,\n  .trade-window header .h_background .left,\n  .trade-window header .h_background .right\n) {\n  background: var(--cp-raised) !important;\n  box-shadow: inset 0 -1px var(--cp-cyan) !important;\n}\n\n/* Wypełnienia okien. Obrazy przedmiotów i postaci pozostają osobnymi warstwami. */\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer :is(\n  .quest-log .middle-graphics,\n  .loot-window .middle-graphics,\n  .loot-window .bottom-wrapper .bottom-graphic,\n  .auctions-summary .middle-graphics,\n  .auctions-summary .bottom-wrapper .bottom-graphic,\n  .friend-enemy-list .middle-graphics,\n  .recovery-item .middle-graphics,\n  .recovery-item .paper-graphics,\n  .settings-window .graphic-background,\n  .mail-box .middle-graphic,\n  .skills-window .left-column .middle-graphic,\n  .skills-window .right-column .middle-graphic,\n  .skills-window .board-graphic,\n  .depo .depo-graphic-background,\n  .gold-shop .middle-graphics,\n  .help-window2 .graphic-background,\n  .addons-panel .middle-left-column-graphics,\n  .addons-panel .middle-right-column-graphics,\n  .addons-panel .paper-graphics,\n  .clan .right-column,\n  .clan-list-find-panel,\n  .clan .green-box,\n  .showcase .card-content,\n  .dialogue-window .background :is(.left, .right, .top, .upper-left, .upper-right)\n) {\n  background: var(--cp-panel) !important;\n  border-image-source: linear-gradient(var(--cp-panel), var(--cp-panel)) !important;\n  border-image-slice: 1 fill !important;\n  color: var(--cp-text);\n}\n\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer :is(\n  .border-window .bottom-bar,\n  .settings-window .bottom-bar,\n  .quest-box .info-wrapper,\n  .friend-enemy-list .bottom-friend-panel,\n  .clan .table-header,\n  .auctions .header-list,\n  .skills-window .table-header,\n  .mail-box .bottom-panel-graphics,\n  .addons-panel .bottom-panel-graphics\n) {\n  background: var(--cp-raised) !important;\n  border-image-source: linear-gradient(var(--cp-raised), var(--cp-raised)) !important;\n  border-image-slice: 1 fill !important;\n  color: var(--cp-text);\n  box-shadow: inset 0 1px #354956 !important;\n}\n\n/* Stary i nowy czat. Nie nadpisujemy kolorów nicków i jakości przedmiotów. */\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer :is(\n  .chat-tpl .chat-pannel,\n  .chat-tpl .tabs-pannel,\n  .chat-tpl .messages-wrapper .under-tab-decor,\n  .chat-tpl .input-wrapper,\n  .new-chat-window,\n  .new-chat-window .chat-message-wrapper,\n  .chat-input-wrapper,\n  .chat-input-wrapper .magic-input-wrapper\n) {\n  background: var(--cp-bg) !important;\n  border-image-source: linear-gradient(var(--cp-bg), var(--cp-bg)) !important;\n  border-image-slice: 1 fill !important;\n  border-color: #354956 !important;\n  color: var(--cp-text);\n}\n\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer :is(\n  .chat-channel-card-wrapper,\n  .chat-input-wrapper .control-wrapper .menu-card,\n  .chat-input-wrapper .control-wrapper .chat-config-wrapper,\n  .chat-tpl .tabs-wrapper .tab,\n  .chat-tpl .right-tabs-wrapper .tab\n) {\n  background: var(--cp-raised) !important;\n  border-color: #354956 !important;\n  color: var(--cp-muted);\n  text-shadow: none !important;\n}\n\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer :is(\n  .chat-channel-card-wrapper.active,\n  .chat-tpl .tabs-wrapper .tab.active,\n  .chat-tpl .right-tabs-wrapper .tab.active\n) {\n  background: #193537 !important;\n  color: var(--cp-cyan) !important;\n  box-shadow: inset 0 -2px var(--cp-cyan) !important;\n}\n\n/* Ekwipunek: sprite'y gniazd zachowują położenie, neutralizujemy ich kolor. */\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer .game-window-positioner :is(\n  .character_wrapper .equipment-wrapper,\n  .character_wrapper .stats-wrapper,\n  .inventory_wrapper .bags-navigation,\n  .inventory_wrapper .inventory-grid-bg\n) {\n  background-color: var(--cp-panel) !important;\n  background-blend-mode: luminosity !important;\n  box-shadow: inset 0 0 0 1px #354956 !important;\n}\n\n/* Przyciski: bez zmiany paddingu, rozmiarów, ikon i stanu disabled. */\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer :is(\n  .button:not(.red):not(.danger), .widget-button\n) {\n  background-image: linear-gradient(135deg, #264450, #1b2b39 75%, #352a49) !important;\n  background-color: var(--cp-button) !important;\n  color: #edf5fa !important;\n  border-radius: 4px !important;\n  box-shadow: inset 0 0 0 1px var(--cp-button-border), inset 0 -2px var(--cp-cyan) !important;\n  text-shadow: none !important;\n}\n\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer :is(\n  .button:not(.red):not(.danger), .widget-button\n):not(.disabled):not([disabled]):not([aria-disabled=\"true\"]):not(.no-hover):hover {\n  background-image: linear-gradient(#41657a, #285e65) !important;\n  box-shadow: inset 0 0 0 1px var(--cp-cyan), inset 0 -2px #152530 !important;\n}\n\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer :is(\n  .button:not(.red):not(.danger), .widget-button\n):is(.active, .pressed):not(.disabled):not([disabled]):not([aria-disabled=\"true\"]) {\n  background-image: linear-gradient(#304150, #24454a) !important;\n  color: var(--cp-cyan) !important;\n  box-shadow: inset 0 0 0 1px var(--cp-cyan) !important;\n}\n\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer :is(\n  .button:not(.red):not(.danger), .widget-button\n):is(.disabled, [disabled], [aria-disabled=\"true\"]) {\n  background-image: linear-gradient(#292f35, #20262b) !important;\n  color: #8e9aa4 !important;\n  box-shadow: inset 0 0 0 1px #46515b !important;\n}\n\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer :is(\n  .button:not(.red):not(.danger), .widget-button\n)::before {\n  box-shadow: none !important;\n}\n\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer .widget-button::after {\n  box-shadow: 0 1px 0 1px var(--cp-bg) !important;\n}\n\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer :is(\n  .border-window input.default,\n  .border-window textarea,\n  .chat-input-wrapper textarea,\n  .chat-tpl .input-wrapper input\n) {\n  background: var(--cp-bg) !important;\n  border-color: var(--cp-line) !important;\n  color: var(--cp-text) !important;\n  caret-color: var(--cp-cyan);\n  text-shadow: none !important;\n}\n\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer :is(\n  button, input, textarea, select, [tabindex]\n):focus-visible {\n  outline: 2px solid var(--cp-cyan) !important;\n  outline-offset: -2px;\n}\n\n/* Menu i tooltipy, również w oddzielnych warstwach NI. */\nhtml[data-cyberpunk-ni=\"on\"] :is(\n  .layer.interface-layer, .alerts-layer, .mAlert-layer,\n  .mAlert-mobile-layer, .console-layer\n) :is(.popup-menu, .tip-wrapper) {\n  background: var(--cp-panel) !important;\n  box-shadow: 0 0 0 1px var(--cp-line), 0 0 0 2px var(--cp-bg) !important;\n}\n\nhtml[data-cyberpunk-ni=\"on\"] :is(\n  .layer.interface-layer, .alerts-layer, .mAlert-layer,\n  .mAlert-mobile-layer, .console-layer\n) :is(.tip-wrapper .content, .popup-menu .menu-item, .menu-wrapper .option) {\n  background: var(--cp-panel) !important;\n  border-color: #354956 !important;\n  text-shadow: none !important;\n}\n\nhtml[data-cyberpunk-ni=\"on\"] :is(\n  .layer.interface-layer, .alerts-layer, .mAlert-layer,\n  .mAlert-mobile-layer, .console-layer\n) :is(.popup-menu .menu-item, .menu-wrapper .option):not(.disabled):not(.label):not(.cooldown-disabled):hover {\n  background: #233b42 !important;\n  border-color: var(--cp-cyan) !important;\n}\n\n/* Walki: wyłącznie dekoracyjne tła, bez pasków HP i wskaźników umiejętności. */\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer .battle-controller .graphics :is(\n  .header-graphic, .middle-graphic, .bottom-graphic\n) {\n  background: var(--cp-panel) !important;\n  box-shadow: inset 0 0 0 1px #354956 !important;\n}\n\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer .additional-skill-panel {\n  background: var(--cp-raised) !important;\n  box-shadow: inset 0 0 0 1px var(--cp-violet) !important;\n}\n\n/* Pozostałe części HUD mają osobne sprite'y, niezależne od tła panelu. */\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer :is(\n  .positioner.bottom .bg-additional-widget-left,\n  .positioner.bottom .bg-additional-widget-right,\n  .main-column .extended-stats .border\n) {\n  background: var(--cp-panel) !important;\n  box-shadow: inset 0 0 0 1px #354956 !important;\n}\n\n/* Środkowa osłona dolnego paska: zastępuje srebrną grafikę, nie jej zawartość. */\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer .bottom-panel .bottom-panel-pointer-bg {\n  background:\n    linear-gradient(90deg, var(--cp-cyan), var(--cp-violet)) top / 100% 2px no-repeat,\n    linear-gradient(135deg, #26363f, #111a23 55%, #30263e) !important;\n  border-radius: 12px 12px 0 0 !important;\n  box-shadow: inset 0 0 0 1px var(--cp-line) !important;\n}\n\n/* Część motywów dokłada dawne grafiki przez pseudo-elementy tych osłon. */\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer .bottom-panel::before,\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer .bottom-panel .bottom-panel-pointer-bg::before {\n  background: none !important;\n  box-shadow: none !important;\n}\n\n/* Nakładki są ramkami. Nie ruszamy szerokości ani koloru wypełnień HP/XP. */\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer .bottom-panel :is(\n  .exp-bar-wrapper .exp-progress .overlay,\n  .battle-bars-wrapper .battle-bar .overlay\n) {\n  background:\n    linear-gradient(90deg, var(--cp-cyan), var(--cp-violet)) top / 100% 1px no-repeat,\n    linear-gradient(90deg, #354956, var(--cp-line)) bottom / 100% 1px no-repeat !important;\n  box-shadow: inset 1px 0 #668298, inset -1px 0 #668298 !important;\n}\n\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer .bottom-panel .battle-bars-wrapper .battle-bar .background {\n  background: var(--cp-bg) !important;\n  box-shadow: inset 0 0 0 1px #354956 !important;\n}\n\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer .bottom-panel .exp-bar-wrapper .exp-progress .ribbon {\n  background: var(--cp-raised) !important;\n  box-shadow: inset 0 0 0 1px var(--cp-line) !important;\n  color: var(--cp-text) !important;\n  text-shadow: none !important;\n}\n\n/* Statystyki mają własne szare tło. Ikony statystyk są oddzielnymi elementami. */\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer .game-window-positioner .character_wrapper .stats-wrapper {\n  background: var(--cp-panel) !important;\n  color: var(--cp-text);\n  text-shadow: none !important;\n}\n\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer .game-window-positioner .inventory_wrapper .bags-navigation .item {\n  background: var(--cp-bg) !important;\n  box-shadow: inset 0 0 0 1px #354956 !important;\n}\n\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer .game-window-positioner .inventory_wrapper .bags-navigation .item:is(.active, :hover) {\n  box-shadow: inset 0 0 0 1px var(--cp-cyan) !important;\n}\n\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer .game-window-positioner .inventory_wrapper .bags-navigation .item.active .highlight {\n  background: none !important;\n  box-shadow: inset 0 0 0 1px var(--cp-cyan) !important;\n}\n\n/* Stary czat nie wszędzie dziedziczy font z kontenera. */\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer :is(\n  .chat-tpl, .chat-tpl .chat-message, .chat-tpl .chat-message span,\n  .chat-tpl .chat-message a, .chat-tpl .chat-message b,\n  .new-chat-window, .new-chat-window .chat-message-wrapper\n) {\n  font-family: Arial, sans-serif !important;\n  text-shadow: none !important;\n}\n\n/* Skórka przewijania zachowuje wymiary, tor i działanie uchwytów gry. */\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer .scroll-wrapper .scrollbar-wrapper .background {\n  background: var(--cp-bg) !important;\n}\n\nhtml[data-cyberpunk-ni=\"on\"] .layer.interface-layer .scroll-wrapper .scrollbar-wrapper .track .handle {\n  background: var(--cp-button) !important;\n  border-radius: 3px !important;\n  box-shadow: inset 0 0 0 1px var(--cp-line) !important;\n}\n"};
  const THEME_URL = 'https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/cyberpunk-ni/theme.json';
  const API_URL = 'https://api.github.com/repos/KoniecDniaDziecka/Gogatki/contents/cyberpunk-ni/theme.json?ref=main';
  const ENABLED_KEY = 'cyberpunk-ni-enabled';
  const CACHE_KEY = 'cyberpunk-ni-last-good-theme';
  const ATTRIBUTE = 'data-cyberpunk-ni';
  const STYLE_ID = 'cyberpunk-ni-style';
  let enabled = GM_getValue(ENABLED_KEY, true) !== false;
  let request;
  let started = false;

  function valid(theme) {
    return theme && theme.id === 'cyberpunk-ni' && theme.schema === 1 &&
      typeof theme.version === 'string' && theme.version.length > 0 &&
      typeof theme.css === 'string' && theme.css.trim().length > 0 &&
      theme.css.length <= 512000;
  }

  const cached = GM_getValue(CACHE_KEY, null);
  let theme = valid(cached) ? cached : EMBEDDED_THEME;

  function apply() {
    let style = document.getElementById(STYLE_ID);
    if (!enabled || !document.querySelector('.layer.interface-layer')) {
      document.documentElement.removeAttribute(ATTRIBUTE);
      style?.remove();
      return;
    }
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      (document.head || document.documentElement).append(style);
    }
    style.textContent = theme.css;
    style.dataset.version = theme.version;
    document.documentElement.setAttribute(ATTRIBUTE, 'on');
  }

  function failed(reason) {
    console.warn('Cyberpunk NI: nie udało się pobrać aktualizacji; pozostaje ostatni dostępny motyw.', reason);
  }

  function isOlder(candidate) {
    const pattern = /^(\d+)\.(\d+)\.(\d+)$/;
    const a = candidate.version.match(pattern);
    const b = theme.version.match(pattern);
    if (!a || !b) return false;
    for (let i = 1; i <= 3; i += 1) {
      if (+a[i] !== +b[i]) return +a[i] < +b[i];
    }
    return false;
  }

  function decodeBundle(data) {
    if (valid(data)) return data;
    if (data?.type !== 'file' || data.encoding !== 'base64' ||
        typeof data.content !== 'string' || data.content.length > 800000) {
      throw new Error('Nieprawidłowa odpowiedź GitHuba');
    }
    const bytes = Uint8Array.from(atob(data.content.replace(/\s/g, '')), char => char.charCodeAt(0));
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  }

  function refresh() {
    // API zwraca bieżący plik; Raw może jeszcze przez kilka minut trzymać starszy.
    // Pobieramy wyłącznie JSON i CSS. Nie uruchamiamy zdalnego JavaScriptu.
    function attempt(fallback) {
      function failure(reason) {
        if (!fallback) attempt(true);
        else failed(reason);
      }
      const base = fallback ? THEME_URL : API_URL;
      const separator = fallback ? '?' : '&';
      try {
        request = GM_xmlhttpRequest({
          method: 'GET',
          url: `${base}${separator}t=${Date.now()}-${Math.random().toString(36).slice(2)}`,
          anonymous: true,
          timeout: 10000,
          headers: { 'Accept': 'application/vnd.github+json', 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
          onload(response) {
            try {
              if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
              if (typeof response.responseText !== 'string' || response.responseText.length > 900000) {
                throw new Error('Nieprawidłowy rozmiar paczki motywu');
              }
              const latest = decodeBundle(JSON.parse(response.responseText));
              if (!valid(latest)) throw new Error('Nieprawidłowa paczka motywu');
              if (isOlder(latest)) throw new Error('Pobrany motyw jest starszy od zapisanej wersji');
              theme = latest;
              apply();
              try { GM_setValue(CACHE_KEY, latest); }
              catch (error) { console.warn('Cyberpunk NI: nie zapisano kopii offline.', error); }
            } catch (error) { failure(error); }
          },
          onerror: () => failure('Błąd sieci'),
          ontimeout: () => failure('Przekroczony czas pobierania')
        });
      } catch (error) { failure(error); }
    }
    attempt(false);
  }

  function start() {
    if (started) return;
    started = true;
    apply();
    refresh();
  }

  GM_registerMenuCommand('Włącz / wyłącz Cyberpunk NI', () => {
    enabled = !enabled;
    GM_setValue(ENABLED_KEY, enabled);
    apply();
  });

  const observer = new MutationObserver(() => {
    if (document.querySelector('.layer.interface-layer')) {
      observer.disconnect();
      start();
    }
  });
  if (document.querySelector('.layer.interface-layer')) start();
  else observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('pagehide', () => {
    observer.disconnect();
    request?.abort?.();
  }, { once: true });
})();
