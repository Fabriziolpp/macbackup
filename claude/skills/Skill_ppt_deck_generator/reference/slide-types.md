# Slide types — taxonomy and HTML markup

Each type below has a recommended use case + ready-to-paste HTML. Replace `{{...}}` placeholders. Palette comes from CSS custom properties in `template.html`.

## cover

**When**: first slide. Title + subtitle + brand context.
**Background**: `dark` with animated orbs.

```html
<section class="slide dark active">
  <div class="cover">
    <div class="bg-orb o1"></div><div class="bg-orb o2"></div><div class="bg-orb o3"></div>
    <div class="noise"></div>
    <div class="cover-content stage">
      <div class="topbar"><div class="brand"><span class="dot"></span>{{LOGO}}</div><div>{{LOCATION}} · {{YEAR}}</div></div>
      <span class="pill" data-anim="1"><span class="led"></span>{{KICKER}}</span>
      <h1 data-anim="2">{{TITLE_PART_1}}<br/><span class="accent">{{TITLE_ACCENT}}</span></h1>
      <p class="subtitle" data-anim="3">{{SUBTITLE}}</p>
      <div class="meta" data-anim="4">
        <div>{{LABEL_1}}<b>{{VALUE_1}}</b></div>
        <div>{{LABEL_2}}<b>{{VALUE_2}}</b></div>
      </div>
    </div>
  </div>
</section>
```

## agenda

**When**: outline / table of contents. 3–5 numbered cards. Each card links to its chapter divider via `data-goto`.

```html
<section class="slide softbg">
  <div class="stage">
    <div class="topbar">…</div>
    <div data-anim="1">
      <span class="eyebrow">Agenda</span>
      <h2>{{HEADLINE}} <em class="serif" style="color:var(--brand-1)">{{HEADLINE_ITALIC}}</em>.</h2>
    </div>
    <div class="agenda-grid">
      <div class="agenda-card" data-goto="{{INDEX}}" data-anim="2"><div class="num">01</div><div><h3>{{TITLE}}</h3><p>{{DESC}}</p></div></div>
      <!-- repeat for each chapter -->
    </div>
  </div>
</section>
```

CSS: agenda-grid uses `repeat({{N}}, 1fr)` where N = number of cards. Cards have hover gradient fill and click navigate via JS.

## divider (chapter)

**When**: chapter break. Giant numeral + chapter title + back-to-agenda button.
**Background**: `dark` with noise overlay.

```html
<section class="slide dark">
  <div class="noise"></div>
  <div class="stage">
    <div class="topbar">
      <div class="brand">…</div>
      <button class="back-link" data-goto="{{AGENDA_INDEX}}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>Agenda
      </button>
    </div>
    <div class="divider">
      <div class="big-num" data-anim="1">{{NUM}}</div>
      <h2 data-anim="2">{{TITLE_PART_1}}<br/><em>{{TITLE_ITALIC}}</em></h2>
    </div>
  </div>
</section>
```

## quote

**When**: a single bold sentence presented dramatically.
**Background**: `dark`.

```html
<section class="slide dark">
  <div class="noise"></div>
  <div class="stage">
    <div class="topbar">…</div>
    <div class="quote">
      <div style="padding-left:80px" data-anim="1"><span class="eyebrow">{{NUMBER}} · {{LABEL}}</span></div>
      <span class="mark" data-anim="2">"</span>
      <h2 data-anim="3">{{QUOTE_TEXT_with_em_for_emphasis}}</h2>
    </div>
  </div>
</section>
```

## context (split prose)

**When**: title left, descriptive prose right.

```html
<section class="slide softbg">
  <div class="stage">
    <div class="topbar">…</div>
    <div class="ctx">
      <div class="left" data-anim="1">
        <span class="eyebrow">{{NUMBER}} · {{LABEL}}</span>
        <h2>{{HEADLINE}} <em>{{HEADLINE_ITALIC}}</em>.</h2>
      </div>
      <div class="right" data-anim="2">
        <p><b>{{BOLD_OPENING}}</b> {{REST}}</p>
        <p><b>{{NEXT_BOLD}}</b>, {{REST}}</p>
      </div>
    </div>
  </div>
</section>
```

## now (oversized italic word)

**When**: emphasizing a moment in time. Single italic word + paragraphs + horizontal timeline.

```html
<section class="slide dark">
  <div class="noise"></div>
  <div class="stage">
    <div class="topbar">…</div>
    <div class="now-wrap">
      <div data-anim="1">
        <span class="eyebrow">{{NUMBER}} · {{LABEL}}</span>
        <div class="now-text">{{ITALIC_WORD}}.</div>
      </div>
      <div class="now-sub" data-anim="2">
        <p>{{P1}}</p><p>{{P2}}</p>
        <div class="timeline">
          <div class="tl-track"></div>
          <div class="tl-steps">
            <div class="tl-step done"><div class="tl-dot"></div><div class="tl-label">{{S1}}</div></div>
            <div class="tl-step act"><div class="tl-dot"></div><div class="tl-label">{{S2}}</div></div>
            <div class="tl-step"><div class="tl-dot"></div><div class="tl-label">{{S3}}</div></div>
            <div class="tl-step"><div class="tl-dot"></div><div class="tl-label">{{S4}}</div></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
```

The track-fill width is set to `(active_index / (total-1)) * 100%` in CSS. Default for 4 steps with 2nd active = `33.33%`.

