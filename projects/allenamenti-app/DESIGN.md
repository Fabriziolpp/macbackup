# Design System — GymTonic

Questo documento è il **source of truth** per la UI dell'app. Ogni nuova pagina o refactor deve seguirlo. Il design system GymTonic è ispirato a un approccio editoriale sportivo: sfondo cream, hero sempre scuro, lime accent configurabile, tipografia Barlow.

Handoff di design in-repo: [`docs/design/`](docs/design/README.md) (indice). Spec dettagliato per pagina: `docs/design/Home/project/design_handoff_gymtonic_home/README.md`, prototipi HTML per Settimana/Mese/Anno in `docs/design/Settimana/project/`. Reference implementazione in-repo: `app/(app)/home/page.tsx`.

---

## 1. Status & Migration Map

| Path | Design system | Classi | Note |
|---|---|---|---|
| `app/(app)/home/page.tsx` | **GymTonic** | `.gt-*` | Reference implementation. Nav via `GtTabBar` + `GtTopStrip`. |
| `app/(app)/schede/page.tsx` | **GymTonic** | `.gt-*` + inline | Hero dark con 3 stats (Schede/Tipi/Esercizi), drop-zone import PDF, lista schede espandibili con stripe colorato, nested tipi/esercizi con drag&drop. Modali ancora Nike. |
| `app/(app)/settimana/page.tsx` | **GymTonic** | `.gt-*` | Migrata dal prototipo `docs/design/Settimana/project/GymTonic Settimana.html`. Nav via `GtTabBar` + `GtTopStrip`. |
| `app/(app)/mese/page.tsx` | **GymTonic** | `.gt-*` | Migrata dal prototipo `docs/design/Home/project/GymTonic Mese.html`. Hero con month nav + 3 metriche + heatmap 5×7, barre settimanali, lista `.gt-card`. |
| `app/(app)/anno/page.tsx` | **GymTonic** | `.gt-*` | Migrata dal prototipo `docs/design/Home/project/GymTonic Anno.html`. Hero con year nav + 3 metriche + year-strip 12 mesi, barre mensili, riepilogo, lista `.gt-card`. |
| `app/(auth)/login/page.tsx` | Nike legacy | `.nk-*` | Da migrare. Fuori da `(app)`, nessuna nav. |
| `components/GtTabBar.tsx` | **GymTonic** | inline | Bottom tab bar mobile-native (5 tab, 56px), montata globalmente in `AppLayoutClient`. |
| `components/GtTopStrip.tsx` | **GymTonic** | inline | Top strip (36px) con logo + titolo pagina + profilo/logout, sticky al top. |
| `components/modals/*.tsx` | Nike legacy | `.nk-*` | Usati anche dalla home — migrarli insieme alle altre pagine. |

Aggiorna questa tabella quando migri una pagina.

---

## 2. Design Philosophy — GymTonic

- **Cream editorial background** (`#F4F2EE`) — ambiente caldo, non bianco puro.
- **Hero sempre scuro** (`#0D0D0D`) — indipendentemente dal resto della pagina. Le metriche chiave vivono su fondo nero.
- **Lime accent configurabile** (`#C8F135` default) — usato per progresso, record, stato "super", pill selezionate, save button success.
- **Tipografia Barlow** — `Barlow Condensed` per display/numeri/label, `Barlow` per body. Letter-spacing negativo (`-4px`) sui numeri hero.
- **Flat**: nessuna shadow, nessuna elevation. Separazione tra elementi solo tramite bordi `1px` e contrasto di colore.
- **Max-width 820px** centrato. Su mobile (<640px) edge-to-edge, nessun border, nessun border-radius.
- **Nav globale mobile-first** — bottom tab bar (`GtTabBar`, 56px, 5 tab icona+label) + top strip (`GtTopStrip`, 36px, logo + titolo + profilo/logout). Rispetta safe-area iOS top e bottom. Montata in `AppLayoutClient` per tutte le pagine `(app)`.

---

## 3. Design Tokens (`--gt-*`)

Definiti in `app/globals.css` (righe ~326-347). Non hardcodare mai hex — usa le variabili.

