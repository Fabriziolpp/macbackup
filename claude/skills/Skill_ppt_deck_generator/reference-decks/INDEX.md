# Reference decks — style library

A growing library of **style benchmarks**. Each entry is a *distinct* visual style.

**Golden rule:** in the **ACN SONG** direction, exactly ONE reference guides a deck and the
user picks it — never blend two client styles. **Exception: the `MIX` direction**, which
deliberately composes the best archetypes from ALL references on one coherent Song canvas.
Colours are ALWAYS Song regardless — a reference contributes layout/structure only.

## How the skill uses this

- **Widget:** before showing the intake, the ACN SONG reference buttons are regenerated
  from the rows below — each row's **short name** becomes the button label and its **one-
  line hint** the sub-text. So the rows literally *are* the widget options.
- **ACN SONG direction:** the user picks exactly ONE reference here; build it with its
  style pack (`--style reference-decks/<slug>/style.json`). Never blend two.
- **MIX direction:** the skill reads ALL rows + all `patterns.md` and composes the best
  archetypes across references on one Song canvas (the sanctioned exception).
- **Autonomous selection** uses each reference's **"Use for"** as the trigger.

## How to add a reference — the row format

The curated **style packs** (`<slug>/`) *are* the library — the source `.pptx` need not be
kept once a pack is curated (they were removed from this repo to keep it light). To add a
NEW reference, drop its `.pptx` here, run `scripts/init_style_pack.py <file>.pptx` (it prints
the slug + file + light/dark), curate the pack, then remove the source `.pptx` if you want.
Add ONE row below using this template:

```
- **<Short name — subtitle>** · [`<file.pptx>` · ] [✦ **fidelity style pack** (`<slug>/style.json`) — build with `--style` · ] <one-line look: colours-are-always-Song, so describe STRUCTURE/layout, not colour>. **Use for** <when to pick it — this is the trigger>.
```

The five parts, and why each matters:
1. **`<Short name>`** (bold) → the **widget button label** (keep it short, e.g. "Premium").
2. **`` `<file.pptx>` ``** (optional) → the source filename, *only if* you keep it in this
   folder; omit it once the style pack is curated and the source `.pptx` removed.
3. **`✦ fidelity style pack (<slug>/style.json)`** → include ONLY if you built a style pack
   (via the scaffolder). It tells the skill to build with `--style`. Omit it and the
   reference still works in the clean generic look.
4. **one-line look** → the widget's sub-text + how it's built (structure/layout — colours
   are always Song, so don't describe its original colours as the point).
5. **`**Use for** …`** → the **trigger**: the kind of deck/content this reference suits.
   This is what drives autonomous selection — make it specific.

Copy-paste blank:
```
- **Nome — sottotitolo** · ✦ **fidelity style pack** (`slug/style.json`) — build with `--style` · Descrizione struttura/layout in una riga. **Use for** quando usarla.
```

## Available references

- **Premium — Inclusive Design (Offering)** · ✦ **fidelity style
  pack** (`premium/style.json`) — build with `--style` · Electric-purple
  gradient covers with sculptural 3D "blade" shapes; thin light Graphik headlines with
  one accent word; purple pill labels + EU-flag chips; numbered section eyebrows;
  chevron `>` / purple footer; rich data-viz (donut, maps, big stats). **Use for** bold,
  data-rich product or offering pitches that need a strong branded punch.
- **Dark — Design Process** · ✦ **fidelity style pack**
  (`dark/style.json` + `patterns.md`, dark content skin) — build with `--style` ·
  Dark/black cinematic tech; electric-blue accent; big white bold sans headlines;
  code-editor mock windows with monospace; green check bullets; numbered eyebrows
  (`04 · FOCUS`); dot navigation rail. **Use for** dev/engineering, "how we built it",
  or technical case-study decks.
- **Canvas — User Research Report** · ✦ **fidelity style pack**
  (`canvas/style.json` + `patterns.md`, ring-arc cover + solid-fill dividers) — build
  with `--style` · Light / off-white UX research report; bold black headlines with an
  orange accent word + orange underline markers; phone mockups arranged in flows with
  dotted connectors; `Canvas | Accenture Song` co-brand lockup. **Use for** UX research
  findings, usability, product reports.
- **Essential — Digital Offering (on-brand Song)** · ✦ **fidelity
  style pack** (`essential/style.json` + `patterns.md`, uses engine `decoration:"bar"`) —
  build with `--style` · Standard ACN
  Song FY26: purple gradient cover with the deconstructed bar + thin light headline;
  light editorial interiors; full-height side image; purple circular phase badges
  (`DISCOVER` …); "Deliverable previsti" side notes; `Accenture Song` footer. **Use for**
  standard on-brand Song offerings / proposals.
