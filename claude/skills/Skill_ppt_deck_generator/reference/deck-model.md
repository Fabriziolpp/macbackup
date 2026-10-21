# deck-model — the shared content contract

The **deck-model** is a single JSON object describing *what the presentation says*,
independent of how it looks. It is the hub of the skill:

```
  testo libero  ─┐
  deck esistente ─┼─▶  deck-model.json  ─┬─▶  HTML deck  (reference/slide-types.md + theme/spec CSS)
                  │                       └─▶  .pptx file (scripts/build_pptx.py)
```

Author the model **once**, then render it to HTML or PPTX (or both). The visual
direction lives separately in the **design-spec** (`reference/design-spec.md`).

## Top-level shape

```json
{
  "meta":   { "title": "...", "subtitle": "...", "client": "...", "date": "..." },
  "slides": [ { "type": "...", ... }, ... ],
  "media":  [ { "id": "hero", "file": "photos/hero.jpg", "kind": "image", "slide": 1 } ]
}
```

- `meta` — deck-level info (used on cover / thank-you / file metadata).
- `slides` — ordered list; each has a `type` from the taxonomy below + its fields.
- `media` — optional inventory of photos/videos the user supplied (see §Media).

## Slide types

Same taxonomy as `reference/slide-types.md` (HTML) so a model renders identically
in both targets. Every slide may carry an `eyebrow` (e.g. `"01 · Contesto"`).

| `type` | Fields |
|---|---|
| `cover` | `kicker`, `title`, `title_accent`, `subtitle`, `meta:[{label,value}]` |
| `agenda` | `eyebrow`, `headline`, `items:[{num,title,desc, goto}]` |
| `divider` | `eyebrow`, `num`, `title`, `title_accent` |
| `quote` | `eyebrow`, `text`, `attribution` |
| `context` | `eyebrow`, `headline`, `body:[para, ...]` |
| `now` | `eyebrow`, `word`, `body:[para,...]`, `timeline:[{label,state}]` (state ∈ done/act/future) |
| `team` | `eyebrow`, `headline`, `members:[{name,role,photo?}]` |
| `pillars` | `eyebrow`, `headline`, `items:[{num,title,desc}]` (3) |
| `pillar-detail` | `eyebrow`, `title`, `title_accent`, `objective`, `areas:[{title,desc}]` |
| `focus` | `eyebrow`, `headline`, `items:[{num,title,desc}]` (3) |
| `metrics` | `eyebrow`, `headline`, `intro`, `metrics:[{value,title,desc}]` (1-3) |
| `thank-you` | `title`, `name`, `tagline` |
| `gallery` | `eyebrow`, `title`, `images:[path,...]`, `caption` — row of images |
| `from-to` | `eyebrow`, `title`, `from:{label,title,items[]}`, `to:{label,title,items[]}` — transformation (Song signature) |
| `bar` | `eyebrow`, `title`, `items:[{label,value}]` — bar chart in the purple spectrum |
| `content` | `eyebrow`, `title`, `bullets:[...]` **or** `body:[para,...]`, optional `image`/`video` — generic fallback |

`content` is the catch-all when source material doesn't fit a richer type. Prefer a
specific type whenever the content matches one — that is what makes a deck feel designed.

## Media

When the user opts in to multimedia (SKILL.md Q4), they drop files into the output
folder (`photos/`, `video/`). Reference them from slides:

- **Image** in `team`: `"photo": "photos/marco.jpg"`.
- **Image** as a slide background or figure: add to a slide as `"image": "photos/x.jpg"`
  (HTML places it; `build_pptx.py` adds it with `add_picture`).
- **Video**: `"video": "video/demo.mp4"`. HTML uses `<video>`; PPTX uses `add_movie`.
  In PPTX a poster frame is recommended (`"poster": "photos/demo-poster.jpg"`).

Paths are **relative to the model file's folder**. `build_pptx.py` resolves them
against `_base_dir` (set automatically to the model's directory).

## Hard rules (inherited from SKILL.md)

1. **Never invent text.** Missing field → omit it; never emit "Lorem ipsum" or
   "Nome Cognome". The PPTX renderer skips empty fields by design.
2. **Never silently drop source content.** If a chunk doesn't fit any type, place
   it in a `content` slide or ask the user.
3. Every slide should have an `eyebrow` for narrative continuity; generate a short
   numbered label if the source lacks one.

## Example (minimal)

```json
{
  "meta": { "title": "Q2 Review", "client": "ACME" },
  "slides": [
    { "type": "cover", "kicker": "Q2 2026", "title": "Review trimestrale",
      "title_accent": "in sintesi", "subtitle": "Risultati e prossimi passi." },
    { "type": "agenda", "headline": "Agenda",
      "items": [ {"num":"01","title":"Risultati","desc":"I numeri del trimestre."},
                 {"num":"02","title":"Roadmap","desc":"Cosa arriva dopo."} ] },
    { "type": "thank-you", "title": "Grazie.", "name": "ACME Team" }
  ]
}
```

Render it:

```bash
# PPTX
python3 ~/.claude/skills/Skill_ppt_deck_generator/scripts/build_pptx.py deck.json spec.json out.pptx
# HTML → assemble per reference/template.html + slide-types.md, styled by the spec/theme.
```