```css
/* Surfaces */
--gt-bg:             #F4F2EE;   /* canvas background */
--gt-surface:        #FFFFFF;   /* nav, streak card neutro */
--gt-card:           #FFFFFF;   /* workout card, motiv */
--gt-border:         rgba(0,0,0,0.08);   /* hairline / separator interno */
--gt-border-strong:  rgba(0,0,0,0.18);   /* bordo componente (button, dropdown, chip) */
--gt-hero-bg:        #0D0D0D;

/* Text */
--gt-text-primary:   #111111;
--gt-text-secondary: #666666;
--gt-text-muted:     #AAAAAA;
--gt-hero-text:      #F0F0F0;
--gt-hero-muted:     rgba(255,255,255,0.45);
--gt-hero-seg:       rgba(255,255,255,0.1);

/* Input */
--gt-input-bg:       #F4F2EE;
--gt-input-border:   rgba(0,0,0,0.12);

/* Accent (configurabile) */
--gt-accent:         #C8F135;

/* Semantic */
--gt-neg:            #FF5555;
--gt-neg-bg:         rgba(255,70,70,0.12);

/* Tag colors (workout stripe / scheda tag) */
--gt-tag-apr-bg:     #e8f7c0;
--gt-tag-apr-color:  #4a7000;
--gt-tag-mar-bg:     #ffe8cc;
--gt-tag-mar-color:  #a05000;
```

Per i tag dinamici delle schede, **non** usare queste variabili fisse: usa `schedaColor(nome)` da `lib/utils.ts` che ritorna `{ bg, text }` consistenti per qualsiasi nome scheda.

### 3.1 `--gt-border` vs `--gt-border-strong` — quale usare

| Token | Light | Dark | Uso |
|---|---|---|---|
| `--gt-border` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.08)` | **Hairline / separator** dentro un componente che condivide la stessa surface (es. `borderBottom` tra righe di una lista, `borderTop` interno a un accordion expanded, `gt-divider`). Intenzionalmente sottile: NON deve gridare. |
| `--gt-border-strong` | `rgba(0,0,0,0.18)` | `rgba(255,255,255,0.24)` | **Bordo perimetrale di componente** che deve risultare visibile come edge interattivo: outline button, dropdown panel, chip non-selezionata, card outline, segmented control. Usalo sempre con `border: '1px solid …'` (full perimeter), non sui `borderTop\|Bottom\|Left\|Right` singoli. |

Regola pratica:
- `border:` (perimetro) → quasi sempre `--gt-border-strong`
- `borderTop|Bottom|Left|Right:` (singolo lato) → `--gt-border`
- `.gt-divider` (separator esplicito sopra/sotto sezioni) → `--gt-border`

**Perché due token e non bumpare `--gt-border` direttamente:** il primo bump globale renderebbe troppo "rumorosi" i separator interni alle liste e alle card. Tenerli distinti consente al designer di scegliere "edge che invita al tap" (strong) vs "linea che organizza ma non distrae" (hairline). Sul dark theme la distinzione conta di più perché il delta percettivo tra 8% e 24% di bianco è enorme.

---

## 4. Typography

Font caricati in `app/layout.tsx` via `next/font/google`:

- `var(--font-barlow-condensed)` — weights `400, 500, 600, 700, 800, 900`
- `var(--font-barlow)` — weights `400, 500, 600`, style `normal + italic`
- `var(--font-anton)` e `var(--font-archivo)` — **legacy Nike**, mantenuti finché esistono pagine `.nk-*`. Non usare su pagine GymTonic.

Scala tipografica:

| Ruolo | Font | Size / weight / letter-spacing |
|---|---|---|
| Hero number | Barlow Condensed | 120px / 900 / -4px (92px su <540px) |
| Hero goal `/5` | Barlow Condensed | 48px / 700 |
| Section head (RECENTI, REGISTRA) | Barlow Condensed | 36px / 800 / -1px, uppercase |
| Section sub (totali) | Barlow Condensed | 12px / 600 / 1.5px, uppercase, `--gt-text-muted` |
| Streak num | Barlow Condensed | 38px / 800 / -1px |
| Streak unit | Barlow Condensed | 16px / 600 / 1px, uppercase |
| Label form | Barlow Condensed | 11px / 700 / 1.5px, uppercase, `--gt-text-muted` |
| Card giorno | Barlow Condensed | 16px / 700 / 0.5px, uppercase |
| Card tag | Barlow Condensed | 10px / 700 / 1.5px, uppercase |
| Body text | Barlow | 14px / 400 |
| Quote / note | Barlow | 13-14px / 400 italic |
| Caption meta | Barlow | 12px / 400, `--gt-text-secondary` |

---

## 5. Components (`.gt-*` utilities)

Tutte le classi sono in `app/globals.css` sezione "GYMTONIC DESIGN SYSTEM" (righe ~322 in poi). Usale direttamente — non duplicare CSS inline.

### Layout
- `.gt-shell` — wrapper fullscreen, centra il canvas, padding 40px/20px, background `#e8e6e1` (leggermente più scuro di `--gt-bg` per dare profondità).
- `.gt-canvas` — card centrata, `max-width: 820px`, `border: 1px solid var(--gt-border)`, `border-radius: 8px`, `overflow: hidden`. Mobile <640px: edge-to-edge, nessun border, nessun border-radius.

