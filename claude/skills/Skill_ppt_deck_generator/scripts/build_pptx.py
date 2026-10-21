#!/usr/bin/env python3
"""Render a deck-model + design-spec into a native .pptx (16:9).

Usage:
    python3 build_pptx.py <deck-model.json> <design-spec.json> <output.pptx>
    python3 build_pptx.py <deck-model.json> --spec-inline '{...}' <output.pptx>

The renderer is intentionally GENERIC: every visual decision (palette, fonts,
alignment, background per slide category, decoration language) comes from the
design-spec. The same deck-model rendered with two different specs must look
genuinely different — that is the whole point. See reference/deck-model.md and
reference/design-spec.md for the two contracts.

It NEVER invents text. Missing fields are simply skipped (mirrors the SKILL.md
hard rule "never invent placeholder text").

Dependencies: python-pptx (pip install python-pptx).
"""
import sys, json, os, argparse, re

try:
    from pptx import Presentation
    from pptx.util import Inches, Pt, Emu
    from pptx.dml.color import RGBColor
    from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
    from pptx.enum.shapes import MSO_SHAPE
    from pptx.oxml.ns import qn
except ImportError:
    sys.exit("python-pptx not installed. Run: pip3 install python-pptx")

# reusable signature-component catalog (fidelity mode); same dir as this script
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    import style_components as sc
except ImportError:
    sc = None


# ── geometry (16:9, EMU) ────────────────────────────────────────────────
EMU_PER_IN = 914400
SLIDE_W_IN = 13.333
SLIDE_H_IN = 7.5


def hex_to_rgb(h):
    h = (h or "#000000").lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def mix(h1, h2, t):
    """Linear blend of two hex colors, t in [0,1]."""
    a = hex_to_rgb(h1); b = hex_to_rgb(h2)
    r = int(a[0] + (b[0] - a[0]) * t)
    g = int(a[1] + (b[1] - a[1]) * t)
    bl = int(a[2] + (b[2] - a[2]) * t)
    return RGBColor(r, g, bl)


DEFAULT_SPEC = {
    "name": "fallback",
    "fonts": {"heading": "Inter", "body": "Inter", "accent_italic": True},
    "palette": {
        "brand1": "#A100FF", "brand2": "#7500C0", "brand3": "#460073",
        "dark": "#120A1C", "soft1": "#E6DCFF", "soft2": "#C2A3FF",
        "ink": "#0A0410", "gray": "#818180", "paper": "#FFFFFF",
    },
    "layout": {"align": "left", "radius": 18, "dark_dividers": True},
    "decoration": "orbs",
}


