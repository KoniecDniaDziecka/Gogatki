// Wspólna obsługa HP dla modułu Gogatków i osobnego instalatora.
// Po znalezieniu HUD obserwujemy tekst HP i bezpośrednich rodziców HUD.
// Czat, timery i wnętrza innych okien nie uruchamiają tej obsługi.
function createCyberpunkNiRuntime(window, getTheme, isEnabled) {
  const document = window.document;
  const root = document.documentElement;
  const attribute = 'data-cyberpunk-ni';
  const styleId = 'cyberpunk-ni-style';
  const entries = new Map();
  const inlineStyles = createCyberpunkNiInlineStyles(window);
  let style = null;
  let appliedTheme = null;
  let active = false;
  let disposed = false;
  let frame = 0;
  let layer = null;
  let watchedParents = new Set();

  function clearIndicator(entry) {
    const indicator = entry.indicator;
    indicator.removeAttribute('data-cp-hp');
    indicator.removeAttribute('data-cp-hp-renderer');
    indicator.style.removeProperty('--cp-hp-level');
    entry.disc?.remove();
    entry.disc = null;
  }

  function syncIndicator(entry) {
    if (!active || entries.get(entry.indicator) !== entry) return;
    const indicator = entry.indicator;
    const label = indicator.querySelector('.hpp');
    if (label !== entry.label) {
      entry.observer.disconnect();
      entry.label = label;
      entry.lastText = null;
      if (label) entry.observer.observe(label, { childList: true, subtree: true, characterData: true });
    }
    const text = label?.textContent.trim() || '';
    if (text === entry.lastText && (!entry.valid || entry.disc?.parentNode === indicator)) return;
    entry.lastText = text;
    const match = text.match(/(-?\d+(?:[.,]\d+)?)\s*%/) || text.match(/^(-?\d+(?:[.,]\d+)?)$/);
    if (!match) {
      entry.valid = false;
      clearIndicator(entry);
      return;
    }
    const percent = Math.max(0, Math.min(100, Number(match[1].replace(',', '.'))));
    if (!Number.isFinite(percent)) return;
    entry.valid = true;
    const value = `${percent}%`;
    if (indicator.style.getPropertyValue('--cp-hp-level') !== value) indicator.style.setProperty('--cp-hp-level', value);
    if (indicator.getAttribute('data-cp-hp') !== String(percent)) indicator.setAttribute('data-cp-hp', String(percent));
    let disc = indicator.querySelector(':scope > .cp-hp-disc');
    if (!disc) {
      disc = document.createElement('div');
      disc.className = 'cp-hp-disc';
      disc.setAttribute('aria-hidden', 'true');
      const fill = document.createElement('div');
      fill.className = 'cp-hp-fill';
      disc.append(fill);
      indicator.append(disc);
    }
    entry.disc = disc;
    if (indicator.getAttribute('data-cp-hp-renderer') !== 'disc') indicator.setAttribute('data-cp-hp-renderer', 'disc');
  }

  function release() {
    inlineStyles.stop();
    for (const entry of entries.values()) {
      entry.observer.disconnect();
      clearIndicator(entry);
    }
    entries.clear();
    if (active) {
      style?.remove();
      root.removeAttribute(attribute);
    }
    style = null;
    appliedTheme = null;
    active = false;
    watchedParents.clear();
    layer = null;
  }

  function scheduleBindings() {
    if (!disposed && !frame) frame = window.requestAnimationFrame(bind);
  }
  const structureObserver = new window.MutationObserver(records => {
    if (disposed) return;
    if (active && (!layer?.isConnected || !style?.isConnected)) {
      scheduleBindings();
      return;
    }
    for (const entry of entries.values()) {
      if (!entry.indicator.isConnected) {
        scheduleBindings();
        return;
      }
    }
    const selector = '.layer.interface-layer, .hp-indicator';
    for (const record of records) {
      for (const node of record.removedNodes) {
        if (watchedParents.has(node)) {
          scheduleBindings();
          return;
        }
      }
      // Zmiana własnych dzieci HP (np. wymiana .hpp) nie wymaga skanu strony.
      const entry = entries.get(record.target);
      if (entry) syncIndicator(entry);
      for (const node of record.addedNodes) {
        if (node.nodeType === 1 && (node.matches(selector) ||
            (node.firstElementChild && node.querySelector(selector)))) {
          scheduleBindings();
          return;
        }
      }
    }
  });
  // Obserwacja poddrzewa jest potrzebna tylko podczas oczekiwania na HUD.
  // Nie reaguje na tekst ani atrybuty, sprawdza wyłącznie dodane kontenery.
  const bootstrapObserver = new window.MutationObserver(records => {
    const selector = '.layer.interface-layer, .bottom-panel, .hp-indicator';
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType === 1 && (node.matches(selector) || node.querySelector(selector))) {
          scheduleBindings();
          return;
        }
      }
    }
  });

  function bind() {
    frame = 0;
    if (disposed) return;
    structureObserver.disconnect();
    bootstrapObserver.disconnect();
    if (!isEnabled()) { release(); return; }
    layer = document.querySelector('.layer.interface-layer');
    const indicators = layer ? [...layer.querySelectorAll('.bottom-panel .hp-indicator')] : [];
    if (!layer) release();
    else {
      const theme = getTheme();
      let current = document.getElementById(styleId);
      if (!current) {
        current = document.createElement('style');
        current.id = styleId;
        (document.head || root).append(current);
      }
      // Nie odczytujemy ani nie porównujemy całego CSS przy aktualizacji HP.
      if (current !== style || theme !== appliedTheme) {
        inlineStyles.start();
        current.textContent = inlineStyles.css(theme.css);
        current.dataset.version = theme.version;
        style = current;
        appliedTheme = theme;
      }
      if (root.getAttribute(attribute) !== 'on') root.setAttribute(attribute, 'on');
      active = true;
      const present = new Set(indicators);
      for (const [indicator, entry] of entries) {
        if (!present.has(indicator)) {
          entry.observer.disconnect();
          clearIndicator(entry);
          entries.delete(indicator);
        }
      }
      for (const indicator of indicators) {
        let entry = entries.get(indicator);
        if (!entry) {
          entry = { indicator, label: null, lastText: null, valid: false, disc: null };
          entry.observer = new window.MutationObserver(() => syncIndicator(entry));
          entries.set(indicator, entry);
        }
        syncIndicator(entry);
      }
    }
    const parents = new Set([root]);
    if (document.body) parents.add(document.body);
    if (document.head) parents.add(document.head);
    for (const element of [layer, ...indicators]) {
      for (let parent = element; parent; parent = parent.parentElement) parents.add(parent);
    }
    for (const parent of parents) structureObserver.observe(parent, { childList: true });
    watchedParents = parents;
    if (!indicators.length) bootstrapObserver.observe(root, { childList: true, subtree: true });
  }

  function apply() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    bind();
  }
  function destroy() {
    disposed = true;
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    structureObserver.disconnect();
    bootstrapObserver.disconnect();
    release();
    watchedParents.clear();
    layer = null;
  }
  return { apply, destroy };
}

