# Canvas — pattern catalogue (fidelity memory + selection index)

> **ENGINE UPDATE (2026-07-02) — treat as ✅ built.** The shared engine now renders (Song-
> purple) these `build_pptx.py` types: cover(ring-arc), agenda, divider(solid-fill + ghost
> number), quote(statement), context, content(list/rich), pillars/focus(bento), metrics
> (big-stat / donut-gauge `ring` / stat-quad), donut, donuts, table, taxonomy, code,
> timeline, flow, gantt, ratings(stars), logos, pricing, decision, activity, map, risk,
> phoneflow(device slots + dotted connectors), finding(severity chip + browser mock + tags),
> showcase, thank-you; plus tracked eyebrow + "Canvas | Accenture Song" footer. Treat any
> ○/⚙️ below that maps to these as ✅. Only truly-unbuilt: underline-marker + "Dettaglio →"
> link chip. Image-slot types show a placeholder unless a media image is supplied.

Captured by studying **all 42 slides** of `Isybank_Report.pptx`. This is the durable
"memory" of the Canvas visual language: every graphic **element** and every slide
**archetype**, each with **triggers** so the skill can pick the right one autonomously
for arbitrary content (same idea as `brand/acn-song/song-layouts.md`, per-reference).

**How to use (autonomous selection).** For each block of the user's text: (1) identify its
communicative intent (definition / list / comparison / single stat / many stats / process
/ quote / showcase / finding / usability task / …); (2) find the archetype whose
**triggers** match; (3) if that archetype is `engine: ✅`, emit the deck-model for it; if
`⚙️/○`, fall back to the nearest ✅ archetype and note the gap. Prefer variety across the
deck.

Engine status: ✅ implemented in `build_pptx.py` · ⚙️ partial · ○ not yet.

**Feel.** This is the LIGHT end of the library: a bright white / warm off-white
(`#F8F7F3`) research report. Personality comes almost entirely from **type + one accent
colour**, not from heavy graphics — heavy BLACK headlines, one ORANGE word, thin orange
underline markers, generous whitespace. The only recurring decorative graphic is a thin
green→blue **ring arc** in a corner. Content slides are LIGHT; only the section dividers
flip to a solid colour field (blue or mint-green).

---

## Palette & type (from the reference)
- **Orange accent** `#EA6C37` (the single hero colour: accent word, underline marker,
  stars, "Dettaglio →" links, S-curve segment). Occasional print-variant `#ED6D2E`.
- **Blue** `#4897F4` — divider fields, ghost section numbers, app-UI chrome.
- **Mint green** `#6DE1B0` / `#6EE4B3` — alternate divider fields, quote-mark glyph,
  green task-underline + success checks.
- **Black** `#000000` headlines & body; **gray** `#5E5E5E` secondary/eyebrow text.
- Backgrounds: pure white `#FFFFFF` cards on a warm off-white `#F8F7F3` (a.k.a. `#F7F3EF` /
  `#FEFFFC`) canvas. Hairlines `#E4E4E4`.
- Type: heavy grotesque sans (Helvetica Neue / Arial-family, **Bold** headlines, Regular
  body). Headlines are LARGE and left-aligned. No italics except source attributions.

