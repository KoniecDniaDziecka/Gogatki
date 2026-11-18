// Wspólny panel Gogatków dla adaptacji Greater Merchant i Divide Et Impera.
const config = {
  id: 'kupiec-plus',
  name: 'Kupiec+',
  description: 'Sprzedaż i uzupełnianie (NI), dzielenie stosów (NI/SI). Shift + PPM: pół stosu, Ctrl + PPM: pojedynczo.',
  defaults: {
    ...merchantModule.config.defaults,
    ...divideModule.config.defaults,
    merchantEnabled: true, divideEnabled: true,
  },
  fields: [
    ['merchantEnabled', 'Handel (NI)'],
    ['divideEnabled', 'Dzielenie stosów'],
    ...merchantModule.config.fields,
    ...divideModule.config.fields,
  ],
};

// Zachowaj indywidualne preferencje przy pierwszym uruchomieniu wspólnej wersji.
function readPrevious(id) {
  try {
    const value = JSON.parse(localStorage.getItem('maddonz-extracted:' + id + ':v1'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch { return null; }
}
let savedCombined;
try { savedCombined = GM_getValue('kupiec-plus:global:v1', null); } catch {}
if (!savedCombined && !readPrevious('merchant-divide')) {
  for (const [module, enabled] of [[merchantModule, 'merchantEnabled'], [divideModule, 'divideEnabled']]) {
    const saved = readPrevious(module.config.id);
    if (!saved) continue;
    if (typeof saved.active === 'boolean') config.defaults[enabled] = saved.active;
    for (const key of Object.keys(module.config.defaults)) {
      if (typeof saved[key] === typeof module.config.defaults[key]) config.defaults[key] = saved[key];
    }
  }
}

function run(R) {
  function component(key, title, niOnly = false) {
    const part = Object.create(R);
    Object.defineProperty(part, 'active', {
      get: () => R.active && R.state[key] && (!niOnly || Boolean(R.engine())),
    });
    part.shortcut = (event, value) => part.active && R.shortcut(event, value);
    part.request = (query, options) => part.active
      ? R.request(query, options)
      : Promise.reject(Error(title + ' jest wyłączony.'));
    part.action = (name, action) => {
      R.action(name, () => { if (part.active) return action(); });
      R.root.querySelector('.actions').lastElementChild.dataset.component = key;
    };
    return part;
  }
  const merchant = component('merchantEnabled', 'Greater Merchant', true);
  const divide = component('divideEnabled', 'Divide Et Impera');
  const merchantRuntime = merchantModule.run(merchant) || {};
  const divideRuntime = divideModule.run(divide) || {};

  function refreshControls() {
    const ni = Boolean(R.engine());
    const input = R.root.querySelector('[data-key="merchantEnabled"]');
    input.disabled = !ni;
    input.checked = ni && R.state.merchantEnabled;
    for (const button of R.root.querySelectorAll('[data-component]')) {
      button.disabled = button.dataset.component === 'merchantEnabled' ? !merchant.active : !divide.active;
    }
  }
  refreshControls();
  if (!R.engine()) R.report('SI: działa dzielenie stosów. Greater Merchant wymaga NI.');
  return {
    tick() {
      merchantRuntime.tick?.();
      divideRuntime.tick?.();
    },
    change(key) {
      merchantRuntime.change?.(key);
      divideRuntime.change?.(key);
      refreshControls();
    },
  };
}
