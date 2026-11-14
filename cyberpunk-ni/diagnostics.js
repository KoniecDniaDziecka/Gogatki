// Raport lokalny, uruchamiany wyłącznie przyciskiem w panelu Gogatków.
// Bez poleceń do gry, zmian wyglądu postaci i wysyłania danych.
function installCyberpunkNiDiagnostics(window, theme, readValue) {
  const document = window.document;
  const panel = document.getElementById('gogatek-panel')?.shadowRoot;
  const footer = panel?.querySelector('footer');
  if (!footer || footer.querySelector('[data-cyberpunk-diagnostics]')) return () => {};
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'refresh-list';
  button.dataset.cyberpunkDiagnostics = 'true';
  button.textContent = `Sprawdź motyw · ${theme.version}`;
  button.title = 'Zapisuje lokalny raport wydajności: przez 10 sekund poruszaj się lub walcz.';
  footer.insertBefore(button, footer.querySelector('.apply'));
  let disposed = false;
  let cancel = null;
  const properties = ['display', 'visibility', 'position', 'background-image', 'background-color',
    'background-position', 'background-size', 'border-image-source', 'border-top-color',
    'color', 'font-family', 'font-size', 'box-shadow', 'filter', 'opacity', 'transform',
    'animation-name', 'pointer-events'];
  const actionPattern = /^(?:Ekwipuj(?: do wszystkich)?|Ulepsz|Linkuj|Pokaż szczegóły|Przypnij dymek|Zniszcz|Użyj po walce|Użyj przy wrogu|Użyj przy ucieczce|Item Marker)$/;

  function url(raw) {
    if (/^data:/i.test(raw)) return 'data-image';
    try { const u = new URL(raw, window.location.href); return (u.origin + u.pathname).slice(0, 350); }
    catch { return 'invalid-url'; }
  }
  function clean(raw) {
    return String(raw).replace(/url\(\s*(["']?)(.*?)\1\s*\)/gi, (_all, _quote, source) => `url("${url(source)}")`).slice(0, 1500);
  }
  function styleData(style) {
    return Object.fromEntries(properties.map(name => [name, clean(style.getPropertyValue(name))]));
  }
  function describe(element) {
    const r = element.getBoundingClientRect();
    const inline = {};
    for (const name of properties) {
      const value = element.style?.getPropertyValue(name);
      if (value) inline[name] = { value: clean(value), priority: element.style.getPropertyPriority(name) };
    }
    return { tag: element.tagName, id: element.id || '', classes: element.getAttribute('class') || '',
      role: element.getAttribute('role'), bounds: { x: r.x, y: r.y, width: r.width, height: r.height },
      inline, computed: styleData(window.getComputedStyle(element)) };
  }
  function visible(element) {
    const r = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 &&
      r.left < window.innerWidth && r.top < window.innerHeight && style.visibility !== 'hidden' && style.opacity !== '0';
  }
  function state() {
    const styles = [...document.querySelectorAll('style[id="cyberpunk-ni-style"]')];
    let catalogueUrl = null;
    try { catalogueUrl = readValue('gogatki:catalogue:v1', null)?.modules?.find(item => item.id === 'cyberpunk-ni')?.url || null; } catch {}
    return { moduleVersion: theme.version, styleVersions: styles.map(style => style.dataset.version || null),
      styleCount: styles.length, themeFlag: document.documentElement.getAttribute('data-cyberpunk-ni'),
      panelFlag: document.documentElement.getAttribute('data-cyberpunk-ni-gogatki'), catalogueUrl };
  }
  function menuSnapshot(discoverUnknown) {
    const roots = [...document.querySelectorAll('.scroll-wrapper.menu-wrapper,#hmenu,.popup-menu,[role="menu"]')].filter(element => visible(element) && /Ekwipuj|Zniszcz|Item Marker/.test(element.textContent));
    // Gdy menu pochodzi z innej wersji interfejsu lub dodatku, rozpoznaj jego
    // rzeczywistą strukturę po grupie widocznych akcji; nie zakładaj klas NI.
    if (!roots.length && discoverUnknown) {
      const leaves = [];
      const walker = document.createTreeWalker(document.body, window.NodeFilter.SHOW_ELEMENT);
      let element, visited = 0;
      while ((element = walker.nextNode()) && visited++ < 12000) {
        if (!element.childElementCount && actionPattern.test(element.textContent.trim()) && visible(element)) leaves.push(element);
      }
      for (const leaf of leaves) {
        for (let parent = leaf.parentElement, depth = 0; parent && depth < 7; parent = parent.parentElement, depth++) {
          const r = parent.getBoundingClientRect();
          if (r.width < 80 || r.width > 450 || r.height < 40 || r.height > 1000) continue;
          if (leaves.filter(node => parent.contains(node)).length >= 3) { roots.push(parent); break; }
        }
      }
    }
    const menus = [...new Set(roots)].filter((element, _i, all) => !all.some(other => other !== element && element.contains(other)));
    return menus.slice(0, 3).map(menu => {
      const elements = [menu, ...menu.querySelectorAll('*')].slice(0, 120);
      const nodes = elements.map(describe);
      const ancestors = [];
      for (let parent = menu.parentElement; parent && ancestors.length < 5; parent = parent.parentElement) ancestors.push(describe(parent));
      const normal = elements.find(element => actionPattern.test(element.textContent.trim()) && !element.childElementCount);
      const red = elements.find(element => element.textContent.trim() === 'Zniszcz' && !element.childElementCount);
      const targets = [menu, normal, red].filter(Boolean);
      const matchedRules = [], blockedSheets = [];
      let visited = 0;
      function rules(list, context) {
        for (const rule of list) {
          if (++visited > 18000 || matchedRules.length >= 180) return;
          if (rule.selectorText && /menu|popup|option|hmenu|button|context/i.test(rule.selectorText)) {
            let matches = [];
            try { matches = targets.flatMap((element, index) => element.matches(rule.selectorText) ? [index] : []); } catch {}
            if (matches.length) {
              const declarations = {};
              for (const name of properties) {
                const value = rule.style.getPropertyValue(name);
                if (value) declarations[name] = { value: clean(value), priority: rule.style.getPropertyPriority(name) };
              }
              matchedRules.push({ selector: rule.selectorText, context, matches, declarations });
            }
          } else if (rule.cssRules) rules(rule.cssRules, [...context, rule.name || rule.conditionText || rule.constructor.name]);
        }
      }
      for (const sheet of document.styleSheets) {
        try { rules(sheet.cssRules, [sheet.ownerNode?.id || (sheet.href ? url(sheet.href) : 'inline')]); }
        catch { blockedSheets.push(sheet.href ? url(sheet.href) : 'inline'); }
      }
      return { root: describe(menu), ancestors, nodes, matchedRules, blockedSheets };
    });
  }

  function visibleSurfaces() {
    return [...document.querySelectorAll('canvas,#hero,.hero,.hero-outfit')]
      .filter(visible)
      .map(element => { const r = element.getBoundingClientRect(); return { element, area: r.width * r.height }; })
      .sort((a, b) => b.area - a.area)
      .slice(0, 12).map(item => item.element);
  }
  function battleSnapshot() {
    return [...document.querySelectorAll('.battle-controller,.battle-controller .graphics,.battle-controller .time-wrapper,.battle-controller .skill-usable-slot')]
      .filter(visible).slice(0, 16).map(describe);
  }

  function capture() {
    return new Promise(resolve => {
      const started = window.performance.now();
      const report = { schema: 3, kind: 'cyberpunk-ni-performance', createdAt: new Date().toISOString(),
        start: state(), browser: window.navigator.userAgent,
        viewport: { width: window.innerWidth, height: window.innerHeight, pixelRatio: window.devicePixelRatio },
        themeWrites: { rootAttributes: 0, stylesheetChanges: 0, stylesheetReplacements: 0 }, menus: [] };
      report.diagnosticWork = { setupDuration: 0, menuSnapshots: [] };
      report.battleAtStart = battleSnapshot();
      const surfaces = visibleSurfaces();
      report.mapSurfacesAtStart = surfaces.map(describe);
      report.surfaceSelection = 'up to 12 visible surfaces, largest first';
      report.surfaceChanges = { attributes: { src: 0, width: 0, height: 0, style: 0, class: 0 }, replacements: 0, samples: [] };
      const surfaceObserver = new window.MutationObserver(records => {
        for (const record of records) {
          report.surfaceChanges.attributes[record.attributeName]++;
          if (report.surfaceChanges.samples.length < 40) report.surfaceChanges.samples.push({
            at: window.performance.now() - started, attribute: record.attributeName,
            tag: record.target.tagName, id: record.target.id || '',
            width: record.target.getAttribute('width'), height: record.target.getAttribute('height'),
            source: record.attributeName === 'src' ? url(record.target.getAttribute('src') || '') : null
          });
        }
      });
      for (const surface of surfaces) surfaceObserver.observe(surface, { attributes: true, attributeFilter: ['src', 'width', 'height', 'style', 'class'] });
      const surfaceParentsObserver = new window.MutationObserver(records => {
        for (const record of records) for (const node of record.removedNodes) {
          if (node.nodeType === 1 && surfaces.some(surface => node === surface || node.contains(surface))) report.surfaceChanges.replacements++;
        }
      });
      for (const parent of new Set(surfaces.flatMap(surface => [surface.parentElement, surface.parentElement?.parentElement]).filter(Boolean))) surfaceParentsObserver.observe(parent, { childList: true });
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:2147483647;pointer-events:none;background:#171b20;color:#c7d0d9;border:1px solid #668298;padding:8px 12px;border-radius:4px;font:12px Arial;text-shadow:none';
      toast.textContent = 'Przez 10 sekund poruszaj się lub walcz. Raport zapisze się automatycznie.';
      document.body.append(toast);
      const gaps = [], tasks = [], menuTimers = new Set();
      let frame = 0, previous = null, hidden = document.hidden, ended = false;
      const onVisibility = () => { hidden ||= document.hidden; };
      const frameTick = timestamp => { if (previous !== null) gaps.push(timestamp - previous); previous = timestamp; frame = window.requestAnimationFrame(frameTick); };
      const cssObserver = new window.MutationObserver(records => { report.themeWrites.stylesheetChanges += records.length; });
      const observeStyle = () => { cssObserver.disconnect(); const style = document.getElementById('cyberpunk-ni-style'); if (style) cssObserver.observe(style, { childList: true, subtree: true, characterData: true }); };
      const rootObserver = new window.MutationObserver(records => { report.themeWrites.rootAttributes += records.length; });
      rootObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-cyberpunk-ni'], attributeOldValue: true });
      const headObserver = new window.MutationObserver(records => {
        if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(node => node.id === 'cyberpunk-ni-style'))) {
          report.themeWrites.stylesheetReplacements++;
          observeStyle();
        }
      });
      if (document.head) headObserver.observe(document.head, { childList: true });
      observeStyle();
      let taskObserver;
      try { taskObserver = new window.PerformanceObserver(list => { for (const entry of list.getEntries()) if (tasks.length < 100) tasks.push({ start: entry.startTime - started, duration: entry.duration }); }); taskObserver.observe({ type: 'longtask' }); } catch {}
      report.longAnimationFrames = { supported: false, entries: [] };
      let animationObserver;
      try {
        if (window.PerformanceObserver.supportedEntryTypes?.includes('long-animation-frame')) {
          animationObserver = new window.PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
              if (report.longAnimationFrames.entries.length >= 100) break;
              report.longAnimationFrames.entries.push({
                start: entry.startTime - started, duration: entry.duration,
                blockingDuration: entry.blockingDuration,
                renderStart: entry.renderStart ? entry.renderStart - started : null,
                styleAndLayoutStart: entry.styleAndLayoutStart ? entry.styleAndLayoutStart - started : null,
                scripts: [...(entry.scripts || [])].slice(0, 30).map(script => ({
                  start: script.startTime - started, duration: script.duration,
                  executionStart: script.executionStart ? script.executionStart - started : null,
                  forcedStyleAndLayoutDuration: script.forcedStyleAndLayoutDuration,
                  pauseDuration: script.pauseDuration,
                  sourceURL: script.sourceURL ? url(script.sourceURL) : null,
                  sourceFunctionName: String(script.sourceFunctionName || '').slice(0, 160),
                  sourceCharPosition: script.sourceCharPosition,
                  invokerType: script.invokerType, windowAttribution: script.windowAttribution
                }))
              });
            }
          });
          animationObserver.observe({ type: 'long-animation-frame' });
          report.longAnimationFrames.supported = true;
        }
      } catch { animationObserver?.disconnect(); }
      const takeMenu = (discoverUnknown = false) => {
        if (report.diagnosticWork.menuSnapshots.length >= 6) return;
        const at = window.performance.now() - started;
        let found = 0;
        try {
          const menus = menuSnapshot(discoverUnknown);
          found = menus.length;
          if (menus.length && report.menus.length < 3) report.menus.push({ at, captureDuration: window.performance.now() - started - at, menus });
        }
        catch (error) { report.menuError = error.name; }
        finally { report.diagnosticWork.menuSnapshots.push({ start: at, duration: window.performance.now() - started - at, found }); }
      };
      const onMenu = event => {
        if (report.menus.length >= 3 || report.diagnosticWork.menuSnapshots.length >= 6 || menuTimers.size) return;
        if (event.type !== 'contextmenu' && !event.target?.closest?.('[data-item],[iid],[id^="item"],[class*="item-id-"]')) return;
        // Kliknięcia w walce nie uruchamiają szukania nieznanego menu po całym DOM.
        const discoverUnknown = event.type === 'contextmenu';
        const timer = window.setTimeout(() => { menuTimers.delete(timer); takeMenu(discoverUnknown); }, 120);
        menuTimers.add(timer);
      };
      document.addEventListener('contextmenu', onMenu, true);
      document.addEventListener('pointerup', onMenu, true);
      document.addEventListener('visibilitychange', onVisibility);
      report.diagnosticWork.setupDuration = window.performance.now() - started;
      frame = window.requestAnimationFrame(frameTick);
      function finish(cancelled) {
        if (ended) return;
        ended = true;
        window.clearTimeout(timer);
        window.cancelAnimationFrame(frame);
        for (const pending of menuTimers) window.clearTimeout(pending);
        cssObserver.disconnect(); rootObserver.disconnect(); headObserver.disconnect(); taskObserver?.disconnect();
        animationObserver?.disconnect();
        surfaceObserver.disconnect(); surfaceParentsObserver.disconnect();
        document.removeEventListener('contextmenu', onMenu, true);
        document.removeEventListener('pointerup', onMenu, true);
        document.removeEventListener('visibilitychange', onVisibility);
        toast.remove(); cancel = null;
        if (cancelled) { resolve(null); return; }
        if (!report.menus.length) takeMenu();
        const sorted = [...gaps].sort((a, b) => a - b);
        const percentile = fraction => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] : null;
        report.duration = window.performance.now() - started;
        report.frames = { samples: gaps.length, medianGap: percentile(.5), p95Gap: percentile(.95), maxGap: sorted.at(-1) || null, gapsOver50ms: gaps.filter(value => value > 50).length, hiddenDuringCapture: hidden };
        report.longTasks = tasks;
        report.end = state();
        report.images = window.performance.getEntriesByType('resource').filter(entry => entry.startTime >= started && !entry.name.startsWith('data:') && /\.(?:png|gif|jpe?g|webp|avif)(?:[?#]|$)/i.test(entry.name)).slice(0, 150).map(entry => ({ url: url(entry.name), start: entry.startTime - started, duration: entry.duration, transferSize: entry.transferSize, decodedSize: entry.decodedBodySize, initiator: entry.initiatorType }));
        report.mapSurfaces = visibleSurfaces().map(describe);
        report.battleAtEnd = battleSnapshot();
        resolve(report);
      }
      const timer = window.setTimeout(() => finish(false), 10000);
      cancel = () => finish(true);
    });
  }

  button.addEventListener('click', async () => {
    if (button.disabled || disposed) return;
    button.disabled = true;
    panel.querySelector('section header button[aria-label="Zamknij"]')?.click();
    try {
      const report = await capture();
      if (!report || disposed) return;
      const objectUrl = window.URL.createObjectURL(new window.Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = 'cyberpunk-ni-ruch-menu.json';
      document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 10000);
    } catch (error) { window.alert('Nie udało się zapisać raportu motywu: ' + error.name); }
    finally { if (!disposed) button.disabled = false; }
  });
  return () => { disposed = true; cancel?.(); button.remove(); };
}
