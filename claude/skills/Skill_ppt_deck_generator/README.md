# Skill_ppt_deck_generator

Skill that builds a presentation from pasted **text**, output as a native **PowerPoint
(`.pptx`)**, a polished animated interactive **HTML** deck, or **both**.

Driven by a **clickable 5-question intake** (formato → direzione creativa → reference/brand
condizionale → multimedia → testo) and three creative directions:
- **ACN SONG** — one reference picked from the saved style library (incl. the FY26 Song Standard).
- **MIX** — autonomous best-of: the strongest archetypes from *all* references on one coherent Song canvas.
- **Custom** — an external brand via a website/Figma URL or an attached `DESIGN.md`.

Includes **fidelity style packs** (reproduce a reference's real graphic elements, not just
its palette), multi-variant output, a single-file standalone HTML build, and a **mandatory
render→inspect→fix visual QA loop**. See `SKILL.md` for the full flow.

---

## 📦 Installazione (Mac / Linux)

Hai ricevuto il file **`Skill_ppt_deck_generator.zip`**. Per installare la skill basta lanciare `install.sh`. Segui questi passi:

### Passo 1 — Estrai lo zip

Trova `Skill_ppt_deck_generator.zip` (di solito in `~/Downloads/`) e **fai doppio click** per estrarlo. Otterrai due elementi nella stessa cartella:

```
Downloads/
├── install.sh
└── Skill_ppt_deck_generator/        ← cartella con tutti i file della skill
```

> ⚠️ Importante: `install.sh` e la cartella `Skill_ppt_deck_generator/` **devono restare nella stessa directory**. Non spostare uno dei due altrove prima di lanciare l'installer.

### Passo 2 — Apri il Terminale nella cartella

Su macOS, il modo più rapido è **tasto destro sulla cartella Downloads → "Nuovo Terminale nella cartella"** (richiede di averlo abilitato in Preferenze di Sistema → Tastiera → Scorciatoie → Servizi → "Nuovo Terminale nella cartella").

Altrimenti apri il Terminale manualmente e naviga lì:

```bash
cd ~/Downloads
```

### Passo 3 — Lancia l'installer

```bash
./install.sh
```

Se al primo tentativo ti dice *"permission denied"*, è perché il file non è eseguibile. Risolvi con:

```bash
chmod +x install.sh
./install.sh
```

### Cosa succede durante l'installazione

L'installer:
1. Verifica che `python3` sia disponibile (avvisa se manca, ma non blocca)
2. Crea la cartella `~/.claude/skills/` se non esiste
3. Se trova un'installazione precedente, **chiede conferma prima di sovrascrivere** (digita `y` o `n`)
4. Copia tutti i file della skill in `~/.claude/skills/Skill_ppt_deck_generator/`
5. Rende eseguibili gli script Python di supporto

Vedrai output colorato con `✓` per i passi riusciti e `⚠` per eventuali warning. Quando vedi `✓ Skill installed at …` hai finito.

### Passo 4 — Verifica

```bash
ls ~/.claude/skills/Skill_ppt_deck_generator/
```

Devi vedere: `SKILL.md  README.md  assets/  reference/  reference-decks/  scripts/  themes/  brand/`. Se manca qualcosa, ripeti dal passo 1.

### Disinstallare

```bash
rm -rf ~/.claude/skills/Skill_ppt_deck_generator/
```

Tutto qui — la skill non scrive niente fuori da questa cartella.

---

## 📦 Installazione (Windows)

Su Windows con Claude Code (multipiattaforma):

1. Estrai `Skill_ppt_deck_generator.zip` con tasto destro → "Estrai tutto"
2. Apri **PowerShell** nella cartella estratta
3. Esegui:

```powershell
$dest = "$HOME\.claude\skills\Skill_ppt_deck_generator"
if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
New-Item -ItemType Directory -Force "$HOME\.claude\skills" | Out-Null
Copy-Item -Recurse .\Skill_ppt_deck_generator $dest
```

`install.sh` non funziona su Windows nativamente — i comandi PowerShell sopra fanno la stessa cosa.

---

## Themes

| Name | Mood | Use case |
|---|---|---|
| **editorial** | premium, design-led, conceptuale | pitch design, brand vision |
| **minimal** | preciso, Swiss, tecnico | doc tecnici, ricerca, white paper |
| **bold** | brutalist-lite, confident | pitch start-up, product launch, manifesto |
| **corporate** | sobrio, formale, autorevole | board deck, financial, enterprise |
| **playful** | friendly, vibrante, umano | comms, education, community, consumer |
| **dark-tech** | futurista, neon, AI/dev | dev tool, AI product, tech research |

These 6 themes are the **layout flavours** for the HTML output. In **custom** mode the
skill instead composes a fresh, distinctive design each run (see `reference/design-spec.md`).
You can request multiple variants in one go (e.g. *"fammi editorial e bold"*) — each is
forced to look genuinely different.

