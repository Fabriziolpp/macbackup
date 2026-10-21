---
name: acnpptx
description: "Generates, reads, edits, restyles, and rethemes Accenture-branded PowerPoint presentations (.pptx/.ppt) using python-pptx with official brand assets (logos, Greater Than symbol, Graphik font), slide masters, and structured layouts. Use when creating slide decks, pitch decks, PowerPoint, or presentations from scratch; reading or extracting content from .pptx/.ppt files; editing existing presentations; restyling/redesigning existing decks; or changing deck themes/templates. Trigger when user mentions PowerPoint, PPT, pptx, deck, slides, presentation, restyle, redesign. Do NOT trigger for Google Slides, Keynote, or web/CSS presentations."
---

# PPTX Skill — Multi-Theme Brand Edition

Five workflows: **Read**, **Edit** (template-based), **Create** (from scratch), **Restyle** (redesign existing deck), **Retheme** (change colors/template only).

References: [color-palette.md](references/color-palette.md) | [brand-guidelines.md](references/brand-guidelines.md) | [pattern-specs.md](references/pattern-specs.md) | [pattern-selection-guide.md](references/pattern-selection-guide.md) | [chart-specs.md](references/chart-specs.md) | [api-reference.md](references/api-reference.md) | [common-mistakes.md](references/common-mistakes.md)

## Setup

```bash
# Python detection: prefer skill venv if available, else system python
if [ -x "$HOME/.claude/skills/.venv/Scripts/python.exe" ]; then
  PY="$HOME/.claude/skills/.venv/Scripts/python.exe"
else
  PY=python
fi
$PY -m pip install python-pptx Pillow lxml "markitdown[pptx]" pywin32
```

## Font / Assets

| Theme | Template | Notes |
|-------|----------|-------|
| ACN Slide Master (Graphik) | `assets/masters/acn-slide-master.pptx` | default geometry (`CY=1.50`, `BY=6.85`) |
| ACN Technology Graphik | `assets/masters/acn-technology-graphik.pptx` | 41 layouts, default geometry |
| **ACN Song 2030** (Graphik, Sept 2026) | `assets/masters/acn-song-2030.pptx` | **Song current brand.** Own geometry — see below |
| Accenture (Arial) | `assets/masters/accenture.pptx` | legacy MasterBrand |

**ACN Song 2030 geometry (override right after `load_theme("acn-song-2030")`, before `from helpers import *`):**

```python
_h.ML, _h.CW = 0.14, 13.05          # left margin / content width per Song grid
_h.MSG_Y, _h.MSG_H = 1.60, 0.26     # message line = layout placeholder idx 10 (write to it)
_h.CY, _h.BY = 2.10, 6.51           # content area: below subheadline, above footer furniture
_h.AH = _h.BY - _h.CY
```

- Title placeholder is at y=0.94 (not 0.42); set it to 28pt. Breadcrumb textbox goes at y=0.14.
- Message line: write into placeholder idx 10 (`_MSG_IDX = 10`), do not remove it. `clear_placeholders()` must run only after the message is written, or skip idx 10.
- Section divider (Pattern C): use layout 3 (white) / 14 (dark) / 15 (photo) with idx 10 = two-digit number. Drawing a full-slide rectangle is prohibited with this theme.
- Key message (Pattern D): use layout 4 / 16 "Bold Statement". Quotes: layout 7 / 18. Closing: layout 12 "Cover Dark" with the closing text in idx 0.
- Every layout has a White/Dark twin (0/10, 2/12, 3/14, 4/16, 6/17, 7/18, 8/19); pick the dark twin instead of painting backgrounds.
- The master already draws the "Accenture Song" wordmark, copyright and page number. Never add a logo or GT symbol.

```python
import helpers as _h
from helpers import *
```

**Logo and GT symbol are automatically provided by the slide master. Calling `add_logo()` / `add_gt_symbol()` is prohibited.**

---

## Workflow: Reading Content

```bash
$PY -m markitdown presentation.pptx
```

---

