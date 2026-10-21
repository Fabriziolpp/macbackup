# DesignSlide.md — Style Guide per la generazione di slide

> **Scopo del file.** Questo documento è la fonte di verità per una skill che genera presentazioni ispirate al master `slidemaster.pptx` (Accenture Song). La skill produce **principalmente file `.pptx`** e, su richiesta, **pagine `HTML/CSS`** (web deck). Per ogni token del design system (colore, tipografia, posizione, dimensione) il file fornisce i valori nativi PowerPoint **e** gli equivalenti CSS, in modo che i due output siano visivamente equivalenti.
>
> **Come usare questo file.** Leggerlo per intero prima di generare il primo file di output. Per ogni slide richiesta:
> 1. scegliere uno dei 9 layout archetipi (sezione 6),
> 2. applicare i token di colore/tipografia (sezioni 4 e 5),
> 3. inserire i componenti ricorrenti (sezione 7),
> 4. validare con la checklist finale (sezione 11).

---

## Indice

1. [Design DNA in 30 secondi](#1-design-dna-in-30-secondi)
2. [Stack tecnologico raccomandato](#2-stack-tecnologico-raccomandato)
3. [Canvas & coordinate system](#3-canvas--coordinate-system)
4. [Color system](#4-color-system)
5. [Typography system](#5-typography-system)
6. [Layout archetipi (9)](#6-layout-archetipi-9)
7. [Componenti ricorrenti](#7-componenti-ricorrenti)
8. [Imagery & media guidelines](#8-imagery--media-guidelines)
9. [Tone of voice & content patterns](#9-tone-of-voice--content-patterns)
10. [Reference scaffold completi](#10-reference-scaffold-completi)
11. [Checklist di conformità](#11-checklist-di-conformità)
12. [Decorazioni 3D firma (petali + forme liquide acciaio)](#12-decorazioni-3d-firma)

---

## 1. Design DNA in 30 secondi

I 8 "fingerprint" non negoziabili che rendono una slide riconoscibile come Accenture Song:

1. **Gradiente viola firma** verticale `#702FFF → #8134FF → #A33EFF` — usato per section divider, cover e momenti di transizione.
2. **Tipografia Graphik** mixed-weight — Regular + Medium nello stesso headline per gerarchia interna ("A suite of tools **to manage and monitor digital accessibility**").
3. **Full-bleed imagery** con overlay alpha 50% per garantire leggibilità del testo.
4. **Footer 8pt** con `Copyright © 2026 Accenture. All rights reserved.` + slide number, allineato a destra, su tutte le slide tranne la cover.
5. **`+` viola** (`#702FFF`, 40pt) come separatore tra blocchi di logo/contenuto — segnala "addizione/combinazione".
6. **Canvas 16:9** con margini sicuri 0.5" e **logo simbolo Accenture** (chevron `>`) in bottom-left, oppure wordmark "Accenture Song" sulla cover.
7. **Decorazioni 3D firma** top-right (sezione 12): "petali/ventaglio" viola sulla cover, "forme liquide color acciaio" sulle slide content. Sono renderizzate (PNG con trasparenza), non procedurali.
8. **Sottolineatura viola** `#702FFF` come emphasis/link inline nel body text — alternativa al Medium 500 quando si vuole un evidenziazione più "linkata".

---

## 2. Stack tecnologico raccomandato

### Per output `.pptx` (primario)
- **Libreria**: [`python-pptx`](https://python-pptx.readthedocs.io/) (Python). Limite noto: non espone nativamente `gradFill` — va iniettato via `lxml` (vedi sezione 10.1).
- **Alternative**: `pptxgenjs` (Node.js) supporta gradient nativamente; più ergonomico se si preferisce JavaScript.
- **Encoding**: UTF-8. Slide size impostato esplicitamente a `Inches(13.333)` × `Inches(7.5)`.

### Per output HTML/CSS (opzionale)
- **Markup**: HTML5 statico. Una `<section class="slide">` per slide, navigazione con `scroll-snap-type: y mandatory` o tasti freccia.
- **Librerie opzionali**: [Reveal.js](https://revealjs.com/) per deck interattivi; default è puro HTML/CSS senza dipendenze.
- **Browser target**: Chromium / Safari evergreen. Usa `aspect-ratio`, CSS Grid, custom properties.

---

## 3. Canvas & coordinate system

### Dimensioni canvas (16:9 widescreen)

| Unit          | Width      | Height     |
|---------------|------------|------------|
| EMU           | 12 192 000 | 6 858 000  |
| inch          | 13.333     | 7.5        |
| px @96 dpi    | 1280       | 720        |
| px @144 dpi   | 1920       | 1080       |

### Conversioni di riferimento

| From | To     | Factor                       |
|------|--------|------------------------------|
| 1"   | EMU    | 914 400                      |
| 1"   | px     | 96 (a 96 dpi)                |
| 1 pt | EMU    | 12 700                       |
| 1 pt | px     | 1.333 (a 96 dpi)             |
| 1 cm | EMU    | 360 000                      |

**Regola operativa.** La skill lavora internamente in **pollici** (più leggibili) e converte in EMU per `.pptx` e in px (o `%` rispetto al canvas) per HTML.

### Margini sicuri
- Margine standard: **0.5"** dai bordi → 5% del lato lungo, 6.7% del lato corto.
- Footer baseline: **y = 6.96"** (98% dell'altezza canvas).
- Logo bottom-left baseline: **x = 0.49", y = 6.87"**.

---

## 4. Color system

### Palette principale

| Token              | Hex       | RGB              | Uso semantico                                             |
|--------------------|-----------|------------------|-----------------------------------------------------------|
| `purple-700`       | `#702FFF` | `112, 47, 255`   | Gradient stop 0%, accent `+`, highlight                   |
| `purple-500`       | `#8134FF` | `129, 52, 255`   | Gradient stop 84%                                         |
| `purple-300`       | `#A33EFF` | `163, 62, 255`   | Gradient stop 100%                                        |
| `charcoal`         | `#07010A` | `7, 1, 10`       | Testo su sfondo chiaro, sfondi dark, footer text          |
| `white`            | `#FFFFFF` | `255, 255, 255`  | Sfondo standard, testo su sfondo dark/viola               |
| `white-50` (alpha) | `rgba(255,255,255,0.5)` | —  | Decorazioni leggere (raro)                                |
| `black-50` (alpha) | `rgba(0,0,0,0.5)`       | —  | Overlay su immagini full-bleed per leggibilità testo      |

### Gradient firma — il marchio visivo

Tre stop, direzione verticale dall'alto verso il basso.

**PPTX (XML)**:
```xml
<a:gradFill rotWithShape="1">
  <a:gsLst>
    <a:gs pos="0">     <a:srgbClr val="702FFF"/></a:gs>
    <a:gs pos="84000"> <a:srgbClr val="8134FF"/></a:gs>
    <a:gs pos="100000"><a:srgbClr val="A33EFF"/></a:gs>
  </a:gsLst>
  <a:lin ang="2700000" scaled="0"/>
</a:gradFill>
```
> Nota: l'attributo `ang` è espresso in 60000-esimi di grado. Il valore `2700000` è quello presente nel master originale; produce visivamente un gradient verticale top→bottom così come renderizzato in PowerPoint. Se la skill genera un nuovo `.pptx` da zero e l'orientamento risulta diverso, usare `ang="5400000"` (90°) come fallback per garantire il top-to-bottom.

**HTML/CSS**:
```css
background: linear-gradient(180deg, #702FFF 0%, #8134FF 84%, #A33EFF 100%);
```

### Custom properties pronte (HTML)

```css
:root {
  --as-purple-700: #702FFF;
  --as-purple-500: #8134FF;
  --as-purple-300: #A33EFF;
  --as-charcoal:   #07010A;
  --as-white:      #FFFFFF;
  --as-overlay-dark: rgba(0, 0, 0, 0.5);

  --as-gradient-signature: linear-gradient(
    180deg,
    var(--as-purple-700) 0%,
    var(--as-purple-500) 84%,
    var(--as-purple-300) 100%
  );
}
```

### Color scheme PPTX (snippet `theme1.xml`)

Da iniettare in `ppt/theme/theme1.xml` quando si crea un nuovo `.pptx`:

```xml
<a:clrScheme name="AccentureSong">
  <a:dk1><a:srgbClr val="07010A"/></a:dk1>
  <a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
  <a:dk2><a:srgbClr val="07010A"/></a:dk2>
  <a:lt2><a:srgbClr val="FFFFFF"/></a:lt2>
  <a:accent1><a:srgbClr val="702FFF"/></a:accent1>
  <a:accent2><a:srgbClr val="8134FF"/></a:accent2>
  <a:accent3><a:srgbClr val="A33EFF"/></a:accent3>
  <a:accent4><a:srgbClr val="07010A"/></a:accent4>
  <a:accent5><a:srgbClr val="FFFFFF"/></a:accent5>
  <a:accent6><a:srgbClr val="702FFF"/></a:accent6>
  <a:hlink><a:srgbClr val="702FFF"/></a:hlink>
  <a:folHlink><a:srgbClr val="A33EFF"/></a:folHlink>
</a:clrScheme>
```

### Regole di contrasto (WCAG AA)

| Background           | Testo consigliato | Contrast ratio |
|----------------------|-------------------|----------------|
| `#FFFFFF` white      | `#07010A`         | 20.8 : 1 ✓     |
| `#07010A` charcoal   | `#FFFFFF`         | 20.8 : 1 ✓     |
| `#702FFF` purple     | `#FFFFFF`         | 5.6 : 1  ✓     |
| `#A33EFF` purple-300 | `#FFFFFF`         | 4.0 : 1  ✓ (large text only)|
| Image + black-50 overlay | `#FFFFFF`     | varia, target ≥ 4.5 : 1 |

> **Mai** mettere testo charcoal su gradient viola: contrast ratio < 3 : 1.

---

## 5. Typography system

### Font stack

**PPTX (XML run properties)**:
```xml
<a:rPr lang="it-IT" sz="2000" b="0">
  <a:solidFill><a:srgbClr val="07010A"/></a:solidFill>
  <a:latin typeface="Graphik"/>
  <a:ea typeface="+mn-ea"/>
  <a:cs typeface="+mn-cs"/>
</a:rPr>
```
Fallback ordinato se Graphik non installato sul sistema target: **Söhne → Inter → Calibri → Arial**. Per garantire portabilità, embeddare il font in `.pptx` se la licenza lo consente (`Insert > Fonts > Embed fonts in the file` lato PowerPoint, oppure `python-pptx` non supporta nativamente l'embedding — fornire il `.pptx` con avvertenza).

**HTML/CSS**:
```css
font-family: 'Graphik', 'Söhne', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
```

### Pesi usati
- **Light 300** — sezioni decorative, sotto-titoli sussurrati (raro).
- **Regular 400** — body, descrizioni, footer.
- **Medium 500** — emphasis, sub-headings, parole chiave dentro un titolo Regular.

### Scala tipografica unificata

| Ruolo            | pt  | XML `sz` | px @96dpi | rem  | Line-height | Letter-spacing |
|------------------|-----|----------|-----------|------|-------------|----------------|
| Hero / cover     | 48  | `4800`   | 64        | 4.0  | 1.05        | -0.02em        |
| Title            | 44  | `4400`   | 58.7      | 3.67 | 1.1         | -0.015em       |
| Subtitle         | 24  | `2400`   | 32        | 2.0  | 1.2         | -0.01em        |
| Body large       | 20  | `2000`   | 26.7      | 1.67 | 1.35        | 0              |
| Body             | 18  | `1800`   | 24        | 1.5  | 1.4         | 0              |
| Chapter number   | 16  | `1600`   | 21.3      | 1.33 | 1.2         | 0              |
| Caption / footer | 8   | `800`    | 10.7      | 0.67 | 1.3         | 0.02em         |

### Pattern di mixing (Regular + Medium)

Esempio canonico dal deck: `"A suite of tools **to manage and monitor digital accessibility**, powered by a robust agentic AI engine."` — Medium sulla parte chiave, Regular intorno.

**PPTX** (due `<a:r>` nello stesso `<a:p>`):
```xml
<a:p>
  <a:r>
    <a:rPr sz="4000" b="0"><a:latin typeface="Graphik"/></a:rPr>
    <a:t>A suite of tools </a:t>
  </a:r>
  <a:r>
    <a:rPr sz="4000" b="0">
      <a:latin typeface="Graphik"/>
      <a:rPr> <!-- Graphik Medium via typeface name -->
    </a:rPr>
    <a:t>to manage and monitor digital accessibility</a:t>
  </a:r>
  <a:r>
    <a:rPr sz="4000" b="0"><a:latin typeface="Graphik"/></a:rPr>
    <a:t>, powered by a robust agentic AI engine.</a:t>
  </a:r>
</a:p>
```
> In `python-pptx`: usare `run.font.name = "Graphik Medium"` per la run "evidenziata", `"Graphik"` (Regular) per le altre.

**HTML**:
```html
<h1 class="title">
  A suite of tools
  <span class="medium">to manage and monitor digital accessibility</span>,
  powered by a robust agentic AI engine.
</h1>
```
```css
.title { font-weight: 400; }
.title .medium { font-weight: 500; }
```

### Bullet style
Carattere `•` (U+2022), indent 1em, colore eredita dal testo.

**PPTX**:
```xml
<a:pPr indent="-228600" marL="228600">
  <a:buChar char="•"/>
</a:pPr>
```

**HTML**:
```css
ul.slide-list { list-style: '• '; padding-left: 1em; }
ul.slide-list li { padding-left: 0.25em; }
```

---

## 6. Layout archetipi (9)

Convenzioni:
- Le posizioni sono espresse in **pollici** (autoritative); la conversione EMU = pollici × 914 400 e px @96dpi = pollici × 96.
- Ogni layout PPTX è uno `<p:sldLayout>` salvato in `ppt/slideLayouts/`.
- In HTML, ogni archetipo ha la classe `.slide.slide--<archetype>`.

### 6.1 Cover — `slide--cover`

**Quando.** Prima slide del deck. La copertina canonica del master ha **gradient viola firma full-bleed** (NON un'immagine fotografica), una **decorazione 3D petali viola** in alto a destra (vedi § 12.1), un **logo prodotto** centrale (es. `aida` — vedi § 7.10), un **eyebrow data** in alto a sinistra, e il **wordmark "Accenture Song"** in basso a sinistra (NON il chevron `>`, riservato alle slide content).

**Variante alternativa.** Cover con immagine full-bleed (foto) — usata raramente. Mantiene comunque eyebrow + hero text. Vedi sezione "Variante immagine" sotto.

**Wireframe (variante canonica con gradient + petali)**:
```
╔═════════════════════════════════════════════╗
║ 25th of March 2026                  [petali ║
║                                      3D     ║
║   ◉  aida    ← logo prodotto       viola ▒]║
║                                              ║
║   Reinventing Accessibility   ← hero 48pt   ║
║                                             ║
║                                             ║
║                                             ║
║ Accenture Song      © 2026 Accenture. All…  ║
╚═════════════════════════════════════════════╝
   ↑ background: var(--as-gradient-signature)
```

**Placeholder PPTX (variante canonica)**:

| Nome              | x (")  | y (")  | w (")  | h (")  | Font        | Size | Color     |
|-------------------|--------|--------|--------|--------|-------------|------|-----------|
| eyebrow date      | 0.5    | 0.5    | 4.0    | 0.4    | Graphik     | 14pt | `#FFFFFF` |
| product logo      | 0.5    | 2.5    | 3.5    | 1.2    | —           | —    | bianco    |
| hero title        | 0.5    | 3.7    | 9.5    | 2.5    | Graphik Med.| 48pt | `#FFFFFF` |
| 3D petali deco    | 7.0    | -0.5   | 7.5    | 6.5    | —           | —    | PNG/SVG   |
| wordmark Accenture| 0.49   | 6.87   | 2.5    | 0.32   | —           | —    | white     |
| footer copy       | 9.07   | 6.96   | 3.5    | 0.14   | Graphik     | 8pt  | `#FFFFFF` |

**Placeholder PPTX (variante immagine full-bleed)**: come sopra ma `bg image` (`x=0, y=0, w=13.33, h=7.5`) sostituisce gradient + petali, e l'overlay è opzionale al 30%.

**HTML scaffold (variante canonica)**:
```html
<section class="slide slide--cover">
  <span class="eyebrow">25th of March 2026</span>
  <div class="product-logo">
    <svg class="product-mark"><!-- es. aida circle mark --></svg>
    <span class="product-wordmark">aida</span>
  </div>
  <h1 class="hero">Reinventing Accessibility</h1>
  <img class="deco-petals" src="petals-3d.png" alt="" aria-hidden="true">
  <div class="brand-wordmark">Accenture <span class="song-mark">Song</span></div>
  <span class="footer-copy">Copyright © 2026 Accenture. All rights reserved.</span>
</section>
```
```css
.slide--cover { background: var(--as-gradient-signature); color: var(--as-white); }
.deco-petals { position: absolute; top: -5%; right: -5%; width: 55%; height: auto; pointer-events: none; }
.product-logo { display: flex; align-items: center; gap: 1rem; font-size: 4rem; }
.product-mark { width: 4rem; height: 4rem; fill: var(--as-white); }
.brand-wordmark { position: absolute; bottom: 4%; left: 4%; font-size: 0.9rem; }
.brand-wordmark .song-mark { color: var(--as-purple-300); font-weight: 500; }
```

---

### 6.2 Section divider — bianco — `slide--section-white`

**Quando.** Apertura di un capitolo su sfondo neutro, con header progressivo `01`, `02`...

**Wireframe**:
```
┌─────────────────────────────────────────────┐
│ NOME CAPITOLO                               │
│ 02                                          │
│                                             │
│                                             │
│      Titolo del capitolo,                   │
│      Regular + Medium               ← 44pt  │
│                                             │
│                                             │
│ [logo]              © 2026 ...        12/40 │
└─────────────────────────────────────────────┘
```

**Placeholder PPTX**:

| Nome           | x (")  | y (")  | w (")  | h (")  | Font        | Size | Color     |
|----------------|--------|--------|--------|--------|-------------|------|-----------|
| chapter name   | 0.51   | 0.5    | 4.0    | 0.3    | Graphik     | 8pt  | `#07010A` (UPPERCASE) |
| chapter number | 0.51   | 0.85   | 4.0    | 0.5    | Graphik Med.| 16pt | `#07010A` |
| title          | 0.5    | 2.8    | 9.0    | 2.5    | Graphik     | 44pt | `#07010A` |
| logo           | 0.49   | 6.87   | 1.0    | 0.32   | —           | —    | black     |
| footer copy    | 9.07   | 6.96   | 3.0    | 0.14   | Graphik     | 8pt  | `#07010A` |
| slide number   | 12.5   | 6.96   | 0.5    | 0.14   | Graphik     | 8pt  | `#07010A` |

**HTML**:
```html
<section class="slide slide--section-white">
  <span class="chapter-name">CAPITOLO</span>
  <span class="chapter-number">02</span>
  <h2 class="title">Titolo del capitolo, <span class="medium">parole chiave</span></h2>
  <img class="logo logo--black" src="logo-black.svg" alt="Accenture">
  <footer><span>Copyright © 2026 Accenture. All rights reserved.</span><span>12 / 40</span></footer>
</section>
```

---

### 6.3 Section divider — viola gradient — `slide--section-purple`

**Quando.** Apertura di un capitolo "key moment", uso del gradient firma. Il momento più riconoscibile del deck.

**Wireframe**:
```
╔═════════════════════════════════════════════╗
║ NOME CAPITOLO         (testo bianco)        ║
║ 02                                          ║
║                                             ║
║      Titolo del capitolo,                   ║
║      Regular + Medium                       ║
║                                             ║
║ [logo bianco]       © 2026 Accenture  12/40 ║
╚═════════════════════════════════════════════╝
   ↑ background: gradient firma 180deg
```

**Differenze rispetto a 6.2**:
- Background: `--as-gradient-signature` invece di `#FFFFFF`.
- Tutti i testi: `#FFFFFF` invece di `#07010A`.
- Logo: variante white.

**PPTX**: stesso layout di 6.2 ma `<p:bg>` con il `<a:gradFill>` di sezione 4.

**HTML**:
```html
<section class="slide slide--section-purple">
  <!-- stessi children di 6.2, con classe .text--white -->
</section>
```
```css
.slide--section-purple { background: var(--as-gradient-signature); color: var(--as-white); }
```

---

### 6.4 Content — bianco con header — `slide--content-white`

**Quando.** Slide di contenuto standard: titolo + corpo + eventuale immagine o griglia di logo.

**Wireframe**:
```
┌─────────────────────────────────────────────┐
│ NOME CAPITOLO                            02 │
│ ─────────────────────────────────────────── │
│                                             │
│ Titolo della slide   ← 24pt subtitle        │
│                                             │
│ Body copy regular + medium mixed.           │
│ Più paragrafi se necessari.        ← 18pt   │
│                                             │
│ [   img  ]  +  [   img  ]  +  [   img  ]    │
│                                             │
│ [logo]              © 2026 ...        12/40 │
└─────────────────────────────────────────────┘
```

**Placeholder PPTX**:

| Nome           | x (")  | y (")  | w (")  | h (")  | Font        | Size | Color     |
|----------------|--------|--------|--------|--------|-------------|------|-----------|
| chapter name   | 0.51   | 0.5    | 4.0    | 0.3    | Graphik     | 8pt  | `#07010A` |
| slide title    | 0.5    | 1.2    | 9.0    | 0.7    | Graphik Med.| 24pt | `#07010A` |
| body           | 0.5    | 2.1    | 9.5    | 2.5    | Graphik     | 18pt | `#07010A` |
| content area   | 0.5    | 4.7    | 12.33  | 1.8    | —           | —    | —         |
| logo+footer    | come 6.2                                                     |

---

### 6.5 Content — bianco con immagine full-bleed — `slide--content-image`

**Quando.** Slide concettuale con immagine di sfondo a tutta pagina e overlay alpha 50% per leggibilità.

**Wireframe**:
```
┌─────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░ [full-bleed image, 50% black overlay] ░░ │
│ ░░                                       ░░ │
│ ░░         A suite of tools              ░░ │
│ ░░         to manage and monitor         ░░ │
│ ░░         digital accessibility,        ░░ │
│ ░░         powered by AI.        ← 40pt  ░░ │
│ ░░                                       ░░ │
│ ░░ [logo]    © 2026 ...           12/40 ░░ │
└─────────────────────────────────────────────┘
```

**PPTX (background)**:
```xml
<p:bg>
  <p:bgPr>
    <a:blipFill>
      <a:blip r:embed="rId1"><a:alphaModFix amt="50000"/></a:blip>
      <a:stretch><a:fillRect/></a:stretch>
    </a:blipFill>
  </p:bgPr>
</p:bg>
```
> `amt="50000"` = 50% alpha (scala è in 1000-esimi di percentuale, max 100000).

**HTML**:
```css
.slide--content-image {
  background-image: url('hero.jpg');
  background-size: cover;
  background-position: center;
  position: relative;
  color: var(--as-white);
}
.slide--content-image::after {
  content: '';
  position: absolute; inset: 0;
  background: var(--as-overlay-dark);
  z-index: 0;
}
.slide--content-image > * { position: relative; z-index: 1; }
```

---

### 6.6 Dark atmospheric — `slide--dark`

**Quando.** Slide drammatica o "key visual" con sfondo charcoal e immagine ambientale offset/croppata.

**Wireframe**:
```
┌─────────────────────────────────────────────┐
│ ████████████████████████████████████████████│
│ ██ Charcoal #07010A                       ██│
│ ██                                        ██│
│ ██  Headline impattante         [crop ░░] ██│
│ ██  in white.        ← 44pt     [image  ] ██│
│ ██                              [offset ] ██│
│ ██  Body copy bianco se serve.            ██│
│ ██                                        ██│
│ ██ [logo wht]        © 2026 ...     12/40 ██│
└─────────────────────────────────────────────┘
```

**Specifiche**:
- Background: `#07010A` solido.
- Eventuale immagine decorativa posizionata con offset negativo (es. `x = 3.84"`, `y = -1.0"`, ruotata 19° opzionale).
- Tutti i testi: `#FFFFFF`.
- Logo: variante white.

---

### 6.7 Quote / narrative — `slide--quote`

**Quando.** Apertura testimonianza, cliente, vision statement; immagine ruotata ~19° come elemento decorativo.

**Wireframe**:
```
┌─────────────────────────────────────────────┐
│                              ╔════════════╗ │
│   "Lorem ipsum dolor sit     ║   img      ║ │
│    amet, the quote.          ║  rotated   ║ │
│    Multiple lines            ║  19.46°    ║ │
│    possibili."        ← 32pt ║            ║ │
│                              ║            ║ │
│   — Author Name               ╚════════════╝│
│     Role                                    │
│                                             │
│ [logo]              © 2026 ...        12/40 │
└─────────────────────────────────────────────┘
```

**PPTX**:
- Immagine: `rot="19464994"` (19.46° in 60000-esimi), posizionata a destra (`x ≈ 7.5"`, `y ≈ -4.2"`, dimensione 6.83" × 6.79").
- Testo: charcoal, 32pt, allineato a sinistra, max 60% larghezza canvas.

**HTML**:
```html
<section class="slide slide--quote">
  <blockquote class="quote">
    "Lorem ipsum dolor sit amet, <span class="medium">the quote</span>."
    <cite>— Author Name<br><span class="role">Role</span></cite>
  </blockquote>
  <img class="quote-image" src="hero.jpg" alt="">
</section>
```
```css
.slide--quote .quote-image {
  position: absolute; right: -2rem; top: -2rem;
  width: 47%; aspect-ratio: 1;
  transform: rotate(19.46deg);
  object-fit: cover;
}
```

---

### 6.8 Logo grid / "+" composition — `slide--logo-grid`

**Quando.** Mostrare un set di tool/partner/prodotti, separati dal `+` viola.

**Wireframe**:
```
┌─────────────────────────────────────────────┐
│ Titolo della suite               ← 24pt     │
│                                             │
│                                             │
│  [logo A]   ✚   [logo B]   ✚   [logo C]    │
│            ↑                                │
│            #702FFF, 40pt, Graphik           │
│                                             │
│  [caption]      [caption]      [caption]    │
│                                             │
│ [logo Acc.]         © 2026 ...        12/40 │
└─────────────────────────────────────────────┘
```

**Specifiche del `+`**:
- Carattere `+`, font Graphik Medium, **40pt**, colore `#702FFF`.
- Posizionato esattamente a metà tra due celle della griglia.
- In CSS: usare un pseudo-elemento o un `<span aria-hidden="true">+</span>` separatore.

**HTML**:
```html
<div class="logo-grid">
  <figure><img src="a.svg" alt="A"><figcaption>A</figcaption></figure>
  <span class="plus" aria-hidden="true">+</span>
  <figure><img src="b.svg" alt="B"><figcaption>B</figcaption></figure>
  <span class="plus" aria-hidden="true">+</span>
  <figure><img src="c.svg" alt="C"><figcaption>C</figcaption></figure>
</div>
```
```css
.logo-grid { display: flex; align-items: center; gap: 2rem; justify-content: center; }
.logo-grid .plus { font-family: 'Graphik', sans-serif; font-weight: 500; font-size: 40pt; color: var(--as-purple-700); line-height: 1; }
```

---

### 6.9 Closing / contact — `slide--closing`

**Quando.** Ultima slide del deck, contatti del relatore.

**Wireframe**:
```
┌─────────────────────────────────────────────┐
│                                             │
│  ╭───────────╮     Fabrizio Lo Presti       │
│  │  profile  │     ← 24pt Medium            │
│  │   image   │                              │
│  │ rounded   │     Experience Director      │
│  │ 24px rad. │     ← 20pt Regular           │
│  ╰───────────╯                              │
│                    Accenture SONG           │
│                    Design & Digital Products│
│                                             │
│ [logo]              © 2026 ...        12/40 │
└─────────────────────────────────────────────┘
```

**Specifiche**:
- Profile image: square, border-radius 24px, posizionata a sinistra (`x ≈ 1"`, `y ≈ 2.5"`, dim. 3" × 3").
- Stack contatti a destra: Nome (24pt Medium), Ruolo (20pt Regular), Org (20pt Regular), Dept (20pt Regular), tutti charcoal su bianco.

---

## 7. Componenti ricorrenti

Ogni componente è documentato in entrambi i formati con specs dimensionali esatti.

### 7.1 Footer (copyright + slide number)

**Testo**: `Copyright © 2026 Accenture. All rights reserved.` (aggiornare l'anno alla data corrente).

**Posizione PPTX**:
- Copyright: x=9.07", y=6.96", w=3.0", h=0.14".
- Slide number: x=12.5", y=6.96", w=0.5", h=0.14", allineato a destra.
- Font: Graphik Regular **8pt** (`sz="800"`).
- Colore: `#07010A` su sfondo chiaro, `#FFFFFF` su sfondo dark/viola.

**HTML**:
```html
<footer class="slide-footer">
  <span class="copyright">Copyright © 2026 Accenture. All rights reserved.</span>
  <span class="slide-number">12 / 40</span>
</footer>
```
```css
.slide-footer {
  position: absolute; bottom: 2%; left: 0; right: 4%;
  display: flex; justify-content: space-between;
  font-size: 8pt; font-weight: 400;
  padding-left: 68%;
}
```

### 7.2 Logo Accenture — due varianti distinte

Il master usa **due lockup distinti**, non intercambiabili:

#### 7.2a Wordmark "Accenture Song" (solo cover)
- Forma: `Accenture` (Regular) + `Song` (Medium, accent purple `#A33EFF`).
- Posizione: bottom-left, x=0.49", y=6.87", w≈2.5", h≈0.32".
- Usato **solo sulla slide cover** (e closing opzionale).
- File: `assets/logo/full_color/Acc_Song_SvcMrk_*.svg` (full color con Song in viola) o variante white solid su gradient/dark.

#### 7.2b Symbol mark `>` (chevron, tutte le altre slide)
- Forma: il glyph "greater-than" stilizzato di Accenture, standalone (NO wordmark).
- Posizione: bottom-left, x=0.49", y=6.87", w≈0.45", h≈0.32".
- Colore: **`#702FFF`** (purple-700) su sfondi chiari/dark; bianco solid su gradient viola.
- Usato su **tutte le slide content, section, table, dark, quote, logo-grid, closing**.
- File: SVG inline (vedi snippet sotto) oppure `assets/logo/symbol/chevron-purple.svg`.

```html
<!-- Symbol mark inline (riusabile come componente) -->
<svg class="logo-symbol" viewBox="0 0 24 24" aria-label="Accenture">
  <path d="M2 4 L18 12 L2 20 Z" fill="#702FFF"/>
</svg>
```
```css
.logo-symbol { position: absolute; bottom: 4%; left: 4%; width: 2.5%; height: auto; }
.slide--section-purple .logo-symbol path,
.slide--cover .logo-symbol path { fill: var(--as-white); }
```

> **Mai distorcere. Mai colorare in tinte diverse da `#702FFF` o bianco.** Nessuna variante "fade", "outline", "gradient".

### 7.3 Plus accent (`+`)
- Carattere: `+`.
- Font: Graphik Medium **40pt** (`sz="4000"`).
- Colore: `#702FFF` (sempre, anche su sfondi viola — usa charcoal o bianco in quel caso).
- Uso: separatore tra logo, prodotti, idee. **Non** decorativo random.

### 7.4 Header capitolo
- Layout sopra-sotto: `nome capitolo` (8pt UPPERCASE) sopra `numero` (16pt).
- Posizione: x=0.51", y=0.5", larghezza 4".
- Sempre in alto a sinistra.
- Numerazione con padding zero: `01`, `02`, ... `09`, `10`.

### 7.5 Image overlay
- Alpha: 50% black (`rgba(0,0,0,0.5)` / `<a:alphaModFix amt="50000"/>`).
- Solo su immagini full-bleed con testo sopra.
- Su immagini decorative non full-bleed: nessun overlay.

### 7.6 Tabella comparativa

Tabella minimale, no zebra, no bordi pesanti. Pattern visto nel master per benchmark prodotti / feature matrix.

**Anatomia**:
- **Header row**: nome colonna in Graphik Medium 14pt, accompagnato da un piccolo **logo prodotto inline** (es. `◉ aida`, `◇ deque`, `○ Siteimprove`). Charcoal su bianco.
- **Linea separatrice spessa** (1pt charcoal) sotto la riga header.
- **Righe dati**: prima colonna = etichetta feature in Graphik Regular 14pt charcoal, allineata a sinistra. Colonne successive = icona di stato:
  - **Check positivo**: cerchio outline `#702FFF`, dentro un check `#702FFF`. Dimensione ~0.35".
  - **X negativo**: cerchio outline charcoal, dentro X charcoal (o grigio medio `#818180`).
  - **Annotazione**: testo tra parentesi 12pt grigio (es. `(text-based guides)`).
- **Linee separatrici riga**: 0.25pt grigio chiaro `#CFCFCF` sotto ogni riga (eccetto l'ultima).
- **Mini bandiere/flag emoji** accettate per markup geografico inline (es. `🇮🇹` per IT-specific).

**Posizione canonica**: x=0.5", y=2.5", w=12.33", h=4". Header capitolo sopra (vedi 7.4) + titolo paragrafo sopra la tabella.

**HTML**:
```html
<table class="data-table">
  <thead>
    <tr>
      <th></th>
      <th><span class="prod-mark">◉</span> aida</th>
      <th><span class="prod-mark">◇</span> deque</th>
      <th><span class="prod-mark">○</span> Siteimprove</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>AI-powered testing</td>
      <td><span class="status status--yes">✓</span></td>
      <td><span class="status status--no">✗</span></td>
      <td><span class="status status--no">✗</span></td>
    </tr>
    <!-- ... -->
  </tbody>
</table>
```
```css
.data-table { width: 100%; border-collapse: collapse; font-size: 1rem; }
.data-table thead th { text-align: left; padding: 1rem 0.75rem; font-weight: 500; border-bottom: 1.5px solid var(--as-charcoal); }
.data-table tbody td { padding: 1rem 0.75rem; border-bottom: 0.5px solid #CFCFCF; }
.data-table tbody tr:last-child td { border-bottom: none; }
.status { display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 50%; border: 1.5px solid currentColor; font-size: 0.8rem; }
.status--yes { color: var(--as-purple-700); }
.status--no  { color: #818180; }
```

**PPTX**:
- Usare `python-pptx`'s `slide.shapes.add_table(rows, cols, left, top, width, height)`.
- Iterare sulle celle: `cell.fill.solid(); cell.fill.fore_color.rgb = ...` per disabilitare fill default.
- Bordi default rimossi via lxml: `tcPr/tcBorders` con `<a:lnL><a:noFill/></a:lnL>` ecc.
- Per le icone status: usare un text run con simbolo `✓`/`✗` colorato + cerchio drawn come shape `MSO_SHAPE.OVAL` outline-only attorno.

### 7.7 Multi-column layout (3 colonne con divisori)

Pattern di "comparative outlook" su sfondo dark. 3 colonne separate da **divisori verticali sottili**.

**Anatomia**:
- Background: charcoal `#07010A` solido **oppure** charcoal con gradient viola sfumato in zona destra (mezzo gradient, da `#07010A` left a `#702FFF` low-alpha right).
- Sopra-titolo capitolo (vedi 7.4) in alto a sinistra, charcoal/bianco a seconda del bg.
- Sottotitolo con underline viola (vedi 7.8): es. `Future outlook ◉ aida`.
- 3 colonne, larghezza eguale (~3.6" cad. con gap 0.4"), separate da linee verticali 0.5pt `rgba(255,255,255,0.2)`.
- Per colonna:
  - **Titolo colonna** Graphik Medium 36pt bianco.
  - **Icona o body** sotto (es. icona freccia in box quadrato outline 0.5pt bianco; o lista bullet; o lista voci formato `ISO 9001 - Quality`).
- `+` viola separatore opzionale tra le colonne (alternativa al divisore lineare).

**Posizione canonica**: x=0.5", y=1.8", w=12.33", h=4.8".

**HTML**:
```html
<section class="slide slide--multi-column">
  <div class="chapter-header light"><span class="chapter-number">01</span><span class="chapter-name">GENAI ACCESSIBILITY SUITE</span></div>
  <p class="subtitle medium underline-purple">Future outlook ◉ aida</p>
  <div class="three-cols">
    <div class="col">
      <h3 class="col-title">Technical<br>Scalability</h3>
      <div class="icon-box"><svg><!-- arrow up-right --></svg></div>
    </div>
    <div class="col">
      <h3 class="col-title">Expansion of<br>AIDA's skills</h3>
      <p>E-commerce Conversion Rate Optimization Assessment</p>
      <p>Brand Guidelines Assessment and Communication</p>
    </div>
    <div class="col">
      <h3 class="col-title">Certifications</h3>
      <p><strong>ISO 9001</strong> Quality</p>
      <p><strong>ISO 27001</strong> Data Security</p>
      <p><strong>ISO 27701</strong> Privacy</p>
    </div>
  </div>
</section>
```
```css
.slide--multi-column { background: var(--as-charcoal); color: var(--as-white); }
.three-cols { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0; margin-top: 8%; }
.three-cols .col { padding: 0 2rem; border-right: 0.5px solid rgba(255,255,255,0.2); }
.three-cols .col:last-child { border-right: none; }
.col-title { font-size: 2.5rem; font-weight: 500; margin-bottom: 2rem; line-height: 1.05; }
.icon-box { width: 5rem; height: 5rem; border: 0.5px solid var(--as-white); display: flex; align-items: center; justify-content: center; }
```

### 7.8 Underline emphasis (sottolineatura viola)

Stile alternativo al Medium 500 per evidenziare parole chiave inline. Usato per `term tecnici`, `nomi di prodotto`, `link impliciti`.

**Aspetto**:
- Sottolineatura color `#702FFF`, spessore 1.5px, offset 2-3px sotto il testo (in CSS `text-underline-offset: 0.2em`).
- Colore del testo invariato (charcoal o bianco a seconda del bg).
- **Mai** combinare con Medium 500 sulla stessa parola (sarebbe ridondante).

**HTML**:
```html
<p>AIDA is trained on our team's <span class="u-emph">expertis</span> and hands-on experience.</p>
```
```css
.u-emph {
  text-decoration: underline;
  text-decoration-color: var(--as-purple-700);
  text-decoration-thickness: 1.5px;
  text-underline-offset: 0.2em;
}
```

**PPTX**:
- Run con `<a:rPr u="sng">` (single underline) e `<a:uFill><a:solidFill><a:srgbClr val="702FFF"/></a:solidFill></a:uFill>`.
- In `python-pptx`: `run.font.underline = True` (non espone direttamente il colore underline; iniettare via lxml).

### 7.9 Logo prodotto inline (es. `aida`, `camera`)

Il master usa "logo prodotto" composti da un **mark grafico minimale** (cerchio, anello, geometria semplice) + **wordmark lowercase**. Esempi visti: `aida` (cerchio bianco con simbolo dentro), `camera` (anello).

**Composizione**:
- Mark: SVG vettoriale, dimensione 1.5× del cap height del wordmark.
- Wordmark: Graphik Regular o Medium, dimensione variabile (24pt inline, 48pt sulla cover, 14pt nelle table header).
- Spaziatura mark↔wordmark: 0.4em.
- Colore: bianco su gradient/dark, charcoal su bianco.

**Pattern composizione `+`**:
Il master usa frequentemente combinazioni `<logo prodotto A> + <logo prodotto B>` separate dal `+` viola, per indicare integrazione/synergy.

```html
<div class="prod-pair">
  <span class="prod"><svg class="prod-mark">…</svg> aida</span>
  <span class="plus">+</span>
  <span class="prod"><svg class="prod-mark">…</svg> camera</span>
</div>
```

### 7.10 Riepilogo: combinazione decorazioni 3D + componenti

Sui content slide tipici (es. screenshot 2 e 5):
- **Header capitolo top-left** (7.4)
- **Decorazione 3D forma liquida acciaio top-right** (vedi § 12.2)
- **Body/tabella/colonne al centro**
- **Symbol chevron `>`** bottom-left (7.2b)
- **Footer copyright + slide number** bottom-right (7.1)

Sulla cover (screenshot 1):
- **Eyebrow data top-left**
- **Decorazione 3D petali viola top-right** (vedi § 12.1)
- **Logo prodotto centrale** (7.9)
- **Hero title centrale** sotto il logo prodotto
- **Wordmark "Accenture Song"** bottom-left (7.2a, NO chevron)
- **Footer copyright** bottom-right

---

## 8. Imagery & media guidelines

### Stile visivo
- **Architettonico**: linee geometriche, simmetrie urbane.
- **Concettuale**: astratto-evocativo, no stock cliché.
- **Fabric / texture**: tessuti colorati, dettagli ravvicinati.
- **Atmosferico**: light & shadow, mood dark.

### Trattamenti
- Full-bleed con overlay alpha 50% per slide content.
- Ruotate ~19° (`rot="19464994"` / `transform: rotate(19.46deg)`) per slide quote/narrative.
- Crop offset per slide dark atmospheric.
- Rounded corners ~24px (≈ 422pt nel master) per profile picture e card.

### Specifiche tecniche
- Risoluzione minima: **1920 × 1080** (per evitare upscale).
- Formato: JPG (foto), PNG (logo, illustrazioni con trasparenza), SVG (logo Accenture e icone).
- Color profile: sRGB.
- Peso ottimale per HTML: < 300 KB per slide.

---

## 9. Tone of voice & content patterns

### Lingua
- **Bilingue tollerato**: IT/EN possono coesistere nello stesso deck (riflette audience europea/internazionale).
- Mai mescolare lingue dentro la stessa frase, se non per termini tecnici universali (`AI engine`, `agentic`, `framework`).

### Headline pattern
- **Lunghezza**: 4–12 parole.
- **Struttura**: Regular + Medium per gerarchia interna.
- **Tono**: assertivo, propositivo, avoid jargon.
- Esempi dal deck: `"Reinventing Accessibility"`, `"A suite of tools to manage and monitor digital accessibility"`.

### Body pattern
- Una idea per slide.
- Frasi medie: 8–18 parole.
- Bullet solo quando la lista è genuinamente parallela (≥ 3 voci, stesso registro grammaticale).

### Numerazione capitoli
- Stile editoriale: `01`, `02`, `03`...
- Mai con punto: `01.` no.
- Sempre uppercase per il nome del capitolo: `BUSINESS CONTEXT`, non `Business Context`.

---

## 10. Reference scaffold completi

### 10.1 PPTX scaffold (Python + python-pptx)

```python
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.oxml.ns import qn
from lxml import etree

# --- Setup ---
prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

PURPLE_700 = RGBColor(0x70, 0x2F, 0xFF)
PURPLE_500 = RGBColor(0x81, 0x34, 0xFF)
PURPLE_300 = RGBColor(0xA3, 0x3E, 0xFF)
CHARCOAL   = RGBColor(0x07, 0x01, 0x0A)
WHITE      = RGBColor(0xFF, 0xFF, 0xFF)

# --- Helper: gradient fill via lxml (python-pptx non lo espone) ---
def apply_signature_gradient(shape):
    sppr = shape.fill._xPr.spPr if hasattr(shape.fill, '_xPr') else shape._element.spPr
    # Rimuovi fill esistente
    for tag in ('a:solidFill', 'a:gradFill', 'a:blipFill', 'a:pattFill', 'a:noFill'):
        for el in sppr.findall(qn(tag)):
            sppr.remove(el)
    grad = etree.SubElement(sppr, qn('a:gradFill'), {'rotWithShape': '1'})
    gs_lst = etree.SubElement(grad, qn('a:gsLst'))
    for pos, color in [(0, '702FFF'), (84000, '8134FF'), (100000, 'A33EFF')]:
        gs = etree.SubElement(gs_lst, qn('a:gs'), {'pos': str(pos)})
        srgb = etree.SubElement(gs, qn('a:srgbClr'), {'val': color})
    etree.SubElement(grad, qn('a:lin'), {'ang': '5400000', 'scaled': '0'})

# --- Cover slide ---
slide = prs.slides.add_slide(prs.slide_layouts[6])  # blank
# (qui inserire bg image, hero text, footer ecc.)

# --- Section divider viola ---
slide = prs.slides.add_slide(prs.slide_layouts[6])
bg_shape = slide.shapes.add_shape(1, 0, 0, prs.slide_width, prs.slide_height)
apply_signature_gradient(bg_shape)
# (testo header capitolo, titolo, footer ecc.)

prs.save('output.pptx')
```

### 10.2 HTML scaffold

```html
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Deck</title>
  <style>
    @font-face {
      font-family: 'Graphik';
      src: url('fonts/Graphik-Regular.woff2') format('woff2');
      font-weight: 400; font-style: normal; font-display: swap;
    }
    @font-face {
      font-family: 'Graphik';
      src: url('fonts/Graphik-Medium.woff2') format('woff2');
      font-weight: 500; font-style: normal; font-display: swap;
    }

    :root {
      --as-purple-700: #702FFF;
      --as-purple-500: #8134FF;
      --as-purple-300: #A33EFF;
      --as-charcoal:   #07010A;
      --as-white:      #FFFFFF;
      --as-overlay-dark: rgba(0, 0, 0, 0.5);
      --as-gradient-signature: linear-gradient(180deg, var(--as-purple-700) 0%, var(--as-purple-500) 84%, var(--as-purple-300) 100%);
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      font-family: 'Graphik', 'Söhne', 'Inter', system-ui, -apple-system, sans-serif;
      font-weight: 400;
      color: var(--as-charcoal);
      background: #000;
      scroll-snap-type: y mandatory;
      overflow-y: scroll;
      height: 100vh;
    }

    .slide {
      position: relative;
      width: 100vw;
      aspect-ratio: 16 / 9;
      max-height: 100vh;
      padding: 4%;
      scroll-snap-align: start;
      overflow: hidden;
    }

    /* ARCHETIPI */
    .slide--cover           { background: var(--as-charcoal); color: var(--as-white); }
    .slide--section-white   { background: var(--as-white);    color: var(--as-charcoal); }
    .slide--section-purple  { background: var(--as-gradient-signature); color: var(--as-white); }
    .slide--content-white   { background: var(--as-white);    color: var(--as-charcoal); }
    .slide--dark            { background: var(--as-charcoal); color: var(--as-white); }

    /* TIPOGRAFIA */
    .hero      { font-size: 4rem;   font-weight: 500; line-height: 1.05; letter-spacing: -0.02em; }
    .title     { font-size: 3.67rem;font-weight: 400; line-height: 1.1;  letter-spacing: -0.015em; }
    .subtitle  { font-size: 2rem;   font-weight: 500; line-height: 1.2; }
    .body      { font-size: 1.5rem; font-weight: 400; line-height: 1.4; }
    .caption   { font-size: 1.33rem;font-weight: 400; }
    .medium    { font-weight: 500; }

    /* COMPONENTI */
    .slide-footer {
      position: absolute; bottom: 2%; left: 4%; right: 4%;
      display: flex; justify-content: flex-end; gap: 2rem;
      font-size: 8pt;
    }
    .logo {
      position: absolute; bottom: 2%; left: 4%;
      width: 7.5%; height: auto;
    }
    .plus {
      font-weight: 500; font-size: 40pt; line-height: 1;
      color: var(--as-purple-700);
    }
    .chapter-name   { display: block; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.02em; }
    .chapter-number { display: block; font-size: 16pt; font-weight: 500; }
  </style>
</head>
<body>

  <section class="slide slide--cover">
    <span class="caption">2026 / 2</span>
    <h1 class="hero">Reinventing<br>Accessibility</h1>
    <img class="logo" src="logo-white.svg" alt="Accenture">
    <footer class="slide-footer"><span>Copyright © 2026 Accenture. All rights reserved.</span></footer>
  </section>

  <section class="slide slide--section-purple">
    <span class="chapter-name">CHAPTER</span>
    <span class="chapter-number">01</span>
    <h2 class="title">Reinventing accessibility, <span class="medium">one tool at a time</span>.</h2>
    <img class="logo" src="logo-white.svg" alt="Accenture">
    <footer class="slide-footer"><span>Copyright © 2026 Accenture. All rights reserved.</span><span>2 / 40</span></footer>
  </section>

</body>
</html>
```

---

## 11. Checklist di conformità

Prima di emettere il file (sia `.pptx` sia HTML), la skill deve verificare:

### Universale
- [ ] Aspect ratio 16:9 (canvas 13.333" × 7.5" / `aspect-ratio: 16/9`).
- [ ] Font Graphik dichiarato + fallback completo (Söhne, Inter, system-ui, sans-serif).
- [ ] Una idea per slide; titolo ≤ 12 parole.
- [ ] Footer (`Copyright © <YEAR> Accenture. All rights reserved.` + slide number) presente su tutte le slide tranne la cover.
- [ ] Logo Accenture in bottom-left, variante coerente con il background (white su dark/viola, black su bianco).
- [ ] Contrast ratio testo/sfondo ≥ 4.5 : 1 (AA) — ≥ 3 : 1 per testo ≥ 24pt.
- [ ] Nessun testo charcoal su gradient viola (regola hard).

### Gradient firma
- [ ] Tre stop esatti: `#702FFF` @ 0%, `#8134FF` @ 84%, `#A33EFF` @ 100%.
- [ ] Direzione verticale top→bottom (`180deg` CSS / `ang="5400000"` PPTX se ricostruito da zero).

### Output PPTX
- [ ] `presentation.xml` con `<p:sldSz cx="12192000" cy="6858000" type="screen16x9"/>`.
- [ ] `theme1.xml` valido con color scheme Accenture Song.
- [ ] Placeholder posizionati in EMU (pollici × 914 400, arrotondato a intero).
- [ ] Run typography con `<a:latin typeface="Graphik"/>` e `sz` corretto in centesimi di punto.
- [ ] Eventuali immagini full-bleed con `<a:alphaModFix amt="50000"/>` per leggibilità testo.
- [ ] Plus `+` come shape o text run, **mai** come immagine.

### Output HTML
- [ ] `<meta name="viewport">` presente.
- [ ] `@font-face` con Graphik (o fallback graceful esplicito se font non disponibile).
- [ ] Custom properties `--as-*` definite in `:root`.
- [ ] Ogni `.slide` ha `aspect-ratio: 16/9` e `scroll-snap-align: start`.
- [ ] Overlay `::after` con `rgba(0,0,0,0.5)` su slide con immagine full-bleed.
- [ ] Logo Accenture come `<img>` SVG (non background-image, per accessibilità).

### Decorazioni 3D firma (sezione 12)
- [ ] Cover ha decorazione **petali viola 3D** top-right, ruotata, larghezza ~55% canvas.
- [ ] Slide content tipiche hanno decorazione **forma liquida color acciaio** top-right, larghezza ~25-35% canvas.
- [ ] Decorazioni sono PNG con sfondo trasparente (NON jpg, NON shape vettoriali piatte).
- [ ] Decorazioni `pointer-events: none` e `aria-hidden="true"` (HTML).

### Logo simbolo `>`
- [ ] Bottom-left, `#702FFF` su sfondi chiari/dark, bianco su gradient viola.
- [ ] Dimensione ~0.45" × 0.32".
- [ ] Sostituisce il wordmark "Accenture Song" sulle slide content (il wordmark è solo cover).

### Tabelle
- [ ] Header bordo inferiore 1.5pt charcoal.
- [ ] Righe separate da 0.5pt grigio chiaro `#CFCFCF`.
- [ ] Status icone come cerchi outline (✓ purple-700, ✗ grigio).
- [ ] No zebra, no fill di cella di default.

### Underline emphasis
- [ ] Sottolineatura `#702FFF`, 1.5px, offset `0.2em`.
- [ ] Mai combinata con Medium 500 sulla stessa parola.

---

## 12. Decorazioni 3D firma

Questa sezione codifica i due elementi grafici 3D ricorrenti che danno al deck il suo carattere distintivo "premium tech". Sono **renderizzati** (PNG con trasparenza, nati da render 3D in tool tipo Cinema4D/Blender), non procedurali. La skill futura **non li genera**: deve includerli come asset binari pre-renderizzati nella cartella `assets/decorations/` e referenziarli per posizione.

### 12.1 Petali viola 3D — `decoration--petals`

**Aspetto.** Una serie di "lamelle" o "petali" 3D semicircolari sovrapposti, che si fanno strada dall'angolo top-right verso il centro come un ventaglio aperto. Ogni lamella è un volume 3D con illuminazione studio (highlight bianchi sui bordi, ombre interne più scure verso `#460073`/`#3D1F8C`). Tonalità: gradient da viola scuro (radici) a viola chiaro (estremità).

**Quando usarla.**
- **Cover slide** del deck (sempre).
- Section divider viola **molto importante** (raro, max 1-2 volte per deck).
- **Mai** su slide content, table, quote.

**Posizione & dimensione**:
- Top-right corner.
- PPTX: `x = 6.0"` to `13.33"+` (sfora oltre il canvas), `y = -0.5"` to `5.5"` (sfora sopra il canvas).
- HTML: `top: -5%; right: -5%; width: 55%; height: auto;`.
- Rotazione: nessuna (l'asset è già pre-ruotato nel render).
- z-index: dietro al titolo principale ma sopra il gradient di sfondo.

**Asset richiesti**:
- File: `assets/decorations/petals-3d-purple.png`.
- Risoluzione: ≥3000 × 2000 px (per export retina).
- Sfondo: trasparente (alpha channel).
- Peso: < 1 MB ottimizzato (TinyPNG/Squoosh).

**Fallback procedurale (se asset PNG non disponibile)**:
Stack di `border-radius: 50%` ovali ruotati con `box-shadow` viola e `filter: blur(2px)`. Approssimativo, mai pixel-perfect.

```html
<img class="deco-petals" src="assets/decorations/petals-3d-purple.png"
     alt="" aria-hidden="true">
```
```css
.deco-petals {
  position: absolute;
  top: -5%;
  right: -5%;
  width: 55%;
  height: auto;
  pointer-events: none;
  z-index: 1;
}
```

**PPTX**: `slide.shapes.add_picture("assets/decorations/petals-3d-purple.png", Inches(6.0), Inches(-0.5), width=Inches(7.5))`.

### 12.2 Forme liquide color acciaio — `decoration--liquid-steel`

**Aspetto.** Volumi 3D fluidi tipo "metaballs" o "liquid metal" — superfici curve, organiche, con riflessi metallici. Colore: gradient cromato/argento (`#E8E8E8 → #FFFFFF → #B8B8C8 → #4A4A55`), riflessi specular bianchi sui bordi più curvi, accenti viola tenui dove la luce ambient li tocca. Possibilità di varianti: blob singolo, anello attorcigliato (tipo "infinity"), goccia allungata.

**Quando usarla.**
- **Slide content** generiche (white o dark) per dare premium feel.
- **Slide tabella** — top-right, sopra il titolo paragrafo.
- **Slide multi-column** dark — top-right.
- **Mai** su cover (riservata ai petali), mai su gradient viola full-bleed (perde leggibilità).

**Posizione & dimensione**:
- Top-right corner.
- PPTX: `x = 9.0"` to `13.5"`, `y = -0.5"` to `4.0"` (può sforare oltre canvas).
- HTML: `top: -3%; right: -3%; width: 25-35%; height: auto;`.
- Rotazione: nessuna (asset pre-ruotato).
- z-index: sopra il background, sotto i contenuti testuali principali.

**Varianti raccomandate**:
- `liquid-blob.png` — singolo volume curvo (default content slide).
- `liquid-ring.png` — anello attorcigliato (slide concettuali, "system thinking").
- `liquid-drop.png` — goccia allungata (slide quote, narrative).

**Asset richiesti**:
- File: `assets/decorations/liquid-steel-{blob,ring,drop}.png`.
- Risoluzione: ≥2000 × 2000 px.
- Sfondo: trasparente.
- Peso: < 600 KB ciascuna.

**Fallback procedurale (se asset PNG non disponibili)**:
Combinazione di `radial-gradient` con `filter: blur` + `border-radius` random per simulare il volume, oppure SVG con `<filter><feTurbulence>` per displacement organico. Riconoscibilmente diverso dal vero render 3D — usare solo come ultima risorsa.

```html
<img class="deco-liquid" src="assets/decorations/liquid-steel-blob.png"
     alt="" aria-hidden="true">
```
```css
.deco-liquid {
  position: absolute;
  top: -3%;
  right: -3%;
  width: 28%;
  height: auto;
  pointer-events: none;
  z-index: 1;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.15));
}
```

**PPTX**: `slide.shapes.add_picture("assets/decorations/liquid-steel-blob.png", Inches(9.5), Inches(-0.3), width=Inches(4.0))`.

### 12.3 Regole d'uso comuni

- **Una decorazione per slide.** Mai combinare petali + forma liquida sulla stessa slide.
- **Mai centrare.** Sempre top-right corner. La narrative è "decorazione che entra dal margine".
- **Mai testo sopra la decorazione.** Lasciare il body content nei 60-70% sinistri del canvas.
- **Coerenza stilistica.** Se il deck usa `liquid-blob` su una slide content, le altre content devono usare lo stesso variant (no mix di blob/ring/drop nello stesso deck salvo intent narrativo esplicito).
- **Performance HTML.** Le PNG sono pesanti — usare `loading="lazy"` se il deck è > 30 slide, e considerare `<picture>` con WebP fallback.

### 12.4 Asset placeholder per la skill

Finché non sono disponibili i render 3D ufficiali, la skill può:
1. Cercare le PNG in `assets/decorations/` della skill stessa.
2. Se non trovate, cercare in `~/Downloads/` (fallback dev).
3. Se ancora non trovate, **omettere la decorazione** e proseguire (la slide resta valida ma meno ricca). Stampare un warning: `[AIDAslidecreator] WARNING: decoration asset not found, skipping. Add PNG to assets/decorations/.`

---

**Versione del documento.** 1.1 — Sorgente: `slidemaster.pptx` analizzato il 2026-04-27. Aggiornamento 1.1: aggiunti (8° fingerprint underline emphasis, 12° sezione decorazioni 3D, componenti 7.6-7.10 tabella/multi-column/underline/symbol mark/product logo, variante cover canonica con gradient + petali).
