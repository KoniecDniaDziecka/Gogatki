// Cyberpunk NI — moduł Gogatków, budowany z tej samej paczki co osobny motyw.
GogatkiRuntime.register({
  id: 'cyberpunk-ni',
  name: 'Cyberpunk NI',
  description: 'Motyw NI',
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
    if (root.hasAttribute(mounted)) return;
    root.setAttribute(mounted, 'on');
    __RUNTIME__
    const runtime = createCyberpunkNiRuntime(window, () => theme, () => true);
    runtime.apply();
    window.addEventListener('pagehide', () => {
      runtime.destroy();
      root.removeAttribute(mounted);
    }, { once: true });
  }
});