> **Fidelity mode is central** (not removed): pick an ACN SONG reference (Premium, Essential,
> Dark, Canvas, …) and — if it has a **style pack** in `reference-decks/<slug>/` — the
> `.pptx` reproduces its *real* graphic elements (covers, cards, motifs), not just its
> palette. Build with `--style` (see `SKILL.md → Fidelity`).

## Come usarla — Claude Code (auto)

In **Claude Code** la skill viene rilevata automaticamente quando scrivi frasi tipo:

- *"convert this pptx to an HTML deck"*
- *"trasforma questa pptx in una presentazione web interattiva"*
- *"build a web version of this PowerPoint"*
- *"make an interactive deck from this presentation"*

…oppure semplicemente allegando un file `.pptx` e chiedendo una versione web. Vedrai apparire `Skill(Skill_ppt_deck_generator)` tra i tool call → significa che la skill è stata caricata e seguirà il workflow definito in `SKILL.md`.

Per forzarla esplicitamente:
> *"Usa la skill `Skill_ppt_deck_generator` per questo file."*

---

## Come usarla — Warp, Cursor, altri agenti

**Concetto chiave:** la skill è solo un set di file markdown + script Python sul filesystem (in `~/.claude/skills/Skill_ppt_deck_generator/`). Qualsiasi agente AI che può **leggere file locali** ed **eseguire script** può usarla — non è una proprietà esclusiva di Claude Code. Cambia solo il modo in cui la "attivi".

### Warp Agent

Warp non rileva automaticamente la cartella `~/.claude/skills/`. Per usare la skill devi **caricare manualmente le istruzioni** all'inizio della conversazione, copiando uno di questi prompt:

**Avvio rapido** (più semplice):
> *Leggi il file `~/.claude/skills/Skill_ppt_deck_generator/SKILL.md` e seguilo passo passo per la pptx che sto per condividere.*

**Avvio completo** (se vuoi essere sicuro che legga anche i file di supporto):
> *Leggi i file:*
> *- `~/.claude/skills/Skill_ppt_deck_generator/SKILL.md`*
> *- `~/.claude/skills/Skill_ppt_deck_generator/reference/slide-types.md`*
> *- `~/.claude/skills/Skill_ppt_deck_generator/reference/components.md`*
> *- la cartella `~/.claude/skills/Skill_ppt_deck_generator/themes/`*
>
> *Poi segui il workflow per convertire la pptx che sto per allegare.*

**Note pratiche per Warp:**
- Assicurati che l'Agent di Warp abbia il permesso di leggere file e lanciare comandi (di solito è la modalità default)
- Quando ti chiede conferme per eseguire script Python (`extract_pptx.py`, ecc.), conferma — sono i tool che fanno l'analisi della pptx
- Il path `~` viene espanso correttamente; se hai problemi, usa il path assoluto `/Users/<tuo-utente>/.claude/skills/Skill_ppt_deck_generator/SKILL.md`

### Cursor / Windsurf / IDE con agente AI

Stessa logica di Warp. Apri una nuova chat con l'agente e incolla:

> *Leggi `~/.claude/skills/Skill_ppt_deck_generator/SKILL.md` e segui il workflow per la pptx che ti allego.*

Se l'agente è bloccato in una cartella di progetto (sandbox), puoi anche **copiare la skill** nel tuo progetto:

```bash
cp -R ~/.claude/skills/Skill_ppt_deck_generator/ ./Skill_ppt_deck_generator/
```

…e poi referenziarla con path relativo: *"Leggi `./Skill_ppt_deck_generator/SKILL.md` e segui il workflow."*

### Generic Claude API / SDK

Se stai scrivendo un agente custom con l'SDK Anthropic, includi il contenuto di `SKILL.md` nel system prompt (o caricalo come strumento tipo "filesystem") e dai accesso alla cartella `~/.claude/skills/Skill_ppt_deck_generator/`. La skill è progettata per essere un set di **istruzioni machine-readable**, quindi qualsiasi LLM capace di seguirle può eseguirla.

### Claude.ai (web/desktop)

❌ **Non funziona direttamente** — Claude.ai non vede il tuo filesystem. Workaround manuale:
1. Apri `SKILL.md` localmente
2. Copia tutto il contenuto e incollalo nella chat
3. Allega la pptx
4. Scrivi: *"Segui queste istruzioni per la pptx allegata."*

Funziona, ma è scomodo: per uso ripetuto sono molto meglio Claude Code o Warp.

---

## Verificare che la skill sia installata

```bash
ls ~/.claude/skills/Skill_ppt_deck_generator/
# Dovrebbe mostrare: SKILL.md  README.md  assets/  reference/  reference-decks/  scripts/  themes/  brand/
```

Se manca, riesegui `install.sh` dallo zip.

## DESIGN.md (optional)

