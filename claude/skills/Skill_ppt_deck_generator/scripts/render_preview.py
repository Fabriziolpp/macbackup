#!/usr/bin/env python3
"""
render_preview.py — render a .pptx (or .pdf) to one PNG per slide for VISUAL QA.

This is the tool that closes the generate → LOOK → fix loop. Without it the skill
ships blind. Run it after every build, then inspect the PNGs with fresh eyes and
fix real defects (overflow, overlap, low contrast, bad margins, misalignment,
leftover placeholders) before delivering.

Usage:
    python3 render_preview.py <deck.pptx|deck.pdf> [--out <dir>] [--dpi 150]

Output:
    <dir>/slide-01.png, slide-02.png, …   (default <dir> = <deck>/.preview/)

Pipeline (each step falls back to the next if a tool is missing):
    .pptx --soffice--> .pdf --(pdftoppm | pdftocairo | PyMuPDF)--> PNGs
A missing renderer is reported with the exact install hint, never a silent skip.
"""
import argparse
import os
import shutil
import subprocess
import sys
import tempfile


def find_soffice():
    for cand in (
        "soffice",
        "/opt/homebrew/bin/soffice",
        "/usr/local/bin/soffice",
        "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    ):
        p = shutil.which(cand) if os.path.basename(cand) == cand else (cand if os.path.exists(cand) else None)
        if p:
            return p
    return None


def pptx_to_pdf(pptx, workdir):
    soffice = find_soffice()
    if not soffice:
        sys.exit(
            "✗ LibreOffice (soffice) not found — cannot render slides for QA.\n"
            "  Install: brew install --cask libreoffice\n"
            "  (Also install the deck font at OS level, or the render uses a substitute face.)"
        )
    subprocess.run(
        [soffice, "--headless", "--convert-to", "pdf", "--outdir", workdir, pptx],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    pdf = os.path.join(workdir, os.path.splitext(os.path.basename(pptx))[0] + ".pdf")
    if not os.path.exists(pdf):
        sys.exit(f"✗ soffice did not produce a PDF from {pptx}")
    return pdf


def pdf_to_pngs(pdf, out_dir, dpi):
    os.makedirs(out_dir, exist_ok=True)
    stem = os.path.join(out_dir, "slide")

    if shutil.which("pdftoppm"):
        subprocess.run(["pdftoppm", "-png", "-r", str(dpi), pdf, stem], check=True)
        return _normalize_names(out_dir)
    if shutil.which("pdftocairo"):
        subprocess.run(["pdftocairo", "-png", "-r", str(dpi), pdf, stem], check=True)
        return _normalize_names(out_dir)
    try:
        import fitz  # PyMuPDF
    except ImportError:
        sys.exit(
            "✗ No PDF→PNG renderer found.\n"
            "  Install ONE of:  brew install poppler   (gives pdftoppm)\n"
            "               or  python3 -m pip install pymupdf"
        )
    doc = fitz.open(pdf)
    zoom = dpi / 72.0
    mat = fitz.Matrix(zoom, zoom)
    paths = []
    for i, page in enumerate(doc, 1):
        p = os.path.join(out_dir, f"slide-{i:02d}.png")
        page.get_pixmap(matrix=mat).save(p)
        paths.append(p)
    return paths


def _normalize_names(out_dir):
    """poppler emits slide-1.png / slide-01.png depending on version; zero-pad to slide-NN.png."""
    files = sorted(f for f in os.listdir(out_dir) if f.startswith("slide") and f.endswith(".png"))
    paths = []
    for f in files:
        num = "".join(ch for ch in f if ch.isdigit())
        if not num:
            continue
        new = f"slide-{int(num):02d}.png"
        src, dst = os.path.join(out_dir, f), os.path.join(out_dir, new)
        if src != dst:
            os.replace(src, dst)
        paths.append(dst)
    return sorted(paths)


def main():
    ap = argparse.ArgumentParser(description="Render a deck to one PNG per slide for visual QA.")
    ap.add_argument("deck", help="path to .pptx or .pdf")
    ap.add_argument("--out", help="output dir (default: <deck-dir>/.preview)")
    ap.add_argument("--dpi", type=int, default=150)
    args = ap.parse_args()

    deck = os.path.abspath(args.deck)
    if not os.path.exists(deck):
        sys.exit(f"✗ Not found: {deck}")
    out_dir = args.out or os.path.join(os.path.dirname(deck), ".preview")

    with tempfile.TemporaryDirectory() as workdir:
        pdf = deck if deck.lower().endswith(".pdf") else pptx_to_pdf(deck, workdir)
        pngs = pdf_to_pngs(pdf, out_dir, args.dpi)

    print(f"✓ {len(pngs)} slide(s) rendered to {out_dir}")
    for p in pngs:
        print(f"  {p}")


if __name__ == "__main__":
    main()
