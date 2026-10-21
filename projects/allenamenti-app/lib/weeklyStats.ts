import { toDateString, addDays, getMonday } from './dateUtils';

export interface Workout {
  data: string;
  scheda: string;
  tipo: string;
}

export interface SchedaInfo {
  nome: string;
  tipiCount: number;
  tipiNomi: string[];
}

/* ── Week helpers ─────────────────────────────────────── */

/** Get all workouts within a Mon–Sun week starting at mondayStr */
export function weekWorkouts<T extends { data: string }>(workouts: T[], mondayStr: string): T[] {
  const sundayStr = toDateString(addDays(new Date(mondayStr + 'T00:00:00'), 6));
  return workouts.filter(w => w.data >= mondayStr && w.data <= sundayStr);
}

/** Current week's Monday as "YYYY-MM-DD" */
export function currentMonday(): string {
  return toDateString(getMonday(new Date()));
}

/* ── Scheda completion ────────────────────────────────── */

export interface SchedaProgress {
  schedaNome: string;
  completati: string[];   // tipi done this week
  mancanti: string[];     // tipi not done
  totale: number;
  completo: boolean;
}

/**
 * Find the most-used scheda this week and compute tipo completion.
 * Returns null if no workouts this week.
 */
export function schedaCompletion(
  weekWk: Workout[],
  schede: SchedaInfo[],
): SchedaProgress | null {
  if (weekWk.length === 0) return null;

  // Count usage per scheda name
  const counts = new Map<string, number>();
  const latest = new Map<string, string>(); // scheda → latest date
  for (const w of weekWk) {
    counts.set(w.scheda, (counts.get(w.scheda) || 0) + 1);
    const prev = latest.get(w.scheda) || '';
    if (w.data > prev) latest.set(w.scheda, w.data);
  }

  // Pick most used (tie-break: most recent)
  let bestScheda = '';
  let bestCount = 0;
  let bestDate = '';
  for (const [nome, c] of counts) {
    const d = latest.get(nome) || '';
    if (c > bestCount || (c === bestCount && d > bestDate)) {
      bestScheda = nome;
      bestCount = c;
      bestDate = d;
    }
  }

  // Find scheda definition for tipo list
  const def = schede.find(s => s.nome === bestScheda);
  if (!def) return null;

  // Which tipi were done this week for this scheda
  const doneTipi = new Set(
    weekWk.filter(w => w.scheda === bestScheda).map(w => w.tipo)
  );

  const completati = def.tipiNomi.filter(t => doneTipi.has(t));
  const mancanti = def.tipiNomi.filter(t => !doneTipi.has(t));

  return {
    schedaNome: bestScheda,
    completati,
    mancanti,
    totale: def.tipiNomi.length,
    completo: mancanti.length === 0,
  };
}

/* ── Weekly streak ────────────────────────────────────── */

export interface WeeklyStreakResult {
  current: number;
  record: number;
}

/**
 * Compute streak of consecutive weeks with >= 3 workouts.
 * Current week is tollerante: only counts toward streak if already >= 3.
 */
export function weeklyStreak(workouts: Workout[]): WeeklyStreakResult {
  if (workouts.length === 0) return { current: 0, record: 0 };

  const mondayNow = currentMonday();

  // Build a map: mondayStr → workout count for that week
  const weekCounts = new Map<string, number>();
  for (const w of workouts) {
    const m = toDateString(getMonday(new Date(w.data + 'T00:00:00')));
    weekCounts.set(m, (weekCounts.get(m) || 0) + 1);
  }

  // Sort all mondays descending
  const mondays = [...weekCounts.keys()].sort().reverse();

  // Current streak: start from current week if >= 3, else from previous week
  let current = 0;
  let startIdx = 0;

  if (mondays[0] === mondayNow) {
    if ((weekCounts.get(mondayNow) || 0) >= 3) {
      current = 1;
      startIdx = 1;
    } else {
      // Tollerante: skip current week, start from previous
      startIdx = 1;
    }
  }

  // Walk backwards through consecutive weeks
  for (let i = startIdx; i < mondays.length; i++) {
    const count = weekCounts.get(mondays[i]) || 0;
    if (count < 3) break;

    // Check it's consecutive with previous counted week
    if (i > startIdx) {
      const prevMonday = mondays[i - 1];
      const expectedPrev = toDateString(addDays(new Date(mondays[i] + 'T00:00:00'), 7));
      if (prevMonday !== expectedPrev) break;
    } else if (startIdx > 0 && current > 0) {
      // First week after current: must be the week before current
      const expectedPrev = toDateString(addDays(new Date(mondays[i] + 'T00:00:00'), 7));
      if (expectedPrev !== mondayNow) break;
    }

    current++;
  }

  // Record: find max consecutive run across all weeks
  const allMondays = [...weekCounts.keys()].sort(); // ascending
  let record = 0;
  let run = 0;
  for (let i = 0; i < allMondays.length; i++) {
    const count = weekCounts.get(allMondays[i]) || 0;
    if (count >= 3) {
      if (i === 0) {
        run = 1;
      } else {
        const expectedPrev = toDateString(addDays(new Date(allMondays[i] + 'T00:00:00'), -7));
        run = allMondays[i - 1] === expectedPrev && (weekCounts.get(allMondays[i - 1]) || 0) >= 3
          ? run + 1
          : 1;
      }
      record = Math.max(record, run);
    } else {
      run = 0;
    }
  }

  return { current, record };
}

/* ── Week level & message ─────────────────────────────── */

export type WeekLevel = 'sotto' | 'minimo' | 'ottimale' | 'super';

export function weekLevel(count: number): WeekLevel {
  if (count >= 5) return 'super';
  if (count >= 4) return 'ottimale';
  if (count >= 3) return 'minimo';
  return 'sotto';
}

const GIORNI = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];

/**
 * Encouraging message for the current week based on count and day of week.
 * dayOfWeek: 0=Mon ... 6=Sun
 */
export function weekMessage(count: number, dayOfWeek: number): string {
  const remaining = 6 - dayOfWeek; // days left including today? No, days after today
  const level = weekLevel(count);

  if (level === 'super') {
    return 'Settimana super — sei una macchina!';
  }
  if (level === 'ottimale') {
    return remaining > 0
      ? 'Ottimo ritmo! Un altro allenamento e chiudi una settimana super'
      : 'Settimana ottimale completata, grande lavoro!';
  }
  if (level === 'minimo') {
    return remaining > 0
      ? 'Minimo centrato! Punta a 4 per un livello ottimale'
      : 'Minimo raggiunto — la costanza paga!';
  }

  // sotto-soglia
  const need = 3 - count;
  if (count === 0) {
    return remaining >= 3
      ? 'La settimana è appena iniziata — 3 allenamenti sono l\'obiettivo!'
      : remaining > 0
        ? `Ancora ${remaining} giorni, muoviti e inizia!`
        : 'Settimana finita — riparte lunedì, non mollare!';
  }

  if (remaining === 0) {
    return `${count} su 3 questa settimana — si riparte lunedì più forti!`;
  }

  if (remaining >= need) {
    return `Hai fatto ${count}, ancora ${remaining} giorni — ${need === 1 ? 'ne manca solo 1' : `fanne ${need}`} per il minimo!`;
  }

  return `${count} allenamenti fin qui — dai tutto nei prossimi ${remaining} giorni!`;
}
