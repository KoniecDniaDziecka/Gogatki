"""Build the Gogatki module from the standalone Strategy userscript."""
import sys
from pathlib import Path
root = Path(__file__).resolve().parents[1]
if len(sys.argv) > 1:
    source = Path(sys.argv[1]).read_text()
else:
    source = (root / 'sources/strategy/runtime.js').read_text().replace('// __CORE__', (root / 'sources/strategy/core.js').read_text())
source = source[source.index('(() => {'):]
# Prefer userscript storage while importing the previous standalone settings.
source = source.replace('localStorage.setItem(storageKey,JSON.stringify(config))', 'GM_setValue(storageKey,JSON.parse(JSON.stringify(config)))')
source = source.replace("JSON.parse(localStorage.getItem(storageKey)||'{}')", "(GM_getValue(storageKey,null) ?? JSON.parse(window.localStorage.getItem(storageKey)||'{}'))")
module = """// Strategy 1.2.0 — adapted from Spell Trigger (Maddonz, Barlag).
GogatkiRuntime.register({
 id:'strategy', name:'Strategy',
 description:'Kolejka umiejętności i warunkowe zestawy ruchów w walce.',
 start(){
  const window=unsafeWindow;
""" + source + '\n }\n});\n'
Path(__file__).resolve().parents[1].joinpath('gogatki/modules/strategy.js').write_text(module)
