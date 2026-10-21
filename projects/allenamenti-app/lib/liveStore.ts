import { create } from 'zustand';
import type {
  ActiveSession, SessionExercise, SessionSegment, SessionBlock, BlockExercise,
} from './liveTypes';
import { currentExercise } from './liveTypes';
import {
  saveActiveSession,
  getActiveSession,
  clearActiveSession as idbClearSession,
} from './idb';
import { newId } from './utils';
import { parseExerciseSpec, parseRecupero, type RestMode } from './parseExerciseSpec';
import { DEFAULT_REST_SECONDS } from './config';
import { getPrefs } from './prefs';

interface ExerciseInput {
  id: string;
  titolo: string;
  ripetizioni?: string;
  carico?: string;
  recupero?: string;
  note?: string;
  setsTarget?: number;
  exerciseId?: string;     // Q1-infra: UUID exercises.id (FK), opzionale per schede pre-migration
  restSeconds?: number;    // Q1-infra: rest_seconds numerico (preferito a parsare `recupero` string)
}

// FIX6 F2: blocco circuito passato all'avvio sessione.
interface BlockInput {
  id: string;
  tipo: 'circuito_amrap' | 'circuito_giri';
  durataMinuti?: number;
  notaComune?: string;
  esercizi: ExerciseInput[];
}

interface StartArgs {
  schedaId: string;
  schedaNome: string;
  tipoId: string;
  tipoNome: string;
  week: number;
  esercizi: ExerciseInput[];   // esercizi singoli del giorno
  blocchi: BlockInput[];       // blocchi circuito del giorno
}

interface LiveStore {
  session: ActiveSession | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  startSession: (args: StartArgs) => void;
  toggleSet: (setIdx: number) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  clearSession: () => Promise<void>;
  goPrevSegment: () => void;
  goNextSegment: () => void;
  tickElapsed: (delta: number) => void;
  startRestTimer: () => void;
  clearRestTimer: () => void;
  // FIX6 F2: azioni blocco AMRAP
  startBlockTimer: () => void;
  completeRound: () => void;
  updateRoundEntry: (roundIdx: number, exIdx: number, field: 'reps' | 'load', value: string) => void;
  removeRound: (roundIdx: number) => void;
}

// Debounced save: solo per cambi strutturali. tickElapsed NON va attraverso qui
// (la persistenza ad ogni secondo sarebbe troppo onerosa; l'elapsed verrà
// salvato col prossimo cambio strutturale o su pausa esplicita).
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave(session: ActiveSession | null) {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!session) return;
  saveTimer = setTimeout(() => {
    saveActiveSession(session);
  }, 500);
}

// Aggiorna immutabilmente l'esercizio del segmento corrente (no-op se è un blocco).
function updateCurrentExercise(cur: ActiveSession, fn: (e: SessionExercise) => SessionExercise): ActiveSession {
  const seg = cur.segments[cur.currentSegmentIdx];
  if (seg?.kind !== 'exercise') return cur;
  const segments = cur.segments.slice();
  segments[cur.currentSegmentIdx] = { kind: 'exercise', exercise: fn(seg.exercise) };
  return { ...cur, segments };
}

// Aggiorna immutabilmente il blocco del segmento corrente (no-op se è un esercizio).
function updateCurrentBlock(cur: ActiveSession, fn: (b: SessionBlock) => SessionBlock): ActiveSession {
  const seg = cur.segments[cur.currentSegmentIdx];
  if (seg?.kind !== 'amrap') return cur;
  const segments = cur.segments.slice();
  segments[cur.currentSegmentIdx] = { kind: 'amrap', block: fn(seg.block) };
  return { ...cur, segments };
}

// FIX5 SPEC §2.4: prima di chiudere/sostituire un timer di recupero attivo,
// registra il tempo reale in restActualSeconds[] dell'esercizio corrente.
function recordRestActualAndClear(cur: ActiveSession): ActiveSession {
  if (cur.restTimerStartedAt == null) return cur;
  const elapsed = Math.max(0, Math.floor((Date.now() - cur.restTimerStartedAt) / 1000));
  // elapsed=0 = doppio tap / cambio immediato; non inquinare la media con uno zero.
  if (elapsed === 0) return { ...cur, restTimerStartedAt: null };
  const next = updateCurrentExercise(cur, ex => ({
    ...ex,
    restActualSeconds: [...ex.restActualSeconds, elapsed],
  }));
  return { ...next, restTimerStartedAt: null };
}

