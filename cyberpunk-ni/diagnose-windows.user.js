// ==UserScript==
// @name         Cyberpunk NI — diagnostyka okien
// @namespace    local.margonem.cyberpunk-ni.diagnostics
// @version      1.0.0
// @description  Zapisuje lokalny raport klas i stylów otwartych okien. Bez konsoli i wysyłania danych.
// @match        https://*.margonem.pl/*
// @match        https://*.margonem.com/*
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @noframes
// ==/UserScript==

(() => {
  'use strict';

  const WINDOW_SELECTOR = [
    '.c-window', '.border-window', '.dialogue-window', '.trade-window',
    '.loot-window', '.quest-log', '.quest-box', '.skills-window',
    '.friend-enemy-list', '.settings-window', '.world-window',
    '.news-panel', '.news-window', '.crafting', '.crafting-window',
    '.pre-premium-panel', '.premium-panel',
    '.left-grouped-list-and-right-description-window', '[role="dialog"]'
  ].join(',');
  const PROPERTIES = [
    'display', 'position', 'box-sizing', 'background-image', 'background-color',
    'background-position', 'background-size', 'background-repeat',
    'border-image-source', 'border-image-slice', 'border-image-width',
    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
    'border-top-color', 'border-radius', 'box-shadow', 'outline',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'color', 'font-family', 'font-size', 'line-height', 'text-shadow',
    'opacity', 'filter', 'mask-image', 'clip-path', 'transform', 'z-index', 'overflow'
  ];

  function assetUrl(raw) {
    if (/^data:/i.test(raw)) return 'data-image';
    try {
      const url = new URL(raw, location.href);
      // Queries may contain transient IDs. Content pictures need no URL here.
      if (/\/(?:obrazki|avatars?|portraits?|npc|itemy|items)\//i.test(url.pathname)) {
        return 'content-image';
      }
      return url.origin + url.pathname;
    } catch {
      return 'unparsed-url';
    }
  }

  function value(raw) {
    return String(raw).replace(/url\(\s*(["']?)(.*?)\1\s*\)/gi,
      (_match, _quote, url) => `url("${assetUrl(url)}")`).slice(0, 2500);
  }

  function styles(style) {
    const result = {};
    for (const property of PROPERTIES) {
      result[property] = value(style.getPropertyValue(property));
    }
    return result;
  }

  function snapshot(element) {
    return {
      element: styles(getComputedStyle(element)),
      before: styles(getComputedStyle(element, '::before')),
      after: styles(getComputedStyle(element, '::after'))
    };
  }

  function rect(element) {
    const r = element.getBoundingClientRect();
    return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) };
  }

  function sheets(extraSheets) {
    let remaining = 12000;
    const result = [];
    for (const sheet of new Set([...document.styleSheets, ...(document.adoptedStyleSheets || []), ...extraSheets])) {
      const entry = { file: sheet.href ? assetUrl(sheet.href) : 'inline-style', theme: sheet.ownerNode?.id === 'cyberpunk-ni-style', disabled: sheet.disabled, media: sheet.media?.mediaText || '', rules: [] };
      function walk(rules, context) {
        for (const rule of rules) {
          if (remaining <= 0) { entry.truncated = true; return; }
          if (rule.selectorText && rule.style) {
            if (!/window|quest|skill|friend|news|loot|craft|enhance|premium|grouped|\.button|\.checkbox|\.ni-input|\.search-|\.tabs|\.card|\.scroll|background|border-image|url\(/i.test(rule.cssText)) continue;
            const declarations = {};
            for (const property of PROPERTIES) {
              const v = rule.style.getPropertyValue(property);
              if (v) declarations[property] = { value: value(v), priority: rule.style.getPropertyPriority(property) };
            }
            if (!Object.keys(declarations).length) continue;
            entry.rules.push({ selector: rule.selectorText, context, declarations });
            remaining -= 1;
          } else if (rule.cssRules) {
            const label = rule.name ? `layer:${rule.name}` : rule.conditionText || rule.constructor.name;
            walk(rule.cssRules, [...context, label]);
          }
        }
      }
      try { walk(sheet.cssRules, []); }
      catch (error) { entry.blocked = error.name; }
      result.push(entry);
    }
    return result;
  }

  function collect() {
    const root = document.documentElement;
    const theme = document.getElementById('cyberpunk-ni-style');
    const roots = [...document.querySelectorAll(WINDOW_SELECTOR)]
      .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none'; })
      .filter((el, _i, all) => !all.some(parent => parent !== el && parent.contains(el)));
    const important = '.quest-log,.skills-window,.friend-enemy-list,.settings-window,.world-window,.news-panel,.crafting,.crafting-window,.pre-premium-panel,.premium-panel';
    roots.sort((a, b) => Number(!!(b.matches(important) || b.querySelector(important))) - Number(!!(a.matches(important) || a.querySelector(important))));
    const elements = [], seen = new Set(), extraSheets = [];
    function visit(element, parent) {
      if (elements.length >= 1500 || seen.has(element)) return;
      seen.add(element);
      const index = elements.length;
      elements.push({ element, parent, index });
      for (const child of element.children) visit(child, index);
      if (element.shadowRoot) {
        extraSheets.push(...element.shadowRoot.styleSheets, ...(element.shadowRoot.adoptedStyleSheets || []));
        for (const child of element.shadowRoot.children) visit(child, index);
      }
    }
    roots.forEach(el => visit(el, null));
    const report = {
      schema: 1,
      themeVersion: theme?.dataset.version || null,
      themePresent: !!theme,
      themeEnabled: root.getAttribute('data-cyberpunk-ni'),
      themeBytes: theme?.textContent.length || 0,
      rootCount: roots.length,
      windows: roots.map(element => {
        const ancestors = [];
        for (let p = element.parentElement; p && ancestors.length < 6; p = p.parentElement) {
          ancestors.push({ tag: p.tagName, classes: p.getAttribute('class') });
        }
        return { classes: element.getAttribute('class'), ancestors };
      }),
      truncated: elements.length >= 1500,
      nodes: elements.map(({ element, parent, index }) => {
        const inline = {};
        for (const property of PROPERTIES) {
          const v = element.style.getPropertyValue(property);
          if (v) inline[property] = { value: value(v), priority: element.style.getPropertyPriority(property) };
        }
        return {
          index, parent, tag: element.tagName, classes: element.getAttribute('class'),
          role: element.getAttribute('role'), type: element.getAttribute('type'),
          bounds: rect(element), shadow: !!element.shadowRoot, inline,
          themed: snapshot(element)
        };
      }),
      sheets: sheets(extraSheets)
    };
    const saved = root.getAttribute('data-cyberpunk-ni');
    try {
      root.removeAttribute('data-cyberpunk-ni');
      report.nodes.forEach((node, i) => { node.native = snapshot(elements[i].element); });
    } finally {
      if (saved === null) root.removeAttribute('data-cyberpunk-ni');
      else root.setAttribute('data-cyberpunk-ni', saved);
    }
    return report;
  }

  GM_registerMenuCommand('Zapisz diagnostykę okien', () => {
    try {
      const report = collect();
      if (!report.rootCount) {
        alert('Najpierw otwórz okna gry, np. Zadania i Umiejętności. Następnie ponownie wybierz „Zapisz diagnostykę okien”.');
        return;
      }
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'cyberpunk-ni-okna.json';
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error) {
      console.error('Cyberpunk NI — diagnostyka:', error);
      alert('Nie udało się utworzyć raportu: ' + error.name);
    }
  });
})();
