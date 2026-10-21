# Changes 22/04/2026

Sessione dedicata alla **completa migrazione UI al design system GymTonic** e alla **sostituzione della navigation** con un pattern mobile-first globale.

A inizio giornata: `/home` e `/settimana` già GymTonic (nav interna `.gt-nav`), le altre tre pagine `(app)` ancora Nike legacy (`.nk-*` + `components/Nav.tsx` global nav).

A fine giornata: tutte e cinque le pagine `(app)` GymTonic, nav globale mobile-first in `AppLayoutClient`, zero pagine Nike rimaste tranne `login` + modali.

---

## Modifiche del giorno

### 1. Review design "GymTonic Home.html" — finding no-op

**Richiesta utente:** "review this design — this could be the new home page […] implement GymTonic Home.html".

**Analisi:** il prototipo `docs/design/Home/project/GymTonic Home.html` e `app/(app)/home/page.tsx` sono la **stessa pagina**. `DESIGN.md` §1 e `docs/design/README.md` lo dichiarano già: la home attuale è la reference implementation del design system GymTonic, costruita *da* quel prototipo.

**Risultato:** implementazione letterale = no-op. Delta effettive (documentate nel plan file):
- A) Theming light/dark/split + accent configurabile presenti solo nel prototipo
- B) Box-shadow canvas + card hover-lift del prototipo — contraddicono "flat, no elevation" di `DESIGN.md`
- C) La produzione è più ricca del prototipo su 10 punti (schedaColor dinamico, fetch motivation, edit mode, paginazione, safe-area iOS, 100dvh, ecc.)

**Decisione utente:** nessun cambio sulla home. → si passa al conflitto nav.

Plan file: `/Users/fabrizio.lo.presti/.claude/plans/review-this-design-streamed-beacon.md`.

---

### 2. Nav globale mobile-first — `GtTabBar` + `GtTopStrip`

**Problema:** l'utente stava prototipando navigazioni mobile-native in `app/(app)/nav-a/` (bottom tab bar) e `/nav-b/` (drawer), completamente diverse dal pattern desktop a barra orizzontale del prototipo. La nav inline `.gt-nav` era già troppo stretta su <480px anche dopo i fix di compattezza. Conflitto di direzione che nella prima analisi avevo mancato.

**Decisione utente:** **opzione Y — nav-a come nav globale cross-page, montata nel layout.**

**File creati:**
| File | Contenuto |
|---|---|
| `components/GtTabBar.tsx` | `<nav>` fixed bottom, grid 5 tab (56px + safe-area-bottom) con icona+label Barlow Condensed 10px. Attivo via `usePathname()`, colore `var(--gt-accent)`. `<Link>` Next.js per il routing. Icone SVG inline per home/settimana/mese/anno/schede. |
| `components/GtTopStrip.tsx` | `<header>` sticky 36px (+ safe-area-top) con logo accent 20×20 a sinistra, titolo pagina derivato da `usePathname()` centrato, pulsante profilo 28×28 a destra che esegue `supabase.auth.signOut()` + redirect `/login`. |