## Workflow: Editing Existing Slides

See [editing-workflow.md](references/editing-workflow.md).

```
scripts/unpack.py → scripts/add_slide.py → edit XML → scripts/clean.py → scripts/pack.py
```

---

## Workflow: Modifying Existing Presentations (Restyle / Retheme)

When the user requests changes to an existing PPTX, first **call the AskUserQuestion tool** (the actual tool, not plain text) to clarify the direction. Pass this text to AskUserQuestion:

```
Which approach would you like?

1. Restyle — Overhaul layout, structure, and visuals (slide count may change)
2. Retheme — Change only colors, fonts, and master; keep the same structure
```

> **You MUST invoke the AskUserQuestion tool. Printing these options as plain text in your response is prohibited.**

Then **call the AskUserQuestion tool** again to let the user choose a theme (with color swatches). See [theme-setup-guide.md](references/theme-setup-guide.md) for details.

- **Restyle** → See [restyle-workflow.md](references/restyle-workflow.md)
- **Retheme** → Execute Step 8 (below)

---

## Workflow: Creating from Scratch

> **HARD GATE — You must complete two user confirmations via AskUserQuestion tool before writing any script:**
> 1. **Step 0b: Outline confirmation + Pattern selection + Asset decoration** — **Call the AskUserQuestion tool** to present options. If "Review in UI": launch `--mode decorate` (pattern selection + icon/illustration placement + slide prompts in one screen)
> 2. **Step 1: Theme selection** — **Call the AskUserQuestion tool** to let the user choose a theme (never skip even if only one theme exists)
>
> **Both gates require actual AskUserQuestion tool invocations. Printing options as plain text is NOT a valid substitute.**
> **Code generation is strictly prohibited until both confirmations are complete.** Any violation requires a redo.
>
> **STRICT FORWARD-ONLY PROGRESSION — Steps never go backwards:**
> - Once Step 0b is confirmed (user clicks Confirm in decorate UI or approves outline), **never return to Step 0b**. The outline, patterns, asset placements, and slide prompts are final.
> - Once Step 1 (theme) is confirmed, **never return to Step 0b or Step 1**.
> - During slide generation (Steps 2–9): use the confirmed `asset_placements` and `slide_prompts` as-is. **Never re-ask the user about icons, never re-launch the decorate UI, never use AskUserQuestion to ask which icons to place.** The user already chose them.
> - The only exception is if the **user explicitly requests** to go back (e.g., "I want to change the outline", "Let me redo this").

**FILE LOCATION RULES:** Generated scripts and output .pptx files are saved in the user's CWD. `~/.claude/skills/acnpptx/` is READ-ONLY.

### Step 0 — Outline First

```python
import sys, os
_SKILL = os.path.join(os.path.expanduser("~"), ".claude", "skills", "acnpptx", "scripts")
sys.path.insert(0, _SKILL)
from outline import generate_outline, format_outline_md, save_outline, validate_outline
outline = generate_outline(title="Title", language="en", sections=["Background","Solution","Impact","Summary"])
print(format_outline_md(outline))

valid, errors, warnings = validate_outline(outline)
if warnings:
    print("Improvements recommended:")
    for w in warnings:
        print(f"  {w}")
if not valid:
    print("Errors:")
    for e in errors:
        print(f"  {e}")

save_outline(outline, "outline.json")
```

**Pattern selection**: When assigning patterns to each slide in the outline, refer to [pattern-selection-guide.md](references/pattern-selection-guide.md). Defaulting to Pattern A is prohibited — always assign a pattern appropriate to the content purpose.

### Step 0b — Outline Confirmation + Pattern Selection + Asset Decoration

**ABSOLUTE GATE — AskUserQuestion tool call required (no exceptions).** Pass this text to the AskUserQuestion tool:

```
Would you like to proceed with this outline? Would you also like to review the slide patterns visually?

Options:
1. Review in UI (browse patterns, place icons/illustrations, add slide prompts)
2. Proceed as text (this outline is OK)
3. I want to modify the outline
```