## team

**When**: list of people. Use 5×2 grid for 10 people, 3×3 for 9, 4×N for 4-12. Photo or initials.

```html
<section class="slide softbg">
  <div class="stage">
    <div class="topbar">…</div>
    <div class="team-head" data-anim="1">
      <span class="eyebrow">{{LABEL}}</span>
      <h2>{{TITLE_PART}} <em>{{TITLE_ITALIC}}</em>.</h2>
    </div>
    <div class="team-grid">
      <div class="member" data-anim="2">
        <div class="avatar"><img src="photos/{{NAME}}.jpeg" alt="{{NAME}}"/></div>
        <div class="info"><b>{{NAME}}</b><span>{{ROLE}}</span></div>
      </div>
      <!-- repeat. Use initials in .avatar if no photo: e.g. "MA" -->
    </div>
  </div>
</section>
```

## pillars (3-card overview)

**When**: 3 themes/pillars with one-line description each.

```html
<section class="slide softbg">
  <div class="stage">
    <div class="topbar">…</div>
    <div data-anim="1">
      <span class="eyebrow">{{LABEL}}</span>
      <h2>{{HEADLINE}} <em class="serif" style="color:var(--brand-1)">{{HEADLINE_ITALIC}}</em>.</h2>
    </div>
    <div class="pillars">
      <div class="pcol" data-anim="2">
        <div>
          <div class="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">{{ICON_PATH}}</svg></div>
          <div class="pn">Pilastro 01</div>
        </div>
        <div><h3>{{TITLE}}</h3><p>{{DESC}}</p></div>
      </div>
      <!-- ×3 -->
    </div>
  </div>
</section>
```

## pillar-detail

**When**: deep-dive into a single pillar. Split layout: hero left, body with sub-items right.

```html
<section class="slide softbg">
  <div class="stage">
    <div class="topbar">…</div>
    <div class="pdet">
      <div class="lead" data-anim="1">
        <span class="eyebrow">{{NUMBER}} · {{LABEL}}</span>
        <h2>{{TITLE_PART}}<br/>che <em>{{TITLE_ITALIC}}</em>.</h2>
      </div>
      <div class="body" data-anim="2">
        <h4>Obiettivo</h4>
        <p>{{OBJECTIVE_TEXT}}</p>
        <h4>{{SECTION_LABEL}}</h4>
        <div class="areas">
          <div class="area"><b>{{AREA_TITLE}}</b><span>{{AREA_DESC}}</span></div>
          <!-- repeat -->
        </div>
      </div>
    </div>
  </div>
</section>
```

For pillar 03 (divulgazione-style with "now / future" phases):
```html
<span class="phase now"><span class="pd"></span>Punto di partenza</span>
<h4 style="margin-top:0">{{TITLE}}</h4>
<!-- content -->
<div class="future" style="margin-top:40px">
  <span class="phase next"><span class="pd"></span>Evoluzione futura</span>
  <h4 style="margin-top:0">{{TITLE}}</h4>
  <!-- content -->
</div>
```

## focus (3 value props)

**When**: 3 key benefits/points. Card with icon + number + h3 + description.

```html
<section class="slide softbg">
  <div class="stage">
    <div class="topbar">…</div>
    <div data-anim="1">
      <span class="eyebrow">{{LABEL}}</span>
      <h2>{{HEADLINE}} <em class="serif" style="color:var(--brand-1)">{{HEADLINE_ITALIC}}</em>.</h2>
    </div>
    <div class="focus-grid">
      <div class="focus-card" data-anim="2">
        <div class="fc-ico"><svg width="26" height="26" …>{{ICON}}</svg></div>
        <div class="fc-num">01</div>
        <h3>{{TITLE}}</h3><p>{{DESC}}</p>
      </div>
      <!-- ×3 -->
    </div>
  </div>
</section>
```

## metrics

**When**: 1–2 hero metrics with descriptions. Headline left, metrics right.

```html
<section class="slide softbg">
  <div class="stage">
    <div class="topbar">…</div>
    <div class="met">
      <div data-anim="1">
        <span class="eyebrow">{{LABEL}}</span>
        <h2>{{LINE_1}}<br/>che <em>{{ITALIC}}</em><br/>{{LINE_2}}.</h2>
        <p class="lead">{{INTRO}}</p>
      </div>
      <div class="metrics">
        <div class="metric" data-anim="2"><div class="num">{{N}}</div><div><h4>{{TITLE}}</h4><p>{{DESC}}</p></div></div>
        <div class="metric" data-anim="3"><div class="num">{{N}}</div><div><h4>{{TITLE}}</h4><p>{{DESC}}</p></div></div>
      </div>
    </div>
  </div>
</section>
```

## thank-you

**When**: closing slide.

```html
<section class="slide dark">
  <div class="cover">
    <div class="bg-orb o1"></div><div class="bg-orb o2"></div><div class="bg-orb o3"></div>
    <div class="noise"></div>
    <div class="stage" style="align-items:center;justify-content:center">
      <div class="topbar">…</div>
      <div class="thanks">
        <div class="ty" data-anim="1">Thank you.</div>
        <div class="name" data-anim="2">{{DECK_NAME_with_optional_accent}}</div>
        <div class="tag" data-anim="3">{{TAGLINE}}</div>
      </div>
    </div>
  </div>
</section>
```