**File modificati:**
| File | Modifica |
|---|---|
| `app/(app)/AppLayoutClient.tsx` | Rimosso `hideGlobalNav`, rimosso import `Nav` Nike. `<GtTopStrip />` + `<main>` + `<GtTabBar />` + `<Toast />` renderizzati sempre. `<main>` ha `paddingBottom: calc(72px + env(safe-area-inset-bottom))` per non finire sotto la tab bar fissa. Nessuna subtraction di altezza: top strip flows naturale. |
| `app/(app)/home/page.tsx` | Rimosso blocco nav inline (30 righe), costanti `ACCENT`/`NAV_LINKS`, funzione `handleLogout`, import `useRouter`/`usePathname`/`supabase`. `LEVEL_LABEL` mantenuta (serve all'hero badge). |
| `app/(app)/settimana/page.tsx` | Stesso trattamento. Mantenuta `const ACCENT` perché la pagina la usa per styling contenuto (badge scheda, heatmap giorni). |
| `app/globals.css` | Eliminate tutte le regole `.gt-nav*` (blocco principale righe 372-402 + block mobile <480px righe 682-687). Classi morte dopo il refactor. |
| `DESIGN.md` | §2 Philosophy: rinominato "Nav interna" → "Nav globale mobile-first bottom-tab-bar + top strip". §1 migration map: aggiunti `GtTabBar` e `GtTopStrip`, rimossa riga `components/Nav.tsx`. §5 aggiornato con i due nuovi componenti React. |

**File eliminato:**
- `components/Nav.tsx` — Nike global nav (swoosh logo). Unico importer era `AppLayoutClient`, che non lo usa più.

**Pattern introdotto:** il top strip NON è fixed, flows naturale (come in nav-a); solo la bottom tab bar è fixed. Questo evita calcoli complessi di min-height su `<main>`.

---

### 3. Migrazione `/mese` a GymTonic

**Prototipo di riferimento:** `docs/design/Home/project/GymTonic Mese.html`.

**File sostituito:** `app/(app)/mese/page.tsx`. Vecchia versione: Nike legacy con `Chart.js` + `MonthMap` component + `WorkoutRow` component + 2 stats.

**Nuova struttura:**
- **Hero dark** (`.gt-hero`): month nav prev/next (disabled sul futuro), titolo `MESI[tm]` + `ty`, pill "Mese corrente" su offset 0, 3 metriche (Allenamenti / Minuti totali / Media durata) con font-size auto-adattivo 48→68px in base a `value.length`.
- **Heatmap calendar** inline (componente `<Heatmap>`): grid 7 colonne × N righe (5 o 6 a seconda del mese). Prima colonna = Lunedì (shift `(getDay() + 6) % 7`). Celle 36px con `background: ${ACCENT}${alpha}` proporzionale a `dayMinutes / maxDayMin`, border accent per oggi, barra 3px in basso con `gtFillBar`. `title=` nativo per tooltip hover.
- **Progresso settimanale** (light): titolo `.gt-section-head` + toggle Min/Sessioni (pill group con accent highlight), 5-6 barre verticali calcolate dinamicamente a partire dal `grid` di settimane, animazione `gtFadeUp` staggered 0.06s.
- **Lista allenamenti**: `.gt-card` riusato identico alla home, `schedaColor()` per stripe+tag, `formatDateIT()` per data. Read-only (no edit/delete in-page — coerente con Settimana).

**Dipendenze legacy rimosse:** `import { Chart, registerables } from 'chart.js'`, `import WorkoutRow from '@/components/WorkoutRow'`, `import MonthMap from '@/components/MonthMap'`. Chart.js rimane nelle dependencies perché usato da `StoricoPesiModal`.

---

### 4. Migrazione `/anno` a GymTonic

**Prototipo di riferimento:** `docs/design/Home/project/GymTonic Anno.html`.

**File sostituito:** `app/(app)/anno/page.tsx`. Vecchia versione: Nike legacy con `Chart.js` + `WorkoutRow` + 2 stats.

**Nuova struttura:**
- **Hero dark**: year nav prev/next, "ANNO" + year 22px 800, pill "Anno corrente", 3 metriche (Allenamenti / Minuti totali / Mesi attivi).
- **YearStrip** inline: heatmap 12 mesi orizzontale (grid 12 colonne), celle 56px con count e `Math.round(m.minutes/60)h` centrati, `background: ${ACCENT}${alpha}` calcolato come `Math.round((0.15 + intensity * 0.75) * 255)`, border 1.5px accent per mese corrente, label uppercase sotto.
- **Progressi mensili** (light): toggle Min/Sessioni + 12 barre verticali in `<MonthlyBars>`, chart height 120px, `gtFadeUp` staggered 0.04s.
- **Riepilogo mensile** (light): righe per ogni mese attivo con barra verticale 4×32px in accent (opacity `0.5 + idx/11 * 0.5` per gradazione), count/min allineati a destra in Barlow Condensed 800 22px, divider tra righe.
- **Lista allenamenti**: `.gt-card` come altrove, `animationDelay: Math.min(0.03*i, 0.6)` per cappare lo stagger sulle liste lunghe.

**Dipendenze legacy rimosse:** stesso set di Mese (Chart.js import, WorkoutRow).

---

### 5. Migrazione `/schede` a GymTonic

**Prototipo di riferimento:** **nessuno** — il bundle di handoff non include Schede. Design inventato in-line con le regole del sistema.

**File sostituito:** `app/(app)/schede/page.tsx`. Vecchia versione: Nike con `.nk-dnd-row`, `.nk-drop-zone`, `.nk-pill`, `.nk-btn-*`, `.nk-icon-btn`, `.nk-divider-strong`.

**Design prodotto:**
- **Azioni** (inizialmente preceduta da hero dark con 3 stats, poi hero rimosso su richiesta — vedi iterazione sotto): `.gt-section-head` "Schede" + pulsante `.gt-save-btn` compatto "+ Nuova".
- **Drop-zone PDF**: `padding 24x20`, dashed border `var(--gt-input-border)` → `var(--gt-accent)` su `dragover`/`pdfLoading`, background `var(--gt-input-bg)` → `${ACCENT}14` su hover. Stesso flusso di import (steps "Lettura/Analisi/Strutturazione", AbortController 55s, toast result) portato identico — solo il wrapper visuale è cambiato.
- **Scheda card**: `article` con stripe 4px (`schedaColor().text`), chevron rotante 0°/90° su `isOpen`, pill `gt-card-tag` col colore dinamico, meta "mese · N tipi · N esercizi", 3 icon button (duplica/modifica/elimina). Expanded: `borderTop: 1px solid var(--gt-border)` sopra i tipi nested.
- **Tipi**: label uppercase Barlow Condensed 13px + 2 azioni + lista esercizi, bottone tratteggiato "+ Aggiungi esercizio".
- **Esercizio (drag&drop)**: riga in `var(--gt-input-bg)` con grip icon, titolo Barlow 600, tags concatenati `ripetizioni · carico · recupero`, note italic, 3 azioni (storico, modifica, elimina). Stato `draggedId` in React state (al posto di `.is-dragging` class), opacity 0.4 durante drag.
- **Modali**: restano Nike (`SchedaModal`, `TipoModal`, `EsercizioModal`, `StoricoPesiModal`, `ConfirmModal`). Migrazione modali → task separato, come da `DESIGN.md` §10.
- **Helper inline**: `<IconBtn>` (con flag `danger`), `outlineBtn()` (css factory per i bottoni tratteggiati compact/full-width).

**Iterazione sullo stesso giorno (feedback utente):** hero dark rimosso perché ridondante su una pagina di gestione. Rimossi:
- `<section className="gt-hero">` + 3 Metric + kicker "Le tue schede"
- `<hr className="gt-divider" />` che lo separava dalle azioni
- helper function `Metric` (orfana dopo la rimozione)
- calcoli `totalTipi` / `totalEsercizi` (orfani)

Pagina ora inizia direttamente dalla riga azioni (padding-top 28px), poi drop-zone, poi lista.

---

### 6. Aggiornamenti `DESIGN.md`

Tutte e tre le righe nella migration map §1 aggiornate da "Nike legacy — Da migrare" a **GymTonic**:
- `app/(app)/mese/page.tsx` — "Hero con month nav + 3 metriche + heatmap 5×7, barre settimanali, lista `.gt-card`"
- `app/(app)/anno/page.tsx` — "Hero con year nav + 3 metriche + year-strip 12 mesi, barre mensili, riepilogo, lista `.gt-card`"
- `app/(app)/schede/page.tsx` — "Drop-zone import PDF, lista schede espandibili con stripe colorato, nested tipi/esercizi con drag&drop. Modali ancora Nike"

§2 Philosophy aggiornato con nav globale. §5 documenta i due nuovi componenti React.

---

## Azioni suggerite prima del commit

Elenco raccolto a fine sessione — cleanup che ha senso affrontare insieme alla migrazione per evitare debito tecnico immediato:

1. **Cancellare componenti orfani** dopo la migrazione Mese/Anno:
   - `components/MonthMap.tsx` — 0 ref nel codice live
   - `components/WorkoutRow.tsx` — 0 ref nel codice live

2. **Cancellare prototipi nav-a / nav-b** (`app/(app)/nav-a/`, `app/(app)/nav-b/`): con la nav globale attiva, queste route hanno **doppia nav** (globale + loro inline). La scelta di design è caduta su nav-a che è stato promosso a `GtTabBar`, quindi le preview isolate non servono più.

3. **`tsconfig.tsbuildinfo`**: untracked ma è un artefatto TS incrementale. Aggiungerlo a `.gitignore` (o verificare se già presente).

4. **`.claude/worktrees/`**, **`.claude/settings.json`**: untracked, specifici di sessione. Verificare `.gitignore`.

5. **`.nk-*` in `globals.css`**: 86 regole, 102 usi live rimasti (login + 6 modali). Non toccare in questo commit — migrazione modali e login è task esplicitamente separato in `DESIGN.md` §10.

6. **`Chart.js`** in dependencies: resta perché `StoricoPesiModal` lo usa ancora.

**Struttura commit consigliata (atomica, 6 commit):**
```
refactor(nav): nav globale mobile-first (GtTabBar + GtTopStrip)
feat(mese): migrazione a GymTonic
feat(anno): migrazione a GymTonic
feat(schede): migrazione a GymTonic
chore: rimuovi componenti Nike orfani (MonthMap, WorkoutRow)
chore: rimuovi prototipi nav-a/nav-b
docs: changelog 22/04/2026
```

Alternativa monolitica (se si preferisce un singolo commit): `refactor(ui): migrazione GymTonic completa + nav globale`, descrizione dettagliata nel body.

---

## Stato migrazione UI

| Pagina / componente | Design | Status |
|---|---|---|
| `app/(app)/home/page.tsx` | GymTonic | ✅ Migrata (reference) |
| `app/(app)/settimana/page.tsx` | GymTonic | ✅ Migrata |
| `app/(app)/mese/page.tsx` | GymTonic | ✅ **Migrata oggi** |
| `app/(app)/anno/page.tsx` | GymTonic | ✅ **Migrata oggi** |
| `app/(app)/schede/page.tsx` | GymTonic | ✅ **Migrata oggi** |
| `app/(auth)/login/page.tsx` | Nike | Da migrare |
| `components/GtTabBar.tsx` | GymTonic | ✅ **Nuovo oggi** |
| `components/GtTopStrip.tsx` | GymTonic | ✅ **Nuovo oggi** |
| `components/Nav.tsx` | — | ✅ **Eliminato oggi** (Nike) |
| `components/modals/*.tsx` | Nike | Da migrare (task separato) |
| `components/MonthMap.tsx` | — | ⚠️ Orfano — cancellare |
| `components/WorkoutRow.tsx` | — | ⚠️ Orfano — cancellare |

---

## Riepilogo

| Metrica | Valore |
|---|---|
| Pagine migrate a GymTonic oggi | 3 (mese, anno, schede) |
| Componenti React nuovi | 2 (`GtTabBar`, `GtTopStrip`) |
| Componenti React eliminati | 1 (`components/Nav.tsx`) |
| Componenti orfani individuati (non ancora cancellati) | 2 (`MonthMap`, `WorkoutRow`) |
| Pattern di navigazione unificati (prima → dopo) | 3 → 1 (inline `.gt-nav` + Nike globale → `GtTabBar` + `GtTopStrip` globali) |
| Regole CSS rimosse | 7 (`.gt-nav*` desktop + mobile) |
| Dipendenze rimosse da mese/anno/schede | `chart.js`, `MonthMap`, `WorkoutRow` (import level — Chart.js resta nelle deps per StoricoPesiModal) |
| Pagine `(app)` ancora Nike | 0 |
| Classi `.gt-*` totali nel sistema | ~50 (invariato — nessuna nuova classe aggiunta, tutta la grafica mese/anno/schede è inline styles con token `--gt-*`) |
| `DESIGN.md` — aggiornamenti | Migration map (3 righe), Philosophy §2 (nav), File map §8 (nuovi componenti) |
| Type-check errori | 0 |
| Commit del giorno | 0 (tutto uncommitted a fine sessione — cleanup da fare prima) |