- 1 → Read [preview-workflow.md](references/preview-workflow.md) and follow the full UI launch, polling, confirmation, and **asset-aware design reconstruction** procedure. **Critical: the polling Bash command MUST use `timeout: 600000` (10 minutes)**
- 2 → Proceed to Step 1 (theme selection)
- 3 → Gather modification requests and redo Step 0

**Prerequisites**: `assets/asset_index.json` and `assets/illustrations/*.png` must exist (run `scripts/extract_assets.py` once to generate).

See [outline-schema.md](references/outline-schema.md) for schema details.

**Slide ordering rules:**
1. Cover (always first)
2. Agenda (Pattern I) — **If present, must be placed immediately after the cover. No other slides between them**
3. Thereafter — section dividers and content slides

**Slide count rules:**
- When the user specifies "make N slides", N = **Cover + Agenda (if present) + Content slides**
- **Not included in the count**: Section dividers (Pattern C), Closing (Thank You)

**Section divider usage rules:**
- **No section dividers for decks of 10 slides or fewer** (use breadcrumbs to indicate sections)
- When using section dividers for 11+ slides, **all sections must have dividers**. Adding dividers for some sections but not others is prohibited

**Pattern diversity rules (mandatory):**
- **Never use the same pattern consecutively.** Choose a different pattern from the previous slide
- **In principle, use each pattern only once per deck.** Reuse is permitted only when content demands it
- **Pattern A usage restriction**: Treat Pattern A as a "last resort when no other pattern fits." If the outline has 2+ Pattern A slides, refer to [pattern-selection-guide.md](references/pattern-selection-guide.md) and replace with appropriate patterns
- **Automated check via validate_outline()**: Run `validate_outline()` before saving the outline and review diversity WARNING/ERROR messages

**Content quality rules (consultant-grade requirements):**
- **Specificity**: Every slide must include proper nouns, figures, years, and monetary values. Abstract placeholders like "Point 1" or "Initiative A" are strictly prohibited
- **Information density**: Each slide's content area must contain at least 4 information elements
- **So What**: Each slide's message line must clearly state implications, conclusions, or assertions
- **Research**: Conduct sufficient research on the topic before creating content

**Whitespace / layout density rules (mandatory):**
- **Content fill rate**: Fill **70% or more** of the content area (CY to BY) with content
- **Textbox height**: Always set textbox height to **fill the remaining available space** (e.g., `h = BY - detail_y - 0.10`)
- **Vertical center alignment**: Set bodyPr `anchor` to `'ctr'` to vertically center text. **Mandatory across all patterns**
- **Line spacing (space_after) is mandatory**: For bullet lists and multi-line text, always set **`p.space_after = Pt(8)`** (6-12pt)
- **Cover slide**: Always loop through all placeholders and fill or clear them. For unused placeholders, set `p.text = " "` (single space)

### Step 1 — Theme Selection

> **ABSOLUTE GATE — AskUserQuestion tool call required (no exceptions):**
> - **Even if there is only one theme, you MUST call the AskUserQuestion tool**
> - **Do NOT write any script boilerplate or code until the user confirms their theme selection**
> - Printing theme options as plain text is NOT a substitute — you MUST use the AskUserQuestion tool

Read [theme-setup-guide.md](references/theme-setup-guide.md) for the full confirmation procedure, AskUserQuestion format, and **script boilerplate** (write the boilerplate only after theme is confirmed).

### Step 1b — Batch Generation for Large Decks (12+ content slides only)

For decks with 12+ content slides, split into batches of 4-5 slides to prevent context degradation. See [batch-generation.md](references/batch-generation.md) for splitting rules, Agent tool invocation, and merging procedure.

### Step 2 — Adding Slides

```python
LAYOUT_COVER   = 0   # follows theme JSON layout_indices.cover
LAYOUT_CONTENT = 2   # follows theme JSON layout_indices.content
LAYOUT_SECTION = 6   # if present in the template

def add_slide(layout_idx=LAYOUT_CONTENT):
    slide = prs.slides.add_slide(prs.slide_layouts[layout_idx])
    clear_placeholders(slide)   # remove unused idx=10 body placeholder
    return slide

def add_cover_slide():
    return prs.slides.add_slide(prs.slide_layouts[LAYOUT_COVER])
    # do NOT call clear_placeholders()
```

