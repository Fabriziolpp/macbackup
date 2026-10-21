---
name: Skill_ppt_deck_generator
description: Create a presentation from pasted text, as a native PowerPoint (.pptx), a modern animated single-page interactive HTML deck, or both. Drives a clickable 5-question intake widget (format → creative direction → conditional reference/brand → multimedia → text) that auto-launches and regenerates its reference options from the saved style library. Three creative directions — ACN SONG (one reference from the library, incl. the FY26 Song Standard), MIX (autonomous best-of: the strongest archetypes from all references on one coherent Song canvas), or Custom (an external brand via URL/Figma or a DESIGN.md). Includes a mandatory render→inspect→fix visual QA loop. Trigger when the user wants to "make a presentation / ppt / deck", "turn this text into slides", "convert a pptx to html", "build a web deck", or shares text/a .pptx/.pdf and asks for a presentation.
---

# Skill_ppt_deck_generator

Build a presentation from pasted **text**, output as a native **`.pptx`**, an animated
**HTML** deck, or **both**. The look comes from an **ACN SONG** reference (one picked
from the saved library, including the FY26 Song Standard), a **MIX** (autonomous best-of
that composes the strongest archetypes from *all* references on one coherent Song canvas),
or a **Custom** external brand (a website/Figma URL or a `DESIGN.md`).

Two contracts keep this clean (read them):
- **`reference/deck-model.md`** — the *content* model (JSON). What the deck says.
- **`reference/design-spec.md`** — the *visual* spec (JSON) + the anti-sameness engine.

```
  text ──▶ deck-model.json ──┬──▶ HTML deck  (themes + design-spec)
                             └──▶ .pptx       (scripts/build_pptx.py + design-spec)
          look = design-spec.json  (ACN SONG reference | Custom brand)
```

**Impact and craft are co-equal.** A deck that is on-brand but flat, or striking but
sloppy, both fail. The look is *bought* by two disciplines that this skill enforces and
that separate a good deck from a bad one — do not skip either:

1. **Study a visual benchmark before composing** (§Study the references).
2. **Close the loop with visual QA after building** (§Required visual QA).

Generating without looking at the rendered result is generating blind — it is the single
biggest cause of weak layout.

## Environment preconditions — check before generating

This skill depends on system tools that are not in the repo. Verify them before
generating; if one is missing, **stop and tell the user what to install** rather than
shipping a deck you could not visually check:

- **LibreOffice** (`soffice`) — renders slides to images for both studying references
  and the mandatory visual QA. `brew install --cask libreoffice`. Without it you render
  blind — flag it, do not fall back to shipping unchecked.
- **A PDF→PNG renderer** — `pdftoppm` (`brew install poppler`) or PyMuPDF
  (`pip3 install pymupdf`). `scripts/render_preview.py` uses whichever is present.
- **The deck font at OS level** — for ACN SONG this is **Graphik** (in
  `brand/acn-song/fonts/`). If it is not installed system-wide, LibreOffice renders
  with a substitute face and both the QA previews and the opened `.pptx` show the wrong
  type. Install it, or warn the user that the render is font-approximate.
- **`python-pptx`** (+ `pillow`) — the build scripts import them; a `ModuleNotFoundError`
  names the exact missing module.

## Study the references — before composing

Before authoring layouts, fix the craft bar by *looking* at a real benchmark, don't
compose from the abstract spec alone:

- **ACN SONG · Song Standard** → the FY26 master template is not bundled; study its
  distilled form instead: `brand/acn-song/song-layouts.md` (archetype index),
  `brand/acn-song/DESIGN.md` (rulebook), plus `themes/song-standard/` and
  `brand/acn-song/song-standard.json`. Match your slides' composition, whitespace, scale
  drama, and the deconstructed-bar title moments to those. (If you *have* the master
  `.pptx`/`.pdf` locally, render it with `render_preview.py` and read the PNGs too.)
- **ACN SONG · library reference** → render **that one** deck
  (`scripts/render_preview.py reference-decks/<file> --out build/ref-previews/<name>`),
  read the PNGs, and derive the `design-spec` from it alone. Exactly one reference guides
  a deck — never study several together or blend styles.
- **Custom (external brand)** → render/screenshot the URL/Figma or read the attached
  `DESIGN.md`, load the `frontend-design` skill, and hold a concrete target (type system,
  color logic, hero moment) before composing — not a generic default.

