#!/usr/bin/env python3
"""Build a self-contained standalone HTML by inlining all assets.

Usage:  python3 build_standalone.py <project-dir>

Reads <project-dir>/index.html and produces <project-dir>/index.standalone.html
with all fonts (TTF), photos (JPG/PNG), and logos (SVG) inlined as data URIs.

Optimizations:
  - Only embeds font weights actually referenced in CSS (excludes @font-face declarations)
  - Embeds each logo SVG ONCE via CSS background-image (replaces repeated <img> with <span>)
  - Strips Adobe Illustrator DOCTYPE + ENTITY noise from SVGs
  - Substitutes entity references (&ns_extend; etc.) with their values before encoding

The original index.html is NEVER modified.
"""
import sys, re, base64, os
from urllib.parse import quote

def build(project_dir):
    src = os.path.join(project_dir, "index.html")
    out = os.path.join(project_dir, "index.standalone.html")
    if not os.path.exists(src):
        print(f"index.html not found in {project_dir}", file=sys.stderr); sys.exit(1)

    with open(src, "r", encoding="utf-8") as f:
        html = f.read()

    # 1. Identify used font weights (scan CSS *outside* @font-face blocks)
    ff_pattern = re.compile(r"(\s*@font-face\{[^}]+\})+")
    ff_match = ff_pattern.search(html)
    if ff_match:
        body_css = html[:ff_match.start()] + html[ff_match.end():]
    else:
        body_css = html

    weights = set(int(w) for w in re.findall(r"font-weight:\s*(\d+)", body_css))
    weights.add(400)  # always include regular
    italic = bool(re.search(r"font-style:\s*italic", body_css)) or "<em" in body_css

    weight_map = {
        100: "Thin", 200: "Extralight", 300: "Light", 400: "Regular",
        500: "Medium", 600: "Semibold", 700: "Bold", 800: "Black", 900: "Super",
    }

    # 2. Detect font family name from existing @font-face
    fam_match = re.search(r"font-family:'([^']+)'", html)
    family = fam_match.group(1) if fam_match else "Custom"
    font_dir = os.path.join(project_dir, "fonts")

    blocks = []
    if os.path.isdir(font_dir):
        for w in sorted(w for w in weights if w in weight_map):
            for style, suffix in [("normal", ""), ("italic", " Italic")]:
                if style == "italic" and not italic:
                    continue
                # Find a font file matching this weight+style. Try common naming patterns.
                base = f"{family}-{weight_map[w]}{suffix}"
                cands = [f"{base}.ttf", f"{base}.otf", f"{base}.woff2", f"{base}.woff"]
                path = None
                for c in cands:
                    p = os.path.join(font_dir, c)
                    if os.path.exists(p):
                        path = p; break
                if not path:
                    continue
                with open(path, "rb") as f:
                    data = f.read()
                ext = os.path.splitext(path)[1].lstrip(".").lower()
                fmt = {"ttf":"truetype","otf":"opentype","woff":"woff","woff2":"woff2"}.get(ext,"truetype")
                mime = {"ttf":"font/ttf","otf":"font/otf","woff":"font/woff","woff2":"font/woff2"}.get(ext,"font/ttf")
                b64 = base64.b64encode(data).decode()
                blocks.append(
                    f"@font-face{{font-family:'{family}';"
                    f"src:url(data:{mime};base64,{b64}) format('{fmt}');"
                    f"font-weight:{w};font-style:{style};font-display:swap}}"
                )
                print(f"  font: {os.path.basename(path)} ({len(data)//1024}KB)")

    if blocks and ff_match:
        new_css = "\n  ".join(blocks)
        html = html[:ff_match.start()] + "\n  " + new_css + html[ff_match.end():]

    # 3. Inline logo SVGs once via CSS data URIs
    def svg_to_datauri(path):
        with open(path, "r", encoding="utf-8") as f:
            txt = f.read()
        entities = dict(re.findall(r'<!ENTITY\s+(\w+)\s+"([^"]+)"', txt))
        txt = re.sub(r"<\?xml[^>]*\?>", "", txt)
        txt = re.sub(r"<!DOCTYPE[^>]*\[.*?\]>", "", txt, flags=re.DOTALL)
        txt = re.sub(r"<!DOCTYPE[^>]*>", "", txt)
        txt = re.sub(r"<!--.*?-->", "", txt, flags=re.DOTALL)
        for name, val in entities.items():
            txt = txt.replace(f"&{name};", val)
        txt = re.sub(r"\s+", " ", txt).strip()
        b64 = base64.b64encode(txt.encode("utf-8")).decode()
        return "data:image/svg+xml;base64," + b64

    logo_dir = os.path.join(project_dir, "logo")
    if os.path.isdir(logo_dir):
        # Find logo files referenced as <img class="logo-light/dark" src="logo/...">
        light_match = re.search(r'<img class="logo-light"[^>]*src="(logo/[^"]+)"', html)
        dark_match = re.search(r'<img class="logo-dark"[^>]*src="(logo/[^"]+)"', html)
        replaced = 0
        if light_match and dark_match:
            light_path = os.path.join(project_dir, light_match.group(1))
            dark_path = os.path.join(project_dir, dark_match.group(1))
            light_uri = svg_to_datauri(light_path)
            dark_uri = svg_to_datauri(dark_path)
            pat = re.compile(
                r'<img class="logo-light"[^>]*/?>\s*<img class="logo-dark"[^>]*/?>'
            )
            repl = ('<span class="logo-light" aria-label="Logo"></span>'
                    '<span class="logo-dark" aria-label="Logo"></span>')
            html, replaced = pat.subn(repl, html)
            extra = (
                "\n  .brand .logo-light,.brand .logo-dark{height:22px;width:120px;display:block;"
                "background-repeat:no-repeat;background-position:left center;background-size:contain}"
                f"\n  .brand .logo-light{{background-image:url('{light_uri}')}}"
                f"\n  .brand .logo-dark{{background-image:url('{dark_uri}')}}"
            )
            html = html.replace(
                "  .brand img{height:22px;width:auto;display:block}",
                "  .brand img{height:22px;width:auto;display:block}" + extra,
                1,
            )
            print(f"  logo: replaced {replaced} <img> pairs with <span>")

    # 4. Inline remaining <img src="..."> as base64 data URIs
    def img_to_datauri(m):
        full = m.group(0)
        sm = re.search(r'src="([^"]+)"', full)
        if not sm: return full
        s = sm.group(1)
        if s.startswith("data:") or s.startswith("http"): return full
        p = os.path.join(project_dir, s)
        if not os.path.exists(p): return full
        ext = os.path.splitext(p)[1].lower().lstrip(".")
        mime = {"jpg":"jpeg","jpeg":"jpeg","png":"png","webp":"webp","gif":"gif","svg":"svg+xml"}.get(ext, ext)
        with open(p, "rb") as f: data = f.read()
        if ext == "svg":
            return full.replace(f'src="{s}"', f'src="{svg_to_datauri(p)}"')
        b64 = base64.b64encode(data).decode()
        return full.replace(f'src="{s}"', f'src="data:image/{mime};base64,{b64}"')

    html = re.sub(r"<img\s+[^>]*?>", img_to_datauri, html)

    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    size = os.path.getsize(out)
    mb = size / 1024 / 1024
    print(f"\n✓ Built {out}: {size//1024}KB ({mb:.2f}MB)")
    if mb > 3:
        print("  ⚠ over 3MB — consider font subsetting or fewer photos")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: build_standalone.py <project-dir>", file=sys.stderr); sys.exit(1)
    build(sys.argv[1])
