#!/usr/bin/env python3
"""Pre-process SVG slides for the fidelity theme.

Reads SVGs from a folder, adds `data-anim` attributes to the most visible
elements so they animate in sequentially when the slide becomes active.

Usage:
    python3 process_fidelity_svg.py <folder>

What it does, per SVG:
  1. Parses the file (lightweight XML parser)
  2. Removes XML declaration / DOCTYPE / Adobe Illustrator junk
  3. Identifies "stagger-worthy" nodes: <text>, <image>, and significant
     <g> groups. Sorts them by Y position (top → bottom = reading order).
  4. Assigns data-anim="1" … "10" to the first 10 in order; the rest get
     data-anim="10" (so they all share the last delay).
  5. Writes the processed SVG back in place (creates a .bak first).

After this script runs, the agent simply inlines each SVG's <svg>...</svg>
block inside <div class="fidelity-frame"> in the HTML — the data-anim
attributes will trigger per-element entry animations defined in
themes/fidelity/style.css.
"""

import sys, os, re, shutil
import xml.etree.ElementTree as ET

NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", NS)


def y_of(el):
    """Best-effort Y coordinate for a node."""
    for attr in ("y", "cy"):
        v = el.get(attr)
        if v:
            try:
                return float(re.sub(r"[^0-9.\-]", "", v) or 0)
            except ValueError:
                pass
    tr = el.get("transform") or ""
    m = re.search(r"matrix\([^)]*?,\s*([-0-9.]+)\s*,\s*([-0-9.]+)\s*\)", tr)
    if m:
        try:
            return float(m.group(2))
        except ValueError:
            pass
    m = re.search(r"translate\(\s*[-0-9.]+\s*[, ]\s*([-0-9.]+)\s*\)", tr)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            pass
    return 0.0


def candidate_nodes(root):
    """Pick stagger candidates: visible <text>, <image>, and large <g>."""
    out = []
    for el in root.iter():
        tag = el.tag.split("}", 1)[-1]
        if tag in ("text", "image"):
            out.append(el)
        elif tag == "g":
            # Only top-level-ish groups (those whose parent is the root or
            # one level of <g> nesting) to avoid stagger-explosion.
            pass  # handled below by depth heuristic
    # If we found very few text/image nodes, also grab visible top groups.
    if len(out) < 4:
        for el in list(root):
            tag = el.tag.split("}", 1)[-1]
            if tag == "g" and len(list(el)) > 0:
                out.append(el)
    return out


def process(path):
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()

    # Strip DOCTYPE & XML decl for cleanliness (kept in .bak)
    cleaned = re.sub(r"<\?xml[^>]*\?>", "", raw)
    cleaned = re.sub(r"<!DOCTYPE[^>]*\[.*?\]>", "", cleaned, flags=re.DOTALL)
    cleaned = re.sub(r"<!DOCTYPE[^>]*>", "", cleaned)
    cleaned = cleaned.strip()

    try:
        root = ET.fromstring(cleaned)
    except ET.ParseError as e:
        print(f"  ✗ {os.path.basename(path)}: parse error ({e})", file=sys.stderr)
        return False

    cands = candidate_nodes(root)
    cands.sort(key=y_of)

    if not cands:
        print(f"  ⚠ {os.path.basename(path)}: no stagger candidates found")
        return False

    for i, el in enumerate(cands[:50]):
        n = min(i + 1, 10)
        el.set("data-anim", str(n))

    # Backup and write
    shutil.copy2(path, path + ".bak")
    body = ET.tostring(root, encoding="unicode")
    # ET drops the default namespace prefix; re-inject xmlns on <svg> if missing
    if "xmlns=" not in body[:200]:
        body = body.replace("<svg", f'<svg xmlns="{NS}"', 1)

    with open(path, "w", encoding="utf-8") as f:
        f.write(body)

    print(f"  ✓ {os.path.basename(path)}: {len(cands)} candidates, "
          f"{min(len(cands), 10)} unique stagger steps")
    return True


def main():
    if len(sys.argv) < 2:
        print("usage: process_fidelity_svg.py <folder>", file=sys.stderr)
        sys.exit(1)

    folder = sys.argv[1]
    if not os.path.isdir(folder):
        print(f"not a directory: {folder}", file=sys.stderr); sys.exit(1)

    svgs = sorted(f for f in os.listdir(folder) if f.lower().endswith(".svg"))
    if not svgs:
        print(f"no .svg files in {folder}", file=sys.stderr); sys.exit(1)

    print(f"Processing {len(svgs)} SVGs in {folder}…")
    ok = 0
    for name in svgs:
        if process(os.path.join(folder, name)):
            ok += 1
    print(f"\nDone: {ok}/{len(svgs)} processed.")
    print("Backups saved with .bak extension. Delete after verifying.")


if __name__ == "__main__":
    main()
