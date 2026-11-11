(() => {
  'use strict';
  const EMBEDDED_THEME = __BUNDLE__;
  const THEME_URL = 'https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/cyberpunk-ni/theme.json';
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

  function refresh() {
    // Nowy adres przy każdym wczytaniu gry omija pamięć podręczną przeglądarki/CDN.
    // Pobieramy wyłącznie JSON i CSS. Nie uruchamiamy zdalnego JavaScriptu.
    try {
      request = GM_xmlhttpRequest({
        method: 'GET',
        url: `${THEME_URL}?t=${Date.now()}-${Math.random().toString(36).slice(2)}`,
        anonymous: true,
        timeout: 10000,
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        onload(response) {
          try {
            if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
            if (typeof response.responseText !== 'string' || response.responseText.length > 600000) {
              throw new Error('Nieprawidłowy rozmiar paczki motywu');
            }
            const latest = JSON.parse(response.responseText);
            if (!valid(latest)) throw new Error('Nieprawidłowa paczka motywu');
            theme = latest;
            apply();
            try { GM_setValue(CACHE_KEY, latest); }
            catch (error) { console.warn('Cyberpunk NI: nie zapisano kopii offline.', error); }
          } catch (error) { failed(error); }
        },
        onerror: () => failed('Błąd sieci'),
        ontimeout: () => failed('Przekroczony czas pobierania')
      });
    } catch (error) { failed(error); }
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
