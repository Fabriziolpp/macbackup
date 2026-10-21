---
name: Accenture Song — FY26 Master
colors:
  background: "#ffffff"
  background-dark: "#120a1c"
  surface: "#ffffff"
  surface-dim: "#f1f1ef"
  surface-bright: "#ffffff"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#f9f9f8"
  surface-container: "#f1f1ef"
  surface-container-high: "#e8e8e6"
  surface-container-highest: "#cfcfcf"
  on-surface: "#000000"
  on-surface-variant: "#818180"
  on-surface-muted: "#cfcfcf"
  inverse-surface: "#120a1c"
  inverse-on-surface: "#ffffff"
  outline: "#cfcfcf"
  outline-variant: "#f1f1ef"
  outline-strong: "#000000"
  primary: "#a100ff"
  on-primary: "#ffffff"
  primary-container: "#e6dcff"
  on-primary-container: "#460073"
  primary-darkest: "#460073"
  primary-dark: "#7500c0"
  primary-core: "#a100ff"
  primary-light: "#c2a3ff"
  primary-lightest: "#e6dcff"
  inverse-primary: "#c2a3ff"
  neutral-black: "#000000"
  neutral-dark-gray: "#818180"
  neutral-medium-gray: "#cfcfcf"
  neutral-light-gray: "#f1f1ef"
  neutral-white: "#ffffff"
  secondary-pink: "#ff50a0"
  secondary-blue: "#224bff"
  secondary-aqua: "#05f2db"
  chart-track: "#f1f1ef"
  chart-track-dark: "#1f1630"
  chart-grid: "#e8e8e6"
  emphasis: "#a100ff"
  emphasis-on-dark: "#c2a3ff"
  link: "#a100ff"
  link-on-dark: "#c2a3ff"
typography:
  display-xl:
    fontFamily: Graphik
    fontSize: 120px
    fontWeight: "600"
    lineHeight: 1.0
    letterSpacing: -0.02em
  display-lg:
    fontFamily: Graphik
    fontSize: 96px
    fontWeight: "600"
    lineHeight: 1.02
    letterSpacing: -0.02em
  h1:
    fontFamily: Graphik
    fontSize: 80px
    fontWeight: "600"
    lineHeight: 1.04
    letterSpacing: -0.015em
  h2:
    fontFamily: Graphik
    fontSize: 60px
    fontWeight: "600"
    lineHeight: 1.06
    letterSpacing: -0.01em
  h3:
    fontFamily: Graphik
    fontSize: 42px
    fontWeight: "600"
    lineHeight: 1.1
    letterSpacing: -0.005em
  h4:
    fontFamily: Graphik
    fontSize: 26px
    fontWeight: "600"
    lineHeight: 1.18
  title-lg:
    fontFamily: Graphik
    fontSize: 20px
    fontWeight: "500"
    lineHeight: 1.3
  title-md:
    fontFamily: Graphik
    fontSize: 18px
    fontWeight: "500"
    lineHeight: 1.35
  title-sm:
    fontFamily: Graphik
    fontSize: 16px
    fontWeight: "500"
    lineHeight: 1.4
  body-lg:
    fontFamily: Graphik
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 1.5
  body-md:
    fontFamily: Graphik
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 1.5
  body-sm:
    fontFamily: Graphik
    fontSize: 12px
    fontWeight: "400"
    lineHeight: 1.45
  eyebrow:
    fontFamily: Graphik
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 1.2
    textTransform: none
  label-accent:
    fontFamily: Graphik
    fontSize: 14px
    fontWeight: "500"
    lineHeight: 1.2
    color: "{colors.primary}"
  section-number:
    fontFamily: Graphik
    fontSize: 26px
    fontWeight: "400"
    lineHeight: 1.0
    color: "{colors.neutral-medium-gray}"
  caption:
    fontFamily: Graphik
    fontSize: 10px
    fontWeight: "500"
    lineHeight: 1.4
  footnote:
    fontFamily: Graphik
    fontSize: 8px
    fontWeight: "400"
    lineHeight: 1.4
    color: "{colors.on-surface-variant}"
  stat-huge:
    fontFamily: Graphik
    fontSize: 180px
    fontWeight: "600"
    lineHeight: 0.95
    letterSpacing: -0.03em
    color: "{colors.primary}"
  stat-large:
    fontFamily: Graphik
    fontSize: 96px
    fontWeight: "600"
    lineHeight: 1.0
    letterSpacing: -0.02em
    color: "{colors.primary}"
  stat-medium:
    fontFamily: Graphik
    fontSize: 60px
    fontWeight: "600"
    lineHeight: 1.0
    color: "{colors.on-surface}"
