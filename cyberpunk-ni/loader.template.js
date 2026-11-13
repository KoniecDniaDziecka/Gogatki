(() => {
  'use strict';
  const EMBEDDED_THEME = __BUNDLE__;
  const THEME_URL = 'https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/cyberpunk-ni/theme.json';
  const API_URL = 'https://api.github.com/repos/KoniecDniaDziecka/Gogatki/contents/cyberpunk-ni/theme.json?ref=main';
  const ENABLED_KEY = 'cyberpunk-ni-enabled';
  const CACHE_KEY = 'cyberpunk-ni-last-good-theme';
  let enabled = GM_getValue(ENABLED_KEY, true) !== false;
  let request;
  let started = false;
  __RUNTIME__

  function valid(theme) {
    return theme && theme.id === 'cyberpunk-ni' && theme.schema === 1 &&
      typeof theme.version === 'string' && theme.version.length > 0 &&
      typeof theme.css === 'string' && theme.css.trim().length > 0 &&
      theme.css.length <= 512000;
  }

  const cached = GM_getValue(CACHE_KEY, null);
  let theme = EMBEDDED_THEME;
  if (valid(cached) && !isOlder(cached)) theme = cached;

  const runtime = createCyberpunkNiRuntime(window, () => theme, () => enabled);
  function apply() { runtime.apply(); }

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
    runtime.destroy();
    request?.abort?.();
  }, { once: true });
})();
