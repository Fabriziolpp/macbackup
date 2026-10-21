# Handoff: GymTonic — Home Page Redesign

## Overview
This package contains the hi-fi design reference for the **GymTonic Home Page** — the main dashboard of a fitness tracking app that helps athletes log workouts and track weekly goals. The home page surfaces the current week's progress, a streak counter, a quick-log form, and a list of recent workouts.

## About the Design Files
The file `GymTonic Home.html` is a **design reference prototype created in HTML/React** — it shows the intended look, feel, and interactive behavior of the screen. It is **not** production code to copy directly. Your task is to **recreate this design in the existing GymTonic codebase** (or the framework of your choice if one isn't established yet), using its existing component patterns, routing, and data layer.

## Fidelity
**High-fidelity.** This is a pixel-close mockup with final colors, typography, spacing, component structure, hover states, and transitions. Recreate it as closely as possible using your codebase's component library and design system.

---

## Screens / Views

### 1. Home Page (full page)

Single scrollable page, max-width **820px**, centered in the viewport. Background `#F4F2EE` (light theme) or `#0D0D0D` (dark theme). Box shadow `0 24px 80px rgba(0,0,0,0.25)`.

---

### Components

#### Navigation Bar
- Height: **52px**, sticky top, `z-index: 20`
- Background: `#FFFFFF` (light) / `#0D0D0D` (dark)
- Border-bottom: `1px solid rgba(0,0,0,0.08)`
- Padding: `0 28px`
- **Logo**: SVG icon (diamond/leaf shape) in accent color, `28×28px`, `margin-right: 24px`
- **Nav links**: "Home", "Settimana", "Mese", "Anno", "Schede" — `font-family: Barlow`, `font-size: 14px`, `font-weight: 500`, `padding: 0 12px`, height full. Active link has a `2px` bottom border in accent color.
- **Profile icon**: `32×32px` circle, border `1px solid border-color`, top-right

#### Hero / Weekly Progress Section
- Background: `#0D0D0D` (always dark regardless of page theme)
- Padding: `28px 28px 24px`
- **Top row**: week label left (`SETTIMANA 17 · 20 APR – 28 APR`, `Barlow Condensed 11px 600, letter-spacing 2, uppercase, color rgba(255,255,255,0.45)`), status badge right (`SOTTO` in red `#FF5555`, background `rgba(255,70,70,0.12)`, `padding: 3px 10px`, `border-radius: 2px`)
- **Big number**: Current count in `Barlow Condensed 900, 120px, line-height 0.85, letter-spacing -4px, color #F0F0F0`. Goal count as `/5` at `48px 700, color rgba(255,255,255,0.45), padding-bottom 10px`.
- **Side label**: "allenamenti / questa settimana" — `Barlow Condensed 13px 600, uppercase, letter-spacing 1, color rgba(255,255,255,0.45)`
- **Progress segments**: 5 horizontal bars, `height: 6px`, `border-radius: 2px`, gap `4px`. Empty: `rgba(255,255,255,0.1)`. Filled: accent color. Animate fill with `scaleX` from 0 to 1, `0.4s ease`, staggered `0.08s` per bar.
- **Caption**: `Barlow 12px, color rgba(255,255,255,0.45)` — "La settimana è appena iniziata — 5 allenamenti sono l'obiettivo"

#### Streak Section
- Padding: `20px 28px`
- Two side-by-side cards with `gap: 12px`
- **Left card** (neutral): `background: #1E1E1E` (dark) / `#FFFFFF` (light), `border: 1px solid border-color`, `border-radius: 6px`, `padding: 16px 20px`. Label "STREAK" `Barlow Condensed 10px 700, letter-spacing 2, color muted, uppercase`. Value: big number `Barlow Condensed 800 38px` + unit "SETTIMANA" `16px 600 uppercase letter-spacing 1`.
- **Right card** (accent): `background: accent-color`, `border-radius: 6px`, same padding. Label "RECORD" in `rgba(0,0,0,0.45)`. Value and unit in `#0D0D0D` / `rgba(0,0,0,0.5)`.

#### Motivational Message
- Margin: `0 28px 24px`
- `background: card-color`, `border: 1px solid border-color`, `border-radius: 6px`, `padding: 18px 20px`
- **Left accent**: `border-left: 3px solid accent-color`
- Text: `Barlow 14px, line-height 1.6, font-style italic, color: text-secondary`. Bold keywords with `font-style: normal, color: text-primary`.

#### Divider
- `height: 1px`, `background: border-color`

#### REGISTRA (Quick Log Form)
- Section header "REGISTRA": `Barlow Condensed 800 36px, letter-spacing -1px`. Clicking the header collapses/expands the form. Chevron icon rotates 180° when open.
- Padding: `24px 28px 28px`
- **Date + Time**: 2-column grid, `gap: 12px`. Native `<input type="date">` and `<input type="time">`. Style: `background: input-bg`, `border: 1px solid input-border`, `border-radius: 4px`, `padding: 11px 14px`, `font-family: Barlow 14px`, no default appearance.
- **Scheda selector**: Row of pill buttons for each available scheda. Selected state: `background: accent-color, color: #0D0D0D, border: 1.5px solid accent-color`. Unselected: `background: input-bg, color: text-secondary, border: 1.5px solid input-border`. `Barlow Condensed 600 13px`.
- **Tipo selector** (appears after scheda selection): Same pill button style for GIORNO 1/2/3 options.
- **Durata + Note**: 2-column grid `1fr 2fr`. Number input + text input.
- **SALVA button**: Full width, `padding: 14px`, `Barlow Condensed 800 16px letter-spacing 2 uppercase`. Default: `background: text-primary, color: page-bg`. Saved state (2s): `background: accent-color, color: #0D0D0D`. Transition: `all 0.2s`.

#### RECENTI (Recent Workouts)
- Header row: "RECENTI" `Barlow Condensed 800 36px` left, "26 TOTALI" `Barlow Condensed 12px 600 letter-spacing 1.5 uppercase muted` right
- Padding: `24px 28px 40px`
- Cards stacked with `gap: 12px`

#### WorkoutCard
- `background: card-color`, `border: 1px solid border-color`, `border-radius: 8px`, `overflow: hidden`
- On hover: border brightens to `workout-color + 55` (hex alpha), `box-shadow: 0 4px 20px rgba(0,0,0,0.1)`, `transform: translateY(-1px)`
- **Layout**: flex row — accent stripe | content | actions
- **Accent stripe**: `width: 4px`, color per workout (lime `#C8F135` for APRILE, orange `#FFA040` for MARZO)
- **Content area**: `padding: 16px 18px`
  - Top row: scheda tag pill (colored bg) + giorno name `Barlow Condensed 700 16px uppercase` on left; duration badge `Barlow Condensed 700 13px` on right
  - Date/time: `Barlow 12px, color text-secondary`
  - Note (if present): `Barlow 13px italic, color text-primary`, separated by `border-top: 1px solid border-color`, `padding-top: 4px`
- **Actions column**: `border-left: 1px solid border-color`, `padding: 0 14px`, flex column centered, `gap: 4px`. **Opacity 0 by default, 1 on card hover** (CSS transition). Edit icon (pencil SVG) in text-secondary. Delete icon (trash SVG) in `#FF5555`.
- Entry animation: `fadeUp 0.4s ease` staggered `0.06s` per card

---

## Design Tokens

### Colors (Light Theme)
```
--bg:             #F4F2EE
--surface:        #FFFFFF
--card:           #FFFFFF
--border:         rgba(0,0,0,0.08)
--text-primary:   #111111
--text-secondary: #666666
--text-muted:     #AAAAAA
--input-bg:       #F4F2EE
--input-border:   rgba(0,0,0,0.12)
--accent:         [user-configurable, default #C8F135]
--tag-apr-bg:     #e8f7c0
--tag-apr-color:  #4a7000
--tag-mar-bg:     #ffe8cc
--tag-mar-color:  #a05000
```

### Colors (Dark Theme)
```
--bg:             #0D0D0D
--surface:        #161616
--card:           #1E1E1E
--border:         rgba(255,255,255,0.08)
--text-primary:   #F0F0F0
--text-secondary: #888888
--text-muted:     #555555
--input-bg:       #121212
--input-border:   rgba(255,255,255,0.10)
--accent:         [user-configurable, default #C8F135]
--tag-apr-bg:     #1a2a00
--tag-apr-color:  #C8F135
--tag-mar-bg:     #2a1a00
--tag-mar-color:  #FFA040
```

### Typography
```
Display font:  "Barlow Condensed" — weights 700, 800, 900
Body font:     "Barlow" — weights 400, 500, 600
Import:        https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800;900&family=Barlow:ital,wght@0,400;0,500;0,600;1,400&display=swap
```

### Spacing
```
Page padding:    28px horizontal
Section gap:     24px vertical
Card gap:        12px
Input gap:       12px
Border radius:   4px (inputs/buttons), 6px (sections/streak cards), 8px (workout cards)
```

### Animations
```css
@keyframes fillBar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes fadeUp  { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
```

---

## Interactions & Behavior

| Element | Interaction | Detail |
|---|---|---|
| Nav links | Click | Set active tab, underline indicator |
| Hero progress bars | Page load | Animate fill left-to-right, staggered 80ms |
| REGISTRA header | Click | Collapse/expand form, chevron rotates |
| Scheda pills | Click | Select scheda, reveal Tipo row |
| SALVA button | Click | Flash to accent + checkmark for 2s |
| Workout card | Hover | Lift + border highlight + show action buttons |
| Delete button | Click | Remove card from list |
| Tweaks panel | Toggle | Switch theme (dark/light/split), accent color, form visibility |

---

## State to Manage

- `activeNav` — current nav tab
- `streakWeeks` — current streak count
- `weekCompleted` / `weekTotal` — progress bar fill
- `selectedScheda` — controls Tipo row visibility  
- `selectedTipo` — form field
- `workoutList` — array of recent workouts (deletable)
- `formOpen` — collapse state of REGISTRA section
- `savedState` — 2s "Salvato!" feedback on SALVA

---

## Assets

- **Logo**: Simple SVG path (diamond/leaf shape + inner circle) — see `<Nav>` component in the HTML file for the exact SVG markup.
- **Icons**: All inline SVG — edit (pencil), delete (trash), chevron, profile. See component source.
- **No external image assets.**

---

## Files in This Package

| File | Description |
|---|---|
| `GymTonic Home.html` | Full hi-fi interactive prototype (React + Babel, single file). Open in browser to interact. |
| `README.md` | This document — full implementation spec. |

---

## Notes for Claude Code

- The prototype uses **React 18 + Babel standalone** for rendering — this is a design tool, not the target stack.
- Recreate each component in your framework of choice (React, Next.js, etc.), using your existing component library for primitives (buttons, inputs, cards).
- The accent color (`#C8F135` lime by default) should be a theme token — the user may want to configure it.
- The hero section is **always dark** regardless of the overall page theme.
- Barlow Condensed is essential for the athletic typographic feel — include it via Google Fonts or self-host.
- Progress bar fill animation should trigger on mount/page load, not on scroll.
