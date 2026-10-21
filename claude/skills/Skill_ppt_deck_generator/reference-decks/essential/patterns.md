# Essential — pattern catalogue (fidelity memory + selection index)

> **ENGINE UPDATE (2026-07-02) — treat as ✅ built.** The shared engine now renders (Song-
> purple, `decoration:"bar"`) these `build_pptx.py` types: cover(deconstructed bar), agenda,
> divider, quote(statement), context, content(list/rich), pillars/focus(bento), metrics
> (big-stat / donut-gauge `ring` / stat-quad), donut, donuts, table, taxonomy, code,
> timeline, flow(phase circles), gantt, ratings, logos, pricing(priced columns), decision,
> **activity** (full-height side image + circular phase badge + "Deliverable previsti" note),
> map, risk, phoneflow, finding, showcase, thank-you. Treat any ○/⚙️ below that maps to
> these as ✅. Image-slot types show a placeholder unless a media image is supplied.

Captured by studying **all 21 slides** of `Offering_MAECI.pptx` ("Progettazione digitale
inclusiva" — Digital Offering for Essential). This is the durable "memory" of the Essential visual
language. **Essential *is* the on-brand Accenture Song FY26 look** — so this catalogue leans on
the existing Song system (`brand/acn-song/DESIGN.md`, `song-standard.json`) rather than a
bespoke skin. Same idea/format as `reference-decks/premium/patterns.md`, per-reference.

**How to use (autonomous selection).** For each block of the user's text: (1) identify its
communicative intent (definition / list / process / single stat / many stats / quote /
showcase / activity-with-deliverable / …); (2) find the archetype whose **triggers** match;
(3) if that archetype is `engine: ✅`, emit the deck-model for it; if `⚙️/○`, fall back to
the nearest ✅ archetype and note the gap. Prefer variety across the deck.

Engine status: ✅ implemented in `scripts/build_pptx.py` (Song `decoration:"bar"` path) ·
⚙️ partial · ○ not yet. Essential content should use the **Song archetypes** (light editorial),
NOT the Premium `content_skin` — the content elements here are the flat, sharp, no-radius Song
system, so `content_skin` is deliberately left unset.

---

## Palette & type (from the reference — pure ACN Song FY26)
- Core purple `#A100FF` (Accenture Purple — accent labels, phase badges, "Song" in footer,
  emphasis), dark purple `#7500C0`, darkest `#460073` (deconstructed-bar / badge gradients).
- Dark canvas `#120A1C` (near-black plum). Light purples `#C2A3FF` / `#E6DCFF` (bar segments,
  card header bands). Ink `#000000` on white, gray `#818180` (eyebrow, footnotes, footer),
  paper `#FFFFFF`. Extraction also surfaced secondary accents (`#FF4FA0` pink, `#07E1F8`
  aqua) used only inside the tiny embedded UI/design-system screenshots — <5%, never in the
  system chrome; ignore for the style pack.
- **Cover / closing gradient**: radial purple, dark plum → magenta-purple with a soft organic
  light curve bottom-right. Curated as `assets/cover-bg.png` (1642×923, from PPTX `image1.png`
  — a genuine gradient image, clean, no baked text).
- Font: **Graphik** everywhere (Semibold headlines/stats, Medium labels, Regular body).
  Thin/light large headline weight on the cover. No italics, no gradients on text.

## Graphic elements (atoms)
| Element | Where used | Engine |
|---|---|---|
| Purple **radial gradient** cover/closing bg (`assets/cover-bg.png`) | cover, "Thank you" | ⚙️ (see cover note) |
| **Deconstructed 5-segment bar** (uneven decreasing widths, white on dark/purple) | under cover headline, "Thank you" underline | ✅ (`decoration:"bar"` → `_decon_bar`) |
| Accent word (core purple) inside a headline | agenda, methodology title, sublabels | ✅ (`title_accent`) |
| Eyebrow (gray, sentence-case, flush-left) e.g. "Summary delle attività" | every content slide | ✅ (`kicker`/eyebrow) |
| Gray two-digit **section number** `01 02 03` | agenda, dividers | ✅ (`num`) |
| Purple **CIRCULAR phase badge** — small solid-purple disc + white line icon + phase label (DISCOVER / EMPATHIZE / DEFINE / DESIGN & PROTOTYPE / USER TEST / ASSESSMENT / ACCESSIBILITÀ) | every activity slide, methodology row | ○ |
| **"Deliverable previsti:" side note** — small purple/ink label + gray body, lower-right column | every activity slide (8–20) | ○ (rendered as extra body/callout) |
| **Full-height side image** (flush left/right, edge-to-edge vertically) + text column | activity slides 8–20 | ○ (engine images are inset, not full-height) |
| Purple-dot / purple-check **bullets** in body | activity bodies, pricing checklists | ✅ (`bullet`) |
| **Bold inline emphasis** inside body paragraphs | most activity bodies | ✅ (run bold) |
| Footer "Accenture **Song**" (Song in core purple) + copyright + page # right | every non-cover slide | ✅ (built-in Song footer) |
| **Circular process flow** — 6 phase badges joined by a dashed connecting arc | methodology slide 3 | ○ |
| **Priced solution cards** — 3 columns, purple header band + "NN K / Mese" price + checklist | offer/pricing slide 5 | ⚙️ (via `pillars` bento, loses price band + checks) |
| Embedded **UI / wireframe / design-system screenshots** (as the side image) | slides 5,10–15 | ⚙️ (plain inset image) |

---

## Slide archetypes (with triggers)

### Openers & punctuation
- **cover-gradient-bar** — purple radial-gradient field, "Accenture Song" eyebrow top-left,
  thin light H1 headline, **deconstructed bar** beneath it, subtitle bottom-left, date
  bottom. **Trigger:** deck title. → `cover`. ⚙️ (engine `decoration:"bar"` cover renders the
  bar but on a flat DARK `#120A1C` field; the purple gradient needs `cover.asset` which
  currently suppresses the bar — see GAPS. Asset `cover-bg.png` curated for a future fix.)
- **agenda-index** — light canvas, "Agenda" H2, `01 02 03` gray numbers + purple item titles
  in a row. **Trigger:** an explicit agenda / section list. → `agenda`. ✅
- **section-divider** — light canvas, big gray `02` + huge headline ("Soluzioni proposte",
  "Summary delle attività") + deconstructed bar, one-line subhead. **Trigger:** start of a
  section. → `divider`. ✅ (Song light divider with bar)
- **closing** — "Thank you" on the purple gradient field, white deconstructed-bar underline.
  **Trigger:** end. → `thank-you`. ✅ (engine light-mode closing is solid core-purple + bar —
  very close; exact radial gradient would need the asset.)

### Text / list content
- **content-activity (image + phase badge + deliverable)** — the deck's workhorse (slides
  8–20): full-height side photo/screenshot on one side; on the other: gray eyebrow, H3 title,
  a **purple circular phase badge + PHASE label**, 1–3 body paragraphs (bold emphasis,
  purple-dot bullets), and a **"Deliverable previsti:" side note** lower-right. **Trigger:** a
  named activity/step with a description and an output. → `content` (headline + body/bullets +
  image); put the phase label into the eyebrow/sublabel and the deliverable into a trailing
  callout/note. ⚙️ (circular badge, full-height image, and side-note placement are ○; the
  text+image content itself is ✅.)
