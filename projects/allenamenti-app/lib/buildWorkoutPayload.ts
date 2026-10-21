// F6 SPEC §3.5: costruzione del payload POST a /api/workouts a partire
// dalla ActiveSession in IDB. Restituisce un oggetto JSON in camelCase
// (l'API server fa il mapping a snake_case per Supabase).

import type { ActiveSession, ExerciseResult, WorkoutExerciseResults } from './liveTypes';
import { parseExerciseSpec } from './parseExerciseSpec';

function todayISODate(): string {
  // Formato 'YYYY-MM-DD' coerente con il resto dell'app (workouts.data).
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nowHM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function parseLoadKg(raw: string): number | null {
  // Estrae il numero kg da stringhe tipo "35kg", "57.5 kg", "x80", "-35kg".
  // Intensità relative/autoregolate (@9 = RPE, "90% MAV", "60%") NON sono kg
  // fissi: ritorna null così restano solo come etichetta di display (loadLabel).
  const s = (raw || '');
  if (/[@%]|mav/i.test(s)) return null;
  const m = s.replace(',', '.').match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const v = parseFloat(m[1]);
  return Number.isFinite(v) && v > 0 ? v : null;
}

function parseRepsCount(raw: string): number {
  // Estrae le ripetizioni numeriche da "24 RT", "15", "30\"" → 24, 15, 30.
  // Per F6 oggi repsActual = repsPlanned (SPEC §5: no edit manuale).
  const m = (raw || '').match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function avg(arr: number[]): number | null {
  if (!arr || arr.length === 0) return null;
  const sum = arr.reduce((a, b) => a + b, 0);
  return Math.round(sum / arr.length);
}

export function buildExerciseResults(session: ActiveSession): WorkoutExerciseResults {
  const results: ExerciseResult[] = [];
  for (const seg of session.segments) {
    if (seg.kind === 'exercise') {
      const ex = seg.exercise;
      const parsed = parseExerciseSpec(ex.reps, ex.load, session.week);
      const repsPerSet = parseRepsCount(parsed.repsPerSet);
      const loadKg = parseLoadKg(parsed.loadPerSet);
      const setsPlanned = ex.setsTarget;
      results.push({
        exerciseId: ex.exerciseCanonicalId ?? null,
        exerciseName: ex.name,
        setsPlanned,
        setsCompleted: ex.setsDone.length,
        // FIX5b: in modalità stopwatch ("Completo") non c'è target → restPlanned null.
        restPlanned: ex.restMode === 'stopwatch' ? null : ex.restTargetSec,
        restActual: avg(ex.restActualSeconds),
        note: ex.note ?? null,
        sets: Array.from({ length: setsPlanned }, (_, i) => ({
          setN: i + 1,
          repsPlanned: repsPerSet,
          // SPEC §5: edit manuale rinviato → repsActual = repsPlanned per ora.
          repsActual: repsPerSet,
          load: loadKg,
        })),
      });
    } else {
      // FIX6 F2: blocco AMRAP → un ExerciseResult per movimento, con i giri loggati.
      const block = seg.block;
      block.exercises.forEach((bex, exIdx) => {
        const rounds = block.rounds.map((round, ri) => {
          const entry = round.entries[exIdx];
          return {
            roundN: ri + 1,
            repsActual: parseRepsCount(entry?.reps ?? ''),
            load: parseLoadKg(entry?.load ?? ''),
          };
        });
        results.push({
          exerciseId: bex.exerciseCanonicalId ?? null,
          exerciseName: bex.name,
          setsPlanned: 0,
          setsCompleted: block.rounds.length,   // = giri loggati
          restPlanned: null,                     // AMRAP: nessun recupero
          restActual: null,
          note: bex.note ?? null,
          sets: [],
          mode: 'amrap',
          amrapDurataMinuti: block.durataMinuti,
          rounds,
        });
      });
    }
  }
  return results;
}

export interface BuildPayloadInput {
  session: ActiveSession;
  voiceNoteOrTextNote: string | null;
}

export interface WorkoutPostPayload {
  data: string;
  ora: string;
  scheda: string;
  tipo: string;
  durata: number;
  note: string;
  setsCompleted: number;
  setsTotal: number;
  exercisesCompleted: number;
  exercisesTotal: number;
  programmaWeek: number;
  voiceNoteTranscript: string | null;
  source: 'live';
  exerciseResults: WorkoutExerciseResults;
}

export function buildWorkoutPayload({ session, voiceNoteOrTextNote }: BuildPayloadInput): WorkoutPostPayload {
  const exerciseResults = buildExerciseResults(session);
  // FIX6 F2: serie = solo esercizi singoli (i blocchi AMRAP usano i giri).
  // esercizi = tutti i movimenti (singoli + movimenti dei blocchi).
  let setsCompleted = 0;
  let setsTotal = 0;
  let exercisesCompleted = 0;
  let exercisesTotal = 0;
  for (const seg of session.segments) {
    if (seg.kind === 'exercise') {
      const e = seg.exercise;
      setsCompleted += e.setsDone.length;
      setsTotal += e.setsTarget;
      exercisesTotal += 1;
      if (e.setsDone.length >= e.setsTarget) exercisesCompleted += 1;
    } else {
      const b = seg.block;
      exercisesTotal += b.exercises.length;
      // un movimento AMRAP è "completato" se il blocco ha almeno un giro loggato.
      if (b.rounds.length > 0) exercisesCompleted += b.exercises.length;
    }
  }
  const durataMin = Math.max(1, Math.round(session.totalElapsedSec / 60));
  return {
    data: todayISODate(),
    ora: nowHM(),
    scheda: session.schedaNome,
    tipo: session.tipoNome,
    durata: durataMin,
    note: voiceNoteOrTextNote ?? '',
    setsCompleted,
    setsTotal,
    exercisesCompleted,
    exercisesTotal,
    programmaWeek: session.week,
    voiceNoteTranscript: voiceNoteOrTextNote ?? null,
    source: 'live',
    exerciseResults,
  };
}
