"""Generuje lokalne grafiki SVG i osadza je w CSS motywu."""
from pathlib import Path
from urllib.parse import quote

START = "/* CP-WINDOW-ASSETS-BEGIN */"
END = "/* CP-WINDOW-ASSETS-END */"

# Jedna rodzina opraw; motyw i przypisanie wnętrza są osobne dla każdego okna.
WINDOWS = {
    "quests": (".quest-window,.quest-log,.quest-observe-window,.quest-box", """
      <path d='M167 158h20v-21h29v-23h23'/>
      <rect x='164' y='155' width='6' height='6'/><rect x='213' y='134' width='6' height='6'/>
      <path d='M175 168h59M228 121v27h-22'/>
    """),
    "skills": (".skills-window", """
      <path d='M203 169v-31m0 0-28-24m28 24 28-24m-28 24v-34'/>
      <path d='m175 106 8 8-8 8-8-8Zm28-18 8 8-8 8-8-8Zm28 18 8 8-8 8-8-8Z'/>
      <path d='M177 165h12m28 0h12'/>
    """),
    "friends": (".friend-enemy-list", """
      <circle cx='203' cy='125' r='11'/><circle cx='177' cy='151' r='8'/><circle cx='229' cy='151' r='8'/>
      <path d='m195 133-12 12m28-12 12 12m-38 6h36m-44 14h52'/>
    """),
    "settings": (".settings-window", """
      <path d='M165 119h72m-72 20h72m-72 20h72'/>
      <rect x='179' y='114' width='10' height='10'/><rect x='215' y='134' width='10' height='10'/>
      <rect x='190' y='154' width='10' height='10'/>
    """),
    "crafting": (".crafting,.crafting-window,.crafting__contents,.barter-window", """
      <path d='m203 104 28 16v32l-28 16-28-16v-32Z'/>
      <path d='m203 115 18 10v21l-18 11-18-11v-21Z'/>
      <circle cx='203' cy='136' r='8'/><path d='M164 107h15m48 58h15'/>
    """),
    "world": (".world-window", """
      <circle cx='204' cy='136' r='30'/><ellipse cx='204' cy='136' rx='13' ry='30'/>
      <path d='M174 136h60m-54-17h48m-48 34h48M204 100v72m-36-36h72'/>
    """),
    "news": (".news-panel,.news-window", """
      <path d='M170 112h62v49h-62Z'/><path d='M177 120h20v16h-20Zm27 0h20m-20 7h20m-20 7h20m-47 9h47m-47 8h34'/>
      <path d='M164 121v46h57'/>
    """),
    "premium": (".premium-panel,.pre-premium-panel", """
      <path d='m176 119 12-13h32l12 13-28 46Zm0 0h56m-44-13 16 59 16-59m-44 13 28-13 28 13'/>
      <path d='M171 172h66'/>
    """),
    "loot": (".loot-window", """
      <path d='M173 130h61v34h-61Zm0 0 7-21h47l7 21m-44-21v55m27-55v55'/>
      <rect x='198' y='130' width='11' height='12'/><path d='M167 171h73'/>
    """),
}


def svg(body, width, height, name):
    return (f"<svg xmlns='http://www.w3.org/2000/svg' width='{width}' height='{height}' "
            f"viewBox='0 0 {width} {height}' preserveAspectRatio='none' id='cp-window-{name}'>" + body + "</svg>\n")


def panel(name, motif):
    return svg("""
      <defs><pattern id='grid' width='32' height='32' patternUnits='userSpaceOnUse'>
        <path d='M32 0H0v32' fill='none' stroke='#24333e' stroke-width='.5'/>
      </pattern></defs>
      <path d='M148 94h108v98H148Z' fill='url(#grid)' opacity='.35'/>
      <g fill='none' stroke='#354c5c' stroke-width='1' opacity='.48'>
    """ + motif + """</g>
      <path d='M242 179h-35m35 0v-20M155 102v-9h18' fill='none' stroke='#12c9bd' stroke-width='1' opacity='.32'/>
    """, 256, 192, name)