// CSS nie odczytuje atrybutu style: pozwala to przeglądarce zachować szybką
// ścieżkę zmian inline podczas animacji. Kopiujemy tylko style elementów UI,
// dla których motyw chroni obrazki lub ostrzegawcze kolory inline.
function createCyberpunkNiInlineStyles(window) {
  const document = window.document;
  const attribute = 'data-cp-inline-style';
  const windows = '.c-window,.border-window,.dialogue-window,.trade-window,.loot-window,' +
    '.quest-log,.quest-window,.quest-observe-window,.barter-window,.quest-box,.skills-window,' +
    '.friend-enemy-list,.news-panel,.news-window,.settings-window,.mails-window,.mail-box,' +
    '.help-window2,.world-window,.left-grouped-list-and-right-description-window,.divide-panel,' +
    '.divide-list-group,.addons-panel,.clan,.auctions,.auction-window,.showcase,.depo,' +
    '.recovery-item,.premium-panel,.pre-premium-panel,.chests-window,.promo-window,.gold-shop,' +
    '.stamina-shop,.matchmaking-summary,.console-window,.who-is-here-edit,.window-list-edit,' +
    '.crafting,.crafting-window,.crafting__contents,.matchmaking-panel,.quest-bring-item';
  const targets = '.widget-button,.button,.card,.enhance__item,.item-wrapper,' +
    '.skill-usable-slot,.time-progress-bar,.time-inner,.time';
  const containers = '.layer,.game-window-positioner,' + windows;
  const watched = new Map();
  let started = false;

  function update(element) {
    const source = element.getAttribute('style');
    if (source && (source.includes('screen-background.png') ||
        element.matches(targets) || element.closest(windows))) {
      if (element.getAttribute(attribute) !== source) element.setAttribute(attribute, source);
    } else if (element.hasAttribute(attribute)) element.removeAttribute(attribute);
  }
  const styleObserver = new window.MutationObserver(records => {
    const changed = new Set(records.map(record => record.target));
    for (const element of changed) if (element.isConnected) update(element);
  });
  const structureObserver = new window.MutationObserver(records => {
    let removed = false;
    for (const record of records) {
      for (const node of record.addedNodes) if (node.nodeType === 1) scan(node);
      removed ||= [...record.removedNodes].some(node => node.nodeType === 1);
    }
    if (removed) {
      let rebuild = false;
      for (const element of watched.keys()) if (!element.isConnected) { watched.delete(element); rebuild = true; }
      if (rebuild) {
        structureObserver.disconnect();
        for (const [element, subtree] of watched) structureObserver.observe(element, { childList: true, subtree });
      }
    }
  });
  function watch(element) {
    const subtree = element.matches(windows);
    if (watched.has(element)) return;
    watched.set(element, subtree);
    structureObserver.observe(element, { childList: true, subtree });
  }
  function scan(element) {
    update(element);
    if (element.matches(containers)) watch(element);
    if (element.firstElementChild) {
      for (const child of element.querySelectorAll('[style],' + containers)) {
        if (child.hasAttribute('style')) update(child);
        if (child.matches(containers)) watch(child);
      }
    }
  }
  function start() {
    if (started) return;
    started = true;
    scan(document.documentElement);
    watch(document.documentElement);
    if (document.body) watch(document.body);
    styleObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style'], subtree: true });
  }
  function stop() {
    if (!started) return;
    started = false;
    styleObserver.disconnect();
    structureObserver.disconnect();
    watched.clear();
    for (const element of document.querySelectorAll('[' + attribute + ']')) element.removeAttribute(attribute);
  }
  return { start, stop, css: source => source.replace(/\[style(?=[\s*^$|~=\]])/gi, '[' + attribute) };
}
