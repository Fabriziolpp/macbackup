# Vi.To — Spec di sviluppo: FIX5 · Q1-infra · F6

> Documento generato per Claude Code (Warp).  
> Contiene tutte le decisioni prese, le specifiche tecniche e l'ordine di esecuzione consigliato.  
> Lingua: italiano. Stack: React + Supabase + IndexedDB (Dexie). Deploy: Vercel.

---

## Ordine di esecuzione consigliato

```
1. Q1-infra   → schema change Supabase + tabella exercises
2. FIX5       → timer recupero (legge dalla scheda, due varianti grafiche)
3. F6         → Summary screen (usa il nuovo schema Q1-infra per il POST)
```

Q1-infra va prima perché il POST di F6 deve già scrivere nel formato corretto.  
FIX5 è indipendente ma è un bug critico — si può fare in parallelo se si lavora su branch separati.

---

## 1. Q1-infra — Data model exercise results

### Obiettivo
Creare l'infrastruttura dati che abilita gli analytics futuri (Q1) e che F6 usa per il POST.  
Decisione adottata: **Opzione B — campo JSONB `exercise_results`** sulla tabella `workouts`.

### 1.1 Migrazione Supabase

Aggiungere alla tabella `workouts` il campo:

```sql
ALTER TABLE workouts
ADD COLUMN exercise_results JSONB;
```

Nessuna migrazione dei dati storici. I workout esistenti avranno `exercise_results = null` — accettato.  
Le analytics Q1 lavoreranno solo sui workout salvati dopo questa migrazione.

### 1.2 Struttura JSONB exercise_results

```typescript
type ExerciseResult = {
  exerciseId: string;          // UUID dalla tabella exercises (vedi §1.3)
  exerciseName: string;        // Stringa di fallback leggibile
  setsPlanned: number;
  setsCompleted: number;
  restPlanned: number;         // Secondi. Valore letto dalla scheda.
  restActual: number | null;   // Secondi. Solo per source='live'. Media sull'esercizio.
  note: string | null;         // Testo libero (input manuale o trascrizione vocale F7)
  sets: SetResult[];
};

type SetResult = {
  setN: number;
  repsPlanned: number;
  repsActual: number;
  load: number | null;         // kg. Null se non applicabile (es. esercizio a corpo libero)
};

// Il campo workouts.exercise_results è un array di ExerciseResult
type WorkoutExerciseResults = ExerciseResult[];
```

### 1.3 Tabella exercises

Creare una tabella `exercises` con UUID stabile per abilitare confronti cross-scheda.

```sql
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- RLS
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user owns exercises"
  ON exercises FOR ALL
  USING (auth.uid() = user_id);
```

**Nota migrazione:** gli esercizi esistenti nelle schede sono stringhe libere — NON fare matching automatico per nome (rischio typo, maiuscole inconsistenti). Taglio netto: dal deploy in poi le schede referenziano `exerciseId`. Lo storico pre-migrazione resta con stringhe; le analytics cross-scheda partono da zero.

### 1.4 Aggiornare le schede

Le schede devono esporre `exerciseId` (FK verso `exercises.id`) oltre al nome.  
Verificare lo schema attuale della tabella `schede` / `esercizi_scheda` e aggiungere la FK se non presente.

```sql
-- Esempio — adattare ai nomi reali delle tabelle
ALTER TABLE scheda_esercizi
ADD COLUMN exercise_id UUID REFERENCES exercises(id);
```

### 1.5 Aggiornare il campo restPlanned

Ogni esercizio della scheda deve avere un campo `rest_seconds` (recupero in secondi).  
Questo campo viene letto da FIX5 per il timer e salvato in `exercise_results[n].restPlanned`.

```sql
ALTER TABLE scheda_esercizi
ADD COLUMN rest_seconds INTEGER;
-- Null = usa il default utente da Preferenze (vedi FIX5)
```

---

## 2. FIX5 — Timer recupero

### Obiettivo
Eliminare il valore hardcoded 90". Il timer legge `rest_seconds` dalla scheda.  
Differenziare visivamente il timer inter-serie (stessa esercizio) dal timer inter-esercizio.

### 2.1 Sorgente del valore (3 livelli, aggiornato 2026-05-28)

