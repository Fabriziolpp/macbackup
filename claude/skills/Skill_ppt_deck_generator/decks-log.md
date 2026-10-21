# Decks log

Running log of the design choices made for each generated deck, so the next deck can
deliberately differ. Read this before starting; append one block per deck after finishing.

Track at minimum: **creative direction** (ACN SONG / inspiration / custom) ·
**cover variant** (light / dark / accent / image) · **dominant mode rhythm** ·
**hero-stat / peak-moment placement** · **main layouts used**.

> **Note — reference renaming (2026-07-13):** the style library was renamed to
> functional names. Historical entries below keep the ORIGINAL client/source names on
> purpose (they document what was actually used at the time). Current mapping:
> **Nexi → Premium** · **MAECI → Essential** · **Isybank → Canvas** ·
> **Artemis II → Dark** · **Mix → Mix**. Slugs/paths changed accordingly
> (e.g. `reference-decks/nexi/` → `reference-decks/premium/`).

---

## 2026-07-02 — AIDA · Reinventing Accessibility with Agentic AI (23 slide)
- **Direction:** ACN SONG · reference **Nexi** (AIDA_Offerta_Nexi.pptx). Spec
  `nexi-electric`: viola elettrico (#6D28FF / #5312D6), headline Graphik light + parola
  accento, decoration `bar` (barra decostruita), `mode:"light"`, divider scuri.
- **Cover:** viola profondo full-bleed, headline light + accento "with Agentic AI".
- **Mode rhythm:** light workhorse; 4 divider scuri numerati (01–04); chiusura viola.
- **Layouts:** context split (headline sx / body dx), liste numerate full-width per i
  blocchi a 5 voci, quote scuro, thank-you viola.
- **Fix engine in questo run:** divider a 2 righe (titolo bottom-anchored sopra la barra)
  + grid card ≥4 voci → lista numerata full-width (prima le card 04/05 uscivano dal fondo).
- **Fidelity mode (Nexi style pack):** cover/divider riusano la blade reale estratta;
  content skin Nexi (eyebrow numerato, parola-accento, bento viola, callout box,
  sotto-label viola + bullet, chevron). Build con `--style reference-decks/nexi/style.json`.
- **Catalogo pattern + selezione autonoma:** `reference-decks/nexi/patterns.md` censisce
  ~25 archetipi + elementi con trigger; l'authoring lo usa come selection index. Archetipi
  engine ✅: cover, agenda/indice, divider, statement, big-stat, stat-quad, content-list,
  content-rich, definizione, bento, closing. Da fare: donut, comparison-table, mappe, ecc.
- **Deliverable:** `AIDA_agentic/AIDA_agentic.pptx` (clean) + `AIDA_agentic_nexi.pptx`
  (fidelity Nexi, 24 slide, selezione autonoma degli archetipi). QA: consegnabile.

## 2026-07-02 — Libreria fidelity: colori Song + archetipi Nexi
- **Regola colori (HARD):** ogni deck usa SEMPRE la palette Song (viola), la reference dà
  solo layout/struttura/elementi. Ricolorati tutti i pack + l'asset ring-arc di Isybank.
- **De-mix:** il content skin ora onora le convenzioni per reference (es. `accent_word`:
  Artemis niente parola-accento). Regola "no layout bleed" fissata in SKILL.md.
- **Nexi a fondo — nuovi archetipi engine (Song-purple, verificati):** `donut`
  (parts-of-whole + legenda + center), big-stat `metrics` con `ring` (gauge ad anello),
  `table` (comparison, header viola + ✓/— + zebra), `taxonomy` (colonne di pill per fase).
- **Content skin mode-aware** (`_skin()`): light (Nexi/Isybank/MAECI) vs dark (Artemis).
- Demo ricco: `scratchpad/nexi_rich.pptx` (12 slide) esercita tutti i nuovi archetipi.

## 2026-07-02 — Colmati TUTTI gli ○: libreria archetipi completa
- Implementati (Song-purple, QA via contact sheet): timeline, flow, gantt, ratings, logos,
  donuts (dashboard), pricing, decision, bento featured/status, activity (MAECI immagine
  full-height + phase-badge + "Deliverable previsti"), Artemis nav-rail + footer case-study,
  Isybank ghost-number divider, map, risk (arc+card+map), phoneflow, finding (severity +
  browser mock + tag), showcase (image cards a cascata).
- Archetipi con immagini: placeholder se non fornita; passare immagini reali via media.
- ⚙️ minori rimasti: glyph-icon Artemis (serve set icone), underline-marker + link-chip Isybank.
- Deliverable: `Skill_AI_Brain/fidelity_demos/DEMO_*.pptx` + demo per-batch in scratchpad.

<!-- Template:
## YYYY-MM-DD — Nome (N slide)
- Direction / Cover / Mode rhythm / Peak moment / Layouts
-->

## 2026-07-08 — AIDA · Reinventing Accessibility (offering commerciale, 13 slide) — PPTX + HTML
- **Direction:** ACN SONG → reference **Nexi** (fidelity `--style reference-decks/nexi/style.json`),
  formato **Entrambi**. Spec `aida-nexi-song` (palette Song viola, Graphik, decoration `none`).
- **Differenza deliberata dal deck AIDA del 2026-07-02** (stesso reference Nexi ma "niente
  big-stat/donut: il testo non aveva numeri"): questo testo è ricco di dati → lean sulla
  **data-viz Nexi**. Big-stat hero 24%, stat-quad 300k/620k, bento 2×2 e 3, timeline 5 step.
- **Cover:** blade Nexi reale (cover-bg.png) + scrim, "AIDA" enorme, kicker "Reinventing Accessibility".
- **Mode rhythm:** cover blade scuro → run light editoriale → 1 divider blade scuro (05 "La
  soluzione: AIDA") → run light → **statement viola pieno** (12, picco) → closing viola.
- **Layouts (varietà):** cover(blade) · metrics big-stat · focus bento-4 · content rich(2 gruppi) ·
  divider(blade) · content split(callout+bullet) · content rich(scenari A/B) · timeline(5) ·
  content split · metrics stat-quad(2) · focus bento-3 · quote/statement(viola) · thank-you(viola).
- **Fix QA PPTX:** 4 slide avevano la parola-accento ripetuta dentro il titolo (headline + il
  renderer riaccoda l'accento → duplicazione). Corretto splittando titolo/accento (03,04,08,11)
  + accorciati i bullet lunghi della normativa che si sovrapponevano nel layout "rich".
- **HTML:** bespoke Nexi (no tema stock) — @font-face Graphik locale, blade cover/divider via
  cover-bg.png, card gradiente viola, timeline, callout box, chevron footer, eyebrow numerata,
  deep-link `#N`, nav pill + progress + keyboard/touch/wheel. QA via Chrome headless (`#N`).
- **Fix QA HTML:** slide a card (bento) sforavano il viewport sotto la nav pill → `min-height:0`
  su griglia/tile per far comprimere le righe, padding bottom 9.5cqh per clearance nav, header
  più compatto, rimosso contatore per-slide ridondante (resta quello nella nav pill).
- **Deliverable:** `Presentazioni generate/AIDA_Reinventing_Accessibility/`
  (`AIDA_Reinventing_Accessibility.pptx` 13 slide + `index.html` + `assets/`). QA: consegnabile.

## 2026-07-03 — Nike × Accenture Song (11 slide) — PPTX + HTML
- **Direction:** ACN SONG → reference **Nexi** (fidelity `--style`), formato **Entrambi**.
- **Cover:** photographic full-bleed (runner) + scrim viola su style-pack `cover.asset` override
  (non la blade). **Closing:** photographic full-bleed (ritratto Cortez) via `closing.asset`.
- **Mode rhythm:** light editoriale con 3 momenti scuri/pieni — cover foto, agenda blade dark,
  statement viola pieno (#A100FF), closing foto. Agenda/divider = blade Nexi (asset originale).
- **Peak moments:** statement viola (slide 4) al centro, chiusura fotografica umana.
- **Layouts (varietà):** cover(foto) · agenda(blade) · content-split · statement · content-split ·
  bento-3 · showcase(foto) · content-split · context · bento-4 · thank-you(foto). Nessun dato
  inventato (niente big-stat/donut: il testo non aveva numeri).
- **Foto:** pre-croppate all'aspect esatto (16:9 per full-bleed, 4.4:2.5 per showcase) perché
  `fullbleed_image`/`_img_box` forzano w+h (stirano, non croppano).
- **HTML:** CSS bespoke Nexi (no tema stock) — @font-face Graphik locale, blade agenda, tile a
  gradiente viola, chevron footer, eyebrow numerata. Screenshot QA via Chrome headless.

## 2026-07-09 — AIDA · Campagna Commerciale (aggiornamento interno, 18 slide) — PPTX + HTML
- **Direction:** ACN SONG → reference **Artemis II** (fidelity `--style`), formato **Entrambi**.
  Prima volta che si usa Artemis in questa serie di deck AIDA (i precedenti erano tutti Nexi) —
  dark cinematic invece di light editoriale, per variare deliberatamente.
- **Footer override:** lo style pack Artemis originale ha `footer_text:"ARTEMIS II — CASE STUDY"`
  (branding letterale della reference) — creata una copia locale `artemis-style-override.json`
  con `footer_text:"AIDA — CAMPAGNA COMMERCIALE"` e brand_lockup coerente; asset (cover-bg.png/
  divider-bg.png) referenziati con path assoluti alla cartella reference, nessuna duplicazione.
- **Cover:** moon + crescent-earth art Artemis, kicker "AIDA · Accenture Song", headline bianca
  2 righe, sottotitolo. **Mode rhythm:** run scura (Artemis è dark by design) con 2 momenti
  statement full-bleed (slide 11 "Segnali enterprise", slide 18 "Sintesi" di chiusura) — nessun
  divider separato, testo utente senza sezioni esplicite → rispettata la struttura 1:1 dell'utente
  (17 blocchi + cover), niente slide extra inventate.
- **Selezione archetipi (`patterns.md` come indice):** contenuto a 9 liste-di-5 quasi identiche
  (obiettivi/trend/criticità/azioni) → variati deliberatamente tra `content` (checklist verde) e
  `focus` (bento tiles, anche title-only senza desc) per rompere la monotonia; 2 blocchi
  "sequenziali" (stato pipeline, prossimi step) → `timeline` (bookend apertura/chiusura); 3
  paragrafi → `context`; 2 momenti di sintesi/framing → `quote` (statement pieno).
- **Fix engine condiviso (bug reale, non solo di questo deck):** `quote()` in fidelity mode
  disegnava un chevron hardcoded ma non chiamava mai `_footer()` → sulle slide statement mancavano
  branding+contatore pagina presenti su tutte le altre slide (visto anche nel deck Nexi del
  2026-07-08, mai notato prima). Sostituito il chevron hardcoded con `self._footer(sl, idx,
  dark=True)` — ora rispetta il motif footer proprio di ogni reference (chevron/case-study/song)
  + aggiunge sempre il contatore. Beneficia tutti i deck futuri con statement in fidelity mode.
- **Fix QA HTML:** (1) contatore di pagina duplicato (mio `.pageno` per-slide + quello nella nav
  pill) — stesso errore già corretto nel deck Nexi del 2026-07-08, questa volta dimenticato in
  fase di scrittura e ripreso da un self-check prima ancora del report del subagent; risolto con
  `.pageno{display:none}`. (2) Card bento con grande vuoto tra numero e titolo (tile stirata a
  riempire tutta l'altezza riga via `flex:1` sul contenitore + `margin-bottom:auto` sul numero) —
  risolto rendendo il bento un blocco centrato non-stretch (`margin-top/bottom:auto`, righe
  `minmax(0,14cqh)`) e il contenuto interno della tile centrato verticalmente invece di
  top+bottom-anchored.
- **Deliverable:** `Presentazioni generate/AIDA_Campagna_Commerciale/`
  (`AIDA_Campagna_Commerciale.pptx` 18 slide + `index.html` + `assets/` + `artemis-style-
  override.json`). QA: consegnabile, nessun blocker residuo.

## 2026-07-09 — AIDA · Campagna Commerciale, versione Custom (5 slide) — PPTX + HTML
- **Direction:** Custom (brand esterno) → Figma deck studiato via `get_screenshot` (URL:
  figma.com/deck/knjizTKbMDcD07okjxPAWx, template "Design Portfolio"). Nessun node-id nel primo
  link condiviso: i tool Figma vietano di indovinarlo → chiesto all'utente un link a una slide
  specifica (AskUserQuestion) prima di procedere, invece di forzare un fallback generico.
- **Studio reference:** screenshot a piena risoluzione (11040×1560) ritagliato in 5 slide via
  PIL, istogramma colori per i hex esatti (niente color-picking a occhio): `#3F7D58` verde bosco
  (unico accento), `#F5F5F5`/`#EFEFEF` carta. Tipografia dedotta dalle letterform: headline
  monospace/slab bold caps (mappata su **Space Mono**), body/label rounded geometric sans
  (mappata su **Quicksand**) — entrambi Google Fonts scaricati e installati localmente (mai
  @import remoto), consistente con la regola "standalone fonts must be local" anche per la build
  non-standalone.
  Firmato dal reference: cover/closing a scacchiera, tab a pillola (stadium shape) piena per
  singola label, righe hairline come UNICO separatore strutturale (zero card/ombre).
  Passata `frontend-design` per la validazione del token system prima di costruire (non ha
  cambiato la direzione, ha confermato che il mix "scacchiera + monospace + un solo accento"
  non ricade nei 3 default AI-generated da evitare).
- **Niente fidelity `--style` pack**: è una reference Custom (non della libreria curata), quindi
  niente `patterns.md`/style pack. Il motore generico (`decoration:"blocks"`) è troppo povero per
  rendere scacchiera/pillola (produce solo una barra laterale sottile) → scritto un renderer PPTX
  **bespoke** (`build_custom_deck.py`, non parte della skill condivisa, vive nell'output folder)
  che legge `deck-model.json`+`design-spec.json` e disegna a mano checkerboard/pillola/hairline
  con python-pptx. Precedente in questa serie di deck ad avere un builder Python dedicato invece
  del motore condiviso — scelta consapevole per onorare "Custom decks must look genuinely
  different", non uno shortcut.
- **Fix cover (bug reale, preso da solo prima della QA):** primo tentativo di scacchiera a griglia
  piena (ogni cella alterna colore) metteva il testo verde SOPRA celle verdi (invisibile) e la
  3a riga di titolo si sovrapponeva alla 2a (stessa riga riusata per due contenuti). Risolto
  confinando la scacchiera ai margini laterali (colonna edge alterna verde/carta per riga) e
  tenendo la fascia centrale sempre color carta piatto: il testo verde è sempre leggibile.
- **Selezione tipo per blocco** (mapping deliberato, non tutto "lista"): checklist a bullet-dot
  per contenuti non sequenziali (Obiettivi); funnel numerato con badge circolari per contenuti
  davvero sequenziali (Stato pipeline: assessment→meeting→feedback→chiusura→conversione — la
  skill `frontend-design` sconsiglia i numeri su liste non ordinate, qui invece sono legittimi);
  righe nome/descrizione senza numeri per gli account (Opportunità), che riecheggia il pattern
  agenda a 2 colonne "Slide#/Titolo" visto nel reference.
- **Fix QA PPTX:** vuoto verticale eccessivo sotto il paragrafo nella slide "Overview" (contenuto
  breve, box top-anchored) → risolto centrando verticalmente il text-box nello spazio residuo
  (`anchor=MSO_ANCHOR.MIDDLE`) invece di lasciarlo appeso in alto.
- **Fix QA HTML:** stesso vuoto verticale replicato con markup diverso (niente `.rows`, quindi il
  fix dei bento non si applicava) → risolto avvolgendo pillola+hairline+paragrafo in un blocco
  flex `justify-content:center` dentro lo spazio residuo. Inoltre le slide a righe (`.rows`)
  avevano lo stesso problema delle card bento del deck precedente (righe accatastate in alto,
  vuoto sotto) → risolto con `justify-content:space-between` sul contenitore flex.
  Corretta anche una sovrapposizione cromatica minore sulla cover: la progress-bar di sistema
  (verde, sempre in cima) coincideva pixel-per-pixel con la scacchiera (anch'essa verde a y=0),
  creando l'illusione di un tassello scacchiera mancante — risolto scostando la griglia di 4px.
- **Deliverable:** `Presentazioni generate/AIDA_Campagna_Commerciale_Custom/`
  (`AIDA_Campagna_Commerciale_Custom.pptx` 5 slide + `build_custom_deck.py` + `deck-model.json` +
  `design-spec.json` + `index.html` + `assets/fonts/`). QA: consegnabile, nessun blocker residuo.

## 2026-07-28 — AIDA × GrowthOS · FY27 Evolutionary Roadmap (11 slide) — HTML only
- **Direction:** ACN SONG → reference **Dark** (Artemis II, fidelity style pack), formato **HTML only**.
  Audience: Accenture Leadership. Differenza deliberata dal deck Artemis precedente (campagna
  commerciale): quello era 18 slide con pptx+html; questo è solo HTML, più compatto, più
  cinematico — niente itemlist dense, tutto sintetico e visualmente ariosa.
- **Cover:** moon art (`cover-bg.png` da Dark reference) bleed right (55% auto), headline
  "FY27 Evolutionary Roadmap" su sfondo nero a sinistra, eyebrow "AIDA × GROWTHOS" viola.
- **Closing:** spacecraft + moon art (`divider-bg.png` da Dark reference) bleed right, "AIDA × GrowthOS."
  bold su sfondo nero a sinistra, eyebrow "END OF TRANSMISSION".
- **Mode rhythm:** interamente dark (bg #000, card #111). Nessun divider separato — ogni slide ha
  identità propria tramite contenuto. Peak moment: Q3 "Global Launch" con chip badge "ALL TRACKS CONVERGE".
- **Layouts (11 slide):** cover(moon) · 2-card objective · 5-check context · 3-card tracks ·
  Q1–Q4 track-card 3col (quarterly milestone) × 4 · 3-node horizontal timeline (convergence) ·
  5-tile metrics grid · closing(spacecraft).
- **Palette Song usata:** A: #A100FF, B: #7500C0, C: #C2A3FF per i tre track (sempre Song purple,
  nessun colore esterno). Green #22C55E per i check bullet. Nessun blu (hard rule rispettata).
- **Fix critico QA:** `flex:0` su `.content-row` (slides 2 e 4) produceva `flex-basis:0%` che
  collassava l'altezza del row a 0; la regola `overflow:hidden` del `.content-row` clippava le card
  figlie rendendole invisibili. Fix: `flex:0 0 auto` — no grow, no shrink, altezza dal contenuto.
- **cqh/cqw units:** tutta la tipografia e i padding usano container query units (slide = container),
  così il deck scala a qualunque viewport senza media query.
- **Deliverable:** `Presentazioni generate/AIDA_GrowthOS_Roadmap_FY27/index.html` + `assets/`
  (cover-bg.png + divider-bg.png). QA: consegnabile, tutti 11 slide verificati via browser.