## Graphic elements (atoms)
| Element | Where used | Engine |
|---|---|---|
| **Ring-arc** motif (green→blue, thin stroke), top-right corner (`assets/ring-arc.png`, transparent; also a green→orange→blue S-curve bottom-right) | cover + most content headers | ○ (Canvas-specific; not an engine motif) |
| **Orange accent word** inside a black headline | cover, many headers | ✅ (`text_accent` / accent word) |
| **Orange underline marker** (short thick bar under a stat / label) | stat cards, section labels | ○ (Canvas-specific marker) |
| **Fraction header** — "Principali evidenze **1/4**" (title bold, fraction lighter) | all recurring finding series | ⚙️ (title supports it; lighter-weight fraction run is manual) |
| **UPPERCASE tracked eyebrow** (gray, e.g. `APERTURA CONTO`, `AMBITI ANALIZZATI`) | content headers / context labels | ✅ (`kicker` / `sublabel`) |
| **Co-brand lockup** `Canvas | Accenture Song` bottom-right | EVERY slide | ○ (Canvas-specific footer; engine footer is plain) |
| **Flat white card** (no border, soft/none shadow) on off-white | stat cards, callouts | ✅ (`card`, flat skin) |
| **Big fraction stat** ("20/20 utenti", "8/8 utenti") + orange underline | finding slides | ⚙️ (via `metrics`, no fraction/underline styling) |
| **Star rating row** (orange ★★★★★ + label) | evaluation summary strip | ○ |
| **Orange "Dettaglio → " / "Vedi grafico → " link** with arrow | cross-references | ○ (decorative link chip) |
| **Orange bullet dots** (small filled circle) | grouped lists | ✅ (`bullet`) |
| **Green quote glyph** (large `"` in mint) + bold black quote | testimonial slides | ⚙️ (quote archetype, no green glyph) |
| **Phone mockup** (tilted device frames, app screenshots) | flow/showcase slides | ○ (uses plain image; content screenshots NOT reusable) |
| **Dotted connector** (orange + gray dotted lines linking phone mockups L→R) | flow slides | ○ |
| **Ghost section number** (giant faint white numeral behind divider title) | dividers | ○ |
| **3-column comparison table** (Task / Evidenze / Percorso corretto, hairline headers) | tree-test evidence | ○ |
| **Icon + value pair** (clock / target / check / alert glyph + bold number) | usability metrics | ⚙️ (via `metrics`, no glyphs) |
| **Green ✓ / red ✗ / blue ! status icons** | pass/fail rows | ○ |
| **Mindmap / tree diagram** (green radial node graph, screenshot) | appendix tree-test charts | ○ (image only) |

---

## Slide archetypes (with triggers)

### Openers & punctuation
- **cover-canvas** — white field, ring-arc top-right, big BLACK title + ORANGE accent
  word ("Attività di **user research**"), place+date bottom-left, co-brand lockup
  bottom-right. **Trigger:** deck title. → `cover`. ✅ (ring-arc/lockup are ○ extras)
- **statement-divider (solid)** — full-bleed **blue** (`#4897F4`) or **mint-green**
  (`#6DE1B0`) field, one short black title centred with an **underline marker** (e.g.
  "Test one to one"; "Tree test"; "Allegati"), a giant ghosted section number behind it.
  **Trigger:** start of a section / a one-line label between phases. → `divider`. ✅
  (solid fill instead of image; ghost number ○)
- **quote-portrait** — full-height B/W portrait photo left, big green `"` glyph + bold
  black testimonial right, "Nome, — Cliente …, fascia d'età" attribution, UPPERCASE
  eyebrow top-right. **Trigger:** a verbatim user/customer quote. → `quote` (`text`,
  `attribution`, image). ✅ (green glyph + portrait bleed ⚙️)
- **closing** — "Grazie**.**" (orange period) on white, ring-arc, lockup. **Trigger:**
  end. → `thank-you`. ✅

### Text / list content
- **content-cards-3up** — fraction header + intro line; three flat white cards: two with a
  **big fraction stat** ("20/20 utenti") + orange underline + supporting sentence, one
  with a bulleted list; often an orange "Dettaglio →" link per card; a bottom
  **valutazioni** strip with star ratings. **Trigger:** a set of 2-4 findings/points, some
  quantified. → `content` (`groups`/`cards`) or `metrics`+`content`. ⚙️ (cards ✅; fraction
  stat / underline / stars / links are ○)
- **content-list** — headline + intro + orange-dot bullets (single or two columns).
  **Trigger:** a flat list of observations. → `content` (bullets). ✅
- **definition / context-split** — big black headline left; UPPERCASE label + body
  paragraph + orange-dot bullets; optional flat white callout card with orange underline.
  **Trigger:** "what we tested / how it works" concept explained. → `context`. ✅

### Data & metrics
- **stat-fraction-strip** — the "N/N utenti" fraction cards (see content-cards-3up). Used
  as headline evidence. **Trigger:** ratio-style adoption stats ("8 of 8 users"). →
  `metrics`. ⚙️ (renders as big number, loses the fraction + underline treatment)
- **usability-metric-grid** — icon (clock/target) + bold value pairs ("27 secondi",
  "6/10", "77%") laid in a column/grid. **Trigger:** task-success KPIs. → `metrics`
  (2-4). ⚙️ (no glyphs / pass-fail icons)