class Renderer:
    def __init__(self, model, spec, style=None, style_dir="."):
        self.model = model
        self.spec = spec
        # fidelity mode: a reference "style pack" (assets + component mapping)
        self.style = style or {}
        self.style_dir = style_dir
        self.pal = {**DEFAULT_SPEC["palette"], **spec.get("palette", {})}
        self.fonts = {**DEFAULT_SPEC["fonts"], **spec.get("fonts", {})}
        self.layout = {**DEFAULT_SPEC["layout"], **spec.get("layout", {})}
        self.decoration = spec.get("decoration", DEFAULT_SPEC["decoration"])
        # mode: "light" (white covers/dividers, Song-style) or "dark" (default)
        self.mode = self.layout.get("mode", "dark")
        self.align_left = self.layout.get("align", "left") != "center"
        # light tints for text on dark backgrounds, derived from the spec palette
        self.dim = mix_hex(self.pal["soft2"], "#FFFFFF", 0.55)   # subtitles
        self.mute = self.pal["soft2"]                             # labels/captions

        self.prs = Presentation()
        self.prs.slide_width = Emu(int(SLIDE_W_IN * EMU_PER_IN))
        self.prs.slide_height = Emu(int(SLIDE_H_IN * EMU_PER_IN))
        self.blank = self.prs.slide_layouts[6]
        # where media lives (relative paths in the model resolve against this)
        self.base_dir = model.get("_base_dir", ".")

    # ── low-level primitives ────────────────────────────────────────────
    def _slide(self):
        return self.prs.slides.add_slide(self.blank)

    def _bg(self, slide, hexcolor):
        fill = slide.background.fill
        fill.solid()
        fill.fore_color.rgb = hex_to_rgb(hexcolor)

    def _rect(self, slide, x, y, w, h, hexcolor, line=None):
        shp = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE,
                                     Inches(x), Inches(y), Inches(w), Inches(h))
        shp.fill.solid()
        shp.fill.fore_color.rgb = hex_to_rgb(hexcolor)
        if line:
            shp.line.color.rgb = hex_to_rgb(line)
            shp.line.width = Pt(1)
        else:
            shp.line.fill.background()
        shp.shadow.inherit = False
        return shp

    def _orb(self, slide, x, y, d, hexcolor):
        """A soft tonal circle used as background decoration (decoration='orbs')."""
        shp = slide.shapes.add_shape(MSO_SHAPE.OVAL,
                                     Inches(x), Inches(y), Inches(d), Inches(d))
        shp.fill.solid()
        shp.fill.fore_color.rgb = hex_to_rgb(hexcolor)
        shp.line.fill.background()
        shp.shadow.inherit = False
        # softens the orb so it reads as a glow, not a hard disc
        self._set_alpha(shp.fill.fore_color, 30)
        return shp

    def _set_alpha(self, color, pct):
        """Set fill transparency: pct = opacity percent (0-100)."""
        srgb = color._xFill.find(qn('a:srgbClr'))
        if srgb is None:
            return
        alpha = srgb.makeelement(qn('a:alpha'), {'val': str(int(pct * 1000))})
        srgb.append(alpha)

    def _text(self, slide, x, y, w, h, runs, *, size, color, bold=False,
              italic=False, font=None, align=None, anchor=MSO_ANCHOR.TOP,
              spacing=None, line_spacing=1.05, upper=False, letter=None):
        """runs: a string, or a list of (text, override_dict) tuples."""
        tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.vertical_anchor = anchor
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        if isinstance(runs, str):
            runs = [(runs, {})]

        def style_para(p):
            if align:
                p.alignment = align
            if line_spacing:
                p.line_spacing = line_spacing
            if spacing:
                p.space_after = Pt(spacing)

        p = tf.paragraphs[0]
        style_para(p)
        for txt, ov in runs:
            if txt is None:
                continue
            # split on newlines → real paragraphs (PowerPoint-safe line breaks)
            segments = txt.split("\n")
            for si, seg in enumerate(segments):
                if si > 0:
                    p = tf.add_paragraph()
                    style_para(p)
                r = p.add_run()
                r.text = seg.upper() if upper else seg
                f = r.font
                f.size = Pt(ov.get("size", size))
                f.bold = ov.get("bold", bold)
                f.italic = ov.get("italic", italic)
                f.name = ov.get("font", font or self.fonts["body"])
                f.color.rgb = hex_to_rgb(ov.get("color", color))
                ls = ov.get("letter", letter)
                if ls is not None:
                    self._letter_spacing(r, ls)
        return tb

    def _letter_spacing(self, run, pts):
        run.font._rPr.set('spc', str(int(pts * 100)))

    def _eyebrow(self, slide, x, y, text, *, dark):
        if not text:
            return y
        col = self.pal["soft2"] if dark else self.pal["brand1"]
        # accent rule + label, the signature "eyebrow"
        self._rect(slide, x, y + 0.08, 0.33, 0.018, col)
        self._text(slide, x + 0.45, y - 0.05, 8, 0.3, text,
                   size=11, color=col, bold=True, upper=True, letter=2.2,
                   font=self.fonts["body"])
        return y + 0.45

    # ── decoration dispatch (varies the whole feel of the deck) ──────────
    def _decorate(self, slide, dark):
        d = self.decoration
        if d == "orbs":
            self._orb(slide, 9.4, -1.2, 5.0, self.pal["brand1"])
            self._orb(slide, -1.6, 4.8, 4.2, self.pal["brand3"])
        elif d == "blocks":
            self._rect(slide, 0, 0, 0.28, SLIDE_H_IN, self.pal["brand1"])
        elif d == "lines":
            self._rect(slide, 0.9, 1.05, 11.5, 0.012,
                       self.pal["soft2"] if dark else self.pal["soft1"])
        elif d == "dots":
            for i in range(6):
                self._orb(slide, 11.8 + (i % 3) * 0.0, 0.6 + i * 0.18, 0.07,
                          self.pal["brand1"])
        elif d == "bar":
            pass  # the deconstructed bar is drawn under titles, not as a bg motif

    def _decon_bar(self, slide, x, y, *, on_dark, width=5.2):
        """ACN SONG signature: 5-segment purple bar, decreasing widths.
        Colors light→dark (on dark: first segment white)."""
        segs = [0.345, 0.268, 0.211, 0.134, 0.077]  # proportions of total width
        cols_light = ["#E6DCFF", "#C2A3FF", "#A100FF", "#7500C0", "#460073"]
        cols_dark = ["#FFFFFF", "#C2A3FF", "#A100FF", "#7500C0", "#460073"]
        cols = cols_dark if on_dark else cols_light
        gap = 0.16
        cx = x
        for w_frac, col in zip(segs, cols):
            w = width * w_frac
            self._rect(slide, cx, y, w, 0.045, col)
            cx += w + gap

    # ── footer (page number) shared by content slides ───────────────────
    def _footer(self, slide, idx, dark):
        fmot = self._motif("footer")
        col = "#FFFFFF" if dark else self.pal["gray"]
        # right-edge dot-navigation rail (Dark motif), active dot = current slide
        if self._motif("nav_rail") and getattr(self, "total", 0) <= 14:
            n = self.total
            y0, span = 2.2, 3.1
            inactive = "#4B5563" if dark else "#D5D0DE"
            for k in range(n):
                yy = y0 + (span * (k / max(1, n - 1)))
                self._orb_solid(slide, 12.95, yy, 0.09,
                                self.pal["brand1"] if (k + 1) == idx else inactive)
        if sc and fmot == "chevron":
            sc.chevron(slide, 0.95, 6.82, self.pal["brand1"], self.fonts["heading"], size=20)
        elif fmot in ("co-brand-lockup", "song", "case-study"):
            # de-mix: per-reference footer text (Canvas co-brand / Essential Song / Dark case-study)
            txt = (self.style.get("motifs") or {}).get("footer_text") or (
                "Accenture Song" if fmot == "song" else "Accenture Song")
            self._text(slide, 0.95, 6.95, 7, 0.35, txt, size=10, color=col,
                       font=self.fonts["body"])
        self._text(slide, 11.6, 6.95, 1.5, 0.35,
                   f"{idx:02d} / {self.total:02d}",
                   size=10, color=col, align=PP_ALIGN.RIGHT,
                   font=self.fonts["body"])
        self._set_text_alpha(slide, 55)

    def _set_text_alpha(self, slide, pct):
        pass  # placeholder; footer color already muted

    # ── slide types ─────────────────────────────────────────────────────
    def cover(self, s, idx):
        # Fidelity mode: reuse the reference's real cover asset (e.g. Premium blade bg).
        cov = self.style.get("cover") if self.style else None
        if sc and cov and cov.get("asset") and os.path.exists(self._asset(cov["asset"])):
            sl = self._slide()
            # base fill first (matters when the asset is a transparent overlay, e.g. a ring-arc)
            self._bg(sl, cov.get("bg_color", self.pal["paper"] if self.layout.get("mode") == "light" else self.pal["dark"]))
            sc.fullbleed_image(sl, self._asset(cov["asset"]))
            if cov.get("scrim"):
                sc.scrim(sl, cov.get("scrim_color", self.pal["dark"]), cov["scrim"])
            x = 0.95
            tcol = cov.get("title_color", "#FFFFFF")
            acc = cov.get("accent_color", self.pal["soft2"])
            if s.get("kicker"):
                self._text(sl, x, 1.35, 8.6, 0.4, s["kicker"], size=13,
                           color=cov.get("kicker_color", acc), letter=0.5,
                           font=self.fonts["body"])
            title = s.get("title", ""); accent = s.get("title_accent", "")
            if accent and self._accent_word():
                runs = [(title + "  ", {}), (accent, {"color": acc,
                        "italic": self.fonts.get("accent_italic", False),
                        "font": self.fonts.get("accent", self.fonts["heading"])})]
            else:
                runs = [((title + " " + accent).strip() if accent else title, {})]
            # bottom-anchored so a 1- to 3-line title grows upward and never
            # collides with the subtitle below.
            self._text(sl, x, 1.7, 8.9, 2.75, runs, size=52, color=tcol,
                       font=self.fonts["heading"], line_spacing=1.0,
                       anchor=MSO_ANCHOR.BOTTOM)
            if s.get("subtitle"):
                self._text(sl, x, 4.85, 7.9, 1.2, s["subtitle"], size=15,
                           color=cov.get("sub_color", "#EDE3FF"), line_spacing=1.4,
                           font=self.fonts["body"])
            meta = s.get("meta", [])
            if meta:
                mx = x
                for m in meta[:3]:
                    self._text(sl, mx, 6.5, 3.1, 0.7,
                               [(m.get("label", ""), {"size": 10, "color": cov.get("sub_color", "#CDB8FF")}),
                                ("\n" + m.get("value", ""), {"size": 13, "color": tcol, "bold": True})],
                               size=10, color=tcol, font=self.fonts["body"], line_spacing=1.3)
                    mx += 3.3
            return
        # Song (decoration "bar") keeps a DARK cover even in light mode (matches FY26 master).
        light = self.mode == "light" and self.decoration != "bar"
        sl = self._slide()
        self._bg(sl, self.pal["paper"] if light else self.pal["dark"])
        tcol = self.pal["ink"] if light else "#FFFFFF"
        if not light and self.decoration == "orbs":
            self._orb(sl, 8.6, -1.6, 6.2, self.pal["brand1"])
            self._orb(sl, -2.0, 4.2, 5.4, self.pal["brand3"])
            self._orb(sl, 5.0, 3.0, 3.0, self.pal["soft2"])
        elif not light:
            self._decorate(sl, dark=True)
        x = 0.95
        if s.get("kicker"):
            self._text(sl, x, 1.7, 8, 0.3, s["kicker"],
                       size=12, color=self.pal["brand1"], upper=False, letter=0.5,
                       font=self.fonts["body"])
        title = s.get("title", "")
        accent = s.get("title_accent", "")
        runs = [(title, {})]
        if accent:
            runs = [(title + "  ", {}),
                    (accent, {"italic": self.fonts.get("accent_italic", True),
                              "color": self.pal["brand1"] if light else self.pal["soft2"],
                              "font": self.fonts.get("accent", self.fonts["heading"])})]
        self._text(sl, x, 2.4, 11.2, 2.6, runs, size=60, color=tcol,
                   font=self.fonts["heading"], line_spacing=0.98)
        # deconstructed bar (Song signature) when decoration == "bar"
        if self.decoration == "bar":
            self._decon_bar(sl, x, 4.85, on_dark=not light)
        if s.get("subtitle"):
            self._text(sl, x, 5.2, 9.0, 1.0, s["subtitle"], size=15,
                       color=self.pal["gray"] if light else self.dim,
                       line_spacing=1.45, font=self.fonts["body"])
        meta = s.get("meta", [])
        if meta:
            mx = x
            for m in meta[:3]:
                self._text(sl, mx, 6.35, 3.2, 0.7,
                           [(m.get("label", ""), {"size": 10, "color": self.pal["gray"] if light else self.mute}),
                            ("\n" + m.get("value", ""), {"size": 13, "color": tcol, "bold": True})],
                           size=10, color=tcol, upper=False,
                           font=self.fonts["body"], line_spacing=1.3)
                mx += 3.3

    def thank_you(self, s, idx):
        if self._content_skin():
            # Fidelity closing: reference asset (dark, e.g. Dark spacecraft) or a full
            # Song-purple field; always Song colours.
            sk = self._skin(); dark = self.layout.get("mode") == "dark"
            cl = self.style.get("closing") or {}
            sl = self._slide()
            asset = self._asset(cl.get("asset")) if cl.get("asset") else None
            if sc and asset and os.path.exists(asset):
                sc.fullbleed_image(sl, asset)
                sc.scrim(sl, cl.get("bg_color", self.pal["dark"]), 66)
                tcol, subcol = "#FFFFFF", "#C2A3FF"
            else:
                self._bg(sl, sk["statement_bg"])
                tcol = sk["statement_ink"]; subcol = sk["accent"] if dark else "#E9DEFF"
            x = 0.95
            self._text(sl, x, 2.2, 12, 2.2, s.get("title", "Grazie."), size=92,
                       color=tcol, font=self.fonts["heading"], anchor=MSO_ANCHOR.BOTTOM,
                       line_spacing=1.0)
            if s.get("name"):
                self._text(sl, x, 4.9, 12, 0.6, s["name"], size=18, color=tcol,
                           font=self.fonts["body"])
            if s.get("tagline"):
                self._text(sl, x, 5.5, 12, 0.5, s["tagline"], size=11, color=subcol,
                           upper=True, letter=2.0, font=self.fonts["body"])
            return
        light = self.mode == "light"
        sl = self._slide()
        if light:
            # Song closing: full purple punctuation, white text + bar, left-aligned
            self._bg(sl, self.pal["brand1"])
            self._text(sl, 0.95, 2.2, 12, 2.0, s.get("title", "Thank you."),
                       size=96, color="#FFFFFF", font=self.fonts["heading"],
                       anchor=MSO_ANCHOR.BOTTOM, line_spacing=1.0)
            self._decon_bar(sl, 0.95, 4.5, on_dark=True)
            if s.get("name"):
                self._text(sl, 0.95, 4.85, 12, 0.6, s["name"], size=18,
                           color="#FFFFFF", font=self.fonts["body"])
            if s.get("tagline"):
                self._text(sl, 0.95, 5.4, 12, 0.5, s["tagline"], size=11,
                           color="#E6DCFF", upper=True, letter=2.0, font=self.fonts["body"])
            return
        self._bg(sl, self.pal["dark"])
        self._decorate(sl, dark=True)
        self._text(sl, 0.5, 2.3, 12.3, 2.0, s.get("title", "Thank you."),
                   size=92, color=self.pal["soft2"], italic=self.fonts.get("accent_italic", True),
                   font=self.fonts["heading"], align=PP_ALIGN.CENTER,
                   anchor=MSO_ANCHOR.MIDDLE, line_spacing=1.0)
        if s.get("name"):
            self._text(sl, 0.5, 4.6, 12.3, 0.6, s["name"], size=20,
                       color="#FFFFFF", align=PP_ALIGN.CENTER, font=self.fonts["body"])
        if s.get("tagline"):
            self._text(sl, 0.5, 5.3, 12.3, 0.5, s["tagline"], size=12,
                       color=self.mute, align=PP_ALIGN.CENTER, upper=True,
                       letter=2.0, font=self.fonts["body"])

    def divider(self, s, idx):
        # Fidelity mode: reference blade background + dark scrim (Premium dark section opener).
        dv = self.style.get("divider") if self.style else None
        if sc and dv and dv.get("asset") and os.path.exists(self._asset(dv["asset"])):
            sl = self._slide()
            sc.fullbleed_image(sl, self._asset(dv["asset"]))
            sc.scrim(sl, dv.get("scrim_color", self.pal["dark"]), dv.get("scrim", 55))
            x = 0.95
            if s.get("num"):
                self._text(sl, x, 2.7, 6, 0.6, s["num"], size=26,
                           color="#D9CCFF", font=self.fonts["body"])
            title = s.get("title", ""); accent = s.get("title_accent", "")
            runs = self._hruns(title, accent, dv.get("accent_color", self.pal["soft2"]))
            # keep the title in the clear left zone (blades occupy the right side):
            # narrow box → long titles wrap upward instead of crossing the blades.
            self._text(sl, x, 3.1, 8.6, 2.0, runs, size=54, color="#FFFFFF",
                       font=self.fonts["heading"], line_spacing=1.0, anchor=MSO_ANCHOR.BOTTOM)
            return
        if sc and dv and dv.get("fill"):
            # solid-colour field divider (e.g. Canvas blue / mint), no image
            sl = self._slide()
            fills = [dv["fill"]] + ([dv["fill_alt"]] if dv.get("fill_alt") else [])
            try:
                fi = int(re.sub(r"\D", "", s.get("num", "") or "0")) % len(fills)
            except Exception:
                fi = 0
            self._bg(sl, fills[fi])
            x = 0.95
            tcol = dv.get("title_color", "#FFFFFF")
            if dv.get("ghost_number") and s.get("num"):
                self._text(sl, 6.6, 0.2, 6.4, 7.1, s["num"], size=360,
                           color=mix_hex(fills[fi], "#FFFFFF", 0.13),
                           font=self.fonts["heading"], align=PP_ALIGN.RIGHT,
                           anchor=MSO_ANCHOR.MIDDLE, line_spacing=0.8)
            if s.get("num"):
                self._text(sl, x, 1.2, 6, 0.7, s["num"], size=26, color=tcol,
                           font=self.fonts["body"])
            title = s.get("title", ""); accent = s.get("title_accent", "")
            runs = [(title, {})] if not accent else [(title + " ", {}),
                    (accent, {"color": dv.get("accent_color", tcol)})]
            self._text(sl, x, 3.1, 11.4, 2.0, runs, size=54, color=tcol,
                       font=self.fonts["heading"], line_spacing=1.0, anchor=MSO_ANCHOR.BOTTOM)
            return
        bar = self.decoration == "bar"
        # Song master dividers are dark by default (FY26 template p.34); overridable.
        dark = self.layout.get("dark_dividers", True)
        sl = self._slide()
        self._bg(sl, self.pal["dark"] if dark else self.pal["paper"])
        if not bar:
            self._decorate(sl, dark=dark)
        tcol = "#FFFFFF" if dark else self.pal["ink"]
        x = 0.95
        title = s.get("title", "")
        accent = s.get("title_accent", "")
        if bar:
            # Song section divider: gray number, big headline, deconstructed bar.
            # Title box is BOTTOM-anchored just above the bar so a 1- or 2-line title
            # grows upward and never collides with the deconstructed bar.
            if s.get("num"):
                self._text(sl, x, 2.7, 6, 0.6, s["num"], size=26,
                           color="#CFCFCF" if not dark else self.pal["gray"],
                           font=self.fonts["body"])
            runs = [(title, {})]
            if accent:
                runs = [(title + " ", {}),
                        (accent, {"color": self.pal["brand1"]})]
            self._text(sl, x, 3.25, 11.4, 1.85, runs, size=60, color=tcol,
                       font=self.fonts["heading"], line_spacing=1.0,
                       anchor=MSO_ANCHOR.BOTTOM)
            self._decon_bar(sl, x, 5.45, on_dark=dark)
            return
        self._eyebrow(sl, x, 1.0, s.get("eyebrow", ""), dark=dark)
        if s.get("num"):
            self._text(sl, x - 0.1, 1.6, 7, 2.6, s["num"], size=200,
                       color=self.pal["brand1"], italic=True,
                       font=self.fonts["heading"], line_spacing=0.8)
        runs = [(title, {})]
        if accent:
            runs = [(title + " ", {}),
                    (accent, {"italic": True, "color": self.pal["soft2"] if dark else self.pal["brand1"]})]
        self._text(sl, x, 4.7, 11.0, 1.8, runs, size=52, color=tcol,
                   font=self.fonts["heading"], line_spacing=1.0)

    def quote(self, s, idx):
        if self._content_skin():
            # Statement: one bold sentence on a full colour field (purple for Premium,
            # near-black for a dark reference like Dark).
            sk = self._skin()
            dark = self.layout.get("mode") == "dark"
            sl = self._slide()
            self._bg(sl, sk["statement_bg"])
            x = 0.95
            sub_col = sk["accent"] if dark else "#E9DEFF"
            _, label = self._split_eyebrow(s.get("eyebrow", ""))
            if label:
                self._text(sl, x, 1.15, 9, 0.4, label, size=11, color=sub_col,
                           bold=True, upper=True, letter=1.8, font=self.fonts["body"])
            text = s.get("text", ""); acc = s.get("text_accent", "")
            runs = [(text, {})] if not acc else [(text + " ", {}), (acc, {"color": sk["statement_accent"]})]
            self._text(sl, x, 2.5, 11.0, 3.0, runs, size=40, color=sk["statement_ink"],
                       font=self.fonts["heading"], line_spacing=1.15, anchor=MSO_ANCHOR.MIDDLE)
            if s.get("attribution"):
                self._text(sl, x, 5.9, 10, 0.5, "— " + s["attribution"], size=14,
                           color=sub_col, font=self.fonts["body"])
            self._footer(sl, idx, dark=True)
            return
        sl = self._slide()
        self._bg(sl, self.pal["dark"])
        self._decorate(sl, dark=True)
        x = 1.2
        self._eyebrow(sl, x, 1.1, s.get("eyebrow", ""), dark=True)
        self._text(sl, x - 0.2, 1.0, 3, 2.5, "”", size=200,
                   color=self.pal["brand1"], italic=True, font=self.fonts["heading"])
        self._text(sl, x, 2.6, 11.0, 3.2, s.get("text", ""), size=40,
                   color="#FFFFFF", font=self.fonts["heading"], line_spacing=1.15,
                   anchor=MSO_ANCHOR.MIDDLE)
        if s.get("attribution"):
            self._text(sl, x, 6.2, 10, 0.5, "— " + s["attribution"], size=14,
                       color=self.mute, font=self.fonts["body"])
        self._footer(sl, idx, dark=True)

    def agenda(self, s, idx):
        dv = (self.style.get("divider") or {}) if self.style else {}
        if self._content_skin() and dv.get("asset") and os.path.exists(self._asset(dv["asset"])):
            # Premium index: dark blade bg, "Indice", numbered list with accent numbers.
            sl = self._slide()
            sc.fullbleed_image(sl, self._asset(dv["asset"]))
            sc.scrim(sl, dv.get("scrim_color", self.pal["dark"]), 66)
            x = 0.95
            self._text(sl, x, 1.1, 8, 0.8, s.get("headline", "Indice"), size=40,
                       color="#FFFFFF", font=self.fonts["heading"])
            items = s.get("items", [])
            iy = 2.7
            step = min(0.72, 3.9 / max(1, len(items)))
            for i, it in enumerate(items):
                num = it.get("num", f"{i+1:02d}")
                # light Song purple (readable on dark art; pal.soft2 can be a dark card colour)
                runs = [(num + "/ ", {"color": "#C2A3FF"}),
                        (it.get("title", ""), {"color": "#FFFFFF"})]
                self._text(sl, x, iy, 11.0, step, runs, size=22,
                           color="#FFFFFF", font=self.fonts["heading"], line_spacing=1.0)
                iy += step
            return
        self._cards_slide(s, idx, s.get("items", []), kind="agenda")

    def pillars(self, s, idx):
        self._cards_slide(s, idx, s.get("items", []), kind="pillars")

    def focus(self, s, idx):
        self._cards_slide(s, idx, s.get("items", []), kind="focus")

    def _cards_slide(self, s, idx, items, kind):
        sl = self._slide()
        x = 0.95
        if self._content_skin():
            sk = self._skin()
            self._bg(sl, sk["bg"])
            self._content_eyebrow(sl, s, sk)
            hl = s.get("headline", ""); acc = s.get("headline_accent", "")
            runs = self._hruns(hl, acc, sk["accent"])
            if hl:
                self._text(sl, x, 1.95, 11.4, 0.9, runs, size=32, color=sk["ink"],
                           font=self.fonts["heading"], line_spacing=1.02)
        else:
            self._bg(sl, self.pal["paper"])
            self._decorate(sl, dark=False)
            y = self._eyebrow(sl, x, 0.75, s.get("eyebrow", kind.title()), dark=False)
            if s.get("headline"):
                self._text(sl, x, y + 0.05, 11.4, 1.2, s["headline"], size=36,
                           color=self.pal["ink"], font=self.fonts["heading"], line_spacing=1.02)
        items = items or []
        n = max(1, len(items))
        # Fidelity: pillars/focus become a purple-gradient BENTO grid (Premium signature).
        if self._content_skin() and kind in ("pillars", "focus"):
            self._bento_grid(sl, x, items)
        # ≤3 items → a row of cards (each card has room for num+title+desc).
        # ≥4 items → a full-width numbered list; card grids can't fit 4+ items
        # with real descriptions without clipping off the bottom of the slide.
        elif n <= 3 and kind != "agenda":
            self._cards_row(sl, x, items)
        elif kind == "agenda":
            self._cards_row(sl, x, items, agenda=True)
        else:
            self._numbered_list(sl, x, items)
        self._footer(sl, idx, dark=False)

    def _bento_grid(self, sl, x, items):
        """Bento tiles (num + short title + short desc). Needs SHORT desc."""
        sk = self._skin()
        n = max(1, len(items))
        cols = 2 if n == 4 else 3
        rows = (n + cols - 1) // cols
        gap = 0.28
        top, bottom = 2.75, 6.7
        cw = (11.4 - gap * (cols - 1)) / cols
        ch = min(2.6, (bottom - top - gap * (rows - 1)) / rows)
        for i, it in enumerate(items):
            col, row = i % cols, i // cols
            cx = x + col * (cw + gap)
            cy = top + row * (ch + gap)
            sc.rounded_card(sl, cx, cy, cw, ch, fill1=sk["card1"], fill2=sk["card2"],
                            radius=0.07, line=(sk["accent"] if it.get("featured") else None))
            num = it.get("num", f"{i+1:02d}")
            self._text(sl, cx + 0.28, cy + 0.2, cw - 0.56, 0.55, num, size=24,
                       color=sk["card_num"], italic=True, font=self.fonts["heading"])
            stt = it.get("status")
            if stt in ("ok", "no"):
                self._text(sl, cx + cw - 0.62, cy + 0.18, 0.5, 0.4,
                           "✓" if stt == "ok" else "✗", size=17,
                           color=sk["accent"] if stt == "ok" else sk["card_body"],
                           bold=True, align=PP_ALIGN.RIGHT, font=self.fonts["body"])
            self._text(sl, cx + 0.28, cy + 0.78, cw - 0.56, 0.7, it.get("title", ""),
                       size=15, color=sk["card_ink"], bold=True, font=self.fonts["body"],
                       line_spacing=1.06)
            if it.get("desc"):
                self._text(sl, cx + 0.28, cy + ch - 0.72, cw - 0.56, 0.62, it["desc"],
                           size=11, color=sk["card_body"], font=self.fonts["body"], line_spacing=1.2)

    def _cards_row(self, sl, x, items, agenda=False):
        cols = max(1, len(items))
        gap = 0.25
        top = 2.85
        card_h = 3.5
        total_w = 11.4
        cw = (total_w - gap * (cols - 1)) / cols
        gradient_cards = sc and (self.style.get("cards") == "rounded-gradient")
        for i, it in enumerate(items):
            cx = x + i * (cw + gap)
            if gradient_cards:
                sc.rounded_card(sl, cx, top, cw, card_h, fill1=self.pal["brand2"],
                                fill2=self.pal["brand3"], radius=0.06)
                num_col, title_col, desc_col = "#FFFFFF", "#FFFFFF", "#E6DCFF"
            else:
                self._rect(sl, cx, top, cw, card_h, "#FFFFFF",
                           line=mix_hex(self.pal["soft1"], "#FFFFFF", 0.3))
                num_col, title_col, desc_col = self.pal["brand1"], self.pal["ink"], self.pal["gray"]
            num = it.get("num", f"{i+1:02d}")
            self._text(sl, cx + 0.25, top + 0.25, cw - 0.5, 0.9, num, size=40,
                       color=num_col, italic=True, font=self.fonts["heading"])
            self._text(sl, cx + 0.25, top + 1.2, cw - 0.5, 0.9, it.get("title", ""),
                       size=18, color=title_col, bold=True, font=self.fonts["body"],
                       line_spacing=1.1)
            if it.get("desc"):
                self._text(sl, cx + 0.25, top + 2.05, cw - 0.5, card_h - 2.2,
                           it["desc"], size=12, color=desc_col,
                           font=self.fonts["body"], line_spacing=1.35)

    def _numbered_list(self, sl, x, items):
        """Full-width numbered rows (accent number + bold title + inline desc).
        Fits 4-6 items with descriptions cleanly, no clipping."""
        top = 2.7
        bottom = 6.75
        n = max(1, len(items))
        row_h = min(0.95, (bottom - top) / n)
        for i, it in enumerate(items):
            ry = top + i * row_h
            if i > 0:
                self._rect(sl, x, ry - 0.01, 11.4, 0.012,
                           mix_hex(self.pal["soft1"], "#FFFFFF", 0.2))
            num = it.get("num", f"{i+1:02d}")
            self._text(sl, x, ry, 0.95, row_h, num, size=24,
                       color=self.pal["brand1"], italic=True, font=self.fonts["heading"],
                       anchor=MSO_ANCHOR.MIDDLE)
            runs = [(it.get("title", ""), {"size": 16, "bold": True, "color": self.pal["ink"]})]
            if it.get("desc"):
                runs.append(("     " + it["desc"], {"size": 13, "color": self.pal["gray"]}))
            self._text(sl, x + 1.05, ry, 10.3, row_h, runs, size=16,
                       color=self.pal["ink"], font=self.fonts["body"],
                       line_spacing=1.15, anchor=MSO_ANCHOR.MIDDLE)

    def context(self, s, idx):
        if self._content_skin():
            return self._content_fidelity(s, idx)
        sl = self._slide()
        self._bg(sl, self.pal["paper"])
        self._decorate(sl, dark=False)
        x = 0.95
        self._eyebrow(sl, x, 1.3, s.get("eyebrow", ""), dark=False)
        self._text(sl, x, 1.8, 5.0, 4.0, s.get("headline", ""), size=40,
                   color=self.pal["ink"], font=self.fonts["heading"],
                   line_spacing=1.02, anchor=MSO_ANCHOR.MIDDLE)
        body = s.get("body", [])
        if isinstance(body, str):
            body = [body]
        text = "\n\n".join(body)
        self._text(sl, 6.5, 1.8, 5.9, 4.0, text, size=15, color=self.pal["ink"],
                   font=self.fonts["body"], line_spacing=1.5, anchor=MSO_ANCHOR.MIDDLE)
        self._footer(sl, idx, dark=False)

    def metrics(self, s, idx):
        if self._content_skin():
            sk = self._skin(); dark = self.layout.get("mode") == "dark"
            sl = self._slide(); self._bg(sl, sk["bg"]); x = 0.95
            self._content_eyebrow(sl, s, sk)
            hl = s.get("headline", ""); acc = s.get("headline_accent", "")
            hruns = self._hruns(hl, acc, sk["accent"])
            if hl:
                self._text(sl, x, 1.9, 11.4, 0.9, hruns, size=30, color=sk["ink"],
                           font=self.fonts["heading"], line_spacing=1.02)
            mets = s.get("metrics", [])
            if len(mets) == 1:
                m = mets[0]
                val = str(m.get("value", ""))
                if sc and m.get("ring") is not None:
                    # big-stat as a donut GAUGE (Premium s5/s41): arc filled to ring%
                    try:
                        pct = max(0.0, min(100.0, float(re.sub(r"[^0-9.\-]", "", str(m["ring"])) or 0)))
                    except Exception:
                        pct = 0.0
                    track = sk["card1"] if dark else self.pal["soft1"]
                    gen = os.path.join(self.base_dir, "_gen"); os.makedirs(gen, exist_ok=True)
                    gp = os.path.join(gen, f"gauge_{idx}.png")
                    try:
                        sc.make_donut(gp, [pct, max(0.001, 100 - pct)], [sk["accent"], track], hole=0.64)
                        sl.shapes.add_picture(gp, Inches(1.0), Inches(2.6), Inches(3.6), Inches(3.6))
                    except Exception:
                        pass
                    self._text(sl, 1.0, 3.85, 3.6, 1.0, val, size=48, color=sk["ink"],
                               bold=True, align=PP_ALIGN.CENTER, font=self.fonts["heading"])
                    self._text(sl, 5.3, 3.0, 6.3, 0.8, m.get("title", ""), size=20,
                               color=sk["ink"], bold=True, font=self.fonts["body"], line_spacing=1.1)
                    if m.get("desc"):
                        self._text(sl, 5.3, 3.9, 6.3, 2.4, m["desc"], size=15,
                                   color=sk["body"], font=self.fonts["body"], line_spacing=1.45)
                else:
                    vsz = 128 if len(val) <= 4 else (88 if len(val) <= 8 else 62)
                    self._text(sl, x, 2.7, 11.4, 2.0, val, size=vsz, color=sk["accent"],
                               font=self.fonts["heading"], line_spacing=0.9)
                    self._text(sl, x, 4.8, 8.4, 0.7, m.get("title", ""), size=20,
                               color=sk["ink"], bold=True, font=self.fonts["body"], line_spacing=1.1)
                    if m.get("desc"):
                        self._text(sl, x, 5.5, 8.8, 1.4, m["desc"], size=15,
                                   color=sk["body"], font=self.fonts["body"], line_spacing=1.45)
            else:
                n = len(mets); cols = min(n, 4)
                gap = 0.3; cw = (11.4 - gap * (cols - 1)) / cols
                top = 3.1
                for i, m in enumerate(mets[:4]):
                    cx = x + i * (cw + gap)
                    self._text(sl, cx, top, cw, 1.3, str(m.get("value", "")), size=62,
                               color=sk["accent"], font=self.fonts["heading"], line_spacing=0.95)
                    self._text(sl, cx, top + 1.45, cw, 1.4,
                               [(m.get("title", ""), {"size": 14, "bold": True, "color": sk["ink"]}),
                                ("\n" + m.get("desc", ""), {"size": 11, "color": sk["body"]})],
                               size=14, color=sk["ink"], font=self.fonts["body"], line_spacing=1.25)
            self._footer(sl, idx, dark=dark)
            return
        sl = self._slide()
        self._bg(sl, self.pal["paper"])
        self._decorate(sl, dark=False)
        x = 0.95
        self._eyebrow(sl, x, 1.2, s.get("eyebrow", ""), dark=False)
        self._text(sl, x, 1.7, 5.2, 4.0, s.get("headline", ""), size=44,
                   color=self.pal["ink"], font=self.fonts["heading"], line_spacing=1.0)
        if s.get("intro"):
            self._text(sl, x, 5.0, 5.0, 1.5, s["intro"], size=14,
                       color=self.pal["gray"], font=self.fonts["body"], line_spacing=1.45)
        mets = s.get("metrics", [])
        my = 1.7
        for m in mets[:3]:
            self._rect(sl, 6.6, my, 5.8, 1.45, mix_hex(self.pal["soft1"], "#FFFFFF", 0.45))
            self._text(sl, 6.85, my + 0.1, 2.0, 1.25, m.get("value", ""), size=54,
                       color=self.pal["brand1"], italic=True, font=self.fonts["heading"],
                       anchor=MSO_ANCHOR.MIDDLE)
            self._text(sl, 9.0, my + 0.2, 3.2, 1.1,
                       [(m.get("title", ""), {"size": 15, "bold": True, "color": self.pal["ink"]}),
                        ("\n" + m.get("desc", ""), {"size": 11, "color": self.pal["gray"]})],
                       size=12, color=self.pal["ink"], font=self.fonts["body"],
                       line_spacing=1.25, anchor=MSO_ANCHOR.MIDDLE)
            my += 1.65
        self._footer(sl, idx, dark=False)

    def now(self, s, idx):
        sl = self._slide()
        self._bg(sl, self.pal["dark"])
        self._decorate(sl, dark=True)
        x = 0.95
        self._eyebrow(sl, x, 1.0, s.get("eyebrow", ""), dark=True)
        self._text(sl, x - 0.1, 1.4, 6.5, 3.0, s.get("word", ""), size=130,
                   color=self.pal["soft2"], italic=True, font=self.fonts["heading"],
                   line_spacing=0.9, anchor=MSO_ANCHOR.MIDDLE)
        body = s.get("body", [])
        if isinstance(body, str):
            body = [body]
        self._text(sl, 7.0, 1.6, 5.4, 3.0, "\n\n".join(body), size=14,
                   color=self.dim, font=self.fonts["body"], line_spacing=1.5,
                   anchor=MSO_ANCHOR.MIDDLE)
        # timeline
        tl = s.get("timeline", [])
        if tl:
            ty = 5.6
            n = len(tl)
            step = 11.0 / max(1, n)
            self._rect(sl, x, ty + 0.18, 11.0, 0.02, "#3A2D4A")
            for i, t in enumerate(tl):
                cx = x + i * step
                state = t.get("state", "future")
                dot_col = self.pal["brand1"] if state == "act" else (
                    self.pal["soft2"] if state == "done" else "#5A4A6A")
                self._orb_solid(sl, cx, ty + 0.05, 0.22, dot_col)
                self._text(sl, cx - 0.5, ty + 0.4, step + 0.4, 0.5,
                           t.get("label", ""), size=10,
                           color="#FFFFFF" if state == "act" else "#9A8AAA",
                           upper=True, letter=1.4, font=self.fonts["body"])
        self._footer(sl, idx, dark=True)

    def _orb_solid(self, slide, x, y, d, hexcolor):
        shp = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x), Inches(y),
                                     Inches(d), Inches(d))
        shp.fill.solid(); shp.fill.fore_color.rgb = hex_to_rgb(hexcolor)
        shp.line.fill.background(); shp.shadow.inherit = False
        return shp

    def team(self, s, idx):
        sl = self._slide()
        self._bg(sl, self.pal["paper"])
        self._decorate(sl, dark=False)
        x = 0.95
        y = self._eyebrow(sl, x, 0.8, s.get("eyebrow", ""), dark=False)
        if s.get("headline"):
            self._text(sl, x, y, 11.4, 1.0, s["headline"], size=34,
                       color=self.pal["ink"], font=self.fonts["heading"])
        members = s.get("members", [])
        cols = 2 if len(members) <= 8 else 3
        gap = 0.25
        top = 2.8
        rh = 0.95
        cw = (11.4 - gap * (cols - 1)) / cols
        for i, m in enumerate(members):
            col = i % cols
            row = i // cols
            cx = x + col * (cw + gap)
            cy = top + row * (rh + gap)
            self._rect(sl, cx, cy, cw, rh, "#FFFFFF", line=mix_hex(self.pal["soft1"], "#FFFFFF", 0.3))
            initials = "".join(w[0] for w in m.get("name", "").split()[:2]).upper()
            av = self._orb_solid(sl, cx + 0.18, cy + 0.22, 0.5, self.pal["soft1"])
            self._text(sl, cx + 0.18, cy + 0.24, 0.5, 0.48, initials, size=13,
                       color=self.pal["brand3"], bold=True, align=PP_ALIGN.CENTER,
                       anchor=MSO_ANCHOR.MIDDLE, font=self.fonts["body"])
            photo = m.get("photo")
            if photo:
                p = self._resolve(photo)
                if p and os.path.exists(p):
                    try:
                        sl.shapes.add_picture(p, Inches(cx + 0.18), Inches(cy + 0.22),
                                              Inches(0.5), Inches(0.5))
                    except Exception:
                        pass
            self._text(sl, cx + 0.85, cy + 0.18, cw - 1.0, rh - 0.3,
                       [(m.get("name", ""), {"size": 13, "bold": True, "color": self.pal["ink"]}),
                        ("\n" + m.get("role", ""), {"size": 11, "color": self.pal["gray"]})],
                       size=12, color=self.pal["ink"], font=self.fonts["body"],
                       line_spacing=1.25, anchor=MSO_ANCHOR.MIDDLE)
        self._footer(sl, idx, dark=False)

    def pillar_detail(self, s, idx):
        sl = self._slide()
        self._bg(sl, self.pal["paper"])
        self._decorate(sl, dark=False)
        x = 0.95
        self._eyebrow(sl, x, 1.2, s.get("eyebrow", ""), dark=False)
        self._text(sl, x, 1.7, 5.0, 3.5, s.get("title", ""), size=38,
                   color=self.pal["ink"], font=self.fonts["heading"], line_spacing=1.05)
        ry = 1.4
        if s.get("objective"):
            self._text(sl, 6.5, ry, 5.9, 0.4, "OBIETTIVO", size=11,
                       color=self.pal["gray"], bold=True, upper=True, letter=1.6,
                       font=self.fonts["body"])
            self._text(sl, 6.5, ry + 0.4, 5.9, 1.2, s["objective"], size=14,
                       color=self.pal["ink"], font=self.fonts["body"], line_spacing=1.45)
            ry += 1.8
        for a in s.get("areas", []):
            self._rect(sl, 6.5, ry, 0.05, 0.7, self.pal["brand1"])
            self._text(sl, 6.7, ry, 5.7, 0.7,
                       [(a.get("title", ""), {"size": 14, "bold": True, "color": self.pal["ink"]}),
                        ("\n" + a.get("desc", ""), {"size": 12, "color": self.pal["gray"]})],
                       size=12, color=self.pal["ink"], font=self.fonts["body"], line_spacing=1.3)
            ry += 0.95
        self._footer(sl, idx, dark=False)

    def _content_fidelity(self, s, idx):
        """Premium-style content: numbered eyebrow, accent headline, purple sublabels,
        callout box, purple-dot bullets. Layout adapts to the fields present."""
        sk = self._skin()
        dark = self.layout.get("mode") == "dark"
        sl = self._slide()
        self._bg(sl, sk["bg"])
        x = 0.95
        self._content_eyebrow(sl, s, sk)
        title = s.get("title") or s.get("headline") or ""
        acc = s.get("title_accent", "")
        runs = self._hruns(title, acc, sk["accent"])

        groups = s.get("groups") or []
        bullets = s.get("bullets") or []
        body = s.get("body")
        body = body if isinstance(body, list) else ([body] if body else [])
        callout = s.get("callout")

        if groups:
            layout = "rich"
        elif bullets and (body or callout):
            layout = "split"
        elif body and not bullets:
            layout = "context"
        else:
            layout = "list"

        head_w = 5.7 if layout in ("rich", "split", "context") else 8.8
        self._text(sl, x, 1.95, head_w, 1.5, runs, size=34, color=sk["ink"],
                   font=self.fonts["heading"], line_spacing=1.03)

        # left column: intro body + callout (rich/split); headline-only otherwise
        if layout in ("rich", "split"):
            if body:
                self._text(sl, x, 3.55, head_w, 1.5, "\n\n".join(body), size=13.5,
                           color=sk["body"], font=self.fonts["body"], line_spacing=1.4)
            if callout:
                sc.callout_box(sl, x, 5.35, head_w, 0.95, callout,
                               border=sk["accent"], textcolor=sk["accent"],
                               font=self.fonts["body"], fill=sk["bg"])

        if layout == "rich":
            rx, rw, gy = 7.05, 5.35, 1.95
            for g in groups:
                sc.sublabel(sl, rx, gy, rw, g.get("sublabel", ""),
                            color=sk["accent"], font=self.fonts["body"])
                gy += 0.52
                for b in g.get("bullets", []):
                    sc.bullet(sl, rx, gy, rw, b, dot_color=sk["accent"],
                              text_color=sk["ink"], font=self.fonts["body"],
                              marker=self._bullet_marker())
                    gy += 0.58
                gy += 0.32
        elif layout == "split":
            rx, rw, gy = 7.05, 5.35, 1.95
            if s.get("sublabel"):
                sc.sublabel(sl, rx, gy, rw, s["sublabel"], color=sk["accent"],
                            font=self.fonts["body"]); gy += 0.52
            for b in bullets:
                sc.bullet(sl, rx, gy, rw, b, dot_color=sk["accent"],
                          text_color=sk["ink"], font=self.fonts["body"],
                          marker=self._bullet_marker())
                gy += 0.62
        elif layout == "context":
            self._text(sl, 7.05, 1.95, 5.35, 4.2, "\n\n".join(body), size=15,
                       color=sk["ink"], font=self.fonts["body"], line_spacing=1.5,
                       anchor=MSO_ANCHOR.TOP)
        else:  # list — single wide column
            by = 3.35
            if s.get("sublabel"):
                sc.sublabel(sl, x, by, 8.6, s["sublabel"], color=sk["accent"],
                            font=self.fonts["body"]); by += 0.55
            for b in bullets:
                sc.bullet(sl, x, by, 8.7, b, dot_color=sk["accent"],
                          text_color=sk["ink"], font=self.fonts["body"], size=15,
                          marker=self._bullet_marker())
                by += 0.62

        self._footer(sl, idx, dark=dark)

    def content(self, s, idx):
        """Generic title + bullets fallback for anything that doesn't map cleanly."""
        if self._content_skin():
            return self._content_fidelity(s, idx)
        sl = self._slide()
        self._bg(sl, self.pal["paper"])
        self._decorate(sl, dark=False)
        x = 0.95
        has_media = bool(s.get("image") or s.get("video"))
        text_w = 6.0 if has_media else 11.4
        y = self._eyebrow(sl, x, 0.9, s.get("eyebrow", ""), dark=False)
        if s.get("title"):
            self._text(sl, x, y, text_w, 1.2, s["title"], size=36,
                       color=self.pal["ink"], font=self.fonts["heading"], line_spacing=1.05)
        bullets = s.get("bullets", [])
        by = 2.9
        for b in bullets:
            self._orb_solid(sl, x, by + 0.1, 0.12, self.pal["brand1"])
            self._text(sl, x + 0.35, by, text_w - 0.35, 0.7, b, size=15,
                       color=self.pal["ink"], font=self.fonts["body"], line_spacing=1.4)
            by += 0.72
        if s.get("body"):
            body = s["body"] if isinstance(s["body"], list) else [s["body"]]
            self._text(sl, x, by + 0.1, text_w, 3.0, "\n\n".join(body), size=15,
                       color=self.pal["ink"], font=self.fonts["body"], line_spacing=1.5)
        if has_media:
            self._media(sl, s, 7.1, 1.5, 5.3, 4.6)
        self._footer(sl, idx, dark=False)

    def _media(self, slide, s, x, y, w, h):
        """Place an image, or a video (with optional poster), in the given box."""
        img = self._resolve(s.get("image"))
        vid = self._resolve(s.get("video"))
        poster = self._resolve(s.get("poster"))
        if vid and os.path.exists(vid):
            try:
                slide.shapes.add_movie(
                    vid, Inches(x), Inches(y), Inches(w), Inches(h),
                    poster_frame_image=poster if (poster and os.path.exists(poster)) else None)
                return
            except Exception:
                pass
        if img and os.path.exists(img):
            try:
                slide.shapes.add_picture(img, Inches(x), Inches(y), width=Inches(w))
            except Exception:
                pass

    def gallery(self, s, idx):
        """Light 'content with imagery' slide: eyebrow + title + a row of images."""
        sl = self._slide()
        self._bg(sl, self.pal["paper"])
        x = 0.95
        y = self._eyebrow(sl, x, 0.75, s.get("eyebrow", ""), dark=False)
        if s.get("title"):
            self._text(sl, x, y, 11.4, 1.0, s["title"], size=32,
                       color=self.pal["ink"], font=self.fonts["heading"], line_spacing=1.04)
        imgs = [self._resolve(p) for p in s.get("images", [])]
        imgs = [p for p in imgs if p and os.path.exists(p)]
        if not imgs:
            self._footer(sl, idx, dark=False); return
        n = len(imgs)
        band_top, band_h = 2.7, 3.7
        gap = 0.3
        cell_w = (11.4 - gap * (n - 1)) / n
        cx = x
        for p in imgs:
            dims = _img_dims(p)
            if dims:
                iw, ih = dims
                scale = min(cell_w / iw, band_h / ih)
                w, h = iw * scale, ih * scale
                px = cx + (cell_w - w) / 2
                py = band_top + (band_h - h) / 2
                try:
                    sl.shapes.add_picture(p, Inches(px), Inches(py), Inches(w), Inches(h))
                except Exception:
                    pass
            cx += cell_w + gap
        if s.get("caption"):
            self._text(sl, x, 6.5, 11.4, 0.4, s["caption"], size=11,
                       color=self.pal["gray"], font=self.fonts["body"])
        self._footer(sl, idx, dark=False)

    def from_to(self, s, idx):
        """ACN SONG From→To: left gray 'from' card, right purple 'to' card, arrow."""
        sl = self._slide()
        self._bg(sl, self.pal["paper"])
        x = 0.95
        y = self._eyebrow(sl, x, 0.8, s.get("eyebrow", ""), dark=False)
        if s.get("title"):
            self._text(sl, x, y, 11.4, 1.0, s["title"], size=32,
                       color=self.pal["ink"], font=self.fonts["heading"], line_spacing=1.04)
        top, ch, cw = 2.9, 3.6, 5.25
        lg = mix_hex(self.pal["soft1"], "#FFFFFF", 0.35)

        def card(cx, fill, label, lab_col, title, items, txt_col, item_col):
            self._rect(sl, cx, top, cw, ch, fill)
            self._text(sl, cx + 0.35, top + 0.3, cw - 0.7, 0.3, label, size=11,
                       color=lab_col, upper=True, letter=1.6, font=self.fonts["body"])
            self._text(sl, cx + 0.35, top + 0.7, cw - 0.7, 1.0, title, size=22,
                       color=txt_col, bold=True, font=self.fonts["heading"], line_spacing=1.05)
            iy = top + 1.85
            for it in items[:4]:
                self._text(sl, cx + 0.35, iy, cw - 0.7, 0.5, "—  " + it, size=13,
                           color=item_col, font=self.fonts["body"], line_spacing=1.3)
                iy += 0.45

        f = s.get("from", {}); t = s.get("to", {})
        card(x, lg, f.get("label", "From"), self.pal["gray"], f.get("title", ""),
             f.get("items", []), self.pal["ink"], self.pal["gray"])
        card(x + cw + 0.9, self.pal["brand1"], t.get("label", "To"), "#E6DCFF",
             t.get("title", ""), t.get("items", []), "#FFFFFF", "#EDE3FF")
        self._text(sl, x + cw + 0.1, top + ch / 2 - 0.35, 0.8, 0.7, "→", size=40,
                   color=self.pal["brand1"], font=self.fonts["heading"], align=PP_ALIGN.CENTER)
        self._footer(sl, idx, dark=False)

    def bar(self, s, idx):
        """ACN SONG bar chart: horizontal bars in the purple spectrum on a gray track."""
        sl = self._slide()
        self._bg(sl, self.pal["paper"])
        x = 0.95
        y = self._eyebrow(sl, x, 0.8, s.get("eyebrow", ""), dark=False)
        if s.get("title"):
            self._text(sl, x, y, 11.4, 1.0, s["title"], size=32,
                       color=self.pal["ink"], font=self.fonts["heading"], line_spacing=1.04)
        items = s.get("items", [])
        spectrum = ["#460073", "#7500C0", "#A100FF", "#C2A3FF", "#E6DCFF"]
        track = mix_hex(self.pal["soft1"], "#FFFFFF", 0.4)
        top, full_w = 2.95, 8.6
        lab_w = 2.6
        row_h = min(0.95, 3.6 / max(1, len(items)))
        try:
            vals = [float(re.sub(r"[^0-9.\-]", "", str(it.get("value", 0))) or 0) for it in items]
            vmax = max(vals) if vals else 1
        except Exception:
            vals = [0] * len(items); vmax = 1
        for i, it in enumerate(items):
            ry = top + i * row_h
            self._text(sl, x, ry, lab_w, row_h - 0.1, it.get("label", ""), size=13,
                       color=self.pal["ink"], font=self.fonts["body"],
                       anchor=MSO_ANCHOR.MIDDLE)
            bx = x + lab_w
            self._rect(sl, bx, ry + row_h * 0.18, full_w, row_h * 0.5, track)
            w = full_w * (vals[i] / vmax) if vmax else 0
            self._rect(sl, bx, ry + row_h * 0.18, max(0.05, w), row_h * 0.5,
                       spectrum[i % len(spectrum)])
            self._text(sl, bx + full_w + 0.15, ry, 1.6, row_h - 0.1,
                       str(it.get("value", "")), size=14, color=self.pal["ink"],
                       bold=True, font=self.fonts["body"], anchor=MSO_ANCHOR.MIDDLE)
        self._footer(sl, idx, dark=False)

    def donut(self, s, idx):
        """Parts-of-a-whole donut in the Song purple spectrum + legend (Premium data-viz)."""
        skinned = self._content_skin()
        sk = self._skin() if skinned else None
        sl = self._slide()
        self._bg(sl, sk["bg"] if sk else self.pal["paper"])
        x = 0.95
        ink = sk["ink"] if sk else self.pal["ink"]
        body = sk["body"] if sk else self.pal["gray"]
        accent = sk["accent"] if sk else self.pal["brand1"]
        self._content_eyebrow(sl, s, sk)
        hl = s.get("headline", ""); acc = s.get("headline_accent", "")
        if hl:
            self._text(sl, x, 1.9, 11.4, 0.9, self._hruns(hl, acc, accent), size=30,
                       color=ink, font=self.fonts["heading"], line_spacing=1.02)
        segs = s.get("segments", [])
        vals = []
        for sg in segs:
            try:
                vals.append(float(re.sub(r"[^0-9.\-]", "", str(sg.get("value", 0))) or 0))
            except Exception:
                vals.append(0)
        spectrum = ["#460073", "#7500C0", "#A100FF", "#C2A3FF", "#E6DCFF"]
        cols = [spectrum[i % len(spectrum)] for i in range(len(segs))]
        if sc:
            gen = os.path.join(self.base_dir, "_gen"); os.makedirs(gen, exist_ok=True)
            dp = os.path.join(gen, f"donut_{idx}.png")
            try:
                sc.make_donut(dp, vals or [1], cols or ["#A100FF"])
                sl.shapes.add_picture(dp, Inches(1.0), Inches(2.85), Inches(3.7), Inches(3.7))
            except Exception:
                pass
        if s.get("center"):
            self._text(sl, 1.0, 4.35, 3.7, 0.7, s["center"], size=24, color=ink, bold=True,
                       align=PP_ALIGN.CENTER, font=self.fonts["heading"])
        ly, lx = 3.05, 5.5
        for i, sg in enumerate(segs):
            self._rect(sl, lx, ly + 0.05, 0.28, 0.28, cols[i % len(cols)])
            self._text(sl, lx + 0.45, ly, 6.4, 0.5,
                       [(sg.get("label", ""), {"size": 14, "bold": True, "color": ink}),
                        ("   " + str(sg.get("value", "")), {"size": 14, "bold": True, "color": accent})],
                       size=14, color=ink, font=self.fonts["body"], line_spacing=1.15)
            if sg.get("desc"):
                self._text(sl, lx + 0.45, ly + 0.4, 6.2, 0.5, sg["desc"], size=11,
                           color=body, font=self.fonts["body"], line_spacing=1.2)
                ly += 0.92
            else:
                ly += 0.62
        self._footer(sl, idx, dark=(sk is not None and self.layout.get("mode") == "dark"))

    def _skin_or_light(self):
        """(sk, ink, body, accent, dark, bg) for content types that adapt to the skin."""
        sk = self._skin() if self._content_skin() else None
        dark = sk is not None and self.layout.get("mode") == "dark"
        ink = sk["ink"] if sk else self.pal["ink"]
        body = sk["body"] if sk else self.pal["gray"]
        accent = sk["accent"] if sk else self.pal["brand1"]
        bg = sk["bg"] if sk else self.pal["paper"]
        return sk, ink, body, accent, dark, bg

    def _content_eyebrow(self, sl, s, sk):
        """De-mix: numbered big-number eyebrow (Premium/Dark) OR rule + uppercase-tracked
        label (Canvas), per the reference's `motifs.eyebrow`."""
        x = 0.95
        est = (self.style.get("motifs") or {}).get("eyebrow") if self.style else None
        accent = sk["accent"] if sk else self.pal["brand1"]
        if est in ("uppercase-tracked", "tracked"):
            _, label = self._split_eyebrow(s.get("eyebrow", ""))
            self._rect(sl, x, 0.92, 0.33, 0.018, accent)
            self._text(sl, x + 0.45, 0.85, 9, 0.3, label or s.get("eyebrow", ""), size=11,
                       color=accent, bold=True, upper=True, letter=2.2, font=self.fonts["body"])
        elif sk or sc:
            num, label = self._split_eyebrow(s.get("eyebrow", ""))
            sc.numbered_eyebrow(sl, x, 0.65, num, label,
                                num_color=sk["eyebrow_num"] if sk else self.pal["ink"],
                                label_color=sk["eyebrow_label"] if sk else self.pal["ink"],
                                font=self.fonts["body"])
        else:
            self._eyebrow(sl, x, 0.8, s.get("eyebrow", ""), dark=False)

    def _skin_header(self, sl, s, *, sk, ink, accent, size=30):
        """Eyebrow (per-reference style) + accent headline."""
        x = 0.95
        self._content_eyebrow(sl, s, sk)
        hl = s.get("headline", "")
        if hl:
            self._text(sl, x, 1.9, 11.4, 0.9, self._hruns(hl, s.get("headline_accent", ""), accent),
                       size=size, color=ink, font=self.fonts["heading"], line_spacing=1.02)

    def table(self, s, idx):
        """Comparison table: criteria rows × option columns, purple header (Premium s35/37)."""
        sk, ink, body, accent, dark, bg = self._skin_or_light()
        sl = self._slide(); self._bg(sl, bg); x = 0.95
        self._skin_header(sl, s, sk=sk, ink=ink, accent=accent)
        cols = s.get("columns", []); rows = s.get("rows", [])
        n = max(1, len(cols))
        top, lab_w, tbl_w = 2.95, 3.6, 11.4
        opt_w = (tbl_w - lab_w) / n
        self._rect(sl, x + lab_w, top, opt_w * n, 0.62, accent)
        for j, c in enumerate(cols):
            self._text(sl, x + lab_w + j * opt_w, top, opt_w, 0.62, c, size=14,
                       color="#FFFFFF", bold=True, align=PP_ALIGN.CENTER,
                       anchor=MSO_ANCHOR.MIDDLE, font=self.fonts["body"])
        ry = top + 0.62
        rh = min(0.7, (6.5 - ry) / max(1, len(rows)))
        zebra = mix_hex(bg, accent, 0.07)
        yes = {"✓", "yes", "si", "sì", "true", True}
        no = {"✗", "no", "false", "-", "—", False}
        for i, row in enumerate(rows):
            if i % 2 == 1:
                self._rect(sl, x, ry, tbl_w, rh, zebra)
            self._text(sl, x + 0.1, ry, lab_w - 0.2, rh, row.get("label", ""), size=13,
                       color=ink, font=self.fonts["body"], anchor=MSO_ANCHOR.MIDDLE)
            for j, cell in enumerate(row.get("cells", [])[:n]):
                cx = x + lab_w + j * opt_w
                key = cell.strip().lower() if isinstance(cell, str) else cell
                if key in yes:
                    self._text(sl, cx, ry, opt_w, rh, "✓", size=17, color=accent, bold=True,
                               align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font=self.fonts["body"])
                elif key in no:
                    self._text(sl, cx, ry, opt_w, rh, "—", size=16, color=body,
                               align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font=self.fonts["body"])
                else:
                    self._text(sl, cx, ry, opt_w, rh, str(cell), size=12, color=ink,
                               align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font=self.fonts["body"])
            ry += rh
        self._footer(sl, idx, dark=dark)

    def taxonomy(self, s, idx):
        """Columns of pills grouped by phase (Premium service map, s38)."""
        sk, ink, body, accent, dark, bg = self._skin_or_light()
        sl = self._slide(); self._bg(sl, bg); x = 0.95
        self._skin_header(sl, s, sk=sk, ink=ink, accent=accent)
        cols = s.get("columns", [])
        n = max(1, len(cols)); gap = 0.3
        cw = (11.4 - gap * (n - 1)) / n
        top = 2.95
        pill_fill = sk["card1"] if dark else self.pal["soft1"]
        pill_text = "#FFFFFF" if dark else self.pal["brand3"]
        for j, col in enumerate(cols):
            cx = x + j * (cw + gap)
            self._text(sl, cx, top, cw, 0.4, (col.get("phase", "")).upper(), size=12,
                       color=accent, bold=True, letter=1.2, font=self.fonts["body"])
            iy = top + 0.55
            for it in col.get("items", []):
                sc.rounded_card(sl, cx, iy, cw, 0.5, fill1=pill_fill, radius=0.32)
                self._text(sl, cx + 0.2, iy, cw - 0.4, 0.5, it, size=12, color=pill_text,
                           font=self.fonts["body"], anchor=MSO_ANCHOR.MIDDLE)
                iy += 0.62
        self._footer(sl, idx, dark=dark)

    def timeline(self, s, idx):
        """Horizontal rail with numbered ringed nodes + labels (Dark step-timeline /
        Essential phase-flow). `steps:[{label,desc,num}]`."""
        sk, ink, body, accent, dark, bg = self._skin_or_light()
        sl = self._slide(); self._bg(sl, bg)
        self._skin_header(sl, s, sk=sk, ink=ink, accent=accent)
        steps = s.get("steps", []) or s.get("phases", [])
        n = max(1, len(steps))
        x0, x1, midy = 1.1, 12.2, 4.3
        rail = mix_hex(bg, accent, 0.30) if not dark else "#2A2A33"
        self._rect(sl, x0, midy - 0.012, x1 - x0, 0.024, rail)
        step_w = (x1 - x0) / n
        for i, st in enumerate(steps):
            cx = x0 + step_w * i + step_w / 2
            self._orb_solid(sl, cx - 0.24, midy - 0.24, 0.48, accent)
            self._text(sl, cx - 0.5, midy - 0.26, 1.0, 0.5, str(st.get("num", i + 1)),
                       size=16, color="#FFFFFF", bold=True, align=PP_ALIGN.CENTER,
                       anchor=MSO_ANCHOR.MIDDLE, font=self.fonts["body"])
            self._text(sl, cx - step_w / 2 + 0.1, midy - 1.15, step_w - 0.2, 0.75,
                       st.get("label", ""), size=14, color=ink, bold=True,
                       align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.BOTTOM, font=self.fonts["body"],
                       line_spacing=1.05)
            if st.get("desc"):
                self._text(sl, cx - step_w / 2 + 0.12, midy + 0.5, step_w - 0.24, 1.5,
                           st["desc"], size=11, color=body, align=PP_ALIGN.CENTER,
                           font=self.fonts["body"], line_spacing=1.25)
        self._footer(sl, idx, dark=dark)

    def gantt(self, s, idx):
        """Roadmap: period axis + rows with bars spanning periods (Premium s18).
        `periods:[labels]`, `rows:[{label, from, to}]` (1-based period indices)."""
        sk, ink, body, accent, dark, bg = self._skin_or_light()
        sl = self._slide(); self._bg(sl, bg); x = 0.95
        self._skin_header(sl, s, sk=sk, ink=ink, accent=accent)
        periods = s.get("periods", []); rows = s.get("rows", [])
        np = max(1, len(periods)); lab_w = 3.4
        gx0, gx1 = x + lab_w, 12.35
        pw = (gx1 - gx0) / np
        top = 2.95
        for j, p in enumerate(periods):
            self._text(sl, gx0 + j * pw, top, pw, 0.4, p, size=12, color=body,
                       bold=True, align=PP_ALIGN.CENTER, font=self.fonts["body"])
        ry = top + 0.55
        rh = min(0.72, (6.4 - ry) / max(1, len(rows)))
        spectrum = ["#460073", "#7500C0", "#A100FF", "#C2A3FF"]
        track = mix_hex(bg, accent, 0.08)
        for i, r in enumerate(rows):
            self._rect(sl, x, ry, 12.35 - x, rh, track)
            self._text(sl, x + 0.1, ry, lab_w - 0.2, rh, r.get("label", ""), size=13,
                       color=ink, anchor=MSO_ANCHOR.MIDDLE, font=self.fonts["body"])
            try:
                fr = max(1, int(r.get("from", 1))); to = min(np, int(r.get("to", fr)))
            except Exception:
                fr, to = 1, np
            bx = gx0 + (fr - 1) * pw
            bw = max(0.3, (to - fr + 1) * pw - 0.12)
            self._rect(sl, bx + 0.06, ry + rh * 0.22, bw, rh * 0.56, spectrum[i % len(spectrum)])
            ry += rh
        self._footer(sl, idx, dark=dark)

    def ratings(self, s, idx):
        """Rows of label + 1-5 purple stars + caption (Canvas evaluation)."""
        sk, ink, body, accent, dark, bg = self._skin_or_light()
        sl = self._slide(); self._bg(sl, bg); x = 0.95
        self._skin_header(sl, s, sk=sk, ink=ink, accent=accent)
        items = s.get("items", [])
        track = mix_hex(bg, ink, 0.25)
        top = 3.0
        rh = min(0.95, (6.4 - top) / max(1, len(items)))
        for i, it in enumerate(items):
            ry = top + i * rh
            self._text(sl, x, ry, 4.6, rh, it.get("label", ""), size=15, color=ink,
                       bold=True, anchor=MSO_ANCHOR.MIDDLE, font=self.fonts["body"])
            try:
                nstar = max(0, min(5, int(it.get("stars", 0))))
            except Exception:
                nstar = 0
            self._text(sl, 5.7, ry, 3.2, rh,
                       [("★" * nstar, {"size": 20, "color": accent}),
                        ("★" * (5 - nstar), {"size": 20, "color": track})],
                       size=20, color=accent, anchor=MSO_ANCHOR.MIDDLE, font=self.fonts["body"])
            if it.get("caption"):
                self._text(sl, 9.0, ry, 3.3, rh, it["caption"], size=12, color=body,
                           anchor=MSO_ANCHOR.MIDDLE, font=self.fonts["body"])
        self._footer(sl, idx, dark=dark)

    def logos(self, s, idx):
        """Grid of client name chips (real logos are assets; chips are the reusable form)."""
        sk, ink, body, accent, dark, bg = self._skin_or_light()
        sl = self._slide(); self._bg(sl, bg); x = 0.95
        self._skin_header(sl, s, sk=sk, ink=ink, accent=accent)
        names = s.get("items", [])
        cols = 4 if len(names) > 6 else 3
        gap = 0.25; cw = (11.4 - gap * (cols - 1)) / cols
        ch = 1.0; top = 3.0
        chip_fill = sk["card1"] if (sk and dark) else mix_hex(bg, accent, 0.06)
        chip_line = mix_hex(bg, ink, 0.12)
        for i, nm in enumerate(names):
            col, row = i % cols, i // cols
            cx = x + col * (cw + gap); cy = top + row * (ch + gap)
            if dark:
                self._rect(sl, cx, cy, cw, ch, chip_fill)
            else:
                self._rect(sl, cx, cy, cw, ch, chip_fill, line=chip_line)
            self._text(sl, cx, cy, cw, ch, nm, size=15, color=ink, bold=True,
                       align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, font=self.fonts["body"])
        self._footer(sl, idx, dark=dark)

    def donuts(self, s, idx):
        """Row of small donuts (Premium market-state dashboard). `charts:[{title,center,segments}]`."""
        sk, ink, body, accent, dark, bg = self._skin_or_light()
        sl = self._slide(); self._bg(sl, bg); x = 0.95
        self._skin_header(sl, s, sk=sk, ink=ink, accent=accent)
        charts = s.get("charts", [])
        n = max(1, len(charts)); gap = 0.4
        cw = (11.4 - gap * (n - 1)) / n
        d = min(2.7, cw)
        top = 3.1
        spectrum = ["#460073", "#7500C0", "#A100FF", "#C2A3FF", "#E6DCFF"]
        gen = os.path.join(self.base_dir, "_gen"); os.makedirs(gen, exist_ok=True)
        for i, ch in enumerate(charts):
            cx = x + i * (cw + gap) + (cw - d) / 2
            vals = []
            for sg in ch.get("segments", []):
                try:
                    vals.append(float(re.sub(r"[^0-9.\-]", "", str(sg.get("value", 0))) or 0))
                except Exception:
                    vals.append(0)
            cols = [spectrum[k % len(spectrum)] for k in range(len(vals))]
            if sc and vals:
                dp = os.path.join(gen, f"donuts_{idx}_{i}.png")
                try:
                    sc.make_donut(dp, vals, cols)
                    sl.shapes.add_picture(dp, Inches(cx), Inches(top), Inches(d), Inches(d))
                except Exception:
                    pass
            if ch.get("center"):
                self._text(sl, cx, top + d / 2 - 0.35, d, 0.7, ch["center"], size=22,
                           color=ink, bold=True, align=PP_ALIGN.CENTER, font=self.fonts["heading"])
            if ch.get("title"):
                self._text(sl, x + i * (cw + gap), top + d + 0.15, cw, 0.6, ch["title"],
                           size=13, color=ink, bold=True, align=PP_ALIGN.CENTER,
                           font=self.fonts["body"], line_spacing=1.1)
        self._footer(sl, idx, dark=dark)

    def activity(self, s, idx):
        """Essential workhorse: full-height side image + text column with a circular phase
        badge and a 'Deliverable previsti' side note. `image`, `phase`, `headline`,
        `body`, `deliverable`."""
        sk, ink, body, accent, dark, bg = self._skin_or_light()
        sl = self._slide(); self._bg(sl, bg)
        side = s.get("image_side", "left")
        imgw = 5.3
        ix = 0.0 if side == "left" else (SLIDE_W_IN - imgw)
        img = self._resolve(s.get("image"))
        if img and os.path.exists(img):
            try:
                sl.shapes.add_picture(img, Inches(ix), Inches(0), Inches(imgw), Inches(SLIDE_H_IN))
            except Exception:
                pass
        else:
            self._rect(sl, ix, 0, imgw, SLIDE_H_IN, mix_hex(bg, accent, 0.10))
            self._text(sl, ix, 3.3, imgw, 0.6, "immagine", size=13, color=body,
                       align=PP_ALIGN.CENTER, font=self.fonts["body"])
        tx = (imgw + 0.7) if side == "left" else 0.95
        tw = SLIDE_W_IN - imgw - 1.4
        if s.get("phase"):
            self._orb_solid(sl, tx, 0.85, 0.5, accent)
            self._text(sl, tx + 0.7, 0.9, tw - 0.7, 0.4, (s["phase"]).upper(), size=12,
                       color=accent, bold=True, letter=1.6, font=self.fonts["body"],
                       anchor=MSO_ANCHOR.MIDDLE)
        self._text(sl, tx, 1.8, tw, 1.2, self._hruns(s.get("headline", ""),
                   s.get("headline_accent", ""), accent), size=32, color=ink,
                   font=self.fonts["heading"], line_spacing=1.03)
        bd = s.get("body"); bd = bd if isinstance(bd, list) else ([bd] if bd else [])
        if bd:
            self._text(sl, tx, 3.2, tw, 2.0, "\n\n".join(bd), size=14, color=ink,
                       font=self.fonts["body"], line_spacing=1.45)
        if s.get("deliverable"):
            self._text(sl, tx, 5.5, tw, 0.35, "Deliverable previsti:", size=11,
                       color=accent, bold=True, font=self.fonts["body"])
            self._text(sl, tx, 5.9, tw, 0.9, s["deliverable"], size=12, color=body,
                       font=self.fonts["body"], line_spacing=1.3)
        self._footer(sl, idx, dark=dark)

    def pricing(self, s, idx):
        """Priced-solution columns: purple header band + price + checklist (Essential).
        `columns:[{title, price, items:[], featured}]`."""
        sk, ink, body, accent, dark, bg = self._skin_or_light()
        sl = self._slide(); self._bg(sl, bg); x = 0.95
        self._skin_header(sl, s, sk=sk, ink=ink, accent=accent)
        cols = s.get("columns", [])
        n = max(1, len(cols)); gap = 0.35
        cw = (11.4 - gap * (n - 1)) / n
        top, ch = 2.95, 3.7
        card_fill = "#FFFFFF" if not dark else sk["card2"]
        for j, col in enumerate(cols):
            cx = x + j * (cw + gap)
            line = accent if col.get("featured") else mix_hex(bg, ink, 0.14)
            sc.rounded_card(sl, cx, top, cw, ch, fill1=card_fill, radius=0.05, line=line)
            self._rect(sl, cx + 0.06, top + 0.06, cw - 0.12, 0.95, accent)
            self._text(sl, cx + 0.2, top + 0.14, cw - 0.4, 0.4, col.get("title", ""), size=15,
                       color="#FFFFFF", bold=True, align=PP_ALIGN.CENTER, font=self.fonts["body"])
            if col.get("price"):
                self._text(sl, cx + 0.2, top + 0.52, cw - 0.4, 0.45, col["price"], size=17,
                           color="#FFFFFF", bold=True, align=PP_ALIGN.CENTER, font=self.fonts["heading"])
            iy = top + 1.25
            for it in col.get("items", []):
                sc.bullet(sl, cx + 0.28, iy, cw - 0.5, it, dot_color=accent, text_color=ink,
                          font=self.fonts["body"], size=12, marker="check")
                iy += 0.5
        self._footer(sl, idx, dark=dark)

    def decision(self, s, idx):
        """Two decision panels ('use A if / use B if'); recommended one gets an accent top-bar
        + border (Dark decision-guide). `panels:[{label,title,bullets,recommended}]`."""
        sk, ink, body, accent, dark, bg = self._skin_or_light()
        sl = self._slide(); self._bg(sl, bg); x = 0.95
        self._skin_header(sl, s, sk=sk, ink=ink, accent=accent)
        panels = s.get("panels", [])[:2]
        gap = 0.4; pw = (11.4 - gap) / 2
        top, ph = 2.95, 3.6
        card_fill = mix_hex(bg, accent, 0.05) if not dark else sk["card1"]
        for j, p in enumerate(panels):
            px = x + j * (pw + gap)
            rec = p.get("recommended")
            sc.rounded_card(sl, px, top, pw, ph, fill1=card_fill, radius=0.05,
                            line=(accent if rec else mix_hex(bg, ink, 0.14)))
            self._rect(sl, px + 0.06, top + 0.06, pw - 0.12, 0.12,
                       accent if rec else mix_hex(bg, ink, 0.3))
            self._text(sl, px + 0.3, top + 0.35, pw - 0.6, 0.4, (p.get("label", "")).upper(),
                       size=12, color=accent, bold=True, letter=1.4, font=self.fonts["body"])
            self._text(sl, px + 0.3, top + 0.75, pw - 0.6, 0.7, p.get("title", ""), size=18,
                       color=ink, bold=True, font=self.fonts["body"], line_spacing=1.05)
            iy = top + 1.6
            for b in p.get("bullets", []):
                sc.bullet(sl, px + 0.3, iy, pw - 0.6, b, dot_color=accent, text_color=ink,
                          font=self.fonts["body"], size=12, marker="check")
                iy += 0.5
        self._footer(sl, idx, dark=dark)

    def _img_box(self, sl, x, y, w, h, path, *, fill, hint="immagine", body_col=None):
        """Place an image to fill the box, or a neutral placeholder frame with a hint."""
        p = self._resolve(path)
        if p and os.path.exists(p):
            try:
                sl.shapes.add_picture(p, Inches(x), Inches(y), Inches(w), Inches(h)); return
            except Exception:
                pass
        self._rect(sl, x, y, w, h, fill)
        self._text(sl, x, y + h / 2 - 0.2, w, 0.4, hint, size=12,
                   color=body_col or self.pal["gray"], align=PP_ALIGN.CENTER, font=self.fonts["body"])

    def map(self, s, idx):
        """Geographic context: headline + bullets left, a map image slot right (Premium)."""
        sk, ink, body, accent, dark, bg = self._skin_or_light()
        sl = self._slide(); self._bg(sl, bg); x = 0.95
        self._skin_header(sl, s, sk=sk, ink=ink, accent=accent)
        self._img_box(sl, 7.0, 2.4, 5.8, 4.2, s.get("image"),
                      fill=mix_hex(bg, accent, 0.08), hint="mappa", body_col=body)
        by = 3.0
        if s.get("pill"):
            sc.pill(sl, x, by, s["pill"], fill=accent, textcolor="#FFFFFF", font=self.fonts["body"])
            by += 0.7
        for b in s.get("bullets", []):
            sc.bullet(sl, x, by, 5.6, b, dot_color=accent, text_color=ink,
                      font=self.fonts["body"], marker=self._bullet_marker())
            by += 0.6
        self._footer(sl, idx, dark=dark)

    def risk(self, s, idx):
        """Per-country risk: vertical step arc (left) + purple info card (center) + map (right)."""
        sk, ink, body, accent, dark, bg = self._skin_or_light()
        sl = self._slide(); self._bg(sl, bg)
        self._skin_header(sl, s, sk=sk, ink=ink, accent=accent)
        steps = s.get("steps", [])
        ax, ay0, ay1 = 1.15, 2.8, 6.2
        self._rect(sl, ax, ay0, 0.02, ay1 - ay0, mix_hex(bg, accent, 0.3))
        for i, st in enumerate(steps):
            yy = ay0 + (ay1 - ay0) * (i / max(1, len(steps) - 1))
            act = st.get("state") == "act"
            self._orb_solid(sl, ax - 0.1, yy - 0.1, 0.22, accent if act else mix_hex(bg, accent, 0.4))
            self._text(sl, ax + 0.4, yy - 0.22, 2.6, 0.5, st.get("label", ""), size=13,
                       color=ink if act else body, bold=act, anchor=MSO_ANCHOR.MIDDLE,
                       font=self.fonts["body"])
        cx, cw, ch, top = 4.3, 4.2, 3.6, 2.8
        sc.rounded_card(sl, cx, top, cw, ch, fill1=self.pal["brand2"], fill2=self.pal["brand3"], radius=0.06)
        if s.get("card_label"):
            self._text(sl, cx + 0.3, top + 0.3, cw - 0.6, 0.5, (s["card_label"]).upper(),
                       size=12, color="#E6DCFF", bold=True, letter=1.4, font=self.fonts["body"])
        iy = top + 1.0
        for b in s.get("card_items", []):
            self._text(sl, cx + 0.3, iy, cw - 0.6, 0.6, "—  " + b, size=13, color="#FFFFFF",
                       font=self.fonts["body"], line_spacing=1.25)
            iy += 0.6
        self._img_box(sl, 8.9, 2.8, 3.9, 3.6, s.get("image"),
                      fill=mix_hex(bg, accent, 0.08), hint="mappa", body_col=body)
        self._footer(sl, idx, dark=dark)

    def phoneflow(self, s, idx):
        """Row of phone-mockup slots joined by dotted connectors (Canvas flow)."""
        sk, ink, body, accent, dark, bg = self._skin_or_light()
        sl = self._slide(); self._bg(sl, bg)
        self._skin_header(sl, s, sk=sk, ink=ink, accent=accent)
        screens = s.get("screens", [])
        n = max(1, len(screens))
        pw, ph, top = 1.85, 3.5, 2.9
        total = 11.4; gap = (total - n * pw) / max(1, n - 1) if n > 1 else 0
        x0 = 0.95
        for i, scn in enumerate(screens):
            px = x0 + i * (pw + gap)
            self._img_box(sl, px, top, pw, ph, scn.get("image"),
                          fill=mix_hex(bg, accent, 0.10), hint="screen", body_col=body)
            if i < n - 1:
                for k in range(4):
                    self._orb_solid(sl, px + pw + gap * (k + 1) / 5 - 0.03, top + ph / 2 - 0.03,
                                    0.07, mix_hex(bg, accent, 0.45))
            if scn.get("caption"):
                self._text(sl, px - 0.1, top + ph + 0.15, pw + 0.2, 0.7, scn["caption"], size=11,
                           color=body, align=PP_ALIGN.CENTER, font=self.fonts["body"], line_spacing=1.2)
        self._footer(sl, idx, dark=dark)

    def finding(self, s, idx):
        """Audit finding: severity chip + headline (left) + browser-mock slot (right) + tags."""
        sk, ink, body, accent, dark, bg = self._skin_or_light()
        sl = self._slide(); self._bg(sl, bg); x = 0.95
        self._content_eyebrow(sl, s, sk)
        if s.get("severity"):
            sc.pill(sl, x, 1.55, "Criticità: " + s["severity"], fill=accent,
                    textcolor="#FFFFFF", font=self.fonts["body"])
        hl = s.get("headline", "")
        if hl:
            self._text(sl, x, 2.15, 5.5, 1.1, self._hruns(hl, s.get("headline_accent", ""), accent),
                       size=28, color=ink, font=self.fonts["heading"], line_spacing=1.03)
        ry = 3.5
        for lbl in ("Riferimento", "Utenti impattati"):
            key = lbl.lower().split()[0]
            if s.get(key) or (key == "riferimento" and s.get("reference")) or (key == "utenti" and s.get("impact")):
                val = s.get("reference") if key == "riferimento" else s.get("impact")
                self._text(sl, x, ry, 5.4, 0.35, lbl.upper(), size=10, color=accent, bold=True,
                           letter=1.2, font=self.fonts["body"])
                self._text(sl, x, ry + 0.34, 5.4, 0.5, val or "", size=13, color=ink,
                           font=self.fonts["body"], line_spacing=1.2)
                ry += 1.0
        tx = x
        for tg in s.get("tags", []):
            tx += sc.pill(sl, tx, 6.0, tg, fill=mix_hex(bg, accent, 0.12),
                          textcolor=accent, font=self.fonts["body"]) + 0.15
        # browser mock (chrome bar + image slot)
        bx, by, bw, bh = 6.9, 2.4, 5.9, 4.0
        self._rect(sl, bx, by, bw, 0.4, mix_hex(bg, ink, 0.12))
        for i, c in enumerate(["#460073", "#7500C0", "#A100FF"]):
            self._orb_solid(sl, bx + 0.2 + i * 0.24, by + 0.13, 0.14, c)
        self._img_box(sl, bx, by + 0.4, bw, bh - 0.4, s.get("image"),
                      fill=mix_hex(bg, accent, 0.06), hint="screenshot", body_col=body)
        self._footer(sl, idx, dark=dark)

    def showcase(self, s, idx):
        """Cascading image cards (offset stack) + headline/sublabel/body left (Premium showcase)."""
        sk, ink, body, accent, dark, bg = self._skin_or_light()
        sl = self._slide(); self._bg(sl, bg); x = 0.95
        self._skin_header(sl, s, sk=sk, ink=ink, accent=accent)
        by = 3.0
        if s.get("sublabel"):
            sc.sublabel(sl, x, by, 5.4, s["sublabel"], color=accent, font=self.fonts["body"]); by += 0.55
        bd = s.get("body"); bd = bd if isinstance(bd, list) else ([bd] if bd else [])
        if bd:
            self._text(sl, x, by, 5.3, 2.5, "\n\n".join(bd), size=14, color=body,
                       font=self.fonts["body"], line_spacing=1.45)
        imgs = s.get("images", []) or [None, None, None]
        cw, ch, off = 4.4, 2.5, 0.55
        bx, byy = 6.6, 2.2
        for i in range(min(3, len(imgs))):
            self._img_box(sl, bx + i * off, byy + i * off, cw, ch, imgs[i],
                          fill=mix_hex(bg, accent, 0.10 + 0.04 * i), hint="", body_col=body)
        self._footer(sl, idx, dark=dark)

    def code(self, s, idx):
        """Code-editor mock window (traffic-light chrome + monospace) — Dark signature.
        Left: headline + body/bullets. Right: the window."""
        sk, ink, body, accent, dark, bg = self._skin_or_light()
        sl = self._slide(); self._bg(sl, bg); x = 0.95
        self._skin_header(sl, s, sk=sk, ink=ink, accent=accent)
        ly = 3.45
        b = s.get("body"); b = b if isinstance(b, list) else ([b] if b else [])
        if b:
            self._text(sl, x, ly, 5.5, 2.4, "\n\n".join(b), size=14, color=body,
                       font=self.fonts["body"], line_spacing=1.45)
            ly += 0.5 + 0.4 * len(b)
        for i, bl in enumerate(s.get("bullets", [])):
            sc.bullet(sl, x, ly + i * 0.58, 5.5, bl, dot_color=accent, text_color=ink,
                      font=self.fonts["body"], marker=self._bullet_marker())
        # window
        wx, wy, ww, wh = 6.9, 2.75, 5.5, 3.95
        mono = self.fonts.get("mono", "Courier New")
        self._rect(sl, wx, wy, ww, wh, "#0D0D14")
        self._rect(sl, wx, wy, ww, 0.5, "#1E1E28")
        for i, c in enumerate(["#460073", "#7500C0", "#A100FF"]):
            self._orb_solid(sl, wx + 0.22 + i * 0.28, wy + 0.17, 0.16, c)
        if s.get("filename"):
            self._text(sl, wx + 1.3, wy, ww - 1.4, 0.5, s["filename"], size=11,
                       color="#9CA3AF", font=mono, anchor=MSO_ANCHOR.MIDDLE)
        cy, step = wy + 0.7, 0.25
        max_lines = int((wy + wh - 0.15 - cy) / step)
        for ln in s.get("code", [])[:max_lines]:
            st = (ln or "").strip()
            if st.startswith("#"):
                col = accent
            elif st.startswith("//") or st.startswith("- "):
                col = "#6B7280"
            else:
                col = "#E6E6EA"
            self._text(sl, wx + 0.32, cy, ww - 0.55, 0.28, ln, size=12, color=col,
                       font=mono, line_spacing=1.0)
            cy += step
        self._footer(sl, idx, dark=dark)

    # ── helpers ──────────────────────────────────────────────────────────
    def _resolve(self, path):
        if not path:
            return None
        if os.path.isabs(path):
            return path
        return os.path.join(self.base_dir, path)

    def _asset(self, rel):
        """Resolve a style-pack asset path (relative to the style.json folder)."""
        if not rel:
            return None
        return rel if os.path.isabs(rel) else os.path.join(self.style_dir, rel)

    def _motif(self, key):
        return (self.style.get("motifs") or {}).get(key) if self.style else None

    def _content_skin(self):
        return bool(self.style and self.style.get("content_skin"))

    def _accent_word(self):
        """Whether this reference colours an accent word in headlines (Premium/Canvas yes,
        Dark no). De-mix: each reference honours its OWN convention."""
        return (self.style.get("motifs") or {}).get("accent_word", True) if self.style else True

    def _bullet_marker(self):
        """Per-reference bullet marker: Premium/most = dot, Dark = check."""
        b = (self.style.get("bullets") or {}).get("style", "") if self.style else ""
        return "check" if "check" in (b or "") else "dot"

    def _hruns(self, title, accent, color):
        """Headline runs, applying an accent word only if the reference uses one."""
        if accent and self._accent_word():
            return [(title + " ", {}), (accent, {"color": color})]
        # no accent word for this reference → join into a plain headline
        return [((title + " " + accent).strip() if accent else title, {})]

    def _skin(self):
        """Colour roles for the content skin, adapting to light vs dark references."""
        if self.layout.get("mode") == "dark":
            return {
                "bg": self.pal["paper"], "ink": self.pal["ink"], "body": "#D1D5DB",
                "muted": self.pal["gray"], "accent": self.pal["brand1"],
                "eyebrow_num": self.pal["ink"], "eyebrow_label": self.pal["brand1"],
                "card1": self.pal["soft1"], "card2": self.pal["soft2"],
                "card_num": self.pal["brand1"], "card_ink": "#FFFFFF", "card_body": "#D1D5DB",
                "statement_bg": self.pal["dark"], "statement_ink": "#FFFFFF",
                "statement_accent": self.pal["brand1"],
            }
        return {
            "bg": self.pal["paper"], "ink": self.pal["ink"], "body": self.pal["gray"],
            "muted": self.pal["gray"], "accent": self.pal["brand1"],
            "eyebrow_num": self.pal["ink"], "eyebrow_label": self.pal["ink"],
            "card1": self.pal["brand2"], "card2": self.pal["brand3"],
            "card_num": "#FFFFFF", "card_ink": "#FFFFFF", "card_body": "#E6DCFF",
            "statement_bg": self.pal["brand1"], "statement_ink": "#FFFFFF",
            # on a solid purple field, any purple tint is low-contrast → keep the whole
            # statement white (matches Premium's real all-white statements).
            "statement_accent": "#FFFFFF",
        }

    @staticmethod
    def _split_eyebrow(eyebrow):
        """'01 · Il contesto' → ('01', 'Il contesto'); '02 · La soluzione' → ('02', …)."""
        if not eyebrow:
            return "", ""
        for sep in (" · ", " — ", " - ", ". "):
            if sep in eyebrow:
                a, b = eyebrow.split(sep, 1)
                return a.strip(), b.strip()
        m = re.match(r"^\s*(\d{1,2})\s+(.*)$", eyebrow)
        if m:
            return m.group(1), m.group(2).strip()
        return "", eyebrow.strip()

    DISPATCH = {
        "cover": "cover", "agenda": "agenda", "divider": "divider",
        "quote": "quote", "context": "context", "now": "now", "team": "team",
        "pillars": "pillars", "pillar-detail": "pillar_detail",
        "focus": "focus", "metrics": "metrics", "thank-you": "thank_you",
        "content": "content", "gallery": "gallery",
        "from-to": "from_to", "bar": "bar", "donut": "donut",
        "table": "table", "taxonomy": "taxonomy", "code": "code",
        "timeline": "timeline", "flow": "timeline", "gantt": "gantt",
        "ratings": "ratings", "logos": "logos", "donuts": "donuts",
        "pricing": "pricing", "decision": "decision", "activity": "activity",
        "map": "map", "risk": "risk", "phoneflow": "phoneflow",
        "finding": "finding", "showcase": "showcase",
    }

    def render(self):
        slides = self.model.get("slides", [])
        self.total = len(slides)
        for i, s in enumerate(slides, start=1):
            t = s.get("type", "content")
            method = getattr(self, self.DISPATCH.get(t, "content"))
            method(s, i)
        return self.prs