```typescript
function getRestDuration(
  exercise: SchedaEsercizio,
  week: number,                         // settimana del programma selezionata in setup
  userDefaultRest: number               // da Preferenze utente, default 90
): number {
  return exercise.rest_seconds
    ?? parseRecuperoSeconds(exercise.recupero, week)
    ?? userDefaultRest;
}
```

**Fallback a 3 livelli** (deviation rispetto alla v originale a 2 livelli, approvata 2026-05-28):

1. **`rest_seconds`** (colonna numerica nuova, Q1-infra) — sorgente preferita per nuove schede / esercizi editati post Q1-infra.
2. **Parser su `recupero` string esistente** (`parseRecuperoSeconds` in `lib/parseExerciseSpec.ts`) — preserva il valore delle schede pre-migrazione che hanno il recupero solo come stringa (es. `'60"'`, `'90"/120"'`). Senza questo livello, dopo il deploy ogni esercizio esistente userebbe 90s di default invece dei valori già presenti nel campo `recupero`.
3. **Default utente** — `DEFAULT_REST_SECONDS = 90` come costante in config. Sostituibile da `user_preferences` quando R1/Preferenze sarà live.

#### Formati `recupero` string supportati da `parseRecuperoSeconds`

Audit dei valori reali su `data.json` (9 varianti distinte):

| Input | Output | Note |
|---|---|---|
| `''` | `null` | Empty → fallback default |
| `'//'` | `null` | Separator AMRAP/Circuito = "non applicabile" |
| `'60"'`, `'90"'`, `'120"'` | `60`, `90`, `120` | Notazione standard con doppia virgoletta |
| `'60"/90"'` (week=1) | `60` | Multi-segment per settimana (position-based) |
| `'60"/90"'` (week=2) | `90` | Idem |
| `'60"/90"'` (week=3+) | `90` | Out-of-range → ultimo segmento |
| `'90"/120"'` | `90` o `120` | Idem multi-segment |
| `'Completo'` | `null` | Semantica "recupero pieno" → fallback default |
| `'Resto del minuto'` | `null` | Semantica EMOM → fallback default |

Forme aggiuntive supportate per robustezza vs input manuale / PDF importer:

- `'90s'`, `'90 sec'`, `'90sec.'`, `'90'` → 90
- `'2min'`, `'1.5min'`, `'1,5 min'`, `'1 m'` → 120, 90, 90, 60
- `'1\''` (apostrofo = minuti, notazione `1'30"`) → 60

Quando `recupero` ha più segmenti separati da `/`, il parser usa la `week` passata come argomento per scegliere il segmento giusto (position-based, 1-indexed). Stessa convenzione di `parseExerciseSpec` per `reps`/`carico` ma con separator diverso (`/` posizionale invece di `<N>a sett. <spec>`).

### 2.2 Due varianti grafiche del timer

| Contesto | Colore arc | Etichetta | Token CSS |
|---|---|---|---|
| Inter-serie (stessa esercizio) | Amber `--gt-timer-series` | "Recupero serie" | `--gt-color-amber` |
| Inter-esercizio | Teal `--gt-timer-exercise` | "Recupero esercizio" | `--gt-color-teal` |

Il componente timer riceve una prop `variant: 'series' | 'exercise'` che determina colore e label.

```typescript
type TimerVariant = 'series' | 'exercise';

interface RecoveryTimerProps {
  duration: number;          // secondi totali
  variant: TimerVariant;     // 'series' | 'exercise'
  onComplete: () => void;
  onAdjust?: (delta: number) => void;  // per override +15/-15
}
```

### 2.3 Override al volo (+15" / -15")

Due bottoni tap rapido visibili durante il countdown. Non aprono picker — solo incremento/decremento diretto.

```typescript
// Logica override
const [currentDuration, setCurrentDuration] = useState(duration);

function handleAdjust(delta: number) {
  setCurrentDuration(prev => Math.max(0, prev + delta));
  // Il timer continua dal punto corrente, durata totale aggiornata
}
```

UI: bottoni `-15"` e `+15"` posizionati ai lati del cerchio timer. Dimensione touch target minimo 44px.

### 2.4 Salvataggio restActual

