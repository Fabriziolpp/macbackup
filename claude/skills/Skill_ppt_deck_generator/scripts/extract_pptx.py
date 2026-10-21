#!/usr/bin/env python3
"""Extract text, palette, and media inventory from a .pptx file.

Usage:
    python3 extract_pptx.py <path-to-pptx> [--extract-media <out-dir>]

Prints:
  - Per slide: text runs + srgbClr hex values
  - Aggregated palette ranked by frequency (neutrals filtered)
  - Aggregated neutrals
  - MEDIA inventory: every image embedded in the pptx with filename, size,
    pixel dimensions (when readable), and which slide(s) reference it

If --extract-media <out-dir> is passed, also copies each image file to
<out-dir>/<original-name> so the agent can immediately use them.
"""
import sys, re, zipfile, os, collections, tempfile, shutil, argparse, struct


def png_dims(data):
    if data[:8] == b"\x89PNG\r\n\x1a\n" and data[12:16] == b"IHDR":
        w, h = struct.unpack(">II", data[16:24])
        return w, h
    return None

def jpg_dims(data):
    i = 2
    while i < len(data) - 9:
        if data[i] != 0xFF:
            i += 1; continue
        marker = data[i + 1]
        if 0xC0 <= marker <= 0xCF and marker not in (0xC4, 0xC8, 0xCC):
            h, w = struct.unpack(">HH", data[i + 5:i + 9])
            return w, h
        seg_len = struct.unpack(">H", data[i + 2:i + 4])[0]
        i += 2 + seg_len
    return None

def img_dims(path):
    try:
        with open(path, "rb") as f:
            data = f.read(64 * 1024)
        ext = os.path.splitext(path)[1].lower()
        if ext in (".png",):
            return png_dims(data)
        if ext in (".jpg", ".jpeg"):
            return jpg_dims(data)
        if ext == ".gif":
            if data[:6] in (b"GIF87a", b"GIF89a"):
                return struct.unpack("<HH", data[6:10])
    except Exception:
        pass
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pptx")
    ap.add_argument("--extract-media", metavar="DIR", help="copy images to this folder")
    args = ap.parse_args()

    src = args.pptx
    if not os.path.exists(src):
        print(f"file not found: {src}", file=sys.stderr); sys.exit(1)

    tmp = tempfile.mkdtemp(prefix="pptx_extract_")
    try:
        with zipfile.ZipFile(src) as z:
            z.extractall(tmp)

        slide_dir = os.path.join(tmp, "ppt", "slides")
        rels_dir = os.path.join(tmp, "ppt", "slides", "_rels")
        media_dir = os.path.join(tmp, "ppt", "media")

        if not os.path.isdir(slide_dir):
            print("no slides found in pptx", file=sys.stderr); sys.exit(2)

        slides = sorted(
            (f for f in os.listdir(slide_dir) if re.match(r"slide\d+\.xml$", f)),
            key=lambda f: int(re.search(r"\d+", f).group()),
        )

        # Build slide → media map via rels files
        slide_media = collections.defaultdict(list)
        if os.path.isdir(rels_dir):
            for rels_file in os.listdir(rels_dir):
                m = re.match(r"slide(\d+)\.xml\.rels$", rels_file)
                if not m: continue
                idx = int(m.group(1))
                with open(os.path.join(rels_dir, rels_file), encoding="utf-8") as f:
                    rels_xml = f.read()
                for media_ref in re.findall(r'Target="\.\./media/([^"]+)"', rels_xml):
                    slide_media[idx].append(media_ref)

        all_colors = collections.Counter()
        for s in slides:
            path = os.path.join(slide_dir, s)
            with open(path, encoding="utf-8") as f:
                xml = f.read()
            n = int(re.search(r"\d+", s).group())
            print(f"\n=== SLIDE {n} ===")
            for t in re.findall(r"<a:t[^>]*>([^<]*)</a:t>", xml):
                t = t.strip()
                if t:
                    t = (t.replace("&amp;", "&").replace("&apos;", "'")
                          .replace("&quot;", '"').replace("&lt;", "<").replace("&gt;", ">"))
                    print(t)
            colors = set(re.findall(r'srgbClr val="([0-9A-Fa-f]{6})"', xml))
            for c in colors: all_colors[c.upper()] += 1
            if colors:
                print(f"COLORS: {sorted(colors)}")
            if slide_media.get(n):
                print(f"MEDIA: {slide_media[n]}")

        print("\n=== PALETTE (ranked, neutrals filtered) ===")
        def is_neutral(hexv):
            r, g, b = int(hexv[0:2], 16), int(hexv[2:4], 16), int(hexv[4:6], 16)
            return abs(r - g) < 12 and abs(g - b) < 12 and abs(r - b) < 12
        ranked = [(c, n) for c, n in all_colors.most_common() if not is_neutral(c)]
        for c, n in ranked[:8]:
            print(f"  #{c}  ×{n}")
        print("\n=== NEUTRALS ===")
        for c, n in [(c, n) for c, n in all_colors.most_common() if is_neutral(c)][:6]:
            print(f"  #{c}  ×{n}")

        # MEDIA INVENTORY
        print("\n=== MEDIA INVENTORY ===")
        if os.path.isdir(media_dir):
            media_files = sorted(os.listdir(media_dir))
            # Reverse lookup: media → slides
            media_used_in = collections.defaultdict(list)
            for slide_idx, mlist in slide_media.items():
                for m in mlist:
                    media_used_in[m].append(slide_idx)
            for f in media_files:
                fpath = os.path.join(media_dir, f)
                size_kb = os.path.getsize(fpath) // 1024
                dims = img_dims(fpath)
                dim_str = f"{dims[0]}×{dims[1]}" if dims else "?"
                used = media_used_in.get(f, [])
                used_str = "slides " + ",".join(str(s) for s in used) if used else "unused"
                print(f"  {f:30s}  {dim_str:>11s}  {size_kb:>6d} KB   ({used_str})")
            print(f"\nTotal: {len(media_files)} media file(s)")
        else:
            print("  (no media folder)")

        # OPTIONAL EXTRACT
        if args.extract_media and os.path.isdir(media_dir):
            out = args.extract_media
            os.makedirs(out, exist_ok=True)
            for f in os.listdir(media_dir):
                shutil.copy2(os.path.join(media_dir, f), os.path.join(out, f))
            print(f"\n✓ Extracted media to: {out}")

    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
