"""Bundle the native NI map adapter and the extracted Dark-Sad data model."""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
runtime = (root / 'sources/mapa-podreczna/runtime.js').read_text()
model = (root / 'sources/mapa-podreczna/model.js').read_text()
assert runtime.count('// __MODEL__') == 1
(root / 'gogatki/modules/mapa-podreczna.js').write_text(runtime.replace('// __MODEL__', model))