Quando il timer termina (o l'utente lo salta), registrare il tempo effettivo trascorso in `ActiveSession` (IndexedDB):

```typescript
// In ActiveSession IDB — aggiungere per ogni esercizio
restActualSeconds: number[];  // un valore per ogni intervallo di recupero dell'esercizio
// La media viene calcolata al momento del POST in F6:
// restActual = avg(restActualSeconds)
```

---

## 3. F6 — Live Summary screen

### Obiettivo
Schermata di chiusura allenamento live. Mostra riepilogo, note vocali (F7), e salva su Supabase via POST.

### 3.1 Route
`/live/summary` — raggiunta al termine dell'allenamento live.

### 3.2 Layout

```
┌─────────────────────────────┐
│  HERO DARK                  │
│  [checkDraw SVG animato]    │  ← animazione al mount
│  [glow radiale]             │
│  [heartbeat sottile]        │
│                             │
│  "Allenamento completato"   │
├─────────────────────────────┤
│  STATS ROW (3 card)         │
│  [Durata] [Esercizi X/Y] [Serie X/Y] │
│                             │
│  // Futuro (quando Q1 live):│
│  // aggiungere Carico totale│
├─────────────────────────────┤
│  NOTE VOCALI (F7)           │
│  [componente VoiceRecorder] │
├─────────────────────────────┤
│  [Salva allenamento]  ← CTA primaria
│  [Scarta]             ← secondaria, distruttiva
└─────────────────────────────┘
```

### 3.3 Animazioni hero

Rispettare `prefers-reduced-motion`: se attivo, saltare heartbeat e glow, mostrare solo checkDraw statico.

```typescript
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;
```

- **checkDraw**: SVG path con `strokeDashoffset` animato da 100% a 0% in 600ms ease-out
- **glow**: `box-shadow` radiale che pulsa da 0 a 24px in 1s ease-in-out, poi si ferma
- **heartbeat**: scala da 1 a 1.04 a 1 in 800ms, 2 ripetizioni poi stop

### 3.4 Lettura dati da IndexedDB

```typescript
// Al mount della Summary, leggere ActiveSession da IDB
const session = await db.activeSessions.get(sessionId);

const stats = {
  duration: session.endTime - session.startTime,           // ms → formattare in mm:ss
  exercisesCompleted: session.exercises.filter(e => e.completed).length,
  exercisesTotal: session.exercises.length,
  setsCompleted: session.exercises.reduce((acc, e) => acc + e.setsCompleted, 0),
  setsTotal: session.exercises.reduce((acc, e) => acc + e.setsTotal, 0),
};
```

### 3.5 Costruzione payload POST

```typescript
async function buildWorkoutPayload(
  session: ActiveSession,
  voiceNote: string | null
): Promise<WorkoutInsert> {

  const exerciseResults: ExerciseResult[] = session.exercises.map(ex => ({
    exerciseId: ex.exerciseId,
    exerciseName: ex.exerciseName,
    setsPlanned: ex.setsTotal,
    setsCompleted: ex.setsCompleted,
    restPlanned: ex.restPlanned,
    restActual: ex.restActualSeconds.length > 0
      ? Math.round(ex.restActualSeconds.reduce((a, b) => a + b, 0) / ex.restActualSeconds.length)
      : null,
    note: ex.note ?? null,
    sets: ex.setsDone.map((s, i) => ({
      setN: i + 1,
      repsPlanned: s.repsPlanned,
      repsActual: s.repsActual,
      load: s.load ?? null,
    })),
  }));

  return {
    user_id: currentUser.id,
    date: new Date().toISOString(),
    scheda: session.schedaName,
    tipo: session.schedaTipo,
    source: 'live',
    duration_seconds: Math.round((session.endTime - session.startTime) / 1000),
    sets_completed: stats.setsCompleted,
    sets_total: stats.setsTotal,
    exercises_completed: stats.exercisesCompleted,
    exercises_total: stats.exercisesTotal,
    voice_note_transcript: voiceNote,
    exercise_results: exerciseResults,
  };
}
```

### 3.6 Azione "Salva"

```typescript
async function handleSave() {
  const payload = await buildWorkoutPayload(session, voiceNote);
  
  try {
    const { error } = await supabase.from('workouts').insert(payload);
    if (error) throw error;
    
    // Successo: pulisci IDB e vai a home
    await db.activeSessions.delete(sessionId);
    navigate('/home');
    
  } catch (err) {
    // Fallback: salva in coda locale IDB per retry
    await db.pendingWorkouts.put({
      id: crypto.randomUUID(),
      payload,
      failedAt: Date.now(),
      retries: 0,
    });
    
    // Mostra toast "Salvataggio in coda — verrà sincronizzato alla prossima apertura"
    showToast('warning', 'Connessione assente. Dati salvati localmente.');
    navigate('/home');
  }
}
```

**Retry al prossimo avvio:** all'inizializzazione dell'app verificare se esistono `pendingWorkouts` in IDB e ritentare il POST in background.

### 3.7 Azione "Scarta"

```typescript
async function handleDiscard() {
  // Mostra dialog di conferma prima di distruggere i dati
  const confirmed = await showConfirmDialog(
    'Scartare l\'allenamento?',
    'I dati di questa sessione verranno eliminati e non potranno essere recuperati.'
  );
  
  if (confirmed) {
    await db.activeSessions.delete(sessionId);
    navigate('/home');
  }
}
```

Nessun POST. Nessun flag "incompleto". I dati spariscono dall'IDB.

### 3.8 Stats row — nota evolutiva

La stats row mostra oggi: **Durata · Esercizi X/Y · Serie X/Y**

Quando Q1 sarà live, aggiungere una quarta card **Carico totale** calcolata come:
```
sum(set.repsActual × set.load) per tutti i set dell'allenamento
```
Predisporre il componente `StatsRow` con una prop opzionale `totalLoad?: number` già ora, anche se non visualizzata. Quando Q1 è live basterà passare il valore.

---

## 4. Checklist di completamento

### Q1-infra
- [ ] Migration Supabase: campo `exercise_results JSONB` su `workouts`
- [ ] Migration Supabase: tabella `exercises` con RLS
- [ ] Migration Supabase: campo `rest_seconds` su `scheda_esercizi`
- [ ] Migration Supabase: campo `exercise_id` FK su `scheda_esercizi`
- [ ] Aggiornare tipi TypeScript (WorkoutInsert, ExerciseResult, SetResult)
- [ ] Verificare migration applicata in prod (Supabase dashboard)

### FIX5
- [ ] Rimuovere costante hardcoded 90" dal componente timer
- [ ] Implementare `getRestDuration(exercise, userDefaultRest)`
- [ ] Aggiungere costante `DEFAULT_REST_SECONDS = 90` in config
- [ ] Implementare prop `variant: 'series' | 'exercise'` sul timer
- [ ] Aggiungere token CSS `--gt-timer-series` (amber) e `--gt-timer-exercise` (teal)
- [ ] Implementare bottoni +15" / -15" con touch target ≥ 44px
- [ ] Salvare `restActualSeconds[]` in ActiveSession IDB
- [ ] Test: esercizio con rest_seconds null → usa default

### F6
- [ ] Creare route `/live/summary`
- [ ] Leggere ActiveSession da IDB al mount
- [ ] Implementare hero dark con animazioni (checkDraw + glow + heartbeat)
- [ ] Implementare rispetto `prefers-reduced-motion`
- [ ] Implementare StatsRow (Durata · Esercizi · Serie) con prop `totalLoad?` predisposta
- [ ] Integrare VoiceRecorder F7 (se già disponibile, altrimenti placeholder textarea)
- [ ] Implementare `buildWorkoutPayload()` con exercise_results JSONB
- [ ] Implementare POST verso Supabase con fallback queue IDB
- [ ] Implementare retry pendingWorkouts all'avvio app
- [ ] Implementare "Scarta" con dialog di conferma
- [ ] Test: POST fallito → dato in pendingWorkouts → retry al reopen → dato in Supabase

---

## 5. Decisioni da rimandare (non implementare ora)

| Tema | Decisione rinviata | Quando |
|---|---|---|
| Stats row | Aggiungere card Carico totale | Quando Q1 analytics è live |
| Timer | Override utente del default rest dal picker completo | Con R1/Preferenze |
| F6 | Edit manuale dei dati pre-salvataggio | Mai per ora, rivalutare |
| Q1 | RPE per serie | Rivalutare con Q1 fase 2 |
| F7 | VoiceRecorder completo | Feature separata, F6 accetta textarea come fallback |

---

*Fine documento — generato da sessione di product design con Claude*
