// Wspólna obsługa HP dla modułu Gogatków i osobnego instalatora.
// Po znalezieniu HUD obserwujemy tekst HP i bezpośrednich rodziców HUD.
// Czat, timery i wnętrza innych okien nie uruchamiają tej obsługi.
function createCyberpunkNiRuntime(window, getTheme, isEnabled) {
  const document = window.document;
  const root = document.documentElement;
  const attribute = 'data-cyberpunk-ni';
  const styleId = 'cyberpunk-ni-style';
  const entries = new Map();
  let style = null;
  let appliedTheme = null;
  let active = false;
  let disposed = false;
  let frame = 0;

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
  }

  function scheduleBindings() {
    if (!disposed && !frame) frame = window.requestAnimationFrame(bind);
  }
  const structureObserver = new window.MutationObserver(scheduleBindings);
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
    const layer = document.querySelector('.layer.interface-layer');
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
        current.textContent = theme.css;
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
  }
  return { apply, destroy };
}
