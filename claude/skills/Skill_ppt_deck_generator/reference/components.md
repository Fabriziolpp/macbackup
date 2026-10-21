# Reusable components

Small primitives used across slide types. Copy CSS from `template.html` (already includes all of these).

## eyebrow

Small numbered/labeled tag above a heading.
```html
<span class="eyebrow">01 · Contesto</span>
```
Has a 24px line before the text. On `.dark` slides, color flips to `--brand-soft-2`.

## back-link (ghost button)

Pill-shaped button for chapter dividers, navigates back to agenda.
```html
<button class="back-link" data-goto="1">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
  Agenda
</button>
```

## phase chip

Small pill indicating timeline state. Two variants:
```html
<span class="phase now"><span class="pd"></span>Punto di partenza</span>
<span class="phase next"><span class="pd"></span>Evoluzione futura</span>
```
`.now` = filled lavender bg, pulsing dot. `.next` = dashed border, hollow dot.

## timeline (horizontal track)

4-step horizontal track with active/done/future states.
See markup in `slide-types.md → now`.

CSS state mapping:
- `.tl-step.done .tl-dot` → lavender
- `.tl-step.act .tl-dot` → primary brand color, pulsing glow
- `.tl-step:not(.done):not(.act) .tl-dot` → grey

Track fill (`.tl-track::before`):
- 4 steps, 2nd active → `width: 33.33%`
- 4 steps, 3rd active → `width: 66.66%`
- N steps, Kth active (1-indexed) → `width: ((K-1)/(N-1))*100%`

## member card

Person card. Avatar (photo OR initials) + name + role.
```html
<div class="member">
  <div class="avatar"><img src="photos/Name.jpeg" alt="Name"/></div>
  <!-- OR initials -->
  <div class="avatar">NC</div>
  <div class="info"><b>Name Surname</b><span>Role · Company</span></div>
</div>
```

## focus card

Card with icon, number, title, description.
```html
<div class="focus-card">
  <div class="fc-ico"><svg width="26" height="26" …>icon</svg></div>
  <div class="fc-num">01</div>
  <h3>Title</h3>
  <p>Description.</p>
</div>
```

## agenda card (clickable)

Numbered card. Has hover gradient fill. `data-goto="N"` makes it click-navigable to slide index N (0-based).
```html
<div class="agenda-card" data-goto="2">
  <div class="num">01</div>
  <div><h3>Title</h3><p>Subtitle.</p></div>
</div>
```

JS handler is in `template.html`:
```js
document.querySelectorAll('[data-goto]').forEach(el =>
  el.addEventListener('click', () => go(parseInt(el.dataset.goto, 10)))
);
```

## animated entry

Add `data-anim="N"` (1–10) to any element to stagger its rise-in animation. Each step delays by 0.1s.
```html
<h2 data-anim="2">Title</h2>
<p data-anim="3">Body.</p>
```

Animation: opacity 0→1 + translateY(28px → 0) + blur(6px → 0), duration 0.9s, eased.

## icon set (suggested)

For pillar/focus slides, use Lucide-style stroke SVG icons (24×24 viewBox, stroke-width 2). Examples:
- Brain/knowledge: `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>`
- Search/observe: `<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>`
- Send/share: `<path d="M3 11l18-8-8 18-2-7-8-3z"/>`
- Lightning/optimization: `<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>`
- Target/standardize: `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>`
- Book/repository: `<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>`
