"""Build Błogo+ from its panel adapter and extracted Buff Yourself feature."""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = root / 'sources/blogo-plus'
module = '''// Błogo+ 1.0.2 — Buff Yourself (Maddonz, Barlag).
GogatkiRuntime.register({
  id: 'blogo-plus',
  name: 'Błogo+',
  description: 'Przypomnienia o błogosławieństwie i błogosławienie pobliskich graczy.',
  start() {
    'use strict';
    const window = unsafeWindow;
    const document = window.document;
''' + (source / 'runtime.js').read_text() + '\n' + (source / 'buff-yourself.js').read_text() + '\ncreateAddon(config, run);\n  }\n});\n'
(root / 'gogatki/modules/blogo-plus.js').write_text(module)