- **content-list** — eyebrow, headline, purple-dot bullets (e.g. slide 6 adoption list).
  **Trigger:** a flat list of points. → `content` (bullets). ✅
- **definition / overview** — headline + supporting paragraph on light canvas (slide 4,
  "Soluzioni proposte" intro). **Trigger:** "what is X" / a concept or section overview. →
  `context` or `divider` subhead. ✅

### Process / methodology
- **phase-flow-circles** — a horizontal row of 6 purple **circular phase badges** joined by a
  dashed arc, each with a caption paragraph below (slide 3 "La nostra metodologia": DISCOVER →
  EMPATHIZE → DEFINE → DESIGN & PROTOTYPE → USER TEST → ASSESSMENT DI ACCESSIBILITÀ).
  **Trigger:** a multi-step method / process / journey. → nearest ✅ is `pillars`/bento or a
  numbered `content` list; the circular badges + connecting arc are ○. ○

### Feature / offer / data
- **priced-solution-columns** — 3 comparison cards (slide 5): purple header band with
  solution name, big "NN K / Mese*" price, then a checklist of included activities with
  purple check bullets; footnote. **Trigger:** tiered offers / packages / pricing. →
  `pillars`/`focus` (bento) approximates the columns but drops the price band and check rows.
  ⚙️
- **big-stat / stat-quad** — not used in this deck, but ✅ in the engine if the user's content
  has headline KPIs. → `metrics`. ✅
- **bento pillars/focus** — for a set of ≥3–4 features/values. → `pillars`/`focus`. ✅

---

## Coverage roadmap (grow the engine over time)
Already ✅ for Essential via the Song `decoration:"bar"` path: agenda, section divider (light +
bar), content-list, definition/overview, bento pillars/focus, stat/stat-quad, closing, the
Song footer, deconstructed bar, accent word, eyebrow, section numbers.
Next (highest reuse for this reference):
1. **Circular phase badge** (small solid-purple disc + white line icon + PHASE label) as a
   reusable atom — used on almost every content slide and the methodology row.
2. **Full-height side image** layout variant (image bleeds top-to-bottom on one half) +
   **"Deliverable previsti:" side note** slot — the exact `content-activity` archetype.
3. **Purple-gradient cover/closing that also keeps the deconstructed bar** — either let the
   `cover.asset` branch draw `_decon_bar`, or add a gradient-fill cover option (`cover-bg.png`
   is curated and ready).
4. **phase-flow-circles** (dashed-arc process) and **priced-solution-columns** (header band +
   price + checklist) — Essential-specific composites.