**Layout 2 placeholder structure:**

| Placeholder | idx | y (in) | Usage |
|-------------|-----|--------|-------|
| Breadcrumb  | 11  | 0.08   | `add_breadcrumb(slide, "Section > Topic")` — empty string prohibited |
| Title       | 0   | 0.42   | `add_title(slide, "Title")` — direct textbox placement prohibited |
| *(unused)*  | 10  | 0.87   | Auto-removed by `clear_placeholders()` |
| Message line| *   | 0.95*  | **Required on all content slides** (except cover and agenda) |
| Content     | --  | CY=1.50"| Positioned per pattern |

### Step 3 — Slide Content

**Required zones (content slides):**

| Zone | Notes |
|------|-------|
| Breadcrumb | `add_breadcrumb(slide, "Section > Topic")` — 12pt MID_GRAY |
| Title | `add_title(slide, "Title")` — 28pt bold BLACK |
| Message line | **Required on all content slides** (except cover and agenda). If `_MSG_IDX` is defined, write to that placeholder (explicitly set 18pt bold DARK_PURPLE). If undefined, use `add_message_line(slide, "...")`. 60 characters max, declarative tone |
| Body | Min **14pt**. Position from CONTENT_Y |
| Footer | `set_footer(slide)` — required on all content slides |

Detailed API → [api-reference.md](references/api-reference.md)

**Content density rules:**
- Each card/panel should have a title + 3-5 bullet lines. Use specific sentences with figures and proper nouns
- If whitespace exceeds 50% of the container area, add more bullets

**Short label rules:** `tf.word_wrap = False`, width = character count x 0.20" or more

**Agenda badge rules (prevent "01" vertical split):** The badge textframe must always have `tf.word_wrap = False` set, and bodyPr lIns/rIns/tIns/bIns must all be reset to `"0"`.

**Chevron flow (Pattern P) y-coordinate / vertical balance:**
- **With detail text**: Vertically center the entire group of chevron + detail text
  ```python
  FLOW_H   = 0.80   # chevron height
  GAP      = 0.25   # gap between chevron and detail
  DETAIL_H = 3.00   # detail text area height
  FLOW_Y   = CY + (AH - FLOW_H - GAP - DETAIL_H) / 2
  DETAIL_Y = FLOW_Y + FLOW_H + GAP
  ```
- **Without detail text (flow only)**: `FLOW_Y = CY + (AH - FLOW_H) / 2` (vertically centered)

### Step 4 — Pattern Selection

> See [pattern-selection-guide.md](references/pattern-selection-guide.md) for the full pattern list and selection guidance.
> See [pattern-specs.md](references/pattern-specs.md) for ASCII layouts, shape tables, and code examples.

**Brand rules (common to all patterns):**
- Rectangles only — rounded rectangles (roundRect) prohibited
- Gradients prohibited — solid fill only
- **Alternating colors strictly prohibited** — Never assign different colors to same-type elements based on index parity or order
- No horizontal line between lead and body / no horizontal line above table headers
- Tables and charts use `w=CW` for full width
- **Table col_widths sum must equal CW (mandatory)**
- **Table number column width rule**: single-digit -> 0.45", double-digit -> 0.55", "X.X"/"QXX" -> 0.65"
- **No y-coordinate overlap between panel header/body**: maintain at least 0.10" gap
- Calling `add_logo()` / `add_gt_symbol()` is prohibited (master provides them automatically)

### Image Handling

1. User specifies an explicit path -> use that path
2. An image was provided in the conversation -> use that path
3. Image files exist in CWD's `assets/` -> read the contents and select an image matching the topic
4. No image available -> substitute with native shapes

`add_image_fit(slide, img_path, x, y, max_w, max_h)` (helpers.py)

