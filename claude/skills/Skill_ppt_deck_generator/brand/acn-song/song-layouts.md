# ACN SONG — archetype index & selection guide

Distilled from `resources/FY26 Song Template_January 2027 (1).pptx` (194 slides).
Most of those 194 are *variations of ~24 archetypes*. This file is the **selection
index**: for **each block of the user's content**, match it to the archetype whose
**triggers** fit, then render it in the Song look. Page numbers point to the real
template slide for visual reference. Honor `DESIGN.md` for all styling.

## How to choose (run per content block)

1. **Read the block and classify its intent**, in this priority order:
   1. Is it a **section break / title**? → cover / divider.
   2. Does it carry **images / creative work / screenshots / people**? → go to the
      **image archetypes** (case study, content+image, team, bio, partners, gallery).
      *Images present is a strong signal — pick an image-bearing layout, don't drop them.*
   3. Is it **mostly numbers / a trend / a breakdown**? → data-viz (stat, bar, line,
      donut, timeline, gantt).
   4. Is it a **comparison / transformation** (before/after, as-is/to-be)? → from→to.
   5. Is it a **list of 3–6 points**? → numbered / cards / focus / pillars.
   6. Is it **prose / explanation**? → content (split) / statement.
2. **Match the count** (how many items/images/columns) to the archetype's capacity.
3. **Prefer less**: if two fit, choose the simpler / more whitespace one (DESIGN.md rule).
4. Give the block a slide; **one idea per slide** — split if it carries two.

## Archetype table

`maps→` = the `deck-model` type the renderer uses today. ⚙️ = not yet auto-rendered
by `build_pptx.py` (build ad-hoc / candidate for the renderer roadmap).

| Archetype | Template | Use when… | Structure | maps→ |
|---|---|---|---|---|
| **Cover — purple/dark/light** | 30–33, 50–54 | first slide / deck open | hero H1 + deconstructed bar + subhead/date | `cover` |
| **Section divider** | 34–41 | start of a section | gray `0N` + big title + bar (dark default) | `divider` |
| **Agenda / TOC** | 55–59 | outline up front | 3–4 numbered rows, or 8-grid, or 5-bar TOC | `agenda` |
| **Statement** | 60–61 | one strong sentence | oversized line, lots of space | `quote` |
| **Content (split prose)** | 64–67, 116+ | explanation, 1–2 paragraphs | title left / body right | `context` |
| **From → To** | 69–72 | before/after, as-is→to-be, transformation | gray "From" card + purple "To" card + arrow | `from-to` |
| **Numbered 01–0N** | 85–87 | 3–6 sequential/parallel points | purple numbers + short body, grid | `pillars`/`focus` |
| **Cards (2/3/4-col)** | 73–84 | parallel items, features, options | equal light-gray cards | `pillars`/`focus` |
| **Hero stat(s)** | 105, 158 | 1–3 headline numbers | huge purple numbers + descriptor | `metrics` |
| **Bar chart** | 106–108 | compare magnitudes | spectrum bars on gray track | `bar` |
| **Donut / circle** | 109–113 | parts of a whole, % | donut in spectrum, optional center stat | ⚙️ |
| **Timeline** | 147–151 | dates / milestones over time | horizontal axis, purple markers | ⚙️ (`now` has a basic one) |
| **Phases / Gantt** | 142–146 | steps, workstreams, roadmap | phase bands in spectrum | ⚙️ |
| **Label + description list** | 114–115, 136–139 | glossary, criteria, legend | rows of label : description | `content` |
| **Content + image** | 91–99, 153–157, 174–180 | a point that needs a supporting image | text one side, image the other (full-bleed opt.) | `content` (image) |
| **Case studies — list** | 165–166 | overview of several cases/work | 4–6 image thumbs + caption | `gallery` |
| **Case study — intro** | 170–171 | open one case | full-bleed image + title/eyebrow | ⚙️ (`gallery` 1 img) |
| **Case study — results** | 172–173, 175–176 | outcome of a case | big stat (+48%) + image + body | ⚙️ (`metrics`+img) |
| **Team — people cards** | 181–186 | "the team", 4–10 people | photo + name + role grid | `team` |
| **Leadership / many people** | 187–189 | large team, 12–30 | dense photo grid | `team` |
| **Bio / experience** | 190–194 | one person, credentials | photo + name/role + experience list | ⚙️ (`team` of 1 + `content`) |
| **Partners / logos** | 88–89, 26 | partner ecosystem | logo wall on dark | ⚙️ |
| **Gallery / decorative imagery** | 91–99 | show work / supporting visuals | row/grid of images + caption | `gallery` |
| **Thank you / Q&A / Discussion** | 42–49 | close | full purple, wordmark + bar | `thank-you` |

## Worked examples (content → archetype)

- *"3 case study di clienti con foto"* → **Case studies list (165)** → `gallery`.
- *"Risultato del progetto: +48% conversioni"* + screenshot → **Results (172)** ⚙️
  (today: `metrics` + image; ideal: dedicated results layout).
- *"Ecco il team: 5 persone"* with headshots → **Team cards (181)** → `team`.
- *"Da processo manuale → a piattaforma AI"* → **From→To (69)** ⚙️.
- *"La roadmap in 4 fasi"* → **Phases/Gantt (142)** ⚙️.
- *"Quote-frase forte"* → **Statement (60)** → `quote`.
- *Foto/mockup di prodotto da mostrare* → **Gallery (91)** → `gallery`.

## Renderer roadmap (⚙️ not yet automated)

Already automated: cover, divider, agenda, focus/pillars, metrics, context, gallery,
team, quote, thank-you, **from→to**, **bar**. Next highest-value to add:
**hero-stat-with-chart / results (172)**, **donut (spectrum)**, **timeline/phases**,
**bio/experience (190)**, **partners wall**. Until added, the selector still picks
them, and the renderer **degrades gracefully** to the nearest type (never manual).