- **star-rating-row** — orange ★ rows with labels (Velocità / Semplicità / Linguaggio).
  **Trigger:** qualitative 1-5 scores. → NEW `ratings`. ○

### Flow / product (Canvas-signature)
- **phone-flow-connectors** — headline + Soluzione 1 / Soluzione 2 rows of tilted phone
  mockups, **dotted orange/gray connectors** L→R, a flat white callout card with orange
  underline on the right. **Trigger:** a user flow / step sequence shown on-screen. → NEW
  `flow` (or `content`+images). ○ (very Canvas-specific; screenshots not reusable)
- **mockup-showcase** — headline + intro + a fanned/tilted arrangement of app screenshots
  filling the right/whole slide (sometimes on a mint field), "Link prototipo →" chips.
  **Trigger:** show a product/app UI with narrative. → `gallery` / `content`+image. ⚙️
  (plain image, no tilt/fan)

### Evidence / proof (research-specific)
- **tree-test-table** — 3 columns (Task · Evidenze emerse e possibili soluzioni · Percorso
  corretto) with hairline header rules, per-task rows: green-underlined task title +
  italic scenario, ✓/✗/! status icons + bold metrics, and a bulleted "correct path" with
  an orange "Vedi grafico →" link; dotted row separators. **Trigger:** usability-task
  results / structured test findings. → NEW `table` (research variant). ○
- **mindmap-appendix** — title + intro + a large green radial **tree/mindmap** chart
  (screenshot) with a footnote. **Trigger:** an information-architecture / navigation tree.
  → NEW `mindmap` (image). ○

---

## Deck-model mapping (quick reference)
| Intent in user text | Archetype | Emit | Engine |
|---|---|---|---|
| Deck title | cover-canvas | `cover` | ✅ |
| Section break / one-line label | statement-divider | `divider` | ✅ |
| Verbatim quote | quote-portrait | `quote` | ✅ |
| Concept / "how it works" | definition-split | `context` | ✅ |
| Flat list of points | content-list | `content` | ✅ |
| 2-4 findings (some quantified) | content-cards-3up | `content`/`metrics` | ⚙️ |
| Ratio / adoption stats | stat-fraction-strip | `metrics` | ⚙️ |
| Task KPIs (time, score, %) | usability-metric-grid | `metrics` | ⚙️ |
| Set of ≥4 features/pillars | (n/a in this deck) bento | `pillars`/`focus` | ✅ |
| 1-5 qualitative scores | star-rating-row | `ratings` | ○ |
| On-screen user flow | phone-flow-connectors | `flow` | ○ |
| Product/app showcase | mockup-showcase | `gallery` | ⚙️ |
| Structured test-result table | tree-test-table | `table` | ○ |
| IA / navigation tree | mindmap-appendix | `mindmap` | ○ |
| End | closing | `thank-you` | ✅ |

---

## Coverage roadmap (grow the engine over time)
Done (✅ with Canvas skin): **cover, divider (solid blue/green field), quote, context
(definition), content-list, closing** — plus `metrics` and `content`-cards render but
LOSE the Canvas fraction/underline/star treatment (⚙️).

Canvas-specific elements that stay **○** until built/curated:
1. **fraction-stat + orange underline marker** treatment for `metrics` (highest reuse — it
   is the deck's signature stat style).
2. **star-rating** row (`ratings`) and **"Dettaglio →" link chip** (small, high reuse).
3. **ghost section number** on the solid divider; **green quote glyph** on `quote`.
4. **phone-flow-connectors** (`flow`) and **tree-test-table** (`table`) — layout engines,
   research-specific.
5. **mindmap** (image only) and the **ring-arc / S-curve** decorative motif (asset exists,
   `assets/ring-arc.png`, but no engine hook yet) + **co-brand lockup** footer.

Assets: **`assets/ring-arc.png`** curated (transparent 1920×1080 — green→blue arc
top-left + green→orange→blue S-curve bottom-right; the deck's only reusable decorative
graphic). Cover is otherwise generated, not image-based. Phone-mockup content screenshots
and B/W portraits were deliberately NOT copied (content, not style).
