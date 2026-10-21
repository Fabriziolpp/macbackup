# Handoff — Vi.To (allenamenti-app)

> Documento di passaggio di consegne per una sessione Claude che prende in mano il
> backlog. Autosufficiente: leggi questo + `docs/BACKLOG.md` e hai il contesto per
> lavorare. Aggiornato: **2026-07-05**.

---

## 1. Cos'è il progetto

App di tracking allenamenti (brand attuale "ALLENAMENTI", da rinominare **Vi.To**).
L'utente importa schede da PDF, le esegue in modalità **Live** (timer, serie, circuiti
AMRAP), e lo storico alimenta analytics/progressioni.

- **Prod:** `allenamenti-app.vercel.app`
- **Utente/owner:** fabrizio.lopresti@gmail.com (trainer + trainee sullo stesso account per ora)
- **Registrazione:** default Supabase Auth (email+password), nessun onboarding/profilo — da costruire (R1/R2).

## 2. Stack & infrastruttura

| Cosa | Dettaglio |
|---|---|
| Framework | Next.js **16.2.2** (App Router), React **19.2.4** |
| DB/Auth | Supabase — progetto **`allenamenti-app`** ref `lzwyhokkvzxlnubsenmf` (ACTIVE). *(esiste anche un progetto INACTIVE `owygiihkhivhgpqsjwbi`, non usato)* |
| State Live | **zustand 5** (`lib/liveStore.ts`) + persistenza **IndexedDB** (`idb 8`, `lib/idb.ts`) |
| Import PDF | **Anthropic SDK** (`@anthropic-ai/sdk`) — parsing LLM in `app/api/import-pdf/route.ts` |
| Mobile | Capacitor iOS 8 (versione nativa pianificata; vincola R3/F7) |
| Deploy | Vercel |

Migration applicate a prod (in `supabase/migrations/`):
`20260429_live_mode` · `20260528_q1_infra` · `20260621_fix6_blocchi`.

## 3. Modello dati (relazionale, id TEXT via `newId()`)

```
schede
  └─ tipi (= "giorni")
       ├─ esercizi (blocco_id NULL = esercizio singolo)
       └─ blocchi (FIX6: circuito) ── esercizi (blocco_id = blocco)
workouts  → exercise_results JSONB (Q1-infra + FIX6 rounds[])
exercises → tabella canonica UUID (Q1-infra, per analytics cross-scheda)
```

- GET `/api/schede` assembla `tipi(*, esercizi(*), blocchi(*))` e partiziona per `blocco_id`.
- `workouts.exercise_results` è la sorgente delle analytics Q1 (set-based per esercizi
  singoli, `rounds[]` per movimenti AMRAP).

## 4. Architettura flusso Live (chiave per gran parte del backlog)

Route: `/live` (setup) → `/live/countdown` → `/live/workout` → `/live/summary`
(+ `/live/pausa`, `/live/emom`).

- **`lib/liveStore.ts`** — sessione a **segmenti**: `segments: (SessionSegment)[]` dove
  ogni segmento è `{kind:'exercise'}` (flusso a serie) o `{kind:'amrap'}` (blocco circuito
  con countdown + round-logging). `currentSegmentIdx` naviga. Azioni: `toggleSet`,
  `goPrev/NextSegment`, timer recupero, e per AMRAP `startBlockTimer`/`completeRound`/
  `updateRoundEntry`/`removeRound`.
- **`lib/liveTypes.ts`** — `ActiveSession`, `SessionExercise`, `SessionBlock`, `RoundLog`,
  `ExerciseResult` (payload). Helper `currentExercise()`.
- **`components/live/`** — `TimerRing.tsx` (recupero countdown/stopwatch, FIX5b),
  `AmrapBlock.tsx` (pagina AMRAP, FIX6 F2).
- **`lib/buildWorkoutPayload.ts`** — da sessione a payload `POST /api/workouts`.
- **`lib/parseExerciseSpec.ts`** — parsing reps/carico/recupero (multi-settimana, NsxM,
  `parseRecupero` → `{seconds, mode}`).

## 5. Stato: fatto vs FIX6 (⚠ discrepanza)

**Completato e pushato su `main`** (HEAD `abda57c`):
F0–F4, F9, Q1-infra, FIX5, F6, **R4** (`693e972`), **FIX5b** (`2589a96`),
**F8** (`6647449`), **FIX6 Fase 1** (`d9d60f0`), **FIX6 Fase 2** (`0edcb10`).

