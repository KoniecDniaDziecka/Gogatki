// Cyberpunk NI — moduł Gogatków, budowany z tej samej paczki co osobny motyw.
GogatkiRuntime.register({
  id: 'cyberpunk-ni',
  name: 'Cyberpunk NI',
  description: 'Motyw cyberpunkowy Nowego Interfejsu: okna, HUD i wskaźnik życia.',
  start() {
    'use strict';
    const window = unsafeWindow;
    const document = window.document;
    if (!window.Engine?.hero || !window.Engine?.map) {
      throw new Error('Cyberpunk NI działa tylko na Nowym Interfejsie.');
    }
    const theme = __BUNDLE__;
    const root = document.documentElement;
    const mounted = 'data-cyberpunk-ni-gogatki';
    const attribute = 'data-cyberpunk-ni';
    const styleId = 'cyberpunk-ni-style';
    if (root.hasAttribute(mounted)) return;
    root.setAttribute(mounted, 'on');
    let stopped = false;
    let frame = 0;

    function syncHp(enabled) {
      document.querySelectorAll('.bottom-panel .hp-indicator').forEach(indicator => {
        const text = indicator.querySelector('.hpp')?.textContent.trim() || '';
        const match = enabled && (text.match(/(-?\d+(?:[.,]\d+)?)\s*%/) ||
          text.match(/^(-?\d+(?:[.,]\d+)?)$/));
        if (!match) {
          indicator.removeAttribute('data-cp-hp');
          indicator.removeAttribute('data-cp-hp-renderer');
          indicator.style.removeProperty('--cp-hp-level');
          indicator.querySelector(':scope > .cp-hp-disc')?.remove();
          return;
        }
        const percent = Math.max(0, Math.min(100, Number(match[1].replace(',', '.'))));
        if (!Number.isFinite(percent)) return;
        const value = `${percent}%`;
        if (indicator.style.getPropertyValue('--cp-hp-level') !== value) {
          indicator.style.setProperty('--cp-hp-level', value);
        }
        if (indicator.getAttribute('data-cp-hp') !== String(percent)) {
          indicator.setAttribute('data-cp-hp', String(percent));
        }
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
        if (indicator.getAttribute('data-cp-hp-renderer') !== 'disc') {
          indicator.setAttribute('data-cp-hp-renderer', 'disc');
        }
      });
    }

    function render() {
      frame = 0;
      if (stopped) return;
      let style = document.getElementById(styleId);
      const enabled = !!document.querySelector('.layer.interface-layer');
      if (!enabled) {
        root.removeAttribute(attribute);
        style?.remove();
      } else {
        if (!style) {
          style = document.createElement('style');
          style.id = styleId;
          (document.head || root).append(style);
        }
        if (style.textContent !== theme.css) style.textContent = theme.css;
        style.dataset.version = theme.version;
        root.setAttribute(attribute, 'on');
      }
      syncHp(enabled);
    }

    function schedule() {
      if (!stopped && !frame) frame = window.requestAnimationFrame(render);
    }
    const observer = new window.MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    render();
    window.addEventListener('pagehide', () => {
      stopped = true;
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      root.removeAttribute(mounted);
      root.removeAttribute(attribute);
      document.getElementById(styleId)?.remove();
      syncHp(false);
    }, { once: true });
  }
});