| Scenario | Pattern |
|----------|---------|
| 1 image + text | Pattern R (Split Visual) |
| 1 image is the main focus | full-width `add_picture` |
| Multiple images | 2x2 `add_picture` |

### Step 5 — Cover Slide

**Mandatory rules:**
- Use `add_cover_slide()` (using `add_slide()` is prohibited). Do not add background rectangles
- Purple background -> WHITE text. White background -> BLACK / TEXT_BODY text (WHITE is invisible)
- If `cover_text_color: "BLACK"`, fill all placeholders with BLACK / MID_GRAY
- **All placeholders must be filled** (leaving them empty = hint text is displayed)
- Check placeholder idx for each theme via `layout_notes.cover.placeholders`
- **If the title spans 2 lines, manually break at a meaningful point** (auto-wrapping may break mid-phrase). Use `tf.add_paragraph()` to add a second paragraph and match font settings

-> See [pattern-specs.md](references/pattern-specs.md) `## Cover slide template` for code examples (purple/white background variants, ph_map patterns)

**Section divider (Pattern C):**
```python
slide = add_slide()
bg = slide.shapes.add_shape(MSO_AUTO_SHAPE_TYPE.RECTANGLE,
    Inches(0), Inches(0), prs.slide_width, prs.slide_height)
bg.fill.solid(); bg.fill.fore_color.rgb = DARKEST_PURPLE; bg.line.fill.background()
add_breadcrumb(slide, "Section 02")   # empty string prohibited
add_title(slide, "Section Title", size_pt=36)
set_footer(slide)
```

### Step 6 — Charts (Pattern M)

> See [chart-specs.md](references/chart-specs.md) for full code examples and parameter details for all chart types.

**Basic**: `add_column_chart`, `add_bar_chart`, `add_line_chart`, `add_pie_chart`, `add_stacked_column_chart`, `add_area_chart` — `charts.py` helpers
**Matplotlib**: `chart_marimekko`, `chart_gantt`, `chart_stacked_bar_100` — returns PNG bytes -> `BytesIO` -> `add_picture`
**Advanced**: Radar, Doughnut, Scatter, Bubble, Combination, Range Bar — use `XL_CHART_TYPE` directly

### Step 7 — Icons (Pattern Q)

```python
# Initial setup: $VENV ~/.claude/skills/acnpptx/scripts/icon_utils.py
from icon_utils import add_icon_grid, find_icons
find_icons("cloud")
add_icon_grid(slide, prs, [("cloud","Cloud"),("ai","AI")],
    x=ML, y=2.40, total_w=CW, total_h=3.80, cols=3, font_name=FONT)
```

### Step 8 — Migrating Themes on Existing PPTX (Optional)

```bash
PYTHONUTF8=1 $PY ~/.claude/skills/acnpptx/scripts/retheme.py deck.pptx <target>
PYTHONUTF8=1 $PY ~/.claude/skills/acnpptx/scripts/retheme.py deck.pptx <target> --from fiori
PYTHONUTF8=1 $PY ~/.claude/skills/acnpptx/scripts/retheme.py deck.pptx <target> --out deck_out.pptx
```

See [retheme-guide.md](references/retheme-guide.md) for processing details (color map construction, schemeClr resolution, placeholder migration, empty placeholder removal).

### Step 8b — Mandatory Closing Sequence

```python
make_closing_slide(prs)          # Default "Thank You", left-aligned. Change only if user specifies different text
# White background theme: make_closing_slide(prs, text_color=BLACK)
# To specify custom text: make_closing_slide(prs, "Thank you for your time")
strip_sections(prs)              # Remove PowerPoint section headers
prs.save(output_path)
```

> **Duplicate guard**: `make_closing_slide()` automatically detects if a closing slide already exists and skips creation. Do NOT manually add a second closing slide.

### Step 9a — Automated Verification

