# Premium — pattern catalogue (fidelity memory + selection index)

> **ENGINE UPDATE (2026-07-02) — treat as ✅ built.** The shared engine now renders (Song-
> purple, mode-aware) these `build_pptx.py` types: cover, agenda, divider, quote(statement),
> context(definition), content(list/rich), pillars/focus(bento, +featured/+status), metrics
> (big-stat / donut-gauge via `ring` / stat-quad), donut, donuts, table, taxonomy, code,
> timeline, flow, gantt, ratings, logos, pricing, decision, activity, map, risk, phoneflow,
> finding, showcase, thank-you. If any archetype below is marked ○/⚙️ but maps to one of
> these, treat it as ✅. Only truly-unbuilt: glyph-icon chips (Dark), underline-marker /
> link-chip (Canvas). Image-slot types show a placeholder unless a media image is supplied.

Captured by studying **all 56 slides** of `AIDA_Offerta_Nexi.pptx`. This is the durable
"memory" of the Premium visual language: every graphic **element** and every slide
**archetype**, each with **triggers** so the skill can pick the right one autonomously
for arbitrary content (same idea as `brand/acn-song/song-layouts.md`, per-reference).

**How to use (autonomous selection).** For each block of the user's text: (1) identify its
communicative intent (definition / list / comparison / single stat / many stats / process
/ quote / showcase / finding / case study / …); (2) find the archetype whose **triggers**
match; (3) if that archetype is `engine: ✅`, emit the deck-model for it; if `⚙️/○`, fall
back to the nearest ✅ archetype and note the gap. Prefer variety across the deck.

Engine status: ✅ implemented in `build_pptx.py` (Premium skin) · ⚙️ partial · ○ not yet.

---

## Palette & type (from the reference)
- Electric purple `#6D28FF`, deep `#5312D6` / `#2E0A7A`, near-black-violet `#1B0A46`.
- Light tints `#B79DFF` / `#EDE6FF`. Ink `#17123A` on white. Graphik (light headlines).

## Graphic elements (atoms)
| Element | Where used | Engine |
|---|---|---|
| Blade gradient cover bg (extracted `assets/cover-bg.png`) | cover, dividers (w/ scrim) | ✅ |
| Dark 3D-blob divider bg (needs extracting, distinct from blade) | section dividers | ○ (blade+scrim used instead) |
| Accent word (purple) inside a headline | almost every slide | ✅ |
| Numbered eyebrow (big number + small label) | all content | ✅ |
| Purple pill / tag | maps, findings, taxonomy | ✅ (`pill`) |
| Purple gradient **bento card** | value/feature grids | ✅ (`bento_card`) |
| Callout box (purple border + accent bar + purple text) | key phrase | ✅ (`callout_box`) |
| Purple UPPERCASE sublabel + purple-dot bullets | grouped lists | ✅ (`sublabel`,`bullet`) |
| Chevron `>` footer + footnote link | all content | ✅ (`chevron`) |
| Rotated "Focus" tab | rich focus slides | ✅ (`focus_tab`, unused) |
| Vertical dotted **arc timeline** (3 steps) | per-country risk slides | ○ |
| Globe / Europe / Italy **map** graphic | geographic context | ○ |
| **Donut** chart (purple spectrum) | metrics dashboards | ○ |
| Multi-**donut** dashboard | market state | ○ |
| **Big-number** stat | hero stats | ⚙️ (via `metrics`/`now`) |
| Quad of big **%** stats | KPI grid | ○ |
| Cascading rounded **image cards** + dashed-arc + dots motif | showcase | ○ |
| Device / **browser screenshot** frame | audit findings, product | ○ (uses plain image) |
| **Comparison table** (products × criteria, checks) | positioning | ○ |
| **Gantt** bar timeline (years) | roadmap | ⚙️ (via `bar`) |
| Client **logo wall** (dark) | credibility | ○ |
| Green-check "by design" callout | compliance | ⚙️ (callout variant) |

---

## Slide archetypes (with triggers)

### Openers & punctuation
- **cover-blade** — blade bg, light headline + accent, logo lockup, date. **Trigger:** deck title. → `cover`. ✅
- **agenda-index** — dark blade bg, "Indice" + numbered TOC with purple numbers. **Trigger:** an explicit agenda/section list. → `agenda`. ✅
- **section-divider** — dark 3D-blob bg, "0N/ Title" + accent word. **Trigger:** start of a section. → `divider`. ✅ (blade+scrim)
- **statement-purple** — one bold sentence on the electric-purple field, trailing accent phrase. **Trigger:** a manifesto line, a transition thought, the vision. → `quote` (`text` + `text_accent`). ✅
- **closing** — "Grazie" on blade bg. **Trigger:** end. → `thank-you`. ✅