⚠ **`docs/BACKLOG.md` è disallineato su FIX6:** lo elenca ancora come "Fix critico aperto"
(sez. FIX6, ~riga 169) perché la spec imponeva un handoff isolato ("non aggiornare
BACKLOG per questa fix"). **In realtà FIX6 è DONE e in prod** — parsing blocchi circuito,
viste Schede (una card per blocco, una tab per giorno), Live AMRAP con countdown e
round-logging. Vedi `docs/changes230626.md` per il dettaglio.
→ **Prima azione consigliata:** spostare FIX6 nei Completati in BACKLOG.md.

**FIX6 — fix minori pendenti** (rinviate dall'utente a dopo un test approfondito):
non ancora dettagliate; da raccogliere col test prima di implementarle.

## 6. Backlog aperto — priorità e dipendenze

Ordine consigliato per dipendenze: **R1 → G1 → R2** (sbloccano R2/INV1), poi il resto.

| ID | Cosa | Priorità / note |
|---|---|---|
| **R1** | Menu profilo (Profilo/Preferenze/Logout) | Prerequisito di INV1 e R2. Nessun blocker tecnico. |
| **G1** | Polish mobile readability (token, touch target) | "prima di R2". Pagina pilota: Live. Coordina colori con H1. |
| **R2** | Onboarding nuovi utenti | Priorità alta. Dip: R1, R3, G1, INV1. |
| **F10** | Countdown timer di lavoro (isometrici/tabata) | Dip: FIX5 ✅. Migration `duration_seconds`/`tipo` su `esercizi`. |
| **R3** | Notifiche PWA | Scegliere web-push vs Capacitor PRIMA di iniziare. |
| **INV1** | Invita un amico (referral) | ⚠ coordinare con R2 (cattura `?ref=` nel flusso registrazione). |
| **H1** | Attività "Altro" + barra settimanale | 7 decisioni aperte; colori con G1; migration `category`/`activity_type`. |
| **Q1** | Progressioni + messaggi | 9 KPI definiti; data layer pronto (exercise_results). |
| **SEC1** | Vincolo cross-user FK exercises | Dormiente; RLS sufficiente ora. Rivalutare pre multi-tenant. |
| **INV2/INV3** | Notifica invitato / Rewards | Futuri. |
| **F7** | VoiceRecorder | ⏸ **Deprioritizzato: dopo la versione iOS** (Web Speech non gira su WKWebView). |

Dettaglio completo, decisioni prese e aperte per ciascun item: **`docs/BACKLOG.md`**.

## 7. Convenzioni di lavoro (rispettarle)

- **`docs/BACKLOG.md` è la fonte di verità.** Se qualcosa contraddice il file, il file vince.
- **Committa `docs/BACKLOG.md` dopo OGNI modifica**, in un commit dedicato con prefisso
  `docs:`. Non lasciarlo non committato. (Convenzione dell'utente dal 2026-06-23.)
- **Metodo per gli item:** rivedere una voce alla volta, presentare le decisioni aperte con
  raccomandazioni, far decidere l'utente, scrivere l'esito (con data) nel backlog, committare.
- **Commit:** separati per feature/fase; messaggi con `Co-Authored-By: Claude ...`.
  Branch `main` (workflow del repo committa direttamente su main).
- **Migration Supabase:** additiva + `IF NOT EXISTS` + nullable; applicare a prod via MCP
  Supabase e verificare le colonne dopo.
- **File da NON committare** (residuo abituale nel working tree): `.claude/settings*.json`,
  `next-env.d.ts`.

## 8. Come far girare / verificare

- Dev: `npm run dev` (il progetto rileva un server già attivo su :3000 e ci reindirizza).
- Validazione modifiche: `npx tsc --noEmit` + `npm run build` (nessuno script di lint dedicato).
- Verifica DB: MCP Supabase (`list_tables`, `execute_sql`, `apply_migration`) sul ref
  `lzwyhokkvzxlnubsenmf`.
- Verifica runtime tipica: caricare un PDF con giorni AMRAP e fare una Live end-to-end
  fino a Summary → salvataggio workout.

## 9. Riferimenti

- `docs/BACKLOG.md` — backlog canonico (dettaglio decisioni).
- `docs/SPEC_FIX5_Q1infra_F6.md` — spec tecnica FIX5/Q1-infra/F6.
- `docs/changes230626.md` — changelog R4/FIX5b/F8/F6.
