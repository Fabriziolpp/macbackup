#!/usr/bin/env python3
"""
init_style_pack.py — scaffold a fidelity STYLE PACK from a reference .pptx.

Onboarding a new reference becomes: run this once, then let the skill refine.

    python3 init_style_pack.py reference-decks/<file>.pptx [--slug <slug>]

It creates  reference-decks/<slug>/
    assets/            background CANDIDATES (near-16:9, large, cover-referenced),
                       downscaled; PLUS assets/_extracted/ (every image, for reference)
    style.json         prefilled: ALWAYS-Song palette (light or dark variant, auto-detected)
                       + detected fonts + best-guess cover/divider + motif defaults, with a
                       _TODO. The reference's own colours are recorded only as a note —
                       NEVER applied (colours are always ACN Song).
    patterns.md        a STUB with the standard structure + the "engine already builds
                       these archetypes" banner, ready for the skill to fill in.

Then a human (or the skill) CURATES: confirm the real cover/divider background (delete the
content photos), fill patterns.md by studying the rendered slides, tune mode/motifs, build
with `--style` and run the visual QA loop.

Dependencies: pillow (downscaling; falls back to full-size copy if absent).
"""
import argparse, collections, json, os, re, shutil, struct, sys, tempfile, zipfile

# ── ALWAYS-Song palettes (the reference contributes layout only, never colour) ──
SONG_LIGHT = {
    "brand1": "#A100FF", "brand2": "#7500C0", "brand3": "#460073",
    "dark": "#1B0A46", "soft1": "#E6DCFF", "soft2": "#C2A3FF",
    "ink": "#17123A", "gray": "#818180", "paper": "#FFFFFF",
}
SONG_DARK = {
    "brand1": "#A100FF", "brand2": "#7500C0", "brand3": "#460073",
    "dark": "#000000", "soft1": "#1F1F1F", "soft2": "#111111",
    "ink": "#FFFFFF", "gray": "#9CA3AF", "paper": "#000000",
}


def _png_dims(d):
    if d[:8] == b"\x89PNG\r\n\x1a\n" and d[12:16] == b"IHDR":
        return struct.unpack(">II", d[16:24])
    return None


def _jpg_dims(d):
    i = 2
    while i < len(d) - 9:
        if d[i] != 0xFF:
            i += 1; continue
        m = d[i + 1]
        if 0xC0 <= m <= 0xCF and m not in (0xC4, 0xC8, 0xCC):
            h, w = struct.unpack(">HH", d[i + 5:i + 9]); return w, h
        i += 2 + struct.unpack(">H", d[i + 2:i + 4])[0]
    return None


def img_dims(path):
    try:
        with open(path, "rb") as f:
            d = f.read(64 * 1024)
        ext = os.path.splitext(path)[1].lower()
        if ext == ".png":
            return _png_dims(d)
        if ext in (".jpg", ".jpeg"):
            return _jpg_dims(d)
    except Exception:
        pass
    return None


def _lum(hexv):
    r, g, b = int(hexv[0:2], 16), int(hexv[2:4], 16), int(hexv[4:6], 16)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255.0


def _find_soffice():
    import shutil as _sh
    for c in ("soffice", "/opt/homebrew/bin/soffice", "/usr/local/bin/soffice",
              "/Applications/LibreOffice.app/Contents/MacOS/soffice"):
        p = _sh.which(c) if os.path.basename(c) == c else (c if os.path.exists(c) else None)
        if p:
            return p
    return None