function buildSessionExercise(e: ExerciseInput, week: number): SessionExercise {
  const parsed = parseExerciseSpec(e.ripetizioni || '', e.carico || '', week);
  // setsTarget: deriva da reps (NxM); rispetta un setsTarget esplicito maggiore.
  const derived = parsed.setsTarget;
  const explicit = typeof e.setsTarget === 'number' && e.setsTarget > 0 ? e.setsTarget : 0;
  const setsTarget = Math.max(derived, explicit) || 1;
  // FIX5 §2.1: rest_seconds numerico ha priorità → countdown. Altrimenti FIX5b:
  // parseRecupero dà anche la modalità ('stopwatch' per "Completo"). Fallback 90s.
  const explicitRest =
    typeof e.restSeconds === 'number' && e.restSeconds > 0 ? e.restSeconds : null;
  let restMode: RestMode = 'countdown';
  let restTargetSec: number;
  if (explicitRest != null) {
    restTargetSec = explicitRest;
  } else {
    const rec = parseRecupero(e.recupero || '', week);
    restMode = rec.mode;
    // R1/Preferenze: fallback recupero = pref utente (se impostata), poi costante.
    const fallbackRest = getPrefs().defaultRestSeconds || DEFAULT_REST_SECONDS;
    restTargetSec = rec.mode === 'stopwatch' ? 0 : (rec.seconds ?? fallbackRest);
  }
  return {
    exerciseId: e.id,
    exerciseCanonicalId: e.exerciseId,
    name: e.titolo,
    setsTarget,
    reps: (e.ripetizioni || '').trim() || '—',
    load: (e.carico || '').trim() || '—',
    note: e.note,
    setsDone: [],
    restMode,
    restTargetSec,
    restActualSeconds: [],
  };
}

function buildBlockExercise(e: ExerciseInput, week: number): BlockExercise {
  const parsed = parseExerciseSpec(e.ripetizioni || '', e.carico || '', week);
  return {
    exerciseId: e.id,
    exerciseCanonicalId: e.exerciseId,
    name: e.titolo,
    reps: parsed.repsLabel || (e.ripetizioni || '').trim() || '—',
    load: parsed.loadLabel || (e.carico || '').trim() || '—',
    note: e.note,
  };
}

// FIX6 F2: costruisce i segmenti del giorno: prima i singoli, poi i blocchi.
// circuito_amrap → un segmento blocco. circuito_giri → fallback (SPEC §7): i suoi
// esercizi diventano segmenti esercizio singoli (comportamento sequenziale).
function buildSegments(args: StartArgs): SessionSegment[] {
  const segments: SessionSegment[] = [];
  for (const e of args.esercizi) {
    segments.push({ kind: 'exercise', exercise: buildSessionExercise(e, args.week) });
  }
  for (const b of args.blocchi) {
    if (b.tipo === 'circuito_amrap') {
      segments.push({
        kind: 'amrap',
        block: {
          blockId: b.id,
          tipo: b.tipo,
          durataMinuti: typeof b.durataMinuti === 'number' && b.durataMinuti > 0 ? b.durataMinuti : 20,
          notaComune: b.notaComune,
          exercises: b.esercizi.map(e => buildBlockExercise(e, args.week)),
          rounds: [],
          blockStartedAt: null,
        },
      });
    } else {
      // circuito_giri: fuori scope Live (SPEC §7) → flatten a esercizi singoli.
      for (const e of b.esercizi) {
        segments.push({ kind: 'exercise', exercise: buildSessionExercise(e, args.week) });
      }
    }
  }
  return segments;
}