### Nav globale (componenti React)
- `components/GtTopStrip.tsx` — header sticky 36px con logo (20×20 accent), titolo pagina (derivato da `usePathname()`, mappa `TITLES`), profilo 28×28 round → logout. `padding-top: env(safe-area-inset-top)`.
- `components/GtTabBar.tsx` — `<nav>` fixed bottom, grid 5 colonne 56px, ogni cella `<Link>` con icona SVG + label Barlow Condensed 10px. Attivo letto da `usePathname()`, colore `var(--gt-accent)`. `padding-bottom: env(safe-area-inset-bottom)`.
- Entrambi sono montati in `app/(app)/AppLayoutClient.tsx` e si applicano a tutte le pagine autenticate.
- `<main>` di `AppLayoutClient` imposta `paddingBottom: calc(72px + env(safe-area-inset-bottom))` per garantire che il contenuto non finisca sotto la tab bar fissa.

### Hero (sempre dark)
- `.gt-hero` — padding `28px 28px 24px`, animazione `gtFadeUp 0.4s`.
- `.gt-hero-row` — header row flex (label sx + badge dx).
- `.gt-hero-label` — settimana label, uppercase 11px.
- `.gt-hero-badge` + modifier `.is-sotto | .is-minimo | .is-ottimale | .is-super` — stato settimanale (usare `weekLevel()` da `lib/weeklyStats.ts`).
- `.gt-hero-num-wrap` + `.gt-hero-num` + `.gt-hero-goal` — numero grande (count) + `/goal`.
- `.gt-hero-caption` + `.gt-hero-caption-line` — mini-label laterale.
- `.gt-progress` + `.gt-progress-seg` — 5 barre orizzontali `height: 6px`, gap `4px`. Il `<span>` interno è la fill che anima con `gtFillBar`. Applica `animation-delay: 0.08s * index` staggered.
- `.gt-hero-footnote` — caption 12px sotto le barre.

### Streak
- `.gt-streak` — wrapper flex 2 colonne, `gap: 12px`, `padding: 20px 28px`.
- `.gt-streak-card` — card neutra.
- `.gt-streak-card.is-accent` — variant accent (usare per il record).
- `.gt-streak-label`, `.gt-streak-value`, `.gt-streak-num`, `.gt-streak-unit`.

### Motivational quote
- `.gt-motiv` — quote box con `border-left: 3px solid var(--gt-accent)`. Body italico `--gt-text-secondary`, `<strong>` in primary non-italic.

### Section headings
- `.gt-section-head` — h2-style GymTonic (REGISTRA, RECENTI, ecc.).
- `.gt-section-sub` — metadato laterale (es. "26 TOTALI").

### Registra form
- `.gt-registra` — wrapper animato.
- `.gt-registra-head` — header cliccabile per collapse/expand.
- `.gt-registra-chevron` + `.is-open` — chevron che ruota 180° quando aperto.
- `.gt-registra-body` — contenuto form.
- `.gt-label` — label form.
- `.gt-input` — input generico (date, time, number, text).
- `.gt-pill` + `.is-selected` — pill di selezione (scheda, tipo giorno).
- `.gt-save-btn` + `.is-saved` (2s flash accent) + `.is-secondary` — save button.

### Workout card
- `.gt-card` — row con flex: stripe | content | actions.
- `.gt-card-stripe` — accent colorato `width: 4px`. Imposta inline `backgroundColor: schedaColor(nome).text`.
- `.gt-card-content` — main area.
- `.gt-card-top` / `.gt-card-taggroup` — header riga con tag + giorno + durata.
- `.gt-card-tag` — pill colorata del nome scheda. `background: schedaColor(nome).bg`, `color: schedaColor(nome).text`.
- `.gt-card-giorno` — label giorno (es. "GIORNO 1").
- `.gt-card-durata` — badge durata.
- `.gt-card-meta` — linea data/ora.
- `.gt-card-note` — note italic separata da border-top.
- `.gt-card-actions` + `.gt-card-action` + `.is-danger` — icone edit/delete. **Opacity 0 di default, 1 on hover/focus.** Mobile <640px: sempre visibili.