## Workflow — the intake widget (5 questions, auto-launched)

**MANDATORY: the widget is the very first thing you do — before any text.** On skill
invocation, do NOT greet, ask, or explain in prose. Launch the clickable intake widget
straight away, following these steps in order:

1. **Read `reference-decks/INDEX.md`** to get the current library (it grows over time).
2. **Regenerate the ACN SONG reference buttons.** Take `assets/intake-widget.html` and
   replace everything between `<!-- ACN-REFS:BEGIN … -->` and `<!-- ACN-REFS:END -->`
   with **one `<button>` per library entry**, in this exact shape:
   ```html
   <button type="button" class="opt card" data-value="<Name> (<file>)"><span class="dot" aria-hidden="true"></span><span><span class="ot"><short label></span><span class="os"><one-line hint></span></span><span class="ck">✓</span></button>
   ```
   Always keep **"Song Standard (template FY26 ufficiale)"** as the first/default button,
   then one button per `INDEX.md` entry (`data-value` = its name + filename). The rest of
   the HTML is passed through unchanged.
3. Call `mcp__visualize__read_me` (`["interactive","elicitation"]`), then
   `mcp__visualize__show_widget` with the regenerated HTML.
4. **Wait for the `sendPrompt()` config string** the widget sends on submit. Only then
   build. In a graphical client the widget IS the intake — don't also ask in prose.

> **Environment fallback (terminal / CLI — e.g. Warp).** The clickable widget only renders
> in **graphical** Claude clients (desktop app, `claude.ai/code`, IDE extensions). If
> `mcp__visualize__show_widget` is unavailable or the surface is a plain **terminal/CLI**
> (no inline HTML), DO NOT try to force it — fall back to a **concise plain-text intake**:
> ask the same **5 questions in order** (1 Formato · 2 Direzione `ACN SONG`/`MIX`/`Custom`
> → conditional reference-pick or brand-ref · 3 Multimedia · 4 read `INDEX.md` and list the
> references by name for the ACN SONG pick · 5 paste the text), wait for the answers, then
> build exactly as if they came from the widget. The intake questions are identical; only
> the delivery differs. (For the ACN SONG reference list, read `INDEX.md` and show the names
> + one-line "use for" so the user can pick one; for MIX no pick is needed.)

> The reference buttons must always mirror `reference-decks/INDEX.md`. Adding a reference
> = drop the file in `reference-decks/` + one row in `INDEX.md`; the widget picks it up
> automatically on the next launch. The buttons hardcoded in the file are only a fallback.

### What the widget collects (5 questions)

**Q1 — Format.** `PPT` (.pptx) · `Deck interattivo` (HTML) · `Entrambi` (both).
- PPT → `scripts/build_pptx.py` (§Build · PPTX). HTML → §Build · HTML.
- Entrambi → build both from the **same deck-model** (§Multi-variant).

**Q2 — Creative direction.** `ACN SONG` · `MIX` · `Custom`.

**Q3 — Disambiguation (conditional on Q2):**

- **ACN SONG → which reference** (chosen from the library, incl. Song Standard). Exactly
  one guides the deck — never blend.
  - **Song Standard** → the canonical FY26 master look. **Read `brand/acn-song/DESIGN.md`**
    (authoritative rulebook: palette, type, deconstructed bar, ratios, layout) and **use
    `brand/acn-song/song-layouts.md` as the SELECTION INDEX**: for each content block run
    its "How to choose" and match the real FY26 archetype (case study 165, results 172,
    team 181, timeline 147, from→to 69, donut 109, …), not a generic type. **If a block
    has or needs images, pick an image-bearing archetype — never drop imagery.** Use
    `themes/song-standard/` (HTML) + `brand/acn-song/song-standard.json` (PPTX) + load
    `brand/acn-song/tokens.json`. If brand assets (fonts/logo) are missing, ask.
  - **A library reference** (Premium / Dark / Canvas / Essential / …) → **render that one
    deck** to images (`scripts/render_preview.py reference-decks/<file> --out build/ref-previews/<name>`),
    **study the PNGs**, and derive the `design-spec` **from that reference alone**. Still
    honor the ACN SONG palette/type where the reference is itself on-brand.
    - **Fidelity mode (§Fidelity).** If the reference has a **style pack**
      (`reference-decks/<slug>/style.json`), reproduce its *actual graphic elements* —
      not just palette/type. Build with `--style` (§Build · PPTX): cover/divider reuse
      the reference's real extracted assets and the signature motifs come from
      `scripts/style_components.py`. No style pack yet → fall back to the clean generic
      look and offer to build one (§Fidelity).
