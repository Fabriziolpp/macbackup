# Changelog — 23/06/2026

Riepilogo del lavoro su **F6**, **FIX5b**, **R4**, **F8** e l'allineamento di
**BACKLOG.md**. Tutti i commit elencati sono su `main` e pushati su `origin/main`.

> Nota di scope: questo changelog copre esattamente le attività richieste
> (F6, FIX5b, R4, F8, BACKLOG). Il lavoro **FIX6** (blocchi circuito AMRAP,
> Fase 1+2) è volutamente escluso: la sua spec prevedeva un handoff isolato
> ("non aggiornare BACKLOG.md per questa fix").

---

## Panoramica commit

| Commit | Data | Ambito |
|---|---|---|
| `13edf15` | 2026-05-29 | FIX5 timer + **F6 Summary** + Q1-infra (data layer) |
| `37d25b4` | 2026-06-12 | **BACKLOG.md** — fonte di verità |
| `2589a96` | 2026-06-21 | **FIX5b** — modalità recupero countdown/stopwatch |
| `693e972` | 2026-06-21 | **R4** — riordino esercizi (ReorderModal) |
| `6647449` | 2026-06-21 | **F8** — polish, a11y, edge case flusso Live |

---

## F6 — Summary screen (`13edf15`)

Schermata di riepilogo a fine allenamento Live e relativo salvataggio.

**Cosa fa:**
- Hero "Allenamento completato" + 3 stat card (Durata, Esercizi, Serie) calcolate
  dalla sessione attiva.
- Box note (textarea) per annotazioni post-workout.
- **Salva**: costruisce il payload via `buildWorkoutPayload` e fa `POST /api/workouts`
  con `source: 'live'` ed `exerciseResults` (JSONB Q1-infra).
- **Fallback offline**: se il POST fallisce, accoda in IndexedDB
  (`enqueuePendingWorkout`) e ritenta al prossimo avvio (`AppLayoutClient`).
- Discard con conferma.

**File principali:** `app/(app)/live/summary/page.tsx`, `lib/buildWorkoutPayload.ts`,
`lib/liveTypes.ts` (shape `ExerciseResult`/`SetResult`), `app/api/workouts/route.ts`.
Spec di riferimento: `docs/SPEC_FIX5_Q1infra_F6.md`.

**Fix prod collegato (questa sessione):** il salvataggio Live falliva in
produzione perché la migration `q1_infra` non era stata applicata al DB remoto →
mancava `workouts.exercise_results`, ogni POST andava in 500 e cadeva nel fallback
locale (sembrava "non salva"). Migration applicata e verificata su Supabase prod;
i workout in coda locale si sincronizzano da soli al riavvio. Da quel momento F6
salva correttamente end-to-end.

---

## FIX5b — Modalità recupero countdown/stopwatch (`2589a96`)

Estende il timer di recupero (FIX5) gestendo i recuperi non-numerici.

**Modello:** `parseRecupero()` ora restituisce `{ seconds, mode }` con
`mode: 'countdown' | 'stopwatch'` — i 5 casi reali collassano in 2 comportamenti.

| Variante `recupero` | mode | seconds |
|---|---|---|
| `60`, `90`, `1'` | countdown | n |
| `60"/90"` (range) | countdown | min (60) |
| `Resto del minuto` | countdown | 60 (fallback numerico) |
| `Completo` | **stopwatch** | null |
| `//`, vuoto | countdown | 90 (default) |

**Comportamento:**
- `stopwatch` ("Completo"): l'anello non si riempie, il tempo **sale**, l'utente
  chiude con "Start Next"; niente vibrazione/glow/override ±15". `restPlanned` = null
  nel payload (escluso dal KPI "recupero anomalo").
- `countdown`: comportamento FIX5 invariato.

**File:** `lib/parseExerciseSpec.ts` (`parseRecupero`, tipo `RestMode`),
`lib/liveStore.ts` (`buildSessionExercises` con `restMode`), `lib/liveTypes.ts`
(`SessionExercise.restMode`), `components/live/TimerRing.tsx` (variante stopwatch),
`lib/buildWorkoutPayload.ts` (`restPlanned` null in stopwatch).

---

## R4 — Riordino esercizi via ReorderModal (`693e972`)

Sostituisce il drag&drop HTML5 (non funzionante su iOS touch) con un modal a frecce.

- **Nuovo** `components/modals/ReorderModal.tsx`: generico (`items: {id,label}[]` +
  `onSave(orderedIds)`), frecce su/giù, su disabilitato sul primo elemento, giù
  sull'ultimo.
- `schede/archivio`: rimossi tutti gli handler drag + il grip a 6 punti; trigger ↕
  nell'header del tipo (solo se ≥2 esercizi); riordino in memoria, **un solo**
  `PUT /reorder` alla conferma (endpoint riusato così com'era).

**File:** `components/modals/ReorderModal.tsx` (nuovo),
`app/(app)/schede/archivio/page.tsx`.

---

## F8 — Polish, a11y ed edge case flusso Live (`6647449`)

- **Sessione stale > 24h**: all'hydrate, se la sessione è iniziata da oltre 24h →
  `ConfirmModal` "Riprendi / Scarta" (niente cancellazione silenziosa).
- **Collisione nuova sessione**: "Inizia allenamento" con una sessione già in corso
  ora apre un `ConfirmModal` prima di sovrascrivere (era overwrite silenzioso =
  perdita dati).
- **a11y aria-live**: annuncio "Serie N completata/annullata" nella workout page.
- **prefers-reduced-motion globale** in `globals.css`: neutralizza le animazioni
  inline di tutte le schermate Live (i selettori scoped esistenti non le coprivano).
- **Notification API locale** a fine recupero quando l'app è in background
  (push completo rinviato a R3).
- `ConfirmModal` esteso con `kicker`/`confirmLabel`/`cancelLabel`/`confirmVariant`
  opzionali (retro-compatibile).

**File:** `app/(app)/live/page.tsx`, `app/(app)/live/workout/page.tsx`,
`app/globals.css`, `components/live/TimerRing.tsx`,
`components/modals/ConfirmModal.tsx`.

---

## BACKLOG.md — fonte di verità (`37d25b4`)

`docs/BACKLOG.md` reso il documento canonico per feature aperte, decisioni prese e
lavoro completato. Correzione di allineamento: FIX5 ed F6 risultavano "da committare"
ma erano già in `13edf15` → riportati a ✅.

---

## Stato

Tutti i commit sopra sono pushati su `origin/main`. Build di produzione verde,
flusso Live validato a runtime.