def detect_mode_via_render(pptx):
    """Reliable light/dark: render a few CONTENT pages and measure mean luminance.
    Returns 'light'/'dark', or None if the render toolchain is unavailable."""
    import subprocess, glob, statistics
    soffice = _find_soffice()
    if not soffice:
        return None
    try:
        import fitz  # PyMuPDF
    except Exception:
        return None
    with tempfile.TemporaryDirectory() as wd:
        try:
            subprocess.run([soffice, "--headless", "--convert-to", "pdf", "--outdir", wd, pptx],
                           timeout=180, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            return None
        pdfs = glob.glob(os.path.join(wd, "*.pdf"))
        if not pdfs:
            return None
        try:
            doc = fitz.open(pdfs[0])
        except Exception:
            return None
        pages = [p for p in (1, 2, 3, 4) if p < len(doc)] or [0]
        lums = []
        for pi in pages:
            pix = doc[pi].get_pixmap(matrix=fitz.Matrix(0.16, 0.16))
            data, step = pix.samples, pix.n
            tot = cnt = 0
            for i in range(0, len(data) - step, step * 8):
                r = data[i]; g = data[i + 1] if step > 1 else r; b = data[i + 2] if step > 2 else r
                tot += 0.299 * r + 0.587 * g + 0.114 * b; cnt += 1
            if cnt:
                lums.append(tot / cnt / 255.0)
        if not lums:
            return None
        return "dark" if statistics.mean(lums) < 0.5 else "light"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pptx")
    ap.add_argument("--slug", help="folder name under reference-decks/ (default: from filename)")
    ap.add_argument("--out", help="output dir (default: reference-decks/<slug>)")
    ap.add_argument("--max-width", type=int, default=2400, help="downscale candidates to this width")
    ap.add_argument("--no-index", action="store_true", help="don't append a draft INDEX.md row")
    args = ap.parse_args()

    if not os.path.exists(args.pptx):
        sys.exit(f"✗ not found: {args.pptx}")
    slug = args.slug or re.sub(r"[^a-z0-9]+", "-",
                               os.path.splitext(os.path.basename(args.pptx))[0].lower()).strip("-")
    skill_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out = args.out or os.path.join(skill_root, "reference-decks", slug)
    assets = os.path.join(out, "assets")
    extracted = os.path.join(assets, "_extracted")
    os.makedirs(extracted, exist_ok=True)

    tmp = tempfile.mkdtemp(prefix="stylepack_")
    try:
        with zipfile.ZipFile(args.pptx) as z:
            z.extractall(tmp)
        media_dir = os.path.join(tmp, "ppt", "media")
        rels_dir = os.path.join(tmp, "ppt", "slides", "_rels")
        slide_dir = os.path.join(tmp, "ppt", "slides")

        slide_media = collections.defaultdict(list)
        if os.path.isdir(rels_dir):
            for rf in os.listdir(rels_dir):
                m = re.match(r"slide(\d+)\.xml\.rels$", rf)
                if not m:
                    continue
                xml = open(os.path.join(rels_dir, rf), encoding="utf-8").read()
                for mref in re.findall(r'Target="\.\./media/([^"]+)"', xml):
                    slide_media[int(m.group(1))].append(mref)
        media_slides = collections.defaultdict(list)
        for si, ms in slide_media.items():
            for mm in ms:
                media_slides[mm].append(si)

        colors, fonts = collections.Counter(), collections.Counter()
        n_slides = 0
        if os.path.isdir(slide_dir):
            for s in sorted(os.listdir(slide_dir)):
                if not re.match(r"slide\d+\.xml$", s):
                    continue
                n_slides += 1
                xml = open(os.path.join(slide_dir, s), encoding="utf-8").read()
                for c in re.findall(r'srgbClr val="([0-9A-Fa-f]{6})"', xml):
                    colors[c.upper()] += 1
                for fn in re.findall(r'typeface="([^"]+)"', xml):
                    if fn and not fn.startswith("+"):
                        fonts[fn] += 1

        # mode detection: render content pages + measure luminance (reliable); if the
        # render toolchain is missing, fall back to a colour-frequency guess.
        top_colors = colors.most_common(8)
        mode = detect_mode_via_render(os.path.abspath(args.pptx))
        mode_src = "render"
        if mode is None:
            dark_w = sum(n for c, n in colors.items() if _lum(c) < 0.25)
            light_w = sum(n for c, n in colors.items() if _lum(c) > 0.80)
            mode = "dark" if dark_w > light_w * 1.4 else "light"
            mode_src = "colour-guess"
        palette = SONG_DARK if mode == "dark" else SONG_LIGHT
        heading = fonts.most_common(1)[0][0] if fonts else "Graphik"

        # background candidates: near-16:9, large, prefer cover (slide 1) references
        candidates = []
        if os.path.isdir(media_dir):
            for f in os.listdir(media_dir):
                fp = os.path.join(media_dir, f)
                shutil.copy2(fp, os.path.join(extracted, f))
                dims = img_dims(fp)
                if not dims:
                    continue
                w, h = dims
                if not h:
                    continue
                ar = w / h
                on_cover = 1 in media_slides.get(f, [])
                if 1.55 <= ar <= 2.05 and w >= 1400:
                    candidates.append((f, w, h, on_cover, w * h))
        candidates.sort(key=lambda c: (c[3], c[4]), reverse=True)

        picked = []
        for i, (f, w, h, on_cover, _) in enumerate(candidates[:4], 1):
            name = f"candidate-{i:02d}.png"
            dst = os.path.join(assets, name)
            src = os.path.join(extracted, f)
            try:
                from PIL import Image
                im = Image.open(src).convert("RGB")
                if w > args.max_width:
                    im = im.resize((args.max_width, int(h * args.max_width / w)), Image.LANCZOS)
                im.save(dst, optimize=True)
            except Exception:
                shutil.copy2(src, dst)
            picked.append({"asset": f"assets/{name}", "from": f, "px": f"{w}x{h}",
                           "on_cover_slide": bool(on_cover)})

        # cover/divider: use a strong on-cover candidate as an asset, else Song deconstructed bar
        cover_cand = next((p for p in picked if p["on_cover_slide"]), None)
        style = {
            "reference": os.path.basename(args.pptx),
            "_scaffolded": True,
            "_color_rule": "COLOURS ARE ALWAYS ACN SONG. The reference contributes layout / "
                           "structure / graphic-element vocabulary ONLY — never its own colours. "
                           "The palette below is Song; do not replace it with the reference's colours.",
            "_reference_colors_detected": ["#" + c for c, _ in top_colors],
            "_TODO": "CURATE: (1) confirm which candidate is the REAL cover/divider background "
                     "(delete the rest + any content photos in assets/); (2) fill patterns.md by "
                     "studying the rendered slides; (3) verify mode (light/dark) + set motifs "
                     "(eyebrow: numbered|uppercase-tracked, footer: chevron|co-brand-lockup|song, "
                     "bullets.style: dot|green-check, accent_word). Then remove this key.",
            "_candidates": picked,
            "palette": palette,
            "fonts": {"heading": heading, "body": heading, "accent": heading, "accent_italic": False},
            "layout": {"align": "left", "radius": 14, "mode": mode, "dark_dividers": True},
            "cards": "rounded-gradient",
            "content_skin": slug,
            "motifs": {"footer": "chevron", "accent_word": True},
        }
        if cover_cand:
            style["cover"] = {"asset": cover_cand["asset"], "title_color": "#FFFFFF",
                              "accent_color": "#C2A3FF", "kicker_color": "#C2A3FF",
                              "sub_color": "#E9DEFF"}
            style["divider"] = {"asset": cover_cand["asset"], "scrim": 60,
                                "scrim_color": palette["dark"], "accent_color": "#C2A3FF"}
        else:
            style["decoration"] = "bar"  # Song deconstructed-bar cover/divider (no asset)

        with open(os.path.join(out, "style.json"), "w", encoding="utf-8") as f:
            json.dump(style, f, ensure_ascii=False, indent=2)

        # patterns.md stub
        pat = os.path.join(out, "patterns.md")
        if not os.path.exists(pat):
            with open(pat, "w", encoding="utf-8") as f:
                f.write(_patterns_stub(slug, args.pptx, n_slides))

        index_status = "skipped (--no-index)" if args.no_index else \
            _append_index_row(skill_root, slug, os.path.basename(args.pptx), mode)

        print(f"✓ Style pack scaffolded: {out}")
        print(f"  slides: {n_slides} · mode: {mode} (via {mode_src}) · fonts: {heading}")
        print(f"  palette: ALWAYS Song ({'dark' if mode=='dark' else 'light'} variant)")
        print(f"  reference colours (info only, NOT applied): {', '.join('#'+c for c,_ in top_colors[:5])}")
        print(f"  background candidates: {len(picked)} in assets/ (all images in assets/_extracted/)")
        for p in picked:
            print(f"    {p['asset']}  ({p['px']}{', on cover' if p['on_cover_slide'] else ''})")
        print(f"  INDEX.md: {index_status}")
        print("\nNEXT (skill-assisted):")
        print("  1. Render all slides + study them; delete content-photo candidates, keep the real bg.")
        print("  2. Fill patterns.md (archetypes + triggers) — start from reference-decks/premium/patterns.md.")
        print("  3. Set mode/motifs in style.json; COMPLETE the ⟨TODO⟩ placeholders in the INDEX.md row.")
        print(f"  4. Build:  build_pptx.py <model> <spec> <out> --style reference-decks/{slug}/style.json  → visual QA.")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def _patterns_stub(slug, pptx, n_slides):
    name = os.path.splitext(os.path.basename(pptx))[0]
    return f"""# {name} — pattern catalogue (fidelity memory + selection index)

> **STUB — fill this in.** Scaffolded by `init_style_pack.py` from `{os.path.basename(pptx)}`
> ({n_slides} slides). Render all slides (`render_preview.py`), study them (a contact-sheet
> montage helps), and catalogue every graphic ELEMENT and every slide ARCHETYPE below, each
> with **triggers** ("use when…") + deck-model mapping + engine status. Start from
> `reference-decks/premium/patterns.md` as the reference format.

> **COLOURS ARE ALWAYS SONG.** This reference contributes layout / structure / graphic-element
> vocabulary ONLY. Record its own colours only as a note; never apply them.

> **ENGINE ALREADY BUILDS THESE — reuse them (mark ✅).** `build_pptx.py` types (Song-purple,
> mode-aware): cover, agenda, divider, quote(statement), context(definition), content(list/
> rich), pillars/focus(bento, +featured/+status), metrics(big-stat / donut-gauge `ring` /
> stat-quad), donut, donuts, table, taxonomy, code, timeline, flow, gantt, ratings, logos,
> pricing, decision, activity, map, risk, phoneflow, finding, showcase, thank-you. Map each
> archetype you see to one of these where possible → ✅. Only mark ○ for a genuinely novel
> element that needs new component code.

## Palette & type
- Colours: **ACN Song** (`#A100FF / #7500C0 / #460073` …). Canvas: <light|dark — verify>.
- Fonts: <detected>. Type notes: <headlines / eyebrows / body>.

## Graphic elements (atoms)
| Element | Where used | Engine |
|---|---|---|
| … | … | ✅ / ⚙️ / ○ |

## Slide archetypes (with triggers)
### Openers & punctuation
- **cover** — … **Trigger:** deck title. → `cover`. ✅
- **divider** — … **Trigger:** section start. → `divider`. ✅
- **closing** — … → `thank-you`. ✅

### Text / list content
- … → `content` / `context`. ✅

### Data & metrics
- … → `metrics` / `donut` / `table` / `gantt`. ✅

### Feature / evidence
- … → `pillars`/`focus` (bento) / `code` / `finding` / `activity` / …

## Coverage roadmap
Built (✅): reuse the shared engine types above.
Novel/○ (needs component code or the reference's own assets): <list here>.
"""


def _append_index_row(skill_root, slug, filename, mode):
    """Append a DRAFT INDEX.md row for the new reference. Idempotent (skips if the file is
    already listed). Fills only what's known (name/file/mode/fidelity marker); the look
    description and the 'Use for' trigger are left as ⟨…⟩ placeholders to complete when
    curating — the scaffolder can't infer them from colour/media extraction alone."""
    idx = os.path.join(skill_root, "reference-decks", "INDEX.md")
    if not os.path.exists(idx):
        return "no-index-file"
    txt = open(idx, encoding="utf-8").read()
    if filename in txt:
        return "already-listed"
    name = re.sub(r"[_\-]+", " ", os.path.splitext(filename)[0]).strip()
    row = (f"- **{name} — ⟨sottotitolo⟩** · `{filename}` · ✦ **fidelity style pack** "
           f"(`{slug}/style.json`) — build with `--style` · ⟨TODO: descrivi struttura/"
           f"layout in una riga — i colori sono sempre Song; tela {mode}⟩. "
           f"**Use for** ⟨TODO: quando scegliere questa reference⟩.\n")
    marker = "## Available references"
    if marker in txt:
        i = txt.index(marker) + len(marker)
        nl = txt.index("\n", i)
        txt = txt[:nl + 1] + "\n" + row + txt[nl + 1:]
    else:
        txt = txt.rstrip() + "\n\n## Available references\n\n" + row
    with open(idx, "w", encoding="utf-8") as f:
        f.write(txt)
    return "added-draft"


if __name__ == "__main__":
    main()
