# Dark — pattern catalogue (fidelity memory + selection index)

> **ENGINE UPDATE (2026-07-02) — treat as ✅ built.** The shared engine now renders (Song-
> purple, mode-aware incl. this dark deck) these `build_pptx.py` types: cover, agenda,
> divider, quote(statement), context, content(list/rich), pillars/focus(bento, +featured/
> +status chip), metrics(big-stat / donut-gauge `ring` / stat-quad), donut, donuts, table,
> taxonomy, code(editor mock), timeline, flow, gantt, ratings, logos, pricing, decision,
> activity, map, risk, phoneflow, finding, showcase, thank-you; plus the right-edge nav-rail
> and "DARK — CASE STUDY" footer. Treat any ○/⚙️ below that maps to these as ✅. Only
> truly-unbuilt: glyph-icon chips on bento (need an icon set).

Captured by studying **all 10 slides** of `Artemis_II.pptx` (a dark-tech, cinematic
design-process case-study deck). This is the durable "memory" of the Dark visual
language: every graphic **element** and every slide **archetype**, each with **triggers**
so the skill can pick the right one autonomously for arbitrary content (same idea as
`brand/acn-song/song-layouts.md` and `reference-decks/premium/patterns.md`, per-reference).

**How to use (autonomous selection).** For each block of the user's text: (1) identify its
communicative intent (definition / list / comparison / single stat / many stats / process
/ quote / showcase / finding / case study / …); (2) find the archetype whose **triggers**
match; (3) if that archetype is `engine: ✅`, emit the deck-model for it; if `⚙️/○`, fall
back to the nearest ✅ archetype and note the gap. Prefer variety across the deck.

**COLOURS = ALWAYS SONG (updated).** Dark contributes its dark cinematic LAYOUT only; the
accent is **Song purple `#A100FF`**, NOT the reference's blue. All `#0B6FFF` references below
are historical — read them as `#A100FF`. Status colours (green ✓ / red ✗) render as Song
purple too where used.

**Dark content skin — DONE.** The shared content skin is now mode-aware (`_skin()`): with
Dark's `layout.mode:"dark"` it renders content on near-black `#000000`, dark cards
`#1F1F1F`/`#111111`, white headline, `#D1D5DB` body, Song-purple eyebrow/accent. So the
archetypes previously marked ⚙️ "needs dark content skin" now render ✅ (content-list,
definition, bento, big-stat, stat-quad). Cover / divider / statement / closing already ✅.

Engine status: ✅ implemented in `build_pptx.py` (applies with this skin) · ⚙️ implemented
but needs a dark-mode content skin to match Dark · ○ not yet built.

---

## Palette & type (from the reference)
- **Electric blue** `#0B6FFF` — the single hero accent: eyebrows, TOC dots, active nav dot,
  card accent bars, table headers, icons, timeline rail, "Grazie" underline. On every slide.
- **Base** near-black `#000000` (slide bg), card fills `#111111` / `#1F1F1F`, hairlines `#1F1F1F`.
- **Text** white `#FFFFFF` (headlines/labels), `#D1D5DB` (body), `#9CA3AF` (muted/captions),
  `#6B7280` / `#4B5563` (footers, faint numbers, inactive nav dots).
- **Status accents** green `#22C55E` (✓ "Buon risultato" / green-check bullets), red `#EF4444`
  (✗ "Non sufficiente"), orange `#E87722` (secondary card-accent / "ultra dettagliato" tab),
  amber `#F59E0B` (traffic-light dot).
- **Type**: big **white bold sans** headlines (Helvetica/Arial-family, very large, tight),
  letter-spaced UPPERCASE eyebrows/labels, `#D1D5DB` body. Code-mock uses **monospace**.