export const useLiveStore = create<LiveStore>((set, get) => ({
  session: null,
  hydrated: false,

  async hydrate() {
    if (get().hydrated) return;
    const s = await getActiveSession();
    // FIX6 F2: sessioni persistite col vecchio shape (exercises[] senza segments)
    // sono incompatibili → scartale per non crashare il flusso.
    if (s && !Array.isArray((s as any).segments)) {
      await idbClearSession();
      set({ session: null, hydrated: true });
      return;
    }
    set({ session: s, hydrated: true });
  },

  startSession(args) {
    const session: ActiveSession = {
      id: newId(),
      startedAt: new Date().toISOString(),
      schedaId: args.schedaId,
      schedaNome: args.schedaNome,
      tipoId: args.tipoId,
      tipoNome: args.tipoNome,
      week: args.week,
      currentSegmentIdx: 0,
      segments: buildSegments(args),
      status: 'active',
      totalElapsedSec: 0,
    };
    set({ session, hydrated: true });
    scheduleSave(session);
  },

  toggleSet(setIdx) {
    const cur = get().session;
    if (!cur) return;
    const ex = currentExercise(cur);
    if (!ex) return;
    const setsDone = ex.setsDone.slice();
    const existing = setsDone.findIndex(s => s.index === setIdx);
    const isMarkingDone = existing < 0;
    if (existing >= 0) {
      setsDone.splice(existing, 1);
    } else {
      setsDone.push({ index: setIdx, doneAt: new Date().toISOString() });
      setsDone.sort((a, b) => a.index - b.index);
    }
    let next = updateCurrentExercise(cur, e => ({ ...e, setsDone }));
    // Timer attivo → registra il reale prima di chiuderlo/sostituirlo (FIX5 §2.4).
    if (next.restTimerStartedAt != null) {
      next = recordRestActualAndClear(next);
    }
    // Done → start nuovo timer. Undone → resta chiuso.
    if (isMarkingDone) {
      next = { ...next, restTimerStartedAt: Date.now() };
    }
    set({ session: next });
    scheduleSave(next);
  },

  pauseSession() {
    const cur = get().session;
    if (!cur || cur.status !== 'active') return;
    const next: ActiveSession = {
      ...cur,
      status: 'paused',
      pausedAt: new Date().toISOString(),
    };
    set({ session: next });
    scheduleSave(next);
  },

  resumeSession() {
    const cur = get().session;
    if (!cur || cur.status !== 'paused') return;
    const next: ActiveSession = { ...cur, status: 'active', pausedAt: undefined };
    set({ session: next });
    scheduleSave(next);
  },

  async clearSession() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    set({ session: null });
    await idbClearSession();
  },

  goPrevSegment() {
    let cur = get().session;
    if (!cur || cur.currentSegmentIdx <= 0) return;
    if (cur.restTimerStartedAt != null) cur = recordRestActualAndClear(cur);
    const next: ActiveSession = { ...cur, currentSegmentIdx: cur.currentSegmentIdx - 1 };
    set({ session: next });
    scheduleSave(next);
  },

  goNextSegment() {
    let cur = get().session;
    if (!cur || cur.currentSegmentIdx >= cur.segments.length - 1) return;
    if (cur.restTimerStartedAt != null) cur = recordRestActualAndClear(cur);
    const next: ActiveSession = { ...cur, currentSegmentIdx: cur.currentSegmentIdx + 1 };
    set({ session: next });
    scheduleSave(next);
  },

  startRestTimer() {
    const cur = get().session;
    if (!cur) return;
    const next: ActiveSession = { ...cur, restTimerStartedAt: Date.now() };
    set({ session: next });
    scheduleSave(next);
  },

  clearRestTimer() {
    const cur = get().session;
    if (!cur || cur.restTimerStartedAt == null) return;
    const next = recordRestActualAndClear(cur);
    set({ session: next });
    scheduleSave(next);
  },

  // ─── FIX6 F2: blocco AMRAP ───
  startBlockTimer() {
    const cur = get().session;
    if (!cur) return;
    const seg = cur.segments[cur.currentSegmentIdx];
    if (seg?.kind !== 'amrap' || seg.block.blockStartedAt != null) return;
    const next = updateCurrentBlock(cur, b => ({ ...b, blockStartedAt: Date.now() }));
    set({ session: next });
    scheduleSave(next);
  },

  completeRound() {
    const cur = get().session;
    if (!cur) return;
    const next = updateCurrentBlock(cur, b => ({
      ...b,
      rounds: [
        ...b.rounds,
        {
          completedAt: new Date().toISOString(),
          // Precompila reps/carico dai valori pianificati (editabili, opzionali).
          entries: b.exercises.map(e => ({ reps: e.reps, load: e.load })),
        },
      ],
    }));
    set({ session: next });
    scheduleSave(next);
  },

  updateRoundEntry(roundIdx, exIdx, field, value) {
    const cur = get().session;
    if (!cur) return;
    const next = updateCurrentBlock(cur, b => {
      const rounds = b.rounds.slice();
      const round = rounds[roundIdx];
      if (!round) return b;
      const entries = round.entries.slice();
      if (!entries[exIdx]) return b;
      entries[exIdx] = { ...entries[exIdx], [field]: value };
      rounds[roundIdx] = { ...round, entries };
      return { ...b, rounds };
    });
    set({ session: next });
    scheduleSave(next);
  },

  removeRound(roundIdx) {
    const cur = get().session;
    if (!cur) return;
    const next = updateCurrentBlock(cur, b => ({
      ...b,
      rounds: b.rounds.filter((_, i) => i !== roundIdx),
    }));
    set({ session: next });
    scheduleSave(next);
  },

  tickElapsed(delta) {
    const cur = get().session;
    if (!cur || cur.status !== 'active' || delta <= 0) return;
    const next: ActiveSession = { ...cur, totalElapsedSec: cur.totalElapsedSec + delta };
    set({ session: next });
    // Nessun scheduleSave: tick frequente, persistiamo solo su cambi strutturali.
  },
}));