```bash
$PY ~/.claude/skills/acnpptx/scripts/brand_check.py output.pptx
$PY ~/.claude/skills/acnpptx/scripts/verify_pptx.py output.pptx
$PY ~/.claude/skills/acnpptx/scripts/thumbnail.py output.pptx slides/
$PY -m markitdown output.pptx   # Check for residual hint text like "Click to add title"
```

Fix all ERRORs. Review all WARNINGs. See [verify-guide.md](references/verify-guide.md) for detailed check items and visual inspection checklist.

### Step 9b — Independent Visual Evaluation

Launch an evaluation sub-agent (Generator-Evaluator pattern). See [verify-guide.md](references/verify-guide.md) "Step 9b" section for the Agent tool invocation, result handling, and the mandatory visual inspection checklist.

**Always fix issues before delivery. "Automated checks passed" alone is insufficient.**

### Step 10 — Visual Review & Markup

**ABSOLUTE GATE — AskUserQuestion tool call required (no exceptions).** Pass this text to the AskUserQuestion tool:

```
Would you like to do a final review of the slides in the UI?

Options:
1. Review and markup in UI (add markup and revision notes to each slide in the browser)
2. Finish with Claude's automated checks only
3. Provide revision instructions as text
```

- 1 → Read [review-workflow.md](references/review-workflow.md) and follow the UI launch, polling, feedback capture, image save, and **revision loop** procedure. **Critical: polling Bash MUST use `timeout: 600000`**
- 2 → Done
- 3 → Receive text input, make corrections, then loop back to Steps 9-10

The revision loop ends **only when the user selects "OK, finish"**. See [review-workflow.md](references/review-workflow.md) "Revision Loop" section for sub-agent invocation details.

---

## Autonomous Validation & Self-Repair (pptx_validator)

After generating a PPTX, run the unified validator for automated quality assurance:

```python
import sys, os
sys.path.insert(0, os.path.join(os.path.expanduser("~"), ".claude", "skills", "acnpptx", "scripts"))
from pptx_validator import validate_and_repair

# Validate + auto-fix loop (max 3 iterations)
result = validate_and_repair("output.pptx", theme="acn-song-2030")   # or the theme chosen in Step 1
print(result.summary())

# Validate only (no auto-fix)
from pptx_validator import validate
result = validate("output.pptx", theme="acn-technology-graphik")
```

**Checks performed:**
1. **Layout index** — all slide layout indices exist in the template
2. **Text overflow** — text height vs placeholder dimensions
3. **Brand colors** — all colors match the theme palette
4. **Font sizes** — within 8-44pt, no forbidden sizes (11/13pt)
5. **Arrow directions** — no RTL arrows in flowcharts
6. All existing `verify_pptx.py` and `brand_check.py` checks

**Auto-fixable:** font sizes, off-palette colors, RTL arrows, text overflow (font reduction or box expansion).

## Batch Presentation Factory

Generate multiple decks in parallel from a JSON topic list:

```python
from batch_factory import BatchFactory
factory = BatchFactory("topics.json", output_dir="./batch_decks")
prompts = factory.get_agent_prompts()  # (DeckSpec, prompt) pairs
todos = factory.get_todo_list()        # TodoWrite-compatible task list
```

Input JSON format: `[{"topic": "...", "audience": "...", "slides": 8, "theme": "..."}]`

See `assets/sample_batch_topics.json` for example. Each sub-agent runs autonomously
(research → outline → generate → validate) via `agents/deck_builder.md`.

---

## Quick References

> Read the following before generating any code:

| Reference | Content |
|-----------|---------|
| [api-reference.md](references/api-reference.md) | All function parameters and code examples |
| [color-palette.md](references/color-palette.md) | Color constant Python quick reference |
| [brand-guidelines.md](references/brand-guidelines.md) | Font size table (**13pt is prohibited.** Allowed: 12/14/18/28/36-44) |
| [common-mistakes.md](references/common-mistakes.md) | Common mistakes and prevention measures (required reading) |

**Layout constants:** `CY=1.50` / `BY=6.85` / `AH=5.35` / `ML=0.42` / `CW=12.50` / `MSG_Y=0.95`