- **MIX → autonomous best-of (§MIX).** The skill composes the *best archetype per content
  block* from **all** references, on **one coherent Song canvas**. No reference is picked
  and nothing is attached — it is fully autonomous. Build with the synthetic pack
  `reference-decks/mix/style.json`. This is the **one sanctioned exception** to "one
  reference per deck": MIX blends *archetypes* (structures), never palettes — colours stay
  Song, the canvas stays single (light, numbered eyebrow, chevron footer). See §MIX.
- **Custom → external brand** (a brand *different from* ACN SONG). The reference is
  either a URL (website / Figma) typed in the widget, or a `DESIGN.md` / brand guidelines
  attached in chat.
  - URL/Figma → fetch and study it (WebFetch / Figma tools / screenshot), derive the
    `design-spec` from it.
  - Attached `DESIGN.md` → read it and apply **its** tokens (palette/type/components) —
    do not force ACN SONG.
  - Either way, **load the `frontend-design` skill** to raise typography/color quality,
    and author a **fresh, distinctive `design-spec`**. Never fall back to the default
    purple/orbs/italic look.

> **Non-negotiable — variety & quality.** Custom decks and multi-option runs MUST look
> genuinely different and intentionally designed. Make an explicit choice on every axis
> (type system, color logic, layout, decoration, density); don't repeat the previous
> deck's combo. See `reference/design-spec.md → Variation axes` and `→ Quality bar`.

**Q4 — Multimedia.** `Sì` · `No`.
- **Sì** → images go in `<output>/photos/`, videos in `<output>/video/` (+ optional
  poster); reference them in the model (`photo` / `image` / `video` / `poster`, see
  `reference/deck-model.md → Media`). Files are attached in chat; create the folders
  after start.
- **No** → skip.

**Q5 — Source text.** The pasted deck content (textarea). Auto-detect free-form vs
structured outline (see `reference/input-sources.md → Source A`). This is the only
content source in the widget; if the user instead attaches a `.pptx`/`.pdf` to reuse,
extract it with `scripts/extract_pptx.py` (pptx) or the Read tool / `pdftotext` (pdf).

## Authoring — build the deck-model

Regardless of source, produce a `deck-model.json` (see `reference/deck-model.md`):
1. **Choose the layout per block — autonomously, from the reference's catalogue.** If the
   chosen reference has a **`patterns.md`** (its captured archetype + element catalogue,
   e.g. `reference-decks/premium/patterns.md`), use it as the SELECTION INDEX: for each block
   of the user's content, identify its intent (definition / list / comparison / single
   stat / many stats / process / quote / showcase / finding / case study / …), match the
   archetype whose **triggers** fit, and emit that archetype's deck-model fields. Prefer an
   `engine: ✅` archetype; if the ideal one is `⚙️/○`, fall back to the nearest ✅ and note
   the gap. This is what makes the deck *look like the reference*, not generic. Absent a
   `patterns.md`, choose the best generic **slide type** per `reference/slide-types.md`
   (cover, agenda, divider, quote, context, now, team, pillars, pillar-detail, focus,
   metrics, thank-you; `content` as fallback).
2. Give every slide an `eyebrow` (e.g. `"01 · Contesto"`) for narrative continuity.
3. **Never invent text.** Restructure the user's words; don't add facts/names/numbers.
   (Colouring an existing word via `title_accent`, and short structural labels like
   sublabels/eyebrows, are allowed — they add no facts.)
4. **Never silently drop content.** If something fits no type, use a `content` slide
   or ask the user.

## Authoring — build the design-spec

Produce a `design-spec.json` (see `reference/design-spec.md`) from the Q3 direction:
- ACN SONG → from `brand/acn-song/tokens.json`.
- Inspiration → derived from the reference.
- Custom → freshly sampled across the variation axes (distinctive each time).