### Helpers
- `.gt-divider` — hr `height: 1px`.
- `.gt-load-more` — outline button per paginazione.
- `.gt-empty` — placeholder testuale "nessun workout".

---

## 6. Animations

Definite in `app/globals.css`:

```css
@keyframes gtFillBar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes gtFadeUp  { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
```

- **Progress bars**: `gtFillBar 0.4s ease both`, staggered `0.08s * index` per le 5 barre (animation-delay inline).
- **Card entry**: `gtFadeUp 0.4s ease both`, staggered `0.06s * index`.
- **Hero**: `gtFadeUp 0.4s ease` on mount.
- **Registra / Recenti**: `gtFadeUp 0.5s ease` con delay 0.15-0.2s per stacking naturale.

Non aggiungere shadow, scale, o hover-lift — la UI è flat.

---

## 7. Reusable primitives (React)

Non duplicare logica — questi moduli esistono e coprono la maggior parte dei casi.

### Stato globale
- `providers/AppProvider.tsx` → `useApp()` espone: `workouts`, `schede`, `weightLogs`, `loadWorkouts`, `loadSchede`, `loadWeightLogs`, `saveWorkout`, `deleteWorkout`, `apiFetch`, `showToast`, `authToken`, `setAuthToken`.

### Calcoli settimanali
- `lib/weeklyStats.ts`:
  - `weekWorkouts(workouts, mondayStr)` — filtra i workout della settimana corrente.
  - `currentMonday()` — ISO string del lunedì corrente.
  - `weeklyStreak(workouts)` → `{ current, record, lastWeekCount }` settimane consecutive.
  - `weekLevel(count)` → `'sotto' | 'minimo' | 'ottimale' | 'super'` (per `.gt-hero-badge.is-*`).
  - `weekMessage(count, dayOfWeek)` — testo motivazionale statico (unica fonte: la route `/api/motivation` è stata eliminata il 2026-10-13).
  - `schedaCompletion(...)` — stats per singola scheda.

### Date utilities
- `lib/dateUtils.ts`:
  - `MESI` (12 nomi full) e `MESI_S` (abbreviati).
  - `toDateString(d)`, `toTimeString(d)` — formatter locale `YYYY-MM-DD` / `HH:MM`.
  - `parseLocalDate(s)` — parser locale (NON UTC).
  - `addDays(d, n)`, `getMonday(d)`, `isoWeek(d)`.
  - `formatDateIT(s)` — "15 Apr 2026" in italiano.

### Colori schede
- `lib/utils.ts`:
  - `schedaColor(nome)` → `{ bg: '#xxxxxx26', text: '#xxxxxx' }` — hash stabile del nome. **Usa sempre questa** per stripe accent e tag color.
  - `newId()` — UUID.

### Modals
- `components/modals/ConfirmModal.tsx`, `WarnModal.tsx`, `TipoModal.tsx`, `SchedaModal.tsx`, `EsercizioModal.tsx`, `StoricoPesiModal.tsx` — **attualmente stilati Nike**. Vanno migrati a GymTonic insieme alle pagine che li usano (task separato).

### API
- `apiFetch` (da `useApp()`) — wrapper fetch con auth header.
- `/api/motivation` — eliminata il 2026-10-13 (AP1): nessun chiamante; resta nella storia git.

---

## 8. File map

| File | Contenuto |
|---|---|
| `app/globals.css` | Token `--gt-*`, keyframes `gtFillBar/gtFadeUp`, tutte le classi `.gt-*`. Sezione GymTonic righe ~322-675. La sezione Nike `.nk-*` (righe ~1-321) è legacy. |
| `app/layout.tsx` | Caricamento font: `Anton`, `Archivo` (Nike legacy), `Barlow`, `Barlow_Condensed` (GymTonic). |
| `app/(app)/home/page.tsx` | **Reference implementation** GymTonic completa (senza nav interna — la nav è globale). |
| `app/(app)/AppLayoutClient.tsx` | Monta `GtTopStrip` + `GtTabBar` per tutte le pagine autenticate. Gestisce sessione Supabase. |
| `components/GtTabBar.tsx` | Bottom tab bar mobile-native (5 tab, 56px + safe-area-bottom). |
| `components/GtTopStrip.tsx` | Top strip sticky (36px + safe-area-top) con logo + titolo pagina + logout. |
| `components/modals/*` | Modals Nike legacy condivisi. |
| `DESIGN.md` | Questo file — GymTonic. |
| `docs/design/` | Libreria di handoff di design (HTML + README per pagina). Reference pixel-close per nuove pagine o migrazioni. Vedi [`docs/design/README.md`](docs/design/README.md). |
| `docs/legacy-nike-design.md` | Doc design Nike — reference per le pagine non ancora migrate. |

