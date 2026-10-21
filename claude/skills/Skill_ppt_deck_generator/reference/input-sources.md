# input-sources — how to turn any input into a deck-model

The skill has two content sources (SKILL.md Q2) and three creative directions
(Q3). This file explains how to ingest each and produce `deck-model.json`
(content) + `design-spec.json` (look).

## Source A — Free text

The user pastes text. It may be **free-form prose** or an **already-structured
outline**. Auto-detect, don't ask:

**Structured signals** (treat as authored structure → follow it faithfully):
- Markdown headings (`#`, `##`), or lines like `Slide 1:`, `---` separators.
- Bullet lists under headings.
- An explicit "Agenda / Indice" block.

→ Map each heading to a slide, its bullets to the slide's items/body. Choose the
best slide `type` per the taxonomy (cover for the first, divider for chapter
breaks, agenda for the outline, thank-you for the close).

**Free-form prose** (no structure):
- *You* (the LLM) do the semantic structuring. Read the whole text, identify the
  narrative arc, and split it into slides: a cover, an agenda, chapter dividers,
  context/quote/metrics/pillars where the content fits, a closing.
- Add a short numbered `eyebrow` to each slide for continuity.
- **Never invent facts.** Restructure and tighten the user's words; do not add
  data, names, or numbers that aren't in the source. If a slide type needs a
  field the text lacks, leave it empty or ask.

Either way, the output is a `deck-model.json`.

## Source B — Existing deck (`.pptx` or `.pdf`)

Extract the *content* to re-author (this is **not** fidelity copy — fidelity was
removed; here we lift text and rebuild it cleanly in the chosen look).

- **`.pptx`** → `python3 scripts/extract_pptx.py <file> --extract-media <out>/photos`
  Gives per-slide text + palette + media inventory. Build the model from the text.
- **`.pdf`** → read it with the Read tool (it supports PDF pages) to get the text
  per page; or `pdftotext`/`pdftoppm` if available. Build the model from the text.

Map the extracted slides to model slide types just like free text. The user's
chosen creative direction (Q3) decides the look, independent of the original.

## Creative direction → design-spec

### a) ACN SONG guidelines
Load `brand/acn-song/tokens.json` for palette + fonts; logos from
`brand/acn-song/logo/`. Build the spec from those tokens. **Always ask first**
whether to use ACN SONG (SKILL.md Q3a) — never assume. Variety stays within brand
(layout / decoration / type-scale may vary; brand colors do not).

### b) Inspiration (user attaches a reference)
The reference can be **any** of these — accept whatever the user attaches:

| Reference | How to read it |
|---|---|
| `.pptx` | `extract_pptx.py` → dominant `srgbClr` palette + any fonts |
| `.pdf` | Read tool (PDF pages) — look at colors, type, layout |
| `.html` (local file) | Read it directly — pull palette/fonts from CSS (`color`, `background`, `font-family`, CSS vars), infer layout + decoration. Optionally open it in a browser/preview tool for the rendered look. |
| image / screenshot | Read tool (reads images) — infer palette, type style, layout, decoration |
| Figma file or URL | Figma MCP tools (`get_design_context`, `get_screenshot`, `get_variable_defs`, `get_metadata`). A `.fig`/Figma link → open via the tools; pull variables (color/type tokens) and a screenshot. |
| web URL | `WebFetch` for content/CSS; visit for visual style |

From the reference, derive a `design-spec`: dominant hues → palette, serif/sans
detection → fonts, alignment + spacing → layout, motif → decoration. Goal:
*recognizably the same visual family*, with the user's new text.

### c) Custom
Ask the user for an inspiration (any of the above) **or** proceed automatically.
Either way, author a **fresh** `design-spec` by sampling the variation axes in
`reference/design-spec.md` — and make it genuinely different from prior decks.
Load the `frontend-design` skill to raise the typography/color quality.

## Multimedia (SKILL.md Q4)

If the user wants photos/videos, tell them the exact folder to drop files into:

```
<output>/photos/     ← images (jpg/png/webp)
<output>/video/      ← videos (mp4) + optional poster frames
```

Then reference them from the model (`"photo"`, `"image"`, `"video"`, `"poster"` —
see `reference/deck-model.md → Media`). HTML embeds them directly; `build_pptx.py`
places images with `add_picture` and videos with `add_movie`.
