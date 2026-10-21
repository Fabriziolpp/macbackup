import type { RestMode } from './parseExerciseSpec';

export type SessionStatus = 'active' | 'paused' | 'completed';

export interface SessionSet {
  index: number;
  doneAt: string;
}

export interface SessionExercise {
  exerciseId: string;              // id dell'esercizio nella scheda sorgente (Esercizio.id)
  exerciseCanonicalId?: string;    // UUID dalla tabella `exercises` (Q1-infra) se la scheda referenzia un canonical. null per schede pre-migration.
  name: string;
  setsTarget: number;
  reps: string;
  load: string;
  note?: string;
  setsDone: SessionSet[];
  restMode: RestMode;              // FIX5b: 'countdown' (target numerico) | 'stopwatch' (cronometro count-up, es. "Completo")
  restTargetSec: number;           // target di recupero in secondi quando restMode='countdown'. In 'stopwatch' = 0 (inutilizzato).
  restActualSeconds: number[];     // FIX5: tempo reale di recupero per ogni "Start Next" premuto. Media → ExerciseResult.restActual.
}

// ─── FIX6 Fase 2: blocchi circuito (AMRAP) nella sessione Live ───
// Un blocco è eseguito come pagina unica (non sequenza esercizi): countdown di
// durata_minuti + contatore giri con log reps/carico per giro (SPEC §4).

// Esercizio pianificato dentro un blocco. Niente set-tracking: il logging è per
// giro (RoundLog), non per serie.
export interface BlockExercise {
  exerciseId: string;
  exerciseCanonicalId?: string;
  name: string;
  reps: string;                    // reps pianificate (label, es. "10" o "Chin Up 10\"")
  load: string;                    // carico pianificato (label)
  note?: string;
}

// Un giro completato. entries[i] ↔ block.exercises[i]. reps/load sono stringhe
// editabili (precompilate dai valori pianificati); il log è opzionale.
export interface RoundLog {
  completedAt: string;
  entries: { reps: string; load: string }[];
}

export interface SessionBlock {
  blockId: string;
  tipo: 'circuito_amrap' | 'circuito_giri';
  durataMinuti: number;            // countdown del blocco
  notaComune?: string;
  exercises: BlockExercise[];
  rounds: RoundLog[];              // giri completati e (opzionalmente) loggati
  blockStartedAt?: number | null;  // epoch ms avvio countdown; null = non avviato
}

// Un segmento del giorno: o un esercizio singolo (flusso a serie) o un blocco AMRAP.
export type SessionSegment =
  | { kind: 'exercise'; exercise: SessionExercise }
  | { kind: 'amrap'; block: SessionBlock };

export interface ActiveSession {
  id: string;
  startedAt: string;
  schedaId: string;
  schedaNome: string;
  tipoId: string;
  tipoNome: string;
  week: number;
  currentSegmentIdx: number;       // FIX6 F2: indice del segmento corrente (ex currentExerciseIdx)
  segments: SessionSegment[];      // FIX6 F2: sequenza di esercizi singoli e blocchi (ex exercises[])
  status: SessionStatus;
  pausedAt?: string;
  totalElapsedSec: number;
  voiceNoteTranscript?: string;
  textNote?: string;
  restTimerStartedAt?: number | null;  // epoch ms quando è partito il timer di recupero; null/undef = niente timer attivo
}

// Helper: esercizio del segmento corrente, o null se il segmento è un blocco.
export function currentExercise(s: ActiveSession): SessionExercise | null {
  const seg = s.segments[s.currentSegmentIdx];
  return seg?.kind === 'exercise' ? seg.exercise : null;
}

// ─── Q1-infra: shape del JSONB workouts.exercise_results ───
// SPEC FIX5_Q1infra_F6 §1.2. F6 buildWorkoutPayload produce questa shape.

export interface SetResult {
  setN: number;                    // 1-based per leggibilità del JSON
  repsPlanned: number;
  repsActual: number;              // F6 oggi: = repsPlanned (no edit manuale per ora, SPEC §5)
  load: number | null;             // kg; null se a corpo libero o non parseabile
}

// FIX6 F2: un giro loggato per un movimento di blocco AMRAP.
export interface RoundResult {
  roundN: number;                  // 1-based
  repsActual: number;              // reps loggate quel giro (0 se non compilato)
  load: number | null;             // kg loggati quel giro; null se non parseabile
}

export interface ExerciseResult {
  exerciseId: string | null;       // UUID exercises.id; null per schede legacy senza canonical
  exerciseName: string;            // fallback leggibile
  setsPlanned: number;
  setsCompleted: number;           // FIX6: per i movimenti AMRAP = numero di giri loggati
  restPlanned: number | null;      // secondi (= restTargetSec della session); null se restMode='stopwatch' o blocco AMRAP (nessun recupero)
  restActual: number | null;       // media dei restActualSeconds; null se nessun recupero registrato
  note: string | null;             // testo libero (input manuale o F7 voice transcript)
  sets: SetResult[];               // vuoto per i movimenti AMRAP (usano rounds)
  // FIX6 F2: presente solo per i movimenti di un blocco circuito_amrap.
  mode?: 'amrap';
  amrapDurataMinuti?: number;
  rounds?: RoundResult[];
}

export type WorkoutExerciseResults = ExerciseResult[];