---

## 9. Do's & Don'ts — GymTonic

### DO
- **Usa `schedaColor(nome)`** per stripe accent e tag dei workout — mai hex hardcoded su nomi di schede dinamici.
- **Hero sempre `#0D0D0D`** anche su pagine light. È intenzionale.
- **Max canvas 820px** centrato. Mobile <640px edge-to-edge.
- **Label da `useApp().schede`** — il pill selector delle schede legge dinamicamente dalla lista utente.
- **Font variables** (`var(--font-barlow)`, `var(--font-barlow-condensed)`) — mai `font-family: 'Barlow'` hardcoded senza fallback.
- **Animazioni staggered** sulle liste (progress bars, workout cards) con `animation-delay` inline.

### DON'T
- **Non mescolare `.nk-*` e `.gt-*`** nella stessa pagina — il dual-system è garantito bug.
- **Non aggiungere shadow o elevation** — la UI è flat. Separazione via bordi e contrasto colore.
- **Non hardcodare "APRILE", "MARZO"** o altri nomi scheda — leggi da `useApp().schede`.
- **Non rimuovere i font Anton/Archivo** da `app/layout.tsx` finché esistono pagine Nike.
- **Non usare `.gt-save-btn` o `.gt-pill` senza `var(--gt-accent)` come token** — se un giorno cambiamo l'accent, deve cambiare ovunque.
- **Non duplicare logica di `weeklyStats.ts` / `dateUtils.ts`** — sono testati e consistenti tra pagine.

---

## 10. Legacy Nike — phase-out plan

Il file `docs/legacy-nike-design.md` (ex `DesignSystemInspiredbyNike.md`) resta nel repo come reference per le pagine non ancora migrate (schede, settimana, mese, anno, login, modals, Nav globale).

**Quando ogni pagina sarà GymTonic:**

1. Migra i modals a `.gt-*` (design ispirato alla home).
2. Elimina le classi `.nk-*` da `app/globals.css` (righe ~1-321 inclusi i token `--nk-*`).
3. Rimuovi `Anton` e `Archivo` da `app/layout.tsx`.
4. Elimina `docs/legacy-nike-design.md`.
5. Aggiorna questa sezione di `DESIGN.md` annotando che la migrazione è completa.

Non fare questi passi finché la migration map al punto 1 non è tutta "GymTonic".

---

## 11. Agent prompt guide

Esempi di prompt per future modifiche — scritti in modo che un agente possa eseguirli leggendo solo `DESIGN.md` + il file target.

> "Estendi la home con una sezione **Obiettivo settimanale**: segue `DESIGN.md` sezione 5, riusa `.gt-card` e `schedaColor()`. Posiziona la sezione dopo il motiv block. La chiave dell'obiettivo viene da `schedaCompletion()` di `lib/weeklyStats.ts`."

> "Migra `app/(app)/settimana/page.tsx` da `.nk-*` a `.gt-*` seguendo `DESIGN.md` e il prototipo in `docs/design/Settimana/project/GymTonic Settimana.html`: wrap nella struttura `.gt-shell > .gt-canvas`, aggiungi `.gt-nav` interna con link attivo `Settimana`, usa `.gt-hero` per il header della settimana corrente, `.gt-card` per la lista. Aggiorna la migration map al punto 1."

> "Aggiorna `components/modals/ConfirmModal.tsx` da stile Nike a GymTonic: overlay scuro, modal `.gt-card` con padding 28px, title con `.gt-section-head` ridotto (24px), primary button `.gt-save-btn`, secondary con `.is-secondary`. Non toccare la logica di gestione ESC/backdrop."

**Regola generale**: se una modifica deve seguire il design, il prompt deve menzionare `DESIGN.md` esplicitamente e la pagina reference `app/(app)/home/page.tsx`.