def assets():
    result = {f"{name}.svg": panel(name, motif) for name, (_, motif) in WINDOWS.items()}
    result["common.svg"] = panel("common", "<path d='M174 161h25v-23h30v-26m-55 32h12m28 12h19'/>")
    result["header.svg"] = svg("""
      <rect width='240' height='28' fill='#252b31'/>
      <path d='M0 27.5h240M0 .5h240' stroke='#425b6b' fill='none' vector-effect='non-scaling-stroke'/>
      <path d='M0 6v16m240-16v16' stroke='#12c9bd' fill='none' stroke-width='2' vector-effect='non-scaling-stroke'/>
      <path d='M8 24h21m182 0h21M8 4h13m198 0h13' stroke='#34505e' fill='none' vector-effect='non-scaling-stroke'/>
    """, 240, 28, "header")
    result["footer.svg"] = svg("""
      <rect width='240' height='36' fill='#1d2831'/>
      <path d='M0 .5h240M0 35.5h240' stroke='#425b6b' vector-effect='non-scaling-stroke'/>
      <path d='M7 5h17m192 0h17M7 30h10m206 0h10' stroke='#12c9bd' opacity='.6' vector-effect='non-scaling-stroke'/>
      <path d='M30 5h14m152 0h14' stroke='#344b5a' vector-effect='non-scaling-stroke'/>
    """, 240, 36, "footer")
    result["card.svg"] = svg("""
      <path d='M69 3h23v18H69m3-14h16m-16 5h10m-10 5h16' fill='none' stroke='#334957' stroke-width='1'/>
      <path d='M91 2v7m-9 12h10' fill='none' stroke='#12c9bd' opacity='.45'/>
    """, 96, 24, "card")
    for name, accent in [("slot", "#668298"), ("slot-active", "#12c9bd")]:
        result[f"{name}.svg"] = svg(f"""
          <path d='M4 .5h32l3.5 3.5v32L36 39.5H4L.5 36V4Z' fill='#17232c' stroke='{accent}' vector-effect='non-scaling-stroke'/>
          <path d='M3 11V5l2-2h6m18 0h6l2 2v6M3 29v6l2 2h6m18 0h6l2-2v-6' fill='none' stroke='{accent}' vector-effect='non-scaling-stroke'/>
          <path d='M6 20h3m22 0h3' stroke='#344b5a' vector-effect='non-scaling-stroke'/>
        """, 40, 40, name)
    for name, transform in [("nw", ""), ("ne", "translate(12 0) scale(-1 1)"), ("sw", "translate(0 12) scale(1 -1)"), ("se", "translate(12 12) scale(-1 -1)")]:
        result[f"corner-{name}.svg"] = svg(f"""
          <g transform='{transform}' fill='none'>
            <path d='M11.5 .5H4L.5 4v7.5' stroke='#668298'/>
            <path d='M8 .5H4L.5 4v4' stroke='#12c9bd'/>
            <path d='M11.5 3.5H6l-2.5 2.5v5.5' stroke='#2b414f'/>
          </g>
        """, 12, 12, f"corner-{name}")
    return result


def inline_graphics(css, root: Path):
    images = assets()
    destination = root / "assets" / "windows"
    destination.mkdir(parents=True, exist_ok=True)
    declarations = []
    for filename, source in images.items():
        (destination / filename).write_text(source)
        name = filename.removesuffix(".svg")
        uri = "data:image/svg+xml," + quote(source, safe="='/:,.-")
        declarations.append(f'  --cp-art-{name}: url("{uri}");')
    lines = [START, 'html[data-cyberpunk-ni="on"] {', *declarations,
             '  --cp-window-surface: var(--cp-art-common);', '}']
    for name, (selectors, _motif) in WINDOWS.items():
        lines += [f'html[data-cyberpunk-ni="on"] :is({selectors}),',
                  f'html[data-cyberpunk-ni="on"] :is(.c-window,.border-window):has(:is({selectors})) {{',
                  f'  --cp-window-surface: var(--cp-art-{name});', '}']
    lines += [END]
    generated = "\n".join(lines)
    if START in css:
        before, rest = css.split(START, 1)
        _old, after = rest.split(END, 1)
        return before + generated + after
    return css.rstrip() + "\n\n" + generated + "\n"