## MIX — autonomous best-of across references (Q2 = MIX)

Compose the deck from the **best archetype for each content block, drawn from _every_
reference**, on **one coherent Song canvas**. MIX is coherent (not a mess) precisely because
colours are always Song and the base skin is uniform — it blends *structures/archetypes*,
never palettes or canvas.

1. **Build with the synthetic pack** `reference-decks/mix/style.json` (Song palette, `mode:
   light`, `decoration:"bar"` for cover/divider, numbered eyebrow, chevron footer, full
   content skin). Pass it via `--style` exactly like a reference style pack.
2. **Read ALL `reference-decks/*/patterns.md`** (the union of archetypes) — not just one.
   For each content block, classify its intent and pick the best-fitting archetype from
   **any** reference: Premium (donut, bento, blade cover, gauge, comparison-table, taxonomy,
   arc-risk, map), Dark (code-mock, decision, status cards, timeline), Canvas
   (phone-flow, finding, ratings), Essential (activity, pricing, phase-flow), plus gantt / logos
   / statement / etc. All are Song-purple `build_pptx.py` types.
3. **Keep the canvas constant.** One light Song base + one eyebrow/footer convention across
   the whole deck. Do NOT flip light/dark or change conventions per slide. Vary only the
   **archetype**.
4. **Maximise archetype variety** (don't reuse the same layout) so the deck showcases the
   mixed vocabulary — then run the mandatory §Required visual QA loop.

## Build · PPTX  (Q1 = PPT)

```bash
python3 ~/.claude/skills/Skill_ppt_deck_generator/scripts/build_pptx.py \
    <deck-model.json> <design-spec.json> <output.pptx> \
    [--style reference-decks/<slug>/style.json]      # fidelity mode (optional)
```

`build_pptx.py` renders a native 16:9 PowerPoint: backgrounds, palette, fonts,
per-type layouts, decoration (orbs/blocks/lines/dots/none), images (`add_picture`)
and videos (`add_movie`) — all driven by the spec. With `--style` it enters **fidelity
mode** (§Fidelity): the style pack's palette/fonts are merged in, and cover/divider/cards
are drawn from the reference's real assets + `scripts/style_components.py`. The file is
fully editable in PowerPoint. **Honest limit:** a native `.pptx` is a faithful *static*
interpretation — CSS gradients/animations aren't reproduced 1:1.

## Fidelity — make a deck actually look like its reference

A reference chosen in the widget should reproduce its **actual graphic elements** (blade
covers, dark section openers, rounded-gradient cards, pills, chevrons, data-viz), not
just its colours. That is what a **style pack** does. Fidelity is bought two ways:

> **HARD RULE — colours are ALWAYS ACN Song.** Every deck uses the Song purple system
> (`#A100FF / #7500C0 / #460073`, darks `#1B0A46`/`#120A1C`, light purples `#E6DCFF`/
> `#C2A3FF`) regardless of the reference. A reference contributes **layout / structure /
> graphic-element vocabulary only — never its own colours.** Recolour any multicolour
> reference asset to a Song-purple ramp. Dark → dark + Song purple (not blue);
> Canvas → light + Song purple (not orange).
>
> **HARD RULE — no layout bleed.** Each reference uses **its own** content archetypes and
> conventions (eyebrow / accent-word / bullet / footer / card styles from its `style.json`
> + `patterns.md`), never Premium's. A deck for reference X must not look like recoloured Premium.

- **Reused assets** — decorative backgrounds/images (e.g. Premium's blade cover) are
  *extracted* from the reference `.pptx` and reused 1:1. High fidelity, near-automatic.
- **Composed components** — signature motifs and data-viz are drawn by the shared catalog
  `scripts/style_components.py` (image cover, scrim, rounded gradient card, pill, chevron,
  …), parametrised by the reference's palette. A reference only writes bespoke code if a
  motif isn't in the catalog.

**Style pack layout** (`reference-decks/<slug>/`):
```
style.json    palette + fonts + per-element mapping (cover/divider assets, cards, motifs)
patterns.md   the reference's CAPTURED CATALOGUE + selection index: every graphic element
              and every slide archetype, each with triggers ("use when…") + deck-model
              mapping + engine status. This is the reference's durable "memory" and drives
              autonomous layout selection (see §Authoring step 1).
assets/       image assets extracted from the reference (cover-bg.png, …) — curate:
              keep decorative backgrounds, NOT the reference's own content photos
components.py  (optional) bespoke motifs not in the shared catalog
```

**Onboarding a NEW reference to fidelity — start with the scaffolder:**
0. **Scaffold:** `python3 scripts/init_style_pack.py reference-decks/<file>.pptx` → creates
   `reference-decks/<slug>/` with a **Song `style.json`** (light/dark auto-detected by
   rendering content pages), detected fonts, background **candidates** in `assets/`
   (+ every image in `assets/_extracted/`), a **`patterns.md` STUB**, and a **draft
   `INDEX.md` row** (idempotent — filled with name/file/mode/marker; the look + "Use for"
   are left as ⟨TODO⟩). Colours are always Song — the reference's own colours are recorded
   only as a note, never applied.
1. **Curate `assets/`:** keep the real cover/divider background, delete the other candidates
   and content photos. (No clean bg → the scaffold uses `decoration:"bar"`, the Song cover.)
2. **Fill `patterns.md`:** render all slides, study them (a contact-sheet montage helps),
   catalogue every archetype + element with triggers (start from `premium/patterns.md`). **Map
   each to an existing engine type where possible — most are already ✅** (see the stub's
   banner); only a genuinely novel element needs a new component in `style_components.py`.
3. **Tune `style.json`:** verify mode, set the de-mix motifs (`eyebrow` numbered|uppercase-
   tracked · `footer` chevron|co-brand-lockup|song · `bullets.style` · `accent_word` ·
   `cards`), wire the cover/divider asset. **Complete the ⟨TODO⟩ placeholders** in the draft
   `INDEX.md` row (the look one-liner + the "Use for" trigger) — the widget and MIX already
   pick the reference up from that row.
4. Build with `--style`, run the **visual QA loop**, fix. Until curated it still works in the
   clean generic look — never blocked.

> No fully-automatic fidelity for arbitrary graphics: signature motifs/data-viz need a
> small one-time style pack per reference. The shared catalog keeps that mostly config.

## Build · HTML  (Q1 = deck interattivo)

1. Map model slides to markup from `reference/slide-types.md` (theme-agnostic classes).
2. Assemble `index.html` from `reference/template.html` (skeleton + JS + nav).
3. Inside `<style>`, concatenate `themes/_shared.css` + a theme `style.css`, then in
   `:root` override the palette vars (`--brand-1 … --soft-2`, `--ink`, `--gray-3`)
   with the `design-spec` palette. For custom decks, author bespoke CSS guided by the
   spec instead of forcing a stock theme.
4. Always include: topbar (logo + counter / back-link), footbar, floating nav,
   progress bar, keyboard (← → Space PgUp/Dn Home End), touch swipe, debounced wheel,
   `data-anim` staggered entries.
5. Optional standalone single-file build:
   ```bash
   python3 ~/.claude/skills/Skill_ppt_deck_generator/scripts/build_standalone.py <output-dir>
   ```
   Inlines fonts (weights used), logos (SVG), photos (base64). Targets <3 MB.

## Required visual QA — do not skip

After **every** build (PPTX or HTML), close the loop: render → look with fresh eyes →
fix → stop. This is the highest-impact step for layout quality and is **not optional**.

1. **Render every slide to an image:**
   ```bash
   python3 ~/.claude/skills/Skill_ppt_deck_generator/scripts/render_preview.py \
       <output.pptx> --out <output-dir>/.preview
   ```
   For an HTML deck, screenshot each slide with the preview tools instead.
2. **Inspect with a fresh-eyes subagent** (dispatch a subagent whose only job is to
   critique the rendered PNGs — it hasn't seen the authoring decisions, so it catches
   what you rationalize away). Look for **real defects**: text overflow/clipping,
   overlapping elements, low contrast, broken margins/alignment, empty regions,
   inconsistent scale, leftover placeholders, images cropped badly, and — critically —
   slides that read **flat** vs. the reference craft bar.
3. **Fix the real defects in one cycle**, rebuild, re-render, confirm — then stop. Do
   not loop forever on cosmetic micro-tweaks.
4. **Font caveat:** Graphik (or the deck font) may substitute in the render environment,
   so size text containers with ~10% slack and trust the real font only on final
   delivery. Distinguish a substitution artifact from a genuine overflow.

Never deliver a deck you have not rendered and looked at.

## Variation — different every deck

Before starting, read **`decks-log.md`** and deliberately pick a cover variant, mode
rhythm, and peak-moment placement that differ from the last deck. After finishing,
append this deck's choices to the log. This is what keeps custom/multi-option decks from
converging on the same look. (See also §Hard rules 4 and `reference/design-spec.md →
Variation axes`.)

## Multi-variant / multiple options

If the user wants several looks, render the **same deck-model** with **different
design-specs** — and force a different pick on each variation axis so they don't
converge. For HTML, keep shared asset folders and swap the `<style>`; for PPTX,
emit one file per spec.

## Reference files

- `reference/deck-model.md` — content model (JSON contract)
- `reference/design-spec.md` — visual spec + variation axes (anti-sameness engine)
- `reference/input-sources.md` — ingesting text / pptx / pdf / image / Figma / URL
- `reference/slide-types.md` — semantic HTML markup per slide type
- `reference/components.md` — reusable component snippets
- `reference/template.html` — HTML page skeleton (head, JS, nav)
- `themes/_shared.css` — structural CSS shared by all themes
- `themes/<name>/{theme.md,style.css}` — HTML themes: 6 flavours + `song-standard`
- `themes/song-standard/` — the FY26 Accenture Song master look (light, deconstructed bar)
- `brand/acn-song/` — ACN SONG brand profile: `DESIGN.md` (authoritative rulebook),
  `tokens.json`, `song-standard.json` (PPTX spec), `song-layouts.md` (archetype index),
  `fonts/`, `logo/`
- `scripts/build_pptx.py` — deck-model + design-spec → native `.pptx`; `--style` = fidelity mode
- `scripts/style_components.py` — shared catalog of signature components (cover image,
  scrim, rounded gradient card, pill, chevron) used by reference style packs
- `scripts/render_preview.py` — render a `.pptx`/`.pdf` to one PNG per slide (visual QA)
- `scripts/init_style_pack.py` — scaffold a new reference's style pack from its `.pptx`
  (Song palette + render-detected light/dark + asset candidates + `patterns.md` stub)
- `scripts/extract_pptx.py` — pull text + palette + media from an existing `.pptx`
- `scripts/build_standalone.py` — inline all assets into one HTML file
- `decks-log.md` — running log of design choices, to keep each deck different
- `reference-decks/` — saved style library (one style per file) + `INDEX.md`; the user
  picks exactly one per deck as the inspiration guide, never blended

## Hard rules — never break

1. **Launch the intake widget first, auto-regenerated from `INDEX.md`** — no text
   preamble; the widget (format → direction → conditional reference/brand → multimedia →
   text) IS the intake. Wait for its `sendPrompt()` config before building. **In a plain
   terminal/CLI (e.g. Warp) the widget can't render → use the plain-text intake fallback**
   (same 5 questions, asked as text — §Workflow), never force the widget there.
2. **One reference per deck, chosen by the user** (ACN SONG branch). Never blend styles
   or palettes — **except `MIX`** (Q2=MIX): the one sanctioned best-of that composes
   *archetypes* from all references on a single Song canvas (§MIX). Never auto-pick a
   single reference.
3. **DESIGN.md / brand tokens never declare anything you weren't asked to apply.**
4. **Variety is mandatory.** Custom/automatic and multi-option decks must look
   genuinely different and intentionally designed — never re-skin the same layout.
5. **Never invent placeholder text** ("Lorem ipsum", "Nome Cognome"). Missing value
   → omit or ask.
6. **Never silently drop source content.** Place it or ask.
7. **Logos are SVG only.** Never raster.
8. **Standalone fonts must be local.** Never embed Google Fonts in standalone HTML.
9. **`index.html` and `index.standalone.html` are visually identical.** Standalone
   is packaging only.
10. **Honest about the PPTX:** it's a faithful static render, not a 1:1 copy of the
    animated HTML.
11. **Never deliver without visual QA.** Render every slide to an image and inspect it
    (fresh-eyes subagent) before delivering — see §Required visual QA. Generating blind
    is forbidden.
12. **Study a benchmark before composing** and **log the choices after** — see §Study
    the references and §Variation.