Drop a `DESIGN.md` in your project to pin brand-level decisions. The skill reads it before asking the theme question.

```markdown
# Design guidelines

primary: #A100FF
secondary: #460073
accent: #C2A3FF
font: Graphik
mood: premium, editoriale
```

**Note**: `DESIGN.md` does *not* declare the theme. The theme is always asked at intake.

## The 5-question intake (clickable widget)

On start the skill auto-launches a **clickable widget** (in graphical clients: desktop
app, claude.ai/code, IDE extensions) — or, in a plain terminal like Warp, asks the same
questions as text. In order:

1. **Formato** — PPT (`.pptx`) · Deck interattivo (HTML) · Entrambi.
2. **Direzione creativa** — ACN SONG · MIX · Custom.
3. **Reference / brand** (dipende dalla Q2):
   - *ACN SONG* → scegli **una** reference dalla libreria (incl. Song Standard) — mai mescolate.
   - *MIX* → niente da scegliere: la skill compone i migliori archetipi da *tutte* le reference.
   - *Custom* → un URL (sito/Figma) o un `DESIGN.md` / brand guidelines allegato.
4. **Multimedia** — Sì / No. Se Sì, metti le immagini in `<output>/photos/`, i video in `<output>/video/`.
5. **Testo** — incolla il contenuto del deck (oppure allega un `.pptx`/`.pdf` da riusare).

Poi la skill scrive un `deck-model.json` (contenuto) + `design-spec.json` (look), renderizza
ed esegue il **loop obbligatorio di QA visivo**.

> Le opzioni reference di ACN SONG sono **rigenerate da `reference-decks/INDEX.md` a ogni
> avvio** — aggiungere una reference alla libreria la fa comparire in automatico nel widget.

## Generate a .pptx directly

```bash
python3 ~/.claude/skills/Skill_ppt_deck_generator/scripts/build_pptx.py \
    deck-model.json design-spec.json out.pptx
```

Requires `python-pptx` (`pip3 install python-pptx`; the installer does this for you).

## Files

```
~/.claude/skills/Skill_ppt_deck_generator/
├── SKILL.md                       Main instructions (auto-loaded)
├── README.md                      This file
├── decks-log.md                   Running log of design choices (keeps each deck different)
├── assets/
│   └── intake-widget.html         Clickable 5-question intake widget
├── reference/
│   ├── deck-model.md              Content model — JSON contract
│   ├── design-spec.md             Visual spec + anti-sameness (variation) engine
│   ├── input-sources.md           Ingest text / pptx / pdf / image / Figma / URL
│   ├── slide-types.md             Semantic markup for each slide type
│   ├── components.md              Component snippets
│   └── template.html              HTML page skeleton + JS + nav
├── brand/
│   └── acn-song/                  ACN SONG brand profile
│       ├── DESIGN.md              FY26 Song design system — authoritative rulebook
│       ├── song-layouts.md        Archetype selection index (FY26 master layouts)
│       ├── tokens.json            Machine palette/fonts/logo (aligned to DESIGN.md)
│       ├── song-standard.json     PPTX spec for the Song Standard look
│       └── fonts/  logo/          Graphik family + Song logos
├── reference-decks/               Saved STYLE LIBRARY (one style per folder)
│   ├── INDEX.md                   Library index — drives the widget's reference buttons
│   ├── premium/ dark/ canvas/ essential/    style packs { style.json, patterns.md, assets/ }
│   └── mix/                       Synthetic pack for the MIX direction (style.json)
├── themes/
│   ├── _shared.css                Structural CSS shared by all themes
│   ├── editorial/ minimal/ bold/ corporate/ playful/ dark-tech/   { theme.md, style.css }
│   └── song-standard/             FY26 Accenture Song master look (HTML)
└── scripts/
    ├── build_pptx.py              deck-model + design-spec → native .pptx (--style = fidelity)
    ├── style_components.py        Shared catalog of signature components (cover, card, pill, chevron)
    ├── render_preview.py          Render a .pptx/.pdf to one PNG per slide (visual QA)
    ├── init_style_pack.py         Scaffold a new reference's style pack from its .pptx
    ├── extract_pptx.py            Pull text + palette + media from a .pptx
    └── build_standalone.py        Inline all assets into one HTML file
```

## Quick reference

**Extract content from a pptx**:
```bash
python3 ~/.claude/skills/Skill_ppt_deck_generator/scripts/extract_pptx.py path/to/deck.pptx
```

**Build a standalone single-file HTML** (inlines fonts/photos/logo):
```bash
python3 ~/.claude/skills/Skill_ppt_deck_generator/scripts/build_standalone.py path/to/output-dir/
```

## Multi-variant output

When you ask for multiple themes:
```
deck-output/
├── DESIGN.md (shared, optional)
├── fonts/  logo/  photos/  (shared assets)
├── editorial/  { index.html, index.standalone.html }
└── bold/       { index.html, index.standalone.html }
```
