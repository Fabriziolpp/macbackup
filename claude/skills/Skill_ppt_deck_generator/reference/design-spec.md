# design-spec — the visual contract + the anti-sameness engine

The **design-spec** is a JSON object describing *how a deck looks*, separately from
*what it says* (`reference/deck-model.md`). Both the HTML renderer and
`scripts/build_pptx.py` consume it. Swap the spec, keep the model → same content,
different look.

> **Why this file matters.** The #1 failure mode of AI decks is *sameness*: every
> output drifts back to the same purple/orbs/italic "editorial" look. This document
> exists to force genuine variety. In **custom / automatic** mode you MUST author a
> fresh spec each run by sampling the axes below — never default to a previous deck.

## Schema

```json
{
  "name": "swiss-amber",
  "mood": "preciso, caldo, tecnico",
  "fonts": {
    "heading": "Helvetica Neue",
    "body": "Helvetica Neue",
    "accent": "Helvetica Neue",
    "accent_italic": false
  },
  "palette": {
    "brand1": "#E8590C",  "brand2": "#F08C00", "brand3": "#7A3000",
    "dark":   "#1A1A1A",  "soft1":  "#FFE8CC", "soft2":  "#FFC078",
    "ink":    "#1A1A1A",  "gray":   "#868E96", "paper":  "#FAFAF8"
  },
  "layout":   { "align": "left", "radius": 4, "dark_dividers": false },
  "decoration": "blocks"
}
```

| Field | Meaning | Renderer use |
|---|---|---|
| `name`, `mood` | label + one-line art direction | documentation only |
| `fonts.heading` | display/headline face | titles, numerals, accents |
| `fonts.body` | text face | paragraphs, labels, captions |
| `fonts.accent` | optional face for the accent word | cover/divider accent run |
| `fonts.accent_italic` | italicize the accent run? | accent treatment |
| `palette.brand1..3` | primary → deep brand ramp | accents, numerals, fills |
| `palette.dark` | dark-background color | covers, dividers, quotes |
| `palette.soft1/2` | tints for chips, cards, glows | soft fills, dots |
| `palette.ink` | body text on light bg | paragraphs |
| `palette.gray` | muted text | captions, footers |
| `palette.paper` | light slide background | content slides |
| `layout.align` | `left` or `center` | headline alignment |
| `layout.radius` | corner radius (px, HTML) | card rounding |
| `layout.dark_dividers` | dividers dark vs light | divider background |
| `decoration` | `orbs` \| `blocks` \| `lines` \| `dots` \| `none` | background motif |

`build_pptx.py` reads `palette`, `fonts`, `layout`, `decoration`. The HTML renderer
maps `palette.*` onto the theme CSS vars (`--brand-1 … --soft-2`, `--ink`, `--gray-3`)
and picks the structural treatment from `decoration` / `layout`.

## The four creative modes → how the spec is produced

1. **ACN SONG** (`brand/acn-song/`): load palette + fonts from the brand profile.
   Do **not** randomize brand colors. Variety comes from layout/decoration/type-scale
   only, within brand. (See `brand/acn-song/README.md`.)
2. **Inspiration** (user attached `.pptx` / `.pdf` / image / URL): derive the spec
   from the reference — sample its dominant colors, detect serif vs sans, mirror its
   alignment and decoration language. Goal: *recognizably the same family*.
3. **Custom / automatic**: author a **brand-new spec each time** using the axes below.
   This is where anti-sameness is mandatory.
4. **(HTML only) named theme**: when the user picks one of the 6 themes, use that
   theme's `themes/<name>/style.css` directly; the spec just carries the palette.

## Variation axes — sample DIFFERENTLY each custom run

Before writing a custom spec, make an explicit choice on each axis and write a
one-line **art-direction brief**. Deliberately avoid the combination you produced
last time. (When generating multiple variants at once, force a different pick per axis.)

**A. Typographic system** (pick one)
- Serif display + sans body (editorial)
- Grotesk display + grotesk body (Swiss/neutral)
- Humanist sans throughout (warm, approachable)
- Mono accent + sans body (technical/dev)
- High-contrast didone display + sans body (luxury/fashion)
- Condensed/extended display (bold/sport/manifesto)

**B. Color logic** (pick one)
- Monochrome + 1 accent
- Duotone (two strong hues)
- Warm neutral paper + earthy accent
- Dark canvas + neon accent
- Pastel / low-saturation
- High-contrast black/white + single primary

**C. Layout philosophy** (pick one)
- Left-aligned editorial (asymmetric, generous margins)
- Centered / symmetrical
- Wide split (40/60 or 60/40)
- Boxed / grid-heavy (Swiss)
- Full-bleed type (oversized words)

**D. Decoration language** (pick one → maps to `decoration`)
- `orbs` (soft glows) · `blocks` (color bars) · `lines` (rules/grid) ·
  `dots` (pattern) · `none` (pure typography)

**E. Corner & density**
- Sharp (radius 0-4) vs rounded (14-22); tight vs airy spacing.

**Forbidden default:** purple `#A100FF` + orbs + serif-italic, *unless* the brand
(ACN SONG / DESIGN.md / inspiration) actually calls for it. That specific combo is
the "samey" baseline — only use it when explicitly warranted.

## Quality bar (apply the `frontend-design` skill philosophy)

A spec is only good if the result looks *intentional*, not templated:
- **Type pairing** with real contrast (weight, style, or family) — not one font at
  three sizes.
- **A restrained palette** (2-3 hues + neutrals), used consistently.
- **One clear accent** doing the emotional work; everything else calm.
- **Consistent spacing rhythm** and alignment; nothing floating arbitrarily.
- **A signature move** per deck (a motif, a numeral treatment, an edge) that ties
  slides together — and differs from other decks.

When in doubt, load the `frontend-design` skill and let it shape the typography and
color choices before committing the spec.

## Example specs (illustrative — generate your own, don't reuse blindly)

```jsonc
// "Swiss amber" — grotesk, warm neutral, blocks, sharp
{ "name":"swiss-amber", "fonts":{"heading":"Helvetica Neue","body":"Helvetica Neue","accent_italic":false},
  "palette":{"brand1":"#E8590C","brand2":"#F08C00","brand3":"#7A3000","dark":"#1A1A1A","soft1":"#FFE8CC","soft2":"#FFC078","ink":"#1A1A1A","gray":"#868E96","paper":"#FAFAF8"},
  "layout":{"align":"left","radius":4,"dark_dividers":false}, "decoration":"blocks" }

// "Midnight teal" — mono accent, dark neon, dots
{ "name":"midnight-teal", "fonts":{"heading":"Space Grotesk","body":"Inter","accent_italic":false},
  "palette":{"brand1":"#0CA678","brand2":"#099268","brand3":"#0B3D2E","dark":"#0B0F0E","soft1":"#0E2A22","soft2":"#63E6BE","ink":"#0B0F0E","gray":"#7C8A86","paper":"#F4F8F6"},
  "layout":{"align":"left","radius":8,"dark_dividers":true}, "decoration":"dots" }

// "Paper & ink" — serif display, monochrome, lines, centered
{ "name":"paper-ink", "fonts":{"heading":"Georgia","body":"Inter","accent_italic":true},
  "palette":{"brand1":"#1E1E1E","brand2":"#444","brand3":"#000","dark":"#111","soft1":"#EEE","soft2":"#CCC","ink":"#111","gray":"#888","paper":"#FBFBF9"},
  "layout":{"align":"center","radius":0,"dark_dividers":false}, "decoration":"lines" }
```
