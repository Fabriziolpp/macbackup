# ACN SONG — brand profile

This folder holds the **Accenture Song** brand assets the skill uses when you
answer **"sì"** to *"Usare le linee guida ACN SONG?"* (SKILL.md Q3a).

The skill **always asks** before using these — they are never applied silently.

## What to drop here

```
brand/acn-song/
├── tokens.json      ← palette + fonts + layout (EDIT THIS with official values)
├── fonts/           ← brand font files (.woff2 / .otf / .ttf), e.g. Graphik
│   ├── Graphik-Regular.woff2
│   ├── Graphik-Medium.woff2
│   └── Graphik-Semibold.woff2
└── logo/            ← logo as SVG only (no raster), light + dark variants
    ├── acn-song-white.svg
    └── acn-song-black.svg
```

## tokens.json

The values currently in `tokens.json` are **placeholders** derived from public
Accenture branding (signature purple `#A100FF`, black, Graphik). **Replace them**
with the official ACN SONG palette and type when you have the guidelines.

The renderer reads `palette`, `fonts`, `layout`, `decoration` from this file
exactly like any `design-spec` (`reference/design-spec.md`). So once the tokens
are correct, both the HTML deck and the `.pptx` come out on-brand automatically.

## Notes

- **Logos must be SVG.** The skill never uses raster logos (a hard rule).
- **Fonts must be local** for a self-contained build — the skill never embeds
  Google Fonts into the standalone HTML.
- On-brand **variety** is still expected: the brand pins *color and type*, but
  layout, decoration, and type-scale may vary across decks so they don't all look
  identical (see `reference/design-spec.md`).