def _img_dims(path):
    """Return (w, h) for PNG/JPEG without external deps; None if unknown."""
    try:
        with open(path, "rb") as f:
            data = f.read(26) if False else f.read()
    except Exception:
        return None
    if data[:8] == b"\x89PNG\r\n\x1a\n" and data[12:16] == b"IHDR":
        import struct
        return struct.unpack(">II", data[16:24])
    if data[:2] == b"\xff\xd8":  # JPEG
        import struct
        i = 2
        while i < len(data) - 9:
            if data[i] != 0xFF:
                i += 1; continue
            marker = data[i + 1]
            if 0xC0 <= marker <= 0xCF and marker not in (0xC4, 0xC8, 0xCC):
                h, w = struct.unpack(">HH", data[i + 5:i + 9])
                return (w, h)
            seg = struct.unpack(">H", data[i + 2:i + 4])[0]
            i += 2 + seg
    return None


def mix_hex(h1, h2, t):
    a = hex_to_rgb(h1); b = hex_to_rgb(h2)
    return "#%02X%02X%02X" % (
        int(a[0] + (b[0] - a[0]) * t),
        int(a[1] + (b[1] - a[1]) * t),
        int(a[2] + (b[2] - a[2]) * t),
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("model")
    ap.add_argument("spec", nargs="?", help="design-spec.json")
    ap.add_argument("output")
    ap.add_argument("--spec-inline", help="design-spec as inline JSON string")
    ap.add_argument("--style", help="reference style pack (style.json) → fidelity mode")
    args = ap.parse_args()

    with open(args.model, encoding="utf-8") as f:
        model = json.load(f)
    model.setdefault("_base_dir", os.path.dirname(os.path.abspath(args.model)))

    if args.spec_inline:
        spec = json.loads(args.spec_inline)
    elif args.spec and os.path.exists(args.spec):
        with open(args.spec, encoding="utf-8") as f:
            spec = json.load(f)
    else:
        spec = DEFAULT_SPEC

    # fidelity mode: a style pack can carry palette/fonts/layout (merged into the spec)
    # plus asset mappings + motif flags (consumed directly by the Renderer).
    style, style_dir = None, "."
    if args.style and os.path.exists(args.style):
        with open(args.style, encoding="utf-8") as f:
            style = json.load(f)
        style_dir = os.path.dirname(os.path.abspath(args.style))
        for k in ("palette", "fonts", "layout"):
            if k in style:
                spec.setdefault(k, {}); spec[k].update(style[k])
        if "decoration" in style:            # a style pack may set its own bg motif
            spec["decoration"] = style["decoration"]

    prs = Renderer(model, spec, style, style_dir).render()
    prs.save(args.output)
    print(f"✓ Wrote {args.output}  ({len(prs.slides._sldIdLst)} slides)")


if __name__ == "__main__":
    main()
