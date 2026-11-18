"""Build the Kupiec+ module from its shared panel and two extracted features."""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = root / 'sources/kupiec-plus'
parts = [(source / 'runtime.js').read_text()]
for name, binding in [('greater-merchant', 'merchantModule'), ('divide-et-impera', 'divideModule')]:
    parts.append('const ' + binding + ' = (() => {\n' + (source / (name + '.js')).read_text() +
                 '\nreturn { config, run };\n})();\n')
parts.append((source / 'merchant-divide.js').read_text())
parts.append('createAddon(config, run);\n')
module = '''// Kupiec+ 1.0.1 — Greater Merchant + Divide Et Impera (Maddonz, Barlag).
GogatkiRuntime.register({
  id: 'kupiec-plus',
  name: 'Kupiec+',
  description: 'Sprzedaż i uzupełnianie (NI) oraz dzielenie stosów (NI/SI).',
  start() {
    'use strict';
    const window = unsafeWindow;
    const document = window.document;
'''+ '\n'.join(parts) + '\n  }\n});\n'
(root / 'gogatki/modules/kupiec-plus.js').write_text(module)