## Graphic elements (atoms)
| Element | Where used | Engine |
|---|---|---|
| Dark moon/space **cover bg** (extracted `assets/cover-bg.png`) | cover (w/ black field) | ✅ |
| Moon + Orion-spacecraft **divider/closing bg** (`assets/divider-bg.png`, right-half bleed) | closing, dividers | ✅ (as divider/closing art) |
| Brand lockup: blue dot + `DARK` letter-spaced label (top-left, every slide) | all slides | ○ (running header not modeled) |
| **Numbered eyebrow** `0N · LABEL` (blue, letter-spaced, above headline) | all content | ✅ (`eyebrow`) |
| **Big white bold headline** (+ optional lighter parenthetical, e.g. "(secondo noi)") | all content | ✅ |
| Right-edge **dot-navigation rail** (one blue active dot, rest gray) | all content slides | ○ |
| Footer rule: `DARK — CASE STUDY` … `NN / 14` page counter | all content | ⚙️ (footer variant) |
| Blue accent-bar **dark card** (left/top blue bar + `#111111` fill) | context row, prompting | ✅ (`card` w/ accent bar) |
| Numbered **option card** `01/02/03` + title + body + status chip (winner card gets blue border) | try-comparison | ⚙️ (via cards; winner-border ○) |
| **Status chip** — green ✓ "Buon risultato" / red ✗ "Non sufficiente" | option cards | ⚙️ (icon+label) |
| **Green-check bullets** (`#22C55E` circle-check) | focus, when-to-use | ⚙️ (bullet variant) |
| **Code-editor mock window** — dark chrome, traffic-light dots (red/amber/green), title, monospace body w/ syntax colours | the "DS.md" focus slide | ○ |
| **Horizontal step timeline** — blue rail, ringed nodes `01…07`, alternating above/below labels | workflow / process | ○ |
| **Comparison table** — blue letter-spaced header row, hairline rows, bold criterion col | tool-vs-tool | ○ |
| **Bento takeaways grid** — 2×3 dark cards, each blue circular **glyph icon** + title + caption | key takeaways | ⚙️ (bento/pillars) |
| Rounded blue **glyph icon chips** (doc, palette, layers, code `</>`, chat, tree) | takeaways, prompting | ○ (raster icons only) |
| Two-column **decision panels** (blue vs orange top-bar; blue-border = the pick) | when-to-use | ⚙️ (2-col cards) |
| Blue **underline stroke** under sub-block (cover/closing) | cover, closing | ✅ (motif) |

---

## Slide archetypes (with triggers)

### Openers & punctuation
- **cover-moon** — full black field, moon bg (`cover-bg.png`), brand lockup, blue letter-spaced
  eyebrow, huge white 2-line headline, `#D1D5DB` sub, blue underline + byline. **Trigger:** deck
  title. → `cover`. ✅
- **section-divider** — dark space art (`divider-bg.png`) with `0N/ Title`. **Trigger:** start of a
  section. → `divider`. ✅ (uses closing/space art + scrim)
- **statement** — one bold white line on black, optional blue eyebrow. **Trigger:** a manifesto/
  transition thought or the vision. → `quote` (`text` + `text_accent`). ✅ *(dark already)*
- **closing-transmission** — black left, moon+spacecraft art bleeding from the right, blue eyebrow
  "END OF TRANSMISSION", giant "Grazie.", blue underline + byline. **Trigger:** end. → `thank-you`. ✅

### Text / list content
- **content-intro (definition)** — numbered eyebrow + big headline left/top, `#D1D5DB` intro
  paragraph. **Trigger:** "what is X" / concept set-up / a section's framing paragraph.
  → `context`. ⚙️ needs dark content skin.
- **content-checklist** — headline + intro, then green-check bullets (`#22C55E`). **Trigger:** a
  flat list of benefits/criteria/"why it works". → `content` (bullets, check variant).
  ⚙️ needs dark content skin (+ green-check bullet variant).

