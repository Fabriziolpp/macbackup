// Helper dei test sul database di produzione (AP1 Fase 2).
// Regole: solo chiave anon + sessione degli utenti di test (mai service role);
// si cancellano solo righe marcate [rls-test] dopo averne verificato la proprietà.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Client volutamente non tipizzato: i test usano nomi di tabella dinamici.
export type TestDb = SupabaseClient;

export const MARK = '[rls-test]';

export interface TestUser {
  db: TestDb;
  id: string;
  token: string;
}

export interface Tree {
  schedaId: string;
  tipoId: string;
  bloccoId: string;
  esercizioId: string;
  exerciseId: string;
  workoutId: string;
  weightLogId: string;
}

export function anonClient(): TestDb {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function signIn(which: 1 | 2): Promise<TestUser> {
  const email = which === 1 ? process.env.TEST_USER_EMAIL! : process.env.TEST_USER_2_EMAIL!;
  const password = which === 1 ? process.env.TEST_USER_PASSWORD! : process.env.TEST_USER_2_PASSWORD!;
  const db = anonClient();
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Login dell'utente di test ${which} non riuscito: ${error?.message ?? 'sessione assente'}`);
  }
  return { db, id: data.session.user.id, token: data.session.access_token };
}

/** Id testuale univoco per le fixture (le tabelle usano id text generati dal client). */
export function tid(): string {
  return `rlst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function must<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>, what: string): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`fixture ${what}: ${error.message}`);
  return data;
}

/** Albero completo di proprietà di `u`, marcato [rls-test]. */
export async function createTree(u: TestUser): Promise<Tree> {
  const t = {
    schedaId: tid(), tipoId: tid(), bloccoId: tid(), esercizioId: tid(), workoutId: tid(), weightLogId: tid(),
  };
  await must(u.db.from('schede').insert({ id: t.schedaId, nome: `${MARK} scheda`, mese: '', user_id: u.id }), 'schede');
  await must(u.db.from('tipi').insert({ id: t.tipoId, scheda_id: t.schedaId, nome: `${MARK} tipo`, ordine: 0, user_id: u.id }), 'tipi');
  await must(u.db.from('blocchi').insert({
    id: t.bloccoId, tipo_id: t.tipoId, ordine: 0, tipo: 'circuito_amrap', durata_minuti: 10, nota_comune: MARK, user_id: u.id,
  }), 'blocchi');
  const ex = await must(u.db.from('exercises').insert({ name: `${MARK} exercise`, user_id: u.id }).select('id').single(), 'exercises');
  if (!ex) throw new Error('fixture exercises: nessuna riga restituita');
  await must(u.db.from('esercizi').insert({
    id: t.esercizioId, tipo_id: t.tipoId, blocco_id: t.bloccoId, titolo: `${MARK} esercizio`, ordine: 0, exercise_id: ex.id, user_id: u.id,
  }), 'esercizi');
  await must(u.db.from('workouts').insert({ id: t.workoutId, data: '2026-01-01', note: `${MARK} workout`, user_id: u.id }), 'workouts');
  await must(u.db.from('weight_logs').insert({ id: t.weightLogId, date: '2026-01-01', es_nome: `${MARK} peso`, user_id: u.id }), 'weight_logs');
  return { ...t, exerciseId: ex.id };
}

// Prima le schede: la cascata elimina tipi, blocchi ed esercizi, che possono puntare agli exercises.
const MARKED: Array<{ table: string; column: string }> = [
  { table: 'schede', column: 'nome' },
  { table: 'exercises', column: 'name' },
  { table: 'workouts', column: 'note' },
  { table: 'weight_logs', column: 'es_nome' },
];

/**
 * Cancella le righe marcate [rls-test] degli utenti di test. Prima verifica che OGNI riga
 * marcata visibile appartenga a uno di loro: se trova altro si interrompe senza cancellare nulla.
 */
export async function cleanupMarked(users: TestUser[]): Promise<void> {
  const allowed = new Set(users.map(u => u.id));
  const plan: Array<{ u: TestUser; table: string; ids: string[] }> = [];
  for (const { table, column } of MARKED) {
    for (const u of users) {
      const { data, error } = await u.db.from(table).select('id, user_id').like(column, `${MARK}%`);
      if (error) throw new Error(`pulizia: lettura di ${table} non riuscita: ${error.message}`);
      const rows = (data ?? []) as Array<{ id: string; user_id: string | null }>;
      const foreign = rows.filter(r => !r.user_id || !allowed.has(r.user_id));
      if (foreign.length > 0) {
        throw new Error(`pulizia interrotta: ${foreign.length} righe marcate in ${table} non appartengono agli utenti di test`);
      }
      if (rows.length > 0) plan.push({ u, table, ids: rows.map(r => String(r.id)) });
    }
  }
  for (const { u, table, ids } of plan) {
    const { error } = await u.db.from(table).delete().in('id', ids);
    if (error) throw new Error(`pulizia: cancellazione da ${table} non riuscita: ${error.message}`);
  }
}