### Text / list content
- **content-list** — numbered eyebrow, accent headline, purple-dot bullets. **Trigger:** a flat list of points. → `content` (bullets). ✅
- **content-rich (two-col)** — headline + intro + callout left; UPPERCASE sublabel groups + bullets right (± Focus tab). **Trigger:** content with 2 labelled groups, or a key phrase to spotlight. → `content` (`groups`,`callout`,`sublabel`). ✅
- **definition (split)** — accent headline left, body paragraphs right. **Trigger:** "what is X" / a concept explained. → `context`. ✅

### Data & metrics
- **big-stat-hero** — one huge number stacked over title + supporting text; OR a donut GAUGE (add `ring: <pct>` to the metric). **Trigger:** a single dominant figure / a percentage. → `metrics` (1 metric, optional `ring`). ✅
- **stat-quad** — up to four big stats in a row. **Trigger:** 2-4 headline KPIs. → `metrics` (2-4 metrics). ✅
- **donut-single** — Song-purple-spectrum donut + center label + legend (swatch, label, value, desc). **Trigger:** parts-of-a-whole / distribution. → `donut` (`segments:[{label,value,desc}]`, `center`, `headline_accent`). ✅
- **donut-dashboard** — multiple donuts side by side. **Trigger:** several distributions at once. → NEW (multi-`donut`). ○
- **timeline-gantt** — horizontal purple bars across years. **Trigger:** a roadmap / dated plan. → `bar` or NEW `gantt`. ⚙️
- **comparison-table** — options × criteria, purple header band, ✓/— cells, zebra rows. **Trigger:** us-vs-competitors positioning. → `table` (`columns:[]`, `rows:[{label,cells:[]}]`). ✅

### Feature / product
- **bento-feature-grid** — many purple bento tiles. **Trigger:** a set of ≥4 features/values/benefits. → `pillars`/`focus` (bento). ✅
- **product-feature-screens** — name + badge, subhead, UI screenshots, bullets. **Trigger:** show a product with UI. → `content` + image. ⚙️
- **service-taxonomy** — columns of light-purple pills grouped by phase. **Trigger:** a service catalogue across phases. → `taxonomy` (`columns:[{phase,items:[]}]`). ✅

### Evidence / proof
- **audit-finding** — "Criticità: X" label, headline, browser-mock screenshot, "Riferimento / Utenti impattati" + Development/Design tags. **Trigger:** a specific issue/finding. → NEW `finding`. ○
- **checklist-alert** — checklist with ✓/✗ + document mockup. **Trigger:** a compliance checklist. → NEW `checklist`. ○
- **team-squad** — big stats + avatar grid + cert logos. **Trigger:** the team / who we are. → `team` (+ stats). ⚙️
- **logo-wall** — client logos grid on dark. **Trigger:** client roster / credibility. → NEW `logos`. ○
- **case-study-image-stats** — building/photo + body + stat row. **Trigger:** a client case with outcomes. → NEW `case` (or `content`+`metrics`). ○
- **image-showcase-cascade** — headline + sublabel + body left, cascading image cards right + dashed-arc motif. **Trigger:** show an environment/gallery with narrative. → `gallery` (Premium skin). ⚙️

### Geographic (Premium-specific)
- **content-map** — accent headline + faint gray country map + pills. **Trigger:** country/region context. → `content` + map element. ○
- **arc-risk-card** — vertical arc timeline (3 steps) + purple bento card w/ label+flag+bullets + globe. **Trigger:** per-country risk/regulation. → composite. ○ (very Premium-specific)

---

## Coverage roadmap (grow the engine over time)
Done: cover, divider, agenda, statement, big-stat, stat-quad, content-list, content-rich,
definition, bento (pillars/focus), closing — all ✅ with Premium skin.
Done: ✅ donut, ✅ big-stat donut-gauge, ✅ comparison-table, ✅ service-taxonomy
(all Song-purple, verified on the rich Premium demo).
Still ○ (lower priority / need assets or data): donut-dashboard (multi), timeline-gantt,
per-country arc-risk-map + faint country map, product-feature-screens, case-study,
logo-wall, audit-finding, image-showcase-cascade with dashed-arc motif.
Elements requiring the reference's own assets (arc/map/dark-blob divider) stay ○ until
extracted & curated.