### Data & metrics
- **big-stat-hero** — one huge number over label + support. **Trigger:** a single dominant figure.
  → `metrics` (1 metric). ⚙️ needs dark content skin. *(no stat slide in this deck; modeled for reuse)*
- **stat-quad** — up to four big stats in a row. **Trigger:** 2–4 headline KPIs. → `metrics` (2–4).
  ⚙️ needs dark content skin. *(not present in deck; modeled for reuse)*
- **comparison-table** — blue letter-spaced header row (criterion × option-A × option-B), hairline
  rows, bold left criterion column. **Trigger:** feature-by-feature "X vs Y" positioning.
  → NEW `table`. ○
- **step-timeline** — horizontal blue rail with ringed numbered nodes `01…0N`, labels alternating
  above/below, italic caption under. **Trigger:** an ordered process / workflow / N-step plan.
  → NEW `timeline` (horizontal). ○

### Feature / comparison / product
- **try-comparison (3 options)** — headline + intro, then 3 numbered dark cards (`01/02/03`) each
  title + body + status chip; the winning card gets a blue border + blue number. **Trigger:**
  "we tested N approaches, one won" / ranked options with a verdict. → `pillars`/`focus` (cards)
  + status chip. ⚙️ needs dark content skin (+ winner-border & status-chip variant).
- **dual-principle (2 cards)** — headline + intro, then 2 dark accent-bar cards (blue vs orange),
  each icon + UPPERCASE label + bold title + body. **Trigger:** two contrasting principles /
  do-this-and-also-this. → `content` groups / 2-col cards. ⚙️ needs dark content skin.
- **decision-guide (when-to-use)** — headline, 2 panels ("Use A if…" blue top-bar / "Use B if…"
  orange top-bar, blue-border = recommended), each UPPERCASE label + bold sub + green-check
  bullets. **Trigger:** "when to use which" recommendation split. → 2-col cards + checks.
  ⚙️ needs dark content skin.
- **code-focus** — numbered eyebrow + 2-line headline + intro + green-check bullets left; a
  **code-editor mock window** right (traffic-light dots, filename, syntax-highlighted monospace).
  **Trigger:** spotlight a config/markdown/code artifact as "the bridge/the key". → NEW `codecard`
  + `content`. ○ (mock window not built)

### Evidence / proof
- **takeaways-bento** — headline + 2×3 grid of dark cards, each blue circular glyph icon + bold
  title + `#9CA3AF` caption. **Trigger:** "key takeaways / what we learned" summary of ≥4 points.
  → `pillars`/`focus` (bento) + icon. ⚙️ needs dark content skin (+ blue glyph-icon chips).

---

## Coverage roadmap (grow the engine over time)
Render dark already (✅): **cover, divider, statement, closing** — via background art + scrim on black.

Highest-reuse next (unlocks most of Dark at once):
1. **Dark content skin** — flip `content` / `context` / `pillars` / `focus` / `metrics` to a
   near-black bg (`#000000`), dark cards (`#111111`/`#1F1F1F`), white headline, `#D1D5DB` body,
   blue `#0B6FFF` eyebrow/accent-bar. Instantly upgrades every ⚙️ archetype above.
2. **green-check bullet variant** (`#22C55E`) and **status chips** (✓ green / ✗ red) for lists,
   try-comparison and decision-guide.
3. **winner/recommended card border** (blue outline + blue number) for ranked option grids.
4. NEW **table** (comparison, blue header row) and NEW horizontal **timeline** (ringed numbered
   nodes on a blue rail) — both recurring, generic layouts.
5. NEW **code-editor mock window** (traffic-light chrome + monospace syntax) — very on-brand,
   reusable for any config/DS/markdown spotlight.
6. Cosmetic motifs: right-edge **dot-nav rail**, top-left **brand lockup** running header, and
   blue circular **glyph-icon chips** for bento cards.
Elements requiring the reference's own assets (moon cover / spacecraft divider art) are curated in
`assets/` and reused 1:1.