rounded:
  none: 0
  xs: 2px
  sm: 4px
  DEFAULT: 0
  md: 0
  lg: 0
  pill: 4px
  full: 9999px
spacing:
  unit: 8px
  micro: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 56px
  2xl: 80px
  3xl: 120px
  slide-margin-x: 56px
  slide-margin-y: 48px
  slide-gutter: 40px
  card-padding: 32px
  card-gap: 24px
  section-gap: 80px
  grid-columns: 12
  grid-gutter: 24px
motion:
  duration-fast: 120ms
  duration-base: 240ms
  duration-slow: 480ms
  duration-cinematic: 800ms
  easing-standard: cubic-bezier(0.2, 0, 0, 1)
  easing-emphasized: cubic-bezier(0.3, 0, 0, 1)
  easing-linear: linear
shadows:
  none: none
  subtle: 0 1px 2px rgba(0, 0, 0, 0.04)
  overlay: 0 16px 48px rgba(18, 10, 28, 0.12)
gradients:
  hero-purple: radial-gradient(140% 120% at 30% 20%, #a100ff 0%, #7500c0 45%, #460073 100%)
  hero-purple-curved: radial-gradient(120% 100% at 20% 30%, #c2a3ff 0%, #a100ff 30%, #7500c0 65%, #460073 100%)
  divider-bar: linear-gradient(90deg, #460073 0%, #7500c0 20%, #a100ff 50%, #c2a3ff 80%, #e6dcff 100%)
  partner-dark: linear-gradient(180deg, #120a1c 0%, #1a0f2e 100%)
components:
  deconstructed-bar:
    description: Signature five-segment purple bar that underlines titles and separates sections
    segments: 5
    segment-height: 3px
    segment-gap: 16px
    segment-widths: [360px, 280px, 220px, 140px, 80px]
    segment-colors-light: ["#e6dcff", "#c2a3ff", "#a100ff", "#7500c0", "#460073"]
    segment-colors-dark: ["#ffffff", "#c2a3ff", "#a100ff", "#7500c0", "#460073"]
  title-slide-light:
    backgroundColor: "{colors.background}"
    textColor: "{colors.on-surface}"
    headline: "{typography.h1}"
    accent: deconstructed-bar
  title-slide-dark:
    backgroundColor: "{colors.background-dark}"
    textColor: "{colors.inverse-on-surface}"
    headline: "{typography.h1}"
    accent: deconstructed-bar
  title-slide-purple:
    background: "{gradients.hero-purple-curved}"
    textColor: "{colors.neutral-white}"
    headline: "{typography.h1}"
    accent: deconstructed-bar-on-purple
  section-divider:
    numberStyle: "{typography.section-number}"
    titleStyle: "{typography.h1}"
    accent: deconstructed-bar
    padding: "{spacing.slide-margin-x}"
  content-card-light:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.none}"
    padding: "{spacing.card-padding}"
    titleStyle: "{typography.h4}"
    bodyStyle: "{typography.body-md}"
  content-card-dark:
    backgroundColor: "#1a0f2e"
    textColor: "{colors.inverse-on-surface}"
    titleColor: "{colors.primary-light}"
    rounded: "{rounded.none}"
    padding: "{spacing.card-padding}"
  content-card-purple:
    backgroundColor: "{colors.primary-core}"
    textColor: "{colors.neutral-white}"
    rounded: "{rounded.none}"
    padding: "{spacing.card-padding}"
  from-to-block-from:
    backgroundColor: "{colors.neutral-light-gray}"
    textColor: "{colors.on-surface}"
    eyebrowColor: "{colors.on-surface-variant}"
  from-to-block-to:
    backgroundColor: "{colors.primary-core}"
    textColor: "{colors.neutral-white}"
    eyebrowColor: "{colors.primary-lightest}"
  stat-block:
    numberStyle: "{typography.stat-large}"
    numberColor: "{colors.primary}"
    descriptionStyle: "{typography.body-md}"
    spacing-between: "{spacing.sm}"
  eyebrow-link:
    typography: "{typography.label-accent}"
    color: "{colors.primary}"
    textDecoration: underline
  agenda-item:
    numberStyle: "{typography.title-lg}"
    numberColor: "{colors.on-surface-muted}"
    titleStyle: "{typography.h4}"
    titleColor: "{colors.primary}"
    dividerColor: "{colors.outline}"
    dividerStyle: 1px solid
  table-row:
    paddingY: "{spacing.sm}"
    bodyStyle: "{typography.body-md}"
    rowDividerColor: "{colors.outline}"
    rowDividerWidth: 0.5px
    headerColor: "{colors.primary}"
    headerStyle: "{typography.label-accent}"
  chart-bar:
    trackColor: "{colors.chart-track}"
    trackColorDark: "{colors.chart-track-dark}"
    fillColors: ["#460073", "#7500c0", "#a100ff", "#c2a3ff", "#e6dcff"]
    labelStyle: "{typography.body-sm}"
    axisColor: "{colors.on-surface-variant}"
  footer:
    heightReserve: 40px
    textStyle: "{typography.body-sm}"
    leftLabel: "Accenture Song"
    leftLabelAccent: "Song"
    leftLabelAccentColor: "{colors.primary}"
    copyrightStyle: "{typography.footnote}"
  venn-overlap:
    opacity: 1.0
    blendMode: multiply
    intersectionColor: "{colors.background-dark}"
page:
  aspect: "16:9"
  base-width: 1920px
  base-height: 1080px
  safe-area-x: 56px
  safe-area-y: 48px
  title-area-top: 56px
  title-area-maxWidth: 960px
  footer-height: 40px
  grid: 12-column
  grid-gutter: 24px
---

## Brand & Style

This design system is the FY26 master language of **Accenture Song** — Accenture's tech-powered creative group. Its self-description is "bold, clean, minimal," and every visual decision is in service of that triad. Where most corporate decks hedge with decoration, this one strips away until only the idea, the typography, and a precise application of purple remain. The aim is to feel like the work of a premium creative consultancy: confident, editorial, and modern, with the quiet authority that comes from knowing exactly when not to do something.

The emotional register is **crafted minimalism with bursts of saturation**. Most of the surface is white space and black text. Then, at calibrated moments — a section divider, a hero statistic, a full-bleed cover — a deep, luminous purple takes over an entire page. That restraint is what gives the color its impact. "Craft signals respect" is one of the system's stated principles, and you can feel the discipline in every slide: one idea per slide, precision typography, no decoration for decoration's sake, data as narrative evidence rather than dumps.

The system runs in two coordinated modes. **Light mode is the default** — used for dense information, printed materials, and most content slides. **Dark mode** is reserved as an accent, deployed to begin a section or emphasize a summation. A vivid purple gradient is used even more selectively — as a hero cover, a full-bleed section divider, or a closing "Thank you" — to act as a high-energy punctuation mark within the white-and-black rhythm.

## Colors

The palette is disciplined and legible, organized around a small, well-defined set of roles. The strategic tension between the extremely neutral base (black, white, a narrow gray scale) and the vibrant purple spectrum is what gives the system its signature.

### Purple spectrum — the brand's spine

Five calibrated stops from near-black to near-white, used for data visualization, deconstructed gradients, and tonal backgrounds:

- **Darkest purple — `#460073`**: deepest anchor; backgrounds behind white text, the leftmost stop of the deconstructed bar, the darkest bar in a chart.
- **Dark purple — `#7500C0`**: transitional depth; section-divider fills, secondary data bars.
- **Core purple — `#A100FF`** ("Accenture Purple"): the default brand voice. Used for links, accent labels, eyebrow headlines, chart highlights, "Song" in the logo lockup, CTA buttons, primary bars in data.
- **Light purple — `#C2A3FF`**: softer surfaces, dark-mode accent text, lighter data bars.
- **Lightest purple — `#E6DCFF`**: tint backgrounds, dividers, competitive-matrix highlight cells.

These stops are used **in order** — left-to-right or top-to-bottom — to create a "deconstructed gradient." They are never blended into a true gradient on text or in graphics (old Song 2.0 blended gradients are explicitly retired). The only rendered gradients are the **full-bleed hero purples**, which use a radial transition from `#460073` through `#7500C0` and `#A100FF` with a soft organic curve that suggests light but never resolves into a recognizable image.

### Neutrals — the quiet workhorses

The interface consumes 60–70% neutrals in both modes:

- **Black `#000000`**: primary text on light surfaces, solid fills, chart axes.
- **Dark gray `#818180`**: section numbers (`01`, `02`, `03`), axis labels, muted captions.
- **Medium gray `#CFCFCF`**: dividers, inactive outlines, timeline track lines.
- **Light gray `#F1F1EF`**: card fills in light mode, chart-bar tracks (the unfilled portion behind a bar), large placeholder image blocks.
- **White `#FFFFFF`**: the dominant canvas in light mode.

**A note on the dark canvas.** Brand guidelines specify pure `#000000`, but the deck's dark-mode surfaces render as a very slightly desaturated near-black with a warm plum undertone (`#120A1C` in this system). The tint is subliminal — it keeps large dark surfaces from feeling flat or cold next to the vibrant purples. Treat `#120A1C` as the dark canvas and reserve `#000000` for text, solid shapes, and data fills.

### Secondary palette — use sparingly

Pink `#FF50A0`, Blue `#224BFF`, and Aqua `#05F2DB` exist **only** as support for infographics, data visualizations, and occasional heat-map status indicators. Combined, the full secondary palette should appear on **less than 5%** of the deck. Never use them for text. Never mix them with the purple spectrum in a way that competes for attention.

### Color ratios (the 45/35/20 rule)

Across a full deck, target roughly **45% white/light, 35% dark (black canvas + solid blacks), and 20% purple**. Within any single mode: **60–70% neutrals, 30–40% purple, <5% secondary**. These ratios are the system's secret to looking premium at the deck level — the purple is a seasoning, not a base ingredient.

## Typography

The sole typeface is **Graphik**, in three weights: Semibold, Medium, and Regular. Accenture's broader brand uses Arial and GT Sectra Fine, but Song has earned its own voice with Graphik — a neutral geometric sans that reads as contemporary, technical, and slightly more "creative studio" than "consultancy." Custom line-spacing and kerning are applied to make the type feel more premium than defaults would allow.

**Hierarchy principles.** Use one voice per moment: a slide headline uses Semibold in the largest size appropriate to its content; body copy uses Regular; labels and captions use Medium. Never use multiple weights within a single headline or label — change *size* to create hierarchy, not weight within the same string.

**Size ramp** (inherits from PowerPoint pt system; shown here as px):

- **H1 `80px` Semibold** — deck titles, hero headlines.
- **H2 `60px` Semibold** — section titles, major moments.
- **H3 `42px` Semibold** — slide titles, key quotes.
- **H4 `26px` Semibold** — slide sub-titles, card titles.
- **Subhead 1 `20px` Medium** — supporting titles.
- **Subhead 2 `16px` Medium** — small titles.
- **Body / content `16px`, `14px`, `12px` (Regular or Medium)** — paragraphs, table cells. Use Regular for paragraphs dense enough to look crowded at Medium; Medium for highlights and short copy.
- **Caption `10px` Medium** / **Footnote `8px` Regular** — image captions, disclaimers, legal text.

**Section number treatment.** Every section divider pairs a two-digit gray number (`01`, `02`) in roughly 26–42px with a much larger headline below. The number sits one type-size above the headline and is colored in the medium gray `#CFCFCF` to quietly anchor without competing.

**Hero statistics.** A recurring pattern is a massive purple number (e.g., "+18%", "120m+") rendered in Semibold at 96–180px, paired with a small-caps or small-body description below. These numbers are the visual peak of the system — they function as mini-posters inside the deck.

**Treatment rules.** Never use gradients on text. Never italicize for emphasis (only Regular/Medium/Semibold weight changes). Always keep text flat; text-shadows are only permitted on full-bleed photo covers where legibility demands it, and even then should be extremely subtle.

## Layout & Spacing

The canvas is **16:9, 1920 × 1080 base** (PowerPoint `960 × 540 pt`). The system uses a **12-column grid** with 24px gutters, active in every master layout. All content — including titles, body, images, and footers — is constrained by the grid borders. Only three things are permitted to break this grid: **full-bleed imagery**, the **optional eyebrow label** at top-left, and the **footer** at the bottom edge.

### Rhythm

Everything is on an **8px base unit**. Common steps: 4, 8, 16, 24, 40, 56, 80, 120px. Use large steps (40–120px) for structural separation between page regions, medium steps (16–24px) for content groups, small steps (4–8px) for within-element detail. The system explicitly favors **generous whitespace** — "never crowd elements."

### Structure of a content slide

Reading top to bottom:

1. **Eyebrow** (14px, gray) — optional 1-line contextual label, flush left.
2. **Slide title** (H4 or larger) — flush left, one to three lines.
3. **Subhead** (Subhead 1/2) — optional, two lines max, softer weight.
4. **Content region** — cards, columns, charts, or photos, aligned to the 12-column grid with 24px gutters.
5. **Footer** — 40px reserved strip, with "Accenture Song" (Song in purple) at left, and page number + copyright at right.

### Full-bleed vs. bounded

When presenting creative work, **full-bleed imagery is preferred** over framed/contained layouts. When a slide is primarily about data, copy, or comparison, **respect the grid** and never let content touch the edges outside the safe area (56px horizontal margins, 48px vertical margins).

### Column patterns

The master layouts include preconfigured grids: 1-, 2-, 3-, 4-, 5-, and 6-column variants; 3x3 and 3x4 content tables; 3-overarching tiered layouts; agenda grids (3 or 4 items); and table-of-contents variants (8-item grid, 2-column list, 5-section colored bar). The 4-column card grid and 3-card content grid are the most frequently used workhorses.

## Elevation & Depth

This is **not** an elevation-driven design system. There are no drop shadows on cards, no glows, no depth-of-field. Hierarchy is created exclusively through **color, size, and whitespace**. That flatness is intentional — it signals discipline and keeps the focus on content, not chrome.

The two permitted depth cues:

- **Tonal layering.** A card on a white surface uses light gray (`#F1F1EF`) to sit one level above. A "dark mode" card on the dark canvas uses a very slightly lifted `#1A0F2E`. That's the entire elevation scale.
- **Overlay shadow on photo captions.** A very soft `0 16px 48px rgba(18, 10, 28, 0.12)` is permitted only on floating photo captions where legibility over a mixed-brightness background is at risk.

Buttons, inputs, cards, and modals never use shadows. If a hover state is needed, the interaction is a tonal shift (lighter/darker by one surface step) — not a lift.

## Shapes

The shape language is **aggressively rectilinear**. Default corner radius for every surface — cards, images, buttons, bars, tables, modals, color swatches, data bars — is **0**. Sharp corners carry the "precision" and "craft" of the brand.

Exceptions:

- **Circular elements**: timeline dots, avatar headshots on client-cover pages, location-map markers, pie and donut segments. These use `rounded-full` (9999px).
- **Subtle radii on interactive chips**: timeline markers and phase labels use a 2–4px radius to feel tactile without softening the language.
- **Icons**: use flat 2px line weight with rounded line caps, subtly echoing the timeline markers but never implying button-like buttons.

No ovals, no organic blobs, no diagonals, no rotated elements. Even the purple hero gradient uses an organic curve — but that curve is a *lighting* effect, not a *shape*, and it never defines a container.

## Motion

Motion is a functional accent, not entertainment. The tenth brand principle states: *"Motion is functional, not decorative. Motion should guide attention, not entertainment; if it is noticeable, it's likely wrong."*

When motion is used:

- **Slide transitions**: simple fade or cut; never a spin, flip, or "Morph" effect between unrelated slides.
- **Build sequences**: reveal content in the order it should be read. Use 240ms fades with a gentle ease-out; never a bounce.
- **Emphasis motion**: for hero statistics and headline moments, an 800ms cinematic reveal (text rising 24px + fade) is permitted.
- **Charts**: draw bars from the baseline with a 480ms staggered reveal; never animate individual data points separately.

Timing tokens favor the 120/240/480/800ms ladder with a standard cubic-bezier curve `(0.2, 0, 0, 1)` and an emphasized variant `(0.3, 0, 0, 1)` for hero moments.

## Components

### The deconstructed gradient bar

The system's single most recognizable element. **Five horizontal rectangles of purple**, from darkest to lightest (or the reverse), separated by small gaps, together forming a rhythmic horizontal "barcode" of the purple spectrum. Widths are **uneven and decrease from left to right** (approximately 360, 280, 220, 140, 80px at base size, scaling proportionally), creating a visual cadence like a musical decrescendo. The bar is 3px tall.

It appears:

- Beneath the hero headline on title slides
- As the underline of section dividers and "Thank you" slides
- As the top stripe on a 5-section table of contents (in which case the widths become equal and the bars widen to fill their columns)
- As a full-page divider in quiet section transitions

The bar is never decorative filler. Every appearance should visually index a *title moment*: the beginning of a section, the end of a deck, or a major pivot in the narrative.

### Title / cover slides

Four variants carry the brand lockup and a hero headline:

- **Light cover** — white canvas, black H1, deconstructed bar underline, optional subhead + date row at the bottom.
- **Dark cover** — `#120A1C` canvas, white H1, same bar/subhead treatment.
- **Purple cover** — radial purple gradient (`#460073 → #7500C0 → #A100FF`) with a soft organic curve, white H1, white bar treatment.
- **Image cover** — full-bleed photograph with white H1 over the darker region; logo + subhead anchored in a low-contrast area.

### Section dividers

Each section opens with a number + headline pair: a gray `01` at roughly 26–42px, followed by a 60–80px Semibold section title, followed by the deconstructed bar. The divider may be rendered on a white canvas, the dark `#120A1C`, a solid core purple, or the purple gradient — chosen for narrative tempo. A single sentence subhead can sit below the bar if context is essential.

### Content cards

Three flavors, all with **zero corner radius** and no shadow:

- **Standard card** — light-gray fill (`#F1F1EF`) on white canvas, black body, 32px padding. The default container for 2/3/4-column content layouts.
- **Dark card** — slightly-lifted `#1A0F2E` on dark canvas, white body with `#C2A3FF` titles.
- **Purple card** — solid core-purple fill, white body. Reserved for emphasis ("bold mode") or the "To" half of a from→to comparison; never a default.

Cards stack in equal-column grids (2, 3, 4, 5 across) with 24px gutters. Titles use H4, body uses body-md.

### From → To blocks

A paired two-card construction used to illustrate transformation. Left card (current state) is light gray with muted "From" eyebrow; right card (target state) is core purple with white "To" eyebrow. A small purple arrow sits between them. When showing lists, each list item is its own small stacked card following the same from/to color inheritance.

### Agenda & tables of contents

Numbered items with a gray two-digit prefix, a purple title below, a 1px gray horizontal divider, and a small-body description. Supports 3, 4, 8, or 5-section (with a colored deconstructed bar on top) variants. Always left-aligned to the grid.

### Statistics

Hero numbers are set in Graphik Semibold 96–180px in core purple, paired with a 14–16px descriptor beneath. Often arranged in three-across grids ("120m+ / 120m+ / 120m+") with generous whitespace. A recurring pattern pairs a large number with a small purple bar chart on the same slide to show a trend.

### Tables

Minimal by design: 0.5px gray rules (`#CFCFCF`) separating rows, purple headers in label-accent style, plain-text cells in 14px body. A row can be highlighted by filling its background with core purple and switching its text to white — used sparingly to call out the row about Accenture itself in a competitive-analysis table.

### Data visualization

All charts share a consistent visual grammar:

- **Bar charts**: each bar is a solid color pulled from the purple spectrum stops in order (`#460073`, `#7500C0`, `#A100FF`, `#C2A3FF`, `#E6DCFF`). Unfilled "track" behind the bar is light gray (`#F1F1EF`) so each bar reads as "X% of the whole." Labels in body-sm, axis in gray.
- **Line charts**: up to 3 or 4 lines using distinct purple stops; no markers by default; 2px stroke weight.
- **Pie / donut charts**: slices follow the spectrum in order; an emphasized slice may be pulled out slightly or labeled with a large stat in the center.
- **Radar maps**: translucent core-purple fill over a light-gray grid; optional inner dark-purple fill for a second dataset.
- **Timelines / Gantts**: phases are colored by the purple spectrum; task bars are sharp-cornered rectangles; week/month axis in body-sm gray.
- **Org charts**: the top node is darkest purple; each successive level steps lighter until leaf nodes become light-gray fill with black text.
- **Venn diagrams**: circles use core purple and light purple at full opacity with `mix-blend-mode: multiply` so overlapping regions darken to dark purple or black. Outlined (no-fill) Venn variants are also supported.
- **Location maps**: dot-matrix world map with light-gray dots as the base; active regions are rendered in the purple spectrum (darkest to lightest) to indicate tiered presence.
- **Treemaps**: leaves use varying purple stops tuned to their hierarchy; all labels are in white Semibold 14–20px.

### Footer

Every non-cover slide carries a minimal footer in the bottom 40px: "Accenture **Song**" (with "Song" in core purple) flush left, and "Copyright © Accenture 2026. All rights reserved." plus page number flush right, both in 8–10px gray.

### Logo lockup

"Accenture Song" is always the full lockup — never just "Song," never with a word appended ("Accenture Song Design" is forbidden), never gradient, never color-changed. Required clear space around the mark equals **100% of the mark's x-height** on all sides. A reversed variant exists for dark backgrounds, with "Accenture" in white and "Song" in white rather than purple when purple wouldn't have sufficient contrast.

## Voice & Content Principles

These content rules are baked into the visual system and should guide layout decisions:

1. **Start with narrative, not slides.** Treat slides as beats in a story.
2. **One idea per slide.** If a slide communicates two things, it's two slides.
3. **Design for meaning, not decoration.** Remove anything that, if removed, wouldn't change the meaning.
4. **Precision typography is essential.** Type is the interface of thinking.
5. **Visuals over words — but only to add meaning.**
6. **Data as narrative evidence, not dumps.** The viewer should know *why* a data point matters.
7. **Consistency signals maturity.** Inconsistency reads as unfinished or repurposed.
8. **Motion is functional, not decorative.**
9. **Slides support the speaker; they aren't the script.** If a slide must stand alone, write a separate document.
10. **Craft signals respect** — for the audience, their brand, and our brand.

When a choice between two visual treatments arises, the correct answer is almost always the one with **less**: less color, less weight variation, less decoration, less motion, less content per slide. The system earns its boldness by spending that boldness in exactly the right places.
